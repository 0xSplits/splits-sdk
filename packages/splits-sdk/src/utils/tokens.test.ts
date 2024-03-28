import { Chain, PublicClient, Transport, zeroAddress } from 'viem'

import { getTokenData } from './tokens'
import {
  avalanche,
  base,
  bsc,
  fantom,
  gnosis,
  mainnet,
  polygon,
} from 'viem/chains'

const mockPublicClient = jest.fn() as unknown as PublicClient<Transport, Chain>

describe('Token data validatoin', () => {
  describe('Address zero symbol', () => {
    test('Polygon', async () => {
      const { symbol } = await getTokenData(
        polygon.id,
        zeroAddress,
        mockPublicClient,
      )
      expect(symbol).toEqual('MATIC')
    })
    test('Gnosis', async () => {
      const { symbol } = await getTokenData(
        gnosis.id,
        zeroAddress,
        mockPublicClient,
      )
      expect(symbol).toEqual('xDai')
    })
    test('Avalanche', async () => {
      const { symbol } = await getTokenData(
        avalanche.id,
        zeroAddress,
        mockPublicClient,
      )
      expect(symbol).toEqual('AVAX')
    })
    test('Bsc', async () => {
      const { symbol } = await getTokenData(
        bsc.id,
        zeroAddress,
        mockPublicClient,
      )
      expect(symbol).toEqual('BNB')
    })
    test('Fantom', async () => {
      const { symbol } = await getTokenData(
        fantom.id,
        zeroAddress,
        mockPublicClient,
      )
      expect(symbol).toEqual('FTM')
    })
    test('Mainnet', async () => {
      const { symbol } = await getTokenData(
        mainnet.id,
        zeroAddress,
        mockPublicClient,
      )
      expect(symbol).toEqual('ETH')
    })
    test('Base', async () => {
      const { symbol } = await getTokenData(
        base.id,
        zeroAddress,
        mockPublicClient,
      )
      expect(symbol).toEqual('ETH')
    })
  })
})
