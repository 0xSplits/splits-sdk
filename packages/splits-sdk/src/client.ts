import type { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Event } from '@ethersproject/contracts'

import {
  ETHEREUM_CHAIN_IDS,
  PERCENTAGE_SCALE,
  POLYGON_CHAIN_IDS,
} from './constants'
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
} from './types'
import {
  getRecipientSortedAddressesAndAllocations,
  validateDistributorFeePercent,
  validateRecipients,
  SplitMainEthereum,
  SplitMainPolygon,
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
    const distributorFee = BigNumber.from(
      (PERCENTAGE_SCALE.toNumber() * distributorFeePercent) / 100,
    )

    const createSplitTx = await this.splitMain
      .connect(this.signer)
      .createSplit(accounts, percentAllocations, distributorFee, controller)
    const createSplitReceipt = await createSplitTx.wait()
    if (createSplitReceipt.status === 1) {
      const cse = createSplitReceipt.events?.filter(
        (e) =>
          e.eventSignature ===
          this.splitMain.interface.getEvent('CreateSplit').format(),
      )?.[0]
      if (cse && cse.args)
        return {
          splitId: cse.args.split,
          event: cse,
        }
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
    const distributorFee = BigNumber.from(
      (PERCENTAGE_SCALE.toNumber() * distributorFeePercent) / 100,
    )

    const updateSplitTx = await this.splitMain
      .connect(this.signer)
      .updateSplit(splitId, accounts, percentAllocations, distributorFee)
    const updateSplitReceipt = await updateSplitTx.wait()
    if (updateSplitReceipt.status === 1) {
      const cse = updateSplitReceipt.events?.filter(
        (e) =>
          e.eventSignature ===
          this.splitMain.interface.getEvent('UpdateSplit').format(),
      )?.[0]
      if (cse)
        return {
          event: cse,
        }
    }

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
    const distributorFee = BigNumber.from(
      (PERCENTAGE_SCALE.toNumber() * distributorFeePercent) / 100,
    )

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
    const distributeTokenReceipt = await distributeTokenTx.wait()
    if (distributeTokenReceipt.status === 1) {
      const dte = distributeTokenReceipt.events?.filter(
        (e) =>
          e.eventSignature ===
          (token === AddressZero
            ? this.splitMain.interface.getEvent('DistributeETH').format()
            : this.splitMain.interface.getEvent('DistributeERC20').format()),
      )?.[0]

      if (dte)
        return {
          event: dte,
        }
    }

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
    const withdrawReceipt = await withdrawTx.wait()
    if (withdrawReceipt.status == 1) {
      const we = withdrawReceipt.events?.filter(
        (e) =>
          e.eventSignature ===
          this.splitMain.interface.getEvent('Withdrawal').format(),
      )[0]
      if (we)
        return {
          event: we,
        }
    }

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
    const transferSplitReceipt = await transferSplitTx.wait()
    if (transferSplitReceipt.status == 1) {
      const icte = transferSplitReceipt.events?.filter(
        (e) =>
          e.eventSignature ===
          this.splitMain.interface.getEvent('InitiateControlTransfer').format(),
      )?.[0]
      if (icte)
        return {
          event: icte,
        }
    }

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
    const cancelTransferSplitReceipt = await cancelTransferSplitTx.wait()
    if (cancelTransferSplitReceipt.status == 1) {
      const ccte = cancelTransferSplitReceipt.events?.filter(
        (e) =>
          e.eventSignature ===
          this.splitMain.interface.getEvent('CancelControlTransfer').format(),
      )?.[0]
      if (ccte)
        return {
          event: ccte,
        }
    }

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
    const acceptTransferSplitReceipt = await acceptTransferSplitTx.wait()
    if (acceptTransferSplitReceipt.status == 1) {
      const acte = acceptTransferSplitReceipt.events?.filter(
        (e) =>
          e.eventSignature ===
          this.splitMain.interface.getEvent('ControlTransfer').format(),
      )?.[0]
      if (acte)
        return {
          event: acte,
        }
    }

    throw new TransactionFailedError()
  }

  async makeSplitImmutable({ splitId }: MakeSplitImmutableConfig): Promise<{
    event: Event
  }> {
    const makeSplitImmutableTx = await this.splitMain
      .connect(this.signer)
      .makeSplitImmutable(splitId)
    const makeSplitImmutableReceipt = await makeSplitImmutableTx.wait()
    if (makeSplitImmutableReceipt.status == 1) {
      const msie = makeSplitImmutableReceipt.events?.filter(
        (e) =>
          e.eventSignature ===
          this.splitMain.interface.getEvent('ControlTransfer').format(),
      )?.[0]
      if (msie)
        return {
          event: msie,
        }
    }

    throw new TransactionFailedError()
  }
}
