import {
  Address,
  Chain,
  GetContractReturnType,
  Hash,
  Hex,
  Log,
  PublicClient,
  Transport,
  TypedDataDomain,
  encodeEventTopics,
  fromHex,
  getContract,
  zeroAddress,
} from 'viem'
import { warehouseAbi } from '../constants/abi/warehouse'
import {
  BaseClientMixin,
  BaseGasEstimatesMixin,
  BaseTransactions,
} from './base'
import {
  CallData,
  ReadContractArgs,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
  WarehouseApproveBySig,
  WarehouseApproveBySigConfig,
  WarehouseApproveConfig,
  WarehouseBatchDepositConfig,
  WarehouseBatchTransferConfig,
  WarehouseBatchWithdrawConfig,
  WarehouseDepositConfig,
  WarehouseInvalidateNonceConfig,
  WarehouseSetOperatorConfig,
  WarehouseSetWithdrawConfig,
  WarehouseTemporaryApproveAndCallBySig,
  WarehouseTemporaryApproveAndCallBySigConfig,
  WarehouseTemporaryApproveAndCallConfig,
  WarehouseTransferConfig,
  WarehouseTransferFromConfig,
  WarehouseWithdrawConfig,
} from '../types'
import {
  TransactionType,
  SPLITS_V2_SUPPORTED_CHAIN_IDS,
  getWarehouseAddress,
} from '../constants'
import { TransactionFailedError } from '../errors'
import { applyMixins } from './mixin'
import { getNumberFromPercent, validateAddress } from '../utils'

type WarehouseAbiType = typeof warehouseAbi

const nativeTokenAddress: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

class WarehouseTransactions<
  TChain extends Chain,
