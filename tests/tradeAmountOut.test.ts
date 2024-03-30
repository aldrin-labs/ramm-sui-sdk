import { RAMMSuiPool, SuiSupportedNetworks, TradeEvent } from "../src/types";
import { rammSuiConfigs } from "../src/constants";
import { TESTNET, rammMiscFaucet, sleep, testKeypair } from "./utils";

import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
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

        const suiTestnetPools = rammSuiConfigs[SuiSupportedNetworks.testnet];
        if (!suiTestnetPools) {
            throw new Error('Sui Testnet config not found!');
        }

        // Select the BTC/ETH/SOL RAMM
        const poolConfig = suiTestnetPools[1];
        const ramm: RAMMSuiPool = new RAMMSuiPool(poolConfig);

        console.log('Running test for: ' + ramm.name);

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

        const btcEthSolTxb = new TransactionBlock();
        const btcType: string = `0x${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::BTC`;
        const ethType: string = `0x${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::ETH`;
        const solType: string = `0x${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::SOL`;

        // BTC has 8 decimal places, so this is 1 BTC.
        const btcLiqAmount: number = 100_000_000;
        const btcCoin = btcEthSolTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [btcEthSolTxb.object(rammMiscFaucet.faucetAddress), btcEthSolTxb.pure(btcLiqAmount)],
            typeArguments: [btcType]
        });
        // This is 22 ETH
        const ethLiqAmount: number = 2_200_000_000;
        const ethCoin = btcEthSolTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [btcEthSolTxb.object(rammMiscFaucet.faucetAddress), btcEthSolTxb.pure(ethLiqAmount)],
            typeArguments: [ethType]
        });
        // This is 500 SOL
        const solLiqAmount: number = 50_000_000_000;
        const solCoin = btcEthSolTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins_ptb`,
            arguments: [btcEthSolTxb.object(rammMiscFaucet.faucetAddress), btcEthSolTxb.pure(solLiqAmount)],
            typeArguments: [solType]
        });

        // Deposit BTC and ETH liquidity, required for the test
        ramm.liquidityDeposit(
            btcEthSolTxb,
            { assetIn: btcType, amountIn: btcCoin }
        );
        ramm.liquidityDeposit(
            btcEthSolTxb,
            { assetIn: ethType, amountIn: ethCoin }
        );
        ramm.liquidityDeposit(
            btcEthSolTxb,
            { assetIn: solType, amountIn: solCoin }
        );

        let resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: btcEthSolTxb,
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

        const tradeOutEvent = resp.events![0];
        const tradeOutEventJSON = tradeOutEvent.parsedJson as TradeEvent;

        console.log(tradeOutEventJSON);

        assert.equal(tradeOutEventJSON.ramm_id, ramm.poolAddress);
        assert.equal(tradeOutEventJSON.trader, testKeypair.toSuiAddress());
        assert.equal('0x' + tradeOutEventJSON.token_in.name, btcType);
        assert.equal('0x' + tradeOutEventJSON.token_out.name, ethType);
        assert.equal(Number(tradeOutEventJSON.amount_out), 100_000_000);
        expect(Number(tradeOutEventJSON.amount_in)).toBeGreaterThan(0);
        expect(Number(tradeOutEventJSON.amount_in)).toBeLessThanOrEqual(btcAmount);

        expect(Number(tradeOutEventJSON.protocol_fee)).toBeGreaterThan(0);

    }, /** timeout for the test, in ms */ 15_000);
});