import { Address, zeroAddress } from 'viem'

import {
  ContractDiversifierRecipient,
  ContractOracleParams,
  ContractRecoupTranche,
  ContractScaledOfferFactorOverride,
} from '../types'

// eslint-disable-next-line
require('dotenv').config()

const SAMPLE_ADDRESSES: Address[] = [
  '0xD57f3Fa0b49E91eaA20e739c874Ae273Bcf2D7Aa',
  '0xE1D4BCd79552d815Eb5A8Fb2479Ad770E15BB17e',
  '0xE9762Fb8D5347474375Ce00628d5a13D8AD45A99',
]

export const CONTROLLER_ADDRESS = '0xcontroller'
export const NEW_CONTROLLER_ADDRESS = '0xnewController'
export const SORTED_ADDRESSES: Address[] = ['0xsorted']
export const SORTED_ALLOCATIONS = [BigInt(50)]
export const DISTRIBUTOR_FEE = BigInt(9)
export const NFT_COUNTS = [400, 600]

export const TRANCHE_RECIPIENTS = [SAMPLE_ADDRESSES[0], SAMPLE_ADDRESSES[1]]
export const TRANCHE_SIZES = [BigInt(1)]
export const GET_TOKEN_DATA = {
  symbol: 'tokenSymbol',
  decimals: 10,
}

export const RECOUP_TRANCHE_RECIPIENTS: ContractRecoupTranche[] = [
  [['0x1'], [BigInt(1000000)], zeroAddress, BigInt(0)],
  [['0x2'], [BigInt(1000000)], zeroAddress, BigInt(1000)],
]

export const OWNER_ADDRESS = '0xowner'
export const FORMATTED_ORACLE_PARAMS: ContractOracleParams = [
  '0xOracleFactory',
  ['0x0', '0x0'],
]
export const FORMATTED_SCALED_OFFER_FACTOR = BigInt(990000)
export const FORMATTED_SCALED_OFFER_FACTOR_OVERRIDES: ContractScaledOfferFactorOverride[] =
  [[['0xtoken1', '0xtoken2'], BigInt(999000)]]

export const FORMATTED_DIVERSIFIER_RECIPIENTS: ContractDiversifierRecipient[] =
  [['0xrecipient', [zeroAddress, zeroAddress, BigInt(0), []], BigInt(1)]]
