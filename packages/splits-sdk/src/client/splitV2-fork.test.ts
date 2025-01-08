import {
  Account,
  Address,
  Chain,
  PublicClient,
  Transport,
  WalletClient,
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  parseEther,
  zeroAddress,
} from 'viem'
import {
  getSplitV2FactoryAddress,
  getSplitV2o1FactoryAddress,
} from '../constants'
import {
  InvalidConfigError,
  InvalidDistributorFeePercentErrorV2,
  InvalidTotalAllocation,
  MissingPublicClientError,
  MissingWalletClientError,
  SaltRequired,
} from '../errors'
import { SplitV2Client } from './splitV2'
import { base, mainnet } from 'viem/chains'
import { describe, expect, test, beforeEach } from 'vitest'
import { ALICE, BOB } from '../testing/vitest/constants'
import { publicClient, testClient, walletClient } from '../testing/utils'
import { SplitRecipient, SplitV2Type } from '../types'
import { splitV2ABI } from '../constants/abi/splitV2'
import { splitV2FactoryABI } from '../constants/abi/splitV2Factory'

describe('Client config validation', () => {
  test('Including ens names with no provider fails', () => {
    expect(
      () => new SplitV2Client({ chainId: 1, includeEnsNames: true }),
    ).toThrow(InvalidConfigError)
  })
})

const nativeTokenAddress: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

