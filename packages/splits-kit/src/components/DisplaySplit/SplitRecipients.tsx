import { useState } from 'react'
import { Recipient } from '@0xsplits/splits-sdk'
import { Split } from '@0xsplits/splits-sdk-react'
import { zeroAddress } from 'viem'
import { useAccount } from 'wagmi'

import { shortenENS, shortenAddress } from '../../utils/address'
import { getSplitsAccountUrl } from '../../utils/splits'
import { displayPercentage } from '../../utils/display'
import Button from '../util/Button'
import Label from '../util/Label'
import Link from '../util/Link'
import SplitsAvatar from '../util/SplitsAvatar'
import AddressDisplay from './AddressDisplay'

interface ISplitRecipientsProps {
  split: Split | undefined
  linkToApp: boolean
}

const SplitRecipients = ({ split, linkToApp }: ISplitRecipientsProps) => {
  const [viewAll, setViewAll] = useState(false)
  const { address: connectedAddress } = useAccount()

  const displayAddress = (recipient: Recipient) => {
    if (recipient.ens) {
      return shortenENS(recipient.ens)
    }
    if (recipient.address) {
      return shortenAddress(recipient.address)
    }
  }
  const recipients = split?.recipients

  return (
    <div className="space-y-2 text-xs">
      {split?.controller && split?.controller.address !== zeroAddress && (
        <div className="border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 w-full rounded-sm border p-2 ">
          {connectedAddress === split?.controller.address
            ? 'You control'
            : `${shortenAddress(split?.controller.address)} controls`}{' '}
          this Split
        </div>
      )}
      <div className="flex items-center justify-between  text-gray-400 dark:text-gray-500">
        <div>Recipients {recipients && `(${recipients?.length})`}</div>
        <div>Share</div>
      </div>
      {
        <div>
          {recipients
            ?.slice(0, viewAll ? recipients?.length : 10)
            .map(({ recipient, percentAllocation }, idx) => (
              <div
                key={idx}
                className="py-2 flex items-stretch justify-between space-x-0.5"
              >
                <div className="flex items-center space-x-2">
                  {linkToApp ? (
                    <>
                      <SplitsAvatar address={recipient.address} size={20} />
                      <Link href={getSplitsAccountUrl(recipient.address)}>
                        <div>{displayAddress(recipient)}</div>
                      </Link>
                    </>
                  ) : (
                    <AddressDisplay
                      address={recipient.address}
                      ens={recipient.ens}
                    />
                  )}
                  {recipient.address === connectedAddress && (
                    <Label text="You" />
                  )}
                  {recipient.address === split?.controller?.address && (
                    <Label text="Controller" />
                  )}
                </div>
                <div>{displayPercentage(percentAllocation * 10000, 2)}</div>
              </div>
            ))}
        </div>
      }
      {recipients?.length && recipients?.length > 10 && !viewAll && (
        <Button onClick={() => setViewAll(true)}>View All</Button>
      )}
    </div>
  )
}

export default SplitRecipients
