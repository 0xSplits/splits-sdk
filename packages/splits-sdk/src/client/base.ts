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
import { GqlAccount } from '../subgraph/types'
import type {
  CallData,
  ContractEarnings,
  EarningsByContract,
  FormattedContractEarnings,
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
  isAlchemyPublicClient,
  isLogsPublicClient,
} from '../utils'
import {
  fetchActiveBalances,
  fetchContractBalancesWithAlchemy,
  fetchERC20TransferredTokens,
} from '../utils/balances'
import { validateAddress } from '../utils/validation'
import {
  GqlLiquidSplit,
  GqlPassThroughWallet,
  GqlSplit,
  GqlSwapper,
  GqlVestingModule,
  GqlWaterfallModule,
  IAccountType,
  ISubgraphAccount,
} from '../subgraph/types'
import { MAX_RELATED_ACCOUNTS } from '../subgraph/constants'
import { formatGqlSplit } from '../subgraph/split'
import { formatGqlWaterfallModule } from '../subgraph/waterfall'
import { formatGqlVestingModule } from '../subgraph/vesting'
import { formatGqlSwapper } from '../subgraph/swapper'
import { formatGqlPassThroughWallet } from '../subgraph/pass-through-wallet'
import { formatGqlLiquidSplit } from '../subgraph/liquid'
import { formatAccountBalances, formatContractEarnings } from '../subgraph/user'
import {
  ACCOUNT_QUERY,
  FULL_ACCOUNT_QUERY,
  formatFullGqlAccount,
  formatGqlAccount,
  getGraphqlClient,
} from '../subgraph'

class BaseClient {
  readonly _chainId: number
  readonly _ensPublicClient: PublicClient<Transport, Chain> | undefined
  readonly _walletClient: WalletClient<Transport, Chain, Account> | undefined
  readonly _publicClient: PublicClient<Transport, Chain> | undefined
  private readonly _graphqlClient: GraphQLClient | undefined
  readonly _includeEnsNames: boolean

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

    if (apiConfig) this._graphqlClient = getGraphqlClient(apiConfig)
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

  protected async _loadAccount(
    accountId: string,
    chainId: number,
  ): Promise<IAccountType | undefined> {
    const result = await this._makeGqlRequest<{
      account: GqlAccount
    }>(ACCOUNT_QUERY, {
      accountId: accountId.toLowerCase(),
      chainId: chainId.toString(),
    })
    if (!result.account) return
    return formatGqlAccount(result.account)
  }

