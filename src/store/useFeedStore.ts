import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { Channel, Feed, FeedEntry, ItemColor } from '../types';
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

interface FeedState {
  channels: Channel[];
  feeds: Feed[];
  entries: FeedEntry[];

  // Processamento automático de menções
  processMentionsAndCreateEntry: (content: string, linkedTaskId?: string, parentId?: string) => void;
  
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
    const feedMatch = text.match(/@\[([^\]]+)\]/);
    const channelMatch = text.match(/#\[([^\]]+)\]/);
    return {
        feedName: feedMatch ? feedMatch[1].trim() : null,
        channelName: channelMatch ? channelMatch[1].trim() : null
    };
};

export const useFeedStore = create<FeedState>()(
  persist(
    (set, get) => ({
      channels: [],
      feeds: [],
      entries: [],

      processMentionsAndCreateEntry: (content, linkedTaskId, parentId) => {
          const { feedName, channelName } = extractMentions(content);
          if (!feedName && !channelName) return; // Se não tem @ nem #, ignoramos se for tarefa. Se for o chat, forçaremos um feed atual na UI.

          set((state) => {
              let targetChannelId: string | null = null;
              let targetFeedId: string | null = null;
              let newChannels = [...state.channels];
              let newFeeds = [...state.feeds];
              
              // 1. Resolve o Canal (#[Canal])
              if (channelName) {
                  const existingChannel = newChannels.find(c => c.name.toLowerCase() === channelName.toLowerCase());
                  if (existingChannel) {
                      targetChannelId = existingChannel.id;
                  } else {
                      targetChannelId = uuidv4();
                      newChannels.push({ id: targetChannelId, name: channelName, color: 'zinc', createdAt: Date.now(), updatedAt: Date.now() });
                  }
              }

              // 2. Resolve o Feed (@[Feed])
              const actualFeedName = feedName || 'Geral'; // Se usou só #, cai num feed Geral
              const existingFeed = newFeeds.find(f => f.name.toLowerCase() === actualFeedName.toLowerCase() && f.channelId === targetChannelId);
              
              if (existingFeed) {
                  targetFeedId = existingFeed.id;
                  existingFeed.lastActivityAt = Date.now(); // Joga pro topo
                  existingFeed.isArchived = false; // Desarquiva automaticamente se voltar a falar nele
              } else {
                  targetFeedId = uuidv4();
                  newFeeds.push({ id: targetFeedId, channelId: targetChannelId, name: actualFeedName, color: 'blue', isArchived: false, createdAt: Date.now(), updatedAt: Date.now(), lastActivityAt: Date.now() });
              }

              const newEntry: FeedEntry = {
                  id: uuidv4(),
                  feedId: targetFeedId,
                  content,
                  parentId,
                  linkedTaskId,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
              };

              return { channels: newChannels, feeds: newFeeds, entries: [...state.entries, newEntry] };
          });
      },

      updateEntry: (id, newContent) => set((state) => {
          // Se o usuário mudar o @ ou # na edição, o registro "viaja" de feed!
          const { feedName, channelName } = extractMentions(newContent);
          
          const entry = state.entries.find(e => e.id === id);
          if (!entry) return state;

          let targetFeedId = entry.feedId;
          let newChannels = [...state.channels];
          let newFeeds = [...state.feeds];

          // Se a edição mudou os parâmetros
          if (feedName || channelName) {
              let targetChannelId: string | null = null;
              if (channelName) {
                  const existingChannel = newChannels.find(c => c.name.toLowerCase() === channelName.toLowerCase());
                  if (existingChannel) targetChannelId = existingChannel.id;
                  else {
                      targetChannelId = uuidv4();
                      newChannels.push({ id: targetChannelId, name: channelName, color: 'zinc', createdAt: Date.now(), updatedAt: Date.now() });
                  }
              }

              const actualFeedName = feedName || 'Geral';
              const existingFeed = newFeeds.find(f => f.name.toLowerCase() === actualFeedName.toLowerCase() && f.channelId === targetChannelId);
              if (existingFeed) {
                  targetFeedId = existingFeed.id;
                  existingFeed.lastActivityAt = Date.now();
              } else {
                  targetFeedId = uuidv4();
                  newFeeds.push({ id: targetFeedId, channelId: targetChannelId, name: actualFeedName, color: 'blue', isArchived: false, createdAt: Date.now(), updatedAt: Date.now(), lastActivityAt: Date.now() });
              }
          }

          return { 
              channels: newChannels, 
              feeds: newFeeds, 
              entries: state.entries.map(e => e.id === id ? { ...e, content: newContent, feedId: targetFeedId, updatedAt: Date.now() } : e) 
          };
      }),

      deleteEntry: (id) => {
          useConfigStore.getState().addTombstone(id);
          // Deleta a entrada e também todas as respostas (filhas)
          set((state) => ({ entries: state.entries.filter(e => e.id !== id && e.parentId !== id) }));
      },

      updateFeed: (id, updated) => set((state) => ({ feeds: state.feeds.map(f => f.id === id ? { ...f, ...updated, updatedAt: Date.now() } : f) })),
      archiveFeed: (id) => set((state) => ({ feeds: state.feeds.map(f => f.id === id ? { ...f, isArchived: true, archivedAt: Date.now(), updatedAt: Date.now() } : f) })),
      unarchiveFeed: (id) => set((state) => ({ feeds: state.feeds.map(f => f.id === id ? { ...f, isArchived: false, archivedAt: undefined, updatedAt: Date.now() } : f) })),
      deleteFeed: (id) => {
          useConfigStore.getState().addTombstone(id);
          set((state) => ({ 
              feeds: state.feeds.filter(f => f.id !== id),
              entries: state.entries.filter(e => e.feedId !== id) // Cascade delete
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
