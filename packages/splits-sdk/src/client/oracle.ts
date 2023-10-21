import { getAddress, getContract } from 'viem'

import { BaseTransactions } from './base'
import { TransactionType, ORACLE_CHAIN_IDS } from '../constants'
import { UnsupportedChainIdError } from '../errors'
import type {
  QuoteParams,
  SplitsClientConfig,
  TransactionConfig,
} from '../types'
import { validateAddress } from '../utils/validation'
import { uniV3OracleAbi } from '../constants/abi/uniV3Oracle'

class OracleTransactions extends BaseTransactions {
  constructor({
    transactionType,
    chainId,
    publicClient,
    ensProvider,
    account,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      publicClient,
      ensProvider,
      account,
      includeEnsNames,
    })
  }

  protected _getOracleContract(oracle: string) {
    return getContract({
      address: getAddress(oracle),
      abi: uniV3OracleAbi,
      publicClient: this._provider,
    })
  }
}

export class OracleClient extends OracleTransactions {
  constructor({
    chainId,
    publicClient,
    ensProvider,
    account,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      ensProvider,
      account,
      includeEnsNames,
    })

    if (!ORACLE_CHAIN_IDS.includes(chainId))
      throw new UnsupportedChainIdError(chainId, ORACLE_CHAIN_IDS)
  }

  // Read actions
  async getQuoteAmounts({
    oracleId,
    quoteParams,
  }: {
    oracleId: string
    quoteParams: QuoteParams[]
  }): Promise<{
    quoteAmounts: bigint[]
  }> {
    validateAddress(oracleId)
    this._requireProvider()

    const oracleContract = this._getOracleContract(oracleId)
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
