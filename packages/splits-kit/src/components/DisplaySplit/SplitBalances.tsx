import { RequestError } from '@0xsplits/splits-sdk-react/dist/types'
import { FormattedSplitEarnings } from '@0xsplits/splits-sdk'

import DistributeBalance from './DistributeBalance'
import { SupportedChainId } from '../../constants/chains'

const SplitBalances = ({
  chainId,
  address,
  formattedSplitEarnings,
  onSuccess,
  onError,
}: {
  chainId: SupportedChainId
  address: string
  formattedSplitEarnings: FormattedSplitEarnings | undefined
  onSuccess?: (token: string) => void
  onError?: (error: RequestError) => void
}) => {
  const balances = formattedSplitEarnings?.activeBalances
  const hasBalances = balances && Object.keys(balances).length > 0
  return (
    <div className="space-y-1 text-xs">
      <div className="font-medium">Balances</div>
      {hasBalances ? (
        <div>
          {Object.entries(balances).map(([token, balance], idx: number) => (
            <DistributeBalance
              chainId={chainId}
              key={idx}
              token={token}
              balance={balance}
              address={address}
              onSuccess={onSuccess}
              onError={onError}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-sm bg-gray-50 p-3 text-xs leading-relaxed dark:bg-gray-800">
          This Split&apos;s earnings will show up here once funds have been
          received.
        </div>
      )}
    </div>
  )
}

export default SplitBalances
