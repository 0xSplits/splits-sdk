import {
  LIQUID_SPLIT_CHAIN_IDS,
  ORACLE_CHAIN_IDS,
  PASS_THROUGH_WALLET_CHAIN_IDS,
  SPLITS_SUPPORTED_CHAIN_IDS,
  SPLITS_V2_SUPPORTED_CHAIN_IDS,
  SWAPPER_CHAIN_IDS,
  TEMPLATES_CHAIN_IDS,
  TransactionType,
  VESTING_CHAIN_IDS,
  WATERFALL_CHAIN_IDS,
} from '../constants'
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
  readonly waterfall: WaterfallClient | undefined
  readonly liquidSplits: LiquidSplitClient | undefined
  readonly passThroughWallet: PassThroughWalletClient | undefined
  readonly vesting: VestingClient | undefined
  readonly oracle: OracleClient | undefined
  readonly swapper: SwapperClient | undefined
  readonly templates: TemplatesClient | undefined
  readonly splitV1: SplitV1Client | undefined
  readonly splitV2: SplitV2Client | undefined
  readonly warehouse: WarehouseClient | undefined
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
    })
    if (WATERFALL_CHAIN_IDS.includes(chainId)) {
      this.waterfall = new WaterfallClient({
        chainId,
        publicClient,
        ensPublicClient,
        walletClient,
        apiConfig,
        includeEnsNames,
      })
    }
    if (LIQUID_SPLIT_CHAIN_IDS.includes(chainId)) {
      this.liquidSplits = new LiquidSplitClient({
        chainId,
        publicClient,
        ensPublicClient,
        walletClient,
        apiConfig,
        includeEnsNames,
      })
    }
    if (VESTING_CHAIN_IDS.includes(chainId)) {
      this.vesting = new VestingClient({
        chainId,
        publicClient,
        ensPublicClient,
        walletClient,
        apiConfig,
        includeEnsNames,
      })
    }
    if (TEMPLATES_CHAIN_IDS.includes(chainId)) {
      this.templates = new TemplatesClient({
        chainId,
        publicClient,
        ensPublicClient,
        walletClient,
        apiConfig,
        includeEnsNames,
      })
    }
    if (ORACLE_CHAIN_IDS.includes(chainId)) {
      this.oracle = new OracleClient({
        chainId,
        publicClient,
        ensPublicClient,
        walletClient,
        apiConfig,
        includeEnsNames,
      })
    }
    if (SWAPPER_CHAIN_IDS.includes(chainId)) {
      this.swapper = new SwapperClient({
        chainId,
        publicClient,
        ensPublicClient,
        walletClient,
        apiConfig,
        includeEnsNames,
      })
    }
    if (PASS_THROUGH_WALLET_CHAIN_IDS.includes(chainId)) {
      this.passThroughWallet = new PassThroughWalletClient({
        chainId,
        publicClient,
        ensPublicClient,
        walletClient,
        apiConfig,
        includeEnsNames,
      })
    }
    if (SPLITS_SUPPORTED_CHAIN_IDS.includes(chainId)) {
      this.splitV1 = new SplitV1Client({
        chainId,
        publicClient,
        ensPublicClient,
        walletClient,
        apiConfig,
        includeEnsNames,
      })
    }
    if (SPLITS_V2_SUPPORTED_CHAIN_IDS.includes(chainId)) {
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
    }

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
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface SplitsClientGasEstimates extends BaseGasEstimatesMixin {}
applyMixins(SplitsClientGasEstimates, [BaseGasEstimatesMixin])
