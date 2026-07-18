import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <>{children}</>;
}
