import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import type { Event } from '@ethersproject/contracts'

import WaterfallClient from './waterfall'
import { WATERFALL_MODULE_FACTORY_ADDRESS } from '../constants'
import {
  InvalidArgumentError,
  InvalidConfigError,
  MissingProviderError,
  MissingSignerError,
  UnsupportedChainIdError,
} from '../errors'
import * as subgraph from '../subgraph'
import * as utils from '../utils'
import { validateAddress, validateTranches } from '../utils/validation'
import {
  TRANCHE_RECIPIENTS,
  TRANCHE_SIZES,
  GET_TOKEN_DATA,
} from '../testing/constants'
import { MockGraphqlClient } from '../testing/mocks/graphql'
import {
  MockWaterfallFactory,
  writeActions as factoryWriteActions,
} from '../testing/mocks/waterfallFactory'
import {
  MockWaterfallModule,
  writeActions as moduleWriteActions,
  readActions,
} from '../testing/mocks/waterfallModule'
import type { WaterfallModule } from '../types'

jest.mock('@ethersproject/contracts', () => {
  return {
    Contract: jest
      .fn()
      .mockImplementation((contractAddress, _contractInterface, provider) => {
        if (contractAddress === WATERFALL_MODULE_FACTORY_ADDRESS)
          return new MockWaterfallFactory(provider)

        return new MockWaterfallModule(provider)
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
        waterfallModule: '0xwaterfall',
      },
    } as unknown as Event
    return [event]
  })
const getTrancheRecipientsAndSizesMock = jest
  .spyOn(utils, 'getTrancheRecipientsAndSizes')
  .mockImplementation(async () => {
    return [TRANCHE_RECIPIENTS, TRANCHE_SIZES]
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
      () => new WaterfallClient({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
  })

  test('Invalid chain id fails', () => {
    expect(() => new WaterfallClient({ chainId: 51 })).toThrow(
      UnsupportedChainIdError,
    )
  })

  test('Ethereum chain ids pass', () => {
    expect(() => new WaterfallClient({ chainId: 1 })).not.toThrow()
    expect(() => new WaterfallClient({ chainId: 5 })).not.toThrow()
  })

  test('Polygon chain ids pass', () => {
    expect(() => new WaterfallClient({ chainId: 137 })).not.toThrow()
    expect(() => new WaterfallClient({ chainId: 80001 })).not.toThrow()
  })

  test('Optimism chain ids pass', () => {
    expect(() => new WaterfallClient({ chainId: 10 })).not.toThrow()
    expect(() => new WaterfallClient({ chainId: 420 })).not.toThrow()
  })

  test('Arbitrum chain ids pass', () => {
    expect(() => new WaterfallClient({ chainId: 42161 })).not.toThrow()
    expect(() => new WaterfallClient({ chainId: 421613 })).not.toThrow()
  })
})

describe('Waterfall writes', () => {
  const provider = new mockProvider()
  const signer = new mockSigner()
  const waterfallClient = new WaterfallClient({
    chainId: 1,
    provider,
    signer,
  })

  beforeEach(() => {
    ;(validateTranches as jest.Mock).mockClear()
    ;(validateAddress as jest.Mock).mockClear()
    getTransactionEventsSpy.mockClear()
    getTrancheRecipientsAndSizesMock.mockClear()
  })

  describe('Create waterfall tests', () => {
    const token = '0x0'
    const tranches = [
      {
        recipient: '0xuser1',
        size: 1,
      },
      {
        recipient: '0xuser2',
      },
    ]

    beforeEach(() => {
      factoryWriteActions.createWaterfallModule.mockClear()
    })

    test('Create waterfall fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.createWaterfallModule({
            token,
            tranches,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Create waterfall fails with no signer', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badClient.createWaterfallModule({
            token,
            tranches,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Create waterfall passes', async () => {
      const { event, waterfallModuleId } =
        await waterfallClient.createWaterfallModule({
          token,
          tranches,
        })

      expect(event.blockNumber).toEqual(12345)
      expect(waterfallModuleId).toEqual('0xwaterfall')
      expect(validateAddress).toBeCalledWith(token)
      expect(validateTranches).toBeCalledWith(tranches)
      expect(getTrancheRecipientsAndSizesMock).toBeCalledWith(
        1,
        token,
        tranches,
        provider,
      )
      expect(factoryWriteActions.createWaterfallModule).toBeCalledWith(
        token,
        AddressZero,
        TRANCHE_RECIPIENTS,
        TRANCHE_SIZES,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(
        'create_waterfall_module_tx',
        [waterfallClient.eventTopics.createWaterfallModule[0]],
      )
    })

    test('Create waterfall passes with non waterfall recipient', async () => {
      const { event, waterfallModuleId } =
        await waterfallClient.createWaterfallModule({
          token,
          tranches,
          nonWaterfallRecipient: '0xnonWaterfallRecipient',
        })

      expect(event.blockNumber).toEqual(12345)
      expect(waterfallModuleId).toEqual('0xwaterfall')
      expect(validateAddress).toBeCalledWith(token)
      expect(validateTranches).toBeCalledWith(tranches)
      expect(getTrancheRecipientsAndSizesMock).toBeCalledWith(
        1,
        token,
        tranches,
        provider,
      )
      expect(factoryWriteActions.createWaterfallModule).toBeCalledWith(
        token,
        '0xnonWaterfallRecipient',
        TRANCHE_RECIPIENTS,
        TRANCHE_SIZES,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(
        'create_waterfall_module_tx',
        [waterfallClient.eventTopics.createWaterfallModule[0]],
      )
    })
  })

  describe('Waterfall funds tests', () => {
    const waterfallModuleId = '0xwaterfall'

    beforeEach(() => {
      moduleWriteActions.waterfallFunds.mockClear()
      moduleWriteActions.waterfallFundsPull.mockClear()
    })

    test('Waterfall funds fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.waterfallFunds({
            waterfallModuleId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Waterfall funds fails with no signer', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badClient.waterfallFunds({
            waterfallModuleId,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Waterfall funds passes', async () => {
      const { event } = await waterfallClient.waterfallFunds({
        waterfallModuleId,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(moduleWriteActions.waterfallFunds).toBeCalled()
      expect(moduleWriteActions.waterfallFundsPull).not.toBeCalled()
      expect(getTransactionEventsSpy).toBeCalledWith('waterfall_funds_tx', [
        waterfallClient.eventTopics.waterfallFunds[0],
      ])
    })

    test('Waterfall funds pull passes', async () => {
      const { event } = await waterfallClient.waterfallFunds({
        waterfallModuleId,
        usePull: true,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(moduleWriteActions.waterfallFunds).not.toBeCalled()
      expect(moduleWriteActions.waterfallFundsPull).toBeCalled()
      expect(getTransactionEventsSpy).toBeCalledWith(
        'waterfall_funds_pull_tx',
        [waterfallClient.eventTopics.waterfallFunds[0]],
      )
    })
  })

  describe('Recover non waterfall funds tests', () => {
    const waterfallModuleId = '0xwaterfall'
    const token = '0xtoken'
    const recipient = '0xrecipient1'
    const nonWaterfallRecipient = '0xnonWaterfallRecipient'

    const mockGetWaterfallData = jest
      .spyOn(waterfallClient, 'getWaterfallMetadata')
      .mockImplementation(async () => {
        return {
          token: {
            address: '0xwaterfalltoken',
          },
          tranches: [
            { recipientAddress: '0xrecipient1' },
            { recipientAddress: '0xrecipient2' },
          ],
        } as WaterfallModule
      })

    beforeEach(() => {
      mockGetWaterfallData.mockClear()
      moduleWriteActions.recoverNonWaterfallFunds.mockClear()
    })

    test('Recover non waterfall funds fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.recoverNonWaterfallFunds({
            waterfallModuleId,
            token,
            recipient,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Recover non waterfall funds fails with no signer', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badClient.recoverNonWaterfallFunds({
            waterfallModuleId,
            token,
            recipient,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Recover non waterfall funds fails with waterfall token', async () => {
      await expect(
        async () =>
          await waterfallClient.recoverNonWaterfallFunds({
            waterfallModuleId,
            token: '0xwaterfalltoken',
            recipient,
          }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    test('Recover non waterfall funds fails with invalid recipient', async () => {
      await expect(
        async () =>
          await waterfallClient.recoverNonWaterfallFunds({
            waterfallModuleId,
            token,
            recipient: '0xbadrecipient',
          }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    test('Recover non waterfall funds fails with invalid recipient for non waterfall recipient', async () => {
      mockGetWaterfallData.mockImplementationOnce(async () => {
        return {
          token: {
            address: '0xwaterfalltoken',
          },
          tranches: [
            { recipientAddress: '0xrecipient1' },
            { recipientAddress: '0xrecipient2' },
          ],
          nonWaterfallRecipient,
        } as WaterfallModule
      })

      await expect(
        async () =>
          await waterfallClient.recoverNonWaterfallFunds({
            waterfallModuleId,
            token,
            recipient,
          }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    test('Recover non waterfall funds passes', async () => {
      const { event } = await waterfallClient.recoverNonWaterfallFunds({
        waterfallModuleId,
        token,
        recipient,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(recipient)
      expect(moduleWriteActions.recoverNonWaterfallFunds).toBeCalledWith(
        token,
        recipient,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(
        'recover_non_waterfall_funds_tx',
        [waterfallClient.eventTopics.recoverNonWaterfallFunds[0]],
      )
    })

    test('Recover non waterfall funds passes with non waterfall recipient', async () => {
      mockGetWaterfallData.mockImplementationOnce(async () => {
        return {
          token: {
            address: '0xwaterfalltoken',
          },
          tranches: [
            { recipientAddress: '0xrecipient1' },
            { recipientAddress: '0xrecipient2' },
          ],
          nonWaterfallRecipient,
        } as WaterfallModule
      })

      const { event } = await waterfallClient.recoverNonWaterfallFunds({
        waterfallModuleId,
        token,
        recipient: nonWaterfallRecipient,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(nonWaterfallRecipient)
      expect(moduleWriteActions.recoverNonWaterfallFunds).toBeCalledWith(
        token,
        nonWaterfallRecipient,
      )
      expect(getTransactionEventsSpy).toBeCalledWith(
        'recover_non_waterfall_funds_tx',
        [waterfallClient.eventTopics.recoverNonWaterfallFunds[0]],
      )
    })
  })

  describe('Withdraw pull funds tests', () => {
    const waterfallModuleId = '0xwaterfall'
    const address = '0xrecipient1'

    beforeEach(() => {
      moduleWriteActions.withdraw.mockClear()
    })

    test('Withdraw pull funds fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.withdrawPullFunds({
            waterfallModuleId,
            address,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Withdraw pull funds fails with no signer', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
        provider,
      })

      await expect(
        async () =>
          await badClient.withdrawPullFunds({
            waterfallModuleId,
            address,
          }),
      ).rejects.toThrow(MissingSignerError)
    })

    test('Withdraw pull funds passes', async () => {
      const { event } = await waterfallClient.withdrawPullFunds({
        waterfallModuleId,
        address,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(validateAddress).toBeCalledWith(address)
      expect(moduleWriteActions.withdraw).toBeCalledWith(address)
      expect(getTransactionEventsSpy).toBeCalledWith('withdraw_tx', [
        waterfallClient.eventTopics.withdrawPullFunds[0],
      ])
    })
  })
})

describe('Waterfall reads', () => {
  const provider = new mockProvider()
  const waterfallClient = new WaterfallClient({
    chainId: 1,
    provider,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
  })

  describe('Get distributed funds test', () => {
    const waterfallModuleId = '0xgetDistributedFunds'

    beforeEach(() => {
      readActions.distributedFunds.mockClear()
    })

    test('Get distributed funds fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getDistributedFunds({
            waterfallModuleId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns distributed funds', async () => {
      readActions.distributedFunds.mockReturnValueOnce(BigNumber.from(12))
      const { distributedFunds } = await waterfallClient.getDistributedFunds({
        waterfallModuleId,
      })

      expect(distributedFunds).toEqual(BigNumber.from(12))
      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(readActions.distributedFunds).toBeCalled()
    })
  })

  describe('Get funds pending withdrawal test', () => {
    const waterfallModuleId = '0xgetFundsPendingWithdrawal'

    beforeEach(() => {
      readActions.fundsPendingWithdrawal.mockClear()
    })

    test('Get funds pending withdrawal fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getFundsPendingWithdrawal({
            waterfallModuleId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns funds pending withdrawal', async () => {
      readActions.fundsPendingWithdrawal.mockReturnValueOnce(BigNumber.from(7))
      const { fundsPendingWithdrawal } =
        await waterfallClient.getFundsPendingWithdrawal({
          waterfallModuleId,
        })

      expect(fundsPendingWithdrawal).toEqual(BigNumber.from(7))
      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(readActions.fundsPendingWithdrawal).toBeCalled()
    })
  })

  describe('Get tranches test', () => {
    const waterfallModuleId = '0xgetTranches'

    beforeEach(() => {
      readActions.getTranches.mockClear()
    })

    test('Get tranches fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getTranches({
            waterfallModuleId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns tranches', async () => {
      const mockRecipients = ['0xrecipient1', '0xrecipient2']
      const mockThresholds = [BigNumber.from(5)]

      readActions.getTranches.mockReturnValueOnce([
        ['0xrecipient1', '0xrecipient2'],
        [BigNumber.from(5)],
      ])
      const { recipients, thresholds } = await waterfallClient.getTranches({
        waterfallModuleId,
      })

      expect(recipients).toEqual(mockRecipients)
      expect(thresholds).toEqual(mockThresholds)
      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(readActions.getTranches).toBeCalled()
    })
  })

  describe('Get non waterfall recipient test', () => {
    const waterfallModuleId = '0xgetNonWaterfallRecipient'

    beforeEach(() => {
      readActions.nonWaterfallRecipient.mockClear()
    })

    test('Get non waterfall recipient fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getNonWaterfallRecipient({
            waterfallModuleId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns non waterfall recipient', async () => {
      readActions.nonWaterfallRecipient.mockReturnValueOnce(
        '0xnonWaterfallRecipient',
      )
      const { nonWaterfallRecipient } =
        await waterfallClient.getNonWaterfallRecipient({
          waterfallModuleId,
        })

      expect(nonWaterfallRecipient).toEqual('0xnonWaterfallRecipient')
      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(readActions.nonWaterfallRecipient).toBeCalled()
    })
  })

  describe('Get token test', () => {
    const waterfallModuleId = '0xgetToken'

    beforeEach(() => {
      readActions.token.mockClear()
    })

    test('Get token with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getToken({
            waterfallModuleId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns token', async () => {
      readActions.token.mockReturnValueOnce('0xtoken')
      const { token } = await waterfallClient.getToken({
        waterfallModuleId,
      })

      expect(token).toEqual('0xtoken')
      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(readActions.token).toBeCalled()
    })
  })

  describe('Get pull balance test', () => {
    const waterfallModuleId = '0xgetPullBalance'
    const address = '0xpullAddress'

    beforeEach(() => {
      readActions.getPullBalance.mockClear()
    })

    test('Get pull balance fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getPullBalance({
            waterfallModuleId,
            address,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns pull balance', async () => {
      readActions.getPullBalance.mockReturnValueOnce(BigNumber.from(19))
      const { pullBalance } = await waterfallClient.getPullBalance({
        waterfallModuleId,
        address,
      })

      expect(pullBalance).toEqual(BigNumber.from(19))
      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(readActions.getPullBalance).toBeCalledWith(address)
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
  const mockFormatWaterfall = jest
    .spyOn(subgraph, 'protectedFormatWaterfallModule')
    .mockReturnValue('formatted_waterfall_module' as unknown as WaterfallModule)
  const mockAddEnsNames = jest
    .spyOn(utils, 'addWaterfallEnsNames')
    .mockImplementation()
  const mockGqlWaterfall = {
    token: {
      id: '0xwaterfallToken',
    },
  }

  const waterfallModuleId = '0xwaterfall'
  const provider = new mockProvider()
  const waterfallClient = new WaterfallClient({
    chainId: 1,
    provider,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
    mockGqlClient.request.mockClear()
    mockFormatWaterfall.mockClear()
    mockAddEnsNames.mockClear()
  })

  describe('Get waterfall metadata tests', () => {
    beforeEach(() => {
      mockGqlClient.request.mockReturnValue({
        waterfallModule: {
          token: {
            id: '0xwaterfallToken',
          },
        },
      })
    })

    test('Get waterfall metadata fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })
      await expect(
        async () =>
          await badClient.getWaterfallMetadata({
            waterfallModuleId,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Get waterfall metadata passes', async () => {
      const waterfallModule = await waterfallClient.getWaterfallMetadata({
        waterfallModuleId,
      })

      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.WATERFALL_MODULE_QUERY,
        {
          waterfallModuleId,
        },
      )
      expect(getTokenDataMock).toBeCalledWith(
        1,
        mockGqlWaterfall.token.id,
        provider,
      )
      expect(mockFormatWaterfall).toBeCalledWith(
        mockGqlWaterfall,
        GET_TOKEN_DATA.symbol,
        GET_TOKEN_DATA.decimals,
      )
      expect(waterfallModule).toEqual('formatted_waterfall_module')
      expect(mockAddEnsNames).not.toBeCalled()
    })

    test('Adds ens names', async () => {
      const provider = new mockProvider()
      const ensWaterfallClient = new WaterfallClient({
        chainId: 1,
        provider,
        includeEnsNames: true,
      })

      const waterfallModule = await ensWaterfallClient.getWaterfallMetadata({
        waterfallModuleId,
      })

      expect(validateAddress).toBeCalledWith(waterfallModuleId)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.WATERFALL_MODULE_QUERY,
        {
          waterfallModuleId,
        },
      )
      expect(getTokenDataMock).toBeCalledWith(
        1,
        mockGqlWaterfall.token.id,
        provider,
      )
      expect(mockFormatWaterfall).toBeCalledWith(
        mockGqlWaterfall,
        GET_TOKEN_DATA.symbol,
        GET_TOKEN_DATA.decimals,
      )
      expect(waterfallModule).toEqual('formatted_waterfall_module')
      expect(mockAddEnsNames).toBeCalled()
    })
  })
})
