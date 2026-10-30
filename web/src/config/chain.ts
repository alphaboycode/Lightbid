import { defineChain } from 'viem';
import { APP_CONFIG } from './appConfig';

export const botchainTestnet = defineChain({
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
      name: 'Botchain Explorer',
      url: APP_CONFIG.network.blockExplorerUrl,
    },
  },
  testnet: true,
});

export const liteforgeChain = botchainTestnet;
