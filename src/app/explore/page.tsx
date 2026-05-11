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
    fetchAllAuctions();
  }, []);

  const fetchAllAuctions = async () => {
    try {
      const { getAnchorProgram } = await import('@/lib/solana');
      const { PublicKey, Transaction } = await import('@solana/web3.js');
      
      const dummyWallet = { 
        publicKey: new PublicKey('11111111111111111111111111111111'), 
        signTransaction: async () => new Transaction(), 
        signAllTransactions: async () => [] 
      };
      const program = getAnchorProgram(dummyWallet);
      
      const auctionAccounts = await program.account.auction.all();
      
      const onChainAuctions: AuctionData[] = auctionAccounts.map(account => ({
        address: account.publicKey.toBase58(),
        seller: account.account.seller.toBase58(),
        nftMint: account.account.nftMint.toBase58(),
        reservePrice: account.account.reservePrice.toNumber(),
        startTime: account.account.startTime.toNumber(),
        biddingEndTime: account.account.biddingEndTime.toNumber(),
        revealEndTime: account.account.revealEndTime.toNumber(),
        highestBid: account.account.highestBid.toNumber(),
        highestBidder: account.account.highestBidder.toBase58(),
        totalBids: account.account.totalBids,
        revealedBids: account.account.revealedBids,
        state: Object.keys(account.account.state)[0].toLowerCase(),
        createdAt: account.account.createdAt.toNumber(),
      }));

      // Merge with existing local auctions (to preserve nftName/nftImage)
      const store = useAuctionStore.getState();
      const mergedAuctions = [...store.auctions];
      
      for (const onChain of onChainAuctions) {
        const existingIdx = mergedAuctions.findIndex(a => a.address === onChain.address);
        if (existingIdx >= 0) {
          mergedAuctions[existingIdx] = { ...mergedAuctions[existingIdx], ...onChain };
        } else {
          mergedAuctions.push(onChain);
        }
      }
      
      store.setAuctions(mergedAuctions);
    } catch (err) {
      console.error('Failed to fetch on-chain auctions:', err);
    }
  };

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
