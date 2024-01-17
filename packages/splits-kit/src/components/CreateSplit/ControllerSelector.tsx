import {
  Control,
  UseFormSetValue,
  UseFormSetError,
  Path,
  FieldValues,
} from 'react-hook-form'
import SplitsAvatar from '../util/SplitsAvatar'
import { useAccount } from 'wagmi'

import AddressSelectInput from '../inputs/AddressSelectInput'
import { ADDRESS_ZERO } from '../../constants/addresses'
import { shortenAddress } from '../../utils/address'
import { SupportedChainId } from '../../constants/chains'

export const ControllerSelector = <FormType extends FieldValues>({
  control,
  inputName,
  setValue,
  setError,
  chainId,
}: {
  control: Control<FormType>
  inputName: Path<FormType>
  setValue: UseFormSetValue<FormType>
  setError: UseFormSetError<FormType>
  chainId: SupportedChainId
}): JSX.Element => {
  const { address: connectedAddress } = useAccount()
  const accountDisplayName =
    connectedAddress && shortenAddress(connectedAddress)

  return (
    <AddressSelectInput
      control={control}
      inputName={inputName}
      chainId={chainId}
      options={[
        {
          value: ADDRESS_ZERO,
          display: () => <div>No controller (immutable)</div>,
        },
        ...(connectedAddress
          ? [
              {
                value: connectedAddress,
                display: () => (
                  <div className="flex w-full flex-grow items-center space-x-2">
                    <SplitsAvatar address={connectedAddress} size={18} />
                    <div className={'flex truncate'}>{accountDisplayName}</div>
                    <div className="flex-shrink-0 rounded-lg bg-blue-100/50 px-2 text-[80%] text-blue-500 dark:bg-blue-900/50">
                      You
                    </div>
                  </div>
                ),
              },
            ]
          : []),
      ]}
      emptyText={'No controller (immutable)'}
      setValue={setValue}
      setError={setError}
      validationFunc={() => {
        return true
      }}
      clearAddressDefaultValue={ADDRESS_ZERO}
    />
  )
}
