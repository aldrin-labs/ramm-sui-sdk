import { suiConfigs } from "../src/constants";
import { RAMMSuiPoolConfig, RAMMSuiPool } from "../src/types";
import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock, TransactionObjectArgument } from '@mysten/sui.js/transactions';

import {describe, expect, test} from 'vitest';

describe('Liquidity deposit', () => {
    test('Get coins from `ramm-misc` faucet, and then deposit liquidity to a BTC/ETH/RAMM pool', async () => {
        const suiTestnet = suiConfigs.suiTestnet;
        if (!suiTestnet) {
            throw new Error('Sui Testnet config not found!');
        }

        const [poolConfig] = suiTestnet;
        const rpcUrl = getFullnodeUrl('testnet');
 
        // create a client connected to testnet
        const suiClient = new SuiClient({ url: rpcUrl });

        const ramm: RAMMSuiPool = new RAMMSuiPool(poolConfig, suiClient);
        
        console.log(ramm);
    });
});