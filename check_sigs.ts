import { Connection, PublicKey } from '@solana/web3.js';
async function run() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const mint = new PublicKey('oYJiWpDkZxQDsvx2Bcua1UpQgn7HFcmkEA8QufKgPss');
  const sigs = await connection.getSignaturesForAddress(mint);
  console.log(sigs);
}
run();
