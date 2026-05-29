// NDOS — ui/dashboard.js
// Main dashboard UI composer
// Rule: UI reads state, never mutates. All writes go through core engines.
// NOT a medical device. Productivity and self-organisation only.

import { getUserState, setUserState, patchUserState, onStateChange } from "../core/state.js";
import { getFocusTasks, createTask, setTaskStatus, setActiveTask, getActiveTask, onTasksChange, clearCompleted } from "../core/tasks.js";
import { evaluateState, getResetSequence, getActivationTask, reshapeTask, autoBreakTask, getNextSmallestAction } from "../engine/cognitive-engine.js";
import { getSmartRoutine, ROUTINE_META, startRoutineSession, nextRoutineStep, getActiveRoutineSession, cancelRoutineSession, getCurrentRoutineType } from "../engine/routine-engine.js";

// ─────────────────────────────────────────────
// MOUNT POINT
// ─────────────────────────────────────────────

let _mountEl = null;
let _currentView = "focus"; // focus | routines | reset | settings

export function mountDashboard(mountEl) {
  if (!mountEl) throw new Error("[NDOS] Mount element not found.");
  _mountEl = mountEl;
  _render();

  // Subscribe to state changes and re-render
  onStateChange(() => _render());
  onTasksChange(() => _render());
}

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────

export function navigate(view) {
  _currentView = view;
  _render();
}

// ─────────────────────────────────────────────
// MAIN RENDER
// ─────────────────────────────────────────────

function _render() {
  if (!_mountEl) return;
  _mountEl.innerHTML = "";
  _mountEl.className = "ndos-app ndos-fade-in";
  _mountEl.appendChild(_buildTopBar());

  const layout = document.createElement("div");
  layout.className = "ndos-layout";
  layout.appendChild(_buildSidebar());

  const main = document.createElement("main");
  main.className = "ndos-main";

  switch (_currentView) {
    case "focus":    main.appendChild(_buildFocusView()); break;
    case "routines": main.appendChild(_buildRoutineView()); break;
    case "reset":    main.appendChild(_buildResetView()); break;
    case "settings": main.appendChild(_buildSettingsView()); break;
    default:         main.appendChild(_buildFocusView());
  }

  main.appendChild(_buildDisclaimer());
  layout.appendChild(main);
  _mountEl.appendChild(layout);
}

// ─────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────

function _buildTopBar() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const bar = document.createElement("header");
  bar.className = "ndos-topbar";
  bar.innerHTML = `
    <div class="ndos-topbar__brand">
      <div class="ndos-topbar__brand-dot"></div>
      NDOS
    </div>
    <div class="ndos-topbar__date">${dateStr}</div>
  `;
  return bar;
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────

function _buildSidebar() {
  const nav = [
    { id: "focus",    icon: "🎯", label: "Today Focus" },
    { id: "routines", icon: "🔄", label: "Routines" },
    { id: "reset",    icon: "🧘", label: "Reset / Calm" },
    { id: "settings", icon: "⚙️", label: "Settings" }
  ];

  const sidebar = document.createElement("aside");
  sidebar.className = "ndos-sidebar";

  const sectionLabel = document.createElement("div");
  sectionLabel.className = "ndos-sidebar__section-label";
  sectionLabel.textContent = "Navigation";
  sidebar.appendChild(sectionLabel);

  nav.forEach(({ id, icon, label }) => {
    const btn = document.createElement("button");
    btn.className = `ndos-nav-item${_currentView === id ? " active" : ""}`;
    btn.innerHTML = `<span class="ndos-nav-item__icon">${icon}</span> ${label}`;
    btn.addEventListener("click", () => navigate(id));
    sidebar.appendChild(btn);
  });

  return sidebar;
}

// ─────────────────────────────────────────────
// FOCUS VIEW — Today Focus Board
// ─────────────────────────────────────────────

