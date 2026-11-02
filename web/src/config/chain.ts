import { defineChain } from 'viem';
import { APP_CONFIG } from './appConfig';

export const botchainMainnet = defineChain({
  id: APP_CONFIG.network.chainId,
  name: APP_CONFIG.network.name,
  nativeCurrency: {
    decimals: 18,
    name: APP_CONFIG.network.currencySymbol,
    symbol: APP_CONFIG.network.currencySymbol,
  },
  rpcUrls: {
    default: {
      http: [APP_CONFIG.network.rpcUrl],
    },
    public: {
      http: [APP_CONFIG.network.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'BOTScan Explorer',
      url: APP_CONFIG.network.blockExplorerUrl,
    },
  },
  testnet: false,
});

export const botchainTestnet = botchainMainnet;
export const liteforgeChain = botchainMainnet;
