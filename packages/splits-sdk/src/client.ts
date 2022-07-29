import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Contract, Event } from '@ethersproject/contracts'

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
} from './errors'
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
  getTransactionEvent,
  getBigNumberValue,
  getSplitHash,
} from './utils'
import type { SplitMain as SplitMainEthereumType } from './typechain/ethereum'
import type { SplitMain as SplitMainPolygonType } from './typechain/polygon'

const SPLIT_MAIN_ABI_ETHEREUM = SPLIT_MAIN_ARTIFACT_ETHEREUM.abi
const splitMainInterfaceEthereum = new Interface(SPLIT_MAIN_ABI_ETHEREUM)
const SPLIT_MAIN_ABI_POLYGON = SPLIT_MAIN_ARTIFACT_POLYGON.abi
const splitMainInterfacePolygon = new Interface(SPLIT_MAIN_ABI_POLYGON)

export class SplitsClient {
  private readonly _splitMain: SplitMainType

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
}
