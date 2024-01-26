import { suiConfigs } from "../src/constants";
import { RAMMSuiPool } from "../src/types";
import {
    LiquidityWithdrawalEvent, RAMMMiscFaucet,
    TESTNET,
    TradeEvent,
    rammMiscFaucet, sleep, testKeypair
} from "./utils";

import { getFullnodeUrl, SuiClient, SuiEvent, SuiObjectChange } from '@mysten/sui.js/client';
import { ObjectCallArg } from "@mysten/sui.js/dist/cjs/builder";
import { OwnedObjectRef } from "@mysten/sui.js/dist/cjs/types/objects";
import { getFaucetHost, requestSuiFromFaucetV1 } from '@mysten/sui.js/faucet';
import { Inputs, TransactionBlock } from '@mysten/sui.js/transactions';

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

        console.log('Running test fror: ' + ramm.name);

        /*
        Mint test coins from the `ramm-misc` package's `test_coin_faucet` module.
        Then, perform liquidity deposits using the SDK.
        */

        const adaDotTxb = new TransactionBlock();
        const adaType: string = `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::ADA`;
        const dotType: string = `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::DOT`;

        // ADA has 8 decimal places, so this is 200 ADA.
        const adaLiqAmount: number = 20_000_000_000;
        const adaCoin = adaDotTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [adaDotTxb.object(rammMiscFaucet.faucetAddress), adaDotTxb.pure(adaLiqAmount)],
            typeArguments: [adaType]
        });
        // This is 10 DOT
        const dotLiqAmount: number = 1_000_000_000;
        const dotCoin = adaDotTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [adaDotTxb.object(rammMiscFaucet.faucetAddress), adaDotTxb.pure(dotLiqAmount)],
            typeArguments: [dotType]
        });
        ramm.liquidityDeposit(
            adaDotTxb,
            { assetIn: adaType, amountIn: adaCoin }
        );
        ramm.liquidityDeposit(
            adaDotTxb,
            { assetIn: dotType, amountIn: dotCoin }
        );
    
        let resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: adaDotTxb,
            options: {
                // required, so the object ID of the LP tokens can be fetched without
                // having to perform another RPC call.
                showObjectChanges: true
            }
        });

        /*
        Disambiguate between the two received LP tokens.
        */

        const [lpOne, lpTwo]: SuiObjectChange[] = resp.objectChanges!.filter((oc) => oc.type === 'created');
        // we know that in this test, the only two "created" objects in the tx's changed objects
        // will be the LP tokens; as such, both can be safely cast to the appropriate variant
        // of `SuiObjectChange`.
        const lpOneObj: ObjectCallArg = Inputs.ObjectRef({
            // @ts-ignore
            digest: lpOne.digest, 
            // @ts-ignore
            objectId: lpOne.objectId,
            version: lpOne.version
        });
        const lpTwoObj: ObjectCallArg = Inputs.ObjectRef({
            // @ts-ignore
            digest: lpTwo.digest,
            // @ts-ignore
            objectId: lpTwo.objectId,
            version: lpTwo.version
        });

        let adaLp: ObjectCallArg;
        let dotLp: ObjectCallArg;
        // @ts-ignore
        if (lpOne.objectType === `0x2::coin::Coin<${ramm.packageId}::${ramm.moduleName}::LP<${adaType}>>`) {
            adaLp = lpOneObj;
            dotLp = lpTwoObj;
        } else {
            adaLp = lpTwoObj;
            dotLp = lpOneObj;
        }

        /*
        Onto the trade - perform the DOT "sell" trade using the SDK
        */

        console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

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

    }, /** timeout for the test, in ms */ 10_000);
});