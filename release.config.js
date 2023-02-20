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
