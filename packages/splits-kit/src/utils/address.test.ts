import { shortenAddress, shortenENS } from './address'

describe('address utils', () => {
  describe('shortenAddress', () => {
    it('should return "no address provided" when no argument is provided', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const result = shortenAddress()
      expect(result).toEqual('no address provided')
    })

    it('should return the correct shortened address when a valid address is provided', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678'
      const result = shortenAddress(address)
      expect(result).toEqual('0x1234...5678')
    })

    it('should return the correct shortened address when an address shorter than 10 characters is provided', () => {
      const address = '0x123456'
      const result = shortenAddress(address)
      expect(result).toEqual('0x1234...3456')
    })

    it('should return the correct shortened address when an address of exactly 10 characters is provided', () => {
      const address = '0x1234567890'
      const result = shortenAddress(address)
      expect(result).toEqual('0x1234...7890')
    })
  })
  describe('shortenENS', () => {
    it('should return undefined when no argument is provided', () => {
      const result = shortenENS()
      expect(result).toBeUndefined()
    })

    it('should return the original ENS when an ENS of 25 characters or less is provided', () => {
      const ens = 'short.ens.eth'
      const result = shortenENS(ens)
      expect(result).toEqual(ens)
    })

    it('should return the correctly shortened ENS when an ENS longer than 25 characters is provided', () => {
      const ens = 'averylongethereumnamerecord.eth'
      const result = shortenENS(ens)
      expect(result).toEqual('averylonget...erecord.eth')
    })
  })
})
