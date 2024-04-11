import {
    LiquidityDepositEvent,
    RAMMSuiPool,
    SuiSupportedNetworks,
} from "../src/types"
import { rammSuiConfigs } from "../src/constants"

import { TESTNET, rammMiscFaucet, sleep, testKeypair } from "./utils"

import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client"
import { getFaucetHost, requestSuiFromFaucetV1 } from "@mysten/sui.js/faucet"
import { TransactionBlock } from "@mysten/sui.js/transactions"

import { assert, describe, expect, test } from "vitest"

describe("Liquidity deposit", () => {
    test("Get coins from `ramm-misc` faucet, and then deposit liquidity to a BTC/ETH/SOL RAMM pool", async () => {
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

        /**
         * Mint test coins from the `ramm-misc` package's `test_coin_faucet` module.
         */

        const txb = new TransactionBlock()
        const btcType: string = `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::BTC`

        // BTC has 8 decimal places, so this is 0.01 BTC.
        const btcAmount: number = 1_000_000
        const coin = txb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [
                txb.object(rammMiscFaucet.faucetAddress),
                txb.pure(btcAmount),
            ],
            typeArguments: [btcType],
        })

        ramm.liquidityDeposit(txb, { assetIn: btcType, amountIn: coin })

        const resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: txb,
            options: {
                // required, so that we can scrutinize the response's events for a trade
                showEvents: true,
            },
        })

        const liqDepEvent = resp.events![0]
        const liqDepEventJSON = liqDepEvent.parsedJson as LiquidityDepositEvent

        console.log(liqDepEventJSON)

        assert.equal(liqDepEventJSON.ramm_id, ramm.poolAddress)
        assert.equal(liqDepEventJSON.trader, testKeypair.toSuiAddress())
        assert.equal(liqDepEventJSON.token_in.name, btcType)
        expect(Number(liqDepEventJSON.amount_in)).toBeGreaterThan(0)
        expect(Number(liqDepEventJSON.amount_in)).toBeLessThanOrEqual(btcAmount)
        expect(Number(liqDepEventJSON.lpt)).toBeGreaterThan(0)
        expect(Number(liqDepEventJSON.lpt)).toBeLessThan(btcAmount)
    }, /** timeout for the test, in ms */ 10_000)
})
