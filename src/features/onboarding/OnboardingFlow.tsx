import { useState } from "react";
import { useConfigStore } from "../../store/useConfigStore";
import { LogIn, ArrowRight, Shield, Target, Zap, Clock } from "lucide-react";

export const OnboardingFlow = () => {
  const [step, setStep] = useState(1);
  const { setUserName, setUserClass, setTheme, setFont, completeOnboarding } = useConfigStore();

  // 1. Boas-vindas
  if (step === 1) return (
    <div className="flex flex-col items-center justify-center h-screen p-6 text-center animate-in fade-in duration-700">
      <h1 className="text-5xl font-bold mb-4">Lida</h1>
      <p className="text-zinc-400 max-w-sm mb-8">
        Sua vida organizada com propósito. Gerencie tarefas, hábitos e objetivos em um só lugar.
      </p>
      <button
        onClick={() => setStep(2)}
        className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform"
      >
        Entrar com Google <LogIn size={20} />
      </button>
    </div>
  );

  // 2. Explicação e Nome
  if (step === 2) return (
    <div className="flex flex-col items-center justify-center h-screen p-6 animate-in slide-in-from-right duration-500">
      <h2 className="text-2xl mb-6 italic">Como devemos te chamar?</h2>
      <input
        type="text"
        placeholder="Seu nome ou apelido"
        className="bg-transparent border-b-2 border-zinc-700 p-2 text-2xl outline-none focus:border-white transition-colors text-center"
        onChange={(e) => setUserName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && setStep(3)}
      />
      <button onClick={() => setStep(3)} className="mt-8 text-zinc-500 hover:text-white flex items-center gap-2">
        Continuar <ArrowRight size={18} />
      </button>
    </div>
  );

  // 3. Modus Operandi (Cards Imersivos)
  if (step === 3) return (
    <div className="grid grid-cols-1 md:grid-cols-2 h-screen overflow-hidden">
        <ModusCard
            title="Multitarefa"
            desc="Foco em volume. Bônus por quantidade."
            icon={<Zap size={40}/>}
            color="bg-amber-600"
            onClick={() => { setUserClass('multitask'); setStep(4); }}
        />
        <ModusCard
            title="Minimalista"
            desc="Menos é mais. Bônus por essencialismo."
            icon={<Shield size={40}/>}
            color="bg-emerald-700"
            onClick={() => { setUserClass('minimalist'); setStep(4); }}
        />
        <ModusCard
            title="Pontual"
            desc="Precisão é tudo. Bônus por prazos."
            icon={<Clock size={40}/>}
            color="bg-blue-700"
            onClick={() => { setUserClass('punctual'); setStep(4); }}
        />
        <ModusCard
            title="Ambicioso"
            desc="Grandes projetos. Bônus por Sprints."
            icon={<Target size={40}/>}
            color="bg-purple-800"
            onClick={() => { setUserClass('ambitious'); setStep(4); }}
        />
    </div>
  );

  // 4. Preferências Visuais
  if (step === 4) return (
    <div className="flex flex-col items-center justify-center h-screen p-6">
        <h2 className="text-3xl font-bold mb-12 text-center">Últimos detalhes...</h2>

        <div className="space-y-8 w-full max-w-xs">
            <div className="flex flex-col gap-3">
                <span className="text-sm uppercase tracking-widest text-zinc-500">Escolha seu Tema</span>
                <div className="flex gap-2">
                    <button onClick={() => setTheme('light')} className="flex-1 border border-zinc-700 p-2 hover:bg-zinc-200 hover:text-black">Claro</button>
                    <button onClick={() => setTheme('dark-amoled')} className="flex-1 border border-zinc-700 p-2 hover:bg-white hover:text-black">AMOLED</button>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <span className="text-sm uppercase tracking-widest text-zinc-500">Escolha uma Fonte</span>
                <button onClick={() => setFont('sans')} className="text-left p-2 border border-zinc-700 font-['Barlow_Condensed'] text-xl">Sem Serifa (Barlow Condensed)</button>
                <button onClick={() => setFont('serif')} className="text-left p-2 border border-zinc-700 font-['EB_Garamond'] text-lg">Com Serifa (EB Garamond)</button>
                <button onClick={() => setFont('special')} className="text-left p-2 border border-zinc-700 font-['VT323'] text-xl">Especial (VT323)</button>
            </div>
        </div>

        <button
            onClick={completeOnboarding}
            className="mt-12 bg-white text-black px-12 py-3 rounded-full font-black animate-pulse"
        >
            TUDO CERTO
        </button>
    </div>
  );

  return null;
};

const ModusCard = ({ title, desc, icon, color, onClick }: any) => (
    <div
        onClick={onClick}
        className={`${color} flex flex-col items-center justify-center p-8 cursor-pointer hover:opacity-90 transition-all group relative overflow-hidden`}
    >
        <div className="z-10 flex flex-col items-center">
            {icon}
            <h3 className="text-3xl font-black mt-4 uppercase italic tracking-tighter">{title}</h3>
            <p className="text-white/70 text-center mt-2 max-w-[200px]">{desc}</p>
        </div>
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity" />
    </div>
)
