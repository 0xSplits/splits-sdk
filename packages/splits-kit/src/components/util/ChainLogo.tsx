import React from 'react'

import { L1ChainInfo } from '../../constants/chains'
import Tooltip from '../util/Tooltip'

const ChainLogo = ({ chainInfo }: { chainInfo: L1ChainInfo }): JSX.Element => {
  return (
    <Tooltip content={chainInfo.label}>
      <img src={chainInfo.logoUrl} alt={chainInfo.label} className="w-6 h-6" />
    </Tooltip>
  )
}

export default ChainLogo
