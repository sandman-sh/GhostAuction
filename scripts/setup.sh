#!/bin/bash
# ============================================
# GhostAuction - Setup Script
# ============================================

set -e

echo "👻 GhostAuction Setup"
echo "===================="

# Check Node.js
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install: https://nodejs.org"; exit 1; }
NODE_VERSION=$(node -v)
echo "✓ Node.js: $NODE_VERSION"

# Check npm
command -v npm >/dev/null 2>&1 || { echo "❌ npm not found"; exit 1; }
echo "✓ npm: $(npm -v)"

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
npm install

# Copy env if not exists
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "✓ Created .env.local from .env.example"
  echo "⚠️  Please update .env.local with your actual values"
else
  echo "✓ .env.local already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Quick start:"
echo "  npm run dev         # Start development server"
echo "  npm run build       # Build for production"
echo ""
echo "🔗 Anchor setup (optional):"
echo "  cd anchor"
echo "  anchor build        # Build smart contracts"
echo "  anchor test         # Run tests"
echo "  ./scripts/deploy.sh # Deploy to devnet"
echo ""
echo "💧 Get devnet SOL:"
echo "  solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet"
echo "  or use https://faucet.solana.com"
echo ""
