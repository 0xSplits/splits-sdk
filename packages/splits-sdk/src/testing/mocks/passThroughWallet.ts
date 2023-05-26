import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  passThroughTokens: jest.fn(),
  setPassThrough: jest.fn(),
  setPaused: jest.fn(),
  execCalls: jest.fn(),
}

export const readActions = {
  passThrough: jest.fn(),
}

export class MockPassThroughWallet {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }
  passThroughTokens: jest.Mock
  setPassThrough: jest.Mock
  setPaused: jest.Mock
  execCalls: jest.Mock
  passThrough: jest.Mock

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

    this.passThroughTokens = writeActions.passThroughTokens
    this.setPassThrough = writeActions.setPassThrough
    this.setPaused = writeActions.setPaused
    this.execCalls = writeActions.execCalls
    this.passThrough = readActions.passThrough
  }

  connect() {
    return writeActions
  }
}
