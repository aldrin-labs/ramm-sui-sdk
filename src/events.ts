/**
 * Type that represents a `TypeName` from Sui Move, following emission into an event and parsing
 * into JSON.
 */
type TypeName = {
    name: string
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's liquidity deposit.
 */
type LiquidityDepositEvent = {
    ramm_id: string,
    trader: string,
    token_in: TypeName,
    amount_in: number,
    lpt: number,
}

type LiqWthdrwDict = {
    key: TypeName,
    value: number,
}

type Contents = {
    contents: LiqWthdrwDict[],
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's liquidity withdrawal.
 */
type LiquidityWithdrawalEvent = {
    ramm_id: string,
    trader: string,
    token_out: TypeName,
    lpt: number,
    amounts_out: Contents,
    fees: Contents
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's inbound/outbound trades.
 */
type TradeEvent = {
    ramm_id: string,
    trader: string,
    token_in: TypeName,
    token_out: TypeName,
    amount_in: number,
    amount_out: number,
    protocol_fee: number
}

/**
 * Structure representing the Sui Move event, in JSON, of a RAMM's pool state query.
 */
type PoolStateEvent = {
    ramm_id: string,
    sender: string,
    asset_types: TypeName[],
    asset_balances: number[],
    asset_lpt_issued: number[],
}

/**
 * Structure representing the parsed JSON of an emitted price estimation Sui Move event.
 *
 * @remark
 * 
 * This structure can be obtained from using `ramm_sui::interface{n}::trade_price_estimate_{n}`
 * to estimate the price of a potencial trade with the RAMM.
 */
type PriceEstimationEvent = {
    ramm_id: string,
    trader: string,
    token_in: TypeName,
    token_out: TypeName,
    amount_in: number,
    amount_out: number,
    protocol_fee: number,
}

export type {
    TypeName,
    LiquidityDepositEvent,

    LiquidityWithdrawalEvent,
    LiqWthdrwDict,
    Contents,

    TradeEvent,
    PoolStateEvent,
    PriceEstimationEvent,
}
