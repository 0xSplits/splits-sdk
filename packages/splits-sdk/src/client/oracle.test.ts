import { Chain, Hex, PublicClient, Transport } from 'viem'

import { OracleClient } from './oracle'
import {
  InvalidConfigError,
  MissingPublicClientError,
  UnsupportedChainIdError,
} from '../errors'
import { validateAddress } from '../utils/validation'
import { readActions } from '../testing/mocks/oracle'
import { MockViemContract } from '../testing/mocks/viemContract'
import { uniV3OracleAbi } from '../constants/abi/uniV3Oracle'

jest.mock('viem', () => {
  const originalModule = jest.requireActual('viem')
  return {
    ...originalModule,
    getContract: jest.fn(() => {
      return new MockViemContract(readActions, {})
    }),
    getAddress: jest.fn((address) => address),
  }
})

jest.mock('../utils/validation')

const mockPublicClient = jest.fn<PublicClient<Transport, Chain>, unknown[]>()

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
  })

  test('Polygon chain id pass', () => {
    expect(() => new OracleClient({ chainId: 137 })).not.toThrow()
  })
  test('Mumbai chain id fail', () => {
    expect(() => new OracleClient({ chainId: 80001 })).toThrow()
  })

  test('Optimism chain id pass', () => {
    expect(() => new OracleClient({ chainId: 10 })).not.toThrow()
  })
  test('Optimism goerli chain id fail', () => {
    expect(() => new OracleClient({ chainId: 420 })).toThrow()
  })

  test('Arbitrum chain ids pass (test chain fails)', () => {
    expect(() => new OracleClient({ chainId: 42161 })).not.toThrow()
    expect(() => new OracleClient({ chainId: 421613 })).toThrow()
  })

  test('Zora chain ids fail', () => {
    expect(() => new OracleClient({ chainId: 7777777 })).toThrow()
    expect(() => new OracleClient({ chainId: 999 })).toThrow()
  })

  test('Base chain ids pass', () => {
    expect(() => new OracleClient({ chainId: 8453 })).not.toThrow()
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
  const publicClient = new mockPublicClient()
  const client = new OracleClient({
    chainId: 1,
    publicClient,
  })

  beforeEach(() => {
    ;(validateAddress as jest.Mock).mockClear()
  })

  describe('Get quote amounts test', () => {
    const oracleAddress = '0xoracle'
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
            oracleAddress,
            quoteParams,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('Returns quote amounts', async () => {
      publicClient.multicall = jest
        .fn()
        .mockReturnValueOnce([{ status: 'success', result: [BigInt(12)] }])
      const { quoteAmounts } = await client.getQuoteAmounts({
        oracleAddress,
        quoteParams,
      })

      expect(quoteAmounts).toEqual([BigInt(12)])
      expect(validateAddress).toHaveBeenCalledWith(oracleAddress)
      expect(publicClient.multicall).toHaveBeenCalledWith({
        contracts: [
          {
            address: oracleAddress,
            abi: uniV3OracleAbi,
            functionName: 'getQuoteAmounts',
            args: [
              [
                [
                  [
                    quoteParams[0].quotePair.base,
                    quoteParams[0].quotePair.quote,
                  ],
                  quoteParams[0].baseAmount,
                  quoteParams[0].data,
                ],
              ],
            ],
          },
        ],
      })
    })
  })
})
