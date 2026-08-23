/* Qasr e Majeed — Firebase configuration
   Connected to the qasr-e-majeed-885d5 Firebase project. */

const firebaseConfig = {
  apiKey: "AIzaSyBwaAN63zh1uqEMU5KiDbl2RgrY_S3zwOM",
  authDomain: "qasr-e-majeed-885d5.firebaseapp.com",
  projectId: "qasr-e-majeed-885d5",
  storageBucket: "qasr-e-majeed-885d5.firebasestorage.app",
  messagingSenderId: "461431407514",
  appId: "1:461431407514:web:0885502bc13640061eb023",
};

firebase.initializeApp(firebaseConfig);
const qemDb = firebase.firestore();
