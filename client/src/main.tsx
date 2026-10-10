import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { useSettingsStore } from '@/os/state/settingsStore';
import '@/styles/globals.css';

// Set before the first paint (not in a React effect) so there's no flash of
// the wrong theme/density — zustand's persist middleware hydrates from
// localStorage synchronously, so the persisted value is already available.
document.documentElement.dataset.theme = useSettingsStore.getState().theme;
document.documentElement.dataset.density = useSettingsStore.getState().density;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
