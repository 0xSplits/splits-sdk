# Splits SDK

Developer tools for integrating with the 0xSplits contracts and subgraph data

## Packages

| Package                                        | Description                                      |
| ---------------------------------------------- | :----------------------------------------------- |
| [splits-sdk](/packages/splits-sdk)             | Core package for integrating with 0xSplits       |
| [splits-sdk-react](/packages/splits-sdk-react) | A wrapper of splits-sdk with helpful React Hooks |
| [splits-kit](/packages/splits-kit)             | Pre-built React components for 0xSplits          |

## Testing

Run tests with `pnpm run test`

## Local development

### Build the packages

From the root directory:

```bash
pnpm install
pnpm run lerna-build
```

### Update versions and prepare for npm publish

From the root directory:

```bash
pnpm run lerna-version
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
