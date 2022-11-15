export type ContractExecutionStatus =
  | 'pendingApproval'
  | 'txInProgress'
  | 'complete'
  | 'error'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RequestError = any
