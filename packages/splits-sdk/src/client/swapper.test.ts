import {
  Account,
  Address,
  Chain,
  Log,
  PublicClient,
  Transport,
  WalletClient,
} from 'viem'

import { SwapperClient } from './swapper'
import { getSwapperFactoryAddress } from '../constants'
import {
  InvalidAuthError,
  InvalidConfigError,
  MissingPublicClientError,
  MissingWalletClientError,
  UnsupportedChainIdError,
} from '../errors'
import * as subgraph from '../subgraph'
import * as utils from '../utils'
import {
  validateAddress,
  validateOracleParams,
  validateScaledOfferFactor,
  validateScaledOfferFactorOverrides,
} from '../utils/validation'
import {
  FORMATTED_ORACLE_PARAMS,
  FORMATTED_SCALED_OFFER_FACTOR,
  FORMATTED_SCALED_OFFER_FACTOR_OVERRIDES,
  OWNER_ADDRESS,
} from '../testing/constants'
import { MockGraphqlClient } from '../testing/mocks/graphql'
import { writeActions as factoryWriteActions } from '../testing/mocks/swapperFactory'
import {
  writeActions as moduleWriteActions,
  readActions,
} from '../testing/mocks/swapper'
import type { ScaledOfferFactorOverride, Swapper } from '../types'
import { MockViemContract } from '../testing/mocks/viemContract'

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
          swapper: '0xswapper',
        },
      }
    }),
  }
})

jest.mock('../utils/validation')

const getFormattedOracleParamsMock = jest
  .spyOn(utils, 'getFormattedOracleParams')
  .mockImplementation(() => {
    return FORMATTED_ORACLE_PARAMS
  })
const getFormattedScaledOfferFactorMock = jest
  .spyOn(utils, 'getFormattedScaledOfferFactor')
  .mockImplementation(() => {
    return FORMATTED_SCALED_OFFER_FACTOR
  })
const getFormattedScaledOfferFactorOverridesMock = jest
  .spyOn(utils, 'getFormattedScaledOfferFactorOverrides')
  .mockImplementation(() => {
    return FORMATTED_SCALED_OFFER_FACTOR_OVERRIDES
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
        if (address === getSwapperFactoryAddress(1)) {
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
      address: OWNER_ADDRESS,
    },
    writeContract: jest.fn(() => {
      return '0xhash'
    }),
  } as unknown as WalletClient<Transport, Chain, Account>
})
const mockWalletClientNonOwner = jest.fn(() => {
  return {
    account: {
      address: '0xnotOwner',
    },
    writeContract: jest.fn(() => {
      return '0xhash'
    }),
  } as unknown as WalletClient<Transport, Chain, Account>
})

