import { Provider } from '@ethersproject/abstract-provider'
import { BigNumber } from '@ethersproject/bignumber'

import { OracleClient } from './oracle'
import {
  InvalidConfigError,
  MissingProviderError,
  UnsupportedChainIdError,
} from '../errors'
import { validateAddress } from '../utils/validation'
import { MockOracle, readActions } from '../testing/mocks/oracle'

jest.mock('@ethersproject/contracts', () => {
  return {
    Contract: jest
      .fn()
      .mockImplementation((_contractAddress, _contractInterface, provider) => {
        return new MockOracle(provider)
      }),
  }
})

jest.mock('../utils/validation')

const mockProvider = jest.fn<Provider, unknown[]>()

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

  test('Polygon chain ids pass', () => {
    expect(() => new OracleClient({ chainId: 137 })).not.toThrow()
    expect(() => new OracleClient({ chainId: 80001 })).not.toThrow()
  })

  test('Optimism chain ids pass', () => {
    expect(() => new OracleClient({ chainId: 10 })).not.toThrow()
    expect(() => new OracleClient({ chainId: 420 })).not.toThrow()
  })

  test('Arbitrum chain ids pass', () => {
    expect(() => new OracleClient({ chainId: 42161 })).not.toThrow()
    expect(() => new OracleClient({ chainId: 421613 })).not.toThrow()
  })
})

describe('Oracle reads', () => {
  const provider = new mockProvider()
  const client = new OracleClient({
    chainId: 1,
    provider,
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
        baseAmount: BigNumber.from(1),
        data: '0x0',
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
      readActions.getQuoteAmounts.mockReturnValueOnce([BigNumber.from(12)])
      const { quoteAmounts } = await client.getQuoteAmounts({
        oracleId,
        quoteParams,
      })

      expect(quoteAmounts).toEqual([BigNumber.from(12)])
      expect(validateAddress).toBeCalledWith(oracleId)
      expect(readActions.getQuoteAmounts).toBeCalledWith([
        [['0xbase', '0xquote'], BigNumber.from(1), '0x0'],
      ])
    })
  })
})
