import { useEffect, useState } from 'react'
import Link from './Link'
import { CHAIN_INFO } from '../../constants/chains'
import SplitsLogo from './SplitsLogo'

interface IComponentLayout {
  title?: string | JSX.Element
  count?: string | JSX.Element | false
  titleButton?: JSX.Element
  body: JSX.Element
  tooltip?: string | JSX.Element
  corner?: string | JSX.Element | false
  showTooltipOnContentHover?: boolean
  error?:
    | {
        title: string | JSX.Element
        body: string | JSX.Element
      }
    | false
  chainId?: number
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  theme?: 'light' | 'dark' | 'system'
}

const ComponentLayout = ({
  title,
  titleButton,
  body,
  corner,
  error,
  chainId,
  width = 'md',
  theme = 'system',
}: IComponentLayout): JSX.Element => {
  const widthValue = {
    xs: '20rem',
    sm: '24rem',
    md: '28rem',
    lg: '32rem',
    xl: '36rem',
    full: '100%',
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const [userPrefersDark, setUserPrefersDark] = useState(mq.matches)

  const handleThemeChange = (evt: MediaQueryListEvent) => {
    setUserPrefersDark(evt.matches)
  }

  useEffect(() => {
    mq.addEventListener('change', handleThemeChange)
    return () => mq.removeEventListener('change', handleThemeChange)
  }, [])

  const themeClass = {
    light: '',
    dark: 'dark',
    system: userPrefersDark ? 'dark' : '',
  }

  const unsupportedChainId =
    chainId && !Object.keys(CHAIN_INFO).includes(chainId.toString())
  const errorDisplay = unsupportedChainId
    ? {
        title: 'Unsupported Chain ID',
        body: `Chain ID ${chainId} is not supported by Splits. Supported chainId's include: ${Object.keys(
          CHAIN_INFO,
        ).join(', ')}.`,
      }
    : error

  const isDark = themeClass[theme] === 'dark'

  return (
    <div
      className={`${themeClass[theme]}`}
      style={{ width: widthValue[width] }}
    >
      <div
        className={`w-full grid font-sans text-left text-sm min-h-[18rem] dark:text-white border rounded bg-white dark:bg-black border-gray-200 dark:border-gray-700 divide-y dark:divide-gray-700 divide-gray-200`}
      >
        <div className="px-4 py-3.5 flex items-center justify-between space-x-2 rounded-t overflow-hidden">
          <div className="flex items-center overflow-x-hidden ">
            {title && <div className="font-medium">{title}</div>}
            {titleButton && <div className="">{titleButton}</div>}
          </div>
          {corner && <div className="">{corner}</div>}
        </div>
        <div className="p-4">
          {errorDisplay ? (
            <div className="text-center my-8 space-y-2">
              <div className="text-lg">{errorDisplay.title}</div>
              <div className="text-xs max-w-md">{errorDisplay.body}</div>
            </div>
          ) : (
            body
          )}
        </div>
        <div className="p-4 self-end flex items-center justify-between text-xs bg-gray-50 dark:bg-[#1f1f1f] rounded-b">
          <div className="flex space-x-2 items-center">
            <SplitsLogo dark={isDark} />
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
    </div>
  )
}

export default ComponentLayout
