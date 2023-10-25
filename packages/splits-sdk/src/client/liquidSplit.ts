import { decode } from 'base-64'
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
import { liquidSplitFactoryAbi } from '../constants/abi/liquidSplitFactory'
import { ls1155CloneAbi } from '../constants/abi/ls1155Clone'
import { splitMainPolygonAbi } from '../constants/abi/splitMain'
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
  getNftCountsFromPercents,
  addEnsNames,
} from '../utils'
import {
  validateAddress,
  validateDistributorFeePercent,
  validateRecipients,
} from '../utils/validation'

class LiquidSplitTransactions extends BaseTransactions {
  constructor({
    transactionType,
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
  }

  protected async _createLiquidSplitTransaction({
    recipients,
    distributorFeePercent,
    owner = undefined,
    transactionOverrides = {},
  }: CreateLiquidSplitConfig): Promise<TransactionFormat> {
    validateRecipients(recipients, LIQUID_SPLITS_MAX_PRECISION_DECIMALS)
    validateDistributorFeePercent(distributorFeePercent)

    if (this._shouldRequreWalletClient) this._requireWalletClient()
    const ownerAddress = owner
      ? owner
      : this._walletClient?.account
      ? this._walletClient.account.address
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
    liquidSplitAddress,
    token,
    distributorAddress,
    transactionOverrides = {},
  }: DistributeLiquidSplitTokenConfig): Promise<TransactionFormat> {
    validateAddress(liquidSplitAddress)
    validateAddress(token)
    if (this._shouldRequreWalletClient) this._requireWalletClient()

    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : this._walletClient?.account
      ? this._walletClient.account.address
      : ADDRESS_ZERO
    validateAddress(distributorPayoutAddress)

    // TO DO: handle bad split id/no metadata found
    const { holders } = await this.getLiquidSplitMetadata({
      liquidSplitAddress,
    })
    const accounts = holders
      .map((h) => h.recipient.address)
      .sort((a, b) => {
        if (a.toLowerCase() > b.toLowerCase()) return 1
        return -1
      })

    const result = await this._executeContractFunction({
      contractAddress: getAddress(liquidSplitAddress),
      contractAbi: ls1155CloneAbi,
      functionName: 'distributeFunds',
      functionArgs: [token, accounts, distributorPayoutAddress],
      transactionOverrides,
    })

    return result
  }

  protected async _transferOwnershipTransaction({
    liquidSplitAddress,
    newOwner,
    transactionOverrides = {},
  }: TransferLiquidSplitOwnershipConfig): Promise<TransactionFormat> {
    validateAddress(liquidSplitAddress)
    validateAddress(newOwner)
    if (this._shouldRequreWalletClient) {
      this._requireWalletClient()
      await this._requireOwner(liquidSplitAddress)
    }

    const result = await this._executeContractFunction({
      contractAddress: getAddress(liquidSplitAddress),
      contractAbi: ls1155CloneAbi,
      functionName: 'transferOwnership',
      functionArgs: [newOwner],
      transactionOverrides,
    })

    return result
  }

  // Graphql read actions
  async getLiquidSplitMetadata({
    liquidSplitAddress,
  }: {
    liquidSplitAddress: string
  }): Promise<LiquidSplit> {
    validateAddress(liquidSplitAddress)
    const chainId = this._chainId

    const response = await this._makeGqlRequest<{
      liquidSplit: GqlLiquidSplit
    }>(LIQUID_SPLIT_QUERY, {
      liquidSplitAddress: liquidSplitAddress.toLowerCase(),
    })

    if (!response.liquidSplit)
      throw new AccountNotFoundError(
        'liquid split',
        liquidSplitAddress,
        chainId,
      )

    return await this.formatLiquidSplit(response.liquidSplit)
  }

  async formatLiquidSplit(
    gqlLiquidSplit: GqlLiquidSplit,
  ): Promise<LiquidSplit> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const liquidSplit = protectedFormatLiquidSplit(gqlLiquidSplit)
    if (this._includeEnsNames) {
      await addEnsNames(
        this._ensPublicClient ?? this._publicClient,
        liquidSplit.holders.map((holder) => {
          return holder.recipient
        }),
      )
    }

