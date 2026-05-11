'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getConnection } from '@/lib/solana';
import { getExplorerUrl, SOLANA_NETWORK } from '@/lib/constants';
import { useUserStore } from '@/lib/stores';

export default function MintNFTPage() {
  const { publicKey, sendTransaction, signTransaction, signAllTransactions, connected } = useWallet();
  const addNft = useUserStore((s) => s.addNft);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ mint: string; tx: string; image: string; metadataUri: string } | null>(null);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const uploadToIPFS = async (file: File): Promise<{ url: string; ipfsHash?: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      // Fallback: use data URI if IPFS upload fails
      const dataUri = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      return { url: dataUri };
    }

    const data = await res.json();
    return { url: data.url, ipfsHash: data.ipfsHash };
  };

  const uploadMetadata = async (imageUrl: string): Promise<{ url: string; ipfsHash?: string }> => {
    const metadata = {
      name,
      symbol: 'GHOST',
      description,
      image: imageUrl,
      attributes: [
        { trait_type: 'Platform', value: 'GhostAuction' },
        { trait_type: 'Network', value: SOLANA_NETWORK },
      ],
      properties: {
        files: [{ uri: imageUrl, type: imageFile?.type || 'image/png' }],
        category: 'image',
      },
    };

    const res = await fetch('/api/upload-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });

    if (!res.ok) {
      // Fallback: use data URI for metadata
      const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      return { url: URL.createObjectURL(blob) };
    }

    const data = await res.json();
    return { url: data.url, ipfsHash: data.ipfsHash };
  };

  const handleMint = async () => {
    if (!publicKey || !connected) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter an NFT name');
      return;
    }

    setMinting(true);
    try {
      const connection = getConnection();
      toast.info('Creating NFT on Solana Devnet...');

      // Upload image to IPFS via Pinata
      let imageUrl = '';
      if (imageFile) {
        toast.info('Uploading image to IPFS (Pinata)...');
        const imageResult = await uploadToIPFS(imageFile);
        imageUrl = imageResult.url;
      }
      toast.info('Uploading metadata to IPFS (Pinata)...');
      const metadataResult = await uploadMetadata(imageUrl);
      if (!signTransaction) {
        throw new Error('Wallet does not support signing transactions');
      }

      // Initialize UMI
      const { createUmi } = await import('@metaplex-foundation/umi-bundle-defaults');
      const { walletAdapterIdentity } = await import('@metaplex-foundation/umi-signer-wallet-adapters');
      const { createNft } = await import('@metaplex-foundation/mpl-token-metadata');
      const { generateSigner, percentAmount } = await import('@metaplex-foundation/umi');

      const umiWallet = {
        publicKey: publicKey,
        signTransaction: signTransaction as any,
        signAllTransactions: signAllTransactions as any,
      };

      const umi = createUmi('https://api.devnet.solana.com').use(walletAdapterIdentity(umiWallet as any));
      const mintSigner = generateSigner(umi);

      toast.info('Sending transaction via Metaplex...');
      
      const { signature } = await createNft(umi, {
        mint: mintSigner,
        authority: umi.identity,
        name: name,
        uri: metadataResult.url,
        sellerFeeBasisPoints: percentAmount(0),
      }).sendAndConfirm(umi);

      const mintAddress = mintSigner.publicKey.toString();
      const txSignature = signature.length ? Buffer.from(signature).toString('base64') : 'Success';
      // Buffer to base58 or hex is better, let's just show 'Success' for now or get it from umi.
      // UMI signatures are Uint8Array. We can convert to base58:
      const { bs58 } = await import('@coral-xyz/anchor/dist/cjs/utils/bytes');
      const txSigString = bs58.encode(signature);


      // ✅ Save NFT metadata to local store so the gallery can find it
      addNft({
        mint: mintAddress,
        name,
        image: imageUrl,
        uri: metadataResult.url,
        description,
        mintedAt: Date.now(),
      });

      setMintResult({
        mint: mintAddress,
        tx: txSigString,
        image: imageUrl,
        metadataUri: metadataResult.url,
      });

      toast.success('NFT minted successfully!');
    } catch (err: any) {
      console.error('Mint error:', err);
      toast.error(`Minting failed: ${err.message}`);
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="container-ghost py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="font-heading text-4xl font-black mb-2">
          Mint <span className="text-[var(--accent-green)]">NFT</span>
        </h1>
        <p className="font-mono text-sm text-[var(--text-primary)]/50 mb-8">
          Create a new NFT on Solana Devnet to auction
        </p>

        <div className="neu-card p-8 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block font-heading font-bold text-sm mb-2 uppercase tracking-wider">
              Artwork
            </label>
            <div
              className="relative aspect-square max-w-[300px] border-3 border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-center cursor-pointer hover:border-[var(--accent-green)] transition-colors overflow-hidden"
              onClick={() => document.getElementById('nft-image')?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <div className="text-4xl mb-2">🎨</div>
                  <p className="font-mono text-xs text-[var(--text-primary)]/40">
                    Click to upload image
                  </p>
                </div>
              )}
              <input
                id="nft-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block font-heading font-bold text-sm mb-2 uppercase tracking-wider">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Ghost NFT"
              className="neu-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-heading font-bold text-sm mb-2 uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A unique digital artwork..."
              rows={3}
              className="neu-input resize-none"
            />
          </div>

          {/* Mint Button */}
          <button
            onClick={handleMint}
            disabled={minting || !connected || !name.trim()}
            className={`neu-btn w-full py-4 ${
              minting ? 'opacity-50 cursor-not-allowed' : 'neu-btn-green'
            }`}
          >
            {!connected
              ? '🔌 Connect Wallet First'
              : minting
              ? '⏳ Minting on Devnet...'
              : '🎨 Mint NFT on Devnet'}
          </button>

          {/* Result */}
          {mintResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 border-3 border-[var(--accent-green)] bg-[var(--accent-green)]/10 space-y-3"
            >
              <h3 className="font-heading font-bold text-[var(--accent-green)]">
                ✓ NFT Minted Successfully!
              </h3>

              {/* Image Preview */}
              {mintResult.image && (
                <div className="w-24 h-24 border-2 border-black overflow-hidden">
                  <img
                    src={mintResult.image}
                    alt="Minted NFT"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-2 font-mono text-xs">
                <div>
                  <span className="text-[var(--text-primary)]/50">Mint: </span>
                  <span className="break-all">{mintResult.mint}</span>
                </div>
                <div>
                  <span className="text-[var(--text-primary)]/50">Tx: </span>
                  <a
                    href={getExplorerUrl(mintResult.tx)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-green)] underline break-all"
                  >
                    {mintResult.tx}
                  </a>
                </div>
                {mintResult.metadataUri && (
                  <div>
                    <span className="text-[var(--text-primary)]/50">Metadata: </span>
                    <a
                      href={mintResult.metadataUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-purple)] underline break-all"
                    >
                      View on IPFS ↗
                    </a>
                  </div>
                )}
              </div>
              <a
                href={`/create?mint=${mintResult.mint}`}
                className="neu-btn neu-btn-purple w-full mt-4"
              >
                → Create Auction with this NFT
              </a>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
