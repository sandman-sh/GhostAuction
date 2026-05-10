'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '@/lib/stores';
import { normalizeIpfsUrl } from '@/lib/constants';

export interface OwnedNFT {
  mint: string;
  name: string;
  image: string;
  uri: string;
  description: string;
}

interface NFTGalleryProps {
  onSelect: (nft: OwnedNFT) => void;
  selectedMint: string | null;
}

export default function NFTGallery({ onSelect, selectedMint }: NFTGalleryProps) {
  const { publicKey, connected } = useWallet();
  const localNfts = useUserStore((s) => s.nfts);
  const [nfts, setNfts] = useState<OwnedNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchNFTs = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/nfts?wallet=${publicKey.toBase58()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch NFTs');

      const onChainNfts: OwnedNFT[] = (data.nfts || []).map((n: any) => ({
        mint: n.mint,
        name: n.name,
        image: normalizeIpfsUrl(n.image || ''),
        uri: n.uri || '',
        description: n.description || '',
      }));

      // Merge with locally-stored NFT metadata (from minting)
      // Local data takes priority for name/image since on-chain may not have Metaplex metadata
      const merged = new Map<string, OwnedNFT>();

      // First, add all on-chain NFTs
      for (const nft of onChainNfts) {
        merged.set(nft.mint, nft);
      }

      // Then overlay local metadata — fills in name/image for NFTs without Metaplex metadata
      for (const local of localNfts) {
        const existing = merged.get(local.mint);
        if (existing) {
          // NFT exists on-chain — use local data if on-chain is missing info
          merged.set(local.mint, {
            mint: local.mint,
            name: existing.name.startsWith('NFT ') ? local.name : existing.name,
            image: existing.image || normalizeIpfsUrl(local.image || ''),
            uri: existing.uri || local.uri || '',
            description: existing.description || local.description || '',
          });
        }
        // Don't add locally-stored NFTs that aren't on-chain (they may have been transferred)
      }

      setNfts(Array.from(merged.values()));
    } catch (err: any) {
      console.error('NFT fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [publicKey, localNfts]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchNFTs();
    } else {
      setNfts([]);
    }
  }, [connected, publicKey, fetchNFTs]);

  if (!connected) {
    return (
      <div className="neu-card p-12 text-center">
        <div className="text-5xl mb-4">🔌</div>
        <h3 className="font-heading font-bold text-xl mb-2">Connect Your Wallet</h3>
        <p className="font-mono text-sm text-[var(--text-primary)]/50">
          Connect your Solana wallet to view your NFTs
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 bg-[var(--accent-green)] animate-pulse" />
          <span className="font-mono text-sm text-[var(--text-primary)]/70">
            Scanning wallet for NFTs...
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="neu-card overflow-hidden" style={{ transform: 'none', boxShadow: 'var(--shadow-brutal)' }}>
              <div className="aspect-square skeleton" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 skeleton rounded" />
                <div className="h-3 w-1/2 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="neu-card p-8 text-center border-[var(--color-neon-pink)]">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="font-heading font-bold text-lg mb-2">Error Loading NFTs</h3>
        <p className="font-mono text-xs text-[var(--text-primary)]/50 mb-4">{error}</p>
        <button onClick={fetchNFTs} className="neu-btn neu-btn-ghost text-sm">
          ↻ Try Again
        </button>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="neu-card p-12 text-center">
        <div className="text-5xl mb-4">🖼️</div>
        <h3 className="font-heading font-bold text-xl mb-2">No NFTs Found</h3>
        <p className="font-mono text-sm text-[var(--text-primary)]/50 mb-6">
          You don&apos;t own any NFTs in this wallet yet.
        </p>
        <a href="/mint" className="neu-btn neu-btn-green">
          🎨 Mint Your First NFT
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[var(--accent-green)]" />
          <span className="font-mono text-sm text-[var(--text-primary)]/70">
            {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} found
          </span>
        </div>
        <button
          onClick={fetchNFTs}
          className="font-mono text-xs text-[var(--accent-green)] hover:underline cursor-pointer"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <AnimatePresence>
          {nfts.map((nft, i) => {
            const isSelected = selectedMint === nft.mint;
            return (
              <motion.button
                key={nft.mint}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                onClick={() => onSelect(nft)}
                className={`group relative text-left overflow-hidden transition-all duration-200 cursor-pointer
                  ${isSelected
                    ? 'border-3 border-[var(--accent-green)] bg-[var(--bg-secondary)] shadow-[4px_4px_0px_var(--accent-green)] -translate-x-0.5 -translate-y-0.5'
                    : 'border-3 border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[var(--shadow-brutal)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000]'
                  }`}
              >
                {/* Selection badge */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 z-10 w-7 h-7 bg-[var(--accent-green)] border-2 border-black flex items-center justify-center"
                  >
                    <span className="text-black font-bold text-sm">✓</span>
                  </motion.div>
                )}

                {/* NFT Image */}
                <div className="aspect-square bg-[var(--bg-primary)] relative overflow-hidden">
                  {nft.image ? (
                    <>
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          // Hide broken image, show placeholder
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                          const placeholder = img.parentElement?.querySelector('.nft-placeholder');
                          if (placeholder) (placeholder as HTMLElement).style.display = 'flex';
                        }}
                      />
                      <div
                        className="nft-placeholder absolute inset-0 items-center justify-center bg-[var(--bg-primary)]"
                        style={{ display: 'none' }}
                      >
                        <div className="text-center">
                          <div className="text-3xl mb-1">👻</div>
                          <span className="font-mono text-[10px] text-[var(--text-primary)]/30">Image Error</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]">
                      <div className="text-center">
                        <div className="text-3xl mb-1">👻</div>
                        <span className="font-mono text-[10px] text-[var(--text-primary)]/30">No Preview</span>
                      </div>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity font-heading font-bold text-white text-sm drop-shadow-lg">
                      {isSelected ? 'SELECTED' : 'SELECT'}
                    </span>
                  </div>
                </div>

                {/* NFT Info */}
                <div className="p-3">
                  <h4 className="font-heading font-bold text-sm truncate mb-1">
                    {nft.name}
                  </h4>
                  <p className="font-mono text-[10px] text-[var(--text-primary)]/40 truncate">
                    {nft.mint.slice(0, 8)}...{nft.mint.slice(-6)}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
