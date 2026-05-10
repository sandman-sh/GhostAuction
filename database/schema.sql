-- ============================================
-- GhostAuction Database Schema
-- Supabase / PostgreSQL
-- ============================================
-- This schema serves as a caching/indexing layer.
-- The blockchain remains the source of truth.
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AUCTIONS TABLE
-- ============================================
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT UNIQUE NOT NULL,
  seller TEXT NOT NULL,
  nft_mint TEXT NOT NULL,
  nft_name TEXT,
  nft_image TEXT,
  nft_description TEXT,
  reserve_price BIGINT NOT NULL DEFAULT 0,
  start_time BIGINT NOT NULL,
  bidding_end_time BIGINT NOT NULL,
  reveal_end_time BIGINT NOT NULL,
  highest_bid BIGINT DEFAULT 0,
  highest_bidder TEXT,
  total_bids INTEGER DEFAULT 0,
  revealed_bids INTEGER DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'bidding',
  tx_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auctions_seller ON auctions(seller);
CREATE INDEX idx_auctions_state ON auctions(state);
CREATE INDEX idx_auctions_nft_mint ON auctions(nft_mint);
CREATE INDEX idx_auctions_bidding_end ON auctions(bidding_end_time);
CREATE INDEX idx_auctions_created_at ON auctions(created_at DESC);

-- ============================================
-- BIDS TABLE (cached/indexed)
-- ============================================
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_address TEXT NOT NULL REFERENCES auctions(address),
  bidder TEXT NOT NULL,
  bid_hash TEXT,
  escrow_amount BIGINT DEFAULT 0,
  revealed_amount BIGINT,
  is_revealed BOOLEAN DEFAULT FALSE,
  is_refunded BOOLEAN DEFAULT FALSE,
  is_winner BOOLEAN DEFAULT FALSE,
  commit_tx TEXT,
  reveal_tx TEXT,
  refund_tx TEXT,
  committed_at TIMESTAMPTZ DEFAULT NOW(),
  revealed_at TIMESTAMPTZ,
  UNIQUE(auction_address, bidder)
);

CREATE INDEX idx_bids_auction ON bids(auction_address);
CREATE INDEX idx_bids_bidder ON bids(bidder);

-- ============================================
-- ACTIVITY FEED
-- ============================================
CREATE TABLE activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_address TEXT REFERENCES auctions(address),
  event_type TEXT NOT NULL, -- 'auction_created', 'bid_committed', 'bid_revealed', 'auction_finalized', 'refund_claimed', 'auction_cancelled'
  actor TEXT NOT NULL, -- wallet address
  amount BIGINT,
  tx_signature TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_auction ON activity(auction_address);
CREATE INDEX idx_activity_actor ON activity(actor);
CREATE INDEX idx_activity_type ON activity(event_type);
CREATE INDEX idx_activity_created ON activity(created_at DESC);

-- ============================================
-- USER PROFILES (cached)
-- ============================================
CREATE TABLE profiles (
  wallet_address TEXT PRIMARY KEY,
  sns_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  reputation_score INTEGER DEFAULT 0,
  auctions_created INTEGER DEFAULT 0,
  auctions_won INTEGER DEFAULT 0,
  total_volume BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_sns ON profiles(sns_name);
CREATE INDEX idx_profiles_reputation ON profiles(reputation_score DESC);

-- ============================================
-- NFT METADATA CACHE
-- ============================================
CREATE TABLE nft_metadata (
  mint_address TEXT PRIMARY KEY,
  name TEXT,
  symbol TEXT,
  description TEXT,
  image TEXT,
  uri TEXT,
  collection TEXT,
  attributes JSONB,
  owner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nft_owner ON nft_metadata(owner);
CREATE INDEX idx_nft_collection ON nft_metadata(collection);

-- ============================================
-- ANALYTICS
-- ============================================
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_metric ON analytics(metric);
CREATE INDEX idx_analytics_time ON analytics(recorded_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auctions_updated_at
  BEFORE UPDATE ON auctions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (optional)
-- ============================================
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read auctions" ON auctions FOR SELECT USING (true);
CREATE POLICY "Public read activity" ON activity FOR SELECT USING (true);
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public read bids" ON bids FOR SELECT USING (true);

-- Authenticated insert/update (via service role)
CREATE POLICY "Service insert auctions" ON auctions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update auctions" ON auctions FOR UPDATE USING (true);
CREATE POLICY "Service insert bids" ON bids FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update bids" ON bids FOR UPDATE USING (true);
CREATE POLICY "Service insert activity" ON activity FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update profiles" ON profiles FOR UPDATE USING (true);
