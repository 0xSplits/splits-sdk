export const uniV3OracleAbi = [
  {
    inputs: [{ internalType: 'address', name: 'weth9_', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'InvalidPair_PoolNotSet', type: 'error' },
  { inputs: [], name: 'Paused', type: 'error' },
  { inputs: [], name: 'T', type: 'error' },
  { inputs: [], name: 'Unauthorized', type: 'error' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'oldOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint32',
        name: 'defaultPeriod',
        type: 'uint32',
      },
    ],
    name: 'SetDefaultPeriod',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'base', type: 'address' },
              { internalType: 'address', name: 'quote', type: 'address' },
            ],
            internalType: 'struct QuotePair',
            name: 'quotePair',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'address', name: 'pool', type: 'address' },
              { internalType: 'uint32', name: 'period', type: 'uint32' },
            ],
            internalType: 'struct UniV3OracleImpl.PairDetail',
            name: 'pairDetail',
            type: 'tuple',
          },
        ],
        indexed: false,
        internalType: 'struct UniV3OracleImpl.SetPairDetailParams[]',
        name: 'params',
        type: 'tuple[]',
      },
    ],
    name: 'SetPairDetails',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bool', name: 'paused', type: 'bool' },
    ],
    name: 'SetPaused',
    type: 'event',
  },
  {
    inputs: [],
    name: 'defaultPeriod',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'base', type: 'address' },
          { internalType: 'address', name: 'quote', type: 'address' },
        ],
        internalType: 'struct QuotePair[]',
        name: 'quotePairs_',
        type: 'tuple[]',
      },
    ],
    name: 'getPairDetails',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'pool', type: 'address' },
          { internalType: 'uint32', name: 'period', type: 'uint32' },
        ],
        internalType: 'struct UniV3OracleImpl.PairDetail[]',
        name: 'pairDetails',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'base', type: 'address' },
              { internalType: 'address', name: 'quote', type: 'address' },
            ],
            internalType: 'struct QuotePair',
            name: 'quotePair',
            type: 'tuple',
          },
          { internalType: 'uint128', name: 'baseAmount', type: 'uint128' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        internalType: 'struct QuoteParams[]',
        name: 'quoteParams_',
        type: 'tuple[]',
      },
    ],
    name: 'getQuoteAmounts',
    outputs: [
      { internalType: 'uint256[]', name: 'quoteAmounts', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'bool', name: 'paused', type: 'bool' },
          { internalType: 'uint32', name: 'defaultPeriod', type: 'uint32' },
          {
            components: [
              {
                components: [
                  { internalType: 'address', name: 'base', type: 'address' },
                  { internalType: 'address', name: 'quote', type: 'address' },
                ],
                internalType: 'struct QuotePair',
                name: 'quotePair',
                type: 'tuple',
              },
              {
                components: [
                  { internalType: 'address', name: 'pool', type: 'address' },
                  { internalType: 'uint32', name: 'period', type: 'uint32' },
                ],
                internalType: 'struct UniV3OracleImpl.PairDetail',
                name: 'pairDetail',
                type: 'tuple',
              },
            ],
            internalType: 'struct UniV3OracleImpl.SetPairDetailParams[]',
            name: 'pairDetails',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct UniV3OracleImpl.InitParams',
        name: 'params_',
        type: 'tuple',
      },
    ],
    name: 'initializer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint32', name: 'defaultPeriod_', type: 'uint32' },
    ],
    name: 'setDefaultPeriod',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'base', type: 'address' },
              { internalType: 'address', name: 'quote', type: 'address' },
            ],
            internalType: 'struct QuotePair',
            name: 'quotePair',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'address', name: 'pool', type: 'address' },
              { internalType: 'uint32', name: 'period', type: 'uint32' },
            ],
            internalType: 'struct UniV3OracleImpl.PairDetail',
            name: 'pairDetail',
            type: 'tuple',
          },
        ],
        internalType: 'struct UniV3OracleImpl.SetPairDetailParams[]',
        name: 'params_',
        type: 'tuple[]',
      },
    ],
    name: 'setPairDetails',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bool', name: 'paused_', type: 'bool' }],
    name: 'setPaused',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner_', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'uniV3OracleFactory',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'weth9',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
