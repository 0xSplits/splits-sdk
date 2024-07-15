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
  DataClientConfig,
  FormattedContractEarnings,
  FormattedEarningsByContract,
  FormattedSplitEarnings,
  FormattedTokenBalances,
  FormattedUserEarningsByContract,
  LiquidSplit,
  Split,
  SplitsContract,
  Swapper,
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
  mergeFormattedTokenBalances,
  validateAddress,
} from '../utils'

export class DataClient {
  readonly _ensPublicClient: PublicClient<Transport, Chain> | undefined
  readonly _publicClient: PublicClient<Transport, Chain> | undefined // DEPRECATED
  readonly _publicClients:
    | {
        [chainId: number]: PublicClient<Transport, Chain>
      }
    | undefined
  private readonly _graphqlClient: Client | undefined
  readonly _includeEnsNames: boolean

  constructor({
    publicClient,
    publicClients,
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
    this._publicClients = publicClients
    this._includeEnsNames = includeEnsNames

    this._graphqlClient = getGraphqlClient(apiConfig)
  }

  protected _requirePublicClient(chainId: number) {
    this._getPublicClient(chainId)
  }

  protected _getPublicClient(chainId: number): PublicClient<Transport, Chain> {
    if (this._publicClients && this._publicClients[chainId]) {
      return this._publicClients[chainId]
    }

    if (!this._publicClient)
      throw new MissingPublicClientError(
        `Public client required on chain ${chainId} to perform this action, please update your call to the constructor`,
      )

    return this._publicClient
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
    contractEarnings: FormattedEarningsByContract
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
    withdrawn: FormattedTokenBalances
    distributed: FormattedTokenBalances
    activeBalances?: FormattedTokenBalances
  }> {
    const functionPublicClient = this._getPublicClient(chainId)

    const response = await this._loadAccount(accountAddress, chainId)

    if (!response)
      throw new AccountNotFoundError('account', accountAddress, chainId)

    const withdrawn =
      response.type === 'user' ? formatAccountBalances(response.withdrawn) : {}
    const distributed = formatAccountBalances(response.distributions)
    if (!includeActiveBalances) {
      return {
        withdrawn,
        distributed,
      }
    }

    const splitmainBalances = formatAccountBalances(response.splitmainBalances)
    const warehouseBalances = formatAccountBalances(response.warehouseBalances)
    if (response.type === 'user') {
      return {
        withdrawn,
        distributed,
        activeBalances: mergeFormattedTokenBalances([
          splitmainBalances,
          warehouseBalances,
        ]),
      }
    }

    // Need to fetch current balance. Handle alchemy/infura with logs, and all other rpc's with token list
    if (!functionPublicClient)
      throw new MissingPublicClientError(
        'Public client required to get active balances. Please update your call to the client constructor, or set includeActiveBalances to false',
      )
    if (functionPublicClient.chain.id !== chainId) {
      throw new InvalidArgumentError(
        `Public client is set to chain id ${functionPublicClient.chain.id}, but active balances are being fetched on chain ${chainId}. Active balances can only be fetched on the same chain as the public client.`,
      )
    }
    const tokenList = erc20TokenList ?? []

    let balances: FormattedTokenBalances
    if (
      erc20TokenList === undefined &&
      isAlchemyPublicClient(functionPublicClient)
    ) {
      // If no token list passed in and we're using alchemy, fetch all balances with alchemy's custom api
      balances = await fetchContractBalancesWithAlchemy(
        chainId,
        accountAddress,
        functionPublicClient,
      )
    } else {
      if (erc20TokenList === undefined) {
        // If no token list passed in, make sure the public client supports logs and then fetch all erc20 tokens
        if (!isLogsPublicClient(functionPublicClient))
          throw new InvalidArgumentError(
            'Token list required if public client is not alchemy or infura',
          )
        const transferredErc20Tokens = await fetchERC20TransferredTokens(
          chainId,
          functionPublicClient,
          accountAddress,
        )
        tokenList.push(...transferredErc20Tokens)
      }

      // Include already distributed tokens in list for balances
      const customTokens = Object.keys(distributed) ?? []
      const fullTokenList = Array.from(
        new Set(
          [zeroAddress, ...tokenList]
            .concat(Object.keys(splitmainBalances))
            .concat(Object.keys(warehouseBalances))
            .concat(customTokens)
            .map((token) => getAddress(token)),
        ),
      )
      balances = await fetchActiveBalances(
        chainId,
        accountAddress,
        functionPublicClient,
        fullTokenList,
      )
    }

    const allTokens = Array.from(
      new Set(
        Object.keys(balances)
          .concat(Object.keys(splitmainBalances))
          .concat(Object.keys(warehouseBalances)),
      ),
    )
    const filteredBalances = allTokens.reduce((acc, token) => {
      const splitmainBalanceAmount =
        splitmainBalances[token]?.rawAmount ?? BigInt(0)
      const warehouseBalanceAmount =
        warehouseBalances[token]?.rawAmount ?? BigInt(0)
      const contractBalanceAmount = balances[token]?.rawAmount ?? BigInt(0)

      // SplitMain leaves a balance of 1 for gas efficiency in internal balances.
      // Splits leave a balance of 1 (for erc20) for gas efficiency
      const tokenBalance =
        (splitmainBalanceAmount > BigInt(1)
          ? splitmainBalanceAmount
          : BigInt(0)) +
        (warehouseBalanceAmount > BigInt(1)
          ? warehouseBalanceAmount
          : BigInt(0)) +
        (contractBalanceAmount > BigInt(1) ? contractBalanceAmount : BigInt(0))

      const symbol =
        splitmainBalances[token]?.symbol ??
        warehouseBalances[token]?.symbol ??
        balances[token]?.symbol
      const decimals =
        splitmainBalances[token]?.decimals ??
        warehouseBalances[token]?.decimals ??
        balances[token]?.decimals

      const formattedAmount = fromBigIntToTokenValue(tokenBalance, decimals)
      if (tokenBalance > BigInt(0))
        acc[token] = {
          rawAmount: tokenBalance,
          formattedAmount,
          symbol,
          decimals,
        }

      return acc
    }, {} as FormattedTokenBalances)

    return {
      withdrawn,
      distributed,
      activeBalances: filteredBalances,
    }
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
  }): Promise<FormattedContractEarnings> {
    validateAddress(contractAddress)
    if (includeActiveBalances) this._requirePublicClient(chainId)

    const { distributed, activeBalances } = await this._getAccountBalances({
      chainId,
      accountAddress: getAddress(contractAddress),
      includeActiveBalances,
      erc20TokenList,
    })

    if (!includeActiveBalances) return { distributed }
    return { distributed, activeBalances }
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
    this._requirePublicClient(chainId)

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
  }): Promise<FormattedSplitEarnings> {
    validateAddress(splitAddress)
    if (includeActiveBalances) this._requirePublicClient(chainId)

    const { distributed, activeBalances } = await this._getAccountBalances({
      chainId,
      accountAddress: getAddress(splitAddress),
      includeActiveBalances,
      erc20TokenList,
    })

    if (!includeActiveBalances) return { distributed }
    return { distributed, activeBalances }
  }

  async getUserEarnings({
    chainId,
    userAddress,
  }: {
    chainId: number
    userAddress: string
  }): Promise<{
    withdrawn: FormattedTokenBalances
    activeBalances: FormattedTokenBalances
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

  async getUserEarningsByContract({
    chainId,
    userAddress,
    contractAddresses,
  }: {
    chainId: number
    userAddress: string
    contractAddresses?: string[]
  }): Promise<FormattedUserEarningsByContract> {
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
          if (!acc[0][tokenId])
            acc[0][tokenId] = {
              symbol: contractWithdrawn[tokenId].symbol,
              decimals: contractWithdrawn[tokenId].decimals,
              rawAmount: BigInt(0),
              formattedAmount: '0',
            }

          const rawAmount =
            acc[0][tokenId].rawAmount + contractWithdrawn[tokenId].rawAmount
          const formattedAmount = fromBigIntToTokenValue(
            rawAmount,
            contractWithdrawn[tokenId].decimals,
          )
          acc[0][tokenId].rawAmount = rawAmount
          acc[0][tokenId].formattedAmount = formattedAmount
        })
        Object.keys(contractActiveBalances).map((tokenId) => {
          if (!acc[1][tokenId])
            acc[1][tokenId] = {
              symbol: contractActiveBalances[tokenId].symbol,
              decimals: contractActiveBalances[tokenId].decimals,
              rawAmount: BigInt(0),
              formattedAmount: '0',
            }

          const rawAmount =
            acc[1][tokenId].rawAmount +
            contractActiveBalances[tokenId].rawAmount
          const formattedAmount = fromBigIntToTokenValue(
            rawAmount,
            contractActiveBalances[tokenId].decimals,
          )
          acc[1][tokenId].rawAmount = rawAmount
          acc[1][tokenId].formattedAmount = formattedAmount
        })

        return acc
      },
      [{} as FormattedTokenBalances, {} as FormattedTokenBalances],
    )

    return {
      withdrawn,
      activeBalances,
      earningsByContract: contractEarnings,
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

    return await this.formatLiquidSplit(chainId, response)
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
      return await this.formatLiquidSplit(chainId, gqlAccount)
    else if (gqlAccount.type === 'swapper')
      return await this.formatSwapper(gqlAccount)
  }

  private async formatWaterfallModule(
    chainId: number,
    gqlWaterfallModule: IWaterfallModule,
  ): Promise<WaterfallModule> {
    this._requirePublicClient(chainId)
    const publicClient = this._getPublicClient(chainId)

    const tokenData = await getTokenData(
      chainId,
      getAddress(gqlWaterfallModule.token),
      publicClient,
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
      await addEnsNames(this._ensPublicClient ?? publicClient, ensRecipients)
    }

    return waterfallModule
  }

  private async formatVestingModule(
    chainId: number,
    gqlVestingModule: IVestingModule,
  ): Promise<VestingModule> {
    this._requirePublicClient(chainId)
    const publicClient = this._getPublicClient(chainId)

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
    chainId: number,
    gqlLiquidSplit: ILiquidSplit,
  ): Promise<LiquidSplit> {
    this._requirePublicClient(chainId)

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
