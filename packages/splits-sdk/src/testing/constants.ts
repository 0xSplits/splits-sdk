import { BigNumber } from '@ethersproject/bignumber'

export const CONTROLLER_ADDRESS = '0xcontroller'
export const NEW_CONTROLLER_ADDRESS = '0xnewController'
export const SORTED_ADDRESSES = ['0xsorted']
export const SORTED_ALLOCATIONS = [BigNumber.from(50)]
export const DISTRIBUTOR_FEE = BigNumber.from(9)
export const MOCK_FEE_DATA = {
  gasPrice: BigNumber.from(23610503242),
  maxFeePerGas: BigNumber.from(46721006484),
  maxPriorityFeePerGas: BigNumber.from(1500000000),
}
export const GAS_ESTIMATION = BigNumber.from(27938)
