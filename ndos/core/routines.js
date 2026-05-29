// NDOS — core/routines.js
// Routine Model — morning_flow, midday_reset, evening_shutdown
// Routines are structured but flexible; they adapt based on user state.

import { storage, NDOS_KEYS, rawLog } from "./storage.js";

// ─────────────────────────────────────────────
// DEFAULT ROUTINES
// ─────────────────────────────────────────────

export const DEFAULT_ROUTINES = {
  morning_flow: [
    { step_id: crypto.randomUUID(), label: "Drink a full glass of water", duration_min: 1, effort: "small" },
    { step_id: crypto.randomUUID(), label: "Take 5 slow breaths", duration_min: 2, effort: "small" },
    { step_id: crypto.randomUUID(), label: "Review today's 3 focus tasks", duration_min: 3, effort: "small" },
    { step_id: crypto.randomUUID(), label: "Set your energy level for today", duration_min: 1, effort: "small" }
  ],
  midday_reset: [
    { step_id: crypto.randomUUID(), label: "Step away from screen for 2 minutes", duration_min: 2, effort: "small" },
    { step_id: crypto.randomUUID(), label: "Drink water or have a snack", duration_min: 2, effort: "small" },
    { step_id: crypto.randomUUID(), label: "Update your energy check-in", duration_min: 1, effort: "small" },
    { step_id: crypto.randomUUID(), label: "Pick one task to focus on next", duration_min: 2, effort: "small" }
  ],
  evening_shutdown: [
    { step_id: crypto.randomUUID(), label: "Mark today's completed tasks", duration_min: 3, effort: "small" },
    { step_id: crypto.randomUUID(), label: "Write tomorrow's 3 focus tasks", duration_min: 3, effort: "small" },
    { step_id: crypto.randomUUID(), label: "Close open tabs and apps", duration_min: 2, effort: "small" },
    { step_id: crypto.randomUUID(), label: "Set a wind-down alarm", duration_min: 1, effort: "small" }
  ]
};

// ─────────────────────────────────────────────
// ACCESSORS
// ─────────────────────────────────────────────

export function getRoutines() {
  return storage.get(NDOS_KEYS.ROUTINES) || DEFAULT_ROUTINES;
}

export function getRoutine(type) {
  // type: "morning_flow" | "midday_reset" | "evening_shutdown"
  const routines = getRoutines();
  return routines[type] || [];
}

// ─────────────────────────────────────────────
// ADAPTIVE ROUTINE — adjust based on user state
// ─────────────────────────────────────────────

export function getAdaptedRoutine(type, userState) {
  const base = getRoutine(type);
  const { overwhelm_level, energy_level } = userState;

  // High overwhelm → return only 2 steps
  if (overwhelm_level > 7) {
    return base.slice(0, 2).map((s) => ({
      ...s,
      label: `[Simplified] ${s.label}`
    }));
  }

  // Low energy → prepend an energy booster
  if (energy_level < 3) {
    return [
      { step_id: "energy-boost", label: "5 jumping jacks or shake your hands", duration_min: 1, effort: "small" },
      ...base
    ];
  }

  return base;
}

// ─────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────

export function saveRoutine(type, steps) {
  storage.update(NDOS_KEYS.ROUTINES, (r) => ({
    ...(r || DEFAULT_ROUTINES),
    [type]: steps
  }));
  rawLog("ROUTINE_SAVED", { type });
}

export function addRoutineStep(type, step) {
  const steps = getRoutine(type);
  const newStep = {
    step_id:      crypto.randomUUID(),
    label:        step.label || "New step",
    duration_min: step.duration_min || 2,
    effort:       step.effort || "small",
    ...step
  };
  saveRoutine(type, [...steps, newStep]);
  return newStep;
}

export function removeRoutineStep(type, step_id) {
  const steps = getRoutine(type).filter((s) => s.step_id !== step_id);
  saveRoutine(type, steps);
}

export function resetRoutines() {
  storage.set(NDOS_KEYS.ROUTINES, DEFAULT_ROUTINES);
  rawLog("ROUTINES_RESET", {});
}

// ─────────────────────────────────────────────
// SUBSCRIBE
// ─────────────────────────────────────────────

export function onRoutinesChange(callback) {
  return storage.subscribe(NDOS_KEYS.ROUTINES, callback);
}
