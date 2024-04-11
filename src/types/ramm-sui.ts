import { SuiClient } from "@mysten/sui.js/client"
import { TransactionBlock, TransactionObjectInput } from "@mysten/sui.js/transactions"
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui.js/utils"
import { ImbalanceRatioEvent, PoolStateEvent } from "./events"

export class AssetConfig {
    /**
     * Address of the Switchboard `Aggregator`s for this asset.
     */
    assetAggregator: string
    /**
     * An asset's type `<package-id>::<module-name>::<type-name>`.
     */
    assetType: string
    /**
     * An asset's ticker symbol (e.g. `WETH` for Wrapped Ethereum bridged in Sui).
     */
    assetTicker: string
    /**
     * An asset's decimal place count.
     */
    assetDecimalPlaces: number
    /**
     * An asset's minimum trade amount, specified with the asset's decimal place count.
     */
    minimumTradeAmount: number
}

export class RAMMSuiPoolConfig {
    name: string
    packageId: string
    moduleName: string
    poolAddress: string
    assetCount: number

    assetTypeIndices: Map<string, number>
    assetConfigs: AssetConfig[]

    precisionDecimalPlaces?: number
    maxPrecisionDecimalPlaces?: number
    lpTokensDecimalPlaces?: number
    factorLPT?: number

    delta?: number
    baseFee?: number
    baseLeverage?: number
    protocolFee?: number
}

/**
 * @class
 */
export class RAMMSuiPool {
    /**
     * Name of the RAMM pool.
     * Example: `RAMM ETH/BTC/SUI pool in Sui Mainnet`
     */
    name: string
    /**
     * ID of the package which was/is used to create, populate, initialize and interact with the
     * RAMM pool.
     */
    packageId: string
    /**
     * Name of the module in the above package ID which hosts the RAMM's `struct`.
     */
    moduleName: string
    /**
     * Address of the RAMM pool object in the Sui network.
     */
    poolAddress: string
    /**
     * Number of assets in the pool-
     * After pool population and initialization, it cannot be changed - it becomes effectively a
     * constant.
     */
    readonly assetCount: number

    assetTypeIndices: Map<string, number>
    /**
     * Metadata for each of the pool's assets.
     */
    assetConfigs: AssetConfig[]

    /**
     * The number of decimal places of precision the pool uses in its internal calculations.
     *
     * Positive integer \in [9, 25], default is 12.
     */
    precisionDecimalPlaces: number

    /**
     * The maximum number of decimal places of precision the pool can use in its internal calculations.
     *
     * Positive integer \in [9, 25], default is 25. Must be equal to or greater than `precisionDecimalPlaces`.
     */
    maxPrecisionDecimalPlaces: number

    /**
     * The number of decimal places applied internally to every amount of LP tokens, in the RAMM's
     * internal calculations.
     */
    lpTokensDecimalPlaces: number

    /**
     * Factor to apply to LP token amounts during calculations.
     *
     * The following sohuld hold:
     *
     * `factorLPT = 10 ** (precisionDecimalPlaces - lpTokensDecimalPlaces)`
     */
    factorLPT: number

