import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Calendar, Zap, Target, Timer, Gift, Sparkles, CheckCircle2, ChevronDown, Play, Maximize2, Trash2, Repeat, Edit2, Wind, CalendarHeart, Dices, Folder, Flame } from 'lucide-react';
import type { Task } from '../../types';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTaskStore } from '../../store/useTaskStore';
import { useEconomyStore } from '../../store/useEconomyStore';

interface TaskItemProps {
    task: Task; 
    onToggle: (id: string) => void;
    onEdit?: () => void; 
    onDelete?: () => void;
    onEditRoutine?: () => void;   
    onDeleteRoutine?: () => void; 
}

export const TaskItem = ({ task, onToggle, onEdit, onDelete, onEditRoutine, onDeleteRoutine }: TaskItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { toggleSubtask, activeFocusSession, startFocus, toggleFocusMode, markTaskFailed, applyPowerUp, folders, routines, tasks } = useTaskStore();
    
    const folder = folders.find(f => f.id === task.folderId);
    const folderName = folder ? folder.name : 'Geral';

    const { inventory, useItem } = useEconomyStore();

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

    const icons = { normal: CheckCircle2, daily_challenge: Zap, sprint: Target, time: Timer, bonus: Gift, surprise: Sparkles, routine: Repeat };
    const Icon = icons[task.type as keyof typeof icons] || CheckCircle2;

    // ESTILOS DE PRIORIDADE (TAREFAS NORMAIS: OUTLINE + BG LEVE)
    const priorityStyles = {
        P0: 'border-red-500/50 dark:border-red-500/40 bg-red-500/5 dark:bg-red-950/20 text-zinc-900 dark:text-zinc-100', 
        P1: 'border-orange-500/50 dark:border-orange-500/40 bg-transparent text-zinc-900 dark:text-zinc-100',
        P2: 'border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100', 
        P3: 'border-blue-500/50 dark:border-blue-500/40 bg-transparent text-zinc-900 dark:text-zinc-100', 
        P4: 'border-purple-500/50 dark:border-purple-500/40 bg-transparent text-zinc-900 dark:text-zinc-100',
    };

    const priorityBadgeStyles = {
        P0: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/50',
        P1: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50',
        P2: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
        P3: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50',
        P4: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50',
    };

    // ESTILOS SÓLIDOS/PREENCHIDOS PARA AS ROTINAS
    const routineColors: Record<string, { bg: string, text: string, bar: string, buttonHover: string, statusBg: string }> = {
        blue: { bg: 'bg-blue-100/60 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700', text: 'text-blue-900 dark:text-blue-100', bar: 'bg-blue-500', buttonHover: 'hover:bg-blue-200 dark:hover:bg-blue-800', statusBg: 'bg-blue-500/10 border-blue-500/20' },
        emerald: { bg: 'bg-emerald-100/60 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700', text: 'text-emerald-900 dark:text-emerald-100', bar: 'bg-emerald-500', buttonHover: 'hover:bg-emerald-200 dark:hover:bg-emerald-800', statusBg: 'bg-emerald-500/10 border-emerald-500/20' },
        amber: { bg: 'bg-amber-100/60 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700', text: 'text-amber-900 dark:text-amber-100', bar: 'bg-amber-500', buttonHover: 'hover:bg-amber-200 dark:hover:bg-amber-800', statusBg: 'bg-amber-500/10 border-amber-500/20' },
        rose: { bg: 'bg-rose-100/60 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700', text: 'text-rose-900 dark:text-rose-100', bar: 'bg-rose-500', buttonHover: 'hover:bg-rose-200 dark:hover:bg-rose-800', statusBg: 'bg-rose-500/10 border-rose-500/20' },
        purple: { bg: 'bg-purple-100/60 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700', text: 'text-purple-900 dark:text-purple-100', bar: 'bg-purple-500', buttonHover: 'hover:bg-purple-200 dark:hover:bg-purple-800', statusBg: 'bg-purple-500/10 border-purple-500/20' },
        cyan: { bg: 'bg-cyan-100/60 dark:bg-cyan-900/40 border-cyan-300 dark:border-cyan-700', text: 'text-cyan-900 dark:text-cyan-100', bar: 'bg-cyan-500', buttonHover: 'hover:bg-cyan-200 dark:hover:bg-cyan-800', statusBg: 'bg-cyan-500/10 border-cyan-500/20' },
        indigo: { bg: 'bg-indigo-100/60 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700', text: 'text-indigo-900 dark:text-indigo-100', bar: 'bg-indigo-500', buttonHover: 'hover:bg-indigo-200 dark:hover:bg-indigo-800', statusBg: 'bg-indigo-500/10 border-indigo-500/20' },
        zinc: { bg: 'bg-zinc-200/80 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700', text: 'text-zinc-900 dark:text-zinc-100', bar: 'bg-zinc-500', buttonHover: 'hover:bg-zinc-300 dark:hover:bg-zinc-700', statusBg: 'bg-zinc-500/10 border-zinc-500/20' },
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

    const isRoutine = task.type === 'routine';
    const rColorData = routineColors[task.color || 'indigo'];

    let routineStreak = 0;
    let isRoutineHot = false;

    if (isRoutine && task.routineTemplateId) {
        const routine = routines.find(r => r.id === task.routineTemplateId);
        if (routine) {
            const routineTasks = tasks.filter(t => t.routineTemplateId === routine.id && t.isCompleted);
            let checkDate = new Date();
            
            while(true) {
                const dateStr = format(checkDate, 'yyyy-MM-dd');
                if (routine.weekdays.includes(checkDate.getDay())) {
                    const wasCompleted = routineTasks.some(t => t.deadlineDate === dateStr);
                    if (!wasCompleted) {
                        if (dateStr !== format(new Date(), 'yyyy-MM-dd')) break; 
                    } else {
                        routineStreak++;
                    }
                }
                checkDate = subDays(checkDate, 1);
            }
            isRoutineHot = routineStreak >= 3;
        }
    }

    const finalBorderClass = isRoutine 
        ? rColorData.bg
        : priorityStyles[task.priority];

    const textColorClass = isRoutine ? rColorData.text : 'text-zinc-900 dark:text-zinc-100';
    const subtextColorClass = isRoutine ? 'opacity-70' : 'text-zinc-500 dark:text-zinc-400';

    return (
        <motion.div layout className={`relative overflow-hidden flex flex-col p-4 mb-3 rounded-2xl border transition-all shadow-sm ${finalBorderClass} ${task.isCompleted ? 'opacity-50 grayscale' : ''}`}>
        
        {task.type === 'sprint' && (
            <div className="absolute top-0 left-0 w-full h-1.5 opacity-10 dark:opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-conic-gradient(currentColor 0% 25%, transparent 0% 50%)', backgroundSize: '12px 12px' }} />
        )}

        <div className="flex items-start gap-4">
        <button onClick={(e) => { e.stopPropagation(); onToggle(task.id); }} className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-black' : isRoutine ? 'border-current opacity-50 hover:opacity-100' : 'border-zinc-400 dark:border-zinc-500 hover:border-zinc-900 dark:hover:border-zinc-100'}`}>
        {task.isCompleted && <Check size={14} strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <h4 className={`text-base font-bold truncate ${task.isCompleted ? 'line-through opacity-60' : textColorClass}`}>{task.title}</h4>
        {task.description && !isExpanded && (<p className={`text-sm truncate mt-0.5 italic ${subtextColorClass}`}>{task.description}</p>)}

        {task.status && (
            <div className={`mt-2.5 px-3 py-2 rounded-lg text-xs leading-relaxed border ${isRoutine ? rColorData.statusBg : 'bg-blue-500/5 border-blue-500/10 text-blue-700 dark:text-blue-400'}`}>
                <span className="font-bold uppercase tracking-widest text-[9px] opacity-70 block mb-0.5">Status</span>
                <span className={`line-clamp-3 ${isRoutine ? 'opacity-90' : ''}`}>{task.status}</span>
            </div>
        )}

        <div className={`flex flex-wrap items-center gap-3 mt-3 text-[10px] font-bold uppercase tracking-wider ${subtextColorClass}`}>
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
        {hasSubtasks && <span className="flex items-center gap-1"><Target size={12} />{completedSubtasks}/{task.subtasks?.length}</span>}
        </div>
        </div>

        <div className="flex flex-col items-end gap-2">
        {isRoutine ? (
            <div className={`flex items-center gap-2 ${textColorClass}`}>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border border-current opacity-80 ${isRoutineHot ? 'opacity-100' : ''}`}>
                    <Flame size={12} className={isRoutineHot ? 'animate-pulse' : ''} /> {routineStreak}
                </div>
            </div>
        ) : (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${priorityBadgeStyles[task.priority]}`}>{task.priority}</span>
        )}

        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className={`cursor-pointer ${subtextColorClass}`} onClick={() => setIsExpanded(!isExpanded)}><ChevronDown size={20} /></motion.div>
        
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
            <div className={`pt-4 mt-4 border-t space-y-4 ${isRoutine ? 'border-current opacity-90' : 'border-zinc-200 dark:border-zinc-800'}`}>
            {task.description && (<p className={`text-sm leading-relaxed ${subtextColorClass}`}>{task.description}</p>)}

            {hasSubtasks && (
                <>
                <div className="space-y-1.5"><div className={`flex justify-between text-[10px] font-black uppercase ${subtextColorClass}`}><span>{isRoutine ? 'Itens da Rotina' : 'Progresso da Tarefa'}</span><span>{Math.round(progress)}%</span></div><div className={`w-full h-1.5 rounded-full overflow-hidden ${isRoutine ? 'bg-black/10 dark:bg-white/10' : 'bg-zinc-200 dark:bg-zinc-800'}`}><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={`h-full ${task.type === 'sprint' ? 'bg-purple-500' : isRoutine ? rColorData.bar : 'bg-zinc-900 dark:bg-zinc-100'}`} /></div></div>
                <div className="space-y-2">
                {task.subtasks?.map((st) => (
                    <button key={st.id} onClick={() => toggleSubtask(task.id, st.id)} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors group ${isRoutine ? rColorData.buttonHover : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${st.completed ? (isRoutine ? `${rColorData.bar} border-transparent text-white` : 'bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-black') : (isRoutine ? 'border-current opacity-50 group-hover:opacity-100' : 'border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-400')}`}>
                    {st.completed && <Check size={12} strokeWidth={4} />}
                    </div>
                    <span className={`text-sm text-left ${st.completed ? 'line-through opacity-50' : ''}`}>{st.title}</span>
                    </button>
                ))}
                </div>
                </>
            )}

            <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
              <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${isRoutine ? 'bg-black/5 dark:bg-white/5 opacity-80' : 'text-zinc-400 bg-zinc-100 dark:bg-zinc-800'}`}>
                <Folder size={12} /> {folderName}
              </div>

              <div className="flex gap-2">
                {!task.isCompleted && !task.hasRespite && inventory.respite > 0 && task.deadlineTime && !isRoutine && (
                    <button onClick={(e) => { e.stopPropagation(); if(useItem('respite')) applyPowerUp(task.id, 'respite'); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-teal-500 hover:bg-teal-500/10 transition-colors">
                        <Wind size={14} /> Usar Respiro
                    </button>
                )}
                {!task.isCompleted && !task.hasRelief && inventory.relief > 0 && task.deadlineDate && !isRoutine && (
                    <button onClick={(e) => { e.stopPropagation(); if(useItem('relief')) applyPowerUp(task.id, 'relief'); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors">
                        <CalendarHeart size={14} /> Usar Alívio
                    </button>
                )}

                {onEdit && !task.isCompleted && !isRoutine && (
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"><Edit2 size={14} /> Editar</button>
                )}
                {onDelete && !isRoutine && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /> Excluir</button>
                )}

                {onEditRoutine && !task.isCompleted && isRoutine && (
                    <button onClick={(e) => { e.stopPropagation(); onEditRoutine(); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${rColorData.buttonHover}`}><Edit2 size={14} /> Editar Rotina</button>
                )}
                {onDeleteRoutine && isRoutine && (
                    <button onClick={(e) => { e.stopPropagation(); onDeleteRoutine(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /> Excluir Rotina</button>
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