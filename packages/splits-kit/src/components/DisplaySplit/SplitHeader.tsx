import React, { useState } from 'react'
import { Identicon } from '@lidofinance/identicon'

import { shortenAddress } from '../../utils/address'
import { copyToClipboard } from '../../utils/clipboard'
import { IAddress } from '../../types'

interface SplitHeaderProps {
  address: IAddress
}

const SplitHeader = ({ address }: SplitHeaderProps) => {
  const [showFullAddress, setShowFullAddress] = useState(false)
  const displayName = showFullAddress ? address : shortenAddress(address)

  return (
    <div className="flex w-full items-center space-x-2 overflow-hidden md:overflow-visible">
      <div
        onMouseEnter={() => setShowFullAddress(true)}
        onMouseLeave={() => setShowFullAddress(false)}
        onClick={() => copyToClipboard(address)}
        className="cursor-pointer overflow-hidden"
      >
        <div
          className={
            'flex items-center space-x-2 truncate active:bg-yellow-200 dark:active:text-black'
          }
        >
          <Identicon
            diameter={20}
            address={address}
            className="flex-shrink-0"
          />
          <div className="truncate text-sm">{displayName}</div>
        </div>
      </div>
    </div>
  )
}

export default SplitHeader
