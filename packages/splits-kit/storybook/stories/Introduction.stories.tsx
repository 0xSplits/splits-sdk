import { CreateSplit, DisplaySplit } from '../../src'
import { SplitsProvider } from '@0xsplits/splits-sdk-react'

const Components = () => {
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-4xl">SplitsKit</h1>
      <p className="my-4">
        SplitsKit is the best way developers to add Splits-related flows into
        their React apps.
      </p>

      <SplitsProvider>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <h3 className="text-xl code">{'<CreateSplit />'}</h3>
            <div className="h-12 my-4">
              React form component with everything needed to create a Split
              contract, including pre-filled default values and themes.
            </div>
            <CreateSplit chainId={1} width="full" />
          </div>
          <div>
            <h3 className="text-xl code">{'<DisplaySplit />'}</h3>
            <div className="h-12 my-4">
              React component to display all details for a Split contract.
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
