export const swapperAbi = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  { inputs: [], name: 'InsufficientFunds_FromTrader', type: 'error' },
  { inputs: [], name: 'InsufficientFunds_InContract', type: 'error' },
  { inputs: [], name: 'Invalid_AmountsToBeneficiary', type: 'error' },
  { inputs: [], name: 'Invalid_QuoteToken', type: 'error' },
  { inputs: [], name: 'Paused', type: 'error' },
  { inputs: [], name: 'Unauthorized', type: 'error' },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'to', type: 'address' },
          { internalType: 'uint256', name: 'value', type: 'uint256' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        indexed: false,
        internalType: 'struct WalletImpl.Call[]',
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'ExecCalls',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'beneficiary',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'trader',
        type: 'address',
      },
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
        indexed: false,
        internalType: 'struct QuoteParams[]',
        name: 'quoteParams',
        type: 'tuple[]',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'tokenToBeneficiary',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'amountsToBeneficiary',
        type: 'uint256[]',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'excessToBeneficiary',
        type: 'uint256',
      },
    ],
    name: 'Flash',
    type: 'event',
  },
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
        indexed: true,
        internalType: 'address',
        name: 'payer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Payback',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'ReceiveETH',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'beneficiary',
        type: 'address',
      },
    ],
    name: 'SetBeneficiary',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint32',
        name: 'defaultScaledOfferFactor',
        type: 'uint32',
      },
    ],
    name: 'SetDefaultScaledOfferFactor',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'contract IOracle',
        name: 'oracle',
        type: 'address',
      },
    ],
    name: 'SetOracle',
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
          { internalType: 'uint32', name: 'scaledOfferFactor', type: 'uint32' },
        ],
        indexed: false,
        internalType: 'struct SwapperImpl.SetPairScaledOfferFactorParams[]',
        name: 'params',
        type: 'tuple[]',
      },
    ],
    name: 'SetPairScaledOfferFactors',
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
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'tokenToBeneficiary',
        type: 'address',
      },
    ],
    name: 'SetTokenToBeneficiary',
    type: 'event',
  },
  {
    inputs: [],
    name: 'beneficiary',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'defaultScaledOfferFactor',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'to', type: 'address' },
          { internalType: 'uint256', name: 'value', type: 'uint256' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        internalType: 'struct WalletImpl.Call[]',
        name: 'calls_',
        type: 'tuple[]',
      },
    ],
    name: 'execCalls',
    outputs: [
      { internalType: 'uint256', name: 'blockNumber', type: 'uint256' },
      { internalType: 'bytes[]', name: 'returnData', type: 'bytes[]' },
    ],
    stateMutability: 'payable',
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
      { internalType: 'bytes', name: 'callbackData_', type: 'bytes' },
    ],
    name: 'flash',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
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
    name: 'getPairScaledOfferFactors',
    outputs: [
      {
        internalType: 'uint32[]',
        name: 'pairScaledOfferFactors',
        type: 'uint32[]',
      },
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
          { internalType: 'address', name: 'beneficiary', type: 'address' },
          {
            internalType: 'address',
            name: 'tokenToBeneficiary',
            type: 'address',
          },
          { internalType: 'contract IOracle', name: 'oracle', type: 'address' },
          {
            internalType: 'uint32',
            name: 'defaultScaledOfferFactor',
            type: 'uint32',
          },
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
                internalType: 'uint32',
                name: 'scaledOfferFactor',
                type: 'uint32',
              },
            ],
            internalType: 'struct SwapperImpl.SetPairScaledOfferFactorParams[]',
            name: 'pairScaledOfferFactors',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct SwapperImpl.InitParams',
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
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
      { internalType: 'bytes', name: '', type: 'bytes' },
    ],
    name: 'onERC1155BatchReceived',
    outputs: [{ internalType: 'bytes4', name: '', type: 'bytes4' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'bytes', name: '', type: 'bytes' },
    ],
    name: 'onERC1155Received',
    outputs: [{ internalType: 'bytes4', name: '', type: 'bytes4' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'bytes', name: '', type: 'bytes' },
    ],
    name: 'onERC721Received',
    outputs: [{ internalType: 'bytes4', name: '', type: 'bytes4' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'oracle',
    outputs: [{ internalType: 'contract IOracle', name: '', type: 'address' }],
    stateMutability: 'view',
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
    inputs: [],
    name: 'payback',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'beneficiary_', type: 'address' },
    ],
    name: 'setBeneficiary',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint32',
        name: 'defaultScaledOfferFactor_',
        type: 'uint32',
      },
    ],
    name: 'setDefaultScaledOfferFactor',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'contract IOracle', name: 'oracle_', type: 'address' },
    ],
    name: 'setOracle',
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
          { internalType: 'uint32', name: 'scaledOfferFactor', type: 'uint32' },
        ],
        internalType: 'struct SwapperImpl.SetPairScaledOfferFactorParams[]',
        name: 'params_',
        type: 'tuple[]',
      },
    ],
    name: 'setPairScaledOfferFactors',
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
    inputs: [
      { internalType: 'address', name: 'tokenToBeneficiary_', type: 'address' },
    ],
    name: 'setTokenToBeneficiary',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'swapperFactory',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenToBeneficiary',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner_', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const
