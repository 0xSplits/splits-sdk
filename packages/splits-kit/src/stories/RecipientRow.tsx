import React from 'react';

interface RecipientRowProps {
    onClick?: () => void;
}

export const RecipientRow = ({
    ...props
}: RecipientRowProps) => {

    return(
        <>
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
                    className={`items-center space-x-2 bg-transparent px-3 p-2 transition focus:outline-none`}
                    placeholder={
                        "0"
                    }
                />
            </div>
      </>
    )
}