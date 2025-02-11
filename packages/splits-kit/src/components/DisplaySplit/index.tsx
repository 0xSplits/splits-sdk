import { useCallback, useEffect, useMemo } from 'react'
import {
  useSplitEarnings,
  useSplitMetadata,
  useSplitMetadataViaProvider,
} from '@0xsplits/splits-sdk-react'
import {
  RequestError,
  SplitProviderSearchCacheData,
} from '@0xsplits/splits-sdk-react/types'

import {
  CHAIN_INFO,
  isSupportedChainId,
  SupportedChainId,
} from '../../constants/chains'
import SplitRecipients from '../DisplaySplit/SplitRecipients'
import SkeletonLoader from '../DisplaySplit/SkeletonLoader'
import SplitBalances from '../DisplaySplit/SplitBalances'
import SplitHeader from '../DisplaySplit/SplitHeader'
import ChainLogo from '../util/ChainLogo'
import { IAddress } from '../../types'
import ComponentLayout from '../util/ComponentLayout'
import {
  readFromLocalStorage,
  saveToLocalStorage,
} from '../../utils/localStorage'

export interface IDisplaySplitProps {
  address: IAddress
  chainId: number
  erc20TokenList?: string[]
  displayBalances?: boolean
  displayChain?: boolean
  linkToApp?: boolean
  shouldWithdrawOnDistribute?: boolean
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  theme?: 'light' | 'dark' | 'system'
  onSuccess?: (token: string) => void
  onError?: (error: RequestError) => void
}

