import {
  Account,
  Address,
  Chain,
  Log,
  PublicClient,
  Transport,
  WalletClient,
} from 'viem'

import { VestingClient } from './vesting'
import { getVestingFactoryAddress } from '../constants'
import {
  InvalidConfigError,
  MissingPublicClientError,
  MissingWalletClientError,
  UnsupportedChainIdError,
} from '../errors'
import * as subgraph from '../subgraph'
import * as tokenUtils from '../utils/tokens'
import * as ensUtils from '../utils/ens'
import { validateAddress, validateVestingPeriod } from '../utils/validation'
import { GET_TOKEN_DATA } from '../testing/constants'
import { MockGraphqlClient } from '../testing/mocks/graphql'
import {
  writeActions as factoryWriteActions,
  readActions as factoryReadActions,
} from '../testing/mocks/vestingFactory'
import {
  writeActions as moduleWriteActions,
  readActions,
} from '../testing/mocks/vestingModule'
import { MockViemContract } from '../testing/mocks/viemContract'
import type { VestingModule } from '../types'

jest.mock('viem', () => {
  const originalModule = jest.requireActual('viem')
  return {
    ...originalModule,
    getContract: jest.fn(({ address }: { address: Address }) => {
      if (address === getVestingFactoryAddress(1))
        return new MockViemContract(factoryReadActions, factoryWriteActions)
      return new MockViemContract(readActions, moduleWriteActions)
    }),
    getAddress: jest.fn((address) => address),
    decodeEventLog: jest.fn(() => {
      return {
        eventName: 'eventName',
        args: {
          vestingModule: '0xvesting',
        },
      }
    }),
  }
})

jest.mock('../utils/validation')

const getTokenDataMock = jest
  .spyOn(tokenUtils, 'getTokenData')
  .mockImplementation(async () => {
    return GET_TOKEN_DATA
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
        if (address === getVestingFactoryAddress(1)) {
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
      address: '0xsigner',
    },
    writeContract: jest.fn(() => {
      return '0xhash'
    }),
  } as unknown as WalletClient<Transport, Chain, Account>
})

