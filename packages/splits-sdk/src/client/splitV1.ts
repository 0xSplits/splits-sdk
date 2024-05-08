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
  SplitRecipient,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
  UpdateSplitAndDistributeTokenConfig,
  UpdateSplitConfig,
  WithdrawFundsConfig,
} from '../types'
import {
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
]

type SplitMainEthereumAbiType = typeof splitMainEthereumAbi

class SplitV1Transactions extends BaseTransactions {
  protected readonly _splitMainAbi
  protected readonly _splitMainContract: GetContractReturnType<
    SplitMainEthereumAbiType,
    PublicClient<Transport, Chain>
  >

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

    this._splitMainContract = getContract({
      address: getSplitMainAddress(chainId),
      abi: splitMainEthereumAbi,
      publicClient: this._publicClient,
    })

    if (ETHEREUM_CHAIN_IDS.includes(chainId)) {
      this._splitMainAbi = splitMainEthereumAbi
    } else if (polygonAbiChainIds.includes(chainId)) {
      this._splitMainAbi = splitMainPolygonAbi
    } else
      throw new UnsupportedChainIdError(chainId, SPLITS_SUPPORTED_CHAIN_IDS)
  }

  protected async _createSplitTransaction({
    recipients,
    distributorFeePercent,
    controller = zeroAddress,
    transactionOverrides = {},
  }: CreateSplitConfig): Promise<TransactionFormat> {
    validateSplitInputs({ recipients, distributorFeePercent, controller })
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
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
    transactionOverrides = {},
  }: UpdateSplitConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    validateSplitInputs({ recipients, distributorFeePercent })

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireController(splitAddress)
    }

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
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

    const { recipients, distributorFeePercent } =
      await this._dataClient.getSplitMetadata({
        chainId: this._chainId,
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
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
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
    transactionOverrides = {},
  }: UpdateSplitAndDistributeTokenConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)
    validateAddress(token)
    validateSplitInputs({ recipients, distributorFeePercent })

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireController(splitAddress)
    }

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
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
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
    transactionOverrides = {},
  }: WithdrawFundsConfig): Promise<TransactionFormat> {
    validateAddress(address)
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const withdrawEth = tokens.includes(zeroAddress) ? 1 : 0
    const erc20s = tokens.filter((token) => token !== zeroAddress)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
      functionName: 'withdraw',
      functionArgs: [address, withdrawEth, erc20s],
      transactionOverrides,
    })

    return result
  }

  protected async _initiateControlTransferTransaction({
    splitAddress,
    newController,
    transactionOverrides = {},
  }: InitiateControlTransferConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireController(splitAddress)
    }

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
      functionName: 'transferControl',
      functionArgs: [splitAddress, newController],
      transactionOverrides,
    })

    return result
  }

  protected async _cancelControlTransferTransaction({
    splitAddress,
    transactionOverrides = {},
  }: CancelControlTransferConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireController(splitAddress)
    }

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
      functionName: 'cancelControlTransfer',
      functionArgs: [splitAddress],
      transactionOverrides,
    })

    return result
  }

  protected async _acceptControlTransferTransaction({
    splitAddress,
    transactionOverrides = {},
  }: AcceptControlTransferConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireNewPotentialController(splitAddress)
    }

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
      functionName: 'acceptControl',
      functionArgs: [splitAddress],
      transactionOverrides,
    })

    return result
  }

  protected async _makeSplitImmutableTransaction({
    splitAddress,
    transactionOverrides = {},
  }: MakeSplitImmutableConfig): Promise<TransactionFormat> {
    validateAddress(splitAddress)

    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
      await this._requireController(splitAddress)
    }

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
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

    const { recipients } = await this._dataClient!.getSplitMetadata({
      chainId: this._chainId,
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

  private async _requireController(splitAddress: string) {
    const controller = await this._splitMainContract.read.getController([
      getAddress(splitAddress),
    ])

    const walletAddress = this._walletClient!.account.address

    if (controller.toLowerCase() !== walletAddress.toLowerCase())
      throw new InvalidAuthError(
        `Action only available to the split controller. Split id: ${splitAddress}, split controller: ${controller}, wallet address: ${walletAddress}`,
      )
  }

  private async _requireNewPotentialController(splitAddress: string) {
    const newPotentialController =
      await this._splitMainContract.read.getNewPotentialController([
        getAddress(splitAddress),
      ])

    const walletAddress = this._walletClient!.account.address

    if (newPotentialController.toLowerCase() !== walletAddress.toLowerCase())
      throw new InvalidAuthError(
        `Action only available to the split's new potential controller. Split new potential controller: ${newPotentialController}. Wallet address: ${walletAddress}`,
      )
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class SplitV1Client extends SplitV1Transactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: SplitV1CallData
  readonly estimateGas: SplitV1GasEstimates

  constructor({
    chainId,
    publicClient,
    walletClient,
    apiConfig,
    includeEnsNames = false,
    ensPublicClient,
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

    this.eventTopics = {
      createSplit: [
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'CreateSplit',
        })[0],
      ],
      updateSplit: [
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'UpdateSplit',
        })[0],
      ],
      distributeToken: [
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'DistributeETH',
        })[0],
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'DistributeERC20',
        })[0],
      ],
      updateSplitAndDistributeToken: [
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'UpdateSplit',
        })[0],
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'DistributeETH',
        })[0],
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'DistributeERC20',
        })[0],
      ],
      withdrawFunds: [
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'Withdrawal',
        })[0],
      ],
      initiateControlTransfer: [
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'InitiateControlTransfer',
        })[0],
      ],
      cancelControlTransfer: [
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'CancelControlTransfer',
        })[0],
      ],
      acceptControlTransfer: [
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'ControlTransfer',
        })[0],
      ],
      makeSplitImmutable: [
        encodeEventTopics({
          abi: this._splitMainAbi,
          eventName: 'ControlTransfer',
        })[0],
      ],
    }

    this.callData = new SplitV1CallData({
      chainId,
      publicClient,
      ensPublicClient,
      apiConfig,
      walletClient,
      includeEnsNames,
    })
    this.estimateGas = new SplitV1GasEstimates({
      chainId,
      publicClient,
      ensPublicClient,
      apiConfig,
      walletClient,
      includeEnsNames,
    })
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
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.createSplit,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      if (ETHEREUM_CHAIN_IDS.includes(this._chainId)) {
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
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.updateSplit,
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
    const { token } = distributeTokenArgs
    const eventTopic =
      token === zeroAddress
        ? this.eventTopics.distributeToken[0]
        : this.eventTopics.distributeToken[1]
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
    const { token } = updateAndDistributeArgs
    const eventTopic =
      token === zeroAddress
        ? this.eventTopics.updateSplitAndDistributeToken[1]
        : this.eventTopics.updateSplitAndDistributeToken[2]
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
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.withdrawFunds,
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
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.initiateControlTransfer,
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
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.cancelControlTransfer,
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
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.acceptControlTransfer,
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
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.makeSplitImmutable,
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
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.distributeToken.concat(
        this.eventTopics.withdrawFunds,
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
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.distributeToken.concat(
        this.eventTopics.withdrawFunds,
      ),
    })

    return { events }
  }

  // Read actions
  async getSplitBalance({
    splitAddress,
    token = zeroAddress,
  }: GetSplitBalanceConfig): Promise<{
    balance: bigint
  }> {
    validateAddress(splitAddress)
    validateAddress(token)
    this._requirePublicClient()

    const balance =
      token === zeroAddress
        ? await this._splitMainContract.read.getETHBalance([
            getAddress(splitAddress),
          ])
        : await this._splitMainContract.read.getERC20Balance([
            getAddress(splitAddress),
            getAddress(token),
          ])

    return { balance }
  }

  async predictImmutableSplitAddress({
    recipients,
    distributorFeePercent,
  }: {
    recipients: SplitRecipient[]
    distributorFeePercent: number
  }): Promise<{
    splitAddress: Address
    splitExists: boolean
  }> {
    validateSplitInputs({ recipients, distributorFeePercent })
    this._requirePublicClient()

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)
    const splitAddress =
      await this._splitMainContract.read.predictImmutableSplitAddress([
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

  async getController({ splitAddress }: { splitAddress: string }): Promise<{
    controller: Address
  }> {
    validateAddress(splitAddress)
    this._requirePublicClient()

    const controller = await this._splitMainContract.read.getController([
      getAddress(splitAddress),
    ])

    return { controller }
  }

  async getNewPotentialController({
    splitAddress,
  }: {
    splitAddress: string
  }): Promise<{
    newPotentialController: Address
  }> {
    validateAddress(splitAddress)
    this._requirePublicClient()

    const newPotentialController =
      await this._splitMainContract.read.getNewPotentialController([
        getAddress(splitAddress),
      ])

    return { newPotentialController }
  }

  async getHash({ splitAddress }: { splitAddress: string }): Promise<{
    hash: string
  }> {
    validateAddress(splitAddress)
    this._requirePublicClient()

    const hash = await this._splitMainContract.read.getHash([
      getAddress(splitAddress),
    ])

    return { hash }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface SplitV1Client extends BaseClientMixin {}
applyMixins(SplitV1Client, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class SplitV1GasEstimates extends SplitV1Transactions {
  constructor({
    chainId,
    publicClient,
    walletClient,
    apiConfig,
    includeEnsNames = false,
    ensPublicClient,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      publicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
      ensPublicClient,
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
  constructor({
    chainId,
    publicClient,
    walletClient,
    apiConfig,
    includeEnsNames = false,
    ensPublicClient,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      chainId,
      publicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
      ensPublicClient,
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
