import { BigNumber } from 'ethers'

export const PERCENTAGE_SCALE = BigNumber.from(1e6)
export const SPLIT_RECIPIENT_MAX_DECIMALS = 4
export const SPONSORSHIP_THRESHOLD = 0.1

export const EMPTY_RECIPIENT = { address: '', percentAllocation: 0 }
export const DEFAULT_RECIPIENTS = [
  {
    address: '0x5090c4Fead5Be112b643BC75d61bF42339675448',
    percentAllocation: 99.4,
  },
]
export const DEFAULT_DISTRIBUTOR_FEE = 0.1
export const DEFAULT_DISTRIBUTOR_FEE_OPTIONS = [0.01, 0.1, 1]
