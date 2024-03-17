import { defineConfig } from 'vitest/config'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    globalSetup: ['src/testing/vitest/globalSetup'],
    setupFiles: ['src/testing/vitest/setup'],
  },
})
