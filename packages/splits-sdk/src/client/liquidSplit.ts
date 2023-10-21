import { decode } from 'base-64'

import {
  BaseClientMixin,
  BaseGasEstimatesMixin,
  BaseTransactions,
} from './base'
import {
  LIQUID_SPLITS_MAX_PRECISION_DECIMALS,
  LIQUID_SPLIT_CHAIN_IDS,
  getLiquidSplitFactoryAddress,
  LIQUID_SPLIT_URI_BASE_64_HEADER,
  TransactionType,
  ADDRESS_ZERO,
} from '../constants'
import {
  AccountNotFoundError,
  InvalidAuthError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import { applyMixins } from './mixin'
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
  getBigIntFromPercent,
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
import { liquidSplitFactoryAbi } from '../constants/abi/liquidSplitFactory'
import {
  Address,
  Hash,
  Hex,
  Log,
  decodeEventLog,
  encodeEventTopics,
  getAddress,
  getContract,
} from 'viem'
import { ls1155CloneAbi } from '../constants/abi/ls1155Clone'
import { splitMainPolygonAbi } from '../constants/abi/splitMain'

const DEFAULT_CREATE_CLONE = true

class LiquidSplitTransactions extends BaseTransactions {
  constructor({
    transactionType,
    chainId,
    publicClient,
    ensProvider,
    account,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      publicClient,
      ensProvider,
      account,
      includeEnsNames,
    })
  }

  protected async _createLiquidSplitTransaction({
    recipients,
    distributorFeePercent,
    owner = undefined,
    createClone = DEFAULT_CREATE_CLONE,
    transactionOverrides = {},
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
      : this._signer?.account
      ? this._signer.account.address
      : ADDRESS_ZERO
    validateAddress(ownerAddress)

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const nftAmounts = getNftCountsFromPercents(percentAllocations)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)

    const result = await this._executeContractFunction({
      contractAddress: getLiquidSplitFactoryAddress(this._chainId),
      contractAbi: liquidSplitFactoryAbi,
      functionName: 'createLiquidSplitClone',
      functionArgs: [accounts, nftAmounts, distributorFee, ownerAddress],
      transactionOverrides,
    })

    return result
  }

  protected async _distributeTokenTransaction({
    liquidSplitId,
    token,
    distributorAddress,
    transactionOverrides = {},
  }: DistributeLiquidSplitTokenConfig): Promise<TransactionFormat> {
    validateAddress(liquidSplitId)
    validateAddress(token)
    if (this._shouldRequireSigner) this._requireSigner()

    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : this._signer?.account
      ? this._signer.account.address
      : ADDRESS_ZERO
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

    const result = await this._executeContractFunction({
      contractAddress: getAddress(liquidSplitId),
      contractAbi: ls1155CloneAbi,
      functionName: 'distributeFunds',
      functionArgs: [token, accounts, distributorPayoutAddress],
      transactionOverrides,
    })

    return result
  }

  protected async _transferOwnershipTransaction({
    liquidSplitId,
    newOwner,
    transactionOverrides = {},
  }: TransferLiquidSplitOwnershipConfig): Promise<TransactionFormat> {
    validateAddress(liquidSplitId)
    validateAddress(newOwner)
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(liquidSplitId)
    }

    const result = await this._executeContractFunction({
      contractAddress: getAddress(liquidSplitId),
      contractAbi: ls1155CloneAbi,
      functionName: 'transferOwnership',
      functionArgs: [newOwner],
      transactionOverrides,
    })

    return result
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
        liquidSplit.holders.map((holder) => {
          return {
            ...holder,
            address: getAddress(holder.address),
          }
        }),
      )
    }

    return liquidSplit
  }

  private async _requireOwner(liquidSplitId: string) {
    this._requireSigner()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitId)
    const owner = await liquidSplitContract.read.owner()

    // TODO: how to get rid of this, needed for typescript check
    if (!this._signer?.account) throw new Error()

    const signerAddress = this._signer.account.address

    if (owner !== signerAddress)
      throw new InvalidAuthError(
        `Action only available to the liquid split owner. Liquid split id: ${liquidSplitId}, owner: ${owner}, signer: ${signerAddress}`,
      )
  }

  protected _getLiquidSplitContract(liquidSplit: string) {
    return getContract({
      address: getAddress(liquidSplit),
      abi: ls1155CloneAbi,
      publicClient: this._provider,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class LiquidSplitClient extends LiquidSplitTransactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: LiquidSplitCallData
  readonly estimateGas: LiquidSplitGasEstimates

  constructor({
    chainId,
    publicClient,
    ensProvider,
    account,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      ensProvider,
      account,
      includeEnsNames,
    })

    if (!LIQUID_SPLIT_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, LIQUID_SPLIT_CHAIN_IDS)

    this.eventTopics = {
      createLiquidSplit: [
        encodeEventTopics({
          abi: liquidSplitFactoryAbi,
          eventName: 'CreateLS1155Clone',
        })[0],
      ],
      distributeToken: [
        encodeEventTopics({
          abi: splitMainPolygonAbi,
          eventName: 'UpdateSplit',
        })[0],
        encodeEventTopics({
          abi: splitMainPolygonAbi,
          eventName: 'DistributeETH',
        })[0],
        encodeEventTopics({
          abi: splitMainPolygonAbi,
          eventName: 'DistributeERC20',
        })[0],
      ],
      transferOwnership: [
        encodeEventTopics({
          abi: ls1155CloneAbi,
          eventName: 'OwnershipTransferred',
        })[0],
      ],
    }

    this.callData = new LiquidSplitCallData({
      chainId,
      publicClient,
      ensProvider,
      account,
      includeEnsNames,
    })
    this.estimateGas = new LiquidSplitGasEstimates({
      chainId,
      publicClient,
      ensProvider,
      account,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreateLiquidSplitTransaction(
    createLiquidSplitArgs: CreateLiquidSplitConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._createLiquidSplitTransaction(
      createLiquidSplitArgs,
    )
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async createLiquidSplit(
    createLiquidSplitArgs: CreateLiquidSplitConfig,
  ): Promise<{
    liquidSplitId: Address
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } = await this.submitCreateLiquidSplitTransaction(
      createLiquidSplitArgs,
    )

    const events = await getTransactionEvents(
      this._provider,
      txHash,
      this.eventTopics.createLiquidSplit,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      const log = decodeEventLog({
        abi: liquidSplitFactoryAbi,
        data: event.data,
        topics: event.topics,
      })
      return {
        liquidSplitId: log.args.ls,
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async submitDistributeTokenTransaction(
    distributeTokenArgs: DistributeLiquidSplitTokenConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._distributeTokenTransaction(distributeTokenArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async distributeToken(
    distributeTokenArgs: DistributeLiquidSplitTokenConfig,
  ): Promise<{
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } =
      await this.submitDistributeTokenTransaction(distributeTokenArgs)

    const { token } = distributeTokenArgs
    const eventTopic =
      token === ADDRESS_ZERO
        ? this.eventTopics.distributeToken[1]
        : this.eventTopics.distributeToken[2]
    const events = await getTransactionEvents(this._provider, txHash, [
      eventTopic,
    ])
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitTransferOwnershipTransaction(
    transferOwnershipArgs: TransferLiquidSplitOwnershipConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._transferOwnershipTransaction(
      transferOwnershipArgs,
    )
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async transferOwnership(
    transferOwnershipArgs: TransferLiquidSplitOwnershipConfig,
  ): Promise<{
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } = await this.submitTransferOwnershipTransaction(
      transferOwnershipArgs,
    )
    const events = await getTransactionEvents(
      this._provider,
      txHash,
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
    const distributorFee = await liquidSplitContract.read.distributorFee()

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
    const payoutSplitId = await liquidSplitContract.read.payoutSplit()

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
    const owner = await liquidSplitContract.read.owner()

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
    const uri = await liquidSplitContract.read.uri([BigInt(0)]) // Expects an argument, but it's not actually used

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
      await liquidSplitContract.read.scaledPercentBalanceOf([
        getAddress(address),
      ])

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

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface LiquidSplitClient extends BaseClientMixin {}
applyMixins(LiquidSplitClient, [BaseClientMixin])

class LiquidSplitGasEstimates extends LiquidSplitTransactions {
  constructor({
    chainId,
    publicClient,
    ensProvider,
    account,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      publicClient,
      ensProvider,
      account,
      includeEnsNames,
    })
  }

  async createLiquidSplit(
    createLiquidSplitArgs: CreateLiquidSplitConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._createLiquidSplitTransaction(
      createLiquidSplitArgs,
    )
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async distributeToken(
    distributeTokenArgs: DistributeLiquidSplitTokenConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._distributeTokenTransaction(distributeTokenArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async transferOwnership(
    transferOwnershipArgs: TransferLiquidSplitOwnershipConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._transferOwnershipTransaction(
      transferOwnershipArgs,
    )
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

applyMixins(LiquidSplitGasEstimates, [BaseGasEstimatesMixin])

class LiquidSplitCallData extends LiquidSplitTransactions {
  constructor({
    chainId,
    publicClient,
    ensProvider,
    account,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      chainId,
      publicClient,
      ensProvider,
      account,
      includeEnsNames,
    })
  }

  async createLiquidSplit(
    createLiquidSplitArgs: CreateLiquidSplitConfig,
  ): Promise<CallData> {
    const callData = await this._createLiquidSplitTransaction(
      createLiquidSplitArgs,
    )
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async distributeToken(
    distributeTokenArgs: DistributeLiquidSplitTokenConfig,
  ): Promise<CallData> {
    const callData = await this._distributeTokenTransaction(distributeTokenArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async transferOwnership(
    transferOwnershipArgs: TransferLiquidSplitOwnershipConfig,
  ): Promise<CallData> {
    const callData = await this._transferOwnershipTransaction(
      transferOwnershipArgs,
    )
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
