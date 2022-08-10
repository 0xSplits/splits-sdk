import {
  SPLITS_SUBGRAPH_CHAIN_IDS,
  SPLITS_SUPPORTED_CHAIN_IDS,
} from './constants'

export class UnsupportedChainIdError extends Error {
  name = 'UnsupportedChainIdError'

  constructor(invalidChainId: number) {
    super(
      `Unsupported chain: ${invalidChainId}. Supported chains are: ${SPLITS_SUPPORTED_CHAIN_IDS}`,
    )
  }
}

export class UnsupportedSubgraphChainIdError extends Error {
  name = 'UnsupportedSubgraphChainIdError'

  constructor() {
    super(
      `Unsupported subgraph chain. Supported subgraph chains are: ${SPLITS_SUBGRAPH_CHAIN_IDS}`,
    )
  }
}

export class InvalidRecipientsError extends Error {
  name = 'InvalidRecipientsError'
}

export class InvalidDistributorFeePercentError extends Error {
  name = 'InvalidDistributorFeePercent'
}

export class InvalidArgumentError extends Error {
  name = 'InvalidArgumentError'
}

export class InvalidAuthError extends Error {
  name = 'InvalidAuthError'
}

export class TransactionFailedError extends Error {
  name = 'TransactionFailedError'
}

export class MissingProviderError extends Error {
  name = 'MissingProviderError'
}

export class MissingSignerError extends Error {
  name = 'MissingSignerError'
}
