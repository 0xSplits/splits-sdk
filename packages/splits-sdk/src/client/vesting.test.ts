import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import type { Event } from '@ethersproject/contracts'

import { VestingClient } from './vesting'
import { getVestingFactoryAddress } from '../constants'
import {
  InvalidConfigError,
  MissingProviderError,
  MissingSignerError,
  UnsupportedChainIdError,
} from '../errors'
import * as subgraph from '../subgraph'
import * as utils from '../utils'
import { validateAddress, validateVestingPeriod } from '../utils/validation'
import { GET_TOKEN_DATA } from '../testing/constants'
import { MockGraphqlClient } from '../testing/mocks/graphql'
import {
  MockVestingFactory,
  writeActions as factoryWriteActions,
  readActions as factoryReadActions,
} from '../testing/mocks/vestingFactory'
import {
  MockVestingModule,
  writeActions as moduleWriteActions,
  readActions,
} from '../testing/mocks/vestingModule'
import type { VestingModule } from '../types'

jest.mock('@ethersproject/contracts', () => {
  return {
    Contract: jest
      .fn()
      .mockImplementation((contractAddress, _contractInterface, provider) => {
        if (contractAddress === getVestingFactoryAddress(1))
          return new MockVestingFactory(provider)

        return new MockVestingModule(provider)
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
        vestingModule: '0xvesting',
      },
    } as unknown as Event
    return [event]
  })

const getTokenDataMock = jest
  .spyOn(utils, 'getTokenData')
  .mockImplementation(async () => {
    return GET_TOKEN_DATA
  })

const mockProvider = jest.fn<Provider, unknown[]>()
const mockSigner = jest.fn<Signer, unknown[]>()

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
  const provider = new mockProvider()
  const signer = new mockSigner()
  const vestingClient = new VestingClient({
    chainId: 1,
    provider,
    signer,
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
      ).rejects.toThrow(MissingProviderError)
    })

    test('Create vesting fails with no signer', async () => {
      const badClient = new VestingClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badClient.createVestingModule({
            beneficiary,
            vestingPeriodSeconds,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Create vesting passes', async () => {
      const { event, vestingModuleId } =
        await vestingClient.createVestingModule({
          beneficiary,
          vestingPeriodSeconds,
        })

      expect(event.blockNumber).toEqual(12345)
      expect(vestingModuleId).toEqual('0xvesting')
      expect(validateAddress).toBeCalledWith(beneficiary)
      expect(validateVestingPeriod).toBeCalledWith(vestingPeriodSeconds)
      expect(factoryWriteActions.createVestingModule).toBeCalledWith(
        beneficiary,
        vestingPeriodSeconds,
        {},
      )
      expect(getTransactionEventsSpy).toBeCalledWith(createVestingResult, [
        vestingClient.eventTopics.createVestingModule[0],
      ])
    })
  })

  describe('Create vesting streams tests', () => {
    const vestingModuleId = '0xvesting'
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
            vestingModuleId,
            tokens,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Start vest fails with no signer', async () => {
      const badClient = new VestingClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badClient.startVest({
            vestingModuleId,
            tokens,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Start vest passes', async () => {
      const { events } = await vestingClient.startVest({
        vestingModuleId,
        tokens,
      })

      expect(events[0].blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(vestingModuleId)
      expect(validateAddress).toBeCalledWith('0xtoken1')
      expect(validateAddress).toBeCalledWith('0xtoken2')
      expect(moduleWriteActions.createVestingStreams).toBeCalledWith(tokens, {})
      expect(getTransactionEventsSpy).toBeCalledWith(startVestResult, [
        vestingClient.eventTopics.startVest[0],
      ])
    })
  })

  describe('Release vested funds tests', () => {
    const vestingModuleId = '0xvesting'
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
            vestingModuleId,
            streamIds,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Release vested funds fails with no signer', async () => {
      const badClient = new VestingClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badClient.releaseVestedFunds({
            vestingModuleId,
            streamIds,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Release vested funds passes', async () => {
      const { events } = await vestingClient.releaseVestedFunds({
        vestingModuleId,
        streamIds,
      })

      expect(events[0].blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(vestingModuleId)
      expect(moduleWriteActions.releaseFromVesting).toBeCalledWith(
        streamIds,
        {},
      )
      expect(getTransactionEventsSpy).toBeCalledWith(releaseVestedFundsResult, [
        vestingClient.eventTopics.releaseVestedFunds[0],
      ])
    })
  })
})

