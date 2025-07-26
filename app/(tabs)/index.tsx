import { StyleSheet, TextInput, Button, FlatList } from "react-native";
import { useState } from "react";
import { Text, View } from "@/components/Themed";
import { useRef } from "react";
import { TextInput as RNTextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

interface TimeEntry {
  id: string;
  from: string;
  to: string;
  fromError?: string;
  toError?: string;
}

function parseTime(value: string): number | null {
  // Accepts value in 'HH:mm' format, including 24:00
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours === 24 && minutes === 0) return 24 * 60; // 1440 minutes
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getElapsed(
  from: string,
  to: string
): { hours: number; minutes: number; total: number } | null {
  const fromMins = parseTime(from);
  const toMins = parseTime(to);
  if (fromMins === null || toMins === null) return null;
  let diff = toMins - fromMins;
  if (diff < 0) diff += 24 * 60; // handle overnight
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return { hours, minutes, total: diff };
}

function formatTimeInput(value: string): string {
  // Remove non-digits
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits === "2400") return "24:00";
  if (digits.length === 1) return `0${digits}:00`; // 1 -> 01:00
  if (digits.length === 2) return `${digits}:00`; // 14 -> 14:00
  if (digits.length === 3) return `0${digits[0]}:${digits.slice(1, 3)}`; // 830 -> 08:30
  if (digits.length === 4) return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`; // 1234 -> 12:34
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`; // Truncate if too long
}

function isValidTime(value: string): boolean {
  // Accepts value in 'HH:mm' format, including 24:00
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours === 24 && minutes === 0) return true; // allow 24:00
  if (hours > 23 || minutes > 59) return false;
  return true;
}

