import { SuiClient } from '@mysten/sui.js/client';

export class AssetConfig {
    /**
     * Address of the Switchboard `Aggregator`s for this asset.
     */
    assetAggregators: string;
    /**
     * An asset's type `<package-id>::<module-name>::<type-name>`.
     */
    assetTypes: string;
    /**
     * An asset's ticker symbol (e.g. `WETH` for Wrapped Ethereum bridged in Sui).
     */
    assetTickers: string;
    /**
     * An asset's decimal place count.
     */
    assetDecimalPlaces: number;
    /**
     * The decimal place count of an asset's LP token.
     */
    lpTokensDecimalPlaces: number;
    /**
     * An asset's minimum trade amount, specified with the asset's decimal place count.
     */
    minimumTradeAmount: number;
}

export class RAMMSuiPoolConfig {
    name: string;
    packageId: string;
    address: string;
    assetCount: number;

    suiClient: SuiClient;

    assetConfigs: AssetConfig[];

    delta?: number;
    baseFee?: number;
    baseLeverage?: number;
    protocolFee?: number;
}

/**
 * @class
 */
export class RAMMSuiPool {
    /**
     * Name of the RAMM pool.
     * Example: `RAMM ETH/BTC/SUI pool in Sui Mainnet`
     */
    name: string;
    /**
     * ID of the package which was/is used to create, populate, initialize and interact with the
     * RAMM pool.
     */
    packageId: string;
    /**
     * Address of the RAMM object in the Sui network.
     */
    address: string;
    /**
     * Number of assets in the pool-
     * After pool population and initialization, it cannot be changed - it becomes effectively a
     * constant.
     */
    readonly assetCount: number;

    /**
     * Sui Client used to build PTBs with which to interact with the RAMM.
     */
    suiClient: SuiClient;

    /**
     * Metadata for each of the pool's assets.
     */
    assetConfigs: AssetConfig[];

    /**
     * The pool's permitted deviation from base imbalance ratio of 1: - real number \in [0, 1[.
     */
    delta: number;
    /**
     * The pool's base fee - real number \in [0, 1[.
     */
    baseFee: number;
    /**
     * The pool's base leverage - real number \in ]0, 100].
     */
    baseLeverage: number;
    /**
     * The pool's protocol fee - real number \in [0, 1[.
     * It dictates the percentage of the base fee that goes to the pool's owners.
     */
    protocolFee: number;

    /**
     * @constructor
     * Creates an instance of a Sui TS SDK RAMM pool from the required data.
     *
     * Note that `delta/baseFee/baseLeverage/protocolFee` cannot currently be changed in a Sui
     * RAMM pool; these are left here in case that changes in the future.
     */
    constructor(
        {
            name,
            packageId,
            address,
            assetCount,
            suiClient,
            assetConfigs,
            delta = 0.25,
            baseFee = 0.001,
            baseLeverage = 100,
            protocolFee = 0.5
    }: RAMMSuiPoolConfig) {

        if (assetConfigs.length !== assetCount) {
            throw new Error("RAMMSuiPool: asset count differs from number of assets provided")
        }

        this.name = name;
        this.packageId = packageId;
        this.address = address;
        this.assetCount = assetCount;

        this.suiClient = suiClient;

        this.assetConfigs = assetConfigs;

        this.delta = delta;
        this.baseFee = baseFee;
        this.baseLeverage = baseLeverage;
        this.protocolFee = protocolFee;
    }
}