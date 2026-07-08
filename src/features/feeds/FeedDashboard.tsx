import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, AtSign, Send, MessageSquareText, Search, Calendar as CalendarIcon, MoreVertical, Archive, ArchiveRestore, Edit2, Trash2, CornerDownRight, PaintBucket, AlertTriangle, AlertCircle, CheckCircle2, Zap, Footprints, Timer, Gift, Repeat, Check, Bold, Italic, Code, AlignJustify, ChevronLeft, List } from 'lucide-react';
import { useFeedStore, extractMentions, type FeedTarget } from '../../store/useFeedStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useBackHandler } from '../../store/useConfigStore';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ItemColor, FeedEntry, Feed } from '../../types';

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

const priorityBadgeStyles = {
    P0: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/50',
    P1: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50',
    P2: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-transparent',
    P3: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50',
    P4: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50',
};

// === COMPONENTES AUXILIARES ===
const LinkedTaskCard = ({ taskId, isCompact }: { taskId: string, isCompact?: boolean }) => {
    const task = useTaskStore(s => s.tasks.find(t => t.id === taskId));
    if (!task) return null;
    const icons = { normal: CheckCircle2, daily_challenge: Zap, sprint: Footprints, time: Timer, bonus: Gift, routine: Repeat };
    const Icon = icons[task.type as keyof typeof icons] || CheckCircle2;
    return (
        <div className={`mt-2 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/50 flex flex-col gap-2 ${task.isCompleted ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2">
               <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${task.isCompleted ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-black' : 'border-zinc-400 dark:border-zinc-500'}`}>
                  {task.isCompleted && <Check size={10} strokeWidth={3} />}
               </div>
               <span className={`text-xs font-bold truncate ${task.isCompleted ? 'line-through opacity-70' : 'text-zinc-900 dark:text-zinc-100'}`}>{task.title}</span>
            </div>
            {!isCompact && (
                <div className="flex flex-wrap items-center gap-2 pl-6">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${priorityBadgeStyles[task.priority]}`}>{task.priority}</span>
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500"><Icon size={10}/> {task.type.replace('_', ' ')}</span>
                    {task.deadlineDate && <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500"><CalendarIcon size={10} />{format(new Date(task.deadlineDate + 'T12:00:00'), "dd/MM", { locale: ptBR })}</span>}
                </div>
            )}
        </div>
    );
};

const FeedSummaryCard = ({ feed, entries, onSelect }: { feed: Feed, entries: FeedEntry[], onSelect: () => void }) => {
    const latestEntry = entries.filter(e => e.feedId === feed.id).sort((a,b) => b.createdAt - a.createdAt)[0];
    const style = colorStyles[feed.color];
    return (
        <button onClick={onSelect} className={`flex flex-col p-5 rounded-2xl border text-left transition-transform hover:scale-[1.02] bg-white dark:bg-zinc-900/50 hover:border-current shadow-sm ${style.text} ${style.border} h-full`}>
           <div className="flex items-center gap-3 mb-3 w-full">
               <div className={`p-2 rounded-xl ${style.bg} ${style.text}`}><AtSign size={18}/></div>
               <h4 className="font-black text-lg text-zinc-900 dark:text-zinc-100 truncate flex-1">{feed.name}</h4>
           </div>
           {latestEntry ? ( <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed flex-1 w-full">{latestEntry.content}</p> ) : ( <p className="text-sm text-zinc-400 italic flex-1 w-full">Nenhum registro ativo.</p> )}
           <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/50 w-full shrink-0">
               <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                   {latestEntry ? `Atualizado ${format(new Date(latestEntry.createdAt), "dd MMM, HH:mm", { locale: ptBR })}` : 'Feed Vazio'}
               </span>
           </div>
        </button>
    );
};

export const parseContent = (text: string) => {
    if (!text) return '';
    let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline break-all">$1</a>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>');
    html = html.replace(/\*(.*?)\*/gim, '<i>$1</i>');
    html = html.replace(/~~(.*?)~~/gim, '<strike>$1</strike>');
    html = html.replace(/`([^`\n]+)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">$1</code>');
    html = html.replace(/(@[\wÀ-ÿ-]+)/g, '<span class="text-blue-500 font-bold bg-blue-500/10 px-1 rounded">$1</span>');
    html = html.replace(/(#[\wÀ-ÿ-]+)/g, '<span class="text-amber-500 font-bold bg-amber-500/10 px-1 rounded">$1</span>');
    return html.replace(/\n/g, '<br/>');
};

// === COMPONENTE PRINCIPAL ===
export const FeedDashboard = ({ isOpen, onClose, focusInputSignal }: { isOpen: boolean, onClose: () => void, focusInputSignal: number }) => {
  const { channels, feeds, entries, publishMessage, updateEntry, deleteEntry, updateFeed, archiveFeed, unarchiveFeed, deleteFeed, updateChannel, deleteChannel, cleanupArchivedFeeds } = useFeedStore();
  
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);
  
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isArchivedView, setIsArchivedView] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<FeedEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<FeedEntry | null>(null);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<{ type: 'channel'|'feed', id: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'error'|'success'} | null>(null);
  
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'archive_feed' | 'delete_feed' | 'delete_channel' | 'delete_entry', id: string, title: string, subtitle: string } | null>(null);
  const [channelPrompt, setChannelPrompt] = useState<{ pendingFeeds: string[] } | null>(null);
  const [newChannelPromptName, setNewChannelPromptName] = useState('');

  const [mentionContext, setMentionContext] = useState<{ type: 'feed' | 'channel'; query: string; startIndex: number; } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

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

  const filteredMentions = useMemo(() => {
      if (!mentionContext) return [];
      const q = mentionContext.query.toLowerCase();
      if (mentionContext.type === 'channel') return channels.filter(c => c.name.toLowerCase().startsWith(q)).slice(0, 5);
      else return feeds.filter(f => f.name.toLowerCase().startsWith(q)).map(f => { const c = channels.find(ch => ch.id === f.channelId); return { ...f, channelName: c ? c.name : 'Sem Canal' }; }).slice(0, 5);
  }, [mentionContext, channels, feeds]);

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

      const parents = filtered.filter(e => !e.parentId);
      return parents.map(p => {
          const replies = entries.filter(e => e.parentId === p.id).sort((a, b) => a.createdAt - b.createdAt);
          const lastActivity = replies.length > 0 ? replies[replies.length - 1].createdAt : p.createdAt;
          return { parent: p, replies, lastActivity };
      }).sort((a, b) => a.lastActivity - b.lastActivity);
  }, [entries, activeFeedId, searchQuery, selectedDate]);

  const applyMention = (item: any) => {
      if (!mentionContext || !inputRef.current) return;
      const before = inputText.substring(0, mentionContext.startIndex);
      const after = inputText.substring(inputRef.current.selectionStart);
      let mentionText = mentionContext.type === 'channel' ? `#${item.name} ` : `@${item.name} ${item.channelName !== 'Sem Canal' ? `#${item.channelName} ` : ''}`;
      const newVal = before + mentionText + after;
      setInputText(newVal); setMentionContext(null);
      setTimeout(() => { if (inputRef.current) { inputRef.current.focus(); const newCursorPos = before.length + mentionText.length; inputRef.current.setSelectionRange(newCursorPos, newCursorPos); } }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value; setInputText(val);
      const match = val.substring(0, e.target.selectionStart).match(/([@#])([\wÀ-ÿ-]*)$/);
      if (match) { setMentionContext({ type: match[1] === '@' ? 'feed' : 'channel', query: match[2], startIndex: match.index! }); setMentionIndex(0); } 
      else setMentionContext(null);
  };

  const insertFormat = (formatStr: string) => {
      if (!inputRef.current) return;
      const start = inputRef.current.selectionStart;
      const end = inputRef.current.selectionEnd;
      const text = inputText;
      const selectedText = text.substring(start, end);
      const before = text.substring(0, start);
      const after = text.substring(end);
  
      let newText = ''; let newCursorPos = 0;
      if (formatStr === 'bold') { newText = before + `**${selectedText}**` + after; newCursorPos = start + 2 + selectedText.length + 2; } 
      else if (formatStr === 'italic') { newText = before + `*${selectedText}*` + after; newCursorPos = start + 1 + selectedText.length + 1; } 
      else if (formatStr === 'code') { newText = before + `\`${selectedText}\`` + after; newCursorPos = start + 1 + selectedText.length + 1; }
  
      setInputText(newText);
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(newCursorPos, newCursorPos); }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionContext && filteredMentions.length > 0) {
          if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((prev) => (prev + 1) % filteredMentions.length); return; }
          if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length); return; }
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); applyMention(filteredMentions[mentionIndex]); return; }
          if (e.key === 'Escape') { setMentionContext(null); return; }
      }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleRequestDeleteChannel = (id: string) => {
      if (feeds.some(f => f.channelId === id)) return showToast('Não é possível excluir um canal que possui feeds.', 'error');
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

  const executeSend = (targets: FeedTarget[]) => { publishMessage(inputText, targets, replyingTo?.id); setInputText(''); setReplyingTo(null); };

  const handleSend = () => {
      if (!inputText.trim()) return;
      if (editingEntry) { updateEntry(editingEntry.id, inputText); setEditingEntry(null); setInputText(''); return; }

      const { feeds: mFeeds, channels: mChannels } = extractMentions(inputText);
      let targets: FeedTarget[] = [];
      let pendingFeedsWithoutChannel: string[] = [];
      let mentionedChannelId: string | null = null;

      if (mChannels.length > 0) {
          const c = channels.find(ch => ch.name.toLowerCase() === mChannels[0].toLowerCase());
          if (c) mentionedChannelId = c.id;
      }

      if (mFeeds.length === 0) {
          if (activeFeedId) targets.push({ feedId: activeFeedId });
          else return; 
      } else {
          mFeeds.forEach(fName => {
              let existingF = null;
              if (mentionedChannelId) existingF = feeds.find(f => f.name.toLowerCase() === fName.toLowerCase() && f.channelId === mentionedChannelId);
              if (!existingF && activeChannelId) existingF = feeds.find(f => f.name.toLowerCase() === fName.toLowerCase() && f.channelId === activeChannelId);
              if (!existingF) existingF = feeds.find(f => f.name.toLowerCase() === fName.toLowerCase());

              if (existingF) targets.push({ feedId: existingF.id });
              else {
                  if (mChannels.length > 0) targets.push({ newFeedName: fName, newChannelName: mChannels[0] });
                  else if (activeChannelId) targets.push({ newFeedName: fName, channelId: activeChannelId });
                  else pendingFeedsWithoutChannel.push(fName);
              }
          });
      }

      if (pendingFeedsWithoutChannel.length > 0) { setChannelPrompt({ pendingFeeds: pendingFeedsWithoutChannel }); return; }
      executeSend(targets);
  };

  const resolveChannelPrompt = (channelIdOrName: string, isNew: boolean) => {
      if (!channelPrompt) return;
      const { feeds: mFeeds } = extractMentions(inputText);
      let targets: FeedTarget[] = [];
      
      mFeeds.forEach(fName => {
          const existingF = feeds.find(f => f.name.toLowerCase() === fName.toLowerCase());
          if (existingF) targets.push({ feedId: existingF.id });
          else {
              if (isNew) targets.push({ newFeedName: fName, newChannelName: channelIdOrName });
              else targets.push({ newFeedName: fName, channelId: channelIdOrName });
          }
      });
      setChannelPrompt(null); setNewChannelPromptName(''); executeSend(targets);
  };

  const ColorPicker = ({ type, id }: { type: 'channel'|'feed', id: string }) => (
      <div className="absolute top-10 right-0 z-50 bg-white dark:bg-zinc-800 p-3 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 flex gap-2">
          {(Object.keys(colorStyles) as ItemColor[]).map(c => (
              <button key={c} onClick={() => { if (type === 'channel') updateChannel(id, { color: c }); else updateFeed(id, { color: c }); setShowColorPicker(null); }} className={`w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-transform ${colorStyles[c].bg} ${colorStyles[c].text}`} />
          ))}
      </div>
  );

  const isMobileChatView = activeFeedId !== null || activeChannelId !== null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed inset-0 z-[150] bg-zinc-50 dark:bg-black flex flex-col md:flex-row overflow-hidden h-[100dvh]">
            
            {/* SIDEBAR */}
            <div className={`w-full md:w-80 h-full border-r border-zinc-200 dark:border-zinc-900 flex-col shrink-0 bg-white dark:bg-zinc-950/50 shadow-sm z-20 ${isMobileChatView ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 md:p-6 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-transparent">
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
                          <button onClick={() => { setActiveChannelId(null); setActiveFeedId(null); }} className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-colors ${!activeChannelId ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}>Todos os Canais</button>
                          {channels.map(c => {
                              const style = colorStyles[c.color]; const isActive = activeChannelId === c.id;
                              return (
                                  <div key={c.id} className="group relative flex items-center">
                                      <button onClick={() => { setActiveChannelId(c.id); setActiveFeedId(null); }} className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${isActive ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}>
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
                                      const style = colorStyles[f.color]; const isActive = activeFeedId === f.id;
                                      return (
                                          <div key={f.id} className="group relative flex items-center">
                                              <button onClick={() => setActiveFeedId(f.id)} className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${isActive ? `${style.bg} ${style.border} border shadow-sm` : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent'}`}>
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

            {/* ÁREA PRINCIPAL */}
            <div className={`flex-1 flex-col min-w-0 bg-transparent relative h-full ${!isMobileChatView ? 'hidden md:flex' : 'flex'}`}>
                
                <div className="h-16 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => { setActiveChannelId(null); setActiveFeedId(null); }} className="md:hidden p-2 -ml-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        {activeFeedId ? (
                            <>
                                <div className={`p-2 rounded-lg ${colorStyles[feeds.find(f => f.id === activeFeedId)?.color || 'zinc'].bg} ${colorStyles[feeds.find(f => f.id === activeFeedId)?.color || 'zinc'].text}`}>
                                    <AtSign size={18} />
                                </div>
                                <h3 className="font-black text-lg truncate pr-4">{feeds.find(f => f.id === activeFeedId)?.name}</h3>
                            </>
                        ) : activeChannelId ? (
                            <>
                                <div className={`p-2 rounded-lg ${colorStyles[channels.find(c => c.id === activeChannelId)?.color || 'zinc'].bg} ${colorStyles[channels.find(c => c.id === activeChannelId)?.color || 'zinc'].text}`}>
                                    <Hash size={18} />
                                </div>
                                <h3 className="font-black text-lg truncate pr-4">{channels.find(c => c.id === activeChannelId)?.name}</h3>
                            </>
                        ) : (
                            <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100">Visão Geral dos Canais</h3>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {activeFeedId && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsCompact(!isCompact)} className={`p-2 rounded-lg transition-colors hidden md:flex ${isCompact ? 'bg-blue-500/10 text-blue-500' : 'bg-white dark:bg-zinc-900 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`} title="Visão Compacta">
                                    {isCompact ? <List size={18} /> : <AlignJustify size={18} />}
                                </button>
                                <div className="relative hidden lg:flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full px-3 py-1.5 focus-within:ring-2 ring-blue-500 transition-shadow ml-2">
                                    <Search size={14} className="text-zinc-400" />
                                    <input type="text" placeholder="Pesquisar..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold w-24 focus:w-40 transition-all px-2 placeholder:text-zinc-500" />
                                    {searchQuery && <button onClick={() => setSearchQuery('')}><X size={12} className="text-zinc-400 hover:text-zinc-600" /></button>}
                                </div>
                            </div>
                        )}
                        
                        <div className="relative hidden md:flex">
                            <input type="date" value={selectedDate || ''} onChange={e=>setSelectedDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                            <button className={`p-2 rounded-full transition-colors ${selectedDate ? 'bg-blue-500/10 text-blue-500' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-sm'}`}>
                               <CalendarIcon size={18} />
                            </button>
                        </div>
                        {selectedDate && <button onClick={() => setSelectedDate(null)} className="p-2 rounded-full text-red-500 bg-red-500/10 hover:bg-red-500/20"><X size={14}/></button>}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 md:p-8 scrollbar-thin">
                    {activeFeedId ? (
                        displayedEntries.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                                <MessageSquareText size={48} className="mb-4 opacity-20" />
                                <p className="font-bold text-sm">Nada por aqui.</p>
                                <p className="text-xs mt-2 opacity-60 max-w-xs text-center">Use a caixa abaixo e mencione @Feed ou #Canal para documentar.</p>
                            </div>
                        ) : (
                            <div className={`space-y-${isCompact ? '2' : '6'}`}>
                                {displayedEntries.map(group => {
                                    return (
                                        <div key={group.parent.id} className="group/parent flex flex-col relative">
                                            {group.replies.length > 0 && !isCompact && ( <div className="absolute left-5 top-12 bottom-6 w-0.5 bg-zinc-200 dark:bg-zinc-800 z-0 rounded-full" /> )}
                                            
                                            <div className={`flex relative z-10 transition-colors ${isCompact ? 'gap-3 py-3 px-3 rounded-xl border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50' : 'gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700'} ${editingEntry?.id === group.parent.id || replyingTo?.id === group.parent.id ? 'bg-blue-500/5 ring-1 ring-blue-500/30' : ''}`}>
                                                {!isCompact && (
                                                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                                                        <AtSign size={18} />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm ${isCompact ? 'text-zinc-100 bg-blue-500' : 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800'}`}>
                                                            {format(new Date(group.parent.createdAt), "dd MMM, HH:mm", { locale: ptBR })}
                                                        </span>
                                                        {group.parent.createdAt !== group.parent.updatedAt && <span className="text-[9px] text-zinc-400 italic">(Editado)</span>}
                                                    </div>
                                                    <p className="text-sm md:text-base leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-medium">
                                                        <span dangerouslySetInnerHTML={{ __html: parseContent(group.parent.content) }} />
                                                    </p>
                                                    {group.parent.linkedTaskId && <LinkedTaskCard taskId={group.parent.linkedTaskId} isCompact={isCompact} />}
                                                </div>

                                                <div className={`opacity-0 group-hover/parent:opacity-100 transition-opacity flex ${isCompact ? 'flex-row items-start' : 'flex-col'} gap-1 shrink-0`}>
                                                    <button onClick={() => setReplyingTo(group.parent)} className="p-2 text-zinc-400 hover:text-blue-500 bg-zinc-50 dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-800"><CornerDownRight size={14}/></button>
                                                    <div className="relative">
                                                        <button onClick={() => setActiveMenuId(activeMenuId === group.parent.id ? null : group.parent.id)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-50 dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-800"><MoreVertical size={14}/></button>
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
                                                <div key={reply.id} className={`group/reply flex relative z-10 transition-colors ${isCompact ? 'ml-6 gap-3 py-2 px-3 border-l-2 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50' : 'ml-8 md:ml-12 gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 mt-2'} ${editingEntry?.id === reply.id ? 'bg-blue-500/5 ring-1 ring-blue-500/30' : ''}`}>
                                                    {!isCompact && (
                                                        <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-800 text-zinc-400">
                                                            <CornerDownRight size={14} />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm ${isCompact ? 'text-zinc-600 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800' : 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800'}`}>
                                                                {format(new Date(reply.createdAt), "dd MMM, HH:mm", { locale: ptBR })}
                                                            </span>
                                                            {reply.createdAt !== reply.updatedAt && <span className="text-[9px] text-zinc-400 italic">(Editado)</span>}
                                                        </div>
                                                        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                                            <span dangerouslySetInnerHTML={{ __html: parseContent(reply.content) }} />
                                                        </p>
                                                        {reply.linkedTaskId && <LinkedTaskCard taskId={reply.linkedTaskId} isCompact={isCompact} />}
                                                    </div>
                                                    <div className={`opacity-0 group-hover/reply:opacity-100 transition-opacity flex ${isCompact ? 'flex-row items-start' : 'flex-col'} gap-1 shrink-0`}>
                                                        <div className="relative">
                                                            <button onClick={() => setActiveMenuId(activeMenuId === reply.id ? null : reply.id)} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-50 dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-800"><MoreVertical size={14}/></button>
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
                                    );
                                })}
                            </div>
                        )
                    ) : activeChannelId ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                               <h3 className="font-bold text-zinc-500 uppercase tracking-widest text-xs flex items-center gap-2"><Hash size={16}/> Feeds no Canal</h3>
                               <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full">{activeFeeds.length} feeds</span>
                            </div>
                            {activeFeeds.length === 0 ? (
                               <div className="text-center text-zinc-400 py-12 font-medium">Nenhum feed ativo neste canal.</div>
                            ) : (
                               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                   {activeFeeds.map(f => <FeedSummaryCard key={f.id} feed={f} entries={entries} onSelect={() => { setActiveChannelId(f.channelId); setActiveFeedId(f.id); }} />)}
                               </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-12 pb-12">
                            {channels.map(c => {
                                const cFeeds = feeds.filter(f => f.channelId === c.id && f.isArchived === isArchivedView).sort((a,b) => b.lastActivityAt - a.lastActivityAt);
                                if (cFeeds.length === 0) return null;
                                const style = colorStyles[c.color];
                                return (
                                    <div key={c.id}>
                                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                                           <div className={`p-1.5 rounded-lg ${style.bg} ${style.text}`}><Hash size={16}/></div>
                                           <h3 className="font-black text-xl tracking-tight text-zinc-900 dark:text-zinc-100">{c.name}</h3>
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {cFeeds.map(f => <FeedSummaryCard key={f.id} feed={f} entries={entries} onSelect={() => { setActiveChannelId(f.channelId); setActiveFeedId(f.id); }} />)}
                                        </div>
                                    </div>
                                )
                            })}
                            {channels.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-20">
                                    <Hash size={48} className="mb-4 opacity-20" />
                                    <p className="font-bold text-sm text-center max-w-sm">A sua Base de Conhecimento está vazia.<br/><br/>Use a caixa abaixo para criar seu primeiro canal e feed usando a sintaxe <b className="text-zinc-600 dark:text-zinc-300">@Nome</b> e <b className="text-zinc-600 dark:text-zinc-300">#Canal</b>.</p>
                                </div>
                            )}
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>

                {/* INPUT COM AUTOCOMPLETE E FORMATADORES */}
                {!isArchivedView && (
                    <div className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-900 relative shrink-0">
                        
                        <AnimatePresence>
                            {mentionContext && filteredMentions.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full left-4 mb-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-2 z-[200] min-w-[240px] max-w-[90%] max-h-60 overflow-y-auto"
                                >
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 px-2">
                                        {mentionContext.type === 'feed' ? 'Selecionar Feed' : 'Selecionar Canal'}
                                    </div>
                                    {filteredMentions.map((item, idx) => {
                                        const isSelected = mentionIndex === idx;
                                        return (
                                            <button
                                                key={item.id} onClick={() => applyMention(item)} onMouseEnter={() => setMentionIndex(idx)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-colors ${isSelected ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    {mentionContext.type === 'channel' ? <Hash size={16} className={isSelected ? 'text-amber-500' : ''} /> : <AtSign size={16} className={isSelected ? 'text-blue-500' : ''} />}
                                                    <span className="font-bold truncate">{item.name}</span>
                                                </div>
                                                {mentionContext.type === 'feed' && (
                                                    <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md shrink-0 ml-3 ${isSelected ? 'bg-zinc-200 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-300' : 'bg-zinc-100 dark:bg-zinc-900/50'}`}>
                                                        {(item as any).channelName}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="p-4 relative">
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
                            
                            <div className={`flex flex-col bg-zinc-50 dark:bg-zinc-900 border rounded-2xl shadow-sm transition-colors ${replyingTo ? 'rounded-tl-none border-blue-500/30 focus-within:border-blue-500' : editingEntry ? 'rounded-tl-none border-amber-500/30 focus-within:border-amber-500' : 'border-zinc-200 dark:border-zinc-800 focus-within:border-zinc-400 dark:focus-within:border-zinc-600'}`}>
                                <div className="flex items-center gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800">
                                   <button onClick={() => insertFormat('bold')} className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"><Bold size={14}/></button>
                                   <button onClick={() => insertFormat('italic')} className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"><Italic size={14}/></button>
                                   <button onClick={() => insertFormat('code')} className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"><Code size={14}/></button>
                                </div>
                                <div className="flex items-end gap-2 p-2 relative">
                                    <textarea
                                        ref={inputRef} value={inputText} onChange={handleInputChange} onKeyDown={handleKeyDown}
                                        placeholder={replyingTo ? "Sua resposta..." : "Documente algo ou mencione @Feed e #Canal..."}
                                        className="flex-1 max-h-40 min-h-[40px] resize-none bg-transparent outline-none px-2 py-2 text-sm"
                                        rows={1}
                                    />
                                    <button onClick={handleSend} disabled={!inputText.trim()} className="p-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center shrink-0">
                                        <Send size={18} className={inputText.trim() ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAIS DE CONFIRMAÇÃO E CRIAÇÃO */}
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

            <AnimatePresence>
                {channelPrompt && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 shadow-2xl border border-blue-500/20 text-center">
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} /></div>
                    <h3 className="text-xl font-black mb-2 dark:text-white">Para qual Canal?</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">Os novos feeds <span className="font-bold text-blue-500">@{channelPrompt.pendingFeeds.join(', @')}</span> precisam morar dentro de um Canal. Escolha um ou crie um agora.</p>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
                            {channels.map(c => (
                                <button key={c.id} onClick={() => resolveChannelPrompt(c.id, false)} className="p-3 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 transition-colors truncate">
                                    {c.name}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <input autoFocus type="text" placeholder="Nome do novo canal..." value={newChannelPromptName} onChange={e=>setNewChannelPromptName(e.target.value)} onKeyDown={e=>e.key==='Enter' && newChannelPromptName.trim() && resolveChannelPrompt(newChannelPromptName.trim(), true)} className="flex-1 bg-zinc-100 dark:bg-zinc-800 p-3 rounded-xl outline-none font-bold text-sm border border-zinc-200 dark:border-zinc-700" />
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
      )}
    </AnimatePresence>
  );
};
