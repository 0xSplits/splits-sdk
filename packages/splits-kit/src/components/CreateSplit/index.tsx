import React from 'react'
import type { Event } from '@ethersproject/contracts'

import CreateSplitForm from '../CreateSplit/CreateSplitForm'
import { ADDRESS_ZERO } from '../../constants/addresses'
import ChainLogo from '../util/ChainLogo'
import ComponentLayout from '../util/ComponentLayout'
import { CHAIN_INFO, SupportedChainId } from '../../constants/chains'
import { IAddress, Recipient } from '../../types'
import {
  DEFAULT_DISTRIBUTOR_FEE,
  DEFAULT_DISTRIBUTOR_FEE_OPTIONS,
  DEFAULT_RECIPIENTS,
} from '../../constants/splits'

export interface ICreateSplitProps {
  chainId: SupportedChainId
  defaultDistributorFee?: number
  defaultController?: IAddress
  defaultRecipients?: Recipient[]
  defaultDistributorFeeOptions?: number[]
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  theme?: 'light' | 'dark' | 'system'
  displayChain?: boolean
  onSuccess?: (address: string, event: Event | undefined) => void
}

const CreateSplit = ({
  chainId,
  defaultDistributorFee = DEFAULT_DISTRIBUTOR_FEE,
  defaultController = ADDRESS_ZERO,
  defaultRecipients = DEFAULT_RECIPIENTS,
  defaultDistributorFeeOptions = DEFAULT_DISTRIBUTOR_FEE_OPTIONS,
  width = 'lg',
  theme = 'system',
  displayChain = true,
  onSuccess,
}: ICreateSplitProps) => {
  return (
    <ComponentLayout
      chainId={chainId}
      width={width}
      theme={theme}
      title={'New Split contract'}
      corner={
        displayChain
          ? CHAIN_INFO[chainId] && <ChainLogo chainInfo={CHAIN_INFO[chainId]} />
          : undefined
      }
      body={
        <CreateSplitForm
          defaultDistributorFee={defaultDistributorFee}
          defaultController={defaultController}
          defaultRecipients={defaultRecipients}
          defaultDistributorFeeOptions={defaultDistributorFeeOptions}
          chainId={chainId}
          onSuccess={onSuccess}
        />
      }
    />
  )
}

export default CreateSplit
