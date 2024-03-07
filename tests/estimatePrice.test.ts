import { suiConfigs } from "../src/constants";
import { RAMMSuiPool } from "../src/types";
import {
    TESTNET,
    PriceEstimationEvent, TradeEvent,
    rammMiscFaucet, testKeypair
} from "./utils";

import { getFullnodeUrl, SuiClient, SuiEvent } from '@mysten/sui.js/client';
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

        // This is 20 ADA, to be used for the trade.
        const adaAmount: number = 100_000_000;
        const estimate_txb = ramm.estimatePriceTradeAmountIn(
            {
                assetIn: adaType,
                assetOut: dotType,
                amountIn: adaAmount,
            }
        );
        const devInspectRes = await suiClient.devInspectTransactionBlock({
            sender: testKeypair.toSuiAddress(),
            transactionBlock: estimate_txb,
        });

        const priceEstimationEventJSON = devInspectRes.events[0].parsedJson as PriceEstimationEvent;

        const txb = new TransactionBlock();
        // This is 20 ADA, to be used for the trade.
        const coin = txb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [txb.object(rammMiscFaucet.faucetAddress), txb.pure(adaAmount)],
            typeArguments: [adaType]
        });
        ramm.tradeAmountIn(
            txb,
            {
                assetIn: adaType,
                assetOut: dotType,
                amountIn: coin,
                // any DOT is fine
                minAmountOut: 1,
            }
        );

        let resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: txb,
            options: {
                // required, so that we can scrutinize the response's events for a trade
                showEvents: true
            }
        });

        const tradeInEvent = resp.events![0] as SuiEvent;
        const tradeInEventJSON = tradeInEvent.parsedJson as TradeEvent;

        console.log(priceEstimationEventJSON);
        console.log(tradeInEventJSON);

        const dot_per_ada_price: number = priceEstimationEventJSON.amount_out / priceEstimationEventJSON.amount_in;
        const ada_per_dot_price: number = priceEstimationEventJSON.amount_in / priceEstimationEventJSON.amount_out;
        console.log('Estimation: 1 ADA would buy ' + dot_per_ada_price + ' DOT');
        console.log('Estimation: 1 DOT would buy ' + ada_per_dot_price + ' ADA');
        console.log('Tx fee would be: ' + priceEstimationEventJSON.protocol_fee);

    }, /** timeout for the test, in ms */ 5_000);
});