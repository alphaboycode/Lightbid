import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import {
  Gavel,
  Clock,
  ShieldCheck,
  Zap,
  ExternalLink,
  User,
  Tag,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Share2,
  Coins,
  ChevronRight,
  Info,
} from 'lucide-react';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, Auction, AssetType, AuctionStatus } from '../config/contracts';
import { APP_CONFIG } from '../config/appConfig';
import { CountdownTimer } from '../components/CountdownTimer';
import { resolveIpfsUrl } from '../lib/ipfs';

export const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const auctionId = BigInt(id || '1');
  const { address, isConnected } = useAccount();

  const [bidAmount, setBidAmount] = useState<string>('');
  const [nftMetadata, setNftMetadata] = useState<{
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
  }>({});
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // 1. Fetch Auction details
  const {
    data: auctionData,
    isLoading: isLoadingAuction,
    refetch: refetchAuction,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.lightbid,
    abi: CONTRACT_ABIS.Lightbid,
    functionName: 'getAuction',
    args: [auctionId],
    query: {
      refetchInterval: 5_000,
    },
  });

  const auction: Auction | null = useMemo(() => {
    if (!auctionData) return null;
    const res = auctionData as any;
    return {
      id: BigInt(res.id ?? auctionId),
      seller: res.seller,
      assetType: Number(res.assetType) as AssetType,
      token: res.token,
      tokenId: BigInt(res.tokenId ?? 0),
      amount: BigInt(res.amount ?? 0),
      paymentToken: res.paymentToken,
      reservePrice: BigInt(res.reservePrice ?? 0),
      minIncrementBps: BigInt(res.minIncrementBps ?? 250),
      highestBid: BigInt(res.highestBid ?? 0),
      highestBidder: res.highestBidder,
      startTime: BigInt(res.startTime ?? 0),
      endTime: BigInt(res.endTime ?? 0),
      status: Number(res.status) as AuctionStatus,
    };
  }, [auctionData, auctionId]);

  // 2. Read NFT Token URI if ERC-721
  const isErc721 = auction?.assetType === AssetType.ERC721;
  const { data: tokenUriData } = useReadContract({
    address: auction?.token,
    abi: CONTRACT_ABIS.TestERC721,
    functionName: 'tokenURI',
    args: auction ? [auction.tokenId] : undefined,
    query: {
      enabled: !!auction && isErc721,
    },
  });

  useEffect(() => {
    if (!tokenUriData || typeof tokenUriData !== 'string') return;

    const fetchMeta = async () => {
      try {
        setLoadingMetadata(true);
        const resolved = resolveIpfsUrl(tokenUriData);
        const res = await fetch(resolved);
        if (res.ok) {
          const json = await res.json();
          setNftMetadata({
            name: json.name,
            description: json.description,
            image: json.image ? resolveIpfsUrl(json.image) : undefined,
            attributes: json.attributes || [],
          });
        }
      } catch (err) {
        console.error('Error fetching NFT metadata from IPFS:', err);
      } finally {
        setLoadingMetadata(false);
      }
    };

    fetchMeta();
  }, [tokenUriData]);

  // 3. Transactions: Place Bid, Settle, Cancel
  const { data: txHash, writeContract, isPending: isTxPending, reset: resetTx } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isTxSuccess) {
      refetchAuction();
      setBidAmount('');
    }
  }, [isTxSuccess, refetchAuction]);

  // Derived auction parameters
  const now = Math.floor(Date.now() / 1000);
  const isEnded = auction ? Number(auction.endTime) <= now : false;
  const isSettled = auction?.status === AuctionStatus.Settled;
  const isCancelled = auction?.status === AuctionStatus.Cancelled;
  const isActive = auction?.status === AuctionStatus.Active && !isEnded;

  const hasBids = auction ? auction.highestBid > 0n : false;
  const currentPrice = hasBids ? auction!.highestBid : (auction?.reservePrice ?? 0n);

  // Minimum valid bid amount
  const minIncrement = hasBids && auction
    ? (auction.highestBid * auction.minIncrementBps) / 10000n
    : 0n;
  const minNextBid = hasBids && auction ? auction.highestBid + minIncrement : (auction?.reservePrice ?? 0n);
  const minNextBidFormatted = formatEther(minNextBid);

  // Quick preset bid helper
  const handleSetPresetBid = (percentage: number) => {
    const base = minNextBid;
    const additional = (base * BigInt(percentage)) / 100n;
    const total = base + additional;
    setBidAmount(formatEther(total));
  };

  // Place Bid action
  const handlePlaceBid = () => {
    setTxError(null);
    if (!bidAmount || isNaN(Number(bidAmount))) {
      setTxError('Please enter a valid bid amount.');
      return;
    }

    try {
      const parsed = parseEther(bidAmount);
      if (parsed < minNextBid) {
        setTxError(`Bid must be at least ${minNextBidFormatted} BOT.`);
        return;
      }

      writeContract({
        address: CONTRACT_ADDRESSES.lightbid,
        abi: CONTRACT_ABIS.Lightbid,
        functionName: 'placeBid',
        args: [auctionId],
        value: parsed,
      });
    } catch (err: any) {
      setTxError(err?.message || 'Failed to parse bid value.');
    }
  };

  // Settle Auction action
  const handleSettle = () => {
    setTxError(null);
    writeContract({
      address: CONTRACT_ADDRESSES.lightbid,
      abi: CONTRACT_ABIS.Lightbid,
      functionName: 'settle',
      args: [auctionId],
    });
  };

  // Cancel Auction action (seller only, no bids)
  const handleCancel = () => {
    setTxError(null);
    writeContract({
      address: CONTRACT_ADDRESSES.lightbid,
      abi: CONTRACT_ABIS.Lightbid,
      functionName: 'cancelAuction',
      args: [auctionId],
    });
  };

  const isSeller = address && auction && auction.seller.toLowerCase() === address.toLowerCase();
  const isHighestBidder = address && auction && auction.highestBidder.toLowerCase() === address.toLowerCase();
  const explorerUrl = APP_CONFIG.network.blockExplorerUrl;

  if (isLoadingAuction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
        <p className="text-slate-400 text-sm">Loading auction #{id} details from Botchain...</p>
      </div>
    );
  }

  if (!auction || auction.seller === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-center mx-auto text-slate-500">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Auction Not Found</h2>
        <p className="text-slate-400 text-sm">Auction #{id} does not exist on Botchain.</p>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-brand-400 text-sm font-semibold border border-dark-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Auctions</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Media & Attributes (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-3xl p-4 overflow-hidden border border-dark-800 relative bg-dark-900/60 shadow-2xl">
            <div className="aspect-square w-full rounded-2xl bg-dark-950 overflow-hidden flex items-center justify-center border border-dark-800 relative">
              {isErc721 ? (
                nftMetadata.image ? (
                  <img
                    src={nftMetadata.image}
                    alt={nftMetadata.name || `Token #${auction.tokenId}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                    <Gavel className="w-16 h-16 text-slate-700" />
                    <span className="text-sm font-mono">Token #{auction.tokenId.toString()}</span>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-20 h-20 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                    <Coins className="w-10 h-10" />
                  </div>
                  <div className="text-xl font-bold text-white">
                    {auction.assetType === AssetType.ERC20 ? 'ERC-20 Asset' : 'ERC-1155 Multi-Token'}
                  </div>
                  <div className="text-sm text-brand-400 font-mono">
                    {auction.assetType === AssetType.ERC20
                      ? `${(Number(auction.amount) / 1e6).toLocaleString()} Units`
                      : `Token ID: ${auction.tokenId.toString()} (Qty: ${auction.amount.toString()})`}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Traits / Attributes if available */}
          {nftMetadata.attributes && nftMetadata.attributes.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 border border-dark-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-brand-400" />
                <span>Attributes & Traits</span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {nftMetadata.attributes.map((attr, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-dark-900 border border-dark-800 text-xs text-center space-y-0.5"
                  >
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      {attr.trait_type}
                    </span>
                    <span className="font-bold text-white truncate block">{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contract Specs */}
          <div className="glass-panel rounded-2xl p-5 border border-dark-800 space-y-3 text-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Contract Details</span>
            </h4>
            <div className="space-y-2 text-slate-400">
              <div className="flex justify-between items-center py-1 border-b border-dark-800">
                <span>Asset Contract:</span>
                <a
                  href={`${explorerUrl}/address/${auction.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-brand-400 hover:underline flex items-center gap-1"
                >
                  {auction.token.slice(0, 8)}...{auction.token.slice(-6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-dark-800">
                <span>Token ID:</span>
                <span className="font-mono text-white">#{auction.tokenId.toString()}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-dark-800">
                <span>Asset Standard:</span>
                <span className="font-semibold text-slate-200">
                  {isErc721 ? 'ERC-721' : auction.assetType === AssetType.ERC20 ? 'ERC-20' : 'ERC-1155'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Payment Token:</span>
                <span className="text-brand-400 font-semibold">BOT (Native)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Details, Bid Form, State (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header & Title */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border ${
                  isSettled
                    ? 'bg-zinc-900 text-zinc-400 border-zinc-700'
                    : isCancelled
                    ? 'bg-rose-950 text-rose-400 border-rose-800'
                    : isEnded
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : 'bg-brand-950 text-brand-400 border-brand-500/40'
                }`}
              >
                {isSettled
                  ? 'Settled'
                  : isCancelled
                  ? 'Cancelled'
                  : isEnded
                  ? 'Auction Ended'
                  : 'Live Auction'}
              </span>
              <span className="text-xs font-mono text-slate-500">Auction #{auction.id.toString()}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {nftMetadata.name ||
                (isErc721
                  ? `NFT #${auction.tokenId.toString()}`
                  : `Asset Bundle #${auction.id.toString()}`)}
            </h1>

            {nftMetadata.description && (
              <p className="text-sm text-slate-300 leading-relaxed pt-1">{nftMetadata.description}</p>
            )}

            {/* Seller & Winner row */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Seller:</span>
                <a
                  href={`${explorerUrl}/address/${auction.seller}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-slate-200 hover:text-brand-400"
                >
                  {auction.seller.slice(0, 6)}...{auction.seller.slice(-4)}
                </a>
              </div>

              {hasBids && (
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <Gavel className="w-3.5 h-3.5 text-brand-400" />
                  <span>Highest Bidder:</span>
                  <a
                    href={`${explorerUrl}/address/${auction.highestBidder}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-slate-200 hover:text-brand-400"
                  >
                    {auction.highestBidder.slice(0, 6)}...{auction.highestBidder.slice(-4)}
                  </a>
                  {isHighestBidder && (
                    <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-bold text-[10px]">
                      You
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pricing & Countdown Panel */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-dark-800 space-y-6 bg-gradient-to-br from-dark-900 to-dark-850">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                  {hasBids ? 'Current Highest Bid' : 'Reserve Starting Price'}
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono flex items-baseline gap-2 mt-1">
                  <span>{formatEther(currentPrice)}</span>
                  <span className="text-base font-sans font-bold text-brand-400">BOT</span>
                </div>
                {hasBids && (
                  <span className="text-xs text-slate-500 mt-1 block">
                    Min increment: {(Number(auction.minIncrementBps) / 100).toFixed(1)}% (
                    {formatEther(minIncrement)} BOT)
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                  Time Remaining
                </span>
                <CountdownTimer endTime={auction.endTime} onExpire={() => refetchAuction()} />
              </div>
            </div>

            {/* Anti-snipe Banner */}
            <div className="p-3.5 rounded-2xl bg-dark-950/70 border border-dark-700/80 flex items-start space-x-3 text-xs text-slate-300">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Anti-Snipe Protection:</strong> Any bid placed during the final 15 minutes automatically extends the auction by an extra 15 minutes, guaranteeing every bidder fair time to react.
              </div>
            </div>

            {/* Bidding Interface (If Live) */}
            {isActive && (
              <div className="pt-4 border-t border-dark-800 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label className="font-semibold text-slate-300">Place Your Bid</label>
                    <span className="text-slate-400">
                      Minimum required: <strong className="text-white font-mono">{minNextBidFormatted} BOT</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.001"
                        placeholder={`e.g. ${minNextBidFormatted}`}
                        value={bidAmount}
                        onChange={(e) => {
                          setBidAmount(e.target.value);
                          setTxError(null);
                        }}
                        className="w-full rounded-xl bg-dark-950 border border-dark-700 px-4 py-3 text-base text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-400">
                        BOT
                      </span>
                    </div>

                    <button
                      onClick={handlePlaceBid}
                      disabled={isTxPending || isTxConfirming || !isConnected}
                      className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 shrink-0 flex items-center space-x-2"
                    >
                      {isTxPending || isTxConfirming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Gavel className="w-4 h-4" />
                          <span>Place Bid</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Bid Preset Buttons */}
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500">Quick Bids:</span>
                  <button
                    onClick={() => setBidAmount(minNextBidFormatted)}
                    className="px-2.5 py-1 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-700 text-slate-300 font-mono"
                  >
                    Min ({minNextBidFormatted})
                  </button>
                  <button
                    onClick={() => handleSetPresetBid(5)}
                    className="px-2.5 py-1 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-700 text-slate-300 font-mono"
                  >
                    +5%
                  </button>
                  <button
                    onClick={() => handleSetPresetBid(10)}
                    className="px-2.5 py-1 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-700 text-slate-300 font-mono"
                  >
                    +10%
                  </button>
                  <button
                    onClick={() => handleSetPresetBid(25)}
                    className="px-2.5 py-1 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-700 text-slate-300 font-mono"
                  >
                    +25%
                  </button>
                </div>

                {isHighestBidder && (
                  <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-brand-400" />
                    <span>You are currently the highest bidder on this auction!</span>
                  </div>
                )}
              </div>
            )}

            {/* Settle Action (If Ended & Not Settled) */}
            {isEnded && !isSettled && !isCancelled && (
              <div className="pt-4 border-t border-dark-800 space-y-3">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                  <div className="font-bold text-white text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Auction Timer Expired</span>
                  </div>
                  <p>
                    {hasBids
                      ? `Highest bidder (${auction.highestBidder.slice(0, 6)}...${auction.highestBidder.slice(-4)}) wins this asset for ${formatEther(auction.highestBid)} BOT. Anyone can trigger settlement.`
                      : 'No bids were placed on this auction. Settlement will return the asset back to the seller.'}
                  </p>
                </div>

                <button
                  onClick={handleSettle}
                  disabled={isTxPending || isTxConfirming || !isConnected}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 font-extrabold text-sm uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
                >
                  {isTxPending || isTxConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Settling Auction Onchain...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Settle Auction & Distribute Asset</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Cancel Auction (Seller Only, 0 Bids, Active) */}
            {isSeller && !hasBids && !isSettled && !isCancelled && (
              <div className="pt-4 border-t border-dark-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  No bids placed yet. You can cancel and retrieve your asset.
                </span>
                <button
                  onClick={handleCancel}
                  disabled={isTxPending || isTxConfirming}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 transition-all"
                >
                  Cancel Auction
                </button>
              </div>
            )}

            {/* Error Message */}
            {txError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{txError}</span>
              </div>
            )}

            {/* Tx Success Notification */}
            {isTxSuccess && (
              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
                  <span>Transaction confirmed on Botchain!</span>
                </div>
                {txHash && (
                  <a
                    href={`${explorerUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-mono text-[11px] hover:text-white"
                  >
                    View TX
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
