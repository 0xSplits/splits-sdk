import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import { Contract, ContractTransaction, Event } from '@ethersproject/contracts'
import { GraphQLClient, Variables } from 'graphql-request'

import { MULTICALL_3_ADDRESS } from '../constants'
import {
  InvalidConfigError,
  MissingProviderError,
  MissingSignerError,
  UnsupportedSubgraphChainIdError,
} from '../errors'
import { getGraphqlClient } from '../subgraph'
import type { SplitsClientConfig } from '../types'
import { getTransactionEvents } from '../utils'
import { abiEncode, CallData, multicallInterface } from '../utils/multicall'

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
}
