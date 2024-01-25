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
         * Mint test coins from the `ramm-misc` package's `test_coin_faucet` module.
        */

        const btcEthTxb = new TransactionBlock();
        const btcType: string = `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::BTC`;
        const ethType: string = `${rammMiscFaucet.packageId}::${rammMiscFaucet.testCoinsModule}::ETH`;

        // BTC has 8 decimal places, so this is 1 BTC.
        const btcLiqAmount: number = 100_000_000;
        // This is 22 ETH
        const ethLiqAmount: number = 2_200_000_000;
        btcEthTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins`,
            arguments: [btcEthTxb.object(rammMiscFaucet.faucetAddress), btcEthTxb.pure(btcLiqAmount)],
            typeArguments: [btcType]
        });
        btcEthTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins`,
            arguments: [btcEthTxb.object(rammMiscFaucet.faucetAddress), btcEthTxb.pure(ethLiqAmount)],
            typeArguments: [ethType]
        });
        // This is 0.1 BTC, to be used for the trade.
        const btcAmount: number = 100_000_000;
        btcEthTxb.moveCall({
            target: `${rammMiscFaucet.packageId}::${rammMiscFaucet.faucetModule}::mint_test_coins`,
            arguments: [btcEthTxb.object(rammMiscFaucet.faucetAddress), btcEthTxb.pure(btcAmount)],
            typeArguments: [btcType]
        });

        await suiClient.signAndExecuteTransactionBlock({ signer: testKeypair, transactionBlock: btcEthTxb });

        // Wait for the network to register the test token request.
        await sleep(600);

        /**
         * Perform liquidity deposits using the SDK
         */

        const paginatedEthCoins = await suiClient.getCoins({
            owner: testKeypair.toSuiAddress(),
            coinType: ethType,
        });

        // Get the requested ETH coins' ID.
        const ethLiqId = paginatedEthCoins.data[0].coinObjectId;

        const paginatedBtcCoins = await suiClient.getCoins({
            owner: testKeypair.toSuiAddress(),
            coinType: btcType,
        });

        // Get the requested BTC coins' ID.

        let btcLiqId: string;
        let btcId: string;

        // Two BTC coins were requested:
        // 1. a larger one, to be used for the liquidity deposit
        // 2. a smaller one, to be used for the trade
        if (BigInt(paginatedBtcCoins.data[0].balance) > BigInt(paginatedBtcCoins.data[1].balance)) {
            [btcLiqId, btcId] = [paginatedBtcCoins.data[0].coinObjectId, paginatedBtcCoins.data[1].coinObjectId]
        } else {
            [btcLiqId, btcId] = [paginatedBtcCoins.data[1].coinObjectId, paginatedBtcCoins.data[0].coinObjectId]
        }

        // Deposit BTC and ETH liquidity, required for the test

        const btcLiqDepTxb = ramm.liquidityDeposit({
            assetIn: btcType,
            amountIn: btcLiqId
        });

        let resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: btcLiqDepTxb,
            options: {
                // required, so that we can scrutinize the response's events for a liq. dep.
                showEvents: true
            }
        });

        const ethLiqDepTxb = ramm.liquidityDeposit({
            assetIn: ethType,
            amountIn: ethLiqId
        });

        resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: ethLiqDepTxb,
        });

        // Wait for the network to register the liquidity deposits.
        await sleep(600);

        /**
         * Perform the ETH "buy" trade using the SDK
         */

        const tradeOutTxb = ramm.tradeAmountOut({
            assetIn: btcType,
            assetOut: ethType,
            // we'd like exactly 1 ETH
            amountOut: 100_000_000,
            // and recall that this is 0.1 BTC
            maxAmountIn: btcId,
        });

        resp = await suiClient.signAndExecuteTransactionBlock({
            signer: testKeypair,
            transactionBlock: tradeOutTxb,
            options: {
                // required, so that we can scrutinize the response's events for a trade
                showEvents: true
            }
        });

        const tradeOutEvent = resp.events![0] as SuiEvent;
        const tradeOutEventJSON = tradeOutEvent.parsedJson as TradeEvent;

        console.log(tradeOutEventJSON);

        return

        assert.equal(tradeOutEventJSON.ramm_id, ramm.address);
        assert.equal(tradeOutEventJSON.trader, testKeypair.toSuiAddress());
        assert.equal('0x' + tradeOutEventJSON.token_in.name, dotType);
        assert.equal('0x' + tradeOutEventJSON.token_out.name, btcType);
        assert.equal(Number(tradeOutEventJSON.amount_in), dotAmount);
        expect(Number(tradeOutEventJSON.amount_out)).toBeGreaterThan(0);
        expect(Number(tradeOutEventJSON.protocol_fee)).toBeGreaterThan(0);
        expect(tradeOutEventJSON.execute_trade).toBe(true);

    }, /** timeout for the test, in ms */ 23_000);
});