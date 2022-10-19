import { Provider } from '@ethersproject/abstract-provider'
import { CONTROLLER_ADDRESS } from '../constants'

export const writeActions = {
  distributeFunds: jest.fn().mockReturnValue('distribute_funds_tx'),
  transferOwnership: jest.fn().mockReturnValue('transfer_ownership_tx'),
}

export const readActions = {
  distributorFee: jest.fn(),
  payoutSplit: jest.fn(),
  owner: jest.fn().mockReturnValue(CONTROLLER_ADDRESS),
  uri: jest.fn(),
  scaledPercentBalanceOf: jest.fn(),
}

export class MockLiquidSplit {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }
  distributeFunds: jest.Mock
  transferOwnership: jest.Mock

  distributorFee: jest.Mock
  payoutSplit: jest.Mock
  owner: jest.Mock
  uri: jest.Mock
  scaledPercentBalanceOf: jest.Mock

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

    this.distributeFunds = writeActions.distributeFunds
    this.transferOwnership = writeActions.transferOwnership

    this.distributorFee = readActions.distributorFee
    this.payoutSplit = readActions.payoutSplit
    this.owner = readActions.owner
    this.uri = readActions.uri
    this.scaledPercentBalanceOf = readActions.scaledPercentBalanceOf
  }

  connect() {
    return writeActions
  }
}
