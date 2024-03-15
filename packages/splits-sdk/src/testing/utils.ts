import {
  type Chain,
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
  Address,
} from 'viem'
import { base } from 'viem/chains'
import { ALICE } from './constants'

/**
 * The id of the current test worker.
 *
 * This is used by the anvil proxy to route requests to the correct anvil instance.
 */
export const pool = Number(process.env.VITEST_POOL_ID ?? 1)
export const anvil = {
  ...base,
  rpcUrls: {
    default: {
      http: [`http://127.0.0.1:8545/${pool}`],
      webSocket: [`ws://127.0.0.1:8545/${pool}`],
    },
    public: {
      http: [`http://127.0.0.1:8545/${pool}`],
      webSocket: [`ws://127.0.0.1:8545/${pool}`],
    },
  },
} as const satisfies Chain

export const testClient = createTestClient({
  chain: anvil,
  mode: 'anvil',
  transport: http(),
})

export const publicClient = createPublicClient({
  chain: anvil,
  transport: http(),
})

export const walletClient = (account: Address) => {
  return createWalletClient({
    chain: anvil,
    transport: http(),
    account,
  })
}
