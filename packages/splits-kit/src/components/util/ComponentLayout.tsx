import React from 'react'

interface Props {
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
}

const ComponentLayout: React.FC<Props> = ({ children, width = 'md' }) => {
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
      className={`text-sm ${maxWidthClass[width]} bg-white dark:bg-[#202020] dark:text-white border rounded border-gray-200 dark:border-gray-700 min-h-[18rem]`}
    >
      {children}
    </div>
  )
}

export default ComponentLayout
