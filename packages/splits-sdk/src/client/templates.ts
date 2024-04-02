import {
  Address,
  Hash,
  Hex,
  Log,
  decodeEventLog,
  encodeEventTopics,
  getAddress,
  zeroAddress,
} from 'viem'

import {
  BaseClientMixin,
  BaseGasEstimatesMixin,
  BaseTransactions,
} from './base'
import {
  TransactionType,
  getRecoupAddress,
  TEMPLATES_CHAIN_IDS,
  getDiversifierFactoryAddress,
  DIVERSIFIER_CHAIN_IDS,
} from '../constants'
import { recoupFactoryAbi } from '../constants/abi/recoupFactory'
import { diversifierFactoryAbi } from '../constants/abi/diversifierFactory'
import { TransactionFailedError, UnsupportedChainIdError } from '../errors'
import { applyMixins } from './mixin'
import type {
  CallData,
  CreateDiversifierConfig,
  CreateRecoupConfig,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
} from '../types'
import {
  getRecoupTranchesAndSizes,
  getDiversifierRecipients,
  getFormattedOracleParams,
} from '../utils'
import {
  validateAddress,
  validateDiversifierRecipients,
  validateOracleParams,
  validateRecoupNonWaterfallRecipient,
  validateRecoupTranches,
} from '../utils/validation'

class TemplatesTransactions extends BaseTransactions {
  constructor({
    transactionType,
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    apiConfig,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
  }

  protected async _createRecoupTransaction({
    token,
    tranches,
    nonWaterfallRecipientAddress = zeroAddress,
    nonWaterfallRecipientTrancheIndex = undefined,
    transactionOverrides = {},
  }: CreateRecoupConfig): Promise<TransactionFormat> {
    validateAddress(token)
    validateAddress(nonWaterfallRecipientAddress)
    validateRecoupTranches(tranches)
    validateRecoupNonWaterfallRecipient(
      tranches.length,
      nonWaterfallRecipientAddress,
      nonWaterfallRecipientTrancheIndex,
    )

    this._requirePublicClient()
    if (!this._publicClient) throw new Error('Public client required')
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const [recoupTranches, trancheSizes] = await getRecoupTranchesAndSizes(
      this._chainId,
      getAddress(token),
      tranches,
      this._publicClient,
    )

    const formattedNonWaterfallRecipientTrancheIndex =
      nonWaterfallRecipientTrancheIndex === undefined
        ? recoupTranches.length
        : nonWaterfallRecipientTrancheIndex

    const result = await this._executeContractFunction({
      contractAddress: getRecoupAddress(this._chainId),
      contractAbi: recoupFactoryAbi,
      functionName: 'createRecoup',
      functionArgs: [
        token,
        nonWaterfallRecipientAddress,
        formattedNonWaterfallRecipientTrancheIndex,
        recoupTranches,
        trancheSizes,
      ],
      transactionOverrides,
    })

    return result
  }

  protected async _createDiversifierTransaction({
    owner,
    paused = false,
    oracleParams,
    recipients,
    transactionOverrides = {},
  }: CreateDiversifierConfig): Promise<TransactionFormat> {
    if (!DIVERSIFIER_CHAIN_IDS.includes(this._chainId))
      throw new UnsupportedChainIdError(this._chainId, DIVERSIFIER_CHAIN_IDS)

    validateAddress(owner)
    validateOracleParams(oracleParams)
    validateDiversifierRecipients(recipients)

    this._requirePublicClient()
    if (!this._publicClient) throw new Error('Public client required')
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const diversifierRecipients = getDiversifierRecipients(recipients)
    const formattedOracleParams = getFormattedOracleParams(oracleParams)

    const result = await this._executeContractFunction({
      contractAddress: getDiversifierFactoryAddress(this._chainId),
      contractAbi: diversifierFactoryAbi,
      functionName: 'createDiversifier',
      functionArgs: [
        [owner, paused, formattedOracleParams, diversifierRecipients],
      ],
      transactionOverrides,
    })

    return result
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class TemplatesClient extends TemplatesTransactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: TemplatesCallData
  readonly estimateGas: TemplatesGasEstimates

  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    apiConfig,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })

    if (!TEMPLATES_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, TEMPLATES_CHAIN_IDS)

    this.eventTopics = {
      // TODO: add others here? create waterfall, create split, etc.
      createRecoup: [
        encodeEventTopics({
          abi: recoupFactoryAbi,
          eventName: 'CreateRecoup',
        })[0],
      ],
      createDiversifier: [
        encodeEventTopics({
          abi: diversifierFactoryAbi,
          eventName: 'CreateDiversifier',
        })[0],
      ],
    }

    this.callData = new TemplatesCallData({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.estimateGas = new TemplatesGasEstimates({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreateRecoupTransaction(
    createRecoupArgs: CreateRecoupConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._createRecoupTransaction(createRecoupArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async createRecoup(createRecoupArgs: CreateRecoupConfig): Promise<{
    waterfallModuleAddress: Address
    event: Log
  }> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } =
      await this.submitCreateRecoupTransaction(createRecoupArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.createRecoup,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      const log = decodeEventLog({
        abi: recoupFactoryAbi,
        data: event.data,
        topics: event.topics,
      })
      return {
        waterfallModuleAddress: log.args.waterfallModule,
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async submitCreateDiversifierTransaction(
    createDiversifierArgs: CreateDiversifierConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._createDiversifierTransaction(
      createDiversifierArgs,
    )
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async createDiversifier(
    createDiversifierArgs: CreateDiversifierConfig,
  ): Promise<{
    passThroughWalletAddress: Address
    event: Log
  }> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } = await this.submitCreateDiversifierTransaction(
      createDiversifierArgs,
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.createDiversifier,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      const log = decodeEventLog({
        abi: diversifierFactoryAbi,
        data: event.data,
        topics: event.topics,
      })
      return {
        passThroughWalletAddress: log.args.diversifier,
        event,
      }
    }

    throw new TransactionFailedError()
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface TemplatesClient extends BaseClientMixin {}
applyMixins(TemplatesClient, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class TemplatesGasEstimates extends TemplatesTransactions {
  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    apiConfig,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
  }

  async createRecoup(createRecoupArgs: CreateRecoupConfig): Promise<bigint> {
    const gasEstimate = await this._createRecoupTransaction(createRecoupArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async createDiversifier(
    createDiversifierArgs: CreateDiversifierConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._createDiversifierTransaction(
      createDiversifierArgs,
    )
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface TemplatesGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(TemplatesGasEstimates, [BaseGasEstimatesMixin])

class TemplatesCallData extends TemplatesTransactions {
  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    apiConfig,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
  }

  async createRecoup(createRecoupArgs: CreateRecoupConfig): Promise<CallData> {
    const callData = await this._createRecoupTransaction(createRecoupArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async createDiversifier(
    createDiversifierArgs: CreateDiversifierConfig,
  ): Promise<CallData> {
    const callData = await this._createDiversifierTransaction(
      createDiversifierArgs,
    )
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
