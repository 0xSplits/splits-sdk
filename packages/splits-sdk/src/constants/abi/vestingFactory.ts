export const vestingFactoryAbi = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  { inputs: [], name: 'CreateFail', type: 'error' },
  { inputs: [], name: 'InvalidBeneficiary', type: 'error' },
  { inputs: [], name: 'InvalidVestingPeriod', type: 'error' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'vestingModule',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'beneficiary',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'vestingPeriod',
        type: 'uint256',
      },
    ],
    name: 'CreateVestingModule',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'address', name: 'beneficiary', type: 'address' },
      { internalType: 'uint256', name: 'vestingPeriod', type: 'uint256' },
    ],
    name: 'createVestingModule',
    outputs: [
      { internalType: 'contract VestingModule', name: 'vm', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'implementation',
    outputs: [
      { internalType: 'contract VestingModule', name: '', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'beneficiary', type: 'address' },
      { internalType: 'uint256', name: 'vestingPeriod', type: 'uint256' },
    ],
    name: 'predictVestingModuleAddress',
    outputs: [
      { internalType: 'address', name: 'predictedAddress', type: 'address' },
      { internalType: 'bool', name: 'exists', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const
