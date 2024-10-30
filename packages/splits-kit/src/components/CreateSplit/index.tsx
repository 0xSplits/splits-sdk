import { RequestError } from '@0xsplits/splits-sdk-react/dist/types'
import { Hex, Log } from 'viem'

import CreateSplitForm from '../CreateSplit/CreateSplitForm'
import { ADDRESS_ZERO } from '../../constants/addresses'
import ComponentLayout from '../util/ComponentLayout'
import { IAddress, Recipient, SplitType } from '../../types'
import ChainLogo from '../util/ChainLogo'
import {
  CHAIN_INFO,
  isSupportedChainId,
  SupportedChainId,
} from '../../constants/chains'
import {
  DEFAULT_DISTRIBUTOR_FEE,
  DEFAULT_DISTRIBUTOR_FEE_OPTIONS,
} from '../../constants/splits'

export interface ICreateSplitProps {
  chainId: number
  type?: SplitType
  salt?: Hex
  defaultDistributorFee?: number
  defaultOwner?: IAddress
  defaultRecipients?: Recipient[]
  defaultDistributorFeeOptions?: number[]
  linkToApp?: boolean
  supportsEns?: boolean
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  theme?: 'light' | 'dark' | 'system'
  displayChain?: boolean
  onSuccess?: (events: Log[]) => void
  onError?: (error: RequestError) => void
}

const CreateSplit = ({
  chainId,
  type = 'v2Push',
  salt,
  defaultDistributorFee = DEFAULT_DISTRIBUTOR_FEE,
  defaultOwner = ADDRESS_ZERO,
  defaultRecipients = [],
  defaultDistributorFeeOptions = DEFAULT_DISTRIBUTOR_FEE_OPTIONS,
  linkToApp = true,
  supportsEns = true,
  width = 'lg',
  theme = 'system',
  displayChain = true,
  onSuccess,
  onError,
}: ICreateSplitProps) => {
  return (
    <ComponentLayout
      chainId={chainId}
      width={width}
      theme={theme}
      title={'New Split contract'}
      corner={
        displayChain && isSupportedChainId(chainId)
          ? CHAIN_INFO[chainId] && <ChainLogo chainInfo={CHAIN_INFO[chainId]} />
          : undefined
      }
      body={
        <CreateSplitForm
          defaultDistributorFee={defaultDistributorFee}
          defaultOwner={defaultOwner}
          defaultRecipients={defaultRecipients}
          defaultDistributorFeeOptions={defaultDistributorFeeOptions}
          chainId={chainId as SupportedChainId}
          type={type}
          salt={salt}
          linkToApp={linkToApp}
          supportsEns={supportsEns}
          onSuccess={onSuccess}
          onError={onError}
        />
      }
    />
  )
}

export default CreateSplit
