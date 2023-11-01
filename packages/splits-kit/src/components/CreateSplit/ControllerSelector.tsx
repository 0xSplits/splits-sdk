import React from 'react'
import {
  Control,
  UseFormSetValue,
  UseFormSetError,
  Path,
  FieldValues,
} from 'react-hook-form'
import { Identicon } from '@lidofinance/identicon'
import { useAccount } from 'wagmi'

import AddressSelectInput from '../inputs/AddressSelectInput'
import { ADDRESS_ZERO } from '../../constants/addresses'
import { shortenAddress } from '../../utils/address'

export const ControllerSelector = <FormType extends FieldValues>({
  control,
  inputName,
  setValue,
  setError,
}: {
  control: Control<FormType>
  inputName: Path<FormType>
  setValue: UseFormSetValue<FormType>
  setError: UseFormSetError<FormType>
}): JSX.Element => {
  const { address: connectedAddress } = useAccount()
  const accountDisplayName =
    connectedAddress && shortenAddress(connectedAddress)

  return (
    <AddressSelectInput
      control={control}
      inputName={inputName}
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
                    <Identicon
                      address={connectedAddress}
                      diameter={18}
                      className={'flex-shrink-0'}
                    />
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
