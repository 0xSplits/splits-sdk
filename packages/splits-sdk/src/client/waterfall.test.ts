import {
  Account,
  Address,
  Chain,
  Log,
  PublicClient,
  Transport,
  WalletClient,
} from 'viem'

import { WaterfallClient } from './waterfall'
import { ADDRESS_ZERO, getWaterfallFactoryAddress } from '../constants'
import {
  InvalidArgumentError,
  InvalidConfigError,
  MissingPublicClientError,
  MissingWalletClientError,
  UnsupportedChainIdError,
} from '../errors'
import * as subgraph from '../subgraph'
import * as utils from '../utils'
import * as tokenUtils from '../utils/tokens'
import * as ensUtils from '../utils/ens'
import { validateAddress, validateWaterfallTranches } from '../utils/validation'
import {
  TRANCHE_RECIPIENTS,
  TRANCHE_SIZES,
  GET_TOKEN_DATA,
} from '../testing/constants'
import { MockGraphqlClient } from '../testing/mocks/graphql'
import { writeActions as factoryWriteActions } from '../testing/mocks/waterfallFactory'
import {
  writeActions as moduleWriteActions,
  readActions,
} from '../testing/mocks/waterfallModule'
import type { WaterfallModule } from '../types'
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
          waterfallModule: '0xwaterfall',
        },
      }
    }),
  }
})

const getTrancheRecipientsAndSizesMock = jest
  .spyOn(utils, 'getTrancheRecipientsAndSizes')
  .mockImplementation(async () => {
    return [TRANCHE_RECIPIENTS, TRANCHE_SIZES]
  })

