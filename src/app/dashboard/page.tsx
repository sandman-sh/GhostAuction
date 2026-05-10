'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import AuctionCard from '@/components/auction/AuctionCard';
import { useAuctionStore, useUserStore } from '@/lib/stores';

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const balance = useUserStore((s) => s.balance);
  const auctions = useAuctionStore((s) => s.auctions);

  if (!connected || !publicKey) {
    return (
      <div className="container-ghost py-12">
        <div className="neu-card p-16 text-center max-w-lg mx-auto">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="font-heading text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="font-mono text-sm text-[var(--text-primary)]/50">
            Connect your wallet to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  const walletAddress = publicKey.toBase58();
  const myAuctions = auctions.filter((a) => a.seller === walletAddress);
  const liveAuctions = auctions.filter((a) => a.state === 'bidding');
  const revealAuctions = auctions.filter((a) => a.state === 'reveal');
  const recentAuctions = [...auctions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  const totalVolume = auctions
    .filter((a) => a.state === 'finalized')
    .reduce((sum, a) => sum + a.highestBid, 0);

  return (
    <div className="container-ghost py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-heading text-4xl font-black mb-8">
          Dash<span className="text-[var(--accent-green)]">board</span>
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Balance', value: `◎ ${balance.toFixed(2)}`, color: 'var(--accent-green)' },
            { label: 'My Auctions', value: myAuctions.length.toString(), color: 'var(--accent-purple)' },
            { label: 'Live Now', value: liveAuctions.length.toString(), color: 'var(--accent-green)' },
            { label: 'Total Volume', value: `◎ ${(totalVolume / 1e9).toFixed(2)}`, color: 'var(--accent-purple)' },
          ].map((stat) => (
            <div key={stat.label} className="neu-card p-6 text-center">
              <div className="font-mono text-3xl font-bold mb-1" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="font-mono text-xs text-[var(--text-primary)]/40 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Sections */}
        {liveAuctions.length > 0 && (
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-[var(--accent-green)] rounded-full pulse-glow" />
              Live Auctions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveAuctions.slice(0, 6).map((a, i) => (
                <AuctionCard key={a.address} auction={a} index={i} />
              ))}
            </div>
          </section>
        )}

        {revealAuctions.length > 0 && (
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-[var(--accent-purple)] rounded-full pulse-glow" />
              Reveal Phase
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {revealAuctions.slice(0, 6).map((a, i) => (
                <AuctionCard key={a.address} auction={a} index={i} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-heading text-2xl font-bold mb-4">
            Recent Activity
          </h2>
          {recentAuctions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentAuctions.map((a, i) => (
                <AuctionCard key={a.address} auction={a} index={i} />
              ))}
            </div>
          ) : (
            <div className="neu-card p-12 text-center">
              <p className="font-mono text-sm text-[var(--text-primary)]/40">
                No recent activity. Create an auction to get started!
              </p>
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
}
