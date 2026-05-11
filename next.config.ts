import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
      { protocol: 'https', hostname: '**.mypinata.cloud' },
      { protocol: 'https', hostname: '**.ipfs.nftstorage.link' },
      { protocol: 'https', hostname: 'arweave.net' },
      { protocol: 'https', hostname: '**.arweave.net' },
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: 'cloudflare-ipfs.com' },
      { protocol: 'https', hostname: 'nftstorage.link' },
    ],
  },
};

export default nextConfig;
