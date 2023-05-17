import React from 'react';
import { RecipientRow } from './RecipientRow';
import { Button } from './Button';

interface SplitFormProps {
    onClick?: () => void;
}

export const CreateSplitForm = ({
    ...props
}: SplitFormProps) => {
    const generateKey = (pre:string) => {
        return `${ pre }_${ new Date().getTime() }`;
    }
    const [rows, setRows] = React.useState([<RecipientRow />]);
    function removeRow(index:string) {
        setRows((current) =>
            current.filter((_) => _.key !== index)
        );
    }

    function addRow() {
        const key = generateKey((rows.length+1).toString())
        setRows([...rows, <RecipientRow key={key} deleteClick={() => removeRow(key)} />]);
    }

    return(
        <>
            <div>
                {rows}
            </div>
            <div className={'my-5'}>
                <Button variant="Secondary" onClick={addRow}>Add Recipient</Button>
            </div>
        </>
    )
}