import { useState } from 'react'
import { Split } from '@0xsplits/splits-sdk-react'
import { Identicon } from '@lidofinance/identicon'
import { useAccount } from 'wagmi'

import { shortenENS, shortenAddress } from '../../utils/address'
import { getSplitsAccountUrl } from '../../utils/splits'
import { displayPercentage } from '../../utils/display'
import { Recipient as Recipient } from '../../types'
import Button from '../util/Button'
import Label from '../util/Label'
import Link from '../util/Link'

interface ISplitRecipientsProps {
  split: Split | undefined
}

const SplitRecipients = ({ split }: ISplitRecipientsProps) => {
  const [viewAll, setViewAll] = useState(false)
  const { address: connectedAddress } = useAccount()

  const displayAddress = (recipient: Recipient) => {
    if (recipient.ensName) {
      return shortenENS(recipient.ensName)
    }
    if (recipient.address) {
      return shortenAddress(recipient.address)
    }
  }
  const recipients = split?.recipients

  return (
    <div className="space-y-2 text-xs">
      {split?.controller && (
        <div className="border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 w-full rounded-sm border p-2 ">
          {connectedAddress === split?.controller
            ? 'You control'
            : `${shortenAddress(split?.controller)} controls`}{' '}
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
            .map((recipient, idx) => (
              <div
                key={idx}
                className="py-2 flex items-stretch justify-between space-x-0.5"
              >
                <div className="flex items-center space-x-2">
                  <Identicon address={recipient.address} diameter={20} />
                  <Link href={getSplitsAccountUrl(recipient.address)}>
                    <div>{displayAddress(recipient)}</div>
                  </Link>
                  {recipient.address === connectedAddress && (
                    <Label text="You" />
                  )}
                  {recipient.address === split?.controller && (
                    <Label text="Controller" />
                  )}
                </div>
                <div>
                  {displayPercentage(recipient.percentAllocation * 10000, 2)}
                </div>
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
