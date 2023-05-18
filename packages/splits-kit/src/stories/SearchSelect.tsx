import React, { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, PencilIcon } from '@heroicons/react/20/solid'
import { Select, SelectOption } from './Select';
import { Button } from './Button';

interface SearchSelectProps {
    options: SelectOption[]
    label: string
    isDisabled?:boolean
    searchName: string
    searchType?: 'number' | 'text'
}

export const SearchSelect = ({
    isDisabled,
    options,
    label,
    searchName,
    searchType = 'text',
    ...props
  }: SearchSelectProps) => {
    const [isSearching, setIsSearching] = useState(false)
    const withSearchOptions = options.concat([{
        name: searchName,
        value: 'search',
        callback: () => (setIsSearching(true)),
        display: () => (
            <div className="flex items-center space-x-2 mr-2">
              <PencilIcon className="mx-0.5 h-4 w-4" />
            </div>
          ),
    }])

    if(isSearching) {
        return(
            <>
                <div className="text-base mb-2">{label}</div>
                <div className={'relative flex-grow md:max-w-sm rounded border border-gray-200 focus-within:border-blue-500 focus-within:shadow dark:border-gray-700 dark:focus-within:border-blue-400'}>
                    <input
                        className={`flex w-full max-w-sm flex-grow items-center space-x-2 bg-transparent p-2 transition focus:outline-none`}
                        placeholder={searchName}
                        autoComplete={'off'}
                        autoFocus={true}
                        type={searchType}
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
            <div className="text-base mb-2">{label}</div>
            <Select options={withSearchOptions} isDisabled={isDisabled} />
        </>
    )
  }