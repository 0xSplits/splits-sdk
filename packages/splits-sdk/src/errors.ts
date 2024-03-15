import { SPLITS_SUBGRAPH_CHAIN_IDS } from './constants'
import { MAX_DISTRIBUTION_INCENTIVE } from './utils'

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

  constructor(moduleType: string, address: string, chainId: number) {
    const message = `No ${moduleType} found at address ${address} on chain ${chainId}, please confirm you have entered the correct address. There may just be a delay in subgraph indexing.`
    super(message)
    Object.setPrototypeOf(this, AccountNotFoundError.prototype)
  }
}

export class InvalidDistributorFeePercentErrorV2 extends Error {
  name = 'InvalidDistributorFeePercentErrorV2'

  constructor(distributorFeePercent: number) {
    const message = `Distributor Fee ${distributorFeePercent} should be less than ${MAX_DISTRIBUTION_INCENTIVE}`
    super(message)
    Object.setPrototypeOf(this, InvalidDistributorFeePercentErrorV2.prototype)
  }
}

export class InvalidTotalAllocation extends Error {
  name = 'InvalidTotalAllocation'

  constructor(totalAllocationPercent?: number) {
    const message = totalAllocationPercent
      ? `Specified total allocation ${totalAllocationPercent} should be the sum of all of recipient allocations`
      : `Total allocation of all the recipients should be equal to 100`
    super(message)
    Object.setPrototypeOf(this, InvalidTotalAllocation.prototype)
  }
}

export class SaltRequired extends Error {
  name = 'SaltRequired'

  constructor() {
    const message = `Salt required`
    super(message)
    Object.setPrototypeOf(this, SaltRequired.prototype)
  }
}
