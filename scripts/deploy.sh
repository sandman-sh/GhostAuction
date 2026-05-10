#!/bin/bash
# ============================================
# GhostAuction - Anchor Deploy Script
# Deploy to Solana Devnet
# ============================================

set -e

echo "🏗️  GhostAuction Deployment Script"
echo "=================================="

# Check prerequisites
command -v solana >/dev/null 2>&1 || { echo "❌ solana-cli not found. Install: https://docs.solana.com/cli/install-solana-cli-tools"; exit 1; }
command -v anchor >/dev/null 2>&1 || { echo "❌ anchor not found. Install: cargo install --git https://github.com/coral-xyz/anchor avm --locked"; exit 1; }

# Set network to devnet
echo "📡 Setting network to devnet..."
solana config set --url https://api.devnet.solana.com

# Check wallet balance
BALANCE=$(solana balance | awk '{print $1}')
echo "💰 Wallet balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
  echo "⚠️  Low balance. Requesting airdrop..."
  solana airdrop 2
  sleep 5
fi

# Build the program
echo "🔨 Building Anchor program..."
cd anchor
anchor build

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/ghost_auction-keypair.json)
echo "📋 Program ID: $PROGRAM_ID"

# Update program ID in lib.rs
echo "📝 Updating program ID in source..."
sed -i "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/" programs/ghost_auction/src/lib.rs

# Update Anchor.toml
sed -i "s/ghost_auction = \".*\"/ghost_auction = \"$PROGRAM_ID\"/" Anchor.toml

# Rebuild with correct program ID
echo "🔨 Rebuilding with correct program ID..."
anchor build

# Deploy to devnet
echo "🚀 Deploying to Solana Devnet..."
anchor deploy --provider.cluster devnet

echo ""
echo "✅ Deployment successful!"
echo "=================================="
echo "Program ID: $PROGRAM_ID"
echo "Network: Devnet"
echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "📝 Next steps:"
echo "1. Update NEXT_PUBLIC_PROGRAM_ID in frontend/.env.local"
echo "2. Update src/lib/constants.ts with the new program ID"
echo "3. Run the frontend: cd .. && npm run dev"
echo ""
