import { Interface, JsonFragment } from '@ethersproject/abi'
import { PublicClient, getContract, WalletClient } from 'viem'

import { getAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero, Zero, One } from '@ethersproject/constants'
import { Contract, ContractTransaction, Event } from '@ethersproject/contracts'
import { GraphQLClient, Variables } from 'graphql-request'

import { MULTICALL_3_ADDRESS, TransactionType } from '../constants'
import {
  AccountNotFoundError,
  InvalidArgumentError,
  InvalidConfigError,
  MissingProviderError,
  MissingSignerError,
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
  SplitsClientConfig,
  TokenBalances,
  TransactionConfig,
  TransactionFormat,
} from '../types'
import {
  fromBigNumberToTokenValue,
  getTokenData,
  getTransactionEvents,
  isLogsProvider,
} from '../utils'
import {
  fetchActiveBalances,
  fetchERC20TransferredTokens,
} from '../utils/balances'
import {
  abiEncode,
  ContractCallData,
  multicallInterface,
  multicallAbi,
} from '../utils/multicall'

const MISSING_SIGNER = ''

class BaseClient {
  readonly _chainId: number
  protected readonly _ensProvider: PublicClient | undefined
  // TODO: something better we can do here to handle typescript check for missing signer?
  // Viem should do type checking better here, they invested a lot of time in TS from my understanding
  readonly _signer: WalletClient | string
  readonly _provider: PublicClient | undefined
  private readonly _graphqlClient: GraphQLClient | undefined
  protected readonly _includeEnsNames: boolean

  constructor({
    chainId,
    publicClient,
    ensProvider,
    account,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    if (includeEnsNames && !publicClient && !ensProvider)
      throw new InvalidConfigError(
        'Must include a mainnet provider if includeEnsNames is set to true',
      )

    this._ensProvider = ensProvider ?? publicClient
    this._provider = publicClient
    this._chainId = chainId
    this._signer = account ?? MISSING_SIGNER
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
    const result = await this._graphqlClient.request(query, variables)
    return result
  }

  protected _requireProvider() {
    if (!this._provider)
      throw new MissingProviderError(
        'Provider required to perform this action, please update your call to the constructor',
      )
  }

  protected _requireSigner() {
    this._requireProvider()
    if (!this._signer)
      throw new MissingSignerError(
        'Signer required to perform this action, please update your call to the constructor',
      )
  }

  protected async _getUserBalancesByContract({
    userId,
    contractIds,
  }: {
    userId: string
    contractIds?: string[]
  }): Promise<{
    contractEarnings: EarningsByContract
  }> {
    const chainId = this._chainId

    const gqlQuery =
      contractIds === undefined
        ? USER_BALANCES_BY_CONTRACT_QUERY
        : USER_BALANCES_BY_CONTRACT_FILTERED_QUERY
    const gqlArgs =
      contractIds === undefined
        ? { userId: userId.toLowerCase() }
        : {
            userId: userId.toLowerCase(),
            contractIds: contractIds.map((contractId) =>
              contractId.toLowerCase(),
            ),
          }

    const response = await this._makeGqlRequest<{
      userBalancesByContract: {
        contractEarnings: GqlContractEarnings[]
      }
    }>(gqlQuery, gqlArgs)

    if (!response.userBalancesByContract)
      throw new AccountNotFoundError(
        `No user found at address ${userId} on chain ${chainId}, please confirm you have entered the correct address. There may just be a delay in subgraph indexing.`,
      )

    const contractEarnings = formatContractEarnings(
      response.userBalancesByContract.contractEarnings,
    )

    return {
      contractEarnings,
    }
  }

  protected async _getAccountBalances({
    accountId,
    includeActiveBalances,
    erc20TokenList,
  }: {
    accountId: string
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
      accountId: accountId.toLowerCase(),
    })

    if (!response.accountBalances)
      throw new AccountNotFoundError(
        `No account found at address ${accountId} on chain ${chainId}, please confirm you have entered the correct address. There may just be a delay in subgraph indexing.`,
      )

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

    // Need to fetch current balance. Handle alchemy/infura with logs, and all other providers with token list
    if (!this._provider)
      throw new MissingProviderError(
        'Provider required to get active balances. Please update your call to the client constructor with a valid provider, or set includeActiveBalances to false',
      )
    const tokenList = erc20TokenList ?? []
    if (erc20TokenList === undefined) {
      if (!isLogsProvider(this._provider))
        throw new InvalidArgumentError(
          'Token list required if provider is not alchemy or infura',
        )
      const transferredErc20Tokens = await fetchERC20TransferredTokens(
        this._chainId,
        this._provider,
        accountId,
      )
      tokenList.push(...transferredErc20Tokens)
    }

    // Include already distributed tokens in list for balances
    const customTokens = Object.keys(withdrawn) ?? []
    const fullTokenList = Array.from(
      new Set(
        [AddressZero, ...tokenList]
          .concat(Object.keys(internalBalances ?? {}))
          .concat(customTokens)
          .map((token) => getAddress(token)),
      ),
    )
    const balances = await fetchActiveBalances(
      accountId,
      this._provider,
      fullTokenList,
    )
    const filteredBalances = Object.keys(balances).reduce((acc, token) => {
      const tokenBalance = balances[token].add(internalBalances[token] ?? Zero)

      if (tokenBalance.gt(One)) acc[token] = tokenBalance
      return acc
    }, {} as TokenBalances)

    return { withdrawn, activeBalances: filteredBalances }
  }

