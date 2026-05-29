// NDOS — engine/routine-engine.js
// Routine Stability Engine — selects and adapts routines based on user state
// Handles morning activation, midday reset, and evening wind-down

import { getUserState } from "../core/state.js";
import { getAdaptedRoutine, getRoutine } from "../core/routines.js";
import { rawLog } from "../core/storage.js";

// ─────────────────────────────────────────────
// ROUTINE SELECTOR
// ─────────────────────────────────────────────

/**
 * getCurrentRoutineType()
 * Returns the appropriate routine type based on current time of day.
 */
export function getCurrentRoutineType() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning_flow";
  if (hour < 17) return "midday_reset";
  return "evening_shutdown";
}

/**
 * getSmartRoutine(type?)
 * Returns an adapted routine based on user state.
 * Falls back to time-of-day if type not specified.
 */
export function getSmartRoutine(type) {
  const routineType = type || getCurrentRoutineType();
  const state = getUserState();
  const routine = getAdaptedRoutine(routineType, state);
  rawLog("ROUTINE_LOADED", { type: routineType, steps: routine.length, state_snapshot: {
    energy: state.energy_level,
    overwhelm: state.overwhelm_level
  }});
  return { type: routineType, steps: routine };
}

// ─────────────────────────────────────────────
// ROUTINE DISPLAY LABELS
// ─────────────────────────────────────────────

export const ROUTINE_META = {
  morning_flow: {
    label:       "Morning Activation",
    emoji:       "☀️",
    description: "Start your day with intention",
    color:       "#f59e0b"
  },
  midday_reset: {
    label:       "Midday Reset",
    emoji:       "🔄",
    description: "Recharge and refocus for the afternoon",
    color:       "#3b82f6"
  },
  evening_shutdown: {
    label:       "Evening Wind-Down",
    emoji:       "🌙",
    description: "Close the day and prepare for tomorrow",
    color:       "#8b5cf6"
  }
};

// ─────────────────────────────────────────────
// ROUTINE SUGGESTIONS BASED ON BACKLOG
// ─────────────────────────────────────────────

/**
 * suggestRoutineBasedOnBacklog(taskCount)
 * Returns a simplified or expanded routine suggestion based on task backlog.
 */
export function suggestRoutineBasedOnBacklog(taskCount) {
  if (taskCount > 8) {
    return {
      suggestion: "task_reduction",
      message: "You have a lot on your list. Before your routine, consider removing or deferring 2–3 tasks.",
      action: "defer_tasks"
    };
  }
  if (taskCount === 0) {
    return {
      suggestion: "task_add",
      message: "Your task board is empty. Add 1–3 things you want to do today.",
      action: "add_task"
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// ROUTINE SESSION TRACKER
// ─────────────────────────────────────────────

let _activeRoutine = null;
let _activeStep = 0;

export function startRoutineSession(type) {
  const { steps } = getSmartRoutine(type);
  _activeRoutine = { type, steps, started_at: new Date().toISOString() };
  _activeStep = 0;
  rawLog("ROUTINE_STARTED", { type });
  return { ...(_activeRoutine), current_step: steps[0] || null };
}

export function nextRoutineStep() {
  if (!_activeRoutine) return null;
  _activeStep++;
  const step = _activeRoutine.steps[_activeStep] || null;
  if (!step) {
    rawLog("ROUTINE_COMPLETED", { type: _activeRoutine.type });
    _activeRoutine = null;
    return { done: true, message: "Routine complete! Well done." };
  }
  return { done: false, current_step: step, step_number: _activeStep + 1 };
}

export function getActiveRoutineSession() {
  if (!_activeRoutine) return null;
  return {
    ..._activeRoutine,
    current_step: _activeRoutine.steps[_activeStep],
    step_number: _activeStep + 1,
    total_steps: _activeRoutine.steps.length
  };
}

export function cancelRoutineSession() {
  rawLog("ROUTINE_CANCELLED", { type: _activeRoutine?.type });
  _activeRoutine = null;
  _activeStep = 0;
}
