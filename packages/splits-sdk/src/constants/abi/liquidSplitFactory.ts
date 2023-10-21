export const liquidSplitFactoryAbi = [
  {
    inputs: [{ internalType: 'address', name: '_splitMain', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      { internalType: 'uint32', name: 'distributorFee', type: 'uint32' },
    ],
    name: 'InvalidLiquidSplit__InvalidDistributorFee',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'contract LS1155CloneImpl',
        name: 'ls',
        type: 'address',
      },
    ],
    name: 'CreateLS1155Clone',
    type: 'event',
  },
  {
    inputs: [],
    name: 'MAX_DISTRIBUTOR_FEE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'accounts', type: 'address[]' },
      { internalType: 'uint32[]', name: 'initAllocations', type: 'uint32[]' },
      { internalType: 'uint32', name: '_distributorFee', type: 'uint32' },
      { internalType: 'address', name: 'owner', type: 'address' },
    ],
    name: 'createLiquidSplitClone',
    outputs: [
      { internalType: 'contract LS1155CloneImpl', name: 'ls', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'ls1155CloneImpl',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
