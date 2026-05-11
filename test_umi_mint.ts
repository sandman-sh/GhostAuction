import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import bs58 from 'bs58';

async function run() {
  const umi = createUmi('https://api.devnet.solana.com').use(mplTokenMetadata());
  const myKeypair = umi.eddsa.generateKeypair();
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
  } catch(e: any) {
    console.log("Error:", e.message);
  }
}
run();
