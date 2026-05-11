import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
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

async function fetchJsonMetadata(uri: string) {
  try {
    if (!uri || uri.length < 5) return {};
    const fetchUrl = normalizeIpfsUrl(uri);
    if (!fetchUrl) return {};

    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest, props: { params: Promise<{ mint: string }> }) {
  const params = await props.params;
  const mintAddress = params.mint;

  try {
    const pubkey = new PublicKey(mintAddress);
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

    const metadataPDA = getMetadataPDA(pubkey);
    const accountInfo = await connection.getAccountInfo(metadataPDA);

    let name = `NFT ${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}`;
    let image = '';
    let uri = '';
    let description = '';

    if (accountInfo?.data) {
      const onChain = decodeMetadata(Buffer.from(accountInfo.data));
      if (onChain.name) name = onChain.name;
      uri = onChain.uri;

      if (onChain.uri) {
        const json = await fetchJsonMetadata(onChain.uri);
        if (json.name) name = json.name;
        if (json.image) image = normalizeIpfsUrl(json.image);
        if (json.description) description = json.description;
      }
    }

    return NextResponse.json({
      mint: mintAddress,
      name,
      image,
      uri,
      description,
    });
  } catch (error: any) {
    console.error('Error fetching NFT:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 400 });
  }
}
