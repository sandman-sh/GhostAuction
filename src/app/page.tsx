'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import CountdownTimer from '@/components/ui/CountdownTimer';

const FEATURES = [
  {
    icon: '⚡',
    title: 'MagicBlock Rollups',
    desc: 'Auctions are delegated to Ephemeral Rollups for gasless, sub-10ms bid submissions without base-layer congestion.',
  },
  {
    icon: '🔒',
    title: 'Sealed Bids',
    desc: 'Commit-reveal scheme uses keccak256 hashing to ensure no one sees your bid until the reveal phase.',
  },
  {
    icon: '🌐',
    title: 'Solana Name Service',
    desc: 'Native @bonfida/spl-name-service integration automatically resolves and displays your .sol domain identity.',
  },
  {
    icon: '🏦',
    title: 'Secure Escrow',
    desc: 'Real SOL and NFTs are locked in on-chain PDA escrow vaults. No intermediary risk.',
  },
  {
    icon: '👻',
    title: 'Ghost Mode',
    desc: 'Hide your SNS name and address behind a deterministic anonymous hacker alias for complete privacy.',
  },
  {
    icon: '🔗',
    title: 'On-Chain Truth',
    desc: 'Every bid, reveal, and transfer is verified by our custom Anchor program on Solana Devnet.',
  },
];

const ROADMAP = [
  { phase: 'Phase 1', title: 'Cryptography', items: ['Anchor Smart Contracts', 'Commit-Reveal System', 'On-Chain Escrow Vaults'], status: 'done' },
  { phase: 'Phase 2', title: 'Execution Layer', items: ['MagicBlock Integration', 'Gasless Bidding', 'Sub-10ms Ephemeral Rollups'], status: 'done' },
  { phase: 'Phase 3', title: 'Identity Layer', items: ['Bonfida SNS Resolution', 'Ghost Mode Anonymity', 'Wallet-to-Domain Mapping'], status: 'done' },
  { phase: 'Phase 4', title: 'Mainnet & Beyond', items: ['Security Audits', 'Private TEE Scaling', 'Solana Mainnet Launch'], status: 'upcoming' },
];

