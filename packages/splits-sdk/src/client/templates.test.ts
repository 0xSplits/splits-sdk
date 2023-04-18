import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import type { Event } from '@ethersproject/contracts'
import {
  InvalidConfigError,
  MissingProviderError,
  MissingSignerError,
  UnsupportedChainIdError,
} from '../errors'
import * as utils from '../utils'
import {
  validateAddress,
  validateDistributorFeePercent,
  validateRecipients,
  validateRecoupNonWaterfallRecipient,
  validateRecoupTranches,
} from '../utils/validation'
import {
  CONTROLLER_ADDRESS,
  TRANCHE_SIZES,
  RECOUP_TRANCHE_RECIPIENTS,
} from '../testing/constants'
import { MockRecoup, writeActions } from '../testing/mocks/recoup'
import { TemplatesClient } from './templates'

jest.mock('@ethersproject/contracts', () => {
  return {
    Contract: jest
      .fn()
      .mockImplementation((_contractAddress, _contractInterface, provider) => {
        return new MockRecoup(provider)
      }),
  }
})

jest.mock('../utils/validation')

const getRecoupTranchesAndSizesMock = jest
  .spyOn(utils, 'getRecoupTranchesAndSizes')
  .mockImplementation(async () => {
    return [RECOUP_TRANCHE_RECIPIENTS, TRANCHE_SIZES]
  })

const getTransactionEventsSpy = jest
  .spyOn(utils, 'getTransactionEvents')
  .mockImplementation(async () => {
    const event = {
      blockNumber: 12345,
      args: {
        waterfallModule: '0xrecoup',
      },
    } as unknown as Event
    return [event]
  })

const mockProvider = jest.fn<Provider, unknown[]>()
const mockSigner = jest.fn<Signer, unknown[]>(() => {
  return {
    getAddress: () => {
      return CONTROLLER_ADDRESS
    },
  } as unknown as Signer
})

describe('Client config validation', () => {
  test('Including ens names with no provider fails', () => {
    expect(
      () => new TemplatesClient({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
  })

  test('Invalid chain id fails', () => {
    expect(() => new TemplatesClient({ chainId: 51 })).toThrow(
      UnsupportedChainIdError,
    )
  })

  test('Ethereum chain ids pass', () => {
    expect(() => new TemplatesClient({ chainId: 1 })).not.toThrow()
    expect(() => new TemplatesClient({ chainId: 5 })).not.toThrow()
  })

  test('Polygon chain ids pass', () => {
    expect(() => new TemplatesClient({ chainId: 137 })).not.toThrow()
    expect(() => new TemplatesClient({ chainId: 80001 })).not.toThrow()
  })

  test('Optimism chain ids pass', () => {
    expect(() => new TemplatesClient({ chainId: 10 })).not.toThrow()
    expect(() => new TemplatesClient({ chainId: 420 })).not.toThrow()
  })

  test('Arbitrum chain ids pass', () => {
    expect(() => new TemplatesClient({ chainId: 42161 })).not.toThrow()
    expect(() => new TemplatesClient({ chainId: 421613 })).not.toThrow()
  })
})

describe('Template writes', () => {
  const provider = new mockProvider()
  const signer = new mockSigner()
  const templatesClient = new TemplatesClient({
    chainId: 1,
    provider,
    signer,
  })

  beforeEach(() => {
    ;(validateRecipients as jest.Mock).mockClear()
    ;(validateDistributorFeePercent as jest.Mock).mockClear()
    ;(validateAddress as jest.Mock).mockClear()
    getRecoupTranchesAndSizesMock.mockClear()
    getTransactionEventsSpy.mockClear()
  })

  describe('Create recoup tests', () => {
    const token = '0x0'
    const tranches = [
      { recipient: '0xuser1', size: 3 },
      { recipient: '0xuser2' },
    ]
    const nonWaterfallRecipientAddress = 'nonWaterfallRecipient'
    const nonWaterfallRecipientTrancheIndex = 2

    const createRecoupResult = {
      value: 'create_recoup_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      writeActions.createRecoup.mockClear()
      writeActions.createRecoup.mockReturnValueOnce(createRecoupResult)
    })

    test('Create recoup fails with no provider', async () => {
      const badClient = new TemplatesClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.createRecoup({
            token,
            tranches,
            nonWaterfallRecipientAddress,
            nonWaterfallRecipientTrancheIndex,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Create recoup fails with no signer', async () => {
      const badClient = new TemplatesClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badClient.createRecoup({
            token,
            tranches,
            nonWaterfallRecipientAddress,
            nonWaterfallRecipientTrancheIndex,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Create recoup passes', async () => {
      const { event, waterfallModuleId } = await templatesClient.createRecoup({
        token,
        tranches,
        nonWaterfallRecipientAddress,
        nonWaterfallRecipientTrancheIndex,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(waterfallModuleId).toEqual('0xrecoup')
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(nonWaterfallRecipientAddress)
      expect(validateRecoupTranches).toBeCalledWith(tranches)
      expect(validateRecoupNonWaterfallRecipient).toBeCalledWith(
        tranches.length,
        nonWaterfallRecipientAddress,
        nonWaterfallRecipientTrancheIndex,
      )

      expect(utils.getRecoupTranchesAndSizes).toBeCalledWith(
        1,
        token,
        tranches,
        provider,
      )

      expect(writeActions.createRecoup).toBeCalledWith(
        token,
        nonWaterfallRecipientAddress,
        tranches.length,
        RECOUP_TRANCHE_RECIPIENTS,
        TRANCHE_SIZES,
      )

      expect(getTransactionEventsSpy).toBeCalledWith(
        createRecoupResult,
        templatesClient.eventTopics.createRecoup,
      )
    })
  })
})
