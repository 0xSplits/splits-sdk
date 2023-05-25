import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createSwapper: jest.fn(),
}

export class MockSwapperFactory {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }

  createSwapper: jest.Mock

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

    this.createSwapper = writeActions.createSwapper
  }
}
