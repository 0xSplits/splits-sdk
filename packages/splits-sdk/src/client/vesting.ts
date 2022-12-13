import BaseClient from './base'
import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { Contract, ContractTransaction, Event } from '@ethersproject/contracts'

import VESTING_MODULE_FACTORY_ARTIFACT from '../artifacts/contracts/VestingModuleFactory/VestingModuleFactory.json'
import VESTING_MODULE_ARTIFACT from '../artifacts/contracts/VestingModule/VestingModule.json'
import { VESTING_CHAIN_IDS, VESTING_MODULE_FACTORY_ADDRESS } from '../constants'
import {
  AccountNotFoundError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import { protectedFormatVestingModule, VESTING_MODULE_QUERY } from '../subgraph'
import type { GqlVestingModule } from '../subgraph/types'
import type {
  CallData,
  CreateVestingConfig,
  ReleaseVestedFundsConfig,
  SplitsClientConfig,
  StartVestConfig,
  VestingModule,
} from '../types'
import { getTransactionEvents, getTokenData, addEnsNames } from '../utils'
import { validateAddress, validateVestingPeriod } from '../utils/validation'
import type { VestingModuleFactory as VestingModuleFactoryType } from '../typechain/VestingModuleFactory'
import type { VestingModule as VestingModuleType } from '../typechain/VestingModule'
import { ContractCallData } from '../utils/multicall'

const vestingModuleFactoryInterface = new Interface(
  VESTING_MODULE_FACTORY_ARTIFACT.abi,
)
const vestingModuleInterface = new Interface(VESTING_MODULE_ARTIFACT.abi)

export default class VestingClient extends BaseClient {
  private readonly _vestingModuleFactory: VestingModuleFactoryType
  readonly eventTopics: { [key: string]: string[] }
  readonly callData: VestingCallData

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

    if (VESTING_CHAIN_IDS.includes(chainId)) {
      this._vestingModuleFactory = new Contract(
        VESTING_MODULE_FACTORY_ADDRESS,
        vestingModuleFactoryInterface,
        provider,
      ) as VestingModuleFactoryType
    } else throw new UnsupportedChainIdError(chainId, VESTING_CHAIN_IDS)

    this.eventTopics = {
      createVestingModule: [
        vestingModuleFactoryInterface.getEventTopic('CreateVestingModule'),
      ],
      startVest: [vestingModuleInterface.getEventTopic('CreateVestingStream')],
      releaseVestedFunds: [
        vestingModuleInterface.getEventTopic('ReleaseFromVestingStream'),
      ],
    }

    this.callData = new VestingCallData({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreateVestingModuleTransaction({
    beneficiary,
    vestingPeriodSeconds,
  }: CreateVestingConfig): Promise<{
    tx: ContractTransaction
  }> {
    validateAddress(beneficiary)
    validateVestingPeriod(vestingPeriodSeconds)

    this._requireSigner()
    if (!this._vestingModuleFactory) throw new Error()

    const createVestingTx = await this._vestingModuleFactory
      .connect(this._signer)
      .createVestingModule(beneficiary, vestingPeriodSeconds)

    return { tx: createVestingTx }
  }

  async createVestingModule({
    beneficiary,
    vestingPeriodSeconds,
  }: CreateVestingConfig): Promise<{
    vestingModuleId: string
    event: Event
  }> {
    const { tx } = await this.submitCreateVestingModuleTransaction({
      beneficiary,
      vestingPeriodSeconds,
    })
    const events = await getTransactionEvents(
      tx,
      this.eventTopics.createVestingModule,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event && event.args)
      return {
        vestingModuleId: event.args.vestingModule,
        event,
      }

    throw new TransactionFailedError()
  }

  async submitStartVestTransaction({
    vestingModuleId,
    tokens,
  }: StartVestConfig): Promise<{
    tx: ContractTransaction
  }> {
    validateAddress(vestingModuleId)
    tokens.map((token) => validateAddress(token))
    this._requireSigner()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const startVestTx = await vestingContract.createVestingStreams(tokens)

    return { tx: startVestTx }
  }

  async startVest({ vestingModuleId, tokens }: StartVestConfig): Promise<{
    events: Event[]
  }> {
    const { tx } = await this.submitStartVestTransaction({
      vestingModuleId,
      tokens,
    })
    const events = await getTransactionEvents(tx, this.eventTopics.startVest)
    return { events }
  }

  async submitReleaseVestedFundsTransaction({
    vestingModuleId,
    streamIds,
  }: ReleaseVestedFundsConfig): Promise<{
    tx: ContractTransaction
  }> {
    validateAddress(vestingModuleId)
    this._requireSigner()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const releaseFundsTx = await vestingContract.releaseFromVesting(streamIds)

    return { tx: releaseFundsTx }
  }

  async releaseVestedFunds({
    vestingModuleId,
    streamIds,
  }: ReleaseVestedFundsConfig): Promise<{
    events: Event[]
  }> {
    const { tx } = await this.submitReleaseVestedFundsTransaction({
      vestingModuleId,
      streamIds,
    })
    const events = await getTransactionEvents(
      tx,
      this.eventTopics.releaseVestedFunds,
    )
    return { events }
  }

  // Read actions
  async predictVestingModuleAddress({
    beneficiary,
    vestingPeriodSeconds,
  }: CreateVestingConfig): Promise<{
    address: string
    exists: boolean
  }> {
    validateAddress(beneficiary)
    validateVestingPeriod(vestingPeriodSeconds)
    this._requireProvider()

    const [address, exists] =
      await this._vestingModuleFactory.predictVestingModuleAddress(
        beneficiary,
        vestingPeriodSeconds,
      )
    return {
      address,
      exists,
    }
  }

  async getBeneficiary({
    vestingModuleId,
  }: {
    vestingModuleId: string
  }): Promise<{
    beneficiary: string
  }> {
    validateAddress(vestingModuleId)
    this._requireProvider()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const beneficiary = await vestingContract.beneficiary()

    return { beneficiary }
  }

  async getVestingPeriod({
    vestingModuleId,
  }: {
    vestingModuleId: string
  }): Promise<{
    vestingPeriod: BigNumber
  }> {
    validateAddress(vestingModuleId)
    this._requireProvider()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const vestingPeriod = await vestingContract.vestingPeriod()

    return { vestingPeriod }
  }

  async getVestedAmount({
    vestingModuleId,
    streamId,
  }: {
    vestingModuleId: string
    streamId: string
  }): Promise<{
    amount: BigNumber
  }> {
    validateAddress(vestingModuleId)
    this._requireProvider()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const amount = await vestingContract.vested(streamId)

    return { amount }
  }

  async getVestedAndUnreleasedAmount({
    vestingModuleId,
    streamId,
  }: {
    vestingModuleId: string
    streamId: string
  }): Promise<{
    amount: BigNumber
  }> {
    validateAddress(vestingModuleId)
    this._requireProvider()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const amount = await vestingContract.vestedAndUnreleased(streamId)

    return { amount }
  }

  // Graphql read actions
  async getVestingMetadata({
    vestingModuleId,
  }: {
    vestingModuleId: string
  }): Promise<VestingModule> {
    validateAddress(vestingModuleId)

    const response = await this._makeGqlRequest<{
      vestingModule: GqlVestingModule
    }>(VESTING_MODULE_QUERY, {
      vestingModuleId: vestingModuleId.toLowerCase(),
    })

    if (!response.vestingModule)
      throw new AccountNotFoundError(
        `No vesting module found at address ${vestingModuleId}, please confirm you have entered the correct address. There may just be a delay in subgraph indexing.`,
      )

    return await this.formatVestingModule(response.vestingModule)
  }

  // Helper functions
  private _getVestingContract(vestingModule: string) {
    if (!this._vestingModuleFactory.provider && !this._signer) throw new Error()

    return new Contract(
      vestingModule,
      vestingModuleInterface,
      this._signer || this._vestingModuleFactory.provider,
    ) as VestingModuleType
  }

  async formatVestingModule(
    gqlVestingModule: GqlVestingModule,
  ): Promise<VestingModule> {
    this._requireProvider()
    if (!this._vestingModuleFactory) throw new Error()

    const tokenIds = Array.from(
      new Set(gqlVestingModule.streams?.map((stream) => stream.token.id) ?? []),
    )

    const tokenData: { [token: string]: { symbol: string; decimals: number } } =
      {}
    await Promise.all(
      tokenIds.map(async (token) => {
        const result = await getTokenData(
          this._chainId,
          token,
          this._vestingModuleFactory.provider,
        )

        tokenData[token] = result
      }),
    )

    const vestingModule = protectedFormatVestingModule(
      gqlVestingModule,
      tokenData,
    )
    if (this._includeEnsNames) {
      await addEnsNames(
        this._ensProvider ?? this._vestingModuleFactory.provider,
        [vestingModule.beneficiary],
      )
    }

    return vestingModule
  }
}

class VestingCallData extends BaseClient {
  private readonly _vestingFactoryContractCallData: ContractCallData

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

    this._vestingFactoryContractCallData = new ContractCallData(
      VESTING_MODULE_FACTORY_ADDRESS,
      VESTING_MODULE_FACTORY_ARTIFACT.abi,
    )
  }

  async createVestingModule({
    beneficiary,
    vestingPeriodSeconds,
  }: CreateVestingConfig): Promise<CallData> {
    validateAddress(beneficiary)
    validateVestingPeriod(vestingPeriodSeconds)

    const callData = this._vestingFactoryContractCallData.createVestingModule(
      beneficiary,
      vestingPeriodSeconds,
    )
    return callData
  }

  async startVest({
    vestingModuleId,
    tokens,
  }: StartVestConfig): Promise<CallData> {
    validateAddress(vestingModuleId)

    const vestingContractCallData =
      this._getVestingContractCallData(vestingModuleId)
    const callData = vestingContractCallData.createVestingStreams(tokens)
    return callData
  }

  async releaseVestedFunds({
    vestingModuleId,
    streamIds,
  }: ReleaseVestedFundsConfig): Promise<CallData> {
    validateAddress(vestingModuleId)

    const vestingContractCallData =
      this._getVestingContractCallData(vestingModuleId)
    const callData = vestingContractCallData.releaseFromVesting(streamIds)
    return callData
  }

  private _getVestingContractCallData(vestingModule: string) {
    return new ContractCallData(vestingModule, VESTING_MODULE_ARTIFACT.abi)
  }
}
