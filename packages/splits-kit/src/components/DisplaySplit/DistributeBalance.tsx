import { useEffect } from 'react'
import { Split } from '@0xsplits/splits-sdk'
import {
  useDistributeToken,
  useDistributeTokenV2,
  useMulticall,
  useSplitsClient,
} from '@0xsplits/splits-sdk-react'
import { RequestError } from '@0xsplits/splits-sdk-react/dist/types'
import { Address } from 'viem'
import { useAccount } from 'wagmi'

import { displayBigNumber } from '../../utils/display'
import Tooltip from '../util/Tooltip'
import { CHAIN_INFO, SupportedChainId } from '../../constants/chains'
import Button from '../util/Button'
import { Balance } from '../../types'

function DistributeBalance({
  chainId,
  token,
  balance,
  split,
  shouldWithdrawOnDistribute,
  onSuccess,
  onError,
}: {
  chainId: SupportedChainId
  token: string
  balance: Balance
  split: Split
  shouldWithdrawOnDistribute: boolean
  onSuccess: (token: string) => void
  onError?: (error: RequestError) => void
}) {
  const {
    multicall,
    status: multicallStatus,
    error: multicallError,
  } = useMulticall()
  const { distributeToken, status, error } = useDistributeToken()
  const {
    distributeToken: distributeTokenV2,
    status: statusV2,
    error: errorV2,
  } = useDistributeTokenV2()
  const { isConnected, address: connectedAddress, chain } = useAccount()

  const splitsClient = useSplitsClient()

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

    if (multicallError) {
      // eslint-disable-next-line no-console
      console.error(multicallError)
      onError && onError(multicallError)
    }
  }, [error, errorV2, multicallError, onError])

  const onClick = async () => {
    let events

    if (split.type === 'Split') {
      const distributeArgs = {
        splitAddress: split.address,
        token,
        distributorAddress: connectedAddress,
      }

      if (shouldWithdrawOnDistribute) {
        const distributeCalldata =
          await splitsClient.splitV1.callData.distributeToken(distributeArgs)
        const withdrawCalldataList = await Promise.all(
          split.recipients.map(({ recipient }) => {
            return splitsClient.splitV1.callData.withdrawFunds({
              address: recipient.address,
              tokens: [token],
            })
          }),
        )

        events = await multicall({
          calls: [distributeCalldata, ...withdrawCalldataList],
        })
      } else {
        events = await distributeToken(distributeArgs)
      }
    } else {
      const distributeArgs = {
        splitAddress: split.address,
        tokenAddress: token as Address,
        distributorAddress: connectedAddress,
        chainId,
        splitFields: {
          recipients: split.recipients,
          distributorFeePercent: split.distributorFeePercent,
        },
      }

      // Dont need to withdraw for push splits
      if (shouldWithdrawOnDistribute && split.distributeDirection === 'pull') {
        const distributeCalldata =
          await splitsClient.splitV2.callData.distribute(distributeArgs)
        const withdrawCalldataList = await Promise.all(
          split.recipients.map(({ recipient }) => {
            return splitsClient.warehouse.callData.withdraw({
              ownerAddress: recipient.address,
              tokenAddress: token as Address,
            })
          }),
        )

        events = await multicall({
          calls: [distributeCalldata, ...withdrawCalldataList],
        })
      } else {
        events = await distributeTokenV2(distributeArgs)
      }
    }

    if (events) {
      onSuccess(token)
    }
  }

  const inProgress =
    status === 'pendingApproval' ||
    status === 'txInProgress' ||
    statusV2 === 'pendingApproval' ||
    statusV2 === 'txInProgress' ||
    multicallStatus === 'pendingApproval' ||
    multicallStatus === 'txInProgress'
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
