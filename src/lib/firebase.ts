import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import CryptoJS from "crypto-js";

const firebaseConfig = {
  // Cole suas credenciais aqui
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Função auxiliar para E2EE (será usada nas próximas fases)
export const encryptData = (data: string, key: string) => {
  return CryptoJS.AES.encrypt(data, key).toString();
};

export const decryptData = (ciphertext: string, key: string) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};