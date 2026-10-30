import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatEther } from 'viem';
import { useReadContract } from 'wagmi';
import { Image, Layers, DollarSign, ArrowUpRight, ShieldCheck, Flame } from 'lucide-react';
import { Auction, AssetType, AuctionStatus, CONTRACT_ABIS } from '../config/contracts';
import { CountdownTimer } from './CountdownTimer';
import { resolveIpfsUrl } from '../lib/ipfs';

interface AuctionCardProps {
  auction: Auction;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({ auction }) => {
  const [nftMetadata, setNftMetadata] = useState<{
    name?: string;
    image?: string;
    description?: string;
  }>({});
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // If ERC-721, read tokenURI
  const isErc721 = auction.assetType === AssetType.ERC721;
  const isErc20 = auction.assetType === AssetType.ERC20;
  const isErc1155 = auction.assetType === AssetType.ERC1155;

  const { data: tokenUriData } = useReadContract({
    address: auction.token,
    abi: CONTRACT_ABIS.TestERC721,
    functionName: 'tokenURI',
    args: isErc721 ? [auction.tokenId] : undefined,
    query: {
      enabled: isErc721,
    },
  });

  useEffect(() => {
    if (!tokenUriData || typeof tokenUriData !== 'string') return;

    const fetchMetadata = async () => {
      try {
        setLoadingMetadata(true);
        const resolvedUrl = resolveIpfsUrl(tokenUriData);
        const res = await fetch(resolvedUrl);
        if (res.ok) {
          const data = await res.json();
          setNftMetadata({
            name: data.name,
            image: data.image ? resolveIpfsUrl(data.image) : undefined,
            description: data.description,
          });
        }
      } catch (err) {
        console.error('Failed to load NFT metadata for auction #', auction.id, err);
      } finally {
        setLoadingMetadata(false);
      }
    };

    fetchMetadata();
  }, [tokenUriData, auction.id]);

  const hasBids = auction.highestBid > 0n;
  const currentPrice = hasBids ? auction.highestBid : auction.reservePrice;
  const now = Math.floor(Date.now() / 1000);
  const isEnded = Number(auction.endTime) <= now;
  const isSettled = auction.status === AuctionStatus.Settled;
  const isCancelled = auction.status === AuctionStatus.Cancelled;

  // Calculate next min bid if active
  const minIncrement = hasBids
    ? (auction.highestBid * auction.minIncrementBps) / 10000n
    : 0n;
  const minNextBid = hasBids ? auction.highestBid + minIncrement : auction.reservePrice;

  return (
    <Link
      to={`/auction/${auction.id.toString()}`}
      className="group flex flex-col rounded-2xl glass-panel glass-panel-hover overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:border-brand-500/40"
    >
      {/* Top Media / Thumbnail */}
      <div className="relative aspect-square w-full bg-dark-900 overflow-hidden flex items-center justify-center border-b border-dark-800">
        {isErc721 ? (
          nftMetadata.image ? (
            <img
              src={nftMetadata.image}
              alt={nftMetadata.name || `Token #${auction.tokenId}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
              <Image className="w-12 h-12 text-slate-600 animate-pulse" />
              <span className="text-xs font-mono">Token #{auction.tokenId.toString()}</span>
            </div>
          )
        ) : isErc20 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">ERC-20 Tokens</div>
              <div className="text-xs text-brand-400 font-mono mt-1">
                {(Number(auction.amount) / 1e6).toLocaleString()} Units
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">ERC-1155 Multi-Token</div>
              <div className="text-xs text-purple-400 font-mono mt-1">
                Amount: {auction.amount.toString()}
              </div>
            </div>
          </div>
        )}

        {/* Status & Asset Type Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase backdrop-blur-md border ${
              isSettled
                ? 'bg-zinc-900/80 text-zinc-300 border-zinc-700'
                : isCancelled
                ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                : isEnded
                ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                : 'bg-brand-950/80 text-brand-400 border-brand-600/40'
            }`}
          >
            {isSettled
              ? 'Settled'
              : isCancelled
              ? 'Cancelled'
              : isEnded
              ? 'Ready to Settle'
              : 'Live Auction'}
          </span>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-dark-950/80 text-slate-300 border border-dark-700 backdrop-blur-md">
            {isErc721 ? 'ERC-721' : isErc20 ? 'ERC-20' : 'ERC-1155'}
          </span>
        </div>

        {/* Auction ID */}
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-dark-950/80 text-slate-300 border border-dark-700 backdrop-blur-md">
          #{auction.id.toString()}
        </div>

        {/* Countdown Floating Pill */}
        {!isSettled && !isCancelled && (
          <div className="absolute bottom-3 right-3 z-10">
            <CountdownTimer endTime={auction.endTime} compact={true} />
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 justify-between space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base text-white truncate group-hover:text-brand-400 transition-colors">
              {nftMetadata.name ||
                (isErc721
                  ? `NFT #${auction.tokenId.toString()}`
                  : isErc20
                  ? `ERC-20 Bundle`
                  : `Multi-Token #${auction.tokenId.toString()}`)}
            </h3>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
          </div>

          <p className="text-xs text-slate-400 line-clamp-1 mt-1 font-mono">
            Token: {auction.token.slice(0, 8)}...{auction.token.slice(-6)}
          </p>
        </div>

        {/* Price & Bidding Information */}
        <div className="pt-3 border-t border-dark-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
              {hasBids ? 'Highest Bid' : 'Reserve Price'}
            </span>
            <div className="text-base font-extrabold text-white font-mono flex items-center gap-1">
              <span>{formatEther(currentPrice)}</span>
              <span className="text-xs text-brand-400 font-sans font-bold">BOT</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
              {hasBids ? 'Min Next Bid' : 'Starting At'}
            </span>
            <span className="text-xs font-mono text-slate-300">
              {formatEther(minNextBid)} BOT
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
