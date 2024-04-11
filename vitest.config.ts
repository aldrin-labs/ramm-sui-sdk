import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        poolOptions: {
            threads: {
                // Tests cannot be run in parallel to avoid locking Sui objects until the end of the
                // global clock epoch; see "equivocation": https://docs.sui.io/sui-glossary#equivocation
                singleThread: true
            }
        }
    }
})