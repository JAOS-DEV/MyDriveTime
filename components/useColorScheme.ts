import { useContext } from "react";
import { ThemeContext } from "./ThemeContext";
import { useColorScheme as useSystemColorScheme } from "react-native";

export function useColorScheme() {
  const ctx = useContext(ThemeContext);
  if (ctx && ctx.theme) return ctx.theme;
  return useSystemColorScheme() ?? "light";
}
