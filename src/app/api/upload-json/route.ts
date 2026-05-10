import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();

    const pinataJwt = process.env.PINATA_JWT;

    if (!pinataJwt || pinataJwt === 'your_pinata_jwt') {
      // Fallback: return data URI when Pinata is not configured
      const blob = JSON.stringify(json);
      const base64 = Buffer.from(blob).toString('base64');
      const dataUri = `data:application/json;base64,${base64}`;

      return NextResponse.json({
        url: dataUri,
        fallback: true,
        message: 'Pinata not configured — using data URI fallback.',
      });
    }

    // Upload JSON metadata to Pinata
    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: JSON.stringify({
        pinataContent: json,
        pinataMetadata: {
          name: `ghost-auction-metadata-${Date.now()}`,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Pinata JSON error:', errText);
      return NextResponse.json({ error: 'IPFS metadata upload failed' }, { status: 500 });
    }

    const data = await res.json();
    const gw = (process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const gatewayBase = gw.endsWith('.mypinata.cloud') ? `https://${gw}/ipfs` : `https://${gw}/ipfs`;
    const url = `${gatewayBase}/${data.IpfsHash}`;

    return NextResponse.json({ url, ipfsHash: data.IpfsHash });
  } catch (error: any) {
    console.error('Upload JSON error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
