'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useUIStore, useUserStore } from '@/lib/stores';
import { shortenAddress } from '@/lib/constants';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false }
);

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/create', label: 'Create' },
  { href: '/mint', label: 'Mint NFT' },
  { href: '/dashboard', label: 'Dashboard' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { publicKey, connected } = useWallet();
  const balance = useUserStore((s) => s.balance);
  const snsName = useUserStore((s) => s.snsName);
  const { theme, toggleTheme, ghostMode, setGhostMode } = useUIStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <nav className="sticky top-0 z-40 w-full border-b-3 border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur-sm">
      <div className="container-ghost flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-[var(--accent-green)] border-3 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center font-bold text-black text-lg group-hover:shadow-[5px_5px_0px_#000] group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] transition-all">
            G
          </div>
          <span className="font-heading font-bold text-xl tracking-tight hidden sm:block">
            Ghost<span className="text-[var(--accent-green)]">Auction</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 font-heading font-semibold text-sm uppercase tracking-wide border-2 transition-all ${
                pathname === link.href
                  ? 'bg-[var(--accent-green)] text-black border-black shadow-[3px_3px_0px_#000]'
                  : 'border-transparent hover:border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Ghost Mode Toggle */}
          <button
            onClick={() => setGhostMode(!ghostMode)}
            className={`p-2 border-2 transition-all text-sm ${
              ghostMode
                ? 'bg-[var(--accent-purple)] border-black text-white shadow-[3px_3px_0px_#000]'
                : 'border-[var(--border-color)] hover:border-[var(--accent-purple)]'
            }`}
            title="Ghost Mode"
          >
            👻
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 border-2 border-[var(--border-color)] hover:border-[var(--accent-green)] transition-all text-sm"
            title="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Balance */}
          {mounted && connected && (
            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] font-mono text-xs">
              <span className="text-[var(--accent-green)]">◎</span>
              <span>{balance.toFixed(4)}</span>
            </div>
          )}

          {/* Profile Link */}
          {mounted && connected && publicKey && (
            <Link
              href="/profile"
              className="hidden sm:flex px-3 py-1.5 border-2 border-[var(--border-color)] hover:border-[var(--accent-green)] font-mono text-xs transition-all"
            >
              {snsName || shortenAddress(publicKey.toBase58())}
            </Link>
          )}

          {/* Wallet Button */}
          <div className="wallet-adapter-btn">
            {mounted && <WalletMultiButton />}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 border-2 border-[var(--border-color)]"
          >
            <span className="text-lg">{mobileOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t-3 border-[var(--border-color)] overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 font-heading font-semibold text-sm uppercase tracking-wide border-3 transition-all ${
                    pathname === link.href
                      ? 'bg-[var(--accent-green)] text-black border-black shadow-[4px_4px_0px_#000]'
                      : 'border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
