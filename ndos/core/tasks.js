// NDOS — core/tasks.js
// Task Model — full CRUD for task records
// Supports micro-step breakdown, cognitive load tagging, and status tracking

import { storage, NDOS_KEYS, rawLog } from "./storage.js";

// ─────────────────────────────────────────────
// TASK SCHEMA
// ─────────────────────────────────────────────
// {
//   task_id:          string (uuid)
//   task_name:        string
//   description:      string (optional)
//   estimated_effort: "small" | "medium" | "large"
//   cognitive_load:   "low" | "medium" | "high"
//   status:           "not_started" | "in_progress" | "completed" | "paused"
//   parent_id:        string | null  ← if this is a micro-step
//   micro_steps:      string[]       ← generated breakdown
//   priority:         1 | 2 | 3     ← 1 = highest
//   tags:             string[]
//   created_at:       ISO string
//   updated_at:       ISO string
// }

// ─────────────────────────────────────────────
// ACCESSORS
// ─────────────────────────────────────────────

export function getAllTasks() {
  return storage.get(NDOS_KEYS.TASKS) || [];
}

export function getTaskById(task_id) {
  return getAllTasks().find((t) => t.task_id === task_id) || null;
}

export function getTodayTasks() {
  const all = getAllTasks();
  // Return non-completed tasks, sorted by priority
  return all
    .filter((t) => t.status !== "completed" && !t.parent_id)
    .sort((a, b) => (a.priority || 3) - (b.priority || 3))
    .slice(0, 10); // limit to 10 active tasks
}

export function getFocusTasks() {
  // Max 3 priority tasks for Today Focus Board
  return getTodayTasks().slice(0, 3);
}

export function getMicroSteps(parent_id) {
  return getAllTasks().filter((t) => t.parent_id === parent_id);
}

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

export function createTask(data) {
  const task = {
    task_id:          crypto.randomUUID(),
    task_name:        data.task_name || "Untitled task",
    description:      data.description || "",
    estimated_effort: data.estimated_effort || "medium",
    cognitive_load:   data.cognitive_load || "medium",
    status:           "not_started",
    parent_id:        data.parent_id || null,
    micro_steps:      [],
    priority:         data.priority || 2,
    tags:             data.tags || [],
    created_at:       new Date().toISOString(),
    updated_at:       new Date().toISOString()
  };
  storage.update(NDOS_KEYS.TASKS, (tasks) => [...(tasks || []), task]);
  rawLog("TASK_CREATED", { task_id: task.task_id, task_name: task.task_name });
  return task;
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

export function updateTask(task_id, updates) {
  storage.update(NDOS_KEYS.TASKS, (tasks) =>
    (tasks || []).map((t) =>
      t.task_id === task_id
        ? { ...t, ...updates, updated_at: new Date().toISOString() }
        : t
    )
  );
  rawLog("TASK_UPDATED", { task_id, ...updates });
  return getTaskById(task_id);
}

export function setTaskStatus(task_id, status) {
  return updateTask(task_id, { status });
}

export function setActiveTask(task_id) {
  storage.set(NDOS_KEYS.ACTIVE_TASK, task_id);
  if (task_id) updateTask(task_id, { status: "in_progress" });
}

export function getActiveTask() {
  const id = storage.get(NDOS_KEYS.ACTIVE_TASK);
  return id ? getTaskById(id) : null;
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export function deleteTask(task_id) {
  // Also delete micro-steps
  storage.update(NDOS_KEYS.TASKS, (tasks) =>
    (tasks || []).filter((t) => t.task_id !== task_id && t.parent_id !== task_id)
  );
  rawLog("TASK_DELETED", { task_id });
}

export function clearCompleted() {
  storage.update(NDOS_KEYS.TASKS, (tasks) =>
    (tasks || []).filter((t) => t.status !== "completed")
  );
}

// ─────────────────────────────────────────────
// SUBSCRIBE
// ─────────────────────────────────────────────

export function onTasksChange(callback) {
  return storage.subscribe(NDOS_KEYS.TASKS, callback);
}
