import BaseClient from './base'
import { Interface } from '@ethersproject/abi'
import { Contract, Event } from '@ethersproject/contracts'

import WATERFALL_MODULE_FACTORY_ARTIFACT from '../artifacts/contracts/WaterfallModuleFactory/WaterfallModuleFactory.json'
import WATERFALL_MODULE_ARTIFACT from '../artifacts/contracts/WaterfallModule/WaterfallModule.json'
import {
  WATERFALL_CHAIN_IDS,
  WATERFALL_MODULE_FACTORY_ADDRESS,
} from '../constants'
import {
  InvalidConfigError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import {
  protectedFormatWaterfallModule,
  WATERFALL_MODULE_QUERY,
} from '../subgraph'
import type { GqlWaterfallModule } from '../subgraph/types'
import type {
  SplitsClientConfig,
  WaterfallModule,
  WaterfallTrancheInput,
} from '../types'
import {
  getTransactionEvent,
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
    if (includeEnsNames && !provider && !ensProvider)
      throw new InvalidConfigError(
        'Must include a provider if includeEnsNames is set to true',
      )

    if (WATERFALL_CHAIN_IDS.includes(chainId)) {
      this._waterfallModuleFactory = new Contract(
        WATERFALL_MODULE_FACTORY_ADDRESS,
        waterfallModuleFactoryInterface,
        provider,
      ) as WaterfallModuleFactoryType
    } else throw new UnsupportedChainIdError(chainId, WATERFALL_CHAIN_IDS)
  }

  // Write actions
  async createWaterfallModule({
    token,
    tranches,
  }: {
    token: string
    tranches: WaterfallTrancheInput[]
  }): Promise<{
    waterfallModule: string
    event: Event
  }> {
    validateAddress(token)
    validateTranches(tranches)
    this._requireSigner()
    if (!this._waterfallModuleFactory) throw new Error()

    const [recipients, trancheSizes] = await getTrancheRecipientsAndSizes(
      token,
      tranches,
      this._waterfallModuleFactory.provider,
    )
    const createWaterfallTx = await this._waterfallModuleFactory
      .connect(this._signer)
      .createWaterfallModule(token, recipients, trancheSizes)
    const event = await getTransactionEvent(
      createWaterfallTx,
      this._waterfallModuleFactory.interface
        .getEvent('CreateWaterfallModule')
        .format(),
    )
    if (event && event.args)
      return {
        waterfallModule: event.args.waterfallModuleId,
        event,
      }

    throw new TransactionFailedError()
  }

  async waterfallFunds({
    waterfallModule,
  }: {
    waterfallModule: string
  }): Promise<{
    event: Event
  }> {
    validateAddress(waterfallModule)
    this._requireSigner()

    if (!this._signer) throw new Error()

    const waterfallContract = this._getWaterfallContract(waterfallModule)
    const waterfallFundsTx = await waterfallContract.waterfallFunds()
    const event = await getTransactionEvent(
      waterfallFundsTx,
      waterfallContract.interface.getEvent('WaterfallFunds').format(),
    )
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  async recoverNonWaterfallFunds({
    waterfallModule,
    token,
    recipient,
  }: {
    waterfallModule: string
    token: string
    recipient: string
  }): Promise<{
    event: Event
  }> {
    validateAddress(waterfallModule)
    validateAddress(token)
    validateAddress(recipient)
    // Load waterfall and confirm token is not primary token and recipient is valid???
    this._requireSigner()

    if (!this._signer) throw new Error()

    const waterfallContract = this._getWaterfallContract(waterfallModule)
    const recoverFundsTx = await waterfallContract.recoverNonWaterfallFunds(
      token,
      recipient,
    )
    const event = await getTransactionEvent(
      recoverFundsTx,
      waterfallContract.interface.getEvent('RecoverNonWaterfallFunds').format(),
    )
    if (event)
      return {
        event,
      }

    throw new TransactionFailedError()
  }

  // Graphql read actions
  async getWaterfallMetadata({
    waterfallModule,
  }: {
    waterfallModule: string
  }): Promise<WaterfallModule> {
    validateAddress(waterfallModule)

    const response = await this._makeGqlRequest<{
      waterfallModule: GqlWaterfallModule
    }>(WATERFALL_MODULE_QUERY, {
      waterfallModule: waterfallModule.toLowerCase(),
    })

    return await this.formatWaterfallModule(response.waterfallModule)
  }

  // Helper functions
  private _getWaterfallContract(waterfallModule: string) {
    if (!this._signer) throw new Error()

    return new Contract(
      waterfallModule,
      waterfallModuleInterface,
      this._signer,
    ) as WaterfallModuleType
  }

  async formatWaterfallModule(
    gqlWaterfallModule: GqlWaterfallModule,
  ): Promise<WaterfallModule> {
    this._requireProvider()
    if (!this._waterfallModuleFactory) throw new Error()

    const tokenData = await getTokenData(
      gqlWaterfallModule.token.id,
      this._waterfallModuleFactory.provider,
    )

    const waterfallModule = protectedFormatWaterfallModule(
      gqlWaterfallModule,
      tokenData.symbol,
      tokenData.decimals,
    )
    if (this._includeEnsNames) {
      if (!this._waterfallModuleFactory) throw new Error()
      await addWaterfallEnsNames(
        this._ensProvider ?? this._waterfallModuleFactory.provider,
        waterfallModule.tranches,
      )
    }

    return waterfallModule
  }
}
