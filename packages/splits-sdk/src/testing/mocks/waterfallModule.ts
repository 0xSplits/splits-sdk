import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  waterfallFunds: jest.fn(),
  waterfallFundsPull: jest.fn(),
  recoverNonWaterfallFunds: jest.fn(),
  withdraw: jest.fn(),
}

export const readActions = {
  distributedFunds: jest.fn(),
  fundsPendingWithdrawal: jest.fn(),
  getTranches: jest.fn(),
  nonWaterfallRecipient: jest.fn(),
  token: jest.fn(),
  getPullBalance: jest.fn(),
}

export class MockWaterfallModule {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }
  waterfallFunds: jest.Mock
  waterfallFundsPull: jest.Mock
  recoverNonWaterfallFunds: jest.Mock
  withdraw: jest.Mock
  distributedFunds: jest.Mock
  fundsPendingWithdrawal: jest.Mock
  getTranches: jest.Mock
  nonWaterfallRecipient: jest.Mock
  token: jest.Mock
  getPullBalance: jest.Mock

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

    this.waterfallFunds = writeActions.waterfallFunds
    this.waterfallFundsPull = writeActions.waterfallFundsPull
    this.recoverNonWaterfallFunds = writeActions.recoverNonWaterfallFunds
    this.withdraw = writeActions.withdraw
    this.distributedFunds = readActions.distributedFunds
    this.fundsPendingWithdrawal = readActions.fundsPendingWithdrawal
    this.getTranches = readActions.getTranches
    this.nonWaterfallRecipient = readActions.nonWaterfallRecipient
    this.token = readActions.token
    this.getPullBalance = readActions.getPullBalance
  }

  connect() {
    return writeActions
  }
}
