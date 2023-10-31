import { join, dirname } from 'path'
import type { StorybookConfig } from '@storybook/react-webpack5';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, 'package.json')))
}

const config: StorybookConfig = {
  stories: [
    '../storybook/**/*.mdx',
    '../storybook/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-interactions'),
    getAbsolutePath('@storybook/addon-styling-webpack'),
    getAbsolutePath('@storybook/addon-themes'),
  ],
  typescript: {
    check: true,
  },
  framework: '@storybook/react-webpack5',
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public']
}
export default config
