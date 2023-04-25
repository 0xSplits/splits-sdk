import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Contract, ContractTransaction, Event } from '@ethersproject/contracts'

import SWAPPER_FACTORY_ARTIFACT from '../artifacts/contracts/SwapperFactory/SwapperFactory.json'
import SWAPPER_ARTIFACT from '../artifacts/contracts/Swapper/Swapper.json'
import UNIV3SWAP_ARTIFACT from '../artifacts/contracts/UniV3Swap/UniV3Swap.json'

import {
  BaseClientMixin,
  BaseGasEstimatesMixin,
  BaseTransactions,
} from './base'
import {
  TransactionType,
  getSwapperFactoryAddress,
  SWAPPER_CHAIN_IDS,
  getUniV3SwapAddress,
} from '../constants'
import { TransactionFailedError, UnsupportedChainIdError } from '../errors'
import { applyMixins } from './mixin'
import type {
  CallData,
  ContractQuoteParams,
  ContractSwapperExactInputParams,
  CreateSwapperConfig,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
  UniV3FlashSwapConfig,
} from '../types'
import { getFormattedOracleParams, getTransactionEvents } from '../utils'
import { validateAddress } from '../utils/validation'
import { ContractCallData } from '../utils/multicall'

const swapperFactoryInterface = new Interface(SWAPPER_FACTORY_ARTIFACT.abi)
const swapperInterface = new Interface(SWAPPER_ARTIFACT.abi)
const uniV3SwapInterface = new Interface(UNIV3SWAP_ARTIFACT.abi)

class SwapperTransactions extends BaseTransactions {
  private readonly _swapperFactoryContract:
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

    this._swapperFactoryContract = this._getSwapperFactoryContract()
  }

  protected async _createSwapperTransaction({
    owner,
    paused = false,
    beneficiary,
    tokenToBeneficiary,
    oracleParams,
  }: CreateSwapperConfig): Promise<TransactionFormat> {
    validateAddress(owner)
    validateAddress(beneficiary)
    validateAddress(tokenToBeneficiary)
    // TODO
    // validateOracleParams(oracleParams)
    if (this._shouldRequireSigner) this._requireSigner()

    const formattedOracleParams = getFormattedOracleParams(oracleParams)

    const createSwapperResult =
      await this._swapperFactoryContract.createSwapper([
        owner,
        paused,
        beneficiary,
        tokenToBeneficiary,
        formattedOracleParams,
      ])

    return createSwapperResult
  }

  protected async _uniV3FlashSwapTransaction({
    swapperId,
    outputToken, // TODO: read from graphql
    excessRecipient,
    inputAssets,
    transactionTimeLimit = 30,
  }: UniV3FlashSwapConfig): Promise<TransactionFormat> {
    validateAddress(swapperId)
    validateAddress(outputToken)
    // validateInputAssets(inputAssets) // TODO

    this._requireProvider()
    if (!this._provider) throw new Error('Provider required')
    if (this._shouldRequireSigner) this._requireSigner()

    const excessRecipientAddress = excessRecipient
      ? excessRecipient
      : this._signer
      ? await this._signer.getAddress()
      : AddressZero
    validateAddress(excessRecipientAddress)

    const uniV3SwapContract = this._getUniV3SwapContract()
    const swapRecipient = getUniV3SwapAddress(this._chainId)
    const deadlineTime = Math.floor(Date.now() / 1000) + transactionTimeLimit

    const quoteParams: ContractQuoteParams[] = []
    const exactInputParams: ContractSwapperExactInputParams[] = []
    inputAssets.map((inputAsset) => {
      quoteParams.push([
        [inputAsset.token, outputToken],
        inputAsset.amountIn,
        AddressZero,
      ])
      exactInputParams.push([
        inputAsset.encodedPath,
        swapRecipient,
        deadlineTime,
        inputAsset.amountIn,
        inputAsset.amountOutMin,
      ])
    })

    const flashParams = [
      quoteParams,
      [exactInputParams, excessRecipientAddress],
    ]

    const flashResult = await uniV3SwapContract.initFlash(
      swapperId,
      flashParams,
    )

    return flashResult
  }

  protected _getUniV3SwapContract() {
    return this._getTransactionContract<Contract, Contract['estimateGas']>(
      getUniV3SwapAddress(this._chainId),
      UNIV3SWAP_ARTIFACT.abi,
      uniV3SwapInterface,
    )
  }

  protected _getSwapperContract(swapper: string) {
    return this._getTransactionContract<Contract, Contract['estimateGas']>(
      swapper,
      SWAPPER_ARTIFACT.abi,
      swapperInterface,
    )
  }

  private _getSwapperFactoryContract() {
    return this._getTransactionContract<Contract, Contract['estimateGas']>(
      getSwapperFactoryAddress(this._chainId),
      SWAPPER_FACTORY_ARTIFACT.abi,
      swapperFactoryInterface,
    )
  }
}

