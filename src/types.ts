import { TransactionBlock, TransactionObjectArgument } from '@mysten/sui.js/transactions';
import { create } from 'domain';

export class AssetConfig {
    /**
     * Address of the Switchboard `Aggregator`s for this asset.
     */
    assetAggregator: string;
    /**
     * An asset's type `<package-id>::<module-name>::<type-name>`.
     */
    assetType: string;
    /**
     * An asset's ticker symbol (e.g. `WETH` for Wrapped Ethereum bridged in Sui).
     */
    assetTicker: string;
    /**
     * An asset's decimal place count.
     */
    assetDecimalPlaces: number;
    /**
     * An asset's minimum trade amount, specified with the asset's decimal place count.
     */
    minimumTradeAmount: number;
}

export class RAMMSuiPoolConfig {
    name: string;
    packageId: string;
    moduleName: string;
    address: string;
    assetCount: number;

    assetTypeIndices: Map<string, number>;
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
     * Name of the module in the above package ID which hosts the RAMM's `struct`.
     */
    moduleName: string;
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

    assetTypeIndices: Map<string, number>;
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
            moduleName,
            address,
            assetCount,
            assetTypeIndices,
            assetConfigs,
            delta = 0.25,
            baseFee = 0.001,
            baseLeverage = 100,
            protocolFee = 0.5
        }: RAMMSuiPoolConfig,
    ) {

        if (assetConfigs.length !== assetCount) {
            throw new Error("RAMMSuiPool: asset count differs from number of assets provided")
        }

        this.name = name;
        this.packageId = packageId;
        this.moduleName = moduleName;
        this.address = address;
        this.assetCount = assetCount;


        this.assetTypeIndices = assetTypeIndices;
        this.assetConfigs = assetConfigs;

        this.delta = delta;
        this.baseFee = baseFee;
        this.baseLeverage = baseLeverage;
        this.protocolFee = protocolFee;
    }

    /**
     * Performs a liquidity deposit into a Sui RAMM pool.
     *
     * The returned transaction for the liquidity deposit can be created and signed using a
     * keypair, and then sent to the Sui network for execution.
     *
     * @param assetIn The Sui Move type of the asset going into the pool.
     * @param globalClock The address of the Sui network's global clock.
     * @param amountIn Object ID of the coin object with the amount to deposit into the pool.
     * @param signer The keypair used to sign and execute the transaction block.
     * @returns The transaction block containing the liquidity deposit.
     */
    liquidityDeposit(param: {
        assetIn: string,
        globalClock: string,
        amountIn: string,
    }): TransactionBlock {
        const txb = new TransactionBlock();

        let assetAggregators = this.assetConfigs.map(
            (assetConfig) => {
                let str = assetConfig.assetAggregator;
                return txb.object(str);
            }
        );

        const assetInIndex: number  = this.assetTypeIndices.get(param.assetIn) as number;
        const [assetInAggregator] = assetAggregators.splice(assetInIndex, 1);

        const otherAssetTypes: string[] = this
            .assetConfigs
            .map(
                (assetConfig) => assetConfig.assetType
            );
        otherAssetTypes.splice(assetInIndex, 1);

        txb.moveCall({
            target: `${this.packageId}::interface${this.assetCount}::liquidity_deposit_${this.assetCount}`,
            arguments: [
                txb.object(this.address),
                txb.object(param.globalClock),
                txb.object(param.amountIn),
                assetInAggregator
            ].concat(assetAggregators),
            typeArguments: [
                param.assetIn,
            ].concat(otherAssetTypes),
        });

        return txb
    }
}