function _buildFocusView() {
  const state = getUserState();
  const suggestion = evaluateState(state);
  const tasks = getFocusTasks();
  const activeTask = getActiveTask();

  const frag = document.createDocumentFragment();

  // ── Suggestion Card ────────────────────────
  frag.appendChild(_buildSuggestionCard(suggestion));

  // ── State Bar ─────────────────────────────
  frag.appendChild(_buildStateBar(state));

  // ── Today Focus Board ─────────────────────
  const board = document.createElement("section");
  board.className = "ndos-focus-board";

  const header = document.createElement("div");
  header.className = "ndos-focus-board__header";
  header.innerHTML = `
    <h2 class="ndos-section-title">🎯 Today's Focus <span class="ndos-section-title__sub ndos-badge ndos-badge--blue">${tasks.length}/3 tasks</span></h2>
  `;

  const addBtn = document.createElement("button");
  addBtn.className = "ndos-btn ndos-btn--secondary";
  addBtn.textContent = "+ Add task";
  addBtn.addEventListener("click", () => _showAddTaskModal());
  header.appendChild(addBtn);
  board.appendChild(header);

  if (tasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "ndos-empty";
    empty.innerHTML = `
      <div class="ndos-empty__icon">📋</div>
      <div class="ndos-empty__title">No tasks yet</div>
      <div class="ndos-empty__desc">Add up to 3 focus tasks for today. Keep it small — 3 things is enough.</div>
    `;
    board.appendChild(empty);
  } else {
    tasks.forEach((task, i) => {
      board.appendChild(_buildTaskCard(task, i + 1, activeTask?.task_id === task.task_id));
    });

    // ── START NOW Button ───────────────────────
    if (activeTask) {
      const startBtn = document.createElement("button");
      startBtn.className = "ndos-btn ndos-btn--start-now";
      startBtn.innerHTML = `▶ Continue: ${activeTask.task_name}`;
      startBtn.addEventListener("click", () => _showMicroStepView(activeTask));
      board.appendChild(startBtn);
    } else if (tasks.length > 0) {
      const startBtn = document.createElement("button");
      startBtn.className = "ndos-btn ndos-btn--start-now";
      startBtn.innerHTML = `▶ Start Now — ${tasks[0].task_name}`;
      startBtn.addEventListener("click", () => {
        setActiveTask(tasks[0].task_id);
        _showMicroStepView(tasks[0]);
      });
      board.appendChild(startBtn);
    }
  }

  frag.appendChild(board);

  // ── Next Smallest Action ───────────────────
  const nextAction = getNextSmallestAction(activeTask?.task_id);
  const nextDiv = document.createElement("div");
  nextDiv.className = "ndos-suggestion ndos-suggestion--normal";
  nextDiv.innerHTML = `
    <div class="ndos-suggestion__mode">Next smallest action</div>
    <div class="ndos-suggestion__message">→ ${nextAction}</div>
  `;
  frag.appendChild(nextDiv);

  return frag;
}

// ─────────────────────────────────────────────
// STATE BAR
// ─────────────────────────────────────────────

function _buildStateBar(state) {
  const bar = document.createElement("div");
  bar.className = "ndos-state-bar";

  const fields = [
    { key: "energy_level",    label: "Energy",    type: "slider", cls: "energy" },
    { key: "focus_level",     label: "Focus",     type: "slider", cls: "focus" },
    { key: "overwhelm_level", label: "Overwhelm", type: "slider", cls: "overwhelm" }
  ];

  fields.forEach(({ key, label, type, cls }) => {
    const item = document.createElement("div");
    item.className = "ndos-state-item";
    item.innerHTML = `
      <div class="ndos-state-item__label">${label}</div>
      <div class="ndos-state-item__value">${state[key]}/10</div>
      <input type="range" min="0" max="10" value="${state[key]}"
             class="ndos-slider ${cls}" data-key="${key}" />
    `;
    bar.appendChild(item);
  });

  // Motivation state selector
  const motItem = document.createElement("div");
  motItem.className = "ndos-state-item";
  motItem.innerHTML = `
    <div class="ndos-state-item__label">Feeling</div>
    <select class="ndos-select" data-key="motivation_state">
      ${["starting","stuck","flowing","fatigued"].map(v =>
        `<option value="${v}" ${state.motivation_state === v ? "selected" : ""}>${v}</option>`
      ).join("")}
    </select>
  `;
  bar.appendChild(motItem);

  // Bind inputs
  bar.querySelectorAll("[data-key]").forEach((el) => {
    const event = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(event, () => {
      const val = el.tagName === "INPUT" ? Number(el.value) : el.value;
      patchUserState(el.dataset.key, val);
      // Update display value for sliders
      if (el.tagName === "INPUT") {
        el.previousElementSibling.textContent = `${val}/10`;
      }
    });
  });

  return bar;
}

