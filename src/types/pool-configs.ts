import { RAMMSuiPoolConfig } from "./ramm-sui";

/**
 * Enum with possible Sui network environments.
 *
 * These are environments such that this SDK allows interaction with RAMM Sui pools in them.
 */
export enum SuiSupportedNetworks {
    testnet,
    mainnet
};

/**
 * This is a map of RAMM Sui pool configurations, keyed by their Sui environment.
 *
 * Each Sui environment can have multiple pool configurations. For instance, there can be 2
 * testnet pools used for tests.
 *
 * This `type` will be used to create an `export`ed `const`ant that downstream consumers of this
 * library use to access presently deployed pools.
 */
export type RAMMSuiPoolConfigs = {
    [key in SuiSupportedNetworks]: RAMMSuiPoolConfig[];
  }
