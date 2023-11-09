import { InformationCircleIcon } from '@heroicons/react/20/solid'
import Tooltip from '../util/Tooltip'

function InputRow({
  label,
  input,
  tooltip,
  link,
  size,
}: {
  label: string | JSX.Element
  input: JSX.Element
  tooltip?: string
  link?: string
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
}): JSX.Element {
  const sizeMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }
  return (
    <div
      className={`grid grid-cols-1 items-center gap-1 md:grid-cols-2 md:gap-2 ${
        sizeMap[size ?? 'sm']
      }`}
    >
      <div className="-space-y-1">
        <div className="flex items-center">
          <div>{label}</div>
          {tooltip && (
            <Tooltip content={tooltip} delay={5}>
              <InformationCircleIcon className="ml-1 hidden h-3.5 w-3.5 opacity-20 transition md:flex" />
            </Tooltip>
          )}
        </div>
        {link && (
          <div>
            <a
              href={link}
              target="blank"
              rel="noreferrer"
              className="text-[90%] underline opacity-40 transition hover:opacity-80"
            >
              Learn more
            </a>
          </div>
        )}
      </div>
      <div>{input}</div>
    </div>
  )
}

export default InputRow
