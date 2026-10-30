/**
 * Application Configuration
 * Holds network parameters, contract addresses, and service endpoints.
 * Sensitive API keys like VITE_PINATA_JWT remain in .env.
 */

export const APP_CONFIG = {
  network: {
    chainId: 968,
    name: 'Botchain Testnet',
    rpcUrl: 'https://rpc.bohr.life',
    blockExplorerUrl: 'https://scan.bohr.life',
    currencySymbol: 'BOT',
  },
  contracts: {
    lightbid: '0x39FfB249F207a2583Be272d2f55AcebE0d09b2b8' as `0x${string}`,
    testERC20: '0x249D23b4c2e58cf40eB0273e6afCE8d23170d82d' as `0x${string}`,
    testERC721: '0xD8c92E8e8ECe7F00C947eB2C12Cdb2A110f9B63b' as `0x${string}`,
  },
  ipfs: {
    gateway: 'https://gateway.pinata.cloud/ipfs/',
  },
} as const;
