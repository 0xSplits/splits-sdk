# Splits Core SDK

## Install

### Install the package with yarn or npm:

```bash
yarn add @0xsplits/splits-sdk@beta

npm install @0xsplits/splits-sdk@beta
```

## Documentation

Detailed documentation for the SDK can be found [here](https://docs.0xsplits.xyz/sdk)

## Build and Release

### Build the packages
From the root directory:

```bash
yarn install
lerna run build
```

### Update versions and prepare for npm publish
From the root directory:

```bash
lerna version --no-private
```

### Publish to npm
From each package directory that you want to publish:

```bash
npm publish
```

If you want to publish an alpha/beta version, apply the appropriate tag:
```bash
npm publish --tag beta
```
