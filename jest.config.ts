// eslint-disable-next-line
require('dotenv').config()

export default {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { downlevelIteration: true } }],
  },
  testEnvironment: 'node',
  testPathIgnorePatterns: ['.*fork.*'],
}
