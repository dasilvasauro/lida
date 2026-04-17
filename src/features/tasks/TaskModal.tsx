import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Target, Timer, Gift, Sparkles, CheckCircle2, Calendar, Clock, ListPlus } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import type { Priority, TaskType } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';
import { CustomTimePicker } from '../../components/ui/CustomTimePicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaskModal = ({ isOpen, onClose }: TaskModalProps) => {
  const addTask = useTaskStore((state) => state.addTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('P4');
  const [type, setType] = useState<TaskType>('normal');
  
  // Novos estados para Datas, Tempos e Sprints
  const [deadlineDate, setDeadlineDate] = useState<string>('');
  const [deadlineTime, setDeadlineTime] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [duration, setDuration] = useState<number>(30); // Para tarefas do tipo 'Tempo' (em minutos)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSave = () => {
    if (!title.trim()) return;

    addTask({
      id: uuidv4(),
      title,
      description,
      type,
      priority,
      createdAt: Date.now(),
      deadlineDate: deadlineDate || undefined,
      deadlineTime: deadlineTime || undefined,
      isCompleted: false,
      folderId: 'default',
    });

    // Resetar estados
    setTitle('');
    setDescription('');
    setPriority('P4');
    setType('normal');
    setDeadlineDate('');
    setDeadlineTime('');
    setStartDate('');
    setEndDate('');
    onClose();
  };

  const taskTypes: { id: TaskType; label: string; icon: any; color: string }[] = [
    { id: 'normal', label: 'Normal', icon: CheckCircle2, color: 'text-zinc-500' },
    { id: 'daily_challenge', label: 'Desafio', icon: Zap, color: 'text-amber-500' },
    { id: 'sprint', label: 'Sprint', icon: Target, color: 'text-purple-500' },
    { id: 'time', label: 'Tempo', icon: Timer, color: 'text-blue-500' },
    { id: 'bonus', label: 'Bônus', icon: Gift, color: 'text-emerald-500' },
    { id: 'surprise', label: 'Surpresa', icon: Sparkles, color: 'text-rose-500' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-zinc-50 dark:bg-zinc-900 rounded-t-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xl font-bold">Nova Tarefa</h3>
              <button onClick={onClose} className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-8 scrollbar-hide">
              
              {/* Nome e Descrição */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="O que precisa ser feito?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  autoFocus
                />
                <textarea
                  placeholder="Detalhes (Opcional)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-none bg-transparent border-none outline-none text-sm text-zinc-600 dark:text-zinc-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 h-12"
                />
              </div>

              {/* Seletor de Tipo */}
              <div>
                <span className="text-xs uppercase tracking-widest text-zinc-500 mb-3 block font-bold">Tipo</span>
                <div className="grid grid-cols-3 gap-2">
                  {taskTypes.map((t) => {
                    const Icon = t.icon;
                    const isSelected = type === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setType(t.id)}
                        className={`flex flex-col items-center justify-center py-2 rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-zinc-200 border-zinc-400 dark:bg-zinc-800 dark:border-zinc-500 shadow-inner' 
                            : 'bg-transparent border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <Icon size={20} className={isSelected ? t.color : 'text-zinc-400'} />
                        <span className={`text-[10px] mt-1 ${isSelected ? 'font-bold' : ''}`}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lógica Condicional Baseada no Tipo */}
              
              {/* 1. Tarefa Normal ou Bônus (Requer Data Limite e Hora) */}
              {(type === 'normal' || type === 'bonus') && (
                {/* Seletor de Data Limite */}
                <div className="flex-1 space-y-3">
                  <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold flex items-center gap-1">
                    <Calendar size={14}/> Data Limite
                  </span>
                  <button 
                    onClick={() => {setShowDatePicker(!showDatePicker); setShowTimePicker(false);}}
                    className={`w-full p-3 rounded-lg border text-sm transition-all ${
                      deadlineDate ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {deadlineDate ? format(new Date(deadlineDate + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR }) : 'Selecionar'}
                  </button>
                </div>
                
                {/* Seletor de Hora */}
                <div className={`flex-1 space-y-3 ${!deadlineDate ? 'opacity-30 pointer-events-none' : ''}`}>
                  <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold flex items-center gap-1">
                    <Clock size={14}/> Hora
                  </span>
                  <button 
                    onClick={() => {setShowTimePicker(!showTimePicker); setShowDatePicker(false);}}
                    className={`w-full p-3 rounded-lg border text-sm transition-all ${
                      deadlineTime ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {deadlineTime || 'Sem hora'}
                  </button>
                </div>
              )}

              {/* 2. Tarefa Sprint (Requer Início, Fim e Subtarefas) */}
              {type === 'sprint' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-3">
                      <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold flex items-center gap-1">Início</span>
                      <div className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500 cursor-pointer">Data Inicial</div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold flex items-center gap-1">Fim (Máx 31d)</span>
                      <div className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500 cursor-pointer">Data Final</div>
                    </div>
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                    <ListPlus size={18} /> Adicionar Subtarefa (Obrigatório)
                  </button>
                </div>
              )}

              {/* 3. Tarefa de Tempo (Slider de Duração) */}
              {type === 'time' && (
                <div className="space-y-3">
                  <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold flex items-center gap-1">
                    <Timer size={14}/> Duração do Foco: <span className="text-blue-500 ml-1">{duration} min</span>
                  </span>
                  <input 
                    type="range" 
                    min="5" 
                    max="120" 
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}

              {/* Desafio Diário e Surpresa (Mostra aviso) */}
              {(type === 'daily_challenge' || type === 'surprise') && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl text-sm flex items-center gap-3">
                  <Zap size={24} className="shrink-0" />
                  <p>Esta tarefa é válida <b>apenas para hoje</b>. O prazo expira à meia-noite.</p>
                </div>
              )}

              {/* Seletor de Prioridade */}
              <div>
                <span className="text-xs uppercase tracking-widest text-zinc-500 mb-3 block font-bold">Prioridade</span>
                <div className="flex gap-2">
                  {(['P0', 'P1', 'P2', 'P3', 'P4'] as Priority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2 rounded-lg border font-bold transition-all ${
                        priority === p 
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-transparent' 
                          : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Rodapé e Botão de Salvar */}
            <div className="p-6 bg-zinc-100 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={handleSave}
                disabled={!title.trim() || (type === 'sprint' && (!startDate || !endDate))}
                className="w-full py-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black font-bold text-lg disabled:opacity-50 transition-opacity"
              >
                Criar Tarefa
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};