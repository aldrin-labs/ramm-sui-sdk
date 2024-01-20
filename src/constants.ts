import { RAMMSuiPool, RAMMSuiPoolConfig } from "./types";

export type SuiSupportedNetworks = 'suiTestnet' | 'suiMainnet';

export type SuiNetworkConfigs = Record<SuiSupportedNetworks, RAMMSuiPoolConfig[] | undefined>;

export const suiConfigs: SuiNetworkConfigs = {
    suiTestnet: [],
    suiMainnet: []
};

