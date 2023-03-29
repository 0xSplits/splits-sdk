import { Interface, JsonFragment, JsonFragmentType } from '@ethersproject/abi'
import { Coder } from 'abi-coder'

import MULTICALL_ARTIFACT from '../artifacts/contracts/Multicall/Multicall.json'
import { CallData } from '../types'

export const multicallAbi = MULTICALL_ARTIFACT.abi
export const multicallInterface = new Interface(multicallAbi)

// Most of this came from https://github.com/Destiner/ethcall
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
