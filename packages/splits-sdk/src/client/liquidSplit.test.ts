import { encode } from 'base-64'
import {
  Account,
  Address,
  Chain,
  Log,
  PublicClient,
  Transport,
  WalletClient,
  zeroAddress,
} from 'viem'

import { LiquidSplitClient } from './liquidSplit'
import {
  LIQUID_SPLITS_MAX_PRECISION_DECIMALS,
  getLiquidSplitFactoryAddress,
  LIQUID_SPLIT_URI_BASE_64_HEADER,
} from '../constants'
import {
  InvalidAuthError,
  InvalidConfigError,
  MissingPublicClientError,
  MissingWalletClientError,
  UnsupportedChainIdError,
} from '../errors'
import * as utils from '../utils'
import * as numberUtils from '../utils/numbers'
import {
  validateAddress,
  validateDistributorFeePercent,
  validateSplitRecipients,
} from '../utils/validation'
import {
  SORTED_ADDRESSES,
  SORTED_ALLOCATIONS,
  DISTRIBUTOR_FEE,
  CONTROLLER_ADDRESS,
  NFT_COUNTS,
} from '../testing/constants'
import { writeActions as factoryWriteActions } from '../testing/mocks/liquidSplitFactory'
import {
  writeActions as moduleWriteActions,
  readActions,
} from '../testing/mocks/liquidSplit'
import type { LiquidSplit } from '../types'
import { MockViemContract } from '../testing/mocks/viemContract'
import { DataClient } from './data'

jest.mock('viem', () => {
  const originalModule = jest.requireActual('viem')
  return {
    ...originalModule,
    getContract: jest.fn(() => {
      return new MockViemContract(readActions, moduleWriteActions)
    }),
    getAddress: jest.fn((address) => address),
    decodeEventLog: jest.fn(() => {
      return {
        eventName: 'eventName',
        args: {
          ls: '0xliquidSplit',
        },
      }
    }),
  }
})

jest.mock('../utils/validation')

jest.mock('./data')

const getSortedRecipientsMock = jest
  .spyOn(utils, 'getRecipientSortedAddressesAndAllocations')
  .mockImplementation(() => {
    return [SORTED_ADDRESSES, SORTED_ALLOCATIONS]
  })
const getBigIntMock = jest
  .spyOn(numberUtils, 'getBigIntFromPercent')
  .mockImplementation(() => {
    return DISTRIBUTOR_FEE
  })
const getNftCountsMock = jest
  .spyOn(utils, 'getNftCountsFromPercents')
  .mockImplementation(() => {
    return NFT_COUNTS
  })

const mockPublicClient = jest.fn(() => {
  return {
    simulateContract: jest.fn(
      async ({
        address,
        functionName,
        args,
      }: {
        address: Address
        functionName: string
        args: unknown[]
      }) => {
        if (address === getLiquidSplitFactoryAddress(1)) {
          type writeActions = typeof factoryWriteActions
          type writeKeys = keyof writeActions
          factoryWriteActions[functionName as writeKeys].call(this, ...args)
        } else {
          type writeActions = typeof moduleWriteActions
          type writeKeys = keyof writeActions
          moduleWriteActions[functionName as writeKeys].call(this, ...args)
        }
        return { request: jest.mock }
      },
    ),
  } as unknown as PublicClient<Transport, Chain>
})
const mockWalletClient = jest.fn(() => {
  return {
    account: {
      address: CONTROLLER_ADDRESS,
    },
    writeContract: jest.fn(() => {
      return '0xhash'
    }),
  } as unknown as WalletClient<Transport, Chain, Account>
})
const mockWalletClientNonController = jest.fn(() => {
  return {
    account: {
      address: '0xnotController',
    },
    writeContract: jest.fn(() => {
      return '0xhash'
    }),
  } as unknown as WalletClient<Transport, Chain, Account>
})

