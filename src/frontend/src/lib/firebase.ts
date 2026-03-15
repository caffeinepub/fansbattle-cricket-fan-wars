import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAAti3AU0bFGVatgIHSAF8y2Q642LoWb2Q",
  authDomain: "project-bc4b53b0-b928-4234-837.firebaseapp.com",
  projectId: "project-bc4b53b0-b928-4234-837",
  storageBucket: "project-bc4b53b0-b928-4234-837.firebasestorage.app",
  messagingSenderId: "484551243974",
  appId: "1:484551243974:web:3d0029fc852a7d73f57fc7",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
