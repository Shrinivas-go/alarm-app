import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (totalSeconds: number): string => {
  const clamped = Math.max(0, totalSeconds);
  const mm = String(Math.floor(clamped / 60)).padStart(2, "0");
  const ss = String(clamped % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const parseMinutes = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = parseInt(trimmed, 10);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
};

// ─── Types ───────────────────────────────────────────────────────────────────

type TimerState = "idle" | "running" | "paused" | "done";

// ─── Component ───────────────────────────────────────────────────────────────

export default function TimerScreen(){
  const [inputMinutes, setInputMinutes] = useState<string>("");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [inputError, setInputError] = useState<boolean>(false);

  // FIX 4: ReturnType<typeof setInterval> is correct for React Native —
  // resolves to number at runtime, avoids NodeJS.Timeout mismatch.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FIX 8: Mutable ref tracks remaining time inside the interval callback,
  // preventing stale closure over the `remainingSeconds` state value.
  const remainingRef = useRef<number>(0);

  // ── FIX 9: Vibrate on completion ─────────────────────────────────────────

  useEffect(() => {
    if (timerState === "done") {
      Vibration.vibrate([0, 300, 200, 300, 200, 300]);
    }
  }, [timerState]);

  // ── Interval helpers ──────────────────────────────────────────────────────

  // FIX 3: Single safe clear used by pause, reset, and auto-stop at zero.
  const clearTimer = (): void => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // FIX 5 & 8: Starts a 1-second interval; guard prevents double-intervals.
  const startInterval = (): void => {
    if (intervalRef.current !== null) return; // FIX 8: no duplicate intervals

    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;

      if (remainingRef.current <= 0) {
        clearTimer(); // FIX 3: clear before state update
        setRemainingSeconds(0);
        setTimerState("done");
      } else {
        setRemainingSeconds(remainingRef.current);
      }
    }, 1000);
  };

  // ── Button handlers ───────────────────────────────────────────────────────

  // FIX 1 & 2: Guard against empty / invalid input before starting.
  const handleStart = (): void => {
    const minutes = parseMinutes(inputMinutes);

    if (minutes === null) {
      setInputError(true);
      return;
    }

    setInputError(false);
    const totalSeconds = minutes * 60;
    remainingRef.current = totalSeconds;
    setRemainingSeconds(totalSeconds);
    setTimerState("running");
    startInterval();
  };

  const handleResume = (): void => {
    if (timerState !== "paused") return;
    setTimerState("running");
    startInterval();
  };

  // FIX 3: Clear interval on pause; snapshot ref for accurate resume.
  const handlePause = (): void => {
    clearTimer();
    remainingRef.current = remainingSeconds;
    setTimerState("paused");
  };

  // FIX 3: Clear interval on reset and restore all state.
  const handleReset = (): void => {
    clearTimer();
    Vibration.cancel();
    remainingRef.current = 0;
    setRemainingSeconds(0);
    setInputMinutes("");
    setInputError(false);
    setTimerState("idle");
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const isIdle    = timerState === "idle";
  const isRunning = timerState === "running";
  const isPaused  = timerState === "paused";
  const isDone    = timerState === "done";

  const statusLabel =
    isDone    ? "COMPLETE"      :
    isRunning ? "COUNTING DOWN" :
    isPaused  ? "PAUSED"        :
                "READY";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>

          {/* Screen title */}
          <Text style={styles.screenLabel}>TIMER</Text>

          {/* FIX 10: TextInput with explicit colors for dark background */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>SET MINUTES</Text>
            <TextInput
              style={[
                styles.input,
                inputError && styles.inputError,
                (!isIdle && !isDone) && styles.inputDisabled,
              ]}
              value={inputMinutes}
              onChangeText={(val) => {
                setInputMinutes(val.replace(/[^0-9]/g, ""));
                setInputError(false);
              }}
              keyboardType="number-pad"
              placeholder="00"
              placeholderTextColor="#2A2A2A"   // FIX 10
              cursorColor="#F2F2F2"             // FIX 10
              selectionColor="#39FF1466"        // FIX 10
              maxLength={3}
              editable={isIdle || isDone}
              selectTextOnFocus
            />
            {inputError && (
              <Text style={styles.errorText}>Enter a valid number of minutes</Text>
            )}
          </View>

          {/* FIX 6: mm:ss display */}
          <View style={styles.displayWrapper}>
            <Text style={[styles.timeText, isDone && styles.timeTextDone]}>
              {formatTime(remainingSeconds)}
            </Text>
            <View style={styles.displayRule} />
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot,
                isRunning && styles.dotRunning,
                isDone    && styles.dotDone,
                isPaused  && styles.dotPaused,
              ]} />
              <Text style={styles.statusLabel}>{statusLabel}</Text>
            </View>
          </View>

          {/* FIX 7: Start, Pause, Reset */}
          <View style={styles.buttonRow}>

            {(isIdle || isDone || isPaused) && (
              <TouchableOpacity
                style={styles.btnStart}
                onPress={isPaused ? handleResume : handleStart}
                activeOpacity={0.75}
              >
                <Text style={styles.btnStartText}>
                  {isPaused ? "RESUME" : "START"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btn, styles.btnPause, !isRunning && styles.btnDisabled]}
              onPress={handlePause}
              disabled={!isRunning}
              activeOpacity={0.75}
            >
              <Text style={styles.btnPauseText}>PAUSE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnReset, isIdle && styles.btnDisabled]}
              onPress={handleReset}
              disabled={isIdle}
              activeOpacity={0.75}
            >
              <Text style={styles.btnText}>RESET</Text>
            </TouchableOpacity>

          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const BG           = "#0D0D0D";
