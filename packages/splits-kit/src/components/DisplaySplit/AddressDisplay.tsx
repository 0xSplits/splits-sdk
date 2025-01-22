import { useState } from 'react'

import { IAddress } from '../../types'
import { copyToClipboard } from '../../utils/clipboard'
import { shortenAddress, shortenENS } from '../../utils/address'
import SplitsAvatar from '../util/SplitsAvatar'

const AddressDisplay = ({
  address,
  ens,
}: {
  address: IAddress
  ens?: string
}) => {
  const [showFullAddress, setShowFullAddress] = useState(false)
  const displayName = showFullAddress
    ? address
    : ens
    ? shortenENS(ens)
    : shortenAddress(address)

  return (
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
        <SplitsAvatar address={address} size={20} className="flex-shrink-0" />
        <div className="truncate">{displayName}</div>
      </div>
    </div>
  )
}

export default AddressDisplay
