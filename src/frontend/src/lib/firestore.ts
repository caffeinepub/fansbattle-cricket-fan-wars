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

const DEVICE_ID_KEY = "fansbattle_device_id";

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export async function createOrGetUserByDeviceId(
  deviceId: string,
): Promise<UserData> {
  const userRef = doc(db, "users", deviceId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return { uid: deviceId, ...(snap.data() as Omit<UserData, "uid">) };
  }
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newUser: Omit<UserData, "uid"> = {
    deviceId,
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
  return { uid: deviceId, ...newUser };
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
