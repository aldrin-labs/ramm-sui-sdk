import { ImbalanceRatioEvent, RAMMSuiPool, SuiSupportedNetworks, TradeEvent } from "../src/types";
import { rammSuiConfigs } from "../src/constants";
import { TESTNET, rammMiscFaucet, testKeypair } from "./utils";

import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { assert, describe, expect, test } from 'vitest';

describe('Imbalance ratio query', () => {
    test('Retrieve imbalance ratios of ADA/DOT/SOL pool using the SDK', async () => {
        /**
         * Create a Sui client, and retrieve an existing and initialized RAMM pool from
         * the configs provided in the library.
         */

        // use `getFullnodeUrl` to query the testnet's RPC location
        const rpcUrl = getFullnodeUrl(TESTNET);
        // create a client connected to the testnet
        const suiClient = new SuiClient({ url: rpcUrl });

        const suiTestnetPools = rammSuiConfigs[SuiSupportedNetworks.testnet];
        if (!suiTestnetPools) {
            throw new Error('Sui Testnet config not found!');
        }

        // Select the ADA/DOT/SOL RAMM
        const poolConfig = suiTestnetPools[0];
        const ramm: RAMMSuiPool = new RAMMSuiPool(poolConfig);

        console.log('Running test for: ' + ramm.name);

        /*
        Onto the imbalance ratio query
        */

        const imb_ratios_txb = ramm.getPoolImbalanceRatios();
        const devInspectRes = await suiClient.devInspectTransactionBlock({
            sender: testKeypair.toSuiAddress(),
            transactionBlock: imb_ratios_txb,
        });

        const imbalanceRatioEventJSON = devInspectRes.events[0].parsedJson as ImbalanceRatioEvent;

        console.log('Imbalance ratio event: ' + JSON.stringify(imbalanceRatioEventJSON, null, 4));

        assert.equal(imbalanceRatioEventJSON.ramm_id, ramm.poolAddress);
        assert.equal(imbalanceRatioEventJSON.requester, testKeypair.toSuiAddress());

        let i = 0;
        while (i < imbalanceRatioEventJSON.imb_ratios.contents.length) {
            let value = Number(imbalanceRatioEventJSON.imb_ratios.contents[i].value)
            value = Number(value)
            // imbalance ratios come with the RAMM's precision of decimal places, so scaling them back
            // to a real between 0 and 2 is required.
            value /= (10 ** ramm.precisionDecimalPlaces)
            expect(value).toBeGreaterThan(1 - ramm.delta)
            expect(value).toBeLessThan(1 + ramm.delta)
            i++
        }
    }, /** timeout for the test, in ms */ 5_000);
});