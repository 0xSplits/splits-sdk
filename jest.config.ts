// eslint-disable-next-line
require('dotenv').config()

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['.*fork.*'],
}
