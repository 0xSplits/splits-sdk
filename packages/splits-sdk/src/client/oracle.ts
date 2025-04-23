import { GetContractReturnType, getAddress, getContract } from 'viem'

import { BaseTransactions } from './base'
import { TransactionType, ORACLE_CHAIN_IDS } from '../constants'
import { uniV3OracleAbi } from '../constants/abi/uniV3Oracle'
import type {
  QuoteParams,
  SplitsClientConfig,
  SplitsPublicClient,
  TransactionConfig,
} from '../types'
import { validateAddress } from '../utils/validation'

type UniV3OracleAbi = typeof uniV3OracleAbi

// Minimal ABI for Uniswap V3 Pool to get the fee
const uniswapV3PoolAbi = [
  {
    inputs: [],
    name: 'fee',
    outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

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
  ): GetContractReturnType<UniV3OracleAbi, SplitsPublicClient> {
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

  /**
   * Get pair details from the oracle for the given quote pairs
   * @param {Object} params - The parameters
   * @param {string} params.oracleAddress - The address of the oracle contract
   * @param {Array<{base: string, quote: string}>} params.quotePairs - Array of quote pairs to get details for
   * @param {number} [params.chainId] - Optional chain ID
   * @returns {Promise<{pairDetails: Array<{pool: string, period: number}>}>} Pair details including pool addresses and periods
   */
  async getPairDetails({
    oracleAddress,
    quotePairs,
    chainId,
  }: {
    oracleAddress: string
    quotePairs: Array<{ base: string; quote: string }>
    chainId?: number
  }): Promise<{
    pairDetails: Array<{ pool: string; period: number }>
  }> {
    validateAddress(oracleAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const oracleContract = this._getOracleContract(
      oracleAddress,
      functionChainId,
    )

    // Format the quotePairs for the contract call
    const formattedQuotePairs = quotePairs.map((pair) => ({
      base: getAddress(pair.base),
      quote: getAddress(pair.quote),
    }))

    // Call the getPairDetails function on the oracle contract
    const pairDetails = await oracleContract.read.getPairDetails([
      formattedQuotePairs,
    ])

    return {
      pairDetails: pairDetails.map((detail) => ({
        pool: detail.pool,
        period: Number(detail.period),
      })),
    }
  }

  /**
   * Get the fee percentage of a Uniswap V3 pool
   * @param {Object} params - The parameters
   * @param {string} params.poolAddress - The address of the Uniswap V3 pool
   * @param {number} [params.chainId] - Optional chain ID
   * @returns {Promise<{fee: number}>} The pool fee in basis points (e.g., 500 for 0.05%, 3000 for 0.3%)
   */
  async getPoolFee({
    poolAddress,
    chainId,
  }: {
    poolAddress: string
    chainId?: number
  }): Promise<{
    fee: number
  }> {
    validateAddress(poolAddress)

    const functionChainId = this._getReadOnlyFunctionChainId(chainId)
    const publicClient = this._getPublicClient(functionChainId)

    // Create a contract instance for the Uniswap V3 pool
    const poolContract = getContract({
      address: getAddress(poolAddress),
      abi: uniswapV3PoolAbi,
      client: publicClient,
    })

    // Call the fee function on the pool contract
    const fee = await poolContract.read.fee()

    return {
      fee: Number(fee),
    }
  }
}