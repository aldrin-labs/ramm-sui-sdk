import { suiConfigs } from "../src/constants";
import { RAMMSuiPoolConfig, RAMMSuiPool } from "../src/types";
import { testKeypair } from "./config";

import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui.js/utils';
import { getFullnodeUrl, PaginatedCoins, SuiClient } from '@mysten/sui.js/client';
import { getFaucetHost, requestSuiFromFaucetV1 } from '@mysten/sui.js/faucet';
import { Secp256r1Keypair } from '@mysten/sui.js/keypairs/secp256r1';
import { TransactionBlock, TransactionObjectArgument } from '@mysten/sui.js/transactions';

import {describe, expect, test} from 'vitest';

const TESTNET: "testnet" | "devnet" | "localnet" = 'testnet';

const RAMM_MISC_PKG_ID = '0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b';

const TOKEN_FAUCET_ID = `0x61fc830d05a3f0f7fee6d601cd88023fe5d39d52dc8028e8530bf60f46d8f784`;

const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Liquidity deposit', () => {
    test('Get coins from `ramm-misc` faucet, and then deposit liquidity to a ADA/DOT/SOL RAMM pool', async () => {
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

        const poolConfig = suiTestnet[0];
        const ramm: RAMMSuiPool = new RAMMSuiPool(poolConfig);

        console.log(ramm);

        /**
         * Request SUI from the testnet's faucet.
        */

/*         await requestSuiFromFaucetV1({
            host: getFaucetHost(TESTNET),
            recipient: testKeypair.toSuiAddress(),
        });
 */
        // Wait for the network to register the SUI faucet transaction.
        await sleep(600);

        /**
         * Mint test coins from the `ramm-misc` package's `test_coin_faucet` module.
        */

        let txb = new TransactionBlock();
        let adaType: string = `${RAMM_MISC_PKG_ID}::test_coins::ADA`;

        // ADA has 8 decimal places, so this is 1 ADA.
        let adaAmount: number = 100_000_000;
        txb.moveCall({
            target: `${RAMM_MISC_PKG_ID}::test_coin_faucet::mint_test_coins`,
            arguments: [txb.object(TOKEN_FAUCET_ID), txb.pure(adaAmount)],
            typeArguments: [adaType]
        });

        await suiClient.signAndExecuteTransactionBlock({signer: testKeypair, transactionBlock: txb});

        // Wait for the network to register the test token request.
        await sleep(600);

        /**
         * Perform the liquidity deposit using the SDK
         */

        let paginatedCoins = await suiClient.getCoins({
            owner: testKeypair.toSuiAddress(),
            coinType: adaType,
        });
        //console.log(paginatedCoins);

        // Choose any of the test ADA coins the wallet may already have.
        let adaId = paginatedCoins.data[0].coinObjectId;

        let liqDepTxb = ramm.liquidityDeposit({
            assetIn: adaType,
            globalClock: SUI_CLOCK_OBJECT_ID,
            amountIn: adaId
        });

        console.log(liqDepTxb.blockData.transactions);

        let resp = await suiClient.signAndExecuteTransactionBlock({signer: testKeypair, transactionBlock: liqDepTxb});
        console.log('Events from test token faucet tx\'s response: ' + resp.events);
    });
});