import {
  Address,
  Chain,
  getContract,
  formatUnits,
  parseUnits,
  PublicClient,
  Transport,
  getAddress,
} from 'viem'
import { normalize } from 'viem/ens'

import {
  ADDRESS_ZERO,
  LIQUID_SPLIT_NFT_COUNT,
  PERCENTAGE_SCALE,
  POLYGON_CHAIN_IDS,
  REVERSE_RECORDS_ADDRESS,
} from '../constants'
import type {
  ContractDiversifierRecipient,
  ContractOracleParams,
  ContractRecoupTranche,
  ContractScaledOfferFactorOverride,
  DiversifierRecipient,
  ParseOracleParams,
  RecoupTrancheInput,
  ScaledOfferFactorOverride,
  SplitRecipient,
  WaterfallTrancheInput,
} from '../types'
import {
  validateDiversifierRecipients,
  validateOracleParams,
  validateScaledOfferFactor,
} from './validation'
import { erc20Abi } from '../constants/abi/erc20'
import { reverseRecordsAbi } from '../constants/abi/reverseRecords'

export const getRecipientSortedAddressesAndAllocations = (
  recipients: SplitRecipient[],
): [Address[], bigint[]] => {
  const accounts: Address[] = []
  const percentAllocations: bigint[] = []

  recipients
    .sort((a, b) => {
      if (a.address.toLowerCase() > b.address.toLowerCase()) return 1
      return -1
    })
    .map((value) => {
      accounts.push(getAddress(value.address))
      percentAllocations.push(getBigIntFromPercent(value.percentAllocation))
    })

  return [accounts, percentAllocations]
}

export const getNftCountsFromPercents = (
  percentAllocations: bigint[],
): number[] => {
  return percentAllocations.map((p) =>
    Number((p * BigInt(LIQUID_SPLIT_NFT_COUNT)) / PERCENTAGE_SCALE),
  )
}

export const getBigIntFromPercent = (value: number): bigint => {
  return BigInt(Math.round(Number(PERCENTAGE_SCALE) * value) / 100)
}

export const fromBigIntToPercent = (value: bigint | number): number => {
  const numberVal = Number(value)
  return (numberVal * 100) / Number(PERCENTAGE_SCALE)
}

export const getBigIntTokenValue = (
  value: number,
  decimals: number,
): bigint => {
  return parseUnits(value.toString(), decimals)
}

export const fromBigIntToTokenValue = (
  amount: bigint,
  decimals: number,
): string => {
  return formatUnits(amount, decimals)
}

const fetchEnsNames = async (
  publicClient: PublicClient,
  addresses: Address[],
): Promise<string[]> => {
  // Do nothing if not on mainnet
  const providerNetwork = await publicClient.getChainId()
  if (providerNetwork !== 1) return Array(addresses.length).fill(undefined)

  const reverseRecords = getContract({
    address: REVERSE_RECORDS_ADDRESS,
    abi: reverseRecordsAbi,
    publicClient,
  })

  const allNames = await reverseRecords.read.getNames([addresses])
  return allNames.slice()
}

export const addEnsNames = async (
  publicClient: PublicClient,
  recipients: { address: Address; ensName?: string }[],
): Promise<void> => {
  const addresses = recipients.map((recipient) => recipient.address)
  const allNames = await fetchEnsNames(publicClient, addresses)

  allNames.map((ens, index) => {
    if (ens) {
      try {
        if (normalize(ens)) {
          recipients[index].ensName = ens
        }
      } catch (e) {
        // If normalize generates an error let's just ignore for now and not add the ens
        return
      }
    }
  })
}

export const getTrancheRecipientsAndSizes = async (
  chainId: number,
  token: Address,
  tranches: WaterfallTrancheInput[],
  publicClient: PublicClient,
): Promise<[Address[], bigint[]]> => {
  const recipients: Address[] = []
  const sizes: bigint[] = []

  const tokenData = await getTokenData(chainId, token, publicClient)

  let trancheSum = BigInt(0)
  tranches.forEach((tranche) => {
    recipients.push(getAddress(tranche.recipient))
    if (tranche.size) {
      trancheSum =
        trancheSum + getBigIntTokenValue(tranche.size, tokenData.decimals)
      sizes.push(trancheSum)
    }
  })

  return [recipients, sizes]
}