describe('Client config validation', () => {
  test('Including ens names with no provider fails', () => {
    expect(
      () => new SwapperClient({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
  })

  test('Invalid chain id fails', () => {
    expect(() => new SwapperClient({ chainId: 51 })).toThrow(
      UnsupportedChainIdError,
    )
  })

  test('Ethereum chain ids pass', () => {
    expect(() => new SwapperClient({ chainId: 1 })).not.toThrow()
    expect(() => new SwapperClient({ chainId: 5 })).not.toThrow()
  })

  test('Polygon chain id pass', () => {
    expect(() => new SwapperClient({ chainId: 137 })).not.toThrow()
  })
  test('Mumbai chain id fail', () => {
    expect(() => new SwapperClient({ chainId: 80001 })).toThrow()
  })

  test('Optimism chain id pass', () => {
    expect(() => new SwapperClient({ chainId: 10 })).not.toThrow()
  })
  test('Optimism goerli chain id fail', () => {
    expect(() => new SwapperClient({ chainId: 420 })).toThrow()
  })

  test('Arbitrum chain ids fail', () => {
    expect(() => new SwapperClient({ chainId: 42161 })).toThrow()
    expect(() => new SwapperClient({ chainId: 421613 })).toThrow()
  })

  test('Zora chain ids fail', () => {
    expect(() => new SwapperClient({ chainId: 7777777 })).toThrow()
    expect(() => new SwapperClient({ chainId: 999 })).toThrow()
  })

  test('Base chain ids pass', () => {
    expect(() => new SwapperClient({ chainId: 8453 })).not.toThrow()
  })

  test('Other chain ids fail', () => {
    expect(() => new SwapperClient({ chainId: 100 })).toThrow()
    expect(() => new SwapperClient({ chainId: 250 })).toThrow()
    expect(() => new SwapperClient({ chainId: 43114 })).toThrow()
    expect(() => new SwapperClient({ chainId: 56 })).toThrow()
    expect(() => new SwapperClient({ chainId: 1313161554 })).toThrow()
  })
})

describe('Swapper writes', () => {
  const publicClient = new mockPublicClient()
  const walletClient = new mockWalletClient()
  const client = new SwapperClient({
    chainId: 1,
    publicClient,
    walletClient,
  })
  const getTransactionEventsSpy = jest
    .spyOn(client, 'getTransactionEvents')
    .mockImplementation(async () => {
      const event = {
        blockNumber: 1111,
        args: {
          swapper: '0xswapper',
        },
      } as unknown as Log
      return [event]
    })

  beforeEach(() => {
    ;(validateScaledOfferFactorOverrides as jest.Mock).mockClear()
    ;(validateScaledOfferFactor as jest.Mock).mockClear()
    ;(validateOracleParams as jest.Mock).mockClear()
    ;(validateAddress as jest.Mock).mockClear()
    getTransactionEventsSpy.mockClear()
    getFormattedOracleParamsMock.mockClear()
    getFormattedScaledOfferFactorMock.mockClear()
    getFormattedScaledOfferFactorOverridesMock.mockClear()
  })

  describe('Create swapper tests', () => {
    const owner = '0xowner'
    const paused = false
    const beneficiary = '0xbeneficiary'
    const tokenToBeneficiary = '0xtoken'
    const oracleParams = {
      address: '0xoracle',
    }
    const defaultScaledOfferFactorPercent = 1
    const scaledOfferFactorOverrides: ScaledOfferFactorOverride[] = []

    const createSwapperResult = {
      value: 'create_swapper_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      factoryWriteActions.createSwapper.mockClear()
      factoryWriteActions.createSwapper.mockReturnValueOnce(createSwapperResult)
    })

    test('Create swapper fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.createSwapper({
            owner,
            paused,
            beneficiary,
            tokenToBeneficiary,
            oracleParams,
            defaultScaledOfferFactorPercent,
            scaledOfferFactorOverrides,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Create swapper fails with no signer', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.createSwapper({
            owner,
            paused,
            beneficiary,
            tokenToBeneficiary,
            oracleParams,
            defaultScaledOfferFactorPercent,
            scaledOfferFactorOverrides,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Create swapper passes', async () => {
      const { event, swapperAddress } = await client.createSwapper({
        owner,
        paused,
        beneficiary,
        tokenToBeneficiary,
        oracleParams,
        defaultScaledOfferFactorPercent,
        scaledOfferFactorOverrides,
      })

      expect(event.blockNumber).toEqual(1111)
      expect(swapperAddress).toEqual('0xswapper')
      expect(validateAddress).toBeCalledWith(owner)
      expect(validateAddress).toBeCalledWith(beneficiary)
      expect(validateAddress).toBeCalledWith(tokenToBeneficiary)
      expect(validateOracleParams).toBeCalledWith(oracleParams)
      expect(validateScaledOfferFactor).toBeCalledWith(
        defaultScaledOfferFactorPercent,
      )
      expect(validateScaledOfferFactorOverrides).toBeCalledWith(
        scaledOfferFactorOverrides,
      )

      expect(getFormattedOracleParamsMock).toBeCalledWith(oracleParams)
      expect(getFormattedScaledOfferFactorMock).toBeCalledWith(
        defaultScaledOfferFactorPercent,
      )
      expect(getFormattedScaledOfferFactorOverridesMock).toBeCalledWith(
        scaledOfferFactorOverrides,
      )

      expect(factoryWriteActions.createSwapper).toBeCalledWith([
        owner,
        paused,
        beneficiary,
        tokenToBeneficiary,
        FORMATTED_ORACLE_PARAMS,
        FORMATTED_SCALED_OFFER_FACTOR,
        FORMATTED_SCALED_OFFER_FACTOR_OVERRIDES,
      ])
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.createSwapper[0]],
      })
    })
  })

  describe('Set beneficiary tests', () => {
    const swapperAddress = '0xswapper'
    const beneficiary = '0xbeneficiary'
    const setBeneficiaryResult = {
      value: 'set_beneficiary_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.setBeneficiary.mockClear()
      moduleWriteActions.setBeneficiary.mockReturnValueOnce(
        setBeneficiaryResult,
      )
    })

    test('Set beneficiary fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.setBeneficiary({
            swapperAddress,
            beneficiary,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Set beneficiary fails with no signer', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.setBeneficiary({
            swapperAddress,
            beneficiary,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Set beneficiary fails from non owner', async () => {
      const nonOwnerSigner = new mockWalletClientNonOwner()
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
        walletClient: nonOwnerSigner,
      })

      await expect(
        async () =>
          await badClient.setBeneficiary({
            swapperAddress,
            beneficiary,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Set beneficiary passes', async () => {
      const { event } = await client.setBeneficiary({
        swapperAddress,
        beneficiary,
      })

      expect(event.blockNumber).toEqual(1111)
      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(validateAddress).toBeCalledWith(beneficiary)
      expect(moduleWriteActions.setBeneficiary).toBeCalledWith(beneficiary)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.setBeneficiary[0]],
      })
    })
  })

  describe('Set token to beneficiary tests', () => {
    const swapperAddress = '0xswapper'
    const tokenToBeneficiary = '0xtoken'
    const setTokenToBeneficiaryResult = {
      value: 'set_token_to_beneficiary_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.setTokenToBeneficiary.mockClear()
      moduleWriteActions.setTokenToBeneficiary.mockReturnValueOnce(
        setTokenToBeneficiaryResult,
      )
    })

    test('Set token to beneficiary fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.setTokenToBeneficiary({
            swapperAddress,
            tokenToBeneficiary,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Set token to beneficiary fails with no signer', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.setTokenToBeneficiary({
            swapperAddress,
            tokenToBeneficiary,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Set token to beneficiary fails from non owner', async () => {
      const nonOwnerSigner = new mockWalletClientNonOwner()
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
        walletClient: nonOwnerSigner,
      })

      await expect(
        async () =>
          await badClient.setTokenToBeneficiary({
            swapperAddress,
            tokenToBeneficiary,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Set token to beneficiary passes', async () => {
      const { event } = await client.setTokenToBeneficiary({
        swapperAddress,
        tokenToBeneficiary,
      })

      expect(event.blockNumber).toEqual(1111)
      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(validateAddress).toBeCalledWith(tokenToBeneficiary)
      expect(moduleWriteActions.setTokenToBeneficiary).toBeCalledWith(
        tokenToBeneficiary,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.setTokenToBeneficiary[0]],
      })
    })
  })

  describe('Set oracle tests', () => {
    const swapperAddress = '0xswapper'
    const oracle = '0xoracle'
    const setOracleResult = {
      value: 'set_oracle_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.setOracle.mockClear()
      moduleWriteActions.setOracle.mockReturnValueOnce(setOracleResult)
    })

    test('Set oracle fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.setOracle({
            swapperAddress,
            oracle,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Set oracle fails with no signer', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.setOracle({
            swapperAddress,
            oracle,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Set oracle fails from non owner', async () => {
      const nonOwnerSigner = new mockWalletClientNonOwner()
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
        walletClient: nonOwnerSigner,
      })

      await expect(
        async () =>
          await badClient.setOracle({
            swapperAddress,
            oracle,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Set oracle passes', async () => {
      const { event } = await client.setOracle({
        swapperAddress,
        oracle,
      })

      expect(event.blockNumber).toEqual(1111)
      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(validateAddress).toBeCalledWith(oracle)
      expect(moduleWriteActions.setOracle).toBeCalledWith(oracle)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.setOracle[0]],
      })
    })
  })

  describe('Set default scaled offer factor tests', () => {
    const swapperAddress = '0xswapper'
    const defaultScaledOfferFactorPercent = 1
    const setDefaultScaledOfferFactorResult = {
      value: 'set_default_scaled_offer_factor_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.setDefaultScaledOfferFactor.mockClear()
      moduleWriteActions.setDefaultScaledOfferFactor.mockReturnValueOnce(
        setDefaultScaledOfferFactorResult,
      )
    })

    test('Set default scale fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.setDefaultScaledOfferFactor({
            swapperAddress,
            defaultScaledOfferFactorPercent,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Set default scale fails with no signer', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.setDefaultScaledOfferFactor({
            swapperAddress,
            defaultScaledOfferFactorPercent,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Set default scale fails from non owner', async () => {
      const nonOwnerSigner = new mockWalletClientNonOwner()
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
        walletClient: nonOwnerSigner,
      })

      await expect(
        async () =>
          await badClient.setDefaultScaledOfferFactor({
            swapperAddress,
            defaultScaledOfferFactorPercent,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Set default scale passes', async () => {
      const { event } = await client.setDefaultScaledOfferFactor({
        swapperAddress,
        defaultScaledOfferFactorPercent,
      })

      expect(event.blockNumber).toEqual(1111)
      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(validateScaledOfferFactor).toBeCalledWith(
        defaultScaledOfferFactorPercent,
      )

      expect(getFormattedScaledOfferFactorMock).toBeCalledWith(
        defaultScaledOfferFactorPercent,
      )

      expect(moduleWriteActions.setDefaultScaledOfferFactor).toBeCalledWith(
        FORMATTED_SCALED_OFFER_FACTOR,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.setDefaultScaledOfferFactor[0]],
      })
    })
  })

  describe('Set scaled offer factor overrides tests', () => {
    const swapperAddress = '0xswapper'
    const scaledOfferFactorOverrides = [
      {
        baseToken: '0xtoken1',
        quoteToken: '0xtoken2',
        scaledOfferFactorPercent: 1,
      },
      {
        baseToken: '0xtoken3',
        quoteToken: '0xtoken2',
        scaledOfferFactorPercent: 0.1,
      },
    ]
    const setScaledOfferFactorOverridesResult = {
      value: 'set_scaled_offer_factor_overrides_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.setPairScaledOfferFactors.mockClear()
      moduleWriteActions.setPairScaledOfferFactors.mockReturnValueOnce(
        setScaledOfferFactorOverridesResult,
      )
    })

    test('Set scale factor overrides fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.setScaledOfferFactorOverrides({
            swapperAddress,
            scaledOfferFactorOverrides,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Set scaled factor overrides fails with no signer', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.setScaledOfferFactorOverrides({
            swapperAddress,
            scaledOfferFactorOverrides,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Set scale factor overrides fails from non owner', async () => {
      const nonOwnerSigner = new mockWalletClientNonOwner()
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
        walletClient: nonOwnerSigner,
      })

      await expect(
        async () =>
          await badClient.setScaledOfferFactorOverrides({
            swapperAddress,
            scaledOfferFactorOverrides,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Set scale factor overrides passes', async () => {
      const { event } = await client.setScaledOfferFactorOverrides({
        swapperAddress,
        scaledOfferFactorOverrides,
      })

      expect(event.blockNumber).toEqual(1111)
      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(validateScaledOfferFactorOverrides).toBeCalledWith(
        scaledOfferFactorOverrides,
      )

      expect(getFormattedScaledOfferFactorOverridesMock).toBeCalledWith(
        scaledOfferFactorOverrides,
      )

      expect(moduleWriteActions.setPairScaledOfferFactors).toBeCalledWith(
        FORMATTED_SCALED_OFFER_FACTOR_OVERRIDES,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.setScaledOfferFactorOverrides[0]],
      })
    })
  })

  describe('Set paused tests', () => {
    const swapperAddress = '0xswapper'
    const paused = true
    const setPausedResult = {
      value: 'set_paused_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.setPaused.mockClear()
      moduleWriteActions.setPaused.mockReturnValueOnce(setPausedResult)
    })

    test('Set paused fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.setPaused({
            swapperAddress,
            paused,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Set paused fails with no signer', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.setPaused({
            swapperAddress,
            paused,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Set paused fails from non owner', async () => {
      const nonOwnerSigner = new mockWalletClientNonOwner()
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
        walletClient: nonOwnerSigner,
      })

      await expect(
        async () =>
          await badClient.setPaused({
            swapperAddress,
            paused,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Set paused passes', async () => {
      const { event } = await client.setPaused({
        swapperAddress,
        paused,
      })

      expect(event.blockNumber).toEqual(1111)
      expect(validateAddress).toBeCalledWith(swapperAddress)

      expect(moduleWriteActions.setPaused).toBeCalledWith(paused)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.setPaused[0]],
      })
    })
  })

  describe('Exec calls tests', () => {
    const swapperAddress = '0xswapper'
    const calls = [
      {
        to: '0xaddress',
        value: BigInt(1),
        data: '0x0',
      },
    ]
    const execCallsResult = {
      value: 'exec_calls_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.execCalls.mockClear()
      moduleWriteActions.execCalls.mockReturnValueOnce(execCallsResult)
    })

    test('Exec calls fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.execCalls({
            swapperAddress,
            calls,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Exec calls fails with no signer', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.execCalls({
            swapperAddress,
            calls,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Exec calls fails from non owner', async () => {
      const nonOwnerSigner = new mockWalletClientNonOwner()
      const badClient = new SwapperClient({
        chainId: 1,
        publicClient,
        walletClient: nonOwnerSigner,
      })

      await expect(
        async () =>
          await badClient.execCalls({
            swapperAddress,
            calls,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Exec calls passes', async () => {
      const { event } = await client.execCalls({
        swapperAddress,
        calls,
      })

      expect(event.blockNumber).toEqual(1111)
      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(validateAddress).toBeCalledWith('0xaddress')

      expect(moduleWriteActions.execCalls).toBeCalledWith([
        [calls[0].to, calls[0].value, calls[0].data],
      ])
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.execCalls[0]],
      })
    })
  })
})

