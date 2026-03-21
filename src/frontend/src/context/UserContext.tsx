import {
  INITIAL_COINS,
  claimDailyReward,
  createFallbackUser,
  createOrGetUser,
  getOrCreateDeviceId,
  subscribeToUser,
  updateCoins,
} from "@/lib/firestore";
import type { ClaimResult, UserData } from "@/lib/firestore";
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

void INITIAL_COINS;

const INIT_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

interface UserContextValue {
  deviceId: string | null;
  /** @deprecated use deviceId */
  userId: string | null;
  userData: UserData | null;
  coins: number;
  isAdmin: boolean;
  loading: boolean;
  startPlaying: () => Promise<void>;
  addCoins: (amount: number, type: string) => Promise<void>;
  spendCoins: (amount: number, type: string) => Promise<boolean>;
  claimReward: () => Promise<ClaimResult>;
  logout: () => void;
  /** @deprecated no-op */
  refreshUserData: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const id = getOrCreateDeviceId();

    withTimeout(createOrGetUser(id), INIT_TIMEOUT_MS)
      .then((data) => {
        const user = data ?? createFallbackUser(id);
        setDeviceId(id);
        setUserData(user);
        if (!data) {
          createOrGetUser(id).catch(() => {});
        }
      })
      .catch(() => {
        setDeviceId(id);
        setUserData(createFallbackUser(id));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    const unsub = subscribeToUser(deviceId, (data) => {
      if (data) setUserData(data);
    });
    return unsub;
  }, [deviceId]);

  const startPlaying = useCallback(async () => {
    const id = getOrCreateDeviceId();
    const data = await withTimeout(createOrGetUser(id), INIT_TIMEOUT_MS);
    const user = data ?? createFallbackUser(id);
    setDeviceId(id);
    setUserData(user);
  }, []);

  const addCoins = useCallback(
    async (amount: number, type: string) => {
      if (!deviceId) return;
      try {
        await updateCoins(deviceId, amount, type);
      } catch {
        toast.error("Failed to update coins.");
      }
    },
    [deviceId],
  );

  const coins = userData?.coins ?? 0;

  const spendCoins = useCallback(
    async (amount: number, type: string): Promise<boolean> => {
      if (!deviceId) return false;
      if (coins < amount) {
        toast.error("Not enough coins! Buy more to continue. 🪙", {
          duration: 3000,
        });
        return false;
      }
      try {
        await updateCoins(deviceId, -amount, type);
        return true;
      } catch {
        toast.error("Coin update failed. Try again.");
        return false;
      }
    },
    [deviceId, coins],
  );

  const claimReward = useCallback(async (): Promise<ClaimResult> => {
    if (!deviceId) {
      return {
        success: false,
        alreadyClaimed: false,
        error: "Not initialized",
      };
    }
    return claimDailyReward(deviceId);
  }, [deviceId]);

  const logout = useCallback(() => {
    localStorage.removeItem("fansbattle_device_id");
    setDeviceId(null);
    setUserData(null);
    window.location.reload();
  }, []);

  const refreshUserData = useCallback(() => {}, []);

  const isAdmin = userData?.role === "admin";

  return (
    <UserContext.Provider
      value={{
        deviceId,
        userId: deviceId,
        userData,
        coins,
        isAdmin,
        loading,
        startPlaying,
        addCoins,
        spendCoins,
        claimReward,
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
