import { Secp256r1Keypair } from '@mysten/sui.js/keypairs/secp256r1';

require('dotenv').config();

/**
 * Sleep function, to wait for state changes to propagate throughout the testnet.
 * @param ms Milliseconds to sleep for.
 * @returns a `Promise` which, when `await`ed, resolves after `ms` milliseconds.
 */
export const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const TESTNET: "testnet" | "devnet" | "localnet" = 'testnet';

/**
 * Read this repository's `.env` file, and return the `Secp256r1Keypair` associated with the
 * `.env`'s `PRIVATE_KEY` field.
 *
 * @returns An `Secp256r1Keypair`, gotten from Suibase, and with `Coin<SUI>` objects. 
 */
const getKeypair = function (): Secp256r1Keypair {
    const privateKey = process.env.PRIVATE_KEY as string;
    let secret_key = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));

    // See https://github.com/MystenLabs/sui/blob/818406c5abdf7de1b80915a0519071eec3a5b1c7/crates/sui-types/src/crypto.rs#L1650
    // The Sui keypair to be used, generated by Suibase, uses the Secp256r1 signature scheme,
    // whose first byte in the base64-decoded private key must be 2, and whose length, including
    // the flag byte, must be 33.
    const flag = 2;
    if (secret_key[0] !== flag || secret_key.length !== 33) {
        throw new Error('Invalid format for private key!');
    }

    const secretKey = secret_key.slice(1);

    return Secp256r1Keypair.fromSecretKey(secretKey)
}

/**
 * Keypair to be used for tests. It's a testnet keypair, with plenty of SUI.
 */
export const testKeypair = getKeypair();

/**
 * Data related to the test coin faucet from the `ramm-misc` package, to be used in tests.
 */
export type RAMMMiscFaucet = {
    /**
     * Package ID of the published `ramm-misc` Sui Move package
     */
    packageId: string,

    /**
     * Name of the module from `ramm-misc` containing the API to interact with the faucet.
     */
    faucetModule: string,

    /**
     * Name of the module from `ramm-misc` containing the test coin types.
     */
    testCoinsModule: string,

    /**
     * Address of the faucet currently deployed on the Sui testnet, from which to obtain tokens
     * to interact with RAMMs.
     */
    faucetAddress: string,
}

export const rammMiscFaucet: RAMMMiscFaucet = {
    packageId: '0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b',
    faucetModule: 'test_coin_faucet',
    testCoinsModule: 'test_coins',

    faucetAddress: `0x61fc830d05a3f0f7fee6d601cd88023fe5d39d52dc8028e8530bf60f46d8f784`,
}

type TypeName = {
    name: string
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's liquidity deposit.
 * Used in tests.
 */
export type LiquidityDepositEvent = {
    ramm_id: string,
    trader: string,
    token_in: TypeName,
    amount_in: number,
    lpt: number,
}

type LiqWthdrwDict = {
    key: TypeName,
    value: number,
}

type Contents = {
    contents: LiqWthdrwDict[],
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's liquidity withdrawal.
 * Used in tests.
 */
export type LiquidityWithdrawalEvent = {
    ramm_id: string,
    trader: string,
    token_out: TypeName,
    lpt: number,
    amounts_out: Contents,
    fees: Contents
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's inbound/outbound trades.
 * Used in tests.
 */
export type TradeEvent = {
    ramm_id: string,
    trader: string,
    token_in: TypeName,
    token_out: TypeName,
    amount_in: number,
    amount_out: number,
    protocol_fee: number,
    execute_trade: boolean,
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's pool state query.
 */
export type PoolStateEvent = {
    ramm_id: string,
    sender: string,
    asset_types: string[],
    asset_balances: number[],
    asset_lpt_issued: number[],
}