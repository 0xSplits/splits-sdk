import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import {
  ContractOracleParams,
  ContractRecoupTranche,
  ContractScaledOfferFactorOverride,
} from '../types'

export const CONTROLLER_ADDRESS = '0xcontroller'
export const NEW_CONTROLLER_ADDRESS = '0xnewController'
export const SORTED_ADDRESSES = ['0xsorted']
export const SORTED_ALLOCATIONS = [BigNumber.from(50)]
export const DISTRIBUTOR_FEE = BigNumber.from(9)
export const NFT_COUNTS = [400, 600]

export const TRANCHE_RECIPIENTS = ['0x1', '0x2']
export const TRANCHE_SIZES = [BigNumber.from(1)]
export const GET_TOKEN_DATA = {
  symbol: 'tokenSymbol',
  decimals: 10,
}

export const RECOUP_TRANCHE_RECIPIENTS: ContractRecoupTranche[] = [
  [['0x1'], [BigNumber.from(1000000)], AddressZero, BigNumber.from(0)],
  [['0x2'], [BigNumber.from(1000000)], AddressZero, BigNumber.from(1000)],
]

export const OWNER_ADDRESS = '0xowner'
export const FORMATTED_ORACLE_PARAMS: ContractOracleParams = [
  '0xOracleFactory',
  ['0x0', '0x0'],
]
export const FORMATTED_SCALED_OFFER_FACTOR = BigNumber.from(990000)
export const FORMATTED_SCALED_OFFER_FACTOR_OVERRIDES: ContractScaledOfferFactorOverride[] =
  [[['0xtoken1', '0xtoken2'], BigNumber.from(999000)]]
