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

class VestingTransactions extends BaseClient {
  private readonly _transactionType: 'callData' | 'gasEstimate' | 'transaction'
  private readonly _shouldRequireSigner: boolean
  protected readonly _vestingModuleFactoryContract:
    | ContractCallData
    | VestingModuleFactoryType
    | VestingModuleFactoryType['estimateGas']

  constructor({
    transactionType,
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig & {
    transactionType: 'callData' | 'gasEstimate' | 'transaction'
  }) {
    super({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })

    this._transactionType = transactionType
    this._shouldRequireSigner = transactionType === 'transaction'
    this._vestingModuleFactoryContract = this._getVestingFactoryContract()
  }

  protected async _createVestingModuleTransaction({
    beneficiary,
    vestingPeriodSeconds,
  }: CreateVestingConfig): Promise<ContractTransaction | BigNumber | CallData> {
    validateAddress(beneficiary)
    validateVestingPeriod(vestingPeriodSeconds)

    if (this._shouldRequireSigner) this._requireSigner()

    const createVestingResult =
      await this._vestingModuleFactoryContract.createVestingModule(
        beneficiary,
        vestingPeriodSeconds,
      )

    return createVestingResult
  }

  protected async _startVestTransaction({
    vestingModuleId,
    tokens,
  }: StartVestConfig): Promise<ContractTransaction | BigNumber | CallData> {
    validateAddress(vestingModuleId)
    tokens.map((token) => validateAddress(token))
    if (this._shouldRequireSigner) this._requireSigner()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const startVestResult = await vestingContract.createVestingStreams(tokens)

    return startVestResult
  }

  protected async _releaseVestedFundsTransaction({
    vestingModuleId,
    streamIds,
  }: ReleaseVestedFundsConfig): Promise<
    ContractTransaction | BigNumber | CallData
  > {
    validateAddress(vestingModuleId)
    if (this._shouldRequireSigner) this._requireSigner()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const releaseFundsResult = await vestingContract.releaseFromVesting(
      streamIds,
    )

    return releaseFundsResult
  }

  protected _getVestingContract(vestingModule: string) {
    if (this._transactionType === 'callData')
      return new ContractCallData(vestingModule, VESTING_MODULE_ARTIFACT.abi)

    const vestingContract = new Contract(
      vestingModule,
      vestingModuleInterface,
      this._signer || this._provider,
    ) as VestingModuleType

    if (this._transactionType === 'gasEstimate')
      return vestingContract.estimateGas

    return vestingContract
  }

  private _getVestingFactoryContract() {
    if (this._transactionType === 'callData')
      return new ContractCallData(
        VESTING_MODULE_FACTORY_ADDRESS,
        VESTING_MODULE_FACTORY_ARTIFACT.abi,
      )

    const vestingFactoryContract = new Contract(
      VESTING_MODULE_FACTORY_ADDRESS,
      vestingModuleFactoryInterface,
      this._signer || this._provider,
    ) as VestingModuleFactoryType
    if (this._transactionType === 'gasEstimate')
      return vestingFactoryContract.estimateGas

    return vestingFactoryContract
  }
}

export default class VestingClient extends VestingTransactions {
  readonly eventTopics: { [key: string]: string[] }
  readonly callData: VestingCallData
  readonly estimateGas: VestingGasEstimates

  constructor({
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: 'transaction',
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })

    if (!VESTING_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, VESTING_CHAIN_IDS)

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
    this.estimateGas = new VestingGasEstimates({
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
    const createVestingTx = await this._createVestingModuleTransaction({
      beneficiary,
      vestingPeriodSeconds,
    })
    if (!this._isContractTransaction(createVestingTx))
      throw new Error('Invalid response')

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
    const startVestTx = await this._startVestTransaction({
      vestingModuleId,
      tokens,
    })
    if (!this._isContractTransaction(startVestTx))
      throw new Error('Invalid response')

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
    const releaseFundsTx = await this._releaseVestedFundsTransaction({
      vestingModuleId,
      streamIds,
    })
    if (!this._isContractTransaction(releaseFundsTx))
      throw new Error('Invalid response')

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
      await this._vestingModuleFactoryContract.predictVestingModuleAddress(
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

  async formatVestingModule(
    gqlVestingModule: GqlVestingModule,
  ): Promise<VestingModule> {
    this._requireProvider()
    const provider = this._provider
    if (!provider) throw new Error()

    const tokenIds = Array.from(
      new Set(gqlVestingModule.streams?.map((stream) => stream.token.id) ?? []),
    )

    const tokenData: { [token: string]: { symbol: string; decimals: number } } =
      {}
    await Promise.all(
      tokenIds.map(async (token) => {
        const result = await getTokenData(this._chainId, token, provider)

        tokenData[token] = result
      }),
    )

    const vestingModule = protectedFormatVestingModule(
      gqlVestingModule,
      tokenData,
    )
    if (this._includeEnsNames) {
      await addEnsNames(this._ensProvider ?? provider, [
        vestingModule.beneficiary,
      ])
    }

    return vestingModule
  }
}

class VestingGasEstimates extends VestingTransactions {
  constructor({
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: 'gasEstimate',
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
  }

  async createVestingModule({
    beneficiary,
    vestingPeriodSeconds,
  }: CreateVestingConfig): Promise<BigNumber> {
    const gasEstimate = await this._createVestingModuleTransaction({
      beneficiary,
      vestingPeriodSeconds,
    })
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async startVest({
    vestingModuleId,
    tokens,
  }: StartVestConfig): Promise<BigNumber> {
    const gasEstimate = await this._startVestTransaction({
      vestingModuleId,
      tokens,
    })
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async releaseVestedFunds({
    vestingModuleId,
    streamIds,
  }: ReleaseVestedFundsConfig): Promise<BigNumber> {
    const gasEstimate = await this._releaseVestedFundsTransaction({
      vestingModuleId,
      streamIds,
    })
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

class VestingCallData extends VestingTransactions {
  constructor({
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: 'callData',
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
  }

  async createVestingModule({
    beneficiary,
    vestingPeriodSeconds,
  }: CreateVestingConfig): Promise<CallData> {
    const callData = await this._createVestingModuleTransaction({
      beneficiary,
      vestingPeriodSeconds,
    })
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async startVest({
    vestingModuleId,
    tokens,
  }: StartVestConfig): Promise<CallData> {
    const callData = await this._startVestTransaction({
      vestingModuleId,
      tokens,
    })
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async releaseVestedFunds({
    vestingModuleId,
    streamIds,
  }: ReleaseVestedFundsConfig): Promise<CallData> {
    const callData = await this._releaseVestedFundsTransaction({
      vestingModuleId,
      streamIds,
    })
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
