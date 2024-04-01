import { 
    ImbalanceRatioEvent, PoolStateEvent, RAMMSuiPool, SuiSupportedNetworks,
    processImbRatioEvent, processPoolStateEvent
} from "../src/types";
import { rammSuiConfigs } from "../src/constants";
import { TESTNET, sleep, testKeypair } from "./utils";

import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { getFaucetHost, requestSuiFromFaucetV1 } from '@mysten/sui.js/faucet';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { describe, test } from 'vitest';
import { assert } from "console";

describe('Separate Pool state/imb ratio query', () => {
    test('Simultaneously query the pool state and imbalance ratios of a BTC/ETH/SOL pool', async () => {
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

        // Select the BTC/ETH/SOL RAMM
        const poolConfig = suiTestnetPools[1];
        const ramm: RAMMSuiPool = new RAMMSuiPool(poolConfig);

        console.log('Running test for: ' + ramm.name);

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
        ramm.getPoolImbalanceRatios(txb);

        let resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: txb,
            options: {
                // required, so that we can scrutinize the response's events for the pool state
                // query
                showEvents: true
            }
        });

        const poolStateEvent = resp.events!.filter((event) => event.type.split('::')[2] === 'PoolStateEvent')[0];
        const poolStateEventJSON = poolStateEvent.parsedJson as PoolStateEvent;
        console.log('Pool state event: ', poolStateEventJSON);

        const imbRatioEvent = resp.events!.filter((event) => event.type.split('::')[2] === 'ImbalanceRatioEvent')[0];
        const imbRatioEventJSON = imbRatioEvent.parsedJson as ImbalanceRatioEvent;
        console.log('Imbalance ratio event: ', JSON.stringify(imbRatioEventJSON, null, 4));

        const {
            poolStateEventJSON: poolStateEventJSON2,
            imbRatioEventJSON: imbRatioEventJSON2
        } = await ramm.getPoolStateAndImbalanceRatios(suiClient, testKeypair.toSuiAddress());

        assert(poolStateEventJSON === poolStateEventJSON2);
        assert(imbRatioEventJSON === imbRatioEventJSON2);

        const poolState = processPoolStateEvent(ramm, poolStateEventJSON);
        console.log('Processed pool state: ', poolState);

        const imbRatios = processImbRatioEvent(ramm, imbRatioEventJSON);
        console.log('Processed imbalance ratios: ', imbRatios);
    }, /** timeout for the test, in ms */ 7_500);
});