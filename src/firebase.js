import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCQMi3vqfVcy3guX00jnqqHPKJgNcUZyc8",
  authDomain: "notesapp-afa0d.firebaseapp.com",
  projectId: "notesapp-afa0d",
  storageBucket: "notesapp-afa0d.firebasestorage.app",
  messagingSenderId: "444258540997",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);