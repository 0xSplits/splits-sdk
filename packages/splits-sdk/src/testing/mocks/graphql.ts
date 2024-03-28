export class MockGraphqlClient {
  query: jest.Mock

  constructor() {
    this.query = jest.fn()
  }
}
