export const writeActions = {
  waterfallFunds: jest.fn(),
  waterfallFundsPull: jest.fn(),
  recoverNonWaterfallFunds: jest.fn(),
  withdraw: jest.fn(),
}

export const readActions = {
  distributedFunds: jest.fn(),
  fundsPendingWithdrawal: jest.fn(),
  getTranches: jest.fn(),
  nonWaterfallRecipient: jest.fn(),
  token: jest.fn(),
  getPullBalance: jest.fn(),
}
