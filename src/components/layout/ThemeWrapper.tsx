import { useConfigStore } from "../../store/useConfigStore";
import { type ReactNode, useEffect } from "react";

export const ThemeWrapper = ({ children }: { children: ReactNode }) => {
  const { theme, font } = useConfigStore();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    if (['dark-amoled', 'soft-dark', 'navy', 'darcula'].includes(theme)) {
      root.classList.add('dark');
      if (theme === 'dark-amoled') document.body.style.backgroundColor = '#000000';
      else if (theme === 'soft-dark') document.body.style.backgroundColor = '#18181b';
      else if (theme === 'navy') document.body.style.backgroundColor = '#0a192f';
      else if (theme === 'darcula') document.body.style.backgroundColor = '#282a36';
    } else {
      root.classList.remove('dark');
      if (theme === 'butter') document.body.style.backgroundColor = '#fdf6e3';
      else document.body.style.backgroundColor = '#fafafa'; 
    }

    if (font === 'serif') {
      root.style.fontFamily = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
      root.style.fontSize = '16px';
    } else if (font === 'special') {
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