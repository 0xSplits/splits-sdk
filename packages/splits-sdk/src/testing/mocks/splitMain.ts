import { Provider } from '@ethersproject/abstract-provider'

import { CONTROLLER_ADDRESS, NEW_CONTROLLER_ADDRESS } from '../constants'

export const writeActions = {
  createSplit: jest.fn().mockReturnValue('create_split_tx'),
  updateSplit: jest.fn().mockReturnValue('update_split_tx'),
  distributeETH: jest.fn().mockReturnValue('distribute_eth_tx'),
  distributeERC20: jest.fn().mockReturnValue('distribute_erc20_tx'),
  updateAndDistributeETH: jest
    .fn()
    .mockReturnValue('update_and_distribute_eth_tx'),
  updateAndDistributeERC20: jest
    .fn()
    .mockReturnValue('update_and_distribute_erc20_tx'),
  withdraw: jest.fn().mockReturnValue('withdraw_tx'),
  transferControl: jest.fn().mockReturnValue('transfer_control_tx'),
  cancelControlTransfer: jest
    .fn()
    .mockReturnValue('cancel_control_transfer_tx'),
  acceptControl: jest.fn().mockReturnValue('accept_control_tx'),
  makeSplitImmutable: jest.fn().mockReturnValue('make_split_immutable_tx'),
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

    this.getETHBalance = readActions.getETHBalance
    this.getERC20Balance = readActions.getERC20Balance
    this.predictImmutableSplitAddress = readActions.predictImmutableSplitAddress
    this.getController = readActions.getController
    this.getNewPotentialController = readActions.getNewPotentialController
    this.getHash = readActions.getHash
  }

  connect() {
    return writeActions
  }
}
