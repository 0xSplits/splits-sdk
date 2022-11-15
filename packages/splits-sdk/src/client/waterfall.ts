import BaseClient from './base'
import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Contract, ContractTransaction, Event } from '@ethersproject/contracts'

import WATERFALL_MODULE_FACTORY_ARTIFACT from '../artifacts/contracts/WaterfallModuleFactory/WaterfallModuleFactory.json'
import WATERFALL_MODULE_ARTIFACT from '../artifacts/contracts/WaterfallModule/WaterfallModule.json'
import {
  WATERFALL_CHAIN_IDS,
  WATERFALL_MODULE_FACTORY_ADDRESS,
} from '../constants'
import {
  AccountNotFoundError,
  InvalidArgumentError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import {
  protectedFormatWaterfallModule,
  WATERFALL_MODULE_QUERY,
} from '../subgraph'
import type { GqlWaterfallModule } from '../subgraph/types'
import type {
  CreateWaterfallConfig,
  RecoverNonWaterfallFundsConfig,
  SplitsClientConfig,
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

const waterfallModuleFactoryInterface = new Interface(
  WATERFALL_MODULE_FACTORY_ARTIFACT.abi,
)
const waterfallModuleInterface = new Interface(WATERFALL_MODULE_ARTIFACT.abi)

export default class WaterfallClient extends BaseClient {
  private readonly _waterfallModuleFactory: WaterfallModuleFactoryType
  readonly eventTopics: { [key: string]: string[] }

  constructor({
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })

    if (WATERFALL_CHAIN_IDS.includes(chainId)) {
      this._waterfallModuleFactory = new Contract(
        WATERFALL_MODULE_FACTORY_ADDRESS,
        waterfallModuleFactoryInterface,
        provider,
      ) as WaterfallModuleFactoryType
    } else throw new UnsupportedChainIdError(chainId, WATERFALL_CHAIN_IDS)

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
  }

  // Write actions
  async submitCreateWaterfallModuleTransaction({
    token,
    tranches,
    nonWaterfallRecipient = AddressZero,
  }: CreateWaterfallConfig): Promise<{
    tx: ContractTransaction
  }> {
    validateAddress(token)
    validateAddress(nonWaterfallRecipient)
    validateTranches(tranches)
    this._requireSigner()
    if (!this._waterfallModuleFactory) throw new Error()

    const [recipients, trancheSizes] = await getTrancheRecipientsAndSizes(
      this._chainId,
      token,
      tranches,
      this._waterfallModuleFactory.provider,
    )
    const createWaterfallTx = await this._waterfallModuleFactory
      .connect(this._signer)
      .createWaterfallModule(
        token,
        nonWaterfallRecipient,
        recipients,
        trancheSizes,
      )

    return { tx: createWaterfallTx }
  }

  async createWaterfallModule({
    token,
    tranches,
    nonWaterfallRecipient,
  }: CreateWaterfallConfig): Promise<{
    waterfallModuleId: string
    event: Event
  }> {
    const { tx: createWaterfallTx } =
      await this.submitCreateWaterfallModuleTransaction({
        token,
        tranches,
        nonWaterfallRecipient,
      })
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

  async submitWaterfallFundsTransaction({
    waterfallModuleId,
    usePull = false,
  }: WaterfallFundsConfig): Promise<{
    tx: ContractTransaction
  }> {
    validateAddress(waterfallModuleId)
    this._requireSigner()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const waterfallFundsTx = usePull
      ? await waterfallContract.waterfallFundsPull()
      : await waterfallContract.waterfallFunds()

    return { tx: waterfallFundsTx }
  }

  async waterfallFunds({
    waterfallModuleId,
    usePull,
  }: WaterfallFundsConfig): Promise<{
    event: Event
  }> {
    const { tx: waterfallFundsTx } = await this.submitWaterfallFundsTransaction(
      { waterfallModuleId, usePull },
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

  async submitRecoverNonWaterfallFundsTransaction({
    waterfallModuleId,
    token,
    recipient = AddressZero,
  }: RecoverNonWaterfallFundsConfig): Promise<{
    tx: ContractTransaction
  }> {
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
    const recoverFundsTx = await waterfallContract.recoverNonWaterfallFunds(
      token,
      recipient,
    )

    return { tx: recoverFundsTx }
  }

  async recoverNonWaterfallFunds({
    waterfallModuleId,
    token,
    recipient,
  }: RecoverNonWaterfallFundsConfig): Promise<{
    event: Event
  }> {
    const { tx: recoverFundsTx } =
      await this.submitRecoverNonWaterfallFundsTransaction({
        waterfallModuleId,
        token,
        recipient,
      })
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

  async submitWithdrawPullFundsTransaction({
    waterfallModuleId,
    address,
  }: WithdrawWaterfallPullFundsConfig): Promise<{
    tx: ContractTransaction
  }> {
    validateAddress(waterfallModuleId)
    validateAddress(address)
    this._requireSigner()

    const waterfallContract = this._getWaterfallContract(waterfallModuleId)
    const withdrawTx = await waterfallContract.withdraw(address)

    return { tx: withdrawTx }
  }

  async withdrawPullFunds({
    waterfallModuleId,
    address,
  }: WithdrawWaterfallPullFundsConfig): Promise<{
    event: Event
  }> {
    const { tx: withdrawTx } = await this.submitWithdrawPullFundsTransaction({
      waterfallModuleId,
      address,
    })
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

  // Helper functions
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

  private _getWaterfallContract(waterfallModule: string) {
    if (!this._waterfallModuleFactory.provider && !this._signer)
      throw new Error()

    return new Contract(
      waterfallModule,
      waterfallModuleInterface,
      this._signer || this._waterfallModuleFactory.provider,
    ) as WaterfallModuleType
  }

  async formatWaterfallModule(
    gqlWaterfallModule: GqlWaterfallModule,
  ): Promise<WaterfallModule> {
    this._requireProvider()
    if (!this._waterfallModuleFactory) throw new Error()

    const tokenData = await getTokenData(
      this._chainId,
      gqlWaterfallModule.token.id,
      this._waterfallModuleFactory.provider,
    )

    const waterfallModule = protectedFormatWaterfallModule(
      gqlWaterfallModule,
      tokenData.symbol,
      tokenData.decimals,
    )
    if (this._includeEnsNames) {
      await addWaterfallEnsNames(
        this._ensProvider ?? this._waterfallModuleFactory.provider,
        waterfallModule.tranches,
      )
    }

    return waterfallModule
  }
}
