// Persistent study timer — survives navigation
import { useSyncExternalStore } from "react";

type TimerState = {
  running: boolean;
  startedAt: number | null; // epoch ms
  elapsedBefore: number; // seconds
  goalMinutes: number;
  discipline: string;
};

const KEY = "urstudy-timer-v1";
const load = (): TimerState => {
  if (typeof window === "undefined") return { running: false, startedAt: null, elapsedBefore: 0, goalMinutes: 25, discipline: "" };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { running: false, startedAt: null, elapsedBefore: 0, goalMinutes: 25, discipline: "" };
};

let state: TimerState = load();
const listeners = new Set<() => void>();

const emit = () => {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
};

export const timerStore = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  start: (goalMinutes: number, discipline: string) => {
    state = { running: true, startedAt: Date.now(), elapsedBefore: 0, goalMinutes, discipline };
    emit();
  },
  pause: () => {
    if (!state.running || !state.startedAt) return;
    const add = Math.floor((Date.now() - state.startedAt) / 1000);
    state = { ...state, running: false, startedAt: null, elapsedBefore: state.elapsedBefore + add };
    emit();
  },
  resume: () => {
    if (state.running) return;
    state = { ...state, running: true, startedAt: Date.now() };
    emit();
  },
  reset: () => {
    state = { running: false, startedAt: null, elapsedBefore: 0, goalMinutes: state.goalMinutes, discipline: state.discipline };
    emit();
  },
  setGoal: (g: number) => { state = { ...state, goalMinutes: g }; emit(); },
  setDiscipline: (d: string) => { state = { ...state, discipline: d }; emit(); },
};

export function elapsedSeconds(s: TimerState) {
  const runningExtra = s.running && s.startedAt ? Math.floor((Date.now() - s.startedAt) / 1000) : 0;
  return s.elapsedBefore + runningExtra;
}

export function useTimer() {
  const s = useSyncExternalStore(timerStore.subscribe, timerStore.get, timerStore.get);
  return s;
}

// Sync across tabs
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      try { state = JSON.parse(e.newValue); listeners.forEach((l) => l()); } catch {}
    }
  });
}
