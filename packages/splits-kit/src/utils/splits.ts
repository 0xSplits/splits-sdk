import { sortBy } from 'lodash'
import { CreateSplitForm, IAccount, Recipient } from '../types'

export const getSplitsAccountUrl = (address: string, chainId?: number) => {
  const chainQueryParam = chainId ? `?chainId=${chainId}` : ''
  return `https://app.splits.org/accounts/${address}/${chainQueryParam}`
}

export const sortRecipients = (
  recipients: Recipient[],
  account: IAccount,
): Recipient[] => {
  return sortBy(recipients, [
    (r) => -(r.address === account),
    (r) => -r.percentAllocation,
  ])
}

export const getSplitRouterParams = (
  split: CreateSplitForm,
  account: IAccount,
) => {
  const distributorFee = split.distributorFee * 10000
  const controller = split.controller

  const [addresses, allocations] = sortRecipients(
    split.recipients,
    account,
  ).reduce(
    (acc, recipient) => {
      acc[0].push(recipient.address)
      acc[1].push(recipient.percentAllocation * 10000)
      return acc
    },
    [[] as string[], [] as number[]],
  )

  return `type=split&distributorFee=${distributorFee}&controller=${controller}&addresses=${addresses.join(
    ',',
  )}&allocations=${allocations.join(',')}&sponsor=${false}`
}
