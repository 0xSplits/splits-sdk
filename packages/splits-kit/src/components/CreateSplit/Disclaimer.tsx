import React from 'react'

import Link from '../../components/util/Link'

const Disclaimer = () => {
  return (
    <div className="text-xs max-w-md mx-auto text-center text-gray-500 mt-4">
      By creating a Split you agree to the{' '}
      <Link href="https://splits.org/terms/" className="underline">
        Terms of Service
      </Link>{' '}
      and acknowledge that you have read &amp; understand the{' '}
      <Link href="https://splits.org/disclaimer/" className="underline">
        Protocol Disclaimer
      </Link>
    </div>
  )
}

export default Disclaimer
