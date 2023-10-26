# Splits React SDK

This is the react wrapper for the core splits sdk. It provides convenient hooks for easily 
displaying 0xSplits data in a React app. The core sdk client is also available for performing 
all contract transactions.

## Install

### Install the package with yarn or npm:

```bash
yarn add @0xsplits/splits-sdk-react

npm install @0xsplits/splits-sdk-react

```

## Documentation

Detailed documentation for the SDK can be found [here](https://docs.splits.org/react)


### Viem vs Ethers

The Splits SDK uses Viem under the hood. There is an older version of the SDK that uses ethers-v5.
If you would like to use that instead, you can install it with:

```bash
yarn add @0xsplits/splits-sdk-react@0

npm install @0xsplits/splits-sdk-react@0
```

Documentation for the old Ethers version can be found [here](https://docs.splits.org/react-v0)
