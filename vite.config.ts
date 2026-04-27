import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // Atualiza o app automaticamente em segundo plano
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], // Arquivos estáticos
      manifest: {
        name: 'Lida - Visão & Produtividade',
        short_name: 'Lida',
        description: 'Seu segundo cérebro para tarefas, hábitos e grandes objetivos.',
        theme_color: '#000000', // Cor da barra de status no celular
        background_color: '#000000', // Cor da tela de carregamento
        display: 'standalone', // Faz abrir em tela cheia, sem barra de navegação
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: '/lida/', // Mantenha o que você configurou para o Github Pages
})