import React from 'react'

interface ISegment {
  title?: string | JSX.Element
  count?: string | JSX.Element | false
  titleButton?: JSX.Element
  body: JSX.Element
  tooltip?: string | JSX.Element
  corner?: string | JSX.Element
  showTooltipOnContentHover?: boolean
}

const Segment = ({
  title,
  titleButton,
  body,
  corner,
}: ISegment): JSX.Element => {
  return (
    <div>
      <div className="flex w-full items-center justify-between space-x-2 rounded-t border-b border-gray-200 p-4 py-3.5 dark:border-gray-700">
        <div className="flex items-center space-x-3 overflow-x-hidden overflow-y-visible w-full grow">
          {title && <div className="font-medium">{title}</div>}
          {titleButton && <div>{titleButton}</div>}
        </div>
        {corner && <div className="self-end shrink-0">{corner}</div>}
      </div>
      <div className="p-4">{body}</div>
    </div>
  )
}

export default Segment
