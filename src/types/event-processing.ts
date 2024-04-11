import { ImbalanceRatioEvent, PoolStateEvent } from "./events"
import { RAMMSuiPool } from "./ramm-sui"

/**
 * Structure representing a RAMM's pool state query, processed from its Sui Move event's JSON.
 *
 * It is a simplified version of the data in the JSON.
 *
 * The assets' balances and issued LPT are keyed by their ticker, and scaled to neutral units
 * e.g. 1 BTC will be represented as `1`, and not `1 * 10 ** BTC.decimalPlaces`.
 */
export type RAMMPoolState = {
    rammID: string
    assetBalances: Record<string, number>
    assetLPTIssued: Record<string, number>
}

/**
 * Given the JSON of a raw Sui Move event for a pool state query, process it into a simpler format.
 *
 * @param rammSuiPool The RAMM pool whose data is being used for the processing.
 * @param poolStateEvent The Sui Move event of a pool state query.
 * @returns The processed pool state data.
 */
export function processPoolStateEvent(
    rammSuiPool: RAMMSuiPool,
    poolStateEvent: PoolStateEvent
): RAMMPoolState {
    const assetBalances: Record<string, number> = {}
    const assetLPTIssued: Record<string, number> = {}

    for (let i = 0; i < poolStateEvent.asset_types.length; i++) {
        // Sui Move events don't use the '0x' prefix for asset types, and
        // the RAMM data uses it. Thus, it is added here.
        const assetType = "0x" + poolStateEvent.asset_types[i].name
        const assetIndex = rammSuiPool.assetTypeIndices.get(assetType)
        const assetTicker = rammSuiPool.assetConfigs[assetIndex!].assetTicker

        const assetDecimalPlaces =
            rammSuiPool.assetConfigs[assetIndex!].assetDecimalPlaces
        const assetBalance =
            poolStateEvent.asset_balances[i] / 10 ** assetDecimalPlaces
        const assetLPT =
            poolStateEvent.asset_lpt_issued[i] / 10 ** assetDecimalPlaces

        assetBalances[assetTicker] = assetBalance
        assetLPTIssued[assetTicker] = assetLPT
    }

    return {
        rammID: poolStateEvent.ramm_id,
        assetBalances,
        assetLPTIssued,
    }
}

/**
 * Structure representing a RAMM's imbalance ratio data, simplified from its Sui Move event's JSON.
 *
 * Simplification of the data in an imbalance ratio event: the assets' imbalance ratios are keyed
 * by their tickers.
 */
export type RAMMImbalanceRatioData = {
    rammID: string
    imbRatios: Record<string, number>
}

export function processImbRatioEvent(
    rammSuiPool: RAMMSuiPool,
    imbalanceRatioEvent: ImbalanceRatioEvent
): RAMMImbalanceRatioData {
    const imbRatios: Record<string, number> = {}

    for (let i = 0; i < imbalanceRatioEvent.imb_ratios.contents.length; i++) {
        // Sui Move events don't use the '0x' prefix for asset types - required
        const assetType =
            "0x" + imbalanceRatioEvent.imb_ratios.contents[i].key.name
        const assetIndex = rammSuiPool.assetTypeIndices.get(assetType)
        const assetTicker = rammSuiPool.assetConfigs[assetIndex!].assetTicker

        const imbRatio =
            imbalanceRatioEvent.imb_ratios.contents[i].value /
            10 ** rammSuiPool.precisionDecimalPlaces

        imbRatios[assetTicker] = imbRatio
    }

    return {
        rammID: imbalanceRatioEvent.ramm_id,
        imbRatios,
    }
}
