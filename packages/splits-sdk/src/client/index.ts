import { Chain } from 'viem'
import { ALL_CHAIN_IDS, TransactionType } from '../constants'
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
export class SplitsClient<
  TChain extends Chain,
> extends BaseTransactions<TChain> {
  readonly waterfall: WaterfallClient<TChain>
  readonly liquidSplits: LiquidSplitClient<TChain>
  readonly passThroughWallet: PassThroughWalletClient<TChain>
  readonly vesting: VestingClient<TChain>
  readonly oracle: OracleClient<TChain>
  readonly swapper: SwapperClient<TChain>
  readonly templates: TemplatesClient<TChain>
  readonly splitV1: SplitV1Client<TChain>
  readonly splitV2: SplitV2Client<TChain>
  readonly warehouse: WarehouseClient<TChain>
  readonly dataClient: DataClient<TChain> | undefined
  readonly estimateGas: SplitsClientGasEstimates<TChain>

  constructor(clientArgs: SplitsClientConfig<TChain>) {
    super({
      transactionType: TransactionType.Transaction,
      supportedChainIds: ALL_CHAIN_IDS,
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
export interface SplitsClient<TChain extends Chain>
  extends BaseClientMixin<TChain> {}
applyMixins(SplitsClient, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class SplitsClientGasEstimates<
  TChain extends Chain,
> extends BaseTransactions<TChain> {
  constructor(clientArgs: SplitsClientConfig<TChain>) {
    super({
      transactionType: TransactionType.GasEstimate,
      supportedChainIds: ALL_CHAIN_IDS,
      ...clientArgs,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface SplitsClientGasEstimates<TChain extends Chain>
  extends BaseGasEstimatesMixin<TChain> {}
applyMixins(SplitsClientGasEstimates, [BaseGasEstimatesMixin])
