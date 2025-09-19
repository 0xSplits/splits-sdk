export const universalSwapAbi = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
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
                  { internalType: 'address', name: 'to', type: 'address' },
                  { internalType: 'uint256', name: 'value', type: 'uint256' },
                  { internalType: 'bytes', name: 'data', type: 'bytes' },
                ],
                internalType: 'struct UniversalSwap.Call[]',
                name: 'calls',
                type: 'tuple[]',
              },
              {
                internalType: 'address',
                name: 'excessRecipient',
                type: 'address',
              },
            ],
            internalType: 'struct UniversalSwap.FlashCallbackData',
            name: 'flashCallbackData',
            type: 'tuple',
          },
        ],
        internalType: 'struct UniversalSwap.InitFlashParams',
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
  { stateMutability: 'payable', type: 'receive' },
] as const
