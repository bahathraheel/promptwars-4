import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB8ANo0HTjF25ScTyIIthaqf-RblHxiZKk",
  authDomain: "promptwars-4-a706d.firebaseapp.com",
  projectId: "promptwars-4-a706d",
  storageBucket: "promptwars-4-a706d.firebasestorage.app",
  messagingSenderId: "17874570137",
  appId: "1:17874570137:web:2e658ad983eb2b93f02108"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
