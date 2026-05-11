import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const idl = JSON.parse(fs.readFileSync('./src/lib/idl/ghost_auction.json', 'utf-8'));
const wallet = {
  publicKey: new PublicKey('11111111111111111111111111111111'),
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any) => txs,
};
const provider = new AnchorProvider(connection, wallet as any, {});
const program = new Program(idl, provider);

async function run() {
  const all = await program.account.auction.all();
  console.log("Found:", all.length);
}
run().catch(console.error);
