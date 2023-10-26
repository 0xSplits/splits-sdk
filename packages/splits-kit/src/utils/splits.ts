import { Split, SplitRecipient } from '@0xsplits/splits-sdk-react'
import { SPLITS_ADDRESS, SPLITS_DONATION_ADDRESS } from '../constants/addresses'
import {
  SPLIT_RECIPIENT_MAX_DECIMALS,
  SPONSORSHIP_THRESHOLD,
} from '../constants/splits'
import { round } from 'lodash'

export const getSplitsAccountUrl = (address: string, chainId?: number) => {
  const chainQueryParam = chainId ? `?chainId=${chainId}` : ''
  return `https://app.splits.org/accounts/${address}/${chainQueryParam}`
}

export const isSponsorshipAddress: (arg0: string) => boolean = (address) => {
  return address === SPLITS_ADDRESS || address === SPLITS_DONATION_ADDRESS
}

const isSponsorshipRecipient: (arg0: SplitRecipient) => boolean = (
  recipient,
) => {
  return isSponsorshipAddress(recipient.address)
}

export const getSplitSponsorshipPercentage: (arg0: Split) => number = (
  split,
) => {
  const roundingPrecision = SPLIT_RECIPIENT_MAX_DECIMALS
  const recipients = split.recipients
  return recipients
    .filter(isSponsorshipRecipient)
    .reduce((acc: number, recipient) => {
      return acc + round(recipient.percentAllocation, roundingPrecision)
    }, 0)
}

export const isSplitSponsor: (arg0: Split) => boolean = (split) => {
  return getSplitSponsorshipPercentage(split) > SPONSORSHIP_THRESHOLD
}
