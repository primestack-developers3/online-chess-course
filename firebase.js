// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBiL0Uq6OPua7bXFSVzzergfd8O7Rqz4FY",
  authDomain: "chess-hub-a11e6.firebaseapp.com",
  projectId: "chess-hub-a11e6",
  storageBucket: "chess-hub-a11e6.firebasestorage.app",
  messagingSenderId: "805706554537",
  appId: "1:805706554537:web:419598c3afbc71f4595db8"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

