import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createLiquidSplit: jest.fn(),
  createLiquidSplitClone: jest.fn(),
}

export class MockLiquidSplitFactory {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }

  createLiquidSplit: jest.Mock
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

    this.createLiquidSplit = writeActions.createLiquidSplit
    this.createLiquidSplitClone = writeActions.createLiquidSplitClone
  }
}
