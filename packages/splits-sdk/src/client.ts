import type { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Event } from '@ethersproject/contracts'

import {
  ETHEREUM_CHAIN_IDS,
  PERCENTAGE_SCALE,
  POLYGON_CHAIN_IDS,
} from './constants'
import { UnsupportedChainIdError } from './errors'
import type {
  SplitMainType,
  SplitsClientConfig,
  CreateSplitConfig,
  UpdateSplitConfig,
  DistributeTokenConfig,
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

    throw new Error('Failed to complete transaction')
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

    throw new Error('Failed to complete transaction')
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

    throw new Error('Failed to complete transaction')
  }
}
