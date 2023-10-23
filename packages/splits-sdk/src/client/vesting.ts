import {
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
  TransactionType,
  VESTING_CHAIN_IDS,
  getVestingFactoryAddress,
} from '../constants'
import { vestingFactoryAbi } from '../constants/abi/vestingFactory'
import { vestingAbi } from '../constants/abi/vesting'
import {
  AccountNotFoundError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import { applyMixins } from './mixin'
import { protectedFormatVestingModule, VESTING_MODULE_QUERY } from '../subgraph'
import type { GqlVestingModule } from '../subgraph/types'
import type {
  CallData,
  CreateVestingConfig,
  ReleaseVestedFundsConfig,
  SplitsClientConfig,
  StartVestConfig,
  TransactionConfig,
  TransactionFormat,
  VestingModule,
} from '../types'
import { getTokenData, addEnsNames } from '../utils'
import { validateAddress, validateVestingPeriod } from '../utils/validation'

class VestingTransactions extends BaseTransactions {
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

  protected async _createVestingModuleTransaction({
    beneficiary,
    vestingPeriodSeconds,
    transactionOverrides = {},
  }: CreateVestingConfig): Promise<TransactionFormat> {
    validateAddress(beneficiary)
    validateVestingPeriod(vestingPeriodSeconds)

    if (this._shouldRequireSigner) this._requireSigner()

    const result = await this._executeContractFunction({
      contractAddress: getVestingFactoryAddress(this._chainId),
      contractAbi: vestingFactoryAbi,
      functionName: 'createVestingModule',
      functionArgs: [beneficiary, vestingPeriodSeconds],
      transactionOverrides,
    })

    return result
  }

  protected async _startVestTransaction({
    vestingModuleId,
    tokens,
    transactionOverrides = {},
  }: StartVestConfig): Promise<TransactionFormat> {
    validateAddress(vestingModuleId)
    tokens.map((token) => validateAddress(token))
    if (this._shouldRequireSigner) this._requireSigner()

    const result = await this._executeContractFunction({
      contractAddress: getAddress(vestingModuleId),
      contractAbi: vestingAbi,
      functionName: 'createVestingStreams',
      functionArgs: [tokens],
      transactionOverrides,
    })

    return result
  }

  protected async _releaseVestedFundsTransaction({
    vestingModuleId,
    streamIds,
    transactionOverrides = {},
  }: ReleaseVestedFundsConfig): Promise<TransactionFormat> {
    validateAddress(vestingModuleId)
    if (this._shouldRequireSigner) this._requireSigner()

    const result = await this._executeContractFunction({
      contractAddress: getAddress(vestingModuleId),
      contractAbi: vestingAbi,
      functionName: 'releaseFromVesting',
      functionArgs: [streamIds],
      transactionOverrides,
    })

    return result
  }

  protected _getVestingContract(vestingModule: string) {
    return getContract({
      address: getAddress(vestingModule),
      abi: vestingAbi,
      publicClient: this._publicClient,
    })
  }

  protected _getVestingFactoryContract() {
    return getContract({
      address: getVestingFactoryAddress(this._chainId),
      abi: vestingFactoryAbi,
      publicClient: this._publicClient,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class VestingClient extends VestingTransactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: VestingCallData
  readonly estimateGas: VestingGasEstimates

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

    if (!VESTING_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, VESTING_CHAIN_IDS)

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

    this.callData = new VestingCallData({
      chainId,
      publicClient,
      ensPublicClient,
      account,
      includeEnsNames,
    })
    this.estimateGas = new VestingGasEstimates({
      chainId,
      publicClient,
      ensPublicClient,
      account,
      includeEnsNames,
    })
  }

  // Write actions
  async submitCreateVestingModuleTransaction(
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
    vestingModuleId: string
    event: Log
  }> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } =
      await this.submitCreateVestingModuleTransaction(createVestingArgs)
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
        vestingModuleId: log.args.vestingModule,
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async submitStartVestTransaction(startVestArgs: StartVestConfig): Promise<{
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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } = await this.submitStartVestTransaction(startVestArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.startVest,
    })
    return { events }
  }

  async submitReleaseVestedFundsTransaction(
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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } =
      await this.submitReleaseVestedFundsTransaction(releaseFundsArgs)
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
  }: CreateVestingConfig): Promise<{
    address: string
    exists: boolean
  }> {
    validateAddress(beneficiary)
    validateVestingPeriod(vestingPeriodSeconds)
    this._requirePublicClient()

    const vestingModuleFactoryContract = this._getVestingFactoryContract()
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
    vestingModuleId,
  }: {
    vestingModuleId: string
  }): Promise<{
    beneficiary: string
  }> {
    validateAddress(vestingModuleId)
    this._requirePublicClient()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const beneficiary = await vestingContract.read.beneficiary()

    return { beneficiary }
  }

  async getVestingPeriod({
    vestingModuleId,
  }: {
    vestingModuleId: string
  }): Promise<{
    vestingPeriod: bigint
  }> {
    validateAddress(vestingModuleId)
    this._requirePublicClient()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const vestingPeriod = await vestingContract.read.vestingPeriod()

    return { vestingPeriod }
  }

  async getVestedAmount({
    vestingModuleId,
    streamId,
  }: {
    vestingModuleId: string
    streamId: string
  }): Promise<{
    amount: bigint
  }> {
    validateAddress(vestingModuleId)
    this._requirePublicClient()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const amount = await vestingContract.read.vested([BigInt(streamId)])

    return { amount }
  }

  async getVestedAndUnreleasedAmount({
    vestingModuleId,
    streamId,
  }: {
    vestingModuleId: string
    streamId: string
  }): Promise<{
    amount: bigint
  }> {
    validateAddress(vestingModuleId)
    this._requirePublicClient()

    const vestingContract = this._getVestingContract(vestingModuleId)
    const amount = await vestingContract.read.vestedAndUnreleased([
      BigInt(streamId),
    ])

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
    this._requirePublicClient()
    const provider = this._publicClient
    if (!provider) throw new Error()

    const tokenIds = Array.from(
      new Set(gqlVestingModule.streams?.map((stream) => stream.token.id) ?? []),
    )

    const tokenData: { [token: string]: { symbol: string; decimals: number } } =
      {}
    await Promise.all(
      tokenIds.map(async (token) => {
        const result = await getTokenData(
          this._chainId,
          getAddress(token),
          provider,
        )

        tokenData[token] = result
      }),
    )

    const vestingModule = protectedFormatVestingModule(
      gqlVestingModule,
      tokenData,
    )
    if (this._includeEnsNames) {
      await addEnsNames(this._ensPublicClient ?? provider, [
        vestingModule.beneficiary,
      ])
    }

    return vestingModule
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface VestingClient extends BaseClientMixin {}
applyMixins(VestingClient, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class VestingGasEstimates extends VestingTransactions {
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
