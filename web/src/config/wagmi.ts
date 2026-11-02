import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { botchainMainnet } from './chain';

export const config = getDefaultConfig({
  appName: 'Lightbid Marketplace',
  projectId: 'a2b1c3d4e5f67890123456789abcdef0', // Public WalletConnect project ID for development
  chains: [botchainMainnet],
  ssr: false,
});
