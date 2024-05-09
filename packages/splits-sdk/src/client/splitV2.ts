import {
  Address,
  Chain,
  GetContractReturnType,
  Hash,
  Hex,
  Log,
  PublicClient,
  Transport,
  TypedDataDomain,
  decodeEventLog,
  encodeEventTopics,
  getContract,
  zeroAddress,
} from 'viem'
import {
  SPLITS_SUPPORTED_CHAIN_IDS,
  SPLITS_V2_SUPPORTED_CHAIN_IDS,
  TransactionType,
  ZERO,
  getSplitV2FactoriesStartBlock,
  getSplitV2FactoryAddress,
} from '../constants'
import { splitV2ABI } from '../constants/abi/splitV2'
import { splitV2FactoryABI } from '../constants/abi/splitV2Factory'
import {
  InvalidAuthError,
  SaltRequired,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import {
  CallData,
  CreateSplitV2Config,
  DistributeSplitConfig,
  SetPausedConfig,
  Split,
  SplitV2ExecCallsConfig,
  SplitV2Type,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
  TransferOwnershipConfig,
  UpdateSplitV2Config,
} from '../types'
import {
  fromBigIntToPercent,
  getNumberFromPercent,
  getSplitType,
  getValidatedSplitV2Config,
  validateAddress,
} from '../utils'
import {
  BaseClientMixin,
  BaseGasEstimatesMixin,
  BaseTransactions,
} from './base'
import { applyMixins } from './mixin'

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
    apiConfig,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
  }

  protected async _createSplit({
    recipients,
    distributorFeePercent,
    totalAllocationPercent,
    splitType = SplitV2Type.Pull,
    ownerAddress: controllerAddress = zeroAddress,
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
    newOwner: newController,
    transactionOverrides = {},
  }: TransferOwnershipConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    validateAddress(newController)

    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()
    await this._requireOwner(splitAddress)

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
    await this._requireOwner(splitAddress)

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
    this._requireOwner(splitAddress)

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
    this._requireOwner(splitAddress)

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
    let split: Split

    if (this._dataClient)
      split = await this._dataClient.getSplitMetadata({
        chainId: this._chainId,
        splitAddress,
      })
    else split = (await this._getSplitMetadataViaProvider(splitAddress)).split

    const recipientAddresses = split.recipients.map(
      (recipient) => recipient.recipient.address,
    )
    const recipientAllocations = split.recipients.map(
      (recipient) => recipient.ownership,
    )

    return this._executeContractFunction({
      contractAddress: splitAddress,
      contractAbi: splitV2ABI,
      functionName: 'distribute',
      functionArgs: [
        {
          recipients: recipientAddresses,
          allocations: recipientAllocations,
          totalAllocation: recipientAllocations.reduce(
            (acc, curr) => acc + curr,
            BigInt(0),
          ),
          distributionIncentive: getNumberFromPercent(
            split.distributorFeePercent,
          ),
        },
        token,
        distributorAddress,
      ],
      transactionOverrides,
      value: ZERO,
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

  async _getSplitMetadataViaProvider(
    splitAddress: Address,
  ): Promise<{ split: Split }> {
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

    const recipients = createLogs[0].args.splitParams.recipients.map(
      (recipient, i) => {
        return {
          recipient: {
            address: recipient,
          },
          ownership: createLogs[0].args.splitParams.allocations[i],
          percentAllocation: fromBigIntToPercent(
            createLogs[0].args.splitParams.allocations[i],
            createLogs[0].args.splitParams.totalAllocation,
          ),
        }
      },
    )

    const split: Split = {
      address: splitAddress,
      recipients,
      distributorFeePercent: fromBigIntToPercent(
        createLogs[0].args.splitParams.distributionIncentive,
      ),
      distributeDirection: getSplitType(this._chainId, createLogs[0].address),
      type: 'SplitV2',
      controller: {
        address: owner,
      },
      distributionsPaused: paused,
      newPotentialController: {
        address: zeroAddress,
      },
      createdBlock: Number(createLogs[0].blockNumber),
    }

    if (!updateLogs || updateLogs.length == 0) return { split }

    updateLogs.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber)
        return a.blockNumber > b.blockNumber ? -1 : 1
      else return a.logIndex > b.logIndex ? -1 : 1
    })

    const updatedRecipients = updateLogs[0].args._split.recipients.map(
      (recipient, i) => {
        return {
          recipient: {
            address: recipient,
          },
          ownership: updateLogs[0].args._split.allocations[i],
          percentAllocation: fromBigIntToPercent(
            updateLogs[0].args._split.allocations[i],
            updateLogs[0].args._split.totalAllocation,
          ),
        }
      },
    )

    split.recipients = updatedRecipients
    split.distributorFeePercent = fromBigIntToPercent(
      updateLogs[0].args._split.distributionIncentive,
    )

    return { split }
  }

  protected _getSplitV2Contract(
    splitAddress: Address,
  ): GetContractReturnType<SplitV2ABI, PublicClient<Transport, Chain>> {
    validateAddress(splitAddress)

    return getContract({
      address: splitAddress,
      abi: splitV2ABI,
      // @ts-expect-error v1/v2 viem support
      client: this._publicClient,
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
      // @ts-expect-error v1/v2 viem support
      client: this._publicClient,
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

  protected async _requireOwner(splitAddress: Address) {
    const ownerAddress = await this._owner(splitAddress)

    const walletAddress = this._walletClient!.account.address

    if (ownerAddress.toLowerCase() !== walletAddress.toLowerCase())
      throw new InvalidAuthError(
        `Action only available to the split controller. Split id: ${splitAddress}, split controller: ${ownerAddress}, wallet address: ${walletAddress}`,
      )
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
    apiConfig,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
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
      apiConfig,
      includeEnsNames,
    })
    this.estimateGas = new SplitV2GasEstimates({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.sign = new SplitV2Signature({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
  }

  async submitCreateSplitTransaction(
    createSplitArgs: CreateSplitV2Config,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._createSplit(createSplitArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async createSplit(createSplitArgs: CreateSplitV2Config): Promise<{
    splitAddress: Address
    event: Log
  }> {
    const { txHash } = await this.submitCreateSplitTransaction(createSplitArgs)
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

  async submitTransferOwnershipTransaction(
    transferOwnershipArgs: TransferOwnershipConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._transferOwnership(transferOwnershipArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async transferOwnership(
    transferOwnershipArgs: TransferOwnershipConfig,
  ): Promise<{
    event: Log
  }> {
    const { txHash } = await this.submitTransferOwnershipTransaction(
      transferOwnershipArgs,
    )

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

  async submitSetPauseTransaction(setPausedArgs: SetPausedConfig): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._setPaused(setPausedArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async setPause(setPausedArgs: SetPausedConfig): Promise<{
    event: Log
  }> {
    const { txHash } = await this.submitSetPauseTransaction(setPausedArgs)

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

  async submitExecCallsTransaction(
    execCallsArgs: SplitV2ExecCallsConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._execCalls(execCallsArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async execCalls(execCallsArgs: SplitV2ExecCallsConfig): Promise<{
    event: Log
  }> {
    const { txHash } = await this.submitExecCallsTransaction(execCallsArgs)

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

  async submitDistributeTransaction(
    distributeArgs: DistributeSplitConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._distribute(distributeArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async distribute(distributeArgs: DistributeSplitConfig): Promise<{
    event: Log
  }> {
    const { txHash } = await this.submitDistributeTransaction(distributeArgs)

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

  async submitUpdateSplitTransaction(
    updateSplitArgs: UpdateSplitV2Config,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._updateSplit(updateSplitArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async updateSplit(updateSplitArgs: UpdateSplitV2Config): Promise<{
    event: Log
  }> {
    const { txHash } = await this.submitUpdateSplitTransaction(updateSplitArgs)

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
    if (!createSplitArgs.ownerAddress)
      createSplitArgs.ownerAddress = zeroAddress
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

    validateAddress(createSplitArgs.ownerAddress)
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
        createSplitArgs.ownerAddress,
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
        createSplitArgs.ownerAddress,
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
    if (!createSplitArgs.ownerAddress)
      createSplitArgs.ownerAddress = zeroAddress
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

    validateAddress(createSplitArgs.ownerAddress)
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
      createSplitArgs.ownerAddress,
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

  async owner({ splitAddress }: { splitAddress: Address }): Promise<{
    ownerAddress: Address
  }> {
    const ownerAddress = await this._owner(splitAddress)
    return { ownerAddress }
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
    apiConfig,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
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
    apiConfig,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
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
    apiConfig,
    includeEnsNames,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Signature,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
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
