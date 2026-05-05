import { doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, encryptData, decryptData } from './firebase';
import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore } from '../store/useHabitStore';
import { useEconomyStore } from '../store/useEconomyStore';
import { useVisionStore } from '../store/useVisionStore';
import { useConfigStore } from '../store/useConfigStore';
import { useReflectionStore } from '../store/useReflectionStore';
import { useNoteStore } from '../store/useNoteStore'; // <-- NOVO

let unsubscribeSnapshot: (() => void) | null = null;
let lastSyncTime = 0; 
let isApplyingCloudData = false;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export const syncToCloud = async () => {
  const { uid, e2eePin, isLocalMode } = useConfigStore.getState();
  if (isLocalMode || !uid || !e2eePin || !navigator.onLine) return;

  const timestamp = Date.now();
  lastSyncTime = timestamp; 

  const payload = {
    tasks: encryptData(JSON.stringify(useTaskStore.getState()), e2eePin),
    habits: encryptData(JSON.stringify(useHabitStore.getState()), e2eePin),
    economy: encryptData(JSON.stringify(useEconomyStore.getState()), e2eePin),
    vision: encryptData(JSON.stringify(useVisionStore.getState()), e2eePin),
    reflections: encryptData(JSON.stringify(useReflectionStore.getState()), e2eePin),
    notes: encryptData(JSON.stringify(useNoteStore.getState()), e2eePin), // <-- NOVO
    config: encryptData(JSON.stringify({
      theme: useConfigStore.getState().theme,
      font: useConfigStore.getState().font,
      userClass: useConfigStore.getState().userClass,
      userName: useConfigStore.getState().userName,
      isOnboarded: useConfigStore.getState().isOnboarded,
      lastLoginDate: useConfigStore.getState().lastLoginDate,
      defaultDaysOff: useConfigStore.getState().defaultDaysOff, 
      hasDismissedDayOffWarning: useConfigStore.getState().hasDismissedDayOffWarning, 
    }), e2eePin),
    updatedAt: timestamp
  };

  try {
    await setDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    console.error("Erro ao sincronizar com a nuvem:", error);
  }
};

const applyCloudData = (data: any, pin: string) => {
  try {
    if (!data.updatedAt || data.updatedAt <= lastSyncTime) return 'ignored';
    
    isApplyingCloudData = true;

    if (data.tasks) useTaskStore.setState(JSON.parse(decryptData(data.tasks, pin)));
    if (data.habits) useHabitStore.setState(JSON.parse(decryptData(data.habits, pin)));
    if (data.economy) useEconomyStore.setState(JSON.parse(decryptData(data.economy, pin)));
    if (data.vision) useVisionStore.setState(JSON.parse(decryptData(data.vision, pin)));
    if (data.reflections) useReflectionStore.setState(JSON.parse(decryptData(data.reflections, pin)));
    if (data.notes) useNoteStore.setState(JSON.parse(decryptData(data.notes, pin))); // <-- NOVO
    
    if (data.config) {
      const conf = JSON.parse(decryptData(data.config, pin));
      useConfigStore.setState(conf);
    }
    
    lastSyncTime = data.updatedAt;

    setTimeout(() => { isApplyingCloudData = false; }, 500);
    return 'success';
  } catch (e) {
    isApplyingCloudData = false;
    return 'wrong_pin';
  }
};

export const syncFromCloud = async (uid: string, pin: string) => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return 'no_data';
  return applyCloudData(snap.data(), pin);
};

export const startCloudListener = (uid: string, pin: string) => {
  if (unsubscribeSnapshot) unsubscribeSnapshot(); 
  
  unsubscribeSnapshot = onSnapshot(doc(db, 'users', uid), (doc) => {
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

export const setupAutoSync = () => {
  const handleStoreChange = () => {
    if (isApplyingCloudData || useConfigStore.getState().isLocalMode) return; 
    
    lastSyncTime = Date.now(); 

    if (syncTimeout) clearTimeout(syncTimeout);
    
    syncTimeout = setTimeout(() => {
      syncToCloud();
    }, 1500); 
  };

  const unsub1 = useTaskStore.subscribe(handleStoreChange);
  const unsub2 = useHabitStore.subscribe(handleStoreChange);
  const unsub3 = useEconomyStore.subscribe(handleStoreChange);
  const unsub4 = useVisionStore.subscribe(handleStoreChange);
  const unsub5 = useConfigStore.subscribe(handleStoreChange);
  const unsub6 = useReflectionStore.subscribe(handleStoreChange);
  const unsub7 = useNoteStore.subscribe(handleStoreChange); // <-- NOVO

  return () => {
    unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7();
  };
};

export const deleteCloudVault = async (uid: string) => {
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    console.error("Erro ao deletar cofre na nuvem:", error);
  }
};