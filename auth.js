import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, setDoc, query, where, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Helper: Converts a username to a unique internal email format
 * Example: "Bobby" becomes "bobby@chesshub-local"
 */
function usernameToEmail(username) {
    return `${username.toLowerCase().trim()}@chesshub-local`;
}

export const authModule = {
    auth,
    db,

    // SIGN UP with Username
    async signup(username, password, name) {
        try {
            const cleanUsername = username.toLowerCase().trim();
            
            // 1. Check if username is already taken in Firestore
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', cleanUsername));
            const existing = await getDocs(q);
            
            if (!existing.empty) {
                throw new Error('This username is already taken.');
            }

            // 2. Create the Auth account using our internal email format
            const internalEmail = usernameToEmail(cleanUsername);
            const userCred = await createUserWithEmailAndPassword(auth, internalEmail, password);
            
            // 3. Set the display name
            await updateProfile(userCred.user, { displayName: name });

            // 4. Save the user data to Firestore
            await setDoc(doc(db, 'users', userCred.user.uid), {
                name: name,
                username: cleanUsername,
                createdAt: serverTimestamp()
            });

            return { success: true, user: userCred.user };
        } catch (err) {
            throw new Error(err.message);
        }
    },

    // LOGIN with Username
    async signin(username, password) {
        try {
            const cleanUsername = username.toLowerCase().trim();
            const internalEmail = usernameToEmail(cleanUsername);
            
            // Sign in via Firebase Auth
            const userCred = await signInWithEmailAndPassword(auth, internalEmail, password);
            return { success: true, user: userCred.user };
        } catch (err) {
            // Check for specific Firebase errors to give better feedback
            if (err.code === 'auth/user-not-found') throw new Error('Username not found.');
            if (err.code === 'auth/wrong-password') throw new Error('Incorrect password.');
            throw new Error(err.message);
        }
    },

    signout: () => signOut(auth),
    
    onAuthChange: (callback) => onAuthStateChanged(auth, callback)
};