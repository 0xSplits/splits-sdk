import { CheckIcon, ExclamationCircleIcon } from '@heroicons/react/20/solid'
import { round } from 'lodash'

import { SPLIT_RECIPIENT_MAX_DECIMALS } from '../../constants/splits'
import Tooltip from '../util/Tooltip'

const ProgressIndicator = ({
  percentFilled,
  size,
  color,
  className,
}: {
  percentFilled: number
  size?: number
  color?: string
  className?: string
}): JSX.Element => {
  const _size = size ?? 20
  const _center = _size / 2
  const _r = _size / 4
  const _c = 2 * Math.PI * _r
  return (
    <div
      className={`rounded-full border border-white ring-2 dark:border-black ${
        color ??
        `text-gray-300 ring-gray-300 dark:text-gray-600 dark:ring-gray-600`
      } ${className}`}
    >
      <svg height={_size} width={_size} viewBox={`0 0 ${_size} ${_size}`}>
        <circle r={_center} cx={_center} cy={_center} fill="transparent" />
        <circle
          r={_r}
          cx={_center}
          cy={_center}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={_center}
          strokeDasharray={`calc(${percentFilled} * ${_c} / 100) ${_c}`}
          transform={`rotate(-90) translate(-${_size})`}
        />
      </svg>
    </div>
  )
}

const TotalAllocated = ({
  totalAllocated,
}: {
  totalAllocated: number
}): JSX.Element => {
  return (
    <Tooltip
      content={`${round(
        100 - totalAllocated,
        SPLIT_RECIPIENT_MAX_DECIMALS,
      )}% remaining`}
      delay={0}
    >
      <div className="flex items-center justify-end space-x-2">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          {round(totalAllocated, SPLIT_RECIPIENT_MAX_DECIMALS)}%
        </div>
        <div className="relative hidden md:flex">
          {round(totalAllocated, SPLIT_RECIPIENT_MAX_DECIMALS) === 100.0 && (
            <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center">
              <CheckIcon className="h-2.5 w-2.5 text-white" />
            </div>
          )}
          {round(totalAllocated, SPLIT_RECIPIENT_MAX_DECIMALS) > 100.0 && (
            <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center">
              <ExclamationCircleIcon className="h-2.5 w-2.5 text-white" />
            </div>
          )}
          <ProgressIndicator
            size={12}
            percentFilled={totalAllocated}
            color={
              round(totalAllocated, SPLIT_RECIPIENT_MAX_DECIMALS) > 100.0
                ? `text-red-500 dark:text-red-800 ring-red-500 dark:ring-red-800`
                : round(totalAllocated, SPLIT_RECIPIENT_MAX_DECIMALS) == 100.0
                ? `text-green-500 dark:text-green-600 ring-green-500 dark:ring-green-600`
                : round(totalAllocated, SPLIT_RECIPIENT_MAX_DECIMALS) > 0
                ? `text-blue-500 dark:text-blue-600 ring-blue-500 dark:ring-blue-600`
                : undefined
            }
          />
        </div>
      </div>
    </Tooltip>
  )
}

export default TotalAllocated
