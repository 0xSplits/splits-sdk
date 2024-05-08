import { useCallback, useEffect } from 'react'
import { RequestError } from '@0xsplits/splits-sdk-react/dist/types'
import { useCreateSplit } from '@0xsplits/splits-sdk-react'
import { CreateSplitConfig } from '@0xsplits/splits-sdk'
import { useForm, FormProvider } from 'react-hook-form'
import { useAccount, useNetwork } from 'wagmi'
import { sum, uniq } from 'lodash'

import { ControllerSelector } from '../CreateSplit/ControllerSelector'
import { CHAIN_INFO, SupportedChainId } from '../../constants/chains'
import { IAddress, Recipient, ICreateSplitForm } from '../../types'
import RecipientSetter from '../CreateSplit/RecipientSetter'
import NumberSelectInput from '../inputs/NumberSelectInput'
import { getNativeTokenSymbol } from '../../utils/display'
import { getSplitRouterParams } from '../../utils/splits'
import InputRow from '../inputs/InputRow'
import Tooltip from '../util/Tooltip'
import Button from '../util/Button'
import Link from '../util/Link'
import { Log } from 'viem'

const CreateSplitForm = ({
  chainId,
  defaultDistributorFee,
  defaultRecipients,
  defaultController,
  defaultDistributorFeeOptions,
  onSuccess,
  onError,
}: {
  chainId: SupportedChainId
  defaultDistributorFee: number
  defaultController: IAddress
  defaultRecipients: Recipient[]
  defaultDistributorFeeOptions: number[]
  onSuccess?: (events: Log[]) => void
  onError?: (error: RequestError) => void
}) => {
  const { createSplit, error } = useCreateSplit()

  useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error)
      onError && onError(error)
    }
  }, [error, onError])

  const { isConnected, address: connectedAddress } = useAccount()
  const { chain } = useNetwork()

  const form = useForm<ICreateSplitForm>({
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
    watch,
    setValue,
    setError,
    formState: { isValid: isFormValid },
  } = form

  const onSubmit = useCallback(
    async (data: ICreateSplitForm) => {
      const args: CreateSplitConfig = {
        recipients: data.recipients,
        distributorFeePercent: data.distributorFee,
        controller: data.controller,
      }
      const result = await createSplit(args)
      if (result) {
        onSuccess && onSuccess(result)
      }
    },
    [createSplit, onSuccess],
  )

  const recipientAllocationTotal = sum(
    watch('recipients').map((recipient) => recipient.percentAllocation),
  )

  const isFullyAllocated = recipientAllocationTotal === 100
  const isWrongChain = chain && chainId !== chain.id
  const isButtonDisabled =
    !isConnected || isWrongChain || !isFormValid || !isFullyAllocated

  const formData = watch()
  const createOnSplitsAppLink = `https://app.splits.org/new/split?${getSplitRouterParams(
    formData,
    connectedAddress,
  )}`

  return (
    <div className="space-y-8 flex flex-col">
      <FormProvider {...form}>
        <div className="leading-relaxed text-gray-500">
          Split is a payable smart contract that splits all incoming{' '}
          {getNativeTokenSymbol(chainId)} & ERC20 tokens among the recipients
          according to predefined ownership shares.{' '}
          <Link
            href="https://docs.splits.org/core/split"
            className="underline transition hover:opacity-80"
          >
            Learn more
          </Link>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <RecipientSetter chainId={chainId} />
          <InputRow
            label="Controller"
            input={
              <ControllerSelector
                chainId={chainId}
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
          <div className="my-5 flex flex-col space-y-1 text-center">
            <Tooltip
              isDisabled={isConnected && !isWrongChain}
              content={
                isWrongChain
                  ? `Switch to ${CHAIN_INFO[chainId].label} to distribute funds`
                  : !isConnected
                  ? 'Connect wallet'
                  : ''
              }
            >
              <Button type="submit" isDisabled={isButtonDisabled}>
                Create Split
              </Button>
            </Tooltip>
            <span className="text-gray-400">or</span>
            <div>
              <Link
                href={createOnSplitsAppLink}
                className="font-medium text-gray-500 dark:text-gray-300"
              >
                Create on app.splits.org
              </Link>
            </div>
          </div>
        </form>
        <Disclaimer />
      </FormProvider>
    </div>
  )
}

const Disclaimer = () => {
  return (
    <div className="text-xs max-w-md mx-auto text-center text-gray-500 mt-4">
      By creating a Split you agree to the{' '}
      <Link href="https://splits.org/terms/" className="underline">
        Terms of Service
      </Link>{' '}
      and acknowledge that you have read &amp; understand the{' '}
      <Link href="https://splits.org/disclaimer/" className="underline">
        Protocol Disclaimer
      </Link>
    </div>
  )
}

export default CreateSplitForm
