'use client';

import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { SOLANA_RPC_URL, SOLANA_NETWORK } from '@/lib/constants';
import { useUIStore, useUserStore } from '@/lib/stores';
import { getConnection, lamportsToSol } from '@/lib/solana';

import '@solana/wallet-adapter-react-ui/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

function BalanceTracker() {
  const { publicKey } = useWallet();
  const setBalance = useUserStore((s) => s.setBalance);
  const setSnsName = useUserStore((s) => s.setSnsName);

  useEffect(() => {
    if (!publicKey) {
      setBalance(0);
      setSnsName(null);
      return;
    }
    const connection = getConnection();
    
    // Fetch Balance
    const fetchBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(lamportsToSol(bal));
      } catch {
        setBalance(0);
      }
    };
    fetchBalance();

    // Fetch SNS Domain
    import('@bonfida/spl-name-service').then(({ performReverseLookup }) => {
      performReverseLookup(connection, publicKey)
        .then((domain) => setSnsName(`${domain}.sol`))
        .catch(() => setSnsName(null));
    });

    const id = connection.onAccountChange(publicKey, (info) => {
      setBalance(lamportsToSol(info.lamports));
    });
    
    return () => {
      connection.removeAccountChangeListener(id);
    };
  }, [publicKey, setBalance, setSnsName]);

  return null;
}

function ThemeApplier() {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const network = SOLANA_NETWORK === 'mainnet-beta'
    ? WalletAdapterNetwork.Mainnet
    : WalletAdapterNetwork.Devnet;

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={SOLANA_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeApplier />
            <BalanceTracker />
            {children}
            <ToasterWithTheme />
          </QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function ToasterWithTheme() {
  const theme = useUIStore((s) => s.theme);
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      toastOptions={{
        style: {
          background: theme === 'dark' ? '#1a1a2e' : '#fffef9',
          border: `3px solid ${theme === 'dark' ? '#333355' : '#000'}`,
          boxShadow: '4px 4px 0px #000',
          color: theme === 'dark' ? '#fafafa' : '#0a0a0a',
          fontFamily: 'Space Grotesk, sans-serif',
        },
      }}
    />
  );
}

