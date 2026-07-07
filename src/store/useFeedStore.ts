import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { Channel, Feed, FeedEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useConfigStore } from './useConfigStore';

const obfuscatedStorage: StateStorage = {
  getItem: (name) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try { JSON.parse(str); return str; } catch { try { return decodeURIComponent(atob(str)); } catch { return null; } }
  },
  setItem: (name, value) => { localStorage.setItem(name, btoa(encodeURIComponent(value))); },
  removeItem: (name) => localStorage.removeItem(name),
};

export interface FeedTarget {
    feedId?: string;
    newFeedName?: string;
    channelId?: string;
    newChannelName?: string;
}

interface FeedState {
  channels: Channel[];
  feeds: Feed[];
  entries: FeedEntry[];

  publishMessage: (content: string, targets: FeedTarget[], parentId?: string, linkedTaskId?: string) => void;
  updateEntry: (id: string, newContent: string) => void;
  deleteEntry: (id: string) => void;

  updateFeed: (id: string, updated: Partial<Feed>) => void;
  archiveFeed: (id: string) => void;
  unarchiveFeed: (id: string) => void;
  deleteFeed: (id: string) => void;

  updateChannel: (id: string, updated: Partial<Channel>) => void;
  deleteChannel: (id: string) => void;

  cleanupArchivedFeeds: () => void;
}

