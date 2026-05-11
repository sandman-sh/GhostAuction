import { Connection, PublicKey } from '@solana/web3.js';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

function decodeMetadata(data: Buffer): { name: string; symbol: string; uri: string } {
  try {
    let offset = 65;
    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLen).toString('utf8').replace(/\0/g, '').trim();
    offset += nameLen;

    const symbolLen = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLen).toString('utf8').replace(/\0/g, '').trim();
    offset += symbolLen;

    const uriLen = data.readUInt32LE(offset);
    offset += 4;
    const uri = data.slice(offset, offset + uriLen).toString('utf8').replace(/\0/g, '').trim();

    return { name, symbol, uri };
  } catch {
    return { name: '', symbol: '', uri: '' };
  }
}

async function run() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const mint = new PublicKey('9JXNnvkFE6yLozAMeaJhXMpRvsdv3aCzaFJ6dVwRsetX');
  
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  
  const accountInfo = await connection.getAccountInfo(metadataPDA);
  if (!accountInfo) {
    console.log("No metadata account found!");
    return;
  }
  
  const decoded = decodeMetadata(accountInfo.data);
  console.log("On-chain URI:", decoded.uri);
}
run();
