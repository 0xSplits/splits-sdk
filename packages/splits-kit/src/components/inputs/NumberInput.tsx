import {
  Control,
  Controller,
  FieldErrors,
  FieldName,
  FieldValues,
  Path,
  PathValue,
  useFormState,
} from 'react-hook-form'
import { NumericFormat } from 'react-number-format'
import {
  ErrorMessage,
  FieldValuesFromFieldErrors,
} from '@hookform/error-message'
import { XMarkIcon } from '@heroicons/react/20/solid'

import { MiniButton } from '../util/Button'
import { AddressInputMessage } from './AddressInput'

const NumberInput = <FormType extends FieldValues>({
  control,
  inputName,
  placeholder,
  decimalScale,
  minVal,
  maxVal,
  suffix,
  onClearInput,
  autoFocus,
  secondaryDisplay,
}: {
  control: Control<FormType>
  inputName: Path<FormType>
  placeholder: string
  decimalScale: number
  minVal?: number
  maxVal?: number
  suffix?: string
  token?: string
  onClearInput?: () => void
  autoFocus?: boolean
  secondaryDisplay?: (value: number) => JSX.Element
}): JSX.Element => {
  const { errors } = useFormState({
    control,
  })

  return (
    <div
      className={
        'relative w-full max-w-xs flex-grow rounded border border-gray-200 ring-gray-500/10 transition focus-within:border-gray-400 dark:border-gray-700 dark:focus-within:border-gray-500'
      }
    >
      <Controller
        render={({ field }) => (
          // TODO: should we just treat it as a string input instead? And convert to a number when necessary?
          <>
            <div className="flex items-center justify-between">
              <NumericFormat
                className={`w-full flex-grow bg-transparent py-2 px-3 transition focus:outline-none`}
                decimalScale={decimalScale}
                suffix={suffix}
                placeholder={placeholder}
                onValueChange={({ floatValue }) => {
                  // TODO: how can we handle this better. Reverts back to start value if it's set to undefined.
                  // Pretty annoying on the edit flow.
                  field.onChange(floatValue)
                }}
                value={field.value}
                autoFocus={autoFocus}
              />
              {secondaryDisplay && secondaryDisplay(field.value)}
            </div>
            {onClearInput && (
              <MiniButton
                type="button"
                compact
                onClick={onClearInput}
                eventName={'clearedNumberInput'}
                className="absolute inset-y-0 right-0 focus:outline-none"
              >
                <XMarkIcon className="h-4 w-4" />
              </MiniButton>
            )}
          </>
        )}
        name={inputName}
        control={control}
        rules={{
          required: {
            value: true,
            message: 'Required',
          },
          ...(maxVal
            ? {
                max: {
                  value: maxVal as PathValue<FormType, Path<FormType>>,
                  message: `${maxVal}${suffix} max`,
                },
              }
            : {}),
          ...(minVal
            ? {
                min: {
                  value: minVal as PathValue<FormType, Path<FormType>>,
                  message: `${minVal}${suffix} min`,
                },
              }
            : {}),
        }}
      />
      <div
        className={
          'absolute -bottom-2.5 left-2 flex items-center bg-white px-px text-[12px] dark:bg-black'
        }
      >
        {errors && Object.keys(errors).length > 0 && (
          <ErrorMessage
            errors={errors}
            name={
              inputName as unknown as FieldName<
                FieldValuesFromFieldErrors<FieldErrors<FormType>>
              >
            }
            render={({ message }) => (
              <AddressInputMessage isError message={message ?? 'Error'} />
            )}
          />
        )}
      </div>
    </div>
  )
}

export default NumberInput
