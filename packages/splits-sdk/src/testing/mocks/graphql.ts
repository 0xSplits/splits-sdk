export class MockGraphqlClient {
  request: jest.Mock

  constructor() {
    this.request = jest.fn()
  }
}
