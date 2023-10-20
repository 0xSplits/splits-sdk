export const waterfallFactoryAbi = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  {
    inputs: [],
    name: 'InvalidWaterfall__RecipientsAndThresholdsLengthMismatch',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'InvalidWaterfall__ThresholdTooLarge',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'InvalidWaterfall__ThresholdsOutOfOrder',
    type: 'error',
  },
  { inputs: [], name: 'InvalidWaterfall__TooFewRecipients', type: 'error' },
  { inputs: [], name: 'InvalidWaterfall__ZeroThreshold', type: 'error' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'waterfallModule',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'nonWaterfallRecipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'recipients',
        type: 'address[]',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'thresholds',
        type: 'uint256[]',
      },
    ],
    name: 'CreateWaterfallModule',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      {
        internalType: 'address',
        name: 'nonWaterfallRecipient',
        type: 'address',
      },
      { internalType: 'address[]', name: 'recipients', type: 'address[]' },
      { internalType: 'uint256[]', name: 'thresholds', type: 'uint256[]' },
    ],
    name: 'createWaterfallModule',
    outputs: [
      { internalType: 'contract WaterfallModule', name: 'wm', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'wmImpl',
    outputs: [
      { internalType: 'contract WaterfallModule', name: '', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const
