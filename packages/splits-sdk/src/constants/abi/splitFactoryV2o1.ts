export const splitFactoryV2o1Abi = [
  {
    type: 'function',
    name: 'SPLIT_WALLET_IMPLEMENTATION',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'createSplit',
    inputs: [
      {
        name: '_splitParams',
        type: 'tuple',
        internalType: 'struct SplitV2Lib.Split',
        components: [
          {
            name: 'recipients',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'allocations',
            type: 'uint256[]',
            internalType: 'uint256[]',
          },
          {
            name: 'totalAllocation',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'distributionIncentive',
            type: 'uint16',
            internalType: 'uint16',
          },
        ],
      },
      { name: '_owner', type: 'address', internalType: 'address' },
      { name: '_creator', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: 'split', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createSplitDeterministic',
    inputs: [
      {
        name: '_splitParams',
        type: 'tuple',
        internalType: 'struct SplitV2Lib.Split',
        components: [
          {
            name: 'recipients',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'allocations',
            type: 'uint256[]',
            internalType: 'uint256[]',
          },
          {
            name: 'totalAllocation',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'distributionIncentive',
            type: 'uint16',
            internalType: 'uint16',
          },
        ],
      },
      { name: '_owner', type: 'address', internalType: 'address' },
      { name: '_creator', type: 'address', internalType: 'address' },
      { name: '_salt', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [{ name: 'split', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isDeployed',
    inputs: [
      {
        name: '_splitParams',
        type: 'tuple',
        internalType: 'struct SplitV2Lib.Split',
        components: [
          {
            name: 'recipients',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'allocations',
            type: 'uint256[]',
            internalType: 'uint256[]',
          },
          {
            name: 'totalAllocation',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'distributionIncentive',
            type: 'uint16',
            internalType: 'uint16',
          },
        ],
      },
      { name: '_owner', type: 'address', internalType: 'address' },
      { name: '_salt', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [
      { name: 'split', type: 'address', internalType: 'address' },
      { name: 'exists', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nonces',
    inputs: [{ name: '_hash', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'predictDeterministicAddress',
    inputs: [
      {
        name: '_splitParams',
        type: 'tuple',
        internalType: 'struct SplitV2Lib.Split',
        components: [
          {
            name: 'recipients',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'allocations',
            type: 'uint256[]',
            internalType: 'uint256[]',
          },
          {
            name: 'totalAllocation',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'distributionIncentive',
            type: 'uint16',
            internalType: 'uint16',
          },
        ],
      },
      { name: '_owner', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'predictDeterministicAddress',
    inputs: [
      {
        name: '_splitParams',
        type: 'tuple',
        internalType: 'struct SplitV2Lib.Split',
        components: [
          {
            name: 'recipients',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'allocations',
            type: 'uint256[]',
            internalType: 'uint256[]',
          },
          {
            name: 'totalAllocation',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'distributionIncentive',
            type: 'uint16',
            internalType: 'uint16',
          },
        ],
      },
      { name: '_owner', type: 'address', internalType: 'address' },
      { name: '_salt', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'SplitCreated',
    inputs: [
      {
        name: 'split',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'splitParams',
        type: 'tuple',
        indexed: false,
        internalType: 'struct SplitV2Lib.Split',
        components: [
          {
            name: 'recipients',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'allocations',
            type: 'uint256[]',
            internalType: 'uint256[]',
          },
          {
            name: 'totalAllocation',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'distributionIncentive',
            type: 'uint16',
            internalType: 'uint16',
          },
        ],
      },
      {
        name: 'owner',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'creator',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'salt',
        type: 'bytes32',
        indexed: false,
        internalType: 'bytes32',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SplitCreated',
    inputs: [
      {
        name: 'split',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'splitParams',
        type: 'tuple',
        indexed: false,
        internalType: 'struct SplitV2Lib.Split',
        components: [
          {
            name: 'recipients',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'allocations',
            type: 'uint256[]',
            internalType: 'uint256[]',
          },
          {
            name: 'totalAllocation',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'distributionIncentive',
            type: 'uint16',
            internalType: 'uint16',
          },
        ],
      },
      {
        name: 'owner',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'creator',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
] as const