    return liquidSplit
  }

  private async _requireOwner(liquidSplitAddress: string) {
    this._requireWalletClient()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitAddress)
    const owner = await liquidSplitContract.read.owner()

    // TODO: how to get rid of this, needed for typescript check
    if (!this._walletClient?.account) throw new Error()

    const walletAddress = this._walletClient.account.address

    if (owner !== walletAddress)
      throw new InvalidAuthError(
        `Action only available to the liquid split owner. Liquid split address: ${liquidSplitAddress}, owner: ${owner}, wallet address: ${walletAddress}`,
      )
  }

  protected _getLiquidSplitContract(liquidSplit: string) {
    return getContract({
      address: getAddress(liquidSplit),
      abi: ls1155CloneAbi,
      publicClient: this._publicClient,
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
    ensPublicClient,
    walletClient,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
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
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
    this.estimateGas = new LiquidSplitGasEstimates({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
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
    liquidSplitAddress: Address
    event: Log
  }> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } = await this.submitCreateLiquidSplitTransaction(
      createLiquidSplitArgs,
    )

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.createLiquidSplit,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      const log = decodeEventLog({
        abi: liquidSplitFactoryAbi,
        data: event.data,
        topics: event.topics,
      })
      return {
        liquidSplitAddress: log.args.ls,
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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } =
      await this.submitDistributeTokenTransaction(distributeTokenArgs)

    const { token } = distributeTokenArgs
    const eventTopic =
      token === ADDRESS_ZERO
        ? this.eventTopics.distributeToken[1]
        : this.eventTopics.distributeToken[2]
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: [eventTopic],
    })
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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } = await this.submitTransferOwnershipTransaction(
      transferOwnershipArgs,
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.transferOwnership,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  // Read actions
  async getDistributorFee({
    liquidSplitAddress,
  }: {
    liquidSplitAddress: string
  }): Promise<{
    distributorFee: number
  }> {
    validateAddress(liquidSplitAddress)
    this._requirePublicClient()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitAddress)
    const distributorFee = await liquidSplitContract.read.distributorFee()

    return {
      distributorFee,
    }
  }

  async getPayoutSplit({
    liquidSplitAddress,
  }: {
    liquidSplitAddress: string
  }): Promise<{
    payoutSplitAddress: Address
  }> {
    validateAddress(liquidSplitAddress)
    this._requirePublicClient()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitAddress)
    const payoutSplitAddress = await liquidSplitContract.read.payoutSplit()

    return {
      payoutSplitAddress,
    }
  }

  async getOwner({
    liquidSplitAddress,
  }: {
    liquidSplitAddress: string
  }): Promise<{
    owner: Address
  }> {
    validateAddress(liquidSplitAddress)
    this._requirePublicClient()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitAddress)
    const owner = await liquidSplitContract.read.owner()

    return {
      owner,
    }
  }

  async getUri({
    liquidSplitAddress,
  }: {
    liquidSplitAddress: string
  }): Promise<{
    uri: string
  }> {
    validateAddress(liquidSplitAddress)
    this._requirePublicClient()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitAddress)
    const uri = await liquidSplitContract.read.uri([BigInt(0)]) // Expects an argument, but it's not actually used

    return {
      uri,
    }
  }

  async getScaledPercentBalanceOf({
    liquidSplitAddress,
    address,
  }: {
    liquidSplitAddress: string
    address: string
  }): Promise<{
    scaledPercentBalance: number
  }> {
    validateAddress(liquidSplitAddress)
    validateAddress(address)
    this._requirePublicClient()

    const liquidSplitContract = this._getLiquidSplitContract(liquidSplitAddress)
    const scaledPercentBalance =
      await liquidSplitContract.read.scaledPercentBalanceOf([
        getAddress(address),
      ])

    return {
      scaledPercentBalance,
    }
  }

  async getNftImage({
    liquidSplitAddress,
  }: {
    liquidSplitAddress: string
  }): Promise<{
    image: string
  }> {
    validateAddress(liquidSplitAddress)
    this._requirePublicClient()

    const { uri } = await this.getUri({
      liquidSplitAddress,
    })
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

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class LiquidSplitGasEstimates extends LiquidSplitTransactions {
  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
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

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface LiquidSplitGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(LiquidSplitGasEstimates, [BaseGasEstimatesMixin])

class LiquidSplitCallData extends LiquidSplitTransactions {
  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
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
