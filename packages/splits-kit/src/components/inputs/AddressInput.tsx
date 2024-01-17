import { useCallback, useEffect, useState } from 'react'
import {
  Control,
  Controller,
  FieldError,
  FieldValues,
  Path,
  PathValue,
  UseFormSetError,
  UseFormSetValue,
  useFormState,
  useWatch,
} from 'react-hook-form'
import { XMarkIcon } from '@heroicons/react/20/solid'
import { Dictionary } from 'lodash'

import { MiniButton } from '../util/Button'
import { shortenAddress, shortenENS } from '../../utils/address'
import { useEnsName, useEnsAddress } from 'wagmi'
import { IAddress } from '../../types'
import { SupportedChainId } from '../../constants/chains'
import { isAddress } from 'viem'
import SplitsAvatar from '../util/SplitsAvatar'

const AddressInput = <FormType extends FieldValues>({
  control,
  inputName,
  placeholder,
  setValue,
  setError,
  validationFunc,
  onClearInput,
  autoFocus,
  validAddressDisplay,
  chainId = 1,
}: {
  control: Control<FormType>
  inputName: Path<FormType>
  placeholder: string
  setValue: UseFormSetValue<FormType>
  setError: UseFormSetError<FormType>
  validationFunc: (
    address: string,
  ) => (boolean | string) | Promise<boolean | string>
  onClearInput?: () => void
  autoFocus?: boolean
  validAddressDisplay?: (address: string) => JSX.Element
  chainId?: SupportedChainId
}): JSX.Element => {
  const [addressEns, setAddressEns] = useState('')
  const inputVal = useWatch({
    control,
    name: inputName,
  })
  const { errors } = useFormState({
    control,
    name: inputName,
  })
  const error = getNestedObj(errors, inputName) as FieldError

  const { data, isError, isLoading } = useEnsName({
    address: inputVal,
    chainId,
    enabled: inputVal && isAddress(inputVal),
  })

  const { data: ensResolverData, isLoading: ensResolverLoading } =
    useEnsAddress({
      name: inputVal,
      chainId,
      enabled: inputVal && inputVal.endsWith('.eth'),
    })

  const onValidEns = useCallback(
    (address: string) => {
      setAddressEns(inputVal)
      const typedAddress = address as PathValue<FormType, Path<FormType>>
      setValue(inputName, typedAddress, { shouldValidate: true })
    },
    [inputName, inputVal, setValue],
  )

  const onInvalidEns = useCallback(() => {
    setAddressEns('')
    setError(inputName, { type: 'ensFailure', message: `ENS not found` })
  }, [inputName, setError])

  const onValidAddressWithEns = useCallback(
    (ens: string) => setAddressEns(ens),
    [],
  )

  useEffect(() => {
    if ((inputVal && !inputVal.endsWith('.eth')) || ensResolverLoading) return
    if (ensResolverData) onValidEns(ensResolverData)
  }, [ensResolverData, ensResolverLoading, inputVal, onValidEns])

  useEffect(() => {
    if ((inputVal && inputVal.endsWith('.eth')) || isLoading) return
    if (isError) onInvalidEns()
    if (data) onValidAddressWithEns(data)
  }, [data, inputVal, isError, isLoading, onInvalidEns, onValidAddressWithEns])

  const clearInput = useCallback(() => {
    const typedAddress = '' as PathValue<FormType, Path<FormType>>
    setValue(inputName, typedAddress)
    setAddressEns('')
    if (onClearInput) onClearInput()
  }, [inputName, onClearInput, setValue])

  return (
    <div
      className={
        'relative w-full flex-grow rounded border border-gray-200 ring-gray-500/10 transition focus-within:border-gray-400 focus-within:shadow-none dark:border-gray-700 dark:focus-within:border-gray-500'
      }
    >
      <Controller
        control={control}
        name={inputName}
        render={({ field }) =>
          isAddress(field.value) && !error ? (
            <ValidAddressDisplay
              address={field.value}
              ens={addressEns}
              onClearInput={clearInput}
              validAddressDisplay={validAddressDisplay}
            />
          ) : (
            <>
              <input
                className={`flex w-full flex-grow items-center space-x-2 bg-transparent py-2 px-3 transition focus:outline-none`}
                placeholder={placeholder}
                autoComplete={'off'}
                autoFocus={autoFocus}
                {...field}
              />
              {onClearInput && (
                <MiniButton
                  type="button"
                  compact
                  onClick={onClearInput}
                  eventName={'clearedTokenToBeneficiary'}
                  className="absolute inset-y-0 right-0 focus:outline-none"
                >
                  <XMarkIcon className="h-4 w-4" />
                </MiniButton>
              )}
            </>
          )
        }
        rules={{
          required: {
            value: true,
            message: 'Required',
          },
          validate: validationFunc,
        }}
      />
      <AddressErrorsDisplay
        fieldError={error}
        address={inputVal}
        ens={addressEns}
      />
    </div>
  )
}

const ValidAddressDisplay = ({
  address,
  ens,
  onClearInput,
  validAddressDisplay,
}: {
  address: IAddress
  ens?: string
  onClearInput: () => void
  validAddressDisplay?: (address: string) => JSX.Element
}): JSX.Element => {
  return (
    <div className={`flex w-full`}>
      <div className="flex w-full flex-grow items-center space-x-1.5 p-2">
        {validAddressDisplay ? (
          validAddressDisplay(address)
        ) : (
          <>
            <SplitsAvatar
              address={address}
              size={18}
              className={'flex-shrink-0'}
            />
            {ens ? (
              <div className={'flex'}>{shortenENS(ens)}</div>
            ) : (
              <div className={'flex'}>{shortenAddress(address)}</div>
            )}
          </>
        )}
      </div>
      <MiniButton
        type="button"
        compact
        onClick={onClearInput}
        eventName={'clearedTokenToBeneficiary'}
      >
        <XMarkIcon className="h-4 w-4" />
      </MiniButton>
    </div>
  )
}

const AddressErrorsDisplay = ({
  fieldError,
  address,
  ens,
}: {
  fieldError?: FieldError
  address: IAddress
  ens?: string
}): JSX.Element => {
  return (
    <div
      className={
        'absolute -bottom-2.5 left-2 flex items-center bg-white px-px text-[12px] dark:bg-black'
      }
    >
      {(() => {
        if (fieldError)
          return (
            <AddressInputMessage
              isError
              message={fieldError.message ?? 'Error'}
            />
          )
        else if (isAddress(address))
          return (
            <AddressInputMessage
              message={ens ? shortenAddress(address) : 'Valid address'}
            />
          )
      })()}
    </div>
  )
}

export const AddressInputMessage = ({
  message,
  isError,
}: {
  message: string
  isError?: boolean
}): JSX.Element => {
  return (
    <p
      className={
        isError
          ? `text-red-500 dark:text-red-400`
          : `text-green-500 dark:text-green-400`
      }
    >
      {message}
    </p>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getNestedObj = (object: Dictionary<any>, pathName: string) => {
  let currentObj = object
  const pathParts = pathName.split('.')
  pathParts.map((part) => {
    if (currentObj) {
      currentObj = currentObj[part]
    }
  })

  return currentObj
}

export default AddressInput
