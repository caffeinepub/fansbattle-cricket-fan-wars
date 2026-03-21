import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export interface UserData {
  uid: string;
  deviceId: string;
  username: string;
  coins: number;
  wins: number;
  level: number;
  role: "user" | "admin";
  favoriteTeam: string;
  avatar: string;
  createdAt: unknown;
  usernameChanged: boolean;
  lastClaimDate: string | null;
}

const USER_ID_KEY = "fansbattle_user_id";
const LEGACY_KEY = "fansbattle_device_id";

export function getOrCreateUserId(): string {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    localStorage.setItem(USER_ID_KEY, legacy);
    localStorage.removeItem(LEGACY_KEY);
    return legacy;
  }
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export const getOrCreateDeviceId = getOrCreateUserId;

export function createFallbackUser(userId: string): UserData {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return {
    uid: userId,
    deviceId: userId,
    username: `Fan${randomSuffix}`,
    coins: 100,
    wins: 0,
    level: 1,
    role: "user",
    favoriteTeam: "",
    avatar: "",
    createdAt: new Date().toISOString(),
    usernameChanged: false,
    lastClaimDate: null,
  };
}

export async function createOrGetUserByDeviceId(
  userId: string,
): Promise<UserData> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return { uid: userId, ...(snap.data() as Omit<UserData, "uid">) };
  }
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newUser: Omit<UserData, "uid"> = {
    deviceId: userId,
    username: `Fan${randomSuffix}`,
    coins: 100,
    wins: 0,
    level: 1,
    role: "user",
    favoriteTeam: "",
    avatar: "",
    createdAt: serverTimestamp(),
    usernameChanged: false,
    lastClaimDate: null,
  };
  await setDoc(userRef, newUser);
  return { uid: userId, ...newUser };
}

export function getUserRef(uid: string) {
  return doc(db, "users", uid);
}

export async function updateCoins(uid: string, delta: number): Promise<void> {
  await updateDoc(doc(db, "users", uid), { coins: increment(delta) });
}

export async function logTransaction(
  userId: string,
  type: string,
  amount: number,
  roomId?: string,
): Promise<void> {
  await addDoc(collection(db, "transactions"), {
    userId,
    type,
    amount,
    roomId: roomId || null,
    timestamp: serverTimestamp(),
  });
}

export async function updateUsername(
  uid: string,
  username: string,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    username,
    usernameChanged: true,
  });
}

export async function updateUserProfile(
  uid: string,
  data: { favoriteTeam?: string; avatar?: string },
): Promise<void> {
  await updateDoc(doc(db, "users", uid), data);
}

export async function getTransactions(userId: string): Promise<
  Array<{
    id: string;
    type: string;
    amount: number;
    timestamp: unknown;
    roomId?: string | null;
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
    ...(d.data() as {
      type: string;
      amount: number;
      timestamp: unknown;
      roomId?: string | null;
    }),
  }));
}

export async function claimDailyReward(
  userId: string,
): Promise<{ success: boolean; alreadyClaimed: boolean }> {
  const today = new Date().toISOString().slice(0, 10);
  const userRef = doc(db, "users", userId);

  try {
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // Auto-create user then claim
      await createOrGetUserByDeviceId(userId);
      return claimDailyReward(userId);
    }

    const data = snap.data() as Omit<UserData, "uid">;
    if (data.lastClaimDate === today) {
      return { success: false, alreadyClaimed: true };
    }

    await updateDoc(userRef, {
      coins: increment(20),
      lastClaimDate: today,
    });

    await addDoc(collection(db, "transactions"), {
      userId,
      type: "daily_reward",
      amount: 20,
      roomId: null,
      timestamp: serverTimestamp(),
    });

    return { success: true, alreadyClaimed: false };
  } catch {
    return { success: false, alreadyClaimed: false };
  }
}

// ─── Guess System ────────────────────────────────────────────────────────────

export interface GuessRecord {
  id: string;
  userId: string;
  matchId: string;
  questionId: string;
  choice: string;
  timestamp: unknown;
}

/**
 * Returns the guess record if the user has already guessed for this
 * (matchId + questionId) combo, or null if not.
 */
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

/**
 * Stores a guess in Firestore. Caller must deduct coins before calling.
 */
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
    timestamp: serverTimestamp(),
  });
}

// ─── Vote System ─────────────────────────────────────────────────────────────

/**
 * Returns the side ("A" | "B") the user voted for on this poll, or null.
 */
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

/**
 * Stores a vote in Firestore. Returns false if already voted.
 */
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
    timestamp: serverTimestamp(),
  });
  return true;
}

/**
 * Loads all votes for a user for a list of poll IDs.
 * Returns a map of { pollId: "A" | "B" }.
 */
export async function getUserVotesForPolls(
  userId: string,
  pollIds: string[],
): Promise<Record<string, "A" | "B">> {
  if (pollIds.length === 0) return {};
  // Firestore "in" limit is 30 per query
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
