import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, encryptData, decryptData } from './firebase';
import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore } from '../store/useHabitStore';
import { useEconomyStore } from '../store/useEconomyStore';
import { useVisionStore } from '../store/useVisionStore';
import { useConfigStore } from '../store/useConfigStore';

export const syncToCloud = async () => {
  const { uid, e2eePin } = useConfigStore.getState();
  if (!uid || !e2eePin) return;

  const payload = {
    tasks: encryptData(JSON.stringify(useTaskStore.getState()), e2eePin),
    habits: encryptData(JSON.stringify(useHabitStore.getState()), e2eePin),
    economy: encryptData(JSON.stringify(useEconomyStore.getState()), e2eePin),
    vision: encryptData(JSON.stringify(useVisionStore.getState()), e2eePin),
    // O Config vai sem o PIN e o UID para não fazer loop
    config: encryptData(JSON.stringify({
      theme: useConfigStore.getState().theme,
      font: useConfigStore.getState().font,
      userClass: useConfigStore.getState().userClass,
      userName: useConfigStore.getState().userName,
      isOnboarded: useConfigStore.getState().isOnboarded,
      lastLoginDate: useConfigStore.getState().lastLoginDate,
    }), e2eePin),
    updatedAt: Date.now()
  };

  await setDoc(doc(db, 'users', uid), payload);
};

export const syncFromCloud = async (uid: string, pin: string) => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return 'no_data'; // Usuário novo (Cofre Vazio)

  const data = snap.data();
  try {
    if (data.tasks) useTaskStore.setState(JSON.parse(decryptData(data.tasks, pin)));
    if (data.habits) useHabitStore.setState(JSON.parse(decryptData(data.habits, pin)));
    if (data.economy) useEconomyStore.setState(JSON.parse(decryptData(data.economy, pin)));
    if (data.vision) useVisionStore.setState(JSON.parse(decryptData(data.vision, pin)));
    if (data.config) {
      const conf = JSON.parse(decryptData(data.config, pin));
      useConfigStore.setState(conf);
    }
    return 'success';
  } catch (e) {
    return 'wrong_pin'; // Tentou abrir com a chave errada
  }
};