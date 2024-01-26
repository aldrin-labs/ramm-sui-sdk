import { suiConfigs } from "../src/constants";
import { RAMMSuiPool } from "../src/types";
import {
    TESTNET,
    TradeEvent,
    rammMiscFaucet, sleep, testKeypair
} from "./utils";

import { getFullnodeUrl, SuiClient, SuiEvent } from '@mysten/sui.js/client';
import { getFaucetHost, requestSuiFromFaucetV1 } from '@mysten/sui.js/faucet';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { assert, describe, expect, test } from 'vitest';

describe('Trade amount out of RAMM', () => {
    test('Deposit BTC/ETH liquidity to a BTC/ETH/SOL RAMM pool; trade ETH out of the pool for BTC, using the SDK', async () => {
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
        Mint test coins from the `ramm-misc` package's `test_coin_faucet` module.
        Then, perform liquidity deposits using the SDK
        */

        const btcEthTxb = new TransactionBlock();
        const btcType: string = `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::BTC`;
        const ethType: string = `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::ETH`;

        // BTC has 8 decimal places, so this is 1 BTC.
        const btcLiqAmount: number = 100_000_000;
        const btcCoin = btcEthTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [btcEthTxb.object(rammMiscFaucet.faucetAddress), btcEthTxb.pure(btcLiqAmount)],
            typeArguments: [btcType]
        });
        // This is 22 ETH
        const ethLiqAmount: number = 2_200_000_000;
        const ethCoin = btcEthTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [btcEthTxb.object(rammMiscFaucet.faucetAddress), btcEthTxb.pure(ethLiqAmount)],
            typeArguments: [ethType]
        });

        // Deposit BTC and ETH liquidity, required for the test
        ramm.liquidityDeposit(
            btcEthTxb,
            { assetIn: btcType, amountIn: btcCoin }
        );
        ramm.liquidityDeposit(
            btcEthTxb,
            { assetIn: ethType, amountIn: ethCoin }
        );

        let resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: btcEthTxb,
        });

        /**
         * Perform the ETH "buy" trade using the SDK
         */

        const txb = new TransactionBlock();

        // This is 0.1 BTC, to be used for the trade.
        const btcAmount: number = 10_000_000;
        const coin = txb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [txb.object(rammMiscFaucet.faucetAddress), txb.pure(btcAmount)],
            typeArguments: [btcType]
        });

        ramm.tradeAmountOut(
            txb,
            {
                assetIn: btcType,
                assetOut: ethType,
                // we'd like exactly 1 ETH
                amountOut: 100_000_000,
                // and recall that this is 0.1 BTC
                maxAmountIn: coin,
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

        const tradeOutEvent = resp.events![0] as SuiEvent;
        const tradeOutEventJSON = tradeOutEvent.parsedJson as TradeEvent;

        console.log(tradeOutEventJSON);

        assert.equal(tradeOutEventJSON.ramm_id, ramm.address);
        assert.equal(tradeOutEventJSON.trader, testKeypair.toSuiAddress());
        assert.equal('0x' + tradeOutEventJSON.token_in.name, btcType);
        assert.equal('0x' + tradeOutEventJSON.token_out.name, ethType);
        assert.equal(Number(tradeOutEventJSON.amount_out), 100_000_000);
        expect(Number(tradeOutEventJSON.amount_in)).toBeGreaterThan(0);
        expect(Number(tradeOutEventJSON.amount_in)).toBeLessThanOrEqual(btcAmount);

        expect(Number(tradeOutEventJSON.protocol_fee)).toBeGreaterThan(0);
        expect(tradeOutEventJSON.execute_trade).toBe(true);

    }, /** timeout for the test, in ms */ 10_000);
});