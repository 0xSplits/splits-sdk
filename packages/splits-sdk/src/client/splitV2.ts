import {
  Address,
  GetContractReturnType,
  Hash,
  Hex,
  InvalidAddressError,
  Log,
  TypedDataDomain,
  decodeEventLog,
  encodeEventTopics,
  getAddress,
  getContract,
  isAddress,
  zeroAddress,
} from 'viem'
import {
  NATIVE_TOKEN_ADDRESS,
  SPLITS_SUBGRAPH_CHAIN_IDS,
  SPLITS_V2_SUPPORTED_CHAIN_IDS,
  SplitV2CreatedLogType,
  SplitV2UpdatedLogType,
  TransactionType,
  ZERO,
  getSplitV2FactoriesStartBlock,
  getSplitV2FactoryAddress,
  getSplitV2o1FactoryAddress,
  getSplitV2o2FactoryAddress,
  splitV2CreatedEvent,
  splitV2UpdatedEvent,
} from '../constants'
import { splitV2ABI } from '../constants/abi/splitV2'
import { splitV2FactoryABI } from '../constants/abi/splitV2Factory'
import {
  AccountNotFoundError,
  InvalidAuthError,
  SaltRequired,
  TransactionFailedError,
} from '../errors'
import {
  CallData,
  CreateSplitV2Config,
  DistributeSplitConfig,
  FormattedSplitEarnings,
  SetPausedConfig,
  Split,
  SplitV2ExecCallsConfig,
  SplitV2Type,
  SplitsClientConfig,
  SplitsPublicClient,
  TransactionConfig,
  TransactionFormat,
  TransferOwnershipConfig,
  UpdateSplitV2Config,
} from '../types'
import {
  fetchSplitActiveBalances,
  fromBigIntToPercent,
  getNumberFromPercent,
  getSplitType,
  getValidatedSplitV2Config,
  validateAddress,
  getSplitCreateAndUpdateLogs,
  MAX_PULL_SPLIT_RECIPIENTS,
  MAX_PUSH_SPLIT_RECIPIENTS,
  getSplitV2TypeFromBytecode,
  getMaxSplitV2Recipients,
} from '../utils'
import {
  BaseClientMixin,
  BaseGasEstimatesMixin,
  BaseTransactions,
} from './base'
import { applyMixins } from './mixin'
import { SplitV2Versions } from '../subgraph/types'
import { splitV2o1FactoryAbi, splitV2o2FactoryAbi } from '../constants/abi'

type SplitV2ABI = typeof splitV2ABI

const DEFAULT_V2_VERSION = 'splitV2o2'

const VALID_ERC1271_SIG = '0x1626ba7e'

// TODO:add validation to execute contract function
class SplitV2Transactions extends BaseTransactions {
  constructor(transactionClientArgs: SplitsClientConfig & TransactionConfig) {
    super({
      supportedChainIds: SPLITS_V2_SUPPORTED_CHAIN_IDS,
      ...transactionClientArgs,
    })
  }

  protected _getSplitV2FactoryContract(
    splitType: SplitV2Type,
    chainId: number,
    version: SplitV2Versions,
  ) {
    if (version === 'splitV2') {
      return getContract({
        address: getSplitV2FactoryAddress(chainId, splitType),
        abi: splitV2FactoryABI,
        client: this._getPublicClient(chainId),
      })
    } else if (version === 'splitV2o1') {
      return getContract({
        address: getSplitV2o1FactoryAddress(chainId, splitType),
        abi: splitV2o1FactoryAbi,
        client: this._getPublicClient(chainId),
      })
    } else {
      return getContract({
        address: getSplitV2o2FactoryAddress(chainId, splitType),
        abi: splitV2o2FactoryAbi,
        client: this._getPublicClient(chainId),
      })
    }
  }

