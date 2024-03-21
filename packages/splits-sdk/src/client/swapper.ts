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
  getSwapperFactoryAddress,
  SWAPPER_CHAIN_IDS,
  getUniV3SwapAddress,
  ADDRESS_ZERO,
} from '../constants'
import { swapperFactoryAbi } from '../constants/abi/swapperFactory'
import { uniV3SwapAbi } from '../constants/abi/uniV3Swap'
import { swapperAbi } from '../constants/abi/swapper'
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
  addEnsNames,
  getFormattedOracleParams,
  getFormattedScaledOfferFactor,
  getFormattedScaledOfferFactorOverrides,
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

type SwapperAbi = typeof swapperAbi
type UniV3SwapAbi = typeof uniV3SwapAbi

class SwapperTransactions extends BaseTransactions {
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
    if (this._shouldRequreWalletClient) this._requireWalletClient()

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
        [
          owner,
          paused,
          beneficiary,
          tokenToBeneficiary,
          formattedOracleParams,
          formattedDefaultScaledOfferFactor,
          formattedScaledOfferFactorOverrides,
        ],
      ],
      transactionOverrides,
    })

    return result
  }

  protected async _uniV3FlashSwapTransaction({
    swapperAddress,
    excessRecipient,
    inputAssets,
    transactionTimeLimit = 300,
    transactionOverrides = {},
  }: UniV3FlashSwapConfig): Promise<TransactionFormat> {
    validateAddress(swapperAddress)
    validateUniV3SwapInputAssets(inputAssets)

    this._requirePublicClient()
    if (!this._publicClient) throw new Error('Public client required')
    if (this._shouldRequreWalletClient) this._requireWalletClient()

    const excessRecipientAddress = excessRecipient
      ? excessRecipient
      : this._walletClient?.account
      ? this._walletClient.account.address
      : ADDRESS_ZERO
    validateAddress(excessRecipientAddress)

    // TO DO: handle bad swapper id/no metadata found
    const { tokenToBeneficiary } = await this.getSwapperMetadata({
      swapperAddress,
    })

    const swapRecipient = getUniV3SwapAddress(this._chainId)
    const deadlineTime = Math.floor(Date.now() / 1000) + transactionTimeLimit

    const quoteParams: ContractQuoteParams[] = []
    const exactInputParams: ContractSwapperExactInputParams[] = []
    inputAssets.map((inputAsset) => {
      quoteParams.push([
        [inputAsset.token, tokenToBeneficiary.address],
        inputAsset.amountIn,
        '0x',
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
      functionArgs: [swapperAddress, flashParams],
      transactionOverrides,
    })

    return result
  }

  protected async _setBeneficiaryTransaction({
    swapperAddress,
    beneficiary,
    transactionOverrides = {},
  }: SwapperSetBeneficiaryConfig): Promise<TransactionFormat> {
    validateAddress(swapperAddress)
    validateAddress(beneficiary)
    if (this._shouldRequreWalletClient) {
      this._requireWalletClient()
      await this._requireOwner(swapperAddress)
    }

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperAddress),
      contractAbi: swapperAbi,
      functionName: 'setBeneficiary',
      functionArgs: [beneficiary],
      transactionOverrides,
    })

    return result
  }

  protected async _setTokenToBeneficiaryTransaction({
    swapperAddress,
    tokenToBeneficiary,
    transactionOverrides = {},
  }: SwapperSetTokenToBeneficiaryConfig): Promise<TransactionFormat> {
    validateAddress(swapperAddress)
    validateAddress(tokenToBeneficiary)
    if (this._shouldRequreWalletClient) {
      this._requireWalletClient()
      await this._requireOwner(swapperAddress)
    }

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperAddress),
      contractAbi: swapperAbi,
      functionName: 'setTokenToBeneficiary',
      functionArgs: [tokenToBeneficiary],
      transactionOverrides,
    })

    return result
  }

  protected async _setOracleTransaction({
    swapperAddress,
    oracle,
    transactionOverrides = {},
  }: SwapperSetOracleConfig): Promise<TransactionFormat> {
    validateAddress(swapperAddress)
    validateAddress(oracle)
    if (this._shouldRequreWalletClient) {
      this._requireWalletClient()
      await this._requireOwner(swapperAddress)
    }

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperAddress),
      contractAbi: swapperAbi,
      functionName: 'setOracle',
      functionArgs: [oracle],
      transactionOverrides,
    })

    return result
  }

  protected async _setDefaultScaledOfferFactorTransaction({
    swapperAddress,
    defaultScaledOfferFactorPercent,
    transactionOverrides = {},
  }: SwapperSetDefaultScaledOfferFactorConfig): Promise<TransactionFormat> {
    validateAddress(swapperAddress)
    validateScaledOfferFactor(defaultScaledOfferFactorPercent)
    if (this._shouldRequreWalletClient) {
      this._requireWalletClient()
      await this._requireOwner(swapperAddress)
    }

    const formattedDefaultScaledOfferFactor = getFormattedScaledOfferFactor(
      defaultScaledOfferFactorPercent,
    )

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperAddress),
      contractAbi: swapperAbi,
      functionName: 'setDefaultScaledOfferFactor',
      functionArgs: [formattedDefaultScaledOfferFactor],
      transactionOverrides,
    })

    return result
  }

  protected async _setScaledOfferFactorOverridesTransaction({
    swapperAddress,
    scaledOfferFactorOverrides,
    transactionOverrides = {},
  }: SwapperSetScaledOfferFactorOverridesConfig): Promise<TransactionFormat> {
    validateAddress(swapperAddress)
    validateScaledOfferFactorOverrides(scaledOfferFactorOverrides)
    if (this._shouldRequreWalletClient) {
      this._requireWalletClient()
      await this._requireOwner(swapperAddress)
    }

    const formattedScaledOfferFactorOverrides =
      getFormattedScaledOfferFactorOverrides(scaledOfferFactorOverrides)

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperAddress),
      contractAbi: swapperAbi,
      functionName: 'setPairScaledOfferFactors',
      functionArgs: [formattedScaledOfferFactorOverrides],
      transactionOverrides,
    })

    return result
  }

  protected async _execCallsTransaction({
    swapperAddress,
    calls,
    transactionOverrides = {},
  }: SwapperExecCallsConfig): Promise<TransactionFormat> {
    validateAddress(swapperAddress)
    calls.map((callData) => validateAddress(callData.to))
    if (this._shouldRequreWalletClient) {
      this._requireWalletClient()
      await this._requireOwner(swapperAddress)
    }

    const formattedCalls = calls.map((callData) => {
      return [callData.to, callData.value, callData.data]
    })

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperAddress),
      contractAbi: swapperAbi,
      functionName: 'execCalls',
      functionArgs: [formattedCalls],
      transactionOverrides,
    })

    return result
  }

  protected async _setPausedTransaction({
    swapperAddress,
    paused,
    transactionOverrides = {},
  }: SwapperPauseConfig): Promise<TransactionFormat> {
    validateAddress(swapperAddress)
    if (this._shouldRequreWalletClient) {
      this._requireWalletClient()
      await this._requireOwner(swapperAddress)
    }

    const result = await this._executeContractFunction({
      contractAddress: getAddress(swapperAddress),
      contractAbi: swapperAbi,
      functionName: 'setPaused',
      functionArgs: [paused],
      transactionOverrides,
    })

    return result
  }

  // Graphql read actions
  async getSwapperMetadata({
    swapperAddress,
  }: {
    swapperAddress: string
  }): Promise<Swapper> {
    validateAddress(swapperAddress)
    const chainId = this._chainId

    const response = await this._makeGqlRequest<{
      swapper: GqlSwapper
    }>(SWAPPER_QUERY, {
      swapperAddress: swapperAddress.toLowerCase(),
    })

    if (!response.swapper)
      throw new AccountNotFoundError('swapper', swapperAddress, chainId)

    return await this.formatSwapper(response.swapper)
  }

  async formatSwapper(gqlSwapper: GqlSwapper): Promise<Swapper> {
    const swapper = protectedFormatSwapper(gqlSwapper)
    if (this._includeEnsNames) {
      if (!this._ensPublicClient) throw new Error()

      const ensRecipients = [swapper.beneficiary].concat(
        swapper.owner ? [swapper.owner] : [],
      )
      await addEnsNames(this._ensPublicClient, ensRecipients)
    }

    return swapper
  }

  private async _requireOwner(swapperAddress: string) {
    const swapperContract = this._getSwapperContract(swapperAddress)
    const owner = await swapperContract.read.owner()
    // TODO: how to get rid of this, needed for typescript check
    if (!this._walletClient?.account) throw new Error()

    const walletAddress = this._walletClient.account.address

    if (owner !== walletAddress)
      throw new InvalidAuthError(
        `Action only available to the swapper owner. Swapper address: ${swapperAddress}, owner: ${owner}, wallet address: ${walletAddress}`,
      )
  }

  protected _getUniV3SwapContract(): GetContractReturnType<
    UniV3SwapAbi,
    PublicClient<Transport, Chain>
  > {
    return getContract({
      address: getUniV3SwapAddress(this._chainId),
      abi: uniV3SwapAbi,
      // @ts-expect-error v1/v2 viem support
      client: this._publicClient,
      publicClient: this._publicClient,
    })
  }

  protected _getSwapperContract(
    swapper: string,
  ): GetContractReturnType<SwapperAbi, PublicClient<Transport, Chain>> {
    return getContract({
      address: getAddress(swapper),
      abi: swapperAbi,
      // @ts-expect-error v1/v2 viem support
      client: this._publicClient,
      publicClient: this._publicClient,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class SwapperClient extends SwapperTransactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: SwapperCallData
  readonly estimateGas: SwapperGasEstimates

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
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
    this.estimateGas = new SwapperGasEstimates({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
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
    swapperAddress: Address
    event: Log
  }> {
    const { txHash } =
      await this.submitCreateSwapperTransaction(createSwapperArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.createSwapper,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      const log = decodeEventLog({
        abi: swapperFactoryAbi,
        data: event.data,
        topics: event.topics,
      })
      return {
        swapperAddress: log.args.swapper,
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
    const { txHash } = await this.submitUniV3FlashSwapTransaction(flashArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.uniV3FlashSwap,
    })
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
    const { txHash } = await this.submitExecCallsTransaction(callArgs)
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
    const { txHash } = await this.submitSetBeneficiaryTransaction(args)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.setBeneficiary,
    })
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
    const { txHash } = await this.submitSetTokenToBeneficiaryTransaction(args)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.setTokenToBeneficiary,
    })
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
    const { txHash } = await this.submitSetOracleTransaction(args)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.setOracle,
    })
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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } =
      await this.submitSetDefaultScaledOfferFactorTransaction(args)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.setDefaultScaledOfferFactor,
    })
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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } =
      await this.submitSetScaledOfferFactorOverridesTransaction(args)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.setScaledOfferFactorOverrides,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  // Read actions
  async getBeneficiary({
    swapperAddress,
  }: {
    swapperAddress: string
  }): Promise<{
    beneficiary: Address
  }> {
    validateAddress(swapperAddress)
    this._requirePublicClient()

    const swapperContract = this._getSwapperContract(swapperAddress)
    const beneficiary = await swapperContract.read.beneficiary()

    return {
      beneficiary,
    }
  }

  async getTokenToBeneficiary({
    swapperAddress,
  }: {
    swapperAddress: string
  }): Promise<{
    tokenToBeneficiary: Address
  }> {
    validateAddress(swapperAddress)
    this._requirePublicClient()

    const swapperContract = this._getSwapperContract(swapperAddress)
    const tokenToBeneficiary = await swapperContract.read.tokenToBeneficiary()

    return {
      tokenToBeneficiary,
    }
  }

  async getOracle({ swapperAddress }: { swapperAddress: string }): Promise<{
    oracle: Address
  }> {
    validateAddress(swapperAddress)
    this._requirePublicClient()

    const swapperContract = this._getSwapperContract(swapperAddress)
    const oracle = await swapperContract.read.oracle()

    return {
      oracle,
    }
  }

  async getDefaultScaledOfferFactor({
    swapperAddress,
  }: {
    swapperAddress: string
  }): Promise<{
    defaultScaledOfferFactor: number
  }> {
    validateAddress(swapperAddress)
    this._requirePublicClient()

    const swapperContract = this._getSwapperContract(swapperAddress)
    const defaultScaledOfferFactor =
      await swapperContract.read.defaultScaledOfferFactor()

    return {
      defaultScaledOfferFactor,
    }
  }

  async getScaledOfferFactorOverrides({
    swapperAddress,
    quotePairs,
  }: {
    swapperAddress: string
    quotePairs: {
      base: string
      quote: string
    }[]
  }): Promise<{
    scaledOfferFactorOverrides: number[]
  }> {
    validateAddress(swapperAddress)
    quotePairs.map((quotePair) => {
      validateAddress(quotePair.base)
      validateAddress(quotePair.quote)
    })
    this._requirePublicClient()

    const formattedQuotePairs = quotePairs.map((quotePair) => {
      return {
        base: getAddress(quotePair.base),
        quote: getAddress(quotePair.quote),
      }
    })

    const swapperContract = this._getSwapperContract(swapperAddress)
    const scaledOfferFactorOverrides =
      await swapperContract.read.getPairScaledOfferFactors([
        formattedQuotePairs,
      ])

    return {
      scaledOfferFactorOverrides: scaledOfferFactorOverrides.slice(),
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface SwapperClient extends BaseClientMixin {}
applyMixins(SwapperClient, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class SwapperGasEstimates extends SwapperTransactions {
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

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface SwapperGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(SwapperGasEstimates, [BaseGasEstimatesMixin])

class SwapperCallData extends SwapperTransactions {
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
