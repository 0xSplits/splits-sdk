# Splits Core SDK

## Install

### Install the package with yarn or npm:

```bash
yarn add @0xsplits/splits-sdk

npm install @0xsplits/splits-sdk
```

## Documentation

```js
import { SplitsClient } from '@0xsplits/splits-sdk'

const splitsClient = new SplitsClient({
  chainId,
  provider,
  signer,
})
```

### SplitMain writes

#### **createSplit**
Inputs: {
  recipients: { address: string; percentAllocation: number }[]
  distributorFeePercent: number
  controller: string
}
<br>
Outputs: {
  splitId: string
  event: Event
}

#### **updateSplit**
Inputs: {
  splitId: string
  recipients: { address: string; percentAllocation: number }[]
  distributorFeePercent: number
}
<br>
Outputs: {
  event: Event
}

#### **distributeToken**
Inputs: {
  splitId: string
  token?: string (default AddressZero)
  distributorAddress?: string (defaults to signer)
}
<br>
Outputs: {
  event: Event
}

#### **updateSplitAndDistributeToken**
Inputs: {
  splitId: string
  token?: string (defaults to AddressZero)
  recipients: { address: string; percentAllocation: number }[]
  distributorFeePercent: number
  distributorAddress?: string (defaults to signer)
}
<br>
Outputs: {
  event: Event
}

#### **withdrawFunds**
Inputs: {
  address: string
  tokens: string[]
}
<br>
Outputs: {
  event: Event
}

#### **initiateControlTransfer**
Inputs: {
  splitId: string
  newController: string
}
<br>
Outputs: {
  event: Event
}

#### **acceptControlTransfer**
Inputs: {
  splitId: string
}
<br>
Outputs: {
  event: Event
}

#### **cancelControlTransfer**
Inputs: {
  splitId: string
}
<br>
Outputs: {
  event: Event
}

#### **makeSplitImmutable**
Inputs: {
  splitId: string
}
<br>
Outputs: {
  event: Event
}

### SplitMain reads

#### **getSplitBalance**
Inputs: {
  splitId: string
  token?: string (defaults to AddressZero)
}
<br>
Outputs: {
  balance: BigNumber
}

#### **predictImmutableSplitAddress**
Inputs: {
  recipients: { address: string; percentAllocation: number }[]
  distributorFeePercent: number
}
<br>
Outputs: {
  splitId: string
}

#### **getController**
Inputs: {
  splitId: string
}
<br>
Outputs: {
  controller: string
}

#### **getNewPotentialController**
Inputs: {
  splitId: string
}
<br>
Outputs: {
  newPotentialController: string
}

#### **getHash**
Inputs: {
  splitId: string
}
<br>
Outputs: {
  hash: string
}

### Subgraph reads

#### **getSplitMetadata**
Inputs: {
  splitId: string
}
<br>
Outputs: {
  id: string
  controller: string | null
  newPotentialController: string | null
  distributorFeePercent: number
  recipients: { address: string; percentAllocation: number }[]
  createdBlock: number
}

#### **getRelatedSplits**
Inputs: {
  address: string
}
<br>
Outputs: {
  receivingFrom: {
    id: string
    controller: string | null
    newPotentialController: string | null
    distributorFeePercent: number
    recipients: { address: string; percentAllocation: number }[]
    createdBlock: number
  }
  controlling: {
    id: string
    controller: string | null
    newPotentialController: string | null
    distributorFeePercent: number
    recipients: { address: string; percentAllocation: number }[]
    createdBlock: number
  }
  pendingControl: {
    id: string
    controller: string | null
    newPotentialController: string | null
    distributorFeePercent: number
    recipients: { address: string; percentAllocation: number }[]
    createdBlock: number
  }
}

#### **getSplitEarnings**
Inputs: {
  splitId: string
  includeActiveBalances?: boolean (defaults true)
}
<br>
Outputs: {
  distributed: {
    \[token: string\]: BigNumber
  }
  activeBalances?: {
    \[token: string\]: BigNumber
  }
}

#### **getUserEarnings**
Inputs: {
  userId: string
}
<br>
Outputs: {
  withdrawn: {
    \[token: string\]: BigNumber
  }
  activeBalances: {
    \[token: string\]: BigNumber
  }
}
