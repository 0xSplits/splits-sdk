import React, { useEffect } from 'react'
import { useSplitEarnings, useSplitMetadata } from '@0xsplits/splits-sdk-react'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid'
import { RequestError } from '@0xsplits/splits-sdk-react/dist/types'

import SplitRecipients from '../DisplaySplit/SplitRecipients'
import SkeletonLoader from '../DisplaySplit/SkeletonLoader'
import SplitBalances from '../DisplaySplit/SplitBalances'
import SplitHeader from '../DisplaySplit/SplitHeader'
import ComponentLayout from '../util/ComponentLayout'
import ChainLogo from '../util/ChainLogo'
import { CHAIN_INFO, SupportedChainId } from '../../constants/chains'
import Segment from '../util/Segment'
import Tooltip from '../util/Tooltip'
import { IAddress } from '../../types'

export interface IDisplaySplitProps {
  address: IAddress
  chainId: SupportedChainId
  displayBalances?: boolean
  displayChain?: boolean
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  onSuccess?: (token: string) => void
  onError?: (error: RequestError) => void
}

const DisplaySplit = ({
  address,
  chainId,
  displayBalances = true,
  displayChain = true,
  width = 'md',
  onSuccess,
  onError,
}: IDisplaySplitProps) => {
  const {
    splitMetadata: split,
    error: metadataError,
    isLoading: isLoadingMetadata,
  } = useSplitMetadata(address)

  const {
    formattedSplitEarnings,
    isLoading: isLoadingEarnings,
    error: earningsError,
  } = useSplitEarnings(address)

  useEffect(() => {
    if (metadataError && onError) onError(metadataError)
    if (earningsError && onError) onError(earningsError)
  }, [earningsError, metadataError, onError])

  const isNotFound =
    metadataError && metadataError.name === 'AccountNotFoundError'

  return (
    <ComponentLayout width={width}>
      <Segment
        title={<SplitHeader address={address} />}
        titleButton={
          <div className="flex items-center space-x-2">
            <Tooltip content={'View on the Splits app'}>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://app.splits.org/accounts/${address}/?chainId=${chainId}`}
                className="cursor-pointer text-gray-500 transition hover:text-black focus:outline-none dark:hover:text-white"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </a>
            </Tooltip>
          </div>
        }
        corner={
          displayChain
            ? CHAIN_INFO[chainId] && (
                <ChainLogo chainInfo={CHAIN_INFO[chainId]} />
              )
            : undefined
        }
        body={
          isNotFound ? (
            <div className="text-center mt-12 space-y-2">
              <div className="text-lg">Split not found</div>
              <div className="text-xs">
                This account is not a Splits contract on the{' '}
                {CHAIN_INFO[chainId].label} network.
              </div>
            </div>
          ) : (
            <div className="text-xs">
              {isLoadingMetadata || isLoadingEarnings ? (
                <SkeletonLoader />
              ) : (
                <div className="space-y-4">
                  <SplitRecipients split={split} />
                  {displayBalances && !isLoadingEarnings && (
                    <SplitBalances
                      chainId={chainId}
                      address={address}
                      formattedSplitEarnings={formattedSplitEarnings}
                      onSuccess={onSuccess}
                      onError={onError}
                    />
                  )}
                </div>
              )}
            </div>
          )
        }
      />
    </ComponentLayout>
  )
}

export default DisplaySplit
