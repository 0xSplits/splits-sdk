import { Client } from '@urql/core'
import { DocumentNode } from 'graphql'
import {
  Address,
  Chain,
  PublicClient,
  Transport,
  getAddress,
  zeroAddress,
} from 'viem'
import {
  ContractEarnings,
  DataClientConfig,
  EarningsByContract,
  FormattedContractEarnings,
  FormattedEarningsByContract,
  FormattedSplitEarnings,
  FormattedTokenBalances,
  FormattedUserEarningsByContract,
  LiquidSplit,
  Split,
  SplitEarnings,
  SplitsContract,
  Swapper,
  TokenBalances,
  UserEarningsByContract,
  VestingModule,
  WaterfallModule,
} from '../types'
import {
  AccountNotFoundError,
  InvalidArgumentError,
  InvalidConfigError,
  MissingPublicClientError,
  UnsupportedSubgraphChainIdError,
} from '../errors'
import {
  ACCOUNT_QUERY,
  FULL_ACCOUNT_QUERY,
  GqlVariables,
  formatFullGqlAccount,
  formatGqlAccount,
  getGraphqlClient,
} from '../subgraph'
import {
  GqlAccount,
  GqlLiquidSplit,
  GqlPassThroughWallet,
  GqlSplit,
  GqlSwapper,
  GqlVestingModule,
  GqlWaterfallModule,
  IAccountType,
  ILiquidSplit,
  ISplit,
  ISubgraphAccount,
  ISwapper,
  IVestingModule,
  IWaterfallModule,
} from '../subgraph/types'
import { MAX_RELATED_ACCOUNTS } from '../subgraph/constants'
import { formatGqlSplit, protectedFormatSplit } from '../subgraph/split'
import {
  formatGqlWaterfallModule,
  protectedFormatWaterfallModule,
} from '../subgraph/waterfall'
import {
  formatGqlVestingModule,
  protectedFormatVestingModule,
} from '../subgraph/vesting'
import { formatGqlSwapper, protectedFormatSwapper } from '../subgraph/swapper'
import { formatGqlPassThroughWallet } from '../subgraph/pass-through-wallet'
import {
  formatGqlLiquidSplit,
  protectedFormatLiquidSplit,
} from '../subgraph/liquid'
import { formatAccountBalances, formatContractEarnings } from '../subgraph/user'
import {
  addEnsNames,
  fetchActiveBalances,
  fetchContractBalancesWithAlchemy,
  fetchERC20TransferredTokens,
  fromBigIntToTokenValue,
  getTokenData,
  isAlchemyPublicClient,
  isLogsPublicClient,
  validateAddress,
} from '../utils'
import { mergeWith } from 'lodash'
import { ZERO } from '../constants'

export class DataClient {
  readonly _ensPublicClient: PublicClient<Transport, Chain> | undefined
  readonly _publicClient: PublicClient<Transport, Chain> | undefined
  private readonly _graphqlClient: Client | undefined
  readonly _includeEnsNames: boolean

  constructor({
    publicClient,
    ensPublicClient,
    apiConfig,
    includeEnsNames = false,
  }: DataClientConfig) {
    if (includeEnsNames && !publicClient && !ensPublicClient)
      throw new InvalidConfigError(
        'Must include a mainnet public client if includeEnsNames is set to true',
      )

    this._ensPublicClient = ensPublicClient ?? publicClient
    this._publicClient = publicClient
    this._includeEnsNames = includeEnsNames

    this._graphqlClient = getGraphqlClient(apiConfig)
  }

  protected _requirePublicClient() {
    if (!this._publicClient)
      throw new MissingPublicClientError(
        'Public client required to perform this action, please update your call to the constructor',
      )
  }

