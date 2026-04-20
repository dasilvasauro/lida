import { useConfigStore } from "../../store/useConfigStore";
import { ReactNode, useEffect } from "react";

export const ThemeWrapper = ({ children }: { children: ReactNode }) => {
  const { theme, font } = useConfigStore();

  const fontClasses = {
    sans: "font-['Barlow_Condensed']",
    serif: "font-['EB_Garamond']",
    special: "font-['VT323']",
  };

  useEffect(() => {
    const root = document.documentElement;
    // Adiciona ou remove a classe 'dark' no HTML base
    if (theme === 'dark-amoled') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#000000'; // Fundo AMOLED
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#fafafa'; // Fundo Claro (zinc-50)
    }
  }, [theme]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${fontClasses[font]} bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100`}>
      {children}
    </div>
  );
};
