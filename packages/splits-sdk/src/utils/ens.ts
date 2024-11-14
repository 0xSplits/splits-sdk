import { Address, Chain, getContract, PublicClient, Transport } from 'viem'
import { normalize } from 'viem/ens'

import { REVERSE_RECORDS_ADDRESS } from '../constants'
import { reverseRecordsAbi } from '../constants/abi/reverseRecords'

interface ReverseRecordsContract {
  read: {
    getNames: (addresses: Address[][]) => Promise<string[]>
  }
}

const fetchEnsNames = async <TChain extends Chain>(
  publicClient: PublicClient<Transport, TChain>,
  addresses: Address[],
): Promise<string[]> => {
  // Do nothing if not on mainnet
  const providerNetwork = await publicClient.getChainId()
  if (providerNetwork !== 1) return Array(addresses.length).fill(undefined)

  const reverseRecords = getContract({
    address: REVERSE_RECORDS_ADDRESS,
    abi: reverseRecordsAbi,
    // @ts-expect-error v1/v2 viem support
    client: publicClient,
    publicClient,
  }) as unknown as ReverseRecordsContract

  const allNames = await reverseRecords.read.getNames([addresses])
  return allNames.slice()
}

export const addEnsNames: <TChain extends Chain>(
  publicClient: PublicClient<Transport, TChain>,
  recipients: { address: Address; ensName?: string }[],
) => Promise<void> = async (publicClient, recipients) => {
  const addresses: Address[] = recipients.map((recipient) => recipient.address)
  const allNames: string[] = await fetchEnsNames(publicClient, addresses)

  allNames.forEach((ens, index) => {
    if (ens) {
      try {
        if (normalize(ens)) {
          recipients[index].ensName = ens
        }
      } catch (e) {
        // If normalize generates an error let's just ignore for now and not add the ens
        return
      }
    }
  })
}