export class SwapperClient extends SwapperTransactions {
  readonly eventTopics: { [key: string]: string[] }
  readonly callData: SwapperCallData
  readonly estimateGas: SwapperGasEstimates

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

    if (!SWAPPER_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, SWAPPER_CHAIN_IDS)

    this.eventTopics = {
      createSwapper: [swapperFactoryInterface.getEventTopic('CreateSwapper')],
      flash: [swapperInterface.getEventTopic('Flash')],
    }

    this.callData = new SwapperCallData({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
    this.estimateGas = new SwapperGasEstimates({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreateSwapperTransaction(
    createSwapperArgs: CreateSwapperConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const createSwapperTx = await this._createSwapperTransaction(
      createSwapperArgs,
    )
    if (!this._isContractTransaction(createSwapperTx))
      throw new Error('Invalid response')

    return { tx: createSwapperTx }
  }

  async createSwapper(createSwapperArgs: CreateSwapperConfig): Promise<{
    swapperId: string
    event: Event
  }> {
    const { tx: createSwapperTx } = await this.submitCreateSwapperTransaction(
      createSwapperArgs,
    )
    const events = await getTransactionEvents(
      createSwapperTx,
      this.eventTopics.createSwapper,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event && event.args)
      return {
        swapperId: event.args.swapper,
        event,
      }

    throw new TransactionFailedError()
  }

  async submitUniV3FlashSwapTransaction(
    flashArgs: UniV3FlashSwapConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const flashTx = await this._uniV3FlashSwapTransaction(flashArgs)
    if (!this._isContractTransaction(flashTx))
      throw new Error('Invalid response')

    return { tx: flashTx }
  }

  async uniV3FlashSwap(flashArgs: UniV3FlashSwapConfig): Promise<{
    event: Event
  }> {
    const { tx: flashTx } = await this.submitUniV3FlashSwapTransaction(
      flashArgs,
    )
    const events = await getTransactionEvents(flashTx, this.eventTopics.flash)
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SwapperClient extends BaseClientMixin {}
applyMixins(SwapperClient, [BaseClientMixin])

class SwapperGasEstimates extends SwapperTransactions {
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

  async createSwapper(
    createSwapperArgs: CreateSwapperConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._createSwapperTransaction(createSwapperArgs)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async uniV3FlashSwap(flashArgs: UniV3FlashSwapConfig): Promise<BigNumber> {
    const gasEstimate = await this._uniV3FlashSwapTransaction(flashArgs)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SwapperGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(SwapperGasEstimates, [BaseGasEstimatesMixin])

class SwapperCallData extends SwapperTransactions {
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

  async createSwapper(
    createSwapperArgs: CreateSwapperConfig,
  ): Promise<CallData> {
    const callData = await this._createSwapperTransaction(createSwapperArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async uniV3FlashSwap(flashArgs: UniV3FlashSwapConfig): Promise<CallData> {
    const callData = await this._uniV3FlashSwapTransaction(flashArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
