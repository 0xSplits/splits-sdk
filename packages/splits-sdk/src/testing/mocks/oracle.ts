import { Provider } from '@ethersproject/abstract-provider'

export const readActions = {
  getQuoteAmounts: jest.fn(),
}

export class MockOracle {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }
  getQuoteAmounts: jest.Mock

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

    this.getQuoteAmounts = readActions.getQuoteAmounts
  }
}
