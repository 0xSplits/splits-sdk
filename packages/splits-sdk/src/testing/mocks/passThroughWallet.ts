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