    /**
     * The pool's permitted deviation from base imbalance ratio of 1: - real number \in [0, 1[.
     */
    delta: number
    /**
     * The pool's base fee - real number \in [0, 1[.
     */
    baseFee: number
    /**
     * The pool's base leverage - real number \in ]0, 100].
     */
    baseLeverage: number
    /**
     * The pool's protocol fee - real number \in [0, 1[.
     * It dictates the percentage of the base fee that goes to the pool's owners.
     */
    protocolFee: number

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
            poolAddress,
            assetCount,
            assetTypeIndices,
            assetConfigs,
            precisionDecimalPlaces = 12,
            maxPrecisionDecimalPlaces = 25,
            lpTokensDecimalPlaces = 9,
            delta = 0.25,
            baseFee = 0.001,
            baseLeverage = 100,
            protocolFee = 0.5
        }: RAMMSuiPoolConfig,
    ) {

        if (assetConfigs.length !== assetCount) {
            throw new Error("RAMMSuiPool: asset count differs from number of assets provided")
        }

        this.name = name
        this.packageId = packageId
        this.moduleName = moduleName
        this.poolAddress = poolAddress
        this.assetCount = assetCount

        this.assetTypeIndices = assetTypeIndices
        this.assetConfigs = assetConfigs

        this.precisionDecimalPlaces = precisionDecimalPlaces
        this.maxPrecisionDecimalPlaces = maxPrecisionDecimalPlaces
        this.lpTokensDecimalPlaces = lpTokensDecimalPlaces

        if (precisionDecimalPlaces < lpTokensDecimalPlaces) {
            throw new Error("RAMMSuiPool: `precisionDecimalPlaces` must be >= `lpTokensDecimalPlaces`")
        }

        this.factorLPT = 10 ** (precisionDecimalPlaces - lpTokensDecimalPlaces)


        this.delta = delta
        this.baseFee = baseFee
        this.baseLeverage = baseLeverage
        this.protocolFee = protocolFee
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
            amountIn: TransactionObjectInput,
    }) {
        const assetAggregators = this.assetConfigs.map(
            (assetConfig) => {
                const str = assetConfig.assetAggregator
                return txb.object(str)
            }
        )

        const assetInIndex: number  = this.assetTypeIndices.get(param.assetIn) as number
        const [assetInAggregator] = assetAggregators.splice(assetInIndex, 1)

        const otherAssetTypes: string[] = this
            .assetConfigs
            .map(
                (assetConfig) => assetConfig.assetType
            )
        otherAssetTypes.splice(assetInIndex, 1)

        txb.moveCall({
            target: `${this.packageId}::interface${this.assetCount}::liquidity_deposit_${this.assetCount}`,
            arguments: [
                txb.object(this.poolAddress),
                txb.object(SUI_CLOCK_OBJECT_ID),
                txb.object(param.amountIn),
                assetInAggregator
            ].concat(assetAggregators),
            typeArguments: [
                param.assetIn,
            ].concat(otherAssetTypes),
        })
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
            lpToken: TransactionObjectInput,
    }) {
        const assetAggregators = this.assetConfigs.map(
            (assetConfig) => {
                const str = assetConfig.assetAggregator
                return txb.object(str)
            }
        )

        const assetTypes: string[] = this
            .assetConfigs
            .map(
                (assetConfig) => assetConfig.assetType
            )
        assetTypes.push(param.assetOut)

        txb.moveCall({
            target: `${this.packageId}::interface${this.assetCount}::liquidity_withdrawal_${this.assetCount}`,
            arguments: [
                txb.object(this.poolAddress),
                txb.object(SUI_CLOCK_OBJECT_ID),
                txb.object(param.lpToken),
            ].concat(assetAggregators),
            typeArguments: assetTypes
        })
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
                const str = assetConfig.assetAggregator
                return txb.object(str)
            }
        )

        const assetInIndex: number  = this.assetTypeIndices.get(param.assetIn) as number
        const assetInAggregator = assetAggregators[assetInIndex]

        const assetOutIndex: number  = this.assetTypeIndices.get(param.assetOut) as number
        const assetOutAggregator = assetAggregators[assetOutIndex]

        assetAggregators = assetAggregators.filter(
            (_, index) => index !== assetInIndex && index !== assetOutIndex
        )

        // notice that assetAggregators is now missing the assetIn and assetOut aggregators.

        const otherAssetTypes: string[] = this
            .assetConfigs
            .map(
                (assetConfig) => assetConfig.assetType
            )
            .filter(
                (assetType) => assetType !== param.assetIn && assetType !== param.assetOut
            )

        txb.moveCall({
            target: `${this.packageId}::interface${this.assetCount}::trade_amount_in_${this.assetCount}`,
            arguments: [
                txb.object(this.poolAddress),
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
        })
    }

    /**
     * Create a PTB to estimate a trade's price and fee, given a base asset, a quote asset,
     * and the quantityt of the base asset.
     *
     * @param txb The transaction block to which the price estimation Move call will be added.
     * @param param.assetIn The Sui Move type of the asset that would be going into the pool.
     * @param param.assetOut The Sui Move type of the asset that would be coming out of the pool.
     * @param param.amountIn The amount of the hypothetical trade's base asset
     * @returns The transaction block containing the price estimation's `moveCall`. It can then be
     * dry run with `devInspectTransactionBlock/dryRunTransactionBlock`, and its event inspected.
     */
    estimatePriceWithAmountIn(
        txb: TransactionBlock,
        param: {
            assetIn: string,
            assetOut: string,
            amountIn: number,
        }
    ): TransactionBlock {
        let assetAggregators = this.assetConfigs.map(
            (assetConfig) => {
                const str = assetConfig.assetAggregator
                return txb.object(str)
            }
        )

        const assetInIndex: number  = this.assetTypeIndices.get(param.assetIn) as number
        const assetInAggregator = assetAggregators[assetInIndex]

        const assetOutIndex: number  = this.assetTypeIndices.get(param.assetOut) as number
        const assetOutAggregator = assetAggregators[assetOutIndex]

        assetAggregators = assetAggregators.filter(
            (_, index) => index !== assetInIndex && index !== assetOutIndex
        )

        // notice that assetAggregators is now missing the assetIn and assetOut aggregators.

        const otherAssetTypes: string[] = this
            .assetConfigs
            .map(
                (assetConfig) => assetConfig.assetType
            )
            .filter(
                (assetType) => assetType !== param.assetIn && assetType !== param.assetOut
            )

        txb.moveCall({
            target: `${this.packageId}::interface${this.assetCount}::trade_price_estimate_${this.assetCount}`,
            arguments: [
                txb.object(this.poolAddress),
                txb.object(SUI_CLOCK_OBJECT_ID),
                txb.pure(param.amountIn),
                assetInAggregator,
                assetOutAggregator,
            ].concat(assetAggregators),
            typeArguments: [
                param.assetIn,
                param.assetOut,
            ].concat(otherAssetTypes),
        })

        return txb
    }

    /**
     * Create a PTB to perform a "buy" trade on a Sui RAMM pool.
     *
     * @param txb The transaction block to which the trade will be added.
     * @param param.assetIn The Sui Move type of the asset going into the pool.
     * @param param.assetOut The Sui Move type of the asset coming out of the pool.
     * @param param.amountOut The trader's exact desired amount of the outgoing asset.
     * @param param.maxAmountIn The ID of a coin object whose amount is the most the trader is
     *        willing to trade.
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
                const str = assetConfig.assetAggregator
                return txb.object(str)
            }
        )

        const assetInIndex: number  = this.assetTypeIndices.get(param.assetIn) as number
        const assetInAggregator = assetAggregators[assetInIndex]

        const assetOutIndex: number  = this.assetTypeIndices.get(param.assetOut) as number
        const assetOutAggregator = assetAggregators[assetOutIndex]

        assetAggregators = assetAggregators.filter(
            (_, index) => index !== assetInIndex && index !== assetOutIndex
        )

        // recall that assetAggregators is now missing the assetIn and assetOut aggregators.

        const otherAssetTypes: string[] = this
            .assetConfigs
            .map(
                (assetConfig) => assetConfig.assetType
            )
            .filter(
                (assetType) => assetType !== param.assetIn && assetType !== param.assetOut
            )

        txb.moveCall({
            target: `${this.packageId}::interface${this.assetCount}::trade_amount_out_${this.assetCount}`,
            arguments: [
                txb.object(this.poolAddress),
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
        })
    }

    /**
     * Given the current `RAMMSuiPool` object and a `TransactionBlock` object, add a Move call
     * to the transaction block to query the pool's state.
     *
     * This Move call will emit an event in the transaction block's response, which can be
     * inspected to obtain the pool's state - see tests.
     *
     * @param txb Transaction block to which the Move call with the pool state query will be added.
     */
    getPoolState(txb: TransactionBlock) {
        txb.moveCall({
            target: `${this.packageId}::${this.moduleName}::get_pool_state`,
            arguments: [txb.object(this.poolAddress)],
        })
    }

    /**
     * Create a PTB to obtain a pool's current imbalance ratios.
     *
     * The Sui Move event emitted by the Move call will contain the ratios scaled with the pool's
     * decimal places of precision (`const` defined in `ramm.move`).
     *
     * The ratios can be scaled back by the consuming application.
     *
     * @returns The transaction block containing the imbalance ratio emission `moveCall`. It can then be
     * dry run with `devInspectTransactionBlock/dryRunTransactionBlock`, and its event inspected.
     */
    getPoolImbalanceRatios(txb: TransactionBlock): TransactionBlock {
        const assetAggregators = this.assetConfigs.map(
            (assetConfig) => {
                const str = assetConfig.assetAggregator
                return txb.object(str)
            }
        )

        const assetTypes: string[] = this
            .assetConfigs
            .map((assetConfig) => assetConfig.assetType)

        txb.moveCall({
            target: `${this.packageId}::interface${this.assetCount}::imbalance_ratios_event_${this.assetCount}`,
            arguments: [
                txb.object(this.poolAddress),
                txb.object(SUI_CLOCK_OBJECT_ID),
            ].concat(assetAggregators),
            typeArguments: assetTypes,
        })

        return txb
    }

    /**
     * Perform a combined pool state/imbalance ration query to a RAMM pool.
     *
     * @param suiClient Sui client to use for the query, which will rely on `devInspectTransactionBlock`
     * @param sender Address to pass on to `devInspectTransactionBlock` for the query.
     * @returns A promise that resolves to an object containing the pool state and imbalance ratios,
     * parsed from their respective Sui Move events.
     */
    async getPoolStateAndImbalanceRatios(suiClient: SuiClient, sender: string): Promise<
        {
            poolStateEventJSON: PoolStateEvent,
            imbRatioEventJSON: ImbalanceRatioEvent
        }
    > {
        const txb = new TransactionBlock()
        this.getPoolState(txb)
        this.getPoolImbalanceRatios(txb)

        const resp = await suiClient.devInspectTransactionBlock({
            sender,
            transactionBlock: txb,
        })

        const poolStateEvent = resp.events.filter((event) => event.type.split("::")[2] === "PoolStateEvent")[0]
        if (poolStateEvent === undefined) {
            throw new Error("No PoolStateEvent found in the response")
        }
        const poolStateEventJSON = poolStateEvent.parsedJson as PoolStateEvent

        const imbRatioEvent = resp.events.filter((event) => event.type.split("::")[2] === "ImbalanceRatioEvent")[0]
        if (imbRatioEvent === undefined) {
            throw new Error("No ImbalanceRatioEvent found in the response")
        }
        const imbRatioEventJSON = imbRatioEvent.parsedJson as ImbalanceRatioEvent

        return {
            poolStateEventJSON,
            imbRatioEventJSON
        }
    }
}