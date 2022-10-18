import { SPLITS_MAX_PRECISION_DECIMALS } from '../constants'
import {
  InvalidRecipientsError,
  InvalidDistributorFeePercentError,
  InvalidArgumentError,
} from '../errors'
import { SplitRecipient, WaterfallTrancheInput } from '../types'
import {
  validateRecipients,
  validateDistributorFeePercent,
  validateAddress,
  validateTranches,
} from './validation'

describe('Address validation', () => {
  test('Invalid address fails', () => {
    const address = '12345'
    expect(() => validateAddress(address)).toThrow(InvalidArgumentError)
  })
  test('Valid address passes', () => {
    const address = '0xF8843981e7846945960f53243cA2Fd42a579f719'
    expect(() => validateAddress(address)).not.toThrow()
  })
})

describe('Distributor fee validation', () => {
  test('Outside valid range fails', () => {
    expect(() => validateDistributorFeePercent(-0.1)).toThrow(
      InvalidDistributorFeePercentError,
    )
    expect(() => validateDistributorFeePercent(10.01)).toThrow(
      InvalidDistributorFeePercentError,
    )
  })
  test('Too many decimals fails', () => {
    expect(() => validateDistributorFeePercent(0.12345)).toThrow(
      InvalidDistributorFeePercentError,
    )
  })
  test('Valid distributor fees pass', () => {
    expect(() => validateDistributorFeePercent(0)).not.toThrow()
    expect(() => validateDistributorFeePercent(10)).not.toThrow()
    expect(() => validateDistributorFeePercent(4.1234)).not.toThrow()
  })
})

describe('Recipients validation', () => {
  let recipients: SplitRecipient[]
  beforeEach(() => {
    recipients = [
      {
        address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        percentAllocation: 50,
      },
      {
        address: '0xec8bfc8637247cee680444ba1e25fa5e151ba342',
        percentAllocation: 50,
      },
    ]
  })

  test('Percent allocation doesnt sum to 100 fails', () => {
    recipients[0].percentAllocation = 51
    expect(() =>
      validateRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).toThrow(InvalidRecipientsError)
  })
  test('Percent allocationt too many decimals fails', () => {
    recipients[0].percentAllocation = 49.99999
    recipients[1].percentAllocation = 50.00001
    expect(() =>
      validateRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).toThrow(InvalidRecipientsError)
  })
  test('Percent allocation outside valid range fails', () => {
    recipients[0].percentAllocation = 0
    recipients[1].percentAllocation = 100
    expect(() =>
      validateRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).toThrow(InvalidRecipientsError)
  })
  test('Repeat address fails', () => {
    recipients[1].address = recipients[0].address
    expect(() =>
      validateRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).toThrow(InvalidRecipientsError)
  })
  test('Less than two recipients fails', () => {
    expect(() =>
      validateRecipients(recipients.slice(0, 1), SPLITS_MAX_PRECISION_DECIMALS),
    ).toThrow(InvalidRecipientsError)
  })
  test('Invalid address fails', () => {
    recipients[0].address = '12345'
    expect(() =>
      validateRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).toThrow(InvalidRecipientsError)
  })
  test('Valid recipients pass', () => {
    expect(() =>
      validateRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).not.toThrow()
  })
})

describe('Tranches validation', () => {
  let tranches: WaterfallTrancheInput[]
  beforeEach(() => {
    tranches = [
      {
        recipient: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
        size: 10,
      },
      {
        recipient: '0xF8843981e7846945960f53243cA2Fd42a579f719',
        size: 5,
      },
      {
        recipient: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
      },
    ]
  })

  test('Bad address fails', () => {
    tranches[0].recipient = '0xbadAddress'
    expect(() => validateTranches(tranches)).toThrow(InvalidArgumentError)
  })

  test('Extra size fails', () => {
    tranches[2].size = 1
    expect(() => validateTranches(tranches)).toThrow(InvalidArgumentError)
  })

  test('Missing size fails', () => {
    tranches[1].size = undefined
    expect(() => validateTranches(tranches)).toThrow(InvalidArgumentError)
  })

  test('Valid tranches pass', () => {
    expect(() => validateTranches(tranches)).not.toThrow()
  })
})
