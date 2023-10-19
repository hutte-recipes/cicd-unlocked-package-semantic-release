# Hutte Recipe - CI/CD Unlocked Package using Semantic Release

> This recipe uses [semantic-release](https://semantic-release.gitbook.io/semantic-release/) with [semantic-release-sfdx](https://github.com/leboff/semantic-release-sfdx) to create package versions based on [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

## Prerequisites

- a GitHub repository with a valid sfdx project
- a target org authenticated with Salesforce CLI locally
- a Dev Hub org authenticated with Salesforce CLI locally

## Steps

### Step 1

Create the GitHub Action Secrets (`Settings > Secrets and variables > Actions > New repository secret`):

```console
sf org display --verbose --json -o <MY_DEVHUB_ALIAS>
```

> **Note**
>
> The following assumes that the Dev Hub org where the Unlocked Package information gets stored and the Production org where the package gets installed are the same org.

Copy the value of `sfdxAuthUrl` to the clipboard.

| Name                       | Secret                  |
| -------------------------- | ----------------------- |
| `SFDX_AUTH_URL_DEVHUB`     | <PASTE_THE_sfdxAuthUrl> |
| `SFDX_AUTH_URL_TARGET_ORG` | <PASTE_THE_sfdxAuthUrl> |

### Step 2

Create an Unlocked Package:

```console
sf package create -t Unlocked --no-namespace --org-dependent --path force-app -n "${PACKAGE_NAME}" --description "${REPO_URL}" -v "${COMPANY_DEVHUB}"
git add sfdx-project.json
```

### Step 3

Create the `release.config.js` file:

```javascript
module.exports = {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "semantic-release-sfdx",
      {
        codecoverage: process.env.GITHUB_REF_NAME === "main",
        promote: process.env.GITHUB_REF_NAME === "main",
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["sfdx-project.json"],
      },
    ],
    "@semantic-release/github",
    [
      "@semantic-release/exec",
      {
        publishCmd:
          'export PKG_NAME="$(node -pe \'JSON.parse(fs.readFileSync("sfdx-project.json", "utf8")).packageDirectories.find(p => p.default).package\')"; \
export PKG_VERSION="${nextRelease.version}"; \
packageVersionId="$(node -pe \'JSON.parse(fs.readFileSync("sfdx-project.json", "utf8")).packageAliases[process.env.PKG_NAME + "@" + process.env.PKG_VERSION + "-0"]\')"; \
echo packageVersionId="$packageVersionId" >> ${process.env.GITHUB_OUTPUT}',
      },
    ],
  ],
};
```

### Step 4

Create the following three GitHub Workflows:

`.github/workflows/create-package-version.yml`

```yaml
name: Create Package Version

on:
  workflow_dispatch:
  workflow_call:
    outputs:
      packageVersionId:
        description: "If a package version has been published, this is the package version id (04t)"
        value: ${{ jobs.default.outputs.packageVersionId }}

jobs:
  default:
    name: Create Package Version
    runs-on: ubuntu-latest
    outputs:
      packageVersionId: ${{ steps.create-package-version.outputs.packageVersionId }}
    steps:
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Setup Salesforce CLI
        run: |
          npm install --global @salesforce/cli
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Authenticate Dev Hub org
        run: |
          sf org login sfdx-url --set-default-dev-hub --sfdx-url-file <(echo "${{ secrets.SFDX_AUTH_URL_DEVHUB }}")
      - id: create-package-version
        name: Create package version
        run: |
          npx -p semantic-release-sfdx -p @semantic-release/git -p @semantic-release/exec -p semantic-release semantic-release
          # packageVersionId will be set as output for the GH action (see release.config.js)
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`.github/workflows/install-package-version.yml`

```yaml
name: Install Package Version

on:
  workflow_dispatch:
    inputs:
      packageVersion:
        description: "ID (starts with 04t) or alias of the package version to install"
        required: true
  workflow_call:
    inputs:
      packageVersion:
        type: string
        description: "ID (starts with 04t) or alias of the package version to install"
        required: true

jobs:
  default:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Setup Salesforce CLI
        run: |
          npm install --global @salesforce/cli
      - name: Authenticate target org
        run: |
          sf org login sfdx-url --set-default --sfdx-url-file <(echo "${{ secrets.SFDX_AUTH_URL_TARGET_ORG }}")
      - name: Install package version in target org
        run: |
          sf package install --publish-wait 20 --wait 60 --package "${{ inputs.packageVersion }}"
```

`.github/workflows/main.yml`

```yaml
name: main

on:
  push:
    branches:
      - main

jobs:
  create-package-version:
    name: Run Create Package Version Workflow
    uses: ./.github/workflows/create-package-version.yml
    secrets: inherit
  install-package-version:
    name: Run Install Package Version Workflow
    uses: ./.github/workflows/install-package-version.yml
    needs: create-package-version
    if: ${{ needs.create-package-version.outputs.packageVersionId }}
    with:
      packageVersion: "${{ needs.create-package-version.outputs.packageVersionId }}"
    secrets: inherit
```

### Step 5

- Create a PR with a commit message like "fix: typo in help text"
- Merge the PR and verify the Action was run successfully
