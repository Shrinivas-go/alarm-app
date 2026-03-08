import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Audio } from "expo-av";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ─── Notification handler (fires even when app is foregrounded) ───────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface Alarm {
  id: string;
  time: Date;
  enabled: boolean;
  notificationId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m} ${ampm}`;
}

function nextAlarmDate(time: Date): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // schedule for tomorrow if past
  return next;
}

async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function scheduleNotification(alarm: Alarm): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) {
    Alert.alert(
      "Permission Required",
      "Please allow notifications to use alarms."
    );
    return null;
  }
  const trigger = nextAlarmDate(alarm.time);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Alarm",
      body: `Time: ${formatTime(alarm.time)}`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
  return id;
}

async function cancelNotification(id: string | null): Promise<void> {
  if (id) await Notifications.cancelScheduledNotificationAsync(id);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AlarmScreen() {
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Play sound when a notification fires while app is open
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          // Built-in Expo asset – swap for your own URI if preferred
          { uri: "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3" },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if ("didJustFinish" in status && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } catch (e) {
        console.warn("Sound error:", e);
      }
    });
    return () => sub.remove();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // ── Picker change ────────────────────────────────────────────────────────────
  const onTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (date) setSelectedTime(date);
  };

  // ── Add alarm ────────────────────────────────────────────────────────────────
  const handleSetAlarm = async () => {
    const newAlarm: Alarm = {
      id: Date.now().toString(),
      time: selectedTime,
      enabled: true,
      notificationId: null,
    };
    const notificationId = await scheduleNotification(newAlarm);
    newAlarm.notificationId = notificationId;
    setAlarms((prev) => [...prev, newAlarm]);
  };

  // ── Toggle alarm ─────────────────────────────────────────────────────────────
   const toggleAlarm = async (id: string) => {
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm) return;

    if (alarm.enabled) {
      // Disable: cancel notification and update state
      await cancelNotification(alarm.notificationId);
      setAlarms((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, enabled: false, notificationId: null } : a
        )
      );
    } else {
      // Enable: reschedule notification and update state
      const nid = await scheduleNotification(alarm);
      setAlarms((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, enabled: true, notificationId: nid } : a
        )
      );
    }
  };
  
  // ── Delete alarm ──────────────────────────────────────────────────────────────
  const deleteAlarm = async (id: string) => {
    const alarm = alarms.find((a) => a.id === id);
    if (alarm) await cancelNotification(alarm.notificationId);
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  // ─── UI ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Alarm</Text>

      {/* ── Time Picker ── */}
      <View style={styles.pickerCard}>
        <Text style={styles.pickerLabel}>Set Time</Text>

        {Platform.OS === "android" && !showPicker && (
          <TouchableOpacity
            style={styles.timeDisplay}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.timeDisplayText}>{formatTime(selectedTime)}</Text>
          </TouchableOpacity>
        )}

        {(Platform.OS === "ios" || showPicker) && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onTimeChange}
            style={styles.picker}
            textColor="#E8E8E8"
            themeVariant="dark"
          />
        )}
      </View>

      {/* ── Set Alarm Button ── */}
      <TouchableOpacity style={styles.setButton} onPress={handleSetAlarm}>
        <Text style={styles.setButtonText}>+  Set Alarm</Text>
      </TouchableOpacity>

      {/* ── Alarm List ── */}
      <Text style={styles.sectionTitle}>
        {alarms.length === 0 ? "No alarms set" : `Alarms (${alarms.length})`}
      </Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {alarms.map((alarm) => (
          <View
            key={alarm.id}
            style={[styles.alarmCard, !alarm.enabled && styles.alarmCardOff]}
          >
            {/* Time */}
            <Text
              style={[styles.alarmTime, !alarm.enabled && styles.alarmTimeOff]}
            >
              {formatTime(alarm.time)}
            </Text>

            {/* Next ring label */}
            <Text style={styles.alarmNext}>
              {alarm.enabled
                ? `Rings ${nextAlarmDate(alarm.time).toDateString() === new Date().toDateString() ? "today" : "tomorrow"}`
                : "Off"}
            </Text>

            {/* Controls */}
            <View style={styles.alarmControls}>
              {/* Toggle */}
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  alarm.enabled ? styles.toggleOn : styles.toggleOff,
                ]}
                onPress={() => toggleAlarm(alarm.id)}
              >
                <Text style={styles.toggleText}>
                  {alarm.enabled ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteAlarm(alarm.id)}
              >
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ACCENT = "#FF6B35";
const SURFACE = "#1C1C1E";
const CARD = "#2C2C2E";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  header: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 28,
  },

  // ── Picker card ──
  pickerCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#3A3A3C",
  },
  pickerLabel: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  picker: {
    width: "100%",
    height: 150,
  },
  timeDisplay: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: SURFACE,
    borderRadius: 14,
  },
  timeDisplayText: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "200",
    letterSpacing: 2,
  },

  // ── Set button ──
  setButton: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 28,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  setButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Section title ──
  sectionTitle: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  // ── List ──
  list: { flex: 1 },
  listContent: { paddingBottom: 40, gap: 12 },

  // ── Alarm card ──
  alarmCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3A3A3C",
  },
  alarmCardOff: {
    opacity: 0.5,
  },
  alarmTime: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "300",
    letterSpacing: 1,
    flex: 1,
  },
  alarmTimeOff: {
    color: "#636366",
  },
  alarmNext: {
    color: "#8E8E93",
    fontSize: 12,
    position: "absolute",
    bottom: 14,
    left: 18,
  },
  alarmControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  // Toggle
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  toggleOn: {
    backgroundColor: ACCENT,
  },
  toggleOff: {
    backgroundColor: "#3A3A3C",
  },
  toggleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Delete
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#3A3A3C",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    color: "#FF453A",
    fontSize: 14,
    fontWeight: "700",
  },
});