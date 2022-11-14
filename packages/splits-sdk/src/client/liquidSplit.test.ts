import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import { AddressZero } from '@ethersproject/constants'
import type { Event } from '@ethersproject/contracts'
import { encode } from 'base-64'

import LiquidSplitClient from './liquidSplit'
import {
  LIQUID_SPLITS_MAX_PRECISION_DECIMALS,
  LIQUID_SPLIT_FACTORY_ADDRESS,
  LIQUID_SPLIT_URI_BASE_64_HEADER,
} from '../constants'
import {
  InvalidAuthError,
  InvalidConfigError,
  MissingProviderError,
  MissingSignerError,
  UnsupportedChainIdError,
} from '../errors'
import * as subgraph from '../subgraph'
import * as utils from '../utils'
import {
  validateAddress,
  validateDistributorFeePercent,
  validateRecipients,
} from '../utils/validation'
import {
  SORTED_ADDRESSES,
  SORTED_ALLOCATIONS,
  DISTRIBUTOR_FEE,
  CONTROLLER_ADDRESS,
  NFT_COUNTS,
} from '../testing/constants'
import { MockGraphqlClient } from '../testing/mocks/graphql'
import {
  MockLiquidSplitFactory,
  writeActions as factoryWriteActions,
} from '../testing/mocks/liquidSplitFactory'
import {
  MockLiquidSplit,
  writeActions as moduleWriteActions,
  readActions,
} from '../testing/mocks/liquidSplit'
import type { LiquidSplit } from '../types'

jest.mock('@ethersproject/contracts', () => {
  return {
    Contract: jest
      .fn()
      .mockImplementation((contractAddress, _contractInterface, provider) => {
        if (contractAddress === LIQUID_SPLIT_FACTORY_ADDRESS)
          return new MockLiquidSplitFactory(provider)

        return new MockLiquidSplit(provider)
      }),
  }
})

jest.mock('../utils/validation')

const getTransactionEventsSpy = jest
  .spyOn(utils, 'getTransactionEvents')
  .mockImplementation(async () => {
    const event = {
      blockNumber: 12345,
      args: {
        ls: '0xliquidSplit',
      },
    } as unknown as Event
    return [event]
  })
const getSortedRecipientsMock = jest
  .spyOn(utils, 'getRecipientSortedAddressesAndAllocations')
  .mockImplementation(() => {
    return [SORTED_ADDRESSES, SORTED_ALLOCATIONS]
  })
const getBigNumberMock = jest
  .spyOn(utils, 'getBigNumberFromPercent')
  .mockImplementation(() => {
    return DISTRIBUTOR_FEE
  })
const getNftCountsMock = jest
  .spyOn(utils, 'getNftCountsFromPercents')
  .mockImplementation(() => {
    return NFT_COUNTS
  })

const mockProvider = jest.fn<Provider, unknown[]>()
const mockSigner = jest.fn<Signer, unknown[]>(() => {
  return {
    getAddress: () => {
      return CONTROLLER_ADDRESS
    },
  } as unknown as Signer
})
const mockSignerNonController = jest.fn<Signer, unknown[]>(() => {
  return {
    getAddress: () => {
      return '0xnotController'
    },
  } as unknown as Signer
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
    expect(() => new LiquidSplitClient({ chainId: 5 })).not.toThrow()
  })

  test('Polygon chain ids pass', () => {
    expect(() => new LiquidSplitClient({ chainId: 137 })).not.toThrow()
    expect(() => new LiquidSplitClient({ chainId: 80001 })).not.toThrow()
  })

  test('Optimism chain ids pass', () => {
    expect(() => new LiquidSplitClient({ chainId: 10 })).not.toThrow()
    expect(() => new LiquidSplitClient({ chainId: 420 })).not.toThrow()
  })

  test('Arbitrum chain ids pass', () => {
    expect(() => new LiquidSplitClient({ chainId: 42161 })).not.toThrow()
    expect(() => new LiquidSplitClient({ chainId: 421613 })).not.toThrow()
  })
})

