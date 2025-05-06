import { Chain, Hex, PublicClient, Transport } from 'viem'

import { OracleClient } from './oracle'
import { InvalidConfigError, MissingPublicClientError } from '../errors'
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
})

describe('Oracle reads', () => {
  const chainId = 1
  const publicClient = new mockPublicClient()
  publicClient.chain = { id: chainId } as Chain

  const client = new OracleClient({
    chainId,
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
