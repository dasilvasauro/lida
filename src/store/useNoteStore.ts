import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Note, Notebook, ShortcutCategory } from '../types';
import { useConfigStore } from './useConfigStore';

interface NoteState {
  notebooks: Notebook[]; 
  notes: Note[];
  unlockedNotebooks: string[]; 
  unlockedNotes: string[];
  
  shortcutCategories: ShortcutCategory[]; // NOVO: Armazenamento de Atalhos

  addNotebook: (notebook: Notebook) => void; 
  updateNotebook: (id: string, updated: Partial<Notebook>) => void; 
  deleteNotebook: (id: string) => void;
  
  addNote: (note: Note) => void; 
  updateNote: (id: string, updated: Partial<Note>) => void; 
  deleteNote: (id: string) => void;

  unlockNotebook: (id: string, pass: string) => boolean; 
  unlockNote: (id: string, pass: string) => boolean; 
  lockAll: () => void;

  // NOVOS MÉTODOS DE ATALHOS
  addShortcutCategory: (category: ShortcutCategory) => void;
  updateShortcutCategory: (id: string, updated: Partial<ShortcutCategory>) => void;
  deleteShortcutCategory: (id: string) => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set, get) => ({
      notebooks: [{ id: 'default', name: 'Geral', color: 'zinc', isLocked: false, createdAt: Date.now(), updatedAt: 0 }],
      notes: [], 
      unlockedNotebooks: [], 
      unlockedNotes: [],
      shortcutCategories: [],

      addNotebook: (notebook) => set((state) => ({ notebooks: [...state.notebooks, { ...notebook, updatedAt: Date.now() }] })),
      updateNotebook: (id, updated) => set((state) => ({ notebooks: state.notebooks.map(nb => nb.id === id ? { ...nb, ...updated, updatedAt: Date.now() } : nb) })),
      deleteNotebook: (id) => {
        useConfigStore.getState().addTombstone(id);
        set((state) => ({ 
          notebooks: state.notebooks.filter(nb => nb.id !== id), 
          notes: state.notes.map(n => n.notebookId === id ? { ...n, notebookId: 'default', updatedAt: Date.now() } : n) 
        }));
      },

      addNote: (note) => set((state) => ({ notes: [{ ...note, updatedAt: Date.now() }, ...state.notes] })),
      updateNote: (id, updated) => set((state) => ({ notes: state.notes.map(n => n.id === id ? { ...n, ...updated, updatedAt: Date.now() } : n) })),
      deleteNote: (id) => {
        useConfigStore.getState().addTombstone(id);
        set((state) => ({ notes: state.notes.filter(n => n.id !== id) }));
      },

      unlockNotebook: (id, pass) => { const nb = get().notebooks.find(n => n.id === id); if (nb && nb.password === pass) { set((state) => ({ unlockedNotebooks: [...state.unlockedNotebooks, id] })); return true; } return false; },
      unlockNote: (id, pass) => { const note = get().notes.find(n => n.id === id); if (note && note.password === pass) { set((state) => ({ unlockedNotes: [...state.unlockedNotes, id] })); return true; } return false; },
      lockAll: () => set({ unlockedNotebooks: [], unlockedNotes: [] }),

      // IMPLEMENTAÇÃO DE ATALHOS
      addShortcutCategory: (category) => set((state) => ({ 
          shortcutCategories: [...state.shortcutCategories, { ...category, updatedAt: Date.now() }] 
      })),
      updateShortcutCategory: (id, updated) => set((state) => ({ 
          shortcutCategories: state.shortcutCategories.map(c => c.id === id ? { ...c, ...updated, updatedAt: Date.now() } : c) 
      })),
      deleteShortcutCategory: (id) => {
        useConfigStore.getState().addTombstone(id);
        set((state) => ({ shortcutCategories: state.shortcutCategories.filter(c => c.id !== id) }));
      }
    }),
    { 
        name: 'lida-notes', 
        partialize: (state) => ({ 
            notebooks: state.notebooks, 
            notes: state.notes, 
            shortcutCategories: state.shortcutCategories 
        }) 
    }
  )
);