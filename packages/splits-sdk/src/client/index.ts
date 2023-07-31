import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Contract, ContractTransaction, Event } from '@ethersproject/contracts'

import SPLIT_MAIN_ARTIFACT_ETHEREUM from '../artifacts/contracts/SplitMain/ethereum/SplitMain.json'
import SPLIT_MAIN_ARTIFACT_POLYGON from '../artifacts/contracts/SplitMain/polygon/SplitMain.json'
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
} from '../constants'
import {
  AccountNotFoundError,
  InvalidAuthError,
  MissingProviderError,
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
  SplitMainType,
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
} from '../types'
import {
  getRecipientSortedAddressesAndAllocations,
  getTransactionEvents,
  addEnsNames,
  getBigNumberFromPercent,
} from '../utils'
import { ContractCallData } from '../utils/multicall'
import { validateAddress, validateSplitInputs } from '../utils/validation'

const splitMainInterfaceEthereum = new Interface(
  SPLIT_MAIN_ARTIFACT_ETHEREUM.abi,
)
const splitMainInterfacePolygon = new Interface(SPLIT_MAIN_ARTIFACT_POLYGON.abi)

const polygonInterfaceChainIds = [
  ...POLYGON_CHAIN_IDS,
  ...OPTIMISM_CHAIN_IDS,
  ...ARBITRUM_CHAIN_IDS,
  ...GNOSIS_CHAIN_IDS,
  ...FANTOM_CHAIN_IDS,
  ...AVALANCHE_CHAIN_IDS,
  ...BSC_CHAIN_IDS,
  ...AURORA_CHAIN_IDS,
  ...ZORA_CHAIN_IDS,
]

class SplitsTransactions extends BaseTransactions {
  protected readonly _splitMainInterface: Interface
  protected readonly _splitMain:
    | ContractCallData
    | SplitMainType
    | SplitMainType['estimateGas']

  constructor({
    transactionType,
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })

    if (ETHEREUM_CHAIN_IDS.includes(chainId))
      this._splitMainInterface = splitMainInterfaceEthereum
    else if (polygonInterfaceChainIds.includes(chainId))
      this._splitMainInterface = splitMainInterfacePolygon
    else throw new UnsupportedChainIdError(chainId, SPLITS_SUPPORTED_CHAIN_IDS)

