import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { bootApp } from './lib/boot'

const container = document.getElementById('root')!

// Se carregar os dados locais demorar, mostra um aviso simples (sem React).
const slowNotice = setTimeout(() => {
  container.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:sans-serif;color:#a1a1aa;background:#000">Carregando seus dados… Se demorar muito, feche e abra o app novamente.</div>'
}, 8000)

bootApp()
  .then(() => {
    clearTimeout(slowNotice)
    container.innerHTML = ''
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((e) => {
    clearTimeout(slowNotice)
    console.error('Falha ao carregar os dados locais:', e)
    container.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:sans-serif;color:#f87171;background:#000">Não foi possível carregar seus dados locais. Feche e abra o app novamente.</div>'
  })
