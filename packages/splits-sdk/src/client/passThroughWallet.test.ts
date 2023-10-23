import { PassThroughWalletClient } from './passThroughWallet'
import { getPassThroughWalletFactoryAddress } from '../constants'
import {
  InvalidAuthError,
  InvalidConfigError,
  MissingPublicClientError,
  MissingWalletClientError,
  UnsupportedChainIdError,
} from '../errors'
import { validateAddress } from '../utils/validation'
import { writeActions as factoryWriteActions } from '../testing/mocks/passThroughWalletFactory'
import {
  writeActions as moduleWriteActions,
  readActions,
} from '../testing/mocks/passThroughWallet'
import { OWNER_ADDRESS } from '../testing/constants'
import { Address, Log, PublicClient, WalletClient } from 'viem'
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
          passThroughWallet: '0xPassThroughWallet',
        },
      }
    }),
  }
})

jest.mock('../utils/validation')

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
        if (address === getPassThroughWalletFactoryAddress(1)) {
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
  } as unknown as PublicClient
})
const mockWalletClient = jest.fn(() => {
  return {
    account: {
      address: OWNER_ADDRESS,
    },
    writeContract: jest.fn(() => {
      return '0xhash'
    }),
  } as unknown as WalletClient
})
const mockWalletClientNonOwner = jest.fn(() => {
  return {
    account: {
      address: '0xnotOwner',
    },
    writeContract: jest.fn(() => {
      return '0xhash'
    }),
  } as unknown as WalletClient
})

