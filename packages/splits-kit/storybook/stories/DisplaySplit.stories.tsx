import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import { SupportedChainId } from '../../src/constants/chains'
import ConnectWallet from '../components/ConnectWallet'
import { DisplaySplit } from '../../src'

export type IAddress = `0x${string}`

const DEFAULT_ARGS = {
  address: '0xF8843981e7846945960f53243cA2Fd42a579f719' as IAddress,
  chainId: 1 as SupportedChainId,
}

const meta: Meta<typeof DisplaySplit> = {
  title: 'Components/DisplaySplit',
  component: DisplaySplit,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Display a split with its recipients and balances',
      },
    },
  },
  argTypes: {
    address: {
      description: 'Address of the Split',
    },
    chainId: {
      description: 'Chain ID of a supported network',
    },
    displayBalances: {
      description: 'Display active balances below the split recipients',
    },
    displayChain: {
      description:
        'Display icon of the chain corresponding to `chainId` in the top right corner',
    },
    width: {
      description: 'Width of the component',
    },
    onSuccess: {
      description: 'Callback function for successful distributions',
    },
    onError: {
      description: 'Callback function for any fetch or transaction errors',
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

type Story = StoryObj<typeof DisplaySplit>

export const Basic: Story = {}

export const MultiChain: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Display a Split on any supported network',
      },
    },
  },
  args: {
    chainId: 10,
    address: '0x5bc5cDa58ec99b60d569ab9Ec8B94664D04D38F1',
  },
}

export const MultiChainPolygon: Story = {
  name: 'Multi Chain (Polygon)',
  args: {
    chainId: 137,
    address: '0x5E1Ff408095d8C4ff61EB74ca6Db2a7FBBA7c24F',
  },
}

export const MultiChainGoerli: Story = {
  name: 'Multi Chain (Goerli)',
  args: {
    chainId: 5,
    address: '0x755e8179972B5C5966A9d91214c73B3410c6c807',
  },
}

export const ManyRecipients: Story = {
  args: {
    chainId: 1,
    address: '0x9ef09F2287c5bb00553abfa153F6938883978ae2',
  },
}

export const HideBalances: Story = {
  args: {
    displayBalances: false,
  },
}

export const NotFound: Story = {
  args: { chainId: 1, address: '0x5bc5cDa58ec99b60d569ab9Ec8B94664D04D38F1' },
}

export const Controller: Story = {
  args: {
    address: '0xFEe2Da13156eA1A6B649819c28f1888288C0C2A8',
  },
}
