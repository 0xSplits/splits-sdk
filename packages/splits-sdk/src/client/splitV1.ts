import {
  Address,
  Chain,
  GetContractReturnType,
  Hash,
  InvalidAddressError,
  Log,
  PublicClient,
  Transport,
  decodeEventLog,
  encodeEventTopics,
  getAddress,
  getContract,
  isAddress,
  zeroAddress,
} from 'viem'

import {
  ARBITRUM_CHAIN_IDS,
  BASE_CHAIN_IDS,
  BSC_CHAIN_IDS,
  ETHEREUM_CHAIN_IDS,
  GNOSIS_CHAIN_IDS,
  OPTIMISM_CHAIN_IDS,
  POLYGON_CHAIN_IDS,
  SPLITS_SUPPORTED_CHAIN_IDS,
  TransactionType,
  ZORA_CHAIN_IDS,
  getSplitMainAddress,
  ETHEREUM_TEST_CHAIN_IDS,
  BLAST_CHAIN_IDS,
  getSplitV1StartBlock,
  ChainId,
} from '../constants'
import {
  splitMainEthereumAbi,
  splitMainPolygonAbi,
} from '../constants/abi/splitMain'
import {
  InvalidAuthError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import type {
  AcceptControlTransferConfig,
  BatchDistributeAndWithdrawConfig,
  BatchDistributeAndWithdrawForAllConfig,
  CallData,
  CancelControlTransferConfig,
  CreateSplitConfig,
  DistributeTokenConfig,
  GetSplitBalanceConfig,
  InitiateControlTransferConfig,
  MakeSplitImmutableConfig,
  Split,
  SplitRecipient,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
  UpdateSplitAndDistributeTokenConfig,
  UpdateSplitConfig,
  WithdrawFundsConfig,
} from '../types'
import {
  fromBigIntToPercent,
  getBigIntFromPercent,
  getRecipientSortedAddressesAndAllocations,
} from '../utils'
import { validateAddress, validateSplitInputs } from '../utils/validation'
import {
  BaseClientMixin,
  BaseGasEstimatesMixin,
  BaseTransactions,
} from './base'
import { applyMixins } from './mixin'

const polygonAbiChainIds = [
  ...ETHEREUM_TEST_CHAIN_IDS,
  ...POLYGON_CHAIN_IDS,
  ...OPTIMISM_CHAIN_IDS,
  ...ARBITRUM_CHAIN_IDS,
  ...GNOSIS_CHAIN_IDS,
  ...BSC_CHAIN_IDS,
  ...ZORA_CHAIN_IDS,
  ...BASE_CHAIN_IDS,
  ...BLAST_CHAIN_IDS,
]

type SplitMainEthereumAbiType = typeof splitMainEthereumAbi

class SplitV1Transactions extends BaseTransactions {
  constructor(transactionClientArgs: SplitsClientConfig & TransactionConfig) {
    super({
      supportedChainIds: SPLITS_SUPPORTED_CHAIN_IDS,
      ...transactionClientArgs,
    })
  }

  protected async _createSplitTransaction({
    recipients,
    distributorFeePercent,
    controller = zeroAddress,
    chainId,
    transactionOverrides = {},
  }: CreateSplitConfig): Promise<TransactionFormat> {
    validateSplitInputs({ recipients, distributorFeePercent, controller })
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)

    const functionChainId = this._getFunctionChainId(chainId)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(functionChainId),
      contractAbi: this._getSplitMainAbi(functionChainId),
      functionName: 'createSplit',
      functionArgs: [accounts, percentAllocations, distributorFee, controller],
      transactionOverrides,
    })

    return result
  }

  protected async _updateSplitTransaction({
    splitAddress,
    recipients,
    distributorFeePercent,
    chainId,
    transactionOverrides = {},
  }: UpdateSplitConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    validateSplitInputs({ recipients, distributorFeePercent })

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireController(splitAddress)
    }

    const functionChainId = this._getFunctionChainId(chainId)

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(functionChainId),
      contractAbi: this._getSplitMainAbi(functionChainId),
      functionName: 'updateSplit',
      functionArgs: [
        splitAddress,
        accounts,
        percentAllocations,
        distributorFee,
      ],
      transactionOverrides,
    })

    return result
  }

  protected async _distributeTokenTransaction({
    splitAddress,
    token,
    distributorAddress,
    chainId,
    transactionOverrides = {},
  }: DistributeTokenConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    validateAddress(token)
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : this._walletClient?.account
      ? this._walletClient.account.address
      : zeroAddress
    validateAddress(distributorPayoutAddress)

    this._requireDataClient()
    if (!this._dataClient) throw new Error()

    const functionChainId = this._getFunctionChainId(chainId)

    const { recipients, distributorFeePercent } =
      await this._dataClient.getSplitMetadata({
        chainId: functionChainId,
        splitAddress,
      })
    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(
        recipients.map((recipient) => {
          return {
            percentAllocation: recipient.percentAllocation,
            address: recipient.recipient.address,
          }
        }),
      )
    const distributorFee = getBigIntFromPercent(distributorFeePercent)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(functionChainId),
      contractAbi: this._getSplitMainAbi(functionChainId),
      functionName: token === zeroAddress ? 'distributeETH' : 'distributeERC20',
      functionArgs:
        token === zeroAddress
          ? [
              splitAddress,
              accounts,
              percentAllocations,
              distributorFee,
              distributorPayoutAddress,
            ]
          : [
              splitAddress,
              token,
              accounts,
              percentAllocations,
              distributorFee,
              distributorPayoutAddress,
            ],
      transactionOverrides,
    })

    return result
  }

  protected async _updateSplitAndDistributeTokenTransaction({
    splitAddress,
    token,
    recipients,
    distributorFeePercent,
    distributorAddress,
    chainId,
    transactionOverrides = {},
  }: UpdateSplitAndDistributeTokenConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    validateAddress(token)
    validateSplitInputs({ recipients, distributorFeePercent })

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireController(splitAddress)
    }

    const functionChainId = this._getFunctionChainId(chainId)

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)
    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : this._walletClient?.account
      ? this._walletClient.account.address
      : zeroAddress
    validateAddress(distributorPayoutAddress)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(functionChainId),
      contractAbi: this._getSplitMainAbi(functionChainId),
      functionName:
        token === zeroAddress
          ? 'updateAndDistributeETH'
          : 'updateAndDistributeERC20',
      functionArgs:
        token === zeroAddress
          ? [
              splitAddress,
              accounts,
              percentAllocations,
              distributorFee,
              distributorPayoutAddress,
            ]
          : [
              splitAddress,
              token,
              accounts,
              percentAllocations,
              distributorFee,
              distributorPayoutAddress,
            ],
      transactionOverrides,
    })

    return result
  }

  protected async _withdrawFundsTransaction({
    address,
    tokens,
    chainId,
    transactionOverrides = {},
  }: WithdrawFundsConfig): Promise<TransactionFormat> {
    validateAddress(address)
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const withdrawEth = tokens.includes(zeroAddress) ? 1 : 0
    const erc20s = tokens.filter((token) => token !== zeroAddress)

    const functionChainId = this._getFunctionChainId(chainId)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(functionChainId),
      contractAbi: this._getSplitMainAbi(functionChainId),
      functionName: 'withdraw',
      functionArgs: [address, withdrawEth, erc20s],
      transactionOverrides,
    })

    return result
  }

  protected async _initiateControlTransferTransaction({
    splitAddress,
    newController,
    chainId,
    transactionOverrides = {},
  }: InitiateControlTransferConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireController(splitAddress)
    }

    const functionChainId = this._getFunctionChainId(chainId)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(functionChainId),
      contractAbi: this._getSplitMainAbi(functionChainId),
      functionName: 'transferControl',
      functionArgs: [splitAddress, newController],
      transactionOverrides,
    })

    return result
  }

  protected async _cancelControlTransferTransaction({
    splitAddress,
    chainId,
    transactionOverrides = {},
  }: CancelControlTransferConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireController(splitAddress)
    }

    const functionChainId = this._getFunctionChainId(chainId)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(functionChainId),
      contractAbi: this._getSplitMainAbi(functionChainId),
      functionName: 'cancelControlTransfer',
      functionArgs: [splitAddress],
      transactionOverrides,
    })

    return result
  }

  protected async _acceptControlTransferTransaction({
    splitAddress,
    chainId,
    transactionOverrides = {},
  }: AcceptControlTransferConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireNewPotentialController(splitAddress)
    }

    const functionChainId = this._getFunctionChainId(chainId)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(functionChainId),
      contractAbi: this._getSplitMainAbi(functionChainId),
      functionName: 'acceptControl',
      functionArgs: [splitAddress],
      transactionOverrides,
    })

    return result
  }

  protected async _makeSplitImmutableTransaction({
    splitAddress,
    chainId,
    transactionOverrides = {},
  }: MakeSplitImmutableConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireController(splitAddress)
    }

    const functionChainId = this._getFunctionChainId(chainId)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(functionChainId),
      contractAbi: this._getSplitMainAbi(functionChainId),
      functionName: 'makeSplitImmutable',
      functionArgs: [splitAddress],
      transactionOverrides,
    })

    return result
  }

  protected async _batchDistributeAndWithdrawTransaction(
    {
      splitAddress,
      tokens,
      recipientAddresses,
      distributorAddress,
    }: BatchDistributeAndWithdrawConfig,
    distributeFunc: (args: DistributeTokenConfig) => Promise<CallData>,
    withdrawFunc: (args: WithdrawFundsConfig) => Promise<CallData>,
  ): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    tokens.map((token) => validateAddress(token))
    recipientAddresses.map((address) => validateAddress(address))

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
    }

    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : this._walletClient?.account
      ? this._walletClient.account.address
      : zeroAddress
    validateAddress(distributorPayoutAddress)

    const distributeCalls = await Promise.all(
      tokens.map(async (token) => {
        return await distributeFunc({
          splitAddress,
          token,
          distributorAddress: distributorPayoutAddress,
        })
      }),
    )
    const withdrawCalls = await Promise.all(
      recipientAddresses.map(async (address) => {
        return await withdrawFunc({ address, tokens })
      }),
    )

    const multicallData = [...distributeCalls, ...withdrawCalls]
    const result = await this._multicallTransaction({ calls: multicallData })

    return result
  }

  protected async _batchDistributeAndWithdrawForAllTransaction(
    {
      splitAddress,
      tokens,
      distributorAddress,
      chainId,
    }: BatchDistributeAndWithdrawForAllConfig,
    distributeFunc: (args: DistributeTokenConfig) => Promise<CallData>,
    withdrawFunc: (args: WithdrawFundsConfig) => Promise<CallData>,
  ): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    tokens.map((token) => validateAddress(token))

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
    }

    this._requireDataClient()

    const functionChainId = this._getFunctionChainId(chainId)

    const { recipients } = await this._dataClient!.getSplitMetadata({
      chainId: functionChainId,
      splitAddress,
    })
    const recipientAddresses = recipients.map(
      (recipient) => recipient.recipient.address,
    )

    const result = await this._batchDistributeAndWithdrawTransaction(
      {
        splitAddress,
        tokens,
        recipientAddresses,
        distributorAddress,
      },
      distributeFunc,
      withdrawFunc,
    )

    return result
  }

  protected async _getSplitMetadataViaProvider(
    splitAddress: Address,
    chainId: number,
  ): Promise<{ split: Split }> {
    if (chainId === ChainId.MAINNET)
      throw new Error('Mainnet not supported for provider metadata')

    const publicClient = this._getPublicClient(chainId)

    const splitMainContract = this._getSplitMainContract(chainId)
    const splitCreatedEvent = splitMainPolygonAbi[14]
    const splitUpdatedEvent = splitMainPolygonAbi[18]

    const [createLogs, controller] = await Promise.all([
      publicClient.getLogs({
        event: splitCreatedEvent!,
        address: getSplitMainAddress(chainId),
        args: {
          split: splitAddress,
        },
        strict: true,
        fromBlock: getSplitV1StartBlock(chainId),
      }),
      splitMainContract.read.getController([getAddress(splitAddress)]),
    ])

    if (!createLogs) throw new Error('Split not found')

    const updateLogs = await publicClient.getLogs({
      address: getSplitMainAddress(chainId),
      event: splitUpdatedEvent!,
      args: {
        split: splitAddress,
      },
      strict: true,
      fromBlock: createLogs[0].blockNumber,
    })

    const recipients = createLogs[0].args.accounts.map((recipient, i) => {
      return {
        recipient: {
          address: recipient,
        },
        ownership: BigInt(createLogs[0].args.percentAllocations[i]),
        percentAllocation: fromBigIntToPercent(
          BigInt(createLogs[0].args.percentAllocations[i]),
          BigInt(1_000_000),
        ),
      }
    })

    const split: Split = {
      address: splitAddress,
      recipients,
      distributorFeePercent: fromBigIntToPercent(
        BigInt(createLogs[0].args.distributorFee),
      ),
      distributeDirection: 'pull',
      type: 'Split',
      controller: {
        address: controller,
      },
      distributionsPaused: false,
      newPotentialController: {
        address: zeroAddress,
      },
      createdBlock: Number(createLogs[0].blockNumber),
    }

    if (!updateLogs || updateLogs.length === 0) return { split }

    updateLogs.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber)
        return a.blockNumber > b.blockNumber ? -1 : 1
      else return a.logIndex > b.logIndex ? -1 : 1
    })

    const updatedRecipients = updateLogs[0].args.accounts.map(
      (recipient, i) => {
        return {
          recipient: {
            address: recipient,
          },
          ownership: BigInt(updateLogs[0].args.percentAllocations[i]),
          percentAllocation: fromBigIntToPercent(
            BigInt(updateLogs[0].args.percentAllocations[i]),
            BigInt(1_000_000),
          ),
        }
      },
    )

    split.recipients = updatedRecipients
    split.distributorFeePercent = fromBigIntToPercent(
      BigInt(updateLogs[0].args.distributorFee),
    )

    return { split }
  }

  private async _requireController(splitAddress: string) {
    const chainId = this._walletClient!.chain.id
    const splitMainContract = this._getSplitMainContract(chainId)
    const controller = await splitMainContract.read.getController([
      getAddress(splitAddress),
    ])

    const walletAddress = this._walletClient!.account.address

    if (controller.toLowerCase() !== walletAddress.toLowerCase())
      throw new InvalidAuthError(
        `Action only available to the split controller. Split id: ${splitAddress}, split controller: ${controller}, wallet address: ${walletAddress}`,
      )
  }

  private async _requireNewPotentialController(splitAddress: string) {
    const chainId = this._walletClient!.chain.id
    const splitMainContract = this._getSplitMainContract(chainId)
    const newPotentialController =
      await splitMainContract.read.getNewPotentialController([
        getAddress(splitAddress),
      ])

    const walletAddress = this._walletClient!.account.address

    if (newPotentialController.toLowerCase() !== walletAddress.toLowerCase())
      throw new InvalidAuthError(
        `Action only available to the split's new potential controller. Split new potential controller: ${newPotentialController}. Wallet address: ${walletAddress}`,
      )
  }

  protected _getSplitMainContract(
    chainId: number,
  ): GetContractReturnType<
    SplitMainEthereumAbiType,
    PublicClient<Transport, Chain>
  > {
    const publicClient = this._getPublicClient(chainId)

    return getContract({
      address: getSplitMainAddress(chainId),
      abi: splitMainEthereumAbi,
      // @ts-expect-error v1/v2 viem support
      client: publicClient,
      publicClient: publicClient,
    })
  }

  protected _getSplitMainAbi(chainId: number) {
    if (ETHEREUM_CHAIN_IDS.includes(chainId)) {
      return splitMainEthereumAbi
    } else if (polygonAbiChainIds.includes(chainId)) {
      return splitMainPolygonAbi
    } else
      throw new UnsupportedChainIdError(chainId, SPLITS_SUPPORTED_CHAIN_IDS)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class SplitV1Client extends SplitV1Transactions {
  readonly callData: SplitV1CallData
  readonly estimateGas: SplitV1GasEstimates

  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      ...clientArgs,
    })

    this.callData = new SplitV1CallData(clientArgs)
    this.estimateGas = new SplitV1GasEstimates(clientArgs)
  }

  getEventTopics(chainId: number) {
    const splitMainAbi = this._getSplitMainAbi(chainId)

    return {
      createSplit: [
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'CreateSplit',
        })[0],
      ],
      updateSplit: [
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'UpdateSplit',
        })[0],
      ],
      distributeToken: [
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'DistributeETH',
        })[0],
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'DistributeERC20',
        })[0],
      ],
      updateSplitAndDistributeToken: [
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'UpdateSplit',
        })[0],
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'DistributeETH',
        })[0],
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'DistributeERC20',
        })[0],
      ],
      withdrawFunds: [
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'Withdrawal',
        })[0],
      ],
      initiateControlTransfer: [
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'InitiateControlTransfer',
        })[0],
      ],
      cancelControlTransfer: [
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'CancelControlTransfer',
        })[0],
      ],
      acceptControlTransfer: [
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'ControlTransfer',
        })[0],
      ],
      makeSplitImmutable: [
        encodeEventTopics({
          abi: splitMainAbi,
          eventName: 'ControlTransfer',
        })[0],
      ],
    }
  }

  /*
  /
  / SPLIT ACTIONS
  /
  */
  // Write actions
  async submitCreateSplitTransaction(
    createSplitArgs: CreateSplitConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._createSplitTransaction(createSplitArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async createSplit(createSplitArgs: CreateSplitConfig): Promise<{
    splitAddress: Address
    event: Log
  }> {
    const { txHash } = await this.submitCreateSplitTransaction(createSplitArgs)

    const functionChainId = this._getFunctionChainId(createSplitArgs.chainId)
    const eventTopics = this.getEventTopics(
      this._getFunctionChainId(functionChainId),
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: eventTopics.createSplit,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      if (ETHEREUM_CHAIN_IDS.includes(functionChainId)) {
        const log = decodeEventLog({
          abi: splitMainEthereumAbi,
          data: event.data,
          topics: event.topics,
        })
        if (log.eventName !== 'CreateSplit') throw new Error()
        return {
          splitAddress: log.args.split,
          event,
        }
      } else {
        const log = decodeEventLog({
          abi: splitMainPolygonAbi,
          data: event.data,
          topics: event.topics,
        })
        if (log.eventName !== 'CreateSplit') throw new Error()
        return {
          splitAddress: log.args.split,
          event,
        }
      }
    }

    throw new TransactionFailedError()
  }

  async submitUpdateSplitTransaction(
    updateSplitArgs: UpdateSplitConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._updateSplitTransaction(updateSplitArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async updateSplit(updateSplitArgs: UpdateSplitConfig): Promise<{
    event: Log
  }> {
    const { txHash } = await this.submitUpdateSplitTransaction(updateSplitArgs)
    const eventTopics = this.getEventTopics(
      this._getFunctionChainId(updateSplitArgs.chainId),
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: eventTopics.updateSplit,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitDistributeTokenTransaction(
    distributeTokenArgs: DistributeTokenConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._distributeTokenTransaction(distributeTokenArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async distributeToken(distributeTokenArgs: DistributeTokenConfig): Promise<{
    event: Log
  }> {
    const { txHash } =
      await this.submitDistributeTokenTransaction(distributeTokenArgs)
    const eventTopics = this.getEventTopics(
      this._getFunctionChainId(distributeTokenArgs.chainId),
    )
    const { token } = distributeTokenArgs
    const eventTopic =
      token === zeroAddress
        ? eventTopics.distributeToken[0]
        : eventTopics.distributeToken[1]
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: [eventTopic],
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitUpdateSplitAndDistributeTokenTransaction(
    updateAndDistributeArgs: UpdateSplitAndDistributeTokenConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._updateSplitAndDistributeTokenTransaction(
      updateAndDistributeArgs,
    )
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async updateSplitAndDistributeToken(
    updateAndDistributeArgs: UpdateSplitAndDistributeTokenConfig,
  ): Promise<{
    event: Log
  }> {
    const { txHash } =
      await this.submitUpdateSplitAndDistributeTokenTransaction(
        updateAndDistributeArgs,
      )
    const eventTopics = this.getEventTopics(
      this._getFunctionChainId(updateAndDistributeArgs.chainId),
    )
    const { token } = updateAndDistributeArgs
    const eventTopic =
      token === zeroAddress
        ? eventTopics.updateSplitAndDistributeToken[1]
        : eventTopics.updateSplitAndDistributeToken[2]
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: [eventTopic],
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitWithdrawFundsTransaction(
    withdrawArgs: WithdrawFundsConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._withdrawFundsTransaction(withdrawArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async withdrawFunds(withdrawArgs: WithdrawFundsConfig): Promise<{
    event: Log
  }> {
    const { txHash } = await this.submitWithdrawFundsTransaction(withdrawArgs)
    const eventTopics = this.getEventTopics(
      this._getFunctionChainId(withdrawArgs.chainId),
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: eventTopics.withdrawFunds,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitInitiateControlTransferTransaction(
    initiateTransferArgs: InitiateControlTransferConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash =
      await this._initiateControlTransferTransaction(initiateTransferArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async initiateControlTransfer(
    initiateTransferArgs: InitiateControlTransferConfig,
  ): Promise<{
    event: Log
  }> {
    const { txHash } =
      await this.submitInitiateControlTransferTransaction(initiateTransferArgs)
    const eventTopics = this.getEventTopics(
      this._getFunctionChainId(initiateTransferArgs.chainId),
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: eventTopics.initiateControlTransfer,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitCancelControlTransferTransaction(
    cancelTransferArgs: CancelControlTransferConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash =
      await this._cancelControlTransferTransaction(cancelTransferArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async cancelControlTransfer(
    cancelTransferArgs: CancelControlTransferConfig,
  ): Promise<{
    event: Log
  }> {
    const { txHash } =
      await this.submitCancelControlTransferTransaction(cancelTransferArgs)
    const eventTopics = this.getEventTopics(
      this._getFunctionChainId(cancelTransferArgs.chainId),
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: eventTopics.cancelControlTransfer,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitAcceptControlTransferTransaction(
    acceptTransferArgs: AcceptControlTransferConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash =
      await this._acceptControlTransferTransaction(acceptTransferArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async acceptControlTransfer(
    acceptTransferArgs: AcceptControlTransferConfig,
  ): Promise<{
    event: Log
  }> {
    const { txHash } =
      await this.submitAcceptControlTransferTransaction(acceptTransferArgs)
    const eventTopics = this.getEventTopics(
      this._getFunctionChainId(acceptTransferArgs.chainId),
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: eventTopics.acceptControlTransfer,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitMakeSplitImmutableTransaction(
    makeImmutableArgs: MakeSplitImmutableConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._makeSplitImmutableTransaction(makeImmutableArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async makeSplitImmutable(
    makeImmutableArgs: MakeSplitImmutableConfig,
  ): Promise<{
    event: Log
  }> {
    const { txHash } =
      await this.submitMakeSplitImmutableTransaction(makeImmutableArgs)
    const eventTopics = this.getEventTopics(
      this._getFunctionChainId(makeImmutableArgs.chainId),
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: eventTopics.makeSplitImmutable,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async batchDistributeAndWithdraw(
    batchDistributeAndWithdrawArgs: BatchDistributeAndWithdrawConfig,
  ): Promise<{
    events: Log[]
  }> {
    const txHash = await this._batchDistributeAndWithdrawTransaction(
      batchDistributeAndWithdrawArgs,
      this.callData.distributeToken.bind(this.callData),
      this.callData.withdrawFunds.bind(this.callData),
    )
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')
    const eventTopics = this.getEventTopics(
      this._getFunctionChainId(batchDistributeAndWithdrawArgs.chainId),
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: eventTopics.distributeToken.concat(
        eventTopics.withdrawFunds,
      ),
    })

    return { events }
  }

  async batchDistributeAndWithdrawForAll(
    batchDistributeAndWithdrawForAllArgs: BatchDistributeAndWithdrawForAllConfig,
  ): Promise<{
    events: Log[]
  }> {
    const txHash = await this._batchDistributeAndWithdrawForAllTransaction(
      batchDistributeAndWithdrawForAllArgs,
      this.callData.distributeToken.bind(this.callData),
      this.callData.withdrawFunds.bind(this.callData),
    )
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')
    const eventTopics = this.getEventTopics(
      this._getFunctionChainId(batchDistributeAndWithdrawForAllArgs.chainId),
    )
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: eventTopics.distributeToken.concat(
        eventTopics.withdrawFunds,
      ),
    })

    return { events }
  }

  // Read actions
  async getSplitBalance({
    splitAddress,
    token = zeroAddress,
    chainId,
  }: GetSplitBalanceConfig): Promise<{
    balance: bigint
  }> {
    validateAddress(splitAddress)
    validateAddress(token)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const splitMainContract = this._getSplitMainContract(functionChainId)

    const balance =
      token === zeroAddress
        ? await splitMainContract.read.getETHBalance([getAddress(splitAddress)])
        : await splitMainContract.read.getERC20Balance([
            getAddress(splitAddress),
            getAddress(token),
          ])

    return { balance }
  }

  async predictImmutableSplitAddress({
    recipients,
    distributorFeePercent,
    chainId,
  }: {
    recipients: SplitRecipient[]
    distributorFeePercent: number
    chainId?: number
  }): Promise<{
    splitAddress: Address
    splitExists: boolean
  }> {
    validateSplitInputs({ recipients, distributorFeePercent })

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const splitMainContract = this._getSplitMainContract(functionChainId)

    const splitAddress =
      await splitMainContract.read.predictImmutableSplitAddress([
        accounts,
        percentAllocations.map((p) => Number(p)),
        Number(distributorFee),
      ])

    const { hash } = await this.getHash({ splitAddress })
    const splitExists =
      hash !==
      '0x0000000000000000000000000000000000000000000000000000000000000000'

    return { splitAddress, splitExists }
  }

  async getController({
    splitAddress,
    chainId,
  }: {
    splitAddress: string
    chainId?: number
  }): Promise<{
    controller: Address
  }> {
    validateAddress(splitAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const splitMainContract = this._getSplitMainContract(functionChainId)

    const controller = await splitMainContract.read.getController([
      getAddress(splitAddress),
    ])

    return { controller }
  }

  async getNewPotentialController({
    splitAddress,
    chainId,
  }: {
    splitAddress: string
    chainId?: number
  }): Promise<{
    newPotentialController: Address
  }> {
    validateAddress(splitAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const splitMainContract = this._getSplitMainContract(functionChainId)

    const newPotentialController =
      await splitMainContract.read.getNewPotentialController([
        getAddress(splitAddress),
      ])

    return { newPotentialController }
  }

  async getHash({
    splitAddress,
    chainId,
  }: {
    splitAddress: string
    chainId?: number
  }): Promise<{
    hash: string
  }> {
    validateAddress(splitAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const splitMainContract = this._getSplitMainContract(functionChainId)

    const hash = await splitMainContract.read.getHash([
      getAddress(splitAddress),
    ])

    return { hash }
  }

  async getSplitMetadataViaProvider({
    splitAddress,
    chainId,
  }: {
    splitAddress: string
    chainId?: number
  }): Promise<Split> {
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    if (!isAddress(splitAddress))
      throw new InvalidAddressError({ address: splitAddress })
    const { split } = await this._getSplitMetadataViaProvider(
      splitAddress,
      functionChainId,
    )
    return split
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface SplitV1Client extends BaseClientMixin {}
applyMixins(SplitV1Client, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class SplitV1GasEstimates extends SplitV1Transactions {
  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      ...clientArgs,
    })
  }

  async createSplit(createSplitArgs: CreateSplitConfig): Promise<bigint> {
    const gasEstimate = await this._createSplitTransaction(createSplitArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async updateSplit(updateSplitArgs: UpdateSplitConfig): Promise<bigint> {
    const gasEstimate = await this._updateSplitTransaction(updateSplitArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async distributeToken(
    distributeTokenArgs: DistributeTokenConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._distributeTokenTransaction(distributeTokenArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async updateSplitAndDistributeToken(
    updateAndDistributeArgs: UpdateSplitAndDistributeTokenConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._updateSplitAndDistributeTokenTransaction(
      updateAndDistributeArgs,
    )
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async withdrawFunds(withdrawArgs: WithdrawFundsConfig): Promise<bigint> {
    const gasEstimate = await this._withdrawFundsTransaction(withdrawArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async initiateControlTransfer(
    initiateTransferArgs: InitiateControlTransferConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._initiateControlTransferTransaction(initiateTransferArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async cancelControlTransfer(
    cancelTransferArgs: CancelControlTransferConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._cancelControlTransferTransaction(cancelTransferArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async acceptControlTransfer(
    acceptTransferArgs: AcceptControlTransferConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._acceptControlTransferTransaction(acceptTransferArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async makeSplitImmutable(
    makeImmutableArgs: MakeSplitImmutableConfig,
  ): Promise<bigint> {
    const gasEstimate =
      await this._makeSplitImmutableTransaction(makeImmutableArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface SplitV1GasEstimates extends BaseGasEstimatesMixin {}
applyMixins(SplitV1GasEstimates, [BaseGasEstimatesMixin])

class SplitV1CallData extends SplitV1Transactions {
  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      ...clientArgs,
    })
  }

  async createSplit(createSplitArgs: CreateSplitConfig): Promise<CallData> {
    const callData = await this._createSplitTransaction(createSplitArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async updateSplit(updateSplitArgs: UpdateSplitConfig): Promise<CallData> {
    const callData = await this._updateSplitTransaction(updateSplitArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async distributeToken(
    distributeTokenArgs: DistributeTokenConfig,
  ): Promise<CallData> {
    const callData = await this._distributeTokenTransaction(distributeTokenArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async updateSplitAndDistributeToken(
    updateAndDistributeArgs: UpdateSplitAndDistributeTokenConfig,
  ): Promise<CallData> {
    const callData = await this._updateSplitAndDistributeTokenTransaction(
      updateAndDistributeArgs,
    )
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async withdrawFunds(withdrawArgs: WithdrawFundsConfig): Promise<CallData> {
    const callData = await this._withdrawFundsTransaction(withdrawArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async initiateControlTransfer(
    initiateTransferArgs: InitiateControlTransferConfig,
  ): Promise<CallData> {
    const callData =
      await this._initiateControlTransferTransaction(initiateTransferArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async cancelControlTransfer(
    cancelTransferArgs: CancelControlTransferConfig,
  ): Promise<CallData> {
    const callData =
      await this._cancelControlTransferTransaction(cancelTransferArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async acceptControlTransfer(
    acceptTransferArgs: AcceptControlTransferConfig,
  ): Promise<CallData> {
    const callData =
      await this._acceptControlTransferTransaction(acceptTransferArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async makeSplitImmutable(
    makeImmutableArgs: MakeSplitImmutableConfig,
  ): Promise<CallData> {
    const callData =
      await this._makeSplitImmutableTransaction(makeImmutableArgs)
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async batchDistributeAndWithdraw(
    batchDistributeAndWithdrawArgs: BatchDistributeAndWithdrawConfig,
  ): Promise<CallData> {
    const callData = await this._batchDistributeAndWithdrawTransaction(
      batchDistributeAndWithdrawArgs,
      this.distributeToken.bind(this),
      this.withdrawFunds.bind(this),
    )
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async batchDistributeAndWithdrawForAll(
    batchDistributeAndWithdrawForAllArgs: BatchDistributeAndWithdrawForAllConfig,
  ): Promise<CallData> {
    const callData = await this._batchDistributeAndWithdrawForAllTransaction(
      batchDistributeAndWithdrawForAllArgs,
      this.distributeToken.bind(this),
      this.withdrawFunds.bind(this),
    )
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