describe('Vesting reads', () => {
  const provider = new mockProvider()
  const vestingClient = new VestingClient({
    chainId: 1,
    provider,
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
      ).rejects.toThrow(MissingProviderError)
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
      expect(factoryReadActions.predictVestingModuleAddress).toBeCalledWith(
        beneficiary,
        vestingPeriodSeconds,
      )
    })
  })

  describe('Get beneficiary test', () => {
    const vestingModuleId = '0xgetBeneficiary'

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
            vestingModuleId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns beneficiary', async () => {
      readActions.beneficiary.mockReturnValueOnce('0xbeneficiary')
      const { beneficiary } = await vestingClient.getBeneficiary({
        vestingModuleId,
      })

      expect(beneficiary).toEqual('0xbeneficiary')
      expect(validateAddress).toBeCalledWith(vestingModuleId)
      expect(readActions.beneficiary).toBeCalled()
    })
  })

  describe('Get vesting period test', () => {
    const vestingModuleId = '0xgetVestingPeriod'

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
            vestingModuleId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns vesting period', async () => {
      readActions.vestingPeriod.mockReturnValueOnce(BigNumber.from(20))
      const { vestingPeriod } = await vestingClient.getVestingPeriod({
        vestingModuleId,
      })

      expect(vestingPeriod).toEqual(BigNumber.from(20))
      expect(validateAddress).toBeCalledWith(vestingModuleId)
      expect(readActions.vestingPeriod).toBeCalled()
    })
  })

  describe('Get vested amount test', () => {
    const vestingModuleId = '0xgetVestedAmount'
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
            vestingModuleId,
            streamId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns vested amount', async () => {
      readActions.vested.mockReturnValueOnce(BigNumber.from(5))
      const { amount } = await vestingClient.getVestedAmount({
        vestingModuleId,
        streamId,
      })

      expect(amount).toEqual(BigNumber.from(5))
      expect(validateAddress).toBeCalledWith(vestingModuleId)
      expect(readActions.vested).toBeCalledWith(streamId)
    })
  })

  describe('Get vested and unreleased amount test', () => {
    const vestingModuleId = '0xgetVestedAndUnreleasedAmount'
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
            vestingModuleId,
            streamId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns vested and unreleased amount', async () => {
      readActions.vestedAndUnreleased.mockReturnValueOnce(BigNumber.from(3))
      const { amount } = await vestingClient.getVestedAndUnreleasedAmount({
        vestingModuleId,
        streamId,
      })

      expect(amount).toEqual(BigNumber.from(3))
      expect(validateAddress).toBeCalledWith(vestingModuleId)
      expect(readActions.vestedAndUnreleased).toBeCalledWith(streamId)
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
  const mockAddEnsNames = jest.spyOn(utils, 'addEnsNames').mockImplementation()
  const mockGqlVesting = {
    streams: [
      {
        token: {
          id: '0xtoken1',
        },
      },
    ],
  }

  const vestingModuleId = '0xvesting'
  const provider = new mockProvider()
  const vestingClient = new VestingClient({
    chainId: 1,
    provider,
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
            vestingModuleId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Get vesting metadata passes', async () => {
      const vestingModule = await vestingClient.getVestingMetadata({
        vestingModuleId,
      })

      expect(validateAddress).toBeCalledWith(vestingModuleId)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.VESTING_MODULE_QUERY,
        {
          vestingModuleId,
        },
      )
      expect(getTokenDataMock).toBeCalledWith(
        1,
        mockGqlVesting.streams[0].token.id,
        provider,
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
      const provider = new mockProvider()
      const ensVestingClient = new VestingClient({
        chainId: 1,
        provider,
        includeEnsNames: true,
      })

      const vestingModule = await ensVestingClient.getVestingMetadata({
        vestingModuleId,
      })

      expect(validateAddress).toBeCalledWith(vestingModuleId)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.VESTING_MODULE_QUERY,
        {
          vestingModuleId,
        },
      )
      expect(getTokenDataMock).toBeCalledWith(
        1,
        mockGqlVesting.streams[0].token.id,
        provider,
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
