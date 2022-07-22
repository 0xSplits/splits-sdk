import { isAddress } from '@ethersproject/address'
import { AddressZero } from '@ethersproject/constants'
import { Contract, utils } from 'ethers'
import type { Signer } from 'ethers'

import SPLIT_MAIN_ARTIFACT_ETHEREUM from './artifacts/splits/ethereum/contracts/SplitMain.sol/SplitMain.json'
import SPLIT_MAIN_ARTIFACT_POLYGON from './artifacts/splits/polygon/contracts/SplitMain.sol/SplitMain.json'
import type { SplitMain as SplitMainEthereumType } from './typechain/ethereum'
import type { SplitMain as SplitMainPolygonType } from './typechain/polygon'
import {
  InvalidDistributorFeePercentError,
  InvalidRecipientsError,
  UnsupportedChainIdError,
} from './errors'
import {
  ETHEREUM_CHAIN_IDS,
  PERCENT_ALLOCATION_MAX_PRECISION_DECIMALS,
  POLYGON_CHAIN_IDS,
  SPLIT_MAIN_ADDRESS,
} from './constants'

const SPLIT_MAIN_ABI_ETHEREUM = SPLIT_MAIN_ARTIFACT_ETHEREUM.abi
const splitMainInterfaceEthereum = new utils.Interface(SPLIT_MAIN_ABI_ETHEREUM)
const SPLIT_MAIN_ABI_POLYGON = SPLIT_MAIN_ARTIFACT_POLYGON.abi
const splitMainInterfacePolygon = new utils.Interface(SPLIT_MAIN_ABI_POLYGON)

const SplitMainEthereum = new Contract(
  SPLIT_MAIN_ADDRESS,
  splitMainInterfaceEthereum,
) as SplitMainEthereumType
const SplitMainPolygon = new Contract(
  SPLIT_MAIN_ADDRESS,
  splitMainInterfacePolygon,
) as SplitMainPolygonType

type SplitMainType = SplitMainEthereumType | SplitMainPolygonType

export type SplitsClientConfig = {
  chainId: number
  signer: Signer
}

export type SplitRecipient = {
  address: string
  percentAllocation: number
}

export type CreateSplitConfig = {
  recipients: SplitRecipient[]
  distributorFeePercent: number
  controller?: string
}

const getRecipientSortedAddressesAndAllocations = (
  recipients: SplitRecipient[],
): [string[], number[]] => {
  const accounts: string[] = []
  const percentAllocations: number[] = []

  recipients
    .sort((a, b) => {
      if (a.address.toLowerCase() > b.address.toLowerCase()) return 1
      return -1
    })
    .map((value) => {
      accounts.push(value.address)
      percentAllocations.push(value.percentAllocation)
    })

  return [accounts, percentAllocations]
}

const getNumDigitsAfterDecimal = (value: number): number => {
  if (Number.isInteger(value)) return 0

  const decimalStr = value.toString().split('.')[1]
  return decimalStr.length
}

const validateRecipients = (recipients: SplitRecipient[]): boolean => {
  const seenAddresses = new Set<string>([])
  let totalPercentAllocation = 0

  const areRecipientsValid = recipients.reduce((acc, recipient) => {
    if (!acc) return false

    if (!isAddress(recipient.address)) return false
    if (seenAddresses.has(recipient.address.toLowerCase())) return false

    if (recipient.percentAllocation <= 0 || recipient.percentAllocation >= 100)
      return false
    if (
      getNumDigitsAfterDecimal(recipient.percentAllocation) >
      PERCENT_ALLOCATION_MAX_PRECISION_DECIMALS
    )
      return false

    seenAddresses.add(recipient.address.toLowerCase())
    totalPercentAllocation += recipient.percentAllocation

    return true
  }, true)
  if (!areRecipientsValid) return false

  // Cutoff any decimals beyond the max precision, they may get introduced due
  // to javascript floating point precision
  const factorOfTen = Math.pow(10, PERCENT_ALLOCATION_MAX_PRECISION_DECIMALS)
  totalPercentAllocation =
    Math.round(totalPercentAllocation * factorOfTen) / factorOfTen
  if (totalPercentAllocation !== 100) return false

  return true
}

const validateDistributorFeePercent = (distributorFee: number): boolean => {
  return distributorFee >= 0 && distributorFee <= 10
}

class SplitsClient {
  private readonly signer: Signer
  private readonly splitMain: SplitMainType

  constructor({ chainId, signer }: SplitsClientConfig) {
    this.signer = signer

    if (ETHEREUM_CHAIN_IDS.includes(chainId)) this.splitMain = SplitMainEthereum
    else if (POLYGON_CHAIN_IDS.includes(chainId))
      this.splitMain = SplitMainPolygon
    else throw new UnsupportedChainIdError(chainId)
  }

  async createSplit({
    recipients,
    distributorFeePercent,
    controller = AddressZero,
  }: CreateSplitConfig): Promise<string> {
    if (!validateRecipients(recipients)) throw new InvalidRecipientsError()
    if (!validateDistributorFeePercent(distributorFeePercent))
      throw new InvalidDistributorFeePercentError(distributorFeePercent)

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)

    const createSplitTx = await this.splitMain
      .connect(this.signer)
      .createSplit(
        accounts,
        percentAllocations,
        distributorFeePercent,
        controller,
      )
    const createSplitReceipt = await createSplitTx.wait()
    if (createSplitReceipt.status === 1) {
      const cse = createSplitReceipt.events?.filter(
        (e) =>
          e.eventSignature ===
          this.splitMain.interface.getEvent('CreateSplit').format(),
      )?.[0]
      if (cse && cse.args) return cse.args.split
    }

    throw new Error('Failed to complete transaction')
  }
}

export default SplitsClient
