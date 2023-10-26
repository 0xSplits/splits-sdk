import { CONTROLLER_ADDRESS } from '../constants'

export const writeActions = {
  distributeFunds: jest.fn(),
  transferOwnership: jest.fn(),
}

export const readActions = {
  distributorFee: jest.fn(),
  payoutSplit: jest.fn(),
  owner: jest.fn().mockReturnValue(CONTROLLER_ADDRESS),
  uri: jest.fn(),
  scaledPercentBalanceOf: jest.fn(),
}
