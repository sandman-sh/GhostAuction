'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import CountdownTimer from '@/components/ui/CountdownTimer';
import { useAuctionStore, useUIStore, AuctionData } from '@/lib/stores';
import {
  getConnection, hashBid, generateNonce, storeBidLocally,
  getStoredBid, lamportsToSol, solToLamports, getAuctionPhase,
  getBidPDA, getEscrowVaultPDA, getAuctionPDA,
} from '@/lib/solana';
import { shortenAddress, getAnonymousAlias, getExplorerUrl } from '@/lib/constants';

export default function AuctionDetailPage() {
  const params = useParams();
  const auctionAddress = params.id as string;
  const { publicKey, sendTransaction, connected } = useWallet();
  const ghostMode = useUIStore((s) => s.ghostMode);
  const auctions = useAuctionStore((s) => s.auctions);
  const updateAuction = useAuctionStore((s) => s.updateAuction);

  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [hasBid, setHasBid] = useState(false);
  const [bidRevealed, setBidRevealed] = useState(false);
  const [activityLog, setActivityLog] = useState<Array<{
    type: string; address: string; amount?: number; time: number; tx?: string;
  }>>([]);

  // Load auction data
  useEffect(() => {
    const found = auctions.find((a) => a.address === auctionAddress);
    if (found) setAuction(found);
    // Also try to fetch from chain
    fetchOnChainData();
  }, [auctionAddress, auctions]);

  // Check for stored bid
  useEffect(() => {
    if (!publicKey || !auctionAddress) return;
    const stored = getStoredBid(auctionAddress, publicKey.toBase58());
    if (stored) {
      setHasBid(true);
    }
  }, [publicKey, auctionAddress]);

  const fetchOnChainData = async () => {
    try {
      const connection = getConnection();
      const auctionPubkey = new PublicKey(auctionAddress);

      // 1. Fetch the actual Auction account from the program
      try {
        const { getAnchorProgram } = await import('@/lib/solana');
        const dummyWallet = { 
          publicKey: auctionPubkey, 
          signTransaction: async () => new Transaction(), 
          signAllTransactions: async () => [] 
        };
        const program = getAnchorProgram(dummyWallet);
        const auctionAccount = await program.account.auction.fetch(auctionPubkey);
        
        const onChainAuction: AuctionData = {
          address: auctionAddress,
          seller: auctionAccount.seller.toBase58(),
          nftMint: auctionAccount.nftMint.toBase58(),
          reservePrice: auctionAccount.reservePrice.toNumber(),
          startTime: auctionAccount.startTime.toNumber(),
          biddingEndTime: auctionAccount.biddingEndTime.toNumber(),
          revealEndTime: auctionAccount.revealEndTime.toNumber(),
          highestBid: auctionAccount.highestBid.toNumber(),
          highestBidder: auctionAccount.highestBidder.toBase58(),
          totalBids: auctionAccount.totalBids,
          revealedBids: auctionAccount.revealedBids,
          state: Object.keys(auctionAccount.state)[0].toLowerCase(),
          createdAt: auctionAccount.createdAt.toNumber(),
        };
        
        setAuction((prev) => ({ ...onChainAuction, nftName: prev?.nftName, nftImage: prev?.nftImage }));
      } catch (e) {
        console.log('Auction account not found on chain:', e);
      }

      // 2. Fetch recent transactions for this auction
      const signatures = await connection.getSignaturesForAddress(auctionPubkey, { limit: 20 });
      const activities = signatures.map((sig) => ({
        type: 'transaction',
        address: sig.signature.slice(0, 8),
        time: sig.blockTime || Math.floor(Date.now() / 1000),
        tx: sig.signature,
      }));
      setActivityLog(activities);
    } catch (err) {
      // Auction PDA may not exist yet on-chain
      console.log('No on-chain data yet for auction:', auctionAddress);
    }
  };

  const handleCommitBid = async () => {
    if (!publicKey || !connected) {
      toast.error('Connect your wallet first');
      return;
    }
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      toast.error('Enter a valid bid amount');
      return;
    }

    setBidding(true);
    try {
      const connection = getConnection();
      const amountLamports = solToLamports(parseFloat(bidAmount));
      const nonce = generateNonce();
      const bidHash = hashBid(amountLamports, nonce);

      toast.info('Submitting sealed bid...');

      // Create escrow transaction
      const { getAnchorProgram } = await import('@/lib/solana');
      const { BN } = await import('@coral-xyz/anchor');
      const dummyWallet = { publicKey, signTransaction: async () => new Transaction(), signAllTransactions: async () => [] };
      const program = getAnchorProgram(dummyWallet);

      const [escrowVaultPDA] = getEscrowVaultPDA(new PublicKey(auctionAddress));
      const [bidPDA] = getBidPDA(new PublicKey(auctionAddress), publicKey);

      const commitIx = await program.methods
        .commitBid(Array.from(bidHash), new BN(amountLamports.toString()))
        .accountsPartial({
          auction: new PublicKey(auctionAddress),
          bidAccount: bidPDA,
          escrowVault: escrowVaultPDA,
          bidder: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const transaction = new Transaction().add(commitIx);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

      // Store bid locally for reveal phase
      storeBidLocally(auctionAddress, amountLamports, nonce, publicKey.toBase58());
      setHasBid(true);

      // Update auction state
      if (auction) {
        updateAuction(auctionAddress, { totalBids: auction.totalBids + 1 });
      }

      toast.success('Bid committed! Keep your browser open for the reveal phase.');
    } catch (err: any) {
      console.error('Bid error:', err);
      toast.error(`Bid failed: ${err.message}`);
    } finally {
      setBidding(false);
    }
  };

  const handleRevealBid = async () => {
    if (!publicKey || !connected) {
      toast.error('Connect your wallet');
      return;
    }

    const stored = getStoredBid(auctionAddress, publicKey.toBase58());
    if (!stored) {
      toast.error('No stored bid found for this auction');
      return;
    }

    setRevealing(true);
    try {
      const connection = getConnection();

      const { getAnchorProgram } = await import('@/lib/solana');
      const { BN } = await import('@coral-xyz/anchor');
      const dummyWallet = { publicKey, signTransaction: async () => new Transaction(), signAllTransactions: async () => [] };
      const program = getAnchorProgram(dummyWallet);

      const [bidPDA] = getBidPDA(new PublicKey(auctionAddress), publicKey);
      const nonceArray = Array.from(Buffer.from(stored.nonce, 'hex'));

      const revealIx = await program.methods
        .revealBid(new BN(stored.amount), nonceArray)
        .accountsPartial({
          auction: new PublicKey(auctionAddress),
          bidAccount: bidPDA,
          bidder: publicKey,
        })
        .instruction();

      const transaction = new Transaction().add(revealIx);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

      setBidRevealed(true);
      toast.success('Bid revealed successfully!');
    } catch (err: any) {
      console.error('Reveal error:', err);
      toast.error(`Reveal failed: ${err.message}`);
    } finally {
      setRevealing(false);
    }
  };

  const handleClaimRefund = async () => {
    if (!publicKey || !connected) return;

    setClaiming(true);
    try {
      const connection = getConnection();
      const [escrowVaultPDA] = getEscrowVaultPDA(new PublicKey(auctionAddress));

      const { getAnchorProgram } = await import('@/lib/solana');
      const dummyWallet = { publicKey, signTransaction: async () => new Transaction(), signAllTransactions: async () => [] };
      const program = getAnchorProgram(dummyWallet);

      const [bidPDA] = getBidPDA(new PublicKey(auctionAddress), publicKey);

      const refundIx = await program.methods
        .claimRefund()
        .accountsPartial({
          auction: new PublicKey(auctionAddress),
          bidAccount: bidPDA,
          escrowVault: escrowVaultPDA,
          bidder: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const transaction = new Transaction().add(refundIx);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

      toast.success('Refund claimed!');
    } catch (err: any) {
      toast.error(`Refund failed: ${err.message}`);
    } finally {
      setClaiming(false);
    }
  };

  if (!auction) {
    return (
      <div className="container-ghost py-12">
        <div className="max-w-4xl mx-auto">
          <div className="neu-card p-12 text-center">
            <div className="text-6xl mb-4">👻</div>
            <h2 className="font-heading text-2xl font-bold mb-2">Auction Not Found</h2>
            <p className="font-mono text-sm text-[var(--text-primary)]/50 mb-4">
              This auction may not exist yet or hasn&apos;t been indexed.
            </p>
            <p className="font-mono text-xs text-[var(--text-primary)]/30 break-all mb-6">
              Address: {auctionAddress}
            </p>
            <a href="/explore" className="neu-btn neu-btn-green">
              ← Back to Explore
            </a>
          </div>
        </div>
      </div>
    );
  }

  const phase = getAuctionPhase({
    startTime: auction.startTime,
    biddingEndTime: auction.biddingEndTime,
    revealEndTime: auction.revealEndTime,
    state: { [auction.state]: {} },
  });

  const isSeller = publicKey?.toBase58() === auction.seller;
  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="container-ghost py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: NFT Preview */}
          <div className="lg:col-span-2">
            <div className="neu-card overflow-hidden sticky top-24">
              <div className="aspect-square bg-gradient-to-br from-[var(--accent-green)]/10 to-[var(--accent-purple)]/10 flex items-center justify-center">
                {auction.nftImage ? (
                  <img src={auction.nftImage} alt={auction.nftName || 'NFT'} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-8xl animate-float">👻</div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-heading font-bold text-xl">
                  {auction.nftName || `Ghost #${auction.address.slice(0, 6)}`}
                </h2>
                <p className="font-mono text-xs text-[var(--text-primary)]/40 mt-1">
                  Mint: {shortenAddress(auction.nftMint, 8)}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Auction Info */}
          <div className="lg:col-span-3 space-y-6">
            {/* Phase Banner */}
            <div className={`neu-card p-6 ${
              phase === 'bidding' ? 'border-[var(--accent-green)]' :
              phase === 'reveal' ? 'border-[var(--accent-purple)]' : ''
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`neu-badge text-sm ${
                  phase === 'bidding' ? 'status-live' :
                  phase === 'reveal' ? 'status-reveal' :
                  phase === 'finalized' ? 'status-ended' :
                  'status-upcoming'
                }`}>
                  {phase === 'bidding' && '● '}{phase.toUpperCase()}
                </div>
                <div className="font-mono text-xs text-[var(--text-primary)]/40">
                  {auction.totalBids} bids committed
                </div>
              </div>

              {/* Countdown */}
              {phase === 'bidding' && (
                <CountdownTimer
                  targetTimestamp={auction.biddingEndTime}
                  label="Bidding ends in"
                  size="lg"
                />
              )}
              {phase === 'reveal' && (
                <CountdownTimer
                  targetTimestamp={auction.revealEndTime}
                  label="Reveal ends in"
                  size="lg"
                />
              )}
            </div>

            {/* Seller Info */}
            <div className="neu-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs text-[var(--text-primary)]/50">Seller</span>
                  <div className="font-heading font-bold">
                    {ghostMode ? getAnonymousAlias(auction.seller) : shortenAddress(auction.seller, 8)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-[var(--text-primary)]/50">Reserve</span>
                  <div className="font-mono font-bold text-[var(--accent-green)]">
                    ◎ {lamportsToSol(auction.reservePrice).toFixed(4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bid Section */}
            {phase === 'bidding' && !isSeller && (
              <div className="neu-card p-6 space-y-4">
                <h3 className="font-heading font-bold text-lg">
                  {hasBid ? '✓ Bid Committed' : '🔐 Place Sealed Bid'}
                </h3>
                {hasBid ? (
                  <div className="p-4 border-2 border-[var(--accent-green)] bg-[var(--accent-green)]/5">
                    <p className="font-mono text-sm text-[var(--accent-green)]">
                      Your bid is sealed and escrowed. Return during the reveal phase to reveal your bid amount.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent-green)] font-mono text-lg">
                        ◎
                      </span>
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        className="neu-input pl-10 text-2xl font-mono font-bold"
                      />
                    </div>
                    <p className="font-mono text-xs text-[var(--text-primary)]/40">
                      ⚠ Your bid amount will be hidden until the reveal phase.
                      Funds will be escrowed on-chain.
                    </p>
                    <button
                      onClick={handleCommitBid}
                      disabled={bidding || !bidAmount}
                      className={`neu-btn w-full py-4 ${bidding ? 'opacity-50' : 'neu-btn-green'}`}
                    >
                      {bidding ? '⏳ Submitting Sealed Bid...' : '🔒 Commit Sealed Bid'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Reveal Section */}
            {phase === 'reveal' && hasBid && !bidRevealed && (
              <div className="neu-card p-6 space-y-4 border-[var(--accent-purple)]">
                <h3 className="font-heading font-bold text-lg text-[var(--accent-purple)]">
                  👁️ Reveal Your Bid
                </h3>
                <p className="font-mono text-sm text-[var(--text-primary)]/60">
                  Reveal your bid to be eligible for winning. Your bid hash will be verified on-chain.
                </p>
                <button
                  onClick={handleRevealBid}
                  disabled={revealing}
                  className={`neu-btn w-full py-4 ${revealing ? 'opacity-50' : 'neu-btn-purple'}`}
                >
                  {revealing ? '⏳ Revealing...' : '👁️ Reveal Bid'}
                </button>
              </div>
            )}

            {/* Claim Refund */}
            {phase === 'finalized' && hasBid && auction.highestBidder !== publicKey?.toBase58() && (
              <div className="neu-card p-6 space-y-4">
                <h3 className="font-heading font-bold text-lg">
                  💰 Claim Refund
                </h3>
                <p className="font-mono text-sm text-[var(--text-primary)]/60">
                  You didn&apos;t win this auction. Claim your escrowed funds back.
                </p>
                <button
                  onClick={handleClaimRefund}
                  disabled={claiming}
                  className={`neu-btn w-full py-3 ${claiming ? 'opacity-50' : 'neu-btn-ghost'}`}
                >
                  {claiming ? '⏳ Claiming...' : '💰 Claim Refund'}
                </button>
              </div>
            )}

            {/* Winner Animation */}
            {phase === 'finalized' && auction.highestBidder === publicKey?.toBase58() && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="neu-card p-8 border-[var(--accent-green)] text-center"
              >
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="font-heading font-bold text-2xl text-[var(--accent-green)] mb-2">
                  You Won!
                </h3>
                <p className="font-mono text-sm text-[var(--text-primary)]/60">
                  The NFT has been transferred to your wallet.
                </p>
              </motion.div>
            )}

            {/* Activity Log */}
            <div className="neu-card p-6">
              <h3 className="font-heading font-bold text-lg mb-4">
                📋 Activity
              </h3>
              {activityLog.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {activityLog.map((activity, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 border-2 border-[var(--border-color)] text-xs font-mono"
                    >
                      <span className="text-[var(--text-primary)]/60">{activity.type}</span>
                      {activity.tx && (
                        <a
                          href={getExplorerUrl(activity.tx)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent-green)] hover:underline"
                        >
                          {activity.tx.slice(0, 12)}...
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-xs text-[var(--text-primary)]/30 text-center py-4">
                  No activity yet
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
