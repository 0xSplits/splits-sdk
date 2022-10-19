import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createLiquidSplit: jest.fn().mockReturnValue('create_liquid_split_tx'),
  createLiquidSplitClone: jest
    .fn()
    .mockReturnValue('create_liquid_split_clone_tx'),
}

export class MockLiquidSplitFactory {
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
