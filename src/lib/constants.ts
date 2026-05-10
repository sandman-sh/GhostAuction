import { PublicKey, clusterApiUrl } from '@solana/web3.js';

export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta' | 'testnet';
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || 'BcGFyp1pKGdWgkQiN1Vf421eSEjeZq9mUEb1dh9Tm2CR'
);

export const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';

// Normalize Pinata gateway to a full URL — handles cases where env var is just a hostname
export function getPinataGatewayUrl(): string {
  let gw = PINATA_GATEWAY;
  // Strip protocol if present
  gw = gw.replace(/^https?:\/\//, '');
  // Strip trailing slash
  gw = gw.replace(/\/+$/, '');
  // Custom Pinata gateways (*.mypinata.cloud) don't need /ipfs/ path
  if (gw.endsWith('.mypinata.cloud')) {
    return `https://${gw}/ipfs`;
  }
  // Public gateway
  if (!gw.includes('/ipfs')) {
    return `https://${gw}/ipfs`;
  }
  return `https://${gw}`;
}

// Build a full Pinata URL from an IPFS hash
export function getPinataUrl(ipfsHash: string): string {
  return `${getPinataGatewayUrl()}/${ipfsHash}`;
}

// Normalize any IPFS URI to an HTTP URL via our Pinata gateway
export function normalizeIpfsUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return `${getPinataGatewayUrl()}/${url.slice(7)}`;
  }
  // Already an HTTP URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Bare CID
  if (url.startsWith('Qm') || url.startsWith('bafy')) {
    return `${getPinataGatewayUrl()}/${url}`;
  }
  return url;
}

export const AUCTION_STATES = {
  CREATED: 'created',
  BIDDING: 'bidding',
  REVEAL: 'reveal',
  FINALIZED: 'finalized',
  CANCELLED: 'cancelled',
} as const;

export const LAMPORTS_PER_SOL = 1_000_000_000;

export const MIN_BID_AMOUNT = 0.01; // SOL
export const MAX_AUCTION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
export const MIN_AUCTION_DURATION = 60 * 60; // 1 hour in seconds
export const MAX_REVEAL_DURATION = 24 * 60 * 60; // 24 hours
export const MIN_REVEAL_DURATION = 30 * 60; // 30 minutes

export const EXPLORER_URL = 'https://explorer.solana.com';
export const EXPLORER_SUFFIX = `?cluster=${SOLANA_NETWORK}`;

export const APP_NAME = 'GhostAuction';
export const APP_DESCRIPTION = 'Private NFT Auctions on Solana. Invisible bids. Fair outcomes.';
export const APP_SLOGAN = 'Bid in Silence';

export const ANONYMOUS_ALIASES = [
  'Ghost', 'Phantom', 'Shadow', 'Wraith', 'Specter', 'Shade',
  'Revenant', 'Spirit', 'Haunt', 'Mist', 'Void', 'Eclipse',
  'Nebula', 'Cipher', 'Enigma', 'Vortex', 'Flux', 'Nova',
  'Rune', 'Aether', 'Dusk', 'Twilight', 'Obsidian', 'Onyx',
];

export function getAnonymousAlias(walletAddress: string): string {
  const hash = walletAddress.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % ANONYMOUS_ALIASES.length;
  const suffix = walletAddress.slice(-4).toUpperCase();
  return `${ANONYMOUS_ALIASES[index]}#${suffix}`;
}

export function getExplorerUrl(signature: string, type: 'tx' | 'address' = 'tx'): string {
  return `${EXPLORER_URL}/${type}/${signature}${EXPLORER_SUFFIX}`;
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
