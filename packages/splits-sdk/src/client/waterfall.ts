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
  ADDRESS_ZERO,
  TransactionType,
  WATERFALL_CHAIN_IDS,
  getWaterfallFactoryAddress,
} from '../constants'
import { waterfallFactoryAbi } from '../constants/abi/waterfallFactory'
import { waterfallAbi } from '../constants/abi/waterfall'
import {
  AccountNotFoundError,
  InvalidArgumentError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import { applyMixins } from './mixin'
import {
  protectedFormatWaterfallModule,
  WATERFALL_MODULE_QUERY,
} from '../subgraph'
import type { GqlWaterfallModule } from '../subgraph/types'
import type {
  CallData,
  CreateWaterfallConfig,
  RecoverNonWaterfallFundsConfig,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
  WaterfallFundsConfig,
  WaterfallModule,
  WithdrawWaterfallPullFundsConfig,
} from '../types'
import {
  getTrancheRecipientsAndSizes,
  addWaterfallEnsNames,
  getTokenData,
} from '../utils'
import { validateAddress, validateTranches } from '../utils/validation'

class WaterfallTransactions extends BaseTransactions {
  constructor({
    transactionType,
    chainId,
    publicClient,
    ensPublicClient,
    account,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      publicClient,
      ensPublicClient,
      account,
      includeEnsNames,
    })
  }

  protected async _createWaterfallModuleTransaction({
    token,
    tranches,
    nonWaterfallRecipient = ADDRESS_ZERO,
    transactionOverrides = {},
  }: CreateWaterfallConfig): Promise<TransactionFormat> {
    validateAddress(token)
    validateAddress(nonWaterfallRecipient)
    validateTranches(tranches)
    this._requirePublicClient()
    if (!this._publicClient) throw new Error('Provider required')
    if (this._shouldRequireSigner) this._requireSigner()

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
    waterfallModuleId,
    usePull = false,
    transactionOverrides = {},
  }: WaterfallFundsConfig): Promise<TransactionFormat> {
    validateAddress(waterfallModuleId)
    if (this._shouldRequireSigner) this._requireSigner()

    const result = await this._executeContractFunction({
      contractAddress: getAddress(waterfallModuleId),
      contractAbi: waterfallAbi,
      functionName: usePull ? 'waterfallFundsPull' : 'waterfallFunds',
      transactionOverrides,
    })

    return result
  }

  protected async _recoverNonWaterfallFundsTransaction({
    waterfallModuleId,
    token,
    recipient = ADDRESS_ZERO,
    transactionOverrides = {},
  }: RecoverNonWaterfallFundsConfig): Promise<TransactionFormat> {
    validateAddress(waterfallModuleId)
    validateAddress(token)
    validateAddress(recipient)
    this._requireSigner()
    await this._validateRecoverTokensWaterfallData({
      waterfallModuleId,
      token,
      recipient,
    })

    const result = await this._executeContractFunction({
      contractAddress: getAddress(waterfallModuleId),
      contractAbi: waterfallAbi,
      functionName: 'recoverNonWaterfallFunds',
      functionArgs: [token, recipient],
      transactionOverrides,
    })

    return result
  }

  protected async _withdrawPullFundsTransaction({
    waterfallModuleId,
    address,
    transactionOverrides = {},
  }: WithdrawWaterfallPullFundsConfig): Promise<TransactionFormat> {
    validateAddress(waterfallModuleId)
    validateAddress(address)
    this._requireSigner()

    const result = await this._executeContractFunction({
      contractAddress: getAddress(waterfallModuleId),
      contractAbi: waterfallAbi,
      functionName: 'withdraw',
      functionArgs: [address],
      transactionOverrides,
    })

    return result
  }

  // Graphql read actions
  async getWaterfallMetadata({
    waterfallModuleId,
  }: {
    waterfallModuleId: string
  }): Promise<WaterfallModule> {
    validateAddress(waterfallModuleId)

    const response = await this._makeGqlRequest<{
      waterfallModule: GqlWaterfallModule
    }>(WATERFALL_MODULE_QUERY, {
      waterfallModuleId: waterfallModuleId.toLowerCase(),
    })

    if (!response.waterfallModule)
      throw new AccountNotFoundError(
        `No waterfall module found at address ${waterfallModuleId}, please confirm you have entered the correct address. There may just be a delay in subgraph indexing.`,
      )

    return await this.formatWaterfallModule(response.waterfallModule)
  }

  async formatWaterfallModule(
    gqlWaterfallModule: GqlWaterfallModule,
  ): Promise<WaterfallModule> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const tokenData = await getTokenData(
      this._chainId,
      getAddress(gqlWaterfallModule.token.id),
      this._publicClient,
    )

    const waterfallModule = protectedFormatWaterfallModule(
      gqlWaterfallModule,
      tokenData.symbol,
      tokenData.decimals,
    )
    if (this._includeEnsNames) {
      await addWaterfallEnsNames(
        this._ensPublicClient ?? this._publicClient,
        waterfallModule.tranches,
      )
    }

    return waterfallModule
  }

  private async _validateRecoverTokensWaterfallData({
    waterfallModuleId,
    token,
    recipient,
  }: {
    waterfallModuleId: string
    token: string
    recipient: string
  }) {
    const waterfallMetadata = await this.getWaterfallMetadata({
      waterfallModuleId,
    })

    if (token.toLowerCase() === waterfallMetadata.token.address.toLowerCase())
      throw new InvalidArgumentError(
        `You must call recover tokens with a token other than the given waterfall's primary token. Primary token: ${waterfallMetadata.token.address}, given token: ${token}`,
      )

    if (
      waterfallMetadata.nonWaterfallRecipient &&
      waterfallMetadata.nonWaterfallRecipient !== ADDRESS_ZERO
    ) {
      if (
        recipient.toLowerCase() !==
        waterfallMetadata.nonWaterfallRecipient.toLowerCase()
      )
        throw new InvalidArgumentError(
          `The passed in recipient (${recipient}) must match the non waterfall recipient for this module: ${waterfallMetadata.nonWaterfallRecipient}`,
        )
    } else {
      const foundRecipient = waterfallMetadata.tranches.reduce(
        (acc, tranche) => {
          if (acc) return acc

          return (
            tranche.recipientAddress.toLowerCase() === recipient.toLowerCase()
          )
        },
        false,
      )
      if (!foundRecipient)
        throw new InvalidArgumentError(
          `You must pass in a valid recipient address for the given waterfall. Address ${recipient} not found in any tranche for waterfall ${waterfallModuleId}.`,
        )
    }
  }

  protected _getWaterfallContract(waterfallModule: string) {
    return getContract({
      address: getAddress(waterfallModule),
      abi: waterfallAbi,
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
    account,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      ensPublicClient,
      account,
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
      account,
      includeEnsNames,
    })
    this.estimateGas = new WaterfallGasEstimates({
      chainId,
      publicClient,
      ensPublicClient,
      account,
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
    waterfallModuleId: string
    event: Log
  }> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

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
        waterfallModuleId: log.args.waterfallModule,
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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

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
    waterfallModuleId,
  }: {
    waterfallModuleId: string
  }): Promise<{
    distributedFunds: bigint
  }> {
    validateAddress(waterfallModuleId)
    this._requirePublicClient()

    const contract = this._getWaterfallContract(waterfallModuleId)
    const distributedFunds = await contract.read.distributedFunds()

    return {
      distributedFunds,
    }
  }

  async getFundsPendingWithdrawal({
    waterfallModuleId,
  }: {
    waterfallModuleId: string
  }): Promise<{
    fundsPendingWithdrawal: bigint
  }> {
    validateAddress(waterfallModuleId)
    this._requirePublicClient()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const fundsPendingWithdrawal =
      await waterfallContract.read.fundsPendingWithdrawal()

    return {
      fundsPendingWithdrawal,
    }
  }

  async getTranches({
    waterfallModuleId,
  }: {
    waterfallModuleId: string
  }): Promise<{
    recipients: Address[]
    thresholds: bigint[]
  }> {
    validateAddress(waterfallModuleId)
    this._requirePublicClient()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const [recipients, thresholds] = await waterfallContract.read.getTranches()

    return {
      recipients: recipients.slice(),
      thresholds: thresholds.slice(),
    }
  }

  async getNonWaterfallRecipient({
    waterfallModuleId,
  }: {
    waterfallModuleId: string
  }): Promise<{
    nonWaterfallRecipient: Address
  }> {
    validateAddress(waterfallModuleId)
    this._requirePublicClient()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const nonWaterfallRecipient =
      await waterfallContract.read.nonWaterfallRecipient()

    return {
      nonWaterfallRecipient,
    }
  }

  async getToken({
    waterfallModuleId,
  }: {
    waterfallModuleId: string
  }): Promise<{
    token: Address
  }> {
    validateAddress(waterfallModuleId)
    this._requirePublicClient()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const token = await waterfallContract.read.token()

    return {
      token,
    }
  }

  async getPullBalance({
    waterfallModuleId,
    address,
  }: {
    waterfallModuleId: string
    address: string
  }): Promise<{
    pullBalance: bigint
  }> {
    validateAddress(waterfallModuleId)
    this._requirePublicClient()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
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
    account,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      publicClient,
      ensPublicClient,
      account,
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
    account,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      chainId,
      publicClient,
      ensPublicClient,
      account,
      includeEnsNames,
    })
  }

  async createWaterfallModule({
    token,
    tranches,
    nonWaterfallRecipient = ADDRESS_ZERO,
  }: CreateWaterfallConfig): Promise<CallData> {
    const callData = await this._createWaterfallModuleTransaction({
      token,
      tranches,
      nonWaterfallRecipient,
    })
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async waterfallFunds({
    waterfallModuleId,
    usePull = false,
  }: WaterfallFundsConfig): Promise<CallData> {
    const callData = await this._waterfallFundsTransaction({
      waterfallModuleId,
      usePull,
    })
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async recoverNonWaterfallFunds({
    waterfallModuleId,
    token,
    recipient = ADDRESS_ZERO,
  }: RecoverNonWaterfallFundsConfig): Promise<CallData> {
    const callData = await this._recoverNonWaterfallFundsTransaction({
      waterfallModuleId,
      token,
      recipient,
    })
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async withdrawPullFunds({
    waterfallModuleId,
    address,
  }: WithdrawWaterfallPullFundsConfig): Promise<CallData> {
    const callData = await this._withdrawPullFundsTransaction({
      waterfallModuleId,
      address,
    })
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
