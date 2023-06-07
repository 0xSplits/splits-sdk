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
import {
  AccountNotFoundError,
  InvalidAuthError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import { applyMixins } from './mixin'
import type {
  CallData,
  ContractQuoteParams,
  ContractSwapperExactInputParams,
  CreateSwapperConfig,
  SplitsClientConfig,
  Swapper,
  SwapperExecCallsConfig,
  SwapperPauseConfig,
  SwapperSetBeneficiaryConfig,
  SwapperSetDefaultScaledOfferFactorConfig,
  SwapperSetOracleConfig,
  SwapperSetTokenToBeneficiaryConfig,
  TransactionConfig,
  TransactionFormat,
  UniV3FlashSwapConfig,
} from '../types'
import {
  addSwapperEnsNames,
  getFormattedOracleParams,
  getFormattedScaledOfferFactor,
  getFormattedScaledOfferFactorOverrides,
  getTransactionEvents,
} from '../utils'
import {
  validateAddress,
  validateOracleParams,
  validateScaledOfferFactor,
  validateScaledOfferFactorOverrides,
  validateUniV3SwapInputAssets,
} from '../utils/validation'
import { ContractCallData } from '../utils/multicall'
import { GqlSwapper } from '../subgraph/types'
import { SWAPPER_QUERY, protectedFormatSwapper } from '../subgraph'

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
    defaultScaledOfferFactorPercent,
    scaledOfferFactorOverrides,
    transactionOverrides = {},
  }: CreateSwapperConfig): Promise<TransactionFormat> {
    validateAddress(owner)
    validateAddress(beneficiary)
    validateAddress(tokenToBeneficiary)
    validateOracleParams(oracleParams)
    validateScaledOfferFactor(defaultScaledOfferFactorPercent)
    validateScaledOfferFactorOverrides(scaledOfferFactorOverrides)
    if (this._shouldRequireSigner) this._requireSigner()

    const formattedOracleParams = getFormattedOracleParams(oracleParams)
    const formattedDefaultScaledOfferFactor = getFormattedScaledOfferFactor(
      defaultScaledOfferFactorPercent,
    )
    const formattedScaledOfferFactorOverrides =
      getFormattedScaledOfferFactorOverrides(scaledOfferFactorOverrides)

    const createSwapperResult =
      await this._swapperFactoryContract.createSwapper(
        [
          owner,
          paused,
          beneficiary,
          tokenToBeneficiary,
          formattedOracleParams,
          formattedDefaultScaledOfferFactor,
          formattedScaledOfferFactorOverrides,
        ],
        transactionOverrides,
      )

    return createSwapperResult
  }

  protected async _uniV3FlashSwapTransaction({
    swapperId,
    excessRecipient,
    inputAssets,
    transactionTimeLimit = 300,
    transactionOverrides = {},
  }: UniV3FlashSwapConfig): Promise<TransactionFormat> {
    validateAddress(swapperId)
    validateUniV3SwapInputAssets(inputAssets)

    this._requireProvider()
    if (!this._provider) throw new Error('Provider required')
    if (this._shouldRequireSigner) this._requireSigner()

    const excessRecipientAddress = excessRecipient
      ? excessRecipient
      : this._signer
      ? await this._signer.getAddress()
      : AddressZero
    validateAddress(excessRecipientAddress)

    // TO DO: handle bad swapper id/no metadata found
    const { tokenToBeneficiary } = await this.getSwapperMetadata({
      swapperId,
    })

    const uniV3SwapContract = this._getUniV3SwapContract()
    const swapRecipient = getUniV3SwapAddress(this._chainId)
    const deadlineTime = Math.floor(Date.now() / 1000) + transactionTimeLimit

    const quoteParams: ContractQuoteParams[] = []
    const exactInputParams: ContractSwapperExactInputParams[] = []
    inputAssets.map((inputAsset) => {
      quoteParams.push([
        [inputAsset.token, tokenToBeneficiary.address],
        inputAsset.amountIn,
        AddressZero,
      ])
      if (inputAsset.encodedPath) {
        exactInputParams.push([
          inputAsset.encodedPath,
          swapRecipient,
          deadlineTime,
          inputAsset.amountIn,
          inputAsset.amountOutMin,
        ])
      }
    })

    const flashParams = [
      quoteParams,
      [exactInputParams, excessRecipientAddress],
    ]

    const flashResult = await uniV3SwapContract.initFlash(
      swapperId,
      flashParams,
      transactionOverrides,
    )

    return flashResult
  }

  protected async _setBeneficiaryTransaction({
    swapperId,
    beneficiary,
    transactionOverrides = {},
  }: SwapperSetBeneficiaryConfig): Promise<TransactionFormat> {
    validateAddress(swapperId)
    validateAddress(beneficiary)
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(swapperId)
    }

    const swapperContract = this._getSwapperContract(swapperId)
    const editResult = await swapperContract.setBeneficiary(
      beneficiary,
      transactionOverrides,
    )

    return editResult
  }

  protected async _setTokenToBeneficiaryTransaction({
    swapperId,
    tokenToBeneficiary,
    transactionOverrides = {},
  }: SwapperSetTokenToBeneficiaryConfig): Promise<TransactionFormat> {
    validateAddress(swapperId)
    validateAddress(tokenToBeneficiary)
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(swapperId)
    }

    const swapperContract = this._getSwapperContract(swapperId)
    const editResult = await swapperContract.setTokenToBeneficiary(
      tokenToBeneficiary,
      transactionOverrides,
    )

    return editResult
  }

  protected async _setOracleTransaction({
    swapperId,
    oracle,
    transactionOverrides = {},
  }: SwapperSetOracleConfig): Promise<TransactionFormat> {
    validateAddress(swapperId)
    validateAddress(oracle)
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(swapperId)
    }

    const swapperContract = this._getSwapperContract(swapperId)
    const editResult = await swapperContract.setOracle(
      oracle,
      transactionOverrides,
    )

    return editResult
  }

  protected async _setDefaultScaledOfferFactorTransaction({
    swapperId,
    defaultScaledOfferFactorPercent,
    transactionOverrides = {},
  }: SwapperSetDefaultScaledOfferFactorConfig): Promise<TransactionFormat> {
    validateAddress(swapperId)
    validateScaledOfferFactor(defaultScaledOfferFactorPercent)
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(swapperId)
    }

    const formattedDefaultScaledOfferFactor = getFormattedScaledOfferFactor(
      defaultScaledOfferFactorPercent,
    )

    const swapperContract = this._getSwapperContract(swapperId)
    const editResult = await swapperContract.setDefaultScaledOfferFactor(
      formattedDefaultScaledOfferFactor,
      transactionOverrides,
    )

    return editResult
  }

  // TODO: set scaled offer factor pair overrides

  protected async _execCallsTransaction({
    swapperId,
    calls,
    transactionOverrides = {},
  }: SwapperExecCallsConfig): Promise<TransactionFormat> {
    validateAddress(swapperId)
    calls.map((callData) => validateAddress(callData.to))
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(swapperId)
    }

    const swapperContract = this._getSwapperContract(swapperId)
    const formattedCalls = calls.map((callData) => {
      return [callData.to, callData.value, callData.data]
    })
    const execCallsResult = await swapperContract.execCalls(
      formattedCalls,
      transactionOverrides,
    )

    return execCallsResult
  }

  protected async _setPausedTransaction({
    swapperId,
    paused,
    transactionOverrides = {},
  }: SwapperPauseConfig): Promise<TransactionFormat> {
    validateAddress(swapperId)
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(swapperId)
    }

    const swapperContract = this._getSwapperContract(swapperId)
    const pauseResult = await swapperContract.setPaused(
      paused,
      transactionOverrides,
    )

    return pauseResult
  }

  // Graphql read actions
  async getSwapperMetadata({
    swapperId,
  }: {
    swapperId: string
  }): Promise<Swapper> {
    validateAddress(swapperId)

    const response = await this._makeGqlRequest<{
      swapper: GqlSwapper
    }>(SWAPPER_QUERY, {
      swapperId: swapperId.toLowerCase(),
    })

    if (!response.swapper)
      throw new AccountNotFoundError(
        `No swapper found at address ${swapperId}, please confirm you have entered the correct address. There may just be a delay in subgraph indexing.`,
      )

    return await this.formatSwapper(response.swapper)
  }

  async formatSwapper(gqlSwapper: GqlSwapper): Promise<Swapper> {
    const swapper = protectedFormatSwapper(gqlSwapper)
    if (this._includeEnsNames) {
      if (!this._ensProvider) throw new Error()
      await addSwapperEnsNames(this._ensProvider, swapper)
    }

    return swapper
  }

  private async _requireOwner(swapperId: string) {
    const swapperContract = this._getSwapperContract(swapperId)
    const owner = await swapperContract.owner()
    // TODO: how to get rid of this, needed for typescript check
    if (!this._signer) throw new Error()

    const signerAddress = await this._signer.getAddress()

    if (owner !== signerAddress)
      throw new InvalidAuthError(
        `Action only available to the swapper owner. Swapper id: ${swapperId}, owner: ${owner}, signer: ${signerAddress}`,
      )
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
      uniV3FlashSwap: [swapperInterface.getEventTopic('Flash')],
      execCalls: [swapperInterface.getEventTopic('ExecCalls')],
      setPaused: [swapperInterface.getEventTopic('SetPaused')],
      setBeneficiary: [swapperInterface.getEventTopic('SetBeneficiary')],
      setTokenToBeneficiary: [
        swapperInterface.getEventTopic('SetTokenToBeneficiary'),
      ],
      setOracle: [swapperInterface.getEventTopic('SetOracle')],
      setDefaultScaledOfferFactor: [
        swapperInterface.getEventTopic('SetDefaultScaledOfferFactor'),
      ],
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
    const events = await getTransactionEvents(
      flashTx,
      this.eventTopics.uniV3FlashSwap,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitExecCallsTransaction(callArgs: SwapperExecCallsConfig): Promise<{
    tx: ContractTransaction
  }> {
    const execCallsTx = await this._execCallsTransaction(callArgs)
    if (!this._isContractTransaction(execCallsTx))
      throw new Error('Invalid response')

    return { tx: execCallsTx }
  }

  async execCalls(callArgs: SwapperExecCallsConfig): Promise<{
    event: Event
  }> {
    const { tx: execCallsTx } = await this.submitExecCallsTransaction(callArgs)
    const events = await getTransactionEvents(
      execCallsTx,
      this.eventTopics.execCalls,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitSetPausedTransaction(pauseArgs: SwapperPauseConfig): Promise<{
    tx: ContractTransaction
  }> {
    const pauseTx = await this._setPausedTransaction(pauseArgs)
    if (!this._isContractTransaction(pauseTx))
      throw new Error('Invalid reponse')

    return { tx: pauseTx }
  }

  async setPaused(pauseArgs: SwapperPauseConfig): Promise<{
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

  async submitSetBeneficiaryTransaction(
    args: SwapperSetBeneficiaryConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const tx = await this._setBeneficiaryTransaction(args)
    if (!this._isContractTransaction(tx)) throw new Error('Invalid reponse')

    return { tx }
  }

  async setBeneficiary(args: SwapperSetBeneficiaryConfig): Promise<{
    event: Event
  }> {
    const { tx } = await this.submitSetBeneficiaryTransaction(args)
    const events = await getTransactionEvents(
      tx,
      this.eventTopics.setBeneficiary,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitSetTokenToBeneficiaryTransaction(
    args: SwapperSetTokenToBeneficiaryConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const tx = await this._setTokenToBeneficiaryTransaction(args)
    if (!this._isContractTransaction(tx)) throw new Error('Invalid reponse')

    return { tx }
  }

  async setTokenToBeneficiary(
    args: SwapperSetTokenToBeneficiaryConfig,
  ): Promise<{
    event: Event
  }> {
    const { tx } = await this.submitSetTokenToBeneficiaryTransaction(args)
    const events = await getTransactionEvents(
      tx,
      this.eventTopics.setTokenToBeneficiary,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitSetOracleTransaction(args: SwapperSetOracleConfig): Promise<{
    tx: ContractTransaction
  }> {
    const tx = await this._setOracleTransaction(args)
    if (!this._isContractTransaction(tx)) throw new Error('Invalid reponse')

    return { tx }
  }

  async setOracle(args: SwapperSetOracleConfig): Promise<{
    event: Event
  }> {
    const { tx } = await this.submitSetOracleTransaction(args)
    const events = await getTransactionEvents(tx, this.eventTopics.setOracle)
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitSetDefaultScaledOfferFactorTransaction(
    args: SwapperSetDefaultScaledOfferFactorConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const tx = await this._setDefaultScaledOfferFactorTransaction(args)
    if (!this._isContractTransaction(tx)) throw new Error('Invalid reponse')

    return { tx }
  }

  async setDefaultScaledOfferFactor(
    args: SwapperSetDefaultScaledOfferFactorConfig,
  ): Promise<{
    event: Event
  }> {
    const { tx } = await this.submitSetDefaultScaledOfferFactorTransaction(args)
    const events = await getTransactionEvents(
      tx,
      this.eventTopics.setDefaultScaledOfferFactor,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  // Read actions
  async getBeneficiary({ swapperId }: { swapperId: string }): Promise<{
    beneficiary: string
  }> {
    validateAddress(swapperId)
    this._requireProvider()

    const swapperContract = this._getSwapperContract(swapperId)
    const beneficiary = await swapperContract.beneficiary()

    return {
      beneficiary,
    }
  }

  async getTokenToBeneficiary({ swapperId }: { swapperId: string }): Promise<{
    tokenToBeneficiary: string
  }> {
    validateAddress(swapperId)
    this._requireProvider()

    const swapperContract = this._getSwapperContract(swapperId)
    const tokenToBeneficiary = await swapperContract.tokenToBeneficiary()

    return {
      tokenToBeneficiary,
    }
  }

  async getOracle({ swapperId }: { swapperId: string }): Promise<{
    oracle: string
  }> {
    validateAddress(swapperId)
    this._requireProvider()

    const swapperContract = this._getSwapperContract(swapperId)
    const oracle = await swapperContract.oracle()

    return {
      oracle,
    }
  }

  async getDefaultScaledOfferFactor({
    swapperId,
  }: {
    swapperId: string
  }): Promise<{
    defaultScaledOfferFactor: BigNumber
  }> {
    validateAddress(swapperId)
    this._requireProvider()

    const swapperContract = this._getSwapperContract(swapperId)
    const defaultScaledOfferFactor =
      await swapperContract.defaultScaledOfferFactor()

    return {
      defaultScaledOfferFactor,
    }
  }

  // TODO: get pair overrides
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

  async execCalls(callArgs: SwapperExecCallsConfig): Promise<BigNumber> {
    const gasEstimate = await this._execCallsTransaction(callArgs)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setPaused(args: SwapperPauseConfig): Promise<BigNumber> {
    const gasEstimate = await this._setPausedTransaction(args)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setBeneficiary(args: SwapperSetBeneficiaryConfig): Promise<BigNumber> {
    const gasEstimate = await this._setBeneficiaryTransaction(args)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setTokenToBeneficiary(
    args: SwapperSetTokenToBeneficiaryConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._setTokenToBeneficiaryTransaction(args)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setOracle(args: SwapperSetOracleConfig): Promise<BigNumber> {
    const gasEstimate = await this._setOracleTransaction(args)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setDefaultScaledOfferFactor(
    args: SwapperSetDefaultScaledOfferFactorConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._setDefaultScaledOfferFactorTransaction(args)
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

  async execCalls(callArgs: SwapperExecCallsConfig): Promise<CallData> {
    const callData = await this._execCallsTransaction(callArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async setPaused(args: SwapperPauseConfig): Promise<CallData> {
    const callData = await this._setPausedTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async setBeneficiary(args: SwapperSetBeneficiaryConfig): Promise<CallData> {
    const callData = await this._setBeneficiaryTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async setTokenToBeneficiary(
    args: SwapperSetTokenToBeneficiaryConfig,
  ): Promise<CallData> {
    const callData = await this._setTokenToBeneficiaryTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async setOracle(args: SwapperSetOracleConfig): Promise<CallData> {
    const callData = await this._setOracleTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async setDefaultScaledOfferFactor(
    args: SwapperSetDefaultScaledOfferFactorConfig,
  ): Promise<CallData> {
    const callData = await this._setDefaultScaledOfferFactorTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
