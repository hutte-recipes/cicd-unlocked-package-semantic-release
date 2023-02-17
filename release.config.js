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
          "echo packageVersion=${nextRelease.version} >> \\$GITHUB_OUTPUT",
      },
    ],
  ],
};
