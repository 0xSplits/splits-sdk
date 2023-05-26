import { Provider } from '@ethersproject/abstract-provider'
import { OWNER_ADDRESS } from '../constants'

export const writeActions = {
  setBeneficiary: jest.fn(),
  setTokenToBeneficiary: jest.fn(),
  setOracle: jest.fn(),
  setDefaultScaledOfferFactor: jest.fn(),
  setPairScaledOfferFactors: jest.fn(),
  setPaused: jest.fn(),
  execCalls: jest.fn(),
}

export const readActions = {
  beneficiary: jest.fn(),
  tokenToBeneficiary: jest.fn(),
  oracle: jest.fn(),
  defaultScaledOfferFactor: jest.fn(),
  getPairScaledOfferFactors: jest.fn(),
  owner: jest.fn().mockReturnValue(OWNER_ADDRESS),
}

export class MockSwapper {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }
  setBeneficiary: jest.Mock
  setTokenToBeneficiary: jest.Mock
  setOracle: jest.Mock
  setDefaultScaledOfferFactor: jest.Mock
  setPairScaledOfferFactors: jest.Mock
  setPaused: jest.Mock
  execCalls: jest.Mock
  beneficiary: jest.Mock
  tokenToBeneficiary: jest.Mock
  oracle: jest.Mock
  defaultScaledOfferFactor: jest.Mock
  getPairScaledOfferFactors: jest.Mock
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

    this.setBeneficiary = writeActions.setBeneficiary
    this.setTokenToBeneficiary = writeActions.setTokenToBeneficiary
    this.setOracle = writeActions.setOracle
    this.setDefaultScaledOfferFactor = writeActions.setDefaultScaledOfferFactor
    this.setPairScaledOfferFactors = writeActions.setPairScaledOfferFactors
    this.setPaused = writeActions.setPaused
    this.execCalls = writeActions.execCalls
    this.beneficiary = readActions.beneficiary
    this.tokenToBeneficiary = readActions.tokenToBeneficiary
    this.oracle = readActions.oracle
    this.defaultScaledOfferFactor = readActions.defaultScaledOfferFactor
    this.getPairScaledOfferFactors = readActions.getPairScaledOfferFactors
    this.owner = readActions.owner
  }

  connect() {
    return writeActions
  }
}
