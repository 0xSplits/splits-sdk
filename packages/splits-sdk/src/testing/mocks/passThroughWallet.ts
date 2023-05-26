import { Provider } from '@ethersproject/abstract-provider'
import { OWNER_ADDRESS } from '../constants'

export const writeActions = {
  passThroughTokens: jest.fn(),
  setPassThrough: jest.fn(),
  setPaused: jest.fn(),
  execCalls: jest.fn(),
}

export const readActions = {
  passThrough: jest.fn(),
  owner: jest.fn().mockReturnValue(OWNER_ADDRESS),
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
  owner: jest.Mock

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
    this.owner = readActions.owner
  }

  connect() {
    return writeActions
  }
}
