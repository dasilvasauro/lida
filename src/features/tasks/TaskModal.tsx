import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Zap, Target, Timer, Gift, CheckCircle2,
  Calendar, Clock, Plus, RotateCcw, Info, Lock, Check
} from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { useEconomyStore } from '../../store/useEconomyStore';
import type { Priority, TaskType, Task } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';
import { CustomTimePicker } from '../../components/ui/CustomTimePicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  onSuccess?: (message: string) => void;
}

export const TaskModal = ({ isOpen, onClose, taskToEdit, onSuccess }: TaskModalProps) => {
  const addTask = useTaskStore((state) => state.addTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const tasks = useTaskStore((state) => state.tasks);
  
  const folders = useTaskStore((state) => state.folders);
  const addFolder = useTaskStore((state) => state.addFolder);

  const inventory = useEconomyStore((state) => state.inventory);
  const useItem = useEconomyStore((state) => state.useItem);

  const hasActiveSprint = tasks.some(t => t.type === 'sprint' && !t.isCompleted && t.id !== taskToEdit?.id);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysTasks = tasks.filter(t => t.deadlineDate === todayStr || !t.deadlineDate);
  const countP0 = todaysTasks.filter(t => t.priority === 'P0' && t.id !== taskToEdit?.id).length;
  const countP1 = todaysTasks.filter(t => t.priority === 'P1' && t.id !== taskToEdit?.id).length;

  // <-- Nova trava do Desafio Diário
  const hasDailyChallengeToday = tasks.some(t => t.type === 'daily_challenge' && format(new Date(t.createdAt), 'yyyy-MM-dd') === todayStr && t.id !== taskToEdit?.id);

  const isP0Locked = countP0 >= 1 && inventory.extraP0 <= 0;
  const isP1Locked = countP1 >= 2 && inventory.extraP1 <= 0;
  const isBonusLocked = inventory.bonusTask <= 0 && taskToEdit?.type !== 'bonus';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('P4');
  const [type, setType] = useState<TaskType>('normal');
  const [folderId, setFolderId] = useState<string>('default');

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [deadlineDate, setDeadlineDate] = useState<string>('');
  const [deadlineTime, setDeadlineTime] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);

  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);

  const [recurrenceType, setRecurrenceType] = useState<'none' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<'deadline' | 'start' | 'end' | null>(null);

  const canBeRecurrent = !['sprint', 'daily_challenge', 'bonus'].includes(type);

  useEffect(() => {
    if (taskToEdit && isOpen) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPriority(taskToEdit.priority);
      setType(taskToEdit.type);
      setFolderId(taskToEdit.folderId || 'default'); 
      setDeadlineDate(taskToEdit.deadlineDate || '');
      setDeadlineTime(taskToEdit.deadlineTime || '');

      if (taskToEdit.type === 'sprint') {
        setEndDate(taskToEdit.deadlineDate || '');
        setStartDate(format(new Date(taskToEdit.createdAt), 'yyyy-MM-dd'));
      }

      setSubtasks(taskToEdit.subtasks || []);
      setDuration(taskToEdit.duration || 30);
      setRecurrenceType(taskToEdit.recurrence?.type || 'none');
      setSelectedWeekdays(taskToEdit.recurrence?.weekdays || []);
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setPriority('P4');
      setType('normal');
      setFolderId('default'); 
      setDeadlineDate('');
      setDeadlineTime('');
      setStartDate('');
      setEndDate('');
      setSubtasks([]);
      setDuration(30);
      setRecurrenceType('none');
      setSelectedWeekdays([]);
      setShowDatePicker(false);
      setShowTimePicker(false);
      setIsCreatingFolder(false);
      setNewFolderName('');
    }
  }, [taskToEdit, isOpen]);

  const addSubtask = () => {
    if (!subtaskInput.trim()) return;
    setSubtasks([...subtasks, { id: uuidv4(), title: subtaskInput, completed: false }]);
    setSubtaskInput('');
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const newId = uuidv4();
      addFolder({ id: newId, name: newFolderName });
      setFolderId(newId);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;
    if (type === 'sprint' && subtasks.length === 0) return;

    if (!taskToEdit) {
      if (type === 'bonus') useItem('bonusTask');
      if (priority === 'P0' && countP0 >= 1) useItem('extraP0');
      if (priority === 'P1' && countP1 >= 2) useItem('extraP1');
    }

    const dateObj = deadlineDate ? new Date(deadlineDate + 'T12:00:00') : new Date();

    const taskData: Partial<Task> = {
      title,
      description,
      type,
      priority,
      folderId,
      deadlineDate: type === 'sprint' ? endDate : (deadlineDate || undefined),
      deadlineTime: deadlineTime || undefined,
      duration: type === 'time' ? duration : undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      recurrence: (canBeRecurrent && recurrenceType !== 'none') ? {
        type: recurrenceType,
        weekdays: recurrenceType === 'weekly' ? selectedWeekdays : undefined,
        dayOfMonth: (recurrenceType === 'monthly' || recurrenceType === 'yearly') ? dateObj.getDate() : undefined,
        monthOfYear: recurrenceType === 'yearly' ? dateObj.getMonth() : undefined,
      } : undefined,
    };

    if (taskToEdit) {
      updateTask(taskToEdit.id, taskData);
      onSuccess?.('Tarefa atualizada com sucesso!');
    } else {
      addTask({
        id: uuidv4(),
        createdAt: Date.now(),
        isCompleted: false,
        ...taskData,
      } as Task);
      onSuccess?.('Tarefa criada com sucesso!');
    }

    onClose();
  };

  const taskTypes: { id: TaskType; label: string; icon: any; color: string; isLocked?: boolean }[] = [
    { id: 'normal', label: 'Normal', icon: CheckCircle2, color: 'text-zinc-500' },
    // Desafio agora respeita a trava
    { id: 'daily_challenge', label: 'Desafio', icon: Zap, color: 'text-amber-500', isLocked: hasDailyChallengeToday },
    { id: 'sprint', label: 'Sprint', icon: Target, color: 'text-purple-500', isLocked: hasActiveSprint },
    { id: 'time', label: 'Tempo', icon: Timer, color: 'text-blue-500' },
    { id: 'bonus', label: 'Bônus', icon: Gift, color: 'text-emerald-500', isLocked: isBonusLocked },
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
            layoutId={taskToEdit ? undefined : "fab-modal"}
            className="fixed bottom-0 left-0 right-0 md:bottom-6 max-w-md mx-auto bg-zinc-50 dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.4)] z-50 overflow-hidden flex flex-col max-h-[90vh]"
          >

            {/* Cabeçalho */}
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xl font-bold">
                {taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Corpo Rolável */}
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

              {/* Recorrência */}
              {canBeRecurrent && (
                <div className="space-y-4">
                  <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                    <RotateCcw size={14} /> Repetir Tarefa
                  </span>

                  <div className="flex gap-2">
                    {['none', 'weekly', 'monthly', 'yearly'].map((r) => (
                      <button
                        key={r}
                        onClick={(e) => { e.preventDefault(); setRecurrenceType(r as any); }}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                          recurrenceType === r
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-transparent'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {r === 'none' ? 'Não' : r === 'weekly' ? 'Semanal' : r === 'monthly' ? 'Mensal' : 'Anual'}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="popLayout">
                    {recurrenceType !== 'none' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        {recurrenceType === 'weekly' && (
                          <div className="flex justify-between pt-2">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                              <button
                                key={i}
                                onClick={(e) => { e.preventDefault(); toggleWeekday(i); }}
                                className={`w-8 h-8 rounded-full text-[10px] font-bold border transition-all ${
                                  selectedWeekdays.includes(i)
                                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-transparent'
                                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        )}

                        {(recurrenceType === 'monthly' || recurrenceType === 'yearly') && (
                          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 p-3 rounded-xl text-[11px] flex items-start gap-2 italic">
                            <Info size={14} className="mt-0.5 shrink-0" />
                            <p>A tarefa repetirá com base no dia definido em <b>"Data Limite"</b> abaixo.</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Seletor de Tipo */}
              <div>
                <span className="text-xs uppercase tracking-widest text-zinc-500 mb-3 block font-bold">
                  Tipo
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {taskTypes.map((t) => {
                    const Icon = t.icon;
                    const isSelected = type === t.id;
                    const isDisabled = (t.id === 'sprint' && hasActiveSprint) || t.isLocked;

                    return (
                      <button
                        key={t.id}
                        onClick={(e) => {
                          e.preventDefault();
                          if (isDisabled) return;
                          setType(t.id);
                          setShowDatePicker(false);
                          setShowTimePicker(false);
                        }}
                        disabled={isDisabled}
                        className={`relative flex flex-col items-center justify-center py-2 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-zinc-200 border-zinc-400 dark:bg-zinc-800 dark:border-zinc-500 shadow-inner'
                            : isDisabled
                            ? 'opacity-40 cursor-not-allowed grayscale border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50'
                            : 'bg-transparent border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Icon size={20} className={isSelected ? t.color : 'text-zinc-400'} />
                        <span className={`text-[10px] mt-1 ${isSelected ? 'font-bold' : ''}`}>
                          {t.label}
                        </span>
                        {t.isLocked && <Lock size={10} className="absolute top-1.5 right-1.5 text-zinc-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data e Hora para Normal/Bônus */}
              {(type === 'normal' || type === 'bonus') && (
                <div className="flex gap-4">
                  <div className="flex-1 space-y-3">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold flex items-center gap-1">
                      <Calendar size={14} /> Data Limite
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveDateField('deadline');
                        setShowDatePicker(!showDatePicker);
                        setShowTimePicker(false);
                      }}
                      className={`w-full p-3 rounded-lg border text-sm transition-all ${
                        deadlineDate ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {deadlineDate ? format(new Date(deadlineDate + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR }) : 'Selecionar'}
                    </button>
                  </div>

                  <div className={`flex-1 space-y-3 ${!deadlineDate ? 'opacity-30 pointer-events-none' : ''}`}>
                    <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold flex items-center gap-1">
                      <Clock size={14} /> Hora
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTimePicker(!showTimePicker);
                        setShowDatePicker(false);
                      }}
                      className={`w-full p-3 rounded-lg border text-sm transition-all ${
                        deadlineTime ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {deadlineTime || 'Sem hora'}
                    </button>
                  </div>
                </div>
              )}

              {/* Datas para Sprint */}
              {type === 'sprint' && (
                <div className="flex gap-4">
                  <div className="flex-1 space-y-3">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold">
                      Início
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveDateField('start');
                        setShowDatePicker(true);
                        setShowTimePicker(false);
                      }}
                      className={`w-full p-3 rounded-lg border text-sm transition-all ${
                        startDate ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {startDate ? format(new Date(startDate + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR }) : 'Data Inicial'}
                    </button>
                  </div>

                  <div className="flex-1 space-y-3">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold">
                      Fim
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveDateField('end');
                        setShowDatePicker(true);
                        setShowTimePicker(false);
                      }}
                      className={`w-full p-3 rounded-lg border text-sm transition-all ${
                        endDate ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {endDate ? format(new Date(endDate + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR }) : 'Data Final'}
                    </button>
                  </div>
                </div>
              )}

              {/* EXIBIÇÃO DOS PICKERS REPOSICIONADA */}
              <AnimatePresence>
                {showDatePicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4">
                      <CustomDatePicker
                        selectedDate={
                          activeDateField === 'start' ? startDate :
                          activeDateField === 'end' ? endDate :
                          deadlineDate
                        }
                        onSelect={(date) => {
                          if (activeDateField === 'start') setStartDate(date);
                          else if (activeDateField === 'end') setEndDate(date);
                          else setDeadlineDate(date);
                          setShowDatePicker(false);
                        }}
                      />
                    </div>
                  </motion.div>
                )}

                {showTimePicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4">
                      <CustomTimePicker
                        selectedTime={deadlineTime}
                        onSelect={(time) => setDeadlineTime(time)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Slider de Tempo */}
              {type === 'time' && (
                <div className="space-y-3">
                  <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold flex items-center gap-1">
                    <Timer size={14} /> Duração: <span className="text-blue-500 ml-1">{duration} min</span>
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

              {/* Alerta de Desafio Diário */}
              {type === 'daily_challenge' && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl text-xs flex items-center gap-3">
                  <Zap size={20} className="shrink-0" />
                  <p>Este desafio é válido apenas para hoje e expira à meia-noite.</p>
                </div>
              )}

              {/* Subtarefas (Agora Globais) */}
              <div className="space-y-3 pt-2">
                <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold">
                  Subtarefas {type === 'sprint' ? '(Obrigatório)' : '(Opcional)'}
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter'){ e.preventDefault(); addSubtask(); } }}
                    placeholder="Ex: Definir escopo"
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg text-sm outline-none"
                  />
                  <button
                    onClick={(e) => { e.preventDefault(); addSubtask(); }}
                    className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black p-3 rounded-lg"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-2">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800/50 p-2 pl-4 rounded-lg"
                    >
                      <span className="text-sm text-zinc-900 dark:text-zinc-100">
                        {st.title}
                      </span>
                      <button
                        onClick={(e) => { e.preventDefault(); removeSubtask(st.id); }}
                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seletor de Pasta */}
              <div>
                <span className="text-xs uppercase tracking-widest text-zinc-500 mb-3 block font-bold">Pasta</span>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {folders.map((f) => {
                    const isSelected = folderId === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={(e) => { e.preventDefault(); setFolderId(f.id); }}
                        className={`px-4 py-2 rounded-xl border font-bold text-xs transition-all whitespace-nowrap ${isSelected ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-transparent shadow-md' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                      >
                        {f.name}
                      </button>
                    )
                  })}
                  
                  {isCreatingFolder ? (
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-2 shadow-inner border border-zinc-200 dark:border-zinc-700">
                      <input autoFocus type="text" value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} onKeyDown={e=>{ if(e.key === 'Enter'){ e.preventDefault(); handleCreateFolder(); } }} placeholder="Nome" className="bg-transparent text-xs font-bold outline-none w-24 px-2 placeholder:text-zinc-400" />
                      <button onClick={(e) => { e.preventDefault(); handleCreateFolder(); }} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"><Check size={14}/></button>
                      <button onClick={(e) => { e.preventDefault(); setIsCreatingFolder(false); }} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><X size={14}/></button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.preventDefault(); setIsCreatingFolder(true); }} className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">+ Nova Pasta</button>
                  )}
                </div>
              </div>

              {/* Seletor de Prioridade */}
              <div>
                <span className="text-xs uppercase tracking-widest text-zinc-500 mb-3 block font-bold">
                  Prioridade
                </span>
                <div className="flex gap-2">
                  {(['P0', 'P1', 'P2', 'P3', 'P4'] as Priority[]).map((p) => {
                    const isSelected = priority === p;
                    const isLocked = (p === 'P0' && isP0Locked && !isSelected) || (p === 'P1' && isP1Locked && !isSelected);

                    let colorClass = '';

                    if (p === 'P0') colorClass = isSelected ? 'bg-red-500 text-white border-red-500' : 'text-red-500 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20';
                    else if (p === 'P1') colorClass = isSelected ? 'bg-orange-500 text-white border-orange-500' : 'text-orange-500 border-orange-200 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-900/20';
                    else if (p === 'P2') colorClass = isSelected ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-transparent' : 'text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800';
                    else if (p === 'P3') colorClass = isSelected ? 'bg-blue-500 text-white border-blue-500' : 'text-blue-500 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20';
                    else if (p === 'P4') colorClass = isSelected ? 'bg-purple-500 text-white border-purple-500' : 'text-purple-500 border-purple-200 dark:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-900/20';

                    return (
                      <button
                        key={p}
                        onClick={(e) => { e.preventDefault(); if (!isLocked) setPriority(p); }}
                        disabled={isLocked}
                        className={`relative flex-1 py-2 rounded-lg border font-bold transition-all ${colorClass} ${isLocked ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                      >
                        {p}
                        {isLocked && <Lock size={10} className="absolute top-1 right-1 opacity-50" />}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Rodapé: Botão de Salvar */}
            <div className="p-6 bg-zinc-100 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={handleSave}
                disabled={!title.trim() || (type === 'sprint' && (!startDate || !endDate || subtasks.length === 0))}
                className="w-full py-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black font-bold text-lg disabled:opacity-50 transition-opacity hover:opacity-90"
              >
                {taskToEdit ? 'Salvar Alterações' : 'Criar Tarefa'}
              </button>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};