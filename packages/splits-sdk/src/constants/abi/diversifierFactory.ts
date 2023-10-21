export const diversifierFactoryAbi = [
  {
    inputs: [
      {
        internalType: 'contract ISplitMain',
        name: 'splitMain_',
        type: 'address',
      },
      {
        internalType: 'contract SwapperFactory',
        name: 'swapperFactory_',
        type: 'address',
      },
      {
        internalType: 'contract PassThroughWalletFactory',
        name: 'passThroughWalletFactory_',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'diversifier',
        type: 'address',
      },
    ],
    name: 'CreateDiversifier',
    type: 'event',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'bool', name: 'paused', type: 'bool' },
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
            components: [
              { internalType: 'address', name: 'account', type: 'address' },
              {
                components: [
                  {
                    internalType: 'address',
                    name: 'beneficiary',
                    type: 'address',
                  },
                  {
                    internalType: 'address',
                    name: 'tokenToBeneficiary',
                    type: 'address',
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
                          {
                            internalType: 'address',
                            name: 'base',
                            type: 'address',
                          },
                          {
                            internalType: 'address',
                            name: 'quote',
                            type: 'address',
                          },
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
                    internalType:
                      'struct SwapperImpl.SetPairScaledOfferFactorParams[]',
                    name: 'pairScaledOfferFactors',
                    type: 'tuple[]',
                  },
                ],
                internalType: 'struct DiversifierFactory.CreateSwapperParams',
                name: 'createSwapperParams',
                type: 'tuple',
              },
              {
                internalType: 'uint32',
                name: 'percentAllocation',
                type: 'uint32',
              },
            ],
            internalType: 'struct DiversifierFactory.RecipientParams[]',
            name: 'recipientParams',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct DiversifierFactory.CreateDiversifierParams',
        name: 'params_',
        type: 'tuple',
      },
    ],
    name: 'createDiversifier',
    outputs: [
      { internalType: 'address', name: 'diversifier', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'passThroughWalletFactory',
    outputs: [
      {
        internalType: 'contract PassThroughWalletFactory',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
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
    name: 'swapperFactory',
    outputs: [
      { internalType: 'contract SwapperFactory', name: '', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const
