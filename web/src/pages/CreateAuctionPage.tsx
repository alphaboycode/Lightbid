import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import {
  PlusCircle,
  Sparkles,
  Layers,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, AssetType } from '../config/contracts';

export const CreateAuctionPage: React.FC = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  const [assetType, setAssetType] = useState<AssetType>(AssetType.ERC721);
  const [tokenAddress, setTokenAddress] = useState<string>(CONTRACT_ADDRESSES.testERC721);
  const [tokenId, setTokenId] = useState<string>('1');
  const [amount, setAmount] = useState<string>('1');
  const [reservePrice, setReservePrice] = useState<string>('0.05');
  const [minIncrementPct, setMinIncrementPct] = useState<number>(2.5); // 2.5% = 250 bps
  const [durationHours, setDurationHours] = useState<number>(24);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check approval for ERC-721
  const isErc721 = assetType === AssetType.ERC721;
  const isErc20 = assetType === AssetType.ERC20;
  const isErc1155 = assetType === AssetType.ERC1155;

  const { data: isApprovedForAll, refetch: refetchApproval } = useReadContract({
    address: (tokenAddress as `0x${string}`) || CONTRACT_ADDRESSES.testERC721,
    abi: CONTRACT_ABIS.TestERC721,
    functionName: 'isApprovedForAll',
    args: address ? [address, CONTRACT_ADDRESSES.lightbid] : undefined,
    query: {
      enabled: !!address && isErc721 && !!tokenAddress,
    },
  });

  // Approval write
  const {
    data: approveHash,
    writeContract: writeApprove,
    isPending: isApproving,
  } = useWriteContract();

  const { isLoading: isConfirmingApprove, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  React.useEffect(() => {
    if (isApproveSuccess) {
      refetchApproval();
      setStatusMessage('Marketplace approval confirmed! You can now create your auction.');
    }
  }, [isApproveSuccess, refetchApproval]);

  // Create auction write
  const {
    data: createHash,
    writeContract: writeCreate,
    isPending: isCreating,
  } = useWriteContract();

  const { isLoading: isConfirmingCreate, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({
    hash: createHash,
  });

  React.useEffect(() => {
    if (isCreateSuccess) {
      setStatusMessage('Auction successfully created on Botchain!');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  }, [isCreateSuccess, navigate]);

  const handleApprove = () => {
    setErrorMessage(null);
    if (!tokenAddress) {
      setErrorMessage('Please specify token address.');
      return;
    }

    try {
      if (isErc721) {
        writeApprove({
          address: tokenAddress as `0x${string}`,
          abi: CONTRACT_ABIS.TestERC721,
          functionName: 'setApprovalForAll',
          args: [CONTRACT_ADDRESSES.lightbid, true],
        });
      } else if (isErc20) {
        const parsedAmount = parseUnits(amount, 6);
        writeApprove({
          address: tokenAddress as `0x${string}`,
          abi: CONTRACT_ABIS.TestERC20,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.lightbid, parsedAmount],
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to trigger approval.');
    }
  };

  const handleCreateAuction = () => {
    setErrorMessage(null);
    if (!tokenAddress) {
      setErrorMessage('Token address is required.');
      return;
    }
    if (!reservePrice || Number(reservePrice) <= 0) {
      setErrorMessage('Reserve price must be greater than 0 BOT.');
      return;
    }

    try {
      const parsedReserve = parseEther(reservePrice);
      const minIncrementBps = BigInt(Math.round(minIncrementPct * 100)); // 2.5% -> 250 bps
      const durationSeconds = BigInt(durationHours * 3600);
      const parsedTokenId = isErc20 ? 0n : BigInt(tokenId || '0');
      const parsedAmount = isErc20
        ? parseUnits(amount || '1', 6)
        : BigInt(amount || '1');

      writeCreate({
        address: CONTRACT_ADDRESSES.lightbid,
        abi: CONTRACT_ABIS.Lightbid,
        functionName: 'createAuction',
        args: [
          assetType,
          tokenAddress as `0x${string}`,
          parsedTokenId,
          parsedAmount,
          parsedReserve,
          minIncrementBps,
          durationSeconds,
        ],
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit create auction transaction.');
    }
  };

  const needsApproval = isErc721 ? !isApprovedForAll : true;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Create New <span className="text-brand-400">Auction</span>
        </h1>
        <p className="text-slate-400 text-sm">
          List your NFT, multi-token, or ERC-20 bundle for decentralized bidding on Botchain Testnet.
        </p>
      </div>

      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-dark-800 space-y-6">
        {/* Step 1: Asset Type Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Select Asset Standard
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                type: AssetType.ERC721,
                label: 'ERC-721 NFT',
                icon: Sparkles,
                defaultToken: CONTRACT_ADDRESSES.testERC721,
              },
              {
                type: AssetType.ERC1155,
                label: 'ERC-1155 Multi',
                icon: Layers,
                defaultToken: '',
              },
              {
                type: AssetType.ERC20,
                label: 'ERC-20 Bundle',
                icon: Coins,
                defaultToken: CONTRACT_ADDRESSES.testERC20,
              },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = assetType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    setAssetType(item.type);
                    if (item.defaultToken) setTokenAddress(item.defaultToken);
                  }}
                  className={`p-3.5 rounded-2xl flex flex-col items-center justify-center space-y-2 border transition-all ${
                    isSelected
                      ? 'bg-brand-500/10 border-brand-500 text-brand-400'
                      : 'bg-dark-900 border-dark-800 text-slate-400 hover:text-white hover:bg-dark-850'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-bold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Contract Address & Quick Fill */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-300">Asset Contract Address</label>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Quick Fill:</span>
              <button
                type="button"
                onClick={() => {
                  setAssetType(AssetType.ERC721);
                  setTokenAddress(CONTRACT_ADDRESSES.testERC721);
                }}
                className="text-brand-400 hover:underline font-mono"
              >
                Test NFT (LNFT)
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setAssetType(AssetType.ERC20);
                  setTokenAddress(CONTRACT_ADDRESSES.testERC20);
                }}
                className="text-brand-400 hover:underline font-mono"
              >
                Test ERC20 (tUSD)
              </button>
            </div>
          </div>
          <input
            type="text"
            placeholder="0x..."
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="w-full rounded-xl bg-dark-950 border border-dark-700 px-4 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Token ID & Amount (Conditional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isErc20 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Token ID</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 1"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                className="w-full rounded-xl bg-dark-950 border border-dark-700 px-4 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          {!isErc721 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                {isErc20 ? 'Amount of Tokens' : 'Quantity / Editions'}
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl bg-dark-950 border border-dark-700 px-4 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>
          )}
        </div>

        {/* Step 3: Reserve Price & Min Increment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Reserve Starting Price (BOT)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.001"
                placeholder="e.g. 0.05"
                value={reservePrice}
                onChange={(e) => setReservePrice(e.target.value)}
                className="w-full rounded-xl bg-dark-950 border border-dark-700 px-4 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-400">
                BOT
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Min Bid Increment ({minIncrementPct}%)
            </label>
            <select
              value={minIncrementPct}
              onChange={(e) => setMinIncrementPct(Number(e.target.value))}
              className="w-full rounded-xl bg-dark-950 border border-dark-700 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value={1}>1.0% (100 bps)</option>
              <option value={2.5}>2.5% (250 bps - Standard)</option>
              <option value={5}>5.0% (500 bps)</option>
              <option value={10}>10.0% (1000 bps)</option>
            </select>
          </div>
        </div>

        {/* Step 4: Duration Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Auction Duration</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { hours: 1, label: '1 Hour' },
              { hours: 12, label: '12 Hours' },
              { hours: 24, label: '24 Hours' },
              { hours: 72, label: '3 Days' },
            ].map((dur) => (
              <button
                key={dur.hours}
                type="button"
                onClick={() => setDurationHours(dur.hours)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  durationHours === dur.hours
                    ? 'bg-brand-500 text-dark-950 border-brand-500 font-bold'
                    : 'bg-dark-900 border-dark-800 text-slate-400 hover:text-white'
                }`}
              >
                {dur.label}
              </button>
            ))}
          </div>
        </div>

        {/* Anti-snipe reminder */}
        <div className="p-3.5 rounded-2xl bg-dark-950 border border-dark-800 flex items-start space-x-3 text-xs text-slate-400">
          <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <span>
            Lightbid features automated <strong>15-minute anti-snipe extension</strong>. Any bid received within 15 minutes of closing will extend the auction time by 15 minutes.
          </span>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Status message */}
        {statusMessage && (
          <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-brand-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons: 2-step Approval -> Create */}
        <div className="pt-4 border-t border-dark-800 flex flex-col sm:flex-row items-center gap-3">
          {isErc721 && !isApprovedForAll ? (
            <button
              onClick={handleApprove}
              disabled={isApproving || isConfirmingApprove || !isConnected}
              className="w-full sm:flex-1 py-3.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-brand-400 border border-brand-500/30 font-bold text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isApproving || isConfirmingApprove ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Approving Marketplace...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>1. Approve NFT Transfer</span>
                </>
              )}
            </button>
          ) : null}

          <button
            onClick={handleCreateAuction}
            disabled={
              isCreating ||
              isConfirmingCreate ||
              !isConnected ||
              (isErc721 && !isApprovedForAll)
            }
            className="w-full sm:flex-1 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-extrabold text-sm uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20"
          >
            {isCreating || isConfirmingCreate ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Auction Onchain...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Launch Auction</span>
              </>
            )}
          </button>
        </div>

        {/* Tip for users without NFT */}
        <div className="text-center pt-2">
          <Link
            to="/mint"
            className="text-xs text-brand-400 hover:underline inline-flex items-center space-x-1"
          >
            <span>Need an NFT to test? Mint one with Pinata IPFS in 10 seconds</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
