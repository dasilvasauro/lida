import { useConfigStore } from "../../store/useConfigStore";
import { ReactNode, useEffect } from "react";

export const ThemeWrapper = ({ children }: { children: ReactNode }) => {
  const { theme, font } = useConfigStore();

  const fontFamily = {
    sans: "font-['Barlow_Condensed']",
    serif: "font-['EB_Garamond']",
    special: "font-['VT323']",
  };

  useEffect(() => {
    const root = document.documentElement;

    // Aplica o tema (Light/Dark)
    root.classList.remove('light', 'dark');
    root.classList.add(theme || 'dark');

    // Aplica a fonte escolhida globalmente
    if (fontFamily === 'serif') {
      root.style.fontFamily = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
    } else if (fontFamily === 'special') {
      root.style.fontFamily = '"VT323", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    } else {
      root.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
  }, [theme, fontFamily]);

  return (
    <div className="min-h-screen transition-colors duration-300 bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
    {children}
    </div>
  );
};
