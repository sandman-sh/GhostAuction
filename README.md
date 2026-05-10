<div align="center">
  <img src="./src/app/icon.png" alt="GhostAuction Logo" width="120" height="120" />
  <h1>👻 GhostAuction</h1>
  <p><strong>Privacy-first sealed-bid NFT auction protocol on Solana Devnet.</strong></p>
  <p><em>Invisible bids. Fair outcomes. Zero front-running.</em></p>

  [![Solana Devnet](https://img.shields.io/badge/Network-Solana_Devnet-14F195?style=flat-square&logo=solana)](https://explorer.solana.com/?cluster=devnet)
  [![MagicBlock](https://img.shields.io/badge/Ephemeral_Rollups-MagicBlock-9945FF?style=flat-square)](https://magicblock.gg/)
  [![Anchor](https://img.shields.io/badge/Smart_Contract-Anchor_0.31-blue?style=flat-square)](https://www.anchor-lang.com/)
  [![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
</div>

<br />

## 📖 Overview

Traditional on-chain auctions expose bids publicly, enabling **front-running, MEV exploitation, and bid manipulation**. GhostAuction eliminates these problems with a **Cryptographic Commit-Reveal Protocol** combined with **MagicBlock Ephemeral Rollups** — delivering invisible, sub-10ms bidding that settles securely on Solana Layer 1.

### 🔑 How It Works

```
 ┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
 │   COMMIT    │ ──▶ │  DELEGATION  │ ──▶ │   REVEAL    │ ──▶ │  FINALIZE    │
 │ sha256(amt  │     │  MagicBlock  │     │ Verify hash │     │ NFT → Winner │
 │  + nonce)   │     │  Rollup      │     │ on Devnet   │     │ SOL → Seller │
 └─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

1. **Commit Phase** — Bidders submit `sha256(amount || secret_nonce)` hash. The actual bid amount stays completely hidden on-chain.
2. **Delegation (MagicBlock)** — The Auction PDA is delegated to a MagicBlock Ephemeral Rollup for sub-10ms, gasless bid submissions.
3. **Reveal Phase** — State settles back to Devnet. Bidders reveal their `amount` and `nonce`. The smart contract verifies the hash matches.
4. **Finalization** — Highest verified bid wins the NFT from escrow. Seller receives SOL. Losing bidders claim refunds instantly.

---

## ⚡ Features

| Feature | Description |
|---------|-------------|
| **Sealed-Bid Auctions** | Commit-reveal protocol ensures bids are invisible until the reveal phase |
| **NFT Minting** | Mint NFTs directly in-app with images uploaded to IPFS via Pinata |
| **NFT Gallery Picker** | Visual gallery of your owned NFTs — select and auction in two clicks |
| **Ephemeral Bidding** | MagicBlock integration for gasless, high-frequency bids off the base layer |
| **On-Chain Escrow** | All SOL deposits and NFTs held in PDA-controlled escrow vaults |
| **Bonfida SNS** | Wallet addresses auto-resolve to human-readable `.sol` domains |
| **Ghost Mode** | UI toggle anonymizes addresses into deterministic aliases (e.g., `Phantom#A4B1`) |
| **Light / Dark Mode** | Dynamic theme switching with neubrutalist design system |
| **IPFS Storage** | NFT images and metadata persisted on Pinata IPFS |

---

## 🏗 Tech Stack

### Smart Contract (Rust)
| Component | Version |
|-----------|---------|
| Anchor Lang | `0.31.1` |
| Anchor SPL | `0.31.1` (token feature) |
| Ephemeral Rollups SDK | `0.13.0` |
| Anchor CLI | `1.0.0` |

### Frontend (TypeScript)
| Component | Version |
|-----------|---------|
| Next.js | `16.2.6` (App Router, Turbopack) |
| React | `19.2.4` |
| Tailwind CSS | `4.x` |
| Framer Motion | `12.x` |
| `@coral-xyz/anchor` | `0.32.1` |
| `@solana/web3.js` | `1.98.4` |
| `@solana/wallet-adapter-react` | `0.15.x` |
| `@metaplex-foundation/mpl-token-metadata` | `3.4.0` |
| `@bonfida/spl-name-service` | `3.0.x` |
| Zustand | `5.x` (persisted stores) |
| React Query | `5.x` |

---

## 📂 Project Structure

```text
ghost-auction/
├── anchor/                             # Solana Smart Contract Workspace
│   ├── programs/ghost_auction/
│   │   ├── src/lib.rs                  # Auction logic, PDAs, CPIs, commit-reveal
│   │   └── Cargo.toml                  # Rust deps (Anchor, MagicBlock SDK)
│   ├── tests/ghost_auction.ts          # Anchor integration tests
│   └── Anchor.toml                     # Cluster config, program ID
│
├── src/                                # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx                    # Landing page (hero, features)
│   │   ├── create/page.tsx             # Create auction (NFT gallery → config → submit)
│   │   ├── explore/page.tsx            # Browse live auctions
│   │   ├── auction/[id]/page.tsx       # Auction detail (bid, reveal, finalize)
│   │   ├── mint/page.tsx               # Mint NFTs with Pinata IPFS upload
│   │   ├── dashboard/page.tsx          # User's auctions & bids
│   │   ├── profile/page.tsx            # Wallet profile & NFT holdings
│   │   ├── settings/page.tsx           # App settings
│   │   ├── providers.tsx               # Wallet, Query, Theme providers
│   │   ├── layout.tsx                  # Root layout with fonts & SEO
│   │   ├── globals.css                 # Neubrutalist design system
│   │   └── api/
│   │       ├── nfts/route.ts           # Fetch wallet NFTs + Metaplex metadata
│   │       ├── auctions/route.ts       # Auction indexing endpoint
│   │       ├── upload/route.ts         # Image upload to Pinata IPFS
│   │       └── upload-json/route.ts    # JSON metadata upload to Pinata IPFS
│   │
│   ├── components/
│   │   ├── auction/
│   │   │   ├── AuctionCard.tsx         # Auction preview card
│   │   │   └── NFTGallery.tsx          # Owned NFT picker with image grid
│   │   ├── layout/
│   │   │   ├── Navbar.tsx              # Navigation, wallet, theme toggle
│   │   │   └── DevnetBanner.tsx        # Devnet warning banner
│   │   └── ui/
│   │       └── CountdownTimer.tsx      # Live auction countdown
│   │
│   └── lib/
│       ├── solana.ts                   # Anchor provider, PDA derivation, bid hashing
│       ├── stores.ts                   # Zustand stores (Auctions, UI, User, Notifications)
│       ├── constants.ts                # Program ID, Pinata helpers, network config
│       ├── utils.ts                    # General utilities
│       └── idl/ghost_auction.ts        # Anchor IDL (TypeScript)
│
├── database/schema.sql                 # Supabase schema for auction indexing
├── scripts/
│   ├── deploy.sh                       # Anchor build & deploy script
│   └── setup.sh                        # Environment setup script
├── public/                             # Static assets (SVGs)
├── .env.example                        # Environment variable template
└── package.json
```

---

## 🛠 Local Development

### Prerequisites
- **Node.js** ≥ 20
- **Rust & Cargo** (for smart contract)
- **Solana CLI** (configured to Devnet)
- **Anchor CLI** v1.0.0
- **WSL** (required on Windows for Anchor builds)
- **Pinata account** ([app.pinata.cloud](https://app.pinata.cloud)) for IPFS storage

### 1. Clone & Install
```bash
git clone <repository-url>
cd ghost-auction
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Fill in the required values:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_PROGRAM_ID` | Your deployed Anchor program ID |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Your Pinata gateway hostname (e.g., `your-gw.mypinata.cloud`) |
| `PINATA_JWT` | Pinata API JWT token for IPFS uploads |
| `PINATA_API_KEY` | Pinata API key |
| `PINATA_API_SECRET` | Pinata API secret |

> **Note:** The gateway should be just the hostname — the app auto-prepends `https://` and appends `/ipfs/`.

### 3. Build & Deploy Smart Contract
> Run in WSL/Linux to avoid Windows path issues with Anchor.

```bash
cd anchor
anchor build
anchor deploy --provider.cluster devnet
```

> Requires ~2.5 SOL in your Solana CLI wallet for deployment rent.

### 4. Sync IDL
After building, copy the IDL to the frontend:
```bash
# If using generated JSON IDL:
cp target/idl/ghost_auction.json ../src/lib/idl/

# The project also uses a TypeScript IDL at:
# src/lib/idl/ghost_auction.ts
```

### 5. Start Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to use the app.

---

## 🔧 Smart Contract Instructions

The Anchor program (`BcGFyp1pKGdWgkQiN1Vf421eSEjeZq9mUEb1dh9Tm2CR`) exposes six instructions:

| Instruction | Description |
|-------------|-------------|
| `initializeAuction` | Creates auction PDA, escrows the seller's NFT into a program vault |
| `commitBid` | Accepts a `sha256` hash + SOL escrow deposit during the bidding phase |
| `revealBid` | Verifies `sha256(amount \|\| nonce)` matches the commitment |
| `finalizeAuction` | Transfers NFT to winner, SOL to seller after reveal phase ends |
| `claimRefund` | Returns escrowed SOL to losing/unrevealed bidders |
| `cancelAuction` | Seller cancels (only if zero bids), returns NFT from escrow |

### PDA Seeds

| Account | Seeds |
|---------|-------|
| `Auction` | `["auction", nft_mint, seller]` |
| `EscrowVault` | `["escrow_vault", auction]` |
| `BidAccount` | `["bid", auction, bidder]` |

---

## 🎨 Design System

GhostAuction uses a custom **Neubrutalist** design system:

- **Typography**: Space Grotesk (headings), Inter (body), JetBrains Mono (code)
- **Borders**: 3px solid with offset box shadows (`4px 4px 0px`)
- **Colors**: Neon green (`#39ff14`), Purple (`#bf5af2`), with cream/dark backgrounds
- **Animations**: Framer Motion page transitions, hover lifts, glow effects, skeleton loaders
- **Themes**: Light mode (cream `#f5f1e8`) and Dark mode (navy `#1a1a2e`)

---

## 📜 License

This project is licensed under the **MIT License**.
