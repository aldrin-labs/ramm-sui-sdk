/**
 * Type that represents a `TypeName` from Sui Move, following emission into an event and parsing
 * into JSON.
 */
export type TypeName = {
    name: string
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's liquidity deposit.
 */
export type LiquidityDepositEvent = {
    ramm_id: string
    trader: string
    token_in: TypeName
    amount_in: number
    lpt: number
}

export type LiqWthdrwDict = {
    key: TypeName
    value: number
}

export type LiqWthdrwContents = {
    contents: LiqWthdrwDict[]
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's liquidity withdrawal.
 */
export type LiquidityWithdrawalEvent = {
    ramm_id: string
    trader: string
    token_out: TypeName
    lpt: number
    amounts_out: LiqWthdrwContents
    fees: LiqWthdrwContents
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's inbound/outbound trades.
 */
export type TradeEvent = {
    ramm_id: string
    trader: string
    token_in: TypeName
    token_out: TypeName
    amount_in: number
    amount_out: number
    protocol_fee: number
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's pool state query.
 */
export type PoolStateEvent = {
    ramm_id: string
    sender: string
    asset_types: TypeName[]
    asset_balances: number[]
    asset_lpt_issued: number[]
}

/**
 * Structure representing the parsed JSON of an emitted price estimation Sui Move event.
 *
 * @remark
 *
 * This structure can be obtained from using `ramm_sui::interface{n}::trade_price_estimate_{n}`
 * to estimate the price of a potencial trade with the RAMM.
 */
export type PriceEstimationEvent = {
    ramm_id: string
    trader: string
    token_in: TypeName
    token_out: TypeName
    amount_in: number
    amount_out: number
    protocol_fee: number
}

/**
 * Key/value pair of an asset's type, and its imbalance ratio scaled with that asset's decimal
 * places.
 */
export type ImbRatioDict = {
    key: TypeName
    value: number
}

/**
 * Wrapping object containing an array with the query's imbalance ratio data.
 */
export type ImbRatioContents = {
    contents: ImbRatioDict[]
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's imbalance ratio query.
 */
export type ImbalanceRatioEvent = {
    ramm_id: string
    requester: string
    imb_ratios: ImbRatioContents
}
