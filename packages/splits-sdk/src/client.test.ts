import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import { Contract } from '@ethersproject/contracts'
import type { Event } from '@ethersproject/contracts'

import { SplitsClient } from './client'
import {
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

class MockContract {
  provider: Provider

  interface: {
    getEvent: () => {
      format: () => string
    }
  }

  constructor(provider: Provider) {
    this.provider = provider
    this.interface = {
      getEvent: () => {
        return {
          format: () => {
            return 'format'
          },
        }
      },
    }
  }

  connect() {
    return {
      createSplit: () => 'create_split_tx',
      updateSplit: () => 'update_split_tx',
    }
  }

  getController() {
    return 'controllerAddress'
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

const mockProvider = jest.fn<Provider, void[]>()
const mockSigner = jest.fn<Signer, void[]>(() => {
  return {
    getAddress: () => {
      return 'controllerAddress'
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

    expect(validateRecipients).not.toBeCalled()
    expect(validateDistributorFeePercent).not.toBeCalled()
    expect(validateAddress).not.toBeCalled()
    expect(getTransactionEventSpy).not.toBeCalled()
  })

  describe('Create split tests', () => {
    test('Create split fails with no provider', async () => {
      const badSplitsClient = new SplitsClient({
        chainId: 1,
      })
      const recipients = [{ address: '0xuser', percentAllocation: 45 }]
      const distributorFeePercent = 7.35

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
      const recipients = [{ address: '0xuser', percentAllocation: 45 }]
      const distributorFeePercent = 7.35

      await expect(
        async () =>
          await badSplitsClient.createSplit({
            recipients,
            distributorFeePercent,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Create split passes', async () => {
      const recipients = [{ address: '0xuser', percentAllocation: 45 }]
      const distributorFeePercent = 7.35
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
      expect(getTransactionEventSpy).toBeCalledWith('create_split_tx', 'format')
    })
  })

  describe('Update split tests', () => {
    test('Update split passes', async () => {
      const splitId = '0xabc'
      const recipients = [{ address: '0xhey', percentAllocation: 12 }]
      const distributorFeePercent = 9
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
      expect(getTransactionEventSpy).toBeCalledWith('update_split_tx', 'format')
    })
  })
})
