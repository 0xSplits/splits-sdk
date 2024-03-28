import {
  Chain,
  GetContractReturnType,
  PublicClient,
  Transport,
  getAddress,
  getContract,
} from 'viem'

import { BaseTransactions } from './base'
import { TransactionType, ORACLE_CHAIN_IDS } from '../constants'
import { uniV3OracleAbi } from '../constants/abi/uniV3Oracle'
import { UnsupportedChainIdError } from '../errors'
import type {
  QuoteParams,
  SplitsClientConfig,
  TransactionConfig,
} from '../types'
import { validateAddress } from '../utils/validation'

type UniV3OracleAbi = typeof uniV3OracleAbi

class OracleTransactions extends BaseTransactions {
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
      transactionType,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
  }

  protected _getOracleContract(
    oracle: string,
  ): GetContractReturnType<UniV3OracleAbi, PublicClient<Transport, Chain>> {
    return getContract({
      address: getAddress(oracle),
      abi: uniV3OracleAbi,
      publicClient: this._publicClient,
    })
  }
}

export class OracleClient extends OracleTransactions {
  constructor({
    chainId,
    publicClient,
    ensPublicClient,
    walletClient,
    apiConfig,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })

    if (!ORACLE_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, ORACLE_CHAIN_IDS)
  }

  // Read actions
  async getQuoteAmounts({
    oracleAddress,
    quoteParams,
  }: {
    oracleAddress: string
    quoteParams: QuoteParams[]
  }): Promise<{
    quoteAmounts: bigint[]
  }> {
    validateAddress(oracleAddress)
    this._requirePublicClient()
    if (!this._publicClient) throw new Error()

    // It's possible to fetch all quotes in a single request to the oracle, but if the
    // oracle hits an error for just one pair there is no way to separate that out. So
    // instead we are making a multicall combining each individual quote request. This
    // allows us to easily filter out the failed quotes.
    const multicallResponse = await this._publicClient.multicall({
      contracts: quoteParams.map((quoteParam) => {
        return {
          address: getAddress(oracleAddress),
          abi: uniV3OracleAbi,
          functionName: 'getQuoteAmounts',
          args: [
            [
              [
                [quoteParam.quotePair.base, quoteParam.quotePair.quote],
                quoteParam.baseAmount,
                quoteParam.data ?? '0x',
              ],
            ],
          ],
        }
      }),
    })

    const quoteAmounts = multicallResponse.map((data) => {
      return data.status === 'success'
        ? (data.result as bigint[])[0]
        : BigInt(0)
    })

    return { quoteAmounts }
  }
}
