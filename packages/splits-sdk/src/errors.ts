import { SUPPORTED_CHAIN_IDS } from './constants'

export class UnsupportedChainIdError extends Error {
  name = 'UnsupportedChainIdError'

  constructor(invalidChainId: number) {
    super(
      `Unsupported chain: ${invalidChainId}. Supported chains are: ${SUPPORTED_CHAIN_IDS}`,
    )
  }
}

export class InvalidRecipientsError extends Error {
  name = 'InvalidRecipientsError'
}

export class InvalidDistributorFeePercentError extends Error {
  name = 'InvalidDistributorFeePercent'

  constructor(invalidDistributorFeePercent: number) {
    super(
      `Invalid distributor fee percent: ${invalidDistributorFeePercent}. Distributor fee percent must be >= 0 and <= 10`,
    )
  }
}
