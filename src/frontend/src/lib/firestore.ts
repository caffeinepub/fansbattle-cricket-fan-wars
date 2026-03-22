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
  const today = getTodayString();

  try {
    let coinsAwarded = 0;
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) throw new Error("USER_NOT_FOUND");
      const data = snap.data() as UserData;
      const currentCoins = data.coins;
      if (data.lastClaimDate === today) throw new Error("ALREADY_CLAIMED");
      const newCoins = currentCoins + DAILY_REWARD_AMOUNT;
      coinsAwarded = DAILY_REWARD_AMOUNT;
      transaction.set(
        userRef,
        { coins: newCoins, lastClaimDate: today },
        { merge: true },
      );
    });
    addDoc(collection(db, "transactions"), {
      userId: deviceId,
      type: "daily_reward",
      amount: coinsAwarded,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
    return { success: true, alreadyClaimed: false, coinsAwarded };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "ALREADY_CLAIMED")
      return { success: false, alreadyClaimed: true };
    console.error("[claimDailyReward] Firestore error:", e);
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

// ─── Contest System ───────────────────────────────────────────────────────────

export interface ContestQuestion {
  id: string;
  text: string;
  options: string[];
}

export interface Contest {
  id: string;
  matchId: string;
  name: string;
  type: "mini" | "mega" | "h2h";
  entryFee: number;
  totalSpots: number;
  joinedUsers: string[];
  prizePool: number;
  winnersCount: number;
  status: "open" | "locked" | "completed";
  isLive: boolean;
  countdown: number;
  questions: ContestQuestion[];
  createdAt: string;
}

export interface ContestEntry {
  id: string;
  contestId: string;
  matchId: string;
  userId: string;
  answers: Record<string, string>;
  joinedAt: string;
  submitted: boolean;
}

export async function getContestsForMatch(
  matchId: string,
  team1: string,
  team2: string,
  isMatchLive = false,
): Promise<Contest[]> {
  const contestsRef = collection(db, "contests");
  const q = query(contestsRef, where("matchId", "==", matchId));
  const snap = await getDocs(q);

  if (!snap.empty) {
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Contest, "id">),
    }));
  }

  // Create default contests
  const now = new Date().toISOString();
  const baseQuestion: ContestQuestion = {
    id: "q1",
    text: "Who will win this match?",
    options: [team1, team2],
  };

  const defaults: Omit<Contest, "id">[] = [
    {
      matchId,
      name: "Mini Contest",
      type: "mini",
      entryFee: 10,
      totalSpots: 100,
      joinedUsers: [],
      prizePool: 0,
      winnersCount: 30,
      status: "open",
      isLive: false,
      countdown: 0,
      questions: [baseQuestion],
      createdAt: now,
    },
    {
      matchId,
      name: "Mega Contest",
      type: "mega",
      entryFee: 20,
      totalSpots: 500,
      joinedUsers: [],
      prizePool: 0,
      winnersCount: 125,
      status: "open",
      isLive: false,
      countdown: 0,
      questions: [baseQuestion],
      createdAt: now,
    },
    {
      matchId,
      name: "Head-to-Head",
      type: "h2h",
      entryFee: 10,
      totalSpots: 2,
      joinedUsers: [],
      prizePool: 0,
      winnersCount: 1,
      status: "open",
      isLive: false,
      countdown: 0,
      questions: [baseQuestion],
      createdAt: now,
    },
  ];

  if (isMatchLive) {
    defaults.push({
      matchId,
      name: "Live: Next Over Runs",
      type: "mini",
      entryFee: 10,
      totalSpots: 200,
      joinedUsers: [],
      prizePool: 0,
      winnersCount: 60,
      status: "open",
      isLive: true,
      countdown: 45,
      questions: [
        {
          id: "q1",
          text: "Runs in next over?",
          options: ["0–5", "6–10", "11–15", "16+"],
        },
      ],
      createdAt: now,
    });
  }

  const created: Contest[] = [];
  await Promise.all(
    defaults.map(async (c) => {
      const ref = doc(contestsRef);
      await setDoc(ref, c);
      created.push({ id: ref.id, ...c });
    }),
  );
  return created;
}

export async function joinContest(
  deviceId: string,
  contestId: string,
  matchId: string,
  entryFee: number,
): Promise<{ success: boolean; error?: string }> {
  const userRef = doc(db, "users", deviceId);
  const contestRef = doc(db, "contests", contestId);
  const txRef = doc(
    db,
    "transactions",
    `${deviceId}_${contestId}_${Date.now()}`,
  );

  try {
    await runTransaction(db, async (transaction) => {
      const [userSnap, contestSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(contestRef),
      ]);
      if (!userSnap.exists()) throw new Error("USER_NOT_FOUND");
      if (!contestSnap.exists()) throw new Error("CONTEST_NOT_FOUND");

      const userData = userSnap.data() as UserData;
      const contestData = contestSnap.data() as Omit<Contest, "id">;

      if (contestData.status !== "open") throw new Error("CONTEST_LOCKED");
      if (contestData.joinedUsers.includes(deviceId))
        throw new Error("ALREADY_JOINED");
      if (userData.coins < entryFee) throw new Error("INSUFFICIENT_COINS");

      const newJoined = [...contestData.joinedUsers, deviceId];
      const newPrizePool = Math.floor(newJoined.length * entryFee * 0.75);

      transaction.update(userRef, { coins: userData.coins - entryFee });
      transaction.update(contestRef, {
        joinedUsers: newJoined,
        prizePool: newPrizePool,
      });
      transaction.set(txRef, {
        userId: deviceId,
        type: "contest_entry",
        amount: -entryFee,
        contestId,
        matchId,
        timestamp: new Date().toISOString(),
      });
    });
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function submitContestAnswers(
  deviceId: string,
  contestId: string,
  matchId: string,
  answers: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  const entryId = `${deviceId}_${contestId}`;
  const entryRef = doc(db, "contestEntries", entryId);
  try {
    const snap = await getDoc(entryRef);
    if (snap.exists() && (snap.data() as ContestEntry).submitted) {
      throw new Error("ALREADY_SUBMITTED");
    }
    await setDoc(entryRef, {
      contestId,
      matchId,
      userId: deviceId,
      answers,
      joinedAt: snap.exists()
        ? (snap.data() as ContestEntry).joinedAt
        : new Date().toISOString(),
      submitted: true,
    });
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function getContestEntry(
  deviceId: string,
  contestId: string,
): Promise<ContestEntry | null> {
  const entryId = `${deviceId}_${contestId}`;
  const entryRef = doc(db, "contestEntries", entryId);
  const snap = await getDoc(entryRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<ContestEntry, "id">) };
}
