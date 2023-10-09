import { parseAbi } from 'viem'

const signatures = [
  'function getNames(address[]) view returns (string[])',
] as const

const abi = parseAbi(signatures)
