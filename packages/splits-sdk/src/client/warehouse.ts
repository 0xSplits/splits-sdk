import {
  Address,
  Chain,
  GetContractReturnType,
  Hex,
  Log,
  PublicClient,
  Transport,
  TypedDataDomain,
  encodeEventTopics,
  fromHex,
  getContract,
  transactionType,
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
  WAREHOUSE_SUPPORTED_CHAIN_IDS,
  getWarehouseAddress,
} from '../constants'
import { TransactionFailedError, UnsupportedChainIdError } from '../errors'
import { applyMixins } from './mixin'
import { validateAddress } from '../utils'

type WarehouseAbiType = typeof warehouseAbi

class WarehouseTransactions extends BaseTransactions {
  protected readonly _warehouseAbi
  protected readonly _warehouseContract: GetContractReturnType<
    WarehouseAbiType,
    PublicClient<Transport, Chain>
  >

  constructor({
    transactionType,
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })

    this._warehouseContract = getContract({
      address: getWarehouseAddress(chainId),
      abi: warehouseAbi,
      publicClient: this._publicClient,
    })

    this._warehouseAbi = warehouseAbi
  }

  protected async _transfer({
    receiver,
    token,
    amount,
    transactionOverrides = {},
  }: WarehouseTransferConfig): Promise<TransactionFormat> {
    validateAddress(receiver)
    validateAddress(token)
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
      contractAbi: warehouseAbi,
      functionName: 'transfer',
      functionArgs: [receiver, fromHex(token, 'bigint'), amount],
      transactionOverrides,
    })

    return result
  }

  protected async _transferFrom({
    sender,
    receiver,
    token,
    amount,
    transactionOverrides = {},
  }: WarehouseTransferFromConfig): Promise<TransactionFormat> {
    validateAddress(sender)
    validateAddress(receiver)
    validateAddress(token)
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
      contractAbi: warehouseAbi,
      functionName: 'transferFrom',
      functionArgs: [sender, receiver, fromHex(token, 'bigint'), amount],
      transactionOverrides,
    })

    return result
  }

  protected async _approve({
    spender,
    token,
    amount,
    transactionOverrides = {},
  }: WarehouseApproveConfig): Promise<TransactionFormat> {
    validateAddress(spender)
    validateAddress(token)
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
      contractAbi: warehouseAbi,
      functionName: 'approve',
      functionArgs: [spender, fromHex(token, 'bigint'), amount],
      transactionOverrides,
    })

    return result
  }

  protected async _setOperator({
    operator,
    approved,
    transactionOverrides = {},
  }: WarehouseSetOperatorConfig): Promise<TransactionFormat> {
    validateAddress(operator)
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
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
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
      contractAbi: warehouseAbi,
      functionName: 'invalidateNonce',
      functionArgs: [nonce],
      transactionOverrides,
    })

    return result
  }

  protected async _temporaryApproveAndCall({
    spender,
    operator,
    token,
    amount,
    target,
    data,
    transactionOverrides = {},
  }: WarehouseTemporaryApproveAndCallConfig): Promise<TransactionFormat> {
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
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
    owner,
    spender,
    operator,
    token,
    amount,
    target,
    data,
    nonce,
    deadline,
    signature,
    transactionOverrides = {},
  }: WarehouseTemporaryApproveAndCallBySigConfig): Promise<TransactionFormat> {
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
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
    owner,
    spender,
    operator,
    token,
    amount,
    nonce,
    deadline,
    signature,
    transactionOverrides = {},
  }: WarehouseApproveBySigConfig): Promise<TransactionFormat> {
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
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
    receiver,
    token,
    amount,
    transactionOverrides = {},
  }: WarehouseDepositConfig): Promise<TransactionFormat> {
    validateAddress(receiver)
    validateAddress(token)
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
      contractAbi: warehouseAbi,
      functionName: 'deposit',
      functionArgs: [receiver, token, amount],
      transactionOverrides,
    })

    return result
  }

  protected async _batchDeposit({
    receivers,
    token,
    amounts,
    transactionOverrides = {},
  }: WarehouseBatchDepositConfig): Promise<TransactionFormat> {
    receivers.map((receiver) => validateAddress(receiver))
    validateAddress(token)
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
      contractAbi: warehouseAbi,
      functionName: 'batchDeposit',
      functionArgs: [receivers, token, amounts],
      transactionOverrides,
    })

    return result
  }

  protected async _withdraw({
    owner,
    token,
    transactionOverrides = {},
  }: WarehouseWithdrawConfig): Promise<TransactionFormat> {
    validateAddress(owner)
    validateAddress(token)
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
      contractAbi: warehouseAbi,
      functionName: 'withdraw',
      functionArgs: [owner, token],
      transactionOverrides,
    })

    return result
  }

  protected async _batchWithdraw({
    owner,
    tokens,
    amounts,
    withdrawer,
    transactionOverrides = {},
  }: WarehouseBatchWithdrawConfig): Promise<TransactionFormat> {
    validateAddress(owner)
    tokens.map((token) => validateAddress(token))
    validateAddress(withdrawer)
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
      contractAbi: warehouseAbi,
      functionName: 'withdraw',
      functionArgs: [owner, tokens, amounts, withdrawer],
      transactionOverrides,
    })

    return result
  }

  protected async _batchTransfer({
    receivers,
    token,
    amounts,
    transactionOverrides = {},
  }: WarehouseBatchTransferConfig): Promise<TransactionFormat> {
    receivers.map((receiver) => validateAddress(receiver))
    validateAddress(token)
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
      contractAbi: warehouseAbi,
      functionName: 'batchTransfer',
      functionArgs: [receivers, token, amounts],
      transactionOverrides,
    })

    return result
  }

  protected async _setWithdrawConfig({
    incentive,
    paused,
    transactionOverrides = {},
  }: WarehouseSetWithdrawConfig): Promise<TransactionFormat> {
    this._requirePublicClient()
    if (this._shouldRequireWalletClient) this._requireWalletClient()

    const result = await this._executeContractFunction({
      contractAddress: this._warehouseContract.address,
      contractAbi: warehouseAbi,
      functionName: 'setWithdrawConfig',
      functionArgs: [incentive, paused],
      transactionOverrides,
    })

    return result
  }
}

