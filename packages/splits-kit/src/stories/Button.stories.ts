import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction
const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: String
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary: Story = {
  args: {
    children: "Button",
    variant: "Primary"
  },
};

export const Secondary: Story = {
  args: {
    children: "Button",
    variant: "Secondary"
  },
};

export const Mini: Story = {
  args: {
    children: "Button",
    variant: "Mini"
  },
};