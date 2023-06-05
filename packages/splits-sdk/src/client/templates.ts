import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { ContractTransaction, Event } from '@ethersproject/contracts'

import RECOUP_ARTIFACT from '../artifacts/contracts/Recoup/Recoup.json'
import DIVERSIFIER_FACTORY_ARTIFACT from '../artifacts/contracts/DiversifierFactory/DiversifierFactory.json'

import {
  BaseClientMixin,
  BaseGasEstimatesMixin,
  BaseTransactions,
} from './base'
import {
  TransactionType,
  getRecoupAddress,
  TEMPLATES_CHAIN_IDS,
  getDiversifierFactoryAddress,
  DIVERSIFIER_CHAIN_IDS,
} from '../constants'
import { TransactionFailedError, UnsupportedChainIdError } from '../errors'
import { applyMixins } from './mixin'
import type {
  CallData,
  CreateDiversifierConfig,
  CreateRecoupConfig,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
} from '../types'
import {
  getTransactionEvents,
  getRecoupTranchesAndSizes,
  getDiversifierRecipients,
  getFormattedOracleParams,
} from '../utils'
import { ContractCallData } from '../utils/multicall'
import {
  validateAddress,
  validateDiversifierRecipients,
  validateOracleParams,
  validateRecoupNonWaterfallRecipient,
  validateRecoupTranches,
} from '../utils/validation'
import type { Recoup as RecoupType } from '../typechain/Recoup'
import type { DiversifierFactory as DiversifierFactoryType } from '../typechain/DiversifierFactory'

const recoupInterface = new Interface(RECOUP_ARTIFACT.abi)
const diversifierFactoryInterface = new Interface(
  DIVERSIFIER_FACTORY_ARTIFACT.abi,
)

class TemplatesTransactions extends BaseTransactions {
  private readonly _recoupContract:
    | ContractCallData
    | RecoupType
    | RecoupType['estimateGas']

  private readonly _diversifierFactoryContract:
    | ContractCallData
    | DiversifierFactoryType
    | DiversifierFactoryType['estimateGas']

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

    this._recoupContract = this._getRecoupContract()
    this._diversifierFactoryContract = this._getDiversifierFactoryContract()
  }

  protected async _createRecoupTransaction({
    token,
    tranches,
    nonWaterfallRecipientAddress = AddressZero,
    nonWaterfallRecipientTrancheIndex = undefined,
    transactionOverrides = {},
  }: CreateRecoupConfig): Promise<TransactionFormat> {
    validateAddress(token)
    validateAddress(nonWaterfallRecipientAddress)
    validateRecoupTranches(tranches)
    validateRecoupNonWaterfallRecipient(
      tranches.length,
      nonWaterfallRecipientAddress,
      nonWaterfallRecipientTrancheIndex,
    )

    this._requireProvider()
    if (!this._provider) throw new Error('Provider required')
    if (this._shouldRequireSigner) this._requireSigner()

    const [recoupTranches, trancheSizes] = await getRecoupTranchesAndSizes(
      this._chainId,
      token,
      tranches,
      this._provider,
    )

    const formattedNonWaterfallRecipientTrancheIndex =
      nonWaterfallRecipientTrancheIndex === undefined
        ? recoupTranches.length
        : nonWaterfallRecipientTrancheIndex

    const createRecoupResult = await this._recoupContract.createRecoup(
      token,
      nonWaterfallRecipientAddress,
      formattedNonWaterfallRecipientTrancheIndex,
      recoupTranches,
      trancheSizes,
      transactionOverrides,
    )

    return createRecoupResult
  }

  private _getRecoupContract() {
    return this._getTransactionContract<RecoupType, RecoupType['estimateGas']>(
      getRecoupAddress(this._chainId),
      RECOUP_ARTIFACT.abi,
      recoupInterface,
    )
  }

  protected async _createDiversifierTransaction({
    owner,
    paused = false,
    oracleParams,
    recipients,
    transactionOverrides = {},
  }: CreateDiversifierConfig): Promise<TransactionFormat> {
    if (!DIVERSIFIER_CHAIN_IDS.includes(this._chainId))
      throw new UnsupportedChainIdError(this._chainId, DIVERSIFIER_CHAIN_IDS)

    validateAddress(owner)
    validateOracleParams(oracleParams)
    validateDiversifierRecipients(recipients)

    this._requireProvider()
    if (!this._provider) throw new Error('Provider required')
    if (this._shouldRequireSigner) this._requireSigner()

    const diversifierRecipients = getDiversifierRecipients(recipients)
    const formattedOracleParams = getFormattedOracleParams(oracleParams)

    const createDiversifierResult =
      await this._diversifierFactoryContract.createDiversifier(
        [owner, paused, formattedOracleParams, diversifierRecipients],
        transactionOverrides,
      )

    return createDiversifierResult
  }

  private _getDiversifierFactoryContract() {
    return this._getTransactionContract<
      DiversifierFactoryType,
      DiversifierFactoryType['estimateGas']
    >(
      getDiversifierFactoryAddress(this._chainId),
      DIVERSIFIER_FACTORY_ARTIFACT.abi,
      diversifierFactoryInterface,
    )
  }
}

