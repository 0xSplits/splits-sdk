import { BigNumber } from '@ethersproject/bignumber'
import { ContractTransaction, Event } from '@ethersproject/contracts'

import { PERCENTAGE_SCALE } from '../constants'
import type { SplitRecipient } from '../types'

export const getRecipientSortedAddressesAndAllocations = (
  recipients: SplitRecipient[],
): [string[], BigNumber[]] => {
  const accounts: string[] = []
  const percentAllocations: BigNumber[] = []

  recipients
    .sort((a, b) => {
      if (a.address.toLowerCase() > b.address.toLowerCase()) return 1
      return -1
    })
    .map((value) => {
      accounts.push(value.address)
      percentAllocations.push(getBigNumberValue(value.percentAllocation))
    })

  return [accounts, percentAllocations]
}

export const getBigNumberValue = (value: number): BigNumber => {
  return BigNumber.from(Math.round(PERCENTAGE_SCALE.toNumber() * value) / 100)
}

export const fromBigNumberValue = (value: BigNumber | number): number => {
  const numberVal = value instanceof BigNumber ? value.toNumber() : value
  return (numberVal * 100) / PERCENTAGE_SCALE.toNumber()
}

export const getTransactionEvent = async (
  transaction: ContractTransaction,
  eventSignature: string,
): Promise<Event | undefined> => {
  const receipt = await transaction.wait()
  if (receipt.status === 1) {
    const event = receipt.events?.filter(
      (e) => e.eventSignature === eventSignature,
    )[0]

    return event
  }
}
