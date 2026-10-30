import React from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { Coins, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config/contracts';

export const RefundBanner: React.FC = () => {
  const { address, isConnected } = useAccount();

  const { data: pendingReturns, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.lightbid,
    abi: CONTRACT_ABIS.Lightbid,
    functionName: 'pendingReturns',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 8_000,
    },
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  React.useEffect(() => {
    if (isSuccess) {
      refetch();
    }
  }, [isSuccess, refetch]);

  if (!isConnected || !pendingReturns || (pendingReturns as bigint) <= 0n) {
    return null;
  }

  const handleWithdraw = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.lightbid,
      abi: CONTRACT_ABIS.Lightbid,
      functionName: 'withdraw',
    });
  };

  return (
    <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-y border-amber-500/30 py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 text-sm text-amber-200">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-white">Outbid Refund Available: </span>
            <span>
              You have <strong className="text-amber-300 font-mono">{formatEther(pendingReturns as bigint)} BOT</strong> available to withdraw from outbid auctions.
            </span>
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={isPending || isConfirming}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shrink-0"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Withdrawing...</span>
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Withdrawn!</span>
            </>
          ) : (
            <>
              <span>Claim {formatEther(pendingReturns as bigint)} BOT</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
