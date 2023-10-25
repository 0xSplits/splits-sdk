import { CONTROLLER_ADDRESS, NEW_CONTROLLER_ADDRESS } from '../constants'

export const writeActions = {
  createSplit: jest.fn(),
  updateSplit: jest.fn(),
  distributeETH: jest.fn(),
  distributeERC20: jest.fn(),
  updateAndDistributeETH: jest.fn(),
  updateAndDistributeERC20: jest.fn(),
  withdraw: jest.fn(),
  transferControl: jest.fn(),
  cancelControlTransfer: jest.fn(),
  acceptControl: jest.fn(),
  makeSplitImmutable: jest.fn(),
}

export const readActions = {
  getETHBalance: jest.fn(),
  getERC20Balance: jest.fn(),
  predictImmutableSplitAddress: jest.fn(),
  getController: jest.fn().mockReturnValue(CONTROLLER_ADDRESS),
  getNewPotentialController: jest.fn().mockReturnValue(NEW_CONTROLLER_ADDRESS),
  getHash: jest.fn(),
}
