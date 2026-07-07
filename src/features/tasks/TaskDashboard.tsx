import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, AlertTriangle, Frown, CloudRain, Meh, Smile, Sparkles, Trash2, TrendingUp, Coins, X, Check, ArrowDownUp, Info, Repeat, CheckCircle2, BrainCircuit, Timer, AlignJustify } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { useEconomyStore } from '../../store/useEconomyStore';
import { useConfigStore, useBackHandler } from '../../store/useConfigStore';
import { TaskModal } from './TaskModal';
import { RoutineModal } from './RoutineModal';
import { TaskItem } from './TaskItem';
import { BrainDumpModal } from './BrainDumpModal';
import { RewardToast, type RewardBreakdown } from '../../components/ui/RewardToast';
import type { Task, Mood, Priority, RoutineTemplate } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { format, endOfWeek } from 'date-fns';

export const TaskDashboard = () => {
  const { userClass, defaultDaysOff, hasDismissedDayOffWarning, dismissDayOffWarning, isCompactView, setCompactView } = useConfigStore();
  const { tasks, folders, routines, selectedFolderId, setFolderId, addFolder, deleteFolder, toggleTaskCompletion, deleteTask, deleteRoutine, clearCompletedTasks, selectedFilter, setFilter, dailyMood, setDailyMood, updatePomodoro } = useTaskStore();
  const { activeXpBoostUntil, activeGoldBoostUntil, addReward, removeReward } = useEconomyStore();

  const isModalOpen = useTaskStore((state) => state.isGlobalModalOpen);
  const setIsModalOpen = useTaskStore((state) => state.setGlobalModalOpen);
  
  const isRoutineModalOpen = useTaskStore((state) => state.isRoutineModalOpen);
  const setRoutineModalOpen = useTaskStore((state) => state.setRoutineModalOpen);

  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [routineToEdit, setRoutineToEdit] = useState<RoutineTemplate | null>(null); 

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSortedByPriority, setIsSortedByPriority] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<{title: string, desc: string} | null>(null);

  const [isBrainDumpOpen, setBrainDumpOpen] = useState(false);
  const [brainDumpInitialTitle, setBrainDumpInitialTitle] = useState('');
  const [brainDumpItemId, setBrainDumpItemId] = useState<string | undefined>(undefined);

  const [rewardBreakdown, setRewardBreakdown] = useState<RewardBreakdown | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'delete' | 'complete' | 'future_complete' | 'clear_completed' | 'delete_routine'; taskId: string; title: string; subtitle: string } | null>(null);

  const isXpBoosted = activeXpBoostUntil && Date.now() < activeXpBoostUntil;
  const isGoldBoosted = activeGoldBoostUntil && Date.now() < activeGoldBoostUntil;

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) { addFolder({ id: uuidv4(), name: newFolderName, updatedAt: Date.now() }); setNewFolderName(''); setIsCreatingFolder(false); }
  };

  const handleOpenRoutineForm = () => {
      if (routines.length >= 5) {
          showToast('Limite máximo de 5 rotinas atingido.');
      } else {
          setRoutineToEdit(null);
          setRoutineModalOpen(true);
      }
      setIsMenuOpen(false);
  };

  const calculateTaskReward = (task: Task): RewardBreakdown => {
    let baseGold = 15; let baseXp = 45;
    if (task.type === 'routine') {
       const itemsCount = task.subtasks?.length || 1;
       const routineReward = Math.min(200, Math.round(50 + (itemsCount - 1) * 37.5));
       baseGold = routineReward; baseXp = routineReward;
    } else {
       switch (task.priority) { case 'P0': baseGold = 50; baseXp = 150; break; case 'P1': baseGold = 40; baseXp = 100; break; case 'P2': baseGold = 30; baseXp = 75; break; case 'P3': baseGold = 20; baseXp = 50; break; case 'P4': baseGold = 10; baseXp = 25; break; }
    }

    let modusGoldMulti = 1; let modusXpMulti = 1;
    if (userClass === 'multitask') { modusGoldMulti = 1.2; modusXpMulti = 1.2; }
    else if (userClass === 'minimalist' && (task.priority === 'P0' || task.priority === 'P1')) { modusGoldMulti = 1.5; modusXpMulti = 1.5; }
    else if (userClass === 'punctual' && task.deadlineDate) { modusGoldMulti = 1.3; modusXpMulti = 1.3; }
    else if (userClass === 'ambitious' && (task.type === 'sprint' || task.type === 'daily_challenge')) { modusGoldMulti = 1.8; modusXpMulti = 1.8; }
    
    const modusXp = Math.round(baseXp * modusXpMulti) - baseXp;
    const modusGold = Math.round(baseGold * modusGoldMulti) - baseGold;

    const magicMultiplier = task.hasMagicDice ? 2 : 1;
    const magicXp = Math.round((baseXp + modusXp) * magicMultiplier) - (baseXp + modusXp);
    const magicGold = Math.round((baseGold + modusGold) * magicMultiplier) - (baseGold + modusGold);

    const boostXp = isXpBoosted ? Math.round((baseXp + modusXp + magicXp) * (Math.random() * 0.35 + 0.15)) : 0;
    const boostGold = isGoldBoosted ? Math.round((baseGold + modusGold + magicGold) * (Math.random() * 0.20 + 0.25)) : 0;

    const totalXp = baseXp + modusXp + magicXp + boostXp;
    const totalGold = baseGold + modusGold + magicGold + boostGold;

    return { baseXp, baseGold, modusXp, modusGold, magicXp, magicGold, boostXp, boostGold, totalXp, totalGold };
  };

  const executeToggle = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      if (!task.isCompleted) {
        if (task.isFailed) { 
            setRewardBreakdown({ isFailed: true } as RewardBreakdown); 
        } else { 
            const breakdown = calculateTaskReward(task); 
            setRewardBreakdown(breakdown); 
            addReward(breakdown.totalXp, breakdown.totalGold); 
        }
        setTimeout(() => setRewardBreakdown(null), 6000); 
      } else {
        if (!task.isFailed) { 
            const breakdown = calculateTaskReward(task); 
            removeReward(breakdown.totalXp, breakdown.totalGold); 
            showToast('Recompensas revertidas.'); 
        }
      }
    }
    toggleTaskCompletion(taskId);
  };

  const requestToggle = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId); if (!task) return;
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    if (!task.isCompleted && task.deadlineDate && task.deadlineDate > todayStr) {
      setConfirmDialog({ type: 'future_complete', taskId, title: 'Concluir Antecipadamente?', subtitle: 'Esta tarefa está planejada para uma data no futuro. Tem certeza que deseja concluí-la hoje?' });
      return;
    }

    if (!task.isCompleted && task.subtasks && task.subtasks.some(st => !st.completed)) {
      setConfirmDialog({ type: 'complete', taskId, title: 'Concluir com pendências?', subtitle: 'Ainda existem subtarefas não finalizadas. Deseja marcar como concluída mesmo assim?' });
      return;
    } 

    executeToggle(taskId);
  };

  const requestDelete = (taskId: string) => { setConfirmDialog({ type: 'delete', taskId, title: 'Excluir Tarefa?', subtitle: 'Essa ação não pode ser desfeita e a tarefa será removida permanentemente.' }); };

  const handleConfirmAction = () => {
    if (!confirmDialog) return;
    if (confirmDialog.type === 'complete' || confirmDialog.type === 'future_complete') executeToggle(confirmDialog.taskId);
    else if (confirmDialog.type === 'delete') { deleteTask(confirmDialog.taskId); showToast('Tarefa excluída com sucesso.'); }
    else if (confirmDialog.type === 'delete_routine') { deleteRoutine(confirmDialog.taskId); showToast('Rotina excluída com sucesso.'); }
    else if (confirmDialog.type === 'clear_completed') { clearCompletedTasks(); showToast('Tarefas arquivadas com sucesso.'); }
    setConfirmDialog(null);
  };

  const priorityWeight: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const weekEndStr = format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');
  const monthPrefix = todayStr.substring(0, 7);

  const filteredTasks = tasks.filter((task) => {
    if (task.isArchived) return false; 
    if (selectedFolderId !== 'all' && task.folderId !== selectedFolderId) return false;
    
    if (selectedFilter === 'today') return task.deadlineDate === todayStr;
    if (selectedFilter === 'week') return task.deadlineDate && task.deadlineDate >= todayStr && task.deadlineDate <= weekEndStr;
    if (selectedFilter === 'month') return task.deadlineDate && task.deadlineDate.startsWith(monthPrefix);
    if (selectedFilter === 'unplanned') return !task.deadlineDate;

    return true; // selectedFilter === 'all'
  }).sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    if (isSortedByPriority) { if (priorityWeight[a.priority] !== priorityWeight[b.priority]) { return priorityWeight[a.priority] - priorityWeight[b.priority]; } }
    return b.createdAt - a.createdAt;
  });

  const hasCompletedTasks = filteredTasks.some(t => t.isCompleted);
  const routineTasks = filteredTasks.filter(t => t.type === 'routine');
  const regularTasks = filteredTasks.filter(t => t.type !== 'routine');

  const activeMood = dailyMood || 'normal';

  const moods: { value: Mood; icon: any; label: string }[] = [ 
      { value: 'disappointed', icon: CloudRain, label: 'Desapontado' }, 
      { value: 'annoyed', icon: Frown, label: 'Incomodado' }, 
      { value: 'normal', icon: Meh, label: 'Normal' }, 
      { value: 'happy', icon: Smile, label: 'Feliz' }, 
      { value: 'radiant', icon: Sparkles, label: 'Radiante' } 
  ];
  
  const filters: { id: typeof selectedFilter; label: string }[] = [ 
      { id: 'today', label: 'Hoje' }, 
      { id: 'week', label: 'Semana' }, 
      { id: 'month', label: 'Mês' }, 
      { id: 'unplanned', label: 'Não Plan.' } 
  ];

  const hasLocalState = !!confirmDialog || isMenuOpen || isCreatingFolder || !!infoModal || isBrainDumpOpen;
  useBackHandler(hasLocalState, () => {
      const tStore = useTaskStore.getState();
      const cStore = useConfigStore.getState();
      if (tStore.isGlobalModalOpen || tStore.isRoutineModalOpen || tStore.isFocusModeOpen || cStore.isSettingsOpen || cStore.isVisionOpen || cStore.isGoogleConnectOpen || cStore.isChangelogOpen || cStore.isExitModalOpen) return false;

      if (isBrainDumpOpen) return false; 
      if (infoModal) { setInfoModal(null); return true; }
      if (confirmDialog) { setConfirmDialog(null); return true; }
      if (isCreatingFolder) { setIsCreatingFolder(false); setNewFolderName(''); return true; }
      if (isMenuOpen) { setIsMenuOpen(false); return true; }
      return false;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 pb-32 transition-colors">
      <div className="max-w-4xl mx-auto px-6 md:px-8 pt-12 space-y-6">

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-900">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">Tarefas</h1>
              <button onClick={() => updatePomodoro({ isOpen: true, isMinimized: false })} className="mt-1 p-2 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors" title="Rádio Relógio Pomodoro">
                  <Timer size={20}/>
              </button>
              <button onClick={() => setBrainDumpOpen(true)} className="mt-1 p-2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors" title="Brain Dump (Esvaziamento Mental)">
                  <BrainCircuit size={20}/>
              </button>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Como vai? E o que tem pra hoje?</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900/80 rounded-xl w-full md:w-auto">
              {filters.map((f) => {
                  const isActive = selectedFilter === f.id;
                  return (
                      <button key={f.id} onClick={() => setFilter(isActive ? 'all' : f.id as any)} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[11px] md:text-xs font-bold transition-all whitespace-nowrap ${isActive ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>
                          {f.label}
                      </button>
                  )
              })}
            </div>
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900/80 rounded-xl w-full md:w-auto">
              {moods.map((m) => { 
                  const Icon = m.icon; 
                  const isActive = activeMood === m.value; 
                  return ( 
                      <button key={m.value} onClick={() => setDailyMood(m.value)} title={m.label} className={`flex-1 md:flex-none py-2 px-3 rounded-lg flex justify-center items-center transition-all ${isActive ? 'bg-purple-600 text-white shadow-sm dark:bg-purple-500' : 'text-zinc-400 hover:text-purple-500 dark:hover:text-purple-400'}`}>
                          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      </button> 
                  ); 
              })}
            </div>
          </div>
        </header>

        <AnimatePresence>
          {defaultDaysOff.length === 0 && !hasDismissedDayOffWarning && (
             <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
               <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl flex items-start gap-4 text-blue-600 dark:text-blue-400 relative mb-2">
                 <Info className="shrink-0 mt-0.5" size={20} />
                 <div className="pr-6">
                   <h4 className="font-bold text-sm">Configure seus Dias de Folga</h4>
                   <p className="text-xs opacity-90 mt-1">Sabia que você pode escolher dias da semana para descansar sem perder suas ofensivas? Configure isso na aba de Perfil, clicando em Ajustes.</p>
                 </div>
                 <button onClick={dismissDayOffWarning} className="absolute top-4 right-4 text-blue-500/50 hover:text-blue-500 transition-colors"><X size={16}/></button>
               </div>
             </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 items-center">
          <button onClick={() => setFolderId('all')} className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedFolderId === 'all' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black shadow-md' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>Todas</button>
          {folders.map(f => (
            <div key={f.id} className={`flex items-center rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedFolderId === f.id ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black shadow-md' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
              <button onClick={() => setFolderId(f.id)} className="px-5 py-2">{f.name}</button>
              {selectedFolderId === f.id && f.id !== 'default' && ( <button onClick={() => deleteFolder(f.id)} className="pr-3 pl-1 text-red-400 hover:text-red-500 transition-colors"><X size={14}/></button> )}
            </div>
          ))}
          {isCreatingFolder ? (
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 shadow-inner">
              <input autoFocus type="text" maxLength={30} value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} onKeyDown={e=>e.key === 'Enter' && handleCreateFolder()} placeholder="Nome da pasta" className="bg-transparent text-xs font-bold outline-none w-28 px-2 placeholder:text-zinc-400" />
              <button onClick={handleCreateFolder} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-full transition-colors"><Check size={14}/></button>
              <button onClick={() => setIsCreatingFolder(false)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"><X size={14}/></button>
            </div>
          ) : ( <button onClick={() => setIsCreatingFolder(true)} className="px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap border border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">+ Nova Pasta</button> )}
        </div>

        {(isXpBoosted || isGoldBoosted) && (
          <div className="flex flex-col md:flex-row gap-3">
            {isXpBoosted && <div className="flex-1 bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 p-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm animate-pulse"><TrendingUp size={18}/> 2x XP Ativo (24h)</div>}
            {isGoldBoosted && <div className="flex-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 p-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm animate-pulse"><Coins size={18}/> 2x Ouro Ativo (24h)</div>}
          </div>
        )}

        <main>
          <AnimatePresence mode="popLayout">
            {filteredTasks.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-zinc-500 mt-20">Sem tarefas por enquanto</motion.div>
            ) : (
              <>
                {routineTasks.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2 ml-1">
                      <Repeat size={14} /> Rotinas
                      <button onClick={() => setInfoModal({title: 'Rotinas', desc: 'Rotinas são moldes de tarefas. \n\nElas geram tarefas automaticamente nos dias da semana especificados, ajudando a manter processos diários sem precisar recriá-los continuamente.'})} className="text-zinc-400 hover:text-blue-500 transition-colors ml-1"><Info size={14}/></button>
                    </h3>
                    {routineTasks.map((task) => (
                       <TaskItem key={task.id} task={task} onToggle={requestToggle} 
                         onEditRoutine={() => {
                           const routine = routines.find(r => r.id === task.routineTemplateId);
                           if (routine) { setRoutineToEdit(routine); setRoutineModalOpen(true); }
                         }}
                         onDeleteRoutine={() => {
                           if (task.routineTemplateId) {
                             setConfirmDialog({ type: 'delete_routine', taskId: task.routineTemplateId, title: 'Excluir Rotina?', subtitle: 'Isso apagará o molde desta rotina permanentemente. Deseja continuar?' });
                           }
                         }}
                       />
                    ))}
                  </div>
                )}

                {regularTasks.length > 0 && (
                  <div>
                    {/* CABEÇALHO DE TAREFAS COM BOTÕES DE ORDENAÇÃO E COMPACTO */}
                    <div className="flex items-center justify-between mb-4 mt-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                            <CheckCircle2 size={14} /> Tarefas
                        </h3>
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-xl p-1 border border-zinc-200 dark:border-zinc-700 shadow-inner">
                           <button onClick={() => setIsSortedByPriority(!isSortedByPriority)} className={`p-1.5 rounded-lg transition-colors ${isSortedByPriority ? 'bg-white dark:bg-zinc-700 text-blue-500 shadow-sm' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`} title="Ordenar por Prioridade"><ArrowDownUp size={14} /></button>
                           <button onClick={() => setCompactView(!isCompactView)} className={`p-1.5 rounded-lg transition-colors ${isCompactView ? 'bg-white dark:bg-zinc-700 text-blue-500 shadow-sm' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`} title="Visão Compacta"><AlignJustify size={14} /></button>
                        </div>
                    </div>

                    {regularTasks.map((task) => (
                       <TaskItem key={task.id} task={task} onToggle={requestToggle} onEdit={() => { setTaskToEdit(task); setIsModalOpen(true); }} onDelete={() => requestDelete(task.id)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </AnimatePresence>

          {hasCompletedTasks && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center mt-8">
              <button onClick={() => setConfirmDialog({ type: 'clear_completed', taskId: 'all', title: 'Arquivar Concluídas?', subtitle: 'As tarefas serão arquivadas para manter seu histórico limpo.' })} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                <Trash2 size={14} /> Arquivar tarefas concluídas
              </button>
            </motion.div>
          )}
        </main>
      </div>

      {/* FAB - BOTÃO FLUTUANTE OTIMIZADO (SEM SCALE/ORIGIN) */}
      <div className="fixed bottom-28 right-6 md:right-12 md:bottom-12 z-40 flex flex-col items-end gap-3">
         <AnimatePresence>
            {isMenuOpen && (
               <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} transition={{ duration: 0.15, ease: "easeOut" }} className="flex flex-col items-end gap-3 mb-2">
                  <button onClick={handleOpenRoutineForm} className="flex items-center gap-3 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-500 transition-colors">
                     Nova Rotina <Repeat size={18}/>
                  </button>
                  <button onClick={() => { setTaskToEdit(null); setIsModalOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-3 bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors">
                     Nova Tarefa <CheckCircle2 size={18}/>
                  </button>
               </motion.div>
            )}
         </AnimatePresence>
         
         <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-4 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex items-center justify-center transition-colors">
            <motion.div animate={{ rotate: isMenuOpen ? 45 : 0 }} transition={{ duration: 0.15, ease: "linear" }}><Plus size={28} strokeWidth={3} /></motion.div>
         </button>
      </div>

      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => { 
            setIsModalOpen(false); 
            setBrainDumpInitialTitle(''); 
            setBrainDumpItemId(undefined); 
        }} 
        taskToEdit={taskToEdit} 
        initialTitle={brainDumpInitialTitle}
        brainDumpItemId={brainDumpItemId}
        onSuccess={showToast} 
      />
      
      <RoutineModal isOpen={isRoutineModalOpen} onClose={() => setRoutineModalOpen(false)} routineToEdit={routineToEdit} onSuccess={showToast} />
      <RewardToast breakdown={rewardBreakdown} />

      <BrainDumpModal 
        isOpen={isBrainDumpOpen}
        onClose={() => setBrainDumpOpen(false)}
        onConvertToTask={(title, id) => {
           setBrainDumpInitialTitle(title);
           setBrainDumpItemId(id);
           setBrainDumpOpen(false);
           setIsModalOpen(true);
        }}
      />

      <AnimatePresence>
        {toastMessage && ( <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] font-bold text-sm tracking-wide border border-zinc-800 dark:border-zinc-200">{toastMessage}</motion.div> )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-zinc-50 dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmDialog.type === 'delete' || confirmDialog.type === 'clear_completed' || confirmDialog.type === 'delete_routine' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}><AlertTriangle size={24} /></div>
              <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">{confirmDialog.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">{confirmDialog.subtitle}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3 rounded-xl font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                <button onClick={handleConfirmAction} className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors ${confirmDialog.type === 'delete' || confirmDialog.type === 'clear_completed' || confirmDialog.type === 'delete_routine' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600 text-zinc-900'}`}>Confirmar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INFO MODAL TIPO */}
      <AnimatePresence>
        {infoModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center relative">
              <button onClick={(e) => { e.stopPropagation(); setInfoModal(null); }} className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition-colors"><X size={20} /></button>
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><Info size={32} /></div>
              <h3 className="text-xl font-black mb-4 dark:text-white">{infoModal.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed whitespace-pre-line text-left">
                 {infoModal.desc}
              </p>
              <button onClick={() => setInfoModal(null)} className="w-full mt-8 p-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors">Entendi</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
