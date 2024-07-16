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
import {
  InvalidConfigError,
  MissingPublicClientError,
  MissingWalletClientError,
} from '../errors'
import { WarehouseClient } from './warehouse'
import { base, foundry, mainnet } from 'viem/chains'
import { warehouseAbi } from '../constants/abi/warehouse'
import { describe, expect, test, beforeEach } from 'vitest'
import {
  ALICE,
  BOB,
  CHARLIE,
  FORK_BLOCK_NUMBER,
} from '../testing/vitest/constants'
import { publicClient, walletClient } from '../testing/utils'

describe('Client config validation', () => {
  test('Including ens names with no provider fails', () => {
    expect(
      () => new WarehouseClient({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
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
    const receiverAddress = BOB

    beforeEach(() => {})

    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.transfer({
            receiverAddress,
            tokenAddress: nativeTokenAddress,
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
            receiverAddress,
            tokenAddress: nativeTokenAddress,
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
        receiverAddress: sender,
        amount: parseEther('1'),
        tokenAddress: nativeTokenAddress,
      })

      const { event } = await client.transfer({
        tokenAddress: nativeTokenAddress,
        receiverAddress: receiverAddress,
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
        expect(decodedLog.args.receiver).toEqual(receiverAddress)
        expect(decodedLog.args.amount).toEqual(parseEther('1'))
        expect(decodedLog.args.id).toEqual(
          fromHex(nativeTokenAddress, 'bigint'),
        )
      }
    })
  })

  describe('Transfer from', () => {
    const senderAddress = ALICE
    const receiverAddress = BOB

    beforeEach(() => {})

    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.transferFrom({
            senderAddress,
            receiverAddress,
            tokenAddress: nativeTokenAddress,
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
            senderAddress,
            receiverAddress,
            tokenAddress: nativeTokenAddress,
            amount: BigInt(0),
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const spender = CHARLIE
      let client = createClient(senderAddress)

      await client.deposit({
        receiverAddress: senderAddress,
        tokenAddress: nativeTokenAddress,
        amount: parseEther('1'),
      })

      await client.approve({
        spenderAddress: spender,
        tokenAddress: nativeTokenAddress,
        amount: parseEther('1'),
      })

      client = createClient(spender)

      const { event } = await client.transferFrom({
        tokenAddress: nativeTokenAddress,
        senderAddress,
        receiverAddress,
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
        expect(decodedLog.args.sender).toEqual(senderAddress)
        expect(decodedLog.args.receiver).toEqual(receiverAddress)
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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.approve({
            spenderAddress: ALICE,
            tokenAddress: nativeTokenAddress,
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
            spenderAddress: ALICE,
            tokenAddress: nativeTokenAddress,
            amount: BigInt(0),
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const spender = CHARLIE
      const caller = ALICE
      const client = createClient(caller)

      const { event } = await client.approve({
        spenderAddress: spender,
        tokenAddress: nativeTokenAddress,
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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.setOperator({
            operatorAddress: ALICE,
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
            operatorAddress: ALICE,
            approved: true,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const operator = CHARLIE
      const owner = ALICE
      const client = createClient(owner)

      const { event } = await client.setOperator({
        operatorAddress: operator,
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
        walletClient: walletClient(ALICE),
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
      const client = createClient(caller)

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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.temporaryApproveAndCall({
            spenderAddress: ALICE,
            operator: false,
            tokenAddress: nativeTokenAddress,
            amount: BigInt(0),
            targetAddress: ALICE,
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
            spenderAddress: ALICE,
            operator: false,
            tokenAddress: nativeTokenAddress,
            amount: BigInt(0),
            targetAddress: ALICE,
            data: '0x0',
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    //TODO: test passes
    // test('passes', async () => {
    //   const spender = CHARLIE
    //   const caller = ALICE
    //   const client = createClient(caller)
    // })
  })

  describe('Temporary approve and call by sig', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.temporaryApproveAndCallBySig({
            ownerAddress: BOB,
            spenderAddress: ALICE,
            operator: false,
            tokenAddress: nativeTokenAddress,
            amount: BigInt(0),
            targetAddress: ALICE,
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
            ownerAddress: BOB,
            spenderAddress: ALICE,
            operator: false,
            tokenAddress: nativeTokenAddress,
            amount: BigInt(0),
            targetAddress: ALICE,
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
    //   const client = createClient(caller)
    // })
  })

  describe('Approve by sig', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.approveBySig({
            ownerAddress: BOB,
            spenderAddress: ALICE,
            tokenAddress: nativeTokenAddress,
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
            ownerAddress: BOB,
            spenderAddress: ALICE,
            tokenAddress: nativeTokenAddress,
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
    //   const client = createClient(owner)

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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.deposit({
            receiverAddress: zeroAddress,
            tokenAddress: nativeTokenAddress,
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
            receiverAddress: zeroAddress,
            tokenAddress: nativeTokenAddress,
            amount: BigInt(0),
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const receiver = ALICE
      const amount = parseEther('1')
      const client = createClient(receiver)

      const { event } = await client.deposit({
        receiverAddress: receiver,
        tokenAddress: nativeTokenAddress,
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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.batchDeposit({
            receiversAddresses: [zeroAddress],
            tokenAddress: nativeTokenAddress,
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
            receiversAddresses: [zeroAddress],
            tokenAddress: nativeTokenAddress,
            amounts: [BigInt(0)],
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const caller = CHARLIE
      const receiver_1 = ALICE
      const receiver_2 = BOB

      const amount = parseEther('1')
      const client = createClient(caller)

      const receivers = [receiver_1, receiver_2]

      const { events } = await client.batchDeposit({
        receiversAddresses: receivers,
        tokenAddress: nativeTokenAddress,
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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.withdraw({
            ownerAddress: zeroAddress,
            tokenAddress: nativeTokenAddress,
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
            ownerAddress: zeroAddress,
            tokenAddress: nativeTokenAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const caller = CHARLIE
      const amount = parseEther('1')

      const client = createClient(caller)

      await client.deposit({
        receiverAddress: caller,
        amount,
        tokenAddress: nativeTokenAddress,
      })

      const { event } = await client.withdraw({
        ownerAddress: caller,
        tokenAddress: nativeTokenAddress,
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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.batchWithdraw({
            ownerAddress: zeroAddress,
            tokensAddresses: [nativeTokenAddress],
            amounts: [BigInt(0)],
            withdrawerAddress: zeroAddress,
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
            ownerAddress: zeroAddress,
            tokensAddresses: [nativeTokenAddress],
            amounts: [BigInt(0)],
            withdrawerAddress: zeroAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const caller = CHARLIE
      const amount = parseEther('1')

      const client = createClient(caller)

      await client.deposit({
        receiverAddress: caller,
        amount,
        tokenAddress: nativeTokenAddress,
      })

      const { events } = await client.batchWithdraw({
        ownerAddress: caller,
        tokensAddresses: [nativeTokenAddress],
        amounts: [amount],
        withdrawerAddress: ALICE,
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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.batchTransfer({
            receiversAddresses: [zeroAddress],
            tokenAddress: nativeTokenAddress,
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
            receiversAddresses: [zeroAddress],
            tokenAddress: nativeTokenAddress,
            amounts: [BigInt(0)],
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const caller = CHARLIE
      const amount = parseEther('1')

      const client = createClient(caller)

      await client.deposit({
        receiverAddress: caller,
        amount,
        tokenAddress: nativeTokenAddress,
      })

      const receivers = [ALICE, BOB]
      const amounts = [parseEther('0.5'), parseEther('0.5')]

      const { events } = await client.batchTransfer({
        receiversAddresses: receivers,
        tokenAddress: nativeTokenAddress,
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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.setWithdrawConfig({
            paused: false,
            incentivePercent: 0,
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
            incentivePercent: 0,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const caller = CHARLIE

      const client = createClient(caller)

      const { event } = await client.setWithdrawConfig({
        paused: false,
        incentivePercent: 0,
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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.getName({
            tokenAddress: nativeTokenAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      const client = createClient()

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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.getSymbol({
            tokenAddress: nativeTokenAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      const client = createClient()

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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.getDecimals({
            tokenAddress: nativeTokenAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      const client = createClient()

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
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.getWithdrawConfig({
            userAddress: zeroAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      const client = createClient()

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
        walletClient: walletClient(ALICE),
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
      const client = createClient()

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
        walletClient: walletClient(ALICE),
      })

      await expect(async () => await badClient.eip712Domain()).rejects.toThrow(
        MissingPublicClientError,
      )
    })

    test('passes', async () => {
      const client = createClient()

      const { domain } = await client.eip712Domain()

      expect(domain.chainId).toEqual(client._chainId)
    })
  })

  describe('Check if spender is operator', () => {
    test('fails with no provider', async () => {
      const badClient = new WarehouseClient({
        chainId: 1,
        walletClient: walletClient(ALICE),
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
      const client = createClient()

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
        walletClient: walletClient(ALICE),
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
      const client = createClient()

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
          walletClient: walletClient(ALICE),
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
        const client = createClient()

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
