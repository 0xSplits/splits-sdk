import { Interface } from '@ethersproject/abi'
import { AddressZero } from '@ethersproject/constants'
import { Contract, Event } from '@ethersproject/contracts'
import { decode } from 'base-64'

import LIQUID_SPLIT_FACTORY_ARTIFACT from '../artifacts/contracts/LiquidSplitFactory/LiquidSplitFactory.json'
import LIQUID_SPLIT_ARTIFACT from '../artifacts/contracts/LS1155/LS1155.json'
import SPLIT_MAIN_ARTIFACT_POLYGON from '../artifacts/contracts/SplitMain/polygon/SplitMain.json'

import BaseClient from './base'
import {
  LIQUID_SPLITS_MAX_PRECISION_DECIMALS,
  LIQUID_SPLIT_CHAIN_IDS,
  LIQUID_SPLIT_FACTORY_ADDRESS,
  LIQUID_SPLIT_URI_BASE_64_HEADER,
} from '../constants'
import {
  AccountNotFoundError,
  InvalidAuthError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import { protectedFormatLiquidSplit, LIQUID_SPLIT_QUERY } from '../subgraph'
import type { GqlLiquidSplit } from '../subgraph/types'
import type { LiquidSplit, SplitsClientConfig, SplitRecipient } from '../types'
import {
  getBigNumberFromPercent,
  getRecipientSortedAddressesAndAllocations,
  getTransactionEvent,
  getNftCountsFromPercents,
  addEnsNames,
} from '../utils'
import {
  validateAddress,
  validateDistributorFeePercent,
  validateRecipients,
} from '../utils/validation'
import type { LiquidSplitFactory as LiquidSplitFactoryType } from '../typechain/LiquidSplitFactory'
import type { LS1155 as LS1155Type } from '../typechain/LS1155'

const liquidSplitFactoryInterface = new Interface(
  LIQUID_SPLIT_FACTORY_ARTIFACT.abi,
)
const liquidSplitInterface = new Interface(LIQUID_SPLIT_ARTIFACT.abi)
const splitMainInterface = new Interface(SPLIT_MAIN_ARTIFACT_POLYGON.abi)

export default class LiquidSplitClient extends BaseClient {
  private readonly _liquidSplitFactory: LiquidSplitFactoryType

  constructor({
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })

    if (LIQUID_SPLIT_CHAIN_IDS.includes(chainId)) {
      this._liquidSplitFactory = new Contract(
        LIQUID_SPLIT_FACTORY_ADDRESS,
        liquidSplitFactoryInterface,
        provider,
      ) as LiquidSplitFactoryType
    } else throw new UnsupportedChainIdError(chainId, LIQUID_SPLIT_CHAIN_IDS)
  }

  // Write actions
  async createLiquidSplit({
    recipients,
    distributorFeePercent,
    owner,
    createClone,
  }: {
    recipients: SplitRecipient[]
    distributorFeePercent: number
    owner?: string
    createClone?: boolean
  }): Promise<{
    liquidSplitId: string
    event: Event
  }> {
    validateRecipients(recipients, LIQUID_SPLITS_MAX_PRECISION_DECIMALS)
    validateDistributorFeePercent(distributorFeePercent)
    this._requireSigner()
    // TODO: how to remove this, needed for typescript check right now
    if (!this._signer) throw new Error()

    const ownerAddress = owner ? owner : await this._signer.getAddress()
    validateAddress(ownerAddress)

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const nftAmounts = getNftCountsFromPercents(percentAllocations)
    const distributorFee = getBigNumberFromPercent(distributorFeePercent)

    const createSplitTx = createClone
      ? await this._liquidSplitFactory
          .connect(this._signer)
          .createLiquidSplitClone(
            accounts,
            nftAmounts,
            distributorFee,
            ownerAddress,
          )
      : await this._liquidSplitFactory
          .connect(this._signer)
          .createLiquidSplit(accounts, nftAmounts, distributorFee, ownerAddress)

    const eventSignature = createClone
      ? this._liquidSplitFactory.interface
          .getEvent('CreateLS1155Clone')
          .format()
      : this._liquidSplitFactory.interface.getEvent('CreateLS1155').format()
    const event = await getTransactionEvent(createSplitTx, eventSignature)
    if (event && event.args)
      return {
        liquidSplitId: event.args.ls,
        event,
      }

    throw new TransactionFailedError()
  }

  async distributeToken({
    liquidSplitId,
    token,
    distributorAddress,
  }: {
    liquidSplitId: string
    token: string
    distributorAddress?: string
  }): Promise<{
    event: Event
  }> {
    validateAddress(liquidSplitId)
    validateAddress(token)
    this._requireSigner()
    // TODO: how to remove this, needed for typescript check right now
    if (!this._signer) throw new Error()

    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : await this._signer.getAddress()
    validateAddress(distributorPayoutAddress)

    // TO DO: handle bad split id/no metadata found
    const { holders } = await this.getLiquidSplitMetadata({
      liquidSplitId,
    })
    const accounts = holders.map((h) => h.address)

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitId)
    const distributeTokenTx = await liquidSplitContract.distributeFunds(
      token,
      accounts,
      distributorPayoutAddress,
    )

    const eventSignature =
      token === AddressZero
        ? splitMainInterface.getEvent('DistributeETH').format()
        : splitMainInterface.getEvent('DistributeERC20').format()
    const event = await getTransactionEvent(distributeTokenTx, eventSignature)
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async transferOwnership({
    liquidSplitId,
    newOwner,
  }: {
    liquidSplitId: string
    newOwner: string
  }): Promise<{
    event: Event
  }> {
    validateAddress(liquidSplitId)
    validateAddress(newOwner)
    this._requireSigner()
    await this._requireOwner(liquidSplitId)
    // TODO: how to remove this, needed for typescript check right now
    if (!this._signer) throw new Error()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitId)
    const transferOwnershipTx = await liquidSplitContract.transferOwnership(
      newOwner,
    )
    const eventSignature = liquidSplitContract.interface
      .getEvent('OwnershipTransferred')
      .format()
    const event = await getTransactionEvent(transferOwnershipTx, eventSignature)
    if (event) return { event }

    throw new TransactionFailedError()
  }

  // Read actions
  async getDistributorFee({
    liquidSplitId,
  }: {
    liquidSplitId: string
  }): Promise<{
    distributorFee: number
  }> {
    validateAddress(liquidSplitId)
    this._requireProvider()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitId)
    const distributorFee = await liquidSplitContract.distributorFee()

    return {
      distributorFee,
    }
  }

  async getPayoutSplit({ liquidSplitId }: { liquidSplitId: string }): Promise<{
    payoutSplitId: string
  }> {
    validateAddress(liquidSplitId)
    this._requireProvider()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitId)
    const payoutSplitId = await liquidSplitContract.payoutSplit()

    return {
      payoutSplitId,
    }
  }

  async getOwner({ liquidSplitId }: { liquidSplitId: string }): Promise<{
    owner: string
  }> {
    validateAddress(liquidSplitId)
    this._requireProvider()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitId)
    const owner = await liquidSplitContract.owner()

    return {
      owner,
    }
  }

  async getUri({ liquidSplitId }: { liquidSplitId: string }): Promise<{
    uri: string
  }> {
    validateAddress(liquidSplitId)
    this._requireProvider()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitId)
    const uri = await liquidSplitContract.uri(0) // Expects an argument, but it's not actually used

    return {
      uri,
    }
  }

  async getScaledPercentBalanceOf({
    liquidSplitId,
    address,
  }: {
    liquidSplitId: string
    address: string
  }): Promise<{
    scaledPercentBalance: number
  }> {
    validateAddress(liquidSplitId)
    validateAddress(address)
    this._requireProvider()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitId)
    const scaledPercentBalance =
      await liquidSplitContract.scaledPercentBalanceOf(address)

    return {
      scaledPercentBalance,
    }
  }

  async getNftImage({ liquidSplitId }: { liquidSplitId: string }): Promise<{
    image: string
  }> {
    validateAddress(liquidSplitId)
    this._requireProvider()

    const { uri } = await this.getUri({ liquidSplitId })
    const decodedUri = decode(uri.slice(LIQUID_SPLIT_URI_BASE_64_HEADER.length))
    const uriJson = JSON.parse(decodedUri)

    return {
      image: uriJson.image ?? '',
    }
  }

  // Graphql read actions
  async getLiquidSplitMetadata({
    liquidSplitId,
  }: {
    liquidSplitId: string
  }): Promise<LiquidSplit> {
    validateAddress(liquidSplitId)

    const response = await this._makeGqlRequest<{
      liquidSplit: GqlLiquidSplit
    }>(LIQUID_SPLIT_QUERY, {
      liquidSplitId: liquidSplitId.toLowerCase(),
    })

    if (!response.liquidSplit)
      throw new AccountNotFoundError(
        `No liquid split found at address ${liquidSplitId}, please confirm you have entered the correct address. There may just be a delay in subgraph indexing.`,
      )

    return await this.formatLiquidSplit(response.liquidSplit)
  }

  // Helper functions
  private async _requireOwner(liquidSplitId: string) {
    const { owner } = await this.getOwner({ liquidSplitId })
    // TODO: how to get rid of this, needed for typescript check
    if (!this._signer) throw new Error()

    const signerAddress = await this._signer.getAddress()

    if (owner !== signerAddress)
      throw new InvalidAuthError(
        `Action only available to the liquid split owner. Liquid split id: ${liquidSplitId}, owner: ${owner}, signer: ${signerAddress}`,
      )
  }

  private _getLiquidSplitContract(liquidSplitId: string) {
    if (!this._liquidSplitFactory.provider && !this._signer) throw new Error()

    return new Contract(
      liquidSplitId,
      liquidSplitInterface,
      this._signer || this._liquidSplitFactory.provider,
    ) as LS1155Type
  }

  async formatLiquidSplit(
    gqlLiquidSplit: GqlLiquidSplit,
  ): Promise<LiquidSplit> {
    this._requireProvider()
    if (!this._liquidSplitFactory) throw new Error()

    const liquidSplit = protectedFormatLiquidSplit(gqlLiquidSplit)
    if (this._includeEnsNames) {
      await addEnsNames(
        this._ensProvider ?? this._liquidSplitFactory.provider,
        liquidSplit.holders,
      )
    }

    return liquidSplit
  }
}
