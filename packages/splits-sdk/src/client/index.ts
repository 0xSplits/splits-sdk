import {
  Address,
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
import { applyMixins } from './mixin'
import { WaterfallClient } from './waterfall'
import { LiquidSplitClient } from './liquidSplit'
import { PassThroughWalletClient } from './passThroughWallet'
import { OracleClient } from './oracle'
import { SwapperClient } from './swapper'
import { VestingClient } from './vesting'
import { TemplatesClient } from './templates'
import {
  ARBITRUM_CHAIN_IDS,
  AURORA_CHAIN_IDS,
  AVALANCHE_CHAIN_IDS,
  BSC_CHAIN_IDS,
  ETHEREUM_CHAIN_IDS,
  FANTOM_CHAIN_IDS,
  GNOSIS_CHAIN_IDS,
  LIQUID_SPLIT_CHAIN_IDS,
  OPTIMISM_CHAIN_IDS,
  POLYGON_CHAIN_IDS,
  ZORA_CHAIN_IDS,
  SPLITS_SUPPORTED_CHAIN_IDS,
  getSplitMainAddress,
  TransactionType,
  VESTING_CHAIN_IDS,
  WATERFALL_CHAIN_IDS,
  TEMPLATES_CHAIN_IDS,
  ORACLE_CHAIN_IDS,
  SWAPPER_CHAIN_IDS,
  PASS_THROUGH_WALLET_CHAIN_IDS,
  BASE_CHAIN_IDS,
  ADDRESS_ZERO,
} from '../constants'
import {
  splitMainEthereumAbi,
  splitMainPolygonAbi,
} from '../constants/abi/splitMain'
import {
  AccountNotFoundError,
  InvalidAuthError,
  MissingPublicClientError,
  TransactionFailedError,
  UnsupportedChainIdError,
} from '../errors'
import {
  ACCOUNT_QUERY,
  protectedFormatSplit,
  RELATED_SPLITS_QUERY,
  SPLIT_QUERY,
} from '../subgraph'
import type { GqlAccount, GqlSplit } from '../subgraph/types'
import type {
  SplitsClientConfig,
  CreateSplitConfig,
  UpdateSplitConfig,
  DistributeTokenConfig,
  WithdrawFundsConfig,
  InititateControlTransferConfig,
  CancelControlTransferConfig,
  AcceptControlTransferConfig,
  MakeSplitImmutableConfig,
  GetSplitBalanceConfig,
  UpdateSplitAndDistributeTokenConfig,
  SplitRecipient,
  Split,
  TokenBalances,
  Account,
  CallData,
  TransactionConfig,
  TransactionFormat,
  FormattedTokenBalances,
  SplitEarnings,
  FormattedSplitEarnings,
  FormattedEarningsByContract,
  UserEarningsByContract,
  FormattedUserEarningsByContract,
} from '../types'
import {
  getRecipientSortedAddressesAndAllocations,
  addEnsNames,
  getBigIntFromPercent,
} from '../utils'
import { validateAddress, validateSplitInputs } from '../utils/validation'

const polygonAbiChainIds = [
  ...POLYGON_CHAIN_IDS,
  ...OPTIMISM_CHAIN_IDS,
  ...ARBITRUM_CHAIN_IDS,
  ...GNOSIS_CHAIN_IDS,
  ...FANTOM_CHAIN_IDS,
  ...AVALANCHE_CHAIN_IDS,
  ...BSC_CHAIN_IDS,
  ...AURORA_CHAIN_IDS,
  ...ZORA_CHAIN_IDS,
  ...BASE_CHAIN_IDS,
]

class SplitsTransactions extends BaseTransactions {
  protected readonly _splitMainAbi
  protected readonly _splitMainContract

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

    if (ETHEREUM_CHAIN_IDS.includes(chainId)) {
      this._splitMainAbi = splitMainEthereumAbi
      this._splitMainContract = getContract({
        address: getSplitMainAddress(chainId),
        abi: splitMainEthereumAbi,
        publicClient: this._publicClient,
      })
    } else if (polygonAbiChainIds.includes(chainId)) {
      this._splitMainAbi = splitMainPolygonAbi
      this._splitMainContract = getContract({
        address: getSplitMainAddress(chainId),
        abi: splitMainPolygonAbi,
        publicClient: this._publicClient,
      })
    } else
      throw new UnsupportedChainIdError(chainId, SPLITS_SUPPORTED_CHAIN_IDS)
  }

  protected async _createSplitTransaction({
    recipients,
    distributorFeePercent,
    controller = ADDRESS_ZERO,
    transactionOverrides = {},
  }: CreateSplitConfig): Promise<TransactionFormat> {
    validateSplitInputs({ recipients, distributorFeePercent, controller })
    if (this._shouldRequireSigner) this._requireSigner()

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
    splitId,
    recipients,
    distributorFeePercent,
    transactionOverrides = {},
  }: UpdateSplitConfig): Promise<TransactionFormat> {
    validateAddress(splitId)
    validateSplitInputs({ recipients, distributorFeePercent })

    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireController(splitId)
    }

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
      functionName: 'updateSplit',
      functionArgs: [splitId, accounts, percentAllocations, distributorFee],
      transactionOverrides,
    })

    return result
  }

  protected async _distributeTokenTransaction({
    splitId,
    token,
    distributorAddress,
    transactionOverrides = {},
  }: DistributeTokenConfig): Promise<TransactionFormat> {
    validateAddress(splitId)
    validateAddress(token)
    if (this._shouldRequireSigner) this._requireSigner()

    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : this._signer?.account
      ? this._signer.account.address
      : ADDRESS_ZERO
    validateAddress(distributorPayoutAddress)

    // TO DO: handle bad split id/no metadata found
    const { recipients, distributorFeePercent } = await this.getSplitMetadata({
      splitId,
    })
    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
      functionName:
        token === ADDRESS_ZERO ? 'distributeETH' : 'distributeERC20',
      functionArgs:
        token === ADDRESS_ZERO
          ? [
              splitId,
              accounts,
              percentAllocations,
              distributorFee,
              distributorPayoutAddress,
            ]
          : [
              splitId,
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
    splitId,
    token,
    recipients,
    distributorFeePercent,
    distributorAddress,
    transactionOverrides = {},
  }: UpdateSplitAndDistributeTokenConfig): Promise<TransactionFormat> {
    validateAddress(splitId)
    validateAddress(token)
    validateSplitInputs({ recipients, distributorFeePercent })

    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireController(splitId)
    }

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)
    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : this._signer?.account
      ? this._signer.account.address
      : ADDRESS_ZERO
    validateAddress(distributorPayoutAddress)

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
      functionName:
        token === ADDRESS_ZERO
          ? 'updateAndDistributeETH'
          : 'updateAndDistributeERC20',
      functionArgs:
        token === ADDRESS_ZERO
          ? [
              splitId,
              accounts,
              percentAllocations,
              distributorFee,
              distributorPayoutAddress,
            ]
          : [
              splitId,
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
    if (this._shouldRequireSigner) this._requireSigner()

    const withdrawEth = tokens.includes(ADDRESS_ZERO) ? 1 : 0
    const erc20s = tokens.filter((token) => token !== ADDRESS_ZERO)

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
    splitId,
    newController,
    transactionOverrides = {},
  }: InititateControlTransferConfig): Promise<TransactionFormat> {
    validateAddress(splitId)

    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireController(splitId)
    }

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
      functionName: 'transferControl',
      functionArgs: [splitId, newController],
      transactionOverrides,
    })

    return result
  }

  protected async _cancelControlTransferTransaction({
    splitId,
    transactionOverrides = {},
  }: CancelControlTransferConfig): Promise<TransactionFormat> {
    validateAddress(splitId)

    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireController(splitId)
    }

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
      functionName: 'cancelControlTransfer',
      functionArgs: [splitId],
      transactionOverrides,
    })

    return result
  }

  protected async _acceptControlTransferTransaction({
    splitId,
    transactionOverrides = {},
  }: AcceptControlTransferConfig): Promise<TransactionFormat> {
    validateAddress(splitId)

    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireNewPotentialController(splitId)
    }

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
      functionName: 'acceptControl',
      functionArgs: [splitId],
      transactionOverrides,
    })

    return result
  }

  protected async _makeSplitImmutableTransaction({
    splitId,
    transactionOverrides = {},
  }: MakeSplitImmutableConfig): Promise<TransactionFormat> {
    validateAddress(splitId)

    if (this._shouldRequireSigner) {
      this._requireSigner()
      await this._requireController(splitId)
    }

    const result = await this._executeContractFunction({
      contractAddress: getSplitMainAddress(this._chainId),
      contractAbi: this._splitMainAbi,
      functionName: 'makeSplitImmutable',
      functionArgs: [splitId],
      transactionOverrides,
    })

    return result
  }

  // Graphql read actions
  async getSplitMetadata({ splitId }: { splitId: string }): Promise<Split> {
    validateAddress(splitId)
    const chainId = this._chainId

    const response = await this._makeGqlRequest<{ split: GqlSplit }>(
      SPLIT_QUERY,
      {
        splitId: splitId.toLowerCase(),
      },
    )

    if (!response.split)
      throw new AccountNotFoundError(
        `No split found at address ${splitId} on chain ${chainId}, please confirm you have entered the correct address. There may just be a delay in subgraph indexing.`,
      )

    return await this._formatSplit(response.split)
  }

  protected async _formatSplit(gqlSplit: GqlSplit): Promise<Split> {
    const split = protectedFormatSplit(gqlSplit)

    if (this._includeEnsNames) {
      if (!this._ensPublicClient) throw new Error()
      await addEnsNames(
        this._ensPublicClient,
        split.recipients.map((recipient) => {
          return {
            ...recipient,
            address: getAddress(recipient.address),
          }
        }),
      )
    }

    return split
  }

  private async _requireController(splitId: string) {
    const controller = await this._splitMainContract.read.getController([
      getAddress(splitId),
    ])
    // TODO: how to get rid of this, needed for typescript check
    if (!this._signer?.account) throw new Error()

    const signerAddress = this._signer.account.address

    if (controller.toLowerCase() !== signerAddress.toLowerCase())
      throw new InvalidAuthError(
        `Action only available to the split controller. Split id: ${splitId}, split controller: ${controller}, signer: ${signerAddress}`,
      )
  }

  private async _requireNewPotentialController(splitId: string) {
    const newPotentialController =
      await this._splitMainContract.read.getNewPotentialController([
        getAddress(splitId),
      ])
    // TODO: how to get rid of this, needed for typescript check
    if (!this._signer?.account) throw new Error()
    const signerAddress = this._signer.account.address

    if (newPotentialController.toLowerCase() !== signerAddress.toLowerCase())
      throw new InvalidAuthError(
        `Action only available to the split's new potential controller. Split new potential controller: ${newPotentialController}. Signer: ${signerAddress}`,
      )
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class SplitsClient extends SplitsTransactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly waterfall: WaterfallClient | undefined
  readonly liquidSplits: LiquidSplitClient | undefined
  readonly passThroughWallet: PassThroughWalletClient | undefined
  readonly vesting: VestingClient | undefined
  readonly oracle: OracleClient | undefined
  readonly swapper: SwapperClient | undefined
  readonly templates: TemplatesClient | undefined
  readonly callData: SplitsCallData
  readonly estimateGas: SplitsGasEstimates

  constructor({
    chainId,
    publicClient,
    account,
    includeEnsNames = false,
    ensPublicClient,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      ensPublicClient,
      account,
      includeEnsNames,
    })

    if (WATERFALL_CHAIN_IDS.includes(chainId)) {
      this.waterfall = new WaterfallClient({
        chainId,
        publicClient,
        ensPublicClient,
        account,
        includeEnsNames,
      })
    }
    if (LIQUID_SPLIT_CHAIN_IDS.includes(chainId)) {
      this.liquidSplits = new LiquidSplitClient({
        chainId,
        publicClient,
        ensPublicClient,
        account,
        includeEnsNames,
      })
    }
    if (VESTING_CHAIN_IDS.includes(chainId)) {
      this.vesting = new VestingClient({
        chainId,
        publicClient,
        ensPublicClient,
        account,
        includeEnsNames,
      })
    }
    if (TEMPLATES_CHAIN_IDS.includes(chainId)) {
      this.templates = new TemplatesClient({
        chainId,
        publicClient,
        ensPublicClient,
        account,
        includeEnsNames,
      })
    }
    if (ORACLE_CHAIN_IDS.includes(chainId)) {
      this.oracle = new OracleClient({
        chainId,
        publicClient,
        ensPublicClient,
        account,
        includeEnsNames,
      })
    }
    if (SWAPPER_CHAIN_IDS.includes(chainId)) {
      this.swapper = new SwapperClient({
        chainId,
        publicClient,
        ensPublicClient,
        account,
        includeEnsNames,
      })
    }
    if (PASS_THROUGH_WALLET_CHAIN_IDS.includes(chainId)) {
      this.passThroughWallet = new PassThroughWalletClient({
        chainId,
        publicClient,
        ensPublicClient,
        account,
        includeEnsNames,
      })
    }

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

    this.callData = new SplitsCallData({
      chainId,
      publicClient,
      ensPublicClient,
      account,
      includeEnsNames,
    })
    this.estimateGas = new SplitsGasEstimates({
      chainId,
      publicClient,
      ensPublicClient,
      account,
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
    splitId: string
    event: Log
  }> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } = await this.submitCreateSplitTransaction(createSplitArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.createSplit,
    })
    const event = events.length > 0 ? events[0] : undefined
    if (event) {
      const log = decodeEventLog({
        abi: this._splitMainAbi,
        data: event.data,
        topics: event.topics,
      })
      if (log.eventName !== 'CreateSplit') throw new Error()
      return {
        splitId: log.args.split,
        event,
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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } =
      await this.submitDistributeTokenTransaction(distributeTokenArgs)
    const { token } = distributeTokenArgs
    const eventTopic =
      token === ADDRESS_ZERO
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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } =
      await this.submitUpdateSplitAndDistributeTokenTransaction(
        updateAndDistributeArgs,
      )
    const { token } = updateAndDistributeArgs
    const eventTopic =
      token === ADDRESS_ZERO
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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

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
    initiateTransferArgs: InititateControlTransferConfig,
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
    initiateTransferArgs: InititateControlTransferConfig,
  ): Promise<{
    event: Log
  }> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

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
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

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

  async batchDistributeAndWithdraw({
    splitId,
    tokens,
    recipientAddresses,
    distributorAddress,
  }: {
    splitId: string
    tokens: string[]
    recipientAddresses: string[]
    distributorAddress?: string
  }): Promise<{
    events: Log[]
  }> {
    validateAddress(splitId)
    tokens.map((token) => validateAddress(token))
    recipientAddresses.map((address) => validateAddress(address))

    this._requireSigner()
    // TODO: how to remove this, needed for typescript check right now
    if (!this._signer?.account) throw new Error()

    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : this._signer.account.address
    validateAddress(distributorPayoutAddress)

    const distributeCalls = await Promise.all(
      tokens.map(async (token) => {
        return await this.callData.distributeToken({
          splitId,
          token,
          distributorAddress: distributorPayoutAddress,
        })
      }),
    )
    const withdrawCalls = await Promise.all(
      recipientAddresses.map(async (address) => {
        return await this.callData.withdrawFunds({ address, tokens })
      }),
    )

    const multicallData = [...distributeCalls, ...withdrawCalls]
    const { events } = await this.multicall({ calls: multicallData })

    return { events }
  }

  async batchDistributeAndWithdrawForAll({
    splitId,
    tokens,
    distributorAddress,
  }: {
    splitId: string
    tokens: string[]
    distributorAddress?: string
  }): Promise<{
    events: Log[]
  }> {
    validateAddress(splitId)
    tokens.map((token) => validateAddress(token))
    this._requireSigner()

    const { recipients } = await this.getSplitMetadata({ splitId })
    const recipientAddresses = recipients.map((recipient) => recipient.address)

    const { events } = await this.batchDistributeAndWithdraw({
      splitId,
      tokens,
      recipientAddresses,
      distributorAddress,
    })

    return { events }
  }

  // Read actions
  async getSplitBalance({
    splitId,
    token = ADDRESS_ZERO,
  }: GetSplitBalanceConfig): Promise<{
    balance: bigint
  }> {
    validateAddress(splitId)
    validateAddress(token)
    this._requirePublicClient()

    const balance =
      token === ADDRESS_ZERO
        ? await this._splitMainContract.read.getETHBalance([
            getAddress(splitId),
          ])
        : await this._splitMainContract.read.getERC20Balance([
            getAddress(splitId),
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
    splitId: Address
  }> {
    validateSplitInputs({ recipients, distributorFeePercent })
    this._requirePublicClient()

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigIntFromPercent(distributorFeePercent)
    const splitId =
      await this._splitMainContract.read.predictImmutableSplitAddress([
        accounts,
        percentAllocations.map((p) => Number(p)),
        Number(distributorFee),
      ])

    return { splitId }
  }

  async getController({ splitId }: { splitId: string }): Promise<{
    controller: Address
  }> {
    validateAddress(splitId)
    this._requirePublicClient()

    const controller = await this._splitMainContract.read.getController([
      getAddress(splitId),
    ])

    return { controller }
  }

  async getNewPotentialController({ splitId }: { splitId: string }): Promise<{
    newPotentialController: Address
  }> {
    validateAddress(splitId)
    this._requirePublicClient()

    const newPotentialController =
      await this._splitMainContract.read.getNewPotentialController([
        getAddress(splitId),
      ])

    return { newPotentialController }
  }

  async getHash({ splitId }: { splitId: string }): Promise<{
    hash: string
  }> {
    validateAddress(splitId)
    this._requirePublicClient()

    const hash = await this._splitMainContract.read.getHash([
      getAddress(splitId),
    ])

    return { hash }
  }

  // Graphql read actions
  async getRelatedSplits({ address }: { address: string }): Promise<{
    receivingFrom: Split[]
    controlling: Split[]
    pendingControl: Split[]
  }> {
    validateAddress(address)

    const response = await this._makeGqlRequest<{
      receivingFrom: { split: GqlSplit }[]
      controlling: GqlSplit[]
      pendingControl: GqlSplit[]
    }>(RELATED_SPLITS_QUERY, { accountId: address.toLowerCase() })

    const [receivingFrom, controlling, pendingControl] = await Promise.all([
      Promise.all(
        response.receivingFrom.map(
          async (recipient) => await this._formatSplit(recipient.split),
        ),
      ),
      Promise.all(
        response.controlling.map(
          async (gqlSplit) => await this._formatSplit(gqlSplit),
        ),
      ),
      Promise.all(
        response.pendingControl.map(
          async (gqlSplit) => await this._formatSplit(gqlSplit),
        ),
      ),
    ])

    return {
      receivingFrom,
      controlling,
      pendingControl,
    }
  }

  async getSplitEarnings({
    splitId,
    includeActiveBalances = true,
    erc20TokenList,
  }: {
    splitId: string
    includeActiveBalances?: boolean
    erc20TokenList?: string[]
  }): Promise<SplitEarnings> {
    validateAddress(splitId)
    if (includeActiveBalances && !this._publicClient)
      throw new MissingPublicClientError(
        'Provider required to get split active balances. Please update your call to the SplitsClient constructor with a valid provider, or set includeActiveBalances to false',
      )

    const { withdrawn, activeBalances } = await this._getAccountBalances({
      accountId: getAddress(splitId),
      includeActiveBalances,
      erc20TokenList,
    })

    if (!includeActiveBalances) return { distributed: withdrawn }
    return { distributed: withdrawn, activeBalances }
  }

  async getFormattedSplitEarnings({
    splitId,
    includeActiveBalances = true,
    erc20TokenList,
  }: {
    splitId: string
    includeActiveBalances?: boolean
    erc20TokenList?: string[]
  }): Promise<FormattedSplitEarnings> {
    if (!this._publicClient)
      throw new MissingPublicClientError(
        'Provider required to get formatted earnings. Please update your call to the SplitsClient constructor with a valid provider',
      )
    const { distributed, activeBalances } = await this.getSplitEarnings({
      splitId,
      includeActiveBalances,
      erc20TokenList,
    })

    const balancesToFormat = [distributed]
    if (activeBalances) balancesToFormat.push(activeBalances)

    const formattedBalances =
      await this._getFormattedTokenBalances(balancesToFormat)
    const returnData: {
      distributed: FormattedTokenBalances
      activeBalances?: FormattedTokenBalances
    } = {
      distributed: formattedBalances[0],
    }
    if (includeActiveBalances) {
      returnData.activeBalances = formattedBalances[1]
    }

    return returnData
  }

  async getUserEarnings({ userId }: { userId: string }): Promise<{
    withdrawn: TokenBalances
    activeBalances: TokenBalances
  }> {
    validateAddress(userId)

    const { withdrawn, activeBalances } = await this._getAccountBalances({
      accountId: getAddress(userId),
      includeActiveBalances: true,
    })
    if (!activeBalances) throw new Error('Missing active balances')

    return { withdrawn, activeBalances }
  }

  async getFormattedUserEarnings({ userId }: { userId: string }): Promise<{
    withdrawn: FormattedTokenBalances
    activeBalances: FormattedTokenBalances
  }> {
    if (!this._publicClient)
      throw new MissingPublicClientError(
        'Provider required to get formatted earnings. Please update your call to the SplitsClient constructor with a valid provider',
      )

    const { withdrawn, activeBalances } = await this.getUserEarnings({ userId })
    const balancesToFormat = [withdrawn, activeBalances]
    const formattedBalances =
      await this._getFormattedTokenBalances(balancesToFormat)

    return {
      withdrawn: formattedBalances[0],
      activeBalances: formattedBalances[1],
    }
  }

  async getUserEarningsByContract({
    userId,
    contractIds,
  }: {
    userId: string
    contractIds?: string[]
  }): Promise<UserEarningsByContract> {
    validateAddress(userId)
    if (contractIds) {
      contractIds.map((contractId) => validateAddress(contractId))
    }

    const { contractEarnings } = await this._getUserBalancesByContract({
      userId,
      contractIds,
    })
    const [withdrawn, activeBalances] = Object.values(contractEarnings).reduce(
      (
        acc,
        {
          withdrawn: contractWithdrawn,
          activeBalances: contractActiveBalances,
        },
      ) => {
        Object.keys(contractWithdrawn).map((tokenId) => {
          acc[0][tokenId] =
            (acc[0][tokenId] ?? BigInt(0)) + contractWithdrawn[tokenId]
        })
        Object.keys(contractActiveBalances).map((tokenId) => {
          acc[1][tokenId] =
            (acc[1][tokenId] ?? BigInt(0)) + contractActiveBalances[tokenId]
        })

        return acc
      },
      [{} as TokenBalances, {} as TokenBalances],
    )

    return {
      withdrawn,
      activeBalances,
      earningsByContract: contractEarnings,
    }
  }

  async getFormattedUserEarningsByContract({
    userId,
    contractIds,
  }: {
    userId: string
    contractIds?: string[]
  }): Promise<FormattedUserEarningsByContract> {
    if (!this._publicClient) {
      throw new MissingPublicClientError(
        'Provider required to get formatted earnings. Please update your call to the SplitsClient contstructor with a valid provider.',
      )
    }

    const { withdrawn, activeBalances, earningsByContract } =
      await this.getUserEarningsByContract({ userId, contractIds })
    const balancesToFormat = [withdrawn, activeBalances]
    Object.keys(earningsByContract).map((contractAddress) => {
      balancesToFormat.push(earningsByContract[contractAddress].withdrawn)
      balancesToFormat.push(earningsByContract[contractAddress].activeBalances)
    })
    const formattedBalances =
      await this._getFormattedTokenBalances(balancesToFormat)
    const formattedContractEarnings = Object.keys(earningsByContract).reduce(
      (acc, contractAddress, index) => {
        const contractWithdrawn = formattedBalances[index * 2 + 2]
        const contractActiveBalances = formattedBalances[index * 2 + 3]
        acc[contractAddress] = {
          withdrawn: contractWithdrawn,
          activeBalances: contractActiveBalances,
        }
        return acc
      },
      {} as FormattedEarningsByContract,
    )

    return {
      withdrawn: formattedBalances[0],
      activeBalances: formattedBalances[1],
      earningsByContract: formattedContractEarnings,
    }
  }

  /*
  /
  / ACCOUNT ACTIONS
  /
  */
  // Graphql read actions
  async getAccountMetadata({
    accountId,
  }: {
    accountId: string
  }): Promise<Account | undefined> {
    validateAddress(accountId)
    this._requirePublicClient()

    const chainId = this._chainId

    const response = await this._makeGqlRequest<{
      account: GqlAccount
    }>(ACCOUNT_QUERY, {
      accountId: accountId.toLowerCase(),
    })

    if (!response.account)
      throw new AccountNotFoundError(
        `No account found at address ${accountId} on chain ${chainId}, please confirm you have entered the correct address. There may just be a delay in subgraph indexing.`,
      )

    return await this._formatAccount(response.account)
  }

  // Helper functions
  private async _formatAccount(
    gqlAccount: GqlAccount,
  ): Promise<Account | undefined> {
    if (!gqlAccount) return

    if (gqlAccount.__typename === 'Split')
      return await this._formatSplit(gqlAccount)
    else if (gqlAccount.__typename === 'WaterfallModule' && this.waterfall)
      return await this.waterfall.formatWaterfallModule(gqlAccount)
    else if (gqlAccount.__typename === 'LiquidSplit' && this.liquidSplits)
      return await this.liquidSplits.formatLiquidSplit(gqlAccount)
    else if (gqlAccount.__typename === 'Swapper' && this.swapper)
      return await this.swapper.formatSwapper(gqlAccount)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface SplitsClient extends BaseClientMixin {}
applyMixins(SplitsClient, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class SplitsGasEstimates extends SplitsTransactions {
  constructor({
    chainId,
    publicClient,
    account,
    includeEnsNames = false,
    ensPublicClient,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      publicClient,
      account,
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
    initiateTransferArgs: InititateControlTransferConfig,
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
interface SplitsGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(SplitsGasEstimates, [BaseGasEstimatesMixin])

class SplitsCallData extends SplitsTransactions {
  constructor({
    chainId,
    publicClient,
    account,
    includeEnsNames = false,
    ensPublicClient,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      chainId,
      publicClient,
      account,
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
    initiateTransferArgs: InititateControlTransferConfig,
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
}
