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

  constructor({
    chainId,
    publicClient,
    walletClient,
    apiConfig,
    includeEnsNames = false,
    ensPublicClient,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.Transaction,
      chainId,
      publicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
      ensPublicClient,
      supportedChainIds: [],
    })
    this.waterfall = new WaterfallClient({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.liquidSplits = new LiquidSplitClient({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.vesting = new VestingClient({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.templates = new TemplatesClient({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.oracle = new OracleClient({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.swapper = new SwapperClient({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.passThroughWallet = new PassThroughWalletClient({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.splitV1 = new SplitV1Client({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.splitV2 = new SplitV2Client({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })
    this.warehouse = new WarehouseClient({
      chainId,
      publicClient,
      ensPublicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
    })

    if (apiConfig) {
      this.dataClient = new DataClient({
        publicClient,
        ensPublicClient,
        includeEnsNames,
        apiConfig,
      })
    }

    this.estimateGas = new SplitsClientGasEstimates({
      chainId,
      publicClient,
      walletClient,
      ensPublicClient,
      apiConfig,
      includeEnsNames,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface SplitsClient extends BaseClientMixin {}
applyMixins(SplitsClient, [BaseClientMixin])

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class SplitsClientGasEstimates extends BaseTransactions {
  constructor({
    chainId,
    publicClient,
    walletClient,
    apiConfig,
    includeEnsNames = false,
    ensPublicClient,
  }: SplitsClientConfig) {
    super({
      transactionType: TransactionType.GasEstimate,
      chainId,
      publicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
      ensPublicClient,
      supportedChainIds: [],
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface SplitsClientGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(SplitsClientGasEstimates, [BaseGasEstimatesMixin])
