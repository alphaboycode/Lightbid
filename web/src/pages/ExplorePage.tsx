import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReadContract, useReadContracts } from 'wagmi';
import {
  Gavel,
  Search,
  Filter,
  Sparkles,
  Layers,
  ArrowUpDown,
  HelpCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, Auction, AssetType, AuctionStatus } from '../config/contracts';
import { AuctionCard } from '../components/AuctionCard';

export const ExplorePage: React.FC = () => {
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'endingSoon' | 'priceAsc' | 'priceDesc'>('recent');

  // 1. Fetch total auctions count from Lightbid contract
  const {
    data: totalAuctionsData,
    isLoading: isLoadingTotal,
    refetch: refetchTotal,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.lightbid,
    abi: CONTRACT_ABIS.Lightbid,
    functionName: 'totalAuctions',
    query: {
      refetchInterval: 10_000,
    },
  });

  const totalCount = totalAuctionsData ? Number(totalAuctionsData as bigint) : 0;

  // 2. Build multi-call to fetch all auctions by ID [1 ... totalCount]
  const auctionCalls = useMemo(() => {
    if (totalCount <= 0) return [];
    return Array.from({ length: totalCount }, (_, i) => ({
      address: CONTRACT_ADDRESSES.lightbid,
      abi: CONTRACT_ABIS.Lightbid,
      functionName: 'getAuction',
      args: [BigInt(i + 1)],
    }));
  }, [totalCount]);

  const {
    data: auctionsData,
    isLoading: isLoadingAuctions,
    refetch: refetchAuctions,
  } = useReadContracts({
    contracts: auctionCalls as any,
    query: {
      enabled: auctionCalls.length > 0,
      refetchInterval: 10_000,
    },
  });

  // Parse raw auction structs
  const allAuctions: Auction[] = useMemo(() => {
    if (!auctionsData) return [];
    return auctionsData
      .map((item, idx) => {
        if (!item.result) return null;
        const res = item.result as any;
        return {
          id: BigInt(res.id ?? idx + 1),
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
        } as Auction;
      })
      .filter((a): a is Auction => a !== null);
  }, [auctionsData]);

  // Filter & Sort
  const filteredAuctions = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);

    return allAuctions
      .filter((auction) => {
        // Status filter
        if (selectedStatus === 'active') {
          if (auction.status !== AuctionStatus.Active) return false;
          if (Number(auction.endTime) <= now) return false; // not expired
        } else if (selectedStatus === 'readyToSettle') {
          if (auction.status !== AuctionStatus.Active) return false;
          if (Number(auction.endTime) > now) return false; // expired
        } else if (selectedStatus === 'settled') {
          if (auction.status !== AuctionStatus.Settled) return false;
        } else if (selectedStatus === 'cancelled') {
          if (auction.status !== AuctionStatus.Cancelled) return false;
        }

        // Asset Type filter
        if (selectedAssetType === 'erc721' && auction.assetType !== AssetType.ERC721) return false;
        if (selectedAssetType === 'erc1155' && auction.assetType !== AssetType.ERC1155) return false;
        if (selectedAssetType === 'erc20' && auction.assetType !== AssetType.ERC20) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchToken = auction.token.toLowerCase().includes(q);
          const matchId = auction.id.toString() === q || `#${auction.id}` === q;
          const matchSeller = auction.seller.toLowerCase().includes(q);
          if (!matchToken && !matchId && !matchSeller) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return Number(b.id - a.id);
        }
        if (sortBy === 'endingSoon') {
          return Number(a.endTime - b.endTime);
        }
        if (sortBy === 'priceAsc') {
          const priceA = a.highestBid > 0n ? a.highestBid : a.reservePrice;
          const priceB = b.highestBid > 0n ? b.highestBid : b.reservePrice;
          return priceA < priceB ? -1 : 1;
        }
        if (sortBy === 'priceDesc') {
          const priceA = a.highestBid > 0n ? a.highestBid : a.reservePrice;
          const priceB = b.highestBid > 0n ? b.highestBid : b.reservePrice;
          return priceA > priceB ? -1 : 1;
        }
        return 0;
      });
  }, [allAuctions, selectedStatus, selectedAssetType, searchQuery, sortBy]);

  const isLoading = isLoadingTotal || isLoadingAuctions;

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 sm:p-12 border border-brand-500/20 bg-gradient-to-br from-dark-900 via-dark-850 to-brand-950/30">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span>Live on Botchain Testnet</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Every bid counts. <span className="text-brand-400">Every auction ends fair.</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Auction NFTs and tokens on Botchain. Last-minute bids extend the clock, and outbid funds are always yours to withdraw.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-dark-900 border border-dark-800 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setSelectedStatus('active')}
              className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
                selectedStatus === 'active'
                  ? 'bg-brand-500 text-dark-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Auctions
            </button>
            <button
              onClick={() => setSelectedStatus('readyToSettle')}
              className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
                selectedStatus === 'readyToSettle'
                  ? 'bg-amber-500 text-dark-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ready to Settle
            </button>
            <button
              onClick={() => setSelectedStatus('settled')}
              className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
                selectedStatus === 'settled'
                  ? 'bg-dark-700 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Settled
            </button>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
                selectedStatus === 'all'
                  ? 'bg-dark-700 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Auctions
            </button>
          </div>

          {/* Search Input & Sorter */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by token, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-dark-900 border border-dark-800 rounded-xl px-2 py-1.5 text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="recent">Most Recent</option>
                <option value="endingSoon">Ending Soonest</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
              </select>
            </div>

            <button
              onClick={() => {
                refetchTotal();
                refetchAuctions();
              }}
              title="Refresh Auctions"
              className="p-2 rounded-xl bg-dark-900 border border-dark-800 hover:bg-dark-800 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Asset Type Sub-Filters */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Asset:</span>
          {[
            { id: 'all', label: 'All Types' },
            { id: 'erc721', label: 'ERC-721 NFTs' },
            { id: 'erc1155', label: 'ERC-1155' },
            { id: 'erc20', label: 'ERC-20 Tokens' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedAssetType(type.id)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedAssetType === type.id
                  ? 'bg-dark-800 text-brand-400 border border-brand-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auctions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rounded-2xl glass-panel p-4 space-y-4 animate-pulse">
              <div className="aspect-square w-full rounded-xl bg-dark-800" />
              <div className="h-4 bg-dark-800 rounded w-2/3" />
              <div className="h-3 bg-dark-800 rounded w-1/2" />
              <div className="pt-3 border-t border-dark-800 flex justify-between">
                <div className="h-5 bg-dark-800 rounded w-16" />
                <div className="h-5 bg-dark-800 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAuctions.length === 0 ? (
        <div className="rounded-2xl glass-panel p-12 text-center space-y-4 border border-dashed border-dark-700">
          <div className="w-14 h-14 rounded-2xl bg-dark-850 flex items-center justify-center mx-auto text-slate-500">
            <Gavel className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No auctions found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {totalCount === 0
                ? 'Be the very first to launch an auction on Lightbid! You can mint a test NFT with Pinata IPFS or list any token.'
                : 'No auctions match your current filters. Try changing your status or search terms.'}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center space-x-3">
            <Link
              to="/mint"
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold text-xs"
            >
              Mint & List an NFT
            </Link>
            <Link
              to="/create"
              className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-white font-medium text-xs border border-dark-700"
            >
              Create Auction
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAuctions.map((auction) => (
            <AuctionCard key={auction.id.toString()} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
};
