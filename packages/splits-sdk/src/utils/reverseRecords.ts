import { Interface } from '@ethersproject/abi'

const REVERSE_RECORDS_ABI = [
  'function getNames(address[]) view returns (string[])',
]

export const reverseRecordsInterface = new Interface(REVERSE_RECORDS_ABI)
