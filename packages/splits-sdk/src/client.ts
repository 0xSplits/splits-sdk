import type { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Event } from '@ethersproject/contracts'

import { ETHEREUM_CHAIN_IDS, POLYGON_CHAIN_IDS } from './constants'
import { TransactionFailedError, UnsupportedChainIdError } from './errors'
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
} from './types'
import {
  getRecipientSortedAddressesAndAllocations,
  validateDistributorFeePercent,
  validateRecipients,
  SplitMainEthereum,
  SplitMainPolygon,
  getTransactionEvent,
  getBigNumberValue,
} from './utils'

export class SplitsClient {
  private readonly signer: Signer
  private readonly splitMain: SplitMainType

  constructor({ chainId, signer }: SplitsClientConfig) {
    this.signer = signer

    if (ETHEREUM_CHAIN_IDS.includes(chainId)) this.splitMain = SplitMainEthereum
    else if (POLYGON_CHAIN_IDS.includes(chainId))
      this.splitMain = SplitMainPolygon
    else throw new UnsupportedChainIdError(chainId)
  }

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

    const createSplitTx = await this.splitMain
      .connect(this.signer)
      .createSplit(accounts, percentAllocations, distributorFee, controller)
    const event = await getTransactionEvent(
      createSplitTx,
      this.splitMain.interface.getEvent('CreateSplit').format(),
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

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigNumberValue(distributorFeePercent)

    const updateSplitTx = await this.splitMain
      .connect(this.signer)
      .updateSplit(splitId, accounts, percentAllocations, distributorFee)
    const event = await getTransactionEvent(
      updateSplitTx,
      this.splitMain.interface.getEvent('UpdateSplit').format(),
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
    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigNumberValue(distributorFeePercent)

    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : await this.signer.getAddress()

    const distributeTokenTx = await (token === AddressZero
      ? this.splitMain
          .connect(this.signer)
          .distributeETH(
            splitId,
            accounts,
            percentAllocations,
            distributorFee,
            distributorPayoutAddress,
          )
      : this.splitMain
          .connect(this.signer)
          .distributeERC20(
            splitId,
            token,
            accounts,
            percentAllocations,
            distributorFee,
            distributorPayoutAddress,
          ))
    const eventSignature =
      token === AddressZero
        ? this.splitMain.interface.getEvent('DistributeETH').format()
        : this.splitMain.interface.getEvent('DistributeERC20').format()
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

    const [accounts, percentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)
    const distributorFee = getBigNumberValue(distributorFeePercent)
    const distributorPayoutAddress = distributorAddress
      ? distributorAddress
      : await this.signer.getAddress()

    const updateAndDistributeTx = await (token === AddressZero
      ? this.splitMain
          .connect(this.signer)
          .updateAndDistributeETH(
            splitId,
            accounts,
            percentAllocations,
            distributorFee,
            distributorPayoutAddress,
          )
      : this.splitMain
          .connect(this.signer)
          .updateAndDistributeERC20(
            splitId,
            token,
            accounts,
            percentAllocations,
            distributorFee,
            distributorPayoutAddress,
          ))
    const eventSignature =
      token === AddressZero
        ? this.splitMain.interface.getEvent('DistributeETH').format()
        : this.splitMain.interface.getEvent('DistributeERC20').format()
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

    const withdrawTx = await this.splitMain
      .connect(this.signer)
      .withdraw(address, withdrawEth, erc20s)
    const event = await getTransactionEvent(
      withdrawTx,
      this.splitMain.interface.getEvent('Withdrawal').format(),
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
    const transferSplitTx = await this.splitMain
      .connect(this.signer)
      .transferControl(splitId, newController)
    const event = await getTransactionEvent(
      transferSplitTx,
      this.splitMain.interface.getEvent('InitiateControlTransfer').format(),
    )
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async cancelControlTransfer({
    splitId,
  }: CancelControlTransferConfig): Promise<{
    event: Event
  }> {
    const cancelTransferSplitTx = await this.splitMain
      .connect(this.signer)
      .cancelControlTransfer(splitId)
    const event = await getTransactionEvent(
      cancelTransferSplitTx,
      this.splitMain.interface.getEvent('CancelControlTransfer').format(),
    )
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async acceptControlTransfer({
    splitId,
  }: AcceptControlTransferConfig): Promise<{
    event: Event
  }> {
    const acceptTransferSplitTx = await this.splitMain
      .connect(this.signer)
      .acceptControl(splitId)
    const event = await getTransactionEvent(
      acceptTransferSplitTx,
      this.splitMain.interface.getEvent('ControlTransfer').format(),
    )
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async makeSplitImmutable({ splitId }: MakeSplitImmutableConfig): Promise<{
    event: Event
  }> {
    const makeSplitImmutableTx = await this.splitMain
      .connect(this.signer)
      .makeSplitImmutable(splitId)
    const event = await getTransactionEvent(
      makeSplitImmutableTx,
      this.splitMain.interface.getEvent('ControlTransfer').format(),
    )
    if (event) return { event }

    throw new TransactionFailedError()
  }

  async getSplitBalance({
    splitId,
    token = AddressZero,
  }: GetSplitBalanceConfig): Promise<{
    balance: BigNumber
  }> {
    const balance =
      token === AddressZero
        ? await this.splitMain.getETHBalance(splitId)
        : await this.splitMain.getERC20Balance(splitId, token)

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
    const splitId = await this.splitMain.predictImmutableSplitAddress(
      accounts,
      percentAllocations,
      distributorFee,
    )

    return { splitId }
  }

  async getController({ splitId }: { splitId: string }): Promise<{
    controller: string
  }> {
    const controller = await this.splitMain.getController(splitId)

    return { controller }
  }

  async getNewPotentialController({ splitId }: { splitId: string }): Promise<{
    newPotentialController: string
  }> {
    const newPotentialController =
      await this.splitMain.getNewPotentialController(splitId)

    return { newPotentialController }
  }

  async getHash({ splitId }: { splitId: string }): Promise<{
    hash: string
  }> {
    const hash = await this.splitMain.getHash(splitId)

    return { hash }
  }
}
