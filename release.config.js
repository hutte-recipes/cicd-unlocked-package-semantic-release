module.exports = {
  branches: ["main"],
  plugins: [
    [
      "semantic-release-sfdx",
      {
        codecoverage: process.env.GITHUB_REF_NAME === "main",
        promote: process.env.GITHUB_REF_NAME === "main",
      },
    ],
  ],
};