export class WarehouseClient extends WarehouseTransactions {
  readonly eventTopics: { [key: string]: Hex[] }
  readonly callData: WarehouseCallData
  readonly estimateGas: WarehouseGasEstimates

  constructor({
    chainId,
    publicClient,
    walletClient,
    includeEnsNames = false,
    ensPublicClient,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      walletClient,
      includeEnsNames,
      ensPublicClient,
    })

    if (!WAREHOUSE_SUPPORTED_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, WAREHOUSE_SUPPORTED_CHAIN_IDS)

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

    this.callData = new WarehouseCallData({
      chainId,
      publicClient,
      walletClient,
      includeEnsNames,
      ensPublicClient,
    })

    this.estimateGas = new WarehouseGasEstimates({
      chainId,
      publicClient,
      walletClient,
      includeEnsNames,
      ensPublicClient,
    })
  }

  // ERC6909 Metadata
  async getName({ tokenAddress }: { tokenAddress: Address }): Promise<{
    name: string
  }> {
    validateAddress(tokenAddress)
    this._requirePublicClient()

    const name = await this._warehouseContract.read.name([
      fromHex(tokenAddress, 'bigint'),
    ])

    return {
      name,
    }
  }

  async getSymbol({ tokenAddress }: { tokenAddress: Address }): Promise<{
    symbol: string
  }> {
    validateAddress(tokenAddress)
    this._requirePublicClient()

    const symbol = await this._warehouseContract.read.symbol([
      fromHex(tokenAddress, 'bigint'),
    ])

    return {
      symbol,
    }
  }

  async getDecimals({ tokenAddress }: { tokenAddress: Address }): Promise<{
    decimals: number
  }> {
    validateAddress(tokenAddress)
    this._requirePublicClient()

    const decimals = await this._warehouseContract.read.decimals([
      fromHex(tokenAddress, 'bigint'),
    ])

    return {
      decimals,
    }
  }

  // Warehouse withdraw config
  async getWithdrawConfig({
    userAddress,
  }: {
    userAddress: Address
  }): Promise<{ withdrawConfig: { incentive: number; paused: boolean } }> {
    validateAddress(userAddress)
    this._requirePublicClient()

    const config = await this._warehouseContract.read.withdrawConfig([
      userAddress,
    ])

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
  }: {
    userAddress: Address
    userNonce: bigint
  }): Promise<{ isValidNonce: boolean }> {
    validateAddress(userAddress)
    this._requirePublicClient()

    const isValidNonce = await this._warehouseContract.read.isValidNonce([
      userAddress,
      userNonce,
    ])

    return {
      isValidNonce,
    }
  }

  async eip712Domain(): Promise<{ domain: TypedDataDomain }> {
    this._requirePublicClient()

    const eip712Domain = await this._warehouseContract.read.eip712Domain()

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

  // ERC6909 read
  async isOperator({
    ownerAddress,
    operatorAddress,
  }: {
    ownerAddress: Address
    operatorAddress: Address
  }): Promise<{ isOperator: boolean }> {
    validateAddress(ownerAddress)
    validateAddress(operatorAddress)
    this._requirePublicClient()

    const isOperator = await this._warehouseContract.read.isOperator([
      ownerAddress,
      operatorAddress,
    ])

    return {
      isOperator,
    }
  }

  async balanceOf({
    ownerAddress,
    tokenAddress,
  }: {
    ownerAddress: Address
    tokenAddress: Address
  }): Promise<{ balance: bigint }> {
    validateAddress(ownerAddress)
    validateAddress(tokenAddress)
    this._requirePublicClient()

    const balance = await this._warehouseContract.read.balanceOf([
      ownerAddress,
      fromHex(tokenAddress, 'bigint'),
    ])

    return {
      balance,
    }
  }

  async allowance({
    ownerAddress,
    spenderAddress,
    tokenAddress,
  }: {
    ownerAddress: Address
    spenderAddress: Address
    tokenAddress: Address
  }): Promise<{ allowance: bigint }> {
    validateAddress(ownerAddress)
    validateAddress(spenderAddress)
    validateAddress(tokenAddress)
    this._requirePublicClient()

    const allowance = await this._warehouseContract.read.allowance([
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

  async signApproveBySig(
    approveBySigArgs: WarehouseApproveBySig,
  ): Promise<WarehouseApproveBySigConfig> {
    const { domain } = await this.eip712Domain()

    this._requireWalletClient()

    const signature = await this._walletClient?.signTypedData({
      domain,
      types: SigTypes,
      primaryType: 'ERC6909XApproveAndCall',
      message: {
        owner: this._walletClient.account.address,
        spender: approveBySigArgs.spender,
        temporary: false,
        operator: approveBySigArgs.operator,
        id: fromHex(approveBySigArgs.token, 'bigint'),
        amount: approveBySigArgs.amount,
        target: zeroAddress,
        data: '0x',
        nonce: approveBySigArgs.nonce,
        deadline: approveBySigArgs.deadline,
      },
    })

    if (!signature) throw new Error('Error in signing data')

    return {
      owner: this._walletClient?.account.address as Address,
      signature,
      ...approveBySigArgs,
    }
  }

  async signTemporaryApproveAndCallBySig(
    temporaryApproveAndCallBySigArgs: WarehouseTemporaryApproveAndCallBySig,
  ): Promise<WarehouseApproveBySigConfig> {
    const { domain } = await this.eip712Domain()

    this._requireWalletClient()

    const signature = await this._walletClient?.signTypedData({
      domain,
      types: SigTypes,
      primaryType: 'ERC6909XApproveAndCall',
      message: {
        owner: this._walletClient.account.address,
        spender: temporaryApproveAndCallBySigArgs.spender,
        temporary: true,
        operator: temporaryApproveAndCallBySigArgs.operator,
        id: fromHex(temporaryApproveAndCallBySigArgs.token, 'bigint'),
        amount: temporaryApproveAndCallBySigArgs.amount,
        target: temporaryApproveAndCallBySigArgs.target,
        data: temporaryApproveAndCallBySigArgs.data,
        nonce: temporaryApproveAndCallBySigArgs.nonce,
        deadline: temporaryApproveAndCallBySigArgs.deadline,
      },
    })

    if (!signature) throw new Error('Error in signing data')

    return {
      owner: this._walletClient?.account.address as Address,
      signature,
      ...temporaryApproveAndCallBySigArgs,
    }
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

    let events = await this.getTransactionEvents({
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

  async withdraw(
    withdrawArgs: WarehouseWithdrawConfig,
  ): Promise<{ event: Log }> {
    const txHash = await this._withdraw(withdrawArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

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

  async batchWithdraw(
    batchWithdrawArgs: WarehouseBatchWithdrawConfig,
  ): Promise<{ events: Log[] }> {
    const txHash = await this._batchWithdraw(batchWithdrawArgs)
    if (!this._isContractTransaction(txHash))
      throw new Error('Invalid response')

    let events = await this.getTransactionEvents({
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

    let events = await this.getTransactionEvents({
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

export interface WarehouseClient extends BaseClientMixin {}
applyMixins(WarehouseClient, [BaseClientMixin])

class WarehouseGasEstimates extends WarehouseTransactions {
  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
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

interface WarehouseGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(WarehouseGasEstimates, [BaseGasEstimatesMixin])

class WarehouseCallData extends WarehouseTransactions {
  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.CallData,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
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
