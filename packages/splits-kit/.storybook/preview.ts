import type { Preview } from '@storybook/react'
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      values: [
        { name: 'dark', value: 'rgb(32, 32, 32)' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
}

export default preview
