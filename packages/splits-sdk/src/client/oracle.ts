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
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
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
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
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

    const oracleContract = this._getOracleContract(oracleAddress)
    const quoteAmounts = await oracleContract.read.getQuoteAmounts([
      quoteParams.map((quoteParam) => {
        return {
          quotePair: {
            base: getAddress(quoteParam.quotePair.base),
            quote: getAddress(quoteParam.quotePair.quote),
          },
          baseAmount: quoteParam.baseAmount,
          data: quoteParam.data ?? '0x',
        }
      }),
    ])

    return {
      quoteAmounts: quoteAmounts.slice(),
    }
  }
}
