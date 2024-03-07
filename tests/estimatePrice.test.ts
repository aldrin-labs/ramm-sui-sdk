import { suiConfigs } from "../src/constants";
import { RAMMSuiPool } from "../src/types";
import {
    TESTNET,
    PriceEstimationEvent,
    rammMiscFaucet, testKeypair
} from "./utils";

import { getFullnodeUrl, SuiClient, SuiEvent, SuiObjectChange } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { assert, describe, expect, test } from 'vitest';

describe('Trade amount into RAMM', () => {
    test('Deposit ADA/DOT liquidity to an ADA/DOT/SOL RAMM pool; trade ADA into the pool for DOT, using the SDK', async () => {
        /**
         * Create a Sui client, and retrieve an existing and initialized RAMM pool from
         * the configs provided in the library.
         */

        // use `getFullnodeUrl` to query the testnet's RPC location
        const rpcUrl = getFullnodeUrl(TESTNET);
        // create a client connected to the testnet
        const suiClient = new SuiClient({ url: rpcUrl });

        const suiTestnet = suiConfigs.suiTestnet;
        if (!suiTestnet) {
            throw new Error('Sui Testnet config not found!');
        }

        // Select the ADA/DOT/SOL RAMM
        const poolConfig = suiTestnet[0];
        const ramm: RAMMSuiPool = new RAMMSuiPool(poolConfig);

        console.log('Running test for: ' + ramm.name);

        const adaType: string = `0x${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::ADA`;
        const dotType: string = `0x${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::DOT`;

        /*
        Onto the trade - perform the DOT "sell" trade using the SDK
        */

        // This is 1 DOT, to be used for the trade.
        const dotAmount: number = 100_000_000;
        const txb = ramm.estimatePriceTradeAmountIn(
            {
                assetIn: dotType,
                assetOut: adaType,
                amountIn: dotAmount,
            }
        );
        const devInspectRes = await suiClient.devInspectTransactionBlock({
            sender: testKeypair.toSuiAddress(),
            transactionBlock: txb,
        });

        console.log(devInspectRes.events[0].parsedJson as PriceEstimationEvent);

    }, /** timeout for the test, in ms */ 500);
});