import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Lock, Unlock, ChevronLeft, AlignLeft, Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Code, List, ListOrdered, FileText, Trash2, Check, Eye, PenLine, Maximize2, Minimize2, Undo, Redo, FileSearch, FolderInput, Edit2, AlertTriangle, X, ChevronDown, Star, Pin, Info, Terminal, HelpCircle } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useConfigStore, useBackHandler } from '../../store/useConfigStore';
import { ShortcutModal } from './ShortcutModal';
import type { Notebook, Note, ItemColor, NoteFont, NoteFormat } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const colorPickerClasses: Record<ItemColor, string> = {
  blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', purple: 'bg-purple-500', cyan: 'bg-cyan-500',
  indigo: 'bg-indigo-500', zinc: 'bg-zinc-500'
};

const parseMarkdown = (text: string) => {
    if (!text) return '';
    let html = text;

    html = html.replace(/`{3}([\s\S]*?)`{3}/g, '<pre class="bg-black/5 dark:bg-white/5 p-4 rounded-xl my-4 font-mono text-sm overflow-x-auto border border-zinc-200 dark:border-zinc-800 shadow-inner"><code>$1</code></pre>');
    html = html.replace(/`([^`\n]+)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-sm font-mono text-emerald-600 dark:text-emerald-400 border border-zinc-200 dark:border-zinc-700">$1</code>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black mt-10 mb-5 tracking-tight">$1</h1>');
    html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-[4px] border-blue-500 pl-4 italic opacity-80 my-4 bg-blue-500/5 py-2 rounded-r-xl">$1</blockquote>');
    html = html.replace(/^(---| \*\*\*)$/gim, '<hr class="my-8 border-t-2 border-dashed border-zinc-300 dark:border-zinc-700" />');
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-600 underline underline-offset-2">$1</a>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>');
    html = html.replace(/\*(.*?)\*/gim, '<i>$1</i>');
    html = html.replace(/~~(.*?)~~/gim, '<strike>$1</strike>');
    html = html.replace(/^\s*[-*+] (.*$)/gim, '<div class="ml-6 list-item my-1" style="display: list-item; list-style-type: disc;">$1</div>');
    html = html.replace(/^\s*\d+\. (.*$)/gim, '<div class="ml-6 list-item my-1" style="display: list-item; list-style-type: decimal;">$1</div>');
    
    const segments = html.split(/(<pre[\s\S]*?<\/pre>)/);
    html = segments.map((seg, i) => {
        if (i % 2 === 1) return seg; 
        return seg.replace(/\n/g, '<br/>');
    }).join('');

    return html;
};

const htmlToMarkdown = (html: string) => {
    if (!html) return '';
    let md = html;
    
    md = md.replace(/<div[^>]*>/gi, '\n');
    md = md.replace(/<\/div>/gi, '');
    md = md.replace(/<p[^>]*>/gi, '\n');
    md = md.replace(/<\/p>/gi, '\n');
    md = md.replace(/<br\s*[\/]?>/gi, '\n');
    
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
    
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
    md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
    
    md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n');
    md = md.replace(/<hr[^>]*>/gi, '\n---\n');
    
    md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n' + '`'.repeat(3) + '\n$1\n' + '`'.repeat(3) + '\n');
    md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<div[^>]*list-style-type:\s*disc[^>]*>(.*?)<\/div>/gi, '- $1\n');
    md = md.replace(/<div[^>]*list-style-type:\s*decimal[^>]*>(.*?)<\/div>/gi, '1. $1\n');
    
    md = md.replace(/<ul[^>]*>/gi, '\n'); md = md.replace(/<\/ul>/gi, '\n');
    md = md.replace(/<ol[^>]*>/gi, '\n'); md = md.replace(/<\/ol>/gi, '\n');
    
    md = md.replace(/<(?!u|\/u)[^>]+>/g, '');
    md = md.replace(/\n{3,}/g, '\n\n');
    
    const textarea = document.createElement("textarea");
    textarea.innerHTML = md;
    return textarea.value.trim();
};

