import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPSmypDL6AEsvbr_U90x1BL58hhXCh6sI",
  authDomain: "dessert-priority.firebaseapp.com",
  projectId: "dessert-priority",
  storageBucket: "dessert-priority.firebasestorage.app",
  messagingSenderId: "1035292198793",
  appId: "1:1035292198793:web:be8cdbd33f8a96d0944358"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { collection, addDoc, serverTimestamp };