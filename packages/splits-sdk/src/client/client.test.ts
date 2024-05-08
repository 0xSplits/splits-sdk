import {
  Account,
  Chain,
  Log,
  PublicClient,
  Transport,
  WalletClient,
  zeroAddress,
} from 'viem'
import { SplitV1Client as SplitsClient } from './splitV1'
import {
  InvalidAuthError,
  InvalidConfigError,
  MissingPublicClientError,
  MissingWalletClientError,
  UnsupportedChainIdError,
} from '../errors'
import * as utils from '../utils'
import * as numberUtils from '../utils/numbers'
import { validateSplitInputs, validateAddress } from '../utils/validation'
import {
  SORTED_ADDRESSES,
  SORTED_ALLOCATIONS,
  DISTRIBUTOR_FEE,
  CONTROLLER_ADDRESS,
  NEW_CONTROLLER_ADDRESS,
} from '../testing/constants'
import { MockGraphqlClient } from '../testing/mocks/graphql'
import { readActions, writeActions } from '../testing/mocks/splitMain'
import type { Split } from '../types'
import { MockViemContract } from '../testing/mocks/viemContract'
import { DataClient } from './data'

jest.mock('./data')

jest.mock('viem', () => {
  const originalModule = jest.requireActual('viem')
  return {
    ...originalModule,
    getContract: jest.fn(() => {
      return new MockViemContract(readActions, writeActions)
    }),
    getAddress: jest.fn((address) => address),
    decodeEventLog: jest.fn(() => {
      return {
        eventName: 'CreateSplit',
        args: {
          split: '0xsplit',
        },
      }
    }),
  }
})

jest.mock('../utils/validation')

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

