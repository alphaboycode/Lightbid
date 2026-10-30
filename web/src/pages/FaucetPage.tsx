import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import {
  Droplets,
  Coins,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Plus,
  Zap,
} from 'lucide-react';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config/contracts';
import { APP_CONFIG } from '../config/appConfig';

export const FaucetPage: React.FC = () => {
  const { address, isConnected } = useAccount();

  // 1. Read TestERC20 balance & cooldown
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.testERC20,
    abi: CONTRACT_ABIS.TestERC20,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5_000,
    },
  });

  const { data: cooldownData, refetch: refetchCooldown } = useReadContract({
    address: CONTRACT_ADDRESSES.testERC20,
    abi: CONTRACT_ABIS.TestERC20,
    functionName: 'timeUntilNextClaim',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 3_000,
    },
  });

  const cooldownSeconds = cooldownData ? Number(cooldownData as bigint) : 0;
  const isCooldownActive = cooldownSeconds > 0;
  const balance = balanceData ? formatUnits(balanceData as bigint, 6) : '0';

  // Claim Faucet Transaction
  const { data: claimHash, writeContract, isPending: isClaimPending } = useWriteContract();
  const { isLoading: isConfirmingClaim, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  useEffect(() => {
    if (isClaimSuccess) {
      refetchBalance();
      refetchCooldown();
    }
  }, [isClaimSuccess, refetchBalance, refetchCooldown]);

  const handleClaim = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.testERC20,
      abi: CONTRACT_ABIS.TestERC20,
      functionName: 'faucet',
    });
  };

  // Add tUSD to Wallet
  const handleAddToWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: CONTRACT_ADDRESSES.testERC20,
              symbol: 'tUSD',
              decimals: 6,
            },
          },
        });
      } catch (err) {
        console.error('Failed to add token to wallet:', err);
      }
    }
  };

  const explorerUrl = APP_CONFIG.network.blockExplorerUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
          <Droplets className="w-3.5 h-3.5" />
          <span>Botchain Testnet Faucets</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Testnet <span className="text-brand-400">Tokens & Faucet</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Claim free test tokens to test auctions, bidding, and marketplace features without real funds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: TestERC20 (tUSD) Faucet */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-dark-800 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <Coins className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-dark-900 border border-dark-700 text-slate-300">
                6 Decimals
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Test USD (tUSD)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Official ERC-20 test token deployed on Botchain Testnet. Claim 1,000 tUSD once every hour.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-dark-950 border border-dark-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Your Balance:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {Number(balance).toLocaleString()} tUSD
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Faucet Claim:</span>
                <span className="font-semibold text-brand-400">1,000 tUSD / hour</span>
              </div>
            </div>

            {isCooldownActive && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Cooldown active: next claim in {Math.floor(cooldownSeconds / 60)}m {cooldownSeconds % 60}s.
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-dark-800">
            <button
              onClick={handleClaim}
              disabled={isClaimPending || isConfirmingClaim || isCooldownActive || !isConnected}
              className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-extrabold text-sm uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20"
            >
              {isClaimPending || isConfirmingClaim ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Claiming 1,000 tUSD...</span>
                </>
              ) : isCooldownActive ? (
                <span>Cooldown Active</span>
              ) : (
                <>
                  <Droplets className="w-4 h-4" />
                  <span>Claim 1,000 tUSD</span>
                </>
              )}
            </button>

            <button
              onClick={handleAddToWallet}
              className="w-full py-2 rounded-xl bg-dark-900 hover:bg-dark-850 text-slate-300 text-xs font-semibold border border-dark-800 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-brand-400" />
              <span>Add tUSD to MetaMask / Wallet</span>
            </button>
          </div>
        </div>

        {/* Card 2: Test NFT (LNFT) + IPFS */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-dark-800 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-dark-900 border border-dark-700 text-slate-300">
                ERC-721 Enumerable
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Lightbid NFT (LNFT)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Mint your own customized ERC-721 collectibles with Pinata IPFS metadata, then test listing them for auction on Lightbid.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-dark-950 border border-dark-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Contract Address:</span>
                <a
                  href={`${explorerUrl}/address/${CONTRACT_ADDRESSES.testERC721}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-brand-400 hover:underline flex items-center gap-1"
                >
                  {CONTRACT_ADDRESSES.testERC721.slice(0, 6)}...{CONTRACT_ADDRESSES.testERC721.slice(-4)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Metadata Storage:</span>
                <span className="text-emerald-400 font-semibold">Pinata IPFS Gateway</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-dark-800">
            <Link
              to="/mint"
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Mint Custom NFT to IPFS</span>
            </Link>

            <Link
              to="/create"
              className="w-full py-2 rounded-xl bg-dark-900 hover:bg-dark-850 text-slate-300 text-xs font-semibold border border-dark-800 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>Create Auction with Existing Token</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Gas Info Section */}
      <div className="glass-panel rounded-3xl p-6 border border-dark-800 space-y-3">
        <div className="flex items-center space-x-2 text-white font-bold text-sm">
          <Zap className="w-4 h-4 text-brand-400" />
          <span>Botchain Testnet Network Parameters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-slate-300 pt-1">
          <div className="p-3 rounded-xl bg-dark-950 border border-dark-800">
            <div className="text-[10px] text-slate-500 uppercase">Chain ID</div>
            <div className="font-bold text-white mt-0.5">{APP_CONFIG.network.chainId}</div>
          </div>
          <div className="p-3 rounded-xl bg-dark-950 border border-dark-800">
            <div className="text-[10px] text-slate-500 uppercase">Native Currency</div>
            <div className="font-bold text-brand-400 mt-0.5">{APP_CONFIG.network.currencySymbol} (18 decimals)</div>
          </div>
          <div className="p-3 rounded-xl bg-dark-950 border border-dark-800">
            <div className="text-[10px] text-slate-500 uppercase">Block Explorer</div>
            <a
              href={APP_CONFIG.network.blockExplorerUrl}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-brand-400 hover:underline flex items-center gap-1 mt-0.5"
            >
              scan.bohr.life
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
