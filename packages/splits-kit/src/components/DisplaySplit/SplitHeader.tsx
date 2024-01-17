import { useState } from 'react'

import { shortenAddress } from '../../utils/address'
import { copyToClipboard } from '../../utils/clipboard'
import { IAddress } from '../../types'
import Link from '../util/Link'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid'
import { SupportedChainId } from '../../constants/chains'
import SplitsAvatar from '../util/SplitsAvatar'

const SplitHeader = ({
  address,
  chainId,
}: {
  address: IAddress
  chainId: SupportedChainId
}) => {
  const [showFullAddress, setShowFullAddress] = useState(false)
  const displayName = showFullAddress ? address : shortenAddress(address)

  return (
    <div className="flex w-full items-center space-x-2 overflow-hidden">
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
      <Link
        href={`https://app.splits.org/accounts/${address}/?chainId=${chainId}`}
        className="cursor-pointer text-gray-500 transition hover:text-black focus:outline-none dark:hover:text-white"
      >
        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      </Link>
    </div>
  )
}

export default SplitHeader
