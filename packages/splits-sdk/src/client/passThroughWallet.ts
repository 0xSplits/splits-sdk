import {
  Address,
  Chain,
  GetContractReturnType,
  Hash,
  Hex,
  Log,
  PublicClient,
  Transport,
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
  TransactionType,
  PASS_THROUGH_WALLET_CHAIN_IDS,
  getPassThroughWalletFactoryAddress,
} from '../constants'
import { passThroughWalletFactoryAbi } from '../constants/abi/passThroughWalletFactory'
import { passThroughWalletAbi } from '../constants/abi/passThroughWallet'
import {
  InvalidAuthError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import { applyMixins } from './mixin'
import type {
  CallData,
  CreatePassThroughWalletConfig,
  PassThroughTokensConfig,
  PassThroughWalletExecCallsConfig,
  PassThroughWalletPauseConfig,
  SetPassThroughConfig,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
} from '../types'
import { validateAddress } from '../utils/validation'

type PassThroughWalletAbi = typeof passThroughWalletAbi

class PassThroughWalletTransactions extends BaseTransactions {
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

  protected async _createPassThroughWalletTransaction({
    owner,
    paused = false,
    passThrough,
    transactionOverrides = {},
  }: CreatePassThroughWalletConfig): Promise<TransactionFormat> {
    validateAddress(owner)
    validateAddress(passThrough)
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getPassThroughWalletFactoryAddress(this._chainId),
      contractAbi: passThroughWalletFactoryAbi,
      functionName: 'createPassThroughWallet',
      functionArgs: [[owner, paused, passThrough]],
      transactionOverrides,
    })

    return result
  }

  protected async _passThroughTokensTransaction({
    passThroughWalletAddress,
    tokens,
    transactionOverrides = {},
  }: PassThroughTokensConfig): Promise<TransactionFormat> {
    validateAddress(passThroughWalletAddress)
    tokens.map((token) => validateAddress(token))
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getAddress(passThroughWalletAddress),
      contractAbi: passThroughWalletAbi,
      functionName: 'passThroughTokens',
      functionArgs: [tokens],
      transactionOverrides,
    })

    return result
  }

  protected async _setPassThroughTransaction({
    passThroughWalletAddress,
    passThrough,
    transactionOverrides = {},
  }: SetPassThroughConfig): Promise<TransactionFormat> {
    validateAddress(passThroughWalletAddress)
    validateAddress(passThrough)
    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireOwner(passThroughWalletAddress)
    }

    const result = await this._executeContractFunction({
      contractAddress: getAddress(passThroughWalletAddress),
      contractAbi: passThroughWalletAbi,
      functionName: 'setPassThrough',
      functionArgs: [passThrough],
      transactionOverrides,
    })

    return result
  }

  protected async _setPausedTransaction({
    passThroughWalletAddress,
    paused,
    transactionOverrides = {},
  }: PassThroughWalletPauseConfig): Promise<TransactionFormat> {
    validateAddress(passThroughWalletAddress)
    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireOwner(passThroughWalletAddress)
    }

    const result = await this._executeContractFunction({
      contractAddress: getAddress(passThroughWalletAddress),
      contractAbi: passThroughWalletAbi,
      functionName: 'setPaused',
      functionArgs: [paused],
      transactionOverrides,
    })

    return result
  }

  protected async _execCallsTransaction({
    passThroughWalletAddress,
    calls,
    transactionOverrides = {},
  }: PassThroughWalletExecCallsConfig): Promise<TransactionFormat> {
    validateAddress(passThroughWalletAddress)
    calls.map((callData) => validateAddress(callData.to))
    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireOwner(passThroughWalletAddress)
    }

    const formattedCalls = calls.map((callData) => {
      return [callData.to, callData.value, callData.data]
    })

    const result = await this._executeContractFunction({
      contractAddress: getAddress(passThroughWalletAddress),
      contractAbi: passThroughWalletAbi,
      functionName: 'execCalls',
      functionArgs: [formattedCalls],
      transactionOverrides,
    })

    return result
  }

  private async _requireOwner(passThroughWalletAddress: string) {
    const passThroughWalletContract = this._getPassThroughWalletContract(
      passThroughWalletAddress,
    )
    const owner = await passThroughWalletContract.read.owner()
    // TODO: how to get rid of this, needed for typescript check
    if (!this._walletClient?.account) throw new Error()

    const walletAddress = this._walletClient.account?.address

    if (owner !== walletAddress)
      throw new InvalidAuthError(
        `Action only available to the pass through wallet owner. Pass through wallet address: ${passThroughWalletAddress}, owner: ${owner}, wallet address: ${walletAddress}`,
      )
  }

  protected _getPassThroughWalletContract(
    passThroughWallet: string,
  ): GetContractReturnType<
    PassThroughWalletAbi,
    PublicClient<Transport, Chain>
  > {
    return getContract({
      address: getAddress(passThroughWallet),
      abi: passThroughWalletAbi,
      publicClient: this._publicClient,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class PassThroughWalletClient extends PassThroughWalletTransactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: PassThroughWalletCallData
  readonly estimateGas: PassThroughWalletGasEstimates

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

    if (!PASS_THROUGH_WALLET_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, PASS_THROUGH_WALLET_CHAIN_IDS)

    this.eventTopics = {
      createPassThroughWallet: [
        encodeEventTopics({
          abi: passThroughWalletFactoryAbi,
          eventName: 'CreatePassThroughWallet',
        })[0],
      ],
      passThroughTokens: [
        encodeEventTopics({
          abi: passThroughWalletAbi,
          eventName: 'PassThrough',
        })[0],
      ],
      setPassThrough: [
        encodeEventTopics({
          abi: passThroughWalletAbi,
          eventName: 'SetPassThrough',
        })[0],
      ],
      setPaused: [
        encodeEventTopics({
          abi: passThroughWalletAbi,
          eventName: 'SetPaused',
        })[0],
      ],
      execCalls: [
        encodeEventTopics({
          abi: passThroughWalletAbi,
          eventName: 'ExecCalls',
        })[0],
      ],
    }

    this.callData = new PassThroughWalletCallData({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
    this.estimateGas = new PassThroughWalletGasEstimates({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreatePassThroughWalletTransaction(
    createPassThroughArgs: CreatePassThroughWalletConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._createPassThroughWalletTransaction(
      createPassThroughArgs,
    )
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async createPassThroughWallet(
    createPassThroughArgs: CreatePassThroughWalletConfig,
  ): Promise<{
    passThroughWalletAddress: Address
    event: Log
  }> {
    const { txHash } = await this.submitCreatePassThroughWalletTransaction(
      createPassThroughArgs,
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.createPassThroughWallet,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      const log = decodeEventLog({
        abi: passThroughWalletFactoryAbi,
        data: event.data,
        topics: event.topics,
      })
      return {
        passThroughWalletAddress: log.args.passThroughWallet,
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async submitPassThroughTokensTransaction(
    passThroughArgs: PassThroughTokensConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._passThroughTokensTransaction(passThroughArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async passThroughTokens(passThroughArgs: PassThroughTokensConfig): Promise<{
    event: Log
  }> {
    const { txHash } =
      await this.submitPassThroughTokensTransaction(passThroughArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.passThroughTokens,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitSetPassThroughTransaction(args: SetPassThroughConfig): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._setPassThroughTransaction(args)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async setPassThrough(args: SetPassThroughConfig): Promise<{ event: Log }> {
    const { txHash } = await this.submitSetPassThroughTransaction(args)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.setPassThrough,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitSetPausedTransaction(
    pauseArgs: PassThroughWalletPauseConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._setPausedTransaction(pauseArgs)
    if (!this._isContractTransaction(txHash)) throw new Error('Invalid reponse')

    return { txHash }
  }

  async setPaused(pauseArgs: PassThroughWalletPauseConfig): Promise<{
    event: Log
  }> {
    const { txHash } = await this.submitSetPausedTransaction(pauseArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.setPaused,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitExecCallsTransaction(
    args: PassThroughWalletExecCallsConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._execCallsTransaction(args)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async execCalls(args: PassThroughWalletExecCallsConfig): Promise<{
    event: Log
  }> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } = await this.submitExecCallsTransaction(args)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.execCalls,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  // Read actions
  async getPassThrough({
    passThroughWalletAddress,
  }: {
    passThroughWalletAddress: string
  }): Promise<{
    passThrough: string
  }> {
    validateAddress(passThroughWalletAddress)
    this._requirePublicClient()

    const passThroughWalletContract = this._getPassThroughWalletContract(
      passThroughWalletAddress,
    )
    const passThrough = await passThroughWalletContract.read.passThrough()

    return {
      passThrough,
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface PassThroughWalletClient extends BaseClientMixin {}
applyMixins(PassThroughWalletClient, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class PassThroughWalletGasEstimates extends PassThroughWalletTransactions {
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

  async createPassThroughWallet(
    args: CreatePassThroughWalletConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._createPassThroughWalletTransaction(args)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async passThroughTokens(args: PassThroughTokensConfig): Promise<bigint> {
    const gasEstimate = await this._passThroughTokensTransaction(args)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setPassThrough(args: SetPassThroughConfig): Promise<bigint> {
    const gasEstimate = await this._setPassThroughTransaction(args)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setPaused(args: PassThroughWalletPauseConfig): Promise<bigint> {
    const gasEstimate = await this._setPausedTransaction(args)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async execCalls(args: PassThroughWalletExecCallsConfig): Promise<bigint> {
    const gasEstimate = await this._execCallsTransaction(args)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface PassThroughWalletGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(PassThroughWalletGasEstimates, [BaseGasEstimatesMixin])

class PassThroughWalletCallData extends PassThroughWalletTransactions {
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

  async createPassThroughWallet(
    args: CreatePassThroughWalletConfig,
  ): Promise<CallData> {
    const callData = await this._createPassThroughWalletTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async passThroughTokens(args: PassThroughTokensConfig): Promise<CallData> {
    const callData = await this._passThroughTokensTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async setPassThrough(args: SetPassThroughConfig): Promise<CallData> {
    const callData = await this._setPassThroughTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async setPaused(args: PassThroughWalletPauseConfig): Promise<CallData> {
    const callData = await this._setPausedTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async execCalls(args: PassThroughWalletExecCallsConfig): Promise<CallData> {
    const callData = await this._execCallsTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
