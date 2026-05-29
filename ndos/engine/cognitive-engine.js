// NDOS — engine/cognitive-engine.js
// Core "next action generator" — reads user state and responds with support suggestions.
// NOT a medical or diagnostic tool. Productivity and self-organisation only.

import { getUserState } from "../core/state.js";
import { getFocusTasks, getTaskById, createTask, updateTask } from "../core/tasks.js";
import { rawLog } from "../core/storage.js";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

export const MODES = {
  REDUCE_SCOPE:    "reduce_scope",
  ACTIVATION:      "activation",
  TASK_RESHAPE:    "task_reshape",
  RESET_SEQUENCE:  "reset_sequence",
  FLOW:            "flow",
  NORMAL:          "normal"
};

// ─────────────────────────────────────────────
// MAIN ENGINE — evaluates state → returns suggestion
// ─────────────────────────────────────────────

/**
 * evaluateState(state?)
 * Reads current user state and returns a CognitiveSuggestion object.
 * Returns: { mode, message, actions[], severity }
 */
export function evaluateState(state) {
  const s = state || getUserState();
  const { energy_level, focus_level, overwhelm_level, task_load, motivation_state } = s;

  rawLog("ENGINE_EVAL", { energy_level, focus_level, overwhelm_level });

  // ── RULE 1: High Overwhelm ───────────────────
  if (overwhelm_level > 7) {
    return {
      mode: MODES.REDUCE_SCOPE,
      severity: "high",
      message: "You're feeling overwhelmed. Let's bring this right down — one thing at a time.",
      actions: [
        { label: "Show only 1 task", action: "limit_to_one" },
        { label: "Break top task into tiny steps", action: "micro_break" },
        { label: "Start Reset Sequence", action: "trigger_reset" }
      ],
      tip: "Pick the smallest possible thing you can do right now. Just one."
    };
  }

  // ── RULE 2: Low Focus ────────────────────────
  if (focus_level < 4) {
    return {
      mode: MODES.ACTIVATION,
      severity: "medium",
      message: "Focus is low — let's do a quick activation task to get your brain switched on.",
      actions: [
        { label: "Give me a 2-min starter task", action: "activation_task" },
        { label: "Do a focus breath (1 min)", action: "breathwork" },
        { label: "Start Reset Sequence", action: "trigger_reset" }
      ],
      tip: "2–5 minutes of something easy will warm up your focus engine."
    };
  }

  // ── RULE 3: High Load + Low Energy ───────────
  if (task_load === "high" && energy_level < 4) {
    return {
      mode: MODES.TASK_RESHAPE,
      severity: "medium",
      message: "Lots on your plate but energy is low. Let's reshape — smaller steps, lighter load.",
      actions: [
        { label: "Reshape top task into micro-steps", action: "micro_break" },
        { label: "Defer low-priority tasks", action: "defer_tasks" },
        { label: "Take a 5-min break first", action: "short_break" }
      ],
      tip: "Energy-matched tasks are the secret. Small wins build momentum."
    };
  }

  // ── RULE 4: Stuck ────────────────────────────
  if (motivation_state === "stuck") {
    return {
      mode: MODES.RESET_SEQUENCE,
      severity: "medium",
      message: "Stuck happens — it's not a failure. Let's run a quick reset.",
      actions: [
        { label: "Start Reset Sequence", action: "trigger_reset" },
        { label: "Pick the tiniest next step", action: "smallest_next" },
        { label: "Switch to a different task", action: "task_switch" }
      ],
      tip: "The reset sequence: hydrate → 2-min break → one tiny step."
    };
  }

  // ── RULE 5: Fatigued ─────────────────────────
  if (motivation_state === "fatigued") {
    return {
      mode: MODES.RESET_SEQUENCE,
      severity: "low",
      message: "You're running on empty. Rest is productive — seriously.",
      actions: [
        { label: "Evening shutdown routine", action: "evening_shutdown" },
        { label: "Take a real break (15+ min)", action: "real_break" }
      ],
      tip: "Fighting fatigue costs more energy than taking a break."
    };
  }

  // ── RULE 6: Flowing ─────────────────────────
  if (motivation_state === "flowing") {
    return {
      mode: MODES.FLOW,
      severity: "none",
      message: "You're in flow — protect it! Silence notifications and keep going.",
      actions: [
        { label: "Continue current task", action: "continue" },
        { label: "Set a focus timer (25 min)", action: "focus_timer" }
      ],
      tip: "Flow is rare. Don't break it unnecessarily."
    };
  }

  // ── DEFAULT: Normal state ────────────────────
  return {
    mode: MODES.NORMAL,
    severity: "none",
    message: "You're in a good place. Let's get started on your focus tasks.",
    actions: [
      { label: "Start top task", action: "start_top_task" },
      { label: "Run morning routine", action: "morning_flow" }
    ],
    tip: "Pick your first task and just begin — even 5 minutes counts."
  };
}

