use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_spl::associated_token::AssociatedToken;
use ephemeral_rollups_sdk::ephem::delegate_account;
use ephemeral_rollups_sdk::anchor::ephemeral;

declare_id!("BcGFyp1pKGdWgkQiN1Vf421eSEjeZq9mUEb1dh9Tm2CR");

#[ephemeral]
#[program]
pub mod ghost_auction {
    use super::*;

    /// Initialize a new sealed-bid auction
    pub fn initialize_auction(
        ctx: Context<InitializeAuction>,
        reserve_price: u64,
        start_time: i64,
        bidding_duration: i64,
        reveal_duration: i64,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(reserve_price > 0, GhostError::BidBelowReserve);
        require!(bidding_duration >= 3600, GhostError::InvalidDuration);
        require!(reveal_duration >= 1800, GhostError::InvalidDuration);

        auction.seller = ctx.accounts.seller.key();
        auction.nft_mint = ctx.accounts.nft_mint.key();
        auction.reserve_price = reserve_price;
        auction.start_time = if start_time == 0 { clock.unix_timestamp } else { start_time };
        auction.bidding_end_time = auction.start_time + bidding_duration;
        auction.reveal_end_time = auction.bidding_end_time + reveal_duration;
        auction.highest_bid = 0;
        auction.highest_bidder = Pubkey::default();
        auction.total_bids = 0;
        auction.revealed_bids = 0;
        auction.state = AuctionState::Bidding;
        auction.bump = ctx.bumps.auction;
        auction.vault_bump = ctx.bumps.escrow_vault;
        auction.created_at = clock.unix_timestamp;

        // Transfer NFT to escrow
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.nft_token.to_account_info(),
                to: ctx.accounts.escrow_nft_token.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, 1)?;

