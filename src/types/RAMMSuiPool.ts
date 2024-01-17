import { SuiClient } from '@mysten/sui.js/client';

export class RAMMSuiPoolProps {
    name: string;
    packageId: string;
    address: string;
    assetCount: number;

    suiClient: SuiClient;

    assetAggregators: string[];
    assetTypes: string[];
    assetTickers: string[];
    assetDecimalPlaces: number[];
    lpTokensDecimalPlaces: number[];

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
     * List of addresses of the Switchboard `Aggregator`s of each of the pool's assets.
     */
    assetAggregators: string[];
    /**
     * List with the types of each of the pool's assets.
     */
    assetTypes: string[];
    /**
     * List of each asset's ticker symbol (e.g. `ETH` for Sui's wrapped Ethereum).
     */
    assetTickers: string[];
    /**
     * List of each asset's decimal place count.
     */
    assetDecimalPlaces: number[];
    /**
     * List of decimal place counts of each asset's LP token.
     */
    lpTokensDecimalPlaces: number[];

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
            assetAggregators,
            assetTypes,
            assetTickers,
            assetDecimalPlaces,
            lpTokensDecimalPlaces,
            delta = 0.25,
            baseFee = 0.001,
            baseLeverage = 100,
            protocolFee = 0.5
    }: RAMMSuiPoolProps) {
      this.name = name;
      this.packageId = packageId;
      this.address = address;
      this.assetCount = assetCount;

      this.suiClient = suiClient;

      this.assetAggregators = assetAggregators;
      this.assetTypes = assetTypes;
      this.assetTickers = assetTickers;
      this.assetDecimalPlaces = assetDecimalPlaces;
      this.lpTokensDecimalPlaces = lpTokensDecimalPlaces;

      this.delta = delta;
      this.baseFee = baseFee;
      this.baseLeverage = baseLeverage;
      this.protocolFee = protocolFee;
    }
}