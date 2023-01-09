import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { ContractTransaction, Event } from '@ethersproject/contracts'
import { decode } from 'base-64'

import LIQUID_SPLIT_FACTORY_ARTIFACT from '../artifacts/contracts/LiquidSplitFactory/LiquidSplitFactory.json'
import LIQUID_SPLIT_ARTIFACT from '../artifacts/contracts/LS1155/LS1155.json'
import SPLIT_MAIN_ARTIFACT_POLYGON from '../artifacts/contracts/SplitMain/polygon/SplitMain.json'

import { BaseTransactions } from './base'
import {
  LIQUID_SPLITS_MAX_PRECISION_DECIMALS,
  LIQUID_SPLIT_CHAIN_IDS,
  LIQUID_SPLIT_FACTORY_ADDRESS,
  LIQUID_SPLIT_URI_BASE_64_HEADER,
  TransactionType,
} from '../constants'
import {
  AccountNotFoundError,
  InvalidAuthError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import { protectedFormatLiquidSplit, LIQUID_SPLIT_QUERY } from '../subgraph'
import type { GqlLiquidSplit } from '../subgraph/types'
import type {
  LiquidSplit,
  SplitsClientConfig,
  CreateLiquidSplitConfig,
  DistributeLiquidSplitTokenConfig,
  TransferLiquidSplitOwnershipConfig,
  CallData,
  TransactionConfig,
  TransactionFormat,
} from '../types'
import {
  getBigNumberFromPercent,
  getRecipientSortedAddressesAndAllocations,
  getTransactionEvents,
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
import { ContractCallData } from '../utils/multicall'

const liquidSplitFactoryInterface = new Interface(
  LIQUID_SPLIT_FACTORY_ARTIFACT.abi,
)
const liquidSplitInterface = new Interface(LIQUID_SPLIT_ARTIFACT.abi)
const splitMainInterface = new Interface(SPLIT_MAIN_ARTIFACT_POLYGON.abi)

class LiquidSplitTransactions extends BaseTransactions {
  private readonly _liquidSplitFactoryContract:
    | ContractCallData
    | LiquidSplitFactoryType
    | LiquidSplitFactoryType['estimateGas']

  constructor({
    transactionType,
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })

    this._liquidSplitFactoryContract = this._getLiquidSplitFactoryContract()
  }

  protected async _createLiquidSplitTransaction({
    recipients,
    distributorFeePercent,
    owner = undefined,
    createClone = true,
  }: CreateLiquidSplitConfig): Promise<TransactionFormat> {
    validateRecipients(recipients, LIQUID_SPLITS_MAX_PRECISION_DECIMALS)
    validateDistributorFeePercent(distributorFeePercent)
    if (createClone === false)
      throw new Error(
        'Non-clone liquid splits are not available through the SDK. See the splits-liquid-template repository in the 0xSplits github if you would like to create your own custom liquid split',
      )

    if (this._shouldRequireSigner) this._requireSigner()
    const ownerAddress = owner
      ? owner
      : this._signer
      ? await this._signer.getAddress()
      : AddressZero
    validateAddress(ownerAddress)

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const nftAmounts = getNftCountsFromPercents(percentAllocations)
    const distributorFee = getBigNumberFromPercent(distributorFeePercent)

    const createSplitResult =
      await this._liquidSplitFactoryContract.createLiquidSplitClone(
        accounts,
        nftAmounts,
        distributorFee,
        ownerAddress,
      )

    return createSplitResult
  }

  protected async _distributeTokenTransaction({
    liquidSplitId,
    token,
    distributorAddress,
  }: DistributeLiquidSplitTokenConfig): Promise<TransactionFormat> {
    validateAddress(liquidSplitId)
    validateAddress(token)
    if (this._shouldRequireSigner) this._requireSigner()

    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : this._signer
      ? await this._signer.getAddress()
      : AddressZero
    validateAddress(distributorPayoutAddress)

    // TO DO: handle bad split id/no metadata found
    const { holders } = await this.getLiquidSplitMetadata({
      liquidSplitId,
    })
    const accounts = holders
      .map((h) => h.address)
      .sort((a, b) => {
        if (a.toLowerCase() > b.toLowerCase()) return 1
        return -1
      })

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitId)
    const distributeTokenResult = await liquidSplitContract.distributeFunds(
      token,
      accounts,
      distributorPayoutAddress,
    )

    return distributeTokenResult
  }

  protected async _transferOwnershipTransaction({
    liquidSplitId,
    newOwner,
  }: TransferLiquidSplitOwnershipConfig): Promise<TransactionFormat> {
    validateAddress(liquidSplitId)
    validateAddress(newOwner)
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(liquidSplitId)
    }

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitId)
    const transferOwnershipResult = await liquidSplitContract.transferOwnership(
      newOwner,
    )

    return transferOwnershipResult
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

  async formatLiquidSplit(
    gqlLiquidSplit: GqlLiquidSplit,
  ): Promise<LiquidSplit> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const liquidSplit = protectedFormatLiquidSplit(gqlLiquidSplit)
    if (this._includeEnsNames) {
      await addEnsNames(
        this._ensProvider ?? this._provider,
        liquidSplit.holders,
      )
    }

    return liquidSplit
  }

  private async _requireOwner(liquidSplitId: string) {
    this._requireSigner()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitId)
    const owner = await liquidSplitContract.owner()

    // TODO: how to get rid of this, needed for typescript check
    if (!this._signer) throw new Error()

    const signerAddress = await this._signer.getAddress()

    if (owner !== signerAddress)
      throw new InvalidAuthError(
        `Action only available to the liquid split owner. Liquid split id: ${liquidSplitId}, owner: ${owner}, signer: ${signerAddress}`,
      )
  }

  protected _getLiquidSplitContract(liquidSplit: string) {
    return this._getTransactionContract<LS1155Type, LS1155Type['estimateGas']>(
      liquidSplit,
      LIQUID_SPLIT_ARTIFACT.abi,
      liquidSplitInterface,
    )
  }

  private _getLiquidSplitFactoryContract() {
    return this._getTransactionContract<
      LiquidSplitFactoryType,
      LiquidSplitFactoryType['estimateGas']
    >(
      LIQUID_SPLIT_FACTORY_ADDRESS,
      LIQUID_SPLIT_FACTORY_ARTIFACT.abi,
      liquidSplitFactoryInterface,
    )
  }
}