  protected async _getFormattedTokenBalances(
    tokenBalancesList: TokenBalances[],
  ): Promise<FormattedTokenBalances[]> {
    const localProvider = this._provider
    if (!localProvider)
      throw new Error('Provider required to fetch token contract data')
    const tokenData: { [token: string]: { symbol: string; decimals: number } } =
      {}

    const formattedTokenBalancesList = await Promise.all(
      tokenBalancesList.map(async (tokenBalances) => {
        const formattedTokenBalances = await Object.keys(tokenBalances).reduce(
          async (acc, token) => {
            const awaitedAcc = await acc

            const rawAmount = tokenBalances[token]
            if (!tokenData[token]) {
              tokenData[token] = await getTokenData(
                this._chainId,
                token,
                localProvider,
              )
            }

            awaitedAcc[token] = {
              ...tokenData[token],
              rawAmount,
              formattedAmount: fromBigNumberToTokenValue(
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
  protected readonly _shouldRequireSigner: boolean
  private readonly _multicallContract: Contract | Contract['estimateGas']

  constructor({
    transactionType,
    chainId,
    publicClient,
    ensProvider,
    account,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      chainId,
      publicClient,
      ensProvider,
      account,
      includeEnsNames,
    })

    this._transactionType = transactionType
    this._shouldRequireSigner = [
      TransactionType.Transaction,
      TransactionType.CallData,
    ].includes(transactionType)

    this._multicallContract = this._getTransactionContract<
      Contract,
      Contract['estimateGas']
    >(MULTICALL_3_ADDRESS, multicallAbi, multicallInterface)
  }

  protected _getTransactionContract<
    T extends Contract,
    K extends Contract['estimateGas'],
  >(
    contractAddress: string,
    contractAbi: JsonFragment[],
    contractInterface: Interface,
  ) {
    if (this._transactionType === TransactionType.CallData)
      return new ContractCallData(contractAddress, contractAbi)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - why is this the case??
    const contract = getContract({
      address: contractAddress,
      abi: contractInterface,
      walletClient: this._signer || this._provider,
    })
    if (this._transactionType === TransactionType.GasEstimate)
      return contract.estimateGas as K

    return contract
  }

  protected _isContractTransaction(
    tx: TransactionFormat,
  ): tx is ContractTransaction {
    if (tx instanceof BigNumber) return false
    if ('wait' in tx) return true
    return false
  }

  protected _isBigNumber(
    gasEstimate: TransactionFormat,
  ): gasEstimate is BigNumber {
    return gasEstimate instanceof BigNumber
  }

  protected _isCallData(callData: TransactionFormat): callData is CallData {
    if (callData instanceof BigNumber) return false
    if ('wait' in callData) return false
    return true
  }

  async _multicallTransaction({
    calls,
  }: {
    calls: CallData[]
  }): Promise<ContractTransaction | BigNumber> {
    this._requireSigner()
    if (!this._signer) throw new Error()

    const callRequests = calls.map((call) => {
      const callData = abiEncode(call.name, call.inputs, call.params)
      return {
        target: call.contract.address,
        callData,
      }
    })

    const result = await this._multicallContract.aggregate(callRequests)
    return result
  }
}

export class BaseClientMixin extends BaseTransactions {
  async submitMulticallTransaction({ calls }: { calls: CallData[] }): Promise<{
    tx: ContractTransaction
  }> {
    const multicallResult = await this._multicallTransaction({ calls })
    if (!this._isContractTransaction(multicallResult))
      throw new Error('Invalid response')

    return { tx: multicallResult }
  }

  async multicall({
    calls,
  }: {
    calls: CallData[]
  }): Promise<{ events: Event[] }> {
    const { tx: multicallTx } = await this.submitMulticallTransaction({
      calls,
    })
    const events = await getTransactionEvents(multicallTx, [], true)
    return { events }
  }
}

export class BaseGasEstimatesMixin extends BaseTransactions {
  async multicall({ calls }: { calls: CallData[] }): Promise<BigNumber> {
    const gasEstimate = await this._multicallTransaction({
      calls,
    })
    if (!this._isBigNumber(gasEstimate)) throw new Error('Invalid response')

    return gasEstimate
  }
}
