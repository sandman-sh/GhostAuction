import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { sha256 } from 'crypto-js';
import { PROGRAM_ID, SOLANA_RPC_URL } from './constants';
import idl from './idl/ghost_auction.json';

// ---- Anchor Setup ----
export function getAnchorProgram(wallet: any): Program {
  const connection = getConnection();
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
    commitment: 'confirmed',
  });
  return new Program(idl as any, provider);
}

// ---- PDA Derivation ----

export function getAuctionPDA(nftMint: PublicKey, seller: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('auction'), nftMint.toBuffer(), seller.toBuffer()],
    PROGRAM_ID
  );
}

export function getEscrowVaultPDA(auction: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow_vault'), auction.toBuffer()],
    PROGRAM_ID
  );
}

export function getBidPDA(auction: PublicKey, bidder: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bid'), auction.toBuffer(), bidder.toBuffer()],
    PROGRAM_ID
  );
}

export function getEscrowNftPDA(auction: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow_nft'), auction.toBuffer()],
    PROGRAM_ID
  );
}

// ---- Bid Hashing (Commit-Reveal) ----

export function generateNonce(): Uint8Array {
  const nonce = new Uint8Array(32);
  if (typeof window !== 'undefined') {
    crypto.getRandomValues(nonce);
  }
  return nonce;
}

export function hashBid(amount: bigint, nonce: Uint8Array): Uint8Array {
  const amountBytes = new Uint8Array(8);
  const view = new DataView(amountBytes.buffer);
  view.setBigUint64(0, amount, true); // little-endian

  const combined = new Uint8Array(amountBytes.length + nonce.length);
  combined.set(amountBytes);
  combined.set(nonce, amountBytes.length);

  const hashHex = sha256(
    Array.from(combined)
      .map((b) => String.fromCharCode(b))
      .join('')
  ).toString();

  const hashBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    hashBytes[i] = parseInt(hashHex.substr(i * 2, 2), 16);
  }
  return hashBytes;
}

// ---- Local Bid Storage (encrypted) ----

interface StoredBid {
  auctionAddress: string;
  amount: string;
  nonce: string;
  timestamp: number;
}

export function storeBidLocally(
  auctionAddress: string,
  amount: bigint,
  nonce: Uint8Array,
  walletAddress: string
): void {
  const key = `ghost_bid_${walletAddress}_${auctionAddress}`;
  const bid: StoredBid = {
    auctionAddress,
    amount: amount.toString(),
    nonce: Buffer.from(nonce).toString('hex'),
    timestamp: Date.now(),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(bid));
  }
}

export function getStoredBid(
  auctionAddress: string,
  walletAddress: string
): StoredBid | null {
  if (typeof window === 'undefined') return null;
  const key = `ghost_bid_${walletAddress}_${auctionAddress}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

export function removeStoredBid(auctionAddress: string, walletAddress: string): void {
  if (typeof window === 'undefined') return;
  const key = `ghost_bid_${walletAddress}_${auctionAddress}`;
  localStorage.removeItem(key);
}

// ---- Connection Helper ----

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  }
  return _connection;
}

// ---- SOL Helpers ----

export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * LAMPORTS_PER_SOL));
}

// ---- Auction State Helpers ----

export type AuctionPhase = 'upcoming' | 'bidding' | 'reveal' | 'finalized' | 'cancelled';

export function getAuctionPhase(auction: {
  startTime: number;
  biddingEndTime: number;
  revealEndTime: number;
  state: Record<string, unknown>;
}): AuctionPhase {
  const now = Math.floor(Date.now() / 1000);

  if ('cancelled' in auction.state) return 'cancelled';
  if ('finalized' in auction.state) return 'finalized';
  if (now < auction.startTime) return 'upcoming';
  if (now < auction.biddingEndTime) return 'bidding';
  if (now < auction.revealEndTime) return 'reveal';
  return 'finalized';
}

export function getTimeRemaining(targetTimestamp: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const total = Math.max(0, targetTimestamp - now);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds, total };
}
