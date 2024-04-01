import { PoolStateEvent } from "./events"
import { RAMMSuiPool } from "./ramm-sui"

/**
 * Structure representing a RAMM's pool state query, processed from its Sui Move event JSON.
 *
 * Simplification of the data in a pool state event, as it is meant for consumption by 
 */
export type RAMMPoolState = {
    rammID: string,
    assetBalances: Record<string, number>,
    assetLPTIssued: Record<string, number>
}

/**
 * Given the JSON of a raw Sui Move event for a pool state query, process it into a simpler format.
 *
 * @param rammSuiPool The RAMM pool whose data is being used for the processing.
 * @param poolStateEvent The Sui Move event of a pool state query.
 * @returns The processed pool state data.
 */
function processPoolStateEvent(rammSuiPool: RAMMSuiPool, poolStateEvent: PoolStateEvent): RAMMPoolState {
    let assetBalances: Record<string, number> = {}
    let assetLPTIssued: Record<string, number> = {}

    for (let i = 0; i < poolStateEvent.asset_types.length; i++) {
        let assetType = poolStateEvent.asset_types[i].name
        const assetIndex = rammSuiPool.assetTypeIndices.get(assetType)
        const assetTicker = rammSuiPool.assetConfigs[assetIndex!].assetTicker

        const assetDecimalPlaces = rammSuiPool.assetConfigs[assetIndex!].assetDecimalPlaces
        let assetBalance = poolStateEvent.asset_balances[i] / (10 ** assetDecimalPlaces)
        let assetLPT = poolStateEvent.asset_lpt_issued[i] / (10 ** assetDecimalPlaces)

        assetBalances[assetTicker] = assetBalance
        assetLPTIssued[assetTicker] = assetLPT
    }

    return {
        rammID: poolStateEvent.ramm_id,
        assetBalances,
        assetLPTIssued
    }
}

/**
 * Structure representing a RAMM's imbalance ratio data.
 *
 * Simplification of the data in an imbalance ratio event.
 */
export type RAMMImbalanceRatioData = {
    rammID: string,
    imb_ratios: Record<string, number>
}