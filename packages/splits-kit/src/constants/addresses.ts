import {
  mainnet,
  goerli,
  polygon,
  polygonMumbai,
  optimismGoerli,
  arbitrumGoerli,
  optimism,
  arbitrum,
  gnosis,
  fantom,
  avalanche,
  bsc,
  aurora,
  zora,
  zoraTestnet,
  base,
} from 'wagmi/chains'

import { SupportedChainId } from './chains'

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

export const SPLIT_MAIN_ADDRESS = '0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE'
export const REVERSE_RECORDS_ADDRESS =
  '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C'
export const CHAOS_LIQUID_SPLIT_ADDRESS =
  '0x8427e46826a520b1264B55f31fCB5DDFDc31E349'
export const DISTRIBUTE_AND_WITHDRAW_ADDRESS =
  '0xF7DD0083953b43F9936BCdB6684A1B62621BBFF6'
export const SPLITS_UNI_V3_ORACLE_ADDRESS =
  '0x8E0E20Ea43A88214A0908F32Cd14395022e823A6'

export const SPLITS_DONATION_ADDRESS = // donations.0xsplits.eth
  '0xF8843981e7846945960f53243cA2Fd42a579f719'
export const SPLITS_ADDRESS = '0xEc8Bfc8637247cEe680444BA1E25fA5e151Ba342' // splits.eth

export const PROTOCOL_GUILD_SPLIT_ADDRESS =
  '0x84af3D5824F0390b9510440B6ABB5CC02BB68ea1'

export const MAKER_ERC20_ADDRESS = '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2'
export const RETH_ERC20_ADDRESS = '0xae78736Cd615f374D3085123A210448E74Fc6393'
export const CBETH_ERC20_ADDRESS = '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704'

export const POPULAR_TOKENS: { [chainId in SupportedChainId]: string[] } = {
  [mainnet.id]: [
    ADDRESS_ZERO,
    '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  ],
  [goerli.id]: [
    ADDRESS_ZERO,
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI
    '0x7af963cf6d228e564e2a0aa0ddbf06210b38615d', // TST
  ],
  [polygon.id]: [
    ADDRESS_ZERO,
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
  ],
  [polygonMumbai.id]: [ADDRESS_ZERO],
  [optimism.id]: [
    ADDRESS_ZERO,
    '0x4200000000000000000000000000000000000042', // OP
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
    '0x7f5c764cbc14f9669b88837ca1490cca17c31607', // USDC
  ],
  [optimismGoerli.id]: [ADDRESS_ZERO],
  [arbitrum.id]: [
    ADDRESS_ZERO,
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', // USDC
  ],
  [arbitrumGoerli.id]: [ADDRESS_ZERO],
  [gnosis.id]: [
    ADDRESS_ZERO,
    '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83', // USDC
  ],
  [fantom.id]: [
    ADDRESS_ZERO,
    '0x04068da6c83afcfa0e13ba15a6696662335d5b75', // USDC
  ],
  [avalanche.id]: [
    ADDRESS_ZERO,
    '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e', // USDC
  ],
  [bsc.id]: [
    ADDRESS_ZERO,
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC
  ],
  [aurora.id]: [
    ADDRESS_ZERO,
    '0xb12bfca5a55806aaf64e99521918a4bf0fc40802', // USDC
  ],
  [zora.id]: [ADDRESS_ZERO],
  [zoraTestnet.id]: [ADDRESS_ZERO],
  [base.id]: [ADDRESS_ZERO],
}

export const TOKEN_BLACKLIST: { [key: number]: string[] } = {
  [mainnet.id]: [
    '0x68Ca006dB91312Cd60a2238Ce775bE5F9f738bBa',
    '0x956F824B5a37673c6fC4a6904186cB3BA499349B',
    '0x525fC44CBE181C1108c209091B5EEc5a5028190d',
    '0xe72c7D093Ac50C57e47f4f2674243A4FfF68F0F2',
    '0x643695D282f6BA237afe27FFE0Acd89a86b50d3e',
  ],
}

interface FeaturedAccount {
  readonly id: string
  readonly name: string
  readonly image: string
  readonly description: string
  readonly url: string
}

type FeaturedAccountsMap = {
  [key: number]: FeaturedAccount[]
}

export const FEATURED_ACCOUNTS: FeaturedAccountsMap = {
  [mainnet.id]: [
    {
      id: '0xF29Ff96aaEa6C9A1fBa851f74737f3c069d4f1a9',
      name: 'Protocol Guild',
      image: '/featured/protocolguild.png',
      description: 'Vesting',
      url: 'https://protocol-guild.readthedocs.io/en/latest/3-smart-contract.html',
    },
    {
      id: SPLITS_DONATION_ADDRESS,
      name: 'donations.0xsplits.eth',
      image: '/featured/donations.png',
      description: 'Platform',
      url: 'https://docs.splits.org/#public-goods',
    },
    {
      id: '0x0BC3807Ec262cB779b38D65b38158acC3bfedE10',
      name: 'Nouns',
      image: '/featured/nouns.png',
      description: 'Split',
      url: 'https://nouns.wtf/vote/190',
    },
    {
      id: '0xaD30f7EEBD9Bd5150a256F47DA41d4403033CdF0',
      name: 'AirSwap',
      image: '/featured/airswap.png',
      description: 'DAO',
      url: 'https://twitter.com/airswap/status/1620846744463622144?s=20&t=_l3e__YziZ_VUVAejYM8Ag',
    },
    {
      id: '0x047ED5b8E8a7eDBd92FAF61f3117cAFE8c529ABb',
      name: 'CHAOS by Songcamp',
      image: '/featured/songcamp.png',
      description: 'Split',
      url: 'https://songcamp.mirror.xyz/UkR2nfVcYYKuePHzck6UnWTY35zW4uFxRnXllkk99Hw',
    },
    {
      id: '0x860a80d33E85e97888F1f0C75c6e5BBD60b48DA9',
      name: 'SuperRare DAO',
      image: '/featured/superrare.png',
      description: 'Split',
      url: 'https://rarepass.superrare.com/',
    },
    {
      id: '0xBE36007bFbefE69F5e2F9B1438FC2A15AE99494F',
      name: 'Metalabel x Gitcoin',
      image: '/featured/metalabel.png',
      description: 'Collective',
      url: 'https://gitcoin.metalabel.app/quadraticfunding',
    },
    {
      id: '0x921Fc6CF9334a6248D6B9F460AA32C5914778f82',
      name: 'Reo Cragun',
      image: '/featured/reocragun.png',
      description: 'Musician',
      url: 'https://www.sound.xyz/reocragun',
    },
    {
      id: '0x9E9320E6d78C0493EdDf1c760dc50D0D27f58767',
      name: 'Heds',
      image: '/featured/heds.png',
      description: 'Gnosis Safe',
      url: 'https://twitter.com/hedsDAO/status/1532439927895429120',
    },
  ],
}