const getTokenDataMock = jest
  .spyOn(tokenUtils, 'getTokenData')
  .mockImplementation(async () => {
    return GET_TOKEN_DATA
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
        if (address === getWaterfallFactoryAddress(1)) {
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

  test('Zora chain ids pass', () => {
    expect(() => new WaterfallClient({ chainId: 7777777 })).not.toThrow()
    expect(() => new WaterfallClient({ chainId: 999 })).not.toThrow()
  })

  test('Base chain ids pass', () => {
    expect(() => new WaterfallClient({ chainId: 8453 })).not.toThrow()
  })

  test('Other chain ids pass', () => {
    expect(() => new WaterfallClient({ chainId: 100 })).not.toThrow()
    expect(() => new WaterfallClient({ chainId: 250 })).not.toThrow()
    expect(() => new WaterfallClient({ chainId: 43114 })).not.toThrow()
    expect(() => new WaterfallClient({ chainId: 56 })).not.toThrow()
    expect(() => new WaterfallClient({ chainId: 1313161554 })).not.toThrow()
  })
})

describe('Waterfall writes', () => {
  const publicClient = new mockPublicClient()
  const walletClient = new mockWalletClient()
  const waterfallClient = new WaterfallClient({
    chainId: 1,
    publicClient,
    walletClient,
  })
  const getTransactionEventsSpy = jest
    .spyOn(waterfallClient, 'getTransactionEvents')
    .mockImplementation(async () => {
      const event = {
        blockNumber: 12345,
        args: {
          waterfallModule: '0xwaterfall',
        },
      } as unknown as Log
      return [event]
    })

  beforeEach(() => {
    ;(validateWaterfallTranches as jest.Mock).mockClear()
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
    const createWaterfallResult = {
      value: 'create_waterfall_module_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      factoryWriteActions.createWaterfallModule.mockClear()
      factoryWriteActions.createWaterfallModule.mockReturnValueOnce(
        createWaterfallResult,
      )
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
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Create waterfall fails with no signer', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.createWaterfallModule({
            token,
            tranches,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Create waterfall passes', async () => {
      const { event, waterfallModuleAddress } =
        await waterfallClient.createWaterfallModule({
          token,
          tranches,
        })

      expect(event.blockNumber).toEqual(12345)
      expect(waterfallModuleAddress).toEqual('0xwaterfall')
      expect(validateAddress).toBeCalledWith(token)
      expect(validateWaterfallTranches).toBeCalledWith(tranches)
      expect(getTrancheRecipientsAndSizesMock).toBeCalledWith(
        1,
        token,
        tranches,
        publicClient,
      )
      expect(factoryWriteActions.createWaterfallModule).toBeCalledWith(
        token,
        ADDRESS_ZERO,
        TRANCHE_RECIPIENTS,
        TRANCHE_SIZES,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [waterfallClient.eventTopics.createWaterfallModule[0]],
      })
    })

    test('Create waterfall passes with non waterfall recipient', async () => {
      const { event, waterfallModuleAddress } =
        await waterfallClient.createWaterfallModule({
          token,
          tranches,
          nonWaterfallRecipient: '0xnonWaterfallRecipient',
        })

      expect(event.blockNumber).toEqual(12345)
      expect(waterfallModuleAddress).toEqual('0xwaterfall')
      expect(validateAddress).toBeCalledWith(token)
      expect(validateWaterfallTranches).toBeCalledWith(tranches)
      expect(getTrancheRecipientsAndSizesMock).toBeCalledWith(
        1,
        token,
        tranches,
        publicClient,
      )
      expect(factoryWriteActions.createWaterfallModule).toBeCalledWith(
        token,
        '0xnonWaterfallRecipient',
        TRANCHE_RECIPIENTS,
        TRANCHE_SIZES,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [waterfallClient.eventTopics.createWaterfallModule[0]],
      })
    })
  })

  describe('Waterfall funds tests', () => {
    const waterfallModuleAddress = '0xwaterfall'
    const waterfallFundsResult = {
      value: 'waterfall_funds_tx',
      wait: 'wait',
    }
    const waterfallFundsPullResult = {
      value: 'waterfall_funds_pull_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.waterfallFunds.mockClear()
      moduleWriteActions.waterfallFundsPull.mockClear()
      moduleWriteActions.waterfallFunds.mockReturnValueOnce(
        waterfallFundsResult,
      )
      moduleWriteActions.waterfallFundsPull.mockReturnValueOnce(
        waterfallFundsPullResult,
      )
    })

    test('Waterfall funds fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.waterfallFunds({
            waterfallModuleAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Waterfall funds fails with no signer', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.waterfallFunds({
            waterfallModuleAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Waterfall funds passes', async () => {
      const { event } = await waterfallClient.waterfallFunds({
        waterfallModuleAddress,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(moduleWriteActions.waterfallFunds).toBeCalledWith()
      expect(moduleWriteActions.waterfallFundsPull).not.toBeCalled()
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [waterfallClient.eventTopics.waterfallFunds[0]],
      })
    })

    test('Waterfall funds pull passes', async () => {
      const { event } = await waterfallClient.waterfallFunds({
        waterfallModuleAddress,
        usePull: true,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(moduleWriteActions.waterfallFunds).not.toBeCalled()
      expect(moduleWriteActions.waterfallFundsPull).toBeCalledWith()
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [waterfallClient.eventTopics.waterfallFunds[0]],
      })
    })
  })

  describe('Recover non waterfall funds tests', () => {
    const waterfallModuleAddress = '0xwaterfall'
    const token = '0xtoken'
    const recipient = '0xrecipient1'
    const nonWaterfallRecipient = '0xnonWaterfallRecipient'
    const recoverNonWaterfallFundsResult = {
      value: 'recover_non_waterfall_funds_tx',
      wait: 'wait',
    }

    const mockGetWaterfallData = jest
      .spyOn(waterfallClient, 'getWaterfallMetadata')
      .mockImplementation(async () => {
        return {
          token: {
            address: '0xwaterfalltoken',
          },
          tranches: [
            { recipient: { address: '0xrecipient1' } },
            { recipient: { address: '0xrecipient2' } },
          ],
        } as unknown as WaterfallModule
      })

    beforeEach(() => {
      mockGetWaterfallData.mockClear()
      moduleWriteActions.recoverNonWaterfallFunds.mockClear()
      moduleWriteActions.recoverNonWaterfallFunds.mockReturnValueOnce(
        recoverNonWaterfallFundsResult,
      )
    })

    test('Recover non waterfall funds fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.recoverNonWaterfallFunds({
            waterfallModuleAddress,
            token,
            recipient,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Recover non waterfall funds fails with no signer', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.recoverNonWaterfallFunds({
            waterfallModuleAddress,
            token,
            recipient,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Recover non waterfall funds fails with waterfall token', async () => {
      await expect(
        async () =>
          await waterfallClient.recoverNonWaterfallFunds({
            waterfallModuleAddress,
            token: '0xwaterfalltoken',
            recipient,
          }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    test('Recover non waterfall funds fails with invalid recipient', async () => {
      await expect(
        async () =>
          await waterfallClient.recoverNonWaterfallFunds({
            waterfallModuleAddress,
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
            { recipient: { address: '0xrecipient1' } },
            { recipient: { address: '0xrecipient2' } },
          ],
          nonWaterfallRecipient: {
            address: nonWaterfallRecipient,
          },
        } as unknown as WaterfallModule
      })

      await expect(
        async () =>
          await waterfallClient.recoverNonWaterfallFunds({
            waterfallModuleAddress,
            token,
            recipient,
          }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    test('Recover non waterfall funds passes', async () => {
      const { event } = await waterfallClient.recoverNonWaterfallFunds({
        waterfallModuleAddress,
        token,
        recipient,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(recipient)
      expect(moduleWriteActions.recoverNonWaterfallFunds).toBeCalledWith(
        token,
        recipient,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [waterfallClient.eventTopics.recoverNonWaterfallFunds[0]],
      })
    })

    test('Recover non waterfall funds passes with non waterfall recipient', async () => {
      mockGetWaterfallData.mockImplementationOnce(async () => {
        return {
          token: {
            address: '0xwaterfalltoken',
          },
          tranches: [
            { recipient: { address: '0xrecipient1' } },
            { recipient: { address: '0xrecipient2' } },
          ],
          nonWaterfallRecipient: {
            address: nonWaterfallRecipient,
          },
        } as unknown as WaterfallModule
      })

      const { event } = await waterfallClient.recoverNonWaterfallFunds({
        waterfallModuleAddress,
        token,
        recipient: nonWaterfallRecipient,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(validateAddress).toBeCalledWith(token)
      expect(validateAddress).toBeCalledWith(nonWaterfallRecipient)
      expect(moduleWriteActions.recoverNonWaterfallFunds).toBeCalledWith(
        token,
        nonWaterfallRecipient,
      )
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [waterfallClient.eventTopics.recoverNonWaterfallFunds[0]],
      })
    })
  })

  describe('Withdraw pull funds tests', () => {
    const waterfallModuleAddress = '0xwaterfall'
    const address = '0xrecipient1'
    const withdrawResult = {
      value: 'withdraw_tx',
      wait: 'wait',
    }

    beforeEach(() => {
      moduleWriteActions.withdraw.mockClear()
      moduleWriteActions.withdraw.mockReturnValueOnce(withdrawResult)
    })

    test('Withdraw pull funds fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.withdrawPullFunds({
            waterfallModuleAddress,
            address,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Withdraw pull funds fails with no signer', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
        publicClient,
      })

      await expect(
        async () =>
          await badClient.withdrawPullFunds({
            waterfallModuleAddress,
            address,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('Withdraw pull funds passes', async () => {
      const { event } = await waterfallClient.withdrawPullFunds({
        waterfallModuleAddress,
        address,
      })

      expect(event.blockNumber).toEqual(12345)
      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(validateAddress).toBeCalledWith(address)
      expect(moduleWriteActions.withdraw).toBeCalledWith(address)
      expect(getTransactionEventsSpy).toBeCalledWith({
        txHash: '0xhash',
        eventTopics: [waterfallClient.eventTopics.withdrawPullFunds[0]],
      })
    })
  })
})

describe('Waterfall reads', () => {
  const publicClient = new mockPublicClient()
  const waterfallClient = new WaterfallClient({
    chainId: 1,
    publicClient,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
  })

  describe('Get distributed funds test', () => {
    const waterfallModuleAddress = '0xgetDistributedFunds'

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
            waterfallModuleAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns distributed funds', async () => {
      readActions.distributedFunds.mockReturnValueOnce(BigInt(12))
      const { distributedFunds } = await waterfallClient.getDistributedFunds({
        waterfallModuleAddress,
      })

      expect(distributedFunds).toEqual(BigInt(12))
      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(readActions.distributedFunds).toBeCalled()
    })
  })

  describe('Get funds pending withdrawal test', () => {
    const waterfallModuleAddress = '0xgetFundsPendingWithdrawal'

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
            waterfallModuleAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns funds pending withdrawal', async () => {
      readActions.fundsPendingWithdrawal.mockReturnValueOnce(BigInt(7))
      const { fundsPendingWithdrawal } =
        await waterfallClient.getFundsPendingWithdrawal({
          waterfallModuleAddress,
        })

      expect(fundsPendingWithdrawal).toEqual(BigInt(7))
      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(readActions.fundsPendingWithdrawal).toBeCalled()
    })
  })

  describe('Get tranches test', () => {
    const waterfallModuleAddress = '0xgetTranches'

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
            waterfallModuleAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns tranches', async () => {
      const mockRecipients = ['0xrecipient1', '0xrecipient2']
      const mockThresholds = [BigInt(5)]

      readActions.getTranches.mockReturnValueOnce([
        ['0xrecipient1', '0xrecipient2'],
        [BigInt(5)],
      ])
      const { recipients, thresholds } = await waterfallClient.getTranches({
        waterfallModuleAddress,
      })

      expect(recipients).toEqual(mockRecipients)
      expect(thresholds).toEqual(mockThresholds)
      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(readActions.getTranches).toBeCalled()
    })
  })

  describe('Get non waterfall recipient test', () => {
    const waterfallModuleAddress = '0xgetNonWaterfallRecipient'

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
            waterfallModuleAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns non waterfall recipient', async () => {
      readActions.nonWaterfallRecipient.mockReturnValueOnce(
        '0xnonWaterfallRecipient',
      )
      const { nonWaterfallRecipient } =
        await waterfallClient.getNonWaterfallRecipient({
          waterfallModuleAddress,
        })

      expect(nonWaterfallRecipient).toEqual('0xnonWaterfallRecipient')
      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(readActions.nonWaterfallRecipient).toBeCalled()
    })
  })

  describe('Get token test', () => {
    const waterfallModuleAddress = '0xgetToken'

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
            waterfallModuleAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns token', async () => {
      readActions.token.mockReturnValueOnce('0xtoken')
      const { token } = await waterfallClient.getToken({
        waterfallModuleAddress,
      })

      expect(token).toEqual('0xtoken')
      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(readActions.token).toBeCalled()
    })
  })

  describe('Get pull balance test', () => {
    const waterfallModuleAddress = '0xgetPullBalance'
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
            waterfallModuleAddress,
            address,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns pull balance', async () => {
      readActions.getPullBalance.mockReturnValueOnce(BigInt(19))
      const { pullBalance } = await waterfallClient.getPullBalance({
        waterfallModuleAddress,
        address,
      })

      expect(pullBalance).toEqual(BigInt(19))
      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(readActions.getPullBalance).toBeCalledWith([address])
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
  const mockGqlWaterfall = {
    token: {
      id: '0xwaterfallToken',
    },
    tranches: [],
  }
  const mockFormatWaterfall = jest
    .spyOn(subgraph, 'protectedFormatWaterfallModule')
    .mockReturnValue(mockGqlWaterfall as unknown as WaterfallModule)
  const mockAddEnsNames = jest
    .spyOn(ensUtils, 'addEnsNames')
    .mockImplementation()

  const waterfallModuleAddress = '0xwaterfall'
  const publicClient = new mockPublicClient()
  const waterfallClient = new WaterfallClient({
    chainId: 1,
    publicClient,
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
        waterfallModule: mockGqlWaterfall,
      })
    })

    test('Get waterfall metadata fails with no provider', async () => {
      const badClient = new WaterfallClient({
        chainId: 1,
      })
      await expect(
        async () =>
          await badClient.getWaterfallMetadata({
            waterfallModuleAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Get waterfall metadata passes', async () => {
      const waterfallModule = await waterfallClient.getWaterfallMetadata({
        waterfallModuleAddress,
      })

      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.WATERFALL_MODULE_QUERY,
        {
          waterfallModuleAddress: waterfallModuleAddress.toLowerCase(),
        },
      )
      expect(getTokenDataMock).toBeCalledWith(
        1,
        mockGqlWaterfall.token.id,
        publicClient,
      )
      expect(mockFormatWaterfall).toBeCalledWith(
        mockGqlWaterfall,
        GET_TOKEN_DATA.symbol,
        GET_TOKEN_DATA.decimals,
      )
      expect(waterfallModule).toEqual(mockGqlWaterfall)
      expect(mockAddEnsNames).not.toBeCalled()
    })

    test('Adds ens names', async () => {
      const publicClient = new mockPublicClient()
      const ensWaterfallClient = new WaterfallClient({
        chainId: 1,
        publicClient,
        includeEnsNames: true,
      })

      const waterfallModule = await ensWaterfallClient.getWaterfallMetadata({
        waterfallModuleAddress,
      })

      expect(validateAddress).toBeCalledWith(waterfallModuleAddress)
      expect(mockGqlClient.request).toBeCalledWith(
        subgraph.WATERFALL_MODULE_QUERY,
        {
          waterfallModuleAddress: waterfallModuleAddress.toLowerCase(),
        },
      )
      expect(getTokenDataMock).toBeCalledWith(
        1,
        mockGqlWaterfall.token.id,
        publicClient,
      )
      expect(mockFormatWaterfall).toBeCalledWith(
        mockGqlWaterfall,
        GET_TOKEN_DATA.symbol,
        GET_TOKEN_DATA.decimals,
      )
      expect(waterfallModule).toEqual(mockGqlWaterfall)
      expect(mockAddEnsNames).toBeCalled()
    })
  })
})
