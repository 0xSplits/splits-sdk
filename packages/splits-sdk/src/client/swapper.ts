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
  ADDRESS_ZERO,
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
  SwapperSetScaledOfferFactorOverridesConfig,
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
import { GqlSwapper } from '../subgraph/types'
import { SWAPPER_QUERY, protectedFormatSwapper } from '../subgraph'
import { swapperFactoryAbi } from '../constants/abi/swapperFactory'
import { uniV3SwapAbi } from '../constants/abi/uniV3Swap'
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
import { swapperAbi } from '../constants/abi/swapper'

class SwapperTransactions extends BaseTransactions {
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

    const result = await this._executeContractFunction({
      contractAddress: getSwapperFactoryAddress(this._chainId),
      contractAbi: swapperFactoryAbi,
      functionName: 'createSwapper',
      functionArgs: [
        owner,
        paused,
        beneficiary,
        tokenToBeneficiary,
        formattedOracleParams,
        formattedDefaultScaledOfferFactor,
        formattedScaledOfferFactorOverrides,
      ],
      transactionOverrides,
    })

    return result
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
      : this._signer?.account
      ? this._signer.account.address
      : ADDRESS_ZERO
    validateAddress(excessRecipientAddress)

    // TO DO: handle bad swapper id/no metadata found
    const { tokenToBeneficiary } = await this.getSwapperMetadata({
      swapperId,
    })

    const swapRecipient = getUniV3SwapAddress(this._chainId)
    const deadlineTime = Math.floor(Date.now() / 1000) + transactionTimeLimit

    const quoteParams: ContractQuoteParams[] = []
    const exactInputParams: ContractSwapperExactInputParams[] = []
    inputAssets.map((inputAsset) => {
      quoteParams.push([
        [inputAsset.token, tokenToBeneficiary.address],
        inputAsset.amountIn,
        ADDRESS_ZERO,
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

    const result = await this._executeContractFunction({
      contractAddress: getUniV3SwapAddress(this._chainId),
      contractAbi: uniV3SwapAbi,
      functionName: 'initFlash',
      functionArgs: [swapperId, flashParams],
      transactionOverrides,
    })

    return result
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

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperId),
      contractAbi: swapperAbi,
      functionName: 'setBeneficiary',
      functionArgs: [beneficiary],
      transactionOverrides,
    })

    return result
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

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperId),
      contractAbi: swapperAbi,
      functionName: 'setTokenToBeneficiary',
      functionArgs: [tokenToBeneficiary],
      transactionOverrides,
    })

    return result
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

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperId),
      contractAbi: swapperAbi,
      functionName: 'setOracle',
      functionArgs: [oracle],
      transactionOverrides,
    })

    return result
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

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperId),
      contractAbi: swapperAbi,
      functionName: 'setDefaultScaledOfferFactor',
      functionArgs: [formattedDefaultScaledOfferFactor],
      transactionOverrides,
    })

    return result
  }

  protected async _setScaledOfferFactorOverridesTransaction({
    swapperId,
    scaledOfferFactorOverrides,
    transactionOverrides = {},
  }: SwapperSetScaledOfferFactorOverridesConfig): Promise<TransactionFormat> {
    validateAddress(swapperId)
    validateScaledOfferFactorOverrides(scaledOfferFactorOverrides)
    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireOwner(swapperId)
    }

    const formattedScaledOfferFactorOverrides =
      getFormattedScaledOfferFactorOverrides(scaledOfferFactorOverrides)

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperId),
      contractAbi: swapperAbi,
      functionName: 'setPairScaledOfferFactors',
      functionArgs: [formattedScaledOfferFactorOverrides],
      transactionOverrides,
    })

    return result
  }

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

    const formattedCalls = calls.map((callData) => {
      return [callData.to, callData.value, callData.data]
    })

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperId),
      contractAbi: swapperAbi,
      functionName: 'execCalls',
      functionArgs: [formattedCalls],
      transactionOverrides,
    })

    return result
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

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperId),
      contractAbi: swapperAbi,
      functionName: 'setPaused',
      functionArgs: [paused],
      transactionOverrides,
    })

    return result
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
    const owner = await swapperContract.read.owner()
    // TODO: how to get rid of this, needed for typescript check
    if (!this._signer?.account) throw new Error()

    const signerAddress = this._signer.account.address

    if (owner !== signerAddress)
      throw new InvalidAuthError(
        `Action only available to the swapper owner. Swapper id: ${swapperId}, owner: ${owner}, signer: ${signerAddress}`,
      )
  }

  protected _getUniV3SwapContract() {
    return getContract({
      address: getUniV3SwapAddress(this._chainId),
      abi: uniV3SwapAbi,
      publicClient: this._provider,
    })
  }

  protected _getSwapperContract(swapper: string) {
    return getContract({
      address: getAddress(swapper),
      abi: swapperAbi,
      publicClient: this._provider,
    })
  }

  private _getSwapperFactoryContract() {
    return getContract({
      address: getSwapperFactoryAddress(this._chainId),
      abi: swapperFactoryAbi,
      publicClient: this._provider,
    })
  }
}

