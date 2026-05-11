import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---- Auction Store ----
export interface AuctionData {
  address: string;
  seller: string;
  nftMint: string;
  nftImage?: string;
  nftName?: string;
  reservePrice: number;
  startTime: number;
  biddingEndTime: number;
  revealEndTime: number;
  highestBid: number;
  highestBidder: string;
  totalBids: number;
  revealedBids: number;
  state: string;
  createdAt: number;
}

interface AuctionStore {
  auctions: AuctionData[];
  loading: boolean;
  setAuctions: (auctions: AuctionData[]) => void;
  addAuction: (auction: AuctionData) => void;
  updateAuction: (address: string, data: Partial<AuctionData>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuctionStore = create<AuctionStore>()(
  persist(
    (set) => ({
      auctions: [],
      loading: false,
      setAuctions: (auctions) => set({ auctions }),
      addAuction: (auction) =>
        set((s) => ({
          auctions: [auction, ...s.auctions.filter((a) => a.address !== auction.address)],
        })),
      updateAuction: (address, data) =>
        set((s) => ({
          auctions: s.auctions.map((a) => (a.address === address ? { ...a, ...data } : a)),
        })),
      setLoading: (loading) => set({ loading }),
    }),
    { 
      name: 'ghost-auction-auctions',
      version: 1, // Increment version to clear existing cache globally
    }
  )
);

// ---- UI Store ----
interface UIStore {
  theme: 'dark' | 'light';
  ghostMode: boolean;
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setGhostMode: (enabled: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'light',
      ghostMode: false,
      sidebarOpen: false,
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setGhostMode: (enabled) => set({ ghostMode: enabled }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'ghost-auction-ui' }
  )
);

// ---- User Store ----
export interface MintedNFT {
  mint: string;
  name: string;
  image: string;
  uri: string;
  description?: string;
  mintedAt?: number;
}

interface UserStore {
  snsName: string | null;
  balance: number;
  nfts: MintedNFT[];
  setSnsName: (name: string | null) => void;
  setBalance: (balance: number) => void;
  setNfts: (nfts: MintedNFT[]) => void;
  addNft: (nft: MintedNFT) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      snsName: null,
      balance: 0,
      nfts: [],
      setSnsName: (snsName) => set({ snsName }),
      setBalance: (balance) => set({ balance }),
      setNfts: (nfts) => set({ nfts }),
      addNft: (nft) => set((s) => ({
        nfts: [nft, ...s.nfts.filter((n) => n.mint !== nft.mint)],
      })),
    }),
    { 
      name: 'ghost-auction-user',
      version: 1, // Increment version to clear broken NFTs globally
    }
  )
);

// ---- Notification Store ----
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
  txSignature?: string;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: crypto.randomUUID(), timestamp: Date.now() },
        ...s.notifications,
      ].slice(0, 50),
    })),
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  clearAll: () => set({ notifications: [] }),
}));