// ─────────────────────────────────────────────
// ACTIVATION TASK GENERATOR
// ─────────────────────────────────────────────

const ACTIVATION_TASKS = [
  "Write down 3 things you need to do today (just the titles)",
  "Organise your desk surface — just clear a small area",
  "Reply to one easy message or email",
  "Read the first paragraph of something on your task list",
  "Open the app or document for your next task — just open it",
  "Set a timer for 5 minutes and do anything on your list",
  "Write your name and today's date on a piece of paper — then start",
  "Stand up, stretch for 60 seconds, then sit back down"
];

export function getActivationTask() {
  return ACTIVATION_TASKS[Math.floor(Math.random() * ACTIVATION_TASKS.length)];
}

// ─────────────────────────────────────────────
// RESET SEQUENCE
// ─────────────────────────────────────────────

export function getResetSequence() {
  return [
    { step: 1, label: "Drink a glass of water", duration_sec: 60, type: "hydration" },
    { step: 2, label: "Take a 2-minute break — stand up and move", duration_sec: 120, type: "break" },
    { step: 3, label: "Take 3 slow deep breaths", duration_sec: 30, type: "breathwork" },
    { step: 4, label: "Identify the smallest possible next step", duration_sec: 60, type: "clarity" }
  ];
}

// ─────────────────────────────────────────────
// TASK RESHAPER — breaks large tasks into micro-steps
// ─────────────────────────────────────────────

const BREAK_PATTERNS = {
  "clean": ["Stand up", "Pick up 5 items from the floor", "Clear one surface", "Put items in the right place", "Wipe one area"],
  "write": ["Open the document", "Write the title or heading", "Write one sentence", "Add 3 bullet points", "Expand one bullet point"],
  "email": ["Open your email", "Find the email you need to reply to", "Write just the opening line", "Add the main point", "Hit send"],
  "study": ["Open the material", "Read just the first paragraph", "Write one fact you learned", "Read the next section", "Summarise in your own words"],
  "call":  ["Find the phone number", "Write 2 things you want to say", "Press call", "Say hello"],
  "plan":  ["Write the goal in one sentence", "List 3 steps to get there", "Pick the first step", "Start the first step"],
  "default": ["Identify the very first physical action", "Do just that one action", "Notice what naturally comes next", "Do that next thing"]
};

export function reshapeTask(taskName) {
  const nameLower = (taskName || "").toLowerCase();
  const key = Object.keys(BREAK_PATTERNS).find((k) => k !== "default" && nameLower.includes(k)) || "default";
  const steps = BREAK_PATTERNS[key];
  rawLog("TASK_RESHAPED", { original: taskName, pattern: key, steps });
  return steps.map((label, i) => ({
    step_number: i + 1,
    label,
    estimated_time: "1–3 min",
    effort: "small"
  }));
}

/**
 * autoBreakTask(task_id)
 * Creates micro-step child tasks for a given parent task.
 */
export function autoBreakTask(task_id) {
  const task = getTaskById(task_id);
  if (!task) return [];

  const steps = reshapeTask(task.task_name);
  const childTasks = steps.map((s, i) =>
    createTask({
      task_name:        s.label,
      estimated_effort: "small",
      cognitive_load:   "low",
      parent_id:        task_id,
      priority:         i + 1
    })
  );

  // Mark parent as having been broken down
  updateTask(task_id, { estimated_effort: "large", status: "in_progress" });

  return childTasks;
}

// ─────────────────────────────────────────────
// NEXT SMALLEST ACTION
// ─────────────────────────────────────────────

export function getNextSmallestAction(task_id) {
  const task = task_id ? getTaskById(task_id) : null;

  if (!task) {
    const focusTasks = getFocusTasks();
    if (focusTasks.length === 0) return "Add a task to your focus board first.";
    const first = focusTasks[0];
    const steps = reshapeTask(first.task_name);
    return steps[0]?.label || "Start your top task — open the app or file for it.";
  }

  const steps = reshapeTask(task.task_name);
  return steps[0]?.label || `Start working on: ${task.task_name}`;
}
