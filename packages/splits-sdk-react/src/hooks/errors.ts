export class V1MainnetNotSupportedError extends Error {
  name = 'V1MainnetNotSupportedError'

  constructor() {
    const message =
      'This is a v1 split which is not supported in the provider lookup. Please use the api lookup instead.'
    super(message)
    Object.setPrototypeOf(this, V1MainnetNotSupportedError.prototype)
  }
}