describe('Client config validation', () => {
  test('Including ens names with no provider fails', () => {
    expect(
      () => new VestingClient({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
  })

  test('Invalid chain id fails', () => {
    expect(() => new VestingClient({ chainId: 51 })).toThrow(
      UnsupportedChainIdError,
    )
  })

  test('Ethereum chain ids pass', () => {
    expect(() => new VestingClient({ chainId: 1 })).not.toThrow()
    expect(() => new VestingClient({ chainId: 5 })).not.toThrow()
  })

  test('Polygon chain ids pass', () => {
    expect(() => new VestingClient({ chainId: 137 })).not.toThrow()
    expect(() => new VestingClient({ chainId: 80001 })).not.toThrow()
  })

  test('Optimism chain ids pass', () => {
    expect(() => new VestingClient({ chainId: 10 })).not.toThrow()
    expect(() => new VestingClient({ chainId: 420 })).not.toThrow()
  })

  test('Arbitrum chain ids pass', () => {
    expect(() => new VestingClient({ chainId: 42161 })).not.toThrow()
    expect(() => new VestingClient({ chainId: 421613 })).not.toThrow()
  })

  test('Zora chain ids pass', () => {
    expect(() => new VestingClient({ chainId: 7777777 })).not.toThrow()
    expect(() => new VestingClient({ chainId: 999 })).not.toThrow()
  })

  test('Base chain ids pass', () => {
    expect(() => new VestingClient({ chainId: 8453 })).not.toThrow()
  })

  test('Other chain ids pass', () => {
    expect(() => new VestingClient({ chainId: 100 })).not.toThrow()
    expect(() => new VestingClient({ chainId: 250 })).not.toThrow()
    expect(() => new VestingClient({ chainId: 43114 })).not.toThrow()
    expect(() => new VestingClient({ chainId: 56 })).not.toThrow()
    expect(() => new VestingClient({ chainId: 1313161554 })).not.toThrow()
  })
})

describe('Vesting writes', () => {
  const publicClient = new mockPublicClient()
  const walletClient = new mockWalletClient()
  const vestingClient = new VestingClient({
    chainId: 1,
    publicClient,
    walletClient,
  })
  const getTransactionEventsSpy = jest
    .spyOn(vestingClient, 'getTransactionEvents')
    .mockImplementation(async () => {
      const event = {
        blockNumber: 12345,
        args: {
          vestingModule: '0xvesting',
        },
      } as unknown as Log
      return [event]
    })

  beforeEach(() => {
    ;(validateVestingPeriod as jest.Mock).mockClear()
    ;(validateAddress as jest.Mock).mockClear()
    getTransactionEventsSpy.mockClear()
  })

  describe('Create vesting tests', () => {
    const beneficiary = '0xuser1'
    const vestingPeriodSeconds = 60 * 60 * 24 * 365
    const createVestingResult = {
      value: 'create_vesting_module_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      factoryWriteActions.createVestingModule.mockClear()
      factoryWriteActions.createVestingModule.mockReturnValueOnce(
        createVestingResult,
      )
    })

    test('Create veingst fails with no provider', async () => {
      const badClient = new VestingClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.createVestingModule({
            beneficiary,
            vestingPeriodSeconds,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Create vesting fails with no signer', async () => {
      const badClient = new VestingClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.createVestingModule({
            beneficiary,
            vestingPeriodSeconds,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Create vesting passes', async () => {
      const { event, vestingModuleAddress } =
        await vestingClient.createVestingModule({
          beneficiary,
          vestingPeriodSeconds,
        })

      expect(event.blockNumber).toEqual(12345)
      expect(vestingModuleAddress).toEqual('0xvesting')
      expect(validateAddress).toBeCalledWith(beneficiary)
      expect(validateVestingPeriod).toBeCalledWith(vestingPeriodSeconds)
      expect(factoryWriteActions.createVestingModule).toBeCalledWith(
        beneficiary,
        vestingPeriodSeconds,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [vestingClient.eventTopics.createVestingModule[0]],
      })
    })
  })

  describe('Create vesting streams tests', () => {
    const vestingModuleAddress = '0xvesting'
    const tokens = ['0xtoken1', '0xtoken2']
    const startVestResult = {
      value: 'start_vest_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.createVestingStreams.mockClear()
      moduleWriteActions.createVestingStreams.mockReturnValueOnce(
        startVestResult,
      )
    })

    test('Start vest fails with no provider', async () => {
      const badClient = new VestingClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.startVest({
            vestingModuleAddress,
            tokens,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Start vest fails with no signer', async () => {
      const badClient = new VestingClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.startVest({
            vestingModuleAddress,
            tokens,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Start vest passes', async () => {
      const { events } = await vestingClient.startVest({
        vestingModuleAddress,
        tokens,
      })

      expect(events[0].blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(vestingModuleAddress)
      expect(validateAddress).toBeCalledWith('0xtoken1')
      expect(validateAddress).toBeCalledWith('0xtoken2')
      expect(moduleWriteActions.createVestingStreams).toBeCalledWith(tokens)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [vestingClient.eventTopics.startVest[0]],
      })
    })
  })

  describe('Release vested funds tests', () => {
    const vestingModuleAddress = '0xvesting'
    const streamIds = ['1', '2']
    const releaseVestedFundsResult = {
      value: 'release_vested_funds_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.releaseFromVesting.mockClear()
      moduleWriteActions.releaseFromVesting.mockReturnValueOnce(
        releaseVestedFundsResult,
      )
    })

    test('Release vested funds fails with no provider', async () => {
      const badClient = new VestingClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.releaseVestedFunds({
            vestingModuleAddress,
            streamIds,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Release vested funds fails with no signer', async () => {
      const badClient = new VestingClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.releaseVestedFunds({
            vestingModuleAddress,
            streamIds,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Release vested funds passes', async () => {
      const { events } = await vestingClient.releaseVestedFunds({
        vestingModuleAddress,
        streamIds,
      })

      expect(events[0].blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(vestingModuleAddress)
      expect(moduleWriteActions.releaseFromVesting).toBeCalledWith(streamIds)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [vestingClient.eventTopics.releaseVestedFunds[0]],
      })
    })
  })
})

describe('Vesting reads', () => {
  const publicClient = new mockPublicClient()
  const vestingClient = new VestingClient({
    chainId: 1,
    publicClient,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
  })

  describe('Predict vesting module address test', () => {
    const beneficiary = '0xbeneficiary'
    const vestingPeriodSeconds = 60 * 60 * 24 * 365

    beforeEach(() => {
      factoryReadActions.predictVestingModuleAddress.mockClear()
    })

    test('Predict vesting module address fails with no provider', async () => {
      const badClient = new VestingClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.predictVestingModuleAddress({
            beneficiary,
            vestingPeriodSeconds,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns predicted address', async () => {
      factoryReadActions.predictVestingModuleAddress.mockReturnValueOnce([
        '0xpredictedAddress',
        true,
      ])
      const { address, exists } =
        await vestingClient.predictVestingModuleAddress({
          beneficiary,
          vestingPeriodSeconds,
        })

      expect(address).toEqual('0xpredictedAddress')
      expect(exists).toEqual(true)
      expect(validateAddress).toBeCalledWith(beneficiary)
      expect(factoryReadActions.predictVestingModuleAddress).toBeCalledWith([
        beneficiary,
        BigInt(vestingPeriodSeconds),
      ])
    })
  })

  describe('Get beneficiary test', () => {
    const vestingModuleAddress = '0xgetBeneficiary'

    beforeEach(() => {
      readActions.beneficiary.mockClear()
    })

    test('Get beneficiary fails with no provider', async () => {
      const badClient = new VestingClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getBeneficiary({
            vestingModuleAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns beneficiary', async () => {
      readActions.beneficiary.mockReturnValueOnce('0xbeneficiary')
      const { beneficiary } = await vestingClient.getBeneficiary({
        vestingModuleAddress,
      })

      expect(beneficiary).toEqual('0xbeneficiary')
      expect(validateAddress).toBeCalledWith(vestingModuleAddress)
      expect(readActions.beneficiary).toBeCalled()
    })
  })

  describe('Get vesting period test', () => {
    const vestingModuleAddress = '0xgetVestingPeriod'

    beforeEach(() => {
      readActions.vestingPeriod.mockClear()
    })

    test('Get vesting period fails with no provider', async () => {
      const badClient = new VestingClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getVestingPeriod({
            vestingModuleAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns vesting period', async () => {
      readActions.vestingPeriod.mockReturnValueOnce(BigInt(20))
      const { vestingPeriod } = await vestingClient.getVestingPeriod({
        vestingModuleAddress,
      })

      expect(vestingPeriod).toEqual(BigInt(20))
      expect(validateAddress).toBeCalledWith(vestingModuleAddress)
      expect(readActions.vestingPeriod).toBeCalled()
    })
  })

  describe('Get vested amount test', () => {
    const vestingModuleAddress = '0xgetVestedAmount'
    const streamId = '1'

    beforeEach(() => {
      readActions.vested.mockClear()
    })

    test('Get vested amount fails with no provider', async () => {
      const badClient = new VestingClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getVestedAmount({
            vestingModuleAddress,
            streamId,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns vested amount', async () => {
      readActions.vested.mockReturnValueOnce(BigInt(5))
      const { amount } = await vestingClient.getVestedAmount({
        vestingModuleAddress,
        streamId,
      })

      expect(amount).toEqual(BigInt(5))
      expect(validateAddress).toBeCalledWith(vestingModuleAddress)
      expect(readActions.vested).toBeCalledWith([BigInt(streamId)])
    })
  })

  describe('Get vested and unreleased amount test', () => {
    const vestingModuleAddress = '0xgetVestedAndUnreleasedAmount'
    const streamId = '1'

    beforeEach(() => {
      readActions.vestedAndUnreleased.mockClear()
    })

    test('Get vested and unreleased amount fails with no provider', async () => {
      const badClient = new VestingClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getVestedAndUnreleasedAmount({
            vestingModuleAddress,
            streamId,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns vested and unreleased amount', async () => {
      readActions.vestedAndUnreleased.mockReturnValueOnce(BigInt(3))
      const { amount } = await vestingClient.getVestedAndUnreleasedAmount({
        vestingModuleAddress,
        streamId,
      })

      expect(amount).toEqual(BigInt(3))
      expect(validateAddress).toBeCalledWith(vestingModuleAddress)
      expect(readActions.vestedAndUnreleased).toBeCalledWith([BigInt(streamId)])
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
  const mockFormatVesting = jest
    .spyOn(subgraph, 'protectedFormatVestingModule')
    .mockReturnValue('formatted_vesting_module' as unknown as VestingModule)
  const mockAddEnsNames = jest
    .spyOn(ensUtils, 'addEnsNames')
    .mockImplementation()
  const mockGqlVesting = {
    streams: [
      {
        token: {
          id: '0xtoken1',
        },
      },
    ],
  }

  const vestingModuleAddress = '0xvesting'
  const publicClient = new mockPublicClient()
  const vestingClient = new VestingClient({
    chainId: 1,
    publicClient,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
    mockGqlClient.request.mockClear()
    mockFormatVesting.mockClear()
    mockAddEnsNames.mockClear()
  })

  describe('Get vesting metadata tests', () => {
    beforeEach(() => {
      mockGqlClient.request.mockReturnValue({
        vestingModule: {
          streams: [
            {
              token: {
                id: '0xtoken1',
              },
            },
          ],
        },
      })
    })

    test('Get vesting metadata fails with no provider', async () => {
      const badClient = new VestingClient({
        chainId: 1,
      })
      await expect(
        async () =>
          await badClient.getVestingMetadata({
            vestingModuleAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Get vesting metadata passes', async () => {
      const vestingModule = await vestingClient.getVestingMetadata({
        vestingModuleAddress,
      })

      expect(validateAddress).toBeCalledWith(vestingModuleAddress)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.VESTING_MODULE_QUERY,
        {
          vestingModuleAddress,
        },
      )
      expect(getTokenDataMock).toBeCalledWith(
        1,
        mockGqlVesting.streams[0].token.id,
        publicClient,
      )
      expect(mockFormatVesting).toBeCalledWith(mockGqlVesting, {
        [mockGqlVesting.streams[0].token.id]: {
          symbol: GET_TOKEN_DATA.symbol,
          decimals: GET_TOKEN_DATA.decimals,
        },
      })
      expect(vestingModule).toEqual('formatted_vesting_module')
      expect(mockAddEnsNames).not.toBeCalled()
    })

    test('Adds ens names', async () => {
      const publicClient = new mockPublicClient()
      const ensVestingClient = new VestingClient({
        chainId: 1,
        publicClient,
        includeEnsNames: true,
      })

      const vestingModule = await ensVestingClient.getVestingMetadata({
        vestingModuleAddress,
      })

      expect(validateAddress).toBeCalledWith(vestingModuleAddress)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.VESTING_MODULE_QUERY,
        {
          vestingModuleAddress,
        },
      )
      expect(getTokenDataMock).toBeCalledWith(
        1,
        mockGqlVesting.streams[0].token.id,
        publicClient,
      )
      expect(mockFormatVesting).toBeCalledWith(mockGqlVesting, {
        [mockGqlVesting.streams[0].token.id]: {
          symbol: GET_TOKEN_DATA.symbol,
          decimals: GET_TOKEN_DATA.decimals,
        },
      })
      expect(vestingModule).toEqual('formatted_vesting_module')
      expect(mockAddEnsNames).toBeCalled()
    })
  })
})
