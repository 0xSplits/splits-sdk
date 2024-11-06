import { useEffect } from 'react'
import { DistributeTokenConfig, Split } from '@0xsplits/splits-sdk'
import {
  useDistributeToken,
  useDistributeTokenV2,
} from '@0xsplits/splits-sdk-react'
import { RequestError } from '@0xsplits/splits-sdk-react/dist/types'
import { Address } from 'viem'
import { useAccount } from 'wagmi'

import { displayBigNumber } from '../../utils/display'
import Tooltip from '../util/Tooltip'
import { CHAIN_INFO, SupportedChainId } from '../../constants/chains'
import Button from '../util/Button'
import { Balance, SplitType } from '../../types'

function DistributeBalance({
  chainId,
  type,
  token,
  balance,
  split,
  onSuccess,
  onError,
}: {
  chainId: SupportedChainId
  type: SplitType
  token: string
  balance: Balance
  split: Split
  onSuccess?: (token: string) => void
  onError?: (error: RequestError) => void
}) {
  const { distributeToken, status, error } = useDistributeToken()
  const {
    distributeToken: distributeTokenV2,
    status: statusV2,
    error: errorV2,
  } = useDistributeTokenV2()
  const { isConnected, address: connectedAddress, chain } = useAccount()

  useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error)
      onError && onError(error)
    }

    if (errorV2) {
      // eslint-disable-next-line no-console
      console.error(errorV2)
      onError && onError(errorV2)
    }
  }, [error, onError])

  const onClick = async () => {
    const args: DistributeTokenConfig = {
      splitAddress: split.address,
      token,
      distributorAddress: connectedAddress,
    }
    const events = await distributeToken(args)
    if (events) {
      onSuccess && onSuccess(token)
    }

    if (type === 'v1') {
      const args = {
        splitAddress: split.address,
        token,
        distributorAddress: connectedAddress,
      }

      const events = await distributeToken(args)
      if (events) {
        onSuccess && onSuccess(token)
      }
    } else {
      const args = {
        splitAddress: split.address,
        tokenAddress: token as Address,
        distributorAddress: connectedAddress,
        chainId,
        splitFields: {
          recipients: split.recipients,
          distributorFeePercent: split.distributorFeePercent,
        },
      }

      const events = await distributeTokenV2(args)
      if (events) {
        onSuccess && onSuccess(token)
      }
    }
  }

  const inProgress =
    status === 'pendingApproval' ||
    status === 'txInProgress' ||
    statusV2 === 'pendingApproval' ||
    statusV2 === 'txInProgress'
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
