import { SuiClient } from '@mysten/sui.js/client';

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
    package_id: string;

    /**
     * Address of the RAMM object in the Sui network.
     */
    address: string;
    /**
     * Number of assets in the pool.
     */
    n: number;

    /**
     * Sui Client used to build PTBs with which to interact with the RAMM.
     */
    client: SuiClient;

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
    LPTokensDecimalPlaces: number[];

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
}