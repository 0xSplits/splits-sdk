import { Log, PublicClient, WalletClient } from 'viem'

import { ADDRESS_ZERO } from '../constants'
import { SplitsClient } from './index'
import {
  InvalidAuthError,
  InvalidConfigError,
  MissingProviderError,
  MissingSignerError,
  UnsupportedChainIdError,
  UnsupportedSubgraphChainIdError,
} from '../errors'
import * as subgraph from '../subgraph'
import * as utils from '../utils'
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

const getTransactionEventsSpy = jest
  .spyOn(utils, 'getTransactionEvents')
  .mockImplementation(async () => {
    const event = {
      blockNumber: 12345,
      args: {
        split: '0xsplit',
      },
    } as unknown as Log
    return [event]
  })
const getSortedRecipientsMock = jest
  .spyOn(utils, 'getRecipientSortedAddressesAndAllocations')
  .mockImplementation(() => {
    return [SORTED_ADDRESSES, SORTED_ALLOCATIONS]
  })
const getBigIntMock = jest
  .spyOn(utils, 'getBigIntFromPercent')
  .mockImplementation(() => {
    return DISTRIBUTOR_FEE
  })

const mockProvider = jest.fn(() => {
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
  } as unknown as PublicClient
})
const mockSigner = jest.fn(() => {
  return {
    account: {
      address: CONTROLLER_ADDRESS,
    },
    writeContract: jest.fn(() => {
      return '0xhash'
    }),
  } as unknown as WalletClient
})
const mockSignerNonController = jest.fn(() => {
  return {
    account: {
      address: '0xnotController',
    },
    writeContract: jest.fn(() => {
      return '0xhash'
    }),
  } as unknown as WalletClient
})
const mockSignerNewController = jest.fn(() => {
  return {
    account: {
      address: NEW_CONTROLLER_ADDRESS,
    },
    writeContract: jest.fn(() => {
      return '0xhash'
    }),
  } as unknown as WalletClient
})

describe('Client config validation', () => {
  const publicClient = new mockProvider()

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
          ensProvider: publicClient,
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
    expect(() => new SplitsClient({ chainId: 3 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 4 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 5 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 42 })).not.toThrow()
  })

  test('Polygon chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 137 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 80001 })).not.toThrow()
  })

  test('Optimism chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 10 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 420 })).not.toThrow()
  })

  test('Arbitrum chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 42161 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 421613 })).not.toThrow()
  })

  test('Zora chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 7777777 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 999 })).not.toThrow()
  })

  test('Base chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 8453 })).not.toThrow()
  })

  test('Other chain ids pass', () => {
    expect(() => new SplitsClient({ chainId: 100 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 250 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 43114 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 56 })).not.toThrow()
    expect(() => new SplitsClient({ chainId: 1313161554 })).not.toThrow()
  })
})

