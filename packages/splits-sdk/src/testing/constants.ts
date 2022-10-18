import { BigNumber } from '@ethersproject/bignumber'

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