const getHighlightedContent = (html: string, query: string) => {
    if (!query.trim()) return { html, count: 0 };
    try {
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${safeQuery})(?![^<]*>)`, 'gi');
        const count = (html.match(regex) || []).length;
        const highlighted = html.replace(regex, '<mark style="background-color: #fbbf24; color: #451a03; font-weight: bold; padding: 0 2px; border-radius: 4px;">$1</mark>');
        return { html: highlighted, count };
    } catch (e) {
        return { html, count: 0 };
    }
};

export const NotesDashboard = () => {
  const { notebooks, notes, unlockedNotebooks, unlockedNotes, addNotebook, updateNotebook, deleteNotebook, addNote, updateNote, deleteNote, unlockNotebook, unlockNote, lockAll } = useNoteStore();
  const { isGlobalModalOpen, isRoutineModalOpen, isFocusModeOpen } = useTaskStore();
  const { isSettingsOpen, isVisionOpen, isGoogleConnectOpen, isChangelogOpen, isExitModalOpen } = useConfigStore();

  const [view, setView] = useState<'notebooks' | 'notes' | 'editor'>('notebooks');
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');

  const [isNbModalOpen, setNbModalOpen] = useState(false);
  const [nbToEdit, setNbToEdit] = useState<Notebook | null>(null);
  const [nbName, setNbName] = useState('');
  const [nbColor, setNbColor] = useState<ItemColor>('zinc');

  const [confirmDialog, setConfirmDialog] = useState<{ type: 'notebook' | 'note'; id: string } | null>(null);
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; type: 'unlock_nb' | 'unlock_note' | 'set_nb_lock' | 'set_note_lock'; targetId: string } | null>(null);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState('');

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteFormat, setNoteFormat] = useState<NoteFormat>('richtext');
  const [noteFont, setNoteFont] = useState<NoteFont>('sans');
  const [noteLines, setNoteLines] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle'); 
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [showInNoteSearch, setShowInNoteSearch] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');

  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<{title: string, desc: string} | null>(null);
  const [isShortcutOpen, setShortcutOpen] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false); 

  const editorRef = useRef<HTMLDivElement>(null);
  const noteSearchRef = useRef<HTMLInputElement>(null);

  // === SISTEMA DA BARRA FLUTUANTE ===
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

  useEffect(() => {
     const el = toolbarRef.current;
     if (!el) return;
     const observer = new IntersectionObserver(([entry]) => {
         setIsToolbarVisible(entry.isIntersecting);
     }, { threshold: 0 });
     observer.observe(el);
     return () => observer.disconnect();
  }, [view, isEditing, noteFormat, isFullscreen]);

  const filteredNotebooks = notebooks.filter(nb => nb.name.toLowerCase().includes(search.toLowerCase()));
  
  const filteredNotes = activeNotebook ? notes.filter(n => n.notebookId === activeNotebook.id && (n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
    }) : [];

  const favoriteNotes = notes.filter(n => n.isFavorite && (n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => b.updatedAt - a.updatedAt);

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
      setIsEditing(false); setIsFullscreen(false); setShowInNoteSearch(false); setNoteSearchQuery(''); setView('editor');
    }
  };

  const handleOpenFavoriteNote = (note: Note) => {
      const nb = notebooks.find(n => n.id === note.notebookId);
      if (!nb) return;
      if (nb.isLocked && !unlockedNotebooks.includes(nb.id)) {
          setPasswordModal({ isOpen: true, type: 'unlock_nb', targetId: nb.id });
          return;
      }
      setActiveNotebook(nb);
      handleOpenNote(note);
  };

  const handleBack = () => {
    if (view === 'editor') {
      saveNote(true);
      setActiveNote(null); setView('notes'); setIsFullscreen(false); setShowInNoteSearch(false); setNoteSearchQuery('');
    } else if (view === 'notes') {
      setActiveNotebook(null); setView('notebooks'); setSearch('');
    }
  };

  const openNbModal = (nb?: Notebook) => {
    if (nb) { setNbToEdit(nb); setNbName(nb.name); setNbColor(nb.color); } 
    else { setNbToEdit(null); setNbName(''); setNbColor('zinc'); }
    setNbModalOpen(true);
  };

  const handleSaveNotebook = () => {
    if (!nbName.trim()) return;
    if (nbToEdit) { updateNotebook(nbToEdit.id, { name: nbName, color: nbColor }); } 
    else { addNotebook({ id: uuidv4(), name: nbName, color: nbColor, isLocked: false, createdAt: Date.now() }); }
    setNbModalOpen(false); setNbName(''); setNbColor('zinc'); setNbToEdit(null);
  };

  const handleCreateNote = () => {
    if (!activeNotebook) return;
    const newNote: Note = { id: uuidv4(), notebookId: activeNotebook.id, title: '', content: '', format: 'richtext', font: 'sans', hasLines: false, isLocked: false, createdAt: Date.now(), updatedAt: Date.now() };
    addNote(newNote);
    setActiveNote(newNote); setNoteTitle(''); setNoteContent(''); setNoteFormat('richtext'); setNoteFont('sans'); setNoteLines(false); 
    setIsEditing(true); setIsFullscreen(false); setShowInNoteSearch(false); setNoteSearchQuery(''); setView('editor');
  };

  const toggleFormat = () => {
    if (noteFormat === 'richtext') {
       const md = htmlToMarkdown(noteContent);
       setNoteContent(md);
       setNoteFormat('markdown');
    } else {
       const html = parseMarkdown(noteContent);
       setNoteContent(html);
       setNoteFormat('richtext');
    }
    setIsEditing(true);
    setShowInNoteSearch(false);
    setNoteSearchQuery('');
  };

  const saveNote = (isClosing = false) => {
    if (!activeNote) return;
    const currentHtml = noteContent;
    const isEmpty = !noteTitle.trim() && (!currentHtml.trim() || currentHtml === '<br>' || currentHtml === '<div><br></div>');

    if (isClosing && isEmpty) { deleteNote(activeNote.id); return; }
    updateNote(activeNote.id, { title: noteTitle, content: currentHtml, format: noteFormat, font: noteFont, hasLines: noteLines });
  };

  useEffect(() => {
    if (view !== 'editor' || !activeNote || !isEditing) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveNote(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
    return () => clearTimeout(timer);
  }, [noteTitle, noteContent, noteFormat, noteFont, noteLines, isEditing, activeNote?.id]);

  useEffect(() => {
    if (view === 'editor' && noteFormat === 'richtext' && isEditing && editorRef.current) {
      if (document.activeElement !== editorRef.current) {
          editorRef.current.innerHTML = noteContent;
      }
    }
  }, [view, noteFormat, isEditing, activeNote?.id, isFullscreen, noteContent]);

  const confirmDelete = () => {
    if (confirmDialog?.type === 'notebook') {
      deleteNotebook(confirmDialog.id);
      if (activeNotebook?.id === confirmDialog.id) { setActiveNotebook(null); setView('notebooks'); }
    } else if (confirmDialog?.type === 'note') {
      deleteNote(confirmDialog.id);
      if (activeNote?.id === confirmDialog.id) { setActiveNote(null); setView('notes'); setIsFullscreen(false); }
    }
    setConfirmDialog(null);
  };

  const submitPassword = () => {
    if (!passwordModal) return;
    const { type, targetId } = passwordModal;
    if (type === 'unlock_nb') {
      if (unlockNotebook(targetId, passInput)) { setPasswordModal(null); setPassInput(''); handleOpenNotebook(notebooks.find(n => n.id === targetId)!); } else setPassError('Senha incorreta.');
    } else if (type === 'unlock_note') {
      if (unlockNote(targetId, passInput)) { setPasswordModal(null); setPassInput(''); handleOpenNote(notes.find(n => n.id === targetId)!); } else setPassError('Senha incorreta.');
    } else if (type === 'set_nb_lock') {
      if (passInput.length < 4) { setPassError('Mínimo de 4 caracteres.'); return; }
      updateNotebook(targetId, { isLocked: true, password: passInput }); unlockNotebook(targetId, passInput); setPasswordModal(null); setPassInput('');
    } else if (type === 'set_note_lock') {
      if (passInput.length < 4) { setPassError('Mínimo de 4 caracteres.'); return; }
      updateNote(targetId, { isLocked: true, password: passInput }); unlockNote(targetId, passInput); setPasswordModal(null); setPassInput('');
    }
  };

  const removeLock = (id: string, isNotebook: boolean) => {
    if (isNotebook) updateNotebook(id, { isLocked: false, password: '' });
    else updateNote(id, { isLocked: false, password: '' });
  };

  const execCmd = (cmd: string, value: string | null = null) => { 
      if (showInNoteSearch && document.activeElement === noteSearchRef.current) return;
      editorRef.current?.focus();
      document.execCommand(cmd, false, value || undefined); 
  };

  const getWordCount = () => {
    if (!noteContent) return { words: 0, chars: 0 };
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = noteFormat === 'richtext' ? noteContent : parseMarkdown(noteContent);
    const text = tempDiv.textContent || tempDiv.innerText || "";
    const cleanText = text.trim();
    const chars = cleanText.length;
    const words = cleanText ? cleanText.split(/\s+/).length : 0;
    return { words, chars };
  };

  const { words, chars } = getWordCount();
  let displayHtml = noteFormat === 'markdown' ? parseMarkdown(noteContent) : noteContent;
  let searchMatchCount = 0;

  if (showInNoteSearch && noteSearchQuery.trim()) {
      const result = getHighlightedContent(displayHtml, noteSearchQuery);
      displayHtml = result.html;
      searchMatchCount = result.count;
  }

  // === INTERCEPTAÇÃO DE NAVEGAÇÃO ===
  const hasLocalState = !!passwordModal || !!confirmDialog || isNbModalOpen || fontMenuOpen || folderMenuOpen || showInNoteSearch || isFullscreen || view !== 'notebooks' || !!infoModal || isShortcutOpen || showCheatSheet;
  
  useBackHandler(hasLocalState, () => {
      if (isGlobalModalOpen || isRoutineModalOpen || isFocusModeOpen || isSettingsOpen || isVisionOpen || isGoogleConnectOpen || isChangelogOpen || isExitModalOpen) return false;
      
      if (isShortcutOpen) return false; // Handled inside ShortcutModal
      if (showCheatSheet) { setShowCheatSheet(false); return true; }
      if (infoModal) { setInfoModal(null); return true; }
      if (passwordModal) { setPasswordModal(null); setPassInput(''); setPassError(''); return true; }
      if (confirmDialog) { setConfirmDialog(null); return true; }
      if (isNbModalOpen) { setNbModalOpen(false); setNbToEdit(null); return true; }
      if (fontMenuOpen) { setFontMenuOpen(false); return true; }
      if (folderMenuOpen) { setFolderMenuOpen(false); return true; }
      if (showInNoteSearch) { setShowInNoteSearch(false); setNoteSearchQuery(''); return true; }
      if (isFullscreen) { setIsFullscreen(false); return true; }
      if (view === 'editor') { handleBack(); return true; }
      if (view === 'notes') { handleBack(); return true; }
      return false;
  });

  const renderNoteCard = (note: Note, nbColorKey: ItemColor, isFromHome: boolean = false) => {
    const isLocked = note.isLocked && !unlockedNotes.includes(note.id);
    return (
      <div key={note.id} className="relative group">
        <button onClick={() => isFromHome ? handleOpenFavoriteNote(note) : handleOpenNote(note)} className={`w-full p-5 rounded-2xl border text-left transition-all hover:border-current shadow-sm ${colorStyles[nbColorKey].note}`}>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
               {note.isPinned && !isFromHome && <Pin size={14} className="text-zinc-400 rotate-45" />}
               {isFromHome && <Star size={14} className="text-amber-500 fill-amber-500" />}
               <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 line-clamp-1">{note.title || 'Sem Título'}</h4>
            </div>
            {note.isLocked && <Lock size={14} className="text-amber-500 shrink-0 mt-1" />}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[2.5rem]">{isLocked ? '••••••••••••••••' : (note.format === 'markdown' ? note.content : note.content.replace(/<[^>]*>?/gm, ''))}</p>
          <span className="text-[10px] font-bold text-zinc-400 mt-4 block uppercase tracking-widest">{format(note.updatedAt, "dd/MM/yyyy HH:mm")}</span>
        </button>
        <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isLocked && (
             <>
               {!isFromHome && (
                  <button onClick={(e) => { e.stopPropagation(); updateNote(note.id, { isPinned: !note.isPinned }); }} className={`p-2 rounded-lg transition-colors shadow-md ${note.isPinned ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black' : 'bg-white/80 dark:bg-black/50 backdrop-blur-md text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'}`}><Pin size={14}/></button>
               )}
               <button onClick={(e) => { e.stopPropagation(); updateNote(note.id, { isFavorite: !note.isFavorite }); }} className={`p-2 rounded-lg transition-colors shadow-md ${note.isFavorite ? 'bg-amber-100 text-amber-500 dark:bg-amber-900/30' : 'bg-white/80 dark:bg-black/50 backdrop-blur-md text-zinc-600 dark:text-zinc-300 hover:text-amber-500'}`}><Star size={14} fill={note.isFavorite ? 'currentColor' : 'none'}/></button>
               <button onClick={(e) => { e.stopPropagation(); setConfirmDialog({ type: 'note', id: note.id }); }} className="p-2 bg-red-100 text-red-500 dark:bg-red-900/30 rounded-lg hover:bg-red-500 hover:text-white transition-colors shadow-md"><Trash2 size={14}/></button>
             </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .editor-content pre { background-color: rgba(0,0,0,0.05); padding: 1rem; border-radius: 0.5rem; font-family: monospace; white-space: pre-wrap; margin-top: 0.5rem; margin-bottom: 0.5rem; border: 1px solid rgba(0,0,0,0.1); }
        .dark .editor-content pre { background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
        .editor-content a { color: #3b82f6; text-decoration: underline; }
      `}</style>
      
      <div className={`transition-colors duration-500 ${isFullscreen ? 'fixed inset-0 z-[1000] bg-white dark:bg-black flex flex-col' : 'min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 pb-32'}`}>
        
        <AnimatePresence mode="wait">
          <motion.div 
            key={view}
            initial={{ opacity: 0, scale: 0.97, filter: 'brightness(0.85)' }}
            animate={{ opacity: 1, scale: 1, filter: 'brightness(1)' }}
            exit={{ opacity: 0, scale: 0.97, filter: 'brightness(0.85)' }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ willChange: "opacity, transform, filter" }}
            className={`w-full h-full mx-auto flex flex-col ${isFullscreen ? 'max-w-6xl' : 'max-w-4xl px-6 md:px-8 pt-12'}`}
          >

            {/* HEADER GERAL */}
            {view !== 'editor' && !isFullscreen && (
              <header className="space-y-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {view === 'notes' && <button onClick={handleBack} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"><ChevronLeft size={24}/></button>}
                    <h1 className="text-3xl font-black tracking-tight">{view === 'notebooks' ? 'Notas & Cadernos' : activeNotebook?.name}</h1>
                    {view === 'notebooks' && (
                       <>
                         <button onClick={() => setShortcutOpen(true)} className="mt-1 p-2 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors" title="Central de Atalhos">
                             <Terminal size={20}/>
                         </button>
                         <button onClick={() => setInfoModal({title: 'Notas Rápidas e Atalhos', desc: 'Sua base de conhecimento unificada.\n\nNas Notas, escreva pensamentos complexos usando Markdown ou formatação rica. Organize em cadernos ou favorite-as.\n\nNa Central de Atalhos (Ícone de Terminal), crie coleções compactas de teclas de atalho e comandos frequentes que você precisa sempre ter à mão.'})} className="text-zinc-400 hover:text-blue-500 transition-colors mt-1"><Info size={20}/></button>
                       </>
                    )}
                  </div>
                  {view === 'notebooks' && (unlockedNotebooks.length > 0 || unlockedNotes.length > 0) && (
                    <button onClick={lockAll} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 text-xs font-bold hover:bg-amber-500/20 transition-colors"><Lock size={14} /> Trancar Sessão</button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input type="text" placeholder={view === 'notebooks' ? "Pesquisar cadernos ou notas..." : "Pesquisar notas..."} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors font-medium" />
                </div>
              </header>
            )}

            {/* VISÃO DE CADERNOS & FAVORITOS */}
            {view === 'notebooks' && (
              <div className="space-y-12">
                
                {favoriteNotes.length > 0 && (
                   <div>
                     <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2 ml-1"><Star size={14} /> Notas Favoritas</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {favoriteNotes.map(note => {
                            const nb = notebooks.find(n => n.id === note.notebookId);
                            return renderNoteCard(note, nb ? nb.color : 'zinc', true);
                        })}
                     </div>
                   </div>
                )}

                <div>
                   <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2 ml-1"><FileText size={14} /> Seus Cadernos</h3>
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     <button onClick={() => openNbModal()} className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all h-40">
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
                             {!isLocked && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); nb.isLocked ? removeLock(nb.id, true) : setPasswordModal({ isOpen: true, type: 'set_nb_lock', targetId: nb.id }); }} className="p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors shadow-md">{nb.isLocked ? <Unlock size={14}/> : <Lock size={14}/>}</button>
                                  <button onClick={(e) => { e.stopPropagation(); openNbModal(nb); }} className="p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-blue-500 hover:bg-blue-500 hover:text-white transition-colors shadow-md"><Edit2 size={14}/></button>
                                  {nb.id !== 'default' && (<button onClick={(e) => { e.stopPropagation(); setConfirmDialog({ type: 'notebook', id: nb.id }); }} className="p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow-md"><Trash2 size={14}/></button>)}
                                </>
                             )}
                           </div>
                         </div>
                       )
                     })}
                   </div>
                </div>
              </div>
            )}

            {/* VISÃO DE NOTAS DO CADERNO */}
            {view === 'notes' && activeNotebook && (
              <div className="space-y-4">
                 <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{filteredNotes.length} Notas Encontradas</span>
                    <button onClick={handleCreateNote} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md ${colorStyles[activeNotebook.color].nb.split(' ')[0].replace('/20', '').replace('/30', '')}`}><Plus size={16}/> Criar Nota</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredNotes.map(note => renderNoteCard(note, activeNotebook.color))}
                 </div>
              </div>
            )}

            {/* VISÃO DO EDITOR IMERSIVO */}
            {view === 'editor' && activeNote && activeNotebook && (
              <div className="flex flex-col flex-1 h-full min-h-0 relative">
                
                {/* BARRA SUPERIOR E DE OPÇÕES DE EDIÇÃO */}
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 p-3 mb-4 rounded-2xl border ${colorStyles[activeNotebook.color].note} w-full min-w-0 ${isFullscreen && !showInNoteSearch ? 'fixed top-4 left-1/2 -translate-x-1/2 z-[1100] max-w-4xl bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-2xl' : ''}`}>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-1 w-full md:w-auto shrink-0 pb-1 md:pb-0">
                        <button onClick={handleBack} className="p-2 shrink-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"><ChevronLeft size={20}/></button>
                        <div className="w-px h-6 shrink-0 bg-zinc-300 dark:bg-zinc-700 mx-1" />
                        
                        <div className="relative shrink-0 flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                           <FolderInput size={14} className="text-zinc-500 shrink-0" />
                           <button onClick={() => setFolderMenuOpen(!folderMenuOpen)} className="flex items-center gap-1 bg-transparent text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 outline-none max-w-[100px] md:max-w-[150px] truncate">
                             {notebooks.find(nb => nb.id === activeNote?.notebookId)?.name || 'Caderno'} <ChevronDown size={14} className="opacity-50 shrink-0" />
                           </button>
                           <AnimatePresence>
                             {folderMenuOpen && (
                               <>
                                 <div className="fixed inset-0 z-40" onClick={() => setFolderMenuOpen(false)} />
                                 <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="absolute top-full left-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 flex flex-col p-2 min-w-[180px] max-h-48 overflow-y-auto gap-1">
                                   {notebooks.map(nb => (
                                     <button key={nb.id} onClick={() => { updateNote(activeNote.id, { notebookId: nb.id }); setActiveNote({ ...activeNote, notebookId: nb.id }); setFolderMenuOpen(false); }} className={`text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-widest truncate transition-colors ${activeNote?.notebookId === nb.id ? 'bg-zinc-100 dark:bg-zinc-800 text-blue-500' : ''}`}>
                                       {nb.name}
                                     </button>
                                   ))}
                                 </motion.div>
                               </>
                             )}
                           </AnimatePresence>
                        </div>
                        
                        <div className="w-px h-6 shrink-0 bg-zinc-300 dark:bg-zinc-700 mx-1" />
                        
                        {/* TOGGLE MARKDOWN E TOOLTIP */}
                        <div className="flex items-center gap-1">
                           <button onClick={toggleFormat} className="shrink-0 px-3 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-lg bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
                               {noteFormat === 'richtext' ? 'Rich Text' : 'Markdown'}
                           </button>
                           <button onClick={() => setShowCheatSheet(true)} className="p-1.5 text-zinc-400 hover:text-blue-500 transition-colors" title="Guia de Markdown">
                              <HelpCircle size={16} />
                           </button>
                        </div>

                        <div className="w-px h-6 shrink-0 bg-zinc-300 dark:bg-zinc-700 mx-1" />
                        <button onClick={() => { setIsEditing(!isEditing); setShowInNoteSearch(false); setNoteSearchQuery(''); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${!isEditing ? 'bg-blue-500/10 text-blue-500' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                            {isEditing ? <Eye size={16}/> : <PenLine size={16}/>} {isEditing ? 'Ver' : 'Editar'}
                        </button>
                        {!isEditing && <button onClick={() => { setShowInNoteSearch(!showInNoteSearch); if(!showInNoteSearch) setNoteSearchQuery(''); }} className={`shrink-0 p-2 rounded-lg transition-colors ml-1 ${showInNoteSearch ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`} title="Buscar na Nota"><FileSearch size={16}/></button>}
                    </div>

                    <div className="flex items-center justify-end w-full md:w-auto gap-1 shrink-0 border-t md:border-none border-zinc-200 dark:border-zinc-800 pt-2 md:pt-0">
                        {saveStatus === 'saving' && <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 animate-pulse mr-2">Salvando...</span>}
                        {saveStatus === 'saved' && <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-500 flex items-center gap-1 mr-2"><Check size={12}/> Salvo</span>}
                        
                        {/* Dropdown Customizado: Fonte */}
                        <div className="relative shrink-0">
                           <button onClick={() => setFontMenuOpen(!fontMenuOpen)} className="flex items-center gap-1 bg-transparent text-sm font-bold text-zinc-600 dark:text-zinc-300 outline-none pr-2">
                             {noteFont === 'sans' ? 'Sans' : noteFont === 'serif' ? 'Serif' : 'Manual'} <ChevronDown size={14} className="opacity-50 shrink-0"/>
                           </button>
                           <AnimatePresence>
                             {fontMenuOpen && (
                               <>
                                 <div className="fixed inset-0 z-40" onClick={() => setFontMenuOpen(false)} />
                                 <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="absolute top-full right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 flex flex-col p-2 w-36 gap-1">
                                   <button onClick={() => { setNoteFont('sans'); setFontMenuOpen(false); }} className={`font-sans text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-sm transition-colors ${noteFont==='sans'?'bg-zinc-100 dark:bg-zinc-800':''}`}>Sans</button>
                                   <button onClick={() => { setNoteFont('serif'); setFontMenuOpen(false); }} className={`font-serif text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-sm transition-colors ${noteFont==='serif'?'bg-zinc-100 dark:bg-zinc-800':''}`}>Serif</button>
                                   <button onClick={() => { setNoteFont('handwriting'); setFontMenuOpen(false); }} className={`font-handwriting text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-sm transition-colors ${noteFont==='handwriting'?'bg-zinc-100 dark:bg-zinc-800':''}`}>Manual</button>
                                 </motion.div>
                               </>
                             )}
                           </AnimatePresence>
                        </div>
                         
                        <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">{isFullscreen ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button>
                        <button onClick={() => setNoteLines(!noteLines)} className={`p-2 rounded-lg transition-colors ${noteLines ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><AlignLeft size={18}/></button>
                        <button onClick={() => { activeNote.isLocked ? removeLock(activeNote.id, false) : setPasswordModal({ isOpen: true, type: 'set_note_lock', targetId: activeNote.id }) }} className={`p-2 rounded-lg ${activeNote.isLocked ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                           {activeNote.isLocked ? <Lock size={18}/> : <Unlock size={18}/>}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {isEditing && noteFormat === 'richtext' && (
                        <motion.div ref={toolbarRef} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`flex items-center gap-1 overflow-x-auto scrollbar-hide pb-2 px-1 ${isFullscreen && !showInNoteSearch ? 'mt-24' : ''}`}>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('undo')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Desfazer"><Undo size={16}/></button>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('redo')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Refazer"><Redo size={16}/></button>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => { setShowInNoteSearch(true); setIsEditing(false); }} className="shrink-0 p-2 rounded-lg transition-colors text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Buscar na Nota"><FileSearch size={16}/></button>
                            
                            <div className="w-px h-6 shrink-0 bg-zinc-200 dark:bg-zinc-800 mx-1 self-center" />
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('bold')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Negrito"><Bold size={16}/></button>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('italic')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Itálico"><Italic size={16}/></button>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('underline')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Sublinhado"><Underline size={16}/></button>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('strikeThrough')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Tachado"><Strikethrough size={16}/></button>
                            
                            <div className="w-px h-6 shrink-0 bg-zinc-200 dark:bg-zinc-800 mx-1 self-center" />
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('insertUnorderedList')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Lista"><List size={16}/></button>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('insertOrderedList')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Lista Numerada"><ListOrdered size={16}/></button>
                            
                            <div className="w-px h-6 shrink-0 bg-zinc-200 dark:bg-zinc-800 mx-1 self-center" />
                            <button onMouseDown={e => e.preventDefault()} onClick={() => { const url = prompt('Digite a URL do link:'); if (url) execCmd('createLink', url); }} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Inserir Link"><LinkIcon size={16}/></button>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('formatBlock', 'PRE')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Bloco de Código"><Code size={16}/></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* FAB FLUTUANTE DA BARRA DE EDIÇÃO (Aparece se scrollar e sumir a principal) */}
                <AnimatePresence>
                    {!isToolbarVisible && isEditing && noteFormat === 'richtext' && !showInNoteSearch && (
                        <motion.div initial={{ y: 50, opacity: 0, x: "-50%" }} animate={{ y: 0, opacity: 1, x: "-50%" }} exit={{ y: 50, opacity: 0, x: "-50%" }} className="fixed bottom-6 left-1/2 z-[2000] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-2xl px-4 py-2 flex items-center gap-1 overflow-x-auto max-w-[90vw] scrollbar-hide">
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('undo')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Undo size={16}/></button>
                            <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('bold')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Bold size={16}/></button>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('italic')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Italic size={16}/></button>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('underline')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Underline size={16}/></button>
                            <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCmd('insertUnorderedList')} className="shrink-0 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><List size={16}/></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* BARRA DE PESQUISA CUSTOMIZADA */}
                <AnimatePresence>
                  {showInNoteSearch && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`mb-4 ${isFullscreen ? 'pt-24 px-4' : ''}`}>
                       <div className="flex items-center gap-3 px-4 py-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-inner">
                          <Search size={18} className="text-zinc-400 shrink-0" />
                          <input 
                            type="text" 
                            placeholder="Pesquisar texto na nota..." 
                            value={noteSearchQuery}
                            onChange={(e) => setNoteSearchQuery(e.target.value)} 
                            className="w-full bg-transparent outline-none text-sm font-bold placeholder:font-normal placeholder:text-zinc-400" 
                            autoFocus 
                          />
                          {noteSearchQuery && (
                             <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap px-2 py-1 rounded-md ${searchMatchCount === 0 ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/20 text-amber-600 dark:text-amber-500'}`}>
                                {searchMatchCount} {searchMatchCount === 1 ? 'resultado' : 'resultados'}
                             </span>
                          )}
                          <button onClick={() => { setShowInNoteSearch(false); setNoteSearchQuery(''); }} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"><X size={16}/></button>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* TEXT AREA: Renderização Separada (Leitura vs Edição) para 100% de Confiabilidade */}
                <div className={`flex-1 flex flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-inner editor-content overflow-hidden ${colorStyles[activeNotebook.color].note} ${isFullscreen && !showInNoteSearch ? 'mt-4' : ''}`}>
                  <input type="text" placeholder="Título da Nota" readOnly={!isEditing && !showInNoteSearch} value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className={`w-full px-8 pt-8 pb-4 bg-transparent outline-none text-3xl font-black placeholder:text-zinc-300 dark:placeholder:text-zinc-700 ${noteFont === 'handwriting' ? 'font-handwriting' : noteFont === 'serif' ? 'font-serif' : 'font-sans'}`} />
                  
                  <div className={`flex-1 flex flex-col px-8 relative overflow-y-auto scrollbar-thin ${noteLines ? 'bg-lined-paper' : ''}`}>
                    
                    {(!isEditing || showInNoteSearch) ? (
                        <div dangerouslySetInnerHTML={{ __html: displayHtml }} className={`w-full flex-1 bg-transparent outline-none leading-relaxed text-zinc-700 dark:text-zinc-300 pb-12 ${noteFont === 'handwriting' ? 'font-handwriting text-xl' : noteFont === 'serif' ? 'font-serif text-lg' : 'font-sans text-base'}`} />
                    ) : (
                        noteFormat === 'markdown' ? (
                           <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Escreva aqui em Markdown (# Título, **Negrito**)..." className={`w-full min-h-full pb-12 bg-transparent outline-none resize-none leading-relaxed text-zinc-700 dark:text-zinc-300 ${noteFont === 'handwriting' ? 'font-handwriting text-xl' : noteFont === 'serif' ? 'font-serif text-lg' : 'font-sans text-base'}`} />
                        ) : (
                           <div ref={editorRef} contentEditable={true} suppressContentEditableWarning onInput={(e) => setNoteContent(e.currentTarget.innerHTML)} className={`w-full min-h-full pb-12 bg-transparent outline-none text-zinc-700 dark:text-zinc-300 ${noteFont === 'handwriting' ? 'font-handwriting text-xl' : noteFont === 'serif' ? 'font-serif text-lg' : 'font-sans text-base'}`} />
                        )
                    )}

                    {isEditing && !noteContent.trim() && !showInNoteSearch && (
                      <div className="absolute top-0 left-8 pointer-events-none text-zinc-300 dark:text-zinc-700 font-medium">Comece a escrever...</div>
                    )}
                  </div>
                  
                  {/* CONTADOR DE PALAVRAS E CARACTERES */}
                  <div className="px-8 pb-4 pt-4 flex justify-end items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 opacity-60">
                    <span>{words} {words === 1 ? 'palavra' : 'palavras'}</span>
                    <span>{chars} {chars === 1 ? 'caractere' : 'caracteres'}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* MODAL DE CRIAÇÃO/EDIÇÃO DE CADERNO */}
        <AnimatePresence>
          {isNbModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xl font-black mb-4">{nbToEdit ? 'Editar Caderno' : 'Novo Caderno'}</h3>
                <input type="text" maxLength={20} placeholder="Nome do Caderno" value={nbName} onChange={e => setNbName(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl outline-none font-bold mb-6" autoFocus />
                <span className="text-xs font-bold uppercase text-zinc-500 mb-3 block">Cor Temática</span>
                <div className="flex gap-2 mb-8">
                  {(Object.keys(colorStyles) as ItemColor[]).map(c => (
                    <button key={c} onClick={() => setNbColor(c)} className={`w-8 h-8 rounded-full ${colorPickerClasses[c]} transition-transform ${nbColor === c ? 'scale-125 ring-2 ring-zinc-900 dark:ring-zinc-100' : 'opacity-70'}`} />
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setNbModalOpen(false); setNbToEdit(null); }} className="flex-1 p-4 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800">Cancelar</button>
                  <button onClick={handleSaveNotebook} disabled={!nbName.trim()} className="flex-1 p-4 rounded-xl font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black disabled:opacity-50">Salvar</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        <AnimatePresence>
          {confirmDialog && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
                <h3 className="text-xl font-black mb-2 dark:text-white">Excluir Permanentemente?</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">
                  {confirmDialog.type === 'notebook' 
                    ? 'Todas as notas dentro deste caderno também serão apagadas para sempre.' 
                    : 'Esta nota será excluída permanentemente.'}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDialog(null)} className="flex-1 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                  <button onClick={confirmDelete} className="flex-1 p-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors">Excluir</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL DE SENHAS */}
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

        {/* INFO MODAL GERAL */}
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

        {/* CHEAT SHEET DO MARKDOWN */}
        <AnimatePresence>
          {showCheatSheet && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-left relative max-h-[90vh] flex flex-col">
                
                <div className="flex items-center justify-between mb-4 shrink-0 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full"><HelpCircle size={20}/></div>
                      <h3 className="text-lg font-black dark:text-white">Guia de Markdown</h3>
                   </div>
                   <button onClick={(e) => { e.stopPropagation(); setShowCheatSheet(false); }} className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition-colors"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin pr-2 space-y-5">
                   <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                      Seja ágil. O Markdown converte seus símbolos em formatação visual automaticamente.
                   </p>

                   <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                         <code className="text-emerald-600 dark:text-emerald-400 font-bold bg-black/5 dark:bg-white/5 px-2 py-1 rounded">**texto**</code>
                         <span className="font-bold">Negrito</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                         <code className="text-emerald-600 dark:text-emerald-400 font-bold bg-black/5 dark:bg-white/5 px-2 py-1 rounded">*texto*</code>
                         <span className="italic">Itálico</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                         <code className="text-emerald-600 dark:text-emerald-400 font-bold bg-black/5 dark:bg-white/5 px-2 py-1 rounded">~~texto~~</code>
                         <span className="line-through">Tachado</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                         <code className="text-emerald-600 dark:text-emerald-400 font-bold bg-black/5 dark:bg-white/5 px-2 py-1 rounded"># Título</code>
                         <span className="font-black text-lg">H1 (Até ### H3)</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                         <code className="text-emerald-600 dark:text-emerald-400 font-bold bg-black/5 dark:bg-white/5 px-2 py-1 rounded">&gt; Citação</code>
                         <span className="border-l-4 border-blue-500 pl-2 italic opacity-80">Bloco de citação</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                         <code className="text-emerald-600 dark:text-emerald-400 font-bold bg-black/5 dark:bg-white/5 px-2 py-1 rounded">---</code>
                         <span className="text-xs uppercase font-bold tracking-widest text-zinc-400">Divisor de Linha</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                         <code className="text-emerald-600 dark:text-emerald-400 font-bold bg-black/5 dark:bg-white/5 px-2 py-1 rounded">[Nome](url)</code>
                         <span className="text-blue-500 underline">Link</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                         <code className="text-emerald-600 dark:text-emerald-400 font-bold bg-black/5 dark:bg-white/5 px-2 py-1 rounded">- Item</code>
                         <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-current"/> Lista c/ marcador</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                         <code className="text-emerald-600 dark:text-emerald-400 font-bold bg-black/5 dark:bg-white/5 px-2 py-1 rounded">`código`</code>
                         <code className="font-mono text-xs">Bloco de código</code>
                      </div>
                   </div>

                   <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 text-amber-700 dark:text-amber-500">
                      <AlertTriangle size={20} className="shrink-0 mt-0.5"/>
                      <div className="text-xs leading-relaxed font-medium">
                         <strong className="block mb-1 font-bold uppercase tracking-widest">Dica: Sublinhado</strong>
                         O Markdown oficial não possui suporte nativo para texto sublinhado. Para que você não perca seus dados ao alternar a partir do <i>Rich Text</i>, nós convertemos para a tag HTML <code>&lt;u&gt;texto&lt;/u&gt;</code> que funcionará perfeitamente.
                      </div>
                   </div>
                </div>

                <div className="shrink-0 mt-6">
                   <button onClick={() => setShowCheatSheet(false)} className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">Entendi</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ShortcutModal isOpen={isShortcutOpen} onClose={() => setShortcutOpen(false)} />

      </div>
    </>
  );
};
