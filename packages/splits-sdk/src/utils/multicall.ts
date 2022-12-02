import { Interface, JsonFragment, JsonFragmentType } from '@ethersproject/abi'
import { Coder } from 'abi-coder'

const MULTICALL_ABI = [
  // https://github.com/mds1/multicall
  'function aggregate(tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes[] returnData)',
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
  'function aggregate3Value(tuple(address target, bool allowFailure, uint256 value, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
  'function blockAndAggregate(tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes32 blockHash, tuple(bool success, bytes returnData)[] returnData)',
  'function getBasefee() view returns (uint256 basefee)',
  'function getBlockHash(uint256 blockNumber) view returns (bytes32 blockHash)',
  'function getBlockNumber() view returns (uint256 blockNumber)',
  'function getChainId() view returns (uint256 chainid)',
  'function getCurrentBlockCoinbase() view returns (address coinbase)',
  'function getCurrentBlockDifficulty() view returns (uint256 difficulty)',
  'function getCurrentBlockGasLimit() view returns (uint256 gaslimit)',
  'function getCurrentBlockTimestamp() view returns (uint256 timestamp)',
  'function getEthBalance(address addr) view returns (uint256 balance)',
  'function getLastBlockHash() view returns (bytes32 blockHash)',
  'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
  'function tryBlockAndAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes32 blockHash, tuple(bool success, bytes returnData)[] returnData)',
]

export const multicallInterface = new Interface(MULTICALL_ABI)

// Most of this came from https://github.com/Destiner/ethcall
export type CallData = {
  contract: {
    address: string
  }
  name: string
  inputs: readonly JsonFragmentType[]
  outputs: readonly JsonFragmentType[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[]
}

export class ContractCallData {
  address: string
  abi: JsonFragment[]
  functions: JsonFragment[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: ((...params: CallData['params']) => CallData) | any

  /**
   * Create a contract.
   * @param address Address of the contract
   * @param abi ABI of the contract
   */
  constructor(address: string, abi: JsonFragment[]) {
    this.address = address
    this.abi = abi

    this.functions = abi.filter((x) => x.type === 'function')

    this.functions.forEach((callFunction) => {
      const name = callFunction.name
      if (!name) {
        return
      }
      const getCall = makeCallFunction(this, name)
      if (!this[name]) {
        Object.defineProperty(this, name, {
          enumerable: true,
          value: getCall,
          writable: false,
        })
      }
    })
  }
}

const makeCallFunction = (contract: ContractCallData, name: string) => {
  return (...params: CallData['params']): CallData => {
    const address = contract.address
    const func = contract.functions.find((f) => f.name === name)
    const inputs = func?.inputs || []
    const outputs = func?.outputs || []
    return {
      contract: {
        address,
      },
      name,
      inputs,
      outputs,
      params,
    }
  }
}

export const abiEncode = (
  name: string,
  inputs: readonly JsonFragmentType[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[],
): string => {
  const abi = [
    {
      type: 'function',
      name,
      inputs,
    },
  ]
  const coder = new Coder(abi)
  const valueMap = Object.fromEntries(
    inputs.map((input, index) => [input.name, params[index]]),
  )
  return coder.encodeFunction(name, valueMap)
}
