import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConfigStore } from "../../store/useConfigStore";
import { LogIn, ArrowRight, Shield, Target, Zap, Clock, ChevronRight } from "lucide-react";

export const OnboardingFlow = () => {
  const [step, setStep] = useState(1);
  const { setUserName, setUserClass, setTheme, setFont, completeOnboarding } = useConfigStore();

  const handleNext = () => setStep(step + 1);

  const fadeVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 p-6 transition-colors duration-500">
    <AnimatePresence mode="wait">

    {/* 1. Boas-vindas */}
    {step === 1 && (
      <motion.div key="step1" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center text-center max-w-md">
      <h1 className="text-5xl font-black mb-4 tracking-tight">Lida</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
      Sua vida organizada com propósito. Gerencie tarefas, hábitos e objetivos em um só lugar e com foco absoluto.
      </p>
      <button onClick={handleNext} className="flex items-center gap-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform shadow-xl">
      Entrar com Google <LogIn size={20} />
      </button>
      </motion.div>
    )}

    {/* 2. Nome */}
    {step === 2 && (
      <motion.div key="step2" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center w-full max-w-md">
      <h2 className="text-2xl font-light tracking-tight mb-8">Como devemos te chamar?</h2>
      <input
      type="text"
      placeholder="Seu nome ou apelido"
      className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 p-4 text-3xl font-bold outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors text-center placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
      onChange={(e) => setUserName(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
      autoFocus
      />
      <button onClick={handleNext} className="mt-12 text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2 font-bold transition-colors">
      Continuar <ArrowRight size={18} />
      </button>
      </motion.div>
    )}

    {/* 3. Preferências Visuais */}
    {step === 3 && (
      <motion.div key="step3" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-md space-y-8">
      <div className="text-center">
      <h2 className="text-3xl font-black tracking-tight mb-2">Sua Estética</h2>
      <p className="text-zinc-500 dark:text-zinc-400">Configure seu ambiente de trabalho.</p>
      </div>

      <div className="space-y-6">
      <div className="space-y-3">
      <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Tema</span>
      <div className="flex gap-3">
      <button onClick={() => setTheme('light')} className="flex-1 py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors focus:ring-2 ring-zinc-900 dark:ring-zinc-100">Claro</button>
      <button onClick={() => setTheme('dark-amoled')} className="flex-1 py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors focus:ring-2 ring-zinc-900 dark:ring-zinc-100">AMOLED</button>
      </div>
      </div>

      <div className="space-y-3">
      <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Tipografia</span>
      <button onClick={() => setFont('sans')} className="w-full text-left p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors focus:ring-2 ring-zinc-900 dark:ring-zinc-100 font-sans text-lg">Moderna (Sem Serifa)</button>
      <button onClick={() => setFont('serif')} className="w-full text-left p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors focus:ring-2 ring-zinc-900 dark:ring-zinc-100 font-serif text-lg">Clássica (Com Serifa)</button>
      <button onClick={() => setFont('special')} style={{ fontFamily: '"VT323"' }} className="w-full text-left p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors focus:ring-2 ring-zinc-900 dark:ring-zinc-100 text-xl tracking-wide">Especial (VT323)</button>
      </div>
      </div>

      <button onClick={handleNext} className="w-full mt-4 flex items-center justify-center gap-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black py-4 rounded-xl font-bold transition-all hover:opacity-90">
      Próximo <ChevronRight size={20} />
      </button>
      </motion.div>
    )}

    {/* 4. Modus Operandi (Dark e Elegante) */}
    {step === 4 && (
      <motion.div key="step4" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-2xl space-y-8">
      <div className="text-center mb-8">
      <h2 className="text-3xl font-black tracking-tight mb-2">Modus Operandi</h2>
      <p className="text-zinc-500 dark:text-zinc-400">Escolha a filosofia da sua rotina.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ModusCard
      title="Multitarefa"
      desc="Foco em volume. Você ganha bônus por quantidade de tarefas finalizadas."
      icon={<Zap size={24} />}
      onClick={() => { setUserClass('multitask'); completeOnboarding(); }}
      />
      <ModusCard
      title="Minimalista"
      desc="Menos é mais. Você ganha bônus por focar no que é puramente essencial."
      icon={<Shield size={24} />}
      onClick={() => { setUserClass('minimalist'); completeOnboarding(); }}
      />
      <ModusCard
      title="Pontual"
      desc="A precisão é o seu lema. Bônus gigantesco por respeitar horários."
      icon={<Clock size={24} />}
      onClick={() => { setUserClass('punctual'); completeOnboarding(); }}
      />
      <ModusCard
      title="Ambicioso"
      desc="Foco no longo prazo. Seu multiplicador aumenta ao finalizar Sprints."
      icon={<Target size={24} />}
      onClick={() => { setUserClass('ambitious'); completeOnboarding(); }}
      />
      </div>
      </motion.div>
    )}

    </AnimatePresence>
    </div>
  );
};

const ModusCard = ({ title, desc, icon, onClick }: any) => (
  <button
  onClick={onClick}
  className="flex flex-col items-start text-left p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all group"
  >
  <div className="p-3 rounded-2xl bg-zinc-200 dark:bg-black text-zinc-900 dark:text-zinc-100 mb-4 group-hover:scale-110 transition-transform">
  {icon}
  </div>
  <h3 className="text-xl font-bold uppercase tracking-wide mb-2">{title}</h3>
  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{desc}</p>
  </button>
);