  protected async _makeGqlRequest<ResponseType>(
    query: DocumentNode,
    variables?: GqlVariables,
  ): Promise<ResponseType> {
    if (!this._graphqlClient) {
      throw new UnsupportedSubgraphChainIdError()
    }

    const response = await this._graphqlClient
      .query(query, variables)
      .toPromise()
    if (response.error) {
      throw response.error
    }

    return response.data
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
    chainId,
    userAddress,
    contractAddresses,
  }: {
    chainId: number
    userAddress: string
    contractAddresses?: string[]
  }): Promise<{
    contractEarnings: EarningsByContract
  }> {
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
    chainId,
    accountAddress,
    includeActiveBalances,
    erc20TokenList,
  }: {
    chainId: number
    accountAddress: Address
    includeActiveBalances: boolean
    erc20TokenList?: string[]
  }): Promise<{
    withdrawn: TokenBalances
    distributed: TokenBalances
    activeBalances?: TokenBalances
  }> {
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
    const warehouseBalances = formatAccountBalances(response.warehouseBalances)
    if (response.type === 'user') {
      // Only including split main balance for users
      return {
        withdrawn,
        distributed,
        activeBalances: mergeWith(
          {},
          internalBalances,
          warehouseBalances,
          (a: bigint, b: bigint) => {
            return (a || ZERO) + (b || ZERO)
          },
        ),
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
          chainId,
          this._publicClient,
          accountAddress,
        )
        tokenList.push(...transferredErc20Tokens)
      }

      // Include already distributed tokens in list for balances
      const customTokens = Object.keys(distributed) ?? []
      const fullTokenList = Array.from(
        new Set(
          [zeroAddress, ...tokenList]
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
    chainId: number,
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
                chainId,
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
    chainId,
    contractAddress,
    includeActiveBalances = true,
    erc20TokenList,
  }: {
    chainId: number
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
      chainId,
      accountAddress: getAddress(contractAddress),
      includeActiveBalances,
      erc20TokenList,
    })

    if (!includeActiveBalances) return { distributed }
    return { distributed, activeBalances }
  }

  async getFormattedContractEarnings({
    chainId,
    contractAddress,
    includeActiveBalances = true,
    erc20TokenList,
  }: {
    chainId: number
    contractAddress: string
    includeActiveBalances?: boolean
    erc20TokenList?: string[]
  }): Promise<FormattedContractEarnings> {
    if (!this._publicClient)
      throw new MissingPublicClientError(
        'Public client required to get formatted earnings. Please update your call to the SplitsClient constructor with a valid public client',
      )
    const { distributed, activeBalances } = await this.getContractEarnings({
      chainId,
      contractAddress,
      includeActiveBalances,
      erc20TokenList,
    })

    const balancesToFormat = [distributed]
    if (activeBalances) balancesToFormat.push(activeBalances)

    const formattedBalances = await this._getFormattedTokenBalances(
      chainId,
      balancesToFormat,
    )
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

  async getSplitMetadata({
    chainId,
    splitAddress,
  }: {
    chainId: number
    splitAddress: string
  }): Promise<Split> {
    validateAddress(splitAddress)

    const response = await this._loadAccount(splitAddress, chainId)

    if (!response || (response.type !== 'split' && response.type !== 'splitV2'))
      throw new AccountNotFoundError('split', splitAddress, chainId)

    return await this.formatSplit(response)
  }

  async getAccountMetadata({
    chainId,
    accountAddress,
  }: {
    chainId: number
    accountAddress: string
  }): Promise<SplitsContract | undefined> {
    validateAddress(accountAddress)
    this._requirePublicClient()

    const response = await this._loadAccount(accountAddress, chainId)

    if (!response)
      throw new AccountNotFoundError('account', accountAddress, chainId)

    return await this._formatAccount(chainId, response)
  }

  // Graphql read actions
  async getRelatedSplits({
    chainId,
    address,
  }: {
    chainId: number
    address: string
  }): Promise<{
    receivingFrom: Split[]
    controlling: Split[]
    pendingControl: Split[]
  }> {
    validateAddress(address)

    const response = await this._loadFullAccount(address, chainId)

    const [receivingFrom, controlling, pendingControl] = await Promise.all([
      Promise.all(
        response.upstreamSplits
          ? response.upstreamSplits.map(async (recipient) =>
              this.formatSplit(recipient),
            )
          : [],
      ),
      Promise.all(
        response.controllingSplits
          ? response.controllingSplits.map(async (recipient) =>
              this.formatSplit(recipient),
            )
          : [],
      ),
      Promise.all(
        response.pendingControlSplits
          ? response.pendingControlSplits.map(async (recipient) =>
              this.formatSplit(recipient),
            )
          : [],
      ),
    ])

    return {
      receivingFrom,
      controlling,
      pendingControl,
    }
  }

  async getSplitEarnings({
    chainId,
    splitAddress,
    includeActiveBalances = true,
    erc20TokenList,
  }: {
    chainId: number
    splitAddress: string
    includeActiveBalances?: boolean
    erc20TokenList?: string[]
  }): Promise<SplitEarnings> {
    validateAddress(splitAddress)
    if (includeActiveBalances && !this._publicClient)
      this._requirePublicClient()

    const { withdrawn, activeBalances } = await this._getAccountBalances({
      chainId,
      accountAddress: getAddress(splitAddress),
      includeActiveBalances,
      erc20TokenList,
    })

    if (!includeActiveBalances) return { distributed: withdrawn }
    return { distributed: withdrawn, activeBalances }
  }

  async getFormattedSplitEarnings({
    chainId,
    splitAddress,
    includeActiveBalances = true,
    erc20TokenList,
  }: {
    chainId: number
    splitAddress: string
    includeActiveBalances?: boolean
    erc20TokenList?: string[]
  }): Promise<FormattedSplitEarnings> {
    this._requirePublicClient()
    const { distributed, activeBalances } = await this.getSplitEarnings({
      chainId,
      splitAddress,
      includeActiveBalances,
      erc20TokenList,
    })

    const balancesToFormat = [distributed]
    if (activeBalances) balancesToFormat.push(activeBalances)

    const formattedBalances = await this._getFormattedTokenBalances(
      chainId,
      balancesToFormat,
    )
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

  async getUserEarnings({
    chainId,
    userAddress,
  }: {
    chainId: number
    userAddress: string
  }): Promise<{
    withdrawn: TokenBalances
    activeBalances: TokenBalances
  }> {
    validateAddress(userAddress)

    const { withdrawn, activeBalances } = await this._getAccountBalances({
      chainId,
      accountAddress: getAddress(userAddress),
      includeActiveBalances: true,
    })
    if (!activeBalances) throw new Error('Missing active balances')

    return { withdrawn, activeBalances }
  }

  async getFormattedUserEarnings({
    chainId,
    userAddress,
  }: {
    chainId: number
    userAddress: string
  }): Promise<{
    withdrawn: FormattedTokenBalances
    activeBalances: FormattedTokenBalances
  }> {
    this._requirePublicClient()

    const { withdrawn, activeBalances } = await this.getUserEarnings({
      chainId,
      userAddress,
    })
    const balancesToFormat = [withdrawn, activeBalances]
    const formattedBalances = await this._getFormattedTokenBalances(
      chainId,
      balancesToFormat,
    )

    return {
      withdrawn: formattedBalances[0],
      activeBalances: formattedBalances[1],
    }
  }

  async getUserEarningsByContract({
    chainId,
    userAddress,
    contractAddresses,
  }: {
    chainId: number
    userAddress: string
    contractAddresses?: string[]
  }): Promise<UserEarningsByContract> {
    validateAddress(userAddress)
    if (contractAddresses) {
      contractAddresses.map((contractAddress) =>
        validateAddress(contractAddress),
      )
    }

    const { contractEarnings } = await this._getUserBalancesByContract({
      chainId,
      userAddress,
      contractAddresses,
    })
    const [withdrawn, activeBalances] = Object.values(contractEarnings).reduce(
      (
        acc,
        {
          withdrawn: contractWithdrawn,
          activeBalances: contractActiveBalances,
        },
      ) => {
        Object.keys(contractWithdrawn).map((tokenId) => {
          acc[0][tokenId] =
            (acc[0][tokenId] ?? BigInt(0)) + contractWithdrawn[tokenId]
        })
        Object.keys(contractActiveBalances).map((tokenId) => {
          acc[1][tokenId] =
            (acc[1][tokenId] ?? BigInt(0)) + contractActiveBalances[tokenId]
        })

        return acc
      },
      [{} as TokenBalances, {} as TokenBalances],
    )

    return {
      withdrawn,
      activeBalances,
      earningsByContract: contractEarnings,
    }
  }

  async getFormattedUserEarningsByContract({
    chainId,
    userAddress,
    contractAddresses,
  }: {
    chainId: number
    userAddress: string
    contractAddresses?: string[]
  }): Promise<FormattedUserEarningsByContract> {
    this._requirePublicClient()

    const { withdrawn, activeBalances, earningsByContract } =
      await this.getUserEarningsByContract({
        chainId,
        userAddress,
        contractAddresses,
      })
    const balancesToFormat = [withdrawn, activeBalances]
    Object.keys(earningsByContract).map((contractAddress) => {
      balancesToFormat.push(earningsByContract[contractAddress].withdrawn)
      balancesToFormat.push(earningsByContract[contractAddress].activeBalances)
    })
    const formattedBalances = await this._getFormattedTokenBalances(
      chainId,
      balancesToFormat,
    )
    const formattedContractEarnings = Object.keys(earningsByContract).reduce(
      (acc, contractAddress, index) => {
        const contractWithdrawn = formattedBalances[index * 2 + 2]
        const contractActiveBalances = formattedBalances[index * 2 + 3]
        acc[contractAddress] = {
          withdrawn: contractWithdrawn,
          activeBalances: contractActiveBalances,
        }
        return acc
      },
      {} as FormattedEarningsByContract,
    )

    return {
      withdrawn: formattedBalances[0],
      activeBalances: formattedBalances[1],
      earningsByContract: formattedContractEarnings,
    }
  }

  async getLiquidSplitMetadata({
    chainId,
    liquidSplitAddress,
  }: {
    chainId: number
    liquidSplitAddress: string
  }): Promise<LiquidSplit> {
    validateAddress(liquidSplitAddress)

    const response = await this._loadAccount(liquidSplitAddress, chainId)

    if (!response || response.type !== 'liquidSplit')
      throw new AccountNotFoundError(
        'liquid split',
        liquidSplitAddress,
        chainId,
      )

    return await this.formatLiquidSplit(response)
  }

  async getSwapperMetadata({
    chainId,
    swapperAddress,
  }: {
    chainId: number
    swapperAddress: string
  }): Promise<Swapper> {
    validateAddress(swapperAddress)

    const response = await this._loadAccount(swapperAddress, chainId)

    if (!response || response.type !== 'swapper')
      throw new AccountNotFoundError('swapper', swapperAddress, chainId)

    return await this.formatSwapper(response)
  }

  async getVestingMetadata({
    chainId,
    vestingModuleAddress,
  }: {
    chainId: number
    vestingModuleAddress: string
  }): Promise<VestingModule> {
    validateAddress(vestingModuleAddress)

    const response = await this._loadAccount(vestingModuleAddress, chainId)

    if (!response || response.type !== 'vesting')
      throw new AccountNotFoundError(
        'vesting module',
        vestingModuleAddress,
        chainId,
      )

    return await this.formatVestingModule(chainId, response)
  }

  async getWaterfallMetadata({
    chainId,
    waterfallModuleAddress,
  }: {
    chainId: number
    waterfallModuleAddress: string
  }): Promise<WaterfallModule> {
    validateAddress(waterfallModuleAddress)

    const response = await this._loadAccount(waterfallModuleAddress, chainId)

    if (!response || response.type != 'waterfall')
      throw new AccountNotFoundError(
        'waterfall module',
        waterfallModuleAddress,
        chainId,
      )

    return await this.formatWaterfallModule(chainId, response)
  }

  // Helper functions
  private async _formatAccount(
    chainId: number,
    gqlAccount: IAccountType,
  ): Promise<SplitsContract | undefined> {
    if (!gqlAccount) return

    if (gqlAccount.type === 'split') return await this.formatSplit(gqlAccount)
    else if (gqlAccount.type === 'waterfall')
      return await this.formatWaterfallModule(chainId, gqlAccount)
    else if (gqlAccount.type === 'liquidSplit')
      return await this.formatLiquidSplit(gqlAccount)
    else if (gqlAccount.type === 'swapper')
      return await this.formatSwapper(gqlAccount)
  }

  private async formatWaterfallModule(
    chainId: number,
    gqlWaterfallModule: IWaterfallModule,
  ): Promise<WaterfallModule> {
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    const tokenData = await getTokenData(
      chainId,
      getAddress(gqlWaterfallModule.token),
      this._publicClient,
    )

    const waterfallModule = protectedFormatWaterfallModule(
      gqlWaterfallModule,
      tokenData.symbol,
      tokenData.decimals,
    )
    if (this._includeEnsNames) {
      const ensRecipients = waterfallModule.tranches
        .map((tranche) => {
          return tranche.recipient
        })
        .concat(
          waterfallModule.nonWaterfallRecipient
            ? [waterfallModule.nonWaterfallRecipient]
            : [],
        )
      await addEnsNames(
        this._ensPublicClient ?? this._publicClient,
        ensRecipients,
      )
    }

    return waterfallModule
  }

  private async formatVestingModule(
    chainId: number,
    gqlVestingModule: IVestingModule,
  ): Promise<VestingModule> {
    this._requirePublicClient()
    const publicClient = this._publicClient
    if (!publicClient) throw new Error()

    const tokenIds = Array.from(
      new Set(gqlVestingModule.streams?.map((stream) => stream.token) ?? []),
    )

    const tokenData: { [token: string]: { symbol: string; decimals: number } } =
      {}
    await Promise.all(
      tokenIds.map(async (token) => {
        const result = await getTokenData(
          chainId,
          getAddress(token),
          publicClient,
        )

        tokenData[token] = result
      }),
    )

    const vestingModule = protectedFormatVestingModule(
      gqlVestingModule,
      tokenData,
    )
    if (this._includeEnsNames) {
      await addEnsNames(this._ensPublicClient ?? publicClient, [
        vestingModule.beneficiary,
      ])
    }

    return vestingModule
  }

  private async formatSwapper(gqlSwapper: ISwapper): Promise<Swapper> {
    const swapper = protectedFormatSwapper(gqlSwapper)
    if (this._includeEnsNames) {
      if (!this._ensPublicClient) throw new Error()

      const ensRecipients = [swapper.beneficiary].concat(
        swapper.owner ? [swapper.owner] : [],
      )
      await addEnsNames(this._ensPublicClient, ensRecipients)
    }

    return swapper
  }

  private async formatLiquidSplit(
    gqlLiquidSplit: ILiquidSplit,
  ): Promise<LiquidSplit> {
    this._requirePublicClient()

    const liquidSplit = protectedFormatLiquidSplit(gqlLiquidSplit)
    if (this._includeEnsNames) {
      await addEnsNames(
        this._ensPublicClient!,
        liquidSplit.holders.map((holder) => {
          return holder.recipient
        }),
      )
    }

    return liquidSplit
  }

  private async formatSplit(gqlSplit: ISplit): Promise<Split> {
    const split = protectedFormatSplit(gqlSplit)

    if (this._includeEnsNames) {
      if (!this._ensPublicClient) throw new Error()
      const ensRecipients = split.recipients
        .map((recipient) => {
          return recipient.recipient
        })
        .concat(split.controller ? [split.controller] : [])
        .concat(
          split.newPotentialController ? [split.newPotentialController] : [],
        )

      await addEnsNames(this._ensPublicClient, ensRecipients)
    }

    return split
  }
}
