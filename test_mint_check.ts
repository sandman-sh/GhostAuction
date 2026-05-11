import { Connection, PublicKey } from '@solana/web3.js';
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
async function run() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const mint = new PublicKey('oYJiWpDkZxQDsvx2Bcua1UpQgn7HFcmkEA8QufKgPss');
  const [metadataPDA] = PublicKey.findProgramAddressSync([Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()], TOKEN_METADATA_PROGRAM_ID);
  const accountInfo = await connection.getAccountInfo(metadataPDA);
  console.log("Metadata account:", !!accountInfo);
}
run();
