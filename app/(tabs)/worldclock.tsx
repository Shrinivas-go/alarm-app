import React, { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

// ─── City definitions ─────────────────────────────────────────────────────────
interface City {
  name: string;
  timezone: string;
  country: string;
  abbreviation: string;
}

const CITIES: City[] = [
  { name: "New York",  country: "United States", timezone: "America/New_York",   abbreviation: "NYC" },
  { name: "London",   country: "United Kingdom", timezone: "Europe/London",       abbreviation: "LON" },
  { name: "Dubai",    country: "United Arab Emirates", timezone: "Asia/Dubai",   abbreviation: "DXB" },
  { name: "Tokyo",    country: "Japan",           timezone: "Asia/Tokyo",         abbreviation: "TYO" },
  { name: "Sydney",   country: "Australia",       timezone: "Australia/Sydney",   abbreviation: "SYD" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTimeInZone(timezone: string): { time: string; period: string; date: string; offset: string } {
  const now = new Date();

  const timeStr = now.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Split into time digits and AM/PM
  const [rawTime, period] = timeStr.split(" ");

  const dateStr = now.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // UTC offset
  const offsetStr = now.toLocaleTimeString("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  }).split(" ").pop() ?? "";

  return { time: rawTime, period, date: dateStr, offset: offsetStr };
}

function getRelativeDay(timezone: string): "today" | "tomorrow" | "yesterday" {
  const localDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
  const zoneDate = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  if (zoneDate === localDate) return "today";
  return zoneDate > localDate ? "tomorrow" : "yesterday";
}

// Dot color based on rough time-of-day
function getDayPhase(timezone: string): "morning" | "afternoon" | "evening" | "night" {
  const hour = parseInt(
    new Date().toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }),
    10
  );
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

const PHASE_COLORS: Record<string, string> = {
  morning:   "#FFD60A",
  afternoon: "#FF6B35",
  evening:   "#BF5AF2",
  night:     "#3A3A3C",
};

const PHASE_LABELS: Record<string, string> = {
  morning:   "Morning",
  afternoon: "Afternoon",
  evening:   "Evening",
  night:     "Night",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorldClockScreen() {
  const [tick, setTick] = useState(0);

  // Tick every second to trigger re-render
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>World Clock</Text>
      <Text style={styles.subheader}>
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {CITIES.map((city) => {
          const { time, period, date, offset } = getTimeInZone(city.timezone);
          const relDay = getRelativeDay(city.timezone);
          const phase = getDayPhase(city.timezone);
          const phaseColor = PHASE_COLORS[phase];

          return (
            <View key={city.name} style={styles.card}>
              {/* Left: city info */}
              <View style={styles.cardLeft}>
                {/* Phase dot + city name */}
                <View style={styles.cityRow}>
                  <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
                  <Text style={styles.cityName}>{city.name}</Text>
                </View>
                <Text style={styles.countryName}>{city.country}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{date}</Text>
                  {relDay !== "today" && (
                    <View style={styles.relDayBadge}>
                      <Text style={styles.relDayText}>
                        {relDay === "tomorrow" ? "+1" : "-1"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Right: time */}
              <View style={styles.cardRight}>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{time}</Text>
                  <Text style={styles.periodText}>{period}</Text>
                </View>
                <Text style={[styles.phaseLabel, { color: phaseColor }]}>
                  {PHASE_LABELS[phase]}
                </Text>
                <Text style={styles.offsetText}>{offset}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD = "#2C2C2E";
const BORDER = "#3A3A3C";
const MUTED = "#8E8E93";

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
  },
  subheader: {
    color: MUTED,
    fontSize: 15,
    fontWeight: "400",
    marginTop: 4,
    marginBottom: 28,
  },

  // ── List ──
  list: { flex: 1 },
  listContent: { gap: 12, paddingBottom: 40 },

  // ── Card ──
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Left
  cardLeft: { flex: 1, gap: 3 },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cityName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  countryName: {
    color: MUTED,
    fontSize: 12,
    marginLeft: 16,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 16 },
  metaText: { color: MUTED, fontSize: 12 },
  relDayBadge: {
    backgroundColor: "#FF6B3522",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  relDayText: { color: "#FF6B35", fontSize: 11, fontWeight: "700" },

  // Right
  cardRight: { alignItems: "flex-end", gap: 2 },
  timeRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  timeText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "200",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  periodText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 3,
  },
  phaseLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  offsetText: {
    color: MUTED,
    fontSize: 11,
  },
});