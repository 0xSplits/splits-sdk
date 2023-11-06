import { range } from 'lodash'

const SkeletonLoader = () => {
  const SKELETON_ACCOUNTS = 4
  const skeletonAccounts = range(SKELETON_ACCOUNTS)
  return (
    <div>
      {skeletonAccounts.map((i) => (
        <div
          key={i}
          className={
            'flex w-full items-center justify-between py-2.5 text-xs md:text-sm'
          }
        >
          <div className={'flex items-center space-x-1.5'}>
            <div className="h-5 w-5 animate-pulse rounded-full bg-black/5 dark:bg-white/5" />
            <div
              className={
                'h-4 w-24 animate-pulse rounded bg-black/5 dark:bg-white/5'
              }
            />
          </div>
          <div className="flex items-center space-x-3">
            <div
              className={
                'h-5 w-20 animate-pulse rounded bg-black/5 dark:bg-white/5'
              }
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default SkeletonLoader
