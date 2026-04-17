import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { TaskModal } from './TaskModal'; // <-- Importe o Modal

export const TaskDashboard = () => {
  const { tasks, selectedFilter, setFilter } = useTaskStore();
  const [isModalOpen, setIsModalOpen] = useState(false); // <-- Controle do modal

  const filters = [
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: 'Essa Semana' },
    { id: 'month', label: 'Esse Mês' },
    { id: 'all', label: 'Geral' },
  ] as const;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col h-screen w-full max-w-md mx-auto relative px-4 pt-6"
      >
        <h2 className="text-2xl font-bold mb-6">Suas Tarefas</h2>

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

        {/* Lista */}
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
          {tasks.length === 0 ? (
            <p>Nenhuma tarefa por aqui. Que tal começar?</p>
          ) : (
            <p>Você tem {tasks.length} tarefa(s).</p>
          )}
        </div>

        {/* Botão Flutuante (FAB) */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)} // <-- Abre o modal
          className="absolute bottom-24 right-6 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-4 rounded-2xl shadow-xl shadow-black/20 dark:shadow-white/10 z-30 flex items-center justify-center"
        >
          <Plus size={28} />
        </motion.button>
      </motion.div>

      {/* Renderização do Modal sobre a tela */}
      <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};