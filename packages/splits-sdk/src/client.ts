import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Contract, Event } from '@ethersproject/contracts'
import { GraphQLClient, Variables } from 'graphql-request'

import SPLIT_MAIN_ARTIFACT_ETHEREUM from './artifacts/splits/ethereum/contracts/SplitMain.sol/SplitMain.json'
import SPLIT_MAIN_ARTIFACT_POLYGON from './artifacts/splits/polygon/contracts/SplitMain.sol/SplitMain.json'
import {
  ETHEREUM_CHAIN_IDS,
  POLYGON_CHAIN_IDS,
  SPLIT_MAIN_ADDRESS,
} from './constants'
import {
  InvalidAuthError,
  InvalidHashError,
  TransactionFailedError,
  UnsupportedChainIdError,
  UnsupportedSubgraphChainIdError,
} from './errors'
import {
  ACCOUNT_BALANCES_QUERY,
  formatAccountBalances,
  formatSplit,
  getGraphqlClient,
  RELATED_SPLITS_QUERY,
  SPLIT_QUERY,
} from './subgraph'
import type { GqlAccountBalances, GqlSplit } from './subgraph/types'
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
} from './types'
import {
  getRecipientSortedAddressesAndAllocations,
  validateDistributorFeePercent,
  validateRecipients,
  getTransactionEvent,
  getBigNumberValue,
  getSplitHash,
  validateAddress,
} from './utils'
import type { SplitMain as SplitMainEthereumType } from './typechain/ethereum'
import type { SplitMain as SplitMainPolygonType } from './typechain/polygon'

const SPLIT_MAIN_ABI_ETHEREUM = SPLIT_MAIN_ARTIFACT_ETHEREUM.abi
const splitMainInterfaceEthereum = new Interface(SPLIT_MAIN_ABI_ETHEREUM)
const SPLIT_MAIN_ABI_POLYGON = SPLIT_MAIN_ARTIFACT_POLYGON.abi
const splitMainInterfacePolygon = new Interface(SPLIT_MAIN_ABI_POLYGON)

export class SplitsClient {
  private readonly _splitMain: SplitMainType
  private readonly _graphqlClient: GraphQLClient | undefined

  constructor({ chainId, signer }: SplitsClientConfig) {
    if (ETHEREUM_CHAIN_IDS.includes(chainId))
      this._splitMain = new Contract(
        SPLIT_MAIN_ADDRESS,
        splitMainInterfaceEthereum,
        signer,
      ) as SplitMainEthereumType
    else if (POLYGON_CHAIN_IDS.includes(chainId))
      this._splitMain = new Contract(
        SPLIT_MAIN_ADDRESS,
        splitMainInterfacePolygon,
        signer,
      ) as SplitMainPolygonType
    else throw new UnsupportedChainIdError(chainId)

    this._graphqlClient = getGraphqlClient(chainId)
  }

  // Write actions
  async createSplit({
    recipients,
    distributorFeePercent,
    controller = AddressZero,
  }: CreateSplitConfig): Promise<{
    splitId: string
    event: Event
  }> {
    validateRecipients(recipients)
    validateDistributorFeePercent(distributorFeePercent)

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigNumberValue(distributorFeePercent)

    const createSplitTx = await this._splitMain.createSplit(
      accounts,
      percentAllocations,
      distributorFee,
      controller,
    )
    const event = await getTransactionEvent(
      createSplitTx,
      this._splitMain.interface.getEvent('CreateSplit').format(),
    )
    if (event && event.args)
      return {
        splitId: event.args.split,
        event,
      }

    throw new TransactionFailedError()
  }

