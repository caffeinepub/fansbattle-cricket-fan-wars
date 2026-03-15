import { db } from "@/lib/firebase";
import {
  createOrGetUserByDeviceId,
  getOrCreateDeviceId,
  getUserRef,
  logTransaction,
  updateCoins,
} from "@/lib/firestore";
import type { UserData } from "@/lib/firestore";
import { onSnapshot } from "firebase/firestore";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

// Suppress unused import warning
void db;

interface UserContextValue {
  userId: string | null;
  userData: UserData | null;
  coins: number;
  isAdmin: boolean;
  loading: boolean;
  startPlaying: () => Promise<void>;
  addCoins: (amount: number, type: string, roomId?: string) => Promise<void>;
  spendCoins: (
    amount: number,
    type: string,
    roomId?: string,
  ) => Promise<boolean>;
  logout: () => void;
  refreshUserData: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshUserData = useCallback(() => setRefreshKey((k) => k + 1), []);

  // On mount: check if we already have a deviceId stored
  useEffect(() => {
    const stored = localStorage.getItem("fansbattle_device_id");
    if (stored) {
      // Auto-load the existing user
      createOrGetUserByDeviceId(stored)
        .then((data) => {
          setUserId(stored);
          setUserData(data);
          setCoins(data.coins);
        })
        .catch((e) => console.error("Error loading user", e))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Real-time Firestore subscription
  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is intentional
  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(getUserRef(userId), (snap) => {
      if (snap.exists()) {
        const data = {
          uid: userId,
          ...(snap.data() as Omit<UserData, "uid">),
        };
        setUserData(data);
        setCoins(data.coins);
      }
    });
    return unsub;
  }, [userId, refreshKey]);

  const startPlaying = useCallback(async () => {
    const deviceId = getOrCreateDeviceId();
    const data = await createOrGetUserByDeviceId(deviceId);
    setUserId(deviceId);
    setUserData(data);
    setCoins(data.coins);
  }, []);

  const addCoins = useCallback(
    async (amount: number, type: string, roomId?: string) => {
      if (!userId) return;
      await updateCoins(userId, amount);
      await logTransaction(userId, type, amount, roomId);
    },
    [userId],
  );

  const spendCoins = useCallback(
    async (amount: number, type: string, roomId?: string): Promise<boolean> => {
      if (!userId) return false;
      if (coins < amount) {
        toast.error("Not enough coins! 🪙", { duration: 2500 });
        return false;
      }
      await updateCoins(userId, -amount);
      await logTransaction(userId, type, -amount, roomId);
      return true;
    },
    [userId, coins],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("fansbattle_device_id");
    setUserId(null);
    setUserData(null);
    setCoins(0);
  }, []);

  const isAdmin = userData?.role === "admin";

  return (
    <UserContext.Provider
      value={{
        userId,
        userData,
        coins,
        isAdmin,
        loading,
        startPlaying,
        addCoins,
        spendCoins,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserContextProvider");
  return ctx;
}
