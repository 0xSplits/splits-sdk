import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid'

import { IAddress } from '../../types'
import Link from '../util/Link'
import { SupportedChainId } from '../../constants/chains'
import AddressDisplay from './AddressDisplay'

const SplitHeader = ({
  address,
  chainId,
  linkToApp,
}: {
  address: IAddress
  chainId: SupportedChainId
  linkToApp: boolean
}) => {
  return (
    <div className="flex w-full items-center space-x-2 overflow-hidden">
      <AddressDisplay address={address} />
      {linkToApp && (
        <Link
          href={`https://app.splits.org/accounts/${address}/?chainId=${chainId}`}
          className="cursor-pointer text-gray-500 transition hover:text-black focus:outline-none dark:hover:text-white"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

export default SplitHeader
