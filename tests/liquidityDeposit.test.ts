import { suiConfigs } from "../src/constants";
import { RAMMSuiPool } from "../src/types";
import {
    LiquidityDepositEvent,
    TESTNET,
    rammMiscFaucet, sleep, testKeypair
} from "./utils";

import { getFullnodeUrl, SuiClient, SuiEvent } from '@mysten/sui.js/client';
import { getFaucetHost, requestSuiFromFaucetV1 } from '@mysten/sui.js/faucet';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { assert, describe, expect, test } from 'vitest';

describe('Liquidity deposit', () => {
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

        /**
         * Mint test coins from the `ramm-misc` package's `test_coin_faucet` module.
        */

        let txb = new TransactionBlock();
        let btcType: string = `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::BTC`;

        // BTC has 8 decimal places, so this is 0.01 BTC.
        let btcAmount: number = 1_000_000;
        txb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins`,
            arguments: [txb.object(rammMiscFaucet.faucetAddress), txb.pure(btcAmount)],
            typeArguments: [btcType]
        });

        await suiClient.signAndExecuteTransactionBlock({ signer: testKeypair, transactionBlock: txb });

        // Wait for the network to register the test token request.
        await sleep(600);

        /**
         * Perform the liquidity deposit using the SDK
         */

        let paginatedCoins = await suiClient.getCoins({
            owner: testKeypair.toSuiAddress(),
            coinType: btcType,
        });
        //console.log(paginatedCoins);

        // Choose any of the test BTC coins the wallet may already have.
        let btcId = paginatedCoins.data[0].coinObjectId;

        let liqDepTxb = ramm.liquidityDeposit({
            assetIn: btcType,
            amountIn: btcId
        });

        let resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: liqDepTxb,
            options: {
                // required, so that we can scrutinize the response's events for a liq. dep.
                showEvents: true
            }
        });

        const liqDepEvent = resp.events![0] as SuiEvent;
        const liqDepEventJSON = liqDepEvent.parsedJson as LiquidityDepositEvent;

        assert.equal(liqDepEventJSON.ramm_id, ramm.address);
        assert.equal(liqDepEventJSON.trader, testKeypair.toSuiAddress());
        assert.equal('0x' + liqDepEventJSON.token_in.name, btcType);
        expect(Number(liqDepEventJSON.amount_in)).toBeGreaterThan(0);
        expect(Number(liqDepEventJSON.amount_in)).toBeLessThanOrEqual(btcAmount);
        expect(Number(liqDepEventJSON.lpt)).toBeGreaterThan(0);
        expect(Number(liqDepEventJSON.lpt)).toBeLessThan(btcAmount);
    }, /** timeout for the test, in ms */ 10_000);
});