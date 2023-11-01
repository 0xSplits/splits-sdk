import React, { useCallback } from 'react'
import { useCreateSplit } from '@0xsplits/splits-sdk-react'
import { CreateSplitConfig } from '@0xsplits/splits-sdk'
import { useForm, FormProvider } from 'react-hook-form'
import type { Event } from '@ethersproject/contracts'
import { useAccount, useNetwork } from 'wagmi'
import { uniq } from 'lodash'

import { ControllerSelector } from '../CreateSplit/ControllerSelector'
import RecipientSetter from '../CreateSplit/RecipientSetter'
import NumberSelectInput from '../inputs/NumberSelectInput'
import { IAddress, Recipient, CreateSplitForm } from '../../types'
import Disclaimer from '../CreateSplit/Disclaimer'
import InputRow from '../inputs/InputRow'
import { CHAIN_INFO, SupportedChainId } from '../../constants/chains'
import Tooltip from '../util/Tooltip'
import Button from '../util/Button'

const CreateCreateSplitForm = ({
  chainId,
  defaultDistributorFee,
  defaultRecipients,
  defaultController,
  defaultDistributorFeeOptions,
  onSuccess,
}: {
  chainId: SupportedChainId
  defaultDistributorFee: number
  defaultController: IAddress
  defaultRecipients: Recipient[]
  defaultDistributorFeeOptions: number[]
  onSuccess?: (address: string, event: Event | undefined) => void
}) => {
  const { createSplit } = useCreateSplit()
  const { isConnected } = useAccount()
  const { chain } = useNetwork()

  const form = useForm<CreateSplitForm>({
    mode: 'onChange',
    defaultValues: {
      recipients: defaultRecipients,
      controller: defaultController,
      distributorFee: defaultDistributorFee,
    },
  })

  const {
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { isValid: isFormValid },
  } = form

  const onSubmit = useCallback(
    async (data: CreateSplitForm) => {
      const args: CreateSplitConfig = {
        recipients: data.recipients,
        distributorFeePercent: data.distributorFee,
        controller: data.controller,
      }
      const result = await createSplit(args)
      if (result) {
        const event = result?.[0]
        const splitId = event?.args?.split
        onSuccess && onSuccess(splitId, event)
      }
    },
    [createSplit, onSuccess],
  )

  const isWrongChain = chain && chainId !== chain.id
  const isButtonDisabled = !isConnected || isWrongChain || !isFormValid

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <RecipientSetter />
        <InputRow
          label="Controller"
          input={
            <ControllerSelector
              control={control}
              inputName={'controller'}
              setValue={setValue}
              setError={setError}
            />
          }
          link="https://docs.splits.org/create#split"
        />
        <InputRow
          label="Distributor Fee"
          input={
            <NumberSelectInput
              control={control}
              inputName={'distributorFee'}
              defaultVal={defaultDistributorFee}
              setValue={setValue}
              options={uniq([
                ...defaultDistributorFeeOptions,
                defaultDistributorFee,
              ])
                .sort()
                .map((value) => {
                  return {
                    value,
                    display: () => <span>{value}%</span>,
                  }
                })
                .concat([
                  {
                    value: 0,
                    display: () => <span>Manually distribute (0%)</span>,
                  },
                ])}
              placeholder={`${defaultDistributorFee}%`}
              decimalScale={2}
              suffix={`%`}
              minVal={0.01}
              maxVal={99.99}
              hideSelectedValue={false}
            />
          }
          link="https://docs.splits.org/distribute#distribution-bounty"
        />
        <div className={'my-5'}>
          <Tooltip
            isDisabled={isConnected && !isWrongChain}
            content={
              isWrongChain
                ? `Switch to ${CHAIN_INFO[chainId].label} to distribute funds`
                : !isConnected
                ? 'Connect wallect'
                : ''
            }
          >
            <Button type="submit" isDisabled={isButtonDisabled}>
              Create Split
            </Button>
          </Tooltip>
        </div>
      </form>
      <Disclaimer />
    </FormProvider>
  )
}

export default CreateCreateSplitForm
