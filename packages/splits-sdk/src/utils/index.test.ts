import { BigNumber } from '@ethersproject/bignumber'
import {
  getBigNumberFromPercent,
  getRecipientSortedAddressesAndAllocations,
} from './index'

describe('Test sorting recipients', () => {
  test('Recipients come back sorted by address', () => {
    const recipients = [
      {
        address: '456',
        percentAllocation: 456,
      },
      {
        address: '789',
        percentAllocation: 789,
      },
      {
        address: '123',
        percentAllocation: 123,
      },
    ]

    const [sortedAddresses, sortedPercentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)

    const expectedAddresses = ['123', '456', '789']
    const expectedPercentAllocations = [
      BigNumber.from(123 * 1e4),
      BigNumber.from(456 * 1e4),
      BigNumber.from(789 * 1e4),
    ]

    expect(sortedAddresses).toEqual(expectedAddresses)
    expect(sortedPercentAllocations).toEqual(expectedPercentAllocations)
  })
  test('Sorting by lowercase values', () => {
    const recipients = [
      {
        address: 'ad',
        percentAllocation: 3,
      },
      {
        address: 'Ae',
        percentAllocation: 4,
      },
      {
        address: 'ab',
        percentAllocation: 1,
      },
      {
        address: 'Ac',
        percentAllocation: 2,
      },
    ]

    const [sortedAddresses, sortedPercentAllocations] =
      getRecipientSortedAddressesAndAllocations(recipients)

    const expectedAddresses = ['ab', 'Ac', 'ad', 'Ae']
    const expectedPercentAllocations = [
      BigNumber.from(1 * 1e4),
      BigNumber.from(2 * 1e4),
      BigNumber.from(3 * 1e4),
      BigNumber.from(4 * 1e4),
    ]

    expect(sortedAddresses).toEqual(expectedAddresses)
    expect(sortedPercentAllocations).toEqual(expectedPercentAllocations)
  })
  test('Getting big number value', () => {
    const value = 10
    const expectedBigNumber = BigNumber.from(10 * 1e4)

    const result = getBigNumberFromPercent(value)
    expect(result).toEqual(expectedBigNumber)
  })
})
