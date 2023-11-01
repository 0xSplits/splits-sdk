import React from 'react'
import Link from './Link'

interface ISegment {
  title?: string | JSX.Element
  count?: string | JSX.Element | false
  titleButton?: JSX.Element
  body: JSX.Element
  tooltip?: string | JSX.Element
  corner?: string | JSX.Element
  showTooltipOnContentHover?: boolean
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const Segment = ({
  title,
  titleButton,
  body,
  corner,
  width = 'md',
}: ISegment): JSX.Element => {
  const maxWidthClass = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  }

  return (
    <div
      className={`text-sm ${maxWidthClass[width]} min-h-[18rem] dark:text-white border rounded bg-white dark:bg-[#202020] 
      border-gray-200 dark:border-gray-700 divide-y dark:divide-gray-700 divide-gray-200`}
    >
      <div className="p-4 py-3.5 flex w-full items-center justify-between space-x-2 rounded-t">
        <div className="flex items-center space-x-3 overflow-x-hidden overflow-y-visible w-full grow">
          {title && <div className="font-medium">{title}</div>}
          {titleButton && <div>{titleButton}</div>}
        </div>
        {corner && <div className="self-end shrink-0">{corner}</div>}
      </div>
      <div className="p-4">{body}</div>
      <div className="p-4 flex items-center justify-between text-xs bg-gray-50 dark:bg-[#1f1f1f] rounded-b">
        <div className="flex space-x-2 items-center">
          <div>
            <img
              src="/logo_dark.svg"
              width={18}
              className="hidden dark:block"
            />
            <img
              src="/logo_light.svg"
              width={18}
              className="block dark:hidden"
            />
          </div>
          <div className="font-medium">Powered by Splits</div>
        </div>
        <Link
          href="https://splits.org"
          className="text-gray-500 dark:text-gray-400"
        >
          splits.org
        </Link>
      </div>
    </div>
  )
}

export default Segment
