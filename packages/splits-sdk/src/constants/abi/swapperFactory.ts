export const swapperFactoryAbi = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'contract SwapperImpl',
        name: 'swapper',
        type: 'address',
      },
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
        indexed: false,
        internalType: 'struct SwapperImpl.InitParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'CreateSwapper',
    type: 'event',
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
          {
            components: [
              {
                internalType: 'contract IOracle',
                name: 'oracle',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'contract IOracleFactory',
                    name: 'factory',
                    type: 'address',
                  },
                  { internalType: 'bytes', name: 'data', type: 'bytes' },
                ],
                internalType: 'struct CreateOracleParams',
                name: 'createOracleParams',
                type: 'tuple',
              },
            ],
            internalType: 'struct OracleParams',
            name: 'oracleParams',
            type: 'tuple',
          },
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
        internalType: 'struct SwapperFactory.CreateSwapperParams',
        name: 'params_',
        type: 'tuple',
      },
    ],
    name: 'createSwapper',
    outputs: [
      {
        internalType: 'contract SwapperImpl',
        name: 'swapper',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'swapperImpl',
    outputs: [
      { internalType: 'contract SwapperImpl', name: '', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const
