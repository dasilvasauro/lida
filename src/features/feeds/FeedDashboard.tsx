import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, AtSign, Send, MessageSquareText, Search, Calendar as CalendarIcon, MoreVertical, Archive, ArchiveRestore, Edit2, Trash2, CornerDownRight, PaintBucket, AlertTriangle, AlertCircle } from 'lucide-react';
import { useFeedStore, extractMentions, type FeedTarget } from '../../store/useFeedStore';
import { useBackHandler } from '../../store/useConfigStore';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ItemColor, FeedEntry } from '../../types';

const colorStyles: Record<ItemColor, { text: string, bg: string, border: string }> = {
  blue: { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  emerald: { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  amber: { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  rose: { text: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  purple: { text: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  cyan: { text: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  indigo: { text: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  zinc: { text: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' }
};

export const FeedDashboard = ({ isOpen, onClose, focusInputSignal }: { isOpen: boolean, onClose: () => void, focusInputSignal: number }) => {
  const { channels, feeds, entries, publishMessage, updateEntry, deleteEntry, updateFeed, archiveFeed, unarchiveFeed, deleteFeed, updateChannel, deleteChannel, cleanupArchivedFeeds } = useFeedStore();
  
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);
  
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isArchivedView, setIsArchivedView] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<FeedEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<FeedEntry | null>(null);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<{ type: 'channel'|'feed', id: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'error'|'success'} | null>(null);
  
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'archive_feed' | 'delete_feed' | 'delete_channel' | 'delete_entry', id: string, title: string, subtitle: string } | null>(null);
  const [channelPrompt, setChannelPrompt] = useState<{ pendingFeeds: string[] } | null>(null);
  const [newChannelPromptName, setNewChannelPromptName] = useState('');

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToastMessage({msg, type}); setTimeout(() => setToastMessage(null), 3000); };

  useEffect(() => { if (isOpen) cleanupArchivedFeeds(); }, [isOpen, cleanupArchivedFeeds]);
  useEffect(() => { if (isOpen && focusInputSignal > 0) inputRef.current?.focus(); }, [focusInputSignal, isOpen]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries.length, activeFeedId, replyingTo]);

  useBackHandler(isOpen && !!channelPrompt, () => { setChannelPrompt(null); return true; });
  useBackHandler(isOpen && !!confirmDialog, () => { setConfirmDialog(null); return true; });
  useBackHandler(isOpen && !!showColorPicker, () => { setShowColorPicker(null); return true; });
  useBackHandler(isOpen && !!activeMenuId, () => { setActiveMenuId(null); return true; });
  useBackHandler(isOpen && !!replyingTo, () => { setReplyingTo(null); return true; });
  useBackHandler(isOpen && !!editingEntry, () => { setEditingEntry(null); setInputText(''); return true; });
  useBackHandler(isOpen && isArchivedView, () => { setIsArchivedView(false); return true; });
  useBackHandler(isOpen && !channelPrompt && !confirmDialog && !showColorPicker && !activeMenuId && !replyingTo && !editingEntry && !isArchivedView, () => { onClose(); return true; });

  const activeFeeds = feeds.filter(f => f.channelId === activeChannelId && f.isArchived === isArchivedView).sort((a, b) => b.lastActivityAt - a.lastActivityAt);

  useEffect(() => {
      if (activeChannelId && !activeFeeds.find(f => f.id === activeFeedId)) {
          setActiveFeedId(activeFeeds.length > 0 ? activeFeeds[0].id : null);
      }
  }, [activeChannelId, activeFeeds, activeFeedId]);

  const displayedEntries = useMemo(() => {
      if (!activeFeedId) return [];
      let filtered = entries.filter(e => e.feedId === activeFeedId);
      
      if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          filtered = filtered.filter(e => e.content.toLowerCase().includes(lowerQ));
      }
      if (selectedDate) {
          filtered = filtered.filter(e => isSameDay(new Date(e.createdAt), new Date(selectedDate + 'T12:00:00')));
      }

      const parents = filtered.filter(e => !e.parentId).sort((a, b) => a.createdAt - b.createdAt);
      return parents.map(p => ({
          parent: p,
          replies: entries.filter(e => e.parentId === p.id).sort((a, b) => a.createdAt - b.createdAt)
      }));
  }, [entries, activeFeedId, searchQuery, selectedDate]);

  if (!isOpen) return null;

  const handleRequestDeleteChannel = (id: string) => {
      const hasFeeds = feeds.some(f => f.channelId === id);
      if (hasFeeds) {
          showToast('Não é possível excluir um canal que possui feeds associados.', 'error');
          return;
      }
      setConfirmDialog({ type: 'delete_channel', id, title: 'Excluir Canal?', subtitle: 'Esta ação não pode ser desfeita.' });
  };

  const executeConfirmAction = () => {
      if (!confirmDialog) return;
      if (confirmDialog.type === 'delete_channel') { deleteChannel(confirmDialog.id); setActiveChannelId(null); }
      if (confirmDialog.type === 'delete_feed') { deleteFeed(confirmDialog.id); setActiveFeedId(null); }
      if (confirmDialog.type === 'archive_feed') { archiveFeed(confirmDialog.id); setActiveFeedId(null); }
      if (confirmDialog.type === 'delete_entry') { deleteEntry(confirmDialog.id); }
      setConfirmDialog(null);
  };

  const executeSend = (targets: FeedTarget[]) => {
      publishMessage(inputText, targets, replyingTo?.id);
      setInputText('');
      setReplyingTo(null);
  };

  const handleSend = () => {
      if (!inputText.trim()) return;

      if (editingEntry) {
          updateEntry(editingEntry.id, inputText);
          setEditingEntry(null); setInputText('');
          return;
      }

      const { feeds: mFeeds, channels: mChannels } = extractMentions(inputText);

      let targets: FeedTarget[] = [];
      let pendingFeedsWithoutChannel: string[] = [];

      if (mFeeds.length === 0) {
          if (activeFeedId) targets.push({ feedId: activeFeedId });
          else return; // Não faz nada se não há feed ativo nem feed mencionado
      } else {
          mFeeds.forEach(fName => {
              const existingF = feeds.find(f => f.name.toLowerCase() === fName.toLowerCase());
              if (existingF) {
                  targets.push({ feedId: existingF.id });
              } else {
                  // Feed Novo. Precisamos de um Canal para ele.
                  if (mChannels.length > 0) targets.push({ newFeedName: fName, newChannelName: mChannels[0] });
                  else if (activeChannelId) targets.push({ newFeedName: fName, channelId: activeChannelId });
                  else pendingFeedsWithoutChannel.push(fName);
              }
          });
      }

      if (pendingFeedsWithoutChannel.length > 0) {
          setChannelPrompt({ pendingFeeds: pendingFeedsWithoutChannel });
          return; // Pausa o envio e abre o modal de seleção de canal
      }

      executeSend(targets);
  };

  const resolveChannelPrompt = (channelIdOrName: string, isNew: boolean) => {
      if (!channelPrompt) return;
      
      const { feeds: mFeeds } = extractMentions(inputText);
      let targets: FeedTarget[] = [];
      
      mFeeds.forEach(fName => {
          const existingF = feeds.find(f => f.name.toLowerCase() === fName.toLowerCase());
          if (existingF) {
              targets.push({ feedId: existingF.id });
          } else {
              if (isNew) targets.push({ newFeedName: fName, newChannelName: channelIdOrName });
              else targets.push({ newFeedName: fName, channelId: channelIdOrName });
          }
      });

      setChannelPrompt(null);
      setNewChannelPromptName('');
      executeSend(targets);
  };

  const renderContentWithMentions = (text: string) => {
      const parts = text.split(/([@#][\wÀ-ÿ-]+)/g);
      return parts.map((part, i) => {
          if (part.startsWith('@')) return <span key={i} className="text-blue-500 font-bold bg-blue-500/10 px-1 rounded">{part}</span>;
          if (part.startsWith('#')) return <span key={i} className="text-amber-500 font-bold bg-amber-500/10 px-1 rounded">{part}</span>;
          return <span key={i}>{part}</span>;
      });
  };

  const ColorPicker = ({ type, id }: { type: 'channel'|'feed', id: string }) => (
      <div className="absolute top-10 right-0 z-50 bg-white dark:bg-zinc-800 p-3 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 flex gap-2">
          {(Object.keys(colorStyles) as ItemColor[]).map(c => (
              <button key={c} onClick={() => {
                  if (type === 'channel') updateChannel(id, { color: c });
                  else updateFeed(id, { color: c });
                  setShowColorPicker(null);
              }} className={`w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-transform ${colorStyles[c].bg} ${colorStyles[c].text}`} />
          ))}
      </div>
  );

  let lastDateDivider = '';

  return (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed inset-0 z-[150] bg-white dark:bg-black flex flex-col md:flex-row overflow-hidden">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-80 h-auto md:h-full border-b md:border-r border-zinc-200 dark:border-zinc-900 flex flex-col shrink-0 bg-zinc-50 dark:bg-zinc-950/50">
            <div className="p-4 md:p-6 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between">
                <div>
                   <h2 className="text-xl font-black flex items-center gap-2 tracking-tight"><Hash className="text-blue-500"/> Feeds</h2>
                   <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block mt-1">Sua Base de Conhecimento</span>
                </div>
                <button onClick={onClose} className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-full hover:bg-red-500 hover:text-white transition-colors"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6">
                <div>
                   <div className="flex justify-between items-center mb-3">
                       <span className="text-xs uppercase font-bold text-zinc-400 tracking-widest">Canais (#)</span>
                       <button onClick={() => setIsArchivedView(!isArchivedView)} className={`p-1.5 rounded-lg transition-colors ${isArchivedView ? 'bg-amber-500/10 text-amber-500' : 'text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`} title={isArchivedView ? 'Ver Ativos' : 'Ver Arquivados'}>
                          {isArchivedView ? <ArchiveRestore size={14}/> : <Archive size={14}/>}
                       </button>
                   </div>
                   <div className="space-y-1">
                      <button onClick={() => setActiveChannelId(null)} className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-colors ${!activeChannelId ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900'}`}>
                         Todos os Canais
                      </button>
                      {channels.map(c => {
                          const style = colorStyles[c.color];
                          const isActive = activeChannelId === c.id;
                          return (
                              <div key={c.id} className="group relative flex items-center">
                                  <button onClick={() => setActiveChannelId(c.id)} className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${isActive ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900'}`}>
                                      <Hash size={14} className={isActive ? (c.color === 'zinc' ? 'text-zinc-500' : style.text) : style.text} /> 
                                      <span className="truncate">{c.name}</span>
                                  </button>
                                  {isActive && (
                                      <div className="absolute right-1 flex gap-1">
                                          <button onClick={(e) => { e.stopPropagation(); setShowColorPicker(showColorPicker?.id === c.id ? null : {type:'channel', id: c.id}); }} className={`p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors`}><PaintBucket size={12}/></button>
                                          <button onClick={(e) => { e.stopPropagation(); handleRequestDeleteChannel(c.id); }} className={`p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-500 transition-colors`}><Trash2 size={12}/></button>
                                          {showColorPicker?.type === 'channel' && showColorPicker.id === c.id && <ColorPicker type="channel" id={c.id} />}
                                      </div>
                                  )}
                              </div>
                          )
                      })}
                   </div>
                </div>

                {(activeChannelId || activeFeeds.length > 0) && (
                    <div>
                       <span className="text-xs uppercase font-bold text-zinc-400 tracking-widest mb-3 block">Feeds (@)</span>
                       {activeFeeds.length === 0 ? (
                           <div className="text-xs font-bold text-zinc-400 p-3 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl text-center border border-dashed border-zinc-300 dark:border-zinc-800">
                               Nenhum feed {isArchivedView ? 'arquivado' : 'ativo'}.<br/>Crie um usando <b>@Nome</b> no chat.
                           </div>
                       ) : (
                           <div className="space-y-1">
                              {activeFeeds.map(f => {
                                  const style = colorStyles[f.color];
                                  const isActive = activeFeedId === f.id;
                                  return (
                                      <div key={f.id} className="group relative flex items-center">
                                          <button onClick={() => setActiveFeedId(f.id)} className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${isActive ? `${style.bg} ${style.border} border shadow-sm` : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 border border-transparent'}`}>
                                              <AtSign size={14} className={style.text} /> 
                                              <span className={`truncate ${isActive ? style.text : ''}`}>{f.name}</span>
                                          </button>
                                          {isActive && (
                                              <div className="absolute right-1 flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                                  <button onClick={(e) => { e.stopPropagation(); setShowColorPicker(showColorPicker?.id === f.id ? null : {type:'feed', id: f.id}); }} className={`p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${style.text}`}><PaintBucket size={12}/></button>
                                                  <button onClick={(e) => { e.stopPropagation(); isArchivedView ? unarchiveFeed(f.id) : setConfirmDialog({ type: 'archive_feed', id: f.id, title: 'Arquivar Feed?', subtitle: 'Ele desaparecerá da lista ativa, mas será excluído para sempre após 60 dias.' }); }} className={`p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500`} title={isArchivedView ? 'Restaurar' : 'Arquivar'}><Archive size={12}/></button>
                                                  <button onClick={(e) => { e.stopPropagation(); setConfirmDialog({ type: 'delete_feed', id: f.id, title: 'Deletar Permanentemente?', subtitle: 'Isso apagará o feed e todos os registros dele.'}); }} className={`p-1.5 rounded-md hover:bg-red-500/10 transition-colors text-red-500`} title="Deletar"><Trash2 size={12}/></button>
                                                  {showColorPicker?.type === 'feed' && showColorPicker.id === f.id && <ColorPicker type="feed" id={f.id} />}
                                              </div>
                                          )}
                                      </div>
                                  )
                              })}
                           </div>
                       )}
                    </div>
                )}
            </div>
        </div>

        {/* ÁREA PRINCIPAL (CHAT) */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black relative">
            
            <div className="h-16 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3 min-w-0">
                    {activeFeedId ? (
                        <>
                            <div className={`p-2 rounded-lg ${colorStyles[feeds.find(f => f.id === activeFeedId)?.color || 'zinc'].bg} ${colorStyles[feeds.find(f => f.id === activeFeedId)?.color || 'zinc'].text}`}>
                                <AtSign size={18} />
                            </div>
                            <h3 className="font-black text-lg truncate pr-4">{feeds.find(f => f.id === activeFeedId)?.name}</h3>
                        </>
                    ) : (
                        <h3 className="font-black text-lg text-zinc-500 italic">Nenhum feed selecionado</h3>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="relative hidden md:flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full px-3 py-1.5 focus-within:ring-2 ring-blue-500 transition-shadow">
                        <Search size={14} className="text-zinc-400" />
                        <input type="text" placeholder="Pesquisar..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold w-24 focus:w-40 transition-all px-2 placeholder:text-zinc-500" />
                        {searchQuery && <button onClick={() => setSearchQuery('')}><X size={12} className="text-zinc-400 hover:text-zinc-600" /></button>}
                    </div>
                    
                    <div className="relative">
                        <input type="date" value={selectedDate || ''} onChange={e=>setSelectedDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                        <button className={`p-2 rounded-full transition-colors ${selectedDate ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}>
                           <CalendarIcon size={18} />
                        </button>
                    </div>
                    {selectedDate && <button onClick={() => setSelectedDate(null)} className="p-2 rounded-full text-red-500 bg-red-500/10 hover:bg-red-500/20"><X size={14}/></button>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin">
                {displayedEntries.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                        <MessageSquareText size={48} className="mb-4 opacity-20" />
                        <p className="font-bold text-sm">Nada por aqui.</p>
                        <p className="text-xs mt-2 opacity-60 max-w-xs text-center">Use a caixa abaixo e mencione @Feed ou #Canal para criar um registro e começar a documentar.</p>
                    </div>
                ) : (
                    displayedEntries.map(group => {
                        const entryDate = format(new Date(group.parent.createdAt), 'yyyy-MM-dd');
                        const isNewDate = entryDate !== lastDateDivider;
                        if (isNewDate) lastDateDivider = entryDate;

                        return (
                            <React.Fragment key={group.parent.id}>
                                {isNewDate && (
                                    <div className="flex items-center gap-4 my-8">
                                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full">{format(new Date(group.parent.createdAt), "dd 'de' MMMM", { locale: ptBR })}</span>
                                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                                    </div>
                                )}
                                
                                <div className="group/parent flex flex-col gap-2 relative">
                                    {group.replies.length > 0 && ( <div className="absolute left-5 top-12 bottom-6 w-0.5 bg-zinc-200 dark:bg-zinc-800 z-0 rounded-full" /> )}
                                    
                                    <div className={`flex gap-4 relative z-10 p-4 rounded-2xl transition-colors ${editingEntry?.id === group.parent.id || replyingTo?.id === group.parent.id ? 'bg-blue-500/5 ring-1 ring-blue-500/30' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}`}>
                                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-300 dark:border-zinc-700 shadow-sm text-zinc-500">
                                        <AtSign size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{format(new Date(group.parent.createdAt), "HH:mm")}</span>
                                                {group.parent.linkedTaskId && <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-wider">Via Tarefa</span>}
                                                {group.parent.createdAt !== group.parent.updatedAt && <span className="text-[9px] text-zinc-400 italic">(Editado)</span>}
                                            </div>
                                            <p className="text-sm md:text-base leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-medium">{renderContentWithMentions(group.parent.content)}</p>
                                        </div>

                                        <div className="opacity-0 group-hover/parent:opacity-100 transition-opacity flex flex-col gap-1 shrink-0">
                                            <button onClick={() => setReplyingTo(group.parent)} className="p-2 text-zinc-400 hover:text-blue-500 bg-white dark:bg-black rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800"><CornerDownRight size={14}/></button>
                                            <div className="relative">
                                                <button onClick={() => setActiveMenuId(activeMenuId === group.parent.id ? null : group.parent.id)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-black rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800"><MoreVertical size={14}/></button>
                                                <AnimatePresence>
                                                    {activeMenuId === group.parent.id && (
                                                        <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="absolute right-full top-0 mr-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl flex flex-col p-1 z-50 min-w-[120px]">
                                                            <button onClick={() => { setEditingEntry(group.parent); setInputText(group.parent.content); setActiveMenuId(null); inputRef.current?.focus(); }} className="flex items-center gap-2 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold"><Edit2 size={12}/> Editar</button>
                                                            <button onClick={() => { setConfirmDialog({ type: 'delete_entry', id: group.parent.id, title: 'Apagar Thread?', subtitle: 'Todas as respostas desta linha também serão apagadas.' }); setActiveMenuId(null); }} className="flex items-center gap-2 p-2 hover:bg-red-500/10 text-red-500 rounded-lg text-xs font-bold"><Trash2 size={12}/> Apagar Thread</button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    {group.replies.map(reply => (
                                        <div key={reply.id} className={`group/reply ml-8 md:ml-12 flex gap-4 relative z-10 p-3 rounded-2xl transition-colors ${editingEntry?.id === reply.id ? 'bg-blue-500/5 ring-1 ring-blue-500/30' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}`}>
                                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-800 text-zinc-400">
                                            <CornerDownRight size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{format(new Date(reply.createdAt), "HH:mm")}</span>
                                                    {reply.createdAt !== reply.updatedAt && <span className="text-[9px] text-zinc-400 italic">(Editado)</span>}
                                                </div>
                                                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{renderContentWithMentions(reply.content)}</p>
                                            </div>
                                            <div className="opacity-0 group-hover/reply:opacity-100 transition-opacity flex flex-col gap-1 shrink-0">
                                                <div className="relative">
                                                    <button onClick={() => setActiveMenuId(activeMenuId === reply.id ? null : reply.id)} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-black rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800"><MoreVertical size={14}/></button>
                                                    <AnimatePresence>
                                                        {activeMenuId === reply.id && (
                                                            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="absolute right-full top-0 mr-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl flex flex-col p-1 z-50 min-w-[120px]">
                                                                <button onClick={() => { setEditingEntry(reply); setInputText(reply.content); setActiveMenuId(null); inputRef.current?.focus(); }} className="flex items-center gap-2 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold"><Edit2 size={12}/> Editar</button>
                                                                <button onClick={() => { setConfirmDialog({ type: 'delete_entry', id: reply.id, title: 'Apagar Resposta?', subtitle: 'Esta resposta será removida permanentemente.' }); setActiveMenuId(null); }} className="flex items-center gap-2 p-2 hover:bg-red-500/10 text-red-500 rounded-lg text-xs font-bold"><Trash2 size={12}/> Apagar Resposta</button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* INPUT DE MENSAGEM */}
            {!isArchivedView && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950/80 border-t border-zinc-200 dark:border-zinc-900">
                    <AnimatePresence>
                        {replyingTo && (
                            <motion.div initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center justify-between bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-t-xl border border-blue-500/20 border-b-0">
                                <div className="flex items-center gap-2 text-xs font-bold truncate">
                                    <CornerDownRight size={14} className="shrink-0"/>
                                    <span className="truncate">Respondendo: {replyingTo.content}</span>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-blue-500/20 rounded-lg transition-colors"><X size={14}/></button>
                            </motion.div>
                        )}
                        {editingEntry && (
                            <motion.div initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center justify-between bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-t-xl border border-amber-500/20 border-b-0">
                                <div className="flex items-center gap-2 text-xs font-bold truncate">
                                    <Edit2 size={14} className="shrink-0"/>
                                    <span className="truncate">Editando registro original</span>
                                </div>
                                <button onClick={() => { setEditingEntry(null); setInputText(''); }} className="p-1 hover:bg-amber-500/20 rounded-lg transition-colors"><X size={14}/></button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <div className="flex items-end gap-2 relative">
                        <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={replyingTo ? "Sua resposta..." : "Documente algo ou mencione @Feed e #Canal..."}
                            className={`flex-1 max-h-40 min-h-[56px] resize-none bg-white dark:bg-zinc-900 border outline-none px-4 py-4 text-sm rounded-2xl shadow-sm transition-colors ${replyingTo ? 'rounded-tl-none border-blue-500/30 focus:border-blue-500' : editingEntry ? 'rounded-tl-none border-amber-500/30 focus:border-amber-500' : 'border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 dark:focus:border-zinc-500'}`}
                            rows={1}
                        />
                        <button onClick={handleSend} disabled={!inputText.trim()} className="p-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black rounded-2xl font-bold disabled:opacity-50 hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center shrink-0">
                            <Send size={20} className={inputText.trim() ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""} />
                        </button>
                    </div>
                    <p className="text-[10px] text-center text-zinc-400 font-bold uppercase tracking-widest mt-3">Aperte Enter para enviar • Shift + Enter para quebrar linha</p>
                </div>
            )}
        </div>

        {/* MODAL DE CONFIRMAÇÃO DE DELEÇÃO */}
        <AnimatePresence>
            {confirmDialog && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
                <h3 className="text-xl font-black mb-2 dark:text-white">{confirmDialog.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">{confirmDialog.subtitle}</p>
                <div className="flex gap-3">
                    <button onClick={() => setConfirmDialog(null)} className="flex-1 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                    <button onClick={executeConfirmAction} className="flex-1 p-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors">Confirmar</button>
                </div>
                </motion.div>
            </motion.div>
            )}
        </AnimatePresence>

        {/* MODAL DE PROMPT DE CANAL (QUANDO USUÁRIO CRIA UM FEED NOVO SEM CONTEXTO) */}
        <AnimatePresence>
            {channelPrompt && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 shadow-2xl border border-blue-500/20 text-center">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} /></div>
                <h3 className="text-xl font-black mb-2 dark:text-white">Para qual Canal?</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">O feed <span className="font-bold text-blue-500">@{channelPrompt.pendingFeeds.join(', @')}</span> é novo e precisa morar dentro de um Canal. Escolha um ou crie um agora.</p>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
                        {channels.map(c => (
                            <button key={c.id} onClick={() => resolveChannelPrompt(c.id, false)} className="p-3 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 transition-colors truncate">
                                {c.name}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <input autoFocus type="text" placeholder="Nome do novo canal..." value={newChannelPromptName} onChange={e=>setNewChannelPromptName(e.target.value)} className="flex-1 bg-zinc-100 dark:bg-zinc-800 p-3 rounded-xl outline-none font-bold text-sm" />
                        <button onClick={() => { if(newChannelPromptName.trim()) resolveChannelPrompt(newChannelPromptName.trim(), true); }} disabled={!newChannelPromptName.trim()} className="p-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">Criar</button>
                    </div>
                </div>

                <div className="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                    <button onClick={() => setChannelPrompt(null)} className="text-sm font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Cancelar Envio</button>
                </div>
                </motion.div>
            </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {toastMessage && ( <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 left-1/2 -translate-x-1/2 z-[3000] px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] font-bold text-sm tracking-wide border ${toastMessage.type === 'error' ? 'bg-red-500 text-white border-red-600' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-zinc-800 dark:border-zinc-200'}`}>{toastMessage.msg}</motion.div> )}
        </AnimatePresence>

    </motion.div>
  );
};
