import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { createNft, fetchMetadataFromSeeds } from '@metaplex-foundation/mpl-token-metadata';
import bs58 from 'bs58';
import * as fs from 'fs';

async function run() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const umi = createUmi('https://api.devnet.solana.com');
  
  const secretKeyString = fs.readFileSync('C:\\Users\\12roh\\.config\\solana\\id.json', 'utf8');
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  
  const myKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(myKeypair));
  
  const mintSigner = generateSigner(umi);
  
  console.log("Minting with createNft...");
  try {
    const tx = await createNft(umi, {
      mint: mintSigner,
      name: "Test UMI NFT",
      uri: "https://example.com/metadata.json",
      sellerFeeBasisPoints: percentAmount(0),
    }).sendAndConfirm(umi);
    
    console.log("Mint address:", mintSigner.publicKey.toString());
    
    // Check metadata
    const metadata = await fetchMetadataFromSeeds(umi, { mint: mintSigner.publicKey });
    console.log("Metadata name:", metadata.name);
  } catch(e) {
    console.log("Error:", e);
  }
}
run();
