import { CHAIN_INFO, SupportedChainId } from '../../constants/chains'
import { RequestError } from '@0xsplits/splits-sdk-react/dist/types'
import CreateSplitForm from '../CreateSplit/CreateSplitForm'
import { ADDRESS_ZERO } from '../../constants/addresses'
import ComponentLayout from '../util/ComponentLayout'
import { IAddress, Recipient } from '../../types'
import ChainLogo from '../util/ChainLogo'
import {
  DEFAULT_DISTRIBUTOR_FEE,
  DEFAULT_DISTRIBUTOR_FEE_OPTIONS,
  DEFAULT_RECIPIENTS,
} from '../../constants/splits'
import { Log } from 'viem'

export interface ICreateSplitProps {
  chainId: SupportedChainId
  defaultDistributorFee?: number
  defaultController?: IAddress
  defaultRecipients?: Recipient[]
  defaultDistributorFeeOptions?: number[]
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  theme?: 'light' | 'dark' | 'system'
  displayChain?: boolean
  onSuccess?: (events: Log[]) => void
  onError?: (error: RequestError) => void
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
  onError,
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
          onError={onError}
        />
      }
    />
  )
}

export default CreateSplit
