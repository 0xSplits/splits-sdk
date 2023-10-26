import React from 'react'
import { Button } from './Button'
import ConnectWallet from '../components/ConnectWallet'

const DEFAULT_ARGS = {
  chainId: 1,
}

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: 'Example/Button',
  component: Button,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    backgroundColor: { control: 'color' },
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

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary = {
  args: {
    primary: true,
    label: 'Button',
  },
}

export const Secondary = {
  args: {
    label: 'Button',
  },
}

export const Large = {
  args: {
    size: 'large',
    label: 'Button',
  },
}

export const Small = {
  args: {
    size: 'small',
    label: 'Button',
  },
}
