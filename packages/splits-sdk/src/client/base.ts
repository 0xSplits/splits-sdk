import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import { GraphQLClient, Variables } from 'graphql-request'

import {
  InvalidConfigError,
  MissingProviderError,
  MissingSignerError,
  UnsupportedSubgraphChainIdError,
} from '../errors'
import { getGraphqlClient } from '../subgraph'
import type { SplitsClientConfig } from '../types'

const MISSING_SIGNER = ''

export default class BaseClient {
  protected readonly _chainId: number
  protected readonly _ensProvider: Provider | undefined
  // TODO: something better we can do here to handle typescript check for missing signer?
  protected readonly _signer: Signer | typeof MISSING_SIGNER
  private readonly _provider: Provider | undefined
  private readonly _graphqlClient: GraphQLClient | undefined
  protected readonly _includeEnsNames: boolean

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
}
