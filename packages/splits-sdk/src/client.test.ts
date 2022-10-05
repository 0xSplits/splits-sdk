import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import type { Event } from '@ethersproject/contracts'

import { SplitsClient } from './client'
import {
  InvalidAuthError,
  InvalidConfigError,
  MissingProviderError,
  MissingSignerError,
  UnsupportedChainIdError,
  UnsupportedSubgraphChainIdError,
} from './errors'
import * as subgraph from './subgraph'
import * as utils from './utils'
import {
  validateRecipients,
  validateDistributorFeePercent,
  validateAddress,
} from './utils/validation'
import {
  SORTED_ADDRESSES,
  SORTED_ALLOCATIONS,
  DISTRIBUTOR_FEE,
  CONTROLLER_ADDRESS,
  NEW_CONTROLLER_ADDRESS,
} from './testing/constants'
import { MockGraphqlClient } from './testing/mocks/graphql'
import {
  MockSplitMain,
  readActions,
  writeActions,
} from './testing/mocks/splitMain'
import type { Split } from './types'

jest.mock('@ethersproject/contracts', () => {
  return {
    Contract: jest
      .fn()
      .mockImplementation((_contractAddress, _contractInterface, provider) => {
        return new MockSplitMain(provider)
      }),
  }
})

jest.mock('./utils/validation')

const getTransactionEventSpy = jest
  .spyOn(utils, 'getTransactionEvent')
  .mockImplementation(async () => {
    const event = {
      blockNumber: 12345,
      args: {
        split: '0xsplit',
      },
    } as unknown as Event
    return event
  })
const getSortedRecipientsMock = jest
  .spyOn(utils, 'getRecipientSortedAddressesAndAllocations')
  .mockImplementation(() => {
    return [SORTED_ADDRESSES, SORTED_ALLOCATIONS]
  })
