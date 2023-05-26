import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createPassThroughWallet: jest.fn(),
}

export class MockPassThroughWalletFactory {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }

  createPassThroughWallet: jest.Mock

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

    this.createPassThroughWallet = writeActions.createPassThroughWallet
  }
}
