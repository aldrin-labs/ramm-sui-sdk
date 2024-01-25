import { Inputs, TransactionBlock, TransactionObjectArgument, TransactionObjectInput } from '@mysten/sui.js/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui.js/utils';

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
     * Create a PTB to perform a liquidity deposit into a Sui RAMM pool.
     *
     * The returned transaction for the liquidity deposit can signed using a TS SDK keypair, and
     * then sent to the Sui network for execution.
     *
     * @param txb The transaction block to which the liquidity deposit will be added.
     * @param param.assetIn The Sui Move type of the asset going into the pool.
     * @param param.amountIn The coin object with the amount to deposit into the pool.
     * It may come from the result of a previous transaction in the transaction block.
     * @returns The transaction block containing the liquidity deposit `moveCall`.
     */
    liquidityDeposit(
        txb: TransactionBlock,
        param: {
            assetIn: string,
            amountIn: string,
    }) {
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
                txb.object(SUI_CLOCK_OBJECT_ID),
                txb.object(param.amountIn),
                assetInAggregator
            ].concat(assetAggregators),
            typeArguments: [
                param.assetIn,
            ].concat(otherAssetTypes),
        });
    }

    /**
     * Create a PTB to perform a liquidity withdrawal from a Sui RAMM pool.
     *
     * The returned transaction for the liquidity withdrawal can be signed using a TS SDK keypair,
     * and then sent to the Sui network for execution.
     *
     * @param txb The transaction block to which the liquidity withdrawal will be added.
     * @param param.assetOut The Sui Move type of the asset being withdrawn from the pool.
     * @param param.lpToken The coin object with the LP tokens to redeem from the pool.
     * It may be the result of a previous transaction in the transaction block.
     * @returns The transaction block containing the liquidity withdrawal `moveCall`.
     */
    liquidityWithdrawal(
        txb: TransactionBlock,
        param: {
            assetOut: string,
            lpToken: string,
    }) {
        const assetAggregators = this.assetConfigs.map(
            (assetConfig) => {
                let str = assetConfig.assetAggregator;
                return txb.object(str);
            }
        );

        let assetTypes: string[] = this
            .assetConfigs
            .map(
                (assetConfig) => assetConfig.assetType
            );
        assetTypes.push(param.assetOut);

        txb.moveCall({
            target: `${this.packageId}::interface${this.assetCount}::liquidity_withdrawal_${this.assetCount}`,
            arguments: [
                txb.object(this.address),
                txb.object(SUI_CLOCK_OBJECT_ID),
                txb.object(param.lpToken),
            ].concat(assetAggregators),
            typeArguments: assetTypes
        });
    }

    /**
     * Create a PTB to perform a "sell" trade on a Sui RAMM pool.
     *
     * @param txb The transaction block to which the trade will be added.
     * @param param.assetIn The Sui Move type of the asset going into the pool.
     * @param param.assetOut The Sui Move type of the asset coming out of the pool.
     * @param param.amountIn The coin object with the amount to deposit into the pool.
     * It may come from the result of a previous transaction in the transaction block.
     * @param param.minAmountOut The minimum amount the trade is willing to receive in their
     * trade.
     * @returns The transaction block containing the "sell" trade's `moveCall`.
     */
    tradeAmountIn(
        txb: TransactionBlock,
        param: {
            assetIn: string,
            assetOut: string,
            amountIn: TransactionObjectInput,
            minAmountOut: number,
    }) {
        let assetAggregators = this.assetConfigs.map(
            (assetConfig) => {
                let str = assetConfig.assetAggregator;
                return txb.object(str);
            }
        );

        const assetInIndex: number  = this.assetTypeIndices.get(param.assetIn) as number;
        const assetInAggregator = assetAggregators[assetInIndex];

        const assetOutIndex: number  = this.assetTypeIndices.get(param.assetOut) as number;
        const assetOutAggregator = assetAggregators[assetOutIndex];

        assetAggregators = assetAggregators.filter(
            (_, index) => index !== assetInIndex && index !== assetOutIndex
        );

        // notice that assetAggregators is now missing the assetIn and assetOut aggregators.

        const otherAssetTypes: string[] = this
            .assetConfigs
            .map(
                (assetConfig) => assetConfig.assetType
            )
            .filter(
                (assetType) => assetType !== param.assetIn && assetType !== param.assetOut
            );

        txb.moveCall({
            target: `${this.packageId}::interface${this.assetCount}::trade_amount_in_${this.assetCount}`,
            arguments: [
                txb.object(this.address),
                txb.object(SUI_CLOCK_OBJECT_ID),
                txb.object(param.amountIn),
                txb.pure(param.minAmountOut),
                assetInAggregator,
                assetOutAggregator,
            ].concat(assetAggregators),
            typeArguments: [
                param.assetIn,
                param.assetOut,
            ].concat(otherAssetTypes),
        });
    }

    /**
     * Create a PTB to perform a "buy" trade on a Sui RAMM pool.
     *
     * @param txb The transaction block to which the trade will be added.
     * @param param.assetIn The Sui Move type of the asset going into the pool.
     * @param param.assetOut The Sui Move type of the asset coming out of the pool.
     * @param param.amountOut The trader's exact desired amount of the outgoing asset.
     * @param param.maxAmountIn The ID of a coin object whose amount is the most the trade is
     * willing to deposit.
     * trade.
     * @returns The transaction block containing the "buy" trade's `moveCall`.
     */
    tradeAmountOut(
        txb: TransactionBlock,
        param: {
            assetIn: string,
            assetOut: string,
            amountOut: number,
            maxAmountIn: TransactionObjectInput,
    }) {
        let assetAggregators = this.assetConfigs.map(
            (assetConfig) => {
                let str = assetConfig.assetAggregator;
                return txb.object(str);
            }
        );

        const assetInIndex: number  = this.assetTypeIndices.get(param.assetIn) as number;
        const assetInAggregator = assetAggregators[assetInIndex];

        const assetOutIndex: number  = this.assetTypeIndices.get(param.assetOut) as number;
        const assetOutAggregator = assetAggregators[assetOutIndex];

        assetAggregators = assetAggregators.filter(
            (_, index) => index !== assetInIndex && index !== assetOutIndex
        );

        // recall that assetAggregators is now missing the assetIn and assetOut aggregators.

        const otherAssetTypes: string[] = this
            .assetConfigs
            .map(
                (assetConfig) => assetConfig.assetType
            )
            .filter(
                (assetType) => assetType !== param.assetIn && assetType !== param.assetOut
            );

        txb.moveCall({
            target: `${this.packageId}::interface${this.assetCount}::trade_amount_out_${this.assetCount}`,
            arguments: [
                txb.object(this.address),
                txb.object(SUI_CLOCK_OBJECT_ID),
                txb.pure(param.amountOut),
                txb.object(param.maxAmountIn),
                assetInAggregator,
                assetOutAggregator,
            ].concat(assetAggregators),
            typeArguments: [
                param.assetIn,
                param.assetOut,
            ].concat(otherAssetTypes),
        });
    }
}