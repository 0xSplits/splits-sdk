import { Address, Hex } from 'viem'

import {
  ContractDiversifierRecipient,
  ContractOracleParams,
  ContractRecoupTranche,
  ContractScaledOfferFactorOverride,
} from '../types'
import { ADDRESS_ZERO } from '../constants'

const SAMPLE_ADDRESSES: Address[] = [
  '0xD57f3Fa0b49E91eaA20e739c874Ae273Bcf2D7Aa',
  '0xE1D4BCd79552d815Eb5A8Fb2479Ad770E15BB17e',
  '0xE9762Fb8D5347474375Ce00628d5a13D8AD45A99',
]

export const CONTROLLER_ADDRESS = '0xcontroller'
export const NEW_CONTROLLER_ADDRESS = '0xnewController'
export const SORTED_ADDRESSES: Address[] = ['0xsorted']
export const SORTED_ALLOCATIONS = [BigInt(50)]
export const DISTRIBUTOR_FEE = BigInt(9)
export const NFT_COUNTS = [400, 600]

export const TRANCHE_RECIPIENTS = [SAMPLE_ADDRESSES[0], SAMPLE_ADDRESSES[1]]
export const TRANCHE_SIZES = [BigInt(1)]
export const GET_TOKEN_DATA = {
  symbol: 'tokenSymbol',
  decimals: 10,
}

export const RECOUP_TRANCHE_RECIPIENTS: ContractRecoupTranche[] = [
  [['0x1'], [BigInt(1000000)], ADDRESS_ZERO, BigInt(0)],
  [['0x2'], [BigInt(1000000)], ADDRESS_ZERO, BigInt(1000)],
]

export const OWNER_ADDRESS = '0xowner'
export const FORMATTED_ORACLE_PARAMS: ContractOracleParams = [
  '0xOracleFactory',
  ['0x0', '0x0'],
]
export const FORMATTED_SCALED_OFFER_FACTOR = BigInt(990000)
export const FORMATTED_SCALED_OFFER_FACTOR_OVERRIDES: ContractScaledOfferFactorOverride[] =
  [[['0xtoken1', '0xtoken2'], BigInt(999000)]]

export const FORMATTED_DIVERSIFIER_RECIPIENTS: ContractDiversifierRecipient[] =
  [['0xrecipient', [ADDRESS_ZERO, ADDRESS_ZERO, BigInt(0), []], BigInt(1)]]

export const ANVIL_ACCOUNTS_PK: Hex[] = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
  '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
]

export const ACCOUNTS = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
  '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
  '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
  '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
  '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
  '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
] as const

// Named accounts
export const [ALICE, BOB, CHARLIE] = ACCOUNTS
export const [ALICE_PK, BOB_PK] = ANVIL_ACCOUNTS_PK

if (!process.env.VITE_ANVIL_FORK_URL) {
  throw new Error('Missing environment variable "VITE_ANVIL_FORK_URL"')
}

export const FORK_URL = process.env.VITE_ANVIL_FORK_URL

if (!process.env.VITE_ANVIL_BLOCK_NUMBER) {
  throw new Error('Missing environment variable "VITE_ANVIL_BLOCK_NUMBER"')
}

export const FORK_BLOCK_NUMBER = BigInt(
  Number(process.env.VITE_ANVIL_BLOCK_NUMBER),
)