        msg!("GhostAuction: Auction initialized for NFT {}", ctx.accounts.nft_mint.key());
        Ok(())
    }

    /// Submit a hashed bid commitment with escrowed funds
    pub fn commit_bid(
        ctx: Context<CommitBid>,
        bid_hash: [u8; 32],
        escrow_amount: u64,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(
            matches!(auction.state, AuctionState::Bidding),
            GhostError::AuctionNotActive
        );
        require!(clock.unix_timestamp >= auction.start_time, GhostError::AuctionNotStarted);
        require!(clock.unix_timestamp < auction.bidding_end_time, GhostError::BiddingEnded);
        require!(escrow_amount > 0, GhostError::InsufficientEscrow);

        let bid = &mut ctx.accounts.bid_account;
        bid.bidder = ctx.accounts.bidder.key();
        bid.auction = auction.key();
        bid.bid_hash = bid_hash;
        bid.escrow_amount = escrow_amount;
        bid.revealed_amount = 0;
        bid.is_revealed = false;
        bid.is_refunded = false;
        bid.is_winner = false;
        bid.committed_at = clock.unix_timestamp;
        bid.revealed_at = 0;
        bid.bump = ctx.bumps.bid_account;

        // Transfer escrow funds via system transfer
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.bidder.key(),
            &ctx.accounts.escrow_vault.key(),
            escrow_amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.bidder.to_account_info(),
                ctx.accounts.escrow_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        auction.total_bids += 1;
        msg!("GhostAuction: Bid committed by {}", ctx.accounts.bidder.key());
        Ok(())
    }

    /// Reveal a previously committed bid
    pub fn reveal_bid(
        ctx: Context<RevealBid>,
        amount: u64,
        nonce: [u8; 32],
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let bid = &mut ctx.accounts.bid_account;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp >= auction.bidding_end_time, GhostError::BiddingNotEnded);
        require!(clock.unix_timestamp < auction.reveal_end_time, GhostError::RevealEnded);
        require!(!bid.is_revealed, GhostError::BidAlreadyRevealed);

        // Verify hash: keccak256(amount_le_bytes || nonce) == bid_hash
        let mut data = Vec::with_capacity(40);
        data.extend_from_slice(&amount.to_le_bytes());
        data.extend_from_slice(&nonce);
        let computed_hash = keccak::hash(&data);
        require!(computed_hash.0 == bid.bid_hash, GhostError::InvalidBidHash);

        require!(amount <= bid.escrow_amount, GhostError::InsufficientEscrow);

        bid.revealed_amount = amount;
        bid.is_revealed = true;
        bid.revealed_at = clock.unix_timestamp;

        if amount >= auction.reserve_price && amount > auction.highest_bid {
            auction.highest_bid = amount;
            auction.highest_bidder = ctx.accounts.bidder.key();
        }

        auction.revealed_bids += 1;

        if matches!(auction.state, AuctionState::Bidding) {
            auction.state = AuctionState::Reveal;
        }

        msg!("GhostAuction: Bid revealed {} lamports by {}", amount, ctx.accounts.bidder.key());
        Ok(())
    }

    /// Finalize auction: transfer NFT to winner, funds to seller
    pub fn finalize_auction(ctx: Context<FinalizeAuction>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp >= auction.reveal_end_time, GhostError::RevealNotEnded);
        require!(!matches!(auction.state, AuctionState::Finalized), GhostError::AuctionAlreadyFinalized);
        require!(auction.highest_bid > 0, GhostError::NoBidsRevealed);

        let bid = &mut ctx.accounts.winner_bid_account;
        require!(bid.bidder == auction.highest_bidder, GhostError::NotWinner);

        // Transfer NFT from escrow to winner
        let auction_key = auction.key();
        let seeds: &[&[u8]] = &[
            b"escrow_vault",
            auction_key.as_ref(),
            &[auction.vault_bump],
        ];
        let signer_seeds = &[seeds];

        let transfer_nft_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_nft_token.to_account_info(),
                to: ctx.accounts.winner_nft_token.to_account_info(),
                authority: ctx.accounts.escrow_vault.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_nft_ctx, 1)?;

        // Transfer winning bid to seller
        let seller_amount = auction.highest_bid;
        **ctx.accounts.escrow_vault.to_account_info().try_borrow_mut_lamports()? -= seller_amount;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += seller_amount;

        bid.is_winner = true;
        auction.state = AuctionState::Finalized;

        msg!("GhostAuction: Finalized! Winner: {}", auction.highest_bidder);
        Ok(())
    }

    /// Claim refund for losing bidders
    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let auction = &ctx.accounts.auction;
        let bid = &mut ctx.accounts.bid_account;

        require!(
            matches!(auction.state, AuctionState::Finalized) ||
            matches!(auction.state, AuctionState::Cancelled),
            GhostError::NotRefundable
        );
        require!(!bid.is_winner, GhostError::WinnerCannotRefund);
        require!(!bid.is_refunded, GhostError::AlreadyRefunded);

        let refund_amount = bid.escrow_amount;
        bid.is_refunded = true;

        **ctx.accounts.escrow_vault.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
        **ctx.accounts.bidder.to_account_info().try_borrow_mut_lamports()? += refund_amount;

        msg!("GhostAuction: Refund {} lamports to {}", refund_amount, ctx.accounts.bidder.key());
        Ok(())
    }

    /// Cancel auction (only if no bids)
    pub fn cancel_auction(ctx: Context<CancelAuction>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;

        require!(auction.seller == ctx.accounts.seller.key(), GhostError::NotSeller);
        require!(auction.total_bids == 0, GhostError::HasBids);

        // Return NFT to seller
        let auction_key = auction.key();
        let seeds: &[&[u8]] = &[
            b"escrow_vault",
            auction_key.as_ref(),
            &[auction.vault_bump],
        ];
        let signer_seeds = &[seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_nft_token.to_account_info(),
                to: ctx.accounts.nft_token.to_account_info(),
                authority: ctx.accounts.escrow_vault.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi_ctx, 1)?;

        auction.state = AuctionState::Cancelled;
        msg!("GhostAuction: Auction cancelled by {}", ctx.accounts.seller.key());
        Ok(())
    }

    /// Delegate auction to an Ephemeral Rollup
    pub fn delegate_auction(ctx: Context<DelegateAuction>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        require!(auction.seller == ctx.accounts.seller.key(), GhostError::NotSeller);
        require!(matches!(auction.state, AuctionState::Bidding), GhostError::AuctionNotActive);

        // Delegate the auction account
        // The MagicBlock ER SDK handles the delegation instruction CPI
        let mut account_info = ctx.accounts.auction.to_account_info();
        let pda_signer_seeds: &[&[&[u8]]] = &[&[
            b"auction",
            auction.nft_mint.as_ref(),
            auction.seller.as_ref(),
            &[auction.bump],
        ]];
        
        delegate_account(
            &ctx.accounts.payer.to_account_info(),
            &ctx.accounts.magic_program.to_account_info(),
            &mut account_info,
            &ctx.accounts.ephemeral_rollup.to_account_info(),
            &[],
            pda_signer_seeds,
        )?;

        msg!("GhostAuction: Delegated auction to Ephemeral Rollup!");
        Ok(())
    }
}

// ============ Account Structures ============

#[account]
pub struct Auction {
    pub seller: Pubkey,           // 32
    pub nft_mint: Pubkey,         // 32
    pub reserve_price: u64,       // 8
    pub start_time: i64,          // 8
    pub bidding_end_time: i64,    // 8
    pub reveal_end_time: i64,     // 8
    pub highest_bid: u64,         // 8
    pub highest_bidder: Pubkey,   // 32
    pub total_bids: u32,          // 4
    pub revealed_bids: u32,       // 4
    pub state: AuctionState,      // 1
    pub bump: u8,                 // 1
    pub vault_bump: u8,           // 1
    pub created_at: i64,          // 8
}
// 8 (disc) + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 32 + 4 + 4 + 1 + 1 + 1 + 8 = 163

