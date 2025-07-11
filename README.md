# Splits SDK

Developer tools for integrating with the 0xSplits contracts and subgraph data

## Packages

| Package                                        | Description                                      |
| ---------------------------------------------- | :----------------------------------------------- |
| [splits-sdk](/packages/splits-sdk)             | Core package for integrating with 0xSplits       |
| [splits-sdk-react](/packages/splits-sdk-react) | A wrapper of splits-sdk with helpful React Hooks |
| [splits-kit](/packages/splits-kit)             | Pre-built React components for 0xSplits          |

## Testing

Update the `.env` file with appropriate values for the variables present [here](packages/splits-sdk/.env.sample). If you see any failing forked tests it could be because of the outdated block number, make sure to update it to the most recent one. This should be automated in the future.

Run mocked tests with `pnpm run test`.
Run forked tests with `pnpm run vitest`.

note: when writing forked tests make sure to add fork in the test file name. e.g. `my-test-fork.test.ts`.

## Local development

### Build the packages

From the root directory:

```bash
pnpm install
pnpm run lerna-build
```

### Local linking

Can use yalc to link the locally built sdk to other projects.

```bash
pnpm install -g yalc
```

In the package you want to link, run:

```bash
yalc publish
```

In the project you want to link to, run (replace @0xsplits/splits-sdk with whatever package you are linking to the local package):

```bash
yalc add @0xsplits/splits-sdk
```

To unlink the package, run:

```bash
yalc remove @0xsplits/splits-sdk
```


### Update versions and prepare for npm publish

From the root directory:

```bash
pnpm run lerna-version
```

### Publish to npm

From each package directory that you want to publish:

```bash
pnpm publish
```

If you want to publish an alpha/beta version, apply the appropriate tag:

```bash
pnpm publish --tag beta
```

### Creating a Release

Once you are done publishing all the packages, create a release on GitHub. The release version should match the version you published to npm. Use the `Generate release notes` button to automatically generate the release notes.

### Configuring npm for publishing

1. You will need to be added to the `0xsplits` npm organization to publish packages. Ask a team member to add you.
2. You will need to be logged in to npm on your local machine. Run `npm login` and enter your credentials.
3. Set the scope to `@0xsplits` by running `npm config set scope 0xsplits`
