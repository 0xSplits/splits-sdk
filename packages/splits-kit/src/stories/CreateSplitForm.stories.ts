import type { Meta, StoryObj } from '@storybook/react';

import { CreateSplitForm } from './CreateSplitForm';

const meta: Meta<typeof CreateSplitForm> = {
    title: 'Forms/CreateSplitForm',
    component: CreateSplitForm,
    tags: ['autodocs'],
    argTypes: {},
};

export default meta;
type Story = StoryObj<typeof CreateSplitForm>;

export const Styled: Story = {
    args: {}
}