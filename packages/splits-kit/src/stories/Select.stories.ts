import type { Meta, StoryObj } from '@storybook/react';
import { SelectOption } from './Select';
import { Select } from './Select';

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction
const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    label: String,
    options: Array<SelectOption>
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary: Story = {
  args: {
    label: "Select Label",
    options: [{name: "option 1", value: "value1"}, {name: "option 2", value: "value2"}]
  },
};

export const Disabled: Story = {
    args: {
      label: "Select Label",
      options: [{name: "option 1", value: "value1"}, {name: "option 2", value: "value2"}],
      isDisabled: true
    },
  };