const FAQ = [
  { q: 'How do sealed bids work?', a: 'You commit a hashed version of your bid. The actual amount stays hidden until the reveal phase. This prevents front-running and bid manipulation.' },
  { q: 'Why use MagicBlock Ephemeral Rollups?', a: 'By delegating the auction to an Ephemeral Rollup during the bidding phase, we enable gasless, sub-10ms bid submissions. The state is settled back to the Solana Devnet base layer for the reveal and finalization phases.' },
  { q: 'Is my money safe?', a: 'All funds are held in on-chain PDA escrow vaults controlled by the smart contract. No one — not even us — can access your funds.' },
  { q: 'What happens if I lose?', a: 'Losing bidders can claim their escrowed funds back immediately after auction finalization.' },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

export default function HomePage() {
  const { connected } = useWallet();

  return (
    <div className="grid-bg">
      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--accent-green)]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--accent-purple)]/5 rounded-full blur-3xl" />
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-16 h-20 border-3 border-[var(--border-color)] bg-[var(--bg-secondary)]/80"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                rotate: `${-10 + i * 5}deg`,
              }}
              animate={{
                y: [0, -15, 0],
                rotate: [`${-10 + i * 5}deg`, `${-5 + i * 5}deg`, `${-10 + i * 5}deg`],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <div className="w-full h-2/3 bg-gradient-to-br from-[var(--accent-green)]/20 to-[var(--accent-purple)]/20" />
              <div className="p-1">
                <div className="w-full h-1 bg-[var(--border-color)] mb-0.5" />
                <div className="w-2/3 h-1 bg-[var(--border-color)]" />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="container-ghost relative z-10 py-20">
          <motion.div {...fadeUp} className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-8 border-3 border-[var(--accent-green)] bg-[var(--accent-green)]/10 font-mono text-sm text-[var(--accent-green)]"
            >
              <span className="w-2 h-2 bg-[var(--accent-green)] rounded-full pulse-glow" />
              LIVE ON SOLANA DEVNET
            </motion.div>

            <h1 className="font-heading text-5xl sm:text-6xl md:text-8xl font-black leading-[0.9] mb-6 tracking-tight">
              Private NFT
              <br />
              <span className="text-[var(--accent-green)] glow-green">Auctions</span>
              <br />
              on <span className="text-[var(--accent-purple)] glow-purple">Solana.</span>
            </h1>

            <p className="font-heading text-xl sm:text-2xl text-[var(--text-primary)]/60 mb-12 max-w-2xl mx-auto">
              Invisible bids. Fair outcomes.
              <br />
              <span className="font-mono text-sm text-[var(--accent-green)]/80">
                // commit → reveal → settle
              </span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/explore" className="neu-btn neu-btn-green text-lg px-8 py-4">
                Explore Auctions
              </Link>
              <Link href={connected ? '/create' : '/explore'} className="neu-btn neu-btn-purple text-lg px-8 py-4">
                {connected ? 'Create Auction' : 'Connect & Create'}
              </Link>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 font-mono text-sm text-[var(--text-primary)]/40">
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent-green)]">◎</span> Zero fees
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent-purple)]">🔐</span> Sealed bids
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent-green)]">⚡</span> Instant settle
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className="py-24 border-t-3 border-[var(--border-color)]">
        <div className="container-ghost">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="font-heading text-4xl sm:text-5xl font-black mb-4">
              Why <span className="text-[var(--accent-green)]">Ghost</span>Auction?
            </h2>
            <p className="font-mono text-sm text-[var(--text-primary)]/50 max-w-xl mx-auto">
              A protocol designed for fairness, privacy, and trustless settlement.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                className="neu-card p-6 group cursor-default"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-heading font-bold text-xl mb-2 group-hover:text-[var(--accent-green)] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-[var(--text-primary)]/60 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="py-24 border-t-3 border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="container-ghost">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="font-heading text-4xl sm:text-5xl font-black mb-4">
              How It <span className="text-[var(--accent-purple)]">Works</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Create & Delegate', desc: 'Seller lists NFT. The Auction is automatically delegated to a MagicBlock Ephemeral Rollup.', icon: '🎨' },
              { step: '02', title: 'Gasless Commit', desc: 'Bidders submit hashed bids (Commit) instantly and gaslessly on the rollup layer.', icon: '⚡' },
              { step: '03', title: 'Settle & Reveal', desc: 'Rollup state settles back to Devnet. Bidders reveal their actual amounts.', icon: '👁️' },
              { step: '04', title: 'Finalize', desc: 'Highest verified bid wins. Escrow transfers NFT to winner and SOL to seller.', icon: '🏆' },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="neu-card p-6 text-center h-full">
                  <div className="text-4xl mb-3">{step.icon}</div>
                  <div className="font-mono text-xs text-[var(--accent-green)] mb-2">STEP {step.step}</div>
                  <h3 className="font-heading font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-[var(--text-primary)]/60">{step.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 text-[var(--accent-green)] text-xl">
                    →
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== ROADMAP ====== */}
      <section className="py-24 border-t-3 border-[var(--border-color)]">
        <div className="container-ghost">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="font-heading text-4xl sm:text-5xl font-black mb-4">
              Road<span className="text-[var(--accent-green)]">map</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {ROADMAP.map((phase, i) => (
              <motion.div
                key={phase.phase}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`neu-card p-6 ${
                  phase.status === 'active' ? 'border-[var(--accent-green)]' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`neu-badge ${
                    phase.status === 'done' ? 'bg-[var(--accent-green)] text-black' :
                    phase.status === 'active' ? 'bg-[var(--accent-purple)] text-white' :
                    'bg-[var(--border-color)] text-[var(--bg-primary)]'
                  }`}>
                    {phase.phase}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-lg mb-3">{phase.title}</h3>
                <ul className="space-y-1.5">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[var(--text-primary)]/60">
                      <span className={phase.status === 'done' ? 'text-[var(--accent-green)]' : 'text-[var(--border-color)]'}>
                        {phase.status === 'done' ? '✓' : '○'}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section className="py-24 border-t-3 border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="container-ghost max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="font-heading text-4xl sm:text-5xl font-black mb-4">
              F<span className="text-[var(--accent-purple)]">A</span>Q
            </h2>
          </motion.div>

          <div className="space-y-4">
            {FAQ.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="neu-card p-6"
              >
                <h3 className="font-heading font-bold text-lg mb-2 text-[var(--accent-green)]">
                  {faq.q}
                </h3>
                <p className="text-sm text-[var(--text-primary)]/70 leading-relaxed">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="py-24 border-t-3 border-[var(--border-color)]">
        <div className="container-ghost text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-heading text-4xl sm:text-6xl font-black mb-6">
              Bid in <span className="text-[var(--accent-green)] glow-green">Silence</span>
            </h2>
            <p className="font-heading text-xl text-[var(--text-primary)]/50 mb-10">
              Join the most private auction protocol on Solana.
            </p>
            <Link href="/explore" className="neu-btn neu-btn-green text-xl px-12 py-5">
              Launch App →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="border-t-3 border-[var(--border-color)] py-12 bg-[var(--bg-secondary)]">
        <div className="container-ghost">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[var(--accent-green)] border-2 border-black flex items-center justify-center font-bold text-black text-xs">
                G
              </div>
              <span className="font-heading font-bold">
                Ghost<span className="text-[var(--accent-green)]">Auction</span>
              </span>
            </div>
            <div className="flex items-center gap-6 font-mono text-xs text-[var(--text-primary)]/40">
              <span>Built on Solana</span>
              <span>•</span>
              <span>Open Source</span>
              <span>•</span>
              <span>Privacy First</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
