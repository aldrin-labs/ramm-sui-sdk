import { SuiSupportedNetworks, RAMMSuiPoolConfigs } from '../types';

/**
 * Map of configurations of currently deployed RAMM Sui pools, keyed by their Sui environment.
 * @constant
 */
export const rammSuiConfigs: RAMMSuiPoolConfigs = {
    [SuiSupportedNetworks.testnet]: [
        {
            name: 'Sui Testnet ADA/DOT/SOL RAMM',
            packageId: '0xd3283fa556731370cd2a7f389b3e35c630184118b5af416ce9e57edfce751496',
            moduleName: 'ramm',
            poolAddress: '0x1eefca843bb1779bc87689169a732eef268d979b1f0ac0b560d0f8af66d23eed',
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
            packageId: '0xd3283fa556731370cd2a7f389b3e35c630184118b5af416ce9e57edfce751496',
            moduleName: 'ramm',
            poolAddress: '0xf47a4d16f93e957f9fc5a24997ba1a22ae41cfe37231fdf148419d218681b5e5',
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
    [SuiSupportedNetworks.mainnet]: [
        {
            name: 'Sui Mainnet SUI/USDC/USDT RAMM',
            packageId: '0xd4e097d82d73dc5d152f277bd17ba7980cad4c0b238c3609517cbd0cf686ddd1',
            moduleName: 'ramm',
            poolAddress: '0x4ee5425220bc12f2ff633d37b1dc1eb56cc8fd96b1c72c49bd4ce6e895bd6cd7',
            assetCount: 3,

            assetTypeIndices: new Map([
                ['0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI', 0],
                ['0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN', 1],
                ['0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN', 2],
            ]),
            assetConfigs: [
                {
                    assetAggregator: '0xbca474133638352ba83ccf7b5c931d50f764b09550e16612c9f70f1e21f3f594',
                    assetType: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
                    assetTicker: 'SUI',
                    assetDecimalPlaces: 9,
                    minimumTradeAmount: 10_000_000,
                },
                {
                    assetAggregator: '0x456efc067f5b4d7fe4a4c561f6937e14b95969d3b4cecd7ee94eedd01499f94a',
                    assetType: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
                    assetTicker: 'USDC',
                    assetDecimalPlaces: 6,
                    minimumTradeAmount: 10_000,
                },
                {
                    assetAggregator: '0xbe4fcb111eaeb7abb698063c47566447f921e3cc76b33b48265f4c91cf1c645a',
                    assetType: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
                    assetTicker: 'USDT',
                    assetDecimalPlaces: 6,
                    minimumTradeAmount: 10_000,
                },
            ],
        }
    ]
};