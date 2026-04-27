import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import CryptoJS from "crypto-js";

const firebaseConfig = {
  apiKey: "AIzaSyDX9t1O0_scsUP9hi8deNk1eh3Iw60oQ8U",
  authDomain: "lida-81429.firebaseapp.com",
  projectId: "lida-81429",
  storageBucket: "lida-81429.firebasestorage.app",
  messagingSenderId: "790788286874",
  appId: "1:790788286874:web:636e2c821ce4af7bcdb223"
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
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error("Chave inválida");
    return decrypted;
  } catch (error) {
    throw new Error("Chave inválida");
  }
};