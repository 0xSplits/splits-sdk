export const splitV2o1Abi = [
  {
    type: 'function',
    name: 'FACTORY',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'NATIVE_TOKEN',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'SPLITS_WAREHOUSE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract ISplitsWarehouse',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'distribute',
    inputs: [
      {
        name: '_split',
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
      { name: '_token', type: 'address', internalType: 'address' },
      { name: '_distributor', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'distribute',
    inputs: [
      {
        name: '_split',
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
      { name: '_token', type: 'address', internalType: 'address' },
      {
        name: '_distributeAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_performWarehouseTransfer',
        type: 'bool',
        internalType: 'bool',
      },
      { name: '_distributor', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'eip712Domain',
    inputs: [],
    outputs: [
      { name: 'fields', type: 'bytes1', internalType: 'bytes1' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'version', type: 'string', internalType: 'string' },
      { name: 'chainId', type: 'uint256', internalType: 'uint256' },
      {
        name: 'verifyingContract',
        type: 'address',
        internalType: 'address',
      },
      { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
      {
        name: 'extensions',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'execCalls',
    inputs: [
      {
        name: '_calls',
        type: 'tuple[]',
        internalType: 'struct Wallet.Call[]',
        components: [
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'value', type: 'uint256', internalType: 'uint256' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [
      { name: 'blockNumber', type: 'uint256', internalType: 'uint256' },
      { name: 'returnData', type: 'bytes[]', internalType: 'bytes[]' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'getSplitBalance',
    inputs: [{ name: '_token', type: 'address', internalType: 'address' }],
    outputs: [
      {
        name: 'splitBalance',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'warehouseBalance',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'initialize',
    inputs: [
      {
        name: '_split',
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
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isValidSignature',
    inputs: [
      { name: 'hash', type: 'bytes32', internalType: 'bytes32' },
      { name: 'signature', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: 'result', type: 'bytes4', internalType: 'bytes4' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'onERC1155BatchReceived',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'uint256[]', internalType: 'uint256[]' },
      { name: '', type: 'uint256[]', internalType: 'uint256[]' },
      { name: '', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bytes4', internalType: 'bytes4' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'onERC1155Received',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bytes4', internalType: 'bytes4' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'onERC721Received',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bytes4', internalType: 'bytes4' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'replaySafeHash',
    inputs: [{ name: 'hash', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'setPaused',
    inputs: [{ name: '_paused', type: 'bool', internalType: 'bool' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'splitHash',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [{ name: 'interfaceId', type: 'bytes4', internalType: 'bytes4' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [{ name: '_owner', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateBlockNumber',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'updateSplit',
    inputs: [
      {
        name: '_split',
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
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'EIP712DomainChanged',
    inputs: [],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ExecCalls',
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        indexed: false,
        internalType: 'struct Wallet.Call[]',
        components: [
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'value', type: 'uint256', internalType: 'uint256' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'oldOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SetPaused',
    inputs: [
      {
        name: 'paused',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SplitDistributed',
    inputs: [
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'distributor',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SplitUpdated',
    inputs: [
      {
        name: '_split',
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
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'InvalidCalldataForEOA',
    inputs: [
      {
        name: 'call',
        type: 'tuple',
        internalType: 'struct Wallet.Call',
        components: [
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'value', type: 'uint256', internalType: 'uint256' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
  },
  { type: 'error', name: 'InvalidShortString', inputs: [] },
  { type: 'error', name: 'InvalidSplit', inputs: [] },
  { type: 'error', name: 'InvalidSplit_LengthMismatch', inputs: [] },
  {
    type: 'error',
    name: 'InvalidSplit_TotalAllocationMismatch',
    inputs: [],
  },
  { type: 'error', name: 'Paused', inputs: [] },
  {
    type: 'error',
    name: 'StringTooLong',
    inputs: [{ name: 'str', type: 'string', internalType: 'string' }],
  },
  { type: 'error', name: 'Unauthorized', inputs: [] },
  { type: 'error', name: 'UnauthorizedInitializer', inputs: [] },
] as const
