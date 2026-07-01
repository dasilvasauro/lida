import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Calendar, Zap, Timer, Gift, Sparkles, CheckCircle2, ChevronDown, Play, Maximize2, Trash2, Repeat, Edit2, Wind, CalendarHeart, Dices, Folder, Flame, Ticket, AlertTriangle, Footprints, Target, MessageSquareText } from 'lucide-react';
import type { Task } from '../../types';
import { format, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTaskStore } from '../../store/useTaskStore';
import { useEconomyStore } from '../../store/useEconomyStore';
import { useConfigStore } from '../../store/useConfigStore';

// === COMPONENTE MARQUEE PARA VISÃO COMPACTA ===
const MarqueeText = ({ text, className }: { text: string, className?: string }) => {
    const [overflowAmount, setOverflowAmount] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
 
    useEffect(() => {
       const checkOverflow = () => {
          if (containerRef.current && textRef.current) {
             const cWidth = containerRef.current.clientWidth;
             const tWidth = textRef.current.scrollWidth;
             setOverflowAmount(Math.max(0, tWidth - cWidth));
          }
       };
       checkOverflow();
       const observer = new ResizeObserver(() => checkOverflow());
       if (containerRef.current) observer.observe(containerRef.current);
       return () => observer.disconnect();
    }, [text]);
 
    const isOverflowing = overflowAmount > 0;
 
    return (
       <div ref={containerRef} className={`flex-1 overflow-hidden relative flex items-center min-w-0 h-full ${isOverflowing ? 'marquee-mask' : ''}`}>
          <span ref={textRef} className={`absolute invisible whitespace-nowrap ${className}`}>{text}</span>
          <motion.div
            animate={isOverflowing ? { x: [0, -overflowAmount] } : { x: 0 }}
            transition={isOverflowing ? { repeat: Infinity, repeatType: "reverse", duration: Math.max(overflowAmount * 0.04, 2.5), ease: 'linear', repeatDelay: 1.5 } : {}}
            className="flex whitespace-nowrap min-w-max h-full items-center"
          >
             <div className={`${className} pr-4`}>{text}</div>
          </motion.div>
       </div>
    );
};

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
    
    const { toggleSubtask, activeFocusSession, startFocus, toggleFocusMode, markTaskFailed, applyPowerUp, folders, routines, tasks, updateTask } = useTaskStore();
    const { enableEditWindow, isCompactView } = useConfigStore();
    const { inventory, useItem, spendVouchers } = useEconomyStore();
    
    const folder = folders.find(f => f.id === task.folderId);
    const folderName = folder ? folder.name : 'Geral';

    const isActiveSession = activeFocusSession?.taskId === task.id;
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isOvertime, setIsOvertime] = useState(false);

    // Sistema de Janela de Edição e Status
    const [freeEditTimeLeft, setFreeEditTimeLeft] = useState(0);
    const [actionPrompt, setActionPrompt] = useState<{ type: 'edit' | 'delete' | 'editRoutine' | 'deleteRoutine', cost: number } | null>(null);
    const [voucherError, setVoucherError] = useState(false);
    
    // Status In-line
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [tempStatus, setTempStatus] = useState(task.status || '');

    // Tooltip de Descrição (Modo Compacto)
    const [showTooltip, setShowTooltip] = useState(false);
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setTempStatus(task.status || '');
    }, [task.status]);

    const handleStatusSave = () => {
        setIsEditingStatus(false);
        if (tempStatus.trim() !== (task.status || '').trim()) {
            updateTask(task.id, { status: tempStatus.trim() });
        }
    };

    useEffect(() => {
        if (!enableEditWindow || task.isFreeEditExpired) return;
        const calcFreeTime = () => {
            const elapsedSeconds = Math.floor((Date.now() - task.createdAt) / 1000);
            const remaining = (10 * 60) - elapsedSeconds;
            if (remaining > 0) setFreeEditTimeLeft(remaining);
            else setFreeEditTimeLeft(0);
        };
        calcFreeTime();
        const interval = setInterval(calcFreeTime, 1000);
        return () => clearInterval(interval);
    }, [task.createdAt, task.isFreeEditExpired, enableEditWindow]);

    const isFreeToEdit = !enableEditWindow || (!task.isFreeEditExpired && freeEditTimeLeft > 0);
    const formatFreeTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

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

    const handlePressStart = () => {
        if (!task.description) return;
        pressTimer.current = setTimeout(() => setShowTooltip(true), 500);
    };
    const handlePressEnd = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        setShowTooltip(false);
    };

    const icons = { normal: CheckCircle2, daily_challenge: Zap, sprint: Footprints, time: Timer, bonus: Gift, surprise: Sparkles, routine: Repeat };
    const Icon = icons[task.type as keyof typeof icons] || CheckCircle2;

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

    let sprintTotal = 0; let sprintElapsed = 0; let sprintLeft = 0; let sprintProgress = 0;
    if (task.type === 'sprint' && task.deadlineDate) {
        const startStr = format(new Date(task.createdAt), 'yyyy-MM-dd');
        const start = new Date(startStr + 'T12:00:00');
        const end = new Date(task.deadlineDate + 'T12:00:00');
        const todayObj = new Date();
        todayObj.setHours(12, 0, 0, 0);
        
        sprintTotal = Math.max(1, differenceInDays(end, start));
        sprintElapsed = Math.max(0, differenceInDays(todayObj, start));
        sprintLeft = Math.max(0, sprintTotal - sprintElapsed);
        sprintProgress = Math.min(100, (sprintElapsed / sprintTotal) * 100);
    }

    const finalBorderClass = isRoutine ? rColorData.bg : priorityStyles[task.priority];
    const textColorClass = isRoutine ? rColorData.text : 'text-zinc-900 dark:text-zinc-100';
    const subtextColorClass = isRoutine ? 'opacity-70' : 'text-zinc-500 dark:text-zinc-400';

    const handleActionRequest = (type: 'edit' | 'delete' | 'editRoutine' | 'deleteRoutine') => {
        if (isFreeToEdit) {
            if (type === 'edit' && onEdit) onEdit();
            if (type === 'delete' && onDelete) onDelete();
            if (type === 'editRoutine' && onEditRoutine) onEditRoutine();
            if (type === 'deleteRoutine' && onDeleteRoutine) onDeleteRoutine();
        } else {
            const cost = (type === 'delete' || type === 'deleteRoutine') ? 2 : 1;
            setActionPrompt({ type, cost });
        }
    };

    const confirmPaidAction = () => {
        if (!actionPrompt) return;
        if (spendVouchers(actionPrompt.cost)) {
            if (actionPrompt.type === 'edit' && onEdit) onEdit();
            if (actionPrompt.type === 'delete' && onDelete) onDelete();
            if (actionPrompt.type === 'editRoutine' && onEditRoutine) onEditRoutine();
            if (actionPrompt.type === 'deleteRoutine' && onDeleteRoutine) onDeleteRoutine();
            setActionPrompt(null);
        } else {
            setVoucherError(true);
            setTimeout(() => setVoucherError(false), 3000);
        }
    };

    // ========================================
    // ======= RENDERIZAÇÃO COMPACTA =======
    // ========================================
    if (isCompactView) {
        return (
            <motion.div layout className={`relative flex flex-col p-2 mb-2 rounded-xl border transition-all shadow-sm ${finalBorderClass} ${task.isCompleted ? 'opacity-50 grayscale' : ''} group`}>
                
                {/* Tooltip de Descrição no Hover (Desktop) e Hold (Mobile) */}
                <AnimatePresence>
                    {showTooltip && task.description && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 bottom-full left-10 mb-1 p-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black font-medium text-xs rounded-xl shadow-2xl max-w-xs whitespace-pre-wrap border border-zinc-700 dark:border-zinc-300">
                            {task.description}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div 
                   className="flex items-center w-full"
                   onMouseEnter={() => { if(task.description) setShowTooltip(true); }}
                   onMouseLeave={() => setShowTooltip(false)}
                   onTouchStart={handlePressStart}
                   onTouchEnd={handlePressEnd}
                >
                    {/* Checkbox */}
                    <button onClick={(e) => { e.stopPropagation(); onToggle(task.id); }} className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mx-1 ${task.isCompleted ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-black' : isRoutine ? 'border-current opacity-50 hover:opacity-100' : 'border-zinc-400 dark:border-zinc-500 hover:border-zinc-900 dark:hover:border-zinc-100'}`}>
                        {task.isCompleted && <Check size={12} strokeWidth={3} />}
                    </button>

                    {/* Título & Ícones */}
                    <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden px-2 h-7 cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
                        <Icon size={14} className={textColorClass} />
                        <MarqueeText text={task.title} className={`text-sm font-bold ${task.isCompleted ? 'line-through opacity-60' : textColorClass}`} />
                        {task.hasMagicDice && <Dices size={12} className="text-purple-500 shrink-0"/>}
                        {task.deadlineTime && <span className="text-[10px] font-bold text-zinc-400 shrink-0 flex items-center gap-0.5 ml-1"><Clock size={10}/>{task.deadlineTime}</span>}
                    </div>

                    {/* Botões de Ação (Aparecem no Hover) */}
                    <div className="shrink-0 flex items-center gap-0.5 px-1 bg-transparent">
                        {!isRoutine && (
                            <div className={`px-1.5 py-0.5 mr-1 rounded text-[8px] font-black uppercase ${priorityBadgeStyles[task.priority]}`}>
                                {task.priority}
                            </div>
                        )}

                        <div className="flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity gap-0.5">
                             {task.type === 'time' && !task.isCompleted && (
                                 <button onClick={(e) => { e.stopPropagation(); if (!isActiveSession) startFocus(task.id, task.duration || 30); }} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors" title="Iniciar Timer"><Play size={14} fill="currentColor"/></button>
                             )}
                             
                             {!task.isCompleted && !task.status && !isEditingStatus && (
                                 <button onClick={(e) => { e.stopPropagation(); setIsEditingStatus(true); setIsExpanded(true); }} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors" title="Adicionar Status">
                                     <MessageSquareText size={14} />
                                 </button>
                             )}
                             
                             {!task.isCompleted && (
                                 <button onClick={(e) => { e.stopPropagation(); handleActionRequest(isRoutine ? 'editRoutine' : 'edit'); }} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-md transition-colors" title="Editar"><Edit2 size={14}/></button>
                             )}

                             <button onClick={(e) => { e.stopPropagation(); handleActionRequest(isRoutine ? 'deleteRoutine' : 'delete'); }} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors" title="Excluir"><Trash2 size={14} /></button>
                        </div>

                        {/* Seta de Dropdown se tiver Subtarefas/Sprint/Rotina ou Status Ativo */}
                        {(hasSubtasks || task.type === 'sprint' || isRoutine || task.status || isEditingStatus) && (
                             <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-md transition-colors ml-1">
                                 <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}><ChevronDown size={16} /></motion.div>
                             </button>
                        )}
                    </div>
                </div>

                {/* DROPDOWN COMPACTO */}
                <AnimatePresence>
                    {(isExpanded || isEditingStatus) && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2 px-1 pb-1">
                                
                                {/* Status In-line */}
                                {(task.status || isEditingStatus) && (
                                    <div className="flex gap-2 text-xs items-start">
                                        <span className="font-bold text-blue-500 shrink-0 mt-0.5"><MessageSquareText size={14}/></span>
                                        {isEditingStatus ? (
                                            <textarea autoFocus value={tempStatus} onChange={e=>setTempStatus(e.target.value)} onBlur={handleStatusSave} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleStatusSave();}}} className="flex-1 bg-transparent border-b border-blue-500/30 outline-none text-blue-700 dark:text-blue-300 resize-none overflow-hidden" placeholder="Digite o andamento..." rows={2} />
                                        ) : (
                                            <span className="text-zinc-600 dark:text-zinc-400 font-medium whitespace-pre-wrap flex-1 cursor-pointer hover:opacity-70 transition-opacity" onClick={()=>setIsEditingStatus(true)}>{task.status}</span>
                                        )}
                                    </div>
                                )}

                                {/* Sprint Compact Info (TEXTO) */}
                                {task.type === 'sprint' && task.deadlineDate && (
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mt-2 p-2 bg-purple-500/10 rounded-lg">
                                        <span>Conclusão: {Math.round(sprintProgress)}%</span>
                                        <span>Restam {sprintLeft} Dias</span>
                                    </div>
                                )}

                                {/* Subtasks / Rotinas Compactas */}
                                {hasSubtasks && (
                                    <div className="space-y-1.5 mt-2">
                                        {task.subtasks?.map(st => (
                                            <button key={st.id} onClick={() => toggleSubtask(task.id, st.id)} className="w-full flex items-center gap-2 text-xs text-left group px-1 py-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                                <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${st.completed ? (isRoutine ? `${rColorData.bar} border-transparent text-white` : 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-black') : 'border-zinc-400 group-hover:border-zinc-500'}`}>
                                                    {st.completed && <Check size={10} strokeWidth={3} />}
                                                </div>
                                                <span className={`${st.completed ? 'line-through opacity-50 text-zinc-500' : 'text-zinc-700 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white font-medium'}`}>{st.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Vouchers Alert */}
                <AnimatePresence>
                    {actionPrompt && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full right-0 mb-2 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-[100] text-zinc-900 dark:text-zinc-100 flex flex-col items-center min-w-[220px]">
                            <AlertTriangle size={24} className="text-amber-500 mb-2"/>
                            <span className="text-sm font-bold text-center mb-1">Acesso Restrito</span>
                            <span className="text-xs text-center opacity-80 mb-4">O tempo de edição gratuita expirou. Custo: {actionPrompt.cost} Vouchers.</span>
                            <div className="flex gap-2 w-full">
                                <button onClick={(e) => { e.stopPropagation(); setActionPrompt(null); }} className="flex-1 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold transition-colors">Cancelar</button>
                                <button onClick={(e) => { e.stopPropagation(); confirmPaidAction(); }} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1">Pagar <Ticket size={12}/></button>
                            </div>
                            {voucherError && <span className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-widest">Saldo Insuficiente</span>}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    }

    // ========================================
    // ======= RENDERIZAÇÃO NORMAL (DEFAULT) =======
    // ========================================
    return (
        <motion.div layout className={`relative flex flex-col p-4 mb-3 rounded-2xl border transition-all shadow-sm ${finalBorderClass} ${task.isCompleted ? 'opacity-50 grayscale' : ''}`}>
        
        {task.type === 'sprint' && (
            <div className="absolute top-0 left-0 w-full h-1.5 rounded-t-2xl opacity-10 dark:opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-conic-gradient(currentColor 0% 25%, transparent 0% 50%)', backgroundSize: '12px 12px' }} />
        )}

        <div className="flex items-start gap-4">
        <button onClick={(e) => { e.stopPropagation(); onToggle(task.id); }} className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-black' : isRoutine ? 'border-current opacity-50 hover:opacity-100' : 'border-zinc-400 dark:border-zinc-500 hover:border-zinc-900 dark:hover:border-zinc-100'}`}>
        {task.isCompleted && <Check size={14} strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <h4 className={`text-base font-bold truncate ${task.isCompleted ? 'line-through opacity-60' : textColorClass}`}>{task.title}</h4>
        {task.description && !isExpanded && (<p className={`text-sm truncate mt-0.5 italic ${subtextColorClass}`}>{task.description}</p>)}

        {/* MÓDULO DE STATUS IN-LINE */}
        {(task.status || isEditingStatus) && (
            <div className={`mt-2.5 px-3 py-2 rounded-lg text-xs leading-relaxed border ${isRoutine ? rColorData.statusBg : 'bg-blue-500/5 border-blue-500/10 text-blue-700 dark:text-blue-400'}`}>
                <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold uppercase tracking-widest text-[9px] opacity-70 block">Status</span>
                    {!isEditingStatus && !task.isCompleted && (
                        <button onClick={(e) => { e.stopPropagation(); setIsEditingStatus(true); }} className="opacity-50 hover:opacity-100 transition-opacity p-1" title="Editar Status (Grátis)">
                            <Edit2 size={10} />
                        </button>
                    )}
                </div>
                {isEditingStatus ? (
                    <textarea
                        autoFocus
                        value={tempStatus}
                        onChange={e => setTempStatus(e.target.value)}
                        onBlur={handleStatusSave}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleStatusSave();
                            }
                        }}
                        className="w-full bg-transparent outline-none resize-none border-b border-blue-500/30 dark:border-blue-400/30"
                        rows={2}
                        placeholder="Digite o andamento atual..."
                    />
                ) : (
                    <span className={`line-clamp-3 whitespace-pre-wrap ${isRoutine ? 'opacity-90' : ''}`}>{task.status}</span>
                )}
            </div>
        )}

        {/* BARRA DE PROGRESSO DO SPRINT */}
        {task.type === 'sprint' && task.deadlineDate && (
            <div className="mt-4 mb-2 px-1">
                <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <Footprints size={14}/> {sprintElapsed} {sprintElapsed === 1 ? 'Dia Corrido' : 'Dias Corridos'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Faltam {sprintLeft}
                    </span>
                </div>
                <div className="w-full h-2.5 bg-purple-500/10 dark:bg-purple-900/20 rounded-full relative overflow-hidden flex items-center shadow-inner border border-purple-500/10">
                    <motion.div initial={{width:0}} animate={{width: `${sprintProgress}%`}} className="h-full bg-gradient-to-r from-purple-600 to-purple-400" />
                    <div className="absolute right-0 top-0 bottom-0 w-2 border-l-[3px] border-dashed border-zinc-900 dark:border-zinc-100 opacity-40" title="Linha de chegada" />
                </div>
            </div>
        )}

        <div className={`flex flex-wrap items-center gap-3 mt-3 text-[10px] font-bold uppercase tracking-wider ${subtextColorClass}`}>
        <span className="flex items-center gap-1"><Icon size={12} />{task.type.replace('_', ' ')}</span>
        
        {task.hasMagicDice && ( <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)]"><Dices size={12} /> Boost Mágico</span> )}
        {recurrenceLabel && <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md"><Repeat size={12} />{recurrenceLabel}</span>}
        {task.hasRespite && ( <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md border border-teal-500/20 shadow-[0_0_10px_rgba(20,184,166,0.2)]"><Wind size={12} /> Respiro (+3h)</span> )}
        {task.hasRelief && ( <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]"><CalendarHeart size={12} /> Alívio (+1 Dia)</span> )}

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

            <div className="flex flex-wrap items-center justify-between pt-2 gap-2 relative">
              <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${isRoutine ? 'bg-black/5 dark:bg-white/5 opacity-80' : 'text-zinc-400 bg-zinc-100 dark:bg-zinc-800'}`}>
                <Folder size={12} /> {folderName}
              </div>

              <div className="flex gap-2">
                {!task.status && !task.isCompleted && !isEditingStatus && (
                    <button onClick={(e) => { e.stopPropagation(); setIsEditingStatus(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-blue-500 hover:bg-blue-500/10 transition-colors">
                        <MessageSquareText size={14} /> Add Status
                    </button>
                )}

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
                    <button onClick={(e) => { e.stopPropagation(); handleActionRequest('edit'); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                        <Edit2 size={14} /> Editar {isFreeToEdit ? <span className="opacity-60 font-normal">({formatFreeTime(freeEditTimeLeft)})</span> : <span className="flex items-center text-blue-500 gap-1 ml-1">1 <Ticket size={12}/></span>}
                    </button>
                )}
                {onDelete && !isRoutine && (
                    <button onClick={(e) => { e.stopPropagation(); handleActionRequest('delete'); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} /> Excluir {isFreeToEdit ? '' : <span className="flex items-center text-blue-500 gap-1 ml-1">2 <Ticket size={12}/></span>}
                    </button>
                )}

                {onEditRoutine && !task.isCompleted && isRoutine && (
                    <button onClick={(e) => { e.stopPropagation(); handleActionRequest('editRoutine'); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${rColorData.buttonHover}`}>
                        <Edit2 size={14} /> Editar Rotina {isFreeToEdit ? <span className="opacity-60 font-normal">({formatFreeTime(freeEditTimeLeft)})</span> : <span className="flex items-center opacity-100 gap-1 ml-1">1 <Ticket size={12}/></span>}
                    </button>
                )}
                {onDeleteRoutine && isRoutine && (
                    <button onClick={(e) => { e.stopPropagation(); handleActionRequest('deleteRoutine'); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} /> Excluir Rotina {isFreeToEdit ? '' : <span className="flex items-center text-blue-500 gap-1 ml-1">2 <Ticket size={12}/></span>}
                    </button>
                )}
              </div>
            </div>

            </div>
            </motion.div>
        )}
        </AnimatePresence>

        <AnimatePresence>
            {actionPrompt && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-12 right-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-[100] text-zinc-900 dark:text-zinc-100 flex flex-col items-center min-w-[220px]">
                    <AlertTriangle size={24} className="text-amber-500 mb-2"/>
                    <span className="text-sm font-bold text-center mb-1">Acesso Restrito</span>
                    <span className="text-xs text-center opacity-80 mb-4">O tempo de edição gratuita expirou. Custo: {actionPrompt.cost} Vouchers.</span>
                    <div className="flex gap-2 w-full">
                        <button onClick={(e) => { e.stopPropagation(); setActionPrompt(null); }} className="flex-1 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold transition-colors">Cancelar</button>
                        <button onClick={(e) => { e.stopPropagation(); confirmPaidAction(); }} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1">Pagar <Ticket size={12}/></button>
                    </div>
                    {voucherError && <span className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-widest">Saldo Insuficiente</span>}
                </motion.div>
            )}
        </AnimatePresence>

        </motion.div>
    );
};
