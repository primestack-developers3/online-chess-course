// auth.js
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { auth, db } from "./firebase.js";

const provider = new GoogleAuthProvider();

/* ========= LOGIN ========= */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Save user in Firestore (first time only)
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      name: user.displayName,
      email: user.email,
      photo: user.photoURL,
      createdAt: new Date()
    });
  }

  return user;
}

/* ========= LOGOUT ========= */
export function logout() {
  return signOut(auth);
}

/* ========= AUTH STATE ========= */
export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}
