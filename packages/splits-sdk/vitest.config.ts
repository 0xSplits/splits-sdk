import { defineConfig } from 'vitest/config'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    globalSetup: ['src/testing/globalSetup'],
    setupFiles: ['src/testing/setup'],
  },
})
