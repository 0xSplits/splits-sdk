import { EventFilter, Event } from '@ethersproject/contracts'
import { Result } from '@ethersproject/abi'

export type TypedEventFilter<_EventArgsArray, _EventArgsObject> = EventFilter

export interface TypedEvent<EventArgs extends Result> extends Event {
  args: EventArgs
}

export type TypedListener<
  EventArgsArray extends Array<any>,
  EventArgsObject,
> = (
  ...listenerArg: [
    ...EventArgsArray,
    TypedEvent<EventArgsArray & EventArgsObject>,
  ]
) => void

export type MinEthersFactory<C, ARGS> = {
  deploy(...a: ARGS[]): Promise<C>
}
export type GetContractTypeFromFactory<F> = F extends MinEthersFactory<
  infer C,
  any
>
  ? C
  : never
export type GetARGsTypeFromFactory<F> = F extends MinEthersFactory<any, any>
  ? Parameters<F['deploy']>
  : never
