import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Lock, Unlock, ChevronLeft, AlignLeft, Bold, Italic, Underline, List, ListOrdered, FileText, Trash2, Settings2, Palette } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import type { Notebook, Note, ItemColor, NoteFont, NoteFormat } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const colorStyles: Record<ItemColor, { nb: string; note: string; hex: string }> = {
  blue: { nb: 'bg-blue-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400', note: 'bg-blue-500/5 border-blue-500/10', hex: 'text-blue-500' },
  emerald: { nb: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400', note: 'bg-emerald-500/5 border-emerald-500/10', hex: 'text-emerald-500' },
  amber: { nb: 'bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400', note: 'bg-amber-500/5 border-amber-500/10', hex: 'text-amber-500' },
  rose: { nb: 'bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400', note: 'bg-rose-500/5 border-rose-500/10', hex: 'text-rose-500' },
  purple: { nb: 'bg-purple-500/20 border-purple-500/30 text-purple-600 dark:text-purple-400', note: 'bg-purple-500/5 border-purple-500/10', hex: 'text-purple-500' },
  cyan: { nb: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-600 dark:text-cyan-400', note: 'bg-cyan-500/5 border-cyan-500/10', hex: 'text-cyan-500' },
  indigo: { nb: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-600 dark:text-indigo-400', note: 'bg-indigo-500/5 border-indigo-500/10', hex: 'text-indigo-500' },
  zinc: { nb: 'bg-zinc-500/20 border-zinc-500/30 text-zinc-600 dark:text-zinc-400', note: 'bg-zinc-500/5 border-zinc-500/10', hex: 'text-zinc-500' }
};

export const NotesDashboard = () => {
  const { notebooks, notes, unlockedNotebooks, unlockedNotes, addNotebook, updateNotebook, deleteNotebook, addNote, updateNote, deleteNote, unlockNotebook, unlockNote } = useNoteStore();

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
  const editorRef = useRef<HTMLDivElement>(null);

  // --- NAVEGAÇÃO E FILTROS ---
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
      setActiveNote(note); setNoteTitle(note.title); setNoteContent(note.content); setNoteFormat(note.format); setNoteFont(note.font); setNoteLines(note.hasLines); setView('editor');
    }
  };

  const handleBack = () => {
    if (view === 'editor') {
      saveNote(); setActiveNote(null); setView('notes');
    } else if (view === 'notes') {
      setActiveNotebook(null); setView('notebooks'); setSearch('');
    }
  };

  // --- CRIAR CADERNO ---
  const handleCreateNotebook = () => {
    if (!nbName.trim()) return;
    addNotebook({ id: uuidv4(), name: nbName, color: nbColor, isLocked: false, createdAt: Date.now() });
    setNbModalOpen(false); setNbName(''); setNbColor('zinc');
  };

  // --- CRIAR / SALVAR NOTA ---
  const handleCreateNote = () => {
    if (!activeNotebook) return;
    const newNote: Note = { id: uuidv4(), notebookId: activeNotebook.id, title: '', content: '', format: 'richtext', font: 'sans', hasLines: false, isLocked: false, createdAt: Date.now(), updatedAt: Date.now() };
    addNote(newNote);
    setActiveNote(newNote); setNoteTitle(''); setNoteContent(''); setNoteFormat('richtext'); setNoteFont('sans'); setNoteLines(false); setView('editor');
  };

  const saveNote = () => {
    if (!activeNote) return;
    const currentHtml = noteFormat === 'richtext' && editorRef.current ? editorRef.current.innerHTML : noteContent;
    if (!noteTitle.trim() && !currentHtml.trim()) {
      deleteNote(activeNote.id); return; // Deleta nota vazia
    }
    updateNote(activeNote.id, { title: noteTitle, content: currentHtml, format: noteFormat, font: noteFont, hasLines: noteLines });
  };

  // Autosalvar ao desmontar
  useEffect(() => {
    return () => { if (view === 'editor') saveNote(); };
  }, [view, noteTitle, noteContent, noteFormat, noteFont, noteLines]);

  // Sincronizar editor de Rich Text quando abre a nota
  useEffect(() => {
    if (view === 'editor' && noteFormat === 'richtext' && editorRef.current) {
      if (editorRef.current.innerHTML !== noteContent) editorRef.current.innerHTML = noteContent;
    }
  }, [view, noteFormat]);

  // --- SISTEMA DE SENHAS ---
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
      unlockNotebook(targetId, passInput); // Auto-desbloqueia ao criar
      setPasswordModal(null); setPassInput('');
    } else if (type === 'set_note_lock') {
      if (passInput.length < 4) { setPassError('Mínimo de 4 caracteres.'); return; }
      updateNote(targetId, { isLocked: true, password: passInput });
      unlockNote(targetId, passInput); // Auto-desbloqueia ao criar
      setPasswordModal(null); setPassInput('');
    }
  };

  const removeLock = (id: string, isNotebook: boolean) => {
    if (isNotebook) updateNotebook(id, { isLocked: false, password: '' });
    else updateNote(id, { isLocked: false, password: '' });
  };

  // --- FERRAMENTAS DO EDITOR (RICH TEXT) ---
  const execCmd = (cmd: string) => { document.execCommand(cmd, false); editorRef.current?.focus(); };

  // --- RENDERIZAÇÃO ---
  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 pb-32 transition-colors">
      <div className="max-w-4xl mx-auto px-6 md:px-8 pt-12 space-y-6">

        {/* HEADER & PESQUISA (Oculto no modo Editor) */}
        {view !== 'editor' && (
          <header className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {view === 'notes' && <button onClick={handleBack} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"><ChevronLeft size={24}/></button>}
                <h1 className="text-3xl font-black tracking-tight">{view === 'notebooks' ? 'Seus Cadernos' : activeNotebook?.name}</h1>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input type="text" placeholder={view === 'notebooks' ? "Pesquisar cadernos..." : "Pesquisar notas..."} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors font-medium" />
            </div>
          </header>
        )}

        {/* 1. VISUALIZAÇÃO DE CADERNOS */}
        {view === 'notebooks' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <button onClick={() => setNbModalOpen(true)} className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all h-40">
              <Plus size={32} />
              <span className="font-bold text-sm">Novo Caderno</span>
            </button>
            
            {filteredNotebooks.map(nb => {
              const isLocked = nb.isLocked && !unlockedNotebooks.includes(nb.id);
              return (
                <div key={nb.id} className="relative group">
                  <button onClick={() => handleOpenNotebook(nb)} className={`w-full h-40 flex flex-col items-start justify-between p-5 rounded-3xl border transition-all hover:scale-105 shadow-sm ${colorStyles[nb.color].nb}`}>
                    <div className="w-full flex justify-between items-start">
                      <div className={`w-10 h-10 rounded-full bg-white/50 dark:bg-black/20 flex items-center justify-center backdrop-blur-sm shadow-sm ${colorStyles[nb.color].hex}`}>
                        {nb.isLocked ? <Lock size={18} /> : <FileText size={18} />}
                      </div>
                    </div>
                    <div className="text-left">
                      <h4 className="font-black text-lg truncate w-full">{isLocked ? 'Cadeado' : nb.name}</h4>
                      <span className="text-[10px] uppercase tracking-widest opacity-70 font-bold">{notes.filter(n => n.notebookId === nb.id).length} notas</span>
                    </div>
                  </button>
                  {/* Menu Contextual do Caderno (Aparece no hover no Desktop, ou fixo no topo direito) */}
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isLocked && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); nb.isLocked ? removeLock(nb.id, true) : setPasswordModal({ isOpen: true, type: 'set_nb_lock', targetId: nb.id }); }} className="p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors">
                          {nb.isLocked ? <Unlock size={14}/> : <Lock size={14}/>}
                        </button>
                        {nb.id !== 'default' && (
                          <button onClick={(e) => { e.stopPropagation(); deleteNotebook(nb.id); }} className="p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14}/></button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 2. VISUALIZAÇÃO DE NOTAS DO CADERNO */}
        {view === 'notes' && activeNotebook && (
          <div className="space-y-4">
             <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{filteredNotes.length} Notas Encontradas</span>
                <button onClick={handleCreateNote} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md ${colorStyles[activeNotebook.color].nb.split(' ')[0].replace('/20', '')}`}>
                  <Plus size={16}/> Criar Nota
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNotes.map(note => {
                  const isLocked = note.isLocked && !unlockedNotes.includes(note.id);
                  return (
                    <div key={note.id} className="relative group">
                      <button onClick={() => handleOpenNote(note)} className={`w-full p-5 rounded-2xl border text-left transition-all hover:border-current shadow-sm ${colorStyles[activeNotebook.color].note}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 line-clamp-1">{isLocked ? 'Nota Protegida' : (note.title || 'Sem Título')}</h4>
                          {note.isLocked && <Lock size={14} className="text-amber-500 shrink-0 mt-1" />}
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[2.5rem]">
                          {isLocked ? '••••••••••••••••' : (note.format === 'markdown' ? note.content : note.content.replace(/<[^>]*>?/gm, ''))}
                        </p>
                        <span className="text-[10px] font-bold text-zinc-400 mt-4 block uppercase tracking-widest">
                          {format(note.updatedAt, "dd/MM/yyyy HH:mm")}
                        </span>
                      </button>
                      <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isLocked && (
                          <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="p-2 bg-red-100 text-red-500 dark:bg-red-900/30 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14}/></button>
                        )}
                      </div>
                    </div>
                  )
                })}
             </div>
          </div>
        )}

        {/* 3. VISUALIZAÇÃO DO EDITOR */}
        {view === 'editor' && activeNote && activeNotebook && (
          <div className="flex flex-col h-[75vh]">
            {/* Editor Toolbar */}
            <div className={`flex flex-wrap items-center justify-between gap-4 p-2 mb-4 rounded-2xl border ${colorStyles[activeNotebook.color].note}`}>
               <div className="flex items-center gap-1">
                 <button onClick={handleBack} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"><ChevronLeft size={20}/></button>
                 <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1" />
                 
                 {/* Format Toggle */}
                 <button onClick={() => setNoteFormat(noteFormat === 'richtext' ? 'markdown' : 'richtext')} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white">
                   {noteFormat === 'richtext' ? 'Rich Text' : 'Markdown'}
                 </button>
                 
                 {/* Font Select */}
                 <select value={noteFont} onChange={(e) => setNoteFont(e.target.value as NoteFont)} className="bg-transparent text-sm font-bold outline-none text-zinc-600 dark:text-zinc-300 cursor-pointer">
                   <option value="sans">Sans</option>
                   <option value="serif">Serif</option>
                   <option value="handwriting">Manual</option>
                 </select>
               </div>

               <div className="flex items-center gap-1 pr-2">
                 {/* Lined Paper Toggle */}
                 <button onClick={() => setNoteLines(!noteLines)} className={`p-2 rounded-lg transition-colors ${noteLines ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`} title="Pautas"><AlignLeft size={18}/></button>
                 
                 {/* Lock Toggle */}
                 <button onClick={() => { activeNote.isLocked ? removeLock(activeNote.id, false) : setPasswordModal({ isOpen: true, type: 'set_note_lock', targetId: activeNote.id }) }} className={`p-2 rounded-lg transition-colors ${activeNote.isLocked ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`} title={activeNote.isLocked ? 'Remover Senha' : 'Proteger com Senha'}>
                   {activeNote.isLocked ? <Lock size={18}/> : <Unlock size={18}/>}
                 </button>
               </div>
            </div>

            {/* Rich Text Controls */}
            <AnimatePresence>
              {noteFormat === 'richtext' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide border-b border-zinc-100 dark:border-zinc-900 pb-2">
                  <button onClick={() => execCmd('bold')} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Bold size={16}/></button>
                  <button onClick={() => execCmd('italic')} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Italic size={16}/></button>
                  <button onClick={() => execCmd('underline')} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Underline size={16}/></button>
                  <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 self-center" />
                  <button onClick={() => execCmd('insertUnorderedList')} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><List size={16}/></button>
                  <button onClick={() => execCmd('insertOrderedList')} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><ListOrdered size={16}/></button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Editor Area */}
            <div className={`flex-1 flex flex-col rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner ${colorStyles[activeNotebook.color].note} ${noteLines ? 'bg-lined-paper' : ''}`}>
              <input type="text" placeholder="Título da Nota" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className={`w-full px-8 pt-8 pb-4 bg-transparent outline-none text-3xl font-black placeholder:text-zinc-300 dark:placeholder:text-zinc-700 ${noteFont === 'handwriting' ? 'font-handwriting' : noteFont === 'serif' ? 'font-serif' : 'font-sans'}`} />
              
              <div className="flex-1 px-8 pb-8 relative">
                {noteFormat === 'markdown' ? (
                  <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Escreva aqui em Markdown..." className={`w-full h-full bg-transparent outline-none resize-none leading-relaxed text-zinc-700 dark:text-zinc-300 ${noteFont === 'handwriting' ? 'font-handwriting text-xl' : noteFont === 'serif' ? 'font-serif text-lg' : 'font-sans text-base'} ${noteLines ? 'leading-[32px]' : ''}`} />
                ) : (
                  <div ref={editorRef} onBlur={() => { if(editorRef.current) setNoteContent(editorRef.current.innerHTML); }} contentEditable suppressContentEditableWarning className={`w-full h-full bg-transparent outline-none leading-relaxed text-zinc-700 dark:text-zinc-300 overflow-y-auto ${noteFont === 'handwriting' ? 'font-handwriting text-xl' : noteFont === 'serif' ? 'font-serif text-lg' : 'font-sans text-base'} ${noteLines ? 'leading-[32px]' : ''}`} />
                )}
                {/* Placeholder para Rich Text Vazio */}
                {noteFormat === 'richtext' && noteContent === '' && (
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xl font-black mb-4">Novo Caderno</h3>
              <input type="text" maxLength={20} placeholder="Nome do Caderno" value={nbName} onChange={e => setNbName(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl outline-none font-bold mb-6" autoFocus />
              
              <span className="text-xs font-bold uppercase text-zinc-500 mb-3 block">Cor Temática</span>
              <div className="flex gap-2 mb-8">
                {(Object.keys(colorStyles) as ItemColor[]).map(c => (
                  <button key={c} onClick={() => setNbColor(c)} className={`w-8 h-8 rounded-full bg-${c}-500 transition-transform ${nbColor === c ? 'scale-125 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-zinc-900 dark:ring-zinc-100' : 'hover:scale-110 opacity-70'}`} />
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setNbModalOpen(false)} className="flex-1 p-4 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                <button onClick={handleCreateNotebook} disabled={!nbName.trim()} className="flex-1 p-4 rounded-xl font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black hover:opacity-90 disabled:opacity-50 transition-opacity">Criar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE SENHAS (UNLOCK / SET LOCK) */}
      <AnimatePresence>
        {passwordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
              <Lock size={48} className="mx-auto text-amber-500 mb-6" />
              <h3 className="text-xl font-black mb-2 text-zinc-900 dark:text-zinc-100">
                {passwordModal.type.startsWith('unlock') ? 'Acesso Restrito' : 'Criar Senha'}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                {passwordModal.type.startsWith('unlock') ? 'Insira a senha para abrir.' : 'Defina uma senha para proteger este item.'}
              </p>
              
              <input type="password" placeholder="Senha" value={passInput} onChange={e => setPassInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitPassword()} className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl outline-none font-bold text-center tracking-widest mb-2" autoFocus />
              {passError && <p className="text-red-500 text-xs font-bold mb-4">{passError}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setPasswordModal(null); setPassInput(''); setPassError(''); }} className="flex-1 p-4 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                <button onClick={submitPassword} className="flex-1 p-4 rounded-xl font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors">Confirmar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};