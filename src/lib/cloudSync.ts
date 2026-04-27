import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, encryptData, decryptData } from './firebase';
import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore } from '../store/useHabitStore';
import { useEconomyStore } from '../store/useEconomyStore';
import { useVisionStore } from '../store/useVisionStore';
import { useConfigStore } from '../store/useConfigStore';

let unsubscribeSnapshot: (() => void) | null = null;
let lastSyncTime = 0; // Trava contra loop infinito (Echo cancellation)

export const syncToCloud = async () => {
  const { uid, e2eePin } = useConfigStore.getState();
  if (!uid || !e2eePin || !navigator.onLine) return;

  const timestamp = Date.now();
  lastSyncTime = timestamp; // Atualiza nosso timestamp local

  const payload = {
    tasks: encryptData(JSON.stringify(useTaskStore.getState()), e2eePin),
    habits: encryptData(JSON.stringify(useHabitStore.getState()), e2eePin),
    economy: encryptData(JSON.stringify(useEconomyStore.getState()), e2eePin),
    vision: encryptData(JSON.stringify(useVisionStore.getState()), e2eePin),
    config: encryptData(JSON.stringify({
      theme: useConfigStore.getState().theme,
      font: useConfigStore.getState().font,
      userClass: useConfigStore.getState().userClass,
      userName: useConfigStore.getState().userName,
      isOnboarded: useConfigStore.getState().isOnboarded,
      lastLoginDate: useConfigStore.getState().lastLoginDate,
    }), e2eePin),
    updatedAt: timestamp
  };

  await setDoc(doc(db, 'users', uid), payload);
};

const applyCloudData = (data: any, pin: string) => {
  try {
    // Se a atualização que chegou for mais antiga ou igual à nossa última, ignoramos
    if (data.updatedAt && data.updatedAt <= lastSyncTime) return 'ignored';

    if (data.tasks) useTaskStore.setState(JSON.parse(decryptData(data.tasks, pin)));
    if (data.habits) useHabitStore.setState(JSON.parse(decryptData(data.habits, pin)));
    if (data.economy) useEconomyStore.setState(JSON.parse(decryptData(data.economy, pin)));
    if (data.vision) useVisionStore.setState(JSON.parse(decryptData(data.vision, pin)));
    if (data.config) {
      const conf = JSON.parse(decryptData(data.config, pin));
      useConfigStore.setState(conf);
    }
    
    if (data.updatedAt) lastSyncTime = data.updatedAt;
    return 'success';
  } catch (e) {
    return 'wrong_pin';
  }
};

export const syncFromCloud = async (uid: string, pin: string) => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return 'no_data';
  return applyCloudData(snap.data(), pin);
};

// NOVO: Função que fica "escutando" a nuvem o tempo todo
export const startCloudListener = (uid: string, pin: string) => {
  if (unsubscribeSnapshot) unsubscribeSnapshot(); // Limpa listeners anteriores
  
  unsubscribeSnapshot = onSnapshot(doc(db, 'users', uid), (doc) => {
    // Só aplica os dados se a mudança veio de outro dispositivo (hasPendingWrites = false)
    if (doc.exists() && !doc.metadata.hasPendingWrites) {
      applyCloudData(doc.data(), pin);
    }
  });
};

export const stopCloudListener = () => {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
};