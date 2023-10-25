export const uniV3SwapAbi = [
  {
    inputs: [
      {
        internalType: 'contract SwapperFactory',
        name: 'swapperFactory_',
        type: 'address',
      },
      {
        internalType: 'contract ISwapRouter',
        name: 'swapRouter_',
        type: 'address',
      },
      { internalType: 'contract IWETH9', name: 'weth9_', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'InsufficientFunds', type: 'error' },
  { inputs: [], name: 'Unauthorized', type: 'error' },
  {
    inputs: [
      {
        internalType: 'contract SwapperImpl',
        name: 'swapper',
        type: 'address',
      },
      {
        components: [
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
            name: 'quoteParams',
            type: 'tuple[]',
          },
          {
            components: [
              {
                components: [
                  { internalType: 'bytes', name: 'path', type: 'bytes' },
                  {
                    internalType: 'address',
                    name: 'recipient',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'deadline',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'amountIn',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'amountOutMinimum',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct ISwapRouter.ExactInputParams[]',
                name: 'exactInputParams',
                type: 'tuple[]',
              },
              {
                internalType: 'address',
                name: 'excessRecipient',
                type: 'address',
              },
            ],
            internalType: 'struct UniV3Swap.FlashCallbackData',
            name: 'flashCallbackData',
            type: 'tuple',
          },
        ],
        internalType: 'struct UniV3Swap.InitFlashParams',
        name: 'params_',
        type: 'tuple',
      },
    ],
    name: 'initFlash',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'swapRouter',
    outputs: [
      { internalType: 'contract ISwapRouter', name: '', type: 'address' },
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
  {
    inputs: [
      { internalType: 'address', name: 'tokenToBeneficiary_', type: 'address' },
      {
        internalType: 'uint256',
        name: 'amountToBeneficiary_',
        type: 'uint256',
      },
      { internalType: 'bytes', name: 'data_', type: 'bytes' },
    ],
    name: 'swapperFlashCallback',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'weth9',
    outputs: [{ internalType: 'contract IWETH9', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  { stateMutability: 'payable', type: 'receive' },
] as const
