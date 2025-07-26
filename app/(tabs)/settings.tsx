import React, { useContext, useState, useEffect } from "react";
import { View, Text, Switch } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "@/components/ThemeContext";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

const THEME_KEY = "MYDRIVETIME_THEME";

export default function SettingsScreen() {
  const { theme, setTheme } = useContext(ThemeContext);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const toggleTheme = async () => {
    setLoading(true);
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    await AsyncStorage.setItem(THEME_KEY, newTheme);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
      }
    })();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <Text style={{ fontSize: 24, marginBottom: 24, color: colors.text }}>
        Settings
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "80%",
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.inputBorder,
        }}
      >
        <Text style={{ fontSize: 18, color: colors.text }}>
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </Text>
        <Switch
          value={theme === "dark"}
          onValueChange={toggleTheme}
          disabled={loading}
          trackColor={{ false: "#bbb", true: colors.tint }}
          thumbColor={theme === "dark" ? colors.text : colors.inputBackground}
        />
      </View>

      <Text style={{ marginTop: 24, color: colors.mutedText }}>
        (More settings coming soon)
      </Text>
    </View>
  );
}
