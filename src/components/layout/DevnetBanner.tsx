'use client';

import { SOLANA_NETWORK } from '@/lib/constants';

export default function DevnetBanner() {
  if (SOLANA_NETWORK === 'mainnet-beta') return null;

  return (
    <div className="w-full bg-[#39ff14] text-black py-1 px-4 text-center font-mono text-xs font-bold tracking-wider uppercase border-b-3 border-black z-50 relative">
      <span className="inline-flex items-center gap-2">
        <span className="w-2 h-2 bg-black rounded-full animate-pulse" />
        ⚠ SOLANA {SOLANA_NETWORK.toUpperCase()} — All transactions use devnet SOL (not real money)
        <span className="w-2 h-2 bg-black rounded-full animate-pulse" />
      </span>
    </div>
  );
}
