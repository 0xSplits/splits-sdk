import { useCallback, useEffect } from 'react'
import { RequestError } from '@0xsplits/splits-sdk-react/dist/types'
import { useCreateSplit, useCreateSplitV2 } from '@0xsplits/splits-sdk-react'
import { useForm, FormProvider } from 'react-hook-form'
import { Hex, Log } from 'viem'
import { useAccount } from 'wagmi'
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
import { SplitV2Type } from '@0xsplits/splits-sdk/types'

export type CreateSplitType = 'v1' | 'v2Pull' | 'v2Push'

const CreateSplitForm = ({
  chainId,
  type,
  salt,
  defaultDistributorFee,
  defaultRecipients,
  defaultOwner,
  defaultDistributorFeeOptions,
  linkToApp,
  supportsEns,
  onSuccess,
  onError,
}: {
  chainId: SupportedChainId
  type: CreateSplitType
  salt?: Hex
  defaultDistributorFee: number
  defaultOwner: IAddress
  defaultRecipients: Recipient[]
  defaultDistributorFeeOptions: number[]
  linkToApp: boolean
  supportsEns: boolean
  onSuccess?: (events: Log[]) => void
  onError?: (error: RequestError) => void
}) => {
  const { createSplit, error, status } = useCreateSplit()
  const {
    createSplit: createSplitV2,
    error: errorV2,
    status: statusV2,
  } = useCreateSplitV2()

  const isProcessing =
    status === 'pendingApproval' ||
    status === 'txInProgress' ||
    statusV2 === 'pendingApproval' ||
    statusV2 === 'txInProgress'

  useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error)
      onError && onError(error)
    }

    if (errorV2) {
      // eslint-disable-next-line no-console
      console.error(errorV2)
      onError && onError(errorV2)
    }
  }, [error, errorV2, onError])

  const { isConnected, address: connectedAddress, chain } = useAccount()

  const form = useForm<ICreateSplitForm>({
    mode: 'onChange',
    defaultValues: {
      recipients: defaultRecipients,
      owner: defaultOwner,
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
      if (type === 'v1') {
        const args = {
          recipients: data.recipients,
          distributorFeePercent: data.distributorFee,
          controller: data.owner,
        }

        const result = await createSplit(args)
        if (result) {
          onSuccess && onSuccess(result)
        }
      } else {
        const args = {
          recipients: data.recipients,
          distributorFeePercent: data.distributorFee,
          ownerAddress: data.owner,
          creatorAddress: connectedAddress,
          splitType: type === 'v2Pull' ? SplitV2Type.Pull : SplitV2Type.Push,
          salt,
          chainId,
        }

        const result = await createSplitV2(args)
        if (result) {
          onSuccess && onSuccess(result)
        }
      }
    },
    [type, createSplit, onSuccess],
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
          <RecipientSetter supportsEns={supportsEns} />
          <InputRow
            label="Owner"
            input={
              <ControllerSelector
                control={control}
                inputName={'owner'}
                setValue={setValue}
                setError={setError}
                supportsEns={supportsEns}
              />
            }
            link="https://docs.splits.org/create#split"
          />
          {defaultDistributorFeeOptions.length > 0 && (
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
          )}
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
              <Button
                type="submit"
                isDisabled={isButtonDisabled}
                isLoading={isProcessing}
              >
                Create Split
              </Button>
            </Tooltip>
            {linkToApp && (
              <>
                <span className="text-gray-400">or</span>
                <div>
                  <Link
                    href={createOnSplitsAppLink}
                    className="font-medium text-gray-500 dark:text-gray-300"
                  >
                    Create on app.splits.org
                  </Link>
                </div>
              </>
            )}
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
