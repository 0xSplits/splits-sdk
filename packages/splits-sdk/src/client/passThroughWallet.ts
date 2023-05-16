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
import { TransactionFailedError, UnsupportedChainIdError } from '../errors'
import { applyMixins } from './mixin'
import type {
  CallData,
  CreatePassThroughWalletConfig,
  PassThroughTokensConfig,
  PassThroughWalletPauseConfig,
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
  }: CreatePassThroughWalletConfig): Promise<TransactionFormat> {
    validateAddress(owner)
    validateAddress(passThrough)
    if (this._shouldRequireSigner) this._requireSigner()

    const createPassThroughWalletResult =
      await this._passThroughWalletFactoryContract.createPassThroughWallet([
        owner,
        paused,
        passThrough,
      ])

    return createPassThroughWalletResult
  }

  protected async _passThroughTokensTransaction({
    passThroughWalletId,
    tokens,
  }: PassThroughTokensConfig): Promise<TransactionFormat> {
    validateAddress(passThroughWalletId)
    tokens.map((token) => validateAddress(token))
    if (this._shouldRequireSigner) this._requireSigner()

    const passThroughWalletContract =
      this._getPassThroughWalletContract(passThroughWalletId)
    const passThroughTokensResult =
      await passThroughWalletContract.passThroughTokens(tokens)

    return passThroughTokensResult
  }

  protected async _setPausedTransaction({
    passThroughWalletId,
    newPauseState,
    transactionOverrides = {},
  }: PassThroughWalletPauseConfig): Promise<TransactionFormat> {
    validateAddress(passThroughWalletId)
    if (this._shouldRequireSigner) this._requireSigner()
    // TODO: require signer is owner

    const passThroughWalletContract =
      this._getPassThroughWalletContract(passThroughWalletId)
    const pauseResult = await passThroughWalletContract.setPaused(
      newPauseState,
      transactionOverrides,
    )

    return pauseResult
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
      setPaused: [passThroughWalletInterface.getEventTopic('SetPaused')],
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

  async setPaused(args: PassThroughWalletPauseConfig): Promise<BigNumber> {
    const gasEstimate = await this._setPausedTransaction(args)
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

  async setPaused(args: PassThroughWalletPauseConfig): Promise<CallData> {
    const callData = await this._setPausedTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
