import React from 'react';
import { ExternalLink, ShieldCheck, Zap, HardDrive } from 'lucide-react';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { APP_CONFIG } from '../config/appConfig';

export const Footer: React.FC = () => {
  const explorerUrl = APP_CONFIG.network.blockExplorerUrl;

  return (
    <footer className="border-t border-dark-800 bg-dark-950 mt-20 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: About */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-dark-950 font-bold text-sm">
                L
              </div>
              <span className="font-bold text-white text-base">Lightbid</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decentralized, non-custodial auction marketplace on Botchain Testnet (Chain ID: 968). Supporting ERC-721, ERC-1155, and ERC-20 assets.
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-brand-400 font-medium">
              <Zap className="w-3.5 h-3.5" />
              <span>15-min Anti-Snipe Extension Window</span>
            </div>
          </div>

          {/* Col 2: Smart Contracts on Botchain */}
          <div className="space-y-2 md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Deployed Contracts (Botchain Testnet 968)
            </h4>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-dark-900 border border-dark-800">
                <span className="text-slate-400">Lightbid Marketplace:</span>
                <a
                  href={`${explorerUrl}/address/${CONTRACT_ADDRESSES.lightbid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:text-brand-300 flex items-center gap-1 font-mono text-[11px]"
                >
                  {CONTRACT_ADDRESSES.lightbid.slice(0, 10)}...{CONTRACT_ADDRESSES.lightbid.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-dark-900 border border-dark-800">
                <span className="text-slate-400">TestERC20 (tUSD Faucet):</span>
                <a
                  href={`${explorerUrl}/address/${CONTRACT_ADDRESSES.testERC20}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:text-brand-300 flex items-center gap-1 font-mono text-[11px]"
                >
                  {CONTRACT_ADDRESSES.testERC20.slice(0, 10)}...{CONTRACT_ADDRESSES.testERC20.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-dark-900 border border-dark-800">
                <span className="text-slate-400">TestERC721 (LNFT):</span>
                <a
                  href={`${explorerUrl}/address/${CONTRACT_ADDRESSES.testERC721}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:text-brand-300 flex items-center gap-1 font-mono text-[11px]"
                >
                  {CONTRACT_ADDRESSES.testERC721.slice(0, 10)}...{CONTRACT_ADDRESSES.testERC721.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Col 3: Storage & Verification */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Decentralized Infrastructure
            </h4>
            <div className="flex items-start space-x-2 text-xs text-slate-400">
              <HardDrive className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span>
                Metadata pinned to <strong>Pinata IPFS</strong> with permanent CIDv1 hashes and gateway fallback.
              </span>
            </div>
            <div className="flex items-start space-x-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <span>
                Pull-payment refunds protect bidders against reentrancy and outbid locking.
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-dark-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Lightbid. Botchain Testnet Auction Protocol.</p>
          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            <a
              href="https://scan.bohr.life"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              Botchain Explorer
            </a>
            <span>•</span>
            <a
              href="https://pinata.cloud"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              Pinata IPFS
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