export class TemplatesClient extends TemplatesTransactions {
  readonly eventTopics: { [key: string]: string[] }
  readonly callData: TemplatesCallData
  readonly estimateGas: TemplatesGasEstimates

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

    if (!TEMPLATES_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, TEMPLATES_CHAIN_IDS)

    this.eventTopics = {
      // TODO: add others here? create waterfall, create split, etc.
      createRecoup: [recoupInterface.getEventTopic('CreateRecoup')],
      createDiversifier: [
        diversifierFactoryInterface.getEventTopic('CreateDiversifier'),
      ],
    }

    this.callData = new TemplatesCallData({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
    this.estimateGas = new TemplatesGasEstimates({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreateRecoupTransaction(
    createRecoupArgs: CreateRecoupConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const createRecoupTx = await this._createRecoupTransaction(createRecoupArgs)
    if (!this._isContractTransaction(createRecoupTx))
      throw new Error('Invalid response')

    return { tx: createRecoupTx }
  }

  async createRecoup(createRecoupArgs: CreateRecoupConfig): Promise<{
    waterfallModuleId: string
    event: Event
  }> {
    const { tx: createRecoupTx } = await this.submitCreateRecoupTransaction(
      createRecoupArgs,
    )
    const events = await getTransactionEvents(
      createRecoupTx,
      this.eventTopics.createRecoup,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event && event.args)
      return {
        waterfallModuleId: event.args.waterfallModule,
        event,
      }

    throw new TransactionFailedError()
  }

  async submitCreateDiversifierTransaction(
    createDiversifierArgs: CreateDiversifierConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const createDiversifierTx = await this._createDiversifierTransaction(
      createDiversifierArgs,
    )
    if (!this._isContractTransaction(createDiversifierTx))
      throw new Error('Invalid response')

    return { tx: createDiversifierTx }
  }

  async createDiversifier(
    createDiversifierArgs: CreateDiversifierConfig,
  ): Promise<{
    passThroughWalletId: string
    event: Event
  }> {
    const { tx: createDiversifierTx } =
      await this.submitCreateDiversifierTransaction(createDiversifierArgs)
    const events = await getTransactionEvents(
      createDiversifierTx,
      this.eventTopics.createDiversifier,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event && event.args)
      return {
        passThroughWalletId: event.args.diversifier,
        event,
      }

    throw new TransactionFailedError()
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TemplatesClient extends BaseClientMixin {}
applyMixins(TemplatesClient, [BaseClientMixin])

class TemplatesGasEstimates extends TemplatesTransactions {
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

  async createRecoup(createRecoupArgs: CreateRecoupConfig): Promise<BigNumber> {
    const gasEstimate = await this._createRecoupTransaction(createRecoupArgs)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async createDiversifier(
    createDiversifierArgs: CreateDiversifierConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._createDiversifierTransaction(
      createDiversifierArgs,
    )
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface TemplatesGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(TemplatesGasEstimates, [BaseGasEstimatesMixin])

class TemplatesCallData extends TemplatesTransactions {
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

  async createRecoup(createRecoupArgs: CreateRecoupConfig): Promise<CallData> {
    const callData = await this._createRecoupTransaction(createRecoupArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async createDiversifier(
    createDiversifierArgs: CreateDiversifierConfig,
  ): Promise<CallData> {
    const callData = await this._createDiversifierTransaction(
      createDiversifierArgs,
    )
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
