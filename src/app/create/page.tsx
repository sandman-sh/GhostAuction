'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getConnection, getAuctionPDA, getEscrowVaultPDA, solToLamports } from '@/lib/solana';
import { PROGRAM_ID, getExplorerUrl, MIN_AUCTION_DURATION, MAX_AUCTION_DURATION, MIN_REVEAL_DURATION, MAX_REVEAL_DURATION } from '@/lib/constants';
import { useAuctionStore } from '@/lib/stores';
import NFTGallery, { type OwnedNFT } from '@/components/auction/NFTGallery';

type Step = 'select' | 'configure' | 'result';

export default function CreateAuctionPage() {
  const { publicKey, sendTransaction, connected } = useWallet();
  const addAuction = useAuctionStore((s) => s.addAuction);

  // Steps
  const [step, setStep] = useState<Step>('select');

  // NFT Selection
  const [selectedNft, setSelectedNft] = useState<OwnedNFT | null>(null);

  // Auction Config
  const [reservePrice, setReservePrice] = useState('0.1');
  const [biddingHours, setBiddingHours] = useState('24');
  const [revealHours, setRevealHours] = useState('6');
  const [startNow, setStartNow] = useState(true);

  // State
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ auction: string; tx: string } | null>(null);

  const handleSelectNft = useCallback((nft: OwnedNFT) => {
    setSelectedNft((prev) => (prev?.mint === nft.mint ? null : nft));
  }, []);

  const handleProceed = () => {
    if (!selectedNft) {
      toast.error('Please select an NFT first');
      return;
    }
    setStep('configure');
  };

  const handleBack = () => {
    setStep('select');
  };

  const handleCreate = async () => {
    if (!publicKey || !connected) {
      toast.error('Connect your wallet first');
      return;
    }
    if (!selectedNft) {
      toast.error('No NFT selected');
      return;
    }

    setCreating(true);
    try {
      const connection = getConnection();
      const nftMintPubkey = new PublicKey(selectedNft.mint);
      const reserveLamports = solToLamports(parseFloat(reservePrice));
      const biddingDuration = Math.floor(parseFloat(biddingHours) * 3600);
      const revealDuration = Math.floor(parseFloat(revealHours) * 3600);
      const startTime = startNow ? Math.floor(Date.now() / 1000) : Math.floor(Date.now() / 1000) + 300;

      // Derive PDAs
      const [auctionPDA] = getAuctionPDA(nftMintPubkey, publicKey);
      const [escrowVaultPDA] = getEscrowVaultPDA(auctionPDA);

      // Get token accounts
      const sellerNftAta = await getAssociatedTokenAddress(nftMintPubkey, publicKey);
      const escrowNftAta = await getAssociatedTokenAddress(nftMintPubkey, escrowVaultPDA, true);

      toast.info('Creating auction on Solana Devnet...');

      const { getAnchorProgram } = await import('@/lib/solana');
      const { BN } = await import('@coral-xyz/anchor');

      const dummyWallet = {
        publicKey,
        signTransaction: async () => new Transaction(),
        signAllTransactions: async () => [],
      };
      const program = getAnchorProgram(dummyWallet);

      const initIx = await program.methods
        .initializeAuction(
          new BN(reserveLamports.toString()),
          new BN(startTime),
          new BN(biddingDuration),
          new BN(revealDuration)
        )
        .accountsPartial({
          auction: auctionPDA,
          escrowVault: escrowVaultPDA,
          nftMint: nftMintPubkey,
          nftToken: sellerNftAta,
          escrowNftToken: escrowNftAta,
          seller: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const transaction = new Transaction().add(initIx);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);

      toast.info('Confirming transaction...');
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

      const auctionAddress = auctionPDA.toBase58();
      setResult({ auction: auctionAddress, tx: signature });

      // Add to local store
      addAuction({
        address: auctionAddress,
        seller: publicKey.toBase58(),
        nftMint: selectedNft.mint,
        nftImage: selectedNft.image,
        nftName: selectedNft.name,
        reservePrice: Number(reserveLamports),
        startTime,
        biddingEndTime: startTime + biddingDuration,
        revealEndTime: startTime + biddingDuration + revealDuration,
        highestBid: 0,
        highestBidder: '',
        totalBids: 0,
        revealedBids: 0,
        state: 'bidding',
        createdAt: Math.floor(Date.now() / 1000),
      });

      setStep('result');
      toast.success('Auction created successfully!');
    } catch (err: any) {
      console.error('Create auction error:', err);
      toast.error(`Failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container-ghost py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        {/* Header */}
        <h1 className="font-heading text-4xl font-black mb-2">
          Create <span className="text-[var(--accent-purple)]">Auction</span>
        </h1>
        <p className="font-mono text-sm text-[var(--text-primary)]/50 mb-8">
          Select an NFT from your wallet and configure your sealed-bid auction
        </p>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8 font-mono text-xs">
          {[
            { key: 'select', label: '① Select NFT', num: 1 },
            { key: 'configure', label: '② Configure', num: 2 },
            { key: 'result', label: '③ Done', num: 3 },
          ].map((s, i) => {
            const isActive = s.key === step;
            const isPast =
              (s.key === 'select' && (step === 'configure' || step === 'result')) ||
              (s.key === 'configure' && step === 'result');

            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`w-8 h-0.5 ${isPast || isActive ? 'bg-[var(--accent-green)]' : 'bg-[var(--border-color)]'}`} />
                )}
                <div
                  className={`px-3 py-1.5 border-2 font-heading font-bold uppercase tracking-wider transition-all text-xs
                    ${isActive
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green)] text-black'
                      : isPast
                      ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
                      : 'border-[var(--border-color)] text-[var(--text-primary)]/40'
                    }`}
                >
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {/* STEP 1: SELECT NFT */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <NFTGallery
                onSelect={handleSelectNft}
                selectedMint={selectedNft?.mint || null}
              />

              {/* Selected NFT Preview + Proceed */}
              {selectedNft && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 neu-card p-4"
                  style={{ transform: 'none', boxShadow: 'var(--shadow-brutal)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 border-2 border-[var(--accent-green)] bg-[var(--bg-primary)] overflow-hidden flex-shrink-0">
                      {selectedNft.image ? (
                        <img
                          src={selectedNft.image}
                          alt={selectedNft.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">👻</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-sm truncate">{selectedNft.name}</h3>
                      <p className="font-mono text-[10px] text-[var(--text-primary)]/40 truncate">
                        {selectedNft.mint}
                      </p>
                    </div>
                    <button
                      onClick={handleProceed}
                      className="neu-btn neu-btn-green text-sm flex-shrink-0"
                    >
                      Continue →
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 2: CONFIGURE AUCTION */}
          {step === 'configure' && selectedNft && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="neu-card p-8 space-y-6" style={{ transform: 'none', boxShadow: 'var(--shadow-brutal)' }}>
                {/* Selected NFT Banner */}
                <div className="flex items-center gap-4 p-4 border-3 border-[var(--accent-green)] bg-[var(--accent-green)]/5">
                  <div className="w-20 h-20 border-2 border-black bg-[var(--bg-primary)] overflow-hidden flex-shrink-0">
                    {selectedNft.image ? (
                      <img
                        src={selectedNft.image}
                        alt={selectedNft.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">👻</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] text-[var(--accent-green)] uppercase tracking-wider mb-1">
                      Selected NFT
                    </div>
                    <h3 className="font-heading font-bold text-lg truncate">{selectedNft.name}</h3>
                    <p className="font-mono text-xs text-[var(--text-primary)]/40 truncate">
                      {selectedNft.mint}
                    </p>
                  </div>
                  <button
                    onClick={handleBack}
                    className="font-mono text-xs text-[var(--accent-purple)] hover:underline cursor-pointer flex-shrink-0"
                  >
                    ← Change
                  </button>
                </div>

                {/* Reserve Price */}
                <div>
                  <label className="block font-heading font-bold text-sm mb-2 uppercase tracking-wider">
                    Reserve Price (SOL)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent-green)] font-mono">
                      ◎
                    </span>
                    <input
                      type="number"
                      value={reservePrice}
                      onChange={(e) => setReservePrice(e.target.value)}
                      min="0.01"
                      step="0.01"
                      className="neu-input pl-8"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-heading font-bold text-sm mb-2 uppercase tracking-wider">
                      Bidding Duration (hours)
                    </label>
                    <input
                      type="number"
                      value={biddingHours}
                      onChange={(e) => setBiddingHours(e.target.value)}
                      min="1"
                      max="168"
                      className="neu-input"
                    />
                  </div>
                  <div>
                    <label className="block font-heading font-bold text-sm mb-2 uppercase tracking-wider">
                      Reveal Duration (hours)
                    </label>
                    <input
                      type="number"
                      value={revealHours}
                      onChange={(e) => setRevealHours(e.target.value)}
                      min="0.5"
                      max="24"
                      step="0.5"
                      className="neu-input"
                    />
                  </div>
                </div>

                {/* Start Time */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      className={`w-6 h-6 border-3 border-black flex items-center justify-center transition-all ${
                        startNow ? 'bg-[var(--accent-green)]' : 'bg-[var(--bg-primary)]'
                      }`}
                      onClick={() => setStartNow(!startNow)}
                    >
                      {startNow && <span className="text-black font-bold text-sm">✓</span>}
                    </div>
                    <span className="font-heading font-semibold text-sm">Start immediately</span>
                  </label>
                </div>

                {/* Summary */}
                <div className="p-4 border-3 border-[var(--border-color)] bg-[var(--bg-primary)] font-mono text-xs space-y-1">
                  <div className="text-[var(--text-primary)]/50 uppercase tracking-wider mb-2 font-heading text-sm font-bold">
                    Summary
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-primary)]/50">NFT:</span>
                    <span className="text-[var(--accent-green)] truncate ml-4">{selectedNft.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-primary)]/50">Reserve Price:</span>
                    <span className="text-[var(--accent-green)]">◎ {reservePrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-primary)]/50">Bidding Period:</span>
                    <span>{biddingHours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-primary)]/50">Reveal Period:</span>
                    <span>{revealHours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-primary)]/50">Network:</span>
                    <span className="text-[var(--accent-purple)]">Solana Devnet</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleBack}
                    className="neu-btn neu-btn-ghost flex-1 py-4"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !connected}
                    className={`neu-btn flex-[2] py-4 ${
                      creating ? 'opacity-50 cursor-not-allowed' : 'neu-btn-purple'
                    }`}
                  >
                    {creating ? '⏳ Creating Auction...' : '🏛️ Create Sealed Bid Auction'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: RESULT */}
          {step === 'result' && result && selectedNft && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="neu-card p-8 space-y-6" style={{ transform: 'none', boxShadow: 'var(--shadow-brutal)' }}>
                {/* Success Header */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                    className="text-6xl mb-4"
                  >
                    🎉
                  </motion.div>
                  <h2 className="font-heading text-2xl font-black text-[var(--accent-green)] mb-2">
                    Auction Created!
                  </h2>
                  <p className="font-mono text-sm text-[var(--text-primary)]/50">
                    Your sealed-bid auction is now live on Solana Devnet
                  </p>
                </div>

                {/* NFT Preview */}
                <div className="flex items-center gap-4 p-4 border-3 border-[var(--accent-green)] bg-[var(--accent-green)]/5">
                  <div className="w-16 h-16 border-2 border-black overflow-hidden flex-shrink-0">
                    {selectedNft.image ? (
                      <img
                        src={selectedNft.image}
                        alt={selectedNft.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl bg-[var(--bg-primary)]">👻</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold truncate">{selectedNft.name}</h3>
                    <p className="font-mono text-xs text-[var(--text-primary)]/40 truncate">
                      Reserve: ◎ {reservePrice}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 font-mono text-xs">
                  <div>
                    <span className="text-[var(--text-primary)]/50">Auction Address: </span>
                    <span className="break-all">{result.auction}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-primary)]/50">Transaction: </span>
                    <a
                      href={getExplorerUrl(result.tx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-green)] underline break-all"
                    >
                      View on Explorer ↗
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <a
                    href={`/auction/${result.auction}`}
                    className="neu-btn neu-btn-green flex-1 py-4"
                  >
                    → View Auction
                  </a>
                  <button
                    onClick={() => {
                      setStep('select');
                      setSelectedNft(null);
                      setResult(null);
                    }}
                    className="neu-btn neu-btn-ghost flex-1 py-4"
                  >
                    + Create Another
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
