import { db } from "@/lib/firebase";
import {
  INITIAL_COINS,
  createFallbackUser,
  createOrGetUserByDeviceId,
  getOrCreateUserId,
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
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

// Suppress unused import warning
void db;
void INITIAL_COINS;

const INIT_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

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
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const uid = getOrCreateUserId();

    withTimeout(createOrGetUserByDeviceId(uid), INIT_TIMEOUT_MS)
      .then((data) => {
        const user = data ?? createFallbackUser(uid);
        setUserId(uid);
        setUserData(user);
        setCoins(user.coins);

        if (!data) {
          createOrGetUserByDeviceId(uid).catch(() => {
            /* best-effort */
          });
        }
      })
      .catch(() => {
        const user = createFallbackUser(uid);
        setUserId(uid);
        setUserData(user);
        setCoins(user.coins);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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
    const uid = getOrCreateUserId();
    const data = await withTimeout(
      createOrGetUserByDeviceId(uid),
      INIT_TIMEOUT_MS,
    );
    const user = data ?? createFallbackUser(uid);
    setUserId(uid);
    setUserData(user);
    setCoins(user.coins);
    if (!data) {
      createOrGetUserByDeviceId(uid).catch(() => {
        /* best-effort */
      });
    }
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
        toast.error("Not enough coins! Buy more to continue. 🪙", {
          duration: 3000,
        });
        return false;
      }
      await updateCoins(userId, -amount);
      await logTransaction(userId, type, -amount, roomId);
      return true;
    },
    [userId, coins],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("fansbattle_user_id");
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
