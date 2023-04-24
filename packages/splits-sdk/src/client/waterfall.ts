import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { ContractTransaction, Event } from '@ethersproject/contracts'

import WATERFALL_MODULE_FACTORY_ARTIFACT from '../artifacts/contracts/WaterfallModuleFactory/WaterfallModuleFactory.json'
import WATERFALL_MODULE_ARTIFACT from '../artifacts/contracts/WaterfallModule/WaterfallModule.json'

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
  getTransactionEvents,
  getTrancheRecipientsAndSizes,
  addWaterfallEnsNames,
  getTokenData,
} from '../utils'
import { validateAddress, validateTranches } from '../utils/validation'
import type { WaterfallModuleFactory as WaterfallModuleFactoryType } from '../typechain/WaterfallModuleFactory'
import type { WaterfallModule as WaterfallModuleType } from '../typechain/WaterfallModule'
import { ContractCallData } from '../utils/multicall'

const waterfallModuleFactoryInterface = new Interface(
  WATERFALL_MODULE_FACTORY_ARTIFACT.abi,
)
const waterfallModuleInterface = new Interface(WATERFALL_MODULE_ARTIFACT.abi)

class WaterfallTransactions extends BaseTransactions {
  private readonly _waterfallModuleFactoryContract:
    | ContractCallData
    | WaterfallModuleFactoryType
    | WaterfallModuleFactoryType['estimateGas']

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