export const getRecoupTranchesAndSizes = async (
  chainId: number,
  token: Address,
  tranches: RecoupTrancheInput[],
  publicClient: PublicClient,
): Promise<[ContractRecoupTranche[], bigint[]]> => {
  const recoupTranches: ContractRecoupTranche[] = []
  const sizes: bigint[] = []

  const tokenData = await getTokenData(chainId, token, publicClient)
  let trancheSum = BigInt(0)
  tranches.forEach((tranche) => {
    if (typeof tranche.recipient === 'string') {
      recoupTranches.push([
        [tranche.recipient],
        [PERCENTAGE_SCALE],
        ADDRESS_ZERO,
        BigInt(0),
      ])
    } else {
      const [addresses, percentAllocations] =
        getRecipientSortedAddressesAndAllocations(tranche.recipient.recipients)
      const distributorFee = getBigIntFromPercent(
        tranche.recipient.distributorFeePercent,
      )
      recoupTranches.push([
        addresses,
        percentAllocations,
        tranche.recipient.controller ?? ADDRESS_ZERO,
        distributorFee,
      ])
    }

    if (tranche.size) {
      trancheSum =
        trancheSum + getBigIntTokenValue(tranche.size, tokenData.decimals)
      sizes.push(trancheSum)
    }
  })

  return [recoupTranches, sizes]
}

export const getTokenData = async (
  chainId: number,
  token: Address,
  publicClient: PublicClient,
): Promise<{
  symbol: string
  decimals: number
}> => {
  if (token === ADDRESS_ZERO) {
    if (POLYGON_CHAIN_IDS.includes(chainId))
      return {
        symbol: 'MATIC',
        decimals: 18,
      }

    return {
      symbol: 'ETH',
      decimals: 18,
    }
  }

  const tokenContract = getContract({
    abi: erc20Abi,
    address: token,
    publicClient,
  })
  // TODO: error handling? For bad erc20...

  const [decimals, symbol] = await Promise.all([
    tokenContract.read.decimals(),
    tokenContract.read.symbol(),
  ])

  return {
    symbol,
    decimals,
  }
}

// Return true if the public client supports a large enough logs request to fetch erc20 tranfer history
export const isLogsPublicClient = (
  publicClient: PublicClient<Transport, Chain | undefined>,
): boolean => {
  if (publicClient.transport?.url?.includes('.alchemy.')) return true
  if (publicClient.transport?.url?.includes('.alchemyapi.')) return true
  if (publicClient.transport?.url?.includes('.infura.')) return true

  return false
}

export const getDiversifierRecipients = (
  recipients: DiversifierRecipient[],
): ContractDiversifierRecipient[] => {
  validateDiversifierRecipients(recipients)
  return recipients.map((recipientData) => {
    if (recipientData.address)
      return [
        recipientData.address,
        [ADDRESS_ZERO, ADDRESS_ZERO, BigInt(0), []],
        getBigIntFromPercent(recipientData.percentAllocation),
      ]

    if (!recipientData.swapperParams) throw new Error()
    return [
      ADDRESS_ZERO,
      [
        recipientData.swapperParams.beneficiary,
        recipientData.swapperParams.tokenToBeneficiary,
        getFormattedScaledOfferFactor(
          recipientData.swapperParams.defaultScaledOfferFactorPercent,
        ),
        getFormattedScaledOfferFactorOverrides(
          recipientData.swapperParams.scaledOfferFactorOverrides,
        ),
      ],
      getBigIntFromPercent(recipientData.percentAllocation),
    ]
  })
}

export const getFormattedOracleParams = (
  oracleParams: ParseOracleParams,
): ContractOracleParams => {
  validateOracleParams(oracleParams)
  if (oracleParams.address)
    return [oracleParams.address, [ADDRESS_ZERO, ADDRESS_ZERO]]

  if (!oracleParams.createOracleParams) throw new Error()
  return [
    ADDRESS_ZERO,
    [
      oracleParams.createOracleParams.factory,
      oracleParams.createOracleParams.data,
    ],
  ]
}

export const getFormattedScaledOfferFactor = (
  scaledOfferFactorPercent: number,
  allowMaxPercent?: boolean,
): bigint => {
  validateScaledOfferFactor(scaledOfferFactorPercent, allowMaxPercent)

  const formattedScaledOfferFactor =
    1000000 - Math.round(10000 * scaledOfferFactorPercent)
  return BigInt(formattedScaledOfferFactor)
}

export const getFormattedScaledOfferFactorOverrides = (
  scaledOfferFactorOverrides: ScaledOfferFactorOverride[],
): ContractScaledOfferFactorOverride[] => {
  return scaledOfferFactorOverrides.map(
    ({ baseToken, quoteToken, scaledOfferFactorPercent }) => {
      return [
        [baseToken, quoteToken],
        getFormattedScaledOfferFactor(scaledOfferFactorPercent, true),
      ]
    },
  )
}

export const encodePath = (tokens: string[], fees: number[]): string => {
  if (tokens.length !== fees.length + 1) {
    throw new Error('token/fee lengths do not match')
  }

  let encoded = '0x'
  fees.map((fee, index) => {
    encoded += tokens[index].slice(2) // Drop 0x
    encoded += getHexFromNumber(fee, 6)
  })
  encoded += tokens[tokens.length - 1].slice(2)

  return encoded.toLowerCase()
}

const getHexFromNumber = (val: number, length: number): string => {
  const hex = val.toString(16)
  if (hex.length > length) throw new Error('Value too large')

  const precedingZeros = '0'.repeat(length - hex.length)

  return precedingZeros + hex
}