// ─────────────────────────────────────────────
// SUGGESTION CARD
// ─────────────────────────────────────────────

function _buildSuggestionCard(suggestion) {
  const severityMap = { high: "high", medium: "medium", low: "normal", none: "normal", flow: "flow" };
  const cls = severityMap[suggestion.severity] || "normal";

  const card = document.createElement("div");
  card.className = `ndos-suggestion ndos-suggestion--${cls} ndos-fade-in`;
  card.innerHTML = `
    <div class="ndos-suggestion__mode">🧠 ${suggestion.mode.replace(/_/g, " ")}</div>
    <div class="ndos-suggestion__message">${suggestion.message}</div>
    <div class="ndos-suggestion__tip">${suggestion.tip}</div>
    <div class="ndos-suggestion__actions"></div>
  `;

  const actionsEl = card.querySelector(".ndos-suggestion__actions");
  suggestion.actions.forEach(({ label, action }) => {
    const btn = document.createElement("button");
    btn.className = "ndos-btn ndos-btn--secondary";
    btn.textContent = label;
    btn.addEventListener("click", () => _handleSuggestionAction(action));
    actionsEl.appendChild(btn);
  });

  return card;
}

// ─────────────────────────────────────────────
// TASK CARD
// ─────────────────────────────────────────────

function _buildTaskCard(task, priority, isActive) {
  const card = document.createElement("div");
  card.className = `ndos-task-card${isActive ? " active" : ""}${task.status === "completed" ? " completed" : ""}`;
  card.innerHTML = `
    <div class="ndos-task-card__priority">#${priority}</div>
    <div class="ndos-task-card__name">${task.task_name}</div>
    <div class="ndos-task-card__meta">
      <span class="ndos-tag ndos-tag--${task.cognitive_load}">${task.cognitive_load} load</span>
      <span class="ndos-tag">${task.estimated_effort}</span>
      <span class="ndos-tag">${task.status.replace(/_/g, " ")}</span>
    </div>
    <div class="ndos-task-card__actions"></div>
  `;

  const actionsEl = card.querySelector(".ndos-task-card__actions");

  if (task.status !== "completed") {
    const startBtn = document.createElement("button");
    startBtn.className = "ndos-btn ndos-btn--primary";
    startBtn.textContent = isActive ? "▶ Continue" : "▶ Start";
    startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setActiveTask(task.task_id);
      _showMicroStepView(task);
    });
    actionsEl.appendChild(startBtn);

    const breakBtn = document.createElement("button");
    breakBtn.className = "ndos-btn ndos-btn--secondary";
    breakBtn.textContent = "⚡ Break it down";
    breakBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      _showMicroStepView(task);
    });
    actionsEl.appendChild(breakBtn);

    const doneBtn = document.createElement("button");
    doneBtn.className = "ndos-btn ndos-btn--ghost";
    doneBtn.textContent = "✓ Done";
    doneBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setTaskStatus(task.task_id, "completed");
    });
    actionsEl.appendChild(doneBtn);
  }

  return card;
}

// ─────────────────────────────────────────────
// MICRO-STEP MODAL
// ─────────────────────────────────────────────

