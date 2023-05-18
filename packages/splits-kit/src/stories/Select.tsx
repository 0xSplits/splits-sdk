import React, { Fragment } from 'react';
import { useState } from 'react';
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, LockClosedIcon } from '@heroicons/react/20/solid'

export type SelectOption = {
  name: string
  value: string
  display?: () => JSX.Element
  callback?: () => void
}

interface SelectProps {
  options: SelectOption[]
  label?: string
  isDisabled?:boolean
}

export const Select = ({
  isDisabled,
  options,
  label,
  ...props
}: SelectProps) => {
  const [selectedOption, setSelectedOption] = useState(options[0])

  return(
    <>
      <Listbox
        as="div"
        value={selectedOption}
        disabled={isDisabled}
        onChange={setSelectedOption}
      >
        {({ open }) => {
          return(
            <>
              <Listbox.Label>
                <div className="text-base mb-2">{label}</div>
              </Listbox.Label>
              <div className="relative">
                <Listbox.Button className={`text-sm flex w-full items-center justify-between rounded border transition md:max-w-sm ${
                open
                  ? `border-gray-300 shadow-sm dark:border-gray-600`
                  : isDisabled
                  ? `cursor-not-allowed border-gray-200 bg-black/5 dark:border-gray-700 dark:bg-white/5`
                  : `border-gray-200 hover:border-gray-300 hover:shadow dark:border-gray-700 dark:hover:border-gray-600`
              }`}>
                  <span className="w-full py-2 px-3 text-left">{selectedOption.name}</span>
                  {isDisabled ? (
                    <LockClosedIcon className="mr-1.5 h-3 w-3 flex-shrink-0 opacity-25" />
                  ) : (
                    <ChevronUpDownIcon className="mr-1.5 h-4 w-4 flex-shrink-0 opacity-50" />
                  )}
                </Listbox.Button>
              </div>
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
                <Listbox.Options className={`absolute z-40 mt-1 w-full max-w-sm overflow-hidden rounded border border-gray-200 bg-white p-1 focus:outline-none dark:border-gray-700 dark:bg-black md:shadow-lg`}>
                  {options.map((option:SelectOption, index:number) => (
                    <Listbox.Option
                      key={index}
                      value={option}
                      onClick={() => (option.callback ? option.callback() : null)}
                    >
                      {({ selected, active })=>(
                        <div  className={`text-sm focus:outline-none-sm w-full cursor-pointer rounded-sm px-3 py-2 ${
                          active && `bg-gray-100 dark:bg-gray-800`
                        }`}>
                          <span className="flex">
                            {option.display && (
                              <>{option.display()}</>
                            )}
                            {option.name}
                          
                          </span>
                        </div>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </>
          )
        }}
      </Listbox>
    </>
  )
}
