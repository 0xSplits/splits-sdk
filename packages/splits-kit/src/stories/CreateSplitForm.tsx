import React from 'react';
import { RecipientRow } from './RecipientRow';
import { Button } from './Button';
import { SearchSelect } from './SearchSelect';

interface SplitFormProps {
    onClick?: () => void;
}

export const CreateSplitForm = ({
    ...props
}: SplitFormProps) => {
    const generateKey = (pre:string) => {
        return `${ pre }_${ new Date().getTime() }`;
    }
    const [rows, setRows] = React.useState([<RecipientRow key={generateKey('1')} />]);
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
            <div className={'my-5'}>
            <SearchSelect label="Controller" searchName="Enter Address" options={[{name: "No Controller (immutable)", value: "no-controller"}]} />
            </div>
            
            <SearchSelect label="Distributor Fee" searchName="Custom %" searchType='number' options={[{name: "0.1%", value: "0.1"},{name: "1%", value: "1"},{name: "5%", value: "5"}]} />
        </>
    )
}