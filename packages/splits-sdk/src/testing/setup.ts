import { FORK_BLOCK_NUMBER, FORK_URL } from './constants.js'
import { pool, testClient } from './utils.js'
import { fetchLogs } from '@viem/anvil'
import { afterEach } from 'vitest'

afterEach(async () => {
  await testClient.reset({
    jsonRpcUrl: FORK_URL,
    blockNumber: BigInt(FORK_BLOCK_NUMBER),
  })
})

afterEach(async (context) => {
  context.onTestFailed(async () => {
    const logs = await fetchLogs('http://localhost:8545', pool)
    // eslint-disable-next-line no-console
    console.log(...logs.slice(-20))
  })
})
