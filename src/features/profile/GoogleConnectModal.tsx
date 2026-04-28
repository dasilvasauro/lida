import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cloud, HardDrive, KeyRound, ArrowRight, Fingerprint } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useConfigStore } from '../../store/useConfigStore';
import { syncFromCloud, syncToCloud } from '../../lib/cloudSync';

export const GoogleConnectModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) => {
  const [step, setStep] = useState<'intro' | 'loading' | 'conflict' | 'enter_pin' | 'create_pin'>('intro');
  const [tempUid, setTempUid] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  
  const { setAuth } = useConfigStore();

  if (!isOpen) return null;

  const handleConnect = async () => {
    setStep('loading');
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const uid = res.user.uid;
      setTempUid(uid);
      
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        setStep('conflict'); // A Nuvem já tem dados!
      } else {
        setStep('create_pin'); // Usuário zerado na nuvem
      }
    } catch (e) {
      setError('A conexão com o Google falhou.');
      setStep('intro');
    }
  };

  const handlePullCloud = async () => {
    if (!pin) return;
    setStep('loading');
    const result = await syncFromCloud(tempUid!, pin);
    if (result === 'success') {
      setAuth(tempUid!, pin);
      onSuccess();
    } else {
      setError('Chave Mestra incorreta.');
      setStep('enter_pin');
    }
  };

  const handlePushLocal = async () => {
    if (pin !== confirmPin) return setError('As chaves não conferem.');
    if (pin.length < 4) return setError('Mínimo de 4 caracteres.');
    
    setStep('loading');
    setAuth(tempUid!, pin);
    await syncToCloud();
    onSuccess();
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative p-8">
          
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition-colors"><X size={20} /></button>

          {step === 'intro' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center">
              <Fingerprint size={48} className="text-blue-500 mb-6" />
              <h2 className="text-2xl font-black mb-4">Sincronização Segura</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm leading-relaxed">
                Vincule sua conta do Google para habilitar o backup em tempo real com criptografia de ponta-a-ponta (E2EE).
              </p>
              {error && <p className="text-red-500 text-sm font-bold mb-4">{error}</p>}
              <button onClick={handleConnect} className="w-full flex items-center justify-center gap-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black py-4 rounded-xl font-bold hover:scale-105 transition-transform">
                Autenticar com Google <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {step === 'conflict' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-black mb-4">Conflito Detectado</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm leading-relaxed">
                A conta Google vinculada já possui um cofre salvo na nuvem. Como deseja proceder?
              </p>
              
              <div className="w-full space-y-3">
                <button onClick={() => setStep('enter_pin')} className="w-full p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between group hover:border-blue-500 hover:bg-blue-500/5 transition-all">
                  <div className="text-left">
                    <span className="font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100"><Cloud size={18} className="text-blue-500"/> Baixar da Nuvem</span>
                    <span className="text-xs text-zinc-500 mt-1 block">Apaga os dados atuais e restaura o backup.</span>
                  </div>
                  <ArrowRight size={18} className="text-zinc-400 group-hover:text-blue-500"/>
                </button>

                <button onClick={() => setStep('create_pin')} className="w-full p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between group hover:border-emerald-500 hover:bg-emerald-500/5 transition-all">
                  <div className="text-left">
                    <span className="font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100"><HardDrive size={18} className="text-emerald-500"/> Forçar Envio Local</span>
                    <span className="text-xs text-zinc-500 mt-1 block">Esmaga a nuvem e salva seus dados atuais.</span>
                  </div>
                  <ArrowRight size={18} className="text-zinc-400 group-hover:text-emerald-500"/>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'enter_pin' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center">
              <KeyRound size={48} className="text-blue-500 mb-6" />
              <h2 className="text-xl font-black mb-2">Descriptografar Nuvem</h2>
              <p className="text-zinc-500 text-sm mb-8">Insira a Chave Mestra antiga para restaurar.</p>
              <input type="password" placeholder="Chave Mestra" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none font-bold text-center mb-4" />
              {error && <p className="text-red-500 text-sm font-bold mb-4">{error}</p>}
              <button onClick={handlePullCloud} className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold">Restaurar Dados</button>
            </motion.div>
          )}

          {step === 'create_pin' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center">
              <KeyRound size={48} className="text-emerald-500 mb-6" />
              <h2 className="text-xl font-black mb-2">Forjar Nova Nuvem</h2>
              <p className="text-zinc-500 text-sm mb-8">Crie uma Chave Mestra para o envio local.</p>
              <div className="w-full space-y-3 mb-4">
                <input type="password" placeholder="Nova Chave Mestra" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none font-bold text-center" />
                <input type="password" placeholder="Confirmar Chave" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none font-bold text-center" />
              </div>
              {error && <p className="text-red-500 text-sm font-bold mb-4">{error}</p>}
              <button onClick={handlePushLocal} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold">Sobrescrever Nuvem</button>
            </motion.div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-8 h-8 border-4 border-zinc-200 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="font-bold text-zinc-500">Processando...</p>
            </div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
};