import { zeroAddress } from 'viem'
import { SPLITS_MAX_PRECISION_DECIMALS } from '../constants'
import {
  InvalidRecipientsError,
  InvalidDistributorFeePercentError,
  InvalidArgumentError,
} from '../errors'
import { SplitRecipient, WaterfallTrancheInput } from '../types'
import {
  validateSplitRecipients,
  validateDistributorFeePercent,
  validateAddress,
  validateWaterfallTranches,
  validateVestingPeriod,
  validateRecoupNonWaterfallRecipient,
  validateDiversifierRecipients,
  validateOracleParams,
  validateUniV3SwapInputAssets,
  validateScaledOfferFactor,
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
      validateSplitRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).toThrow(InvalidRecipientsError)
  })
  test('Percent allocationt too many decimals fails', () => {
    recipients[0].percentAllocation = 49.99999
    recipients[1].percentAllocation = 50.00001
    expect(() =>
      validateSplitRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).toThrow(InvalidRecipientsError)
  })
  test('Percent allocation outside valid range fails', () => {
    recipients[0].percentAllocation = 0
    recipients[1].percentAllocation = 100
    expect(() =>
      validateSplitRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).toThrow(InvalidRecipientsError)
  })
  test('Repeat address fails', () => {
    recipients[1].address = recipients[0].address
    expect(() =>
      validateSplitRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).toThrow(InvalidRecipientsError)
  })
  test('Less than two recipients fails', () => {
    expect(() =>
      validateSplitRecipients(
        recipients.slice(0, 1),
        SPLITS_MAX_PRECISION_DECIMALS,
      ),
    ).toThrow(InvalidRecipientsError)
  })
  test('Invalid address fails', () => {
    recipients[0].address = '12345'
    expect(() =>
      validateSplitRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).toThrow(InvalidRecipientsError)
  })
  test('Valid recipients pass', () => {
    expect(() =>
      validateSplitRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS),
    ).not.toThrow()
  })

  test('Too many recipients fails when maxRecipients specified', () => {
    const manyRecipients: SplitRecipient[] = Array.from(
      { length: 501 },
      (_, i) => ({
        address: `0x${i.toString(16).padStart(40, '0')}`,
        percentAllocation: 100 / 501,
      }),
    )
    expect(() =>
      validateSplitRecipients(
        manyRecipients,
        SPLITS_MAX_PRECISION_DECIMALS,
        500,
      ),
    ).toThrow(InvalidRecipientsError)
  })

  test('Exactly maxRecipients passes', () => {
    const manyRecipients: SplitRecipient[] = Array.from(
      { length: 500 },
      (_, i) => ({
        address: `0x${i.toString(16).padStart(40, '0')}`,
        percentAllocation: 100 / 500,
      }),
    )
    expect(() =>
      validateSplitRecipients(
        manyRecipients,
        SPLITS_MAX_PRECISION_DECIMALS,
        500,
      ),
    ).not.toThrow()
  })

  test('No maxRecipients allows any number', () => {
    const manyRecipients: SplitRecipient[] = Array.from(
      { length: 600 },
      (_, i) => ({
        address: `0x${i.toString(16).padStart(40, '0')}`,
        percentAllocation: 100 / 600,
      }),
    )
    expect(() =>
      validateSplitRecipients(manyRecipients, SPLITS_MAX_PRECISION_DECIMALS),
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
    expect(() => validateWaterfallTranches(tranches)).toThrow(
      InvalidArgumentError,
    )
  })

  test('Extra size fails', () => {
    tranches[2].size = 1
    expect(() => validateWaterfallTranches(tranches)).toThrow(
      InvalidArgumentError,
    )
  })

  test('Missing size fails', () => {
    tranches[1].size = undefined
    expect(() => validateWaterfallTranches(tranches)).toThrow(
      InvalidArgumentError,
    )
  })

  test('Valid tranches pass', () => {
    expect(() => validateWaterfallTranches(tranches)).not.toThrow()
  })
})

