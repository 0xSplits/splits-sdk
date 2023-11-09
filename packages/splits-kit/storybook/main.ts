import type { StorybookConfig } from '@storybook/react-webpack5'
import path from 'path'

const config: StorybookConfig = {
  stories: [
    '../storybook/**/Introduction.stories.tsx',
    '../storybook/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-styling-webpack',
    '@storybook/addon-themes',
    '@storybook/addon-storysource',
    'storybook-dark-mode',
  ],
  webpackFinal: async (config) => {
    config.module?.rules?.push({
      test: /\.css$/,
      use: [
        {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              plugins: [require('tailwindcss'), require('autoprefixer')],
            },
          },
        },
      ],
      include: path.resolve(__dirname, '../'),
    })
    return config
  },
  env: (config) => {
    return config
  },
  typescript: {
    check: true,
  },
  framework: '@storybook/react-webpack5',
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../storybook/public'],
}
export default config
