import React, { createContext, useState, useEffect } from "react";
import { Appearance } from "react-native";

export type ThemeType = "light" | "dark";

export const ThemeContext = createContext<{
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}>({
  theme: "light",
  setTheme: () => {},
});

export const ThemeProviderCustom: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const colorScheme = Appearance.getColorScheme() as ThemeType | null;
  const [theme, setTheme] = useState<ThemeType>(colorScheme || "light");

  useEffect(() => {
    const listener = (preferences: {
      colorScheme: "light" | "dark" | null | undefined;
    }) => {
      setTheme(preferences.colorScheme === "dark" ? "dark" : "light");
    };
    const sub = Appearance.addChangeListener(listener);
    return () => sub.remove();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
