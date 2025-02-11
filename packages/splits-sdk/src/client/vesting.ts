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
  VESTING_CHAIN_IDS,
  getVestingFactoryAddress,
} from '../constants'
import { vestingFactoryAbi } from '../constants/abi/vestingFactory'
import { vestingAbi } from '../constants/abi/vesting'
import { TransactionFailedError } from '../errors'
import { applyMixins } from './mixin'
import type {
  CallData,
  CreateVestingConfig,
  ReadContractArgs,
  ReleaseVestedFundsConfig,
  SplitsClientConfig,
  StartVestConfig,
  TransactionConfig,
  TransactionFormat,
} from '../types'
import { validateAddress, validateVestingPeriod } from '../utils/validation'

type VestingAbi = typeof vestingAbi
type VestingFactoryAbi = typeof vestingFactoryAbi

class VestingTransactions extends BaseTransactions {
  constructor(transactionClientArgs: SplitsClientConfig & TransactionConfig) {
    super({
      supportedChainIds: VESTING_CHAIN_IDS,
      ...transactionClientArgs,
    })
  }

  protected async _createVestingModuleTransaction({
    beneficiary,
    vestingPeriodSeconds,
    chainId,
    transactionOverrides = {},
  }: CreateVestingConfig): Promise<TransactionFormat> {
    validateAddress(beneficiary)
    validateVestingPeriod(vestingPeriodSeconds)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const functionChainId = this._getFunctionChainId(chainId)

    const result = await this._executeContractFunction({
      contractAddress: getVestingFactoryAddress(functionChainId),
      contractAbi: vestingFactoryAbi,
      functionName: 'createVestingModule',
      functionArgs: [beneficiary, vestingPeriodSeconds],
      transactionOverrides,
    })

    return result
  }