export default class LiquidSplitClient extends LiquidSplitTransactions {
  readonly eventTopics: { [key: string]: string[] }
  readonly callData: LiquidSplitCallData
  readonly estimateGas: LiquidSplitGasEstimates

  constructor({
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })

    if (!LIQUID_SPLIT_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, LIQUID_SPLIT_CHAIN_IDS)

    this.eventTopics = {
      createLiquidSplit: [
        liquidSplitFactoryInterface.getEventTopic('CreateLS1155Clone'),
      ],
      distributeToken: [
        splitMainInterface.getEventTopic('UpdateSplit'),
        splitMainInterface.getEventTopic('DistributeETH'),
        splitMainInterface.getEventTopic('DistributeERC20'),
      ],
      transferOwnership: [
        liquidSplitInterface.getEventTopic('OwnershipTransferred'),
      ],
    }

    this.callData = new LiquidSplitCallData({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
    this.estimateGas = new LiquidSplitGasEstimates({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreateLiquidSplitTransaction({
    recipients,
    distributorFeePercent,
    owner = undefined,
    createClone = false,
  }: CreateLiquidSplitConfig): Promise<{
    tx: ContractTransaction
  }> {
    const createSplitTx = await this._createLiquidSplitTransaction({
      recipients,
      distributorFeePercent,
      owner,
      createClone,
    })
    if (!this._isContractTransaction(createSplitTx))
      throw new Error('Invalid response')

    return { tx: createSplitTx }
  }

  async createLiquidSplit({
    recipients,
    distributorFeePercent,
    owner,
    createClone = true,
  }: CreateLiquidSplitConfig): Promise<{
    liquidSplitId: string
    event: Event
  }> {
    const { tx: createSplitTx } = await this.submitCreateLiquidSplitTransaction(
      {
        recipients,
        distributorFeePercent,
        owner,
        createClone,
      },
    )

    const eventTopic = createClone
      ? this.eventTopics.createLiquidSplit[0]
      : this.eventTopics.createLiquidSplit[1]
    const events = await getTransactionEvents(createSplitTx, [eventTopic])
    const event = events.length > 0 ? events[0] : undefined
    if (event && event.args)
      return {
        liquidSplitId: event.args.ls,
        event,
      }

    throw new TransactionFailedError()
  }

  async submitDistributeTokenTransaction({
    liquidSplitId,
    token,
    distributorAddress,
  }: DistributeLiquidSplitTokenConfig): Promise<{
    tx: ContractTransaction
  }> {
    const distributeTokenTx = await this._distributeTokenTransaction({
      liquidSplitId,
      token,
      distributorAddress,
    })
    if (!this._isContractTransaction(distributeTokenTx))
      throw new Error('Invalid response')

    return { tx: distributeTokenTx }
  }

  async distributeToken({
    liquidSplitId,
    token,
    distributorAddress,
  }: DistributeLiquidSplitTokenConfig): Promise<{
    event: Event
  }> {
    const { tx: distributeTokenTx } =
      await this.submitDistributeTokenTransaction({
        liquidSplitId,
        token,
        distributorAddress,
      })

    const eventTopic =
      token === AddressZero
        ? this.eventTopics.distributeToken[1]
        : this.eventTopics.distributeToken[2]
    const events = await getTransactionEvents(distributeTokenTx, [eventTopic])
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitTransferOwnershipTransaction({
    liquidSplitId,
    newOwner,
  }: TransferLiquidSplitOwnershipConfig): Promise<{
    tx: ContractTransaction
  }> {
    const transferOwnershipTx = await this._transferOwnershipTransaction({
      liquidSplitId,
      newOwner,
    })
    if (!this._isContractTransaction(transferOwnershipTx))
      throw new Error('Invalid response')

    return { tx: transferOwnershipTx }
  }

  async transferOwnership({
    liquidSplitId,
    newOwner,
  }: TransferLiquidSplitOwnershipConfig): Promise<{
    event: Event
  }> {
    const { tx: transferOwnershipTx } =
      await this.submitTransferOwnershipTransaction({
        liquidSplitId,
        newOwner,
      })
    const events = await getTransactionEvents(
      transferOwnershipTx,
      this.eventTopics.transferOwnership,
    )
    const event = events.length > 0 ? events[0] : undefined
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
}

class LiquidSplitGasEstimates extends LiquidSplitTransactions {
  constructor({
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
  }

  async createLiquidSplit({
    recipients,
    distributorFeePercent,
    owner = undefined,
    createClone = true,
  }: CreateLiquidSplitConfig): Promise<BigNumber> {
    const gasEstimate = await this._createLiquidSplitTransaction({
      recipients,
      distributorFeePercent,
      owner,
      createClone,
    })
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async distributeToken({
    liquidSplitId,
    token,
    distributorAddress,
  }: DistributeLiquidSplitTokenConfig): Promise<BigNumber> {
    const gasEstimate = await this._distributeTokenTransaction({
      liquidSplitId,
      token,
      distributorAddress,
    })
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async transferOwnership({
    liquidSplitId,
    newOwner,
  }: TransferLiquidSplitOwnershipConfig): Promise<BigNumber> {
    const gasEstimate = await this._transferOwnershipTransaction({
      liquidSplitId,
      newOwner,
    })
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

class LiquidSplitCallData extends LiquidSplitTransactions {
  constructor({
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
  }

  async createLiquidSplit({
    recipients,
    distributorFeePercent,
    owner = undefined,
    createClone = true,
  }: CreateLiquidSplitConfig): Promise<CallData> {
    const callData = await this._createLiquidSplitTransaction({
      recipients,
      distributorFeePercent,
      owner,
      createClone,
    })
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async distributeToken({
    liquidSplitId,
    token,
    distributorAddress,
  }: DistributeLiquidSplitTokenConfig): Promise<CallData> {
    const callData = await this._distributeTokenTransaction({
      liquidSplitId,
      token,
      distributorAddress,
    })
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async transferOwnership({
    liquidSplitId,
    newOwner,
  }: TransferLiquidSplitOwnershipConfig): Promise<CallData> {
    const callData = await this._transferOwnershipTransaction({
      liquidSplitId,
      newOwner,
    })
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
