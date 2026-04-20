import { useConfigStore } from "../../store/useConfigStore";
import { ReactNode, useEffect } from "react";

export const ThemeWrapper = ({ children }: { children: ReactNode }) => {
  const { theme, font } = useConfigStore();

  useEffect(() => {
    const root = document.documentElement;

    // Aplica o tema (Adiciona 'dark' para o Tailwind funcionar e seta o fundo)
    if (theme === 'dark-amoled') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#000000'; // Preto puro
    } else if (theme === 'light') {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#fafafa'; // Branco quebrado
    } else {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#09090b'; // Zinc-950 (fallback escuro)
    }

    // Aplica a fonte escolhida globalmente
    if (font === 'serif') {
      root.style.fontFamily = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
    } else if (font === 'special') {
      root.style.fontFamily = '"VT323"';
    } else {
      root.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
  }, [theme, font]);

  return (
    <div className="min-h-screen transition-colors duration-500 text-zinc-900 dark:text-zinc-100">
    {children}
    </div>
  );
};
