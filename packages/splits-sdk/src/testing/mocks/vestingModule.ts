export const writeActions = {
  createVestingStreams: jest.fn(),
  releaseFromVesting: jest.fn(),
}

export const readActions = {
  beneficiary: jest.fn(),
  vestingPeriod: jest.fn(),
  vested: jest.fn(),
  vestedAndUnreleased: jest.fn(),
}
