import {
  Account,
  Address,
  Chain,
  Log,
  PublicClient,
  Transport,
  WalletClient,
} from 'viem'

import { getRecoupAddress } from '../constants'
import {
  InvalidConfigError,
  MissingPublicClientError,
  MissingWalletClientError,
  UnsupportedChainIdError,
} from '../errors'
import * as utils from '../utils'
import * as swapperUtils from '../utils/swapper'
import {
  validateAddress,
  validateDistributorFeePercent,
  validateDiversifierRecipients,
  validateOracleParams,
  validateSplitRecipients,
  validateRecoupNonWaterfallRecipient,
  validateRecoupTranches,
} from '../utils/validation'
import {
  CONTROLLER_ADDRESS,
  TRANCHE_SIZES,
  RECOUP_TRANCHE_RECIPIENTS,
  FORMATTED_ORACLE_PARAMS,
  FORMATTED_DIVERSIFIER_RECIPIENTS,
} from '../testing/constants'
import { writeActions as diversifierWriteActions } from '../testing/mocks/diversifierFactory'
import { writeActions as recoupWriteActions } from '../testing/mocks/recoup'
import { TemplatesClient } from './templates'
import { MockViemContract } from '../testing/mocks/viemContract'

jest.mock('viem', () => {
  const originalModule = jest.requireActual('viem')
  return {
    ...originalModule,
    getContract: jest.fn(({ address }: { address: Address }) => {
      if (address === getRecoupAddress(1))
        return new MockViemContract({}, recoupWriteActions)
      return new MockViemContract({}, diversifierWriteActions)
    }),
    getAddress: jest.fn((address) => address),
    decodeEventLog: jest.fn(() => {
      return {
        eventName: 'eventName',
        args: {
          waterfallModule: '0xrecoup',
          diversifier: '0xpassthroughwallet',
        },
      }
    }),
  }
})

jest.mock('../utils/validation')

const getRecoupTranchesAndSizesMock = jest
  .spyOn(utils, 'getRecoupTranchesAndSizes')
  .mockImplementation(async () => {
    return [RECOUP_TRANCHE_RECIPIENTS, TRANCHE_SIZES]
  })
const getFormattedOracleParamsMock = jest
  .spyOn(swapperUtils, 'getFormattedOracleParams')
  .mockImplementation(() => {
    return FORMATTED_ORACLE_PARAMS
  })
const getDiversifierRecipientsMock = jest
  .spyOn(swapperUtils, 'getDiversifierRecipients')
  .mockImplementation(() => {
    return FORMATTED_DIVERSIFIER_RECIPIENTS
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
        if (address === getRecoupAddress(1)) {
          type writeActions = typeof recoupWriteActions
          type writeKeys = keyof writeActions
          recoupWriteActions[functionName as writeKeys].call(this, ...args)
        } else {
          type writeActions = typeof diversifierWriteActions
          type writeKeys = keyof writeActions
          diversifierWriteActions[functionName as writeKeys].call(this, ...args)
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
  })

  test('Polygon chain ids pass', () => {
    expect(() => new TemplatesClient({ chainId: 137 })).not.toThrow()
  })

  test('Optimism chain ids pass', () => {
    expect(() => new TemplatesClient({ chainId: 10 })).not.toThrow()
  })

  test('Arbitrum chain ids pass', () => {
    expect(() => new TemplatesClient({ chainId: 42161 })).not.toThrow()
  })

  test('Zora chain ids pass', () => {
    expect(() => new TemplatesClient({ chainId: 7777777 })).not.toThrow()
  })

  test('Base chain ids pass', () => {
    expect(() => new TemplatesClient({ chainId: 8453 })).not.toThrow()
  })

  test('Other chain ids pass', () => {
    expect(() => new TemplatesClient({ chainId: 100 })).not.toThrow()
    expect(() => new TemplatesClient({ chainId: 56 })).not.toThrow()
  })
})

