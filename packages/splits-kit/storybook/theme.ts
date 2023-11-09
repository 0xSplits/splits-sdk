import { create } from '@storybook/theming/create'

export const light = create({
  base: 'light',
  brandTitle: 'SplitsKit',
  brandUrl: 'https://splits-kit.vercel.app/',
  brandImage: 'logo_light.svg',
  brandTarget: '_self',
})

export const dark = create({
  base: 'dark',
  brandTitle: 'SplitsKit',
  brandUrl: 'https://splits-kit.vercel.app/',
  brandImage: 'logo_dark.svg',
  brandTarget: '_self',
})
