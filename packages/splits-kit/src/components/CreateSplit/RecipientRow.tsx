import React from 'react'
import { XMarkIcon } from '@heroicons/react/20/solid'
import { useFormContext } from 'react-hook-form'
import { isAddress } from 'viem'

import AddressInput from '../inputs/AddressInput'
import { SecondaryButton } from '../util/Button'
import NumberInput from '../inputs/NumberInput'
import { CreateSplitForm } from '../../types'

export const RecipientRow = ({
  index,
  onRemove,
}: {
  index: number
  onRemove?: () => void
}) => {
  const { control, getValues, setValue, setError } =
    useFormContext<CreateSplitForm>()

  const isAddressValid = () => {
    return isAddress(getValues(`recipients.${index}.address`))
  }

  return (
    <fieldset>
      <div className={'flex items-stretch space-x-3'}>
        <AddressInput
          control={control}
          inputName={`recipients.${index}.address`}
          placeholder="Enter address"
          setValue={setValue}
          setError={setError}
          validationFunc={isAddressValid}
        />
        <div className="w-1/3">
          <NumberInput
            inputName={`recipients.${index}.percentAllocation`}
            control={control}
            maxVal={99.9999}
            minVal={0.0001}
            decimalScale={4}
            placeholder={'0.00%'}
            suffix="%"
          />
        </div>
        <SecondaryButton
          compact
          onClick={onRemove}
          className="border-gray-200 transition hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500"
        >
          <XMarkIcon className="w-4" />
        </SecondaryButton>
      </div>
    </fieldset>
  )
}
