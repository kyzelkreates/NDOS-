// NDOS — core/state.js
// User State Model — energy, focus, overwhelm, task load, sensory load, motivation
// This is the central cognitive state record for the current user session.

import { storage, NDOS_KEYS } from "./storage.js";

// ─────────────────────────────────────────────
// DEFAULT STATE
// ─────────────────────────────────────────────

export const DEFAULT_USER_STATE = {
  energy_level:      5,       // 0–10
  focus_level:       5,       // 0–10
  overwhelm_level:   3,       // 0–10
  task_load:         "medium", // low | medium | high
  sensory_load:      "low",    // low | medium | high
  motivation_state:  "starting", // starting | stuck | flowing | fatigued
  last_updated:      null
};

// ─────────────────────────────────────────────
// STATE ACCESSORS
// ─────────────────────────────────────────────

export function getUserState() {
  return storage.get(NDOS_KEYS.USER_STATE) || { ...DEFAULT_USER_STATE };
}

export function setUserState(updates) {
  const current = getUserState();
  const next = { ...current, ...updates, last_updated: new Date().toISOString() };
  storage.set(NDOS_KEYS.USER_STATE, next);
  return next;
}

export function patchUserState(key, value) {
  return setUserState({ [key]: value });
}

export function resetUserState() {
  const fresh = { ...DEFAULT_USER_STATE, last_updated: new Date().toISOString() };
  storage.set(NDOS_KEYS.USER_STATE, fresh);
  return fresh;
}

// ─────────────────────────────────────────────
// STATE SNAPSHOT (for focus log)
// ─────────────────────────────────────────────

export function snapshotState() {
  const state = getUserState();
  const log = storage.get(NDOS_KEYS.FOCUS_LOG) || [];
  log.push({ ...state, snapshot_id: crypto.randomUUID(), captured_at: new Date().toISOString() });
  if (log.length > 200) log.splice(0, log.length - 200);
  storage.set(NDOS_KEYS.FOCUS_LOG, log);
  return state;
}

export function getFocusLog() {
  return storage.get(NDOS_KEYS.FOCUS_LOG) || [];
}

// ─────────────────────────────────────────────
// SUBSCRIBE TO STATE CHANGES
// ─────────────────────────────────────────────

export function onStateChange(callback) {
  return storage.subscribe(NDOS_KEYS.USER_STATE, callback);
}
