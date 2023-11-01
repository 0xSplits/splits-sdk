import { BigNumber } from 'ethers'

export type IAddress = `0x${string}`
export type IAccount = IAddress | null | undefined

export type Recipient = {
  address: string
  percentAllocation: number
  ensName?: string
}

export type Balance = {
  decimals: number
  formattedAmount: string
  rawAmount: BigNumber
  symbol: string
}

export type CreateSplitForm = {
  recipients: Recipient[]
  distributorFee: number
  controller: IAddress
}
