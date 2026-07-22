import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { readThemePreference, resolveTheme } from './preferences'

document.documentElement.dataset.theme = resolveTheme(
  readThemePreference(),
  window.matchMedia('(prefers-color-scheme: dark)').matches,
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
