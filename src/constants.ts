import { RAMMSuiPool, RAMMSuiPoolConfig } from "./types";

export type SuiSupportedNetworks = 'suiTestnet' | 'suiMainnet';

export type SuiNetworkConfigs = Record<SuiSupportedNetworks, RAMMSuiPoolConfig[] | undefined>;

export const suiConfigs: SuiNetworkConfigs = {
    suiTestnet: [
        {
            name: 'Sui Testnet ADA/DOT/SOL RAMM',
            packageId: '0x71842d2b44e795901b99be7ba1d9db524ee5df6674cc0270088db4e95166dd89',
            moduleName: 'ramm',
            address: '0xab90449e8d5322d964d758a81f31d5491b8da28455f0e840aca1c8868379c2be',
            assetCount: 3,

            assetTypeIndices: new Map([
                ['0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::ADA', 0],
                ['0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::DOT', 1],
                ['0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::SOL', 2],
            ]),
            assetConfigs: [
                {
                    assetAggregator: '0xde1e536f6938c718bdaa055e75ae50ec3fa6691726b3a3b897c691355793ede6',
                    assetType: '0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::ADA',
                    assetTicker: 'ADA',
                    assetDecimalPlaces: 8,
                    minimumTradeAmount: 100_000_000,
                },
                {
                    assetAggregator: '0xa6c61dae96bcae8944ca1365f943b44a2def64a3e1ae291eef76879868e157c7',
                    assetType: '0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::DOT',
                    assetTicker: 'DOT',
                    assetDecimalPlaces: 8,
                    minimumTradeAmount: 10_000_000,
                },
                {
                    assetAggregator: '0x35c7c241fa2d9c12cd2e3bcfa7d77192a58fd94e9d6f482465d5e3c8d91b4b43',
                    assetType: '0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::SOL',
                    assetTicker: 'SOL',
                    assetDecimalPlaces: 8,
                    minimumTradeAmount: 1_000_000,
                },
            ],
        },

        {
            name: 'Sui Testnet BTC/ETH/SOL RAMM',
            packageId: '0x71842d2b44e795901b99be7ba1d9db524ee5df6674cc0270088db4e95166dd89',
            moduleName: 'ramm',
            address: '0xbd08e351fdece13104b35fc83ce1cc8584cc992d39cc6663d4cd4a5b5afaa0c7',
            assetCount: 3,

            assetTypeIndices: new Map([
                ['0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::BTC', 0],
                ['0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::ETH', 1],
                ['0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::SOL', 2],
            ]),
            assetConfigs: [
                {
                    assetAggregator: '0x7c30e48db7dfd6a2301795be6cb99d00c87782e2547cf0c63869de244cfc7e47',
                    assetType: '0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::BTC',
                    assetTicker: 'BTC',
                    assetDecimalPlaces: 8,
                    minimumTradeAmount: 10_000,
                },
                {
                    assetAggregator: '0x68ed81c5dd07d12c629e5cdad291ca004a5cd3708d5659cb0b6bfe983e14778c',
                    assetType: '0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::ETH',
                    assetTicker: 'ETH',
                    assetDecimalPlaces: 8,
                    minimumTradeAmount: 100_000,
                },
                {
                    assetAggregator: '0x35c7c241fa2d9c12cd2e3bcfa7d77192a58fd94e9d6f482465d5e3c8d91b4b43',
                    assetType: '0x937e867b32da5c423e615d03d9f5e898fdf08d8f94d8b0d97805d5c3f06e0a1b::test_coins::SOL',
                    assetTicker: 'SOL',
                    assetDecimalPlaces: 8,
                    minimumTradeAmount: 10_000_000,
                },
            ],
        }
    ],
    suiMainnet: []
};

