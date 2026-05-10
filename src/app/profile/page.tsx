'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuctionStore, useUserStore, useUIStore } from '@/lib/stores';
import { getConnection, lamportsToSol } from '@/lib/solana';
import { shortenAddress, getAnonymousAlias, getExplorerUrl } from '@/lib/constants';
import AuctionCard from '@/components/auction/AuctionCard';

export default function ProfilePage() {
  const { publicKey, connected } = useWallet();
  const balance = useUserStore((s) => s.balance);
  const snsName = useUserStore((s) => s.snsName);
  const ghostMode = useUIStore((s) => s.ghostMode);
  const auctions = useAuctionStore((s) => s.auctions);
  const [nfts, setNfts] = useState<Array<{ mint: string; amount: number }>>([]);
  const [tab, setTab] = useState<'created' | 'won' | 'nfts'>('created');

  useEffect(() => {
    if (!publicKey) return;
    const fetchNfts = async () => {
      try {
        const connection = getConnection();
        const tokens = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });
        const nftList = tokens.value
          .filter((t) => t.account.data.parsed.info.tokenAmount.decimals === 0 && t.account.data.parsed.info.tokenAmount.uiAmount === 1)
          .map((t) => ({
            mint: t.account.data.parsed.info.mint,
            amount: t.account.data.parsed.info.tokenAmount.uiAmount,
          }));
        setNfts(nftList);
      } catch (e) {
        console.error('Error fetching NFTs:', e);
      }
    };
    fetchNfts();
  }, [publicKey]);

  if (!connected || !publicKey) {
    return (
      <div className="container-ghost py-12">
        <div className="neu-card p-16 text-center max-w-lg mx-auto">
          <div className="text-6xl mb-4">🔌</div>
          <h2 className="font-heading text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="font-mono text-sm text-[var(--text-primary)]/50">
            Connect your Solana wallet to view your profile.
          </p>
        </div>
      </div>
    );
  }

  const walletAddress = publicKey.toBase58();
  const myAuctions = auctions.filter((a) => a.seller === walletAddress);
  const wonAuctions = auctions.filter((a) => a.highestBidder === walletAddress && a.state === 'finalized');

  const displayName = ghostMode
    ? getAnonymousAlias(walletAddress)
    : snsName || shortenAddress(walletAddress, 6);

  return (
    <div className="container-ghost py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Profile Header */}
        <div className="neu-card p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent-purple)] border-3 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center text-3xl">
              👻
            </div>
            <div className="flex-1">
              <h1 className="font-heading text-3xl font-black mb-1">{displayName}</h1>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-xs text-[var(--text-primary)]/40 break-all">
                  {walletAddress}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress);
                    toast.success('Copied!');
                  }}
                  className="text-xs hover:text-[var(--accent-green)] transition-colors"
                >
                  📋
                </button>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="px-3 py-1.5 border-2 border-[var(--border-color)] font-mono text-sm">
                  <span className="text-[var(--accent-green)]">◎</span> {balance.toFixed(4)} SOL
                </div>
                <div className="px-3 py-1.5 border-2 border-[var(--border-color)] font-mono text-sm">
                  🎨 {nfts.length} NFTs
                </div>
                <div className="px-3 py-1.5 border-2 border-[var(--border-color)] font-mono text-sm">
                  🏛️ {myAuctions.length} Auctions
                </div>
                <div className="px-3 py-1.5 border-2 border-[var(--border-color)] font-mono text-sm">
                  🏆 {wonAuctions.length} Won
                </div>
              </div>
            </div>
            <a
              href={getExplorerUrl(walletAddress, 'address')}
              target="_blank"
              rel="noopener noreferrer"
              className="neu-btn neu-btn-ghost text-xs"
            >
              View on Explorer ↗
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['created', 'won', 'nfts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 border-3 font-heading font-semibold text-sm uppercase transition-all ${
                tab === t
                  ? 'bg-[var(--accent-green)] text-black border-black shadow-[3px_3px_0px_#000]'
                  : 'border-[var(--border-color)] hover:border-[var(--accent-green)]'
              }`}
            >
              {t === 'created' ? `Created (${myAuctions.length})` :
               t === 'won' ? `Won (${wonAuctions.length})` :
               `NFTs (${nfts.length})`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'created' && (
          myAuctions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAuctions.map((a, i) => <AuctionCard key={a.address} auction={a} index={i} />)}
            </div>
          ) : (
            <div className="neu-card p-12 text-center">
              <div className="text-4xl mb-2">🏛️</div>
              <p className="font-mono text-sm text-[var(--text-primary)]/40">No auctions created yet</p>
              <a href="/create" className="neu-btn neu-btn-green mt-4">Create Auction</a>
            </div>
          )
        )}

        {tab === 'won' && (
          wonAuctions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wonAuctions.map((a, i) => <AuctionCard key={a.address} auction={a} index={i} />)}
            </div>
          ) : (
            <div className="neu-card p-12 text-center">
              <div className="text-4xl mb-2">🏆</div>
              <p className="font-mono text-sm text-[var(--text-primary)]/40">No auctions won yet</p>
              <a href="/explore" className="neu-btn neu-btn-purple mt-4">Explore Auctions</a>
            </div>
          )
        )}

        {tab === 'nfts' && (
          nfts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {nfts.map((nft) => (
                <div key={nft.mint} className="neu-card p-4">
                  <div className="aspect-square bg-gradient-to-br from-[var(--accent-green)]/10 to-[var(--accent-purple)]/10 flex items-center justify-center text-4xl mb-3 border-2 border-[var(--border-color)]">
                    🎨
                  </div>
                  <p className="font-mono text-xs truncate text-[var(--text-primary)]/60">
                    {nft.mint}
                  </p>
                  <a
                    href={`/create?mint=${nft.mint}`}
                    className="neu-btn neu-btn-ghost w-full text-xs mt-2 py-1.5"
                  >
                    Auction This NFT
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="neu-card p-12 text-center">
              <div className="text-4xl mb-2">🎨</div>
              <p className="font-mono text-sm text-[var(--text-primary)]/40">No NFTs found</p>
              <a href="/mint" className="neu-btn neu-btn-green mt-4">Mint an NFT</a>
            </div>
          )
        )}
      </motion.div>
    </div>
  );
}