const getBigNumberMock = jest
  .spyOn(utils, 'getBigNumberValue')
  .mockImplementation(() => {
    return DISTRIBUTOR_FEE
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
const mockSignerNewController = jest.fn<Signer, unknown[]>(() => {
  return {
    getAddress: () => {
      return NEW_CONTROLLER_ADDRESS
    },
  } as unknown as Signer
})

describe('Client config validation', () => {
  const provider = new mockProvider()

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
          ensProvider: provider,
        }),
    ).not.toThrow()
  })

  test('Including ens names with only regular provider passes', () => {
    expect(
      () =>
        new SplitsClient({
          chainId: 1,
          includeEnsNames: true,
          provider,
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
})

describe('SplitMain writes', () => {
  const provider = new mockProvider()
  const signer = new mockSigner()
  const splitsClient = new SplitsClient({
    chainId: 1,
    provider,
    signer,
  })

  beforeEach(() => {
    ;(validateRecipients as jest.Mock).mockClear()
    ;(validateDistributorFeePercent as jest.Mock).mockClear()
    ;(validateAddress as jest.Mock).mockClear()
    getTransactionEventSpy.mockClear()
    getSortedRecipientsMock.mockClear()
    getBigNumberMock.mockClear()
  })

  describe('Create split tests', () => {
    const recipients = [{ address: '0xuser', percentAllocation: 45 }]
    const distributorFeePercent = 7.35

    beforeEach(() => {
      writeActions.createSplit.mockClear()
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
        provider,
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
      expect(validateRecipients).toBeCalledWith(recipients)
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.createSplit).toBeCalledWith(
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        AddressZero,
      )
      expect(getTransactionEventSpy).toBeCalledWith(
        'create_split_tx',
        'format_CreateSplit',
      )
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
      expect(validateRecipients).toBeCalledWith(recipients)
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.createSplit).toBeCalledWith(
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        controller,
      )
      expect(getTransactionEventSpy).toBeCalledWith(
        'create_split_tx',
        'format_CreateSplit',
      )
    })
  })

  describe('Update split tests', () => {
    const recipients = [{ address: '0xhey', percentAllocation: 12 }]
    const distributorFeePercent = 9
    const splitId = '0xupdate'

    beforeEach(() => {
      writeActions.updateSplit.mockClear()
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
        provider,
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
        provider,
        signer: nonControllerSigner,
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
      expect(validateRecipients).toBeCalledWith(recipients)
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateSplit).toBeCalledWith(
        splitId,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
      )
      expect(getTransactionEventSpy).toBeCalledWith(
        'update_split_tx',
        'format_UpdateSplit',
      )
    })
  })

  describe('Distribute token tests', () => {
    const splitId = '0xdistribute'
    const recipients = [{ address: '0xd', percentAllocation: 78 }]
    const distributorFeePercent = 3

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
    })

    test('Distribute token fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.distributeToken({
            splitId,
            token: AddressZero,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Distribute token fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badSplitsClient.distributeToken({
            splitId,
            token: AddressZero,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Distribute eth passes', async () => {
      const { event } = await splitsClient.distributeToken({
        splitId,
        token: AddressZero,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(AddressZero)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeETH).toBeCalledWith(
        splitId,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventSpy).toBeCalledWith(
        'distribute_eth_tx',
        'format_DistributeETH',
      )
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
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeERC20).toBeCalledWith(
        splitId,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventSpy).toBeCalledWith(
        'distribute_erc20_tx',
        'format_DistributeERC20',
      )
    })

    test('Distribute eth to payout address passes', async () => {
      const distributorAddress = '0xdistributor'
      const { event } = await splitsClient.distributeToken({
        splitId,
        token: AddressZero,
        distributorAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(AddressZero)
      expect(validateAddress).toBeCalledWith(distributorAddress)
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeETH).toBeCalledWith(
        splitId,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventSpy).toBeCalledWith(
        'distribute_eth_tx',
        'format_DistributeETH',
      )
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
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.distributeERC20).toBeCalledWith(
        splitId,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventSpy).toBeCalledWith(
        'distribute_erc20_tx',
        'format_DistributeERC20',
      )
    })
  })

  describe('Update and distribute tests', () => {
    const splitId = '0xupdateanddisribute'
    const recipients = [{ address: '0x829', percentAllocation: 71 }]
    const distributorFeePercent = 4

    beforeEach(() => {
      writeActions.updateAndDistributeETH.mockClear()
      writeActions.updateAndDistributeERC20.mockClear()
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
            token: AddressZero,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Update and distribute fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplitAndDistributeToken({
            splitId,
            recipients,
            distributorFeePercent,
            token: AddressZero,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Update and distribute fails from non controller', async () => {
      const nonControllerSigner = new mockSignerNonController()
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        provider,
        signer: nonControllerSigner,
      })

      await expect(
        async () =>
          await badSplitsClient.updateSplitAndDistributeToken({
            splitId,
            recipients,
            distributorFeePercent,
            token: AddressZero,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Update and distribute eth passes', async () => {
      const { event } = await splitsClient.updateSplitAndDistributeToken({
        splitId,
        recipients,
        distributorFeePercent,
        token: AddressZero,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(AddressZero)
      expect(validateAddress).toBeCalledWith(CONTROLLER_ADDRESS)
      expect(validateRecipients).toBeCalledWith(recipients)
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateAndDistributeETH).toBeCalledWith(
        splitId,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventSpy).toBeCalledWith(
        'update_and_distribute_eth_tx',
        'format_DistributeETH',
      )
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
      expect(validateRecipients).toBeCalledWith(recipients)
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateAndDistributeERC20).toBeCalledWith(
        splitId,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        CONTROLLER_ADDRESS,
      )
      expect(getTransactionEventSpy).toBeCalledWith(
        'update_and_distribute_erc20_tx',
        'format_DistributeERC20',
      )
    })

    test('Update and distribute eth to payout address passes', async () => {
      const distributorAddress = '0xupdateDistributor'
      const { event } = await splitsClient.updateSplitAndDistributeToken({
        splitId,
        recipients,
        distributorFeePercent,
        token: AddressZero,
        distributorAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(validateAddress).toBeCalledWith(AddressZero)
      expect(validateAddress).toBeCalledWith(distributorAddress)
      expect(validateRecipients).toBeCalledWith(recipients)
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateAndDistributeETH).toBeCalledWith(
        splitId,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventSpy).toBeCalledWith(
        'update_and_distribute_eth_tx',
        'format_DistributeETH',
      )
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
      expect(validateRecipients).toBeCalledWith(recipients)
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(writeActions.updateAndDistributeERC20).toBeCalledWith(
        splitId,
        token,
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
        distributorAddress,
      )
      expect(getTransactionEventSpy).toBeCalledWith(
        'update_and_distribute_erc20_tx',
        'format_DistributeERC20',
      )
    })
  })

  describe('Withdraw funds tests', () => {
    const address = '0xwithdraw'

    beforeEach(() => {
      writeActions.withdraw.mockClear()
    })

    test('Withdraw fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badSplitsClient.withdrawFunds({
            address,
            tokens: [AddressZero],
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Withdraw fails with no signer', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badSplitsClient.withdrawFunds({
            address,
            tokens: [AddressZero],
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Withdraw passes with erc20 and eth', async () => {
      const tokens = [AddressZero, '0xerc20']

      const { event } = await splitsClient.withdrawFunds({
        address,
        tokens,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(address)
      expect(writeActions.withdraw).toBeCalledWith(address, 1, ['0xerc20'])
      expect(getTransactionEventSpy).toBeCalledWith(
        'withdraw_tx',
        'format_Withdrawal',
      )
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
      expect(getTransactionEventSpy).toBeCalledWith(
        'withdraw_tx',
        'format_Withdrawal',
      )
    })
  })

  describe('Initiate control transfer tests', () => {
    const splitId = '0xitransfer'
    const newController = '0xnewController'

    beforeEach(() => {
      writeActions.transferControl.mockClear()
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
        provider,
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
        provider,
        signer: nonControllerSigner,
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
      expect(getTransactionEventSpy).toBeCalledWith(
        'transfer_control_tx',
        'format_InitiateControlTransfer',
      )
    })
  })

  describe('Cancel control transfer tests', () => {
    const splitId = '0xcancelTransfer'

    beforeEach(() => {
      writeActions.cancelControlTransfer.mockClear()
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
        provider,
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
        provider,
        signer: nonControllerSigner,
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
      expect(getTransactionEventSpy).toBeCalledWith(
        'cancel_control_transfer_tx',
        'format_CancelControlTransfer',
      )
    })
  })

  describe('Accept control transfer tests', () => {
    const splitId = '0xacceptTransfer'

    beforeEach(() => {
      writeActions.acceptControl.mockClear()
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
        provider,
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
      const signer = new mockSignerNewController()
      const splitsClient = new SplitsClient({
        chainId: 1,
        provider,
        signer,
      })

      const { event } = await splitsClient.acceptControlTransfer({
        splitId,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(splitId)
      expect(writeActions.acceptControl).toBeCalledWith(splitId)
      expect(getTransactionEventSpy).toBeCalledWith(
        'accept_control_tx',
        'format_ControlTransfer',
      )
    })
  })

  describe('Make split immutable tests', () => {
    const splitId = '0xmakeImmutable'

    beforeEach(() => {
      writeActions.makeSplitImmutable.mockClear()
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
        provider,
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
        provider,
        signer: nonControllerSigner,
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
      expect(getTransactionEventSpy).toBeCalledWith(
        'make_split_immutable_tx',
        'format_ControlTransfer',
      )
    })
  })
})

describe('SplitMain reads', () => {
  const provider = new mockProvider()
  const splitsClient = new SplitsClient({
    chainId: 1,
    provider,
  })

  beforeEach(() => {
    ;(validateRecipients as jest.Mock).mockClear()
    ;(validateDistributorFeePercent as jest.Mock).mockClear()
    ;(validateAddress as jest.Mock).mockClear()
    getSortedRecipientsMock.mockClear()
    getBigNumberMock.mockClear()
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
      readActions.getETHBalance.mockReturnValueOnce(BigNumber.from(12))
      const { balance } = await splitsClient.getSplitBalance({ splitId })

      expect(balance).toEqual(BigNumber.from(12))
      expect(validateAddress).toBeCalledWith(splitId)
      expect(readActions.getETHBalance).toBeCalledWith(splitId)
    })

    test('Returns ERC20 balance', async () => {
      const token = '0xerc20'
      readActions.getERC20Balance.mockReturnValueOnce(BigNumber.from(19))
      const { balance } = await splitsClient.getSplitBalance({ splitId, token })

      expect(balance).toEqual(BigNumber.from(19))
      expect(validateAddress).toBeCalledWith(splitId)
      expect(readActions.getERC20Balance).toBeCalledWith(splitId, token)
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
      expect(validateRecipients).toBeCalledWith(recipients)
      expect(validateDistributorFeePercent).toBeCalledWith(
        distributorFeePercent,
      )
      expect(getSortedRecipientsMock).toBeCalledWith(recipients)
      expect(getBigNumberMock).toBeCalledWith(distributorFeePercent)
      expect(readActions.predictImmutableSplitAddress).toBeCalledWith(
        SORTED_ADDRESSES,
        SORTED_ALLOCATIONS,
        DISTRIBUTOR_FEE,
      )
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
      expect(readActions.getController).toBeCalledWith(splitId)
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
      expect(readActions.getNewPotentialController).toBeCalledWith(splitId)
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
      expect(readActions.getHash).toBeCalledWith(splitId)
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
  const mockFormatSplit = jest
    .spyOn(subgraph, 'protectedFormatSplit')
    .mockReturnValue('formatted_split' as unknown as Split)
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
      expect(split).toEqual('formatted_split')
      expect(mockAddEnsNames).not.toBeCalled()
    })

    test('Adds ens names', async () => {
      const provider = new mockProvider()
      const ensSplitsClient = new SplitsClient({
        chainId: 1,
        provider,
        includeEnsNames: true,
      })

      const split = await ensSplitsClient.getSplitMetadata({ splitId })

      expect(validateAddress).toBeCalledWith(splitId)
      expect(mockGqlClient.request).toBeCalledWith(subgraph.SPLIT_QUERY, {
        splitId,
      })
      expect(mockFormatSplit).toBeCalledWith('gqlSplit')
      expect(split).toEqual('formatted_split')
      expect(mockAddEnsNames).toBeCalled()
    })
  })

  describe('Get related splits tests', () => {
    beforeEach(() => {
      mockGqlClient.request.mockReturnValueOnce({
        receivingFrom: [{ split: 'gqlReceivingSplit' }],
        controlling: ['gqlControllingSplit1', 'gqlControllingSplit2'],
        pendingControl: ['gqlPendingControlSplit'],
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
      expect(receivingFrom).toEqual(['gqlReceivingSplit'])
      expect(controlling).toEqual([
        'gqlControllingSplit1',
        'gqlControllingSplit2',
      ])
      expect(pendingControl).toEqual(['gqlPendingControlSplit'])
      expect(mockAddEnsNames).not.toBeCalled()
    })

    test('Adds ens names', async () => {
      const provider = new mockProvider()
      const ensSplitsClient = new SplitsClient({
        chainId: 1,
        provider,
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
      expect(receivingFrom).toEqual(['gqlReceivingSplit'])
      expect(controlling).toEqual([
        'gqlControllingSplit1',
        'gqlControllingSplit2',
      ])
      expect(pendingControl).toEqual(['gqlPendingControlSplit'])
      expect(mockAddEnsNames).toBeCalledTimes(4)
    })
  })
})
