import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import { SupportedChainId } from '../../src/constants/chains'
import ConnectWallet from '../components/ConnectWallet'
import { CreateSplit } from '../../src'

const DEFAULT_ARGS = {
  chainId: 1 as SupportedChainId,
}

const meta: Meta<typeof CreateSplit> = {
  title: 'Components/CreateSplit',
  component: CreateSplit,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Create a split contract',
      },
    },
  },
  argTypes: {
    chainId: {
      description: 'Chain ID of a supported network',
    },
    defaultController: {
      description: 'Default controller of the split contract',
      type: 'string',
    },
  },
  args: DEFAULT_ARGS,
  decorators: [
    (Story, context) => {
      return (
        <ConnectWallet chainId={context.args.chainId}>
          <Story />
        </ConnectWallet>
      )
    },
  ],
}

export default meta

type Story = StoryObj<typeof CreateSplit>

export const Basic: Story = {}

export const DefaultRecipients: Story = {
  args: {
    defaultRecipients: [
      {
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        percentAllocation: 80.0,
      },
      {
        address: '0xEc8Bfc8637247cEe680444BA1E25fA5e151Ba342',
        percentAllocation: 20.0,
      },
    ],
  },
}

export const MultiChain: Story = {
  args: {
    chainId: 5,
    defaultDistributorFee: 0.01,
    defaultDistributorFeeOptions: [0.1, 1, 10],
    defaultController: '0xA8b2e53C70743309f8D668B52ea09158008FAf91',
    defaultRecipients: [
      {
        address: '0xA8b2e53C70743309f8D668B52ea09158008FAf91',
        percentAllocation: 99.0,
      },
      {
        address: '0xEc8Bfc8637247cEe680444BA1E25fA5e151Ba342',
        percentAllocation: 1.0,
      },
    ],
  },
}