describe('Swapper reads', () => {
  const publicClient = new mockPublicClient()
  const client = new SwapperClient({
    chainId: 1,
    publicClient,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
  })

  describe('Get beneficiary test', () => {
    const swapperAddress = '0xbeneficiary'

    beforeEach(() => {
      readActions.beneficiary.mockClear()
    })

    test('Get beneficiary fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getBeneficiary({
            swapperAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns beneficiary', async () => {
      readActions.beneficiary.mockReturnValueOnce('0xbeneficiary')
      const { beneficiary } = await client.getBeneficiary({
        swapperAddress,
      })

      expect(beneficiary).toEqual('0xbeneficiary')
      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(readActions.beneficiary).toBeCalled()
    })
  })

  describe('Get token to beneficiary test', () => {
    const swapperAddress = '0xbeneficiary'

    beforeEach(() => {
      readActions.tokenToBeneficiary.mockClear()
    })

    test('Get token to beneficiary fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getTokenToBeneficiary({
            swapperAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns token to beneficiary', async () => {
      readActions.tokenToBeneficiary.mockReturnValueOnce('0xtoken')
      const { tokenToBeneficiary } = await client.getTokenToBeneficiary({
        swapperAddress,
      })

      expect(tokenToBeneficiary).toEqual('0xtoken')
      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(readActions.tokenToBeneficiary).toBeCalled()
    })
  })

  describe('Get oracle test', () => {
    const swapperAddress = '0xbeneficiary'

    beforeEach(() => {
      readActions.oracle.mockClear()
    })

    test('Get oracle fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getOracle({
            swapperAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns oracle', async () => {
      readActions.oracle.mockReturnValueOnce('0xoracle')
      const { oracle } = await client.getOracle({
        swapperAddress,
      })

      expect(oracle).toEqual('0xoracle')
      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(readActions.oracle).toBeCalled()
    })
  })

  describe('Get default scale test', () => {
    const swapperAddress = '0xbeneficiary'

    beforeEach(() => {
      readActions.defaultScaledOfferFactor.mockClear()
    })

    test('Get default scale fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getDefaultScaledOfferFactor({
            swapperAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns default scale', async () => {
      readActions.defaultScaledOfferFactor.mockReturnValueOnce(BigInt(990000))
      const { defaultScaledOfferFactor } =
        await client.getDefaultScaledOfferFactor({
          swapperAddress,
        })

      expect(defaultScaledOfferFactor).toEqual(BigInt(990000))
      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(readActions.defaultScaledOfferFactor).toBeCalled()
    })
  })

  describe('Get scaled offer factor overrides test', () => {
    const swapperAddress = '0xscaleOfferFactorOverrides'
    const quotePairs = [
      {
        base: '0xtoken1',
        quote: '0xtoken2',
      },
    ]

    beforeEach(() => {
      readActions.getPairScaledOfferFactors.mockClear()
    })

    test('Get default scale fails with no provider', async () => {
      const badClient = new SwapperClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getScaledOfferFactorOverrides({
            swapperAddress,
            quotePairs,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns scaled offer factor overrides', async () => {
      readActions.getPairScaledOfferFactors.mockReturnValueOnce([
        BigInt(990000),
      ])
      const { scaledOfferFactorOverrides } =
        await client.getScaledOfferFactorOverrides({
          swapperAddress,
          quotePairs,
        })

      expect(scaledOfferFactorOverrides).toEqual([BigInt(990000)])
      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(validateAddress).toBeCalledWith('0xtoken1')
      expect(validateAddress).toBeCalledWith('0xtoken2')
      expect(readActions.getPairScaledOfferFactors).toBeCalledWith([
        [
          {
            base: '0xtoken1',
            quote: '0xtoken2',
          },
        ],
      ])
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
  const mockFormatSwapper = jest
    .spyOn(subgraph, 'protectedFormatSwapper')
    .mockReturnValue('formatted_swapper' as unknown as Swapper)
  const mockAddEnsNames = jest.spyOn(utils, 'addEnsNames').mockImplementation()
  const mockGqlSwapper = {
    beneficiary: {
      id: '0xbeneficiary',
    },
    tokenToBeneficiary: {
      id: '0xtokenToBeneficiary',
    },
    owner: {
      id: '0xowner',
    },
  }

  const swapperAddress = '0xswapper'
  const publicClient = new mockPublicClient()
  const client = new SwapperClient({
    chainId: 1,
    publicClient,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
    mockGqlClient.request.mockClear()
    mockFormatSwapper.mockClear()
    mockAddEnsNames.mockClear()
  })

  describe('Get swapper metadata tests', () => {
    beforeEach(() => {
      mockGqlClient.request.mockReturnValue({
        swapper: mockGqlSwapper,
      })
    })

    test('Get swapper metadata passes', async () => {
      const swapper = await client.getSwapperMetadata({
        swapperAddress,
      })

      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(mockGqlClient.request).toBeCalledWith(subgraph.SWAPPER_QUERY, {
        swapperAddress,
      })
      expect(mockFormatSwapper).toBeCalledWith(mockGqlSwapper)
      expect(swapper).toEqual('formatted_swapper')
      expect(mockAddEnsNames).not.toBeCalled()
    })

    test('Adds ens names', async () => {
      const publicClient = new mockPublicClient()
      const ensClient = new SwapperClient({
        chainId: 1,
        publicClient,
        includeEnsNames: true,
      })

      const swapper = await ensClient.getSwapperMetadata({
        swapperAddress,
      })

      expect(validateAddress).toBeCalledWith(swapperAddress)
      expect(mockGqlClient.request).toBeCalledWith(subgraph.SWAPPER_QUERY, {
        swapperAddress,
      })
      expect(mockFormatSwapper).toBeCalledWith(mockGqlSwapper)
      expect(swapper).toEqual('formatted_swapper')
      expect(mockAddEnsNames).toBeCalled()
    })
  })
})
