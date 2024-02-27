import { suiConfigs } from "../src/constants";
import { RAMMSuiPool } from "../src/types";
import {
    LiquidityWithdrawalEvent, RAMMMiscFaucet,
    TESTNET,
    rammMiscFaucet, sleep, testKeypair
} from "./utils";

import { getFullnodeUrl, SuiClient, SuiEvent } from '@mysten/sui.js/client';
import { OwnedObjectRef } from "@mysten/sui.js/dist/cjs/types/objects";
import { getFaucetHost, requestSuiFromFaucetV1 } from '@mysten/sui.js/faucet';
import { Inputs, TransactionBlock } from '@mysten/sui.js/transactions';

import { assert, describe, expect, test } from 'vitest';

describe('Liquidity withdrawal', () => {
    test('Deposit BTC liquidity to a BTC/ETH/SOL RAMM pool, and then withdrawm that same liquidity using the SDK', async () => {
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
        const btcType: string = `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::BTC`;

        // BTC has 8 decimal places, so this is 0.01 BTC.
        const btcAmount: number = 1_000_000;
        const coin = txb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [txb.object(rammMiscFaucet.faucetAddress), txb.pure(btcAmount)],
            typeArguments: [btcType]
        });

        ramm.liquidityDeposit(
            txb,
            { assetIn: btcType, amountIn: coin }
        );

        let resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: txb,
            options: {
                // required, so the object ID of the LP tokens can be fetched without
                // having to perform another RPC call.
                showEffects: true
            }
        });

        /**
         * Perform the liquidity withdrawal using the SDK
         */

        const lpBtcObj: OwnedObjectRef = resp.effects!.created![0];
        const lpBtc = Inputs.ObjectRef({
            digest: lpBtcObj.reference.digest,
            objectId: lpBtcObj.reference.objectId,
            version: lpBtcObj.reference.version
        });

        txb = new TransactionBlock();

        ramm.liquidityWithdrawal(
            txb,
            { assetOut: btcType,  lpToken: lpBtc }
        );

        resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: txb,
            options: {
                // required, so that we can scrutinize the response's events for a liq. wthdrwl.
                showEvents: true
            }
        });

        const liqWithEvent = resp.events![0] as SuiEvent;
        const liqWithEventJSON = liqWithEvent.parsedJson as LiquidityWithdrawalEvent;

        console.log(JSON.stringify(liqWithEventJSON, null, 4));

        assert.equal(liqWithEventJSON.ramm_id, ramm.poolAddress);
        assert.equal(liqWithEventJSON.trader, testKeypair.toSuiAddress());
        assert.equal('0x' + liqWithEventJSON.token_out.name, btcType);

        expect(Number(liqWithEventJSON.lpt)).toBeGreaterThan(0);
        expect(Number(liqWithEventJSON.lpt)).toBeLessThanOrEqual(btcAmount);

        liqWithEventJSON.amounts_out.contents.forEach((assetData) => {
            switch ('0x' + assetData.key.name) {
                case btcType: {
                    expect(Number(assetData.value)).toBeGreaterThan(0);
                    expect(Number(assetData.value)).toBeLessThanOrEqual(btcAmount);
                    break;
                }
                default: {
                    assert.equal(Number(assetData.value), 0);
                    break;
                }
            }
        })
    }, /** timeout for the test, in ms */ 10_000);
});