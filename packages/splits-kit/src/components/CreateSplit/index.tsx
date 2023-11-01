import React from 'react'
import type { Event } from '@ethersproject/contracts'

import ComponentLayout from '../util/ComponentLayout'
import CreateSplitForm from '../CreateSplit/CreateSplitForm'
import { getNativeTokenSymbol } from '../../utils/display'
import { ADDRESS_ZERO } from '../../constants/addresses'
import ChainLogo from '../util/ChainLogo'
import Segment from '../util/Segment'
import { CHAIN_INFO, SupportedChainId } from '../../constants/chains'
import { IAddress, Recipient } from '../../types'
import Link from '../util/Link'
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
  displayChain = true,
  onSuccess,
}: ICreateSplitProps) => {
  return (
    <ComponentLayout width={width}>
      <Segment
        title={'New Split contract'}
        corner={
          displayChain
            ? CHAIN_INFO[chainId] && (
                <ChainLogo chainInfo={CHAIN_INFO[chainId]} />
              )
            : undefined
        }
        body={
          <div className="space-y-8 flex flex-col">
            <div className="leading-relaxed text-gray-500">
              Split is a payable smart contract that splits all incoming{' '}
              {getNativeTokenSymbol(chainId)} & ERC20 tokens among the
              recipients according to predefined ownership shares.{' '}
              <Link
                href="https://docs.splits.org/core/split"
                className="underline transition hover:opacity-80"
              >
                Learn more
              </Link>
            </div>
            <CreateSplitForm
              defaultDistributorFee={defaultDistributorFee}
              defaultController={defaultController}
              defaultRecipients={defaultRecipients}
              defaultDistributorFeeOptions={defaultDistributorFeeOptions}
              chainId={chainId}
              onSuccess={onSuccess}
            />
          </div>
        }
      />
    </ComponentLayout>
  )
}

export default CreateSplit
