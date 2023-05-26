import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { Contract, ContractTransaction, Event } from '@ethersproject/contracts'

import PASS_THROUGH_WALLET_FACTORY_ARTIFACT from '../artifacts/contracts/PassThroughWalletFactory/PassThroughWalletFactory.json'
import PASS_THROUGH_WALLET_ARTIFACT from '../artifacts/contracts/PassThroughWallet/PassThroughWallet.json'

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
import { getTransactionEvents } from '../utils'
import { validateAddress } from '../utils/validation'
import { ContractCallData } from '../utils/multicall'

const passThroughWalletFactoryInterface = new Interface(
  PASS_THROUGH_WALLET_FACTORY_ARTIFACT.abi,
)
const passThroughWalletInterface = new Interface(
  PASS_THROUGH_WALLET_ARTIFACT.abi,
)

class PassThroughWalletTransactions extends BaseTransactions {
  private readonly _passThroughWalletFactoryContract:
    | ContractCallData
    | Contract
    | Contract['estimateGas']

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

    this._passThroughWalletFactoryContract =
      this._getPassThroughWalletFactoryContract()
  }

  protected async _createPassThroughWalletTransaction({
    owner,
    paused = false,
    passThrough,
    transactionOverrides = {},
  }: CreatePassThroughWalletConfig): Promise<TransactionFormat> {
    validateAddress(owner)
    validateAddress(passThrough)
    if (this._shouldRequireSigner) this._requireSigner()

    const createPassThroughWalletResult =
      await this._passThroughWalletFactoryContract.createPassThroughWallet(
        [owner, paused, passThrough],
        transactionOverrides,
      )

    return createPassThroughWalletResult
  }

  protected async _passThroughTokensTransaction({
    passThroughWalletId,
    tokens,
    transactionOverrides = {},
  }: PassThroughTokensConfig): Promise<TransactionFormat> {
    validateAddress(passThroughWalletId)
    tokens.map((token) => validateAddress(token))
    if (this._shouldRequireSigner) this._requireSigner()

    const passThroughWalletContract =
      this._getPassThroughWalletContract(passThroughWalletId)
    const passThroughTokensResult =
      await passThroughWalletContract.passThroughTokens(
        tokens,
        transactionOverrides,
      )

    return passThroughTokensResult
  }

  protected async _setPassThroughTransaction({
    passThroughWalletId,
    passThrough,
    transactionOverrides = {},
  }: SetPassThroughConfig): Promise<TransactionFormat> {
    validateAddress(passThroughWalletId)
    validateAddress(passThrough)
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(passThroughWalletId)
    }

    const passThroughWalletContract =
      this._getPassThroughWalletContract(passThroughWalletId)
    const setPassThroughResult = await passThroughWalletContract.setPassThrough(
      passThrough,
      transactionOverrides,
    )

    return setPassThroughResult
  }

  protected async _setPausedTransaction({
    passThroughWalletId,
    paused,
    transactionOverrides = {},
  }: PassThroughWalletPauseConfig): Promise<TransactionFormat> {
    validateAddress(passThroughWalletId)
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(passThroughWalletId)
    }

    const passThroughWalletContract =
      this._getPassThroughWalletContract(passThroughWalletId)
    const pauseResult = await passThroughWalletContract.setPaused(
      paused,
      transactionOverrides,
    )

    return pauseResult
  }

  protected async _execCallsTransaction({
    passThroughWalletId,
    calls,
    transactionOverrides = {},
  }: PassThroughWalletExecCallsConfig): Promise<TransactionFormat> {
    validateAddress(passThroughWalletId)
    calls.map((callData) => validateAddress(callData.to))
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(passThroughWalletId)
    }

    const passThroughWalletContract =
      this._getPassThroughWalletContract(passThroughWalletId)
    const formattedCalls = calls.map((callData) => {
      return [callData.to, callData.value, callData.data]
    })
    const execCallsResult = await passThroughWalletContract.execCalls(
      formattedCalls,
      transactionOverrides,
    )

    return execCallsResult
  }

  private async _requireOwner(passThroughWalletId: string) {
    const passThroughWalletContract =
      this._getPassThroughWalletContract(passThroughWalletId)
    const owner = await passThroughWalletContract.owner()
    // TODO: how to get rid of this, needed for typescript check
    if (!this._signer) throw new Error()

    const signerAddress = await this._signer.getAddress()

    if (owner !== signerAddress)
      throw new InvalidAuthError(
        `Action only available to the pass through wallet owner. Pass through wallet id: ${passThroughWalletId}, owner: ${owner}, signer: ${signerAddress}`,
      )
  }

  protected _getPassThroughWalletContract(passThroughWallet: string) {
    return this._getTransactionContract<Contract, Contract['estimateGas']>(
      passThroughWallet,
      PASS_THROUGH_WALLET_ARTIFACT.abi,
      passThroughWalletInterface,
    )
  }

  private _getPassThroughWalletFactoryContract() {
    return this._getTransactionContract<Contract, Contract['estimateGas']>(
      getPassThroughWalletFactoryAddress(this._chainId),
      PASS_THROUGH_WALLET_FACTORY_ARTIFACT.abi,
      passThroughWalletFactoryInterface,
    )
  }
}

