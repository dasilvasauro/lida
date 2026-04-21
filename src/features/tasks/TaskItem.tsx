import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check, Clock, Calendar, Zap, Target, Timer, Gift,
    Sparkles, CheckCircle2, ChevronDown, Play, Maximize2, Trash2, Repeat, Edit2
} from 'lucide-react';
import type { Task } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTaskStore } from '../../store/useTaskStore';

interface TaskItemProps {
    task: Task;
    onToggle: (id: string) => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export const TaskItem = ({ task, onToggle, onEdit, onDelete }: TaskItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
    const activeFocusSession = useTaskStore((state) => state.activeFocusSession);
    const startFocus = useTaskStore((state) => state.startFocus);
    const toggleFocusMode = useTaskStore((state) => state.toggleFocusMode);
    const markTaskFailed = useTaskStore((state) => state.markTaskFailed);

    const isActiveSession = activeFocusSession?.taskId === task.id;

    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isOvertime, setIsOvertime] = useState(false);

    useEffect(() => {
        if (!isActiveSession || !activeFocusSession) {
            setTimeLeft(null);
            setIsOvertime(false);
            return;
        }

        const calculateTime = () => {
            const elapsedSeconds = Math.floor((Date.now() - activeFocusSession.startTime) / 1000);
            const remaining = activeFocusSession.duration - elapsedSeconds;

            const overtime = remaining < 0;
            if (overtime && !task.isFailed) {
                markTaskFailed(task.id);
            }

            setTimeLeft(Math.abs(remaining));
            setIsOvertime(overtime);
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

    const icons = {
        normal: CheckCircle2,
        daily_challenge: Zap,
        sprint: Target,
        time: Timer,
        bonus: Gift,
        surprise: Sparkles,
    };

    const Icon = icons[task.type as keyof typeof icons] || CheckCircle2;

    const priorityStyles = {
        P0: 'border-red-500/50 dark:border-red-500/40 bg-red-500/5 dark:bg-red-950/20',
        P1: 'border-orange-500/50 dark:border-orange-500/40',
        P2: 'border-zinc-300 dark:border-zinc-700',
        P3: 'border-blue-500/50 dark:border-blue-500/40',
        P4: 'border-purple-500/50 dark:border-purple-500/40',
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

        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        switch (task.recurrence.type) {
            case 'weekly':
                if (task.recurrence.weekdays?.length === 7) return 'Diário';
                return `Toda ${task.recurrence.weekdays?.map(d => days[d]).join(', ')}`;
            case 'monthly':
                return `Todo dia ${task.recurrence.dayOfMonth}`;
            case 'yearly':
                return `Todo dia ${task.recurrence.dayOfMonth} de ${months[task.recurrence.monthOfYear || 0]}`;
            default:
                return null;
        }
    };

    const recurrenceLabel = getRecurrenceLabel();

    return (
        <motion.div
        layout
        // Adicionado "relative overflow-hidden" para a bandeira quadriculada ficar contida e sombra suave
        className={`relative overflow-hidden flex flex-col p-4 mb-3 rounded-2xl border transition-all shadow-sm ${priorityStyles[task.priority]} ${
            task.isCompleted ? 'opacity-50 grayscale' : ''
        }`}
        >
        {/* ELEMENTO DISCRETO: Bandeira Quadriculada para Sprint */}
        {task.type === 'sprint' && (
            <div
            className="absolute top-0 left-0 w-full h-1.5 opacity-10 dark:opacity-20 pointer-events-none"
            style={{
                backgroundImage: 'repeating-conic-gradient(currentColor 0% 25%, transparent 0% 50%)',
                                    backgroundSize: '12px 12px'
            }}
            />
        )}

        <div className="flex items-start gap-4">
        {/* Checkbox Principal */}
        <button
        onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id);
        }}
        className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            task.isCompleted
            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-black'
            : 'border-zinc-400 dark:border-zinc-500 hover:border-zinc-900 dark:hover:border-zinc-100'
        }`}
        >
        {task.isCompleted && <Check size={14} strokeWidth={3} />}
        </button>

        {/* Conteúdo Central */}
        <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        >
        <h4 className={`text-base font-bold truncate ${task.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
        {task.title}
        </h4>

        {task.description && !isExpanded && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-0.5 italic">
            {task.description}
            </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        <span className="flex items-center gap-1">
        <Icon size={12} />
        {task.type.replace('_', ' ')}
        </span>

        {/* Selo de Recorrência */}
        {recurrenceLabel && (
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
            <Repeat size={12} />
            {recurrenceLabel}
            </span>
        )}

        {task.deadlineDate && (
            <span className="flex items-center gap-1">
            <Calendar size={12} />
            {format(new Date(task.deadlineDate + 'T12:00:00'), "dd/MM", { locale: ptBR })}
            </span>
        )}

        {hasSubtasks && (
            <span className="flex items-center gap-1 text-purple-500">
            <Target size={12} />
            {completedSubtasks}/{task.subtasks?.length}
            </span>
        )}
        </div>
        </div>

        {/* Ações da Direita (Prioridade e Expandir) */}
        <div className="flex flex-col items-end gap-2">
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${priorityBadgeStyles[task.priority]}`}>
        {task.priority}
        </span>

        <motion.div
        animate={{ rotate: isExpanded ? 180 : 0 }}
        className="text-zinc-400 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        >
        <ChevronDown size={20} />
        </motion.div>

        {/* Botões do Tipo Tempo */}
        {task.type === 'time' && !task.isCompleted && (
            <div className="flex gap-1 mt-1">
            <button
            onClick={(e) => {
                e.stopPropagation();
                if (!isActiveSession) startFocus(task.id, task.duration || 30);
            }}
            disabled={isActiveSession}
            title={isActiveSession ? "Timer em andamento" : "Iniciar Timer"}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center justify-center ${
                isActiveSession
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 cursor-not-allowed border border-emerald-500/30'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            >
            {isActiveSession && timeLeft !== null ? (
                <span className={`flex items-center gap-1.5 text-xs font-bold tabular-nums tracking-wider ${isOvertime ? 'text-zinc-500 line-through decoration-1' : ''}`}>
                <Timer size={14} className="animate-pulse" />
                {isOvertime ? '+' : ''}{formatTime(timeLeft)}
                </span>
            ) : (
                <Play size={16} fill="currentColor" />
            )}
            </button>

            <button
            onClick={(e) => {
                e.stopPropagation();
                if (isActiveSession) toggleFocusMode(true);
                else startFocus(task.id, task.duration || 30);
            }}
            title="Modo Foco Imersivo"
            className={`p-2 rounded-lg transition-colors ${
                isActiveSession ? 'bg-zinc-700 text-white hover:bg-zinc-600' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
            >
            <Maximize2 size={16} />
            </button>
            </div>
        )}
        </div>
        </div>

        {/* Área Expandida (Subtarefas, Progresso e Botões de Ação) */}
        <AnimatePresence>
        {isExpanded && (
            <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            >
            <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">

            {task.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {task.description}
                </p>
            )}

            {hasSubtasks && (
                <>
                <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase text-zinc-500">
                <span>Progresso da tarefa</span>
                <span>{Math.round(progress)}%</span>
                </div>

                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`h-full ${task.type === 'sprint' ? 'bg-purple-500' : 'bg-zinc-900 dark:bg-zinc-100'}`}
                />
                </div>
                </div>

                <div className="space-y-2">
                {task.subtasks?.map((st) => (
                    <button
                    key={st.id}
                    onClick={() => toggleSubtask(task.id, st.id)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                    >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        st.completed
                        ? 'bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-black'
                        : 'border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-400'
                    }`}>
                    {st.completed && <Check size={12} strokeWidth={4} />}
                    </div>
                    <span className={`text-sm ${st.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {st.title}
                    </span>
                    </button>
                ))}
                </div>
                </>
            )}

            {/* Botões de Ação Inferiores (Editar e Excluir) */}
            <div className="flex justify-end pt-2 gap-2">
            {onEdit && !task.isCompleted && (
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                <Edit2 size={14} /> Editar
                </button>
            )}

            {onDelete && (
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                >
                <Trash2 size={14} /> Excluir
                </button>
            )}
            </div>

            </div>
            </motion.div>
        )}
        </AnimatePresence>
        </motion.div>
    );
};
