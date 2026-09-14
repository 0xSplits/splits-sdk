import {
  createPublicClient,
  custom,
  defineChain,
  encodeAbiParameters,
  encodeEventTopics,
  toHex,
  zeroAddress,
  zeroHash,
} from 'viem'
import {
  ChainId,
  getSplitV2FactoriesStartBlock,
  PUSH_SPLIT_V2o2_FACTORY_ADDRESS,
  splitV2UpdatedEvent,
} from '../constants'
import { splitV2o2FactoryAbi } from '../constants/abi/splitV2o2Factory'
import { searchLogs } from './requests'

test('finds Robinhood v2.2 updates using L2 logs instead of the stored L1 block number', async () => {
  const splitAddress = '0x1111111111111111111111111111111111111111'
  const blockNumber = BigInt(60866900)
  const split = {
    recipients: [zeroAddress],
    allocations: [BigInt(1)],
    totalAllocation: BigInt(1),
    distributionIncentive: 0,
  }
  const request = jest.fn().mockResolvedValue([
    {
      address: splitAddress,
      blockHash: zeroHash,
      blockNumber: toHex(blockNumber),
      transactionHash: zeroHash,
      transactionIndex: '0x0',
      logIndex: '0x0',
      removed: false,
      topics: encodeEventTopics({
        abi: [splitV2UpdatedEvent],
        eventName: 'SplitUpdated',
      }),
      data: encodeAbiParameters(splitV2UpdatedEvent.inputs, [split]),
    },
  ])
  const publicClient = createPublicClient({
    chain: defineChain({
      id: ChainId.ROBINHOOD,
      name: 'Robinhood Chain',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
      },
    }),
    transport: custom({ request }),
  })

  const { updateLog } = await searchLogs({
    formattedSplitAddress: splitAddress,
    publicClient,
    splitCreatedEvent: splitV2o2FactoryAbi[1],
    splitUpdatedEvent: splitV2UpdatedEvent,
    addresses: [splitAddress, PUSH_SPLIT_V2o2_FACTORY_ADDRESS],
    startBlock: getSplitV2FactoriesStartBlock(ChainId.ROBINHOOD),
    endBlock: blockNumber,
    defaultBlockRange: BigInt(100),
    splitV2Version: 'splitV2o2',
  })

  expect(updateLog).toMatchObject({ blockNumber, args: { _split: split } })
  expect(request).toHaveBeenCalledWith({
    method: 'eth_getLogs',
    params: [
      expect.objectContaining({
        fromBlock: toHex(60866871),
        toBlock: toHex(blockNumber),
      }),
    ],
  })
})
