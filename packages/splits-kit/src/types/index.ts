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
  rawAmount: bigint
  symbol: string
}

export type ICreateSplitForm = {
  recipients: Recipient[]
  distributorFee: number
  controller: IAddress
}
