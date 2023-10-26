import React from 'react'
import { CheckBadgeIcon } from '@heroicons/react/20/solid'

import Tooltip from '../util/Tooltip'

export function SponsorIcon(): JSX.Element {
  return (
    <Tooltip content={'Sponsorship recipient'} delay={50}>
      <CheckBadgeIcon className="h-4 w-4 text-yellow-500" />
    </Tooltip>
  )
}

export function SponsorLabel({ amount }: { amount?: string }): JSX.Element {
  return (
    <div className="rounded-full bg-gradient-to-tr from-yellow-500 via-yellow-400 to-yellow-600 px-1.5 text-[12px] font-medium text-white dark:text-black">
      {amount ?? 'Sponsor'}
    </div>
  )
}

export default function Label({
  icon,
  text,
  variant,
}: {
  icon?: JSX.Element
  text?: string
  variant?: 'green' | 'blue'
}): JSX.Element {
  const colorMap = {
    green:
      'border-green-500/50 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500 dark:border-green-700',
    blue: 'border-blue-500/50 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-600 dark:border-blye-700',
    gray: 'border-gray-900/10 text-gray-500 dark:border-gray-700 dark:text-gray-400',
  }
  return (
    <div
      className={`text-[12px] ${
        !text ? `px-1` : `px-1.5`
      } no-scrollbar flex items-center space-x-1 whitespace-nowrap rounded-full border ${
        colorMap[variant ?? 'gray']
      }`}
    >
      {icon && <div className="flex">{icon}</div>}
      {text && <div>{text}</div>}
    </div>
  )
}
