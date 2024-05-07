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
  zeroAddress,
} from 'viem'

import {
  BaseClientMixin,
  BaseGasEstimatesMixin,
  BaseTransactions,
} from './base'
import {
  TransactionType,
  WATERFALL_CHAIN_IDS,
  getWaterfallFactoryAddress,
} from '../constants'
import { waterfallFactoryAbi } from '../constants/abi/waterfallFactory'
import { waterfallAbi } from '../constants/abi/waterfall'
import {
  InvalidArgumentError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import { applyMixins } from './mixin'
import type {
  CallData,
  CreateWaterfallConfig,
  RecoverNonWaterfallFundsConfig,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
  WaterfallFundsConfig,
  WithdrawWaterfallPullFundsConfig,
} from '../types'
import { getTrancheRecipientsAndSizes } from '../utils'
import { validateAddress, validateWaterfallTranches } from '../utils/validation'

type WaterfallAbi = typeof waterfallAbi

class WaterfallTransactions extends BaseTransactions {
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

  protected async _createWaterfallModuleTransaction({
    token,
    tranches,
    nonWaterfallRecipient = zeroAddress,
    transactionOverrides = {},
  }: CreateWaterfallConfig): Promise<TransactionFormat> {
    validateAddress(token)
    validateAddress(nonWaterfallRecipient)
    validateWaterfallTranches(tranches)
    this._requirePublicClient()
    if (!this._publicClient) throw new Error('Public client required')
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const formattedToken = getAddress(token)
    const formattedNonWaterfallRecipient = getAddress(nonWaterfallRecipient)

    const [recipients, trancheSizes] = await getTrancheRecipientsAndSizes(
      this._chainId,
      formattedToken,
      tranches,
      this._publicClient,
    )

    const result = await this._executeContractFunction({
      contractAddress: getWaterfallFactoryAddress(this._chainId),
      contractAbi: waterfallFactoryAbi,
      functionName: 'createWaterfallModule',
      functionArgs: [
        formattedToken,
        formattedNonWaterfallRecipient,
        recipients,
        trancheSizes,
      ],
      transactionOverrides,
    })

    return result
  }

  protected async _waterfallFundsTransaction({
    waterfallModuleAddress,
    usePull = false,
    transactionOverrides = {},
  }: WaterfallFundsConfig): Promise<TransactionFormat> {
    validateAddress(waterfallModuleAddress)
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getAddress(waterfallModuleAddress),
      contractAbi: waterfallAbi,
      functionName: usePull ? 'waterfallFundsPull' : 'waterfallFunds',
      transactionOverrides,
    })

    return result
  }

  protected async _recoverNonWaterfallFundsTransaction({
    waterfallModuleAddress,
    token,
    recipient = zeroAddress,
    transactionOverrides = {},
  }: RecoverNonWaterfallFundsConfig): Promise<TransactionFormat> {
    validateAddress(waterfallModuleAddress)
    validateAddress(token)
    validateAddress(recipient)
    this._requireWalletClient()
    await this._validateRecoverTokensWaterfallData({
      waterfallModuleAddress,
      token,
      recipient,
    })

    const result = await this._executeContractFunction({
      contractAddress: getAddress(waterfallModuleAddress),
      contractAbi: waterfallAbi,
      functionName: 'recoverNonWaterfallFunds',
      functionArgs: [token, recipient],
      transactionOverrides,
    })

    return result
  }

  protected async _withdrawPullFundsTransaction({
    waterfallModuleAddress,
    address,
    transactionOverrides = {},
  }: WithdrawWaterfallPullFundsConfig): Promise<TransactionFormat> {
    validateAddress(waterfallModuleAddress)
    validateAddress(address)
    this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getAddress(waterfallModuleAddress),
      contractAbi: waterfallAbi,
      functionName: 'withdraw',
      functionArgs: [address],
      transactionOverrides,
    })

    return result
  }

  private async _validateRecoverTokensWaterfallData({
    waterfallModuleAddress,
    token,
    recipient,
  }: {
    waterfallModuleAddress: string
    token: string
    recipient: string
  }) {
    this._requireDataClient()
    const waterfallMetadata = await this._dataClient!.getWaterfallMetadata({
      chainId: this._chainId,
      waterfallModuleAddress,
    })

    if (token.toLowerCase() === waterfallMetadata.token.address.toLowerCase())
      throw new InvalidArgumentError(
        `You must call recover tokens with a token other than the given waterfall's primary token. Primary token: ${waterfallMetadata.token.address}, given token: ${token}`,
      )

    if (
      waterfallMetadata.nonWaterfallRecipient &&
      waterfallMetadata.nonWaterfallRecipient.address !== zeroAddress
    ) {
      if (
        recipient.toLowerCase() !==
        waterfallMetadata.nonWaterfallRecipient.address.toLowerCase()
      )
        throw new InvalidArgumentError(
          `The passed in recipient (${recipient}) must match the non waterfall recipient for this module: ${waterfallMetadata.nonWaterfallRecipient}`,
        )
    } else {
      const foundRecipient = waterfallMetadata.tranches.reduce(
        (acc, tranche) => {
          if (acc) return acc

          return (
            tranche.recipient.address.toLowerCase() === recipient.toLowerCase()
          )
        },
        false,
      )
      if (!foundRecipient)
        throw new InvalidArgumentError(
          `You must pass in a valid recipient address for the given waterfall. Address ${recipient} not found in any tranche for waterfall ${waterfallModuleAddress}.`,
        )
    }
  }

  protected _getWaterfallContract(
    waterfallModule: string,
  ): GetContractReturnType<WaterfallAbi, PublicClient<Transport, Chain>> {
    return getContract({
      address: getAddress(waterfallModule),
      abi: waterfallAbi,
      // @ts-expect-error v1/v2 viem support
      client: this._publicClient,
      publicClient: this._publicClient,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class WaterfallClient extends WaterfallTransactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: WaterfallCallData
  readonly estimateGas: WaterfallGasEstimates

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

    if (!WATERFALL_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, WATERFALL_CHAIN_IDS)

    this.eventTopics = {
      createWaterfallModule: [
        encodeEventTopics({
          abi: waterfallFactoryAbi,
          eventName: 'CreateWaterfallModule',
        })[0],
      ],
      waterfallFunds: [
        encodeEventTopics({
          abi: waterfallAbi,
          eventName: 'WaterfallFunds',
        })[0],
      ],
      recoverNonWaterfallFunds: [
        encodeEventTopics({
          abi: waterfallAbi,
          eventName: 'RecoverNonWaterfallFunds',
        })[0],
      ],
      withdrawPullFunds: [
        encodeEventTopics({
          abi: waterfallAbi,
          eventName: 'Withdrawal',
        })[0],
      ],
    }

    this.callData = new WaterfallCallData({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.estimateGas = new WaterfallGasEstimates({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreateWaterfallModuleTransaction(
    createWaterfallArgs: CreateWaterfallConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash =
      await this._createWaterfallModuleTransaction(createWaterfallArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async createWaterfallModule(
    createWaterfallArgs: CreateWaterfallConfig,
  ): Promise<{
    waterfallModuleAddress: string
    event: Log
  }> {
    const { txHash } =
      await this.submitCreateWaterfallModuleTransaction(createWaterfallArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.createWaterfallModule,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      const log = decodeEventLog({
        abi: waterfallFactoryAbi,
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

  async submitWaterfallFundsTransaction(
    waterfallFundsArgs: WaterfallFundsConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._waterfallFundsTransaction(waterfallFundsArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async waterfallFunds(waterfallFundsArgs: WaterfallFundsConfig): Promise<{
    event: Log
  }> {
    const { txHash } =
      await this.submitWaterfallFundsTransaction(waterfallFundsArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.waterfallFunds,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitRecoverNonWaterfallFundsTransaction(
    recoverFundsArgs: RecoverNonWaterfallFundsConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash =
      await this._recoverNonWaterfallFundsTransaction(recoverFundsArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async recoverNonWaterfallFunds(
    recoverFundsArgs: RecoverNonWaterfallFundsConfig,
  ): Promise<{
    event: Log
  }> {
    const { txHash } =
      await this.submitRecoverNonWaterfallFundsTransaction(recoverFundsArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.recoverNonWaterfallFunds,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async submitWithdrawPullFundsTransaction(
    withdrawFundsArgs: WithdrawWaterfallPullFundsConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._withdrawPullFundsTransaction(withdrawFundsArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async withdrawPullFunds(
    withdrawFundsArgs: WithdrawWaterfallPullFundsConfig,
  ): Promise<{
    event: Log
  }> {
    const { txHash } =
      await this.submitWithdrawPullFundsTransaction(withdrawFundsArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.withdrawPullFunds,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  // Read actions
  async getDistributedFunds({
    waterfallModuleAddress,
  }: {
    waterfallModuleAddress: string
  }): Promise<{
    distributedFunds: bigint
  }> {
    validateAddress(waterfallModuleAddress)
    this._requirePublicClient()

    const contract = this._getWaterfallContract(waterfallModuleAddress)
    const distributedFunds = await contract.read.distributedFunds()

    return {
      distributedFunds,
    }
  }

  async getFundsPendingWithdrawal({
    waterfallModuleAddress,
  }: {
    waterfallModuleAddress: string
  }): Promise<{
    fundsPendingWithdrawal: bigint
  }> {
    validateAddress(waterfallModuleAddress)
    this._requirePublicClient()

    const waterfallContract = this._getWaterfallContract(waterfallModuleAddress)
    const fundsPendingWithdrawal =
      await waterfallContract.read.fundsPendingWithdrawal()

    return {
      fundsPendingWithdrawal,
    }
  }

  async getTranches({
    waterfallModuleAddress,
  }: {
    waterfallModuleAddress: string
  }): Promise<{
    recipients: Address[]
    thresholds: bigint[]
  }> {
    validateAddress(waterfallModuleAddress)
    this._requirePublicClient()

    const waterfallContract = this._getWaterfallContract(waterfallModuleAddress)
    const [recipients, thresholds] = await waterfallContract.read.getTranches()

    return {
      recipients: recipients.slice(),
      thresholds: thresholds.slice(),
    }
  }

  async getNonWaterfallRecipient({
    waterfallModuleAddress,
  }: {
    waterfallModuleAddress: string
  }): Promise<{
    nonWaterfallRecipient: Address
  }> {
    validateAddress(waterfallModuleAddress)
    this._requirePublicClient()

    const waterfallContract = this._getWaterfallContract(waterfallModuleAddress)
    const nonWaterfallRecipient =
      await waterfallContract.read.nonWaterfallRecipient()

    return {
      nonWaterfallRecipient,
    }
  }

  async getToken({
    waterfallModuleAddress,
  }: {
    waterfallModuleAddress: string
  }): Promise<{
    token: Address
  }> {
    validateAddress(waterfallModuleAddress)
    this._requirePublicClient()

    const waterfallContract = this._getWaterfallContract(waterfallModuleAddress)
    const token = await waterfallContract.read.token()

    return {
      token,
    }
  }

  async getPullBalance({
    waterfallModuleAddress,
    address,
  }: {
    waterfallModuleAddress: string
    address: string
  }): Promise<{
    pullBalance: bigint
  }> {
    validateAddress(waterfallModuleAddress)
    this._requirePublicClient()

    const waterfallContract = this._getWaterfallContract(waterfallModuleAddress)
    const pullBalance = await waterfallContract.read.getPullBalance([
      getAddress(address),
    ])

    return {
      pullBalance,
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface WaterfallClient extends BaseClientMixin {}
applyMixins(WaterfallClient, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class WaterfallGasEstimates extends WaterfallTransactions {
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

  async createWaterfallModule(
    createWaterfallArgs: CreateWaterfallConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._createWaterfallModuleTransaction(createWaterfallArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async waterfallFunds(
    waterfallFundsArgs: WaterfallFundsConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._waterfallFundsTransaction(waterfallFundsArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async recoverNonWaterfallFunds(
    recoverFundsArgs: RecoverNonWaterfallFundsConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._recoverNonWaterfallFundsTransaction(recoverFundsArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async withdrawPullFunds(
    withdrawArgs: WithdrawWaterfallPullFundsConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._withdrawPullFundsTransaction(withdrawArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface WaterfallGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(WaterfallGasEstimates, [BaseGasEstimatesMixin])

class WaterfallCallData extends WaterfallTransactions {
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

  async createWaterfallModule(args: CreateWaterfallConfig): Promise<CallData> {
    const callData = await this._createWaterfallModuleTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async waterfallFunds(args: WaterfallFundsConfig): Promise<CallData> {
    const callData = await this._waterfallFundsTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async recoverNonWaterfallFunds(
    args: RecoverNonWaterfallFundsConfig,
  ): Promise<CallData> {
    const callData = await this._recoverNonWaterfallFundsTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async withdrawPullFunds(
    args: WithdrawWaterfallPullFundsConfig,
  ): Promise<CallData> {
    const callData = await this._withdrawPullFundsTransaction(args)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
