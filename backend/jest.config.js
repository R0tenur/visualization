module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.ts",
    "!**/node_modules/**",
    "!**/out/**"
  ],
  coverageReporters: ["html", "text", "text-summary", "cobertura"],
  coverageDirectory: './coverage',
  testMatch: ["**/*.spec.ts"],
  "transform": {
    "node_modules/variables/.+\\.(j|t)sx?$": "ts-jest"
  },
  "transformIgnorePatterns": [
    "node_modules/(?!variables/.*)"
  ]
};