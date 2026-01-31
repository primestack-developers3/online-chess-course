
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById('signupForm');
const msg = document.getElementById('message');

function show(text, cls="") {
  msg.className = cls;
  msg.textContent = text;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  show('', '');

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const username = document.getElementById('username').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;

  if (!name || !email || !username || !password) {
    return show('Please fill all required fields.', 'error');
  }
  if (password !== confirm) {
    return show('Passwords do not match.', 'error');
  }
  if (password.length < 8) {
    return show('Password must be at least 8 characters.', 'error');
  }

  try {
    // Check username availability
    const usernameRef = doc(db, 'usernames', username);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
      return show('Username already taken.', 'error');
    }

    // Create Auth user
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;

    // Set display name
    await updateProfile(user, { displayName: name });

    // Create user profile document
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      name,
      username,
      email: email.toLowerCase(),
      createdAt: serverTimestamp()
    });

    // Create username -> uid mapping
    await setDoc(usernameRef, { uid: user.uid });

    show('Account created. Redirecting...', 'success');
    setTimeout(() => { window.location.href = 'login.html'; }, 1100);
  } catch (err) {
    console.error(err);
    const msgText = err?.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : (err.message || 'Signup failed');
    show(msgText, 'error');
  }
});