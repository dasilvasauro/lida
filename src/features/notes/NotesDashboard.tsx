import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Lock, Unlock, ChevronLeft, AlignLeft, Bold, Italic, Underline, List, ListOrdered, FileText, Trash2, Save, Check, Eye, PenLine, Maximize2, Minimize2 } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import type { Notebook, Note, ItemColor, NoteFont, NoteFormat } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const colorStyles: Record<ItemColor, { nb: string; note: string; hex: string }> = {
  blue: { nb: 'bg-blue-500/20 dark:bg-blue-500/30 border-blue-500/30 dark:border-blue-400/50 text-blue-600 dark:text-blue-300', note: 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/10 dark:border-blue-400/30', hex: 'text-blue-500 dark:text-blue-400' },
  emerald: { nb: 'bg-emerald-500/20 dark:bg-emerald-500/30 border-emerald-500/30 dark:border-emerald-400/50 text-emerald-600 dark:text-emerald-300', note: 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/10 dark:border-emerald-400/30', hex: 'text-emerald-500 dark:text-emerald-400' },
  amber: { nb: 'bg-amber-500/20 dark:bg-amber-500/30 border-amber-500/30 dark:border-amber-400/50 text-amber-600 dark:text-amber-300', note: 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/10 dark:border-amber-400/30', hex: 'text-amber-500 dark:text-amber-400' },
  rose: { nb: 'bg-rose-500/20 dark:bg-rose-500/30 border-rose-500/30 dark:border-rose-400/50 text-rose-600 dark:text-rose-300', note: 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/10 dark:border-rose-400/30', hex: 'text-rose-500 dark:text-rose-400' },
  purple: { nb: 'bg-purple-500/20 dark:bg-purple-500/30 border-purple-500/30 dark:border-purple-400/50 text-purple-600 dark:text-purple-300', note: 'bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/10 dark:border-purple-400/30', hex: 'text-purple-500 dark:text-purple-400' },
  cyan: { nb: 'bg-cyan-500/20 dark:bg-cyan-500/30 border-cyan-500/30 dark:border-cyan-400/50 text-cyan-600 dark:text-cyan-300', note: 'bg-cyan-500/5 dark:bg-cyan-500/10 border-cyan-500/10 dark:border-cyan-400/30', hex: 'text-cyan-500 dark:text-cyan-400' },
  indigo: { nb: 'bg-indigo-500/20 dark:bg-indigo-500/30 border-indigo-500/30 dark:border-indigo-400/50 text-indigo-600 dark:text-indigo-300', note: 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/10 dark:border-indigo-400/30', hex: 'text-indigo-500 dark:text-indigo-400' },
  zinc: { nb: 'bg-zinc-500/20 dark:bg-zinc-500/30 border-zinc-500/30 dark:border-zinc-400/50 text-zinc-600 dark:text-zinc-300', note: 'bg-zinc-500/5 dark:bg-zinc-500/10 border-zinc-500/10 dark:border-zinc-400/30', hex: 'text-zinc-500 dark:text-zinc-400' }
};

const parseMarkdown = (text: string) => {
  return text
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black mt-4 mb-2">$1</h1>')
    .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-current pl-4 italic opacity-80 my-2">$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*?)\*/gim, '<i>$1</i>')
    .replace(/\n/gim, '<br />');
};

export const NotesDashboard = () => {
  const { notebooks, notes, unlockedNotebooks, unlockedNotes, addNotebook, updateNotebook, deleteNotebook, addNote, updateNote, deleteNote, unlockNotebook, unlockNote, lockAll } = useNoteStore();

  const [view, setView] = useState<'notebooks' | 'notes' | 'editor'>('notebooks');
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');

  // Modais
  const [isNbModalOpen, setNbModalOpen] = useState(false);
  const [nbName, setNbName] = useState('');
  const [nbColor, setNbColor] = useState<ItemColor>('zinc');

  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; type: 'unlock_nb' | 'unlock_note' | 'set_nb_lock' | 'set_note_lock'; targetId: string } | null>(null);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState('');

  // Editor States
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteFormat, setNoteFormat] = useState<NoteFormat>('richtext');
  const [noteFont, setNoteFont] = useState<NoteFont>('sans');
  const [noteLines, setNoteLines] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle'); 
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  const filteredNotebooks = notebooks.filter(nb => nb.name.toLowerCase().includes(search.toLowerCase()));
  const filteredNotes = activeNotebook ? notes.filter(n => n.notebookId === activeNotebook.id && (n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))) : [];

  const handleOpenNotebook = (nb: Notebook) => {
    if (nb.isLocked && !unlockedNotebooks.includes(nb.id)) {
      setPasswordModal({ isOpen: true, type: 'unlock_nb', targetId: nb.id });
    } else {
      setActiveNotebook(nb); setView('notes'); setSearch('');
    }
  };

  const handleOpenNote = (note: Note) => {
    if (note.isLocked && !unlockedNotes.includes(note.id)) {
      setPasswordModal({ isOpen: true, type: 'unlock_note', targetId: note.id });
    } else {
      setActiveNote(note); setNoteTitle(note.title); setNoteContent(note.content); setNoteFormat(note.format); setNoteFont(note.font); setNoteLines(note.hasLines); 
      setIsEditing(false); setIsFullscreen(false); setView('editor');
    }
  };

  const handleBack = () => {
    if (view === 'editor') {
      saveNote(); setActiveNote(null); setView('notes'); setIsFullscreen(false);
    } else if (view === 'notes') {
      setActiveNotebook(null); setView('notebooks'); setSearch('');
    }
  };

  const handleCreateNotebook = () => {
    if (!nbName.trim()) return;
    addNotebook({ id: uuidv4(), name: nbName, color: nbColor, isLocked: false, createdAt: Date.now() });
    setNbModalOpen(false); setNbName(''); setNbColor('zinc');
  };

  const handleCreateNote = () => {
    if (!activeNotebook) return;
    const newNote: Note = { id: uuidv4(), notebookId: activeNotebook.id, title: '', content: '', format: 'richtext', font: 'sans', hasLines: false, isLocked: false, createdAt: Date.now(), updatedAt: Date.now() };
    addNote(newNote);
    setActiveNote(newNote); setNoteTitle(''); setNoteContent(''); setNoteFormat('richtext'); setNoteFont('sans'); setNoteLines(false); 
    setIsEditing(true); setIsFullscreen(false); setView('editor');
  };

  const saveNote = () => {
    if (!activeNote) return;
    const currentHtml = noteFormat === 'richtext' && editorRef.current ? editorRef.current.innerHTML : noteContent;
    if (!noteTitle.trim() && !currentHtml.trim()) { deleteNote(activeNote.id); return; }
    updateNote(activeNote.id, { title: noteTitle, content: currentHtml, format: noteFormat, font: noteFont, hasLines: noteLines });
  };

  // --- FUNÇÃO QUE TINHA SIDO OMITIDA ---
  const handleManualSave = () => {
    saveNote();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  useEffect(() => {
    if (view !== 'editor' || !activeNote || !isEditing) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveNote();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
    return () => clearTimeout(timer);
  }, [noteTitle, noteContent, noteFormat, noteFont, noteLines, isEditing]);

  useEffect(() => {
    if (view === 'editor' && noteFormat === 'richtext' && editorRef.current) {
      if (editorRef.current.innerHTML !== noteContent) {
          editorRef.current.innerHTML = noteContent;
      }
    }
  }, [view, noteFormat, activeNote?.id]);

  const submitPassword = () => {
    if (!passwordModal) return;
    const { type, targetId } = passwordModal;
    
    if (type === 'unlock_nb') {
      if (unlockNotebook(targetId, passInput)) { setPasswordModal(null); setPassInput(''); handleOpenNotebook(notebooks.find(n => n.id === targetId)!); } 
      else setPassError('Senha incorreta.');
    } else if (type === 'unlock_note') {
      if (unlockNote(targetId, passInput)) { setPasswordModal(null); setPassInput(''); handleOpenNote(notes.find(n => n.id === targetId)!); } 
      else setPassError('Senha incorreta.');
    } else if (type === 'set_nb_lock') {
      if (passInput.length < 4) { setPassError('Mínimo de 4 caracteres.'); return; }
      updateNotebook(targetId, { isLocked: true, password: passInput });
      unlockNotebook(targetId, passInput); 
      setPasswordModal(null); setPassInput('');
    } else if (type === 'set_note_lock') {
      if (passInput.length < 4) { setPassError('Mínimo de 4 caracteres.'); return; }
      updateNote(targetId, { isLocked: true, password: passInput });
      unlockNote(targetId, passInput); 
      setPasswordModal(null); setPassInput('');
    }
  };

  const removeLock = (id: string, isNotebook: boolean) => {
    if (isNotebook) updateNotebook(id, { isLocked: false, password: '' });
    else updateNote(id, { isLocked: false, password: '' });
  };

  const execCmd = (cmd: string) => { document.execCommand(cmd, false); editorRef.current?.focus(); };

  return (
    <div className={`transition-colors duration-500 ${isFullscreen ? 'fixed inset-0 z-[1000] bg-white dark:bg-black flex flex-col' : 'min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 pb-32'}`}>
      <div className={`w-full h-full mx-auto flex flex-col ${isFullscreen ? 'max-w-6xl' : 'max-w-4xl px-6 md:px-8 pt-12 space-y-6'}`}>

        {/* 1. HEADER & PESQUISA (NÃO-EDITOR) */}
        {view !== 'editor' && !isFullscreen && (
          <header className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {view === 'notes' && <button onClick={handleBack} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"><ChevronLeft size={24}/></button>}
                <h1 className="text-3xl font-black tracking-tight">{view === 'notebooks' ? 'Seus Cadernos' : activeNotebook?.name}</h1>
              </div>
              {view === 'notebooks' && (unlockedNotebooks.length > 0 || unlockedNotes.length > 0) && (
                <button onClick={lockAll} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 text-xs font-bold hover:bg-amber-500/20 transition-colors"><Lock size={14} /> Trancar Sessão</button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input type="text" placeholder={view === 'notebooks' ? "Pesquisar cadernos..." : "Pesquisar notas..."} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors font-medium" />
            </div>
          </header>
        )}

        {/* 2. VISUALIZAÇÃO DE CADERNOS */}
        {view === 'notebooks' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <button onClick={() => setNbModalOpen(true)} className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all h-40">
              <Plus size={32} /><span className="font-bold text-sm">Novo Caderno</span>
            </button>
            {filteredNotebooks.map(nb => {
              const isLocked = nb.isLocked && !unlockedNotebooks.includes(nb.id);
              return (
                <div key={nb.id} className="relative group">
                  <button onClick={() => handleOpenNotebook(nb)} className={`w-full h-40 flex flex-col items-start justify-between p-5 rounded-3xl border transition-all hover:scale-105 shadow-sm ${colorStyles[nb.color].nb}`}>
                    <div className={`w-10 h-10 rounded-full bg-white/50 dark:bg-black/20 flex items-center justify-center backdrop-blur-sm shadow-sm ${colorStyles[nb.color].hex}`}>{nb.isLocked ? <Lock size={18} /> : <FileText size={18} />}</div>
                    <div className="text-left"><h4 className="font-black text-lg truncate w-full">{isLocked ? 'Cadeado' : nb.name}</h4><span className="text-[10px] uppercase tracking-widest opacity-70 font-bold">{notes.filter(n => n.notebookId === nb.id).length} notas</span></div>
                  </button>
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isLocked && (<><button onClick={(e) => { e.stopPropagation(); nb.isLocked ? removeLock(nb.id, true) : setPasswordModal({ isOpen: true, type: 'set_nb_lock', targetId: nb.id }); }} className="p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors">{nb.isLocked ? <Unlock size={14}/> : <Lock size={14}/>}</button>{nb.id !== 'default' && (<button onClick={(e) => { e.stopPropagation(); deleteNotebook(nb.id); }} className="p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14}/></button>)}</>)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 3. VISUALIZAÇÃO DE NOTAS DO CADERNO */}
        {view === 'notes' && activeNotebook && (
          <div className="space-y-4">
             <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{filteredNotes.length} Notas Encontradas</span>
                <button onClick={handleCreateNote} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md ${colorStyles[activeNotebook.color].nb.split(' ')[0].replace('/20', '').replace('/30', '')}`}><Plus size={16}/> Criar Nota</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNotes.map(note => {
                  const isLocked = note.isLocked && !unlockedNotes.includes(note.id);
                  return (
                    <div key={note.id} className="relative group">
                      <button onClick={() => handleOpenNote(note)} className={`w-full p-5 rounded-2xl border text-left transition-all hover:border-current shadow-sm ${colorStyles[activeNotebook.color].note}`}>
                        <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 line-clamp-1">{note.title || 'Sem Título'}</h4>{note.isLocked && <Lock size={14} className="text-amber-500 shrink-0 mt-1" />}</div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[2.5rem]">{isLocked ? '••••••••••••••••' : (note.format === 'markdown' ? note.content : note.content.replace(/<[^>]*>?/gm, ''))}</p>
                        <span className="text-[10px] font-bold text-zinc-400 mt-4 block uppercase tracking-widest">{format(note.updatedAt, "dd/MM/yyyy HH:mm")}</span>
                      </button>
                      <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isLocked && (<button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="p-2 bg-red-100 text-red-500 dark:bg-red-900/30 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14}/></button>)}
                      </div>
                    </div>
                  )
                })}
             </div>
          </div>
        )}

        {/* 4. VISUALIZAÇÃO DO EDITOR IMERSIVO */}
        {view === 'editor' && activeNote && activeNotebook && (
          <div className="flex flex-col flex-1 h-full min-h-0 relative">
            
            {/* Barra de Topo Adaptável */}
            {!isFullscreen && (
                <div className={`flex flex-wrap items-center justify-between gap-4 p-2 mb-4 rounded-2xl border ${colorStyles[activeNotebook.color].note}`}>
                   <div className="flex items-center gap-1">
                     <button onClick={handleBack} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"><ChevronLeft size={20}/></button>
                     <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1" />
                     <button onClick={() => { setNoteFormat(noteFormat === 'richtext' ? 'markdown' : 'richtext'); setIsEditing(true); }} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">{noteFormat === 'richtext' ? 'Rich Text' : 'Markdown'}</button>
                     <select value={noteFont} onChange={(e) => setNoteFont(e.target.value as NoteFont)} className="bg-transparent text-sm font-bold outline-none text-zinc-600 dark:text-zinc-300 cursor-pointer ml-2">
                       <option value="sans">Sans</option><option value="serif">Serif</option><option value="handwriting">Manual</option>
                     </select>
                   </div>
                   <div className="flex items-center gap-1 pr-2">
                     <button onClick={() => setIsFullscreen(true)} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Maximize2 size={18}/></button>
                     <button onClick={() => setNoteLines(!noteLines)} className={`p-2 rounded-lg transition-colors ${noteLines ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} title="Pautas"><AlignLeft size={18}/></button>
                     <button onClick={() => { activeNote.isLocked ? removeLock(activeNote.id, false) : setPasswordModal({ isOpen: true, type: 'set_note_lock', targetId: activeNote.id }) }} className={`p-2 rounded-lg ${activeNote.isLocked ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-400'}`}>{activeNote.isLocked ? <Lock size={18}/> : <Unlock size={18}/>}</button>
                   </div>
                </div>
            )}

            {/* CONTROLES FLUTUANTES NO FULLSCREEN */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-4 bg-zinc-900/90 dark:bg-zinc-100/90 text-white dark:text-black px-6 py-2.5 rounded-full shadow-2xl backdrop-blur-xl border border-white/20 dark:border-black/20">
                        <button onClick={handleBack} className="p-1 hover:opacity-70"><ChevronLeft size={22}/></button>
                        <div className="w-px h-5 bg-current opacity-20" />
                        <h4 className="text-xs font-black uppercase tracking-widest max-w-[120px] truncate">{activeNote.title || 'Nota'}</h4>
                        <div className="w-px h-5 bg-current opacity-20" />
                        <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${isEditing ? 'bg-blue-500 text-white' : 'bg-transparent border border-current opacity-70'}`}>
                           {isEditing ? <Eye size={12}/> : <PenLine size={12}/>} {isEditing ? 'Visualizar' : 'Editar'}
                        </button>
                        <button onClick={() => setIsFullscreen(false)} className="p-1 hover:opacity-70"><Minimize2 size={20}/></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* BARRA DE EDIÇÃO (DINÂMICA) */}
            <AnimatePresence>
                {(isEditing || isFullscreen) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 mb-4 pb-2 px-2 ${isFullscreen ? 'pt-20' : ''}`}>
                       <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                          {!isFullscreen && (
                              <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!isEditing ? 'bg-blue-500/10 text-blue-500' : 'text-zinc-500'}`}>
                                {isEditing ? <Eye size={16}/> : <PenLine size={16}/>} {isEditing ? 'Ver' : 'Editar'}
                              </button>
                          )}
                          {noteFormat === 'richtext' && isEditing && (
                              <>
                                <button onClick={() => execCmd('bold')} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Bold size={16}/></button>
                                <button onClick={() => execCmd('italic')} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Italic size={16}/></button>
                                <button onClick={() => execCmd('underline')} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Underline size={16}/></button>
                                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 self-center" />
                                <button onClick={() => execCmd('insertUnorderedList')} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><List size={16}/></button>
                                <button onClick={() => execCmd('insertOrderedList')} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><ListOrdered size={16}/></button>
                              </>
                          )}
                       </div>
                       {isEditing && (
                           <button onClick={handleManualSave} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black hover:opacity-90'}`}>
                              {saveStatus === 'saved' ? <Check size={14} /> : <Save size={14} />} {saveStatus === 'saved' ? 'Salvo' : 'Salvar'}
                           </button>
                       )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ÁREA DE TEXTO EXPANSÍVEL */}
            <div className={`flex-1 flex flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-inner editor-content overflow-hidden ${colorStyles[activeNotebook.color].note}`}>
              <input type="text" placeholder="Título da Nota" readOnly={!isEditing} value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className={`w-full px-8 pt-8 pb-4 bg-transparent outline-none text-3xl font-black placeholder:text-zinc-300 dark:placeholder:text-zinc-700 ${noteFont === 'handwriting' ? 'font-handwriting' : noteFont === 'serif' ? 'font-serif' : 'font-sans'}`} />
              
              <div className={`flex-1 px-8 pb-8 relative overflow-y-auto scrollbar-thin ${noteLines ? 'bg-lined-paper' : ''}`}>
                {noteFormat === 'markdown' ? (
                  !isEditing ? (
                     <div dangerouslySetInnerHTML={{ __html: parseMarkdown(noteContent) }} className={`w-full h-full bg-transparent outline-none leading-relaxed text-zinc-700 dark:text-zinc-300 ${noteFont === 'handwriting' ? 'font-handwriting text-xl' : noteFont === 'serif' ? 'font-serif text-lg' : 'font-sans text-base'}`} />
                  ) : (
                     <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Escreva aqui em Markdown..." className={`w-full min-h-full bg-transparent outline-none resize-none leading-relaxed text-zinc-700 dark:text-zinc-300 ${noteFont === 'handwriting' ? 'font-handwriting text-xl' : noteFont === 'serif' ? 'font-serif text-lg' : 'font-sans text-base'}`} />
                  )
                ) : (
                  <div ref={editorRef} contentEditable={isEditing} suppressContentEditableWarning onInput={() => { if(editorRef.current) setNoteContent(editorRef.current.innerHTML); }} className={`w-full min-h-full bg-transparent outline-none text-zinc-700 dark:text-zinc-300 ${noteFont === 'handwriting' ? 'font-handwriting text-xl' : noteFont === 'serif' ? 'font-serif text-lg' : 'font-sans text-base'}`} />
                )}
                {isEditing && noteContent === '' && (
                  <div className="absolute top-0 left-8 pointer-events-none text-zinc-300 dark:text-zinc-700 font-medium">Comece a escrever...</div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL DE CRIAÇÃO DE CADERNO */}
      <AnimatePresence>
        {isNbModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xl font-black mb-4">Novo Caderno</h3>
              <input type="text" maxLength={20} placeholder="Nome do Caderno" value={nbName} onChange={e => setNbName(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl outline-none font-bold mb-6" autoFocus />
              <span className="text-xs font-bold uppercase text-zinc-500 mb-3 block">Cor Temática</span>
              <div className="flex gap-2 mb-8">
                {(Object.keys(colorStyles) as ItemColor[]).map(c => (
                  <button key={c} onClick={() => setNbColor(c)} className={`w-8 h-8 rounded-full bg-${c}-500 transition-transform ${nbColor === c ? 'scale-125 ring-2 ring-zinc-900 dark:ring-zinc-100' : 'opacity-70'}`} />
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setNbModalOpen(false)} className="flex-1 p-4 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800">Cancelar</button>
                <button onClick={handleCreateNotebook} disabled={!nbName.trim()} className="flex-1 p-4 rounded-xl font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black disabled:opacity-50">Criar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {passwordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
              <Lock size={48} className="mx-auto text-amber-500 mb-6" />
              <h3 className="text-xl font-black mb-2">{passwordModal.type.startsWith('unlock') ? 'Acesso Restrito' : 'Criar Senha'}</h3>
              <input type="password" placeholder="Senha" value={passInput} onChange={e => setPassInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitPassword()} className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl outline-none font-bold text-center mb-2" autoFocus />
              {passError && <p className="text-red-500 text-xs font-bold mb-4">{passError}</p>}
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setPasswordModal(null); setPassInput(''); setPassError(''); }} className="flex-1 p-4 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800">Cancelar</button>
                <button onClick={submitPassword} className="flex-1 p-4 rounded-xl font-bold bg-amber-500 text-white">Confirmar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};