import { Provider } from '@ethersproject/abstract-provider'

export const writeActions = {
  createVestingStreams: jest.fn().mockReturnValue('create_vesting_streams_tx'),
  releaseFromVesting: jest.fn().mockReturnValue('release_from_vesting_tx'),
}

export const readActions = {
  beneficiary: jest.fn(),
  vestingPeriod: jest.fn(),
  vested: jest.fn(),
  vestedAndUnreleased: jest.fn(),
}

export class MockVestingModule {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }
  createVestingStreams: jest.Mock
  releaseFromVesting: jest.Mock
  beneficiary: jest.Mock
  vestingPeriod: jest.Mock
  vested: jest.Mock
  vestedAndUnreleased: jest.Mock

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

    this.createVestingStreams = writeActions.createVestingStreams
    this.releaseFromVesting = writeActions.releaseFromVesting

    this.beneficiary = readActions.beneficiary
    this.vestingPeriod = readActions.vestingPeriod
    this.vested = readActions.vested
    this.vestedAndUnreleased = readActions.vestedAndUnreleased
  }

  connect() {
    return writeActions
  }
}
