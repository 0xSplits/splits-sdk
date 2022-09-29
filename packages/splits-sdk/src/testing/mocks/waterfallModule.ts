import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  waterfallFunds: jest.fn().mockReturnValue('waterfall_funds_tx'),
  recoverNonWaterfallFunds: jest
    .fn()
    .mockReturnValue('recover_non_waterfall_funds_tx'),
}

// TODO
export const readActions = {}

export class MockWaterfallModule {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }
  waterfallFunds: jest.Mock
  recoverNonWaterfallFunds: jest.Mock

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
    this.recoverNonWaterfallFunds = writeActions.recoverNonWaterfallFunds
  }

  connect() {
    return writeActions
  }
}
