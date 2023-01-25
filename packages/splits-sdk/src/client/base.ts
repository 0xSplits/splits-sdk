import { Interface, JsonFragment } from '@ethersproject/abi'
import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
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
  formatAccountBalances,
  getGraphqlClient,
} from '../subgraph'
import { GqlAccountBalances } from '../subgraph/types'
import type {
  CallData,
  SplitsClientConfig,
  TokenBalances,
  TransactionConfig,
  TransactionFormat,
} from '../types'
import { getTransactionEvents, isLogsProvider } from '../utils'
import {
  fetchActiveBalances,
  fetchERC20TransferredTokens,
} from '../utils/balances'
import {
  abiEncode,
  ContractCallData,
  multicallInterface,
} from '../utils/multicall'

const MISSING_SIGNER = ''

export default class BaseClient {
  readonly _chainId: number
  protected readonly _ensProvider: Provider | undefined
  // TODO: something better we can do here to handle typescript check for missing signer?
  readonly _signer: Signer | typeof MISSING_SIGNER
  readonly _provider: Provider | undefined
  private readonly _graphqlClient: GraphQLClient | undefined
  protected readonly _includeEnsNames: boolean
  private readonly _multicallContract: Contract

  constructor({
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    if (includeEnsNames && !provider && !ensProvider)
      throw new InvalidConfigError(
        'Must include a mainnet provider if includeEnsNames is set to true',
      )

    this._ensProvider = ensProvider ?? provider
    this._provider = provider
    this._chainId = chainId
    this._signer = signer ?? MISSING_SIGNER
    this._graphqlClient = getGraphqlClient(chainId)
    this._includeEnsNames = includeEnsNames

    this._multicallContract = new Contract(
      MULTICALL_3_ADDRESS,
      multicallInterface,
      signer,
    )
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

  async submitMulticallTransaction({ calls }: { calls: CallData[] }): Promise<{
    tx: ContractTransaction
  }> {
    this._requireSigner()
    if (!this._signer) throw new Error()

    const callRequests = calls.map((call) => {
      const callData = abiEncode(call.name, call.inputs, call.params)
      return {
        target: call.contract.address,
        callData,
      }
    })
    const multicallContract = new Contract(
      MULTICALL_3_ADDRESS,
      multicallInterface,
      this._signer,
    )
    const multicallTx = await multicallContract.aggregate(callRequests)

    return { tx: multicallTx }
  }

  async multicall({ calls }: { calls: CallData[] }): Promise<{
    events: Event[]
  }> {
    const { tx: multicallTx } = await this.submitMulticallTransaction({
      calls,
    })
    const events = await getTransactionEvents(multicallTx, [], true)
    return { events }
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
    const response = await this._makeGqlRequest<{
      accountBalances: GqlAccountBalances
    }>(ACCOUNT_BALANCES_QUERY, {
      accountId: accountId.toLowerCase(),
    })

    if (!response.accountBalances)
      throw new AccountNotFoundError(
        `No account found at address ${accountId}, please confirm you have entered the correct address. There may just be a delay in subgraph indexing.`,
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
}

export class BaseTransactions extends BaseClient {
  protected readonly _transactionType: TransactionType
  protected readonly _shouldRequireSigner: boolean

  constructor({
    transactionType,
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })

    this._transactionType = transactionType
    this._shouldRequireSigner = [
      TransactionType.Transaction,
      TransactionType.CallData,
    ].includes(transactionType)
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

    const contract = new Contract(
      contractAddress,
      contractInterface,
      this._signer || this._provider,
    ) as T
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
}
