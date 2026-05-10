'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useUIStore } from '@/lib/stores';
import { SOLANA_NETWORK, SOLANA_RPC_URL } from '@/lib/constants';
import { getConnection } from '@/lib/solana';

export default function SettingsPage() {
  const { publicKey, connected } = useWallet();
  const { theme, toggleTheme, ghostMode, setGhostMode } = useUIStore();
  const [airdropping, setAirdropping] = useState(false);

  const handleAirdrop = async () => {
    if (!publicKey) {
      toast.error('Connect wallet first');
      return;
    }
    setAirdropping(true);
    try {
      const connection = getConnection();
      const sig = await connection.requestAirdrop(publicKey, 2 * 1e9);
      await connection.confirmTransaction(sig);
      toast.success('Airdropped 2 SOL!');
    } catch (err: any) {
      toast.error(`Airdrop failed: ${err.message}`);
    } finally {
      setAirdropping(false);
    }
  };

  return (
    <div className="container-ghost py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="font-heading text-4xl font-black mb-8">
          Settings
        </h1>

        <div className="space-y-6">
          {/* Theme */}
          <div className="neu-card p-6">
            <h3 className="font-heading font-bold text-lg mb-4">Appearance</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading font-semibold">Theme</p>
                <p className="font-mono text-xs text-[var(--text-primary)]/40">
                  Switch between dark and light mode
                </p>
              </div>
              <button onClick={toggleTheme} className="neu-btn neu-btn-ghost">
                {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>
          </div>

          {/* Ghost Mode */}
          <div className="neu-card p-6">
            <h3 className="font-heading font-bold text-lg mb-4">Privacy</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading font-semibold">Ghost Mode</p>
                <p className="font-mono text-xs text-[var(--text-primary)]/40">
                  Hide wallet addresses behind anonymous aliases
                </p>
              </div>
              <button
                onClick={() => setGhostMode(!ghostMode)}
                className={`neu-btn ${ghostMode ? 'neu-btn-purple' : 'neu-btn-ghost'}`}
              >
                {ghostMode ? '👻 On' : '👤 Off'}
              </button>
            </div>
          </div>

          {/* Network */}
          <div className="neu-card p-6">
            <h3 className="font-heading font-bold text-lg mb-4">Network</h3>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between p-3 border-2 border-[var(--border-color)]">
                <span className="text-[var(--text-primary)]/50">Network</span>
                <span className="text-[var(--accent-green)]">{SOLANA_NETWORK}</span>
              </div>
              <div className="flex justify-between p-3 border-2 border-[var(--border-color)]">
                <span className="text-[var(--text-primary)]/50">RPC</span>
                <span className="text-xs truncate max-w-[200px]">{SOLANA_RPC_URL}</span>
              </div>
            </div>
          </div>

          {/* Devnet Airdrop */}
          {SOLANA_NETWORK === 'devnet' && connected && (
            <div className="neu-card p-6">
              <h3 className="font-heading font-bold text-lg mb-4">Devnet Tools</h3>
              <p className="font-mono text-xs text-[var(--text-primary)]/40 mb-4">
                Request free devnet SOL for testing
              </p>
              <button
                onClick={handleAirdrop}
                disabled={airdropping}
                className={`neu-btn w-full py-3 ${airdropping ? 'opacity-50' : 'neu-btn-green'}`}
              >
                {airdropping ? '⏳ Requesting...' : '💧 Airdrop 2 SOL'}
              </button>
            </div>
          )}

          {/* Keyboard Shortcuts */}
          <div className="neu-card p-6">
            <h3 className="font-heading font-bold text-lg mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-2 font-mono text-xs">
              {[
                ['Ctrl + K', 'Search'],
                ['Ctrl + D', 'Toggle theme'],
                ['Ctrl + G', 'Toggle ghost mode'],
                ['Ctrl + N', 'New auction'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between p-2 border-2 border-[var(--border-color)]">
                  <span className="text-[var(--text-primary)]/50">{desc}</span>
                  <kbd className="px-2 py-0.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] text-[var(--accent-green)]">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
