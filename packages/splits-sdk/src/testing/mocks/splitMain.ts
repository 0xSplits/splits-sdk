import { Provider } from '@ethersproject/abstract-provider'

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

export class MockSplitMain {
  provider: Provider
  interface: {
    getEvent: (eventName: string) => {
      format: () => string
    }
  }

  createSplit: jest.Mock
  updateSplit: jest.Mock
  distributeETH: jest.Mock
  distributeERC20: jest.Mock
  updateAndDistributeETH: jest.Mock
  updateAndDistributeERC20: jest.Mock
  withdraw: jest.Mock
  transferControl: jest.Mock
  cancelControlTransfer: jest.Mock
  acceptControl: jest.Mock
  makeSplitImmutable: jest.Mock

  getETHBalance: jest.Mock
  getERC20Balance: jest.Mock
  predictImmutableSplitAddress: jest.Mock
  getController: jest.Mock
  getNewPotentialController: jest.Mock
  getHash: jest.Mock

  constructor(provider: Provider) {
    this.provider = provider
    this.interface = {
      getEvent: (eventName: string) => {
        return {
          format: () => {
            return `format_${eventName}`
          },
        }
      },
    }

    this.createSplit = writeActions.createSplit
    this.updateSplit = writeActions.updateSplit
    this.distributeETH = writeActions.distributeETH
    this.distributeERC20 = writeActions.distributeERC20
    this.updateAndDistributeETH = writeActions.updateAndDistributeETH
    this.updateAndDistributeERC20 = writeActions.updateAndDistributeERC20
    this.withdraw = writeActions.withdraw
    this.transferControl = writeActions.transferControl
    this.cancelControlTransfer = writeActions.cancelControlTransfer
    this.acceptControl = writeActions.acceptControl
    this.makeSplitImmutable = writeActions.makeSplitImmutable

    this.getETHBalance = readActions.getETHBalance
    this.getERC20Balance = readActions.getERC20Balance
    this.predictImmutableSplitAddress = readActions.predictImmutableSplitAddress
    this.getController = readActions.getController
    this.getNewPotentialController = readActions.getNewPotentialController
    this.getHash = readActions.getHash
  }
}
