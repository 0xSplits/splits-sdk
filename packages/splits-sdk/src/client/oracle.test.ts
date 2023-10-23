import * as viemApi from 'viem'
import { GetContractReturnType, Hex, PublicClient } from 'viem'

import { OracleClient } from './oracle'
import {
  InvalidConfigError,
  MissingProviderError,
  UnsupportedChainIdError,
} from '../errors'
import { validateAddress } from '../utils/validation'
import { MockOracle, readActions } from '../testing/mocks/oracle'

jest.spyOn(viemApi, 'getContract').mockImplementation(() => {
  return new MockOracle() as unknown as GetContractReturnType
})

jest.spyOn(viemApi, 'getAddress').mockImplementation((address) => {
  return address as viemApi.Address
})

jest.mock('../utils/validation')

const mockProvider = jest.fn<PublicClient, unknown[]>()

describe('Client config validation', () => {
  test('Including ens names with no provider fails', () => {
    expect(
      () => new OracleClient({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
  })

  test('Invalid chain id fails', () => {
    expect(() => new OracleClient({ chainId: 51 })).toThrow(
      UnsupportedChainIdError,
    )
  })

  test('Ethereum chain ids pass', () => {
    expect(() => new OracleClient({ chainId: 1 })).not.toThrow()
    expect(() => new OracleClient({ chainId: 5 })).not.toThrow()
  })

  test('Polygon chain ids fail', () => {
    expect(() => new OracleClient({ chainId: 137 })).toThrow()
    expect(() => new OracleClient({ chainId: 80001 })).toThrow()
  })

  test('Optimism chain ids fail', () => {
    expect(() => new OracleClient({ chainId: 10 })).toThrow()
    expect(() => new OracleClient({ chainId: 420 })).toThrow()
  })

  test('Arbitrum chain ids fail', () => {
    expect(() => new OracleClient({ chainId: 42161 })).toThrow()
    expect(() => new OracleClient({ chainId: 421613 })).toThrow()
  })

  test('Zora chain ids fail', () => {
    expect(() => new OracleClient({ chainId: 7777777 })).toThrow()
    expect(() => new OracleClient({ chainId: 999 })).toThrow()
  })

  test('Base chain ids fail', () => {
    expect(() => new OracleClient({ chainId: 8453 })).toThrow()
  })

  test('Other chain ids fail', () => {
    expect(() => new OracleClient({ chainId: 100 })).toThrow()
    expect(() => new OracleClient({ chainId: 250 })).toThrow()
    expect(() => new OracleClient({ chainId: 43114 })).toThrow()
    expect(() => new OracleClient({ chainId: 56 })).toThrow()
    expect(() => new OracleClient({ chainId: 1313161554 })).toThrow()
  })
})

describe('Oracle reads', () => {
  const publicClient = new mockProvider()
  const client = new OracleClient({
    chainId: 1,
    publicClient,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
  })

  describe('Get quote amounts test', () => {
    const oracleId = '0xoracle'
    const quoteParams = [
      {
        quotePair: {
          base: '0xbase',
          quote: '0xquote',
        },
        baseAmount: BigInt(1),
        data: '0x' as Hex,
      },
    ]

    beforeEach(() => {
      readActions.getQuoteAmounts.mockClear()
    })

    test('Get quote amounts fails with no provider', async () => {
      const badClient = new OracleClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getQuoteAmounts({
            oracleId,
            quoteParams,
          }),
      ).rejects.toThrow(MissingProviderError)
    })

    test('Returns quote amounts', async () => {
      readActions.getQuoteAmounts.mockReturnValueOnce([BigInt(12)])
      const { quoteAmounts } = await client.getQuoteAmounts({
        oracleId,
        quoteParams,
      })

      expect(quoteAmounts).toEqual([BigInt(12)])
      expect(validateAddress).toBeCalledWith(oracleId)
      expect(readActions.getQuoteAmounts).toBeCalledWith([
        [
          {
            baseAmount: BigInt(1),
            data: '0x',
            quotePair: {
              base: '0xbase',
              quote: '0xquote',
            },
          },
        ],
      ])
    })
  })
})
