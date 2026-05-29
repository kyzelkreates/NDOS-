// NDOS — Public API barrel
// Single import surface for the entire Neurodiversity Support & Daily Structure OS
// NOT a medical device. Productivity and self-organisation only.

// ── Core State ──────────────────────────────
export {
  getUserState,
  setUserState,
  patchUserState,
  resetUserState,
  snapshotState,
  getFocusLog,
  onStateChange,
  DEFAULT_USER_STATE
} from "./core/state.js";

// ── Storage ─────────────────────────────────
export {
  storage,
  rawLog,
  NDOS_KEYS
} from "./core/storage.js";

// ── Tasks ────────────────────────────────────
export {
  getAllTasks,
  getTaskById,
  getTodayTasks,
  getFocusTasks,
  getMicroSteps,
  createTask,
  updateTask,
  setTaskStatus,
  setActiveTask,
  getActiveTask,
  deleteTask,
  clearCompleted,
  onTasksChange
} from "./core/tasks.js";

// ── Routines ─────────────────────────────────
export {
  getRoutines,
  getRoutine,
  getAdaptedRoutine,
  saveRoutine,
  addRoutineStep,
  removeRoutineStep,
  resetRoutines,
  onRoutinesChange,
  DEFAULT_ROUTINES
} from "./core/routines.js";

// ── Cognitive Engine ─────────────────────────
export {
  evaluateState,
  getActivationTask,
  getResetSequence,
  reshapeTask,
  autoBreakTask,
  getNextSmallestAction,
  MODES
} from "./engine/cognitive-engine.js";

// ── Routine Engine ───────────────────────────
export {
  getCurrentRoutineType,
  getSmartRoutine,
  suggestRoutineBasedOnBacklog,
  startRoutineSession,
  nextRoutineStep,
  getActiveRoutineSession,
  cancelRoutineSession,
  ROUTINE_META
} from "./engine/routine-engine.js";

// ── Dashboard UI ─────────────────────────────
export {
  mountDashboard,
  navigate
} from "./ui/dashboard.js";
