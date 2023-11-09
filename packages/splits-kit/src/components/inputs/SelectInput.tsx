import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronDownIcon, LockClosedIcon } from '@heroicons/react/20/solid'

type SelectOption<ValueType> = {
  value: ValueType
  display: (active: boolean) => JSX.Element
}

const SelectInput = <ValueType,>({
  selectedOption,
  options,
  emptyText,
  selectValue,
  hideSelectedValue = true,
  isDisabled = false,
}: {
  selectedOption: ValueType
  options: SelectOption<ValueType>[]
  emptyText: string
  selectValue: (value: ValueType) => void
  hideSelectedValue?: boolean
  isDisabled?: boolean
}): JSX.Element => {
  const validSelection =
    options.filter((option) => option.value === selectedOption).length > 0
  const hasSelectedOption =
    validSelection && (selectedOption || selectedOption === 0)
  const selectedDisplay = hasSelectedOption
    ? getSelectedDisplay(selectedOption, options)
    : undefined

  return (
    <Listbox
      value={selectedOption}
      disabled={isDisabled}
      onChange={selectValue}
    >
      {({ open }) => {
        return (
          <div className={`relative transition`}>
            <Listbox.Button
              className={`group flex w-full items-center justify-between rounded border transition md:max-w-xs ${
                open
                  ? `border-gray-300 dark:border-gray-600`
                  : isDisabled
                  ? `cursor-not-allowed border-gray-200 bg-black/5 dark:border-gray-700 dark:bg-white/5`
                  : `border-gray-200 dark:border-gray-700`
              }`}
            >
              <div className="w-full py-2 px-3 text-left">
                {hasSelectedOption ? selectedDisplay : emptyText}
              </div>
              {isDisabled ? (
                <LockClosedIcon className="mr-1.5 h-3 w-3 flex-shrink-0 opacity-25" />
              ) : (
                <ChevronDownIcon
                  className={`mr-1.5 h-4 w-4 flex-shrink-0 transition ${
                    open ? `opacity-100` : `opacity-50 group-hover:opacity-100`
                  }`}
                />
              )}
            </Listbox.Button>
            <Transition
              show={open}
              as={Fragment}
              enter="transform duration-100 transition"
              enterFrom="opacity-50 -translate-y-0.5"
              enterTo="opacity-100"
              leave="transform duration-100 transition"
              leaveFrom="opacity-100 translate-y-0 "
              leaveTo="opacity-25 -translate-y-1"
            >
              <Listbox.Options
                className={`absolute z-40 mt-1 max-h-48 w-full max-w-xs overflow-hidden overflow-y-scroll rounded border border-gray-300 bg-white p-1 focus:outline-none dark:border-gray-600 dark:bg-black md:shadow-lg`}
              >
                {options
                  .filter((option) => {
                    if (!hideSelectedValue) return true
                    return option.value !== selectedOption
                  })
                  .map((option, index) => (
                    <Listbox.Option key={index} value={option.value}>
                      {({ active }) => {
                        return (
                          <div
                            key={index}
                            className={`focus:outline-none-sm w-full cursor-pointer rounded-sm px-3 py-2 ${
                              active && `bg-gray-100 dark:bg-white/5`
                            }`}
                          >
                            {option.display(active)}
                          </div>
                        )
                      }}
                    </Listbox.Option>
                  ))}
              </Listbox.Options>
            </Transition>
          </div>
        )
      }}
    </Listbox>
  )
}

const getSelectedDisplay = <ValueType,>(
  selected: ValueType,
  options: SelectOption<ValueType>[],
) => {
  const selectedOption = options.filter((option) => option.value === selected)
  if (selectedOption.length !== 1)
    throw new Error('Invalid arguments, selected not found in options')

  return selectedOption[0].display(false)
}

export default SelectInput
