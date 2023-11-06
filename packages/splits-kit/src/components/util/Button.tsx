interface IButton {
  children: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  ref?: React.MutableRefObject<null>
  color?: string
  className?: string
  compact?: boolean
  eventName?: string
  isDisabled?: boolean
  isLoading?: boolean
  isActive?: boolean
  size?: 'xs' | 'sm'
  type?: 'button' | 'submit' | 'reset' | undefined
}

export function MiniButton(btn: IButton): JSX.Element {
  const isDisabled = btn.isDisabled || btn.isLoading

  const eventName = btn.eventName
  const onClick = eventName
    ? (e: React.MouseEvent<HTMLButtonElement>) => {
        btn.onClick?.(e)
      }
    : btn.onClick

  return (
    <button
      disabled={isDisabled}
      onClick={onClick}
      type={btn.type ? btn.type : 'button'}
      className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium backdrop-blur-sm ${
        !btn.compact && `w-full`
      } flex items-center justify-center transition focus:outline-none ${
        isDisabled
          ? `disabled cursor-default opacity-50`
          : btn.isActive
          ? `cursor-wait opacity-50`
          : `hover:opacity-80`
      }
      ${btn.className}`}
    >
      {btn.isLoading && (
        <div>
          <div
            style={{ borderTopColor: 'transparent' }}
            className="mr-2 h-2.5 w-2.5 animate-spin rounded-full border-2 border-solid border-gray-500"
          />
        </div>
      )}
      {btn.children}
    </button>
  )
}

export function SecondaryButton(btn: IButton): JSX.Element {
  const textSize = btn.size ? `text-${btn.size}` : 'text-xs'
  const isDisabled = btn.isDisabled || btn.isLoading

  const eventName = btn.eventName
  const onClick = eventName
    ? (e: React.MouseEvent<HTMLButtonElement>) => {
        btn.onClick?.(e)
      }
    : btn.onClick

  return (
    <button
      disabled={isDisabled}
      onClick={onClick}
      type={btn.type ? btn.type : 'button'}
      className={`whitespace-nowrap rounded ${textSize} border border-gray-500/20 shadow shadow-black/5 px-2 py-1 text-black bg-gray-400/5 dark:border-white/20 dark:bg-white/5 dark:text-white ${
        !btn.compact && `w-full`
      } flex items-center justify-center transition focus:outline-none ${
        isDisabled
          ? `disabled cursor-default opacity-50`
          : btn.isActive
          ? `opacity-50`
          : `hover:border-black/20 hover:shadow dark:hover:border-white/40 focus:ring-2`
      }
      ${btn.className}`}
    >
      {btn.isLoading && (
        <div>
          <div
            style={{ borderTopColor: 'transparent' }}
            className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-solid border-gray-500"
          />
        </div>
      )}
      {btn.children}
    </button>
  )
}

export default function Button(btn: IButton): JSX.Element {
  const textSize = btn.size ? `text-${btn.size}` : 'text-sm'
  const isDisabled = btn.isDisabled || btn.isLoading

  const eventName = btn.eventName
  const onClick = eventName
    ? (e: React.MouseEvent<HTMLButtonElement>) => {
        btn.onClick?.(e)
      }
    : btn.onClick

  return (
    <button
      disabled={isDisabled}
      onClick={onClick}
      type={btn.type ? btn.type : 'button'}
      className={`whitespace-nowrap rounded ${textSize} border border-gray-900 bg-gray-800 px-3 py-1 text-white dark:border-gray-200 dark:bg-gray-300 dark:text-black ${
        !btn.compact && `w-full`
      } flex transform items-center justify-center transition focus:outline-none ${
        isDisabled
          ? `disabled cursor-default opacity-30`
          : btn.isActive
          ? `opacity-50`
          : `shadow ring-gray-100 hover:border-black hover:bg-gray-700 focus:ring-2 dark:ring-gray-800 dark:hover:border-gray-100 dark:hover:bg-gray-200`
      }
      ${btn.className}`}
    >
      {btn.isLoading && (
        <div>
          <div
            style={{ borderTopColor: 'transparent' }}
            className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-solid border-white"
          />
        </div>
      )}
      {btn.children}
    </button>
  )
}
