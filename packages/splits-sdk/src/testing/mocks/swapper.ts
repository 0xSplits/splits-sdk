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
