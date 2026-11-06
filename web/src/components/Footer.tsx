import React from 'react';
import { ExternalLink, ShieldCheck, Zap, HardDrive, Globe, Search, CheckCircle2 } from 'lucide-react';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { APP_CONFIG } from '../config/appConfig';
import botLogo from '../assets/bot-logo.svg';

export const Footer: React.FC = () => {
  const explorerUrl = APP_CONFIG.network.blockExplorerUrl;
  const deployedContractAddress = CONTRACT_ADDRESSES.lightbid;

  return (
    <footer className="border-t border-dark-800 bg-dark-950 mt-20 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Prominent Banner: Proof on bot mainnet */}
        <div className="mb-10 p-5 rounded-2xl bg-dark-900/90 border border-brand-500/40 shadow-xl shadow-brand-500/5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  Proof on bot mainnet
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Mainnet Live
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs">
                <div className="text-slate-300">
                  <span className="text-slate-400">Chain id: </span>
                  <span className="font-mono font-semibold text-brand-400">677</span>
                </div>
                
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-slate-400">Contract: </span>
                  <a
                    href={`${explorerUrl}/address/${deployedContractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4 flex items-center gap-1 hover:underline transition-colors"
                  >
                    <span>{deployedContractAddress}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            {/* Hyperlinks for BOT Chain Website and BOTScan Explorer */}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://www.botchain.ai/en/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-brand-500 text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-sm"
              >
                <Globe className="w-4 h-4 text-brand-400" />
                <span>BOT Chain Website</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>

              <a
                href="https://scan.botchain.ai/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-brand-500 text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-sm"
              >
                <Search className="w-4 h-4 text-brand-400" />
                <span>BOTScan explorer</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        {/* 3-Column Ecosystem Grid */}
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
              Decentralized, non-custodial auction marketplace on Botchain Mainnet (Chain ID: 677). Supporting ERC-721, ERC-1155, and ERC-20 assets.
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-brand-400 font-medium">
              <Zap className="w-3.5 h-3.5" />
              <span>15-min Anti-Snipe Extension Window</span>
            </div>
          </div>

          {/* Col 2: Smart Contracts on Botchain Mainnet */}
          <div className="space-y-2 md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Deployed Contracts (Botchain Mainnet 677)
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
                  {CONTRACT_ADDRESSES.lightbid}
                  <ExternalLink className="w-3 h-3 shrink-0" />
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
                  {CONTRACT_ADDRESSES.testERC20}
                  <ExternalLink className="w-3 h-3 shrink-0" />
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
                  {CONTRACT_ADDRESSES.testERC721}
                  <ExternalLink className="w-3 h-3 shrink-0" />
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

        {/* Part of the Ecosystem Section */}
        <div className="border-t border-dark-800 mt-14 pt-12 text-center">
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            
            {/* Header label */}
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-400">
              Part of the Ecosystem
            </p>

            {/* Circular badge with glowing ring */}
            <div className="my-6 relative flex items-center justify-center">
              {/* Soft ambient glow */}
              <div className="absolute w-28 h-28 rounded-full bg-brand-500/15 blur-xl pointer-events-none" />
              
              {/* Outer glowing border ring */}
              <div className="relative w-24 h-24 rounded-full p-[2px] bg-gradient-to-b from-brand-500/40 via-brand-500/20 to-brand-500/5 shadow-[0_0_25px_rgba(34,197,94,0.15)]">
                {/* Inner badge circle taking app background */}
                <div className="w-full h-full rounded-full bg-dark-900 border border-dark-800/80 flex items-center justify-center p-4">
                  <img
                    src={botLogo}
                    alt="BOT Chain Logo"
                    className="w-12 h-12 object-contain select-none drop-shadow-[0_2px_8px_rgba(16,163,127,0.3)]"
                  />
                </div>
              </div>
            </div>

            {/* BOT Chain Title */}
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              <span className="text-brand-400">BOT</span> <span className="text-white">Chain</span>
            </h3>

            {/* Lightbid Tagline */}
            <p className="text-sm sm:text-base text-slate-300 mt-2 font-medium">
              Every bid counts. Every auction ends fair.
            </p>

            {/* Decorative Divider with Center Diamond */}
            <div className="my-6 flex items-center justify-center gap-3 w-48 sm:w-64">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-brand-500/30 to-brand-500/60" />
              <div className="w-2 h-2 rotate-45 bg-brand-400 shrink-0 shadow-[0_0_6px_rgba(74,222,128,0.7)]" />
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-brand-500/30 to-brand-500/60" />
            </div>

            {/* Ecosystem Links (No GitHub as requested) */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 text-sm">
              <a
                href="https://www.botchain.ai/en/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors group"
              >
                <Globe className="w-4 h-4 text-slate-400 group-hover:text-brand-400 transition-colors" />
                <span className="font-medium">botchain.ai</span>
              </a>

              <a
                href="https://scan.botchain.ai/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors group"
              >
                <Search className="w-4 h-4 text-slate-400 group-hover:text-brand-400 transition-colors" />
                <span className="font-medium">Explorer</span>
              </a>
            </div>

            {/* Chain Info Copyright */}
            <p className="text-xs text-slate-500 font-mono mt-8">
              © 2026 <span className="font-semibold text-slate-300">BOT Chain</span> · Mainnet · Chain ID <span className="font-semibold text-slate-300">677</span>
            </p>
          </div>
        </div>

        {/* Bottom Protocol Footer Bar */}
        <div className="border-t border-dark-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Lightbid. Anti-Snipe Decentralized Auction Protocol.</p>
          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
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
