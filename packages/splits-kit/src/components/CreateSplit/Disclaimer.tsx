import React from 'react'

import Link from '../../components/util/Link'

const Disclaimer = () => {
  return (
    <div className="text-xs max-w-md mx-auto text-center text-gray-500 mt-4">
      By creating a Split you agree to the{' '}
      <Link
        href="https://www.notion.so/0xsplits/Splits-Protocols-Inc-Terms-of-Service-7246b65eb87d4f6997cbe0af1ebb2b88"
        className="underline"
      >
        Terms of Service
      </Link>{' '}
      and acknowledge that you have read &amp; understand the{' '}
      <Link
        href="https://www.notion.so/0xsplits/0xSplits-Protocol-Disclaimer-de55f6263db54b44a67439e1222ac2a8"
        className="underline"
      >
        Protocol Disclaimer
      </Link>
    </div>
  )
}

export default Disclaimer
