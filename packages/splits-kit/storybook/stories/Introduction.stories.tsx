import React from 'react'
import { CreateSplit, DisplaySplit } from '../../src'
import { SplitsProvider } from '@0xsplits/splits-sdk-react'

const Components = () => {
  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <h1 className="text-4xl">SplitsKit</h1>
      <p className="my-4">
        SplitsKit is the best way for developers to add Splits-related flows
        into their React apps. Learn more in the{' '}
        <a
          className="underline"
          target="_blank"
          href="https://docs.splits.org/splits-kit"
        >
          docs
        </a>
        .
      </p>
      <div className="inline-block bg-gray-100 border border-gray-200 rounded px-2 py-0.5">
        <code>npm install @0xsplits/splits-kit</code>
      </div>
      <SplitsProvider>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium">Create Split</h3>
            <div className="mt-2 mb-6 text-sm">
              React form component with everything needed to create a Split
              contract, including pre-filled default values and themes.
            </div>
            <CreateSplit chainId={1} width="full" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Display Split</h3>
            <div className="mt-2 mb-6 text-sm">
              React component to display all details for a Split contract,
              including the ability to distribute balances.
            </div>
            <DisplaySplit
              address="0xF8843981e7846945960f53243cA2Fd42a579f719"
              chainId={1}
            />
          </div>
        </div>
      </SplitsProvider>
    </div>
  )
}

export const Introduction = () => <Components />
export default { title: 'Introduction' }
