import React from 'react'
import WagmiProvider from '../components/WagmiProvider'

const preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
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