  protected async _loadFullAccount(
    accountId: string,
    chainId: number,
  ): Promise<ISubgraphAccount> {
    const result = await this._makeGqlRequest<{
      account: GqlAccount
      relatedAccounts: {
        controllingSplits: GqlSplit[]
        pendingControlSplits: GqlSplit[]
        ownedSwappers: GqlSwapper[]
        ownedPassThroughWallets: GqlPassThroughWallet[]
        upstreamSplits: GqlSplit[]
        upstreamLiquidSplits: GqlLiquidSplit[]
        upstreamWaterfalls: GqlWaterfallModule[]
        upstreamVesting: GqlVestingModule[]
        upstreamSwappers: GqlSwapper[]
        upstreamPassThroughWallets: GqlPassThroughWallet[]
      }
    }>(FULL_ACCOUNT_QUERY, {
      accountId: accountId.toLowerCase(),
      chainId: chainId.toString(),
      relatedAccountsLimit: MAX_RELATED_ACCOUNTS,
    })

    const response: ISubgraphAccount = {}

    const relatedAccounts = result.relatedAccounts

    if (result.account) {
      // TODO: need to figure out how to ignore liquid split downstream splits
      response.upstreamSplits =
        relatedAccounts.upstreamSplits?.map((gqlSplit) =>
          formatGqlSplit(gqlSplit),
        ) ?? []
      response.upstreamWaterfalls =
        relatedAccounts.upstreamWaterfalls?.map((waterfallModule) =>
          formatGqlWaterfallModule(waterfallModule),
        ) ?? []
      response.upstreamVesting =
        relatedAccounts.upstreamVesting?.map((vestingModule) =>
          formatGqlVestingModule(vestingModule),
        ) ?? []
      response.upstreamSwappers =
        relatedAccounts.upstreamSwappers?.map((swapper) =>
          formatGqlSwapper(swapper),
        ) ?? []
      response.upstreamPassThroughWallets =
        relatedAccounts.upstreamPassThroughWallets?.map((passThroughWallet) =>
          formatGqlPassThroughWallet(passThroughWallet),
        ) ?? []
      response.upstreamLiquidSplits =
        relatedAccounts.upstreamLiquidSplits?.map((gqlLiquidSplit) =>
          formatGqlLiquidSplit(gqlLiquidSplit),
        ) ?? []
      if (response.upstreamLiquidSplits.length > 0) {
        response.upstreamSplits = response.upstreamSplits.concat(
          relatedAccounts.upstreamLiquidSplits.map((gqlLiquidSplit) =>
            formatGqlSplit(gqlLiquidSplit.split),
          ),
        )
      }

      response.controllingSplits =
        relatedAccounts.controllingSplits?.map((split) =>
          formatGqlSplit(split),
        ) ?? []
      response.pendingControlSplits =
        relatedAccounts.pendingControlSplits?.map((split) =>
          formatGqlSplit(split),
        ) ?? []
      response.ownedSwappers =
        relatedAccounts.ownedSwappers?.map((swapper) =>
          formatGqlSwapper(swapper),
        ) ?? []
      response.ownedPassThroughWallets =
        relatedAccounts.ownedPassThroughWallets?.map((passThroughWallet) =>
          formatGqlPassThroughWallet(passThroughWallet),
        ) ?? []

      response.account = formatFullGqlAccount(
        result.account,
        response.upstreamSplits,
        response.upstreamVesting,
        response.upstreamWaterfalls,
        response.upstreamLiquidSplits,
        response.upstreamSwappers,
        response.upstreamPassThroughWallets,
        relatedAccounts.controllingSplits,
        relatedAccounts.pendingControlSplits,
        relatedAccounts.ownedSwappers,
        relatedAccounts.ownedPassThroughWallets,
      )

      const allPassThroughWallets = [...relatedAccounts.ownedPassThroughWallets]
      if (result.account.__typename === 'PassThroughWallet') {
        allPassThroughWallets.push(result.account)
      }

      if (result.account.__typename === 'LiquidSplit') {
        // Not really an upstream split, but it's just used for loading. Should probably update that name. Maybe related splits?
        response.upstreamSplits.push(formatGqlSplit(result.account.split))
      } else if (result.account.__typename === 'WaterfallModule') {
        result.account.tranches.map((gqlWaterfallTranche) => {
          if (gqlWaterfallTranche.recipient.__typename === 'Split') {
            response.upstreamSplits = response.upstreamSplits ?? []
            response.upstreamSplits.push(
              formatGqlSplit(gqlWaterfallTranche.recipient),
            )
          }
        })
      }

      if (allPassThroughWallets.length > 0) {
        allPassThroughWallets.map((gqlPassThroughWallet) => {
          if (gqlPassThroughWallet.passThroughAccount.__typename === 'Split') {
            response.upstreamSplits = response.upstreamSplits ?? []
            response.upstreamSplits.push(
              formatGqlSplit(gqlPassThroughWallet.passThroughAccount),
            )
            gqlPassThroughWallet.passThroughAccount.recipients.map(
              (gqlRecipient) => {
                if (gqlRecipient.account.__typename === 'Swapper') {
                  response.upstreamSwappers = response.upstreamSwappers ?? []
                  response.upstreamSwappers.push(
                    formatGqlSwapper(gqlRecipient.account),
                  )
                }
              },
            )
          }
        })
      }
    }

    return response
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

    const response = await this._loadAccount(userAddress, chainId)

    if (!response) throw new AccountNotFoundError('user', userAddress, chainId)

    const contractEarnings = formatContractEarnings(
      response.contractEarnings,
      contractAddresses,
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
    distributed: TokenBalances
    activeBalances?: TokenBalances
  }> {
    const chainId = this._chainId

    const response = await this._loadAccount(accountAddress, chainId)

    if (!response)
      throw new AccountNotFoundError('account', accountAddress, chainId)

    if (response.type !== 'split' && response.type !== 'user')
      throw new AccountNotFoundError('split & user', accountAddress, chainId)

    const withdrawn = formatAccountBalances(response.withdrawn)
    const distributed = formatAccountBalances(response.distributions)
    if (!includeActiveBalances) {
      return {
        withdrawn,
        distributed,
      }
    }

    const internalBalances = formatAccountBalances(response.balances)
    if (response.type === 'user') {
      // Only including split main balance for users
      return {
        withdrawn,
        distributed,
        activeBalances: internalBalances,
      }
    }

    // Need to fetch current balance. Handle alchemy/infura with logs, and all other rpc's with token list
    if (!this._publicClient)
      throw new MissingPublicClientError(
        'Public client required to get active balances. Please update your call to the client constructor with a valid public client, or set includeActiveBalances to false',
      )
    const tokenList = erc20TokenList ?? []

    let balances: TokenBalances
    if (
      erc20TokenList === undefined &&
      isAlchemyPublicClient(this._publicClient)
    ) {
      // If no token list passed in and we're using alchemy, fetch all balances with alchemy's custom api
      balances = await fetchContractBalancesWithAlchemy(
        accountAddress,
        this._publicClient,
      )
    } else {
      if (erc20TokenList === undefined) {
        // If no token list passed in, make sure the public client supports logs and then fetch all erc20 tokens
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
      const customTokens = Object.keys(distributed) ?? []
      const fullTokenList = Array.from(
        new Set(
          [ADDRESS_ZERO, ...tokenList]
            .concat(Object.keys(internalBalances))
            .concat(customTokens)
            .map((token) => getAddress(token)),
        ),
      )
      balances = await fetchActiveBalances(
        accountAddress,
        this._publicClient,
        fullTokenList,
      )
    }

    const allTokens = Array.from(
      new Set(Object.keys(balances).concat(Object.keys(internalBalances))),
    )
    const filteredBalances = allTokens.reduce((acc, token) => {
      const internalBalanceAmount = internalBalances[token] ?? BigInt(0)
      const contractBalanceAmount = balances[token] ?? BigInt(0)

      // SplitMain leaves a balance of 1 for gas efficiency in internal balances.
      // Splits leave a balance of 1 (for erc20) for gas efficiency
      const tokenBalance =
        (internalBalanceAmount > BigInt(1)
          ? internalBalanceAmount
          : BigInt(0)) +
        (contractBalanceAmount > BigInt(1) ? contractBalanceAmount : BigInt(0))
      if (tokenBalance > BigInt(0)) acc[token] = tokenBalance

      return acc
    }, {} as TokenBalances)

    return {
      withdrawn,
      distributed,
      activeBalances: filteredBalances,
    }
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

  async getContractEarnings({
    contractAddress,
    includeActiveBalances = true,
    erc20TokenList,
  }: {
    contractAddress: string
    includeActiveBalances?: boolean
    erc20TokenList?: string[]
  }): Promise<ContractEarnings> {
    validateAddress(contractAddress)
    if (includeActiveBalances && !this._publicClient)
      throw new MissingPublicClientError(
        'Public client required to get contract active balances. Please update your call to the SplitsClient constructor with a valid public client, or set includeActiveBalances to false',
      )

    const { distributed, activeBalances } = await this._getAccountBalances({
      accountAddress: getAddress(contractAddress),
      includeActiveBalances,
      erc20TokenList,
    })

    if (!includeActiveBalances) return { distributed }
    return { distributed, activeBalances }
  }

  async getFormattedContractEarnings({
    contractAddress,
    includeActiveBalances = true,
    erc20TokenList,
  }: {
    contractAddress: string
    includeActiveBalances?: boolean
    erc20TokenList?: string[]
  }): Promise<FormattedContractEarnings> {
    if (!this._publicClient)
      throw new MissingPublicClientError(
        'Public client required to get formatted earnings. Please update your call to the SplitsClient constructor with a valid public client',
      )
    const { distributed, activeBalances } = await this.getContractEarnings({
      contractAddress,
      includeActiveBalances,
      erc20TokenList,
    })

    const balancesToFormat = [distributed]
    if (activeBalances) balancesToFormat.push(activeBalances)

    const formattedBalances =
      await this._getFormattedTokenBalances(balancesToFormat)
    const returnData: {
      distributed: FormattedTokenBalances
      activeBalances?: FormattedTokenBalances
    } = {
      distributed: formattedBalances[0],
    }
    if (includeActiveBalances) {
      returnData.activeBalances = formattedBalances[1]
    }

    return returnData
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