describe('Client config validation', () => {
  test('Including ens names with no provider fails', () => {
    expect(
      () => new LiquidSplitClient({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
  })

  test('Invalid chain id fails', () => {
    expect(() => new LiquidSplitClient({ chainId: 51 })).toThrow(
      UnsupportedChainIdError,
    )
  })

  test('Ethereum chain ids pass', () => {
    expect(() => new LiquidSplitClient({ chainId: 1 })).not.toThrow()
  })

  test('Polygon chain ids pass', () => {
    expect(() => new LiquidSplitClient({ chainId: 137 })).not.toThrow()
  })

  test('Optimism chain ids pass', () => {
    expect(() => new LiquidSplitClient({ chainId: 10 })).not.toThrow()
  })

  test('Arbitrum chain ids pass', () => {
    expect(() => new LiquidSplitClient({ chainId: 42161 })).not.toThrow()
  })

  test('Zora chain ids pass', () => {
    expect(() => new LiquidSplitClient({ chainId: 7777777 })).not.toThrow()
  })

  test('Base chain ids pass', () => {
    expect(() => new LiquidSplitClient({ chainId: 8453 })).not.toThrow()
  })

  test('Other chain ids pass', () => {
    expect(() => new LiquidSplitClient({ chainId: 100 })).not.toThrow()
    expect(() => new LiquidSplitClient({ chainId: 56 })).not.toThrow()
  })
})

describe('Liquid split writes', () => {
  const publicClient = new mockPublicClient()
  const walletClient = new mockWalletClient()
  const liquidSplitClient = new LiquidSplitClient({
    chainId: 1,
    apiConfig: {
      apiKey: '1',
    },
    publicClient,
    walletClient,
  })
  const getTransactionEventsSpy = jest
    .spyOn(liquidSplitClient, 'getTransactionEvents')
    .mockImplementation(async () => {
      const event = {
        blockNumber: 12345,
        args: {
          ls: '0xliquidSplit',
        },
      } as unknown as Log
      return [event]
    })

  beforeEach(() => {
    ;(validateSplitRecipients as jest.Mock).mockClear()
    ;(validateDistributorFeePercent as jest.Mock).mockClear()
    ;(validateAddress as jest.Mock).mockClear()
    getTransactionEventsSpy.mockClear()
    getSortedRecipientsMock.mockClear()
    getNftCountsMock.mockClear()
    getBigIntMock.mockClear()
  })

  describe('Create liquid split tests', () => {
    const recipients = [
      { address: '0xuser1', percentAllocation: 40 },
      { address: '0xuser2', percentAllocation: 60 },
    ]
    const distributorFeePercent = 7.35
    const createLiquidSplitCloneResult = {
      value: 'create_liquid_split_clone_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      factoryWriteActions.createLiquidSplitClone.mockClear()
      factoryWriteActions.createLiquidSplitClone.mockReturnValueOnce(
        createLiquidSplitCloneResult,
      )
    })

    test('Create liquid split fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.createLiquidSplit({
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Create liquid split fails with no signer', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.createLiquidSplit({
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Create liquid split passes', async () => {
      const { event, liquidSplitAddress } =
        await liquidSplitClient.createLiquidSplit({
          recipients,
          distributorFeePercent,
        })

      expect(event.blockNumber).toEqual(12345)
      expect(liquidSplitAddress).toEqual('0xliquidSplit')
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(validateSplitRecipients).toBeCalledWith(
        recipients,
        LIQUID_SPLITS_MAX_PRECISION_DECIMALS,
      )
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(getNftCountsMock).toBeCalledWith(SORTED_ALLOCATIONS)
      expect(factoryWriteActions.createLiquidSplitClone).toBeCalledWith(
        SORTED_ADDRESSES,
        NFT_COUNTS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [liquidSplitClient.eventTopics.createLiquidSplit[0]],
      })
    })

    test('Create liquid split passes with custom owner', async () => {
      const { event, liquidSplitAddress } =
        await liquidSplitClient.createLiquidSplit({
          recipients,
          distributorFeePercent,
          owner: '0xowner',
        })

      expect(event.blockNumber).toEqual(12345)
      expect(liquidSplitAddress).toEqual('0xliquidSplit')
      expect(validateAddress).toBeCalledWith('0xowner')
      expect(validateSplitRecipients).toBeCalledWith(
        recipients,
        LIQUID_SPLITS_MAX_PRECISION_DECIMALS,
      )
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(getNftCountsMock).toBeCalledWith(SORTED_ALLOCATIONS)
      expect(factoryWriteActions.createLiquidSplitClone).toBeCalledWith(
        SORTED_ADDRESSES,
        NFT_COUNTS,
        DISTRIBUTOR_FEE,
        '0xowner',
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [liquidSplitClient.eventTopics.createLiquidSplit[0]],
      })
    })
  })

  describe('Distribute token tests', () => {
    const liquidSplitAddress = '0xliquidSplit'
    const token = '0xtoken'
    const holders = [
      { recipient: { address: '0xd' }, percentAllocation: 25 },
      { recipient: { address: '0xe' }, percentAllocation: 75 },
    ]
    const distributeFundsResult = {
      value: 'distribute_funds_tx',
      wait: 'wait',
    }

    const mockedDataClient = DataClient as jest.MockedClass<typeof DataClient>

    beforeEach(() => {
      mockedDataClient.prototype.getLiquidSplitMetadata.mockImplementationOnce(
        async () => {
          return {
            holders,
          } as LiquidSplit
        },
      )
      moduleWriteActions.distributeFunds.mockClear()
      moduleWriteActions.distributeFunds.mockReturnValueOnce(
        distributeFundsResult,
      )
    })
    afterEach(() => {
      mockedDataClient.mockClear()
    })

    test('Distribute token fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.distributeToken({
            liquidSplitAddress,
            token,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Distribute token fails with no signer', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.distributeToken({
            liquidSplitAddress,
            token,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Distribute token passes', async () => {
      const { event } = await liquidSplitClient.distributeToken({
        liquidSplitAddress,
        token,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(liquidSplitAddress)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(moduleWriteActions.distributeFunds).toBeCalledWith(
        token,
        holders.map((h) => h.recipient.address),
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [liquidSplitClient.eventTopics.distributeToken[2]], // Using split main event, not mocked right now
      })
    })

    test('Distribute token for eth passes', async () => {
      const { event } = await liquidSplitClient.distributeToken({
        liquidSplitAddress,
        token: zeroAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(liquidSplitAddress)
      expect(validateAddress).toBeCalledWith(zeroAddress)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(moduleWriteActions.distributeFunds).toBeCalledWith(
        zeroAddress,
        holders.map((h) => h.recipient.address),
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [liquidSplitClient.eventTopics.distributeToken[1]], // Using split main event, not mocked right now
      })
    })

    test('Distribute token with custom distributor passes', async () => {
      const { event } = await liquidSplitClient.distributeToken({
        liquidSplitAddress,
        token,
        distributorAddress: '0xdistributor',
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(liquidSplitAddress)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith('0xdistributor')
      expect(moduleWriteActions.distributeFunds).toBeCalledWith(
        token,
        holders.map((h) => h.recipient.address),
        '0xdistributor',
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [liquidSplitClient.eventTopics.distributeToken[2]], // Using split main event, not mocked right now
      })
    })
  })

  describe('Transfer ownership tests', () => {
    const liquidSplitAddress = '0xliquidSplit'
    const newOwner = '0xnewOwner'
    const transferOwnershipResult = {
      value: 'transfer_ownership_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.transferOwnership.mockClear()
      moduleWriteActions.transferOwnership.mockReturnValueOnce(
        transferOwnershipResult,
      )
    })

    test('Transfer ownership fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.transferOwnership({
            liquidSplitAddress,
            newOwner,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Transfer ownership fails with no signer', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.transferOwnership({
            liquidSplitAddress,
            newOwner,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Transfer ownership fails if signer is not owner', async () => {
      const nonControllerSigner = new mockWalletClientNonController()
      const badClient = new LiquidSplitClient({
        chainId: 1,
        publicClient,
        walletClient: nonControllerSigner,
      })

      await expect(
        async () =>
          await badClient.transferOwnership({
            liquidSplitAddress,
            newOwner,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Transfer ownership passes', async () => {
      const { event } = await liquidSplitClient.transferOwnership({
        liquidSplitAddress,
        newOwner,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(liquidSplitAddress)
      expect(validateAddress).toBeCalledWith(newOwner)
      expect(moduleWriteActions.transferOwnership).toBeCalledWith(newOwner)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [liquidSplitClient.eventTopics.transferOwnership[0]],
      })
    })
  })
})

describe('Liquid split reads', () => {
  const publicClient = new mockPublicClient()
  const liquidSplitClient = new LiquidSplitClient({
    chainId: 1,
    publicClient,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
  })

  describe('Get distributor fee test', () => {
    const liquidSplitAddress = '0xgetDistributorFee'

    beforeEach(() => {
      readActions.distributorFee.mockClear()
    })

    test('Get distributor fee fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getDistributorFee({
            liquidSplitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns distributor fee', async () => {
      readActions.distributorFee.mockReturnValueOnce(10)
      const { distributorFee } = await liquidSplitClient.getDistributorFee({
        liquidSplitAddress,
      })

      expect(distributorFee).toEqual(10)
      expect(validateAddress).toBeCalledWith(liquidSplitAddress)
      expect(readActions.distributorFee).toBeCalled()
    })
  })

  describe('Get payout split test', () => {
    const liquidSplitAddress = '0xgetPayoutSplit'

    beforeEach(() => {
      readActions.payoutSplit.mockClear()
    })

    test('Get payout split fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getPayoutSplit({
            liquidSplitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns payout split', async () => {
      readActions.payoutSplit.mockReturnValueOnce('0xsplit')
      const { payoutSplitAddress } = await liquidSplitClient.getPayoutSplit({
        liquidSplitAddress,
      })

      expect(payoutSplitAddress).toEqual('0xsplit')
      expect(validateAddress).toBeCalledWith(liquidSplitAddress)
      expect(readActions.payoutSplit).toBeCalled()
    })
  })

  describe('Get owner test', () => {
    const liquidSplitAddress = '0xgetOwner'

    beforeEach(() => {
      readActions.owner.mockClear()
    })

    test('Get owner fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getOwner({
            liquidSplitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns owner', async () => {
      readActions.owner.mockReturnValueOnce('0xowner')
      const { owner } = await liquidSplitClient.getOwner({
        liquidSplitAddress,
      })

      expect(owner).toEqual('0xowner')
      expect(validateAddress).toBeCalledWith(liquidSplitAddress)
      expect(readActions.owner).toBeCalled()
    })
  })

  describe('Get uri test', () => {
    const liquidSplitAddress = '0xgetUri'

    beforeEach(() => {
      readActions.uri.mockClear()
    })

    test('Get uri fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getUri({
            liquidSplitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns uri', async () => {
      readActions.uri.mockReturnValueOnce('uri')
      const { uri } = await liquidSplitClient.getUri({
        liquidSplitAddress,
      })

      expect(uri).toEqual('uri')
      expect(validateAddress).toBeCalledWith(liquidSplitAddress)
      expect(readActions.uri).toBeCalled()
    })
  })

  describe('Get scaled percent balance test', () => {
    const liquidSplitAddress = '0xgetScaledPercentBalance'
    const address = '0xaddress'

    beforeEach(() => {
      readActions.scaledPercentBalanceOf.mockClear()
    })

    test('Get scaled percent balance fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getScaledPercentBalanceOf({
            liquidSplitAddress,
            address,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns scaled percent balance', async () => {
      readActions.scaledPercentBalanceOf.mockReturnValueOnce(15)
      const { scaledPercentBalance } =
        await liquidSplitClient.getScaledPercentBalanceOf({
          liquidSplitAddress,
          address,
        })

      expect(scaledPercentBalance).toEqual(15)
      expect(validateAddress).toBeCalledWith(liquidSplitAddress)
      expect(validateAddress).toBeCalledWith(address)
      expect(readActions.scaledPercentBalanceOf).toBeCalledWith([address])
    })
  })

  describe('Get nft image test', () => {
    const liquidSplitAddress = '0xgetImage'

    beforeEach(() => {
      readActions.uri.mockClear()
    })

    test('Get image fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getNftImage({
            liquidSplitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns image', async () => {
      readActions.uri.mockReturnValueOnce(
        `${LIQUID_SPLIT_URI_BASE_64_HEADER}${encode('{"image": "testImage"}')}`,
      )
      const { image } = await liquidSplitClient.getNftImage({
        liquidSplitAddress,
      })

      expect(image).toEqual('testImage')
      expect(validateAddress).toBeCalledWith(liquidSplitAddress)
      expect(readActions.uri).toBeCalled()
    })
  })
})