const SURFACE      = "#141414";
const BORDER       = "#1F1F1F";
const TEXT_DIM     = "#3A3A3A";
const TEXT_MID     = "#555";
const TEXT_BRIGHT  = "#F2F2F2";
const ACCENT_GREEN = "#39FF14";
const ACCENT_AMBER = "#FFB800";
const ACCENT_RED   = "#FF3B30";
const ACCENT_BLUE  = "#0A84FF";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: { flex: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 28,
  },

  screenLabel: {
    fontFamily: "Courier New",
    fontSize: 11,
    letterSpacing: 6,
    color: TEXT_DIM,
    fontWeight: "700",
  },

  // Input
  inputWrapper: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  inputLabel: {
    fontFamily: "Courier New",
    fontSize: 9,
    letterSpacing: 4,
    color: TEXT_DIM,
  },
  input: {
    fontFamily: "Courier New",
    fontSize: 48,
    fontWeight: "700",
    color: TEXT_BRIGHT,       // FIX 10: never inherit system theme colour
    backgroundColor: "transparent",
    textAlign: "center",
    width: 140,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 6,
    paddingTop: 0,
  },
  inputError: {
    borderBottomColor: ACCENT_RED,
    color: ACCENT_RED,
  },
  inputDisabled: {
    color: TEXT_MID,
    borderBottomColor: "#111",
  },
  errorText: {
    fontFamily: "Courier New",
    fontSize: 10,
    letterSpacing: 1,
    color: ACCENT_RED,
    marginTop: 4,
  },

  // Display
  displayWrapper: {
    alignItems: "center",
    width: "100%",
    paddingVertical: 28,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    gap: 16,
  },
  timeText: {
    fontFamily: "Courier New",
    fontSize: 84,
    fontWeight: "700",
    color: TEXT_BRIGHT,
    letterSpacing: -2,
  },
  timeTextDone: {
    color: ACCENT_AMBER,
  },
  displayRule: {
    width: 200,
    height: 1,
    backgroundColor: BORDER,
  },
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
  dotRunning: {
    backgroundColor: ACCENT_GREEN,
    shadowColor: ACCENT_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  dotPaused: {
    backgroundColor: ACCENT_BLUE,
  },
  dotDone: {
    backgroundColor: ACCENT_AMBER,
    shadowColor: ACCENT_AMBER,
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

  // Buttons
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
  },
  btnText: {
    fontFamily: "Courier New",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    color: TEXT_MID,
  },
  btnStart: {
    flex: 1,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT_GREEN,
  },
  btnStartText: {
    fontFamily: "Courier New",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    color: "#000",
  },
  btnPause: {
    backgroundColor: ACCENT_RED,
    borderColor: ACCENT_RED,
  },
  btnPauseText: {
    fontFamily: "Courier New",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    color: "#FFF",
  },
  btnReset: {
    backgroundColor: SURFACE,
    borderColor: BORDER,
  },
  btnDisabled: {
    opacity: 0.2,
  },
});