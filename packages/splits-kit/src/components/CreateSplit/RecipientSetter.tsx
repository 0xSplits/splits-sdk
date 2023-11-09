import { useEffect } from 'react'
import { EllipsisHorizontalIcon, UserPlusIcon } from '@heroicons/react/20/solid'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { round, sumBy } from 'lodash'

import {
  EMPTY_RECIPIENT,
  SPLIT_RECIPIENT_MAX_DECIMALS,
} from '../../constants/splits'
import { RecipientRow } from '../CreateSplit/RecipientRow'
import TotalAllocated from '../CreateSplit/TotalAllocated'
import { SecondaryButton } from '../util/Button'
import DropdownMenu from '../util/DropdownMenu'
import { ICreateSplitForm } from '../../types'
import { SupportedChainId } from '../../constants/chains'

const RecipientSetter = ({ chainId }: { chainId: SupportedChainId }) => {
  const { watch, control, setValue } = useFormContext<ICreateSplitForm>()
  const { fields, append, remove } = useFieldArray({
    name: 'recipients',
    control,
  })
  const recipients = watch('recipients')

  useEffect(() => {
    if (recipients.length < 2) append(EMPTY_RECIPIENT, { shouldFocus: false })
  }, [append, recipients.length])

  const totalAllocated = sumBy(recipients, (r) => r.percentAllocation || 0)

  const numRecipientsWithNoOwnership = recipients.filter(
    (r) => !!r.percentAllocation,
  ).length

  const splitEvenly = () => {
    const num = fields.length
    const roundedSplit = round(100 / num, SPLIT_RECIPIENT_MAX_DECIMALS)
    const roundedSplitLeftover = round(
      100 - roundedSplit * num,
      SPLIT_RECIPIENT_MAX_DECIMALS,
    )
    fields.forEach((_, index) =>
      setValue(
        `recipients.${index}.percentAllocation`,
        roundedSplit + (index == 0 ? roundedSplitLeftover : 0),
      ),
    )
  }

  const splitRemaining = () => {
    const emptyRowIndices: number[] = []
    recipients.forEach((recipient, index) => {
      if ([0, null, undefined].includes(recipient.percentAllocation)) {
        emptyRowIndices.push(index)
      }
    })

    if (totalAllocated < 100) {
      const remainingOwnership = 100 - totalAllocated
      const roundedSplit = round(
        remainingOwnership / emptyRowIndices.length,
        SPLIT_RECIPIENT_MAX_DECIMALS,
      )
      const roundedSplitLeftover = round(
        remainingOwnership - roundedSplit * emptyRowIndices.length,
        SPLIT_RECIPIENT_MAX_DECIMALS,
      )
      emptyRowIndices.forEach((recipientIndex, index) => {
        setValue(
          `recipients.${recipientIndex}.percentAllocation`,
          roundedSplit + (index === 0 ? roundedSplitLeftover : 0),
        )
      })
    }
  }

  const menuOptions = [
    ...(numRecipientsWithNoOwnership !== 0 && totalAllocated < 100
      ? [
          {
            title: 'Split remaining',
            onClick: splitRemaining,
          },
        ]
      : []),
    {
      title: 'Split evenly',
      onClick: splitEvenly,
    },
  ]

  return (
    <div className="space-y-4">
      <div>Recipients</div>
      {fields.map((f, index) => (
        <RecipientRow
          key={f.id}
          index={index}
          chainId={chainId}
          onRemove={() => remove(index)}
        />
      ))}
      <div className="flex justify-between">
        <SecondaryButton
          onClick={() => append(EMPTY_RECIPIENT, { shouldFocus: true })}
          compact
          className="border-gray-200 transition hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-400"
        >
          <UserPlusIcon className="mr-1 h-3 w-3" />
          Add Recipient
        </SecondaryButton>
        <div className="flex space-x-4">
          <TotalAllocated totalAllocated={totalAllocated} />
          <DropdownMenu
            menuPosition="left"
            buttonBody={
              <EllipsisHorizontalIcon className="h-4 w-4 text-gray-600" />
            }
            menuItems={menuOptions}
          />
        </div>
      </div>
    </div>
  )
}

export default RecipientSetter