    this._waterfallModuleFactoryContract = this._getWaterfallFactoryContract()
  }

  protected async _createWaterfallModuleTransaction({
    token,
    tranches,
    nonWaterfallRecipient = AddressZero,
    transactionOverrides = {},
  }: CreateWaterfallConfig): Promise<TransactionFormat> {
    validateAddress(token)
    validateAddress(nonWaterfallRecipient)
    validateTranches(tranches)
    this._requireProvider()
    if (!this._provider) throw new Error('Provider required')
    if (this._shouldRequireSigner) this._requireSigner()

    const [recipients, trancheSizes] = await getTrancheRecipientsAndSizes(
      this._chainId,
      token,
      tranches,
      this._provider,
    )
    const createWaterfallResult =
      await this._waterfallModuleFactoryContract.createWaterfallModule(
        token,
        nonWaterfallRecipient,
        recipients,
        trancheSizes,
        transactionOverrides,
      )

    return createWaterfallResult
  }

  protected async _waterfallFundsTransaction({
    waterfallModuleId,
    usePull = false,
    transactionOverrides = {},
  }: WaterfallFundsConfig): Promise<TransactionFormat> {
    validateAddress(waterfallModuleId)
    if (this._shouldRequireSigner) this._requireSigner()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const waterfallFundsResult = usePull
      ? await waterfallContract.waterfallFundsPull(transactionOverrides)
      : await waterfallContract.waterfallFunds(transactionOverrides)

    return waterfallFundsResult
  }

  protected async _recoverNonWaterfallFundsTransaction({
    waterfallModuleId,
    token,
    recipient = AddressZero,
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

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const recoverFundsResult = await waterfallContract.recoverNonWaterfallFunds(
      token,
      recipient,
      transactionOverrides,
    )

    return recoverFundsResult
  }

  protected async _withdrawPullFundsTransaction({
    waterfallModuleId,
    address,
    transactionOverrides = {},
  }: WithdrawWaterfallPullFundsConfig): Promise<TransactionFormat> {
    validateAddress(waterfallModuleId)
    validateAddress(address)
    this._requireSigner()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const withdrawResult = await waterfallContract.withdraw(
      address,
      transactionOverrides,
    )

    return withdrawResult
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
    this._requireProvider()
    if (!this._provider) throw new Error()

    const tokenData = await getTokenData(
      this._chainId,
      gqlWaterfallModule.token.id,
      this._provider,
    )

    const waterfallModule = protectedFormatWaterfallModule(
      gqlWaterfallModule,
      tokenData.symbol,
      tokenData.decimals,
    )
    if (this._includeEnsNames) {
      await addWaterfallEnsNames(
        this._ensProvider ?? this._provider,
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
      waterfallMetadata.nonWaterfallRecipient !== AddressZero
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
    return this._getTransactionContract<
      WaterfallModuleType,
      WaterfallModuleType['estimateGas']
    >(waterfallModule, WATERFALL_MODULE_ARTIFACT.abi, waterfallModuleInterface)
  }

  private _getWaterfallFactoryContract() {
    return this._getTransactionContract<
      WaterfallModuleFactoryType,
      WaterfallModuleFactoryType['estimateGas']
    >(
      getWaterfallFactoryAddress(this._chainId),
      WATERFALL_MODULE_FACTORY_ARTIFACT.abi,
      waterfallModuleFactoryInterface,
    )
  }
}

export class WaterfallClient extends WaterfallTransactions {
  readonly eventTopics: { [key: string]: string[] }
  readonly callData: WaterfallCallData
  readonly estimateGas: WaterfallGasEstimates

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

    if (!WATERFALL_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, WATERFALL_CHAIN_IDS)

    this.eventTopics = {
      createWaterfallModule: [
        waterfallModuleFactoryInterface.getEventTopic('CreateWaterfallModule'),
      ],
      waterfallFunds: [
        waterfallModuleInterface.getEventTopic('WaterfallFunds'),
      ],
      recoverNonWaterfallFunds: [
        waterfallModuleInterface.getEventTopic('RecoverNonWaterfallFunds'),
      ],
      withdrawPullFunds: [waterfallModuleInterface.getEventTopic('Withdrawal')],
    }

    this.callData = new WaterfallCallData({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
    this.estimateGas = new WaterfallGasEstimates({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreateWaterfallModuleTransaction(
    createWaterfallArgs: CreateWaterfallConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const createWaterfallTx = await this._createWaterfallModuleTransaction(
      createWaterfallArgs,
    )
    if (!this._isContractTransaction(createWaterfallTx))
      throw new Error('Invalid response')

    return { tx: createWaterfallTx }
  }

  async createWaterfallModule(
    createWaterfallArgs: CreateWaterfallConfig,
  ): Promise<{
    waterfallModuleId: string
    event: Event
  }> {
    const { tx: createWaterfallTx } =
      await this.submitCreateWaterfallModuleTransaction(createWaterfallArgs)
    const events = await getTransactionEvents(
      createWaterfallTx,
      this.eventTopics.createWaterfallModule,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event && event.args)
      return {
        waterfallModuleId: event.args.waterfallModule,
        event,
      }

    throw new TransactionFailedError()
  }

  async submitWaterfallFundsTransaction(
    waterfallFundsArgs: WaterfallFundsConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const waterfallFundsTx = await this._waterfallFundsTransaction(
      waterfallFundsArgs,
    )
    if (!this._isContractTransaction(waterfallFundsTx))
      throw new Error('Invalid response')

    return { tx: waterfallFundsTx }
  }

  async waterfallFunds(waterfallFundsArgs: WaterfallFundsConfig): Promise<{
    event: Event
  }> {
    const { tx: waterfallFundsTx } = await this.submitWaterfallFundsTransaction(
      waterfallFundsArgs,
    )
    const events = await getTransactionEvents(
      waterfallFundsTx,
      this.eventTopics.waterfallFunds,
    )
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
    tx: ContractTransaction
  }> {
    const recoverFundsTx = await this._recoverNonWaterfallFundsTransaction(
      recoverFundsArgs,
    )
    if (!this._isContractTransaction(recoverFundsTx))
      throw new Error('Invalid response')

    return { tx: recoverFundsTx }
  }

  async recoverNonWaterfallFunds(
    recoverFundsArgs: RecoverNonWaterfallFundsConfig,
  ): Promise<{
    event: Event
  }> {
    const { tx: recoverFundsTx } =
      await this.submitRecoverNonWaterfallFundsTransaction(recoverFundsArgs)
    const events = await getTransactionEvents(
      recoverFundsTx,
      this.eventTopics.recoverNonWaterfallFunds,
    )
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
    tx: ContractTransaction
  }> {
    const withdrawTx = await this._withdrawPullFundsTransaction(
      withdrawFundsArgs,
    )
    if (!this._isContractTransaction(withdrawTx))
      throw new Error('Invalid response')

    return { tx: withdrawTx }
  }

  async withdrawPullFunds(
    withdrawFundsArgs: WithdrawWaterfallPullFundsConfig,
  ): Promise<{
    event: Event
  }> {
    const { tx: withdrawTx } = await this.submitWithdrawPullFundsTransaction(
      withdrawFundsArgs,
    )
    const events = await getTransactionEvents(
      withdrawTx,
      this.eventTopics.withdrawPullFunds,
    )
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
    distributedFunds: BigNumber
  }> {
    validateAddress(waterfallModuleId)
    this._requireProvider()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const distributedFunds = await waterfallContract.distributedFunds()

    return {
      distributedFunds,
    }
  }

  async getFundsPendingWithdrawal({
    waterfallModuleId,
  }: {
    waterfallModuleId: string
  }): Promise<{
    fundsPendingWithdrawal: BigNumber
  }> {
    validateAddress(waterfallModuleId)
    this._requireProvider()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const fundsPendingWithdrawal =
      await waterfallContract.fundsPendingWithdrawal()

    return {
      fundsPendingWithdrawal,
    }
  }

  async getTranches({
    waterfallModuleId,
  }: {
    waterfallModuleId: string
  }): Promise<{
    recipients: string[]
    thresholds: BigNumber[]
  }> {
    validateAddress(waterfallModuleId)
    this._requireProvider()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const [recipients, thresholds] = await waterfallContract.getTranches()

    return {
      recipients,
      thresholds,
    }
  }

  async getNonWaterfallRecipient({
    waterfallModuleId,
  }: {
    waterfallModuleId: string
  }): Promise<{
    nonWaterfallRecipient: string
  }> {
    validateAddress(waterfallModuleId)
    this._requireProvider()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const nonWaterfallRecipient =
      await waterfallContract.nonWaterfallRecipient()

    return {
      nonWaterfallRecipient,
    }
  }

  async getToken({
    waterfallModuleId,
  }: {
    waterfallModuleId: string
  }): Promise<{
    token: string
  }> {
    validateAddress(waterfallModuleId)
    this._requireProvider()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const token = await waterfallContract.token()

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
    pullBalance: BigNumber
  }> {
    validateAddress(waterfallModuleId)
    this._requireProvider()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const pullBalance = await waterfallContract.getPullBalance(address)

    return {
      pullBalance,
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WaterfallClient extends BaseClientMixin {}
applyMixins(WaterfallClient, [BaseClientMixin])

class WaterfallGasEstimates extends WaterfallTransactions {
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

  async createWaterfallModule(
    createWaterfallArgs: CreateWaterfallConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._createWaterfallModuleTransaction(
      createWaterfallArgs,
    )
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async waterfallFunds(
    waterfallFundsArgs: WaterfallFundsConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._waterfallFundsTransaction(
      waterfallFundsArgs,
    )
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async recoverNonWaterfallFunds(
    recoverFundsArgs: RecoverNonWaterfallFundsConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._recoverNonWaterfallFundsTransaction(
      recoverFundsArgs,
    )
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async withdrawPullFunds(
    withdrawArgs: WithdrawWaterfallPullFundsConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._withdrawPullFundsTransaction(withdrawArgs)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface WaterfallGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(WaterfallGasEstimates, [BaseGasEstimatesMixin])

class WaterfallCallData extends WaterfallTransactions {
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

  async createWaterfallModule({
    token,
    tranches,
    nonWaterfallRecipient = AddressZero,
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
    recipient = AddressZero,
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
