import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createWaterfallModule: jest.fn(),
}

export class MockWaterfallFactory {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }

  createWaterfallModule: jest.Mock

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

    this.createWaterfallModule = writeActions.createWaterfallModule
  }
}
