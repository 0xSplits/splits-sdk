import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createWaterfallModule: jest
    .fn()
    .mockReturnValue('create_waterfall_module_tx'),
}

export class MockWaterfallFactory {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }

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
  }

  connect() {
    return writeActions
  }
}
