import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Calendar, Zap, Target, Timer, Gift, Sparkles, CheckCircle2, ChevronDown, Play, Maximize2, Trash2, Repeat, Edit2, Wind, CalendarHeart, Dices, Folder } from 'lucide-react';
import type { Task } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTaskStore } from '../../store/useTaskStore';
import { useEconomyStore } from '../../store/useEconomyStore';

interface TaskItemProps {
    task: Task; onToggle: (id: string) => void;
    onEdit?: () => void; onDelete?: () => void;
}

export const TaskItem = ({ task, onToggle, onEdit, onDelete }: TaskItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
    const activeFocusSession = useTaskStore((state) => state.activeFocusSession);
    const startFocus = useTaskStore((state) => state.startFocus);
    const toggleFocusMode = useTaskStore((state) => state.toggleFocusMode);
    const markTaskFailed = useTaskStore((state) => state.markTaskFailed);
    const applyPowerUp = useTaskStore((state) => state.applyPowerUp);
    
    // Obter nome da pasta
    const folders = useTaskStore((state) => state.folders);
    const folder = folders.find(f => f.id === task.folderId);
    const folderName = folder ? folder.name : 'Geral';

    const inventory = useEconomyStore((state) => state.inventory);
    const useItem = useEconomyStore((state) => state.useItem);

    const isActiveSession = activeFocusSession?.taskId === task.id;
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isOvertime, setIsOvertime] = useState(false);

    useEffect(() => {
        if (!isActiveSession || !activeFocusSession) { setTimeLeft(null); setIsOvertime(false); return; }
        const calculateTime = () => {
            const elapsedSeconds = Math.floor((Date.now() - activeFocusSession.startTime) / 1000);
            const remaining = activeFocusSession.duration - elapsedSeconds;
            const overtime = remaining < 0;
            if (overtime && !task.isFailed) markTaskFailed(task.id);
            setTimeLeft(Math.abs(remaining)); setIsOvertime(overtime);
        };
        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [isActiveSession, activeFocusSession, task.id, task.isFailed, markTaskFailed]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const icons = { normal: CheckCircle2, daily_challenge: Zap, sprint: Target, time: Timer, bonus: Gift, surprise: Sparkles };
    const Icon = icons[task.type as keyof typeof icons] || CheckCircle2;

    const priorityStyles = {
        P0: 'border-red-500/50 dark:border-red-500/40 bg-red-500/5 dark:bg-red-950/20', P1: 'border-orange-500/50 dark:border-orange-500/40',
        P2: 'border-zinc-300 dark:border-zinc-700', P3: 'border-blue-500/50 dark:border-blue-500/40', P4: 'border-purple-500/50 dark:border-purple-500/40',
    };

    const priorityBadgeStyles = {
        P0: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/50',
        P1: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50',
        P2: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
        P3: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50',
        P4: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50',
    };

    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
    const progress = hasSubtasks ? (completedSubtasks / task.subtasks!.length) * 100 : 0;

    const getRecurrenceLabel = () => {
        if (!task.recurrence || task.recurrence.type === 'none') return null;
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        switch (task.recurrence.type) {
            case 'weekly': return task.recurrence.weekdays?.length === 7 ? 'Diário' : `Toda ${task.recurrence.weekdays?.map(d => days[d]).join(', ')}`;
            case 'monthly': return `Todo dia ${task.recurrence.dayOfMonth}`;
            case 'yearly': return `Todo dia ${task.recurrence.dayOfMonth} de ${months[task.recurrence.monthOfYear || 0]}`;
            default: return null;
        }
    };
    const recurrenceLabel = getRecurrenceLabel();

    return (
        <motion.div layout className={`relative overflow-hidden flex flex-col p-4 mb-3 rounded-2xl border transition-all shadow-sm ${priorityStyles[task.priority]} ${task.isCompleted ? 'opacity-50 grayscale' : ''}`}>
        
        {task.type === 'sprint' && (
            <div className="absolute top-0 left-0 w-full h-1.5 opacity-10 dark:opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-conic-gradient(currentColor 0% 25%, transparent 0% 50%)', backgroundSize: '12px 12px' }} />
        )}

        <div className="flex items-start gap-4">
        <button onClick={(e) => { e.stopPropagation(); onToggle(task.id); }} className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-black' : 'border-zinc-400 dark:border-zinc-500 hover:border-zinc-900 dark:hover:border-zinc-100'}`}>
        {task.isCompleted && <Check size={14} strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <h4 className={`text-base font-bold truncate ${task.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>{task.title}</h4>
        {task.description && !isExpanded && (<p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-0.5 italic">{task.description}</p>)}

        <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        <span className="flex items-center gap-1"><Icon size={12} />{task.type.replace('_', ' ')}</span>
        
        {task.hasMagicDice && (
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                <Dices size={12} /> Boost Mágico
            </span>
        )}

        {recurrenceLabel && <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md"><Repeat size={12} />{recurrenceLabel}</span>}
        
        {task.hasRespite && (
            <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md border border-teal-500/20 shadow-[0_0_10px_rgba(20,184,166,0.2)]">
                <Wind size={12} /> Respiro (+3h)
            </span>
        )}
        {task.hasRelief && (
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                <CalendarHeart size={12} /> Alívio (+1 Dia)
            </span>
        )}

        {task.deadlineDate && <span className="flex items-center gap-1"><Calendar size={12} />{format(new Date(task.deadlineDate + 'T12:00:00'), "dd/MM", { locale: ptBR })}</span>}
        {task.deadlineTime && <span className="flex items-center gap-1"><Clock size={12} />{task.deadlineTime}</span>}
        {hasSubtasks && <span className="flex items-center gap-1 text-purple-500"><Target size={12} />{completedSubtasks}/{task.subtasks?.length}</span>}
        </div>
        </div>

        <div className="flex flex-col items-end gap-2">
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${priorityBadgeStyles[task.priority]}`}>{task.priority}</span>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-zinc-400 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}><ChevronDown size={20} /></motion.div>
        
        {task.type === 'time' && !task.isCompleted && (
            <div className="flex gap-1 mt-1">
            <button onClick={(e) => { e.stopPropagation(); if (!isActiveSession) startFocus(task.id, task.duration || 30); }} disabled={isActiveSession} title={isActiveSession ? "Timer em andamento" : "Iniciar Timer"} className={`px-3 py-2 rounded-lg transition-colors flex items-center justify-center ${isActiveSession ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 cursor-not-allowed border border-emerald-500/30' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
            {isActiveSession && timeLeft !== null ? (<span className={`flex items-center gap-1.5 text-xs font-bold tabular-nums tracking-wider ${isOvertime ? 'text-zinc-500 line-through decoration-1' : ''}`}><Timer size={14} className="animate-pulse" />{isOvertime ? '+' : ''}{formatTime(timeLeft)}</span>) : (<Play size={16} fill="currentColor" />)}
            </button>
            <button onClick={(e) => { e.stopPropagation(); if (isActiveSession) toggleFocusMode(true); else startFocus(task.id, task.duration || 30); }} title="Modo Foco Imersivo" className={`p-2 rounded-lg transition-colors ${isActiveSession ? 'bg-zinc-700 text-white hover:bg-zinc-600' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            <Maximize2 size={16} />
            </button>
            </div>
        )}
        </div>
        </div>

        <AnimatePresence>
        {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            {task.description && (<p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{task.description}</p>)}

            {hasSubtasks && (
                <>
                <div className="space-y-1.5"><div className="flex justify-between text-[10px] font-black uppercase text-zinc-500"><span>Progresso da tarefa</span><span>{Math.round(progress)}%</span></div><div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={`h-full ${task.type === 'sprint' ? 'bg-purple-500' : 'bg-zinc-900 dark:bg-zinc-100'}`} /></div></div>
                <div className="space-y-2">
                {task.subtasks?.map((st) => (
                    <button key={st.id} onClick={() => toggleSubtask(task.id, st.id)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${st.completed ? 'bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-black' : 'border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-400'}`}>
                    {st.completed && <Check size={12} strokeWidth={4} />}
                    </div>
                    <span className={`text-sm ${st.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{st.title}</span>
                    </button>
                ))}
                </div>
                </>
            )}

            <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
              
              {/* NOME DA PASTA NO CANTO INFERIOR ESQUERDO */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                <Folder size={12} /> {folderName}
              </div>

              <div className="flex gap-2">
                {!task.isCompleted && !task.hasRespite && inventory.respite > 0 && task.deadlineTime && (
                    <button onClick={(e) => { e.stopPropagation(); if(useItem('respite')) applyPowerUp(task.id, 'respite'); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-teal-500 hover:bg-teal-500/10 transition-colors">
                        <Wind size={14} /> Usar Respiro
                    </button>
                )}
                {!task.isCompleted && !task.hasRelief && inventory.relief > 0 && task.deadlineDate && (
                    <button onClick={(e) => { e.stopPropagation(); if(useItem('relief')) applyPowerUp(task.id, 'relief'); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors">
                        <CalendarHeart size={14} /> Usar Alívio
                    </button>
                )}

                {onEdit && !task.isCompleted && (
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"><Edit2 size={14} /> Editar</button>
                )}
                {onDelete && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /> Excluir</button>
                )}
              </div>
            </div>

            </div>
            </motion.div>
        )}
        </AnimatePresence>
        </motion.div>
    );
};