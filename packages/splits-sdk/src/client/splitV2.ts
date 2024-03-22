import {
  Address,
  Chain,
  GetContractReturnType,
  Hex,
  Log,
  PublicClient,
  Transport,
  decodeEventLog,
  encodeEventTopics,
  zeroAddress,
  getContract,
  TypedDataDomain,
} from 'viem'
import { splitV2ABI } from '../constants/abi/splitV2'
import { splitV2FactoryABI } from '../constants/abi/splitV2Factory'
import {
  CallData,
  CreateSplitV2Config,
  DistributeSplitConfig,
  SetPausedConfig,
  SplitV2,
  SplitV2ExecCallsConfig,
  SplitV2Type,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
  TransferOwnershipConfig,
  UpdateSplitV2Config,
} from '../types'
import {
  BaseClientMixin,
  BaseGasEstimatesMixin,
  BaseTransactions,
} from './base'
import { applyMixins } from './mixin'
import {
  SPLITS_SUPPORTED_CHAIN_IDS,
  SPLITS_V2_SUPPORTED_CHAIN_IDS,
  TransactionType,
  getSplitV2FactoriesStartBlock,
  getSplitV2FactoryAddress,
} from '../constants'
import {
  validateAddress,
  getNumberFromPercent,
  getValidatedSplitV2Config,
  getSplitType,
} from '../utils'
import {
  SaltRequired,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'

type SplitFactoryABI = typeof splitV2FactoryABI
type SplitV2ABI = typeof splitV2ABI

const VALID_ERC1271_SIG = '0x1626ba7e'

// TODO:add validation to execute contract function
class SplitV2Transactions extends BaseTransactions {
  constructor({
    transactionType,
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
  }

  protected async _createSplit({
    recipients,
    distributorFeePercent,
    totalAllocationPercent,
    splitType = SplitV2Type.Pull,
    controllerAddress = zeroAddress,
    creatorAddress = zeroAddress,
    salt,
    transactionOverrides = {},
  }: CreateSplitV2Config): Promise<TransactionFormat> {
    const {
      recipientAddresses,
      recipientAllocations,
      distributionIncentive,
      totalAllocation,
    } = getValidatedSplitV2Config(
      recipients,
      distributorFeePercent,
      totalAllocationPercent,
    )

    recipientAddresses.map((recipient) => validateAddress(recipient))
    validateAddress(controllerAddress)
    validateAddress(creatorAddress)

    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const functionName = salt ? 'createSplitDeterministic' : 'createSplit'
    const functionArgs = [
      {
        recipients: recipientAddresses,
        allocations: recipientAllocations,
        totalAllocation,
        distributionIncentive,
      },
      controllerAddress,
      creatorAddress,
    ]
    if (salt) functionArgs.push(salt)

    return this._executeContractFunction({
      contractAddress: getSplitV2FactoryAddress(this._chainId, splitType),
      contractAbi: splitV2FactoryABI,
      functionName,
      functionArgs,
      transactionOverrides,
    })
  }

  protected async _transferOwnership({
    splitAddress,
    newController,
    transactionOverrides = {},
  }: TransferOwnershipConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    validateAddress(newController)

    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    return this._executeContractFunction({
      contractAddress: splitAddress,
      contractAbi: splitV2ABI,
      functionName: 'transferOwnership',
      functionArgs: [newController],
      transactionOverrides,
    })
  }

  protected async _setPaused({
    splitAddress,
    paused,
    transactionOverrides = {},
  }: SetPausedConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)

    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    return this._executeContractFunction({
      contractAddress: splitAddress,
      contractAbi: splitV2ABI,
      functionName: 'setPaused',
      functionArgs: [paused],
      transactionOverrides,
    })
  }

  protected async _execCalls({
    splitAddress,
    calls,
    transactionOverrides = {},
  }: SplitV2ExecCallsConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    calls.map((call) => validateAddress(call.to))

    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    return this._executeContractFunction({
      contractAddress: splitAddress,
      contractAbi: splitV2ABI,
      functionName: 'execCalls',
      functionArgs: [calls],
      transactionOverrides,
    })
  }

  protected async _updateSplit({
    splitAddress,
    recipients,
    distributorFeePercent,
    totalAllocationPercent,
    transactionOverrides = {},
  }: UpdateSplitV2Config): Promise<TransactionFormat> {
    const {
      recipientAddresses,
      recipientAllocations,
      distributionIncentive,
      totalAllocation,
    } = getValidatedSplitV2Config(
      recipients,
      distributorFeePercent,
      totalAllocationPercent,
    )

    validateAddress(splitAddress)
    recipientAddresses.map((recipient) => validateAddress(recipient))

    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    return this._executeContractFunction({
      contractAddress: splitAddress,
      contractAbi: splitV2ABI,
      functionName: 'updateSplit',
      functionArgs: [
        {
          recipients: recipientAddresses,
          allocations: recipientAllocations,
          totalAllocation,
          distributionIncentive,
        },
      ],
      transactionOverrides,
    })
  }

  protected async _distribute({
    splitAddress,
    tokenAddress: token,
    distributorAddress = this._walletClient?.account.address as Address,
    transactionOverrides = {},
  }: DistributeSplitConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    validateAddress(token)
    validateAddress(distributorAddress)

    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const { split } = await this._getSplitMetadata(splitAddress)

    return this._executeContractFunction({
      contractAddress: splitAddress,
      contractAbi: splitV2ABI,
      functionName: 'distribute',
      functionArgs: [
        {
          recipients: split.recipients,
          allocations: split.allocations,
          totalAllocation: split.totalAllocation,
          distributionIncentive: split.distributionIncentive,
        },
        token,
        distributorAddress,
      ],
      transactionOverrides,
    })
  }

  async _paused(splitAddress: Address): Promise<boolean> {
    this._requirePublicClient()
    return this._getSplitV2Contract(splitAddress).read.paused()
  }

  async _owner(splitAddress: Address): Promise<Address> {
    this._requirePublicClient()
    return this._getSplitV2Contract(splitAddress).read.owner()
  }

  async _getSplitMetadata(splitAddress: Address): Promise<{ split: SplitV2 }> {
    this._requirePublicClient()

    const [createLogs, owner, paused] = await Promise.all([
      this._publicClient?.getLogs({
        event: splitCreatedEvent,
        address: [
          getSplitV2FactoryAddress(this._chainId, SplitV2Type.Pull),
          getSplitV2FactoryAddress(this._chainId, SplitV2Type.Push),
        ],
        args: {
          split: splitAddress,
        },
        strict: true,
        fromBlock: getSplitV2FactoriesStartBlock(this._chainId),
      }),
      this._owner(splitAddress),
      this._paused(splitAddress),
    ])

    if (!createLogs) throw new Error('Split not found')

    const updateLogs = await this._publicClient?.getLogs({
      address: splitAddress,
      event: splitUpdatedEvent,
      strict: true,
      fromBlock: createLogs[0].blockNumber,
    })

    const split: SplitV2 = {
      address: splitAddress,
      recipients: createLogs[0].args.splitParams.recipients as Address[],
      allocations: createLogs[0].args.splitParams.allocations as bigint[],
      totalAllocation: createLogs[0].args.splitParams.totalAllocation,
      distributionIncentive:
        createLogs[0].args.splitParams.distributionIncentive,
      creatorAddress: createLogs[0].args.creator,
      type: getSplitType(this._chainId, createLogs[0].address),
      controllerAddress: owner,
      paused,
    }

    if (!updateLogs || updateLogs.length == 0) return { split }

    updateLogs.sort((a, b) => {
      if (a.blockNumber === b.blockNumber)
        return a.blockNumber > b.blockNumber ? -1 : 1
      else return a.logIndex > b.logIndex ? -1 : 1
    })

    split.recipients = updateLogs[0].args._split.recipients as Address[]
    split.allocations = updateLogs[0].args._split.allocations as bigint[]
    split.totalAllocation = updateLogs[0].args._split.totalAllocation
    split.distributionIncentive =
      updateLogs[0].args._split.distributionIncentive

    return { split }
  }

  protected _getSplitV2Contract(
    splitAddress: Address,
  ): GetContractReturnType<SplitV2ABI, PublicClient<Transport, Chain>> {
    validateAddress(splitAddress)

    return getContract({
      address: splitAddress,
      abi: splitV2ABI,
      publicClient: this._publicClient,
      walletClient: this._walletClient,
    })
  }

  protected _getSplitV2FactoryContract(
    splitType: SplitV2Type,
  ): GetContractReturnType<SplitFactoryABI, PublicClient<Transport, Chain>> {
    return getContract({
      address: getSplitV2FactoryAddress(this._chainId, splitType),
      abi: splitV2FactoryABI,
      publicClient: this._publicClient,
      walletClient: this._walletClient,
    })
  }

  protected async _eip712Domain(
    splitAddress: Address,
  ): Promise<{ domain: TypedDataDomain }> {
    this._requirePublicClient()

    const eip712Domain =
      await this._getSplitV2Contract(splitAddress).read.eip712Domain()

    return {
      domain: {
        chainId: Number(eip712Domain[3].toString()),
        name: eip712Domain[1],
        version: eip712Domain[2],
        verifyingContract: eip712Domain[4],
        salt: eip712Domain[5],
      },
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class SplitV2Client extends SplitV2Transactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: SplitV2CallData
  readonly estimateGas: SplitV2GasEstimates
  readonly sign: SplitV2Signature

  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })

    if (!SPLITS_V2_SUPPORTED_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, SPLITS_SUPPORTED_CHAIN_IDS)

    this.eventTopics = {
      splitCreated: [
        encodeEventTopics({
          abi: splitV2FactoryABI,
          eventName: 'SplitCreated',
        })[0],
      ],
      splitUpdated: [
        encodeEventTopics({
          abi: splitV2ABI,
          eventName: 'SplitUpdated',
        })[0],
      ],
      splitDistributed: [
        encodeEventTopics({
          abi: splitV2ABI,
          eventName: 'SplitDistributed',
        })[0],
      ],
      ownershipTransferred: [
        encodeEventTopics({
          abi: splitV2ABI,
          eventName: 'OwnershipTransferred',
        })[0],
      ],
      setPaused: [
        encodeEventTopics({
          abi: splitV2ABI,
          eventName: 'SetPaused',
        })[0],
      ],
      execCalls: [
        encodeEventTopics({
          abi: splitV2ABI,
          eventName: 'ExecCalls',
        })[0],
      ],
    }

    this.callData = new SplitV2CallData({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
    this.estimateGas = new SplitV2GasEstimates({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
    this.sign = new SplitV2Signature({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
  }

  async createSplit(createSplitArgs: CreateSplitV2Config): Promise<{
    splitAddress: Address
    event: Log
  }> {
    const txHash = await this._createSplit(createSplitArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.splitCreated,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      const log = decodeEventLog({
        abi: splitV2FactoryABI,
        data: event.data,
        topics: event.topics,
      })
      return {
        splitAddress: log.args.split,
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async transferOwnership(
    transferOwnershipArgs: TransferOwnershipConfig,
  ): Promise<{
    event: Log
  }> {
    const txHash = await this._transferOwnership(transferOwnershipArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.ownershipTransferred,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async setPause(setPausedArgs: SetPausedConfig): Promise<{
    event: Log
  }> {
    const txHash = await this._setPaused(setPausedArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.setPaused,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async execCalls(execCallsArgs: SplitV2ExecCallsConfig): Promise<{
    event: Log
  }> {
    const txHash = await this._execCalls(execCallsArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.execCalls,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async distribute(distributeArgs: DistributeSplitConfig): Promise<{
    event: Log
  }> {
    const txHash = await this._distribute(distributeArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.splitDistributed,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async updateSplit(updateSplitArgs: UpdateSplitV2Config): Promise<{
    event: Log
  }> {
    const txHash = await this._updateSplit(updateSplitArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.splitUpdated,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async predictDeterministicAddress(
    createSplitArgs: CreateSplitV2Config,
  ): Promise<{
    splitAddress: Address
  }> {
    if (!createSplitArgs.controllerAddress)
      createSplitArgs.controllerAddress = zeroAddress
    if (!createSplitArgs.creatorAddress)
      createSplitArgs.creatorAddress = zeroAddress

    const {
      recipientAddresses,
      recipientAllocations,
      distributionIncentive,
      totalAllocation,
    } = getValidatedSplitV2Config(
      createSplitArgs.recipients,
      createSplitArgs.distributorFeePercent,
      createSplitArgs.totalAllocationPercent,
    )

    validateAddress(createSplitArgs.controllerAddress)
    validateAddress(createSplitArgs.creatorAddress)
    recipientAddresses.map((recipient) => validateAddress(recipient))

    this._requirePublicClient()

    const factory = this._getSplitV2FactoryContract(
      createSplitArgs.splitType ?? SplitV2Type.Pull,
    )

    let splitAddress
    if (createSplitArgs.salt) {
      splitAddress = await factory.read.predictDeterministicAddress([
        {
          recipients: recipientAddresses,
          allocations: recipientAllocations,
          totalAllocation,
          distributionIncentive,
        },
        createSplitArgs.controllerAddress,
        createSplitArgs.salt,
      ])
    } else {
      splitAddress = await factory.read.predictDeterministicAddress([
        {
          recipients: recipientAddresses,
          allocations: recipientAllocations,
          totalAllocation,
          distributionIncentive: getNumberFromPercent(
            createSplitArgs.distributorFeePercent,
          ),
        },
        createSplitArgs.controllerAddress,
      ])
    }

    return {
      splitAddress,
    }
  }

  async isDeployed(createSplitArgs: CreateSplitV2Config): Promise<{
    splitAddress: Address
    deployed: boolean
  }> {
    if (!createSplitArgs.controllerAddress)
      createSplitArgs.controllerAddress = zeroAddress
    if (!createSplitArgs.creatorAddress)
      createSplitArgs.creatorAddress = zeroAddress

    const {
      recipientAddresses,
      recipientAllocations,
      distributionIncentive,
      totalAllocation,
    } = getValidatedSplitV2Config(
      createSplitArgs.recipients,
      createSplitArgs.distributorFeePercent,
      createSplitArgs.totalAllocationPercent,
    )

    validateAddress(createSplitArgs.controllerAddress)
    recipientAddresses.map((recipient) => validateAddress(recipient))
    this._requirePublicClient()

    const factory = this._getSplitV2FactoryContract(
      createSplitArgs.splitType ?? SplitV2Type.Pull,
    )

    if (!createSplitArgs.salt) throw new SaltRequired()
    const [splitAddress, deployed] = await factory.read.isDeployed([
      {
        recipients: recipientAddresses,
        allocations: recipientAllocations,
        totalAllocation: totalAllocation,
        distributionIncentive,
      },
      createSplitArgs.controllerAddress,
      createSplitArgs.salt,
    ])

    return {
      splitAddress,
      deployed,
    }
  }

  async getSplitBalance({
    splitAddress,
    tokenAddress,
  }: {
    splitAddress: Address
    tokenAddress: Address
  }): Promise<{
    splitBalance: bigint
    warehouseBalance: bigint
  }> {
    validateAddress(tokenAddress)

    this._requirePublicClient()

    const splitContract = this._getSplitV2Contract(splitAddress)

    const [splitBalance, warehouseBalance] =
      await splitContract.read.getSplitBalance([tokenAddress])

    return {
      splitBalance,
      warehouseBalance,
    }
  }

  async getReplaySafeHash({
    splitAddress,
    hash,
  }: {
    splitAddress: Address
    hash: Hex
  }): Promise<{ hash: Hex }> {
    this._requirePublicClient()

    const splitContract = this._getSplitV2Contract(splitAddress)

    const replaySafeHash = await splitContract.read.replaySafeHash([hash])

    return {
      hash: replaySafeHash,
    }
  }

  async isValidSignature({
    splitAddress,
    hash,
    signature,
  }: {
    splitAddress: Address
    hash: Hex
    signature: Hex
  }): Promise<{ isValid: boolean }> {
    validateAddress(splitAddress)

    this._requirePublicClient()

    const splitContract = this._getSplitV2Contract(splitAddress)

    return {
      isValid:
        (await splitContract.read.isValidSignature([hash, signature])) ===
        VALID_ERC1271_SIG,
    }
  }

  async eip712Domain({
    splitAddress,
  }: {
    splitAddress: Address
  }): Promise<{ domain: TypedDataDomain }> {
    this._requirePublicClient()
    return this._eip712Domain(splitAddress)
  }

  async paused({ splitAddress }: { splitAddress: Address }): Promise<{
    paused: boolean
  }> {
    const paused = await this._paused(splitAddress)
    return { paused }
  }

  async controller({ splitAddress }: { splitAddress: Address }): Promise<{
    controllerAddress: Address
  }> {
    const controllerAddress = await this._owner(splitAddress)
    return { controllerAddress }
  }

  async getSplitMetadata({
    splitAddress,
  }: {
    splitAddress: Address
  }): Promise<{ split: SplitV2 }> {
    return await this._getSplitMetadata(splitAddress)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface SplitV2Client extends BaseClientMixin {}
applyMixins(SplitV2Client, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class SplitV2GasEstimates extends SplitV2Transactions {
  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
  }

  async createSplit(createSplitArgs: CreateSplitV2Config): Promise<bigint> {
    const gasEstimate = await this._createSplit(createSplitArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async transferOwnership(
    transferOwnershipArgs: TransferOwnershipConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._transferOwnership(transferOwnershipArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setPaused(setPausedArgs: SetPausedConfig): Promise<bigint> {
    const gasEstimate = await this._setPaused(setPausedArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async execCalls(execCallsArgs: SplitV2ExecCallsConfig): Promise<bigint> {
    const gasEstimate = await this._execCalls(execCallsArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async distribute(distributeArgs: DistributeSplitConfig): Promise<bigint> {
    const gasEstimate = await this._distribute(distributeArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async updateSplit(updateSplitArgs: UpdateSplitV2Config): Promise<bigint> {
    const gasEstimate = await this._updateSplit(updateSplitArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface SplitV2GasEstimates extends BaseGasEstimatesMixin {}
applyMixins(SplitV2GasEstimates, [BaseGasEstimatesMixin])

class SplitV2CallData extends SplitV2Transactions {
  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
  }

  async createSplit(createSplitArgs: CreateSplitV2Config): Promise<CallData> {
    const callData = await this._createSplit(createSplitArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async transferOwnership(
    transferOwnershipArgs: TransferOwnershipConfig,
  ): Promise<CallData> {
    const callData = await this._transferOwnership(transferOwnershipArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async setPaused(setPausedArgs: SetPausedConfig): Promise<CallData> {
    const callData = await this._setPaused(setPausedArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async execCalls(execCallsArgs: SplitV2ExecCallsConfig): Promise<CallData> {
    const callData = await this._execCalls(execCallsArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async distribute(distributeArgs: DistributeSplitConfig): Promise<CallData> {
    const callData = await this._distribute(distributeArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async updateSplit(updateSplitArgs: UpdateSplitV2Config): Promise<CallData> {
    const callData = await this._updateSplit(updateSplitArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}

class SplitV2Signature extends SplitV2Transactions {
  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Signature,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })
  }

  async signData(
    splitAddress: Address,
    data: Hex,
  ): Promise<{ signature: Hex }> {
    const { domain } = await this._eip712Domain(splitAddress)

    this._requireWalletClient()

    const signature = await this._walletClient?.signTypedData({
      domain,
      types: SigTypes,
      primaryType: 'SplitWalletMessage',
      message: {
        hash: data,
      },
    })

    if (!signature) throw new Error('Error in signing data')

    return {
      signature,
    }
  }
}

const splitUpdatedEvent = splitV2ABI[28]

const splitCreatedEvent = splitV2FactoryABI[8]

const SigTypes = {
  SplitWalletMessage: [
    {
      name: 'hash',
      type: 'bytes32',
    },
  ],
}
