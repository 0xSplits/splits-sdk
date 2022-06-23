# Splits SDK

## Examples

```
import { utils } from 'ethers'
import { Contract } from '@ethersproject/contracts'
import { JsonRpcProvider } from '@ethersproject/providers'
import SplitMainArtifact from '@0xsplits/splits-sdk/artifacts/splits/ethereum/contracts/SplitMain.sol/SplitMain.json'

const SPLIT_MAIN_ADDRESS = '0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE'
const DONATION_SPLIT_ADDRESS = '0xF8843981e7846945960f53243cA2Fd42a579f719'
const RPC_URL = YOUR_RPC_URL

const provider = new JsonRpcProvider(RPC_URL)
const splitMainInterface = new utils.Interface(SplitMainArtifact.abi)
const splitMain = new Contract(
  SPLIT_MAIN_ADDRESS,
  splitMainInterface,
  provider
)

const splitsDonationsEthBalance = await splitMain.getETHBalance(DONATION_SPLIT_ADDRESS)
```
