import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Contract } from '@ethersproject/contracts'

import ORACLE_IMPL_ARTIFACT from '../artifacts/contracts/OracleImpl/OracleImpl.json'

import { BaseTransactions } from './base'
import { TransactionType, ORACLE_CHAIN_IDS } from '../constants'
import { UnsupportedChainIdError } from '../errors'
import type {
  QuoteParams,
  SplitsClientConfig,
  TransactionConfig,
} from '../types'
import { validateAddress } from '../utils/validation'

const oracleImplInterface = new Interface(ORACLE_IMPL_ARTIFACT.abi)

class OracleTransactions extends BaseTransactions {
  constructor({
    transactionType,
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig & TransactionConfig) {
    super({
      transactionType,
      chainId,
      provider,
      ensProvider,
      signer,
      includeEnsNames,
    })
  }

  protected _getOracleContract(oracle: string) {
    return this._getTransactionContract<Contract, Contract['estimateGas']>(
      oracle,
      ORACLE_IMPL_ARTIFACT.abi,
      oracleImplInterface,
    )
  }
}

export class OracleClient extends OracleTransactions {
  constructor({
    chainId,
    provider,
    ensProvider,
    signer,
    includeEnsNames = false,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      provider,
      ensProvider,
      signer,
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
    quoteAmounts: BigNumber[]
  }> {
    validateAddress(oracleId)
    this._requireProvider()

    const oracleContract = this._getOracleContract(oracleId)
    const quoteAmounts = await oracleContract.getQuoteAmounts(
      quoteParams.map((quoteParam) => {
        return [
          [quoteParam.quotePair.base, quoteParam.quotePair.quote],
          quoteParam.baseAmount,
          quoteParam.data ?? AddressZero,
        ]
      }),
    )

    return {
      quoteAmounts,
    }
  }
}
