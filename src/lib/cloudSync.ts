import { doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, encryptData, decryptData } from './firebase';
import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore } from '../store/useHabitStore';
import { useEconomyStore } from '../store/useEconomyStore';
import { useVisionStore } from '../store/useVisionStore';
import { useConfigStore } from '../store/useConfigStore';
import { useReflectionStore } from '../store/useReflectionStore';
import { useNoteStore } from '../store/useNoteStore';

let unsubscribeSnapshot: (() => void) | null = null;
let isApplyingCloudData = false;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

let hasSyncedOnce = false; 

export const syncToCloud = async (force = false) => {
  const config = useConfigStore.getState();
  if (!config.uid || !config.e2eePin || config.isLocalMode) return;
  
  if (!force && (!hasSyncedOnce || config.isManualOffline || !navigator.onLine)) return;

  const timestamp = Date.now();

  const payload = {
    tasks: encryptData(JSON.stringify(useTaskStore.getState()), config.e2eePin),
    habits: encryptData(JSON.stringify(useHabitStore.getState()), config.e2eePin),
    economy: encryptData(JSON.stringify(useEconomyStore.getState()), config.e2eePin),
    vision: encryptData(JSON.stringify(useVisionStore.getState()), config.e2eePin),
    reflections: encryptData(JSON.stringify(useReflectionStore.getState()), config.e2eePin),
    notes: encryptData(JSON.stringify(useNoteStore.getState()), config.e2eePin),
    config: encryptData(JSON.stringify({
      theme: config.theme, font: config.font, userClass: config.userClass, userName: config.userName,
      isOnboarded: config.isOnboarded, lastLoginDate: config.lastLoginDate, defaultDaysOff: config.defaultDaysOff, 
      hasDismissedDayOffWarning: config.hasDismissedDayOffWarning, tombstones: config.tombstones
    }), config.e2eePin),
    updatedAt: timestamp
  };

  try { 
      await setDoc(doc(db, 'users', config.uid), payload); 
      hasSyncedOnce = true;
  } catch (error) { 
      console.error("Erro ao sincronizar com a nuvem:", error);
      throw error; 
  }
};

