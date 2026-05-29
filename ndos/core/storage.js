// NDOS — Neurodiversity Support & Daily Structure OS
// core/storage.js — Single Source of Truth (reused from BCO architecture contract)
// All state reads/writes flow through here. Replaces all LMS/training schemas.

// ─────────────────────────────────────────────
// STORAGE ADAPTER (localStorage with in-process reactivity)
// ─────────────────────────────────────────────

const _subscribers = new Map();

function _notify(key, value) {
  _subscribers.get(key)?.forEach((fn) => fn(value));
  _subscribers.get("*")?.forEach((fn) => fn({ key, value }));
}

export const StorageAdapter = {
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    _notify(key, value);
  },
  update(key, fn) {
    const current = this.get(key);
    const updated = fn(current);
    this.set(key, updated);
    return updated;
  },
  delete(key) {
    localStorage.removeItem(key);
    _notify(key, null);
  },
  subscribe(key, callback) {
    if (!_subscribers.has(key)) _subscribers.set(key, new Set());
    _subscribers.get(key).add(callback);
    const crossTab = (e) => {
      if (e.key === key) {
        try { callback(JSON.parse(e.newValue)); } catch { callback(null); }
      }
    };
    if (typeof window !== "undefined") window.addEventListener("storage", crossTab);
    return () => {
      _subscribers.get(key)?.delete(callback);
      if (typeof window !== "undefined") window.removeEventListener("storage", crossTab);
    };
  },
  subscribeAll(callback) { return this.subscribe("*", callback); }
};

// ─────────────────────────────────────────────
// NDOS STORAGE KEYS — replaces all BCO/LMS keys
// ─────────────────────────────────────────────

export const NDOS_KEYS = {
  USER_STATE:   "ndos_user_state",     // energy, focus, overwhelm, etc.
  TASKS:        "ndos_tasks",           // task model records
  ROUTINES:     "ndos_routines",        // morning / midday / evening blocks
  FOCUS_LOG:    "ndos_focus_log",       // historical state snapshots
  EVENTS:       "ndos_events",          // internal event log
  SETTINGS:     "ndos_settings",        // user preferences
  ACTIVE_TASK:  "ndos_active_task",     // currently focused task id
  RESET_LOG:    "ndos_reset_log"        // reset sequence history
};

// ─────────────────────────────────────────────
// STORAGE API
// ─────────────────────────────────────────────

export const storage = {
  get(key)          { return StorageAdapter.get(key); },
  set(key, value)   { StorageAdapter.set(key, value); rawLog("STATE_WRITE", { key }); },
  update(key, fn)   { StorageAdapter.update(key, fn); rawLog("STATE_UPDATE", { key }); },
  delete(key)       { StorageAdapter.delete(key); rawLog("STATE_DELETE", { key }); },
  subscribe(key, cb){ return StorageAdapter.subscribe(key, cb); },
  subscribeAll(cb)  { return StorageAdapter.subscribeAll(cb); }
};

export function rawLog(type, payload, module = "NDOS", source = "system") {
  const raw = JSON.parse(localStorage.getItem(NDOS_KEYS.EVENTS) || "[]");
  raw.push({ id: crypto.randomUUID(), type, module, payload, source, timestamp: new Date().toISOString() });
  // Keep last 500 events only
  if (raw.length > 500) raw.splice(0, raw.length - 500);
  localStorage.setItem(NDOS_KEYS.EVENTS, JSON.stringify(raw));
}