  protected async _createSplit({
    recipients,
    distributorFeePercent,
    totalAllocationPercent,
    splitType = SplitV2Type.Pull,
    ownerAddress: controllerAddress = zeroAddress,
    creatorAddress = zeroAddress,
    salt,
    chainId,
    version = DEFAULT_V2_VERSION,
    transactionOverrides = {},
  }: CreateSplitV2Config): Promise<TransactionFormat> {
    const maxRecipients =
      splitType === SplitV2Type.Pull
        ? MAX_PULL_SPLIT_RECIPIENTS
        : MAX_PUSH_SPLIT_RECIPIENTS

    const {
      recipientAddresses,
      recipientAllocations,
      distributionIncentive,
      totalAllocation,
    } = getValidatedSplitV2Config(
      recipients,
      distributorFeePercent,
      totalAllocationPercent,
      maxRecipients,
    )

    recipientAddresses.map((recipient) => validateAddress(recipient))
    validateAddress(controllerAddress)
    validateAddress(creatorAddress)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const functionChainId = this._getFunctionChainId(chainId)

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

    const contract = this._getSplitV2FactoryContract(
      splitType,
      functionChainId,
      version,
    )

    return this._executeContractFunction({
      contractAddress: contract.address,
      contractAbi: contract.abi,
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
    validateAddress(splitAddress)

    // Determine split type to apply appropriate recipient limit
    const functionChainId = this._getFunctionChainId(undefined)
    const publicClient = this._getPublicClient(functionChainId)
    const code = await publicClient.getCode({
      address: splitAddress,
    })

    const splitV2Type = getSplitV2TypeFromBytecode(code)
    const maxSplitV2Recipients = getMaxSplitV2Recipients(splitV2Type)

    const {
      recipientAddresses,
      recipientAllocations,
      distributionIncentive,
      totalAllocation,
    } = getValidatedSplitV2Config(
      recipients,
      distributorFeePercent,
      totalAllocationPercent,
      maxSplitV2Recipients,
    )

    recipientAddresses.map((recipient) => validateAddress(recipient))

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
    distributorAddress = this._walletClient?.account?.address as Address,
    chainId,
    splitFields,
    transactionOverrides = {},
  }: DistributeSplitConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    validateAddress(token)
    validateAddress(distributorAddress)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const functionChainId = this._getFunctionChainId(chainId)

    let split: Pick<Split, 'recipients' | 'distributorFeePercent'>

    if (splitFields) {
      split = splitFields
    } else if (
      this._dataClient &&
      SPLITS_SUBGRAPH_CHAIN_IDS.includes(functionChainId)
    )
      split = await this._dataClient.getSplitMetadata({
        chainId: functionChainId,
        splitAddress,
      })
    else
      split = (
        await this._getSplitMetadataViaProvider({
          splitAddress,
          chainId: functionChainId,
        })
      ).split

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
        token === zeroAddress ? NATIVE_TOKEN_ADDRESS : token,
        distributorAddress,
      ],
      transactionOverrides,
      value: ZERO,
    })
  }

  protected async _paused(
    splitAddress: Address,
    chainId: number,
  ): Promise<boolean> {
    return this._getSplitV2Contract(splitAddress, chainId).read.paused()
  }

  protected async _owner(
    splitAddress: Address,
    chainId: number,
  ): Promise<Address> {
    return this._getSplitV2Contract(splitAddress, chainId).read.owner()
  }

  protected async _checkForSplitExistence({
    splitAddress,
    chainId,
  }: {
    splitAddress: Address
    chainId: number
  }): Promise<void> {
    try {
      await this._getSplitV2Contract(splitAddress, chainId).read.splitHash()
    } catch {
      // Split does not exist
      throw new AccountNotFoundError('Split', splitAddress, chainId)
    }
  }

  protected async _getSplitVersion({
    splitAddress,
    chainId,
  }: {
    splitAddress: Address
    chainId: number
  }): Promise<SplitV2Versions> {
    try {
      const [, , version] = await this._getSplitV2Contract(
        splitAddress,
        chainId,
      ).read.eip712Domain()

      if (version === '2') return 'splitV2'
      else if (version === '2.1') return 'splitV2o1'
      else if (version === '2.2') return 'splitV2o2'
      else throw new Error('Unknown split version')
    } catch {
      // Split does not exist
      throw new AccountNotFoundError('Split', splitAddress, chainId)
    }
  }

  protected async _getSplitMetadataViaProvider({
    splitAddress,
    chainId,
    cachedData,
  }: {
    splitAddress: Address
    chainId: number
    cachedData?: {
      blocks?: {
        createBlock?: bigint
        updateBlock?: bigint
        latestScannedBlock: bigint
      }
      blockRange?: bigint
    }
  }): Promise<{ split: Split; blockRange: bigint }> {
    const formattedSplitAddress = getAddress(splitAddress)
    const publicClient = this._getPublicClient(chainId)

    const version = await this._getSplitVersion({ splitAddress, chainId })

    const { blockRange, createLog, updateLog } =
      await getSplitCreateAndUpdateLogs<'SplitCreated', 'SplitUpdated'>({
        splitAddress,
        publicClient,
        splitCreatedEvent: splitV2CreatedEvent,
        splitUpdatedEvent: splitV2UpdatedEvent,
        addresses: [
          formattedSplitAddress,
          getSplitV2FactoryAddress(chainId, SplitV2Type.Pull),
          getSplitV2FactoryAddress(chainId, SplitV2Type.Push),
        ],
        startBlockNumber: getSplitV2FactoriesStartBlock(chainId),
        cachedBlocks: cachedData?.blocks,
        defaultBlockRange: cachedData?.blockRange,
        splitV2Version: version,
      })

    const split = await this._buildSplitFromLogs({
      splitAddress: formattedSplitAddress,
      chainId,
      createLog,
      updateLog,
    })

    return { split, blockRange }
  }

  protected async _buildSplitFromLogs({
    splitAddress,
    chainId,
    createLog,
    updateLog,
  }: {
    splitAddress: Address
    chainId: number
    createLog?: SplitV2CreatedLogType
    updateLog?: SplitV2UpdatedLogType
  }): Promise<Split> {
    const [owner, paused] = await Promise.all([
      this._owner(splitAddress, chainId),
      this._paused(splitAddress, chainId),
    ])

    if (!createLog && !updateLog)
      throw new Error('Split create and update logs missing')

    let recipients
    let distributorFeePercent
    let type: 'push' | 'pull'

    if (updateLog) {
      recipients = updateLog.args._split.recipients.map((recipient, i) => {
        return {
          recipient: {
            address: recipient,
          },
          ownership: updateLog.args._split.allocations[i],
          percentAllocation: fromBigIntToPercent(
            updateLog.args._split.allocations[i],
            updateLog.args._split.totalAllocation,
          ),
        }
      })
      distributorFeePercent = fromBigIntToPercent(
        updateLog.args._split.distributionIncentive,
      )
    } else if (createLog) {
      recipients = createLog.args.splitParams.recipients.map((recipient, i) => {
        return {
          recipient: {
            address: recipient,
          },
          ownership: createLog!.args.splitParams.allocations[i],
          percentAllocation: fromBigIntToPercent(
            createLog!.args.splitParams.allocations[i],
            createLog!.args.splitParams.totalAllocation,
          ),
        }
      })
      distributorFeePercent = fromBigIntToPercent(
        createLog.args.splitParams.distributionIncentive,
      )
    }

    if (createLog) type = getSplitType(chainId, createLog.address)
    else {
      const publicClient = this._getPublicClient(chainId)

      const code = await publicClient.getCode({
        address: splitAddress,
      })

      try {
        type = getSplitV2TypeFromBytecode(code)
      } catch {
        throw new Error(`failed to identify type of split ${splitAddress}`)
      }
    }

    const totalOwnership = recipients!.reduce((acc, recipient) => {
      return acc + recipient.ownership
    }, BigInt(0))

    const split: Split = {
      address: splitAddress,
      totalOwnership,
      recipients: recipients!,
      distributorFeePercent: distributorFeePercent!,
      distributeDirection: type,
      type: 'SplitV2',
      controller: {
        address: owner,
      },
      distributionsPaused: paused,
      newPotentialController: {
        address: zeroAddress,
      },
      createdBlock: createLog ? Number(createLog?.blockNumber) : undefined,
      updateBlock: updateLog
        ? Number(updateLog.blockNumber)
        : Number(createLog!.blockNumber),
    }
    return split
  }

  protected _getSplitV2Contract(
    splitAddress: Address,
    chainId: number,
  ): GetContractReturnType<SplitV2ABI, SplitsPublicClient> {
    validateAddress(splitAddress)
    const publicClient = this._getPublicClient(chainId)

    return getContract({
      address: splitAddress,
      abi: splitV2ABI,
      client: publicClient,
    })
  }

  protected async _eip712Domain(
    splitAddress: Address,
    chainId: number,
  ): Promise<{ domain: TypedDataDomain }> {
    const eip712Domain = await this._getSplitV2Contract(
      splitAddress,
      chainId,
    ).read.eip712Domain()

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
    const ownerAddress = await this._owner(
      splitAddress,
      this._walletClient!.chain!.id,
    )

    const walletAddress = this._walletClient!.account?.address

    if (ownerAddress.toLowerCase() !== walletAddress?.toLowerCase())
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

  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      ...clientArgs,
    })

    const splitV2o1CreatedEvents = splitV2o1FactoryAbi.filter((abi) => {
      return abi.type === 'event' && abi.name === 'SplitCreated'
    })

    const splitV2o2CreatedEvents = splitV2o2FactoryAbi.filter((abi) => {
      return abi.type === 'event' && abi.name === 'SplitCreated'
    })

    this.eventTopics = {
      splitCreated: [
        encodeEventTopics({
          abi: splitV2FactoryABI,
          eventName: 'SplitCreated',
        })[0],
        encodeEventTopics({
          abi: [splitV2o1CreatedEvents[0]],
        })[0],
        encodeEventTopics({
          abi: [splitV2o1CreatedEvents[1]],
        })[0],
        encodeEventTopics({
          abi: [splitV2o2CreatedEvents[0]],
        })[0],
        encodeEventTopics({
          abi: [splitV2o2CreatedEvents[1]],
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

    this.callData = new SplitV2CallData(clientArgs)
    this.estimateGas = new SplitV2GasEstimates(clientArgs)
    this.sign = new SplitV2Signature(clientArgs)
  }

  async _submitCreateSplitTransaction(
    createSplitArgs: CreateSplitV2Config,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._createSplit({
      ...createSplitArgs,
    })
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async createSplit(createSplitArgs: CreateSplitV2Config): Promise<{
    splitAddress: Address
    event: Log
  }> {
    const { txHash } = await this._submitCreateSplitTransaction(createSplitArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.splitCreated,
    })
    const event = events.length > 0 ? events[0] : undefined

    const contract = this._getSplitV2FactoryContract(
      createSplitArgs.splitType ?? SplitV2Type.Pull,
      this._chainId!,
      createSplitArgs.version ?? 'splitV2o2',
    )

    if (event) {
      const log = decodeEventLog({
        abi: contract.abi,
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

  async _submitTransferOwnershipTransaction(
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
    const { txHash } = await this._submitTransferOwnershipTransaction(
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

  async _submitSetPauseTransaction(setPausedArgs: SetPausedConfig): Promise<{
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
    const { txHash } = await this._submitSetPauseTransaction(setPausedArgs)

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

  async _submitExecCallsTransaction(
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
    const { txHash } = await this._submitExecCallsTransaction(execCallsArgs)

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

  async _submitDistributeTransaction(
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
    const { txHash } = await this._submitDistributeTransaction(distributeArgs)

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

  async _submitUpdateSplitTransaction(
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
    const { txHash } = await this._submitUpdateSplitTransaction(updateSplitArgs)

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

  private async _predictDeterministicAddress(
    createSplitArgs: CreateSplitV2Config,
  ): Promise<{ splitAddress: Address }> {
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

    const functionChainId = this._getReadOnlyFunctionChainId(
      createSplitArgs.chainId,
    )
    const factory = this._getSplitV2FactoryContract(
      createSplitArgs.splitType ?? SplitV2Type.Pull,
      functionChainId,
      createSplitArgs.version ?? DEFAULT_V2_VERSION,
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

    return { splitAddress }
  }

  async predictDeterministicAddress(
    createSplitArgs: CreateSplitV2Config,
  ): Promise<{
    splitAddress: Address
  }> {
    return await this._predictDeterministicAddress(createSplitArgs)
  }

  private async _isDeployed(createSplitArgs: CreateSplitV2Config): Promise<{
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

    const functionChainId = this._getReadOnlyFunctionChainId(
      createSplitArgs.chainId,
    )
    const factory = this._getSplitV2FactoryContract(
      createSplitArgs.splitType ?? SplitV2Type.Pull,
      functionChainId,
      createSplitArgs.version ?? DEFAULT_V2_VERSION,
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

  async isDeployed(createSplitArgs: CreateSplitV2Config): Promise<{
    splitAddress: Address
    deployed: boolean
  }> {
    return await this._isDeployed(createSplitArgs)
  }

  async getSplitBalance({
    splitAddress,
    tokenAddress,
    chainId,
  }: {
    splitAddress: Address
    tokenAddress: Address
    chainId?: number
  }): Promise<{
    splitBalance: bigint
    warehouseBalance: bigint
  }> {
    validateAddress(tokenAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const splitContract = this._getSplitV2Contract(
      splitAddress,
      functionChainId,
    )

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
    chainId,
  }: {
    splitAddress: Address
    hash: Hex
    chainId?: number
  }): Promise<{ hash: Hex }> {
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const splitContract = this._getSplitV2Contract(
      splitAddress,
      functionChainId,
    )

    const replaySafeHash = await splitContract.read.replaySafeHash([hash])

    return {
      hash: replaySafeHash,
    }
  }

  async isValidSignature({
    splitAddress,
    hash,
    signature,
    chainId,
  }: {
    splitAddress: Address
    hash: Hex
    signature: Hex
    chainId?: number
  }): Promise<{ isValid: boolean }> {
    validateAddress(splitAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const splitContract = this._getSplitV2Contract(
      splitAddress,
      functionChainId,
    )

    return {
      isValid:
        (await splitContract.read.isValidSignature([hash, signature])) ===
        VALID_ERC1271_SIG,
    }
  }

  async eip712Domain({
    splitAddress,
    chainId,
  }: {
    splitAddress: Address
    chainId?: number
  }): Promise<{ domain: TypedDataDomain }> {
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    return this._eip712Domain(splitAddress, functionChainId)
  }

  async paused({
    splitAddress,
    chainId,
  }: {
    splitAddress: Address
    chainId?: number
  }): Promise<{
    paused: boolean
  }> {
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const paused = await this._paused(splitAddress, functionChainId)
    return { paused }
  }

  async owner({
    splitAddress,
    chainId,
  }: {
    splitAddress: Address
    chainId?: number
  }): Promise<{
    ownerAddress: Address
  }> {
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const ownerAddress = await this._owner(splitAddress, functionChainId)
    return { ownerAddress }
  }

  async _doesSplitExist({
    splitAddress,
    chainId,
  }: {
    splitAddress: Address
    chainId: number
  }) {
    try {
      await this._checkForSplitExistence({ splitAddress, chainId })
      return true
    } catch {
      return false
    }
  }

  async _getSplitFromLogs({
    splitAddress,
    chainId,
    createLog,
    updateLog,
  }: {
    splitAddress: Address
    chainId: number
    createLog: SplitV2CreatedLogType
    updateLog?: SplitV2UpdatedLogType
  }) {
    return await this._buildSplitFromLogs({
      splitAddress,
      chainId,
      createLog,
      updateLog,
    })
  }

  async getSplitVersion({
    splitAddress,
    chainId,
  }: {
    splitAddress: Address
    chainId: number
  }): Promise<SplitV2Versions> {
    return this._getSplitVersion({
      splitAddress,
      chainId,
    })
  }

  async getSplitMetadataViaProvider({
    splitAddress,
    chainId,
    cachedData,
  }: {
    splitAddress: string
    chainId?: number
    cachedData?: {
      blocks?: {
        createBlock?: bigint
        updateBlock?: bigint
        latestScannedBlock: bigint
      }
      blockRange?: bigint
    }
  }): Promise<{ split: Split; blockRange: bigint }> {
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    if (!isAddress(splitAddress))
      throw new InvalidAddressError({ address: splitAddress })
    const { split, blockRange } = await this._getSplitMetadataViaProvider({
      splitAddress,
      chainId: functionChainId,
      cachedData,
    })
    return { split, blockRange }
  }

  async getSplitActiveBalances({
    splitAddress,
    chainId,
    erc20TokenList,
  }: {
    splitAddress: string
    chainId?: number
    erc20TokenList?: string[]
  }): Promise<Pick<FormattedSplitEarnings, 'activeBalances'>> {
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const fullTokenList = [
      zeroAddress,
      ...(erc20TokenList ? erc20TokenList : []),
    ]
    const publicClient = this._getPublicClient(functionChainId)

    if (!isAddress(splitAddress))
      throw new InvalidAddressError({ address: splitAddress })

    await this._checkForSplitExistence({
      splitAddress,
      chainId: functionChainId,
    })

    const activeBalances = await fetchSplitActiveBalances({
      type: 'splitV2',
      chainId: functionChainId,
      splitAddress,
      publicClient,
      fullTokenList: fullTokenList.map(getAddress),
    })

    return {
      activeBalances,
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface SplitV2Client extends BaseClientMixin {}
applyMixins(SplitV2Client, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class SplitV2GasEstimates extends SplitV2Transactions {
  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      ...clientArgs,
    })
  }

  async createSplit(createSplitArgs: CreateSplitV2Config): Promise<bigint> {
    const gasEstimate = await this._createSplit({
      ...createSplitArgs,
    })
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
  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      ...clientArgs,
    })
  }

  async createSplit(createSplitArgs: CreateSplitV2Config): Promise<CallData> {
    const callData = await this._createSplit({
      ...createSplitArgs,
    })
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
  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Signature,
      ...clientArgs,
    })
  }

  async signData(
    splitAddress: Address,
    data: Hex,
    chainId?: number,
  ): Promise<{ signature: Hex }> {
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const { domain } = await this._eip712Domain(splitAddress, functionChainId)

    this._requireWalletClient()

    const signature = await this._walletClient?.signTypedData({
      account: this._walletClient!.account!,
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

const SigTypes = {
  SplitWalletMessage: [
    {
      name: 'hash',
      type: 'bytes32',
    },
  ],
}
