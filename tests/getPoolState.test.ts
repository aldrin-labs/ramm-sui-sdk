import { PoolStateEvent, RAMMSuiPool, SuiSupportedNetworks } from "../src/types"
import { rammSuiConfigs } from "../src/constants"
import { TESTNET, rammMiscFaucet, sleep, testKeypair } from "./utils"

import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client"
import { getFaucetHost, requestSuiFromFaucetV1 } from "@mysten/sui.js/faucet"
import { TransactionBlock } from "@mysten/sui.js/transactions"

import { describe, expect, test } from "vitest"

describe("Pool state query", () => {
    test("Query the state of a BTC/ETH/SOL RAMM pool", async () => {
        /**
         * Create a Sui client, and retrieve an existing and initialized RAMM pool from
         * the configs provided in the library.
         */

        // use `getFullnodeUrl` to query the testnet's RPC location
        const rpcUrl = getFullnodeUrl(TESTNET)
        // create a client connected to the testnet
        const suiClient = new SuiClient({ url: rpcUrl })

        const suiTestnetPools = rammSuiConfigs[SuiSupportedNetworks.testnet]
        if (!suiTestnetPools) {
            throw new Error("Sui Testnet config not found!")
        }

        // Select the BTC/ETH/SOL RAMM
        const poolConfig = suiTestnetPools[1]
        const ramm: RAMMSuiPool = new RAMMSuiPool(poolConfig)

        console.log("Running test for: " + ramm.name)

        /**
         * Request SUI from the testnet's faucet.
         */

        await requestSuiFromFaucetV1({
            host: getFaucetHost(TESTNET),
            recipient: testKeypair.toSuiAddress(),
        })

        // Wait for the network to register the SUI faucet transaction.
        await sleep(600)

        const txb = new TransactionBlock()
        ramm.getPoolState(txb)
        const resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: txb,
            options: {
                // required, so that we can scrutinize the response's events for the pool state
                // query
                showEvents: true,
            },
        })

        const poolStateEvent = resp.events![0]
        const poolStateEventJSON = poolStateEvent.parsedJson as PoolStateEvent

        expect(poolStateEventJSON.ramm_id).toBe(ramm.poolAddress)
        expect(poolStateEventJSON.sender).toBe(testKeypair.toSuiAddress())

        expect(poolStateEventJSON.asset_balances.length).toBe(ramm.assetCount)
        expect(Number(poolStateEventJSON.asset_balances[0])).toBeGreaterThan(0)
        expect(Number(poolStateEventJSON.asset_balances[1])).toBeGreaterThan(0)
        // recall that this test pool may have 0 SOL deposited to it
        expect(
            Number(poolStateEventJSON.asset_balances[2])
        ).toBeGreaterThanOrEqual(0)

        expect(poolStateEventJSON.asset_lpt_issued.length).toBe(ramm.assetCount)
        expect(Number(poolStateEventJSON.asset_lpt_issued[0])).toBeGreaterThan(
            0
        )
        expect(Number(poolStateEventJSON.asset_lpt_issued[1])).toBeGreaterThan(
            0
        )
        // recall that this test pool may have 0 SOL deposited to it, and thus no issued LP<SOL>
        expect(
            Number(poolStateEventJSON.asset_lpt_issued[2])
        ).toBeGreaterThanOrEqual(0)

        console.log(poolStateEventJSON)

        expect(poolStateEventJSON.asset_types.length).toBe(ramm.assetCount)
        expect(poolStateEventJSON.asset_types[0].name).toBe(
            `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::BTC`
        )
        expect(poolStateEventJSON.asset_types[1].name).toBe(
            `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::ETH`
        )
        expect(poolStateEventJSON.asset_types[2].name).toBe(
            `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::SOL`
        )
    }, /** timeout for the test, in ms */ 5_000)
})