const applyCloudData = (data: any, pin: string) => {
  try {
    isApplyingCloudData = true;

    const localConfig = useConfigStore.getState();
    const cloudConfig = JSON.parse(decryptData(data.config, pin));
    
    const mergedTombstones = { ...localConfig.tombstones };
    if (cloudConfig.tombstones) {
       for (const id in cloudConfig.tombstones) {
           mergedTombstones[id] = Math.max(mergedTombstones[id] || 0, cloudConfig.tombstones[id]);
       }
    }

    const newLastLogin = [localConfig.lastLoginDate, cloudConfig.lastLoginDate].filter(Boolean).sort().reverse()[0] || null;
    
    useConfigStore.setState({ 
        ...cloudConfig, 
        lastLoginDate: newLastLogin, 
        tombstones: mergedTombstones, 
        uid: localConfig.uid, 
        e2eePin: localConfig.e2eePin, 
        isLocalMode: localConfig.isLocalMode, 
        isManualOffline: localConfig.isManualOffline 
    });

    const mergeArrays = (localArr: any[], cloudArr: any[]) => {
        const map = new Map();
        localArr.forEach(item => { if (!mergedTombstones[item.id]) map.set(item.id, item); });
        
        cloudArr.forEach(item => {
            const tombstoneTime = mergedTombstones[item.id] || 0;
            const itemTime = item.updatedAt || item.createdAt || 0;
            if (tombstoneTime > itemTime) return; 
            
            if (map.has(item.id)) {
                const localItem = map.get(item.id);
                const localItemTime = localItem.updatedAt || localItem.createdAt || 0;
                if (itemTime > localItemTime) map.set(item.id, item);
            } else { map.set(item.id, item); }
        });
        return Array.from(map.values());
    };

    const localNotes = useNoteStore.getState();
    const cloudNotes = JSON.parse(decryptData(data.notes, pin));
    const mergedNotebooks = mergeArrays(localNotes.notebooks, cloudNotes.notebooks);
    let mergedNotes = mergeArrays(localNotes.notes, cloudNotes.notes);
    
    mergedNotes = mergedNotes.map(note => {
        if (note.notebookId !== 'default' && !mergedNotebooks.find(nb => nb.id === note.notebookId)) {
            return { ...note, notebookId: 'default', updatedAt: Date.now() };
        }
        return note;
    });
    useNoteStore.setState({ notebooks: mergedNotebooks, notes: mergedNotes });

    const localTasks = useTaskStore.getState();
    const cloudTasks = JSON.parse(decryptData(data.tasks, pin));
    
    let mergedBrainDump = localTasks.brainDump;
    if (cloudTasks.brainDump) {
        const cloudTime = cloudTasks.brainDump.lastDumpAt || 0;
        const localTime = localTasks.brainDump.lastDumpAt || 0;
        if (cloudTime > localTime) {
            mergedBrainDump = cloudTasks.brainDump;
        }
    }

    useTaskStore.setState({
        tasks: mergeArrays(localTasks.tasks, cloudTasks.tasks),
        folders: mergeArrays(localTasks.folders, cloudTasks.folders),
        routines: mergeArrays(localTasks.routines, cloudTasks.routines),
        brainDump: mergedBrainDump,
    });

    const localHabits = useHabitStore.getState();
    const cloudHabits = JSON.parse(decryptData(data.habits, pin));
    const mergeLogs = (localLogs: any, cloudLogs: any) => {
       const result = { ...localLogs };
       for (const hId in cloudLogs) {
           if (!result[hId]) result[hId] = {};
           for (const date in cloudLogs[hId]) { result[hId][date] = Math.max(result[hId][date] || 0, cloudLogs[hId][date]); }
       }
       return result;
    };
    useHabitStore.setState({ 
        habits: mergeArrays(localHabits.habits, cloudHabits.habits), 
        logs: mergeLogs(localHabits.logs, cloudHabits.logs), 
        modifiers: { ...localHabits.modifiers, ...cloudHabits.modifiers },
        quitterItems: mergeArrays(localHabits.quitterItems || [], cloudHabits.quitterItems || [])
    });

    const localRef = useReflectionStore.getState();
    const cloudRef = JSON.parse(decryptData(data.reflections, pin));
    useReflectionStore.setState({ reflections: mergeArrays(localRef.reflections, cloudRef.reflections) });

    const localEcon = useEconomyStore.getState();
    const cloudEcon = JSON.parse(decryptData(data.economy, pin));
    if ((cloudEcon.updatedAt || 0) > (localEcon.updatedAt || 0)) { useEconomyStore.setState(cloudEcon); }

    setTimeout(() => { isApplyingCloudData = false; syncToCloud(); }, 1500);
    return 'success';
  } catch (e) {
    isApplyingCloudData = false;
    return 'wrong_pin';
  }
};

export const syncFromCloud = async (uid: string, pin: string) => {
  try {
      const snap = await getDoc(doc(db, 'users', uid));
      hasSyncedOnce = true;
      if (!snap.exists()) return 'no_data';
      return applyCloudData(snap.data(), pin);
  } catch (error) {
      console.error("Erro ao baixar da nuvem:", error);
      throw error;
  }
};

export const startCloudListener = (uid: string, pin: string) => {
  if (unsubscribeSnapshot) unsubscribeSnapshot(); 
  
  if (useConfigStore.getState().isManualOffline) {
      hasSyncedOnce = true; 
      return;
  }

  unsubscribeSnapshot = onSnapshot(doc(db, 'users', uid), (docSnap) => {
    if (docSnap.exists() && !docSnap.metadata.hasPendingWrites) { 
        applyCloudData(docSnap.data(), pin); 
        hasSyncedOnce = true;
    } else if (!docSnap.exists()) {
        hasSyncedOnce = true;
    }
  });
};

export const stopCloudListener = () => {
  if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
};

export const setupAutoSync = () => {
  const handleStoreChange = () => {
    const config = useConfigStore.getState();
    if (isApplyingCloudData || config.isLocalMode || config.isManualOffline) return; 
    
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => { syncToCloud(); }, 1500); 
  };

  const unsub1 = useTaskStore.subscribe(handleStoreChange);
  const unsub2 = useHabitStore.subscribe(handleStoreChange);
  const unsub3 = useEconomyStore.subscribe(handleStoreChange);
  const unsub4 = useVisionStore.subscribe(handleStoreChange);
  const unsub5 = useConfigStore.subscribe(handleStoreChange);
  const unsub6 = useReflectionStore.subscribe(handleStoreChange);
  const unsub7 = useNoteStore.subscribe(handleStoreChange); 

  return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); };
};

export const deleteCloudVault = async (uid: string) => {
  try { await deleteDoc(doc(db, 'users', uid)); } 
  catch (error) { console.error("Erro ao deletar cofre na nuvem:", error); }
};