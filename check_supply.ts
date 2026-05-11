import { Connection, PublicKey } from '@solana/web3.js';
async function run() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const mint = new PublicKey('oYJiWpDkZxQDsvx2Bcua1UpQgn7HFcmkEA8QufKgPss');
  try {
    const supply = await connection.getTokenSupply(mint);
    console.log("Supply:", supply.value);
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}
run();
