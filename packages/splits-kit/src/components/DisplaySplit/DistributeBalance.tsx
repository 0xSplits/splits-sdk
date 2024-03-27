import { useEffect } from 'react'
import { RequestError } from '@0xsplits/splits-sdk-react/dist/types'
import { useDistributeToken } from '@0xsplits/splits-sdk-react'
import { useAccount, useNetwork } from 'wagmi'

import { displayBigNumber } from '../../utils/display'
import Tooltip from '../util/Tooltip'
import { CHAIN_INFO, SupportedChainId } from '../../constants/chains'
import Button from '../util/Button'
import { Balance } from '../../types'
import { DistributeTokenConfig } from '@0xsplits/splits-sdk'

function DistributeBalance({
  chainId,
  token,
  balance,
  address,
  onSuccess,
  onError,
}: {
  chainId: SupportedChainId
  token: string
  balance: Balance
  address: string
  onSuccess?: (token: string) => void
  onError?: (error: RequestError) => void
}) {
  const { distributeToken, status, error } = useDistributeToken()
  const { isConnected, address: connectedAddress } = useAccount()
  const { chain } = useNetwork()

  useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error)
      onError && onError(error)
    }
  }, [error, onError])

  const onClick = async () => {
    const args: DistributeTokenConfig = {
      splitAddress: address,
      token,
      distributorAddress: connectedAddress,
    }
    const events = await distributeToken(args)
    if (events) {
      onSuccess && onSuccess(token)
    }
  }

  const inProgress = status == 'pendingApproval' || status == 'txInProgress'
  const isWrongChain = chain && chainId !== chain.id
  const isDisabled = !isConnected || isWrongChain
  return (
    <div className="py-1 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 hover:cursor-pointer">
      <div>
        {displayBigNumber(balance.rawAmount, 4)} {balance.symbol}
      </div>
      <div className="group relative">
        <Tooltip
          content={
            isWrongChain
              ? `Switch to ${CHAIN_INFO[chainId].label} to distribute funds`
              : 'Connect wallet to distribute funds'
          }
          isDisabled={!isDisabled}
        >
          <Button
            size="xs"
            isDisabled={isDisabled}
            isLoading={inProgress}
            onClick={onClick}
          >
            Distribute
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}

export default DistributeBalance
