import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    poolOptions: {
      threads: {
        // Tests cannot be run in parallel to avoid locking objects
        singleThread: true
      }
    }
  }
})