describe('Vesting period validation', () => {
  test('Negative period fails', () => {
    expect(() => validateVestingPeriod(-1)).toThrow(InvalidArgumentError)
  })

  test('Zero fails', () => {
    expect(() => validateVestingPeriod(0)).toThrow(InvalidArgumentError)
  })

  test('Valid period pass', () => {
    expect(() => validateVestingPeriod(1)).not.toThrow()
  })
})

describe('Recoup non waterfall recipient validation', () => {
  test('Setting address and index fails', () => {
    expect(() =>
      validateRecoupNonWaterfallRecipient(
        3,
        '0x25ED37D355DF14013d24d75508CB7344aBB59814',
        2,
      ),
    ).toThrow(InvalidArgumentError)
  })

  test('Setting invalid index fails', () => {
    expect(() =>
      validateRecoupNonWaterfallRecipient(
        3,
        '0x25ED37D355DF14013d24d75508CB7344aBB59814',
        3,
      ),
    ).toThrow(InvalidArgumentError)

    expect(() =>
      validateRecoupNonWaterfallRecipient(
        3,
        '0x25ED37D355DF14013d24d75508CB7344aBB59814',
        -1,
      ),
    ).toThrow(InvalidArgumentError)
  })

  test('Invalid address fails', () => {
    expect(() => validateRecoupNonWaterfallRecipient(3, '0xfake', 2)).toThrow(
      InvalidArgumentError,
    )
  })

  test('Valid address passes', () => {
    expect(() =>
      validateRecoupNonWaterfallRecipient(
        3,
        '0x25ED37D355DF14013d24d75508CB7344aBB59814',
        undefined,
      ),
    ).not.toThrow()

    expect(() =>
      validateRecoupNonWaterfallRecipient(3, zeroAddress, undefined),
    ).not.toThrow()
  })

  test('Valid index passes', () => {
    expect(() =>
      validateRecoupNonWaterfallRecipient(3, zeroAddress, 1),
    ).not.toThrow()
  })
})

describe('Diversifier recipient validation', () => {
  test('Only one recipient fails', () => {
    expect(() =>
      validateDiversifierRecipients([
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 50,
        },
      ]),
    ).toThrow(InvalidArgumentError)
  })

  test('Setting address and swapper params fails', () => {
    expect(() =>
      validateDiversifierRecipients([
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          swapperParams: {
            beneficiary: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
            tokenToBeneficiary: '0x0000000000000000000000000000000000000000',
            defaultScaledOfferFactorPercent: 1,
            scaledOfferFactorOverrides: [],
          },
          percentAllocation: 50,
        },
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 50,
        },
      ]),
    ).toThrow(InvalidArgumentError)
  })

  test('No address or swapper params fails', () => {
    expect(() =>
      validateDiversifierRecipients([
        {
          percentAllocation: 50,
        },
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 50,
        },
      ]),
    ).toThrow(InvalidArgumentError)
  })

  test('Invalid address fails', () => {
    expect(() =>
      validateDiversifierRecipients([
        {
          address: 'invalid address',
          percentAllocation: 50,
        },
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 50,
        },
      ]),
    ).toThrow(InvalidArgumentError)
  })

  test('Invalid swapper beneficiary or token fails', () => {
    expect(() =>
      validateDiversifierRecipients([
        {
          swapperParams: {
            beneficiary: 'invalid address',
            tokenToBeneficiary: '0x0000000000000000000000000000000000000000',
            defaultScaledOfferFactorPercent: 1,
            scaledOfferFactorOverrides: [],
          },
          percentAllocation: 50,
        },
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 50,
        },
      ]),
    ).toThrow(InvalidArgumentError)

    expect(() =>
      validateDiversifierRecipients([
        {
          swapperParams: {
            beneficiary: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
            tokenToBeneficiary: 'invalid token',
            defaultScaledOfferFactorPercent: 1,
            scaledOfferFactorOverrides: [],
          },
          percentAllocation: 50,
        },
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 50,
        },
      ]),
    ).toThrow(InvalidArgumentError)
  })

  test('Invalid percent allocation fails', () => {
    expect(() =>
      validateDiversifierRecipients([
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 0,
        },
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 50,
        },
      ]),
    ).toThrow(InvalidArgumentError)

    expect(() =>
      validateDiversifierRecipients([
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 100,
        },
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 50,
        },
      ]),
    ).toThrow(InvalidArgumentError)

    expect(() =>
      validateDiversifierRecipients([
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 50.00001,
        },
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 49.99999,
        },
      ]),
    ).toThrow(InvalidArgumentError)
  })

  test('Invalid total percent allocation fails', () => {
    expect(() =>
      validateDiversifierRecipients([
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 50,
        },
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 50.1,
        },
      ]),
    ).toThrow(InvalidArgumentError)
  })

  test('Valid recipients passes', () => {
    expect(() =>
      validateDiversifierRecipients([
        {
          address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          percentAllocation: 60,
        },
        {
          swapperParams: {
            beneficiary: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
            tokenToBeneficiary: '0x0000000000000000000000000000000000000000',
            defaultScaledOfferFactorPercent: 1,
            scaledOfferFactorOverrides: [],
          },
          percentAllocation: 40,
        },
      ]),
    ).not.toThrow()
  })
})

