import { suiConfigs } from "../src/constants";
import { RAMMSuiPoolConfig, RAMMSuiPool } from "../src/types";
import { testKeypair } from "./config";

import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { getFaucetHost, requestSuiFromFaucetV1 } from '@mysten/sui.js/faucet';
import { Secp256r1Keypair } from '@mysten/sui.js/keypairs/secp256r1';
import { TransactionBlock, TransactionObjectArgument } from '@mysten/sui.js/transactions';

import {describe, expect, test} from 'vitest';

const TESTNET: "testnet" | "devnet" | "localnet" = 'testnet';

const RAMM_MISC_PKG_ID = '0x303e80a2d9dc0a2cbb6fc612d1f5cdc250420ea9e87488232f3ebc5d27e645d6';

const TOKEN_FAUCET_ID = `0xce841b74ed5a0fb846834e6d876694abed03f9b9b0c838c5732e2634883d9f9b`;

const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Liquidity deposit', () => {
    test('Get coins from `ramm-misc` faucet, and then deposit liquidity to a BTC/ETH/RAMM pool', async () => {
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
        const ramm: RAMMSuiPool = new RAMMSuiPool(poolConfig, suiClient);

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

        // BTC has 8 decimal places, so this is 1 BTC.
        let btc_amount: number = 100_000_000;
        txb.moveCall({
            target: `${RAMM_MISC_PKG_ID}::test_coin_faucet::mint_test_coins`,
            arguments: [txb.object(TOKEN_FAUCET_ID), txb.pure(btc_amount)],
            typeArguments: [`${RAMM_MISC_PKG_ID}::test_coins::BTC`]
        });

        let response = await ramm.suiClient.signAndExecuteTransactionBlock({signer: testKeypair, transactionBlock: txb});

        console.log(response);
    });
});