function _showMicroStepView(task) {
  const steps = reshapeTask(task.task_name);
  const completed = new Set();

  const backdrop = document.createElement("div");
  backdrop.className = "ndos-modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "ndos-modal ndos-fade-in";
  modal.innerHTML = `
    <div class="ndos-modal__header">
      <div class="ndos-modal__title">⚡ ${task.task_name}</div>
      <button class="ndos-btn ndos-btn--ghost" id="close-modal">✕</button>
    </div>
    <div class="ndos-microstep-view">
      <div class="ndos-microstep-view__title">Broken down into tiny steps</div>
      <ul class="ndos-microstep-list" id="step-list"></ul>
    </div>
    <br>
    <button class="ndos-btn ndos-btn--primary" style="width:100%" id="done-all">✓ Mark task complete</button>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const list = modal.querySelector("#step-list");
  steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.className = "ndos-microstep";
    li.dataset.index = i;
    li.innerHTML = `
      <div class="ndos-microstep__check" data-check="${i}"></div>
      <div class="ndos-microstep__label">${step.label}</div>
      <div class="ndos-microstep__time">${step.estimated_time}</div>
    `;
    li.querySelector(".ndos-microstep__check").addEventListener("click", () => {
      if (completed.has(i)) { completed.delete(i); li.classList.remove("done"); }
      else { completed.add(i); li.classList.add("done"); }
    });
    list.appendChild(li);
  });

  modal.querySelector("#close-modal").addEventListener("click", () => backdrop.remove());
  modal.querySelector("#done-all").addEventListener("click", () => {
    setTaskStatus(task.task_id, "completed");
    backdrop.remove();
  });
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
}

// ─────────────────────────────────────────────
// ADD TASK MODAL
// ─────────────────────────────────────────────

function _showAddTaskModal() {
  const backdrop = document.createElement("div");
  backdrop.className = "ndos-modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "ndos-modal ndos-fade-in";
  modal.innerHTML = `
    <div class="ndos-modal__header">
      <div class="ndos-modal__title">Add a task</div>
      <button class="ndos-btn ndos-btn--ghost" id="close-modal">✕</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div class="ndos-form-group">
        <label class="ndos-label">Task name</label>
        <input class="ndos-input" id="task-name" placeholder="What do you need to do?" autofocus />
      </div>
      <div class="ndos-form-group">
        <label class="ndos-label">Effort</label>
        <select class="ndos-select" id="task-effort">
          <option value="small">Small (< 30 min)</option>
          <option value="medium" selected>Medium (30–90 min)</option>
          <option value="large">Large (> 90 min)</option>
        </select>
      </div>
      <div class="ndos-form-group">
        <label class="ndos-label">Cognitive load</label>
        <select class="ndos-select" id="task-load">
          <option value="low">Low — easy/routine</option>
          <option value="medium" selected>Medium — needs focus</option>
          <option value="high">High — complex/challenging</option>
        </select>
      </div>
      <button class="ndos-btn ndos-btn--primary" style="width:100%" id="save-task">Add to Focus Board</button>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  modal.querySelector("#close-modal").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });

  modal.querySelector("#save-task").addEventListener("click", () => {
    const name = modal.querySelector("#task-name").value.trim();
    if (!name) { modal.querySelector("#task-name").focus(); return; }
    createTask({
      task_name:        name,
      estimated_effort: modal.querySelector("#task-effort").value,
      cognitive_load:   modal.querySelector("#task-load").value,
      priority:         getFocusTasks().length + 1
    });
    backdrop.remove();
  });

  // Enter key
  modal.querySelector("#task-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") modal.querySelector("#save-task").click();
  });
}

// ─────────────────────────────────────────────
// SUGGESTION ACTIONS
// ─────────────────────────────────────────────

function _handleSuggestionAction(action) {
  switch (action) {
    case "trigger_reset":   navigate("reset"); break;
    case "morning_flow":    navigate("routines"); break;
    case "evening_shutdown": navigate("routines"); break;
    case "breathwork":
      alert("Breathe in for 4 seconds → hold for 4 → out for 6.\nDo this 3 times. Then come back.");
      break;
    case "activation_task":
      alert(`Activation task:\n\n${getActivationTask()}\n\nDo this right now — it'll take 2–5 minutes.`);
      break;
    case "short_break":
      alert("Take a 5-minute break.\nStand up. Move. Come back when you're ready.");
      break;
    case "focus_timer":
      alert("Set a 25-minute timer.\nSilence notifications.\nStart your top task.");
      break;
    case "micro_break": {
      const tasks = getFocusTasks();
      if (tasks.length > 0) _showMicroStepView(tasks[0]);
      break;
    }
    case "limit_to_one":
      patchUserState("task_load", "low");
      break;
    case "real_break":
      alert("Take a real break — at least 15 minutes.\nStep outside if you can.\nYou've earned it.");
      break;
    case "start_top_task": {
      const tasks = getFocusTasks();
      if (tasks.length > 0) { setActiveTask(tasks[0].task_id); _showMicroStepView(tasks[0]); }
      break;
    }
    default:
      console.log("[NDOS] Action:", action);
  }
}

// ─────────────────────────────────────────────
// ROUTINE VIEW
// ─────────────────────────────────────────────

