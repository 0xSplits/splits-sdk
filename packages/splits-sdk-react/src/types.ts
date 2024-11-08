export type ContractExecutionStatus =
  | 'pendingApproval'
  | 'txInProgress'
  | 'complete'
  | 'error'

export type DataLoadStatus = 'success' | 'error' | 'loading'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RequestError = any

export type SplitProviderSearchCacheData = {
  blockRange: bigint
  blocks: {
    createBlock: bigint
    updateBlock?: bigint
    latestScannedBlock: bigint
  }
}
