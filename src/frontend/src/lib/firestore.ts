import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
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
}

const USER_ID_KEY = "fansbattle_user_id";
// Legacy key — migrate old installs seamlessly
const LEGACY_KEY = "fansbattle_device_id";

export function getOrCreateUserId(): string {
  // Migrate from old key if present
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

/** Keep backward-compat alias */
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