describe('Split v2 writes', () => {
  const createClient = (account: Address): SplitV2Client => {
    return new SplitV2Client({
      chainId: base.id,
      publicClient: publicClient as PublicClient<Transport, Chain>,
      walletClient: walletClient(account) as WalletClient<
        Transport,
        Chain,
        Account
      >,
    })
  }

  const sampleRecipients: SplitRecipient[] = [
    {
      address: ALICE,
      percentAllocation: 50,
    },
    {
      address: BOB,
      percentAllocation: 50,
    },
  ]

  const createDefaultSplitWithOwner = async (): Promise<Address> => {
    const client = createClient(ALICE)
    const { splitAddress } = await client.createSplit({
      recipients: sampleRecipients,
      distributorFeePercent: 0,
      ownerAddress: ALICE,
    })

    return splitAddress
  }

  describe('Create split', () => {
    test('fails with no provider', async () => {
      const badClient = new SplitV2Client({
        chainId: 1,
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.createSplit({
            recipients: sampleRecipients,
            distributorFeePercent: 0,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const pubClient = createPublicClient({
        chain: mainnet,
        transport: http(),
      })
      const badClient = new SplitV2Client({
        chainId: 1,
        publicClient: pubClient,
      })

      await expect(
        async () =>
          await badClient.createSplit({
            recipients: sampleRecipients,
            distributorFeePercent: 0,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('create default pull split with no controller', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const { splitAddress, event } = await client.createSplit({
        recipients: sampleRecipients,
        distributorFeePercent: 0,
      })

      const decodedLog = decodeEventLog({
        abi: splitV2FactoryABI,
        topics: event.topics,
        data: event.data,
      })

      expect(getAddress(event.address)).toEqual(
        getAddress(
          getSplitV2o1FactoryAddress(client._chainId!, SplitV2Type.Pull),
        ),
      )
      expect(decodedLog.eventName).toEqual('SplitCreated')
      if (decodedLog.eventName === 'SplitCreated') {
        expect(decodedLog.args.split).toEqual(splitAddress)
        expect(decodedLog.args.splitParams.recipients).toEqual(
          sampleRecipients.map((recipient) => recipient.address),
        )
        expect(decodedLog.args.splitParams.distributionIncentive).toEqual(0)
        expect(decodedLog.args.creator).toEqual(zeroAddress)
        expect(decodedLog.args.owner).toEqual(zeroAddress)
      }
    })

    test('create pull split with controller and creator', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const { splitAddress, event } = await client.createSplit({
        recipients: sampleRecipients,
        distributorFeePercent: 6.5,
        ownerAddress: ALICE,
        creatorAddress: ALICE,
      })

      const decodedLog = decodeEventLog({
        abi: splitV2FactoryABI,
        topics: event.topics,
        data: event.data,
      })

      expect(getAddress(event.address)).toEqual(
        getAddress(
          getSplitV2FactoryAddress(client._chainId!, SplitV2Type.Pull),
        ),
      )
      expect(decodedLog.eventName).toEqual('SplitCreated')
      if (decodedLog.eventName === 'SplitCreated') {
        expect(decodedLog.args.split).toEqual(splitAddress)
        expect(decodedLog.args.splitParams.recipients).toEqual(
          sampleRecipients.map((recipient) => recipient.address),
        )
        expect(decodedLog.args.splitParams.distributionIncentive).toEqual(65000)
        expect(decodedLog.args.creator).toEqual(ALICE)
        expect(decodedLog.args.owner).toEqual(ALICE)
      }
    })

    test('create push split with controller and creator', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const { splitAddress, event } = await client.createSplit({
        recipients: sampleRecipients,
        distributorFeePercent: 6.5,
        ownerAddress: ALICE,
        creatorAddress: ALICE,
        splitType: SplitV2Type.Push,
      })

      const decodedLog = decodeEventLog({
        abi: splitV2FactoryABI,
        topics: event.topics,
        data: event.data,
      })

      expect(getAddress(event.address)).toEqual(
        getAddress(
          getSplitV2FactoryAddress(client._chainId!, SplitV2Type.Push),
        ),
      )
      expect(decodedLog.eventName).toEqual('SplitCreated')
      if (decodedLog.eventName === 'SplitCreated') {
        expect(decodedLog.args.split).toEqual(splitAddress)
        expect(decodedLog.args.splitParams.recipients).toEqual(
          sampleRecipients.map((recipient) => recipient.address),
        )
        expect(decodedLog.args.splitParams.distributionIncentive).toEqual(65000)
        expect(decodedLog.args.creator).toEqual(ALICE)
        expect(decodedLog.args.owner).toEqual(ALICE)
      }
    })

    test('create deterministic push split with controller and creator', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const { splitAddress, event } = await client.createSplit({
        recipients: sampleRecipients,
        distributorFeePercent: 6.5,
        ownerAddress: ALICE,
        creatorAddress: ALICE,
        splitType: SplitV2Type.Push,
        salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
      })

      const decodedLog = decodeEventLog({
        abi: splitV2FactoryABI,
        topics: event.topics,
        data: event.data,
      })

      expect(getAddress(event.address)).toEqual(
        getAddress(
          getSplitV2FactoryAddress(client._chainId!, SplitV2Type.Push),
        ),
      )
      expect(decodedLog.eventName).toEqual('SplitCreated')
      if (decodedLog.eventName === 'SplitCreated') {
        expect(decodedLog.args.split).toEqual(splitAddress)
        expect(decodedLog.args.splitParams.recipients).toEqual(
          sampleRecipients.map((recipient) => recipient.address),
        )
        expect(decodedLog.args.splitParams.distributionIncentive).toEqual(65000)
        expect(decodedLog.args.creator).toEqual(ALICE)
        expect(decodedLog.args.owner).toEqual(ALICE)
      }
    })

    test('fails when distributor fee is greater than 6.5', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await expect(
        async () =>
          await client.createSplit({
            recipients: sampleRecipients,
            distributorFeePercent: 7.5,
            ownerAddress: ALICE,
            creatorAddress: ALICE,
          }),
      ).rejects.toThrow(InvalidDistributorFeePercentErrorV2)
    })

    test('fails when total allocation is not 100%', async () => {
      const sender = ALICE
      const client = createClient(sender)

      sampleRecipients[1].percentAllocation = 49

      await expect(
        async () =>
          await client.createSplit({
            recipients: sampleRecipients,
            distributorFeePercent: 6.5,
            ownerAddress: ALICE,
            creatorAddress: ALICE,
          }),
      ).rejects.toThrow(InvalidTotalAllocation)

      sampleRecipients[1].percentAllocation = 50
    })

    test('fails when total allocation is not equal to recipient allocations', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await expect(
        async () =>
          await client.createSplit({
            recipients: sampleRecipients,
            distributorFeePercent: 6.5,
            ownerAddress: ALICE,
            creatorAddress: ALICE,
            totalAllocationPercent: 50,
          }),
      ).rejects.toThrow(InvalidTotalAllocation)
    })
  })

  describe('Transfer ownership', () => {
    let splitAddress: Address
    beforeEach(async () => {
      splitAddress = await createDefaultSplitWithOwner()
    })

    test('fails with no provider', async () => {
      const badClient = new SplitV2Client({
        chainId: 1,
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.transferOwnership({
            splitAddress: zeroAddress,
            newOwner: zeroAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const pubClient = createPublicClient({
        chain: mainnet,
        transport: http(),
      })
      const badClient = new SplitV2Client({
        chainId: 1,
        publicClient: pubClient,
      })

      await expect(
        async () =>
          await badClient.transferOwnership({
            splitAddress: zeroAddress,
            newOwner: zeroAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const { event } = await client.transferOwnership({
        splitAddress,
        newOwner: zeroAddress,
      })

      const decodedLog = decodeEventLog({
        abi: splitV2ABI,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('OwnershipTransferred')
      if (decodedLog.eventName === 'OwnershipTransferred') {
        expect(decodedLog.args.newOwner).toEqual(zeroAddress)
        expect(decodedLog.args.oldOwner).toEqual(ALICE)
      }
    })
  })

  describe('Pause split distribution', () => {
    let splitAddress: Address
    beforeEach(async () => {
      splitAddress = await createDefaultSplitWithOwner()
    })

    test('fails with no provider', async () => {
      const badClient = new SplitV2Client({
        chainId: 1,
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.setPause({
            splitAddress: zeroAddress,
            paused: true,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const pubClient = createPublicClient({
        chain: mainnet,
        transport: http(),
      })
      const badClient = new SplitV2Client({
        chainId: 1,
        publicClient: pubClient,
      })

      await expect(
        async () =>
          await badClient.setPause({
            splitAddress: zeroAddress,
            paused: true,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const { event } = await client.setPause({
        splitAddress,
        paused: true,
      })

      const decodedLog = decodeEventLog({
        abi: splitV2ABI,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('SetPaused')
      if (decodedLog.eventName === 'SetPaused') {
        expect(decodedLog.args.paused).toEqual(true)
      }
    })
  })

  describe('Exec Calls', () => {
    let splitAddress: Address
    beforeEach(async () => {
      splitAddress = await createDefaultSplitWithOwner()
    })

    test('fails with no provider', async () => {
      const badClient = new SplitV2Client({
        chainId: 1,
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.execCalls({
            splitAddress,
            calls: [],
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const pubClient = createPublicClient({
        chain: mainnet,
        transport: http(),
      })
      const badClient = new SplitV2Client({
        chainId: 1,
        publicClient: pubClient,
      })

      await expect(
        async () =>
          await badClient.execCalls({
            splitAddress,
            calls: [],
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const { event } = await client.execCalls({
        splitAddress,
        calls: [],
      })

      const decodedLog = decodeEventLog({
        abi: splitV2ABI,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('ExecCalls')
      if (decodedLog.eventName === 'ExecCalls') {
        expect(decodedLog.args.calls.length).toEqual(0)
      }
    })
  })

  describe('Distribute', () => {
    let splitAddress: Address
    beforeEach(async () => {
      splitAddress = await createDefaultSplitWithOwner()
    })

    test('fails with no provider', async () => {
      const badClient = new SplitV2Client({
        chainId: 1,
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.distribute({
            splitAddress,
            tokenAddress: nativeTokenAddress,
            distributorAddress: zeroAddress,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const pubClient = createPublicClient({
        chain: mainnet,
        transport: http(),
      })
      const badClient = new SplitV2Client({
        chainId: 1,
        publicClient: pubClient,
      })

      await expect(
        async () =>
          await badClient.distribute({
            splitAddress,
            tokenAddress: nativeTokenAddress,
            distributorAddress: zeroAddress,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('distribute passes', async () => {
      const sender = ALICE
      const client = createClient(sender)

      testClient.setBalance({
        address: splitAddress,
        value: parseEther('1'),
      })

      const { event } = await client.distribute({
        splitAddress,
        distributorAddress: zeroAddress,
        tokenAddress: nativeTokenAddress,
      })

      const decodedLog = decodeEventLog({
        abi: splitV2ABI,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('SplitDistributed')
      if (decodedLog.eventName === 'SplitDistributed') {
        expect(decodedLog.args.amount).toEqual(parseEther('1') - BigInt(1))
        expect(decodedLog.args.distributor).toEqual(zeroAddress)
        expect(decodedLog.args.token).toEqual(nativeTokenAddress)
      }
    })
  })

  describe('Update split', () => {
    let splitAddress: Address
    beforeEach(async () => {
      splitAddress = await createDefaultSplitWithOwner()
    })

    test('fails with no provider', async () => {
      const badClient = new SplitV2Client({
        chainId: 1,
        walletClient: walletClient(ALICE),
      })

      await expect(
        async () =>
          await badClient.updateSplit({
            splitAddress,
            recipients: sampleRecipients,
            distributorFeePercent: 0,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails with no signer', async () => {
      const pubClient = createPublicClient({
        chain: mainnet,
        transport: http(),
      })
      const badClient = new SplitV2Client({
        chainId: 1,
        publicClient: pubClient,
      })

      await expect(
        async () =>
          await badClient.updateSplit({
            splitAddress,
            recipients: sampleRecipients,
            distributorFeePercent: 0,
          }),
      ).rejects.toThrow(MissingWalletClientError)
    })

    test('passes', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const { event } = await client.updateSplit({
        splitAddress,
        recipients: sampleRecipients,
        distributorFeePercent: 6.5,
      })

      const decodedLog = decodeEventLog({
        abi: splitV2ABI,
        topics: event.topics,
        data: event.data,
      })

      expect(decodedLog.eventName).toEqual('SplitUpdated')
      if (decodedLog.eventName === 'SplitUpdated') {
        expect(decodedLog.args._split.recipients).toEqual(
          sampleRecipients.map((recipient) => recipient.address),
        )
        expect(decodedLog.args._split.distributionIncentive).toEqual(65000)
      }
    })

    test('fails when distributor fee is greater than 6.5', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await expect(
        async () =>
          await client.updateSplit({
            splitAddress,
            recipients: sampleRecipients,
            distributorFeePercent: 7.5,
          }),
      ).rejects.toThrow(InvalidDistributorFeePercentErrorV2)
    })

    test('fails when total allocation is not 100%', async () => {
      const sender = ALICE
      const client = createClient(sender)

      sampleRecipients[1].percentAllocation = 49

      await expect(
        async () =>
          await client.updateSplit({
            splitAddress,
            recipients: sampleRecipients,
            distributorFeePercent: 6.5,
          }),
      ).rejects.toThrow(InvalidTotalAllocation)

      sampleRecipients[1].percentAllocation = 50
    })

    test('fails when total allocation is not equal to recipient allocations', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await expect(
        async () =>
          await client.updateSplit({
            splitAddress,
            recipients: sampleRecipients,
            distributorFeePercent: 6.5,
            totalAllocationPercent: 50,
          }),
      ).rejects.toThrow(InvalidTotalAllocation)
    })
  })
})

describe('Split v2 reads', () => {
  const createClient = (account: Address): SplitV2Client => {
    return new SplitV2Client({
      chainId: base.id,
      publicClient: publicClient as PublicClient<Transport, Chain>,
      walletClient: walletClient(account) as WalletClient<
        Transport,
        Chain,
        Account
      >,
    })
  }

  const sampleRecipients: SplitRecipient[] = [
    {
      address: ALICE,
      percentAllocation: 50,
    },
    {
      address: BOB,
      percentAllocation: 50,
    },
  ]

  const createDefaultSplitWithOwner = async (): Promise<Address> => {
    const client = createClient(ALICE)
    const { splitAddress } = await client.createSplit({
      recipients: sampleRecipients,
      distributorFeePercent: 0,
      ownerAddress: ALICE,
    })

    return splitAddress
  }

  describe('Predict deterministic address', () => {
    test('fails with no provider', async () => {
      const badClient = new SplitV2Client({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.predictDeterministicAddress({
            recipients: sampleRecipients,
            distributorFeePercent: 0,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('predict default pull split with no controller', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await client.predictDeterministicAddress({
        recipients: sampleRecipients,
        distributorFeePercent: 0,
      })
    })

    test('predict pull split with controller and creator', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await client.predictDeterministicAddress({
        recipients: sampleRecipients,
        distributorFeePercent: 6.5,
        ownerAddress: ALICE,
        creatorAddress: ALICE,
      })
    })

    test('predict deterministic push split with controller and creator', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await client.predictDeterministicAddress({
        recipients: sampleRecipients,
        distributorFeePercent: 6.5,
        ownerAddress: ALICE,
        creatorAddress: ALICE,
        splitType: SplitV2Type.Push,
        salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
      })
    })

    test('fails when distributor fee is greater than 6.5', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await expect(
        async () =>
          await client.predictDeterministicAddress({
            recipients: sampleRecipients,
            distributorFeePercent: 7.5,
            ownerAddress: ALICE,
            creatorAddress: ALICE,
          }),
      ).rejects.toThrow(InvalidDistributorFeePercentErrorV2)
    })

    test('fails when total allocation is not 100%', async () => {
      const sender = ALICE
      const client = createClient(sender)

      sampleRecipients[1].percentAllocation = 49

      await expect(
        async () =>
          await client.predictDeterministicAddress({
            recipients: sampleRecipients,
            distributorFeePercent: 6.5,
            ownerAddress: ALICE,
            creatorAddress: ALICE,
          }),
      ).rejects.toThrow(InvalidTotalAllocation)

      sampleRecipients[1].percentAllocation = 50
    })

    test('fails when total allocation is not equal to recipient allocations', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await expect(
        async () =>
          await client.predictDeterministicAddress({
            recipients: sampleRecipients,
            distributorFeePercent: 6.5,
            ownerAddress: ALICE,
            creatorAddress: ALICE,
            totalAllocationPercent: 50,
          }),
      ).rejects.toThrow(InvalidTotalAllocation)
    })
  })

  describe('Is split deployed', () => {
    test('fails with no provider', async () => {
      const badClient = new SplitV2Client({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.isDeployed({
            recipients: sampleRecipients,
            distributorFeePercent: 0,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('fails when no salt is passed', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await expect(
        async () =>
          await client.isDeployed({
            recipients: sampleRecipients,
            distributorFeePercent: 0,
          }),
      ).rejects.toThrow(SaltRequired)
    })

    test('passes', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const { deployed } = await client.isDeployed({
        recipients: sampleRecipients,
        distributorFeePercent: 6.5,
        ownerAddress: ALICE,
        creatorAddress: ALICE,
        splitType: SplitV2Type.Push,
        salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
      })

      expect(deployed).toEqual(false)
    })

    test('fails when distributor fee is greater than 6.5', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await expect(
        async () =>
          await client.isDeployed({
            recipients: sampleRecipients,
            distributorFeePercent: 7.5,
            ownerAddress: ALICE,
            creatorAddress: ALICE,
            salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
          }),
      ).rejects.toThrow(InvalidDistributorFeePercentErrorV2)
    })

    test('fails when total allocation is not 100%', async () => {
      const sender = ALICE
      const client = createClient(sender)

      sampleRecipients[1].percentAllocation = 49

      await expect(
        async () =>
          await client.isDeployed({
            recipients: sampleRecipients,
            distributorFeePercent: 6.5,
            ownerAddress: ALICE,
            creatorAddress: ALICE,
            salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
          }),
      ).rejects.toThrow(InvalidTotalAllocation)

      sampleRecipients[1].percentAllocation = 50
    })

    test('fails when total allocation is not equal to recipient allocations', async () => {
      const sender = ALICE
      const client = createClient(sender)

      await expect(
        async () =>
          await client.isDeployed({
            recipients: sampleRecipients,
            distributorFeePercent: 6.5,
            ownerAddress: ALICE,
            creatorAddress: ALICE,
            totalAllocationPercent: 50,
            salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
          }),
      ).rejects.toThrow(InvalidTotalAllocation)
    })
  })

  describe('Get split balance', () => {
    test('fails with no provider', async () => {
      const badClient = new SplitV2Client({
        chainId: 1,
      })

      await expect(
        async () =>
          await badClient.isDeployed({
            recipients: sampleRecipients,
            distributorFeePercent: 0,
          }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const splitAddress = await createDefaultSplitWithOwner()

      const { splitBalance, warehouseBalance } = await client.getSplitBalance({
        splitAddress,
        tokenAddress: nativeTokenAddress,
      })

      expect(splitBalance).toEqual(BigInt(0))
      expect(warehouseBalance).toEqual(BigInt(0))
    })
  })

  describe('paused', () => {
    test('fails with no provider', async () => {
      const badClient = new SplitV2Client({
        chainId: 1,
      })

      await expect(
        async () => await badClient.paused({ splitAddress: zeroAddress }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const splitAddress = await createDefaultSplitWithOwner()

      const { paused } = await client.paused({ splitAddress })

      expect(paused).toEqual(false)
    })
  })

  describe('Owner', () => {
    test('fails with no provider', async () => {
      const badClient = new SplitV2Client({
        chainId: 1,
      })

      await expect(
        async () => await badClient.owner({ splitAddress: zeroAddress }),
      ).rejects.toThrow(MissingPublicClientError)
    })

    test('passes', async () => {
      const sender = ALICE
      const client = createClient(sender)

      const splitAddress = await createDefaultSplitWithOwner()

      const { ownerAddress } = await client.owner({ splitAddress })

      expect(ownerAddress).toEqual(ALICE)
    })
  })
})
