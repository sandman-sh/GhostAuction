import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Metaplex Token Metadata Program
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

function getGatewayUrl(): string {
  const gw = (process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  return `https://${gw}/ipfs`;
}

function normalizeIpfsUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return `${getGatewayUrl()}/${url.slice(7)}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('Qm') || url.startsWith('bafy')) {
    return `${getGatewayUrl()}/${url}`;
  }
  return url;
}

function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

// Decode on-chain metadata (borsh-like manual decode for the name/uri fields)
function decodeMetadata(data: Buffer): { name: string; symbol: string; uri: string } {
  try {
    // Skip: key (1) + update_authority (32) + mint (32) = 65
    let offset = 65;

    // Name: 4-byte length prefix + string
    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLen).toString('utf8').replace(/\0/g, '').trim();
    offset += nameLen;

    // Symbol: 4-byte length prefix + string
    const symbolLen = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLen).toString('utf8').replace(/\0/g, '').trim();
    offset += symbolLen;

    // URI: 4-byte length prefix + string
    const uriLen = data.readUInt32LE(offset);
    offset += 4;
    const uri = data.slice(offset, offset + uriLen).toString('utf8').replace(/\0/g, '').trim();

    return { name, symbol, uri };
  } catch {
    return { name: '', symbol: '', uri: '' };
  }
}

async function fetchJsonMetadata(uri: string): Promise<{ name?: string; image?: string; description?: string }> {
  try {
    if (!uri || uri.length < 5) return {};

    const fetchUrl = normalizeIpfsUrl(uri);
    if (!fetchUrl) return {};

    const res = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
  }

  try {
    const pubkey = new PublicKey(wallet);
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

    // Get all token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_PROGRAM_ID,
    });

    // Filter for NFTs (decimals === 0, amount === 1)
    const nftAccounts = tokenAccounts.value.filter((ta) => {
      const parsed = ta.account.data.parsed;
      if (!parsed) return false;
      const info = parsed.info;
      if (!info || !info.tokenAmount) return false;
      return (
        info.tokenAmount.decimals === 0 &&
        info.tokenAmount.uiAmount === 1
      );
    });

    // Get list of mint addresses for on-chain lookup
    const mintAddresses = nftAccounts.map((ta) => ta.account.data.parsed.info.mint as string);

    // Fetch metadata for each NFT — try on-chain first, then fallback
    const nfts = await Promise.all(
      mintAddresses.map(async (mintAddress) => {
        const mintPubkey = new PublicKey(mintAddress);

        let name = `NFT ${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}`;
        let image = '';
        let uri = '';
        let description = '';

        try {
          // Try Metaplex on-chain metadata
          const metadataPDA = getMetadataPDA(mintPubkey);
          const accountInfo = await connection.getAccountInfo(metadataPDA);

          if (accountInfo?.data) {
            const onChain = decodeMetadata(Buffer.from(accountInfo.data));
            if (onChain.name) name = onChain.name;
            uri = onChain.uri;

            // Fetch off-chain JSON metadata for image
            if (onChain.uri) {
              const json = await fetchJsonMetadata(onChain.uri);
              if (json.name) name = json.name;
              if (json.image) image = normalizeIpfsUrl(json.image);
              if (json.description) description = json.description;
            }
          }
        } catch (err) {
          // Metaplex metadata not found — this is normal for bare SPL tokens
        }

        return {
          mint: mintAddress,
          name,
          image,
          uri,
          description,
        };
      })
    );

    return NextResponse.json({ nfts, count: nfts.length });
  } catch (error: any) {
    console.error('Error fetching NFTs:', error);
    return NextResponse.json({ error: error.message || 'Unknown error fetching NFTs' }, { status: 400 });
  }
}
