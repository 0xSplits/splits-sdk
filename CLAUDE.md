# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a monorepo for the 0xSplits SDK - developer tools for integrating with the 0xSplits protocol on Ethereum. The SDK enables developers to interact with 0xSplits smart contracts for splitting ETH and ERC20 tokens among multiple recipients.

**Monorepo Structure:**
- **splits-sdk** - Core SDK for integrating with 0xSplits contracts and subgraph data
- **splits-sdk-react** - React wrapper providing hooks for the core SDK
- **splits-kit** - Pre-built React UI components for 0xSplits

## Commands

### Development Setup
```bash
pnpm install                    # Install dependencies
pnpm run lerna-build           # Build all packages
```

### Building
```bash
# Build all packages from root
pnpm run lerna-build

# Build individual packages (from package directory)
cd packages/splits-sdk && pnpm run build
cd packages/splits-sdk-react && pnpm run build
cd packages/splits-kit && pnpm run build
```

### Testing
```bash
# Mocked tests (root)
pnpm run test

# Forked tests (uses real blockchain forks)
pnpm run vitest

# Run forked tests from splits-sdk package
cd packages/splits-sdk && pnpm vitest
```

**Test Environment Setup:**
- Update `.env` with values from `packages/splits-sdk/.env.sample`
- Fork tests require: `VITE_ANVIL_FORK_URL` and `VITE_ANVIL_BLOCK_NUMBER`
- Forked test files must include "fork" in filename: `*-fork.test.ts`
- Jest config ignores fork tests via `testPathIgnorePatterns`

### Linting & Formatting
```bash
pnpm run eslint                # Check linting
pnpm run eslint:fix            # Fix linting issues
pnpm run prettier              # Check formatting
pnpm run prettier:fix          # Fix formatting
```

### Publishing
```bash
# Version packages
pnpm run lerna-version

# Publish from each package directory
cd packages/[package-name]
pnpm publish                   # Production
pnpm publish --tag beta        # Beta/alpha versions
```

### Storybook (splits-kit only)
```bash
cd packages/splits-kit
pnpm run storybook             # Dev server on :6006
pnpm run build-storybook       # Build static storybook
```

### Local Linking with yalc
```bash
# In package to link
yalc publish

# In consuming project
yalc add @0xsplits/splits-sdk

# To unlink
yalc remove @0xsplits/splits-sdk
```

## Architecture

### Core SDK (splits-sdk)

**Client Architecture:**
- **SplitsClient** - Main entry point, composes all module clients
- Module clients accessed as properties: `client.splitV1`, `client.splitV2`, `client.waterfall`, etc.
- Each module client extends **BaseTransactions** and uses **BaseClientMixin**
- Mixin pattern via `applyMixins()` for shared functionality

**Key Modules:**
- `splitV1` - Original split contracts (v1)
- `splitV2` - New split contracts (v2) with enhanced features
- `waterfall` - Waterfall payment distributions
- `liquidSplits` - Liquid split functionality
- `vesting` - Vesting schedules
- `warehouse` - Token warehouse/escrow
- `swapper` - Token swapping utilities
- `oracle` - Price oracle integration
- `passThroughWallet` - Pass-through wallet functionality
- `templates` - Recoup and other contract templates
- `dataClient` - Subgraph data queries (optional, requires `apiConfig`)

**Client Initialization:**
```typescript
const client = new SplitsClient({
  chainId?: number,
  publicClient?: PublicClient,     // viem PublicClient
  publicClients?: { [chainId: number]: PublicClient },
  walletClient?: WalletClient,     // viem WalletClient
  apiConfig?: { apiKey: string },  // For DataClient/subgraph
  includeEnsNames?: boolean,
  ensPublicClient?: PublicClient,  // Mainnet client for ENS
})
```

**Transaction Pattern:**
- Write operations return transaction hashes
- Gas estimation available via `client.estimateGas.*`
- `TransactionType` enum: `Transaction` vs `GasEstimate`
- All transactions accept optional `transactionOverrides`

**Chain Support:**
- Split v1: Multiple chains (see `SPLITS_SUPPORTED_CHAIN_IDS`)
- Split v2: Limited chains (see `SPLITS_V2_SUPPORTED_CHAIN_IDS`)
- Each module validates supported chains via `_supportedChainIds`

### React SDK (splits-sdk-react)

**Architecture:**
- `SplitsProvider` context wraps the app
- Hooks consume context to access SplitsClient instance
- Hooks follow pattern: `use[Module][Action]` (e.g., `useCreateSplit`, `useDistributeToken`)
- Separate hooks for reads vs writes

**Usage Pattern:**
```tsx
<SplitsProvider config={splitsConfig}>
  <App />
</SplitsProvider>
```

### UI Components (splits-kit)

**Architecture:**
- Pre-built React components for common 0xSplits operations
- Uses Tailwind CSS (must import `@0xsplits/splits-kit/styles.css`)
- Depends on `@headlessui/react`, `@heroicons/react`, `react-hook-form`
- Peer dependencies: `react`, `react-dom`, `viem`, `wagmi`

**Component Exports:**
- Input components available via `@0xsplits/splits-kit/inputs`
- Styles via `@0xsplits/splits-kit/styles.css`

## Code Conventions

### ESLint Rules
- **No loops allowed** - Use functional patterns (map, reduce, etc.) instead
- `no-loops/no-loops`: error
- `no-console`: warning
- Prettier formatting enforced

### TypeScript
- Strict type safety throughout
- Viem types used for blockchain interactions (`Address`, `Hash`, `Hex`, etc.)
- Config types follow pattern: `[Action]Config` with `TransactionOverridesDict`
- All configs use `chainId?: number` for multi-chain support

### Testing
- Test files colocated with source in `src/client/`
- Mocked tests: `*.test.ts`
- Fork tests: `*-fork.test.ts`
- Fork tests use `@viem/anvil` for local blockchain forking

### Package Exports
All packages use exports map in package.json for subpath exports:
```json
{
  ".": "./dist/index.js",
  "./types": "./dist/types.js",
  "./utils": "./dist/utils/index.js"
}
```

## Important Constraints

### Recipient Limits
- Split v1/v2 recipients capped at 400-500 depending on type
- See recent commits mentioning "cap recipients"

### Viem vs Ethers
- Current SDK uses **Viem** (v2.x+)
- Legacy ethers-v5 versions available: `@0xsplits/splits-sdk@2`, `@0xsplits/splits-sdk-react@0`
- Do not mix Viem and Ethers versions

### Chain Compatibility
- Not all modules support all chains
- OP stack chains (Base, Optimism) require special typing considerations (see `SplitsPublicClient` type comment)
- Use module-specific chain constant arrays for validation

## File Organization

```
packages/splits-sdk/src/
├── client/           # Module clients (splitV1, splitV2, waterfall, etc.)
│   ├── base.ts      # BaseClient, BaseTransactions, mixins
│   ├── index.ts     # SplitsClient composition
│   └── [module].ts  # Individual module clients
├── constants/       # Chain IDs, addresses, ABIs
│   └── abi/        # Contract ABIs
├── subgraph/       # GraphQL queries for subgraph data
├── utils/          # Utility functions, validation
├── types.ts        # All TypeScript types
├── errors.ts       # Custom error classes
└── index.ts        # Public exports
```
