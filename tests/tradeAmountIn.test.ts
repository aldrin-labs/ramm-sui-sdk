import { suiConfigs } from "../src/consts";
import { RAMMSuiPool, TradeEvent } from "../src/types";
import { TESTNET, rammMiscFaucet, testKeypair } from "./utils";

import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
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

        /*
        Mint test coins from the `ramm-misc` package's `test_coin_faucet` module.
        Then, perform liquidity deposits using the SDK.
        */

        const adaDotSolTxb = new TransactionBlock();
        const adaType: string = `0x${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::ADA`;
        const dotType: string = `0x${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::DOT`;
        const solType: string = `0x${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::SOL`;

        // ADA has 8 decimal places, so this is 200 ADA.
        const adaLiqAmount: number = 20_000_000_000;
        const adaCoin = adaDotSolTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [adaDotSolTxb.object(rammMiscFaucet.faucetAddress), adaDotSolTxb.pure(adaLiqAmount)],
            typeArguments: [adaType]
        });
        // This is 10 DOT
        const dotLiqAmount: number = 1_000_000_000;
        const dotCoin = adaDotSolTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [adaDotSolTxb.object(rammMiscFaucet.faucetAddress), adaDotSolTxb.pure(dotLiqAmount)],
            typeArguments: [dotType]
        });
        // This is 1 SOL
        const solLiqAmount: number = 100_000_000;
        const solCoin = adaDotSolTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [adaDotSolTxb.object(rammMiscFaucet.faucetAddress), adaDotSolTxb.pure(solLiqAmount)],
            typeArguments: [solType]
        });
         ramm.liquidityDeposit(
            adaDotSolTxb,
            { assetIn: adaType, amountIn: adaCoin }
        );
        ramm.liquidityDeposit(
            adaDotSolTxb,
            { assetIn: dotType, amountIn: dotCoin }
        );
        ramm.liquidityDeposit(
            adaDotSolTxb,
            { assetIn: solType, amountIn: solCoin }
        );

        let resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: adaDotSolTxb,
        });

        /*
        Onto the trade - perform the DOT "sell" trade using the SDK
        */

        const txb = new TransactionBlock();

        // This is 1 DOT, to be used for the trade.
        const dotAmount: number = 100_000_000;
        const coin = txb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [txb.object(rammMiscFaucet.faucetAddress), txb.pure(dotAmount)],
            typeArguments: [dotType]
        });

        ramm.tradeAmountIn(
            txb,
            {
                assetIn: dotType,
                assetOut: adaType,
                amountIn: coin,
                // we'd like at least 5 ADA for the 1 DOT
                minAmountOut: 50_000_000,
            }
        );

        resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: txb,
            options: {
                // required, so that we can scrutinize the response's events for a trade
                showEvents: true
            }
        });

        const tradeInEvent = resp.events![0];
        const tradeInEventJSON = tradeInEvent.parsedJson as TradeEvent;

        console.log(tradeInEventJSON);

        assert.equal(tradeInEventJSON.ramm_id, ramm.poolAddress);
        assert.equal(tradeInEventJSON.trader, testKeypair.toSuiAddress());
        assert.equal('0x' + tradeInEventJSON.token_in.name, dotType);
        assert.equal('0x' + tradeInEventJSON.token_out.name, adaType);
        assert.equal(Number(tradeInEventJSON.amount_in), dotAmount);
        expect(Number(tradeInEventJSON.amount_out)).toBeGreaterThan(0);
        expect(Number(tradeInEventJSON.protocol_fee)).toBeGreaterThan(0);

    }, /** timeout for the test, in ms */ 10_000);
});