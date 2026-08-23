/* Qasr e Majeed — Firebase configuration
   Replace the values below with YOUR Firebase project's config.
   You get these from: Firebase Console → Project Settings → General
   → "Your apps" → Web app → SDK setup and configuration.
   See FIREBASE_SETUP.md for the full step-by-step guide. */

const firebaseConfig = {
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "firebase/app";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBwaAN63zh1uqEMU5KiDbl2RgrY_S3zwOM",
    authDomain: "qasr-e-majeed-885d5.firebaseapp.com",
    projectId: "qasr-e-majeed-885d5",
    storageBucket: "qasr-e-majeed-885d5.firebasestorage.app",
    messagingSenderId: "461431407514",
    appId: "1:461431407514:web:0885502bc13640061eb023"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
};

firebase.initializeApp(firebaseConfig);
const qemDb = firebase.firestore();
