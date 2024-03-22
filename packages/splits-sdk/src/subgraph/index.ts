import { GqlAccount, GqlPassThroughWallet, GqlSplit, GqlSwapper } from './types'
import {
  IAccountType,
  ILiquidSplit,
  IPassThroughWallet,
  ISplit,
  ISwapper,
  IVestingModule,
  IWaterfallModule,
} from './types'
import {
  formatGqlVestingModule,
  VESTING_MODULE_FIELDS_FRAGMENT,
} from './vesting'
import {
  formatGqlWaterfallModule,
  WATERFALL_MODULE_FIELDS_FRAGMENT,
} from './waterfall'
import { formatGqlLiquidSplit, LIQUID_SPLIT_FIELDS_FRAGMENT } from './liquid'
import {
  PASS_THROUGH_WALLET_FIELDS_FRAGMENT,
  formatGqlPassThroughWallet,
} from './pass-through-wallet'
import {
  ACCOUNT_FIELDS_FRAGMENT,
  formatGqlSplit,
  SPLIT_FIELDS_FRAGMENT,
} from './split'
import { formatGqlSwapper, SWAPPER_FIELDS_FRAGMENT } from './swapper'
import { USER_FIELDS_FRAGMENT, formatGqlUser } from './user'
import { GraphQLClient, gql } from 'graphql-request'
import { getAddress } from 'viem'
import { RequestConfig } from 'graphql-request/build/esm/types'

export const MAX_UNIX_TIME = 2147480000 // Max unix time is roughly Jan 19 2038

const ACCOUNT_FRAGMENT = gql`
  fragment AccountFragment on Account {
    __typename
    ...AccountFieldsFragment
    ... on User {
      ...UserFieldsFragment
    }
    ... on Split {
      ...SplitFieldsFragment
    }
    ... on VestingModule {
      ...VestingModuleFieldsFragment
    }
    ... on WaterfallModule {
      ...WaterfallModuleFieldsFragment
    }
    ... on LiquidSplit {
      ...LiquidSplitFieldsFragment
    }
    ... on Swapper {
      ...SwapperFieldsFragment
    }
    ... on PassThroughWallet {
      ...PassThroughWalletFieldsFragment
    }
  }

  ${ACCOUNT_FIELDS_FRAGMENT}
  ${USER_FIELDS_FRAGMENT}
  ${SPLIT_FIELDS_FRAGMENT}
  ${VESTING_MODULE_FIELDS_FRAGMENT}
  ${WATERFALL_MODULE_FIELDS_FRAGMENT}
  ${LIQUID_SPLIT_FIELDS_FRAGMENT}
  ${SWAPPER_FIELDS_FRAGMENT}
  ${PASS_THROUGH_WALLET_FIELDS_FRAGMENT}
`

export const ACCOUNT_QUERY = gql`
  query account($accountId: ID!, $chainId: String!) {
    account(id: $accountId, chainId: $chainId) {
      ...AccountFragment
    }
  }
  ${ACCOUNT_FRAGMENT}
`

export const FULL_ACCOUNT_QUERY = gql`
  query account(
    $accountId: ID!
    $chainId: String!
    $relatedAccountsLimit: Int!
  ) {
    account(id: $accountId, chainId: $chainId) {
      ...AccountFragment
    }

    relatedAccounts(
      id: $accountId
      chainId: $chainId
      limit: $relatedAccountsLimit
    ) {
      upstreamSplits {
        ...AccountFieldsFragment
        ...SplitFieldsFragment
      }
      upstreamLiquidSplits {
        ...AccountFieldsFragment
        ...LiquidSplitFieldsFragment
      }
      upstreamWaterfalls {
        ...AccountFieldsFragment
        ...WaterfallModuleFieldsFragment
      }
      upstreamVesting {
        ...AccountFieldsFragment
        ...VestingModuleFieldsFragment
      }
      upstreamSwappers {
        ...AccountFieldsFragment
        ...SwapperFieldsFragment
      }
      upstreamPassThroughWallets {
        ...AccountFieldsFragment
        ...PassThroughWalletFieldsFragment
      }
      controllingSplits {
        ...AccountFieldsFragment
        ...SplitFieldsFragment
      }
      pendingControlSplits {
        ...AccountFieldsFragment
        ...SplitFieldsFragment
      }
      ownedSwappers {
        ...AccountFieldsFragment
        ...SwapperFieldsFragment
      }
      ownedPassThroughWallets {
        ...AccountFieldsFragment
        ...PassThroughWalletFieldsFragment
      }
    }
  }

  ${ACCOUNT_FRAGMENT}
  ${ACCOUNT_FIELDS_FRAGMENT}
  ${SPLIT_FIELDS_FRAGMENT}
  ${WATERFALL_MODULE_FIELDS_FRAGMENT}
  ${LIQUID_SPLIT_FIELDS_FRAGMENT}
  ${VESTING_MODULE_FIELDS_FRAGMENT}
  ${SWAPPER_FIELDS_FRAGMENT}
  ${PASS_THROUGH_WALLET_FIELDS_FRAGMENT}
`

export const ACCOUNTS_QUERY = gql`
  query accounts($accounts: [AccountInput!]!) {
    accounts(accounts: $accounts) {
      ...AccountFragment
    }
  }

  ${ACCOUNT_FRAGMENT}
`

