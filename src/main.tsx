import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './components/ThemeProvider';

// Apply saved theme immediately before render to prevent flash
const savedTheme = localStorage.getItem('yavv-theme') === 'light' ? 'light' : 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