function _buildRoutineView() {
  const frag = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ndos-section-title";
  title.innerHTML = "🔄 Your Routines <span class='ndos-section-title__sub'>Structured but flexible</span>";
  frag.appendChild(title);

  const blocks = document.createElement("div");
  blocks.className = "ndos-routine-blocks";

  const types = ["morning_flow", "midday_reset", "evening_shutdown"];
  const current = getCurrentRoutineType();

  types.forEach((type) => {
    const meta = ROUTINE_META[type];
    const { steps } = getSmartRoutine(type);
    const totalMin = steps.reduce((sum, s) => sum + (s.duration_min || 2), 0);

    const block = document.createElement("div");
    block.className = `ndos-routine-block ndos-routine-block--${type.split("_")[0]}${type === current ? " active" : ""}`;
    block.innerHTML = `
      <div class="ndos-routine-block__emoji">${meta.emoji}</div>
      <div class="ndos-routine-block__name">${meta.label}</div>
      <div class="ndos-routine-block__desc">${meta.description}</div>
      <div class="ndos-routine-block__steps">${steps.length} steps · ~${totalMin} min</div>
    `;
    block.addEventListener("click", () => _showRoutineSession(type));
    blocks.appendChild(block);
  });

  frag.appendChild(blocks);

  // ── Current Routine Detail ─────────────────
  const { type, steps } = getSmartRoutine();
  const meta = ROUTINE_META[type];

  const detail = document.createElement("div");
  detail.className = "ndos-microstep-view";
  detail.innerHTML = `
    <div class="ndos-microstep-view__title">${meta.emoji} ${meta.label} — now</div>
    <ul class="ndos-microstep-list" id="routine-steps"></ul>
    <br>
    <button class="ndos-btn ndos-btn--primary" id="start-routine">Start ${meta.label}</button>
  `;

  const list = detail.querySelector("#routine-steps");
  steps.forEach((step) => {
    const li = document.createElement("li");
    li.className = "ndos-microstep";
    li.innerHTML = `
      <div class="ndos-microstep__check"></div>
      <div class="ndos-microstep__label">${step.label}</div>
      <div class="ndos-microstep__time">${step.duration_min} min</div>
    `;
    list.appendChild(li);
  });

  detail.querySelector("#start-routine").addEventListener("click", () => _showRoutineSession(type));
  frag.appendChild(detail);

  return frag;
}

// ─────────────────────────────────────────────
// ROUTINE SESSION MODAL
// ─────────────────────────────────────────────

