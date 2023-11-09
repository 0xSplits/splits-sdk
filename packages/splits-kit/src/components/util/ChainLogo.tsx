import { L1ChainInfo } from '../../constants/chains'
import Tooltip from '../util/Tooltip'

const ChainLogo = ({ chainInfo }: { chainInfo: L1ChainInfo }): JSX.Element => {
  return (
    <Tooltip content={chainInfo.label} position="left">
      <img
        src={`https://kit.splits.org/${chainInfo.logoUrl}`}
        alt={chainInfo.label}
        style={{ width: 20 }}
      />
    </Tooltip>
  )
}

export default ChainLogo
