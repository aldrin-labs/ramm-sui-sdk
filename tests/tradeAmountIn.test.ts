import { suiConfigs } from "../src/constants";
import { RAMMSuiPool } from "../src/types";
import {
    LiquidityWithdrawalEvent, RAMMMiscFaucet,
    TESTNET,
    TradeEvent,
    rammMiscFaucet, sleep, testKeypair
} from "./utils";

import { getFullnodeUrl, SuiClient, SuiEvent } from '@mysten/sui.js/client';
import { getFaucetHost, requestSuiFromFaucetV1 } from '@mysten/sui.js/faucet';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { assert, describe, expect, test } from 'vitest';

describe('Trade amount into RAMM', () => {
    test('Deposit ADA liquidity to a ADA/DOT/SOL RAMM pool; trade ADA into the pool for DOT, using the SDK', async () => {
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

        console.log('Running test fror: ' + ramm.name);

        /**
         * Request SUI from the testnet's faucet.
        */

        await requestSuiFromFaucetV1({
            host: getFaucetHost(TESTNET),
            recipient: testKeypair.toSuiAddress(),
        });

        // Wait for the network to register the SUI faucet transaction.
        await sleep(600);

        /**
         * Mint test coins from the `ramm-misc` package's `test_coin_faucet` module.
        */

        const adaDotTxb = new TransactionBlock();
        const adaType: string = `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::ADA`;
        const dotType: string = `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::DOT`;

        // ADA has 8 decimal places, so this is 200 ADA.
        const adaLiqAmount: number = 20_000_000_000;
        // This is 10 DOT
        const dotLiqAmount: number = 1_000_000_000;
        adaDotTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins`,
            arguments: [adaDotTxb.object(rammMiscFaucet.faucetAddress), adaDotTxb.pure(adaLiqAmount)],
            typeArguments: [adaType]
        });
        adaDotTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins`,
            arguments: [adaDotTxb.object(rammMiscFaucet.faucetAddress), adaDotTxb.pure(dotLiqAmount)],
            typeArguments: [dotType]
        });
        // This is 1 DOT, to be used for the trade.
        const dotAmount: number = 100_000_000;
        adaDotTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins`,
            arguments: [adaDotTxb.object(rammMiscFaucet.faucetAddress), adaDotTxb.pure(dotAmount)],
            typeArguments: [dotType]
        });

        await suiClient.signAndExecuteTransactionBlock({ signer: testKeypair, transactionBlock: adaDotTxb });

        // Wait for the network to register the test token request.
        await sleep(600);

        /**
         * Perform liquidity deposits using the SDK
         */

        const paginatedAdaCoins = await suiClient.getCoins({
            owner: testKeypair.toSuiAddress(),
            coinType: adaType,
        });

        // Get the requested ADA coins' ID.
        const adaId = paginatedAdaCoins.data[0].coinObjectId;

        const paginatedDotCoins = await suiClient.getCoins({
            owner: testKeypair.toSuiAddress(),
            coinType: dotType,
        });

        // Get the requested DOT coins' ID.

        let dotLiqId: string;
        let dotId: string;

        // Two DOT coins were requested:
        // 1. a larger one, to be used for the liquidity deposit
        // 2. a smaller one, to be used for the trade
        if (BigInt(paginatedDotCoins.data[0].balance) > BigInt(paginatedDotCoins.data[1].balance)) {
            [dotLiqId, dotId] = [paginatedDotCoins.data[0].coinObjectId, paginatedDotCoins.data[1].coinObjectId]
        } else {
            [dotLiqId, dotId] = [paginatedDotCoins.data[1].coinObjectId, paginatedDotCoins.data[0].coinObjectId]
        }

        // Deposit ADA and DOT liquidity, required for the test

        const adaLiqDepTxb = ramm.liquidityDeposit({
            assetIn: adaType,
            amountIn: adaId
        });

        let resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: adaLiqDepTxb,
            options: {
                // required, so that we can scrutinize the response's events for a liq. dep.
                showEvents: true
            }
        });

        const dotLiqDepTxb = ramm.liquidityDeposit({
            assetIn: dotType,
            amountIn: dotLiqId
        });

        resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: dotLiqDepTxb,
        });

        // Wait for the network to register the liquidity deposits.
        await sleep(600);

        /**
         * Perform the DOT "sell" trade using the SDK
         */

        const tradeInTxb = ramm.tradeAmountIn({
            assetIn: dotType,
            assetOut: adaType,
            amountIn: dotId,
            // we'd like at least 5 ADA for the 1 DOT
            minAmountOut: 50_000_000,
        });

        resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: tradeInTxb,
            options: {
                // required, so that we can scrutinize the response's events for a trade
                showEvents: true
            }
        });

        const tradeInEvent = resp.events![0] as SuiEvent;
        const tradeInEventJSON = tradeInEvent.parsedJson as TradeEvent;

        assert.equal(tradeInEventJSON.ramm_id, ramm.address);
        assert.equal(tradeInEventJSON.trader, testKeypair.toSuiAddress());
        assert.equal('0x' + tradeInEventJSON.token_in.name, dotType);
        assert.equal('0x' + tradeInEventJSON.token_out.name, adaType);
        assert.equal(Number(tradeInEventJSON.amount_in), dotAmount);
        expect(Number(tradeInEventJSON.amount_out)).toBeGreaterThan(0);
        expect(Number(tradeInEventJSON.protocol_fee)).toBeGreaterThan(0);
        expect(tradeInEventJSON.execute_trade).toBe(true);

    }, /** timeout for the test, in ms */ 23_000);
});