export const splitV2o2FactoryAbi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_splitsWarehouse',
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
        name: 'split',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'address[]',
            name: 'recipients',
            type: 'address[]',
          },
          {
            internalType: 'uint256[]',
            name: 'allocations',
            type: 'uint256[]',
          },
          {
            internalType: 'uint256',
            name: 'totalAllocation',
            type: 'uint256',
          },
          {
            internalType: 'uint16',
            name: 'distributionIncentive',
            type: 'uint16',
          },
        ],
        indexed: false,
        internalType: 'struct SplitV2Lib.Split',
        name: 'splitParams',
        type: 'tuple',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'creator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'salt',
        type: 'bytes32',
      },
    ],
    name: 'SplitCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'split',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'address[]',
            name: 'recipients',
            type: 'address[]',
          },
          {
            internalType: 'uint256[]',
            name: 'allocations',
            type: 'uint256[]',
          },
          {
            internalType: 'uint256',
            name: 'totalAllocation',
            type: 'uint256',
          },
          {
            internalType: 'uint16',
            name: 'distributionIncentive',
            type: 'uint16',
          },
        ],
        indexed: false,
        internalType: 'struct SplitV2Lib.Split',
        name: 'splitParams',
        type: 'tuple',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'creator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
    ],
    name: 'SplitCreated',
    type: 'event',
  },
  {
    inputs: [],
    name: 'SPLIT_WALLET_IMPLEMENTATION',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address[]',
            name: 'recipients',
            type: 'address[]',
          },
          {
            internalType: 'uint256[]',
            name: 'allocations',
            type: 'uint256[]',
          },
          {
            internalType: 'uint256',
            name: 'totalAllocation',
            type: 'uint256',
          },
          {
            internalType: 'uint16',
            name: 'distributionIncentive',
            type: 'uint16',
          },
        ],
        internalType: 'struct SplitV2Lib.Split',
        name: '_splitParams',
        type: 'tuple',
      },
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'address', name: '_creator', type: 'address' },
    ],
    name: 'createSplit',
    outputs: [{ internalType: 'address', name: 'split', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address[]',
            name: 'recipients',
            type: 'address[]',
          },
          {
            internalType: 'uint256[]',
            name: 'allocations',
            type: 'uint256[]',
          },
          {
            internalType: 'uint256',
            name: 'totalAllocation',
            type: 'uint256',
          },
          {
            internalType: 'uint16',
            name: 'distributionIncentive',
            type: 'uint16',
          },
        ],
        internalType: 'struct SplitV2Lib.Split',
        name: '_splitParams',
        type: 'tuple',
      },
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'address', name: '_creator', type: 'address' },
      { internalType: 'bytes32', name: '_salt', type: 'bytes32' },
    ],
    name: 'createSplitDeterministic',
    outputs: [{ internalType: 'address', name: 'split', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address[]',
            name: 'recipients',
            type: 'address[]',
          },
          {
            internalType: 'uint256[]',
            name: 'allocations',
            type: 'uint256[]',
          },
          {
            internalType: 'uint256',
            name: 'totalAllocation',
            type: 'uint256',
          },
          {
            internalType: 'uint16',
            name: 'distributionIncentive',
            type: 'uint16',
          },
        ],
        internalType: 'struct SplitV2Lib.Split',
        name: '_splitParams',
        type: 'tuple',
      },
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'bytes32', name: '_salt', type: 'bytes32' },
    ],
    name: 'isDeployed',
    outputs: [
      { internalType: 'address', name: 'split', type: 'address' },
      { internalType: 'bool', name: 'exists', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_hash', type: 'bytes32' }],
    name: 'nonces',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address[]',
            name: 'recipients',
            type: 'address[]',
          },
          {
            internalType: 'uint256[]',
            name: 'allocations',
            type: 'uint256[]',
          },
          {
            internalType: 'uint256',
            name: 'totalAllocation',
            type: 'uint256',
          },
          {
            internalType: 'uint16',
            name: 'distributionIncentive',
            type: 'uint16',
          },
        ],
        internalType: 'struct SplitV2Lib.Split',
        name: '_splitParams',
        type: 'tuple',
      },
      { internalType: 'address', name: '_owner', type: 'address' },
    ],
    name: 'predictDeterministicAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address[]',
            name: 'recipients',
            type: 'address[]',
          },
          {
            internalType: 'uint256[]',
            name: 'allocations',
            type: 'uint256[]',
          },
          {
            internalType: 'uint256',
            name: 'totalAllocation',
            type: 'uint256',
          },
          {
            internalType: 'uint16',
            name: 'distributionIncentive',
            type: 'uint16',
          },
        ],
        internalType: 'struct SplitV2Lib.Split',
        name: '_splitParams',
        type: 'tuple',
      },
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'bytes32', name: '_salt', type: 'bytes32' },
    ],
    name: 'predictDeterministicAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
