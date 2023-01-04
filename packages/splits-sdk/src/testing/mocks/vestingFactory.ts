import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createVestingModule: jest.fn(),
}

export const readActions = {
  predictVestingModuleAddress: jest.fn(),
}

export class MockVestingFactory {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }

  createVestingModule: jest.Mock
  predictVestingModuleAddress: jest.Mock

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

    this.createVestingModule = writeActions.createVestingModule
    this.predictVestingModuleAddress = readActions.predictVestingModuleAddress
  }
}
