import React from 'react'
import { CreateSplit, DisplaySplit } from '../../src'
import { SplitsProvider } from '@0xsplits/splits-sdk-react'

const Components = () => {
  return (
    <div className="p-8">
      <h1 className="text-4xl">SplitsKit</h1>
      <p className="my-4">
        SplitsKit is the best way developers to add 0xSplits-related flows into
        their React apps.
      </p>

      <div className="flex space-x-4 ">
        <SplitsProvider>
          <CreateSplit chainId={1} />
          <DisplaySplit
            address="0xF8843981e7846945960f53243cA2Fd42a579f719"
            chainId={1}
          />
        </SplitsProvider>
      </div>
    </div>
  )
}

export const Introduction = () => <Components />

export default {
  title: 'Introduction',
}
