import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    poolOptions: {
      threads: {
        // Threads related options here
        singleThread: true
      }
    }
  }
})