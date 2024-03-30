import { ImbalanceRatioEvent, RAMMSuiPool, SuiSupportedNetworks, TradeEvent } from "../src/types";
import { rammSuiConfigs } from "../src/constants";
import { TESTNET, rammMiscFaucet, testKeypair } from "./utils";

import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { describe, test } from 'vitest';

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

        console.log('Imbalance ratios:');
        console.log(JSON.stringify(imbalanceRatioEventJSON, null, 4));
    }, /** timeout for the test, in ms */ 5_000);
});