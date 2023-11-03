import type { StorybookConfig } from '@storybook/react-webpack5'
const path = require('path')

const config: StorybookConfig = {
  stories: [
    '../storybook/**/*.mdx',
    '../storybook/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-styling-webpack',
    '@storybook/addon-themes',
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