describe('Template writes', () => {
  const publicClient = new mockPublicClient()
  const walletClient = new mockWalletClient()
  const templatesClient = new TemplatesClient({
    chainId: 1,
    publicClient,
    walletClient,
  })
  const getTransactionEventsSpy = jest.spyOn(
    templatesClient,
    'getTransactionEvents',
  )

  beforeEach(() => {
    ;(validateSplitRecipients as jest.Mock).mockClear()
    ;(validateDistributorFeePercent as jest.Mock).mockClear()
    ;(validateAddress as jest.Mock).mockClear()
    getRecoupTranchesAndSizesMock.mockClear()
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
      recoupWriteActions.createRecoup.mockClear()
      recoupWriteActions.createRecoup.mockReturnValueOnce(createRecoupResult)
      getTransactionEventsSpy.mockClear()
      getTransactionEventsSpy.mockResolvedValue([
        {
          blockNumber: 12345,
          args: {
            waterfallModule: '0xrecoup',
          },
        } as unknown as Log,
      ])
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
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Create recoup fails with no signer', async () => {
      const badClient = new TemplatesClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.createRecoup({
            token,
            tranches,
            nonWaterfallRecipientAddress,
            nonWaterfallRecipientTrancheIndex,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Create recoup passes', async () => {
      const { event, waterfallModuleAddress } =
        await templatesClient.createRecoup({
          token,
          tranches,
          nonWaterfallRecipientAddress,
          nonWaterfallRecipientTrancheIndex,
        })

      expect(event.blockNumber).toEqual(12345)
      expect(waterfallModuleAddress).toEqual('0xrecoup')
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
        publicClient,
      )

      expect(recoupWriteActions.createRecoup).toBeCalledWith(
        token,
        nonWaterfallRecipientAddress,
        tranches.length,
        RECOUP_TRANCHE_RECIPIENTS,
        TRANCHE_SIZES,
      )

      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: templatesClient.eventTopics.createRecoup,
      })
    })
  })

  describe('Create diversifier tests', () => {
    const owner = '0xowner'
    const paused = false
    const oracleParams = {
      address: '0xoracle',
    }
    const recipients = [
      {
        address: '0xrecipient1',
        percentAllocation: 60,
      },
      {
        swapperParams: {
          beneficiary: '0xbeneficiary',
          tokenToBeneficiary: '0xtoken',
          defaultScaledOfferFactorPercent: 1,
          scaledOfferFactorOverrides: [],
        },
        percentAllocation: 40,
      },
    ]

    const createDiversifierResult = {
      value: 'create_diversifier_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      diversifierWriteActions.createDiversifier.mockClear()
      diversifierWriteActions.createDiversifier.mockReturnValueOnce(
        createDiversifierResult,
      )
      getTransactionEventsSpy.mockClear()
      getTransactionEventsSpy.mockResolvedValue([
        {
          blockNumber: 12345,
          args: {
            diversifier: '0xpassthroughwallet',
          },
        } as unknown as Log,
      ])
    })

    test('Create diversifier fails with no provider', async () => {
      const badClient = new TemplatesClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.createDiversifier({
            owner,
            paused,
            oracleParams,
            recipients,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Create diversifier fails with no signer', async () => {
      const badClient = new TemplatesClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.createDiversifier({
            owner,
            paused,
            oracleParams,
            recipients,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Create diversifier passes', async () => {
      const { event, passThroughWalletAddress } =
        await templatesClient.createDiversifier({
          owner,
          paused,
          oracleParams,
          recipients,
        })

      expect(event.blockNumber).toEqual(12345)
      expect(passThroughWalletAddress).toEqual('0xpassthroughwallet')
      expect(validateAddress).toBeCalledWith(owner)
      expect(validateOracleParams).toBeCalledWith(oracleParams)
      expect(validateDiversifierRecipients).toBeCalledWith(recipients)

      expect(getDiversifierRecipientsMock).toBeCalledWith(recipients)
      expect(getFormattedOracleParamsMock).toBeCalledWith(oracleParams)

      expect(diversifierWriteActions.createDiversifier).toBeCalledWith([
        owner,
        paused,
        FORMATTED_ORACLE_PARAMS,
        FORMATTED_DIVERSIFIER_RECIPIENTS,
      ])

      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: templatesClient.eventTopics.createDiversifier,
      })
    })
  })
})