describe('Client config validation', () => {
  test('Including ens names with no provider fails', () => {
    expect(
      () => new PassThroughWalletClient({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
  })

  test('Invalid chain id fails', () => {
    expect(() => new PassThroughWalletClient({ chainId: 51 })).toThrow(
      UnsupportedChainIdError,
    )
  })

  test('Ethereum chain ids pass', () => {
    expect(() => new PassThroughWalletClient({ chainId: 1 })).not.toThrow()
    expect(() => new PassThroughWalletClient({ chainId: 5 })).not.toThrow()
  })

  test('Polygon chain ids fail', () => {
    expect(() => new PassThroughWalletClient({ chainId: 137 })).toThrow()
    expect(() => new PassThroughWalletClient({ chainId: 80001 })).toThrow()
  })

  test('Optimism chain ids fail', () => {
    expect(() => new PassThroughWalletClient({ chainId: 10 })).toThrow()
    expect(() => new PassThroughWalletClient({ chainId: 420 })).toThrow()
  })

  test('Arbitrum chain ids fail', () => {
    expect(() => new PassThroughWalletClient({ chainId: 42161 })).toThrow()
    expect(() => new PassThroughWalletClient({ chainId: 421613 })).toThrow()
  })

  test('Zora chain ids fail', () => {
    expect(() => new PassThroughWalletClient({ chainId: 7777777 })).toThrow()
    expect(() => new PassThroughWalletClient({ chainId: 999 })).toThrow()
  })

  test('Base chain ids fail', () => {
    expect(() => new PassThroughWalletClient({ chainId: 8453 })).toThrow()
  })

  test('Other chain ids fail', () => {
    expect(() => new PassThroughWalletClient({ chainId: 100 })).toThrow()
    expect(() => new PassThroughWalletClient({ chainId: 250 })).toThrow()
    expect(() => new PassThroughWalletClient({ chainId: 43114 })).toThrow()
    expect(() => new PassThroughWalletClient({ chainId: 56 })).toThrow()
    expect(() => new PassThroughWalletClient({ chainId: 1313161554 })).toThrow()
  })
})

describe('Pass through wallet writes', () => {
  const publicClient = new mockPublicClient()
  const walletClient = new mockWalletClient()
  const client = new PassThroughWalletClient({
    chainId: 1,
    publicClient,
    walletClient,
  })
  const getTransactionEventsSpy = jest
    .spyOn(client, 'getTransactionEvents')
    .mockImplementation(async () => {
      const event = {
        blockNumber: 12345,
        args: {
          passThroughWallet: '0xPassThroughWallet',
        },
      } as unknown as Log
      return [event]
    })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
    getTransactionEventsSpy.mockClear()
  })

  describe('Create pass through wallet tests', () => {
    const owner = '0xowner'
    const paused = false
    const passThrough = '0xpassthrough'

    const createPassThroughWalletResult = {
      value: 'create_pass_through_wallet_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      factoryWriteActions.createPassThroughWallet.mockClear()
      factoryWriteActions.createPassThroughWallet.mockReturnValueOnce(
        createPassThroughWalletResult,
      )
    })

    test('Create pass through wallet fails with no provider', async () => {
      const badClient = new PassThroughWalletClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.createPassThroughWallet({
            owner,
            paused,
            passThrough,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Create pass through wallet fails with no signer', async () => {
      const badClient = new PassThroughWalletClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.createPassThroughWallet({
            owner,
            paused,
            passThrough,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Create pass through wallet passes', async () => {
      const { event, passThroughWalletId } =
        await client.createPassThroughWallet({
          owner,
          paused,
          passThrough,
        })

      expect(event.blockNumber).toEqual(12345)
      expect(passThroughWalletId).toEqual('0xPassThroughWallet')
      expect(validateAddress).toBeCalledWith(owner)
      expect(validateAddress).toBeCalledWith(passThrough)

      expect(factoryWriteActions.createPassThroughWallet).toBeCalledWith([
        owner,
        paused,
        passThrough,
      ])
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.createPassThroughWallet[0]],
      })
    })
  })

  describe('Pass through tokens tests', () => {
    const passThroughWalletId = '0xpassthroughwallet'
    const tokens = ['0xtoken1', '0xtoken2']
    const passThroughTokensResult = {
      value: 'pass_through_tokens_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.passThroughTokens.mockClear()
      moduleWriteActions.passThroughTokens.mockReturnValueOnce(
        passThroughTokensResult,
      )
    })

    test('Pass through tokens fails with no provider', async () => {
      const badClient = new PassThroughWalletClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.passThroughTokens({
            passThroughWalletId,
            tokens,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Pass through tokens fails with no signer', async () => {
      const badClient = new PassThroughWalletClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.passThroughTokens({
            passThroughWalletId,
            tokens,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Pass through tokens passes', async () => {
      const { event } = await client.passThroughTokens({
        passThroughWalletId,
        tokens,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(passThroughWalletId)
      expect(validateAddress).toBeCalledWith('0xtoken1')
      expect(validateAddress).toBeCalledWith('0xtoken2')
      expect(moduleWriteActions.passThroughTokens).toBeCalledWith(tokens)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.passThroughTokens[0]],
      })
    })
  })

  describe('Set pass through tests', () => {
    const passThroughWalletId = '0xpassthroughwallet'
    const passThrough = '0xuser'
    const setPassThroughResult = {
      value: 'set_pass_through_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.setPassThrough.mockClear()
      moduleWriteActions.setPassThrough.mockReturnValueOnce(
        setPassThroughResult,
      )
    })

    test('Set pass through fails with no provider', async () => {
      const badClient = new PassThroughWalletClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.setPassThrough({
            passThroughWalletId,
            passThrough,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Set pass through fails with no signer', async () => {
      const badClient = new PassThroughWalletClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.setPassThrough({
            passThroughWalletId,
            passThrough,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Set pass through fails from non owner', async () => {
      const nonOwnerSigner = new mockWalletClientNonOwner()
      const badClient = new PassThroughWalletClient({
        chainId: 1,
        publicClient,
        walletClient: nonOwnerSigner,
      })

      await expect(
        async () =>
          await badClient.setPassThrough({
            passThroughWalletId,
            passThrough,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Set pass through passes', async () => {
      const { event } = await client.setPassThrough({
        passThroughWalletId,
        passThrough,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(passThroughWalletId)
      expect(validateAddress).toBeCalledWith(passThrough)
      expect(moduleWriteActions.setPassThrough).toBeCalledWith(passThrough)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.setPassThrough[0]],
      })
    })
  })

  describe('Set paused tests', () => {
    const passThroughWalletId = '0xpassThroughWallet'
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
      const badClient = new PassThroughWalletClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.setPaused({
            passThroughWalletId,
            paused,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Set paused fails with no signer', async () => {
      const badClient = new PassThroughWalletClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.setPaused({
            passThroughWalletId,
            paused,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Set paused fails from non owner', async () => {
      const nonOwnerSigner = new mockWalletClientNonOwner()
      const badClient = new PassThroughWalletClient({
        chainId: 1,
        publicClient,
        walletClient: nonOwnerSigner,
      })

      await expect(
        async () =>
          await badClient.setPaused({
            passThroughWalletId,
            paused,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Set paused passes', async () => {
      const { event } = await client.setPaused({
        passThroughWalletId,
        paused,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(passThroughWalletId)

      expect(moduleWriteActions.setPaused).toBeCalledWith(paused)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [client.eventTopics.setPaused[0]],
      })
    })
  })

  describe('Exec calls tests', () => {
    const passThroughWalletId = '0xpassthroughwallet'
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
      const badClient = new PassThroughWalletClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.execCalls({
            passThroughWalletId,
            calls,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Exec calls fails with no signer', async () => {
      const badClient = new PassThroughWalletClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.execCalls({
            passThroughWalletId,
            calls,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Exec calls fails from non owner', async () => {
      const nonOwnerSigner = new mockWalletClientNonOwner()
      const badClient = new PassThroughWalletClient({
        chainId: 1,
        publicClient,
        walletClient: nonOwnerSigner,
      })

      await expect(
        async () =>
          await badClient.execCalls({
            passThroughWalletId,
            calls,
          }),
      ).rejects.toThrow(InvalidAuthError)
    })

    test('Exec calls passes', async () => {
      const { event } = await client.execCalls({
        passThroughWalletId,
        calls,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(passThroughWalletId)
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

describe('Pass through wallet reads', () => {
  const publicClient = new mockPublicClient()
  const client = new PassThroughWalletClient({
    chainId: 1,
    publicClient,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
  })

  describe('Get pass through test', () => {
    const passThroughWalletId = '0xpassthroughwallet'

    beforeEach(() => {
      readActions.passThrough.mockClear()
    })

    test('Get pass through fails with no provider', async () => {
      const badClient = new PassThroughWalletClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getPassThrough({
            passThroughWalletId,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns pass through', async () => {
      readActions.passThrough.mockReturnValueOnce('0xpassthrough')
      const { passThrough } = await client.getPassThrough({
        passThroughWalletId,
      })

      expect(passThrough).toEqual('0xpassthrough')
      expect(validateAddress).toBeCalledWith(passThroughWalletId)
      expect(readActions.passThrough).toBeCalled()
    })
  })
})