export class PassThroughWalletClient extends PassThroughWalletTransactions {
  readonly eventTopics: { [key: string]: string[] }
  readonly callData: PassThroughWalletCallData
  readonly estimateGas: PassThroughWalletGasEstimates

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

    if (!PASS_THROUGH_WALLET_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, PASS_THROUGH_WALLET_CHAIN_IDS)

    this.eventTopics = {
      createPassThroughWallet: [
        passThroughWalletFactoryInterface.getEventTopic(
          'CreatePassThroughWallet',
        ),
      ],
      passThroughTokens: [
        passThroughWalletInterface.getEventTopic('PassThrough'),
      ],
      setPassThrough: [
        passThroughWalletInterface.getEventTopic('SetPassThrough'),
      ],
      setPaused: [passThroughWalletInterface.getEventTopic('SetPaused')],
      execCalls: [passThroughWalletInterface.getEventTopic('ExecCalls')],
    }

    this.callData = new PassThroughWalletCallData({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
    this.estimateGas = new PassThroughWalletGasEstimates({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreatePassThroughWalletTransaction({
    owner,
    paused,
    passThrough,
  }: CreatePassThroughWalletConfig): Promise<{
    tx: ContractTransaction
  }> {
    const createPassThroughWalletTx =
      await this._createPassThroughWalletTransaction({
        owner,
        paused,
        passThrough,
      })
    if (!this._isContractTransaction(createPassThroughWalletTx))
      throw new Error('Invalid response')

    return { tx: createPassThroughWalletTx }
  }

  async createPassThroughWallet({
    owner,
    paused,
    passThrough,
  }: CreatePassThroughWalletConfig): Promise<{
    passThroughWalletId: string
    event: Event
  }> {
    const { tx: createPassThroughWalletTx } =
      await this.submitCreatePassThroughWalletTransaction({
        owner,
        paused,
        passThrough,
      })
    const events = await getTransactionEvents(
      createPassThroughWalletTx,
      this.eventTopics.createPassThroughWallet,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event && event.args)
      return {
        passThroughWalletId: event.args.passThroughWallet,
        event,
      }

    throw new TransactionFailedError()
  }

  async submitPassThroughTokensTransaction({
    passThroughWalletId,
    tokens,
  }: PassThroughTokensConfig): Promise<{
    tx: ContractTransaction
  }> {
    const passThroughTokensTx = await this._passThroughTokensTransaction({
      passThroughWalletId,
      tokens,
    })
    if (!this._isContractTransaction(passThroughTokensTx))
      throw new Error('Invalid response')

    return { tx: passThroughTokensTx }
  }

  async passThroughTokens({
    passThroughWalletId,
    tokens,
  }: PassThroughTokensConfig): Promise<{
    event: Event
  }> {
    const { tx: passThroughTokensTx } =
      await this.submitPassThroughTokensTransaction({
        passThroughWalletId,
        tokens,
      })
    const events = await getTransactionEvents(
      passThroughTokensTx,
      this.eventTopics.passThroughTokens,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitSetPassThroughTransaction(args: SetPassThroughConfig): Promise<{
    tx: ContractTransaction
  }> {
    const tx = await this._setPassThroughTransaction(args)
    if (!this._isContractTransaction(tx)) throw new Error('Invalid response')

    return { tx }
  }

  async setPassThrough(args: SetPassThroughConfig): Promise<{ event: Event }> {
    const { tx } = await this.submitSetPassThroughTransaction(args)
    const events = await getTransactionEvents(
      tx,
      this.eventTopics.setPassThrough,
    )
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
    tx: ContractTransaction
  }> {
    const pauseTx = await this._setPausedTransaction(pauseArgs)
    if (!this._isContractTransaction(pauseTx))
      throw new Error('Invalid reponse')

    return { tx: pauseTx }
  }

  async setPaused(pauseArgs: PassThroughWalletPauseConfig): Promise<{
    event: Event
  }> {
    const { tx: pauseTx } = await this.submitSetPausedTransaction(pauseArgs)
    const events = await getTransactionEvents(
      pauseTx,
      this.eventTopics.setPaused,
    )
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
    tx: ContractTransaction
  }> {
    const tx = await this._execCallsTransaction(args)
    if (!this._isContractTransaction(tx)) throw new Error('Invalid response')

    return { tx }
  }

  async execCalls(args: PassThroughWalletExecCallsConfig): Promise<{
    event: Event
  }> {
    const { tx } = await this.submitExecCallsTransaction(args)
    const events = await getTransactionEvents(tx, this.eventTopics.execCalls)
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  // Read actions
  async getPassThrough({
    passThroughWalletId,
  }: {
    passThroughWalletId: string
  }): Promise<{
    passThrough: string
  }> {
    validateAddress(passThroughWalletId)
    this._requireProvider()

    const passThroughWalletContract =
      this._getPassThroughWalletContract(passThroughWalletId)
    const passThrough = await passThroughWalletContract.passThrough()

    return {
      passThrough,
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PassThroughWalletClient extends BaseClientMixin {}
applyMixins(PassThroughWalletClient, [BaseClientMixin])

class PassThroughWalletGasEstimates extends PassThroughWalletTransactions {
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

  async createPassThroughWallet({
    owner,
    paused,
    passThrough,
  }: CreatePassThroughWalletConfig): Promise<BigNumber> {
    const gasEstimate = await this._createPassThroughWalletTransaction({
      owner,
      paused,
      passThrough,
    })
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async passThroughTokens({
    passThroughWalletId,
    tokens,
  }: PassThroughTokensConfig): Promise<BigNumber> {
    const gasEstimate = await this._passThroughTokensTransaction({
      passThroughWalletId,
      tokens,
    })
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setPassThrough(args: SetPassThroughConfig): Promise<BigNumber> {
    const gasEstimate = await this._setPassThroughTransaction(args)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setPaused(args: PassThroughWalletPauseConfig): Promise<BigNumber> {
    const gasEstimate = await this._setPausedTransaction(args)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async execCalls(args: PassThroughWalletExecCallsConfig): Promise<BigNumber> {
    const gasEstimate = await this._execCallsTransaction(args)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PassThroughWalletGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(PassThroughWalletGasEstimates, [BaseGasEstimatesMixin])

class PassThroughWalletCallData extends PassThroughWalletTransactions {
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

  async createPassThroughWallet({
    owner,
    paused,
    passThrough,
  }: CreatePassThroughWalletConfig): Promise<CallData> {
    const callData = await this._createPassThroughWalletTransaction({
      owner,
      paused,
      passThrough,
    })
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async passThroughTokens({
    passThroughWalletId,
    tokens,
  }: PassThroughTokensConfig): Promise<CallData> {
    const callData = await this._passThroughTokensTransaction({
      passThroughWalletId,
      tokens,
    })
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
