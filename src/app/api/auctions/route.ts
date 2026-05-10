import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const connection = new Connection(RPC_URL, 'confirmed');
    const pubkey = new PublicKey(address);

    // Fetch recent transactions for an auction PDA
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 50 });

    const activities = await Promise.all(
      signatures.map(async (sig) => {
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          // Parse memo instructions for GhostAuction events
          const memoData = tx?.transaction.message.instructions
            .filter((ix: any) => ix.programId?.toBase58() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
            .map((ix: any) => {
              try {
                return JSON.parse(ix.parsed);
              } catch {
                return null;
              }
            })
            .filter(Boolean);

          return {
            signature: sig.signature,
            blockTime: sig.blockTime,
            slot: sig.slot,
            err: sig.err,
            memo: memoData?.[0] || null,
          };
        } catch {
          return {
            signature: sig.signature,
            blockTime: sig.blockTime,
            slot: sig.slot,
            err: sig.err,
            memo: null,
          };
        }
      })
    );

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('Auction API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
