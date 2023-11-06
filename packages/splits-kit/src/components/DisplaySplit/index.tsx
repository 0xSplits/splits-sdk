import { useEffect } from 'react'
import { useSplitEarnings, useSplitMetadata } from '@0xsplits/splits-sdk-react'
import { RequestError } from '@0xsplits/splits-sdk-react/dist/types'

import { CHAIN_INFO, SupportedChainId } from '../../constants/chains'
import SplitRecipients from '../DisplaySplit/SplitRecipients'
import SkeletonLoader from '../DisplaySplit/SkeletonLoader'
import SplitBalances from '../DisplaySplit/SplitBalances'
import SplitHeader from '../DisplaySplit/SplitHeader'
import ChainLogo from '../util/ChainLogo'
import { IAddress } from '../../types'
import ComponentLayout from '../util/ComponentLayout'

export interface IDisplaySplitProps {
  address: IAddress
  chainId: SupportedChainId
  displayBalances?: boolean
  displayChain?: boolean
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  theme?: 'light' | 'dark' | 'system'
  onSuccess?: (token: string) => void
  onError?: (error: RequestError) => void
}

const DisplaySplit = ({
  address,
  chainId,
  displayBalances = true,
  displayChain = true,
  width = 'md',
  theme = 'system',
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

  return (
    <ComponentLayout
      chainId={chainId}
      width={width}
      theme={theme}
      title={<SplitHeader chainId={chainId} address={address} />}
      corner={displayChain && <ChainLogo chainInfo={CHAIN_INFO[chainId]} />}
      error={
        metadataError &&
        ((metadataError.name === 'AccountNotFoundError' && {
          title: 'Split not found',
          body: `This account is not a Splits contract on the ${CHAIN_INFO[chainId].label} network.`,
        }) ||
          (metadataError.name === 'InvalidArgumentError' && {
            title: 'Invalid Address',
            body: `Address ${address} is not a valid Ethereum address.`,
          }))
      }
      body={
        <div className="flex flex-col text-xs">
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
      }
    />
  )
}

export default DisplaySplit
