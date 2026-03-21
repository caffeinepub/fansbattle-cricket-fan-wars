import { getApps, initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAAti3AU0bFGVatgIHSAF8y2Q642LoWb2Q",
  authDomain: "project-bc4b53b0-b928-4234-837.firebaseapp.com",
  projectId: "project-bc4b53b0-b928-4234-837",
  storageBucket: "project-bc4b53b0-b928-4234-837.firebasestorage.app",
  messagingSenderId: "484551243974",
  appId: "1:484551243974:web:3d0029fc852a7d73f57fc7",
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

export const DAILY_REWARD_AMOUNT = 5;
export const INITIAL_COINS = 10;

export interface UserData {
  username: string;
  coins: number;
  deviceId: string;
  createdAt: string;
  role: string;
  lastClaimDate: string;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEVICE_ID_KEY = "fansbattle_device_id";
const LEGACY_KEY = "fansbattle_user_id";

export function getOrCreateDeviceId(): string {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    localStorage.setItem(DEVICE_ID_KEY, legacy);
    localStorage.removeItem(LEGACY_KEY);
    return legacy;
  }
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** @deprecated Use getOrCreateDeviceId */
export const getOrCreateUserId = getOrCreateDeviceId;

export async function createOrGetUser(deviceId: string): Promise<UserData> {
  const userRef = doc(db, "users", deviceId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserData;
  }
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const newUser: UserData = {
    username: `Fan${suffix}`,
    coins: INITIAL_COINS,
    deviceId,
    createdAt: new Date().toISOString(),
    role: "user",
    lastClaimDate: "",
  };
  await setDoc(userRef, newUser);
  return newUser;
}

/** @deprecated Use createOrGetUser */
export const createOrGetUserByDeviceId = createOrGetUser;

export function getUserRef(deviceId: string) {
  return doc(db, "users", deviceId);
}

export function createFallbackUser(deviceId: string): UserData {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return {
    username: `Fan${suffix}`,
    coins: INITIAL_COINS,
    deviceId,
    createdAt: new Date().toISOString(),
    role: "user",
    lastClaimDate: "",
  };
}

export function subscribeToUser(
  deviceId: string,
  callback: (data: UserData | null) => void,
) {
  const userRef = doc(db, "users", deviceId);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserData);
    } else {
      callback(null);
    }
  });
}

