import type { Meta, StoryObj } from '@storybook/react';
import { SelectOption } from './Select';
import { SearchSelect } from './SearchSelect';

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction
const meta: Meta<typeof SearchSelect> = {
  title: 'Components/SearchSelect',
  component: SearchSelect,
  tags: ['autodocs'],
  argTypes: {
    label: String,
    options: Array<SelectOption>,
    searchName: String
  },
};

export default meta;
type Story = StoryObj<typeof SearchSelect>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary: Story = {
  args: {
    label: "Select Label",
    options: [{name: "option 1", value: "value1"}, {name: "option 2", value: "value2"}],
    searchName: 'Custom Search'
  },
};

