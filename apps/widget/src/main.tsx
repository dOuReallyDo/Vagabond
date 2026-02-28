import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Define the mount function
const mountVagabondWidget = (elementId: string) => {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`Vagabond Widget: Element with id '${elementId}' not found.`);
    return;
  }
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Expose it globally
(window as any).mountVagabondWidget = mountVagabondWidget;

// Auto-mount in development
if (import.meta.env.DEV) {
  const root = document.getElementById('root');
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  }
}
