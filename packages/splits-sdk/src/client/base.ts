import {
  PublicClient,
  getAddress,
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

import { GraphQLClient, Variables } from 'graphql-request'

import {
  ADDRESS_ZERO,
  MULTICALL_3_ADDRESS,
  TransactionType,
} from '../constants'
import { multicallAbi } from '../constants/abi/multicall'
import {
  AccountNotFoundError,
  InvalidArgumentError,
  InvalidConfigError,
  MissingPublicClientError,
  MissingWalletClientError,
  UnsupportedSubgraphChainIdError,
} from '../errors'
import {
  ACCOUNT_BALANCES_QUERY,
  USER_BALANCES_BY_CONTRACT_FILTERED_QUERY,
  USER_BALANCES_BY_CONTRACT_QUERY,
  formatAccountBalances,
  formatContractEarnings,
  getGraphqlClient,
} from '../subgraph'
import { GqlAccountBalances, GqlContractEarnings } from '../subgraph/types'
import type {
  CallData,
  EarningsByContract,
  FormattedTokenBalances,
  MulticallConfig,
  SplitsClientConfig,
  TokenBalances,
  TransactionConfig,
  TransactionFormat,
  TransactionOverrides,
} from '../types'
import {
  fromBigIntToTokenValue,
  getTokenData,
  isLogsPublicClient,
} from '../utils'
import {
  fetchActiveBalances,
  fetchERC20TransferredTokens,
} from '../utils/balances'

class BaseClient {
  readonly _chainId: number
  protected readonly _ensPublicClient:
    | PublicClient<Transport, Chain>
    | undefined
  readonly _walletClient: WalletClient<Transport, Chain, Account> | undefined
  readonly _publicClient: PublicClient<Transport, Chain> | undefined
  private readonly _graphqlClient: GraphQLClient | undefined
  protected readonly _includeEnsNames: boolean

  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
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
    this._graphqlClient = getGraphqlClient(chainId)
    this._includeEnsNames = includeEnsNames
  }

  protected async _makeGqlRequest<ResponseType>(
    query: string,
    variables?: Variables,
  ): Promise<ResponseType> {
    if (!this._graphqlClient) {
      throw new UnsupportedSubgraphChainIdError()
    }

    // TODO: any error handling? need to add try/catch if so
    const result = await this._graphqlClient.request<ResponseType>(
      query,
      variables,
    )
    return result
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

  protected async _getUserBalancesByContract({
    userAddress,
    contractAddresses,
  }: {
    userAddress: string
    contractAddresses?: string[]
  }): Promise<{
    contractEarnings: EarningsByContract
  }> {
    const chainId = this._chainId

    const gqlQuery =
      contractAddresses === undefined
        ? USER_BALANCES_BY_CONTRACT_QUERY
        : USER_BALANCES_BY_CONTRACT_FILTERED_QUERY
    const gqlArgs =
      contractAddresses === undefined
        ? { userAddress: userAddress.toLowerCase() }
        : {
            userAddress: userAddress.toLowerCase(),
            contractIds: contractAddresses.map((contractAddress) =>
              contractAddress.toLowerCase(),
            ),
          }

    const response = await this._makeGqlRequest<{
      userBalancesByContract: {
        contractEarnings: GqlContractEarnings[]
      }
    }>(gqlQuery, gqlArgs)

    if (!response.userBalancesByContract)
      throw new AccountNotFoundError('user', userAddress, chainId)

    const contractEarnings = formatContractEarnings(
      response.userBalancesByContract.contractEarnings,
    )

    return {
      contractEarnings,
    }
  }

  protected async _getAccountBalances({
    accountAddress,
    includeActiveBalances,
    erc20TokenList,
  }: {
    accountAddress: Address
    includeActiveBalances: boolean
    erc20TokenList?: string[]
  }): Promise<{
    withdrawn: TokenBalances
    activeBalances?: TokenBalances
  }> {
    const chainId = this._chainId

    const response = await this._makeGqlRequest<{
      accountBalances: GqlAccountBalances
    }>(ACCOUNT_BALANCES_QUERY, {
      accountAddress: accountAddress.toLowerCase(),
    })

    if (!response.accountBalances)
      throw new AccountNotFoundError('account', accountAddress, chainId)

    const withdrawn = formatAccountBalances(
      response.accountBalances.withdrawals,
    )
    if (!includeActiveBalances) {
      return { withdrawn }
    }

    const internalBalances = formatAccountBalances(
      response.accountBalances.internalBalances,
    )
    if (response.accountBalances.__typename === 'User') {
      // Only including split main balance for users
      return { withdrawn, activeBalances: internalBalances }
    }

    // Need to fetch current balance. Handle alchemy/infura with logs, and all other rpc's with token list
    if (!this._publicClient)
      throw new MissingPublicClientError(
        'Public client required to get active balances. Please update your call to the client constructor with a valid public client, or set includeActiveBalances to false',
      )
    const tokenList = erc20TokenList ?? []
    if (erc20TokenList === undefined) {
      if (!isLogsPublicClient(this._publicClient))
        throw new InvalidArgumentError(
          'Token list required if public client is not alchemy or infura',
        )
      const transferredErc20Tokens = await fetchERC20TransferredTokens(
        this._chainId,
        this._publicClient,
        accountAddress,
      )
      tokenList.push(...transferredErc20Tokens)
    }

    // Include already distributed tokens in list for balances
    const customTokens = Object.keys(withdrawn) ?? []
    const fullTokenList = Array.from(
      new Set(
        [ADDRESS_ZERO, ...tokenList]
          .concat(Object.keys(internalBalances ?? {}))
          .concat(customTokens)
          .map((token) => getAddress(token)),
      ),
    )
    const balances = await fetchActiveBalances(
      accountAddress,
      this._publicClient,
      fullTokenList,
    )
    const filteredBalances = Object.keys(balances).reduce((acc, token) => {
      const tokenBalance =
        balances[token] + (internalBalances[token] ?? BigInt(0))

      if (tokenBalance > BigInt(1)) acc[token] = tokenBalance
      return acc
    }, {} as TokenBalances)

    return { withdrawn, activeBalances: filteredBalances }
  }

  protected async _getFormattedTokenBalances(
    tokenBalancesList: TokenBalances[],
  ): Promise<FormattedTokenBalances[]> {
    const localPublicClient = this._publicClient
    if (!localPublicClient)
      throw new Error('Public client required to fetch token contract data')
    const tokenData: { [token: string]: { symbol: string; decimals: number } } =
      {}

    const formattedTokenBalancesList = await Promise.all(
      tokenBalancesList.map(async (tokenBalances) => {
        const formattedTokenBalances = await Object.keys(tokenBalances).reduce(
          async (acc, token) => {
            const formattedToken = getAddress(token)
            const awaitedAcc = await acc

            const rawAmount = tokenBalances[token]
            if (!tokenData[token]) {
              tokenData[token] = await getTokenData(
                this._chainId,
                formattedToken,
                localPublicClient,
              )
            }

            awaitedAcc[token] = {
              ...tokenData[token],
              rawAmount,
              formattedAmount: fromBigIntToTokenValue(
                rawAmount,
                tokenData[token].decimals,
              ),
            }
            return awaitedAcc
          },
          {} as Promise<FormattedTokenBalances>,
        )

        return formattedTokenBalances
      }),
    )

    return formattedTokenBalancesList
  }
}

export class BaseTransactions extends BaseClient {
  protected readonly _transactionType: TransactionType
  protected readonly _shouldRequreWalletClient: boolean

  constructor({
    transactionType,
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      includeEnsNames,
    })

    this._transactionType = transactionType
    this._shouldRequreWalletClient = [
      TransactionType.Transaction,
      TransactionType.CallData,
    ].includes(transactionType)
  }

  protected async _executeContractFunction({
    contractAddress,
    contractAbi,
    functionName,
    functionArgs,
    transactionOverrides,
  }: {
    contractAddress: Address
    contractAbi: Abi
    functionName: string
    functionArgs?: unknown[]
    transactionOverrides: TransactionOverrides
  }) {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()
    this._requireWalletClient()
    if (!this._walletClient?.account) throw new Error()

    if (this._transactionType === TransactionType.GasEstimate) {
      const gasEstimate = await this._publicClient.estimateContractGas({
        address: contractAddress,
        abi: contractAbi,
        functionName,
        account: this._walletClient.account,
        args: functionArgs ?? [],
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
      const { request } = await this._publicClient.simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName,
        account: this._walletClient.account,
        args: functionArgs ?? [],
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
