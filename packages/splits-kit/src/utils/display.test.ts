import { displayPercentage, displayBigNumber } from './display'
import { utils, BigNumber } from 'ethers'

describe('number utils', () => {
  describe('displayPercentage', () => {
    it('should return "0.0%" when 0 is provided', () => {
      const result = displayPercentage(0)
      expect(result).toBe('0.0%')
    })

    it('should correctly handle the case when isScaled is true', () => {
      const percentage = BigNumber.from(1e5).toNumber() // this is 10% of 1e6
      const result = displayPercentage(percentage)
      expect(result).toBe('10.0%')
    })

    it('should correctly handle the case when isScaled is false', () => {
      const result = displayPercentage(10, 1, false)
      expect(result).toBe('1000.0%')
    })

    it('should correctly handle decimal places', () => {
      const percentage = BigNumber.from(1e5).toNumber() // this is 10% of 1e6
      const result = displayPercentage(percentage, 2)
      expect(result).toBe('10.00%')
    })
  })
  describe('displayBigNumber', () => {
    it('should return "0.000" when 0 is provided', () => {
      const amount = BigNumber.from(0)
      const result = displayBigNumber(amount)
      expect(result).toBe('0.000')
    })

    it('should correctly display the number with 3 decimal places by default', () => {
      const amount = utils.parseUnits('1234.5678', 18)
      const result = displayBigNumber(amount)
      expect(result).toBe('1,234.568')
    })

    it('should correctly display the number with specified decimal places', () => {
      const amount = utils.parseUnits('1234.56789', 18)
      const result = displayBigNumber(amount, 4)
      expect(result).toBe('1,234.5679')
    })
  })
})