> extends BaseTransactions<TChain> {
  protected readonly _warehouseAbi

  constructor(
    transactionClientArgs: SplitsClientConfig<TChain> & TransactionConfig,
  ) {
    super({
      supportedChainIds: SPLITS_V2_SUPPORTED_CHAIN_IDS,
      ...transactionClientArgs,
    })

    this._warehouseAbi = warehouseAbi
  }

  protected _getWarehouseContract(chainId: number) {
    const publicClient = this._getPublicClient(chainId)
    return getContract({
      address: getWarehouseAddress(),
      abi: warehouseAbi,
      publicClient: publicClient,
    }) as unknown as GetContractReturnType<
      WarehouseAbiType,
      PublicClient<Transport, Chain>
    >
  }

  protected async _transfer({
    receiverAddress: receiver,
    tokenAddress: token,
    amount,
    transactionOverrides = {},
  }: WarehouseTransferConfig): Promise<TransactionFormat> {
    validateAddress(receiver)
    validateAddress(token)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'transfer',
      functionArgs: [receiver, fromHex(token, 'bigint'), amount],
      transactionOverrides,
    })

    return result
  }

  protected async _transferFrom({
    senderAddress: sender,
    receiverAddress: receiver,
    tokenAddress: token,
    amount,
    transactionOverrides = {},
  }: WarehouseTransferFromConfig): Promise<TransactionFormat> {
    validateAddress(sender)
    validateAddress(receiver)
    validateAddress(token)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'transferFrom',
      functionArgs: [sender, receiver, fromHex(token, 'bigint'), amount],
      transactionOverrides,
    })

    return result
  }

  protected async _approve({
    spenderAddress: spender,
    tokenAddress: token,
    amount,
    transactionOverrides = {},
  }: WarehouseApproveConfig): Promise<TransactionFormat> {
    validateAddress(spender)
    validateAddress(token)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'approve',
      functionArgs: [spender, fromHex(token, 'bigint'), amount],
      transactionOverrides,
    })

    return result
  }

  protected async _setOperator({
    operatorAddress: operator,
    approved,
    transactionOverrides = {},
  }: WarehouseSetOperatorConfig): Promise<TransactionFormat> {
    validateAddress(operator)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'setOperator',
      functionArgs: [operator, approved],
      transactionOverrides,
    })

    return result
  }

  protected async _invalidateNonce({
    nonce,
    transactionOverrides = {},
  }: WarehouseInvalidateNonceConfig): Promise<TransactionFormat> {
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'invalidateNonce',
      functionArgs: [nonce],
      transactionOverrides,
    })

    return result
  }

  protected async _temporaryApproveAndCall({
    spenderAddress: spender,
    operator: operator,
    tokenAddress: token,
    amount,
    targetAddress: target,
    data,
    transactionOverrides = {},
  }: WarehouseTemporaryApproveAndCallConfig): Promise<TransactionFormat> {
    validateAddress(spender)
    validateAddress(token)
    validateAddress(target)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'temporaryApproveAndCall',
      functionArgs: [
        spender,
        operator,
        fromHex(token, 'bigint'),
        amount,
        target,
        data,
      ],
      transactionOverrides,
    })

    return result
  }

  protected async _temporaryApproveAndCallBySig({
    ownerAddress: owner,
    spenderAddress: spender,
    operator,
    tokenAddress: token,
    amount,
    targetAddress: target,
    data,
    nonce,
    deadline,
    signature,
    transactionOverrides = {},
  }: WarehouseTemporaryApproveAndCallBySigConfig): Promise<TransactionFormat> {
    validateAddress(owner)
    validateAddress(spender)
    validateAddress(token)
    validateAddress(target)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'temporaryApproveAndCallBySig',
      functionArgs: [
        owner,
        spender,
        operator,
        fromHex(token, 'bigint'),
        amount,
        target,
        data,
        nonce,
        deadline,
        signature,
      ],
      transactionOverrides,
    })

    return result
  }

  protected async _approveBySig({
    ownerAddress: owner,
    spenderAddress: spender,
    operator,
    tokenAddress: token,
    amount,
    nonce,
    deadline,
    signature,
    transactionOverrides = {},
  }: WarehouseApproveBySigConfig): Promise<TransactionFormat> {
    validateAddress(owner)
    validateAddress(spender)
    validateAddress(token)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'approveBySig',
      functionArgs: [
        owner,
        spender,
        operator,
        fromHex(token, 'bigint'),
        amount,
        nonce,
        deadline,
        signature,
      ],
      transactionOverrides,
    })

    return result
  }

  protected async _deposit({
    receiverAddress: receiver,
    tokenAddress: token,
    amount,
    transactionOverrides = {},
  }: WarehouseDepositConfig): Promise<TransactionFormat> {
    validateAddress(receiver)
    validateAddress(token)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'deposit',
      functionArgs: [receiver, token, amount],
      value: token === nativeTokenAddress ? amount : BigInt(0),
      transactionOverrides,
    })

    return result
  }

  protected async _batchDeposit({
    receiversAddresses: receivers,
    tokenAddress: token,
    amounts,
    transactionOverrides = {},
  }: WarehouseBatchDepositConfig): Promise<TransactionFormat> {
    receivers.map((receiver) => validateAddress(receiver))
    validateAddress(token)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'batchDeposit',
      functionArgs: [receivers, token, amounts],
      value: amounts.reduce((a, b) => a + b),
      transactionOverrides,
    })

    return result
  }

  protected async _withdraw({
    ownerAddress: owner,
    tokenAddress: token,
    transactionOverrides = {},
  }: WarehouseWithdrawConfig): Promise<TransactionFormat> {
    validateAddress(owner)
    validateAddress(token)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'withdraw',
      functionArgs: [owner, token],
      transactionOverrides,
    })

    return result
  }

  protected async _batchWithdraw({
    ownerAddress: owner,
    tokensAddresses: tokens,
    amounts,
    withdrawerAddress: withdrawer,
    transactionOverrides = {},
  }: WarehouseBatchWithdrawConfig): Promise<TransactionFormat> {
    validateAddress(owner)
    tokens.map((token) => validateAddress(token))
    validateAddress(withdrawer)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'withdraw',
      functionArgs: [owner, tokens, amounts, withdrawer],
      transactionOverrides,
    })

    return result
  }

  protected async _batchTransfer({
    receiversAddresses: receivers,
    tokenAddress: token,
    amounts,
    transactionOverrides = {},
  }: WarehouseBatchTransferConfig): Promise<TransactionFormat> {
    receivers.map((receiver) => validateAddress(receiver))
    validateAddress(token)

    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'batchTransfer',
      functionArgs: [receivers, token, amounts],
      transactionOverrides,
    })

    return result
  }

  protected async _setWithdrawConfig({
    incentivePercent: incentive,
    paused,
    transactionOverrides = {},
  }: WarehouseSetWithdrawConfig): Promise<TransactionFormat> {
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: getWarehouseAddress(),
      contractAbi: warehouseAbi,
      functionName: 'setWithdrawConfig',
      functionArgs: [{ incentive: getNumberFromPercent(incentive), paused }],
      transactionOverrides,
    })

    return result
  }

  protected async _eip712Domain(
    chainId: number,
  ): Promise<{ domain: TypedDataDomain }> {
    const eip712Domain =
      await this._getWarehouseContract(chainId).read.eip712Domain()

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
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class WarehouseClient<
  TChain extends Chain,
> extends WarehouseTransactions<TChain> {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: WarehouseCallData<TChain>
  readonly estimateGas: WarehouseGasEstimates<TChain>
  readonly sign: WarehouseSignature<TChain>

  constructor(clientArgs: SplitsClientConfig<TChain>) {
    super({
      transactionType: TransactionType.Transaction,
      ...clientArgs,
    })

    this.eventTopics = {
      transfer: [
        encodeEventTopics({
          abi: warehouseAbi,
          eventName: 'Transfer',
        })[0],
      ],
      withdraw: [
        encodeEventTopics({
          abi: warehouseAbi,
          eventName: 'Withdraw',
        })[0],
      ],
      operatorSet: [
        encodeEventTopics({
          abi: warehouseAbi,
          eventName: 'OperatorSet',
        })[0],
      ],
      approval: [
        encodeEventTopics({
          abi: warehouseAbi,
          eventName: 'Approval',
        })[0],
      ],
      nonceInvalidation: [
        encodeEventTopics({
          abi: warehouseAbi,
          eventName: 'NonceInvalidation',
        })[0],
      ],
      withdrawConfigUpdated: [
        encodeEventTopics({
          abi: warehouseAbi,
          eventName: 'WithdrawConfigUpdated',
        })[0],
      ],
    }

    this.callData = new WarehouseCallData(clientArgs)
    this.estimateGas = new WarehouseGasEstimates(clientArgs)
    this.sign = new WarehouseSignature(clientArgs)
  }

  // ERC6909 Metadata
  async getName({
    tokenAddress,
    chainId,
  }: ReadContractArgs & { tokenAddress: Address }): Promise<{
    name: string
  }> {
    validateAddress(tokenAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const name = await this._getWarehouseContract(functionChainId).read.name([
      fromHex(tokenAddress, 'bigint'),
    ])

    return {
      name,
    }
  }

  async getSymbol({
    tokenAddress,
    chainId,
  }: ReadContractArgs & { tokenAddress: Address }): Promise<{
    symbol: string
  }> {
    validateAddress(tokenAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const symbol = await this._getWarehouseContract(
      functionChainId,
    ).read.symbol([fromHex(tokenAddress, 'bigint')])

    return {
      symbol,
    }
  }

  async getDecimals({
    tokenAddress,
    chainId,
  }: ReadContractArgs & { tokenAddress: Address }): Promise<{
    decimals: number
  }> {
    validateAddress(tokenAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const decimals = await this._getWarehouseContract(
      functionChainId,
    ).read.decimals([fromHex(tokenAddress, 'bigint')])

    return {
      decimals,
    }
  }

  // Warehouse withdraw config
  async getWithdrawConfig({
    userAddress,
    chainId,
  }: ReadContractArgs & {
    userAddress: Address
  }): Promise<{ withdrawConfig: { incentive: number; paused: boolean } }> {
    validateAddress(userAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const config = await this._getWarehouseContract(
      functionChainId,
    ).read.withdrawConfig([userAddress])

    return {
      withdrawConfig: {
        incentive: config[0],
        paused: config[1],
      },
    }
  }

  // ERC6909X nonce
  async isValidNonce({
    userAddress,
    userNonce,
    chainId,
  }: ReadContractArgs & {
    userAddress: Address
    userNonce: bigint
  }): Promise<{ isValidNonce: boolean }> {
    validateAddress(userAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const isValidNonce = await this._getWarehouseContract(
      functionChainId,
    ).read.isValidNonce([userAddress, userNonce])

    return {
      isValidNonce,
    }
  }

  async eip712Domain(
    args?: ReadContractArgs,
  ): Promise<{ domain: TypedDataDomain }> {
    const chainId = args?.chainId
    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    return this._eip712Domain(functionChainId)
  }

  // ERC6909 read
  async isOperator({
    ownerAddress,
    operatorAddress,
    chainId,
  }: ReadContractArgs & {
    ownerAddress: Address
    operatorAddress: Address
  }): Promise<{ isOperator: boolean }> {
    validateAddress(ownerAddress)
    validateAddress(operatorAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const isOperator = await this._getWarehouseContract(
      functionChainId,
    ).read.isOperator([ownerAddress, operatorAddress])

    return {
      isOperator,
    }
  }

  async balanceOf({
    ownerAddress,
    tokenAddress,
    chainId,
  }: ReadContractArgs & {
    ownerAddress: Address
    tokenAddress: Address
  }): Promise<{ balance: bigint }> {
    validateAddress(ownerAddress)
    validateAddress(tokenAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const balance = await this._getWarehouseContract(
      functionChainId,
    ).read.balanceOf([ownerAddress, fromHex(tokenAddress, 'bigint')])

    return {
      balance,
    }
  }

  async allowance({
    ownerAddress,
    spenderAddress,
    tokenAddress,
    chainId,
  }: ReadContractArgs & {
    ownerAddress: Address
    spenderAddress: Address
    tokenAddress: Address
  }): Promise<{ allowance: bigint }> {
    validateAddress(ownerAddress)
    validateAddress(spenderAddress)
    validateAddress(tokenAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)

    const allowance = await this._getWarehouseContract(
      functionChainId,
    ).read.allowance([
      ownerAddress,
      spenderAddress,
      fromHex(tokenAddress, 'bigint'),
    ])

    return {
      allowance,
    }
  }

  // erc6909 write
  async transfer(
    transferArgs: WarehouseTransferConfig,
  ): Promise<{ event: Log }> {
    const txHash = await this._transfer(transferArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.transfer,
    })

    const event = events.length > 0 ? events[0] : undefined

    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async transferFrom(
    transferFromArgs: WarehouseTransferFromConfig,
  ): Promise<{ event: Log }> {
    const txHash = await this._transferFrom(transferFromArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.transfer,
    })

    const event = events.length > 0 ? events[0] : undefined

    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async approve(approveArgs: WarehouseApproveConfig): Promise<{ event: Log }> {
    const txHash = await this._approve(approveArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.approval,
    })

    const event = events.length > 0 ? events[0] : undefined

    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async setOperator(
    setOperatorArgs: WarehouseSetOperatorConfig,
  ): Promise<{ event: Log }> {
    const txHash = await this._setOperator(setOperatorArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.operatorSet,
    })

    const event = events.length > 0 ? events[0] : undefined

    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async invalidateNonce(
    invalidateNonceArgs: WarehouseInvalidateNonceConfig,
  ): Promise<{ event: Log }> {
    const txHash = await this._invalidateNonce(invalidateNonceArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.nonceInvalidation,
    })

    const event = events.length > 0 ? events[0] : undefined

    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async temporaryApproveAndCall(
    temporaryApproveAndCallArgs: WarehouseTemporaryApproveAndCallConfig,
  ): Promise<{ txHash: Hex }> {
    const txHash = await this._temporaryApproveAndCall(
      temporaryApproveAndCallArgs,
    )

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async temporaryApproveAndCallBySig(
    temporaryApproveAndCallBySigArgs: WarehouseTemporaryApproveAndCallBySigConfig,
  ): Promise<{ txHash: Hex }> {
    const txHash = await this._temporaryApproveAndCallBySig(
      temporaryApproveAndCallBySigArgs,
    )

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async approveBySig(
    approveBySigArgs: WarehouseApproveBySigConfig,
  ): Promise<{ event: Log }> {
    const txHash = await this._approveBySig(approveBySigArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    let eventTopics: Hex[] = []
    if (approveBySigArgs.operator) {
      eventTopics = this.eventTopics.operatorSet
    } else {
      eventTopics = this.eventTopics.approval
    }

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics,
    })

    const event = events.length > 0 ? events[0] : undefined

    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async deposit(depositArgs: WarehouseDepositConfig): Promise<{ event: Log }> {
    const txHash = await this._deposit(depositArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.transfer,
    })

    const event = events.length > 0 ? events[0] : undefined

    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async batchDeposit(
    batchDepositArgs: WarehouseBatchDepositConfig,
  ): Promise<{ events: Log[] }> {
    const txHash = await this._batchDeposit(batchDepositArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.transfer,
    })

    if (events.length > 0) {
      return {
        events,
      }
    }

    throw new TransactionFailedError()
  }

  async submitWithdrawTransaction(
    withdrawArgs: WarehouseWithdrawConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._withdraw(withdrawArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async withdraw(
    withdrawArgs: WarehouseWithdrawConfig,
  ): Promise<{ event: Log }> {
    const { txHash } = await this.submitWithdrawTransaction(withdrawArgs)

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.withdraw,
    })

    const event = events.length > 0 ? events[0] : undefined

    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }

  async submitBatchWithdrawTransaction(
    batchWithdrawArgs: WarehouseBatchWithdrawConfig,
  ): Promise<{
    txHash: Hash
  }> {
    const txHash = await this._batchWithdraw(batchWithdrawArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    return { txHash }
  }

  async batchWithdraw(
    batchWithdrawArgs: WarehouseBatchWithdrawConfig,
  ): Promise<{ events: Log[] }> {
    const { txHash } =
      await this.submitBatchWithdrawTransaction(batchWithdrawArgs)

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.withdraw,
    })

    if (events.length > 0) {
      return {
        events,
      }
    }

    throw new TransactionFailedError()
  }

  async batchTransfer(
    batchTransferArgs: WarehouseBatchTransferConfig,
  ): Promise<{ events: Log[] }> {
    const txHash = await this._batchTransfer(batchTransferArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.transfer,
    })

    if (events.length > 0) {
      return {
        events,
      }
    }

    throw new TransactionFailedError()
  }

  async setWithdrawConfig(
    setConfigArgs: WarehouseSetWithdrawConfig,
  ): Promise<{ event: Log }> {
    const txHash = await this._setWithdrawConfig(setConfigArgs)

    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: this.eventTopics.withdrawConfigUpdated,
    })

    const event = events.length > 0 ? events[0] : undefined

    if (event) {
      return {
        event,
      }
    }

    throw new TransactionFailedError()
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface WarehouseClient<TChain extends Chain>
  extends BaseClientMixin<TChain> {}
applyMixins(WarehouseClient, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class WarehouseGasEstimates<
  TChain extends Chain,
> extends WarehouseTransactions<TChain> {
  constructor(clientArgs: SplitsClientConfig<TChain>) {
    super({
      transactionType: TransactionType.GasEstimate,
      ...clientArgs,
    })
  }

  async transfer(transferArgs: WarehouseTransferConfig): Promise<bigint> {
    const gasEstimate = await this._transfer(transferArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async transferFrom(
    transferFromArgs: WarehouseTransferFromConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._transferFrom(transferFromArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async approve(approveArgs: WarehouseApproveConfig): Promise<bigint> {
    const gasEstimate = await this._approve(approveArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setOperator(
    setOperatorArgs: WarehouseSetOperatorConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._setOperator(setOperatorArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async invalidateNonce(
    invalidateNonceArgs: WarehouseInvalidateNonceConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._invalidateNonce(invalidateNonceArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async temporaryApproveAndCall(
    temporaryApproveAndCallArgs: WarehouseTemporaryApproveAndCallConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._temporaryApproveAndCall(
      temporaryApproveAndCallArgs,
    )

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async temporaryApproveAndCallBySig(
    temporaryApproveAndCallBySigArgs: WarehouseTemporaryApproveAndCallBySigConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._temporaryApproveAndCallBySig(
      temporaryApproveAndCallBySigArgs,
    )

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async approveBySig(
    approveBySigArgs: WarehouseApproveBySigConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._approveBySig(approveBySigArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async deposit(depositArgs: WarehouseDepositConfig): Promise<bigint> {
    const gasEstimate = await this._deposit(depositArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async batchDeposit(
    batchDepositArgs: WarehouseBatchDepositConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._batchDeposit(batchDepositArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async withdraw(withdrawArgs: WarehouseWithdrawConfig): Promise<bigint> {
    const gasEstimate = await this._withdraw(withdrawArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async batchWithdraw(
    batchWithdrawArgs: WarehouseBatchWithdrawConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._batchWithdraw(batchWithdrawArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async batchTransfer(
    batchTransferArgs: WarehouseBatchTransferConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._batchTransfer(batchTransferArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }

  async setWithdrawConfig(
    setConfigArgs: WarehouseSetWithdrawConfig,
  ): Promise<bigint> {
    const gasEstimate = await this._setWithdrawConfig(setConfigArgs)

    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface WarehouseGasEstimates<TChain extends Chain>
  extends BaseGasEstimatesMixin<TChain> {}
applyMixins(WarehouseGasEstimates, [BaseGasEstimatesMixin])

class WarehouseCallData<
  TChain extends Chain,
> extends WarehouseTransactions<TChain> {
  constructor(clientArgs: SplitsClientConfig<TChain>) {
    super({
      transactionType: TransactionType.CallData,
      ...clientArgs,
    })
  }

  async transfer(transferArgs: WarehouseTransferConfig): Promise<CallData> {
    const callData = await this._transfer(transferArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async transferFrom(
    transferFromArgs: WarehouseTransferFromConfig,
  ): Promise<CallData> {
    const callData = await this._transferFrom(transferFromArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async approve(approveArgs: WarehouseApproveConfig): Promise<CallData> {
    const callData = await this._approve(approveArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async setOperator(
    setOperatorArgs: WarehouseSetOperatorConfig,
  ): Promise<CallData> {
    const callData = await this._setOperator(setOperatorArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async invalidateNonce(
    invalidateNonceArgs: WarehouseInvalidateNonceConfig,
  ): Promise<CallData> {
    const callData = await this._invalidateNonce(invalidateNonceArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async temporaryApproveAndCall(
    temporaryApproveAndCallArgs: WarehouseTemporaryApproveAndCallConfig,
  ): Promise<CallData> {
    const callData = await this._temporaryApproveAndCall(
      temporaryApproveAndCallArgs,
    )

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async temporaryApproveAndCallBySig(
    temporaryApproveAndCallBySigArgs: WarehouseTemporaryApproveAndCallBySigConfig,
  ): Promise<CallData> {
    const callData = await this._temporaryApproveAndCallBySig(
      temporaryApproveAndCallBySigArgs,
    )

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async approveBySig(
    approveBySigArgs: WarehouseApproveBySigConfig,
  ): Promise<CallData> {
    const callData = await this._approveBySig(approveBySigArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async deposit(depositArgs: WarehouseDepositConfig): Promise<CallData> {
    const callData = await this._deposit(depositArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async batchDeposit(
    batchDepositArgs: WarehouseBatchDepositConfig,
  ): Promise<CallData> {
    const callData = await this._batchDeposit(batchDepositArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async withdraw(withdrawArgs: WarehouseWithdrawConfig): Promise<CallData> {
    const callData = await this._withdraw(withdrawArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async batchWithdraw(
    withdrawArgs: WarehouseWithdrawConfig,
  ): Promise<CallData> {
    const callData = await this._withdraw(withdrawArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async batchTransfer(
    batchTransferArgs: WarehouseBatchTransferConfig,
  ): Promise<CallData> {
    const callData = await this._batchTransfer(batchTransferArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }

  async setWithdrawConfig(
    setConfigArgs: WarehouseSetWithdrawConfig,
  ): Promise<CallData> {
    const callData = await this._setWithdrawConfig(setConfigArgs)

    if (!this._isCallData(callData)) throw new Error('Invalid response')

    return callData
  }
}

class WarehouseSignature<
  TChain extends Chain,
> extends WarehouseTransactions<TChain> {
  constructor(clientArgs: SplitsClientConfig<TChain>) {
    super({
      transactionType: TransactionType.Signature,
      ...clientArgs,
    })
  }

  async approveBySig(
    approveBySigArgs: WarehouseApproveBySig,
  ): Promise<WarehouseApproveBySigConfig> {
    validateAddress(approveBySigArgs.spenderAddress)
    validateAddress(approveBySigArgs.tokenAddress)
    this._requireWalletClient()

    const { domain } = await this._eip712Domain(this._walletClient!.chain.id)

    this._requireWalletClient()

    const signature = await this._walletClient!.signTypedData({
      domain,
      types: SigTypes,
      primaryType: 'ERC6909XApproveAndCall',
      message: {
        owner: this._walletClient!.account.address,
        spender: approveBySigArgs.spenderAddress,
        temporary: false,
        operator: approveBySigArgs.operator,
        id: fromHex(approveBySigArgs.tokenAddress, 'bigint'),
        amount: approveBySigArgs.amount,
        target: zeroAddress,
        data: '' as Hex,
        nonce: approveBySigArgs.nonce,
        deadline: approveBySigArgs.deadline,
      },
    })

    if (!signature) throw new Error('Error in signing data')

    return {
      ownerAddress: this._walletClient!.account.address as Address,
      signature,
      ...approveBySigArgs,
    }
  }

  async temporaryApproveAndCallBySig(
    temporaryApproveAndCallBySigArgs: WarehouseTemporaryApproveAndCallBySig,
  ): Promise<WarehouseApproveBySigConfig> {
    validateAddress(temporaryApproveAndCallBySigArgs.spenderAddress)
    validateAddress(temporaryApproveAndCallBySigArgs.tokenAddress)
    validateAddress(temporaryApproveAndCallBySigArgs.targetAddress)
    this._requireWalletClient()

    const { domain } = await this._eip712Domain(this._walletClient!.chain.id)

    const signature = await this._walletClient!.signTypedData({
      domain,
      types: SigTypes,
      primaryType: 'ERC6909XApproveAndCall',
      message: {
        owner: this._walletClient!.account.address,
        spender: temporaryApproveAndCallBySigArgs.spenderAddress,
        temporary: true,
        operator: temporaryApproveAndCallBySigArgs.operator,
        id: fromHex(temporaryApproveAndCallBySigArgs.tokenAddress, 'bigint'),
        amount: temporaryApproveAndCallBySigArgs.amount,
        target: temporaryApproveAndCallBySigArgs.targetAddress,
        data: temporaryApproveAndCallBySigArgs.data,
        nonce: temporaryApproveAndCallBySigArgs.nonce,
        deadline: temporaryApproveAndCallBySigArgs.deadline,
      },
    })

    if (!signature) throw new Error('Error in signing data')

    return {
      ownerAddress: this._walletClient!.account.address as Address,
      signature,
      ...temporaryApproveAndCallBySigArgs,
    }
  }
}

const SigTypes = {
  ERC6909XApproveAndCall: [
    {
      name: 'temporary',
      type: 'bool',
    },
    {
      name: 'owner',
      type: 'address',
    },
    {
      name: 'spender',
      type: 'address',
    },
    {
      name: 'operator',
      type: 'bool',
    },
    {
      name: 'id',
      type: 'uint256',
    },
    {
      name: 'amount',
      type: 'uint256',
    },
    {
      name: 'target',
      type: 'address',
    },
    {
      name: 'data',
      type: 'bytes',
    },
    {
      name: 'nonce',
      type: 'uint256',
    },
    {
      name: 'deadline',
      type: 'uint48',
    },
  ],
} as const
