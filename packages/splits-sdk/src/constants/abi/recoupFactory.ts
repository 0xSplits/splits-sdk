export const recoupFactoryAbi = [
  {
    inputs: [
      { internalType: 'address', name: '_splitMain', type: 'address' },
      {
        internalType: 'address',
        name: '_waterfallModuleFactory',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'InvalidRecoup__NonWaterfallRecipientSetTwice',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidRecoup__NonWaterfallRecipientTrancheIndexTooLarge',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'index', type: 'uint256' },
      { internalType: 'uint32', name: 'percentAllocation', type: 'uint32' },
    ],
    name: 'InvalidRecoup__SingleAddressPercentAllocation',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'InvalidRecoup__TooFewAccounts',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'InvalidRecoup__TrancheAccountsAndPercentAllocationsMismatch',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'waterfallModule',
        type: 'address',
      },
    ],
    name: 'CreateRecoup',
    type: 'event',
  },
  {
    inputs: [],
    name: 'PERCENTAGE_SCALE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      {
        internalType: 'address',
        name: 'nonWaterfallRecipientAddress',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'nonWaterfallRecipientTrancheIndex',
        type: 'uint256',
      },
      {
        components: [
          { internalType: 'address[]', name: 'recipients', type: 'address[]' },
          {
            internalType: 'uint32[]',
            name: 'percentAllocations',
            type: 'uint32[]',
          },
          { internalType: 'address', name: 'controller', type: 'address' },
          { internalType: 'uint32', name: 'distributorFee', type: 'uint32' },
        ],
        internalType: 'struct Recoup.Tranche[]',
        name: 'tranches',
        type: 'tuple[]',
      },
      { internalType: 'uint256[]', name: 'thresholds', type: 'uint256[]' },
    ],
    name: 'createRecoup',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'splitMain',
    outputs: [
      { internalType: 'contract ISplitMain', name: '', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'waterfallModuleFactory',
    outputs: [
      {
        internalType: 'contract IWaterfallModuleFactory',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const