#[account]
pub struct BidAccount {
    pub bidder: Pubkey,           // 32
    pub auction: Pubkey,          // 32
    pub bid_hash: [u8; 32],       // 32
    pub escrow_amount: u64,       // 8
    pub revealed_amount: u64,     // 8
    pub is_revealed: bool,        // 1
    pub is_refunded: bool,        // 1
    pub is_winner: bool,          // 1
    pub committed_at: i64,        // 8
    pub revealed_at: i64,         // 8
    pub bump: u8,                 // 1
}
// 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1 + 1 + 8 + 8 + 1 = 140

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum AuctionState {
    Created,
    Bidding,
    Reveal,
    Finalized,
    Cancelled,
}

// ============ Instruction Contexts ============

#[derive(Accounts)]
pub struct InitializeAuction<'info> {
    #[account(
        init,
        payer = seller,
        space = 8 + 163,
        seeds = [b"auction", nft_mint.key().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub auction: Account<'info, Auction>,

    /// CHECK: PDA used as escrow vault for holding SOL
    #[account(
        mut,
        seeds = [b"escrow_vault", auction.key().as_ref()],
        bump
    )]
    pub escrow_vault: UncheckedAccount<'info>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = seller,
    )]
    pub nft_token: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = seller,
        associated_token::mint = nft_mint,
        associated_token::authority = escrow_vault,
    )]
    pub escrow_nft_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CommitBid<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,

    #[account(
        init,
        payer = bidder,
        space = 8 + 140,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub bid_account: Account<'info, BidAccount>,

    /// CHECK: PDA escrow vault
    #[account(
        mut,
        seeds = [b"escrow_vault", auction.key().as_ref()],
        bump
    )]
    pub escrow_vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevealBid<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid_account.bump,
        has_one = bidder,
        has_one = auction,
    )]
    pub bid_account: Account<'info, BidAccount>,

    #[account(mut)]
    pub bidder: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeAuction<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,

    /// CHECK: PDA escrow vault
    #[account(
        mut,
        seeds = [b"escrow_vault", auction.key().as_ref()],
        bump = auction.vault_bump,
    )]
    pub escrow_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        has_one = auction,
    )]
    pub winner_bid_account: Account<'info, BidAccount>,

    #[account(mut)]
    pub escrow_nft_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub winner_nft_token: Account<'info, TokenAccount>,

    /// CHECK: Seller receives funds
    #[account(
        mut,
        constraint = seller.key() == auction.seller @ GhostError::NotSeller,
    )]
    pub seller: UncheckedAccount<'info>,

    /// CHECK: Winner receives NFT
    #[account(
        mut,
        constraint = winner.key() == auction.highest_bidder @ GhostError::NotWinner,
    )]
    pub winner: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid_account.bump,
        has_one = bidder,
        has_one = auction,
    )]
    pub bid_account: Account<'info, BidAccount>,

    /// CHECK: PDA escrow vault
    #[account(
        mut,
        seeds = [b"escrow_vault", auction.key().as_ref()],
        bump = auction.vault_bump,
    )]
    pub escrow_vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelAuction<'info> {
    #[account(mut, has_one = seller)]
    pub auction: Account<'info, Auction>,

    /// CHECK: PDA escrow vault
    #[account(
        mut,
        seeds = [b"escrow_vault", auction.key().as_ref()],
        bump = auction.vault_bump,
    )]
    pub escrow_vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub escrow_nft_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub nft_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ============ Error Codes ============

#[error_code]
pub enum GhostError {
    #[msg("Auction is not in active bidding state")]
    AuctionNotActive,
    #[msg("Bidding phase has not ended yet")]
    BiddingNotEnded,
    #[msg("Reveal phase has ended")]
    RevealEnded,
    #[msg("Reveal phase has not ended yet")]
    RevealNotEnded,
    #[msg("Revealed bid does not match committed hash")]
    InvalidBidHash,
    #[msg("Bid has already been revealed")]
    BidAlreadyRevealed,
    #[msg("Bid is below reserve price")]
    BidBelowReserve,
    #[msg("Only the seller can perform this action")]
    NotSeller,
    #[msg("Auction has already been finalized")]
    AuctionAlreadyFinalized,
    #[msg("Bid is not eligible for refund")]
    NotRefundable,
    #[msg("Escrow amount insufficient")]
    InsufficientEscrow,
    #[msg("Auction has not started yet")]
    AuctionNotStarted,
    #[msg("Bidding period has ended")]
    BiddingEnded,
    #[msg("Cannot cancel auction with existing bids")]
    HasBids,
    #[msg("Invalid auction duration")]
    InvalidDuration,
    #[msg("Not the winning bidder")]
    NotWinner,
    #[msg("Winner cannot claim refund")]
    WinnerCannotRefund,
    #[msg("Already refunded")]
    AlreadyRefunded,
    #[msg("No bids were revealed")]
    NoBidsRevealed,
}

#[derive(Accounts)]
pub struct DelegateAuction<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Must match the seller to authorize
    #[account(mut, constraint = seller.key() == auction.seller)]
    pub seller: Signer<'info>,

    /// CHECK: MagicBlock ephemeral rollup program
    pub magic_program: UncheckedAccount<'info>,

    /// CHECK: The ephemeral rollup account
    #[account(mut)]
    pub ephemeral_rollup: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