    this._splitMain = this._getSplitMainContract()
  }

  protected async _createSplitTransaction({
    recipients,
    distributorFeePercent,
    controller = AddressZero,
    transactionOverrides = {},
  }: CreateSplitConfig): Promise<TransactionFormat> {
    validateSplitInputs({ recipients, distributorFeePercent, controller })
    if (this._shouldRequireSigner) this._requireSigner()

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigNumberFromPercent(distributorFeePercent)

    const createSplitResult = await this._splitMain.createSplit(
      accounts,
      percentAllocations,
      distributorFee,
      controller,
      transactionOverrides,
    )

    return createSplitResult
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
    const distributorFee = getBigNumberFromPercent(distributorFeePercent)

    const updateSplitResult = await this._splitMain.updateSplit(
      splitId,
      accounts,
      percentAllocations,
      distributorFee,
      transactionOverrides,
    )

    return updateSplitResult
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
      : this._signer
      ? await this._signer.getAddress()
      : AddressZero
    validateAddress(distributorPayoutAddress)

    // TO DO: handle bad split id/no metadata found
    const { recipients, distributorFeePercent } = await this.getSplitMetadata({
      splitId,
    })
    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigNumberFromPercent(distributorFeePercent)

    const distributeTokenResult = await (token === AddressZero
      ? this._splitMain.distributeETH(
          splitId,
          accounts,
          percentAllocations,
          distributorFee,
          distributorPayoutAddress,
          transactionOverrides,
        )
      : this._splitMain.distributeERC20(
          splitId,
          token,
          accounts,
          percentAllocations,
          distributorFee,
          distributorPayoutAddress,
          transactionOverrides,
        ))
    return distributeTokenResult
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
    const distributorFee = getBigNumberFromPercent(distributorFeePercent)
    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : this._signer
      ? await this._signer.getAddress()
      : AddressZero
    validateAddress(distributorPayoutAddress)

    const updateAndDistributeResult = await (token === AddressZero
      ? this._splitMain.updateAndDistributeETH(
          splitId,
          accounts,
          percentAllocations,
          distributorFee,
          distributorPayoutAddress,
          transactionOverrides,
        )
      : this._splitMain.updateAndDistributeERC20(
          splitId,
          token,
          accounts,
          percentAllocations,
          distributorFee,
          distributorPayoutAddress,
          transactionOverrides,
        ))

    return updateAndDistributeResult
  }

  protected async _withdrawFundsTransaction({
    address,
    tokens,
    transactionOverrides = {},
  }: WithdrawFundsConfig): Promise<TransactionFormat> {
    validateAddress(address)
    if (this._shouldRequireSigner) this._requireSigner()

    const withdrawEth = tokens.includes(AddressZero) ? 1 : 0
    const erc20s = tokens.filter((token) => token !== AddressZero)

    const withdrawResult = await this._splitMain.withdraw(
      address,
      withdrawEth,
      erc20s,
      transactionOverrides,
    )

    return withdrawResult
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

    const transferSplitResult = await this._splitMain.transferControl(
      splitId,
      newController,
      transactionOverrides,
    )

    return transferSplitResult
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

    const cancelTransferSplitResult =
      await this._splitMain.cancelControlTransfer(splitId, transactionOverrides)
    return cancelTransferSplitResult
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

    const acceptTransferSplitResult = await this._splitMain.acceptControl(
      splitId,
      transactionOverrides,
    )
    return acceptTransferSplitResult
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

    const makeSplitImmutableResult = await this._splitMain.makeSplitImmutable(
      splitId,
      transactionOverrides,
    )
    return makeSplitImmutableResult
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
      if (!this._ensProvider) throw new Error()
      await addEnsNames(this._ensProvider, split.recipients)
    }

    return split
  }

  private async _requireController(splitId: string) {
    const controller = await this._splitMain.getController(splitId)
    // TODO: how to get rid of this, needed for typescript check
    if (!this._signer) throw new Error()

    const signerAddress = await this._signer.getAddress()

    if (controller !== signerAddress)
      throw new InvalidAuthError(
        `Action only available to the split controller. Split id: ${splitId}, split controller: ${controller}, signer: ${signerAddress}`,
      )
  }

  private async _requireNewPotentialController(splitId: string) {
    const newPotentialController =
      await this._splitMain.getNewPotentialController(splitId)
    // TODO: how to get rid of this, needed for typescript check
    if (!this._signer) throw new Error()
    const signerAddress = await this._signer.getAddress()

    if (newPotentialController !== signerAddress)
      throw new InvalidAuthError(
        `Action only available to the split's new potential controller. Split new potential controller: ${newPotentialController}. Signer: ${signerAddress}`,
      )
  }

  private _getSplitMainContract() {
    const splitMainAddress = getSplitMainAddress(this._chainId)

    if (this._transactionType === TransactionType.CallData)
      if (ETHEREUM_CHAIN_IDS.includes(this._chainId)) {
        return new ContractCallData(
          splitMainAddress,
          SPLIT_MAIN_ARTIFACT_ETHEREUM.abi,
        )
      } else {
        return new ContractCallData(
          splitMainAddress,
          SPLIT_MAIN_ARTIFACT_POLYGON.abi,
        )
      }

    const splitMainContract = new Contract(
      splitMainAddress,
      this._splitMainInterface,
      this._signer || this._provider,
    ) as SplitMainType
    if (this._transactionType === TransactionType.GasEstimate)
      return splitMainContract.estimateGas

    return splitMainContract
  }
}

