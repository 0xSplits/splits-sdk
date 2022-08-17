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
} from './errors'
import * as utils from './utils'
import {
  validateRecipients,
  validateDistributorFeePercent,
  validateAddress,
} from './utils/validation'
import type { Split } from './types'

const CONTROLLER_ADDRESS = '0xcontroller'
const NON_CONTROLLER_ADDRESS = '0xnonController'
const SORTED_ADDRESSES = ['0xsorted']
const SORTED_ALLOCATIONS = [BigNumber.from(50)]
const DISTRIBUTOR_FEE = BigNumber.from(9)

const mockCreateSplit = jest.fn().mockReturnValue('create_split_tx')
const mockUpdateSplit = jest.fn().mockReturnValue('update_split_tx')
const mockDistributeEth = jest.fn().mockReturnValue('distribute_eth_tx')
const mockDistributeErc20 = jest.fn().mockReturnValue('distribute_erc20_tx')
const mockUpdateAndDistributeEth = jest
  .fn()
  .mockReturnValue('update_and_distribute_eth_tx')
const mockUpdateAndDistributeErc20 = jest
  .fn()
  .mockReturnValue('update_and_distribute_erc20_tx')

class MockContract {
  provider: Provider

  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }

  constructor(provider: Provider) {
    this.provider = provider
    this.interface = {
      getEvent: (eventName: string) => {
        return {
          format: () => {
            return `format_${eventName}`
          },
        }
      },
    }
  }

  connect() {
    return {
      createSplit: mockCreateSplit,
      updateSplit: mockUpdateSplit,
      distributeETH: mockDistributeEth,
      distributeERC20: mockDistributeErc20,
      updateAndDistributeETH: mockUpdateAndDistributeEth,
      updateAndDistributeERC20: mockUpdateAndDistributeErc20,
    }
  }

  getController() {
    return CONTROLLER_ADDRESS
  }
}
jest.mock('@ethersproject/contracts', () => {
  return {
    Contract: jest
      .fn()
      .mockImplementation((_contractAddress, _contractInterface, provider) => {
        return new MockContract(provider)
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
      return NON_CONTROLLER_ADDRESS
    },
  } as unknown as Signer
})

describe('Client config validation', () => {
  test('Including ens names with no provider fails', () => {
    expect(
      () => new SplitsClient({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
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

    expect(validateRecipients).not.toBeCalled()
    expect(validateDistributorFeePercent).not.toBeCalled()
    expect(validateAddress).not.toBeCalled()
    expect(getTransactionEventSpy).not.toBeCalled()
    expect(getSortedRecipientsMock).not.toBeCalled()
    expect(getBigNumberMock).not.toBeCalled()
  })

  describe('Create split tests', () => {
    const recipients = [{ address: '0xuser', percentAllocation: 45 }]
    const distributorFeePercent = 7.35

    beforeEach(() => {
      mockCreateSplit.mockClear()

      expect(mockCreateSplit).not.toBeCalled()
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
      expect(mockCreateSplit).toBeCalledWith(
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
      expect(mockCreateSplit).toBeCalledWith(
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
      mockUpdateSplit.mockClear()

      expect(mockUpdateSplit).not.toBeCalled()
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
      expect(mockUpdateSplit).toBeCalledWith(
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
      mockDistributeEth.mockClear()
      mockDistributeErc20.mockClear()

      expect(mockDistributeEth).not.toBeCalled()
      expect(mockDistributeErc20).not.toBeCalled()
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
      expect(mockDistributeEth).toBeCalledWith(
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
      expect(mockDistributeErc20).toBeCalledWith(
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
      expect(mockDistributeEth).toBeCalledWith(
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
      expect(mockDistributeErc20).toBeCalledWith(
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
      mockUpdateAndDistributeEth.mockClear()
      mockUpdateAndDistributeErc20.mockClear()

      expect(mockUpdateAndDistributeEth).not.toBeCalled()
      expect(mockUpdateAndDistributeErc20).not.toBeCalled()
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
      expect(mockUpdateAndDistributeEth).toBeCalledWith(
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
      expect(mockUpdateAndDistributeErc20).toBeCalledWith(
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
      expect(mockUpdateAndDistributeEth).toBeCalledWith(
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
      expect(mockUpdateAndDistributeErc20).toBeCalledWith(
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
})
