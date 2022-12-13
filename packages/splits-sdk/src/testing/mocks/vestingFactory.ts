import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createVestingModule: jest.fn().mockReturnValue('create_vesting_module_tx'),
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

    this.predictVestingModuleAddress = readActions.predictVestingModuleAddress
  }

  connect() {
    return writeActions
  }
}
