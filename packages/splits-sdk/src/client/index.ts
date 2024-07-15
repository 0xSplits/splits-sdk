import { TransactionType } from '../constants'
import { SplitsClientConfig } from '../types'
import {
  BaseClientMixin,
  BaseGasEstimatesMixin,
  BaseTransactions,
} from './base'
import { DataClient } from './data'
import { LiquidSplitClient } from './liquidSplit'
import { applyMixins } from './mixin'
import { OracleClient } from './oracle'
import { PassThroughWalletClient } from './passThroughWallet'
import { SplitV1Client } from './splitV1'
import { SplitV2Client } from './splitV2'
import { SwapperClient } from './swapper'
import { TemplatesClient } from './templates'
import { VestingClient } from './vesting'
import { WarehouseClient } from './warehouse'
import { WaterfallClient } from './waterfall'

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class SplitsClient extends BaseTransactions {
  readonly waterfall: WaterfallClient
  readonly liquidSplits: LiquidSplitClient
  readonly passThroughWallet: PassThroughWalletClient
  readonly vesting: VestingClient
  readonly oracle: OracleClient
  readonly swapper: SwapperClient
  readonly templates: TemplatesClient
  readonly splitV1: SplitV1Client
  readonly splitV2: SplitV2Client
  readonly warehouse: WarehouseClient
  readonly dataClient: DataClient | undefined
  readonly estimateGas: SplitsClientGasEstimates

  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      supportedChainIds: [],
      ...clientArgs,
    })
    this.waterfall = new WaterfallClient(clientArgs)
    this.liquidSplits = new LiquidSplitClient(clientArgs)
    this.vesting = new VestingClient(clientArgs)
    this.templates = new TemplatesClient(clientArgs)
    this.oracle = new OracleClient(clientArgs)
    this.swapper = new SwapperClient(clientArgs)
    this.passThroughWallet = new PassThroughWalletClient(clientArgs)
    this.splitV1 = new SplitV1Client(clientArgs)
    this.splitV2 = new SplitV2Client(clientArgs)
    this.warehouse = new WarehouseClient(clientArgs)

    if (clientArgs.apiConfig) {
      this.dataClient = new DataClient({
        publicClient: clientArgs.publicClient,
        publicClients: clientArgs.publicClients,
        ensPublicClient: clientArgs.ensPublicClient,
        includeEnsNames: clientArgs.includeEnsNames,
        apiConfig: clientArgs.apiConfig,
      })
    }

    this.estimateGas = new SplitsClientGasEstimates(clientArgs)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface SplitsClient extends BaseClientMixin {}
applyMixins(SplitsClient, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class SplitsClientGasEstimates extends BaseTransactions {
  constructor(clientArgs: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      supportedChainIds: [],
      ...clientArgs,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface SplitsClientGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(SplitsClientGasEstimates, [BaseGasEstimatesMixin])
