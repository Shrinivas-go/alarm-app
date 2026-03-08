import React, { useRef, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Formats raw milliseconds into "mm:ss:ms" where ms is two digits (centiseconds). */
const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const cs = String(centiseconds).padStart(2, "0");

  return `${mm}:${ss}:${cs}`;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function StopwatchScreen() {
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Holds the setInterval handle with the correct TS type
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks the timestamp when the current interval started
  const startTimeRef = useRef<number>(0);
  // Accumulates elapsed time across pause/resume cycles
  const accumulatedRef = useRef<number>(0);

  // ── Controls ──────────────────────────────────────────────────────────────

  const handleStart = (): void => {
    if (isRunning) return;

    startTimeRef.current = Date.now();
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      setElapsedMs(accumulatedRef.current + (Date.now() - startTimeRef.current));
    }, 10);
  };

  const handleStop = (): void => {
    if (!isRunning) return;

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Freeze accumulated time so resume works correctly
    accumulatedRef.current += Date.now() - startTimeRef.current;
    setIsRunning(false);
  };

  const handleReset = (): void => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    accumulatedRef.current = 0;
    startTimeRef.current = 0;
    setElapsedMs(0);
    setIsRunning(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

      <View style={styles.container}>

        {/* Screen label */}
        <Text style={styles.screenLabel}>STOPWATCH</Text>

        {/* Time display */}
        <View style={styles.displayWrapper}>
          <Text style={styles.timeText}>{formatTime(elapsedMs)}</Text>
          <View style={styles.displayUnderline} />
          <View style={styles.unitRow}>
            <Text style={styles.unitLabel}>MM</Text>
            <Text style={styles.unitSpacer}>·</Text>
            <Text style={styles.unitLabel}>SS</Text>
            <Text style={styles.unitSpacer}>·</Text>
            <Text style={styles.unitLabel}>MS</Text>
          </View>
        </View>

        {/* Status indicator */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isRunning && styles.statusDotActive]} />
          <Text style={styles.statusLabel}>
            {isRunning ? "RUNNING" : elapsedMs > 0 ? "PAUSED" : "READY"}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {/* Start */}
          <TouchableOpacity
            style={[styles.btn, styles.btnStart, isRunning && styles.btnDisabled]}
            onPress={handleStart}
            disabled={isRunning}
            activeOpacity={0.75}
          >
            <Text style={[styles.btnText, styles.btnStartText]}>START</Text>
          </TouchableOpacity>

          {/* Stop */}
          <TouchableOpacity
            style={[styles.btn, styles.btnStop, !isRunning && styles.btnDisabled]}
            onPress={handleStop}
            disabled={!isRunning}
            activeOpacity={0.75}
          >
            <Text style={[styles.btnText, styles.btnStopText]}>STOP</Text>
          </TouchableOpacity>

          {/* Reset */}
          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnReset,
              isRunning && styles.btnDisabled,
            ]}
            onPress={handleReset}
            disabled={isRunning}
            activeOpacity={0.75}
          >
            <Text style={styles.btnText}>RESET</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ACCENT_GREEN = "#39FF14";
const ACCENT_RED = "#FF3B30";
const BG = "#0D0D0D";
const SURFACE = "#141414";
const BORDER = "#1F1F1F";
const TEXT_DIM = "#3A3A3A";
const TEXT_MID = "#555";
const TEXT_BRIGHT = "#F2F2F2";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },

  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 32,
  },

  // ── Screen label ──
  screenLabel: {
    fontFamily: "Courier New",
    fontSize: 11,
    letterSpacing: 6,
    color: TEXT_DIM,
    fontWeight: "700",
  },

  // ── Timer display ──
  displayWrapper: {
    alignItems: "center",
    width: "100%",
    paddingVertical: 28,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  timeText: {
    fontFamily: "Courier New",
    fontSize: 72,
    fontWeight: "700",
    color: TEXT_BRIGHT,
    letterSpacing: -1,
  },
  displayUnderline: {
    marginTop: 12,
    width: 240,
    height: 1,
    backgroundColor: BORDER,
  },
  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  unitLabel: {
    fontFamily: "Courier New",
    fontSize: 9,
    letterSpacing: 4,
    color: TEXT_DIM,
  },
  unitSpacer: {
    color: TEXT_DIM,
    fontSize: 10,
  },

  // ── Status ──
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: TEXT_DIM,
  },
  statusDotActive: {
    backgroundColor: ACCENT_GREEN,
    shadowColor: ACCENT_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  statusLabel: {
    fontFamily: "Courier New",
    fontSize: 10,
    letterSpacing: 4,
    color: TEXT_MID,
  },

  // ── Buttons ──
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  btnText: {
    fontFamily: "Courier New",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    color: TEXT_MID,
  },

  // Start — neon green fill
  btnStart: {
    backgroundColor: ACCENT_GREEN,
    borderColor: ACCENT_GREEN,
  },
  btnStartText: {
    color: "#000",
  },

  // Stop — red fill
  btnStop: {
    backgroundColor: ACCENT_RED,
    borderColor: ACCENT_RED,
  },
  btnStopText: {
    color: "#FFF",
  },

  // Reset — outlined
  btnReset: {
    backgroundColor: SURFACE,
  },

  // Disabled state
  btnDisabled: {
    opacity: 0.25,
  },
});