export async function updateCoins(
  deviceId: string,
  delta: number,
  type: string,
): Promise<void> {
  const userRef = doc(db, "users", deviceId);
  const txId = `${deviceId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const txRef = doc(db, "transactions", txId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) throw new Error("User not found");
    const current = (snap.data() as UserData).coins;
    transaction.update(userRef, { coins: current + delta });
    transaction.set(txRef, {
      userId: deviceId,
      type,
      amount: delta,
      timestamp: new Date().toISOString(),
    });
  });
}

/** @deprecated Use updateCoins */
export async function logTransaction(
  userId: string,
  type: string,
  amount: number,
): Promise<void> {
  await addDoc(collection(db, "transactions"), {
    userId,
    type,
    amount,
    timestamp: new Date().toISOString(),
  });
}

export type ClaimResult =
  | { success: true; alreadyClaimed: false; coinsAwarded: number }
  | { success: false; alreadyClaimed: true }
  | { success: false; alreadyClaimed: false; error: string };

export async function claimDailyReward(deviceId: string): Promise<ClaimResult> {
  const userRef = doc(db, "users", deviceId);
  const today = getTodayString(); // YYYY-MM-DD

  try {
    let coinsAwarded = 0;
    await runTransaction(db, async (transaction) => {
      // Step 1: Read document
      const snap = await transaction.get(userRef);

      // Step 2a: Document must exist
      if (!snap.exists()) throw new Error("USER_NOT_FOUND");

      const data = snap.data() as UserData;
      const currentCoins = data.coins;

      // Step 2b: Check lastClaimDate — block if already claimed today
      if (data.lastClaimDate === today) throw new Error("ALREADY_CLAIMED");

      // Step 2c: Calculate new coins
      const newCoins = currentCoins + DAILY_REWARD_AMOUNT;
      coinsAwarded = DAILY_REWARD_AMOUNT;

      // Step 2d: Atomic update using set+merge (more resilient than update)
      transaction.set(
        userRef,
        {
          coins: newCoins,
          lastClaimDate: today,
        },
        { merge: true },
      );
    });

    // Step 3: Only after Firestore success, fire-and-forget transaction log
    addDoc(collection(db, "transactions"), {
      userId: deviceId,
      type: "daily_reward",
      amount: coinsAwarded,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return { success: true, alreadyClaimed: false, coinsAwarded };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "ALREADY_CLAIMED") {
      return { success: false, alreadyClaimed: true };
    }
    // Log actual error for debugging
    console.error("[claimDailyReward] Firestore error:", e);
    // Any other error (including USER_NOT_FOUND, network issues)
    return {
      success: false,
      alreadyClaimed: false,
      error:
        msg === "USER_NOT_FOUND"
          ? "User account not found. Please restart the app."
          : `Firestore update failed: ${msg}. Please try again.`,
    };
  }
}

export async function submitGuess(
  deviceId: string,
  matchId: string,
  guess: string,
): Promise<{ success: boolean; error?: string }> {
  const guessId = `${deviceId}_${matchId}`;
  const guessRef = doc(db, "guesses", guessId);
  const userRef = doc(db, "users", deviceId);
  try {
    await runTransaction(db, async (transaction) => {
      const [guessSnap, userSnap] = await Promise.all([
        transaction.get(guessRef),
        transaction.get(userRef),
      ]);
      if (guessSnap.exists()) throw new Error("already_guessed");
      const userData = userSnap.data() as UserData;
      if (userData.coins < 10) throw new Error("insufficient_coins");
      transaction.update(userRef, { coins: userData.coins - 10 });
      transaction.set(guessRef, {
        userId: deviceId,
        matchId,
        guess,
        timestamp: new Date().toISOString(),
      });
    });
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export interface GuessRecord {
  id: string;
  userId: string;
  matchId: string;
  questionId: string;
  choice: string;
  timestamp: unknown;
}

export async function getUserGuess(
  userId: string,
  matchId: string,
  questionId: string,
): Promise<GuessRecord | null> {
  const q = query(
    collection(db, "guesses"),
    where("userId", "==", userId),
    where("matchId", "==", matchId),
    where("questionId", "==", questionId),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<GuessRecord, "id">) };
}

export async function storeGuess(
  userId: string,
  matchId: string,
  questionId: string,
  choice: string,
): Promise<void> {
  await addDoc(collection(db, "guesses"), {
    userId,
    matchId,
    questionId,
    choice,
    timestamp: new Date().toISOString(),
  });
}

export async function getUserVote(
  userId: string,
  pollId: string,
): Promise<"A" | "B" | null> {
  const q = query(
    collection(db, "votes"),
    where("userId", "==", userId),
    where("pollId", "==", pollId),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return (snap.docs[0].data() as { side: "A" | "B" }).side;
}

export async function storeVote(
  userId: string,
  pollId: string,
  side: "A" | "B",
): Promise<boolean> {
  const existing = await getUserVote(userId, pollId);
  if (existing) return false;
  await addDoc(collection(db, "votes"), {
    userId,
    pollId,
    side,
    timestamp: new Date().toISOString(),
  });
  return true;
}

export async function getUserVotesForPolls(
  userId: string,
  pollIds: string[],
): Promise<Record<string, "A" | "B">> {
  if (pollIds.length === 0) return {};
  const chunks: string[][] = [];
  for (let i = 0; i < pollIds.length; i += 30) {
    chunks.push(pollIds.slice(i, i + 30));
  }
  const result: Record<string, "A" | "B"> = {};
  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(
        collection(db, "votes"),
        where("userId", "==", userId),
        where("pollId", "in", chunk),
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const data = d.data() as { pollId: string; side: "A" | "B" };
        result[data.pollId] = data.side;
      }
    }),
  );
  return result;
}

export async function updateUserProfile(
  uid: string,
  data: { favoriteTeam?: string; avatar?: string },
): Promise<void> {
  const { updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, "users", uid), data);
}

export async function getTransactions(userId: string): Promise<
  Array<{
    id: string;
    type: string;
    amount: number;
    timestamp: unknown;
  }>
> {
  const q = query(
    collection(db, "transactions"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as { type: string; amount: number; timestamp: unknown }),
  }));
}
