export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'json-summary']
};
