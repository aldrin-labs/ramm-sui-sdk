import { Secp256r1Keypair } from '@mysten/sui.js/keypairs/secp256r1';

require('dotenv').config();

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