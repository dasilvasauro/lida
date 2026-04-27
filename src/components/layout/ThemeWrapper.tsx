import { useConfigStore } from "../../store/useConfigStore";
import { type ReactNode, useEffect } from "react";

export const ThemeWrapper = ({ children }: { children: ReactNode }) => {
  const { theme, font } = useConfigStore();

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark-amoled') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#000000'; 
    } else if (theme === 'light') {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#fafafa'; 
    } else {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#09090b'; 
    }

    if (font === 'serif') {
      root.style.fontFamily = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
      root.style.fontSize = '16px';
    } else if (font === 'special') {
      // <-- Ajuste de tamanho para compensar a escala da VT323
      root.style.fontFamily = '"VT323", monospace';
      root.style.fontSize = '18px'; 
    } else {
      root.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      root.style.fontSize = '16px';
    }
  }, [theme, font]);

  return (
    <div className="min-h-screen transition-colors duration-500 text-zinc-900 dark:text-zinc-100">
      {children}
    </div>
  );
};