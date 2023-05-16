import React from 'react';
import { RecipientRow } from './RecipientRow';

interface SplitFormProps {
    onClick?: () => void;
}

export const CreateSplitForm = ({
    ...props
}: SplitFormProps) => {

    return(
        <div className={'relative flex items-stretch space-x-3 text-xs md:text-sm'}>
            <RecipientRow />
        </div>
    )
}