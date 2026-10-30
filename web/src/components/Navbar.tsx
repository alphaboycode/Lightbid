import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { Gavel, PlusCircle, Sparkles, Droplets, Menu, X, Coins, ArrowUpRight } from 'lucide-react';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config/contracts';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { address, isConnected } = useAccount();

  // Read user pending returns (refunds from outbid auctions)
  const { data: pendingReturns, refetch: refetchPendingReturns } = useReadContract({
    address: CONTRACT_ADDRESSES.lightbid,
    abi: CONTRACT_ABIS.Lightbid,
    functionName: 'pendingReturns',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10_000,
    },
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  React.useEffect(() => {
    if (hash) {
      refetchPendingReturns();
    }
  }, [hash, refetchPendingReturns]);

  const handleWithdrawRefund = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESSES.lightbid,
      abi: CONTRACT_ABIS.Lightbid,
      functionName: 'withdraw',
    });
  };

  const navLinks = [
    { label: 'Explore', path: '/', icon: Gavel },
    { label: 'Create Auction', path: '/create', icon: PlusCircle },
    { label: 'Mint NFT (IPFS)', path: '/mint', icon: Sparkles },
    { label: 'Faucet', path: '/faucet', icon: Droplets },
  ];

  const hasRefund = Boolean(pendingReturns && (pendingReturns as bigint) > 0n);

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-dark-700 bg-dark-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-dark-950 shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
                <Gavel className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                  Lightbid
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    Botchain
                  </span>
                </span>
                <span className="text-xs text-slate-400">Decentralized Botchain Auctions</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1 ml-8">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-dark-800 text-brand-400 border border-brand-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-dark-850'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Refund button & RainbowKit Connect */}
          <div className="hidden md:flex items-center space-x-4">
            {isConnected && hasRefund && (
              <button
                onClick={handleWithdrawRefund}
                disabled={isPending || isConfirming}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all text-xs font-semibold animate-pulse"
                title="You were outbid in an auction. Claim your refunded bid balance."
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>
                  Refund Available: {formatEther(pendingReturns as bigint)} BOT
                </span>
                <span className="underline ml-1">
                  {isPending || isConfirming ? 'Claiming...' : 'Claim'}
                </span>
              </button>
            )}

            <ConnectButton showBalance={true} chainStatus="icon" />
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-3">
            <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="none" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-850"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-dark-800 bg-dark-900 px-4 pt-2 pb-6 space-y-2">
          {isConnected && hasRefund && (
            <div className="p-3 mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-amber-300">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Refund: {formatEther(pendingReturns as bigint)} BOT</span>
              </div>
              <button
                onClick={handleWithdrawRefund}
                disabled={isPending || isConfirming}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-500 text-dark-950"
              >
                {isPending || isConfirming ? 'Claiming...' : 'Claim'}
              </button>
            </div>
          )}
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                  isActive
                    ? 'bg-dark-800 text-brand-400 border border-brand-500/30'
                    : 'text-slate-300 hover:bg-dark-850 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};
