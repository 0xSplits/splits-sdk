import {
  Account,
  Address,
  Chain,
  PublicClient,
  Transport,
  WalletClient,
  createPublicClient,
  decodeEventLog,
  fromHex,
  http,
  parseEther,
  zeroAddress,
} from 'viem'
import { ChainId } from '../constants'
import {
  InvalidConfigError,
  MissingPublicClientError,
  MissingWalletClientError,
  UnsupportedChainIdError,
} from '../errors'
import { WarehouseClient } from './warehouse'
import { base, foundry, mainnet } from 'viem/chains'
import { warehouseAbi } from '../constants/abi/warehouse'
import { describe, expect, test, beforeEach } from 'vitest'
import { ALICE, BOB, CHARLIE, FORK_BLOCK_NUMBER } from '../testing/constants'
import { publicClient, walletClient } from '../testing/utils'

describe('Client config validation', () => {
  test('Including ens names with no provider fails', () => {
    expect(
      () => new WarehouseClient({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
  })

  test('Invalid chain id fails', () => {
    expect(() => new WarehouseClient({ chainId: 51 })).toThrow(
      UnsupportedChainIdError,
    )
  })

  test('Ethereum chain ids pass', () => {
    expect(
      () => new WarehouseClient({ chainId: ChainId.MAINNET }),
    ).not.toThrow()
    expect(
      () => new WarehouseClient({ chainId: ChainId.HOLESKY }),
    ).not.toThrow()
    expect(
      () => new WarehouseClient({ chainId: ChainId.SEPOLIA }),
    ).not.toThrow()
  })

  test('Polygon chain ids pass', () => {
    expect(
      () => new WarehouseClient({ chainId: ChainId.POLYGON }),
    ).not.toThrow()
  })

  test('Optimism chain ids pass', () => {
    expect(
      () => new WarehouseClient({ chainId: ChainId.OPTIMISM }),
    ).not.toThrow()
    expect(
      () => new WarehouseClient({ chainId: ChainId.OPTIMISM_SEPOLIA }),
    ).not.toThrow()
  })

  test('Arbitrum chain ids pass', () => {
    expect(
      () => new WarehouseClient({ chainId: ChainId.ARBITRUM }),
    ).not.toThrow()
  })

  test('Zora chain ids pass', () => {
    expect(() => new WarehouseClient({ chainId: ChainId.ZORA })).not.toThrow()
    expect(
      () => new WarehouseClient({ chainId: ChainId.ZORA_SEPOLIA }),
    ).not.toThrow()
  })

  test('Base chain ids pass', () => {
    expect(() => new WarehouseClient({ chainId: ChainId.BASE })).not.toThrow()
    expect(
      () => new WarehouseClient({ chainId: ChainId.BASE_SEPOLIA }),
    ).not.toThrow()
  })
})

const nativeTokenAddress: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

describe('Warehouse writes', () => {
  const createClient = (account: Address): WarehouseClient => {
    return new WarehouseClient({
      chainId: base.id,
      publicClient: publicClient as PublicClient<Transport, Chain>,
      walletClient: walletClient(account) as WalletClient<
        Transport,
        Chain,
        Account
      >,
    })
  }

  describe('Transfer', () => {
    const receiver = BOB

    beforeEach(() => {})

    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.transfer({
            receiver,
            token: nativeTokenAddress,
            amount: BigInt(0),
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const pubClient = createPublicClient({
        chain: mainnet,
        transport: http(),
      })
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: pubClient,
      })

      await expect(
        async () =>
          await badClient.transfer({
            receiver,
            token: nativeTokenAddress,
            amount: BigInt(0),
          }),
      ).rejects.toThrow(MissingWalletClientError)

      await expect(publicClient.getBlockNumber()).resolves.toBe(
        FORK_BLOCK_NUMBER,
      )
    })

    test('passes', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await client.deposit({
        receiver: sender,
        amount: parseEther('1'),
        token: nativeTokenAddress,
      })

      const { event } = await client.transfer({
        token: nativeTokenAddress,
        receiver,
        amount: parseEther('1'),
      })
      const decodedLog = decodeEventLog({
        abi: warehouseAbi,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('Transfer')
      if (decodedLog.eventName === 'Transfer') {
        expect(decodedLog.args.sender).toEqual(sender)
        expect(decodedLog.args.receiver).toEqual(receiver)
        expect(decodedLog.args.amount).toEqual(parseEther('1'))
        expect(decodedLog.args.id).toEqual(
          fromHex(nativeTokenAddress, 'bigint'),
        )
      }
    })
  })

  describe('Transfer from', () => {
    const sender = ALICE
    const receiver = BOB

    beforeEach(() => {})

    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.transferFrom({
            sender,
            receiver,
            token: nativeTokenAddress,
            amount: BigInt(0),
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.transferFrom({
            sender,
            receiver,
            token: nativeTokenAddress,
            amount: BigInt(0),
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const spender = CHARLIE
      let client = createClient(sender)

      await client.deposit({
        receiver: sender,
        token: nativeTokenAddress,
        amount: parseEther('1'),
      })

      await client.approve({
        spender,
        token: nativeTokenAddress,
        amount: parseEther('1'),
      })

      client = createClient(spender)

      const { event } = await client.transferFrom({
        token: nativeTokenAddress,
        sender,
        receiver,
        amount: parseEther('1'),
      })
      const decodedLog = decodeEventLog({
        abi: warehouseAbi,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('Transfer')
      if (decodedLog.eventName === 'Transfer') {
        expect(decodedLog.args.caller).toEqual(spender)
        expect(decodedLog.args.sender).toEqual(sender)
        expect(decodedLog.args.receiver).toEqual(receiver)
        expect(decodedLog.args.amount).toEqual(parseEther('1'))
        expect(decodedLog.args.id).toEqual(
          fromHex(nativeTokenAddress, 'bigint'),
        )
      }
    })
  })

  describe('Approve', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.approve({
            spender: ALICE,
            token: nativeTokenAddress,
            amount: BigInt(0),
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.approve({
            spender: ALICE,
            token: nativeTokenAddress,
            amount: BigInt(0),
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const spender = CHARLIE
      const caller = ALICE
      let client = createClient(caller)

      const { event } = await client.approve({
        spender,
        token: nativeTokenAddress,
        amount: parseEther('1'),
      })

      const decodedLog = decodeEventLog({
        abi: warehouseAbi,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('Approval')
      if (decodedLog.eventName === 'Approval') {
        expect(decodedLog.args.spender).toEqual(spender)
        expect(decodedLog.args.owner).toEqual(caller)
        expect(decodedLog.args.amount).toEqual(parseEther('1'))
        expect(decodedLog.args.id).toEqual(
          fromHex(nativeTokenAddress, 'bigint'),
        )
      }
    })
  })

  describe('Set Operator', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.setOperator({
            operator: ALICE,
            approved: true,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.setOperator({
            operator: ALICE,
            approved: true,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const operator = CHARLIE
      const owner = ALICE
      let client = createClient(owner)

      const { event } = await client.setOperator({
        operator,
        approved: true,
      })

      const decodedLog = decodeEventLog({
        abi: warehouseAbi,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('OperatorSet')
      if (decodedLog.eventName === 'OperatorSet') {
        expect(decodedLog.args.spender).toEqual(operator)
        expect(decodedLog.args.approved).toEqual(true)
      }
    })
  })

  describe('Invalidate Nonce', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.invalidateNonce({
            nonce: BigInt(0),
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.invalidateNonce({
            nonce: BigInt(0),
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const caller = ALICE
      let client = createClient(caller)

      const { event } = await client.invalidateNonce({
        nonce: BigInt(0),
      })

      const decodedLog = decodeEventLog({
        abi: warehouseAbi,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('NonceInvalidation')
      if (decodedLog.eventName === 'NonceInvalidation') {
        expect(decodedLog.args.owner).toEqual(caller)
        expect(decodedLog.args.nonce).toEqual(BigInt(0))
      }
    })
  })

  describe('Temporary approve and call', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.temporaryApproveAndCall({
            spender: ALICE,
            operator: false,
            token: nativeTokenAddress,
            amount: BigInt(0),
            target: ALICE,
            data: '0x0',
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.temporaryApproveAndCall({
            spender: ALICE,
            operator: false,
            token: nativeTokenAddress,
            amount: BigInt(0),
            target: ALICE,
            data: '0x0',
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    //TODO: test passes
    // test('passes', async () => {
    //   const spender = CHARLIE
    //   const caller = ALICE
    //   let client = createClient(caller)
    // })
  })

  describe('Temporary approve and call by sig', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.temporaryApproveAndCallBySig({
            owner: BOB,
            spender: ALICE,
            operator: false,
            token: nativeTokenAddress,
            amount: BigInt(0),
            target: ALICE,
            data: '0x0',
            nonce: BigInt(0),
            deadline: 1,
            signature: '0x0',
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.temporaryApproveAndCallBySig({
            owner: BOB,
            spender: ALICE,
            operator: false,
            token: nativeTokenAddress,
            amount: BigInt(0),
            target: ALICE,
            data: '0x0',
            nonce: BigInt(0),
            deadline: 1,
            signature: '0x0',
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    //TODO: test passes
    // test('passes', async () => {
    //   const spender = CHARLIE
    //   const caller = ALICE
    //   let client = createClient(caller)
    // })
  })

  describe('Approve by sig', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.approveBySig({
            owner: BOB,
            spender: ALICE,
            token: nativeTokenAddress,
            amount: BigInt(0),
            operator: false,
            deadline: 1,
            signature: '0x0',
            nonce: BigInt(0),
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.approveBySig({
            owner: BOB,
            spender: ALICE,
            token: nativeTokenAddress,
            amount: BigInt(0),
            operator: false,
            deadline: 1,
            signature: '0x0',
            nonce: BigInt(0),
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    // TODO: update this to work
    // test('passes', async () => {
    //   const spender = CHARLIE
    //   const owner = ALICE
    //   let client = createClient(owner)

    //   const config = await client.sign.approveBySig({
    //     spender,
    //     operator: false,
    //     token: nativeTokenAddress,
    //     amount: parseEther('1'),
    //     nonce: BigInt(0),
    //     deadline: Math.floor(Date.now() / 1000),
    //   })

    //   console.log(config)

    //   const { event } = await client.approveBySig(config)

    //   const decodedLog = decodeEventLog({
    //     abi: warehouseAbi,
    //     topics: event.topics,
    //     data: event.data,
    //   })

    //   expect(decodedLog.eventName).toEqual('Approval')
    //   if (decodedLog.eventName === 'Approval') {
    //     expect(decodedLog.args.spender).toEqual(spender)
    //     expect(decodedLog.args.owner).toEqual(owner)
    //     expect(decodedLog.args.amount).toEqual(parseEther('1'))
    //     expect(decodedLog.args.id).toEqual(
    //       fromHex(nativeTokenAddress, 'bigint'),
    //     )
    //   }
    // })
  })

  describe('Deposit', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.deposit({
            receiver: zeroAddress,
            token: nativeTokenAddress,
            amount: BigInt(0),
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.deposit({
            receiver: zeroAddress,
            token: nativeTokenAddress,
            amount: BigInt(0),
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const receiver = ALICE
      const amount = parseEther('1')
      let client = createClient(receiver)

      const { event } = await client.deposit({
        receiver,
        token: nativeTokenAddress,
        amount,
      })

      const decodedLog = decodeEventLog({
        abi: warehouseAbi,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('Transfer')
      if (decodedLog.eventName === 'Transfer') {
        expect(decodedLog.args.sender).toEqual(zeroAddress)
        expect(decodedLog.args.receiver).toEqual(receiver)
        expect(decodedLog.args.amount).toEqual(amount)
      }
    })
  })

  describe('Batch Deposit', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.batchDeposit({
            receivers: [zeroAddress],
            token: nativeTokenAddress,
            amounts: [BigInt(0)],
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.batchDeposit({
            receivers: [zeroAddress],
            token: nativeTokenAddress,
            amounts: [BigInt(0)],
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const caller = CHARLIE
      const receiver_1 = ALICE
      const receiver_2 = BOB

      const amount = parseEther('1')
      let client = createClient(caller)

      const receivers = [receiver_1, receiver_2]

      const { events } = await client.batchDeposit({
        receivers: receivers,
        token: nativeTokenAddress,
        amounts: [amount, amount],
      })

      events.map((event, i) => {
        const decodedLog = decodeEventLog({
          abi: warehouseAbi,
          topics: event.topics,
          data: event.data,
        })

        expect(decodedLog.eventName).toEqual('Transfer')
        if (decodedLog.eventName === 'Transfer') {
          expect(decodedLog.args.sender).toEqual(zeroAddress)
          expect(decodedLog.args.receiver).toEqual(receivers[i])
          expect(decodedLog.args.amount).toEqual(amount)
        }
      })
    })
  })

  describe('Withdraw', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.withdraw({
            owner: zeroAddress,
            token: nativeTokenAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.withdraw({
            owner: zeroAddress,
            token: nativeTokenAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const caller = CHARLIE
      const amount = parseEther('1')

      let client = createClient(caller)

      await client.deposit({
        receiver: caller,
        amount,
        token: nativeTokenAddress,
      })

      const { event } = await client.withdraw({
        owner: caller,
        token: nativeTokenAddress,
      })

      const decodedLog = decodeEventLog({
        abi: warehouseAbi,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('Withdraw')
      if (decodedLog.eventName === 'Withdraw') {
        expect(decodedLog.args.owner).toEqual(caller)
        expect(decodedLog.args.withdrawer).toEqual(caller)
        expect(decodedLog.args.amount).toEqual(amount - BigInt(1))
      }
    })
  })

  describe('Batch Withdraw', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.batchWithdraw({
            owner: zeroAddress,
            tokens: [nativeTokenAddress],
            amounts: [BigInt(0)],
            withdrawer: zeroAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.batchWithdraw({
            owner: zeroAddress,
            tokens: [nativeTokenAddress],
            amounts: [BigInt(0)],
            withdrawer: zeroAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const caller = CHARLIE
      const amount = parseEther('1')

      let client = createClient(caller)

      await client.deposit({
        receiver: caller,
        amount,
        token: nativeTokenAddress,
      })

      const { events } = await client.batchWithdraw({
        owner: caller,
        tokens: [nativeTokenAddress],
        amounts: [amount],
        withdrawer: ALICE,
      })

      events.map((event) => {
        const decodedLog = decodeEventLog({
          abi: warehouseAbi,
          topics: event.topics,
          data: event.data,
        })

        expect(decodedLog.eventName).toEqual('Withdraw')
        if (decodedLog.eventName === 'Withdraw') {
          expect(decodedLog.args.owner).toEqual(caller)
          expect(decodedLog.args.withdrawer).toEqual(ALICE)
          expect(decodedLog.args.amount).toEqual(amount)
        }
      })
    })
  })

  describe('Batch Transfer', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.batchTransfer({
            receivers: [zeroAddress],
            token: nativeTokenAddress,
            amounts: [BigInt(0)],
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.batchTransfer({
            receivers: [zeroAddress],
            token: nativeTokenAddress,
            amounts: [BigInt(0)],
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const caller = CHARLIE
      const amount = parseEther('1')

      let client = createClient(caller)

      await client.deposit({
        receiver: caller,
        amount,
        token: nativeTokenAddress,
      })

      const receivers = [ALICE, BOB]
      const amounts = [parseEther('0.5'), parseEther('0.5')]

      const { events } = await client.batchTransfer({
        receivers,
        token: nativeTokenAddress,
        amounts,
      })

      events.map((event, i) => {
        const decodedLog = decodeEventLog({
          abi: warehouseAbi,
          topics: event.topics,
          data: event.data,
        })

        expect(decodedLog.eventName).toEqual('Transfer')
        if (decodedLog.eventName === 'Transfer') {
          expect(decodedLog.args.sender).toEqual(caller)
          expect(decodedLog.args.receiver).toEqual(receivers[i])
          expect(decodedLog.args.amount).toEqual(amounts[i])
        }
      })
    })
  })

  describe('Set Withdraw Config', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.setWithdrawConfig({
            paused: false,
            incentive: 0,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        publicClient: createPublicClient({
          chain: foundry,
          transport: http(),
        }),
      })

      await expect(
        async () =>
          await badClient.setWithdrawConfig({
            paused: false,
            incentive: 0,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const caller = CHARLIE

      let client = createClient(caller)

      const { event } = await client.setWithdrawConfig({
        paused: false,
        incentive: 0,
      })

      const decodedLog = decodeEventLog({
        abi: warehouseAbi,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('WithdrawConfigUpdated')
      if (decodedLog.eventName === 'WithdrawConfigUpdated') {
        expect(decodedLog.args.owner).toEqual(caller)
        expect(decodedLog.args.config.incentive).toEqual(0)
        expect(decodedLog.args.config.paused).toEqual(false)
      }
    })
  })
})

describe('Warehouse reads', () => {
  const createClient = (): WarehouseClient => {
    return new WarehouseClient({
      chainId: base.id,
      publicClient: publicClient as PublicClient<Transport, Chain>,
    })
  }

  describe('Get Name', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getName({
            tokenAddress: nativeTokenAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      let client = createClient()

      const { name } = await client.getName({
        tokenAddress: nativeTokenAddress,
      })

      expect(name).toEqual('Splits Wrapped Ether')
    })
  })

  describe('Get Symbol', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getSymbol({
            tokenAddress: nativeTokenAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      let client = createClient()

      const { symbol } = await client.getSymbol({
        tokenAddress: nativeTokenAddress,
      })

      expect(symbol).toEqual('splitsETH')
    })
  })

  describe('Get decimals', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getDecimals({
            tokenAddress: nativeTokenAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      let client = createClient()

      const { decimals } = await client.getDecimals({
        tokenAddress: nativeTokenAddress,
      })

      expect(decimals).toEqual(18)
    })
  })

  describe('Get withdraw config', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.getWithdrawConfig({
            userAddress: zeroAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      let client = createClient()

      const { withdrawConfig } = await client.getWithdrawConfig({
        userAddress: ALICE,
      })

      expect(withdrawConfig.incentive).toEqual(0)
      expect(withdrawConfig.paused).toEqual(false)
    })
  })

  describe('Check if nonce is valid', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.isValidNonce({
            userAddress: zeroAddress,
            userNonce: BigInt(0),
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      let client = createClient()

      const { isValidNonce } = await client.isValidNonce({
        userAddress: ALICE,
        userNonce: BigInt(0),
      })

      expect(isValidNonce).toEqual(true)
    })
  })

  describe('Get domain', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(async () => await badClient.eip712Domain()).rejects.toThrow(
        MissingPublicClientError,
      )
    })

    test('passes', async () => {
      let client = createClient()

      const { domain } = await client.eip712Domain()

      expect(domain.chainId).toEqual(client._chainId)
    })
  })

  describe('Check if spender is operator', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.isOperator({
            operatorAddress: ALICE,
            ownerAddress: ALICE,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      let client = createClient()

      const { isOperator } = await client.isOperator({
        operatorAddress: ALICE,
        ownerAddress: BOB,
      })

      expect(isOperator).toEqual(false)
    })
  })

  describe('Get balance', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.balanceOf({
            ownerAddress: zeroAddress,
            tokenAddress: zeroAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      let client = createClient()

      const { balance } = await client.balanceOf({
        ownerAddress: ALICE,
        tokenAddress: nativeTokenAddress,
      })

      expect(balance).toEqual(BigInt(0))
    })

    describe('Get allowance', () => {
      test('fails with no provider', async () => {
        const badClient = new WarehouseClient({
          chainId: 1,
        })

        await expect(
          async () =>
            await badClient.allowance({
              ownerAddress: zeroAddress,
              spenderAddress: zeroAddress,
              tokenAddress: zeroAddress,
            }),
        ).rejects.toThrow(MissingPublicClientError)
      })

      test('passes', async () => {
        let client = createClient()

        const { allowance } = await client.allowance({
          ownerAddress: ALICE,
          spenderAddress: BOB,
          tokenAddress: nativeTokenAddress,
        })

        expect(allowance).toEqual(BigInt(0))
      })
    })
  })
})
