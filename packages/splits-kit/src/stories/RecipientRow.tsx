import React from 'react';
import { Button } from './Button';
import { XMarkIcon } from '@heroicons/react/20/solid'

interface RecipientRowProps {
    onClick?: () => void;
    deleteClick?: () => void;
}

export const RecipientRow = ({
    ...props
}: RecipientRowProps) => {

    return(
        <div className={'flex items-stretch space-x-3 text-xs md:text-sm mb-5'}>
            <div className={'relative flex-grow rounded border border-gray-200 focus-within:border-blue-500 focus-within:shadow dark:border-gray-700 dark:focus-within:border-blue-400'}>
                <input
                    className={`flex w-full flex-grow items-center space-x-2 bg-transparent p-2 transition focus:outline-none`}
                    placeholder={
                        "Enter Address"
                    }
                />
            </div>
            
            <div className={'relative w-20 rounded border border-gray-200 focus-within:border-blue-500 focus-within:shadow dark:border-gray-700 dark:focus-within:border-blue-400'}>
                <input
                    type={'number'}
                    className={`w-full items-center space-x-2 bg-transparent px-3 p-2 transition focus:outline-none`}
                    placeholder={
                        "%"
                    }
                />
            </div>
            <Button disabled={props.deleteClick ? false : true} variant="Secondary"><XMarkIcon className="h-4 w-4" /></Button>
        </div>
    )
}