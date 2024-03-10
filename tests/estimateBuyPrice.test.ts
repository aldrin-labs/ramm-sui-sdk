import { suiConfigs } from "../src/constants";
import { PriceEstimationEvent, TradeEvent } from "../src/events";
import { RAMMSuiPool } from "../src/types";
import { TESTNET, rammMiscFaucet, testKeypair } from "./utils";

import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { describe, test } from 'vitest';

describe('Sell trade price estimation', () => {
    test('Estimate price of sell trade using, using the SDK', async () => {
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

        // This is 0.5 DOT, to be used for the trade.
        const dotAmount: number = 50_000_000;
        // We'd like about 6.5 ADA for half a DOT.
        const adaAmount: number = 650_000_000;
        const estimate_txb = ramm.estimatePriceWithAmountIn(
            {
                assetIn: dotType,
                assetOut: adaType,
                amountIn: dotAmount,
            }
        );
        const devInspectRes = await suiClient.devInspectTransactionBlock({
            sender: testKeypair.toSuiAddress(),
            transactionBlock: estimate_txb,
        });

        const priceEstimationEventJSON = devInspectRes.events[0].parsedJson as PriceEstimationEvent;

        const txb = new TransactionBlock();
        const coin = txb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [txb.object(rammMiscFaucet.faucetAddress), txb.pure(dotAmount)],
            typeArguments: [dotType]
        });
        ramm.tradeAmountOut(
            txb,
            {
                assetIn: dotType,
                assetOut: adaType,
                amountOut: adaAmount,
                maxAmountIn: coin,
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

        const tradeInEvent = resp.events![0];
        const tradeInEventJSON = tradeInEvent.parsedJson as TradeEvent;

        console.log(priceEstimationEventJSON);
        console.log(tradeInEventJSON);

        const dot_per_ada_price_est: number = priceEstimationEventJSON.amount_out / priceEstimationEventJSON.amount_in;
        const ada_per_dot_price_est: number = priceEstimationEventJSON.amount_in / priceEstimationEventJSON.amount_out;
        console.log('Estimation: 1 DOT would buy ' + dot_per_ada_price_est + ' ADA');
        console.log('Estimation: 1 ADA would buy ' + ada_per_dot_price_est + ' DOT');
        const dot_per_ada_actual_price: number = tradeInEventJSON.amount_out / tradeInEventJSON.amount_in;
        const ada_per_dot_actual_price: number = tradeInEventJSON.amount_in / tradeInEventJSON.amount_out;
        console.log('Actual price: 1 DOT buys ' + dot_per_ada_actual_price + ' ADA');
        console.log('Actual price: 1 ADA buys ' + ada_per_dot_actual_price + ' DOT');
        console.log('Ammt used in estimation: ' + priceEstimationEventJSON.amount_in);
        console.log('Amnt used in actual trade: ' + tradeInEventJSON.amount_in);

    }, /** timeout for the test, in ms */ 5_000);
});