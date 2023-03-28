import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createRecoup: jest.fn(),
}

export class MockRecoup {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }

  createRecoup: jest.Mock

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

    this.createRecoup = writeActions.createRecoup
  }
}
