import { RAMMSuiPool, RAMMSuiPoolConfig } from "./types";

export type SuiSupportedNetworks = 'suiTestnet' | 'suiMainnet';

export type SuiNetworkConfigs = Record<SuiSupportedNetworks, RAMMSuiPoolConfig[] | undefined>;

export const suiConfigs: SuiNetworkConfigs = {
    suiTestnet: [
        {
            name: 'Sui Testnet BTC/ETH/SOL RAMM',
            packageId: '0xf0672ec8467d7e9d734473a050d4391b8d77956960e40c03a60f9fef9203295a',
            moduleName: 'ramm',
            address: '0x5b5be2007d098d15b728076173f0b28584c36b9b9a546b81eb60ad5a59ac9362',
            assetCount: 3,

            assetTypeIndices: new Map([
                ['BTC', 0],
                ['ETH', 1],
                ['SOL', 2],
            ]),
            assetConfigs: [
                {
                    assetAggregator: '0x7c30e48db7dfd6a2301795be6cb99d00c87782e2547cf0c63869de244cfc7e47',
                    assetType: '0x303e80a2d9dc0a2cbb6fc612d1f5cdc250420ea9e87488232f3ebc5d27e645d6::test_coins::BTC',
                    assetTicker: 'BTC',
                    assetDecimalPlaces: 8,
                    minimumTradeAmount: 10_000,
                },
                {
                    assetAggregator: '0x68ed81c5dd07d12c629e5cdad291ca004a5cd3708d5659cb0b6bfe983e14778c',
                    assetType: '0x303e80a2d9dc0a2cbb6fc612d1f5cdc250420ea9e87488232f3ebc5d27e645d6::test_coins::ETH',
                    assetTicker: 'ETH',
                    assetDecimalPlaces: 8,
                    minimumTradeAmount: 100_000,
                },
                {
                    assetAggregator: '0x35c7c241fa2d9c12cd2e3bcfa7d77192a58fd94e9d6f482465d5e3c8d91b4b43',
                    assetType: '0x303e80a2d9dc0a2cbb6fc612d1f5cdc250420ea9e87488232f3ebc5d27e645d6::test_coins::SOL',
                    assetTicker: 'SOL',
                    assetDecimalPlaces: 8,
                    minimumTradeAmount: 10_000_000,
                },
            ],
        }
    ],
    suiMainnet: []
};