  protected async _startVestTransaction({
    vestingModuleAddress,
    tokens,
    transactionOverrides = {},
  }: StartVestConfig): Promise<TransactionFormat> {
    validateAddress(vestingModuleAddress)
    tokens.map((token) => validateAddress(token))
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getAddress(vestingModuleAddress),
      contractAbi: vestingAbi,
      functionName: 'createVestingStreams',
      functionArgs: [tokens],
      transactionOverrides,
    })

    return result
  }

  protected async _releaseVestedFundsTransaction({
    vestingModuleAddress,
    streamIds,
    transactionOverrides = {},
  }: ReleaseVestedFundsConfig): Promise<TransactionFormat> {
    validateAddress(vestingModuleAddress)
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getAddress(vestingModuleAddress),
      contractAbi: vestingAbi,
      functionName: 'releaseFromVesting',
      functionArgs: [streamIds],
      transactionOverrides,
    })

    return result
  }

  protected _getVestingContract(
    vestingModule: string,
    chainId: number,
  ): GetContractReturnType<VestingAbi, PublicClient<Transport, Chain>> {
    const publicClient = this._getPublicClient(chainId)
    return getContract({
      address: getAddress(vestingModule),
      abi: vestingAbi,
      // @ts-expect-error v1/v2 viem support
      client: publicClient,
      publicClient: publicClient,
    })
  }

  protected _getVestingFactoryContract(
    chainId: number,
  ): GetContractReturnType<VestingFactoryAbi, PublicClient<Transport, Chain>> {
    const publicClient = this._getPublicClient(chainId)
    return getContract({
      address: getVestingFactoryAddress(chainId),
      abi: vestingFactoryAbi,
      // @ts-expect-error v1/v2 viem support
      client: publicClient,
      publicClient: publicClient,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class VestingClient extends VestingTransactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: VestingCallData
  readonly estimateGas: VestingGasEstimates

  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      ...clientArgs,
    })

    this.eventTopics = {
      createVestingModule: [
        encodeEventTopics({
          abi: vestingFactoryAbi,
          eventName: 'CreateVestingModule',
        })[0],
      ],
      startVest: [
        encodeEventTopics({
          abi: vestingAbi,
          eventName: 'CreateVestingStream',
        })[0],
      ],
      releaseVestedFunds: [
        encodeEventTopics({
          abi: vestingAbi,
          eventName: 'ReleaseFromVestingStream',
        })[0],
      ],
    }

    this.callData = new VestingCallData(clientArgs)
    this.estimateGas = new VestingGasEstimates(clientArgs)
  }

  // Write actions
  async _submitCreateVestingModuleTransaction(
    createVestingArgs: CreateVestingConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._createVestingModuleTransaction(createVestingArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async createVestingModule(createVestingArgs: CreateVestingConfig): Promise<{
    vestingModuleAddress: string
    event: Log
  }> {
    const { txHash } =
      await this._submitCreateVestingModuleTransaction(createVestingArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.createVestingModule,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      const log = decodeEventLog({
        abi: vestingFactoryAbi,
        data: event.data,
        topics: event.topics,
      })
      return {
        vestingModuleAddress: log.args.vestingModule,
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async _submitStartVestTransaction(startVestArgs: StartVestConfig): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._startVestTransaction(startVestArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async startVest(startVestArgs: StartVestConfig): Promise<{
    events: Log[]
  }> {
    const { txHash } = await this._submitStartVestTransaction(startVestArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.startVest,
    })
    return { events }
  }

  async _submitReleaseVestedFundsTransaction(
    releaseFundsArgs: ReleaseVestedFundsConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._releaseVestedFundsTransaction(releaseFundsArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async releaseVestedFunds(
    releaseFundsArgs: ReleaseVestedFundsConfig,
  ): Promise<{
    events: Log[]
  }> {
    const { txHash } =
      await this._submitReleaseVestedFundsTransaction(releaseFundsArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.releaseVestedFunds,
    })
    return { events }
  }

  // Read actions
  async predictVestingModuleAddress({
    beneficiary,
    vestingPeriodSeconds,
    chainId,
  }: CreateVestingConfig): Promise<{
    address: Address
    exists: boolean
  }> {
    validateAddress(beneficiary)
    validateVestingPeriod(vestingPeriodSeconds)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const vestingModuleFactoryContract =
      this._getVestingFactoryContract(functionChainId)
    const [address, exists] =
      await vestingModuleFactoryContract.read.predictVestingModuleAddress([
        getAddress(beneficiary),
        BigInt(vestingPeriodSeconds),
      ])

    return {
      address,
      exists,
    }
  }

  async getBeneficiary({
    vestingModuleAddress,
    chainId,
  }: ReadContractArgs & {
    vestingModuleAddress: string
  }): Promise<{
    beneficiary: Address
  }> {
    validateAddress(vestingModuleAddress)
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const vestingContract = this._getVestingContract(
      vestingModuleAddress,
      functionChainId,
    )
    const beneficiary = await vestingContract.read.beneficiary()

    return { beneficiary }
  }

  async getVestingPeriod({
    vestingModuleAddress,
    chainId,
  }: ReadContractArgs & {
    vestingModuleAddress: string
  }): Promise<{
    vestingPeriod: bigint
  }> {
    validateAddress(vestingModuleAddress)
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const vestingContract = this._getVestingContract(
      vestingModuleAddress,
      functionChainId,
    )
    const vestingPeriod = await vestingContract.read.vestingPeriod()

    return { vestingPeriod }
  }

  async getVestedAmount({
    vestingModuleAddress,
    streamId,
    chainId,
  }: ReadContractArgs & {
    vestingModuleAddress: string
    streamId: string
  }): Promise<{
    amount: bigint
  }> {
    validateAddress(vestingModuleAddress)
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const vestingContract = this._getVestingContract(
      vestingModuleAddress,
      functionChainId,
    )
    const amount = await vestingContract.read.vested([BigInt(streamId)])

    return { amount }
  }

  async getVestedAndUnreleasedAmount({
    vestingModuleAddress,
    streamId,
    chainId,
  }: ReadContractArgs & {
    vestingModuleAddress: string
    streamId: string
  }): Promise<{
    amount: bigint
  }> {
    validateAddress(vestingModuleAddress)
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const vestingContract = this._getVestingContract(
      vestingModuleAddress,
      functionChainId,
    )
    const amount = await vestingContract.read.vestedAndUnreleased([
      BigInt(streamId),
    ])

    return { amount }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface VestingClient extends BaseClientMixin {}
applyMixins(VestingClient, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class VestingGasEstimates extends VestingTransactions {
  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      ...clientArgs,
    })
  }

  async createVestingModule(
    createVestingArgs: CreateVestingConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._createVestingModuleTransaction(createVestingArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async startVest(startVestArgs: StartVestConfig): Promise<bigint> {
    const gasEstimate = await this._startVestTransaction(startVestArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async releaseVestedFunds(
    releaseFundsArgs: ReleaseVestedFundsConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._releaseVestedFundsTransaction(releaseFundsArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface VestingGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(VestingGasEstimates, [BaseGasEstimatesMixin])

class VestingCallData extends VestingTransactions {
  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      ...clientArgs,
    })
  }

  async createVestingModule(
    createVestingArgs: CreateVestingConfig,
  ): Promise<CallData> {
    const callData =
      await this._createVestingModuleTransaction(createVestingArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async startVest(startVestArgs: StartVestConfig): Promise<CallData> {
    const callData = await this._startVestTransaction(startVestArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async releaseVestedFunds(
    releaseFundsArgs: ReleaseVestedFundsConfig,
  ): Promise<CallData> {
    const callData = await this._releaseVestedFundsTransaction(releaseFundsArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
