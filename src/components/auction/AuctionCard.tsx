'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import CountdownTimer from '@/components/ui/CountdownTimer';
import { type AuctionData, useUIStore } from '@/lib/stores';
import { lamportsToSol, getAuctionPhase } from '@/lib/solana';
import { shortenAddress, getAnonymousAlias } from '@/lib/constants';

interface AuctionCardProps {
  auction: AuctionData;
  index?: number;
}

export default function AuctionCard({ auction, index = 0 }: AuctionCardProps) {
  const ghostMode = useUIStore((s) => s.ghostMode);
  const now = Math.floor(Date.now() / 1000);

  const phase = getAuctionPhase({
    startTime: auction.startTime,
    biddingEndTime: auction.biddingEndTime,
    revealEndTime: auction.revealEndTime,
    state: { [auction.state]: {} },
  });

  const phaseColors = {
    upcoming: 'bg-[var(--color-neon-orange)] text-black',
    bidding: 'bg-[var(--accent-green)] text-black',
    reveal: 'bg-[var(--accent-purple)] text-white',
    finalized: 'bg-[var(--ghost-gray)] text-white',
    cancelled: 'bg-red-500 text-white',
  };

  const countdownTarget = phase === 'bidding' ? auction.biddingEndTime :
    phase === 'reveal' ? auction.revealEndTime : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link href={`/auction/${auction.address}`}>
        <div className="neu-card overflow-hidden group cursor-pointer">
          {/* NFT Image */}
          <div className="relative aspect-square bg-gradient-to-br from-[var(--accent-green)]/10 to-[var(--accent-purple)]/10 overflow-hidden">
            {auction.nftImage ? (
              <img
                src={auction.nftImage}
                alt={auction.nftName || 'NFT'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">
                👻
              </div>
            )}
            {/* Phase Badge */}
            <div className={`absolute top-3 left-3 neu-badge ${phaseColors[phase]}`}>
              {phase === 'bidding' && '● '}{phase.toUpperCase()}
            </div>
            {/* Bid Count */}
            <div className="absolute top-3 right-3 neu-badge bg-black/80 text-white">
              {auction.totalBids} bids
            </div>
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-heading font-bold text-lg truncate group-hover:text-[var(--accent-green)] transition-colors">
                {auction.nftName || `Auction #${auction.address.slice(0, 6)}`}
              </h3>
              <p className="font-mono text-xs text-[var(--text-primary)]/40">
                by {ghostMode ? getAnonymousAlias(auction.seller) : shortenAddress(auction.seller)}
              </p>
            </div>

            {/* Reserve Price */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[var(--text-primary)]/50">Reserve</span>
              <span className="font-mono font-bold text-[var(--accent-green)]">
                ◎ {lamportsToSol(auction.reservePrice).toFixed(2)}
              </span>
            </div>

            {/* Countdown */}
            {countdownTarget > now && (
              <CountdownTimer
                targetTimestamp={countdownTarget}
                label={phase === 'bidding' ? 'Bidding ends' : 'Reveal ends'}
                size="sm"
              />
            )}

            {/* Highest Bid (only after reveal) */}
            {phase === 'finalized' && auction.highestBid > 0 && (
              <div className="flex items-center justify-between pt-2 border-t-2 border-[var(--border-color)]">
                <span className="font-mono text-xs text-[var(--text-primary)]/50">Winning Bid</span>
                <span className="font-mono font-bold text-[var(--accent-purple)]">
                  ◎ {lamportsToSol(auction.highestBid).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
