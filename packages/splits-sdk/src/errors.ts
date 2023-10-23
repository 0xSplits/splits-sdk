import { SPLITS_SUBGRAPH_CHAIN_IDS } from './constants'

// Manually setting the prototype in the constructor with setPrototypeOf fixes a typescript issue so that the
// unit tests can detect the error class

export class UnsupportedChainIdError extends Error {
  name = 'UnsupportedChainIdError'

  constructor(invalidChainId: number, supportedChains: number[]) {
    super(
      `Unsupported chain: ${invalidChainId}. Supported chains are: ${supportedChains}`,
    )
    Object.setPrototypeOf(this, UnsupportedChainIdError.prototype)
  }
}

export class UnsupportedSubgraphChainIdError extends Error {
  name = 'UnsupportedSubgraphChainIdError'

  constructor() {
    super(
      `Unsupported subgraph chain. Supported subgraph chains are: ${SPLITS_SUBGRAPH_CHAIN_IDS}`,
    )
    Object.setPrototypeOf(this, UnsupportedSubgraphChainIdError.prototype)
  }
}

export class InvalidRecipientsError extends Error {
  name = 'InvalidRecipientsError'

  constructor(m?: string) {
    super(m)
    Object.setPrototypeOf(this, InvalidRecipientsError.prototype)
  }
}

export class InvalidDistributorFeePercentError extends Error {
  name = 'InvalidDistributorFeePercent'

  constructor(m?: string) {
    super(m)
    Object.setPrototypeOf(this, InvalidDistributorFeePercentError.prototype)
  }
}

export class InvalidArgumentError extends Error {
  name = 'InvalidArgumentError'

  constructor(m?: string) {
    super(m)
    Object.setPrototypeOf(this, InvalidArgumentError.prototype)
  }
}

export class InvalidAuthError extends Error {
  name = 'InvalidAuthError'

  constructor(m?: string) {
    super(m)
    Object.setPrototypeOf(this, InvalidAuthError.prototype)
  }
}

export class TransactionFailedError extends Error {
  name = 'TransactionFailedError'

  constructor(m?: string) {
    super(m)
    Object.setPrototypeOf(this, TransactionFailedError.prototype)
  }
}

export class MissingPublicClientError extends Error {
  name = 'MissingPublicClientError'

  constructor(m?: string) {
    super(m)
    Object.setPrototypeOf(this, MissingPublicClientError.prototype)
  }
}

export class MissingWalletClientError extends Error {
  name = 'MissingWalletClientError'

  constructor(m?: string) {
    super(m)
    Object.setPrototypeOf(this, MissingWalletClientError.prototype)
  }
}

export class InvalidConfigError extends Error {
  name = 'InvalidConfigError'

  constructor(m?: string) {
    super(m)
    Object.setPrototypeOf(this, InvalidConfigError.prototype)
  }
}

export class AccountNotFoundError extends Error {
  name = 'AccountNotFoundError'

  constructor(m?: string) {
    super(m)
    Object.setPrototypeOf(this, AccountNotFoundError.prototype)
  }
}