describe('Liquid split writes', () => {
  const provider = new mockProvider()
  const signer = new mockSigner()
  const liquidSplitClient = new LiquidSplitClient({
    chainId: 1,
    provider,
    signer,
  })

  beforeEach(() => {
    ;(validateRecipients as jest.Mock).mockClear()
    ;(validateDistributorFeePercent as jest.Mock).mockClear()
    ;(validateAddress as jest.Mock).mockClear()
    getTransactionEventsSpy.mockClear()
    getSortedRecipientsMock.mockClear()
    getNftCountsMock.mockClear()
    getBigNumberMock.mockClear()
  })

  describe('Create liquid split tests', () => {
    const recipients = [
      { address: '0xuser1', percentAllocation: 40 },
      { address: '0xuser2', percentAllocation: 60 },
    ]
    const distributorFeePercent = 7.35

    beforeEach(() => {
      factoryWriteActions.createLiquidSplit.mockClear()
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
      ).rejects.toThrow(MissingProviderError)
    })

    test('Create liquid split fails with no signer', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badClient.createLiquidSplit({
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Create liquid split passes', async () => {
      const { event, liquidSplitId } =
        await liquidSplitClient.createLiquidSplit({
          recipients,
          distributorFeePercent,
        })

      expect(event.blockNumber).toEqual(12345)
      expect(liquidSplitId).toEqual('0xliquidSplit')
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(validateRecipients).toBeCalledWith(
        recipients,
        LIQUID_SPLITS_MAX_PRECISION_DECIMALS,
      )
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(getNftCountsMock).toBeCalledWith(SORTED_ALLOCATIONS)
      expect(factoryWriteActions.createLiquidSplit).toBeCalledWith(
        SORTED_ADDRESSES,
        NFT_COUNTS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(factoryWriteActions.createLiquidSplitClone).not.toBeCalled()
      expect(getTransactionEventsSpy).toBeCalledWith('create_liquid_split_tx', [
        liquidSplitClient.eventTopics.createLiquidSplit[1],
      ])
    })

    test('Create liquid split clone passes', async () => {
      const { event, liquidSplitId } =
        await liquidSplitClient.createLiquidSplit({
          recipients,
          distributorFeePercent,
          createClone: true,
        })

      expect(event.blockNumber).toEqual(12345)
      expect(liquidSplitId).toEqual('0xliquidSplit')
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(validateRecipients).toBeCalledWith(
        recipients,
        LIQUID_SPLITS_MAX_PRECISION_DECIMALS,
      )
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(getNftCountsMock).toBeCalledWith(SORTED_ALLOCATIONS)
      expect(factoryWriteActions.createLiquidSplitClone).toBeCalledWith(
        SORTED_ADDRESSES,
        NFT_COUNTS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(factoryWriteActions.createLiquidSplit).not.toBeCalled()
      expect(getTransactionEventsSpy).toBeCalledWith(
        'create_liquid_split_clone_tx',
        [liquidSplitClient.eventTopics.createLiquidSplit[0]],
      )
    })

    test('Create liquid split passes with custom owner', async () => {
      const { event, liquidSplitId } =
        await liquidSplitClient.createLiquidSplit({
          recipients,
          distributorFeePercent,
          owner: '0xowner',
        })

      expect(event.blockNumber).toEqual(12345)
      expect(liquidSplitId).toEqual('0xliquidSplit')
      expect(validateAddress).toBeCalledWith('0xowner')
      expect(validateRecipients).toBeCalledWith(
        recipients,
        LIQUID_SPLITS_MAX_PRECISION_DECIMALS,
      )
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(getNftCountsMock).toBeCalledWith(SORTED_ALLOCATIONS)
      expect(factoryWriteActions.createLiquidSplit).toBeCalledWith(
        SORTED_ADDRESSES,
        NFT_COUNTS,
        DISTRIBUTOR_FEE,
        '0xowner',
      )
      expect(getTransactionEventsSpy).toBeCalledWith('create_liquid_split_tx', [
        liquidSplitClient.eventTopics.createLiquidSplit[1],
      ])
    })
  })

  describe('Distribute token tests', () => {
    const liquidSplitId = '0xliquidSplit'
    const token = '0xtoken'
    const holders = [
      { address: '0xd', percentAllocation: 25 },
      { address: '0xe', percentAllocation: 75 },
    ]

    beforeEach(() => {
      jest
        .spyOn(liquidSplitClient, 'getLiquidSplitMetadata')
        .mockImplementationOnce(async () => {
          return {
            holders,
          } as LiquidSplit
        })
      moduleWriteActions.distributeFunds.mockClear()
    })

    test('Distribute token fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.distributeToken({
            liquidSplitId,
            token,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Distribute token fails with no signer', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badClient.distributeToken({
            liquidSplitId,
            token,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Distribute token passes', async () => {
      const { event } = await liquidSplitClient.distributeToken({
        liquidSplitId,
        token,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(moduleWriteActions.distributeFunds).toBeCalledWith(
        token,
        holders.map((h) => h.address),
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(
        'distribute_funds_tx',
        [liquidSplitClient.eventTopics.distributeToken[2]], // Using split main event, not mocked right now
      )
    })

    test('Distribute token for eth passes', async () => {
      const { event } = await liquidSplitClient.distributeToken({
        liquidSplitId,
        token: AddressZero,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(validateAddress).toBeCalledWith(AddressZero)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(moduleWriteActions.distributeFunds).toBeCalledWith(
        AddressZero,
        holders.map((h) => h.address),
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(
        'distribute_funds_tx',
        [liquidSplitClient.eventTopics.distributeToken[1]], // Using split main event, not mocked right now
      )
    })

    test('Distribute token with custom distributor passes', async () => {
      const { event } = await liquidSplitClient.distributeToken({
        liquidSplitId,
        token,
        distributorAddress: '0xdistributor',
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith('0xdistributor')
      expect(moduleWriteActions.distributeFunds).toBeCalledWith(
        token,
        holders.map((h) => h.address),
        '0xdistributor',
      )
      expect(getTransactionEventsSpy).toBeCalledWith(
        'distribute_funds_tx',
        [liquidSplitClient.eventTopics.distributeToken[2]], // Using split main event, not mocked right now
      )
    })
  })

  describe('Transfer ownership tests', () => {
    const liquidSplitId = '0xliquidSplit'
    const newOwner = '0xnewOwner'

    beforeEach(() => {
      moduleWriteActions.transferOwnership.mockClear()
    })

    test('Transfer ownership fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.transferOwnership({
            liquidSplitId,
            newOwner,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Transfer ownership fails with no signer', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badClient.transferOwnership({
            liquidSplitId,
            newOwner,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Transfer ownership fails if signer is not owner', async () => {
      const nonControllerSigner = new mockSignerNonController()
      const badClient = new LiquidSplitClient({
        chainId: 1,
        provider,
        signer: nonControllerSigner,
      })

      await expect(
        async () =>
          await badClient.transferOwnership({
            liquidSplitId,
            newOwner,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Transfer ownership passes', async () => {
      const { event } = await liquidSplitClient.transferOwnership({
        liquidSplitId,
        newOwner,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(validateAddress).toBeCalledWith(newOwner)
      expect(moduleWriteActions.transferOwnership).toBeCalledWith(newOwner)
      expect(getTransactionEventsSpy).toBeCalledWith('transfer_ownership_tx', [
        liquidSplitClient.eventTopics.transferOwnership[0],
      ])
    })
  })
})

describe('Liquid split reads', () => {
  const provider = new mockProvider()
  const liquidSplitClient = new LiquidSplitClient({
    chainId: 1,
    provider,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
  })

  describe('Get distributor fee test', () => {
    const liquidSplitId = '0xgetDistributorFee'

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
            liquidSplitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns distributor fee', async () => {
      readActions.distributorFee.mockReturnValueOnce(10)
      const { distributorFee } = await liquidSplitClient.getDistributorFee({
        liquidSplitId,
      })

      expect(distributorFee).toEqual(10)
      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(readActions.distributorFee).toBeCalled()
    })
  })

  describe('Get payout split test', () => {
    const liquidSplitId = '0xgetPayoutSplit'

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
            liquidSplitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns payout split', async () => {
      readActions.payoutSplit.mockReturnValueOnce('0xsplit')
      const { payoutSplitId } = await liquidSplitClient.getPayoutSplit({
        liquidSplitId,
      })

      expect(payoutSplitId).toEqual('0xsplit')
      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(readActions.payoutSplit).toBeCalled()
    })
  })

  describe('Get owner test', () => {
    const liquidSplitId = '0xgetOwner'

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
            liquidSplitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns owner', async () => {
      readActions.owner.mockReturnValueOnce('0xowner')
      const { owner } = await liquidSplitClient.getOwner({
        liquidSplitId,
      })

      expect(owner).toEqual('0xowner')
      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(readActions.owner).toBeCalled()
    })
  })

  describe('Get uri test', () => {
    const liquidSplitId = '0xgetUri'

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
            liquidSplitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns uri', async () => {
      readActions.uri.mockReturnValueOnce('uri')
      const { uri } = await liquidSplitClient.getUri({
        liquidSplitId,
      })

      expect(uri).toEqual('uri')
      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(readActions.uri).toBeCalled()
    })
  })

  describe('Get scaled percent balance test', () => {
    const liquidSplitId = '0xgetScaledPercentBalance'
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
            liquidSplitId,
            address,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns scaled percent balance', async () => {
      readActions.scaledPercentBalanceOf.mockReturnValueOnce(15)
      const { scaledPercentBalance } =
        await liquidSplitClient.getScaledPercentBalanceOf({
          liquidSplitId,
          address,
        })

      expect(scaledPercentBalance).toEqual(15)
      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(validateAddress).toBeCalledWith(address)
      expect(readActions.scaledPercentBalanceOf).toBeCalledWith(address)
    })
  })

  describe('Get nft image test', () => {
    const liquidSplitId = '0xgetImage'

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
            liquidSplitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns image', async () => {
      readActions.uri.mockReturnValueOnce(
        `${LIQUID_SPLIT_URI_BASE_64_HEADER}${encode('{"image": "testImage"}')}`,
      )
      const { image } = await liquidSplitClient.getNftImage({
        liquidSplitId,
      })

      expect(image).toEqual('testImage')
      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(readActions.uri).toBeCalled()
    })
  })
})

const mockGqlClient = new MockGraphqlClient()
jest.mock('graphql-request', () => {
  return {
    GraphQLClient: jest.fn().mockImplementation(() => {
      return mockGqlClient
    }),
    gql: jest.fn(),
  }
})

describe('Graphql reads', () => {
  const mockFormatLiquidSplit = jest
    .spyOn(subgraph, 'protectedFormatLiquidSplit')
    .mockReturnValue('formatted_liquid_split' as unknown as LiquidSplit)
  const mockAddEnsNames = jest.spyOn(utils, 'addEnsNames').mockImplementation()
  const mockGqlLiquidSplit = {
    token: {
      id: '0xliquidSplitToken',
    },
  }

  const liquidSplitId = '0xliquidSplit'
  const provider = new mockProvider()
  const liquidSplitClient = new LiquidSplitClient({
    chainId: 1,
    provider,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
    mockGqlClient.request.mockClear()
    mockFormatLiquidSplit.mockClear()
    mockAddEnsNames.mockClear()
  })

  describe('Get liquid split metadata tests', () => {
    beforeEach(() => {
      mockGqlClient.request.mockReturnValue({
        liquidSplit: {
          token: {
            id: '0xliquidSplitToken',
          },
        },
      })
    })

    test('Get liquid split metadata fails with no provider', async () => {
      const badClient = new LiquidSplitClient({
        chainId: 1,
      })
      await expect(
        async () =>
          await badClient.getLiquidSplitMetadata({
            liquidSplitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Get liquid split metadata passes', async () => {
      const liquidSplit = await liquidSplitClient.getLiquidSplitMetadata({
        liquidSplitId,
      })

      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.LIQUID_SPLIT_QUERY,
        {
          liquidSplitId: liquidSplitId.toLowerCase(),
        },
      )
      expect(mockFormatLiquidSplit).toBeCalledWith(mockGqlLiquidSplit)
      expect(liquidSplit).toEqual('formatted_liquid_split')
      expect(mockAddEnsNames).not.toBeCalled()
    })

    test('Adds ens names', async () => {
      const provider = new mockProvider()
      const ensLiquidSplitClient = new LiquidSplitClient({
        chainId: 1,
        provider,
        includeEnsNames: true,
      })

      const liquidSplit = await ensLiquidSplitClient.getLiquidSplitMetadata({
        liquidSplitId,
      })

      expect(validateAddress).toBeCalledWith(liquidSplitId)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.LIQUID_SPLIT_QUERY,
        {
          liquidSplitId: liquidSplitId.toLowerCase(),
        },
      )
      expect(mockFormatLiquidSplit).toBeCalledWith(mockGqlLiquidSplit)
      expect(liquidSplit).toEqual('formatted_liquid_split')
      expect(mockAddEnsNames).toBeCalled()
    })
  })
})
