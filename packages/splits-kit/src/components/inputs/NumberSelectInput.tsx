import { useCallback, useEffect, useState } from 'react'
import {
  FieldValues,
  Control,
  Path,
  UseFormSetValue,
  useWatch,
  PathValue,
} from 'react-hook-form'

import NumberInput from './NumberInput'
import SelectInput from './SelectInput'

const NumberSelectInput = <FormType extends FieldValues>({
  control,
  inputName,
  defaultVal,
  options,
  setValue,
  placeholder,
  decimalScale,
  suffix,
  minVal,
  maxVal,
  isDisabled = false,
  hideSelectedValue = false,
  secondaryDisplay,
}: {
  control: Control<FormType>
  inputName: Path<FormType>
  defaultVal: number
  options: {
    value: number
    display: (active: boolean) => JSX.Element
  }[]
  setValue: UseFormSetValue<FormType>
  placeholder: string
  decimalScale: number
  suffix: string
  minVal: number
  maxVal?: number
  isDisabled?: boolean
  hideSelectedValue?: boolean
  secondaryDisplay?: (value: number) => JSX.Element
}): JSX.Element => {
  const inputVal = useWatch({
    control,
    name: inputName,
  })

  const currentValInList =
    options.filter((option) => option.value === inputVal).length > 0
  const [showCustom, setShowCustom] = useState(!currentValInList)

  useEffect(() => {
    if (!currentValInList) setShowCustom(true)
  }, [currentValInList])

  const clearNumber = useCallback(() => {
    const typedValue = defaultVal as PathValue<FormType, Path<FormType>>

    setValue(inputName, typedValue)
    setShowCustom(false)
  }, [defaultVal, inputName, setValue])

  const selectNumber = (value: string) => {
    if (value === 'custom') {
      setShowCustom(true)
    } else {
      const typedValue = parseFloat(value) as PathValue<
        FormType,
        Path<FormType>
      >
      setValue(inputName, typedValue)
    }
  }

  if (showCustom)
    return (
      <NumberInput
        control={control}
        inputName={inputName}
        placeholder={placeholder}
        decimalScale={decimalScale}
        suffix={suffix}
        minVal={minVal}
        maxVal={maxVal}
        onClearInput={clearNumber}
        autoFocus
        secondaryDisplay={secondaryDisplay}
      />
    )

  return (
    <SelectInput
      selectedOption={`${inputVal}`}
      emptyText={''}
      options={options
        .map((option) => {
          return {
            value: `${option.value}`,
            display: option.display,
          }
        })
        .concat([
          {
            value: 'custom',
            display: () => <div>Custom</div>,
          },
        ])}
      selectValue={selectNumber}
      hideSelectedValue={hideSelectedValue}
      isDisabled={isDisabled}
    />
  )
}

export default NumberSelectInput