export class SwapperClient extends SwapperTransactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: SwapperCallData
  readonly estimateGas: SwapperGasEstimates

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

    if (!SWAPPER_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, SWAPPER_CHAIN_IDS)

    this.eventTopics = {
      createSwapper: [
        encodeEventTopics({
          abi: swapperFactoryAbi,
          eventName: 'CreateSwapper',
        })[0],
      ],
      uniV3FlashSwap: [
        encodeEventTopics({
          abi: swapperAbi,
          eventName: 'Flash',
        })[0],
      ],
      execCalls: [
        encodeEventTopics({
          abi: swapperAbi,
          eventName: 'ExecCalls',
        })[0],
      ],
      setPaused: [
        encodeEventTopics({
          abi: swapperAbi,
          eventName: 'SetPaused',
        })[0],
      ],
      setBeneficiary: [
        encodeEventTopics({
          abi: swapperAbi,
          eventName: 'SetBeneficiary',
        })[0],
      ],
      setTokenToBeneficiary: [
        encodeEventTopics({
          abi: swapperAbi,
          eventName: 'SetTokenToBeneficiary',
        })[0],
      ],
      setOracle: [
        encodeEventTopics({
          abi: swapperAbi,
          eventName: 'SetOracle',
        })[0],
      ],
      setDefaultScaledOfferFactor: [
        encodeEventTopics({
          abi: swapperAbi,
          eventName: 'SetDefaultScaledOfferFactor',
        })[0],
      ],
      setScaledOfferFactorOverrides: [
        encodeEventTopics({
          abi: swapperAbi,
          eventName: 'SetPairScaledOfferFactors',
        })[0],
      ],
    }

    this.callData = new SwapperCallData({
      chainId,
      publicClient,
      ensProvider,
      account,
      includeEnsNames,
    })
    this.estimateGas = new SwapperGasEstimates({
      chainId,
      publicClient,
      ensProvider,
      account,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreateSwapperTransaction(
    createSwapperArgs: CreateSwapperConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._createSwapperTransaction(createSwapperArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async createSwapper(createSwapperArgs: CreateSwapperConfig): Promise<{
    swapperId: Address
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } =
      await this.submitCreateSwapperTransaction(createSwapperArgs)
    const events = await getTransactionEvents(
      this._provider,
      txHash,
      this.eventTopics.createSwapper,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      const log = decodeEventLog({
        abi: swapperFactoryAbi,
        data: event.data,
        topics: event.topics,
      })
      return {
        swapperId: log.args.swapper,
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async submitUniV3FlashSwapTransaction(
    flashArgs: UniV3FlashSwapConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._uniV3FlashSwapTransaction(flashArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async uniV3FlashSwap(flashArgs: UniV3FlashSwapConfig): Promise<{
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } = await this.submitUniV3FlashSwapTransaction(flashArgs)
    const events = await getTransactionEvents(
      this._provider,
      txHash,
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
    txHash: Hash
  }> {
    const txHash = await this._execCallsTransaction(callArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async execCalls(callArgs: SwapperExecCallsConfig): Promise<{
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } = await this.submitExecCallsTransaction(callArgs)
    const events = await getTransactionEvents(
      this._provider,
      txHash,
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
    txHash: Hash
  }> {
    const txHash = await this._setPausedTransaction(pauseArgs)
    if (!this._isContractTransaction(txHash)) throw new Error('Invalid reponse')

    return { txHash }
  }

  async setPaused(pauseArgs: SwapperPauseConfig): Promise<{
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } = await this.submitSetPausedTransaction(pauseArgs)
    const events = await getTransactionEvents(
      this._provider,
      txHash,
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
    txHash: Hash
  }> {
    const txHash = await this._setBeneficiaryTransaction(args)
    if (!this._isContractTransaction(txHash)) throw new Error('Invalid reponse')

    return { txHash }
  }

  async setBeneficiary(args: SwapperSetBeneficiaryConfig): Promise<{
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } = await this.submitSetBeneficiaryTransaction(args)
    const events = await getTransactionEvents(
      this._provider,
      txHash,
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
    txHash: Hash
  }> {
    const txHash = await this._setTokenToBeneficiaryTransaction(args)
    if (!this._isContractTransaction(txHash)) throw new Error('Invalid reponse')

    return { txHash }
  }

  async setTokenToBeneficiary(
    args: SwapperSetTokenToBeneficiaryConfig,
  ): Promise<{
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } = await this.submitSetTokenToBeneficiaryTransaction(args)
    const events = await getTransactionEvents(
      this._provider,
      txHash,
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
    txHash: Hash
  }> {
    const txHash = await this._setOracleTransaction(args)
    if (!this._isContractTransaction(txHash)) throw new Error('Invalid reponse')

    return { txHash }
  }

  async setOracle(args: SwapperSetOracleConfig): Promise<{
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } = await this.submitSetOracleTransaction(args)
    const events = await getTransactionEvents(
      this._provider,
      txHash,
      this.eventTopics.setOracle,
    )
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
    txHash: Hash
  }> {
    const txHash = await this._setDefaultScaledOfferFactorTransaction(args)
    if (!this._isContractTransaction(txHash)) throw new Error('Invalid reponse')

    return { txHash }
  }

  async setDefaultScaledOfferFactor(
    args: SwapperSetDefaultScaledOfferFactorConfig,
  ): Promise<{
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } =
      await this.submitSetDefaultScaledOfferFactorTransaction(args)
    const events = await getTransactionEvents(
      this._provider,
      txHash,
      this.eventTopics.setDefaultScaledOfferFactor,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitSetScaledOfferFactorOverridesTransaction(
    args: SwapperSetScaledOfferFactorOverridesConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._setScaledOfferFactorOverridesTransaction(args)
    if (!this._isContractTransaction(txHash)) throw new Error('Invalid reponse')

    return { txHash }
  }

  async setScaledOfferFactorOverrides(
    args: SwapperSetScaledOfferFactorOverridesConfig,
  ): Promise<{
    event: Log
  }> {
    this._requireProvider()
    if (!this._provider) throw new Error()

    const { txHash } =
      await this.submitSetScaledOfferFactorOverridesTransaction(args)
    const events = await getTransactionEvents(
      this._provider,
      txHash,
      this.eventTopics.setScaledOfferFactorOverrides,
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
    const beneficiary = await swapperContract.read.beneficiary()

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
    const tokenToBeneficiary = await swapperContract.read.tokenToBeneficiary()

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
    const oracle = await swapperContract.read.oracle()

    return {
      oracle,
    }
  }

  async getDefaultScaledOfferFactor({
    swapperId,
  }: {
    swapperId: string
  }): Promise<{
    defaultScaledOfferFactor: number
  }> {
    validateAddress(swapperId)
    this._requireProvider()

    const swapperContract = this._getSwapperContract(swapperId)
    const defaultScaledOfferFactor =
      await swapperContract.read.defaultScaledOfferFactor()

    return {
      defaultScaledOfferFactor,
    }
  }

  async getScaledOfferFactorOverrides({
    swapperId,
    quotePairs,
  }: {
    swapperId: string
    quotePairs: {
      base: string
      quote: string
    }[]
  }): Promise<{
    scaledOfferFactorOverrides: number[]
  }> {
    validateAddress(swapperId)
    quotePairs.map((quotePair) => {
      validateAddress(quotePair.base)
      validateAddress(quotePair.quote)
    })
    this._requireProvider()

    const formattedQuotePairs = quotePairs.map((quotePair) => {
      return {
        base: getAddress(quotePair.base),
        quote: getAddress(quotePair.quote),
      }
    })

    const swapperContract = this._getSwapperContract(swapperId)
    const scaledOfferFactorOverrides =
      await swapperContract.read.getPairScaledOfferFactors([
        formattedQuotePairs,
      ])

    return {
      scaledOfferFactorOverrides: scaledOfferFactorOverrides.slice(),
    }
  }
}

applyMixins(SwapperClient, [BaseClientMixin])

class SwapperGasEstimates extends SwapperTransactions {
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

  async createSwapper(createSwapperArgs: CreateSwapperConfig): Promise<bigint> {
    const gasEstimate = await this._createSwapperTransaction(createSwapperArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async uniV3FlashSwap(flashArgs: UniV3FlashSwapConfig): Promise<bigint> {
    const gasEstimate = await this._uniV3FlashSwapTransaction(flashArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async execCalls(callArgs: SwapperExecCallsConfig): Promise<bigint> {
    const gasEstimate = await this._execCallsTransaction(callArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setPaused(args: SwapperPauseConfig): Promise<bigint> {
    const gasEstimate = await this._setPausedTransaction(args)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setBeneficiary(args: SwapperSetBeneficiaryConfig): Promise<bigint> {
    const gasEstimate = await this._setBeneficiaryTransaction(args)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setTokenToBeneficiary(
    args: SwapperSetTokenToBeneficiaryConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._setTokenToBeneficiaryTransaction(args)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setOracle(args: SwapperSetOracleConfig): Promise<bigint> {
    const gasEstimate = await this._setOracleTransaction(args)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setDefaultScaledOfferFactor(
    args: SwapperSetDefaultScaledOfferFactorConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._setDefaultScaledOfferFactorTransaction(args)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setScaledOfferFactorOverrides(
    args: SwapperSetScaledOfferFactorOverridesConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._setScaledOfferFactorOverridesTransaction(args)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

applyMixins(SwapperGasEstimates, [BaseGasEstimatesMixin])

class SwapperCallData extends SwapperTransactions {
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

  async setScaledOfferFactorOverrides(
    args: SwapperSetScaledOfferFactorOverridesConfig,
  ): Promise<CallData> {
    const callData = await this._setScaledOfferFactorOverridesTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
