export const passThroughWalletFactoryAbi = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'contract PassThroughWalletImpl',
        name: 'passThroughWallet',
        type: 'address',
      },
      {
        components: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'bool', name: 'paused', type: 'bool' },
          { internalType: 'address', name: 'passThrough', type: 'address' },
        ],
        indexed: false,
        internalType: 'struct PassThroughWalletImpl.InitParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'CreatePassThroughWallet',
    type: 'event',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'bool', name: 'paused', type: 'bool' },
          { internalType: 'address', name: 'passThrough', type: 'address' },
        ],
        internalType: 'struct PassThroughWalletImpl.InitParams',
        name: 'params_',
        type: 'tuple',
      },
    ],
    name: 'createPassThroughWallet',
    outputs: [
      {
        internalType: 'contract PassThroughWalletImpl',
        name: 'passThroughWallet',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'passThroughWalletImpl',
    outputs: [
      {
        internalType: 'contract PassThroughWalletImpl',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const
