/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/modules/**/*.ts',
    '!src/modules/**/*.routes.ts', // usually tested via integration
    '!src/modules/**/*.schema.ts', // schemas don't need logic testing
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/__mocks__/uuid.js',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@providers/(.*)$': '<rootDir>/src/providers/$1'
  },
  transformIgnorePatterns: [
    "node_modules/(?!(minio)/)"
  ]
};
