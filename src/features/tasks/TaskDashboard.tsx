import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Smile, Meh, Frown, CloudRain } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { TaskModal } from './TaskModal';
import { TaskItem } from './TaskItem';
import { RewardToast } from '../../components/ui/RewardToast';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';
import type { Mood } from '../../types';

export const TaskDashboard = () => {
  const { tasks, selectedFilter, setFilter, toggleTaskCompletion, dailyMood, setDailyMood } = useTaskStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Estado para controlar a exibição do Toast de recompensa
  const [reward, setReward] = useState<{ xp: number; gold: number } | null>(null);

  const filters = [
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: 'Essa Semana' },
    { id: 'month', label: 'Esse Mês' },
    { id: 'all', label: 'Geral' },
  ] as const;

  const moods: { id: Mood; icon: any; label: string }[] = [
    { id: 'radiant', icon: Sparkles, label: 'Radiante' },
    { id: 'happy', icon: Smile, label: 'Feliz' },
    { id: 'normal', icon: Meh, label: 'Normal' },
    { id: 'annoyed', icon: Frown, label: 'Incomodado' },
    { id: 'disappointed', icon: CloudRain, label: 'Decepcionado' },
  ];

  // Lógica inteligente de filtro
  const filteredTasks = useMemo(() => {
    let sortedTasks = [...tasks].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      if (a.priority !== b.priority) return a.priority.localeCompare(b.priority);
      return b.createdAt - a.createdAt;
    });

    if (selectedFilter === 'all') return sortedTasks;

    return sortedTasks.filter((task) => {
      const taskDate = task.deadlineDate ? new Date(task.deadlineDate + 'T12:00:00') : new Date(task.createdAt);
      if (selectedFilter === 'today') return isToday(taskDate);
      if (selectedFilter === 'week') return isThisWeek(taskDate);
      if (selectedFilter === 'month') return isThisMonth(taskDate);
      return true;
    });
  }, [tasks, selectedFilter]);

  // Função que intercepta a conclusão da tarefa para dar a recompensa
  const handleToggle = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);

    // Se a tarefa existe e está sendo concluída (não desmarcada)
    if (task && !task.isCompleted) {
      setReward({ xp: 45, gold: 15 }); // Valores fictícios por enquanto
      setTimeout(() => setReward(null), 3000); // Some após 3 segundos
    }

    toggleTaskCompletion(taskId);
  };

  return (
    <>
    <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className="flex flex-col h-screen w-full max-w-md mx-auto relative px-4 pt-6"
    >
    {/* Header e Mood Selector */}
    <div className="flex justify-between items-center mb-6">
    <h2 className="text-2xl font-bold">Suas Tarefas</h2>

    <div className="flex gap-1 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full p-1 border border-zinc-300 dark:border-zinc-700">
    {moods.map((m) => {
      const Icon = m.icon;
      const isSelected = dailyMood === m.id;
      return (
        <button
        key={m.id}
        onClick={() => setDailyMood(m.id)}
        title={m.label}
        className={`p-1.5 rounded-full transition-all ${
          isSelected
          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black shadow-sm scale-110'
          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
        }`}
        >
        <Icon size={14} />
        </button>
      )
    })}
    </div>
    </div>

    {/* Filtros */}
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
    {filters.map((f) => (
      <button
      key={f.id}
      onClick={() => setFilter(f.id)}
      className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
        selectedFilter === f.id
        ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-md'
        : 'bg-zinc-200/50 border border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
      }`}
      >
      {f.label}
      </button>
    ))}
    </div>

    {/* Lista de Tarefas Animada */}
    <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
    {filteredTasks.length === 0 ? (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
      <p>Nenhuma tarefa por aqui.</p>
      <p className="text-sm mt-1">Clique no + para começar.</p>
      </div>
    ) : (
      <AnimatePresence mode="popLayout">
      {filteredTasks.map((task) => (
        <TaskItem
        key={task.id}
        task={task}
        onToggle={handleToggle} // Usamos a nova função aqui
        />
      ))}
      </AnimatePresence>
    )}
    </div>

    {/* Botão Flutuante (FAB) */}
    <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => setIsModalOpen(true)}
    className="absolute bottom-10 right-6 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-4 rounded-2xl shadow-xl shadow-black/20 dark:shadow-white/10 z-30 flex items-center justify-center"
    >
    <Plus size={28} />
    </motion.button>
    </motion.div>

    <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    <RewardToast isVisible={reward !== null} xp={reward?.xp || 0} gold={reward?.gold || 0} />
    </>
  );
};