const mockPublicClient = jest.fn(() => {
  return {
    simulateContract: jest.fn(
      async ({
        functionName,
        args,
      }: {
        functionName: string
        args: unknown[]
      }) => {
        type writeActionsType = typeof writeActions
        type writeKeys = keyof writeActionsType
        writeActions[functionName as writeKeys].call(this, ...args)

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
const mockWalletClientNewController = jest.fn(() => {
  return {
    account: {
      address: NEW_CONTROLLER_ADDRESS,
    },
    writeContract: jest.fn(() => {
      return '0xhash'
    }),
  } as unknown as WalletClient<Transport, Chain, Account>
})

describe('Client config validation', () => {
  const publicClient = new mockPublicClient()

  test('Including ens names with no provider fails', () => {
    expect(
      () => new SplitsClient({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
  })

  test('Including ens names with only ens provider passes', () => {
    expect(
      () =>
        new SplitsClient({
          chainId: 1,
          includeEnsNames: true,
          ensPublicClient: publicClient,
        }),
    ).not.toThrow()
  })

  test('Including ens names with only regular provider passes', () => {
    expect(
      () =>
        new SplitsClient({
          chainId: 1,
          includeEnsNames: true,
          publicClient,
        }),
    ).not.toThrow()
  })

  test('Invalid chain id fails', () => {
    expect(() => new SplitsClient({ chainId: 51 })).toThrow(
      UnsupportedChainIdError,
    )
  })

  test('Ethereum chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 1 })).not.toThrow()
  })

  test('Polygon chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 137 })).not.toThrow()
  })

  test('Optimism chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 10 })).not.toThrow()
  })

  test('Arbitrum chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 42161 })).not.toThrow()
  })

  test('Zora chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 7777777 })).not.toThrow()
  })

  test('Base chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 8453 })).not.toThrow()
  })

  test('Other chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 100 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 56 })).not.toThrow()
  })
})

describe('SplitMain writes', () => {
  const publicClient = new mockPublicClient()
  const walletClient = new mockWalletClient()
  const splitsClient = new SplitsClient({
    chainId: 1,
    apiConfig: {
      apiKey: '1',
    },
    publicClient,
    walletClient,
  })
  const getTransactionEventsSpy = jest
    .spyOn(splitsClient, 'getTransactionEvents')
    .mockImplementation(async () => {
      const event = {
        blockNumber: 12345,
        args: {
          split: '0xsplit',
        },
      } as unknown as Log
      return [event]
    })

  beforeEach(() => {
    ;(validateSplitInputs as jest.Mock).mockClear()
    ;(validateAddress as jest.Mock).mockClear()
    getTransactionEventsSpy.mockClear()
    getSortedRecipientsMock.mockClear()
    getBigIntMock.mockClear()
  })

  describe('Create split tests', () => {
    const recipients = [{ address: '0xuser', percentAllocation: 45 }]
    const distributorFeePercent = 7.35
    const createSplitResult = {
      value: 'create_split_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      writeActions.createSplit.mockClear()
      writeActions.createSplit.mockReturnValueOnce(createSplitResult)
    })

    test('Create split fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.createSplit({
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Create split fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.createSplit({
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Create immutable split passes', async () => {
      const { event, splitAddress } = await splitsClient.createSplit({
        recipients,
        distributorFeePercent,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(splitAddress).toEqual('0xsplit')
      expect(validateSplitInputs).toBeCalledWith(
        expect.objectContaining({
          recipients,
          distributorFeePercent,
        }),
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.createSplit).toBeCalledWith(
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        zeroAddress,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.createSplit[0]],
      })
    })

    test('Create mutable split passes', async () => {
      const controller = '0xSplitController'
      const { event, splitAddress } = await splitsClient.createSplit({
        recipients,
        distributorFeePercent,
        controller,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(splitAddress).toEqual('0xsplit')
      expect(validateSplitInputs).toBeCalledWith(
        expect.objectContaining({
          recipients,
          distributorFeePercent,
          controller,
        }),
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.createSplit).toBeCalledWith(
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        controller,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.createSplit[0]],
      })
    })
  })

  describe('Update split tests', () => {
    const recipients = [{ address: '0xhey', percentAllocation: 12 }]
    const distributorFeePercent = 9
    const splitAddress = '0xupdate'
    const updateSplitResult = {
      value: 'update_split_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      writeActions.updateSplit.mockClear()
      writeActions.updateSplit.mockReturnValueOnce(updateSplitResult)
    })

    test('Update split fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplit({
            splitAddress,
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Update split fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplit({
            splitAddress,
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Update split fails from non controller', async () => {
      const nonControllerSigner = new mockWalletClientNonController()
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        walletClient: nonControllerSigner,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplit({
            splitAddress,
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Update split passes', async () => {
      const { event } = await splitsClient.updateSplit({
        splitAddress,
        recipients,
        distributorFeePercent,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(validateSplitInputs).toBeCalledWith(
        expect.objectContaining({
          recipients,
          distributorFeePercent,
        }),
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateSplit).toBeCalledWith(
        splitAddress,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.updateSplit[0]],
      })
    })
  })

  describe('Distribute token tests', () => {
    const splitAddress = '0xdistribute'
    const recipients = [{ address: '0xd', percentAllocation: 78 }]
    const distributorFeePercent = 3
    const distributeETHResult = {
      value: 'distribute_eth_tx',
      wait: 'wait',
    }
    const distributeERC20Result = {
      value: 'distribute_erc20_tx',
      wait: 'wait',
    }

    const mockedDataClient = DataClient as jest.MockedClass<typeof DataClient>

    beforeEach(() => {
      mockedDataClient.prototype.getSplitMetadata.mockImplementationOnce(
        async () => {
          return {
            recipients: recipients.map((r) => {
              return {
                percentAllocation: r.percentAllocation,
                recipient: {
                  address: r.address,
                },
              }
            }),
            distributorFeePercent,
          } as unknown as Split
        },
      )
      writeActions.distributeETH.mockClear()
      writeActions.distributeERC20.mockClear()
      writeActions.distributeETH.mockReturnValueOnce(distributeETHResult)
      writeActions.distributeERC20.mockReturnValueOnce(distributeERC20Result)
    })

    test('Distribute token fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.distributeToken({
            splitAddress,
            token: zeroAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Distribute token fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.distributeToken({
            splitAddress,
            token: zeroAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Distribute eth passes', async () => {
      const { event } = await splitsClient.distributeToken({
        splitAddress,
        token: zeroAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(validateAddress).toBeCalledWith(zeroAddress)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeETH).toBeCalledWith(
        splitAddress,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.distributeToken[0]],
      })
    })

    test('Distribute erc20 passes', async () => {
      const token = '0xtoken'
      const { event } = await splitsClient.distributeToken({
        splitAddress,
        token,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeERC20).toBeCalledWith(
        splitAddress,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.distributeToken[1]],
      })
    })

    test('Distribute eth to payout address passes', async () => {
      const distributorAddress = '0xdistributor'
      const { event } = await splitsClient.distributeToken({
        splitAddress,
        token: zeroAddress,
        distributorAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(validateAddress).toBeCalledWith(zeroAddress)
      expect(validateAddress).toBeCalledWith(distributorAddress)
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeETH).toBeCalledWith(
        splitAddress,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.distributeToken[0]],
      })
    })

    test('Distribute erc20 to payout address passes', async () => {
      const token = '0xtoken'
      const distributorAddress = '0xdistributor'
      const { event } = await splitsClient.distributeToken({
        splitAddress,
        token,
        distributorAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(distributorAddress)
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeERC20).toBeCalledWith(
        splitAddress,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.distributeToken[1]],
      })
    })
  })

  describe('Update and distribute tests', () => {
    const splitAddress = '0xupdateanddisribute'
    const recipients = [{ address: '0x829', percentAllocation: 71 }]
    const distributorFeePercent = 4
    const updateAndDistributeETHResult = {
      value: 'update_and_distribute_eth_tx',
      wait: 'wait',
    }
    const updateAndDistributeERC20Result = {
      value: 'update_and_distribute_erc20_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      writeActions.updateAndDistributeETH.mockClear()
      writeActions.updateAndDistributeERC20.mockClear()
      writeActions.updateAndDistributeETH.mockReturnValueOnce(
        updateAndDistributeETHResult,
      )
      writeActions.updateAndDistributeERC20.mockReturnValueOnce(
        updateAndDistributeERC20Result,
      )
    })

    test('Update and distribute fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplitAndDistributeToken({
            splitAddress,
            recipients,
            distributorFeePercent,
            token: zeroAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Update and distribute fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplitAndDistributeToken({
            splitAddress,
            recipients,
            distributorFeePercent,
            token: zeroAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Update and distribute fails from non controller', async () => {
      const nonControllerSigner = new mockWalletClientNonController()
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        walletClient: nonControllerSigner,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplitAndDistributeToken({
            splitAddress,
            recipients,
            distributorFeePercent,
            token: zeroAddress,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Update and distribute eth passes', async () => {
      const { event } = await splitsClient.updateSplitAndDistributeToken({
        splitAddress,
        recipients,
        distributorFeePercent,
        token: zeroAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(validateAddress).toBeCalledWith(zeroAddress)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(validateSplitInputs).toBeCalledWith(
        expect.objectContaining({
          recipients,
          distributorFeePercent,
        }),
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateAndDistributeETH).toBeCalledWith(
        splitAddress,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [
          splitsClient.eventTopics.updateSplitAndDistributeToken[1],
        ],
      })
    })

    test('Update and distribute erc20 passes', async () => {
      const token = '0xtoken'
      const { event } = await splitsClient.updateSplitAndDistributeToken({
        splitAddress,
        recipients,
        distributorFeePercent,
        token,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(validateSplitInputs).toBeCalledWith({
        recipients,
        distributorFeePercent,
      })
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateAndDistributeERC20).toBeCalledWith(
        splitAddress,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [
          splitsClient.eventTopics.updateSplitAndDistributeToken[2],
        ],
      })
    })

    test('Update and distribute eth to payout address passes', async () => {
      const distributorAddress = '0xupdateDistributor'
      const { event } = await splitsClient.updateSplitAndDistributeToken({
        splitAddress,
        recipients,
        distributorFeePercent,
        token: zeroAddress,
        distributorAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(validateAddress).toBeCalledWith(zeroAddress)
      expect(validateAddress).toBeCalledWith(distributorAddress)
      expect(validateSplitInputs).toBeCalledWith({
        recipients,
        distributorFeePercent,
      })
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateAndDistributeETH).toBeCalledWith(
        splitAddress,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [
          splitsClient.eventTopics.updateSplitAndDistributeToken[1],
        ],
      })
    })

    test('Update and distribute erc20 to payout address passes', async () => {
      const token = '0xtoken'
      const distributorAddress = '0xupdateDistributor'
      const { event } = await splitsClient.updateSplitAndDistributeToken({
        splitAddress,
        recipients,
        distributorFeePercent,
        token,
        distributorAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(distributorAddress)
      expect(validateSplitInputs).toBeCalledWith({
        recipients,
        distributorFeePercent,
      })
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateAndDistributeERC20).toBeCalledWith(
        splitAddress,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [
          splitsClient.eventTopics.updateSplitAndDistributeToken[2],
        ],
      })
    })
  })

  describe('Withdraw funds tests', () => {
    const address = '0xwithdraw'
    const withdrawResult = {
      value: 'withdraw_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      writeActions.withdraw.mockClear()
      writeActions.withdraw.mockReturnValueOnce(withdrawResult)
    })

    test('Withdraw fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.withdrawFunds({
            address,
            tokens: [zeroAddress],
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Withdraw fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.withdrawFunds({
            address,
            tokens: [zeroAddress],
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Withdraw passes with erc20 and eth', async () => {
      const tokens = [zeroAddress, '0xerc20']

      const { event } = await splitsClient.withdrawFunds({
        address,
        tokens,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(address)
      expect(writeActions.withdraw).toBeCalledWith(address, 1, ['0xerc20'])
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.withdrawFunds[0]],
      })
    })

    test('Withdraw passes with only erc20', async () => {
      const tokens = ['0xerc20', '0xerc202']

      const { event } = await splitsClient.withdrawFunds({
        address,
        tokens,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(address)
      expect(writeActions.withdraw).toBeCalledWith(address, 0, [
        '0xerc20',
        '0xerc202',
      ])
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.withdrawFunds[0]],
      })
    })
  })

  describe('Initiate control transfer tests', () => {
    const splitAddress = '0xitransfer'
    const newController = '0xnewController'
    const initiateTransferResult = {
      value: 'initiate_transfer_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      writeActions.transferControl.mockClear()
      writeActions.transferControl.mockReturnValueOnce(initiateTransferResult)
    })

    test('Initiate transfer fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.initiateControlTransfer({
            splitAddress,
            newController,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Initate transfer fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.initiateControlTransfer({
            splitAddress,
            newController,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Initiate transfer fails from non controller', async () => {
      const nonControllerSigner = new mockWalletClientNonController()
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        walletClient: nonControllerSigner,
      })

      await expect(
        async () =>
          await badSplitsClient.initiateControlTransfer({
            splitAddress,
            newController,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Initate transfer passes', async () => {
      const { event } = await splitsClient.initiateControlTransfer({
        splitAddress,
        newController,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(writeActions.transferControl).toBeCalledWith(
        splitAddress,
        newController,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.initiateControlTransfer[0]],
      })
    })
  })

  describe('Cancel control transfer tests', () => {
    const splitAddress = '0xcancelTransfer'
    const cancelTransferResult = {
      value: 'cancel_transfer_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      writeActions.cancelControlTransfer.mockClear()
      writeActions.cancelControlTransfer.mockReturnValueOnce(
        cancelTransferResult,
      )
    })

    test('Cancel transfer fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.cancelControlTransfer({
            splitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Cancel transfer fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.cancelControlTransfer({
            splitAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Cancel transfer fails from non controller', async () => {
      const nonControllerSigner = new mockWalletClientNonController()
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        walletClient: nonControllerSigner,
      })

      await expect(
        async () =>
          await badSplitsClient.cancelControlTransfer({
            splitAddress,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Cancel transfer passes', async () => {
      const { event } = await splitsClient.cancelControlTransfer({
        splitAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(writeActions.cancelControlTransfer).toBeCalledWith(splitAddress)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.cancelControlTransfer[0]],
      })
    })
  })

  describe('Accept control transfer tests', () => {
    const splitAddress = '0xacceptTransfer'
    const acceptTransferResult = {
      value: 'accept_transfer_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      writeActions.acceptControl.mockClear()
      writeActions.acceptControl.mockReturnValueOnce(acceptTransferResult)
    })

    test('Accept transfer fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.acceptControlTransfer({
            splitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Accept transfer fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.acceptControlTransfer({
            splitAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Accept transfer fails from non new controller', async () => {
      await expect(
        async () =>
          await splitsClient.acceptControlTransfer({
            splitAddress,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Accept transfer passes', async () => {
      const walletClient = new mockWalletClientNewController()
      const splitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        walletClient,
      })
      const getTransactionEventsSpy = jest
        .spyOn(splitsClient, 'getTransactionEvents')
        .mockImplementation(async () => {
          const event = {
            blockNumber: 12345,
            args: {
              split: '0xsplit',
            },
          } as unknown as Log
          return [event]
        })

      const { event } = await splitsClient.acceptControlTransfer({
        splitAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(writeActions.acceptControl).toBeCalledWith(splitAddress)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.acceptControlTransfer[0]],
      })
    })
  })

  describe('Make split immutable tests', () => {
    const splitAddress = '0xmakeImmutable'
    const makeSplitImmutableResult = {
      value: 'make_split_immutable_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      writeActions.makeSplitImmutable.mockClear()
      writeActions.makeSplitImmutable.mockReturnValueOnce(
        makeSplitImmutableResult,
      )
    })

    test('Make immutable fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.makeSplitImmutable({
            splitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Make immutable fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.makeSplitImmutable({
            splitAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Make immutable fails from non controller', async () => {
      const nonControllerSigner = new mockWalletClientNonController()
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        walletClient: nonControllerSigner,
      })

      await expect(
        async () =>
          await badSplitsClient.makeSplitImmutable({
            splitAddress,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Make immutable passes', async () => {
      const { event } = await splitsClient.makeSplitImmutable({
        splitAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(writeActions.makeSplitImmutable).toBeCalledWith(splitAddress)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [splitsClient.eventTopics.makeSplitImmutable[0]],
      })
    })
  })
})

describe('SplitMain reads', () => {
  const publicClient = new mockPublicClient()
  const splitsClient = new SplitsClient({
    chainId: 1,
    publicClient,
  })

  beforeEach(() => {
    ;(validateSplitInputs as jest.Mock).mockClear()
    ;(validateAddress as jest.Mock).mockClear()
    getSortedRecipientsMock.mockClear()
    getBigIntMock.mockClear()
  })

  describe('Get split balance test', () => {
    const splitAddress = '0xgetbalance'

    beforeEach(() => {
      readActions.getETHBalance.mockClear()
    })

    test('Get balance fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.getSplitBalance({
            splitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns eth balance', async () => {
      readActions.getETHBalance.mockReturnValueOnce(BigInt(12))
      const { balance } = await splitsClient.getSplitBalance({ splitAddress })

      expect(balance).toEqual(BigInt(12))
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(readActions.getETHBalance).toBeCalledWith([splitAddress])
    })

    test('Returns ERC20 balance', async () => {
      const token = '0xerc20'
      readActions.getERC20Balance.mockReturnValueOnce(BigInt(19))
      const { balance } = await splitsClient.getSplitBalance({
        splitAddress,
        token,
      })

      expect(balance).toEqual(BigInt(19))
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(readActions.getERC20Balance).toBeCalledWith([splitAddress, token])
    })
  })

  describe('Predict immutable split address tests', () => {
    const recipients = [{ address: '0x54321', percentAllocation: 21 }]
    const distributorFeePercent = 8

    beforeEach(() => {
      readActions.predictImmutableSplitAddress.mockClear()
    })

    test('Predict immutable address fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.predictImmutableSplitAddress({
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Predicts immutable address', async () => {
      readActions.predictImmutableSplitAddress.mockReturnValueOnce('0xpredict')
      const { splitAddress } = await splitsClient.predictImmutableSplitAddress({
        recipients,
        distributorFeePercent,
      })

      expect(splitAddress).toEqual('0xpredict')
      expect(validateSplitInputs).toBeCalledWith({
        recipients,
        distributorFeePercent,
      })
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(readActions.predictImmutableSplitAddress).toBeCalledWith([
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS.map((a) => Number(a)),
        Number(DISTRIBUTOR_FEE),
      ])
    })
  })

  describe('Get controller tests', () => {
    const splitAddress = '0xgetController'

    beforeEach(() => {
      readActions.getController.mockClear()
    })

    test('Get controller fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.getController({
            splitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Get controller passes', async () => {
      const { controller } = await splitsClient.getController({ splitAddress })

      expect(controller).toEqual(CONTROLLER_ADDRESS)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(readActions.getController).toBeCalledWith([splitAddress])
    })
  })

  describe('Get new potential controller tests', () => {
    const splitAddress = '0xgetPotentialController'

    beforeEach(() => {
      readActions.getNewPotentialController.mockClear()
    })

    test('Get potential controller fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.getNewPotentialController({
            splitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Get potential controller passes', async () => {
      const { newPotentialController } =
        await splitsClient.getNewPotentialController({ splitAddress })

      expect(newPotentialController).toEqual(NEW_CONTROLLER_ADDRESS)
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(readActions.getNewPotentialController).toBeCalledWith([
        splitAddress,
      ])
    })
  })

  describe('Get hash tests', () => {
    const splitAddress = '0xhash'

    beforeEach(() => {
      readActions.getHash.mockClear()
    })

    test('Get hash fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.getHash({
            splitAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Get hash passes', async () => {
      readActions.getHash.mockReturnValueOnce('hash')
      const { hash } = await splitsClient.getHash({ splitAddress })

      expect(hash).toEqual('hash')
      expect(validateAddress).toBeCalledWith(splitAddress)
      expect(readActions.getHash).toBeCalledWith([splitAddress])
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
