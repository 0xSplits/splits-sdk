import React, { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { Select, SelectOption } from './Select';
import { Button } from './Button';

interface SearchSelectProps {
    options: SelectOption[]
    label: string
    isDisabled?:boolean
    searchName: string
}

export const SearchSelect = ({
    isDisabled,
    options,
    label,
    searchName,
    ...props
  }: SearchSelectProps) => {
    const [isSearching, setIsSearching] = useState(false)
    const withSearchOptions = options.concat([{
        name: searchName,
        value: 'search',
        callback: () => (setIsSearching(true)),
        display: () => (
            <div className="flex items-center space-x-2 mr-2">
              <MagnifyingGlassIcon className="mx-0.5 h-4 w-4" />
            </div>
          ),
    }])

    if(isSearching) {
        return(
            <>
                {label}
                <div className={'relative flex-grow rounded border border-gray-200 focus-within:border-blue-500 focus-within:shadow dark:border-gray-700 dark:focus-within:border-blue-400'}>
                    <input
                        className={`flex w-full flex-grow items-center space-x-2 bg-transparent p-2 transition focus:outline-none`}
                        placeholder="placeholder"
                        autoComplete={'off'}
                        autoFocus={true}
                    />
                    <Button
                        variant="Mini"
                        onClick={() => (setIsSearching(false))}
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </Button>
                </div>
            </>
        )
    }

    return(
        <>
            {label}
            <Select options={withSearchOptions} isDisabled={isDisabled} />
        </>
    )
  }