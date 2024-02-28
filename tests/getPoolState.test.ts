import { suiConfigs } from "../src/constants";
import { RAMMSuiPool } from "../src/types";
import {
    LiquidityDepositEvent,
    PoolStateEvent,
    TESTNET,
    rammMiscFaucet, sleep, testKeypair
} from "./utils";

import { getFullnodeUrl, SuiClient, SuiEvent } from '@mysten/sui.js/client';
import { getFaucetHost, requestSuiFromFaucetV1 } from '@mysten/sui.js/faucet';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { assert, describe, expect, test } from 'vitest';

describe('Pool state query', () => {
    test('Get coins from `ramm-misc` faucet, and then deposit liquidity to a BTC/ETH/SOL RAMM pool', async () => {
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

        // Select the BTC/ETH/SOL RAMM
        const poolConfig = suiTestnet[1];
        const ramm: RAMMSuiPool = new RAMMSuiPool(poolConfig);

        console.log(ramm);

        /**
         * Request SUI from the testnet's faucet.
        */

        await requestSuiFromFaucetV1({
            host: getFaucetHost(TESTNET),
            recipient: testKeypair.toSuiAddress(),
        });

        // Wait for the network to register the SUI faucet transaction.
        await sleep(600);

        const txb = new TransactionBlock();
        ramm.getPoolState(txb);
        let resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: txb,
            options: {
                // required, so that we can scrutinize the response's events for the pool state
                // query
                showEvents: true
            }
        });

        const poolStateEvent = resp.events![0] as SuiEvent;
        const poolStateEventJSON = poolStateEvent.parsedJson as PoolStateEvent;

        console.log(poolStateEventJSON);
    }, /** timeout for the test, in ms */ 5_000);
});