  async updateSplit({
    splitId,
    recipients,
    distributorFeePercent,
  }: UpdateSplitConfig): Promise<{
    event: Event
  }> {
    validateRecipients(recipients)
    validateDistributorFeePercent(distributorFeePercent)
    await this._requireController(splitId)

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigNumberValue(distributorFeePercent)

    const updateSplitTx = await this._splitMain.updateSplit(
      splitId,
      accounts,
      percentAllocations,
      distributorFee,
    )
    const event = await getTransactionEvent(
      updateSplitTx,
      this._splitMain.interface.getEvent('UpdateSplit').format(),
    )
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async distributeToken({
    splitId,
    token = AddressZero,
    recipients,
    distributorFeePercent,
    distributorAddress,
  }: DistributeTokenConfig): Promise<{
    event: Event
  }> {
    validateRecipients(recipients)
    validateDistributorFeePercent(distributorFeePercent)
    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigNumberValue(distributorFeePercent)
    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : await this._splitMain.signer.getAddress()

    await this._requireHashMatch(
      splitId,
      accounts,
      percentAllocations,
      distributorFee,
    )

    const distributeTokenTx = await (token === AddressZero
      ? this._splitMain.distributeETH(
          splitId,
          accounts,
          percentAllocations,
          distributorFee,
          distributorPayoutAddress,
        )
      : this._splitMain.distributeERC20(
          splitId,
          token,
          accounts,
          percentAllocations,
          distributorFee,
          distributorPayoutAddress,
        ))
    const eventSignature =
      token === AddressZero
        ? this._splitMain.interface.getEvent('DistributeETH').format()
        : this._splitMain.interface.getEvent('DistributeERC20').format()
    const event = await getTransactionEvent(distributeTokenTx, eventSignature)
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async updateSplitAndDistributeToken({
    splitId,
    token = AddressZero,
    recipients,
    distributorFeePercent,
    distributorAddress,
  }: UpdateSplitAndDistributeTokenConfig): Promise<{
    event: Event
  }> {
    validateRecipients(recipients)
    validateDistributorFeePercent(distributorFeePercent)
    await this._requireController(splitId)

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigNumberValue(distributorFeePercent)
    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : await this._splitMain.signer.getAddress()

    const updateAndDistributeTx = await (token === AddressZero
      ? this._splitMain.updateAndDistributeETH(
          splitId,
          accounts,
          percentAllocations,
          distributorFee,
          distributorPayoutAddress,
        )
      : this._splitMain.updateAndDistributeERC20(
          splitId,
          token,
          accounts,
          percentAllocations,
          distributorFee,
          distributorPayoutAddress,
        ))
    const eventSignature =
      token === AddressZero
        ? this._splitMain.interface.getEvent('DistributeETH').format()
        : this._splitMain.interface.getEvent('DistributeERC20').format()
    const event = await getTransactionEvent(
      updateAndDistributeTx,
      eventSignature,
    )
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async withdrawFunds({ address, tokens }: WithdrawFundsConfig): Promise<{
    event: Event
  }> {
    const withdrawEth = tokens.includes(AddressZero) ? 1 : 0
    const erc20s = tokens.filter((token) => token !== AddressZero)

    const withdrawTx = await this._splitMain.withdraw(
      address,
      withdrawEth,
      erc20s,
    )
    const event = await getTransactionEvent(
      withdrawTx,
      this._splitMain.interface.getEvent('Withdrawal').format(),
    )
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async initiateControlTransfer({
    splitId,
    newController,
  }: InititateControlTransferConfig): Promise<{
    event: Event
  }> {
    await this._requireController(splitId)

    const transferSplitTx = await this._splitMain.transferControl(
      splitId,
      newController,
    )
    const event = await getTransactionEvent(
      transferSplitTx,
      this._splitMain.interface.getEvent('InitiateControlTransfer').format(),
    )
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async cancelControlTransfer({
    splitId,
  }: CancelControlTransferConfig): Promise<{
    event: Event
  }> {
    await this._requireController(splitId)

    const cancelTransferSplitTx = await this._splitMain.cancelControlTransfer(
      splitId,
    )
    const event = await getTransactionEvent(
      cancelTransferSplitTx,
      this._splitMain.interface.getEvent('CancelControlTransfer').format(),
    )
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async acceptControlTransfer({
    splitId,
  }: AcceptControlTransferConfig): Promise<{
    event: Event
  }> {
    await this._requireNewPotentialController(splitId)

    const acceptTransferSplitTx = await this._splitMain.acceptControl(splitId)
    const event = await getTransactionEvent(
      acceptTransferSplitTx,
      this._splitMain.interface.getEvent('ControlTransfer').format(),
    )
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async makeSplitImmutable({ splitId }: MakeSplitImmutableConfig): Promise<{
    event: Event
  }> {
    await this._requireController(splitId)

    const makeSplitImmutableTx = await this._splitMain.makeSplitImmutable(
      splitId,
    )
    const event = await getTransactionEvent(
      makeSplitImmutableTx,
      this._splitMain.interface.getEvent('ControlTransfer').format(),
    )
    if (event) return { event }

    throw new TransactionFailedError()
  }

  // Read actions
  async getSplitBalance({
    splitId,
    token = AddressZero,
  }: GetSplitBalanceConfig): Promise<{
    balance: BigNumber
  }> {
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
    validateRecipients(recipients)
    validateDistributorFeePercent(distributorFeePercent)

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigNumberValue(distributorFeePercent)
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
    const controller = await this._splitMain.getController(splitId)

    return { controller }
  }

  async getNewPotentialController({ splitId }: { splitId: string }): Promise<{
    newPotentialController: string
  }> {
    const newPotentialController =
      await this._splitMain.getNewPotentialController(splitId)

    return { newPotentialController }
  }

  async getHash({ splitId }: { splitId: string }): Promise<{
    hash: string
  }> {
    const hash = await this._splitMain.getHash(splitId)

    return { hash }
  }

  // Graphql read actions
  async getSplitMetadata({ splitId }: { splitId: string }): Promise<Split> {
    validateAddress(splitId)

    const response = await this._makeGqlRequest<{ split: GqlSplit }>(
      SPLIT_QUERY,
      {
        splitId: splitId.toLowerCase(),
      },
    )

    return formatSplit(response.split)
  }

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

    return {
      receivingFrom: response.receivingFrom.map((recipient) =>
        formatSplit(recipient.split),
      ),
      controlling: response.controlling.map((gqlSplit) =>
        formatSplit(gqlSplit),
      ),
      pendingControl: response.pendingControl.map((gqlSplit) =>
        formatSplit(gqlSplit),
      ),
    }
  }

  async getSplitEarnings({ splitId }: { splitId: string }): Promise<{
    distributed: TokenBalances
  }> {
    validateAddress(splitId)

    const response = await this._makeGqlRequest<{
      accountBalances: GqlAccountBalances
    }>(ACCOUNT_BALANCES_QUERY, {
      accountId: splitId.toLowerCase(),
    })

    const distributed = formatAccountBalances(
      response.accountBalances.withdrawals,
    )

    return {
      distributed,
    }
  }

  async getUserEarnings({ userId }: { userId: string }): Promise<{
    withdrawn: TokenBalances
    activeBalances: TokenBalances
  }> {
    validateAddress(userId)

    const response = await this._makeGqlRequest<{
      accountBalances: GqlAccountBalances
    }>(ACCOUNT_BALANCES_QUERY, {
      accountId: userId.toLowerCase(),
    })

    const withdrawn = formatAccountBalances(
      response.accountBalances.withdrawals,
    )
    const activeBalances = formatAccountBalances(
      response.accountBalances.internalBalances,
    )

    return { withdrawn, activeBalances }
  }

  // Helper functions
  private async _requireController(splitId: string) {
    const { controller } = await this.getController({ splitId })
    const signerAddress = await this._splitMain.signer.getAddress()

    if (controller !== signerAddress)
      throw new InvalidAuthError(
        `Action only available to the split controller. Split controller: ${controller}. Signer: ${signerAddress}`,
      )
  }

  private async _requireNewPotentialController(splitId: string) {
    const { newPotentialController } = await this.getNewPotentialController({
      splitId,
    })
    const signerAddress = await this._splitMain.signer.getAddress()

    if (newPotentialController !== signerAddress)
      throw new InvalidAuthError(
        `Action only available to the split's new potential controller. Split new potential controller: ${newPotentialController}. Signer: ${signerAddress}`,
      )
  }

  private async _requireHashMatch(
    splitId: string,
    accounts: string[],
    percentAllocations: BigNumber[],
    distributorFee: BigNumber,
  ) {
    const { hash } = await this.getHash({ splitId })
    const inputsHash = getSplitHash(
      accounts,
      percentAllocations,
      distributorFee,
    )

    if (hash !== inputsHash)
      throw new InvalidHashError(
        `Hash from accounts, percent allocations, and distributor fee does not match split hash. Split hash: ${hash}, inputs hash: ${inputsHash}`,
      )
  }

  private async _makeGqlRequest<ResponseType>(
    query: string,
    variables?: Variables,
  ): Promise<ResponseType> {
    if (!this._graphqlClient) {
      throw new UnsupportedSubgraphChainIdError()
    }

    // TODO: any error handling? need to add try/catch if so
    const result = await this._graphqlClient.request(query, variables)
    return result
  }
}
