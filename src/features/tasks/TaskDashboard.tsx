import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, AlertTriangle,
  Frown, CloudRain, Meh, Smile, Sparkles, Trash2
} from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { TaskModal } from './TaskModal';
import { TaskItem } from './TaskItem';
import { RewardToast } from '../../components/ui/RewardToast';
import type { Task, Mood } from '../../types';

export const TaskDashboard = () => {
  const {
    tasks, toggleTaskCompletion, deleteTask, clearCompletedTasks,
    selectedFilter, setFilter,
    dailyMood, setDailyMood
  } = useTaskStore();

  const isModalOpen = useTaskStore((state) => state.isGlobalModalOpen);
  const setIsModalOpen = useTaskStore((state) => state.setGlobalModalOpen);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [reward, setReward] = useState<{ xp: number; gold: number; isFailed?: boolean } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'delete' | 'complete' | 'clear_completed'; taskId: string; title: string; subtitle: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const executeToggle = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.isCompleted) {
      if (task.isFailed) {
        setReward({ xp: 0, gold: 0, isFailed: true });
      } else {
        setReward({ xp: 45, gold: 15 });
      }
      setTimeout(() => setReward(null), 4000);
    }
    toggleTaskCompletion(taskId);
  };

  const requestToggle = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.isCompleted && task.subtasks && task.subtasks.some(st => !st.completed)) {
      setConfirmDialog({
        type: 'complete',
        taskId,
        title: 'Concluir com pendências?',
        subtitle: 'Ainda existem subtarefas não finalizadas. Deseja marcar a tarefa como concluída mesmo assim?'
      });
    } else {
      executeToggle(taskId);
    }
  };

  const requestDelete = (taskId: string) => {
    setConfirmDialog({
      type: 'delete',
      taskId,
      title: 'Excluir Tarefa?',
      subtitle: 'Essa ação não pode ser desfeita e a tarefa será removida permanentemente.'
    });
  };

  const handleConfirmAction = () => {
    if (!confirmDialog) return;

    if (confirmDialog.type === 'complete') {
      executeToggle(confirmDialog.taskId);
    } else if (confirmDialog.type === 'delete') {
      deleteTask(confirmDialog.taskId);
      showToast('Tarefa excluída com sucesso.');
    } else if (confirmDialog.type === 'clear_completed') {
      clearCompletedTasks();
      showToast('Tarefas limpas com sucesso.');
    }
    setConfirmDialog(null);
  };

  const filteredTasks = tasks.filter((task) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'today') {
      return !task.deadlineDate || task.deadlineDate === new Date().toISOString().split('T')[0];
    }
    return true;
  }).sort((a, b) => {
    if (a.isCompleted === b.isCompleted) return b.createdAt - a.createdAt;
    return a.isCompleted ? 1 : -1;
  });

  const hasCompletedTasks = filteredTasks.some(t => t.isCompleted);

  const moods: { value: Mood; icon: any; label: string }[] = [
    { value: 'terrible', icon: Frown, label: 'Exausto' },
    { value: 'bad', icon: CloudRain, label: 'Difícil' },
    { value: 'neutral', icon: Meh, label: 'Normal' },
    { value: 'good', icon: Smile, label: 'Bom' },
    { value: 'great', icon: Sparkles, label: 'Incrível' },
  ];

  const filters: { id: typeof selectedFilter; label: string }[] = [
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mês' },
    { id: 'all', label: 'Tudo' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 pb-32 transition-colors">

    <div className="max-w-4xl mx-auto px-6 md:px-8 pt-12 space-y-8">

    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-900">
    <div>
    <h1 className="text-3xl font-black tracking-tight">Suas tarefas</h1>
    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">
    Como você está, e o que vamos realizar hoje?
    </p>
    </div>

    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900/80 rounded-xl w-full md:w-auto">
    {filters.map((f) => (
      <button
      key={f.id}
      onClick={() => setFilter(f.id)}
      className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
        selectedFilter === f.id
        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
      }`}
      >
      {f.label}
      </button>
    ))}
    </div>

    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900/80 rounded-xl w-full md:w-auto">
    {moods.map((m) => {
      const Icon = m.icon;
      const isActive = dailyMood === m.value;
      return (
        <button
        key={m.value}
        onClick={() => setDailyMood(m.value)}
        title={m.label}
        className={`flex-1 md:flex-none py-2 px-3 rounded-lg flex justify-center items-center transition-all ${
          isActive
          ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
          : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
        }`}
        >
        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
        </button>
      );
    })}
    </div>
    </div>
    </header>

    <main>
    <AnimatePresence mode="popLayout">
    {filteredTasks.length === 0 ? (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-zinc-500 mt-20">
      Nenhuma tarefa por aqui. Aproveite o momento!
      </motion.div>
    ) : (
      filteredTasks.map((task) => (
        <TaskItem
        key={task.id}
        task={task}
        onToggle={requestToggle}
        onEdit={() => {
          setTaskToEdit(task);
          setIsModalOpen(true);
        }}
        onDelete={() => requestDelete(task.id)}
        />
      ))
    )}
    </AnimatePresence>

    {hasCompletedTasks && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center mt-8">
      <button
      onClick={() => setConfirmDialog({ type: 'clear_completed', taskId: 'all', title: 'Limpar Concluídas?', subtitle: 'Todas as tarefas finalizadas serão removidas permanentemente.' })}
      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
      >
      <Trash2 size={14} /> Limpar tarefas concluídas
      </button>
      </motion.div>
    )}
    </main>

    </div>

    {/* FAB com Sombra Suave */}
    <motion.button
    layoutId="fab-modal"
    onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }}
    className="fixed bottom-28 right-6 md:right-12 md:bottom-12 p-4 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black hover:scale-105 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] z-40 flex items-center justify-center"
    >
    <Plus size={28} strokeWidth={3} />
    </motion.button>

    {/* --- MODAIS E TOASTS --- */}

    <TaskModal
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
    taskToEdit={taskToEdit}
    onSuccess={showToast}
    />

    <RewardToast
    isVisible={!!reward}
    xp={reward?.xp || 0}
    gold={reward?.gold || 0}
    isFailed={reward?.isFailed}
    />

    {/* Toast do Topo com Sombra Suave */}
    <AnimatePresence>
    {toastMessage && (
      <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] font-bold text-sm tracking-wide border border-zinc-800 dark:border-zinc-200"
      >
      {toastMessage}
      </motion.div>
    )}
    </AnimatePresence>

    {/* Dialog com Sombra Suave */}
    <AnimatePresence>
    {confirmDialog && (
      <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      >
      <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="bg-zinc-50 dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] border border-zinc-200 dark:border-zinc-800"
      >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmDialog.type === 'delete' || confirmDialog.type === 'clear_completed' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
      <AlertTriangle size={24} />
      </div>
      <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">{confirmDialog.title}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
      {confirmDialog.subtitle}
      </p>
      <div className="flex gap-3">
      <button
      onClick={() => setConfirmDialog(null)}
      className="flex-1 py-3 rounded-xl font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
      >
      Cancelar
      </button>
      <button
      onClick={handleConfirmAction}
      className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors ${confirmDialog.type === 'delete' || confirmDialog.type === 'clear_completed' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600 text-zinc-900'}`}
      >
      Confirmar
      </button>
      </div>
      </motion.div>
      </motion.div>
    )}
    </AnimatePresence>

    </div>
  );
};
