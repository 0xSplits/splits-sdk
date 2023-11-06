import { useRef, useState } from 'react'
import { Transition } from '@headlessui/react'
import { InformationCircleIcon } from '@heroicons/react/20/solid'

export default function Tooltip({
  children,
  content,
  position,
  delay,
  isDisabled = false,
  showTooltipOnContentHover = false,
}: {
  children: JSX.Element
  content: string | JSX.Element
  position?: 'bottom' | 'left' | 'right'
  delay?: number
  isDisabled?: boolean
  showTooltipOnContentHover?: boolean
}): JSX.Element {
  const [active, setActive] = useState<boolean>(false)
  const timer = useRef<number>(0)
  const showTip = (isContentHover: boolean) => {
    timer.current = window.setTimeout(
      () => {
        setActive(true)
      },
      isContentHover ? 0 : delay ?? 100,
    )
    return () => {
      clearTimeout(timer.current)
    }
  }
  const hideTip = () => {
    clearTimeout(timer.current)
    setActive(false)
  }

  const positionMap = {
    top: 'bottom-full mb-1',
    bottom: 'top-full mt-1',
    left: 'right-full mr-1 -top-1/4',
    right: 'left-full ml-1 -top-1/4',
  }

  return (
    <div className={`relative flex cursor-default flex-col items-center`}>
      <Transition
        onPointerEnter={
          showTooltipOnContentHover ? () => showTip(true) : undefined
        }
        onPointerLeave={showTooltipOnContentHover ? hideTip : undefined}
        show={active && !isDisabled}
        enter="transition-all duration-150"
        enterFrom="opacity-0 scale-90"
        enterTo="opacity-100 scale-100"
        leave="transition-all duration-150"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-90"
        className={`invisible absolute md:visible ${
          positionMap[position ?? 'top']
        } z-40 transform whitespace-nowrap rounded bg-black/90 px-2 py-1.5 text-xs text-white shadow-md backdrop-blur transition dark:border dark:border-white/10 dark:bg-white/10 dark:backdrop-brightness-[0%]`}
      >
        {content}
      </Transition>
      <div
        className="flex"
        onPointerEnter={() => showTip(false)}
        onPointerLeave={hideTip}
      >
        {children}
      </div>
    </div>
  )
}

export const InformationLinkTooltip = ({
  tooltipContent,
  linkHref,
  iconSize = '3.5',
}: {
  tooltipContent: string | JSX.Element
  linkHref: string
  iconSize?: string
}): JSX.Element => {
  return (
    <Tooltip content={tooltipContent}>
      <a href={linkHref} target="_blank" rel="noreferrer">
        <InformationCircleIcon
          className={`h-${iconSize} w-${iconSize} opacity-30 transition hover:opacity-100`}
        />
      </a>
    </Tooltip>
  )
}