function _showRoutineSession(type) {
  const session = startRoutineSession(type);
  const meta = ROUTINE_META[type];
  const completed = new Set();

  const backdrop = document.createElement("div");
  backdrop.className = "ndos-modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "ndos-modal ndos-fade-in";
  modal.innerHTML = `
    <div class="ndos-modal__header">
      <div class="ndos-modal__title">${meta.emoji} ${meta.label}</div>
      <button class="ndos-btn ndos-btn--ghost" id="close-routine">✕</button>
    </div>
    <ul class="ndos-microstep-list" id="routine-session-list"></ul>
    <br>
    <button class="ndos-btn ndos-btn--primary" style="width:100%" id="complete-routine">✓ Complete routine</button>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const list = modal.querySelector("#routine-session-list");
  session.steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.className = "ndos-microstep";
    li.innerHTML = `
      <div class="ndos-microstep__check"></div>
      <div class="ndos-microstep__label">${step.label}</div>
      <div class="ndos-microstep__time">${step.duration_min} min</div>
    `;
    li.querySelector(".ndos-microstep__check").addEventListener("click", () => {
      if (completed.has(i)) { completed.delete(i); li.classList.remove("done"); }
      else { completed.add(i); li.classList.add("done"); }
    });
    list.appendChild(li);
  });

  modal.querySelector("#close-routine").addEventListener("click", () => { cancelRoutineSession(); backdrop.remove(); });
  modal.querySelector("#complete-routine").addEventListener("click", () => { backdrop.remove(); });
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) { cancelRoutineSession(); backdrop.remove(); } });
}

// ─────────────────────────────────────────────
// RESET / CALM VIEW
// ─────────────────────────────────────────────

function _buildResetView() {
  const steps = getResetSequence();
  const state = getUserState();

  const frag = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ndos-section-title";
  title.innerHTML = "🧘 Reset & Calm Panel <span class='ndos-section-title__sub'>Use whenever you feel stuck or overwhelmed</span>";
  frag.appendChild(title);

  const panel = document.createElement("div");
  panel.className = "ndos-reset-panel";
  panel.innerHTML = `
    <div class="ndos-reset-panel__title">🔄 Reset Sequence</div>
    <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:16px;">
      Work through these steps in order. You don't have to rush — each one helps.
    </p>
  `;

  steps.forEach((step) => {
    const div = document.createElement("div");
    div.className = "ndos-reset-step";
    div.innerHTML = `
      <div class="ndos-reset-step__num">${step.step}</div>
      <div class="ndos-reset-step__content">
        <div class="ndos-reset-step__label">${step.label}</div>
        <div class="ndos-reset-step__time">${Math.round(step.duration_sec / 60)} min</div>
      </div>
    `;
    panel.appendChild(div);
  });

  frag.appendChild(panel);

  // Activation task
  const activationDiv = document.createElement("div");
  activationDiv.className = "ndos-suggestion ndos-suggestion--normal";
  activationDiv.innerHTML = `
    <div class="ndos-suggestion__mode">⚡ Activation task — 2–5 minutes</div>
    <div class="ndos-suggestion__message" id="activation-msg">${getActivationTask()}</div>
    <button class="ndos-btn ndos-btn--secondary" id="new-activation" style="margin-top:12px">Try a different one</button>
  `;
  activationDiv.querySelector("#new-activation").addEventListener("click", () => {
    activationDiv.querySelector("#activation-msg").textContent = getActivationTask();
  });
  frag.appendChild(activationDiv);

  // Update motivation state
  const stuckDiv = document.createElement("div");
  stuckDiv.className = "ndos-suggestion ndos-suggestion--medium";
  stuckDiv.innerHTML = `
    <div class="ndos-suggestion__mode">Update your state</div>
    <div class="ndos-suggestion__message">How are you feeling right now?</div>
    <div class="ndos-suggestion__actions">
      ${["starting","stuck","flowing","fatigued"].map((v) =>
        `<button class="ndos-btn ndos-btn--secondary${state.motivation_state === v ? " active" : ""}"
         data-mot="${v}">${v}</button>`
      ).join("")}
    </div>
  `;
  stuckDiv.querySelectorAll("[data-mot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      patchUserState("motivation_state", btn.dataset.mot);
      stuckDiv.querySelectorAll("[data-mot]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
  frag.appendChild(stuckDiv);

  return frag;
}

// ─────────────────────────────────────────────
// SETTINGS VIEW
// ─────────────────────────────────────────────

function _buildSettingsView() {
  const frag = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ndos-section-title";
  title.innerHTML = "⚙️ Settings";
  frag.appendChild(title);

  const card = document.createElement("div");
  card.className = "ndos-suggestion";
  card.innerHTML = `
    <div class="ndos-suggestion__mode">Task management</div>
    <div class="ndos-suggestion__message">Manage completed tasks</div>
    <div class="ndos-suggestion__actions">
      <button class="ndos-btn ndos-btn--secondary" id="clear-completed">Clear completed tasks</button>
    </div>
  `;
  card.querySelector("#clear-completed").addEventListener("click", () => {
    if (confirm("Clear all completed tasks?")) clearCompleted();
  });
  frag.appendChild(card);

  const aboutCard = document.createElement("div");
  aboutCard.className = "ndos-suggestion";
  aboutCard.innerHTML = `
    <div class="ndos-suggestion__mode">About NDOS</div>
    <div class="ndos-suggestion__message">Neurodiversity Support & Daily Structure OS</div>
    <div class="ndos-suggestion__tip">
      A personal support and organisation tool for ADHD-style attention support, autistic-friendly routine structuring, and cognitive load reduction.
      Not a medical device. Not a diagnostic tool. A tool to help you structure your day.
    </div>
  `;
  frag.appendChild(aboutCard);

  return frag;
}

// ─────────────────────────────────────────────
// DISCLAIMER
// ─────────────────────────────────────────────

function _buildDisclaimer() {
  const p = document.createElement("p");
  p.className = "ndos-disclaimer";
  p.textContent = "NDOS is a personal productivity and self-organisation tool. It is not a medical device, does not diagnose or treat any condition, and does not replace professional support. For clinical support, please speak to a qualified professional.";
  return p;
}
