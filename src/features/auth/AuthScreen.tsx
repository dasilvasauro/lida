import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, KeyRound, ArrowRight, ShieldAlert, Fingerprint } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { syncFromCloud, syncToCloud } from '../../lib/cloudSync';
import { useConfigStore } from '../../store/useConfigStore';

export const AuthScreen = () => {
  const setAuth = useConfigStore((state) => state.setAuth);
  
  const [step, setStep] = useState<'login' | 'check' | 'create_pin' | 'enter_pin' | 'loading'>('login');
  const [tempUid, setTempUid] = useState<string | null>(null);
  
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setStep('check');
      const result = await signInWithPopup(auth, googleProvider);
      const uid = result.user.uid;
      setTempUid(uid);

      // Verifica se o cofre do usuário já existe
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) setStep('enter_pin');
      else setStep('create_pin');
      
    } catch (err) {
      console.error(err);
      setError('Falha na autenticação com o Google.');
      setStep('login');
    }
  };

  const handleCreatePin = async () => {
    if (pin !== confirmPin) return setError('As chaves não conferem.');
    if (pin.length < 4) return setError('A chave deve ter no mínimo 4 caracteres.');
    
    setStep('loading');
    setAuth(tempUid!, pin);
    await syncToCloud(); // Sobe os dados do onboarding/testes locais para a nuvem
  };

  const handleEnterPin = async () => {
    if (!pin) return;
    setStep('loading');
    const result = await syncFromCloud(tempUid!, pin);
    
    if (result === 'success') {
      setAuth(tempUid!, pin); // Libera o app
    } else {
      setError('Chave Mestra Incorreta. Tente novamente.');
      setStep('enter_pin');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 p-6 transition-colors duration-500">
      <AnimatePresence mode="wait">
        
        {step === 'login' && (
          <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center text-center max-w-md">
            <Fingerprint size={64} className="mb-6 text-zinc-300 dark:text-zinc-700" />
            <h1 className="text-4xl font-black mb-4 tracking-tight">Identificação</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
              O Lida utiliza Criptografia de Ponta a Ponta (E2EE). Nós não temos acesso às suas tarefas, hábitos ou visão de vida.
            </p>
            {error && <div className="text-red-500 text-sm font-bold mb-4">{error}</div>}
            <button onClick={handleGoogleLogin} className="flex items-center gap-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform shadow-xl">
              Autenticar com Google <ArrowRight size={20} />
            </button>
          </motion.div>
        )}

        {step === 'check' && (
          <motion.div key="check" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
            <ShieldCheck size={48} className="animate-pulse text-blue-500 mb-4" />
            <p className="font-bold text-zinc-500">Consultando Nuvem Segura...</p>
          </motion.div>
        )}

        {step === 'create_pin' && (
          <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-md space-y-6">
            <div className="text-center mb-8">
              <ShieldAlert size={48} className="mx-auto text-amber-500 mb-4" />
              <h2 className="text-2xl font-black tracking-tight">Inicializar Cofre E2EE</h2>
              <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                Crie uma Chave Mestra forte. <strong className="text-red-500">Atenção:</strong> Essa chave nunca viaja pela rede. Se você a perder, seus dados na nuvem ficarão ilegíveis permanentemente.
              </p>
            </div>
            <div className="space-y-4">
              <input type="password" placeholder="Sua Chave Mestra" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-amber-500 font-bold text-center tracking-widest" />
              <input type="password" placeholder="Confirme a Chave Mestra" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreatePin()} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-amber-500 font-bold text-center tracking-widest" />
            </div>
            {error && <div className="text-red-500 text-sm font-bold text-center">{error}</div>}
            <button onClick={handleCreatePin} className="w-full py-4 rounded-xl bg-amber-500 text-white font-black hover:opacity-90 transition-opacity">Forjar Cofre</button>
          </motion.div>
        )}

        {step === 'enter_pin' && (
          <motion.div key="enter" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-md space-y-6">
            <div className="text-center mb-8">
              <KeyRound size={48} className="mx-auto text-emerald-500 mb-4" />
              <h2 className="text-2xl font-black tracking-tight">Cofre Localizado</h2>
              <p className="text-zinc-500 text-sm mt-2 leading-relaxed">Seus dados foram encontrados, mas estão encriptados. Insira sua Chave Mestra para liberar o acesso.</p>
            </div>
            <input type="password" placeholder="Chave Mestra" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEnterPin()} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 font-bold text-center tracking-widest" autoFocus />
            {error && <div className="text-red-500 text-sm font-bold text-center">{error}</div>}
            <button onClick={handleEnterPin} className="w-full py-4 rounded-xl bg-emerald-500 text-white font-black hover:opacity-90 transition-opacity">Descriptografar</button>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
            <KeyRound size={48} className="animate-spin text-zinc-500 mb-4" />
            <p className="font-bold text-zinc-500">Processando criptografia...</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};