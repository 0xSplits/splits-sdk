import { Address, getContract, PublicClient } from 'viem'
import { normalize } from 'viem/ens'

import { REVERSE_RECORDS_ADDRESS } from '../constants'
import { reverseRecordsAbi } from '../constants/abi/reverseRecords'

const fetchEnsNames = async (
  publicClient: PublicClient,
  addresses: Address[],
): Promise<string[]> => {
  // Do nothing if not on mainnet
  const providerNetwork = await publicClient.getChainId()
  if (providerNetwork !== 1) return Array(addresses.length).fill(undefined)

  const reverseRecords = getContract({
    address: REVERSE_RECORDS_ADDRESS,
    abi: reverseRecordsAbi,

    client: { public: publicClient },
  })

  const allNames = await reverseRecords.read.getNames([addresses])
  return allNames.slice()
}

export const addEnsNames = async (
  publicClient: PublicClient,
  recipients: { address: Address; ensName?: string }[],
): Promise<void> => {
  const addresses = recipients.map((recipient) => recipient.address)
  const allNames = await fetchEnsNames(publicClient, addresses)

  allNames.map((ens, index) => {
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