export const extractMentions = (text: string) => {
    // Captura palavras iniciadas com @ ou #, permitindo letras com acentos, números e hífens.
    const feedMatches = [...text.matchAll(/@([\wÀ-ÿ-]+)/g)].map(m => m[1]);
    const channelMatches = [...text.matchAll(/#([\wÀ-ÿ-]+)/g)].map(m => m[1]);
    
    // Remove duplicatas
    return {
        feeds: [...new Set(feedMatches)],
        channels: [...new Set(channelMatches)]
    };
};

export const useFeedStore = create<FeedState>()(
  persist(
    (set) => ({
      channels: [],
      feeds: [],
      entries: [],

      publishMessage: (content, targets, parentId, linkedTaskId) => set((state) => {
          let newChannels = [...state.channels];
          let newFeeds = [...state.feeds];
          let newEntries = [...state.entries];
          
          targets.forEach(t => {
              let targetChannelId = t.channelId;
              
              // 1. Resolve o Canal (Cria se não existir)
              if (t.newChannelName) {
                  const existingC = newChannels.find(c => c.name.toLowerCase() === t.newChannelName!.toLowerCase());
                  if (existingC) {
                      targetChannelId = existingC.id;
                  } else {
                      targetChannelId = uuidv4();
                      newChannels.push({ id: targetChannelId, name: t.newChannelName, color: 'zinc', createdAt: Date.now(), updatedAt: Date.now() });
                  }
              }

              let targetFeedId = t.feedId;
              
              // 2. Resolve o Feed (Cria se não existir, associando ao Canal)
              if (t.newFeedName && targetChannelId) {
                  const existingF = newFeeds.find(f => f.name.toLowerCase() === t.newFeedName!.toLowerCase());
                  if (existingF) {
                      targetFeedId = existingF.id;
                      existingF.lastActivityAt = Date.now();
                      existingF.isArchived = false; // Desarquiva automaticamente
                  } else {
                      targetFeedId = uuidv4();
                      newFeeds.push({ id: targetFeedId, channelId: targetChannelId, name: t.newFeedName, color: 'blue', isArchived: false, createdAt: Date.now(), updatedAt: Date.now(), lastActivityAt: Date.now() });
                  }
              } else if (targetFeedId) {
                  const existingF = newFeeds.find(f => f.id === targetFeedId);
                  if (existingF) {
                      existingF.lastActivityAt = Date.now();
                      existingF.isArchived = false;
                  }
              }

              // 3. Cria a Entrada
              if (targetFeedId) {
                  newEntries.push({
                      id: uuidv4(),
                      feedId: targetFeedId,
                      content,
                      parentId,
                      linkedTaskId,
                      createdAt: Date.now(),
                      updatedAt: Date.now()
                  });
              }
          });

          return { channels: newChannels, feeds: newFeeds, entries: newEntries };
      }),

      updateEntry: (id, newContent) => set((state) => {
          // Se o usuário editar a entrada e mudar a PRIMEIRA menção @, o feed viaja de pasta.
          const { feeds: mFeeds, channels: mChannels } = extractMentions(newContent);
          const entry = state.entries.find(e => e.id === id);
          if (!entry) return state;

          let newChannels = [...state.channels];
          let newFeeds = [...state.feeds];
          let targetFeedId = entry.feedId;

          if (mFeeds.length > 0) {
              const firstFeedName = mFeeds[0];
              const existingF = newFeeds.find(f => f.name.toLowerCase() === firstFeedName.toLowerCase());
              
              if (existingF) {
                  targetFeedId = existingF.id;
              } else {
                  // Resolve o canal para o novo feed
                  let tChannelId = mChannels.length > 0 ? null : newFeeds.find(f => f.id === entry.feedId)?.channelId;
                  if (mChannels.length > 0) {
                      const existingC = newChannels.find(c => c.name.toLowerCase() === mChannels[0].toLowerCase());
                      if (existingC) tChannelId = existingC.id;
                      else {
                          tChannelId = uuidv4();
                          newChannels.push({ id: tChannelId, name: mChannels[0], color: 'zinc', createdAt: Date.now(), updatedAt: Date.now() });
                      }
                  }
                  
                  if (tChannelId) {
                      targetFeedId = uuidv4();
                      newFeeds.push({ id: targetFeedId, channelId: tChannelId, name: firstFeedName, color: 'blue', isArchived: false, createdAt: Date.now(), updatedAt: Date.now(), lastActivityAt: Date.now() });
                  }
              }
          }
          
          return { channels: newChannels, feeds: newFeeds, entries: state.entries.map(e => e.id === id ? { ...e, content: newContent, feedId: targetFeedId, updatedAt: Date.now() } : e) };
      }),

      deleteEntry: (id) => {
          useConfigStore.getState().addTombstone(id);
          // Efeito cascata: deleta a entrada e todas as respostas (threads) ligadas a ela
          set((state) => ({ entries: state.entries.filter(e => e.id !== id && e.parentId !== id) }));
      },

      updateFeed: (id, updated) => set((state) => ({ feeds: state.feeds.map(f => f.id === id ? { ...f, ...updated, updatedAt: Date.now() } : f) })),
      archiveFeed: (id) => set((state) => ({ feeds: state.feeds.map(f => f.id === id ? { ...f, isArchived: true, archivedAt: Date.now(), updatedAt: Date.now() } : f) })),
      unarchiveFeed: (id) => set((state) => ({ feeds: state.feeds.map(f => f.id === id ? { ...f, isArchived: false, archivedAt: undefined, updatedAt: Date.now() } : f) })),
      
      deleteFeed: (id) => {
          useConfigStore.getState().addTombstone(id);
          set((state) => ({ 
              feeds: state.feeds.filter(f => f.id !== id),
              entries: state.entries.filter(e => e.feedId !== id) 
          }));
      },

      updateChannel: (id, updated) => set((state) => ({ channels: state.channels.map(c => c.id === id ? { ...c, ...updated, updatedAt: Date.now() } : c) })),
      
      deleteChannel: (id) => {
          useConfigStore.getState().addTombstone(id);
          set((state) => {
              const feedsToDelete = state.feeds.filter(f => f.channelId === id).map(f => f.id);
              return {
                  channels: state.channels.filter(c => c.id !== id),
                  feeds: state.feeds.filter(f => f.channelId !== id),
                  entries: state.entries.filter(e => !feedsToDelete.includes(e.feedId))
              };
          });
      },

      cleanupArchivedFeeds: () => set((state) => {
          const now = Date.now();
          const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
          const feedsToKill = state.feeds.filter(f => f.isArchived && f.archivedAt && (now - f.archivedAt > sixtyDaysMs)).map(f => f.id);
          
          if (feedsToKill.length === 0) return state;

          return {
              feeds: state.feeds.filter(f => !feedsToKill.includes(f.id)),
              entries: state.entries.filter(e => !feedsToKill.includes(e.feedId))
          };
      })

    }),
    { name: 'lida-feeds', storage: createJSONStorage(() => obfuscatedStorage) }
  )
);
