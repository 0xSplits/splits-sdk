export const readActions = {
  getQuoteAmounts: jest.fn(),
}

export class MockOracle {
  read: {
    [key: string]: jest.Mock
  }

  constructor() {
    this.read = readActions
  }
}
