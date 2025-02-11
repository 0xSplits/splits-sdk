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
import type {
  QuoteParams,
  SplitsClientConfig,
  TransactionConfig,
} from '../types'
import { validateAddress } from '../utils/validation'

type UniV3OracleAbi = typeof uniV3OracleAbi

class OracleTransactions extends BaseTransactions {
  constructor(transactionClientArgs: SplitsClientConfig & TransactionConfig) {
    super({
      supportedChainIds: ORACLE_CHAIN_IDS,
      ...transactionClientArgs,
    })
  }

  protected _getOracleContract(
    oracle: string,
    chainId: number,
  ): GetContractReturnType<UniV3OracleAbi, PublicClient<Transport, Chain>> {
    const publicClient = this._getPublicClient(chainId)

    return getContract({
      address: getAddress(oracle),
      abi: uniV3OracleAbi,
      client: publicClient,
    })
  }
}

export class OracleClient extends OracleTransactions {
  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      ...clientArgs,
    })
  }

  // Read actions
  async getQuoteAmounts({
    oracleAddress,
    quoteParams,
    chainId,
  }: {
    oracleAddress: string
    quoteParams: QuoteParams[]
    chainId?: number
  }): Promise<{
    quoteAmounts: bigint[]
  }> {
    validateAddress(oracleAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const publicClient = this._getPublicClient(functionChainId)

    // It's possible to fetch all quotes in a single request to the oracle, but if the
    // oracle hits an error for just one pair there is no way to separate that out. So
    // instead we are making a multicall combining each individual quote request. This
    // allows us to easily filter out the failed quotes.
    const multicallResponse = await publicClient.multicall({
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
        ? (data.result as unknown as bigint[])[0]
        : BigInt(0)
    })

    return { quoteAmounts }
  }
}
