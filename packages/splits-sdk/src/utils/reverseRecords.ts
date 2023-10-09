import { utils } from 'ethers'

const REVERSE_RECORDS_ABI = [
  'function getNames(address[]) view returns (string[])',
] as const

export const reverseRecordsInterface = new utils.Interface(REVERSE_RECORDS_ABI)