describe('oracle params validation', () => {
  test('Setting address and create params fails', () => {
    expect(() =>
      validateOracleParams({
        address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
        createOracleParams: {
          factory: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          data: 'oracle data',
        },
      }),
    ).toThrow(InvalidArgumentError)
  })

  test('Setting neither address nor create params fails', () => {
    expect(() => validateOracleParams({})).toThrow(InvalidArgumentError)
  })

  test('Invalid address fails', () => {
    expect(() => validateOracleParams({ address: 'bad address' })).toThrow(
      InvalidArgumentError,
    )
  })

  test('Invalid factory address fails', () => {
    expect(() =>
      validateOracleParams({
        createOracleParams: { factory: 'bad factory ', data: 'oracle data' },
      }),
    ).toThrow(InvalidArgumentError)
  })

  test('Valid address passes', () => {
    expect(() =>
      validateOracleParams({
        address: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
      }),
    ).not.toThrow()
  })

  test('Valid factory address passes', () => {
    expect(() =>
      validateOracleParams({
        createOracleParams: {
          factory: '0x25ED37D355DF14013d24d75508CB7344aBB59814',
          data: 'oracle data',
        },
      }),
    ).not.toThrow()
  })
})

describe('uni v3 swap inputs validation', () => {
  test('Empty input assets fails', () => {
    expect(() => validateUniV3SwapInputAssets([])).toThrow(InvalidArgumentError)
  })

  test('Invalid token fails', () => {
    expect(() =>
      validateUniV3SwapInputAssets([
        {
          encodedPath: '',
          token: 'bad token',
          amountIn: BigInt(1),
          amountOutMin: BigInt(1),
        },
      ]),
    )
  })

  test('Valid assets pass', () => {
    expect(() =>
      validateUniV3SwapInputAssets([
        {
          encodedPath: '',
          token: '0x0000000000000000000000000000000000000000',
          amountIn: BigInt(1),
          amountOutMin: BigInt(1),
        },
      ]),
    )
  })
})

describe('validate scaled offer factor', () => {
  test('Invalid scaled offer factor fails', () => {
    expect(() => validateScaledOfferFactor(100)).toThrow(InvalidArgumentError)
  })

  test('Max scaled offer factor fails without allow param', () => {
    expect(() => validateScaledOfferFactor(100)).toThrow(InvalidArgumentError)
    expect(() => validateScaledOfferFactor(100, true)).not.toThrow()
  })

  test('Valid scaled offer factor passes', () => {
    expect(() => validateScaledOfferFactor(1)).not.toThrow()

    expect(() => validateScaledOfferFactor(-1)).not.toThrow()
  })
})

// TODO: scale factor overrides validation test
