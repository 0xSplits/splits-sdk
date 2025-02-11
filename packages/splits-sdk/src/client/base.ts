import {
  PublicClient,
  WalletClient,
  Address,
  Abi,
  Hash,
  encodeFunctionData,
  Log,
  Hex,
} from 'viem'

import { MULTICALL_3_ADDRESS, TransactionType } from '../constants'
import { multicallAbi } from '../constants/abi/multicall'
import {
  InvalidArgumentError,
  InvalidConfigError,
  MissingDataClientError,
  MissingPublicClientError,
  MissingWalletClientError,
  UnsupportedChainIdError,
} from '../errors'
import type {
  ApiConfig,
  BaseClientConfig,
  CallData,
  MulticallConfig,
  TransactionConfig,
  TransactionFormat,
  TransactionOverrides,
} from '../types'

import { DataClient } from './data'

class BaseClient {
  readonly _chainId: number | undefined // DEPRECATED
  readonly _ensPublicClient: PublicClient | undefined // DEPRECATED
  readonly _walletClient: WalletClient | undefined
  readonly _publicClient: PublicClient | undefined // DEPRECATED
  readonly _publicClients:
    | {
        [chainId: number]: PublicClient
      }
    | undefined
  readonly _apiConfig: ApiConfig | undefined
  readonly _includeEnsNames: boolean
  readonly _dataClient: DataClient | undefined
  readonly _supportedChainIds: number[]

  constructor({
    chainId,
    publicClient,
    publicClients,
    ensPublicClient,
    walletClient,
    apiConfig,
    supportedChainIds,
    includeEnsNames = false,
  }: BaseClientConfig) {
    if (includeEnsNames && !publicClient && !ensPublicClient)
      throw new InvalidConfigError(
        'Must include a mainnet public client if includeEnsNames is set to true',
      )

    this._ensPublicClient =
      publicClients?.[1] ?? ensPublicClient ?? publicClient
    this._publicClient = publicClient
    this._publicClients = publicClients
    this._chainId = chainId
    this._walletClient = walletClient
    this._includeEnsNames = includeEnsNames
    this._apiConfig = apiConfig
    this._supportedChainIds = supportedChainIds

    if (apiConfig) {
      this._dataClient = new DataClient({
        publicClient,
        publicClients,
        ensPublicClient,
        apiConfig,
        includeEnsNames,
      })
    }
  }

  protected _requireDataClient() {
    if (!this._dataClient)
      throw new MissingDataClientError(
        'API config required to perform this action, please update your call to the constructor',
      )
  }

  protected _requirePublicClient(chainId: number) {
    this._getPublicClient(chainId)
  }

  protected _requireWalletClient() {
    if (!this._walletClient)
      throw new MissingWalletClientError(
        'Wallet client required to perform this action, please update your call to the constructor',
      )
    if (!this._walletClient.account)
      throw new MissingWalletClientError(
        'Wallet client must have an account attached to it to perform this action, please update your wallet client passed into the constructor',
      )

    const chainId = this._walletClient.chain?.id
    if (!chainId)
      throw new Error('Wallet client must have a chain attached to it')
    if (!this._supportedChainIds.includes(chainId))
      throw new UnsupportedChainIdError(chainId, this._supportedChainIds)

    this._requirePublicClient(chainId)
  }

  _getPublicClient(chainId: number): PublicClient {
    if (!this._supportedChainIds.includes(chainId))
      throw new UnsupportedChainIdError(chainId, this._supportedChainIds)

    if (this._publicClients && this._publicClients[chainId]) {
      return this._publicClients[chainId]
    }

    if (!this._publicClient)
      throw new MissingPublicClientError(
        `Public client required on chain ${chainId} to perform this action, please update your call to the constructor`,
      )

    if (this._publicClient.chain?.id !== chainId) {
      throw new MissingPublicClientError(
        `Public client is for chain ${this._publicClient.chain?.id}, but attempting to use it on chain ${chainId}`,
      )
    }

    return this._publicClient
  }
}

export class BaseTransactions extends BaseClient {
  protected readonly _transactionType: TransactionType
  protected readonly _shouldRequireWalletClient: boolean

  constructor({
    transactionType,
    ...baseClientArgs
  }: BaseClientConfig & TransactionConfig) {
    super(baseClientArgs)

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
    if (this._shouldRequireWalletClient) {
      this._requireWalletClient()
    }

    if (this._transactionType === TransactionType.GasEstimate) {
      if (!this._walletClient?.account) throw new Error()
      const publicClient = this._getPublicClient(this._walletClient.chain!.id)

      const gasEstimate = await publicClient.estimateContractGas({
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
        value,
      }
    } else if (this._transactionType === TransactionType.Transaction) {
      if (!this._walletClient?.account) throw new Error()
      const publicClient = this._getPublicClient(this._walletClient.chain!.id)
      const { request } = await publicClient.simulateContract({
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

  protected _getFunctionChainId(argumentChainId?: number) {
    if (this._shouldRequireWalletClient) {
      if (
        argumentChainId !== undefined &&
        this._walletClient!.chain!.id !== argumentChainId
      ) {
        throw new InvalidArgumentError(
          `Passed in chain id ${argumentChainId} does not match walletClient chain id: ${
            this._walletClient!.chain!.id
          }.`,
        )
      }
      return this._walletClient!.chain!.id
    }

    return this._getReadOnlyFunctionChainId(argumentChainId)
  }

  // Ignore wallet client here
  protected _getReadOnlyFunctionChainId(argumentChainId?: number) {
    const functionChainId = argumentChainId ?? this._chainId
    if (!functionChainId)
      throw new InvalidArgumentError('Please pass in the chainId you are using')

    return functionChainId
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
    this._requireWalletClient()
    const chainId = this._walletClient!.chain!.id
    const publicClient = this._getPublicClient(chainId)

    const transaction = await publicClient.waitForTransactionReceipt({
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

  async _submitMulticallTransaction(multicallArgs: MulticallConfig): Promise<{
    txHash: Hash
  }> {
    const multicallResult = await this._multicallTransaction(multicallArgs)
    if (!this._isContractTransaction(multicallResult))
      throw new Error('Invalid response')

    return { txHash: multicallResult }
  }

  async multicall(multicallArgs: MulticallConfig): Promise<{ events: Log[] }> {
    const { txHash } = await this._submitMulticallTransaction(multicallArgs)
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
