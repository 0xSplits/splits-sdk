import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createLiquidSplitClone: jest.fn(),
}

export class MockLiquidSplitFactory {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }

  createLiquidSplitClone: jest.Mock

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

    this.createLiquidSplitClone = writeActions.createLiquidSplitClone
  }
}
