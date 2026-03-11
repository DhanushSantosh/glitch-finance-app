import { createContext, useContext, useEffect, useState } from "react";

type Theme = "blue-ocean" | "graphite" | "mint";

interface ThemeOption {
  id: Theme;
  name: string;
  description: string;
  gradient: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: ThemeOption[] = [
  {
    id: "blue-ocean",
    name: "Blue Ocean",
    description: "Clean and energetic default finance view",
    gradient: "from-blue-700 via-blue-600 to-cyan-500",
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Low distraction dark mode for frequent tracking",
    gradient: "from-slate-900 via-slate-800 to-slate-700",
  },
  {
    id: "mint",
    name: "Mint",
    description: "Calm green palette for positive saving behavior",
    gradient: "from-emerald-700 via-emerald-600 to-teal-500",
  },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("blue-ocean");

  useEffect(() => {
    const saved = localStorage.getItem("quantex-theme") as Theme;
    if (saved && themes.find((item) => item.id === saved)) {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("quantex-theme", theme);
    document.documentElement.className = `dark ${theme}`;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