const DisplaySplit = ({
  address,
  chainId,
  erc20TokenList,
  displayBalances = true,
  displayChain = true,
  linkToApp = true,
  shouldWithdrawOnDistribute = false,
  width = 'md',
  theme = 'system',
  onSuccess,
  onError,
}: IDisplaySplitProps) => {
  const {
    data: split,
    error: metadataError,
    isLoading: isLoadingMetadata,
  } = useSplitMetadata(chainId, address)

  const includeActiveBalances = true
  const {
    data: splitEarnings,
    isLoading: isLoadingEarnings,
    error: earningsError,
    refetch: refetchEarnings,
  } = useSplitEarnings(chainId, address, {
    includeActiveBalances,
    erc20TokenList,
  })

  const onSuccessWrapper = useCallback(
    (token: string) => {
      refetchEarnings()
      if (onSuccess) onSuccess(token)
    },
    [refetchEarnings, onSuccess],
  )

  useEffect(() => {
    if (earningsError) {
      // eslint-disable-next-line no-console
      console.error(earningsError)
      onError && onError(earningsError)
    }
    if (metadataError) {
      // eslint-disable-next-line no-console
      console.error(metadataError)
      onError && onError(metadataError)
    }
  }, [earningsError, metadataError, onError])

  return (
    <ComponentLayout
      chainId={chainId}
      width={width}
      theme={theme}
      title={
        isSupportedChainId(chainId) ? (
          <SplitHeader
            chainId={chainId}
            address={address}
            linkToApp={linkToApp}
          />
        ) : undefined
      }
      corner={
        displayChain &&
        isSupportedChainId(chainId) && (
          <ChainLogo chainInfo={CHAIN_INFO[chainId]} />
        )
      }
      error={
        metadataError &&
        ((metadataError.name === 'AccountNotFoundError' && {
          title: 'Split not found',
          body: `This account is not a Splits contract on the ${
            isSupportedChainId(chainId) ? CHAIN_INFO[chainId].label : chainId
          } network.`,
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
              <SplitRecipients split={split} linkToApp={linkToApp} />
              {split && displayBalances && !isLoadingEarnings && (
                <SplitBalances
                  chainId={chainId as SupportedChainId}
                  split={split}
                  formattedSplitEarnings={splitEarnings}
                  shouldWithdrawOnDistribute={shouldWithdrawOnDistribute}
                  onSuccess={onSuccessWrapper}
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

export const DisplaySplitViaProvider = ({
  address,
  chainId,
  erc20TokenList,
  displayBalances = true,
  displayChain = true,
  linkToApp = true,
  shouldWithdrawOnDistribute = false,
  width = 'md',
  theme = 'system',
  onSuccess,
  onError,
  useCache,
}: IDisplaySplitProps & {
  useCache: boolean
}) => {
  const localStorageKey = `splits-kit.display.${chainId}.${address}`
  const localStorageData =
    readFromLocalStorage<SplitProviderSearchCacheData>(localStorageKey)

  const fetchMetadataOptions = useMemo(() => {
    if (!useCache) return

    return {
      cacheData: {
        blockRange: localStorageData?.blockRange
          ? BigInt(localStorageData?.blockRange)
          : undefined,
        ...(localStorageData?.blocks?.createBlock
          ? {
              blocks: {
                createBlock: localStorageData?.blocks?.createBlock
                  ? BigInt(localStorageData?.blocks?.createBlock)
                  : undefined,
                updateBlock: localStorageData?.blocks?.updateBlock
                  ? BigInt(localStorageData?.blocks?.updateBlock)
                  : undefined,
                latestScannedBlock: BigInt(
                  localStorageData?.blocks?.latestScannedBlock,
                ),
              },
            }
          : {}),
      },
    }
  }, [
    useCache,
    localStorageData?.blockRange,
    localStorageData?.blocks?.createBlock,
    localStorageData?.blocks?.updateBlock,
    localStorageData?.blocks?.latestScannedBlock,
  ])

  const {
    data: split,
    currentBlockRange,
    cacheData,
    error: metadataError,
    isLoading: isLoadingMetadata,
  } = useSplitMetadataViaProvider(chainId, address, fetchMetadataOptions)

  const includeActiveBalances = true
  const {
    data: splitEarnings,
    isLoading: isLoadingEarnings,
    error: earningsError,
    refetch: refetchEarnings,
  } = useSplitEarnings(chainId, address, {
    includeActiveBalances,
    erc20TokenList,
    requireDataClient: false,
  })

  const onSuccessWrapper = useCallback(
    (token: string) => {
      refetchEarnings()
      if (onSuccess) onSuccess(token)
    },
    [refetchEarnings, onSuccess],
  )

  useEffect(() => {
    if (earningsError) {
      // eslint-disable-next-line no-console
      console.error(earningsError)
      onError && onError(earningsError)
    }
    if (metadataError) {
      // eslint-disable-next-line no-console
      console.error(metadataError)
      onError && onError(metadataError)
    }
  }, [earningsError, metadataError, onError])

  useEffect(() => {
    if (useCache && cacheData) {
      saveToLocalStorage(localStorageKey, cacheData)
    }
  }, [useCache, cacheData])

  return (
    <ComponentLayout
      chainId={chainId}
      width={width}
      theme={theme}
      title={
        isSupportedChainId(chainId) ? (
          <SplitHeader
            chainId={chainId}
            address={address}
            linkToApp={linkToApp}
          />
        ) : undefined
      }
      corner={
        displayChain &&
        isSupportedChainId(chainId) && (
          <ChainLogo chainInfo={CHAIN_INFO[chainId]} />
        )
      }
      error={
        metadataError &&
        ((metadataError.name === 'AccountNotFoundError' && {
          title: 'Split not found',
          body: `This account is not a Splits contract on the ${
            isSupportedChainId(chainId) ? CHAIN_INFO[chainId].label : chainId
          } network.`,
        }) ||
          (metadataError.name === 'InvalidArgumentError' && {
            title: 'Invalid Address',
            body: `Address ${address} is not a valid Ethereum address.`,
          }) ||
          (metadataError.name === 'V1MainnetNotSupportedError' && {
            title: 'V1 Mainnet not supported',
            body: 'This is a v1 split, which is not supported on Mainnet. Please use app.splits.org instead',
          }))
      }
      body={
        <div className="flex flex-col text-xs">
          {isLoadingMetadata ? (
            currentBlockRange ? (
              <div>
                Scanning blocks {Number(currentBlockRange.to)} -{' '}
                {Number(currentBlockRange.from)}
              </div>
            ) : (
              <div>Loading split...</div>
            )
          ) : isLoadingEarnings ? (
            <div>Loading balances...</div>
          ) : (
            <div className="space-y-4">
              <SplitRecipients split={split} linkToApp={linkToApp} />
              {split && displayBalances && !isLoadingEarnings && (
                <SplitBalances
                  chainId={chainId as SupportedChainId}
                  split={split}
                  formattedSplitEarnings={splitEarnings}
                  shouldWithdrawOnDistribute={shouldWithdrawOnDistribute}
                  onSuccess={onSuccessWrapper}
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
