import React from 'react'
import WagmiProvider from './components/WagmiProvider'
import { dark, light } from './theme'
import '../dist/styles.css'

const preview = {
  parameters: {
    darkMode: {
      dark,
      light,
    },
    backgrounds: {
      values: [
        { name: 'dark', value: 'rgb(32, 32, 32)' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => {
      return (
        <WagmiProvider>
          <Story />
        </WagmiProvider>
      )
    },
  ],
}

export default preview
