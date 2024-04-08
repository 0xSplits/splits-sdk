import {
  PublicClient,
  WalletClient,
  Address,
  Abi,
  Hash,
  encodeFunctionData,
  Log,
  Hex,
  Transport,
  Chain,
  Account,
} from 'viem'

import { MULTICALL_3_ADDRESS, TransactionType } from '../constants'
import { multicallAbi } from '../constants/abi/multicall'
import {
  InvalidConfigError,
  MissingDataClientError,
  MissingPublicClientError,
  MissingWalletClientError,
} from '../errors'
import type {
  CallData,
  MulticallConfig,
  SplitsClientConfig,
  TransactionConfig,
  TransactionFormat,
  TransactionOverrides,
} from '../types'

import { DataClient } from './data'

class BaseClient {
  readonly _chainId: number
  readonly _ensPublicClient: PublicClient<Transport, Chain> | undefined
  readonly _walletClient: WalletClient<Transport, Chain, Account> | undefined
  readonly _publicClient: PublicClient<Transport, Chain> | undefined
  readonly _apiConfig:
    | {
        apiKey: string
        serverURL?: string
      }
    | undefined
  readonly _includeEnsNames: boolean
  readonly _dataClient: DataClient | undefined

  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    apiConfig,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    if (includeEnsNames && !publicClient && !ensPublicClient)
      throw new InvalidConfigError(
        'Must include a mainnet public client if includeEnsNames is set to true',
      )

    this._ensPublicClient = ensPublicClient ?? publicClient
    this._publicClient = publicClient
    this._chainId = chainId
    this._walletClient = walletClient
    this._includeEnsNames = includeEnsNames
    this._apiConfig = apiConfig

    if (apiConfig) {
      this._dataClient = new DataClient({
        publicClient,
        ensPublicClient,
        apiConfig,
        includeEnsNames,
      })
    }
  }

  protected _requireDataClient() {
    if (!this._dataClient)
      throw new MissingDataClientError(
        'Data client required to perform this action, please update your call to the constructor',
      )
  }

  protected _requirePublicClient() {
    if (!this._publicClient)
      throw new MissingPublicClientError(
        'Public client required to perform this action, please update your call to the constructor',
      )
  }

  protected _requireWalletClient() {
    this._requirePublicClient()
    if (!this._walletClient)
      throw new MissingWalletClientError(
        'Wallet client required to perform this action, please update your call to the constructor',
      )
    if (!this._walletClient.account)
      throw new MissingWalletClientError(
        'Wallet client must have an account attached to it to perform this action, please update your wallet client passed into the constructor',
      )
  }
}

export class BaseTransactions extends BaseClient {
  protected readonly _transactionType: TransactionType
  protected readonly _shouldRequireWalletClient: boolean

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
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })

    this._transactionType = transactionType
    this._shouldRequireWalletClient = [
      TransactionType.GasEstimate,
      TransactionType.Transaction,
    ].includes(transactionType)
  }

  protected async _executeContractFunction({
    contractAddress,
    contractAbi,
    functionName,
    functionArgs,
    transactionOverrides,
    value,
  }: {
    contractAddress: Address
    contractAbi: Abi
    functionName: string
    functionArgs?: unknown[]
    transactionOverrides: TransactionOverrides
    value?: bigint
  }) {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()
    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
    }

    if (this._transactionType === TransactionType.GasEstimate) {
      if (!this._walletClient?.account) throw new Error()
      const gasEstimate = await this._publicClient.estimateContractGas({
        address: contractAddress,
        abi: contractAbi,
        functionName,
        account: this._walletClient.account,
        args: functionArgs ?? [],
        value,
        ...transactionOverrides,
      })
      return gasEstimate
    } else if (this._transactionType === TransactionType.CallData) {
      const calldata = encodeFunctionData({
        abi: contractAbi,
        functionName,
        args: functionArgs ?? [],
      })

      return {
        address: contractAddress,
        data: calldata,
      }
    } else if (this._transactionType === TransactionType.Transaction) {
      if (!this._walletClient?.account) throw new Error()
      const { request } = await this._publicClient.simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName,
        account: this._walletClient.account,
        args: functionArgs ?? [],
        value,
        ...transactionOverrides,
      })
      const txHash = await this._walletClient.writeContract(request)
      return txHash
    } else throw new Error(`Unknown transaction type: ${this._transactionType}`)
  }

  protected _isContractTransaction(txHash: TransactionFormat): txHash is Hash {
    return typeof txHash === 'string'
  }

  protected _isBigInt(gasEstimate: TransactionFormat): gasEstimate is bigint {
    return typeof gasEstimate === 'bigint'
  }

  protected _isCallData(callData: TransactionFormat): callData is CallData {
    if (callData instanceof BigInt) return false
    if (typeof callData === 'string') return false

    return true
  }

  async _multicallTransaction({
    calls,
    transactionOverrides = {},
  }: MulticallConfig): Promise<TransactionFormat> {
    this._requireWalletClient()
    if (!this._walletClient) throw new Error()

    const callRequests = calls.map((call) => {
      return {
        target: call.address,
        callData: call.data,
      }
    })

    const result = await this._executeContractFunction({
      contractAddress: MULTICALL_3_ADDRESS,
      contractAbi: multicallAbi,
      functionName: 'aggregate',
      functionArgs: [callRequests],
      transactionOverrides,
    })
    return result
  }
}

export class BaseClientMixin extends BaseTransactions {
  async getTransactionEvents({
    txHash,
    eventTopics,
    includeAll,
  }: {
    txHash: Hash
    eventTopics: Hex[]
    includeAll?: boolean
  }): Promise<Log[]> {
    if (!this._publicClient)
      throw new Error('Public client required to get transaction events')

    const transaction = await this._publicClient.waitForTransactionReceipt({
      hash: txHash,
    })
    if (transaction.status === 'success') {
      const events = transaction.logs?.filter((log) => {
        if (includeAll) return true
        if (log.topics[0]) return eventTopics.includes(log.topics[0])

        return false
      })

      return events
    }

    return []
  }

  async submitMulticallTransaction(multicallArgs: MulticallConfig): Promise<{
    txHash: Hash
  }> {
    const multicallResult = await this._multicallTransaction(multicallArgs)
    if (!this._isContractTransaction(multicallResult))
      throw new Error('Invalid response')

    return { txHash: multicallResult }
  }

  async multicall(multicallArgs: MulticallConfig): Promise<{ events: Log[] }> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const { txHash } = await this.submitMulticallTransaction(multicallArgs)
    const events = await this.getTransactionEvents({
      txHash,
      eventTopics: [],
      includeAll: true,
    })
    return { events }
  }
}

export class BaseGasEstimatesMixin extends BaseTransactions {
  async multicall(multicallArgs: MulticallConfig): Promise<bigint> {
    const gasEstimate = await this._multicallTransaction(multicallArgs)
    if (!this._isBigInt(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}
