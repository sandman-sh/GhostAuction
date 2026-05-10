import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const pinataJwt = process.env.PINATA_JWT;

    if (!pinataJwt || pinataJwt === 'your_pinata_jwt') {
      // Fallback: return a placeholder IPFS URL when Pinata is not configured
      // In production, you must configure PINATA_JWT
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const mimeType = file.type || 'image/png';
      const dataUri = `data:${mimeType};base64,${base64}`;

      return NextResponse.json({
        url: dataUri,
        fallback: true,
        message: 'Pinata not configured — using data URI fallback. Set PINATA_JWT in .env.local for IPFS storage.',
      });
    }

    // Upload to Pinata IPFS
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);

    const pinataMetadata = JSON.stringify({
      name: `ghost-auction-${Date.now()}`,
    });
    pinataFormData.append('pinataMetadata', pinataMetadata);

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: pinataFormData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Pinata error:', errText);
      return NextResponse.json({ error: 'IPFS upload failed' }, { status: 500 });
    }

    const data = await res.json();
    const gw = (process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const gatewayBase = gw.endsWith('.mypinata.cloud') ? `https://${gw}/ipfs` : `https://${gw}/ipfs`;
    const url = `${gatewayBase}/${data.IpfsHash}`;

    return NextResponse.json({ url, ipfsHash: data.IpfsHash });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
