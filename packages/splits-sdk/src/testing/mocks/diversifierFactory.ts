import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createDiversifier: jest.fn(),
}

export class MockDiversifierFactory {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }

  createDiversifier: jest.Mock

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

    this.createDiversifier = writeActions.createDiversifier
  }
}