describe('SplitMain writes', () => {
  const publicClient = new mockProvider()
  const account = new mockSigner()
  const splitsClient = new SplitsClient({
    chainId: 1,
    publicClient,
    account,
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
      ).rejects.toThrow(MissingProviderError)
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
      ).rejects.toThrow(MissingSignerError)
    })

    test('Create immutable split passes', async () => {
      const { event, splitId } = await splitsClient.createSplit({
        recipients,
        distributorFeePercent,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(splitId).toEqual('0xsplit')
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
        ADDRESS_ZERO,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.createSplit[0],
      ])
    })

    test('Create mutable split passes', async () => {
      const controller = '0xSplitController'
      const { event, splitId } = await splitsClient.createSplit({
        recipients,
        distributorFeePercent,
        controller,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(splitId).toEqual('0xsplit')
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
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.createSplit[0],
      ])
    })
  })

  describe('Update split tests', () => {
    const recipients = [{ address: '0xhey', percentAllocation: 12 }]
    const distributorFeePercent = 9
    const splitId = '0xupdate'
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
            splitId,
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Update split fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplit({
            splitId,
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Update split fails from non controller', async () => {
      const nonControllerSigner = new mockSignerNonController()
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        account: nonControllerSigner,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplit({
            splitId,
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Update split passes', async () => {
      const { event } = await splitsClient.updateSplit({
        splitId,
        recipients,
        distributorFeePercent,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateSplitInputs).toBeCalledWith(
        expect.objectContaining({
          recipients,
          distributorFeePercent,
        }),
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateSplit).toBeCalledWith(
        splitId,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.updateSplit[0],
      ])
    })
  })

  describe('Distribute token tests', () => {
    const splitId = '0xdistribute'
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

    beforeEach(() => {
      jest
        .spyOn(splitsClient, 'getSplitMetadata')
        .mockImplementationOnce(async () => {
          return {
            recipients,
            distributorFeePercent,
          } as Split
        })
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
            splitId,
            token: ADDRESS_ZERO,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Distribute token fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.distributeToken({
            splitId,
            token: ADDRESS_ZERO,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Distribute eth passes', async () => {
      const { event } = await splitsClient.distributeToken({
        splitId,
        token: ADDRESS_ZERO,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(ADDRESS_ZERO)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeETH).toBeCalledWith(
        splitId,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.distributeToken[0],
      ])
    })

    test('Distribute erc20 passes', async () => {
      const token = '0xtoken'
      const { event } = await splitsClient.distributeToken({
        splitId,
        token,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeERC20).toBeCalledWith(
        splitId,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.distributeToken[1],
      ])
    })

    test('Distribute eth to payout address passes', async () => {
      const distributorAddress = '0xdistributor'
      const { event } = await splitsClient.distributeToken({
        splitId,
        token: ADDRESS_ZERO,
        distributorAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(ADDRESS_ZERO)
      expect(validateAddress).toBeCalledWith(distributorAddress)
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeETH).toBeCalledWith(
        splitId,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.distributeToken[0],
      ])
    })

    test('Distribute erc20 to payout address passes', async () => {
      const token = '0xtoken'
      const distributorAddress = '0xdistributor'
      const { event } = await splitsClient.distributeToken({
        splitId,
        token,
        distributorAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(distributorAddress)
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeERC20).toBeCalledWith(
        splitId,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.distributeToken[1],
      ])
    })
  })

  describe('Update and distribute tests', () => {
    const splitId = '0xupdateanddisribute'
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
            splitId,
            recipients,
            distributorFeePercent,
            token: ADDRESS_ZERO,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Update and distribute fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplitAndDistributeToken({
            splitId,
            recipients,
            distributorFeePercent,
            token: ADDRESS_ZERO,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Update and distribute fails from non controller', async () => {
      const nonControllerSigner = new mockSignerNonController()
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        account: nonControllerSigner,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplitAndDistributeToken({
            splitId,
            recipients,
            distributorFeePercent,
            token: ADDRESS_ZERO,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Update and distribute eth passes', async () => {
      const { event } = await splitsClient.updateSplitAndDistributeToken({
        splitId,
        recipients,
        distributorFeePercent,
        token: ADDRESS_ZERO,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(ADDRESS_ZERO)
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
        splitId,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.updateSplitAndDistributeToken[1],
      ])
    })

    test('Update and distribute erc20 passes', async () => {
      const token = '0xtoken'
      const { event } = await splitsClient.updateSplitAndDistributeToken({
        splitId,
        recipients,
        distributorFeePercent,
        token,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(validateSplitInputs).toBeCalledWith({
        recipients,
        distributorFeePercent,
      })
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateAndDistributeERC20).toBeCalledWith(
        splitId,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.updateSplitAndDistributeToken[2],
      ])
    })

    test('Update and distribute eth to payout address passes', async () => {
      const distributorAddress = '0xupdateDistributor'
      const { event } = await splitsClient.updateSplitAndDistributeToken({
        splitId,
        recipients,
        distributorFeePercent,
        token: ADDRESS_ZERO,
        distributorAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(ADDRESS_ZERO)
      expect(validateAddress).toBeCalledWith(distributorAddress)
      expect(validateSplitInputs).toBeCalledWith({
        recipients,
        distributorFeePercent,
      })
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateAndDistributeETH).toBeCalledWith(
        splitId,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.updateSplitAndDistributeToken[1],
      ])
    })

    test('Update and distribute erc20 to payout address passes', async () => {
      const token = '0xtoken'
      const distributorAddress = '0xupdateDistributor'
      const { event } = await splitsClient.updateSplitAndDistributeToken({
        splitId,
        recipients,
        distributorFeePercent,
        token,
        distributorAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(distributorAddress)
      expect(validateSplitInputs).toBeCalledWith({
        recipients,
        distributorFeePercent,
      })
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigIntMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateAndDistributeERC20).toBeCalledWith(
        splitId,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.updateSplitAndDistributeToken[2],
      ])
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
            tokens: [ADDRESS_ZERO],
          }),
      ).rejects.toThrow(MissingProviderError)
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
            tokens: [ADDRESS_ZERO],
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Withdraw passes with erc20 and eth', async () => {
      const tokens = [ADDRESS_ZERO, '0xerc20']

      const { event } = await splitsClient.withdrawFunds({
        address,
        tokens,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(address)
      expect(writeActions.withdraw).toBeCalledWith(address, 1, ['0xerc20'])
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.withdrawFunds[0],
      ])
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
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.withdrawFunds[0],
      ])
    })
  })

  describe('Initiate control transfer tests', () => {
    const splitId = '0xitransfer'
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
            splitId,
            newController,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Initate transfer fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.initiateControlTransfer({
            splitId,
            newController,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Initiate transfer fails from non controller', async () => {
      const nonControllerSigner = new mockSignerNonController()
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        account: nonControllerSigner,
      })

      await expect(
        async () =>
          await badSplitsClient.initiateControlTransfer({
            splitId,
            newController,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Initate transfer passes', async () => {
      const { event } = await splitsClient.initiateControlTransfer({
        splitId,
        newController,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(writeActions.transferControl).toBeCalledWith(
        splitId,
        newController,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.initiateControlTransfer[0],
      ])
    })
  })

  describe('Cancel control transfer tests', () => {
    const splitId = '0xcancelTransfer'
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
            splitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Cancel transfer fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.cancelControlTransfer({
            splitId,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Cancel transfer fails from non controller', async () => {
      const nonControllerSigner = new mockSignerNonController()
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        account: nonControllerSigner,
      })

      await expect(
        async () =>
          await badSplitsClient.cancelControlTransfer({
            splitId,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Cancel transfer passes', async () => {
      const { event } = await splitsClient.cancelControlTransfer({
        splitId,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(writeActions.cancelControlTransfer).toBeCalledWith(splitId)
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.cancelControlTransfer[0],
      ])
    })
  })

  describe('Accept control transfer tests', () => {
    const splitId = '0xacceptTransfer'
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
            splitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Accept transfer fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.acceptControlTransfer({
            splitId,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Accept transfer fails from non new controller', async () => {
      await expect(
        async () =>
          await splitsClient.acceptControlTransfer({
            splitId,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Accept transfer passes', async () => {
      const account = new mockSignerNewController()
      const splitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        account,
      })

      const { event } = await splitsClient.acceptControlTransfer({
        splitId,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(writeActions.acceptControl).toBeCalledWith(splitId)
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.acceptControlTransfer[0],
      ])
    })
  })

  describe('Make split immutable tests', () => {
    const splitId = '0xmakeImmutable'
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
            splitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Make immutable fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badSplitsClient.makeSplitImmutable({
            splitId,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Make immutable fails from non controller', async () => {
      const nonControllerSigner = new mockSignerNonController()
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        account: nonControllerSigner,
      })

      await expect(
        async () =>
          await badSplitsClient.makeSplitImmutable({
            splitId,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Make immutable passes', async () => {
      const { event } = await splitsClient.makeSplitImmutable({
        splitId,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(writeActions.makeSplitImmutable).toBeCalledWith(splitId)
      expect(getTransactionEventsSpy).toBeCalledWith(publicClient, '0xhash', [
        splitsClient.eventTopics.makeSplitImmutable[0],
      ])
    })
  })
})

describe('SplitMain reads', () => {
  const publicClient = new mockProvider()
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
    const splitId = '0xgetbalance'

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
            splitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns eth balance', async () => {
      readActions.getETHBalance.mockReturnValueOnce(BigInt(12))
      const { balance } = await splitsClient.getSplitBalance({ splitId })

      expect(balance).toEqual(BigInt(12))
      expect(validateAddress).toBeCalledWith(splitId)
      expect(readActions.getETHBalance).toBeCalledWith([splitId])
    })

    test('Returns ERC20 balance', async () => {
      const token = '0xerc20'
      readActions.getERC20Balance.mockReturnValueOnce(BigInt(19))
      const { balance } = await splitsClient.getSplitBalance({ splitId, token })

      expect(balance).toEqual(BigInt(19))
      expect(validateAddress).toBeCalledWith(splitId)
      expect(readActions.getERC20Balance).toBeCalledWith([splitId, token])
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
      ).rejects.toThrow(MissingProviderError)
    })

    test('Predicts immutable address', async () => {
      readActions.predictImmutableSplitAddress.mockReturnValueOnce('0xpredict')
      const { splitId } = await splitsClient.predictImmutableSplitAddress({
        recipients,
        distributorFeePercent,
      })

      expect(splitId).toEqual('0xpredict')
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
    const splitId = '0xgetController'

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
            splitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Get controller passes', async () => {
      const { controller } = await splitsClient.getController({ splitId })

      expect(controller).toEqual(CONTROLLER_ADDRESS)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(readActions.getController).toBeCalledWith([splitId])
    })
  })

  describe('Get new potential controller tests', () => {
    const splitId = '0xgetPotentialController'

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
            splitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Get potential controller passes', async () => {
      const { newPotentialController } =
        await splitsClient.getNewPotentialController({ splitId })

      expect(newPotentialController).toEqual(NEW_CONTROLLER_ADDRESS)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(readActions.getNewPotentialController).toBeCalledWith([splitId])
    })
  })

  describe('Get hash tests', () => {
    const splitId = '0xhash'

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
            splitId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Get hash passes', async () => {
      readActions.getHash.mockReturnValueOnce('hash')
      const { hash } = await splitsClient.getHash({ splitId })

      expect(hash).toEqual('hash')
      expect(validateAddress).toBeCalledWith(splitId)
      expect(readActions.getHash).toBeCalledWith([splitId])
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
  const mockSplit = {
    recipients: [
      {
        address: '0xrecipient',
      },
    ],
  } as Split

  const mockFormatSplit = jest
    .spyOn(subgraph, 'protectedFormatSplit')
    .mockReturnValue(mockSplit)
  const mockAddEnsNames = jest.spyOn(utils, 'addEnsNames').mockImplementation()

  const splitId = '0xsplit'
  const userId = '0xuser'
  const splitsClient = new SplitsClient({
    chainId: 1,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
    mockGqlClient.request.mockClear()
    mockFormatSplit.mockClear()
    mockAddEnsNames.mockClear()
  })

  describe('Get split metadata tests', () => {
    beforeEach(() => {
      mockGqlClient.request.mockReturnValue({ split: 'gqlSplit' })
    })

    test('Invalid chain id', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 4,
      })

      expect(
        async () => await badSplitsClient.getSplitMetadata({ splitId }),
      ).rejects.toThrow(UnsupportedSubgraphChainIdError)
    })

    test('Get split metadata passes', async () => {
      const split = await splitsClient.getSplitMetadata({ splitId })

      expect(validateAddress).toBeCalledWith(splitId)
      expect(mockGqlClient.request).toBeCalledWith(subgraph.SPLIT_QUERY, {
        splitId,
      })
      expect(mockFormatSplit).toBeCalledWith('gqlSplit')
      expect(split).toEqual(mockSplit)
      expect(mockAddEnsNames).not.toBeCalled()
    })

    test('Adds ens names', async () => {
      const publicClient = new mockProvider()
      const ensSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        includeEnsNames: true,
      })

      const split = await ensSplitsClient.getSplitMetadata({ splitId })

      expect(validateAddress).toBeCalledWith(splitId)
      expect(mockGqlClient.request).toBeCalledWith(subgraph.SPLIT_QUERY, {
        splitId,
      })
      expect(mockFormatSplit).toBeCalledWith('gqlSplit')
      expect(split).toEqual(mockSplit)
      expect(mockAddEnsNames).toBeCalled()
    })
  })

  describe('Get related splits tests', () => {
    const mockReceivingSplit = {
      ...mockSplit,
      address: '0xReceivingSplit',
    }
    const mockControllingSplit1 = {
      ...mockSplit,
      address: '0xControllingSplit1',
    }
    const mockControllingSplit2 = {
      ...mockSplit,
      address: '0xControllingSplit2',
    }
    const mockPendingControlSplit = {
      ...mockSplit,
      address: '0xPendingControlSplit',
    }

    beforeEach(() => {
      mockGqlClient.request.mockReturnValueOnce({
        receivingFrom: [{ split: mockReceivingSplit }],
        controlling: [mockControllingSplit1, mockControllingSplit2],
        pendingControl: [mockPendingControlSplit],
      })
      mockFormatSplit.mockImplementation((input) => {
        return input as unknown as Split
      })
    })

    test('Invalid chain id', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 4,
      })

      expect(
        async () => await badSplitsClient.getRelatedSplits({ address: userId }),
      ).rejects.toThrow(UnsupportedSubgraphChainIdError)
    })

    test('Get related splits passes', async () => {
      const { receivingFrom, controlling, pendingControl } =
        await splitsClient.getRelatedSplits({ address: userId })

      expect(validateAddress).toBeCalledWith(userId)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.RELATED_SPLITS_QUERY,
        {
          accountId: userId,
        },
      )
      expect(mockFormatSplit).toBeCalledTimes(4)
      expect(receivingFrom).toEqual([mockReceivingSplit])
      expect(controlling).toEqual([
        mockControllingSplit1,
        mockControllingSplit2,
      ])
      expect(pendingControl).toEqual([mockPendingControlSplit])
      expect(mockAddEnsNames).not.toBeCalled()
    })

    test('Adds ens names', async () => {
      const publicClient = new mockProvider()
      const ensSplitsClient = new SplitsClient({
        chainId: 1,
        publicClient,
        includeEnsNames: true,
      })

      const { receivingFrom, controlling, pendingControl } =
        await ensSplitsClient.getRelatedSplits({ address: userId })

      expect(validateAddress).toBeCalledWith(userId)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.RELATED_SPLITS_QUERY,
        {
          accountId: userId,
        },
      )
      expect(mockFormatSplit).toBeCalledTimes(4)
      expect(receivingFrom).toEqual([mockReceivingSplit])
      expect(controlling).toEqual([
        mockControllingSplit1,
        mockControllingSplit2,
      ])
      expect(pendingControl).toEqual([mockPendingControlSplit])
      expect(mockAddEnsNames).toBeCalledTimes(4)
    })
  })
})