export default function TabOneScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [entries, setEntries] = useState<TimeEntry[]>([
    { id: "1", from: "", to: "" },
  ]);
  const [history, setHistory] = useState<TimeEntry[][]>([]); // For history feature

  const ENTRIES_KEY = "MYDRIVETIME_ENTRIES";
  const HISTORY_KEY = "MYDRIVETIME_HISTORY";

  // Load entries and history from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(ENTRIES_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEntries(parsed);
          }
        }
        const savedHistory = await AsyncStorage.getItem(HISTORY_KEY);
        if (savedHistory) {
          const parsedHistory = JSON.parse(savedHistory);
          if (Array.isArray(parsedHistory)) {
            setHistory(parsedHistory);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Save entries to storage on change
  useEffect(() => {
    AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  }, [entries]);

  // Save history to storage on change
  useEffect(() => {
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  // Refs for auto-focus
  const toInputRefs = useRef<{ [key: string]: RNTextInput | null }>({});
  const fromInputRefs = useRef<{ [key: string]: RNTextInput | null }>({});

  const handleBlur = (id: string, field: "from" | "to", value: string) => {
    const formatted = formatTimeInput(value);
    setEntries((entries) =>
      entries.map((e) => (e.id === id ? { ...e, [field]: formatted } : e))
    );
  };

  const handleFromChange = (id: string, text: string) => {
    const digits = text.replace(/\D/g, "");
    let fromError = "";
    if (/[^0-9]/.test(text)) {
      fromError = "Only numbers are allowed";
    }
    if (digits.length === 4) {
      const formatted = formatTimeInput(digits);
      if (!fromError && !isValidTime(formatted)) {
        fromError = "Invalid time (00:00–24:00)";
      }
      setEntries((entries) =>
        entries.map((e) =>
          e.id === id ? { ...e, from: formatted, fromError } : e
        )
      );
      if (!fromError && toInputRefs.current[id]) {
        toInputRefs.current[id]?.focus();
      }
    } else {
      setEntries((entries) =>
        entries.map((e) => (e.id === id ? { ...e, from: text, fromError } : e))
      );
    }
  };

  const handleToChange = (id: string, text: string) => {
    const digits = text.replace(/\D/g, "");
    let toError = "";
    if (/[^0-9]/.test(text)) {
      toError = "Only numbers are allowed";
    }
    if (digits.length === 4) {
      const formatted = formatTimeInput(digits);
      if (!toError && !isValidTime(formatted)) {
        toError = "Invalid time (00:00–24:00)";
      }
      setEntries((entries) => {
        const updated = entries.map((e) =>
          e.id === id ? { ...e, to: formatted, toError } : e
        );
        // If this is the last row and valid, add a new row and focus its 'From' input
        const isLastRow = entries[entries.length - 1].id === id;
        if (!toError && isLastRow) {
          const newId = (entries.length + 1).toString();
          setTimeout(() => {
            fromInputRefs.current[newId]?.focus();
          }, 100); // wait for row to render
          return [...updated, { id: newId, from: "", to: "" }];
        }
        return updated;
      });
    } else {
      setEntries((entries) =>
        entries.map((e) => (e.id === id ? { ...e, to: text, toError } : e))
      );
    }
  };

  const handleDeleteRow = (id: string) => {
    setEntries((entries) => {
      if (entries.length === 1) {
        // Only one row: clear it
        return [{ id, from: "", to: "" }];
      }
      return entries.filter((e) => e.id !== id);
    });
  };

  // Example row data
  const exampleFrom = "08:00";
  const exampleTo = "12:00";
  const exampleElapsed = getElapsed(exampleFrom, exampleTo);

  const renderEntry = ({ item }: { item: TimeEntry }) => {
    const hasError = !!item.fromError || !!item.toError;
    const elapsed = !hasError ? getElapsed(item.from, item.to) : null;
    return (
      <View style={styles.row}>
        <View style={styles.colFrom}>
          <TextInput
            ref={(ref) => {
              fromInputRefs.current[item.id] = ref;
            }}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
              },
              item.fromError
                ? {
                    borderColor: colors.errorText,
                    backgroundColor: colors.errorBackground,
                  }
                : null,
            ]}
            placeholder="From"
            placeholderTextColor={colors.mutedText}
            value={item.from}
            keyboardType="numeric"
            maxLength={5}
            onChangeText={(text) => handleFromChange(item.id, text)}
            returnKeyType="next"
            onSubmitEditing={() => toInputRefs.current[item.id]?.focus()}
          />
        </View>
        <View style={styles.colToText}>
          <Text style={[styles.toText, { color: colors.text }]}>-</Text>
        </View>
        <View style={styles.colTo}>
          <TextInput
            ref={(ref) => {
              toInputRefs.current[item.id] = ref;
            }}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
              },
              item.toError
                ? {
                    borderColor: colors.errorText,
                    backgroundColor: colors.errorBackground,
                  }
                : null,
            ]}
            placeholder="To"
            placeholderTextColor={colors.mutedText}
            value={item.to}
            keyboardType="numeric"
            maxLength={5}
            onChangeText={(text) => handleToChange(item.id, text)}
          />
        </View>
        <View style={styles.colElapsed}>
          <Text style={[styles.result, { color: colors.text }]}>
            {elapsed
              ? `${elapsed.hours}h ${elapsed.minutes}m / ${elapsed.total}m`
              : "--"}
          </Text>
          {/* Error messages */}
          {(item.fromError || item.toError) && (
            <View style={styles.errorContainer}>
              {item.fromError ? (
                <Text style={[styles.errorText, { color: colors.errorText }]}>
                  {item.fromError}
                </Text>
              ) : null}
              {item.toError ? (
                <Text style={[styles.errorText, { color: colors.errorText }]}>
                  {item.toError}
                </Text>
              ) : null}
            </View>
          )}
        </View>
        <View style={styles.colDelete}>
          <Text
            style={[styles.deleteButton, { color: colors.errorText }]}
            onPress={() => handleDeleteRow(item.id)}
            accessibilityLabel="Delete row"
          >
            ×
          </Text>
        </View>
      </View>
    );
  };

  // Calculate total
  const totalMins = entries.reduce((sum, entry) => {
    const elapsed = getElapsed(entry.from, entry.to);
    return sum + (elapsed ? elapsed.total : 0);
  }, 0);
  const totalHours = Math.floor(totalMins / 60);
  const totalMinutes = totalMins % 60;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>My Drive Time</Text>

      {/* Example Label and Column Headers */}
      <View style={styles.headerRow}>
        <Text style={[styles.exampleLabel, { color: colors.mutedText }]}>
          Example:
        </Text>
      </View>
      <View style={styles.labelRow}>
        <View style={styles.colFrom}>
          <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
            From Time
          </Text>
        </View>
        <View style={styles.colToText}></View>
        <View style={styles.colTo}>
          <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
            To Time
          </Text>
        </View>
        <View style={styles.colElapsed}>
          <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
            Elapsed
          </Text>
        </View>
        <View style={styles.colDelete}></View>
      </View>
      {/* Example Row */}
      <View style={[styles.row, { opacity: 0.6 }]}>
        <View
          style={[
            styles.colFrom,
            styles.exampleInput,
            {
              backgroundColor: colors.exampleBackground,
              borderColor: colors.exampleBorder,
            },
          ]}
        >
          <Text style={{ color: colors.text }}>08:00</Text>
        </View>
        <View style={styles.colToText}>
          <Text style={[styles.toText, { color: colors.text }]}>-</Text>
        </View>
        <View
          style={[
            styles.colTo,
            styles.exampleInput,
            {
              backgroundColor: colors.exampleBackground,
              borderColor: colors.exampleBorder,
            },
          ]}
        >
          <Text style={{ color: colors.text }}>12:00</Text>
        </View>
        <View style={styles.colElapsed}>
          <Text style={[styles.result, { color: colors.text }]}>
            {exampleElapsed
              ? `${exampleElapsed.hours}h ${exampleElapsed.minutes}m / ${exampleElapsed.total}m`
              : "--"}
          </Text>
        </View>
        <View style={styles.colDelete}></View>
      </View>
      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        style={{ width: "100%" }}
      />
      {/* Buttons Row */}
      <View style={styles.buttonRow}>
        <View style={styles.buttonWrapper}>
          <Button
            title="Add Row"
            onPress={() =>
              setEntries((entries) => [
                ...entries,
                { id: (entries.length + 1).toString(), from: "", to: "" },
              ])
            }
          />
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            title="Clear All"
            color="red"
            onPress={() => setEntries([{ id: "1", from: "", to: "" }])}
          />
        </View>
      </View>
      <View style={styles.totalRow}>
        <Text style={[styles.totalText, { color: colors.totalText }]}>
          Total: {totalHours}h {totalMinutes}m / {totalMins}m
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 40,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
    justifyContent: "space-between",
    minHeight: 48, // Ensure consistent row height
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    width: 80, // Revert to original width
    fontSize: 16,
    textAlign: "center",
  },
  toText: {
    marginHorizontal: 8,
    fontSize: 16,
  },
  result: {
    marginLeft: 10,
    fontSize: 16,
    minWidth: 120, // Ensure result area is always wide enough
    textAlign: "right",
    height: 24, // Consistent height for result
    lineHeight: 24,
    flexShrink: 0,
  },
  totalRow: {
    marginTop: 30,
    alignItems: "center",
    width: "100%",
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  exampleInput: {
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
  },
  errorContainer: {
    position: "absolute",
    left: 0,
    top: "100%",
    width: "100%",
    paddingTop: 2,
  },
  errorText: {
    fontSize: 12,
    textAlign: "left",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 2,
    marginTop: 10,
  },
  exampleLabel: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 2,
    marginLeft: 2,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 2,
    marginLeft: 2,
  },
  inputLabel: {
    fontSize: 13,
    minWidth: 80,
    textAlign: "center",
    fontWeight: "500",
  },
  labelCell: {
    width: 80, // match input width
    alignItems: "center",
    justifyContent: "center",
  },
  toTextLabelCell: {
    width: 24, // match the width of the 'to' text between inputs
    alignItems: "center",
    justifyContent: "center",
  },
  resultLabelCell: {
    minWidth: 120, // match result minWidth
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  colFrom: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  colToText: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  colTo: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  colElapsed: {
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  colDelete: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    fontSize: 22,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 16,
    textAlign: "center",
    overflow: "hidden",
    backgroundColor: "transparent",
    marginLeft: 2,
    marginRight: 2,
    // Add hover effect for web
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
    gap: 16, // for web, fallback below for native
  },
  buttonWrapper: {
    marginHorizontal: 8,
    flex: 1,
    minWidth: 120,
  },
});
