'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import AuctionCard from '@/components/auction/AuctionCard';
import { useAuctionStore, AuctionData } from '@/lib/stores';
import { getConnection, getAuctionPhase } from '@/lib/solana';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'bidding', label: 'Live Bidding' },
  { value: 'reveal', label: 'Reveal Phase' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'finalized', label: 'Completed' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'ending', label: 'Ending Soon' },
  { value: 'bids', label: 'Most Bids' },
  { value: 'price', label: 'Highest Reserve' },
];

export default function ExplorePage() {
  const auctions = useAuctionStore((s) => s.auctions);
  const loading = useAuctionStore((s) => s.loading);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch all auctions globally from the blockchain
  useEffect(() => {
    async function fetchAllAuctions() {
      try {
        const { getAnchorProgram } = await import('@/lib/solana');
        const { PublicKey, Transaction } = await import('@solana/web3.js');
        const dummyWallet = { 
          publicKey: PublicKey.default, 
          signTransaction: async () => new Transaction(), 
          signAllTransactions: async () => [] 
        };
        const program = getAnchorProgram(dummyWallet);
        const onChainAuctions = await program.account.auction.all();
        
        // Merge with local store data
        let finalAuctions: any[] = [];
        useAuctionStore.setState((s) => {
          const merged = new Map(s.auctions.map(a => [a.address, a]));
          
          for (const acc of onChainAuctions) {
            const address = acc.publicKey.toBase58();
            const existing = merged.get(address);
            merged.set(address, {
              address,
              seller: acc.account.seller.toBase58(),
              nftMint: acc.account.nftMint.toBase58(),
              reservePrice: acc.account.reservePrice.toNumber(),
              startTime: acc.account.startTime.toNumber(),
              biddingEndTime: acc.account.biddingEndTime.toNumber(),
              revealEndTime: acc.account.revealEndTime.toNumber(),
              highestBid: acc.account.highestBid.toNumber(),
              highestBidder: acc.account.highestBidder.toBase58(),
              totalBids: acc.account.totalBids,
              revealedBids: acc.account.revealedBids,
              state: Object.keys(acc.account.state)[0].toLowerCase(),
              createdAt: acc.account.createdAt.toNumber(),
              // Preserve locally cached NFT metadata if we have it
              nftName: existing?.nftName,
              nftImage: existing?.nftImage,
            });
          }
          finalAuctions = Array.from(merged.values());
          return { auctions: finalAuctions };
        });

        // Async fetch missing metadata for any new auctions found on chain
        const missingMetadata = finalAuctions.filter(a => !a.nftImage || !a.nftName);
        for (const auction of missingMetadata) {
          fetch(`/api/nft/${auction.nftMint}`)
            .then(res => res.json())
            .then(data => {
              if (data.name || data.image) {
                useAuctionStore.getState().updateAuction(auction.address, {
                  nftName: data.name || auction.nftName,
                  nftImage: data.image || auction.nftImage
                });
              }
            })
            .catch(err => console.error("Failed to fetch NFT metadata:", err));
        }
      } catch (err) {
        console.error("Failed to fetch global auctions:", err);
      }
    }
    
    if (mounted) {
      fetchAllAuctions();
    }
  }, [mounted]);

  const filteredAuctions = auctions
    .filter((a) => {
      if (filter === 'all') return true;
      const phase = getAuctionPhase({
        startTime: a.startTime,
        biddingEndTime: a.biddingEndTime,
        revealEndTime: a.revealEndTime,
        state: { [a.state]: {} },
      });
      return phase === filter;
    })
    .filter((a) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        a.address.toLowerCase().includes(s) ||
        a.nftMint.toLowerCase().includes(s) ||
        a.seller.toLowerCase().includes(s) ||
        (a.nftName && a.nftName.toLowerCase().includes(s))
      );
    })
    .sort((a, b) => {
      switch (sort) {
        case 'ending':
          return a.biddingEndTime - b.biddingEndTime;
        case 'bids':
          return b.totalBids - a.totalBids;
        case 'price':
          return b.reservePrice - a.reservePrice;
        default:
          return b.createdAt - a.createdAt;
      }
    });

  return (
    <div className="container-ghost py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-black mb-2">
            Explore <span className="text-[var(--accent-green)]">Auctions</span>
          </h1>
          <p className="font-mono text-sm text-[var(--text-primary)]/50">
            Discover and bid on sealed-bid NFT auctions
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, address, or seller..."
            className="neu-input max-w-lg"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-4 py-2 border-3 font-heading font-semibold text-xs uppercase tracking-wide transition-all ${
                  filter === opt.value
                    ? 'bg-[var(--accent-green)] text-black border-black shadow-[3px_3px_0px_#000]'
                    : 'border-[var(--border-color)] hover:border-[var(--accent-green)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="neu-input py-2 pr-8 text-xs font-mono"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading || !mounted ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="neu-card overflow-hidden">
                <div className="aspect-square skeleton" />
                <div className="p-4 space-y-3">
                  <div className="h-5 skeleton w-2/3" />
                  <div className="h-4 skeleton w-1/2" />
                  <div className="h-4 skeleton w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAuctions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAuctions.map((auction, i) => (
              <AuctionCard key={auction.address} auction={auction} index={i} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="neu-card p-16 text-center"
          >
            <div className="text-6xl mb-4">👻</div>
            <h3 className="font-heading font-bold text-xl mb-2">No Auctions Found</h3>
            <p className="font-mono text-sm text-[var(--text-primary)]/40 mb-6">
              {search
                ? 'Try a different search term'
                : 'Be the first to create an auction!'}
            </p>
            <a href="/create" className="neu-btn neu-btn-green">
              Create Auction
            </a>
          </motion.div>
        )}

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Auctions', value: auctions.length.toString(), color: 'var(--accent-green)' },
            { label: 'Live Now', value: auctions.filter(a => a.state === 'bidding').length.toString(), color: 'var(--accent-green)' },
            { label: 'In Reveal', value: auctions.filter(a => a.state === 'reveal').length.toString(), color: 'var(--accent-purple)' },
            { label: 'Completed', value: auctions.filter(a => a.state === 'finalized').length.toString(), color: '#666' },
          ].map((stat) => (
            <div key={stat.label} className="neu-card p-4 text-center">
              <div className="font-mono text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="font-mono text-xs text-[var(--text-primary)]/40 uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