export class SplitsClient extends SplitsTransactions {
  readonly eventTopics: { [key: string]: string[] }
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
    provider,
    signer,
    includeEnsNames = false,
    ensProvider,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })

    if (WATERFALL_CHAIN_IDS.includes(chainId)) {
      this.waterfall = new WaterfallClient({
        chainId,
        provider,
        ensProvider,
        signer,
        includeEnsNames,
      })
    }
    if (LIQUID_SPLIT_CHAIN_IDS.includes(chainId)) {
      this.liquidSplits = new LiquidSplitClient({
        chainId,
        provider,
        ensProvider,
        signer,
        includeEnsNames,
      })
    }
    if (VESTING_CHAIN_IDS.includes(chainId)) {
      this.vesting = new VestingClient({
        chainId,
        provider,
        ensProvider,
        signer,
        includeEnsNames,
      })
    }
    if (TEMPLATES_CHAIN_IDS.includes(chainId)) {
      this.templates = new TemplatesClient({
        chainId,
        provider,
        ensProvider,
        signer,
        includeEnsNames,
      })
    }
    if (ORACLE_CHAIN_IDS.includes(chainId)) {
      this.oracle = new OracleClient({
        chainId,
        provider,
        ensProvider,
        signer,
        includeEnsNames,
      })
    }
    if (SWAPPER_CHAIN_IDS.includes(chainId)) {
      this.swapper = new SwapperClient({
        chainId,
        provider,
        ensProvider,
        signer,
        includeEnsNames,
      })
    }
    if (PASS_THROUGH_WALLET_CHAIN_IDS.includes(chainId)) {
      this.passThroughWallet = new PassThroughWalletClient({
        chainId,
        provider,
        ensProvider,
        signer,
        includeEnsNames,
      })
    }

    this.eventTopics = {
      createSplit: [this._splitMainInterface.getEventTopic('CreateSplit')],
      updateSplit: [this._splitMainInterface.getEventTopic('UpdateSplit')],
      distributeToken: [
        this._splitMainInterface.getEventTopic('DistributeETH'),
        this._splitMainInterface.getEventTopic('DistributeERC20'),
      ],
      updateSplitAndDistributeToken: [
        this._splitMainInterface.getEventTopic('UpdateSplit'),
        this._splitMainInterface.getEventTopic('DistributeETH'),
        this._splitMainInterface.getEventTopic('DistributeERC20'),
      ],
      withdrawFunds: [this._splitMainInterface.getEventTopic('Withdrawal')],
      initiateControlTransfer: [
        this._splitMainInterface.getEventTopic('InitiateControlTransfer'),
      ],
      cancelControlTransfer: [
        this._splitMainInterface.getEventTopic('CancelControlTransfer'),
      ],
      acceptControlTransfer: [
        this._splitMainInterface.getEventTopic('ControlTransfer'),
      ],
      makeSplitImmutable: [
        this._splitMainInterface.getEventTopic('ControlTransfer'),
      ],
    }

    this.callData = new SplitsCallData({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
    this.estimateGas = new SplitsGasEstimates({
      chainId,
      provider,
      ensProvider,
      signer,
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
    tx: ContractTransaction
  }> {
    const createSplitTx = await this._createSplitTransaction(createSplitArgs)
    if (!this._isContractTransaction(createSplitTx))
      throw new Error('Invalid response')

    return { tx: createSplitTx }
  }

  async createSplit(createSplitArgs: CreateSplitConfig): Promise<{
    splitId: string
    event: Event
  }> {
    const { tx: createSplitTx } = await this.submitCreateSplitTransaction(
      createSplitArgs,
    )
    const events = await getTransactionEvents(
      createSplitTx,
      this.eventTopics.createSplit,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event && event.args)
      return {
        splitId: event.args.split,
        event,
      }

    throw new TransactionFailedError()
  }

  async submitUpdateSplitTransaction(
    updateSplitArgs: UpdateSplitConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const updateSplitTx = await this._updateSplitTransaction(updateSplitArgs)
    if (!this._isContractTransaction(updateSplitTx))
      throw new Error('Invalid response')

    return { tx: updateSplitTx }
  }

  async updateSplit(updateSplitArgs: UpdateSplitConfig): Promise<{
    event: Event
  }> {
    const { tx: updateSplitTx } = await this.submitUpdateSplitTransaction(
      updateSplitArgs,
    )
    const events = await getTransactionEvents(
      updateSplitTx,
      this.eventTopics.updateSplit,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitDistributeTokenTransaction(
    distributeTokenArgs: DistributeTokenConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const distributeTokenTx = await this._distributeTokenTransaction(
      distributeTokenArgs,
    )
    if (!this._isContractTransaction(distributeTokenTx))
      throw new Error('Invalid response')

    return { tx: distributeTokenTx }
  }

  async distributeToken(distributeTokenArgs: DistributeTokenConfig): Promise<{
    event: Event
  }> {
    const { tx: distributeTokenTx } =
      await this.submitDistributeTokenTransaction(distributeTokenArgs)
    const { token } = distributeTokenArgs
    const eventTopic =
      token === AddressZero
        ? this.eventTopics.distributeToken[0]
        : this.eventTopics.distributeToken[1]
    const events = await getTransactionEvents(distributeTokenTx, [eventTopic])
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitUpdateSplitAndDistributeTokenTransaction(
    updateAndDistributeArgs: UpdateSplitAndDistributeTokenConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const updateAndDistributeTx =
      await this._updateSplitAndDistributeTokenTransaction(
        updateAndDistributeArgs,
      )
    if (!this._isContractTransaction(updateAndDistributeTx))
      throw new Error('Invalid response')

    return { tx: updateAndDistributeTx }
  }

  async updateSplitAndDistributeToken(
    updateAndDistributeArgs: UpdateSplitAndDistributeTokenConfig,
  ): Promise<{
    event: Event
  }> {
    const { tx: updateAndDistributeTx } =
      await this.submitUpdateSplitAndDistributeTokenTransaction(
        updateAndDistributeArgs,
      )
    const { token } = updateAndDistributeArgs
    const eventTopic =
      token === AddressZero
        ? this.eventTopics.updateSplitAndDistributeToken[1]
        : this.eventTopics.updateSplitAndDistributeToken[2]
    const events = await getTransactionEvents(updateAndDistributeTx, [
      eventTopic,
    ])
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitWithdrawFundsTransaction(
    withdrawArgs: WithdrawFundsConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const withdrawTx = await this._withdrawFundsTransaction(withdrawArgs)
    if (!this._isContractTransaction(withdrawTx))
      throw new Error('Invalid response')

    return { tx: withdrawTx }
  }

  async withdrawFunds(withdrawArgs: WithdrawFundsConfig): Promise<{
    event: Event
  }> {
    const { tx: withdrawTx } = await this.submitWithdrawFundsTransaction(
      withdrawArgs,
    )
    const events = await getTransactionEvents(
      withdrawTx,
      this.eventTopics.withdrawFunds,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitInitiateControlTransferTransaction(
    initiateTransferArgs: InititateControlTransferConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const transferSplitTx = await this._initiateControlTransferTransaction(
      initiateTransferArgs,
    )
    if (!this._isContractTransaction(transferSplitTx))
      throw new Error('Invalid response')

    return { tx: transferSplitTx }
  }

  async initiateControlTransfer(
    initiateTransferArgs: InititateControlTransferConfig,
  ): Promise<{
    event: Event
  }> {
    const { tx: transferSplitTx } =
      await this.submitInitiateControlTransferTransaction(initiateTransferArgs)
    const events = await getTransactionEvents(
      transferSplitTx,
      this.eventTopics.initiateControlTransfer,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitCancelControlTransferTransaction(
    cancelTransferArgs: CancelControlTransferConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const cancelTransferSplitTx = await this._cancelControlTransferTransaction(
      cancelTransferArgs,
    )
    if (!this._isContractTransaction(cancelTransferSplitTx))
      throw new Error('Invalid response')

    return { tx: cancelTransferSplitTx }
  }

  async cancelControlTransfer(
    cancelTransferArgs: CancelControlTransferConfig,
  ): Promise<{
    event: Event
  }> {
    const { tx: cancelTransferSplitTx } =
      await this.submitCancelControlTransferTransaction(cancelTransferArgs)
    const events = await getTransactionEvents(
      cancelTransferSplitTx,
      this.eventTopics.cancelControlTransfer,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitAcceptControlTransferTransaction(
    acceptTransferArgs: AcceptControlTransferConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const acceptTransferSplitTx = await this._acceptControlTransferTransaction(
      acceptTransferArgs,
    )
    if (!this._isContractTransaction(acceptTransferSplitTx))
      throw new Error('Invalid response')

    return { tx: acceptTransferSplitTx }
  }

  async acceptControlTransfer(
    acceptTransferArgs: AcceptControlTransferConfig,
  ): Promise<{
    event: Event
  }> {
    const { tx: acceptTransferSplitTx } =
      await this.submitAcceptControlTransferTransaction(acceptTransferArgs)
    const events = await getTransactionEvents(
      acceptTransferSplitTx,
      this.eventTopics.acceptControlTransfer,
    )
    const event = events.length > 0 ? events[0] : undefined
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async submitMakeSplitImmutableTransaction(
    makeImmutableArgs: MakeSplitImmutableConfig,
  ): Promise<{
    tx: ContractTransaction
  }> {
    const makeSplitImmutableTx = await this._makeSplitImmutableTransaction(
      makeImmutableArgs,
    )
    if (!this._isContractTransaction(makeSplitImmutableTx))
      throw new Error('Invalid response')

    return { tx: makeSplitImmutableTx }
  }

  async makeSplitImmutable(
    makeImmutableArgs: MakeSplitImmutableConfig,
  ): Promise<{
    event: Event
  }> {
    const { tx: makeSplitImmutableTx } =
      await this.submitMakeSplitImmutableTransaction(makeImmutableArgs)
    const events = await getTransactionEvents(
      makeSplitImmutableTx,
      this.eventTopics.makeSplitImmutable,
    )
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
    events: Event[]
  }> {
    validateAddress(splitId)
    tokens.map((token) => validateAddress(token))
    recipientAddresses.map((address) => validateAddress(address))

    this._requireSigner()
    // TODO: how to remove this, needed for typescript check right now
    if (!this._signer) throw new Error()

    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : await this._signer.getAddress()
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
    events: Event[]
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
    token = AddressZero,
  }: GetSplitBalanceConfig): Promise<{
    balance: BigNumber
  }> {
    validateAddress(splitId)
    this._requireProvider()

    const balance =
      token === AddressZero
        ? await this._splitMain.getETHBalance(splitId)
        : await this._splitMain.getERC20Balance(splitId, token)

    return { balance }
  }

  async predictImmutableSplitAddress({
    recipients,
    distributorFeePercent,
  }: {
    recipients: SplitRecipient[]
    distributorFeePercent: number
  }): Promise<{
    splitId: string
  }> {
    validateSplitInputs({ recipients, distributorFeePercent })
    this._requireProvider()

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigNumberFromPercent(distributorFeePercent)
    const splitId = await this._splitMain.predictImmutableSplitAddress(
      accounts,
      percentAllocations,
      distributorFee,
    )

    return { splitId }
  }

  async getController({ splitId }: { splitId: string }): Promise<{
    controller: string
  }> {
    validateAddress(splitId)
    this._requireProvider()

    const controller = await this._splitMain.getController(splitId)

    return { controller }
  }

  async getNewPotentialController({ splitId }: { splitId: string }): Promise<{
    newPotentialController: string
  }> {
    validateAddress(splitId)
    this._requireProvider()

    const newPotentialController =
      await this._splitMain.getNewPotentialController(splitId)

    return { newPotentialController }
  }

  async getHash({ splitId }: { splitId: string }): Promise<{
    hash: string
  }> {
    validateAddress(splitId)
    this._requireProvider()

    const hash = await this._splitMain.getHash(splitId)

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
    if (includeActiveBalances && !this._provider)
      throw new MissingProviderError(
        'Provider required to get split active balances. Please update your call to the SplitsClient constructor with a valid provider, or set includeActiveBalances to false',
      )

    const { withdrawn, activeBalances } = await this._getAccountBalances({
      accountId: splitId,
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
    if (!this._provider)
      throw new MissingProviderError(
        'Provider required to get formatted earnings. Please update your call to the SplitsClient constructor with a valid provider',
      )
    const { distributed, activeBalances } = await this.getSplitEarnings({
      splitId,
      includeActiveBalances,
      erc20TokenList,
    })

    const balancesToFormat = [distributed]
    if (activeBalances) balancesToFormat.push(activeBalances)

    const formattedBalances = await this._getFormattedTokenBalances(
      balancesToFormat,
    )
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
      accountId: userId,
      includeActiveBalances: true,
    })
    if (!activeBalances) throw new Error('Missing active balances')

    return { withdrawn, activeBalances }
  }

  async getFormattedUserEarnings({ userId }: { userId: string }): Promise<{
    withdrawn: FormattedTokenBalances
    activeBalances: FormattedTokenBalances
  }> {
    if (!this._provider)
      throw new MissingProviderError(
        'Provider required to get formatted earnings. Please update your call to the SplitsClient constructor with a valid provider',
      )

    const { withdrawn, activeBalances } = await this.getUserEarnings({ userId })
    const balancesToFormat = [withdrawn, activeBalances]
    const formattedBalances = await this._getFormattedTokenBalances(
      balancesToFormat,
    )

    return {
      withdrawn: formattedBalances[0],
      activeBalances: formattedBalances[1],
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
    this._requireProvider()

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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SplitsClient extends BaseClientMixin {}
applyMixins(SplitsClient, [BaseClientMixin])

class SplitsGasEstimates extends SplitsTransactions {
  constructor({
    chainId,
    provider,
    signer,
    includeEnsNames = false,
    ensProvider,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      provider,
      signer,
      includeEnsNames,
      ensProvider,
    })
  }

  async createSplit(createSplitArgs: CreateSplitConfig): Promise<BigNumber> {
    const gasEstimate = await this._createSplitTransaction(createSplitArgs)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async updateSplit(updateSplitArgs: UpdateSplitConfig): Promise<BigNumber> {
    const gasEstimate = await this._updateSplitTransaction(updateSplitArgs)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async distributeToken(
    distributeTokenArgs: DistributeTokenConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._distributeTokenTransaction(
      distributeTokenArgs,
    )
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async updateSplitAndDistributeToken(
    updateAndDistributeArgs: UpdateSplitAndDistributeTokenConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._updateSplitAndDistributeTokenTransaction(
      updateAndDistributeArgs,
    )
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async withdrawFunds(withdrawArgs: WithdrawFundsConfig): Promise<BigNumber> {
    const gasEstimate = await this._withdrawFundsTransaction(withdrawArgs)
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async initiateControlTransfer(
    initiateTransferArgs: InititateControlTransferConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._initiateControlTransferTransaction(
      initiateTransferArgs,
    )
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async cancelControlTransfer(
    cancelTransferArgs: CancelControlTransferConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._cancelControlTransferTransaction(
      cancelTransferArgs,
    )
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async acceptControlTransfer(
    acceptTransferArgs: AcceptControlTransferConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._acceptControlTransferTransaction(
      acceptTransferArgs,
    )
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async makeSplitImmutable(
    makeImmutableArgs: MakeSplitImmutableConfig,
  ): Promise<BigNumber> {
    const gasEstimate = await this._makeSplitImmutableTransaction(
      makeImmutableArgs,
    )
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SplitsGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(SplitsGasEstimates, [BaseGasEstimatesMixin])

class SplitsCallData extends SplitsTransactions {
  constructor({
    chainId,
    provider,
    signer,
    includeEnsNames = false,
    ensProvider,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      chainId,
      provider,
      signer,
      includeEnsNames,
      ensProvider,
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
    const callData = await this._initiateControlTransferTransaction(
      initiateTransferArgs,
    )
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async cancelControlTransfer(
    cancelTransferArgs: CancelControlTransferConfig,
  ): Promise<CallData> {
    const callData = await this._cancelControlTransferTransaction(
      cancelTransferArgs,
    )
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async acceptControlTransfer(
    acceptTransferArgs: AcceptControlTransferConfig,
  ): Promise<CallData> {
    const callData = await this._acceptControlTransferTransaction(
      acceptTransferArgs,
    )
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async makeSplitImmutable(
    makeImmutableArgs: MakeSplitImmutableConfig,
  ): Promise<CallData> {
    const callData = await this._makeSplitImmutableTransaction(
      makeImmutableArgs,
    )
    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}
