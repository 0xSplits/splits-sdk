import React from 'react'
import { Split } from '@0xsplits/splits-sdk-react'

import { getSplitSponsorshipPercentage } from '../../utils/splits'
import { roundToDecimals } from '../../utils/numbers'
import Tooltip from '../util/Tooltip'

const SponsorBadge = ({ split }: { split: Split | undefined }): JSX.Element => {
  const sponsorshipPercentage = split ? getSplitSponsorshipPercentage(split) : 0
  return (
    <Tooltip content="Official Splits Sponsor" position="bottom" delay={0}>
      <div className="whitespace-nowrap rounded-full bg-gradient-to-tr from-yellow-500 via-yellow-400 to-yellow-600 px-1.5 py-0.5 text-[12px] font-medium text-white dark:text-black">
        Sponsor {roundToDecimals(sponsorshipPercentage, 2)}%
      </div>
    </Tooltip>
  )
}

export default SponsorBadge