export const formatFullGqlAccount: (
  arg0: GqlAccount,
  arg1?: ISplit[],
  arg2?: IVestingModule[],
  arg3?: IWaterfallModule[],
  arg4?: ILiquidSplit[],
  arg5?: ISwapper[],
  arg6?: IPassThroughWallet[],
  arg7?: GqlSplit[],
  arg8?: GqlSplit[],
  arg9?: GqlSwapper[],
  arg10?: GqlPassThroughWallet[],
) => IAccountType = (
  gqlAccount,
  upstreamSplits,
  upstreamVestingModules,
  upstreamWaterfallModules,
  upstreamLiquidSplits,
  upstreamSwappers,
  upstreamPassThroughWallets,
  gqlControllingSplits,
  gqlPendingControlSplits,
  gqlOwnedSwappers,
  gqlOwnedPassThroughWallets,
) => {
  const pendingControlSplits = gqlPendingControlSplits?.map((split) =>
    getAddress(split.id),
  )
  const upstreamLiquidSplitAddresses = upstreamLiquidSplits?.map(
    (upstreamLiquidSplit) => getAddress(upstreamLiquidSplit.address),
  )
  const upstreamLiquidSplitDownstreamSplitAddresses = upstreamLiquidSplits?.map(
    (upstreamLiquidSplit) => getAddress(upstreamLiquidSplit.splitId),
  )
  const controllingSplits = gqlControllingSplits
    // Don't include the split that the liquid split controls
    ?.filter((gqlSplit) => gqlSplit.liquidSplit?.id !== gqlAccount.id)
    .map((gqlSplit) => getAddress(gqlSplit.id))
  const ownedSwappers = gqlOwnedSwappers?.map((swapper) =>
    getAddress(swapper.id),
  )
  const ownedPassThroughWallets = gqlOwnedPassThroughWallets?.map(
    (passThroughWallet) => getAddress(passThroughWallet.id),
  )

  const relatedData = {
    ...(upstreamSwappers !== undefined && {
      upstreamSwappers: upstreamSwappers?.map((upstreamSwapper) =>
        getAddress(upstreamSwapper.address),
      ),
    }),
    ...(upstreamPassThroughWallets !== undefined && {
      upstreamPassThroughWallets: upstreamPassThroughWallets?.map(
        (upstreamPassThroughWallet) =>
          getAddress(upstreamPassThroughWallet.address),
      ),
    }),
    ...(upstreamVestingModules !== undefined && {
      upstreamVesting: upstreamVestingModules?.map((upstreamVestingModule) =>
        getAddress(upstreamVestingModule.address),
      ),
    }),
    ...(upstreamWaterfallModules !== undefined && {
      upstreamWaterfalls: upstreamWaterfallModules?.map(
        (upstreamWaterfallModule) =>
          getAddress(upstreamWaterfallModule.address),
      ),
    }),
    ...(upstreamLiquidSplits !== undefined && {
      upstreamLiquidSplits: upstreamLiquidSplitAddresses,
    }),
    ...(upstreamSplits !== undefined && {
      upstreamSplits: upstreamSplits
        ?.map((upstreamSplit) => getAddress(upstreamSplit.address))
        .filter(
          (address) =>
            !upstreamLiquidSplitDownstreamSplitAddresses?.includes(address),
        ),
    }),
    ...(gqlControllingSplits !== undefined && {
      controllingSplits,
    }),
    ...(gqlPendingControlSplits !== undefined && {
      pendingControlSplits,
    }),
    ...(gqlOwnedSwappers !== undefined && {
      ownedSwappers,
    }),
    ...(gqlOwnedPassThroughWallets !== undefined && {
      ownedPassThroughWallets,
    }),
  }
  return {
    ...formatGqlAccount(gqlAccount),
    ...relatedData,
  }
}

export const formatGqlAccount: (arg0: GqlAccount) => IAccountType = (
  gqlAccount,
) => {
  if (gqlAccount.__typename === 'Split')
    return {
      ...formatGqlSplit(gqlAccount),
    }
  if (gqlAccount.__typename === 'LiquidSplit')
    return {
      ...formatGqlLiquidSplit(gqlAccount),
    }
  if (gqlAccount.__typename === 'WaterfallModule')
    return {
      ...formatGqlWaterfallModule(gqlAccount),
    }
  if (gqlAccount.__typename === 'VestingModule')
    return {
      ...formatGqlVestingModule(gqlAccount),
    }
  if (gqlAccount.__typename === 'Swapper')
    return {
      ...formatGqlSwapper(gqlAccount),
    }
  if (gqlAccount.__typename === 'PassThroughWallet')
    return {
      ...formatGqlPassThroughWallet(gqlAccount),
    }
  return {
    ...formatGqlUser(gqlAccount),
  }
}

const SPLITS_GRAPHQL_URL = 'api.splits.org/graphql'

export const getGraphqlClient = ({
  apiKey,
  serverURL,
}: {
  apiKey: string
  serverURL?: string
}): GraphQLClient => {
  if (!serverURL) {
    serverURL = SPLITS_GRAPHQL_URL
  }

  const requestConfig: RequestConfig = {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  }
  return new GraphQLClient(serverURL, requestConfig)
}
