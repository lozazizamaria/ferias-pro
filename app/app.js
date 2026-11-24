/* ===== My Plan — Aplicação Principal (Modo Pessoal + Modo Profissional) ===== */
const LEGACY_KEY_1 = "ferias-pro-state-v1";
const LEGACY_KEY_2 = "ferias-planner-v1";
const THEME_KEY = "ferias-pro-theme";
const PWA_DISMISS_KEY = "ferias-pro-pwa-dismissed";
const APP_MODE_KEY = "myplan-app-mode";
const SELECTED_TRIPS_PRO_KEY = "myplan-selected-trips-pro";
const GANTT_ZOOM_STEPS = [2.5, 3, 3.5, 4.5, 6, 8, 10, 13, 16, 19, 21, 22, 26, 32, 38, 44, 50, 58, 68, 82, 98, 116];

let appMode = localStorage.getItem(APP_MODE_KEY) === "professional" ? "professional" : "personal";
let lastPersonalView = "gantt";
let lastProView = "pro-board";
let activeGanttPrintCtx = null;
let ganttUnifiedMode = false;
let ganttConflictsOnly = false;
let unifiedSelectedTripIds = null;
let unifiedSelectionCustomized = false;
let unifiedCalMenuOpenBarId = null;
let personalDateFrom = "";
let personalDateTo = "";
const unifiedMetaMap = new WeakMap();
const unifiedConflictMap = new WeakMap();
const UNIFIED_CAL_PALETTE = ["#2563eb", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#6366f1"];

function getTripMode(t) {
  return (t?.mode || t?.data?.mode) === "professional" ? "professional" : "personal";
}

function getSelectedTripsStorageKey() {
  return appMode === "professional" ? SELECTED_TRIPS_PRO_KEY : SELECTED_TRIPS_KEY;
}

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = o => JSON.parse(JSON.stringify(o));
const DAY = 864e5;
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MON_ABBR = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const MON_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const SELECTED_TRIPS_KEY = "ferias-pro-selected-trips";
const CUSTOM_TAGS_KEY = "ferias-pro-custom-tags";
let ganttFilterTypes = new Set(Object.keys(window.ACTIVITY_TYPES || {}));
let ganttFilterTags = new Set();
let tableFilterTypes = new Set(Object.keys(window.ACTIVITY_TYPES || {}));
let tableFilterTags = new Set();
let selectedTripIds = [];
let loadedTripsMap = new Map();
const actOriginMap = new WeakMap();
const MULTI_TRIP_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#a78bfa"];
let ganttTypeMsel = null;
let ganttTagMsel = null;
let dashTypeMsel = null;
let dashTagMsel = null;
let finTypeMsel = null;
let finTagMsel = null;
let tableTypeMsel = null;
let tableTagMsel = null;
let modalTagsMsel = null;
let modalDraftTags = [];
let tripMultiMsel = null;
let editingTripRef = null;
let ganttMode = "gantt";
let ganttZoom = window.innerWidth < 720 ? 50 : 48;
let ganttSlimRail = window.innerWidth < 720;
let checklistFilter = "";
let financeFilter = "all";
let activeFinanceDate = "";
let finExpanded = false;

let tripsCache = { ownTrips: [], sharedTrips: [], pendingShares: [] };
let activeTrip = null; // { id, name, role, ownerName, ... }
let state = migrateState(clone(window.DEFAULT_DATA));
let authMode = "login";
let deferredInstallPrompt = null;
let prefetchedPkpass = null;
let pwaPromptWaiters = [];

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const menuBtn = $("#btnMenuInstall");
  if (menuBtn) menuBtn.hidden = false;
  pwaPromptWaiters.forEach(fn => { try { fn(e); } catch {} });
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  const b = $("#pwaInstallBanner");
  const m = $("#btnMenuInstall");
  if (b) b.hidden = true;
  if (m) m.hidden = true;
});

function getTypeInfo(type) {
  return (window.ACTIVITY_TYPES && window.ACTIVITY_TYPES[type]) || {
    id: type || "Outro", label: type || "Outro", short: type || "Outro", icon: "•", cls: "Outro", costLabel: "Custo (R$)"
  };
}

function migrateState(raw) {
  const def = clone(window.DEFAULT_DATA);
  const s = raw && typeof raw === "object" ? raw : {};
  const merged = {
    title: s.title || def.title,
    customTags: Array.isArray(s.customTags)
      ? [...new Set(s.customTags.map(t => String(t || "").trim()).filter(Boolean))]
      : [],
    vehicle: Object.assign({}, def.vehicle, s.vehicle || {}),
    params: Object.assign({}, def.params, s.params || {}),
    scenarios: Array.isArray(s.scenarios) && s.scenarios.length ? s.scenarios : def.scenarios,
    activities: Array.isArray(s.activities) ? s.activities : [],
    checklist: Array.isArray(s.checklist) ? s.checklist : []
  };
  merged.activities.forEach(a => {
    if (!a.id) a.id = uid();
    if (!a.end) a.end = a.start;
    if (a.extraCost == null) a.extraCost = 0;
    if (!Array.isArray(a.attachments)) a.attachments = [];
    if (!Array.isArray(a.tickets)) a.tickets = [];
    a.tags = Array.isArray(a.tags)
      ? [...new Set(a.tags.map(t => String(t || "").trim()).filter(Boolean))]
      : [];
    if (a.type === "Viagem") {
      if (a.charges == null) a.charges = merged.params.defaultCharges ?? 1;
      if (a.includeRouteCost === undefined) a.includeRouteCost = true;
    }
  });
  merged.checklist.forEach(c => { if (!c.id) c.id = uid(); });
  const rawFin = s.finance && typeof s.finance === "object" ? s.finance : {};
  merged.finance = {
    savingsGoal: Math.max(0, Number(rawFin.savingsGoal) || 0),
    dailyRecords: rawFin.dailyRecords && typeof rawFin.dailyRecords === "object" ? clone(rawFin.dailyRecords) : {}
  };
  return merged;
}

function getSelectedTrips() {
  const list = selectedTripIds.map(id => loadedTripsMap.get(id)).filter(Boolean);
  if (!list.length && activeTrip) {
    if (!loadedTripsMap.has(activeTrip.id)) loadedTripsMap.set(activeTrip.id, activeTrip);
    activeTrip.data = state;
    return [activeTrip];
  }
  return list;
}

function isMultiTripMode() {
  return getSelectedTrips().length > 1;
}

function getActivityMeta(a) {
  return a ? (actOriginMap.get(a) || null) : null;
}

function getTripBadgeHTML(a) {
  if (!isMultiTripMode()) return "";
  const meta = getActivityMeta(a);
  if (!meta?.tripName) return "";
  const col = MULTI_TRIP_COLORS[(meta.colorIdx || 0) % MULTI_TRIP_COLORS.length];
  return `<span class="trip-tag-pill" style="--tc:${col}" title="Viagem: ${esc(meta.tripName)}">${esc(meta.tripName)}</span>`;
}

function findActivityContext(id) {
  const trips = getSelectedTrips();
  for (const tr of trips) {
    const acts = tr?.data?.activities || [];
    const act = acts.find(x => x.id === id);
    if (act) return { trip: tr, data: tr.data, activity: act };
  }
  for (const tr of loadedTripsMap.values()) {
    const acts = tr?.data?.activities || [];
    const act = acts.find(x => x.id === id);
    if (act) return { trip: tr, data: tr.data, activity: act };
  }
  const fallback = (state.activities || []).find(x => x.id === id);
  return fallback ? { trip: activeTrip, data: state, activity: fallback } : null;
}

async function resolveTripRefById(tripId) {
  if (!tripId) return activeTrip;
  if (loadedTripsMap.has(tripId)) return loadedTripsMap.get(tripId);
  if (activeTrip && activeTrip.id === tripId) {
    loadedTripsMap.set(tripId, activeTrip);
    return activeTrip;
  }
  const res = await window.FeriasApi.getTrip(tripId);
  if (!res || !res.trip) return null;
  const m = getTripMode(res.trip);
  const data = m === "professional" && window.MyPlanPro
    ? window.MyPlanPro.migrateProState(res.trip.data)
    : migrateState(res.trip.data);
  const tr = { ...res.trip, mode: m, data };
  tr.data.title = tr.name || tr.data.title;
  loadedTripsMap.set(tr.id, tr);
  return tr;
}

function populateEventSelect(selEl, mode = "personal", currentTripId = "") {
  if (!selEl) return;
  const targetMode = mode === "professional" ? "professional" : "personal";
  const ownAll = (tripsCache.ownTrips || []).filter(t => getTripMode(t) === targetMode);
  const sharedAll = (tripsCache.sharedTrips || []).filter(t => getTripMode(t) === targetMode);

  // Fallback offline ou cache vazio
  const own = [...ownAll];
  const shared = [...sharedAll];
  const seen = new Set([...own, ...shared].map(t => t.id));
  loadedTripsMap.forEach(tr => {
    if (!seen.has(tr.id) && getTripMode(tr) === targetMode) {
      seen.add(tr.id);
      if (tr.role && tr.role !== "owner") shared.push(tr);
      else own.push(tr);
    }
  });
  if (activeTrip && !seen.has(activeTrip.id) && getTripMode(activeTrip) === targetMode) {
    seen.add(activeTrip.id);
    if (activeTrip.role && activeTrip.role !== "owner") shared.push(activeTrip);
    else own.push(activeTrip);
  }

  let html = "";
  if (own.length) {
    html += `<optgroup label="${targetMode === "professional" ? "Meus Projetos / Eventos" : "Meus Eventos & Viagens"}">`;
    own.forEach(t => {
      const title = loadedTripsMap.get(t.id)?.data?.title || t.name || t.data?.title || "Sem nome";
      html += `<option value="${esc(t.id)}">${esc(title)}</option>`;
    });
    html += `</optgroup>`;
  }
  if (shared.length) {
    html += `<optgroup label="Compartilhados comigo">`;
    shared.forEach(t => {
      const title = loadedTripsMap.get(t.id)?.data?.title || t.name || t.data?.title || "Compartilhado";
      const isViewer = t.role === "viewer" && t.id !== currentTripId;
      const ownerLbl = t.ownerName ? ` · ${t.ownerName}` : "";
      const roLbl = t.role === "viewer" ? " (somente leitura)" : "";
      html += `<option value="${esc(t.id)}"${isViewer ? " disabled" : ""}>👥 ${esc(title)}${esc(ownerLbl)}${roLbl}</option>`;
    });
    html += `</optgroup>`;
  }
  if (!html) {
    if (activeTrip && getTripMode(activeTrip) === targetMode) {
      html = `<option value="${esc(activeTrip.id)}">${esc(state.title || activeTrip.name || "Atual")}</option>`;
    } else {
      const newLabel = targetMode === "professional"
        ? "➕ Criar novo Projeto Profissional"
        : "➕ Criar novo Planejamento Pessoal";
      html = `<option value="__create_${targetMode}__">${esc(newLabel)}</option>`;
    }
  }
  selEl.innerHTML = html;
  const pickId = currentTripId && [...selEl.options].some(o => o.value === currentTripId)
    ? currentTripId
    : (activeTrip && [...selEl.options].some(o => o.value === activeTrip.id) ? activeTrip.id : (selEl.options[0]?.value || ""));
  if (pickId) selEl.value = pickId;
}

async function ensureTargetTripForMode(chosenId, targetMode) {
  const mode = targetMode === "professional" ? "professional" : "personal";
  if (chosenId && !String(chosenId).startsWith("__create_")) {
    const resolved = await resolveTripRefById(chosenId).catch(() => null);
    if (resolved) return resolved;
  }
  const existingOwn = (tripsCache.ownTrips || []).find(t => getTripMode(t) === mode);
  if (existingOwn) {
    const resolved = await resolveTripRefById(existingOwn.id).catch(() => null);
    if (resolved) return resolved;
  }
  for (const tr of loadedTripsMap.values()) {
    if (getTripMode(tr) === mode && tr.role !== "viewer") return tr;
  }
  if (window.FeriasApi?.isServer?.()) {
    if (mode === "professional") {
      const initialPro = clone(window.createDefaultProData ? window.createDefaultProData() : window.PRO_DEFAULT_DATA);
      const created = await window.FeriasApi.createTrip(initialPro.title || "Roadmap & Entregas Profissionais", initialPro, "", "professional");
      tripsCache = await window.FeriasApi.listTrips();
      const newId = created?.trip?.id || created?.id;
      if (newId) return await resolveTripRefById(newId);
    } else {
      const initialPer = clone(window.DEFAULT_DATA);
      const created = await window.FeriasApi.createTrip(initialPer.title || "Planejamento Pessoal", initialPer, window.FeriasMaps?.getKey?.() || "", "personal");
      tripsCache = await window.FeriasApi.listTrips();
      const newId = created?.trip?.id || created?.id;
      if (newId) return await resolveTripRefById(newId);
    }
  }
  const localId = "local_" + uid();
  const localData = mode === "professional" && window.MyPlanPro
    ? window.MyPlanPro.migrateProState(clone(window.createDefaultProData ? window.createDefaultProData() : window.PRO_DEFAULT_DATA))
    : migrateState(clone(window.DEFAULT_DATA));
  const localTrip = { id: localId, name: localData.title, mode, role: "owner", data: localData };
  loadedTripsMap.set(localId, localTrip);
  return localTrip;
}

function convertPersonalActivityToProCard(a, targetTrip) {
  const tgtData = targetTrip?.data;
  const cols = Array.isArray(tgtData?.columns) && tgtData.columns.length ? tgtData.columns : (window.PRO_DEFAULT_COLUMNS || [{ id: "todo", title: "A Fazer" }]);
  const typeMap = {
    Viagem: "Viagem",
    Voo: "Viagem",
    Trem: "Viagem",
    "Ônibus": "Viagem",
    Navio: "Viagem",
    Hospedagem: "Viagem",
    Evento: "Reunião",
    Ingresso: "Despesa",
    Passeio: "Marco",
    Restaurante: "Despesa",
    "Período": "Planejamento",
    Outro: "Outro"
  };
  const proType = typeMap[a.type] || "Outro";
  const c = calc(a);
  const totalCost = Math.round(((c.total || 0) + (Number(a.extraCost) || 0)) * 100) / 100;
  const today = fmtISO(new Date());
  const start = a.start || today;
  const end = a.end && a.end >= start ? a.end : start;
  const colId = cols[0]?.id || "todo";
  const nextOrder = (tgtData?.activities || []).filter(x => x.columnId === colId).length;
  return {
    id: a.id || uid(),
    type: proType,
    columnId: colId,
    order: nextOrder,
    name: a.name || "Cartão Migrado",
    start,
    end,
    startTime: a.startTime || "",
    endTime: a.endTime || "",
    priority: "Média",
    progress: a.done ? 100 : 0,
    completed: Boolean(a.done),
    client: tgtData?.params?.clientDefault || "",
    assignee: "",
    location: a.location || (a.from && a.to ? `${a.from} ➔ ${a.to}` : (a.to || a.from || "")),
    coverColor: "",
    labels: [],
    tags: Array.isArray(a.tags) ? [...a.tags] : [],
    finDirection: totalCost > 0 ? "expense" : "none",
    amount: totalCost > 0 ? totalCost : 0,
    actualAmount: 0,
    finStatus: "Previsto",
    finDueDate: end || start,
    subtasks: [],
    notes: [
      a.notes || "",
      a.airline ? `Cia/Empresa: ${a.airline}` : "",
      a.bookingRef ? `Reserva: ${a.bookingRef}` : ""
    ].filter(Boolean).join(" · "),
    attachments: clone(a.attachments || []),
    qrPayload: a.qrPayload || "",
    qrFormat: a.qrFormat || ""
  };
}

function convertProCardToPersonalActivity(card) {
  const typeMap = {
    Viagem: "Viagem",
    "Reunião": "Evento",
    Marco: "Evento",
    Recebimento: "Outro",
    Despesa: "Ingresso"
  };
  const perType = typeMap[card.type] || "Evento";
  const today = fmtISO(new Date());
  const start = card.start || today;
  const end = (card.end && card.end >= start) ? card.end : start;
  const val = Number(card.actualAmount) > 0 ? Number(card.actualAmount) : (Number(card.amount) || 0);
  const extraCost = card.finDirection === "expense" && val > 0 ? val : 0;
  const noteParts = [
    card.notes || "",
    card.client ? `Cliente: ${card.client}` : "",
    card.assignee ? `Responsável: ${card.assignee}` : "",
    card.location ? `Local: ${card.location}` : ""
  ].filter(Boolean);
  return {
    id: card.id || uid(),
    type: perType,
    name: card.name || "Atividade Migrada",
    start,
    end,
    startTime: card.startTime || "",
    extraCost,
    tickets: extraCost > 0 ? [{ label: card.type || "Custo", qty: 1, unitPrice: extraCost }] : [],
    tags: Array.isArray(card.tags) ? [...card.tags] : [],
    notes: noteParts.join(" · "),
    attachments: clone(card.attachments || [])
  };
}

function saveTripRecord(targetTrip, msg, skipRender = false) {
  const tr = targetTrip || activeTrip;
  if (tr && tr.role === "viewer") {
    toast("👁️ Planejamento compartilhado somente para visualização.");
    if (!skipRender) render();
    return false;
  }
  if (tr) {
    tr.data = tr === activeTrip ? state : tr.data;
    tr.name = tr.data.title || tr.name;
    const mode = getTripMode(tr);
    tr.mode = mode;
    if (tr.data && typeof tr.data === "object") tr.data.mode = mode;
    const payloadFn = () => ({
      name: tr.data.title || tr.name,
      mode,
      data: tr.data,
      gmapsKey: tr === activeTrip && window.FeriasMaps ? window.FeriasMaps.getKey() : (tr.gmapsKey || ""),
      updatedAt: Date.now()
    });
    if (!activeTrip || tr.id === activeTrip.id) {
      window.FeriasApi.schedulePush(tr.id, payloadFn);
    } else {
      window.FeriasApi.updateTrip(tr.id, payloadFn()).catch(() => {});
    }
  }
  if (!skipRender) render();
  if (msg) toast(msg);
  return true;
}

function save(msg, skipRender = false) {
  return saveTripRecord(activeTrip, msg, skipRender);
}

/* ---------- TEMA DIA / NOITE ---------- */
function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(THEME_KEY, t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const isPro = appMode === "professional";
    meta.setAttribute("content", t === "dark" ? (isPro ? "#050c19" : "#0b0f1a") : (isPro ? "#edf2f8" : "#f1f5f9"));
  }
  const icon = $("#themeIcon"), authBtn = $("#authThemeBtn");
  if (icon) icon.textContent = t === "dark" ? "☀️" : "🌙";
  if (authBtn) authBtn.textContent = t === "dark" ? "☀️" : "🌙";
}
function isDarkTheme() { return document.documentElement.getAttribute("data-theme") !== "light"; }
function initTheme() { applyTheme(localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"); }

/* ---------- UTILS ---------- */
const parseD = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtBR = s => s ? s.split("-").reverse().join("/") : "";
const fmtShortBR = s => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : "";
const days = a => Math.max(1, Math.round((parseD(a.end || a.start) - parseD(a.start)) / DAY) + 1);
const money = v => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v, d = 0) => (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
const hm = m => { m = Math.round(m || 0); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
const hmHuman = m => { m = Math.round(m || 0); const h = Math.floor(m / 60), min = m % 60; return min ? `${h}h${String(min).padStart(2, "0")}` : `${h}h`; };
const parseHM = s => {
  if (s == null || s === "") return 0;
  s = String(s).trim();
  if (s.includes(":")) { const [h, m] = s.split(":"); return (+h || 0) * 60 + (+m || 0); }
  return Math.round(parseFloat(s.replace(",", ".")) * 60) || 0;
};
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const isTravelType = t => ["Viagem", "Voo", "Trem", "Ônibus", "Navio"].includes(t);
const isTransitOrShip = t => t === "Trem" || t === "Ônibus" || t === "Navio";
const label = a => isTravelType(a.type) && (a.from || a.to) ? `${a.name} (${a.from || "?"} ➔ ${a.to || "?"})` : a.name;
const sorted = () => {
  const trips = getSelectedTrips();
  if (trips.length <= 1) {
    const tr = trips[0] || activeTrip;
    const acts = tr?.data?.activities || state.activities || [];
    acts.forEach(a => actOriginMap.set(a, {
      tripId: tr?.id || "",
      tripName: tr?.name || state.title,
      role: tr?.role || "owner",
      vehicle: tr?.data?.vehicle || state.vehicle,
      params: tr?.data?.params || state.params,
      tripRef: tr,
      colorIdx: 0
    }));
    return [...acts].sort((a, b) => a.start.localeCompare(b.start) || (a.type === "Viagem") - (b.type === "Viagem"));
  }
  const all = [];
  trips.forEach((tr, idx) => {
    const acts = tr?.data?.activities || [];
    acts.forEach(a => {
      actOriginMap.set(a, {
        tripId: tr.id,
        tripName: tr.data?.title || tr.name,
        role: tr.role || "owner",
        vehicle: tr.data?.vehicle || state.vehicle,
        params: tr.data?.params || state.params,
        tripRef: tr,
        colorIdx: idx % MULTI_TRIP_COLORS.length
      });
      all.push(a);
    });
  });
  return all.sort((a, b) => a.start.localeCompare(b.start) || (a.type === "Viagem") - (b.type === "Viagem"));
};

function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 2600);
}

function computeAutoStops(driveMinutes) {
  const intervalMin = Math.max(30, (Number(state.params.stopIntervalHours) || 4) * 60);
  const stopDur = Math.max(0, Number(state.params.stopDurationMin ?? 60));
  const stops = driveMinutes > 0 ? Math.floor(driveMinutes / intervalMin) : 0;
  return { stops, stopTime: stops * stopDur };
}

function calc(a, kmLOverride, tripOverride) {
  const meta = !tripOverride ? actOriginMap.get(a) : null;
  const v = tripOverride?.vehicle || meta?.vehicle || state.vehicle;
  const p = tripOverride?.params || meta?.params || state.params;
  const r = { ev: 0, hev: 0, liters: 0, fuel: 0, charge: 0, toll: 0, total: 0, extra: +a.extraCost || 0, tanks: 0, time: 0, isCarpool: false };
  if (a.type !== "Viagem") return r;
  r.time = (+a.drive || 0) + (+a.stopTime || 0);
  if (a.includeRouteCost === false) {
    r.isCarpool = true;
    return r;
  }
  if (!(a.km > 0)) {
    r.toll = +a.toll || 0;
    r.total = r.toll;
    return r;
  }

  const ch = a.charges ?? p.defaultCharges ?? 1;
  const pt = v.powertrain || "PHEV";

  if (pt === "BEV") {
    r.ev = +a.km;
    r.charge = ((r.ev / 100) * (v.bevKwhPer100 || 18)) * (v.kwhPrice || 0);
  } else if (pt === "PHEV") {
    r.ev = Math.min(+a.km, (v.evRange || 0) * ch);
    r.hev = Math.max(0, +a.km - r.ev);
    r.liters = r.hev / (kmLOverride || v.hevKmL || 16);
    r.fuel = r.liters * (v.fuelPrice || 0);
    r.charge = ch * (v.kwhPerCharge || 0) * (v.kwhPrice || 0);
  } else {
    r.hev = +a.km;
    r.liters = r.hev / (kmLOverride || v.hevKmL || 14);
    r.fuel = r.liters * (v.fuelPrice || 0);
  }

  r.toll = +a.toll || 0;
  r.total = r.fuel + r.charge + r.toll;
  r.tanks = v.tank > 0 ? r.liters / v.tank : 0;
  return r;
}

function formatTicketsNote(a) {
  if (!Array.isArray(a.tickets) || !a.tickets.length) return "";
  const valid = a.tickets.filter(t => (Number(t.qty) || 0) > 0 && (Number(t.unitPrice) || 0) > 0);
  if (valid.length <= 1 && (!valid.length || (Number(valid[0].qty) || 1) === 1)) return "";
  const totalQty = valid.reduce((s, t) => s + (Number(t.qty) || 0), 0);
  return `${totalQty} un. (${valid.map(t => `${t.qty}× ${money(t.unitPrice)}`).join(" + ")})`;
}

const COST_CATEGORY_STYLES = {
  Voo: { label: "Passagens Aéreas / Voos", color: "#38bdf8", gradient: "linear-gradient(90deg,#38bdf8,#0284c7)" },
  Trem: { label: "Passagens de Trem", color: "#14b8a6", gradient: "linear-gradient(90deg,#14b8a6,#0284c7)" },
  "Ônibus": { label: "Passagens de Ônibus", color: "#f59e0b", gradient: "linear-gradient(90deg,#f59e0b,#d97706)" },
  Navio: { label: "Cruzeiros / Viagens de Navio", color: "#0891b2", gradient: "linear-gradient(90deg,#0891b2,#1d4ed8)" },
  Viagem_Extra: { label: "Extras em Viagens de Carro", color: "#6366f1", gradient: "linear-gradient(90deg,#6366f1,#22d3ee)" },
  Hospedagem: { label: "Hospedagem", color: "#10b981", gradient: "linear-gradient(90deg,#10b981,#0d9488)" },
  Ingresso: { label: "Ingressos & Tickets", color: "#c084fc", gradient: "linear-gradient(90deg,#8b5cf6,#ec4899)" },
  Evento: { label: "Eventos / Jogos / Shows", color: "#f59e0b", gradient: "linear-gradient(90deg,#f59e0b,#e11d48)" },
  Passeio: { label: "Passeios & Parques", color: "#f472b6", gradient: "linear-gradient(90deg,#f472b6,#9333ea)" },
  Restaurante: { label: "Restaurantes & Lazer", color: "#fb923c", gradient: "linear-gradient(90deg,#fb923c,#dc2626)" },
  "Período": { label: "Estadias / Períodos", color: "#a78bfa", gradient: "linear-gradient(90deg,#7c3aed,#4338ca)" },
  Outro: { label: "Outros Gastos de Atividades", color: "#94a3b8", gradient: "linear-gradient(90deg,#64748b,#475569)" }
};

function computeSingleTripTotals(tripData, kmLOverride, actsOverride = null) {
  const sourceActs = Array.isArray(actsOverride) ? actsOverride : (tripData.activities || []);
  const acts = [...sourceActs].sort((a, b) => a.start.localeCompare(b.start) || (a.type === "Viagem") - (b.type === "Viagem"));
  const t = {
    km: 0, drive: 0, stopTime: 0, stops: 0, ev: 0, hev: 0, liters: 0,
    fuel: 0, charge: 0, toll: 0, total: 0, tanks: 0, trips: 0,
    flightsCost: 0, lodgingActCost: 0, otherActCost: 0, activitiesExtra: 0,
    lodgingParamCost: 0, lodgingNights: 0, foodCost: 0, otherFixedBudget: 0,
    contingencyCost: 0, grandTotal: 0, totalDays: 0
  };

  if (acts.length) {
    const min = acts[0].start;
    const max = acts.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, min);
    t.totalDays = days({ start: min, end: max });
  }

  const extraBuckets = {};
  acts.forEach(a => {
    const ex = +a.extraCost || 0;
    t.activitiesExtra += ex;
    if (a.type === "Voo") t.flightsCost += ex;
    else if (a.type === "Hospedagem") t.lodgingActCost += ex;
    else t.otherActCost += ex;

    if (ex > 0) {
      const bKey = a.costCategory || (a.type === "Viagem" ? "Viagem_Extra" : a.type);
      extraBuckets[bKey] = (extraBuckets[bKey] || 0) + ex;
    }

    if (a.type === "Viagem") {
      const c = calc(a, kmLOverride, tripData);
      t.trips++;
      t.km += +a.km || 0;
      t.drive += +a.drive || 0;
      t.stopTime += +a.stopTime || 0;
      t.stops += +a.stops || 0;
      for (const k of ["ev", "hev", "liters", "fuel", "charge", "toll", "total", "tanks"]) t[k] += c[k];
    }
  });

  const p = tripData.params || {};
  const autoNights = Math.max(0, t.totalDays - 1);
  t.lodgingNights = p.lodgingNightsOverride != null && p.lodgingNightsOverride !== "" && Number(p.lodgingNightsOverride) >= 0
    ? Number(p.lodgingNightsOverride)
    : autoNights;
  t.lodgingParamCost = t.lodgingNights * (+p.lodgingPerNight || 0);
  t.foodCost = t.totalDays * Math.max(1, +p.travelers || 1) * (+p.dailyFoodPerPerson || 0);
  t.otherFixedBudget = +p.otherFixedBudget || 0;

  const sub = t.total + t.activitiesExtra + t.lodgingParamCost + t.foodCost + t.otherFixedBudget;
  t.contingencyCost = sub * ((+p.contingencyPct || 0) / 100);
  t.grandTotal = sub + t.contingencyCost;

  const costBreakdown = [];
  if (t.fuel > 0) costBreakdown.push({ id: "fuel", label: "Gasolina / Combustível", value: t.fuel, color: "#fb7185", gradient: "linear-gradient(90deg,#fb7185,#f5b544)" });
  if (t.toll > 0) costBreakdown.push({ id: "toll", label: "Pedágios", value: t.toll, color: "#a78bfa", gradient: "linear-gradient(90deg,#a78bfa,#7c5cff)" });
  if (t.charge > 0) costBreakdown.push({ id: "charge", label: "Recargas EV", value: t.charge, color: "#34d399", gradient: "linear-gradient(90deg,#34d399,#22d3ee)" });

  const combinedLodging = (extraBuckets.Hospedagem || 0) + t.lodgingParamCost;
  if (combinedLodging > 0) {
    costBreakdown.push({ id: "Hospedagem", ...COST_CATEGORY_STYLES.Hospedagem, value: combinedLodging });
    delete extraBuckets.Hospedagem;
  }
  Object.entries(extraBuckets).forEach(([k, val]) => {
    if (val > 0) {
      const st = COST_CATEGORY_STYLES[k] || { label: k, color: "#06b6d4", gradient: "linear-gradient(90deg,#06b6d4,#6366f1)" };
      costBreakdown.push({ id: k, ...st, value: val });
    }
  });
  if (t.foodCost > 0) costBreakdown.push({ id: "food", label: "Alimentação estimada", value: t.foodCost, color: "#fb923c", gradient: "linear-gradient(90deg,#fb923c,#f59e0b)" });
  if (t.otherFixedBudget > 0) costBreakdown.push({ id: "fixed", label: "Outros gastos fixos", value: t.otherFixedBudget, color: "#94a3b8", gradient: "linear-gradient(90deg,#64748b,#94a3b8)" });
  if (t.contingencyCost > 0) costBreakdown.push({ id: "contingency", label: `Reserva (${p.contingencyPct || 0}%)`, value: t.contingencyCost, color: "#f43f5e", gradient: "linear-gradient(90deg,#f43f5e,#fb7185)" });

  costBreakdown.sort((a, b) => b.value - a.value);
  t.costBreakdown = costBreakdown;
  return t;
}

function totals(kmLOverride, filteredListOpt = null) {
  const trips = getSelectedTrips();
  const hasActFilter = Array.isArray(filteredListOpt);
  if (trips.length <= 1) {
    return computeSingleTripTotals(trips[0]?.data || state, kmLOverride, hasActFilter ? filteredListOpt : null);
  }
  const byTrip = new Map();
  if (hasActFilter) {
    trips.forEach(tr => byTrip.set(tr.id, []));
    filteredListOpt.forEach(a => {
      const tid = actOriginMap.get(a)?.tripId;
      if (tid && byTrip.has(tid)) byTrip.get(tid).push(a);
    });
  }
  const merged = {
    km: 0, drive: 0, stopTime: 0, stops: 0, ev: 0, hev: 0, liters: 0,
    fuel: 0, charge: 0, toll: 0, total: 0, tanks: 0, trips: 0,
    flightsCost: 0, lodgingActCost: 0, otherActCost: 0, activitiesExtra: 0,
    lodgingParamCost: 0, lodgingNights: 0, foodCost: 0, otherFixedBudget: 0,
    contingencyCost: 0, grandTotal: 0, totalDays: 0, costBreakdown: []
  };
  const bucketMap = new Map();
  trips.forEach(tr => {
    const actsForTrip = hasActFilter ? (byTrip.get(tr.id) || []) : null;
    if (hasActFilter && actsForTrip.length === 0) return;
    const one = computeSingleTripTotals(tr.data, kmLOverride, actsForTrip);
    for (const k of [
      "km", "drive", "stopTime", "stops", "ev", "hev", "liters",
      "fuel", "charge", "toll", "total", "tanks", "trips",
      "flightsCost", "lodgingActCost", "otherActCost", "activitiesExtra",
      "lodgingParamCost", "lodgingNights", "foodCost", "otherFixedBudget",
      "contingencyCost", "grandTotal", "totalDays"
    ]) {
      merged[k] += one[k] || 0;
    }
    one.costBreakdown.forEach(b => {
      const prev = bucketMap.get(b.id);
      if (prev) prev.value += b.value;
      else bucketMap.set(b.id, { ...b });
    });
  });
  merged.costBreakdown = [...bucketMap.values()].sort((a, b) => b.value - a.value);
  return merged;
}

/* ---------- COMPONENTE COMPARTILHADO MULTI-SELECT & TIPOS ---------- */
const openMultiSelects = new Set();
let multiSelectGlobalBound = false;
function bindMultiSelectGlobalClose() {
  if (multiSelectGlobalBound) return;
  multiSelectGlobalBound = true;
  document.addEventListener("click", () => {
    openMultiSelects.forEach(c => c.close());
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") openMultiSelects.forEach(c => c.close());
  });
}

function createMultiSelect(hostEl, cfg = {}) {
  if (!hostEl) return null;
  bindMultiSelectGlobalClose();
  let items = [];
  let selectedSet = new Set();
  const minSel = cfg.minSelected ?? 0;
  const triggerIdAttr = cfg.triggerId ? ` id="${esc(cfg.triggerId)}"` : "";

  hostEl.innerHTML = `<div class="msel">
    <button type="button" class="msel-trigger"${triggerIdAttr} aria-haspopup="listbox" aria-expanded="false">
      <span class="msel-label"></span>
      <span class="msel-caret" aria-hidden="true">▾</span>
    </button>
    <div class="msel-menu" role="listbox" aria-multiselectable="true" hidden></div>
  </div>`;

  const wrap = hostEl.querySelector(".msel");
  const trigger = hostEl.querySelector(".msel-trigger");
  const labelEl = hostEl.querySelector(".msel-label");
  const menu = hostEl.querySelector(".msel-menu");

  const getOrderedSelected = () => items.filter(it => selectedSet.has(it.id)).map(it => it.id);

  function close() {
    menu.hidden = true;
    wrap.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }

  function updateTrigger() {
    const sel = items.filter(it => selectedSet.has(it.id));
    const txt = cfg.getLabel ? cfg.getLabel(sel, items) : `${sel.length} selecionados`;
    labelEl.textContent = txt;
    trigger.title = txt;
    const activeMulti = cfg.isHighlighted
      ? cfg.isHighlighted(sel, items)
      : (minSel > 0 ? sel.length > 1 : sel.length < items.length);
    trigger.classList.toggle("is-multi", Boolean(activeMulti));
  }

  function renderMenu() {
    const selCount = items.filter(it => selectedSet.has(it.id)).length;
    const allBtnLabel = cfg.allLabel || "☑️ Todos";
    const noneBtnLabel = cfg.noneLabel || "✕ Limpar";
    const headActions = minSel === 0
      ? `<div class="msel-head">
           ${cfg.hideAllBtn ? "" : `<button type="button" class="msel-act" data-ms-all>${esc(allBtnLabel)}</button>`}
           <button type="button" class="msel-act" data-ms-none>${esc(noneBtnLabel)}</button>
         </div>`
      : `<div class="msel-head">
           <button type="button" class="msel-act" data-ms-all>${esc(cfg.allLabel || `☑️ Todas (${items.length})`)}</button>
           <span class="muted small">${selCount}/${items.length}</span>
         </div>`;

    let lastGroup = null;
    const showOnly = cfg.showOnlyBtn !== false;
    const rowsHtml = items.map(it => {
      let grpHtml = "";
      if (it.group && it.group !== lastGroup) {
        lastGroup = it.group;
        grpHtml = `<div class="msel-group">${esc(it.group)}</div>`;
      }
      const checked = selectedSet.has(it.id) ? "checked" : "";
      const iconNode = it.iconHtml
        ? `<span class="msel-ico"${it.color ? ` style="--t-color:${esc(it.color)}"` : ""}>${it.iconHtml}</span>`
        : (it.icon ? `<span class="msel-ico">${esc(it.icon)}</span>` : "");
      return `${grpHtml}<div class="msel-opt">
        <label class="msel-check">
          <input type="checkbox" value="${esc(it.id)}" ${checked}>
          <span class="msel-txt">${iconNode}<span>${esc(it.label)}</span></span>
        </label>
        ${showOnly ? `<button type="button" class="msel-only" data-ms-only="${esc(it.id)}" title="Selecionar somente este">Só</button>` : ""}
      </div>`;
    }).join("");

    const createHtml = cfg.allowCreate
      ? `<div class="msel-create-row">
           <input type="text" class="msel-create-input" placeholder="${esc(cfg.createPlaceholder || "Nova tag...")}" maxlength="32" autocomplete="off">
           <button type="button" class="msel-create-btn">+ Criar</button>
         </div>`
      : "";

    menu.innerHTML = createHtml + headActions + rowsHtml;

    const createInp = menu.querySelector(".msel-create-input");
    const createBtn = menu.querySelector(".msel-create-btn");
    if (createInp && createBtn && typeof cfg.onCreate === "function") {
      const triggerCreate = () => {
        const val = createInp.value.trim();
        if (!val) return;
        const createdId = cfg.onCreate(val, selectedSet);
        createInp.value = "";
        if (createdId) {
          updateTrigger();
          cfg.onChange?.(getOrderedSelected());
        }
        menu.querySelector(".msel-create-input")?.focus();
      };
      createBtn.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        triggerCreate();
      };
      createInp.onkeydown = e => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          triggerCreate();
        }
      };
    }

    const btnAll = menu.querySelector("[data-ms-all]");
    if (btnAll) {
      btnAll.onclick = e => {
        e.stopPropagation();
        selectedSet = new Set(items.map(it => it.id));
        syncAndEmit();
      };
    }
    const btnNone = menu.querySelector("[data-ms-none]");
    if (btnNone) {
      btnNone.onclick = e => {
        e.stopPropagation();
        selectedSet.clear();
        syncAndEmit();
      };
    }
    menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.onchange = () => {
        const id = cb.value;
        if (cb.checked) {
          selectedSet.add(id);
        } else {
          if (selectedSet.size <= minSel) {
            cb.checked = true;
            if (cfg.minError) toast(cfg.minError);
            return;
          }
          selectedSet.delete(id);
        }
        updateCheckboxes();
        updateTrigger();
        cfg.onChange?.(getOrderedSelected());
      };
    });
    menu.querySelectorAll("[data-ms-only]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        selectedSet = new Set([btn.dataset.msOnly]);
        syncAndEmit();
        if (cfg.closeOnOnly !== false) close();
      };
    });
  }

  function updateCheckboxes() {
    menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = selectedSet.has(cb.value);
    });
  }

  function syncAndEmit() {
    updateCheckboxes();
    updateTrigger();
    cfg.onChange?.(getOrderedSelected());
  }

  trigger.onclick = e => {
    e.stopPropagation();
    const willOpen = menu.hidden;
    openMultiSelects.forEach(c => c.close());
    if (!willOpen) return;
    menu.classList.remove("align-right");
    menu.hidden = false;
    wrap.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
    const trRect = trigger.getBoundingClientRect();
    const parentDlg = hostEl.closest("dialog");
    const maxRight = parentDlg ? Math.min(window.innerWidth, parentDlg.getBoundingClientRect().right) : window.innerWidth;
    const menuW = Math.max(245, menu.offsetWidth || 245);
    if (trRect.left + menuW > maxRight - 8 && trRect.right - menuW >= 8) {
      menu.classList.add("align-right");
    }
  };
  menu.onclick = e => e.stopPropagation();

  const api = {
    close,
    setOptions(nextItems, nextSelectedIds) {
      items = Array.isArray(nextItems) ? nextItems : [];
      const valid = new Set(items.map(it => it.id));
      selectedSet = new Set((nextSelectedIds || []).filter(id => valid.has(id)));
      if (minSel > 0 && selectedSet.size === 0 && items.length) {
        selectedSet.add(items[0].id);
      }
      renderMenu();
      updateTrigger();
    },
    getSelected: getOrderedSelected,
    selectAll() {
      selectedSet = new Set(items.map(it => it.id));
      syncAndEmit();
    },
    clearAll() {
      selectedSet.clear();
      syncAndEmit();
    },
    setSelected(ids) {
      const valid = new Set(items.map(it => it.id));
      selectedSet = new Set((ids || []).filter(id => valid.has(id)));
      if (minSel > 0 && selectedSet.size === 0 && items.length) {
        selectedSet.add(items[0].id);
      }
      updateCheckboxes();
      updateTrigger();
    }
  };
  openMultiSelects.add(api);
  return api;
}

function normalizeTagName(raw) {
  return String(raw || "").trim().replace(/\s+/g, " ").slice(0, 32);
}

function dedupeTagList(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach(raw => {
    const clean = normalizeTagName(raw);
    if (!clean) return;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  });
  return out;
}

function getStoredCustomTags() {
  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_KEY);
    return raw ? dedupeTagList(JSON.parse(raw)) : [];
  } catch { return []; }
}

function saveStoredCustomTags(tags) {
  try { localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(dedupeTagList(tags))); } catch {}
}

function getAllAvailableTags(extraActs = []) {
  const defaults = appMode === "professional"
    ? (Array.isArray(window.PRO_DEFAULT_TAGS) && window.PRO_DEFAULT_TAGS.length ? window.PRO_DEFAULT_TAGS : ["Desenvolvimento", "Cliente", "Financeiro", "Reunião", "Viagem Corp.", "Entrega"])
    : (Array.isArray(window.DEFAULT_TAGS) && window.DEFAULT_TAGS.length ? window.DEFAULT_TAGS : ["Pessoal", "Profissional", "Férias", "Viagem"]);
  const rawList = [...defaults, ...getStoredCustomTags()];
  if (Array.isArray(state.customTags)) rawList.push(...state.customTags);
  (state.activities || []).forEach(a => { if (Array.isArray(a?.tags)) rawList.push(...a.tags); });
  loadedTripsMap.forEach(tr => {
    if (Array.isArray(tr?.data?.customTags)) rawList.push(...tr.data.customTags);
    (tr?.data?.activities || []).forEach(a => { if (Array.isArray(a?.tags)) rawList.push(...a.tags); });
  });
  (extraActs || []).forEach(a => { if (Array.isArray(a?.tags)) rawList.push(...a.tags); });
  const deduped = dedupeTagList(rawList);
  const defaultLower = new Set(defaults.map(t => t.toLowerCase()));
  const basePart = deduped.filter(t => defaultLower.has(t.toLowerCase()));
  const customPart = deduped
    .filter(t => !defaultLower.has(t.toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  return [...basePart, ...customPart];
}

function registerCustomTag(rawName, extraSelected = []) {
  const clean = normalizeTagName(rawName);
  if (!clean) return "";
  const existing = getAllAvailableTags().find(t => t.toLowerCase() === clean.toLowerCase());
  const canonical = existing || clean;
  if (!existing) {
    const stored = getStoredCustomTags();
    stored.push(canonical);
    saveStoredCustomTags(stored);
    if (!Array.isArray(state.customTags)) state.customTags = [];
    if (!state.customTags.some(t => normalizeTagName(t).toLowerCase() === canonical.toLowerCase())) {
      state.customTags.push(canonical);
    }
    const tgtData = editingTripRef?.data || activeTrip?.data;
    if (tgtData && tgtData !== state) {
      if (!Array.isArray(tgtData.customTags)) tgtData.customTags = [];
      if (!tgtData.customTags.some(t => normalizeTagName(t).toLowerCase() === canonical.toLowerCase())) {
        tgtData.customTags.push(canonical);
      }
    }
  }
  const nextSel = dedupeTagList([...(extraSelected || []), canonical]);
  refreshTagSelectors([], nextSel);
  return canonical;
}

function formatTypesLabel(sel, items) {
  if (!sel.length) return "Nenhum tipo";
  if (sel.length >= items.length) return "Tipos";
  if (sel.length === 1) return `${!sel[0].iconHtml && sel[0].icon ? sel[0].icon + " " : ""}${sel[0].short || sel[0].label}`;
  if (sel.length === 2) return `${sel[0].short || sel[0].label}, ${sel[1].short || sel[1].label}`;
  return `${sel.length} tipos`;
}

function formatTagsFilterLabel(sel) {
  if (!sel.length) return "Tags";
  if (sel.length === 1) return sel[0].short || sel[0].label;
  if (sel.length === 2) return `${sel[0].short || sel[0].label}, ${sel[1].short || sel[1].label}`;
  return `${sel.length} tags`;
}

function formatModalTagsLabel(sel) {
  if (!sel.length) return "Selecionar ou criar tag...";
  if (sel.length === 1) return `🏷️ ${sel[0].label}`;
  if (sel.length === 2) return `🏷️ ${sel[0].label}, ${sel[1].label}`;
  return `🏷️ ${sel.length} tags`;
}

function filterByTypeSet(list, typeSet) {
  const totalTypes = Object.keys(window.ACTIVITY_TYPES || {}).length;
  if (!typeSet || typeSet.size >= totalTypes) return list;
  if (typeSet.size === 0) return [];
  return list.filter(a => typeSet.has(a.type));
}

function filterByTagSet(list, tagSet) {
  if (!tagSet || tagSet.size === 0) return list;
  const targets = new Set([...tagSet].map(t => normalizeTagName(t).toLowerCase()).filter(Boolean));
  if (!targets.size) return list;
  return list.filter(a => Array.isArray(a.tags) && a.tags.some(t => targets.has(normalizeTagName(t).toLowerCase())));
}

function filterByDateRange(list, fromISO, toISO) {
  if (!fromISO && !toISO) return list;
  return list.filter(a => {
    const s = a.start || "";
    const e = a.end || a.start || "";
    if (fromISO && e < fromISO) return false;
    if (toISO && s > toISO) return false;
    return true;
  });
}

function isPersonalFilterActive() {
  const totalTypes = Object.keys(window.ACTIVITY_TYPES || {}).length;
  return (
    ganttFilterTypes.size < totalTypes ||
    ganttFilterTags.size > 0 ||
    Boolean(personalDateFrom || personalDateTo)
  );
}

function applyPersonalFilters(allSorted) {
  return filterByDateRange(filterByTagSet(filterByTypeSet(allSorted, ganttFilterTypes), ganttFilterTags), personalDateFrom, personalDateTo);
}

function syncPersonalFilterUIs(allActsOpt) {
  const allTypes = Object.keys(window.ACTIVITY_TYPES || {});
  const typeItems = Object.values(window.ACTIVITY_TYPES || {}).map(t => ({ id: t.id, label: t.short, short: t.short, icon: t.icon }));
  const tags = getAllAvailableTags(allActsOpt || []);
  const tagItems = tags.map(tag => ({ id: tag, label: tag, short: tag, icon: "🏷️" }));

  const selTypes = [...ganttFilterTypes];
  const selTags = [...ganttFilterTags];
  if (ganttTypeMsel) ganttTypeMsel.setSelected(selTypes);
  if (dashTypeMsel) { dashTypeMsel.setOptions(typeItems, selTypes); }
  if (finTypeMsel) { finTypeMsel.setOptions(typeItems, selTypes); }

  if (ganttTagMsel) ganttTagMsel.setOptions(tagItems, selTags);
  if (dashTagMsel) dashTagMsel.setOptions(tagItems, selTags);
  if (finTagMsel) finTagMsel.setOptions(tagItems, selTags);

  [["#ganttDateFrom", "#dashDateFrom", "#finDateFrom"], personalDateFrom].forEach(() => {});
  ["#ganttDateFrom", "#dashDateFrom", "#finDateFrom"].forEach(s => { const el = $(s); if (el && el.value !== personalDateFrom) el.value = personalDateFrom; });
  ["#ganttDateTo", "#dashDateTo", "#finDateTo"].forEach(s => { const el = $(s); if (el && el.value !== personalDateTo) el.value = personalDateTo; });
  const active = isPersonalFilterActive();
  ["#btnGanttClearFilters", "#btnDashClearFilters", "#btnFinClearFilters"].forEach(s => {
    const el = $(s);
    if (el) el.hidden = !active;
  });
  const totalTypes = allTypes.length;
  const activeCount = (ganttFilterTypes.size < totalTypes ? 1 : 0)
    + (ganttFilterTags.size > 0 ? 1 : 0)
    + ((personalDateFrom || personalDateTo) ? 1 : 0);
  const fBtn = $("#btnGanttFilterPop");
  const fCnt = $("#ganttFilterCount");
  if (fBtn) fBtn.classList.toggle("has-active", activeCount > 0);
  if (fCnt) {
    fCnt.textContent = activeCount ? String(activeCount) : "";
    fCnt.hidden = !activeCount;
  }
}

function applyAndRenderPersonalViews() {
  const all = sorted();
  syncPersonalFilterUIs(all);
  const filtered = applyPersonalFilters(all);
  const filtTotals = isPersonalFilterActive() ? totals(undefined, filtered) : totals();
  renderGantt(all);
  renderTimeline(all);
  renderDashboard(filtered, filtTotals);
  renderFinance(filtered, filtTotals);
}

function resetGanttTypeFilter() {
  ganttFilterTypes = new Set(Object.keys(window.ACTIVITY_TYPES || {}));
  ganttFilterTags = new Set();
  personalDateFrom = "";
  personalDateTo = "";
  ganttTypeMsel?.selectAll();
  ganttTagMsel?.clearAll();
  dashTypeMsel?.selectAll();
  dashTagMsel?.clearAll();
  finTypeMsel?.selectAll();
  finTagMsel?.clearAll();
  applyAndRenderPersonalViews();
}

function resetTableTypeFilter() {
  tableFilterTypes = new Set(Object.keys(window.ACTIVITY_TYPES || {}));
  tableFilterTags = new Set();
  tableTypeMsel?.selectAll();
  tableTagMsel?.clearAll();
}

function refreshTagSelectors(extraActs = [], modalSelectedOverride = null) {
  const tags = getAllAvailableTags(extraActs);
  const tagItems = tags.map(tag => ({ id: tag, label: tag, short: tag, icon: "🏷️" }));

  const bindTagFilter = (idSel, curRef, setFn) => {
    const el = $(idSel);
    if (!el || curRef) return curRef;
    return createMultiSelect(el, {
      minSelected: 0,
      hideAllBtn: true,
      noneLabel: "✕ Limpar (todas)",
      getLabel: formatTagsFilterLabel,
      isHighlighted: sel => sel.length > 0,
      onChange(ids) {
        ganttFilterTags = new Set(ids);
        applyAndRenderPersonalViews();
      }
    });
  };
  ganttTagMsel = bindTagFilter("#ganttTagFilter", ganttTagMsel);
  dashTagMsel = bindTagFilter("#dashTagFilter", dashTagMsel);
  finTagMsel = bindTagFilter("#finTagFilter", finTagMsel);
  if (ganttTagMsel) ganttTagMsel.setOptions(tagItems, [...ganttFilterTags]);
  if (dashTagMsel) dashTagMsel.setOptions(tagItems, [...ganttFilterTags]);
  if (finTagMsel) finTagMsel.setOptions(tagItems, [...ganttFilterTags]);

  if (!tableTagMsel && $("#filterTag")) {
    tableTagMsel = createMultiSelect($("#filterTag"), {
      minSelected: 0,
      hideAllBtn: true,
      noneLabel: "✕ Limpar (todas)",
      getLabel: formatTagsFilterLabel,
      isHighlighted: sel => sel.length > 0,
      onChange(ids) {
        tableFilterTags = new Set(ids);
        renderTable(sorted(), totals());
      }
    });
  }
  if (tableTagMsel) tableTagMsel.setOptions(tagItems, [...tableFilterTags]);

  if (!modalTagsMsel && $("#modalTagsHost")) {
    modalTagsMsel = createMultiSelect($("#modalTagsHost"), {
      triggerId: "f-tagsTrigger",
      minSelected: 0,
      allLabel: "☑️ Todas",
      noneLabel: "✕ Limpar",
      showOnlyBtn: false,
      allowCreate: true,
      createPlaceholder: "Criar nova tag...",
      getLabel: formatModalTagsLabel,
      isHighlighted: sel => sel.length > 0,
      onCreate(raw) {
        const curSel = modalTagsMsel ? modalTagsMsel.getSelected() : modalDraftTags;
        const created = registerCustomTag(raw, curSel);
        if (created) toast(`🏷️ Tag "${created}" criada!`);
        return created;
      },
      onChange(ids) {
        modalDraftTags = [...ids];
        updateModalPreview();
      }
    });
  }
  if (modalTagsMsel) {
    const sel = modalSelectedOverride !== null
      ? modalSelectedOverride
      : (modalTagsMsel.getSelected().length ? modalTagsMsel.getSelected() : modalDraftTags);
    modalDraftTags = dedupeTagList(sel);
    modalTagsMsel.setOptions(tagItems, modalDraftTags);
  }
}

function populateTypeSelectors() {
  const types = Object.values(window.ACTIVITY_TYPES);
  const fType = $("#f-type");
  if (fType) fType.innerHTML = types.map(t => `<option value="${t.id}">${t.label}</option>`).join("");

  const typeItems = types.map(t => ({ id: t.id, label: t.short, short: t.short, icon: t.icon }));
  if (!ganttFilterTypes || !ganttFilterTypes.size) {
    ganttFilterTypes = new Set(types.map(t => t.id));
  }
  if (!tableFilterTypes || !tableFilterTypes.size) {
    tableFilterTypes = new Set(types.map(t => t.id));
  }

  const bindSharedTypeFilter = (sel, mselRef) => {
    const el = $(sel);
    if (!el || mselRef) return mselRef;
    return createMultiSelect(el, {
      minSelected: 0,
      getLabel: formatTypesLabel,
      onChange(ids) {
        ganttFilterTypes = new Set(ids);
        applyAndRenderPersonalViews();
      }
    });
  };
  ganttTypeMsel = bindSharedTypeFilter("#ganttTypeFilter", ganttTypeMsel);
  dashTypeMsel = bindSharedTypeFilter("#dashTypeFilter", dashTypeMsel);
  finTypeMsel = bindSharedTypeFilter("#finTypeFilter", finTypeMsel);
  ganttTypeMsel?.setOptions(typeItems, [...ganttFilterTypes]);
  dashTypeMsel?.setOptions(typeItems, [...ganttFilterTypes]);
  finTypeMsel?.setOptions(typeItems, [...ganttFilterTypes]);

  [["#ganttDateFrom", "from"], ["#dashDateFrom", "from"], ["#finDateFrom", "from"],
   ["#ganttDateTo", "to"], ["#dashDateTo", "to"], ["#finDateTo", "to"]].forEach(([sel, kind]) => {
    const el = $(sel);
    if (el && !el.dataset.boundFilter) {
      el.dataset.boundFilter = "1";
      el.onchange = () => {
        if (kind === "from") personalDateFrom = el.value || "";
        else personalDateTo = el.value || "";
        applyAndRenderPersonalViews();
      };
    }
  });
  ["#btnGanttClearFilters", "#btnDashClearFilters", "#btnFinClearFilters"].forEach(sel => {
    const el = $(sel);
    if (el && !el.dataset.boundFilter) {
      el.dataset.boundFilter = "1";
      el.onclick = resetGanttTypeFilter;
    }
  });

  if (!tableTypeMsel && $("#filterType")) {
    tableTypeMsel = createMultiSelect($("#filterType"), {
      minSelected: 0,
      getLabel: formatTypesLabel,
      onChange(ids) {
        tableFilterTypes = new Set(ids);
        renderTable(sorted(), totals());
      }
    });
  }
  tableTypeMsel?.setOptions(typeItems, [...tableFilterTypes]);

  refreshTagSelectors();
}

/* ---------- RENDER ---------- */
function render(allSortedOpt) {
  if (appMode === "professional" && window.MyPlanPro) {
    window.MyPlanPro.renderAll();
    return;
  }
  const s = allSortedOpt || sorted();
  refreshTagSelectors(s);
  syncPersonalFilterUIs(s);
  const filtered = applyPersonalFilters(s);
  const t = isPersonalFilterActive() ? totals(undefined, filtered) : totals();
  renderGantt(s);
  renderTimeline(s);
  renderDashboard(filtered, t);
  renderFinance(filtered, t);
  renderTable(s, totals());
  renderParams();
  renderChecklist();
}

/* ---------- LINHA FINA DE CIDADES NO GANTT & CRUZAMENTOS ---------- */
const CITY_PALETTE = [
  { darkBg: "rgba(16, 185, 129, 0.22)", darkBd: "rgba(16, 185, 129, 0.55)", darkTxt: "#34d399", lightBg: "rgba(16, 185, 129, 0.14)", lightBd: "rgba(16, 185, 129, 0.45)", lightTxt: "#065f46" },
  { darkBg: "rgba(59, 130, 246, 0.22)", darkBd: "rgba(59, 130, 246, 0.55)", darkTxt: "#60a5fa", lightBg: "rgba(59, 130, 246, 0.14)", lightBd: "rgba(59, 130, 246, 0.45)", lightTxt: "#1e40af" },
  { darkBg: "rgba(245, 158, 11, 0.22)", darkBd: "rgba(245, 158, 11, 0.55)", darkTxt: "#fbbf24", lightBg: "rgba(245, 158, 11, 0.16)", lightBd: "rgba(217, 119, 6, 0.45)", lightTxt: "#92400e" },
  { darkBg: "rgba(236, 72, 153, 0.22)", darkBd: "rgba(236, 72, 153, 0.55)", darkTxt: "#f472b6", lightBg: "rgba(236, 72, 153, 0.13)", lightBd: "rgba(219, 39, 119, 0.42)", lightTxt: "#9d174d" },
  { darkBg: "rgba(139, 92, 246, 0.24)", darkBd: "rgba(139, 92, 246, 0.58)", darkTxt: "#a78bfa", lightBg: "rgba(139, 92, 246, 0.14)", lightBd: "rgba(124, 58, 237, 0.44)", lightTxt: "#5b21b6" },
  { darkBg: "rgba(6, 182, 212, 0.22)", darkBd: "rgba(6, 182, 212, 0.55)", darkTxt: "#22d3ee", lightBg: "rgba(6, 182, 212, 0.14)", lightBd: "rgba(8, 145, 178, 0.45)", lightTxt: "#155e75" },
  { darkBg: "rgba(249, 115, 22, 0.22)", darkBd: "rgba(249, 115, 22, 0.55)", darkTxt: "#fb923c", lightBg: "rgba(249, 115, 22, 0.14)", lightBd: "rgba(234, 88, 12, 0.45)", lightTxt: "#9a3412" },
  { darkBg: "rgba(20, 184, 166, 0.22)", darkBd: "rgba(20, 184, 166, 0.55)", darkTxt: "#2dd4bf", lightBg: "rgba(20, 184, 166, 0.14)", lightBd: "rgba(13, 148, 136, 0.45)", lightTxt: "#115e59" },
  { darkBg: "rgba(239, 68, 68, 0.22)", darkBd: "rgba(239, 68, 68, 0.55)", darkTxt: "#f87171", lightBg: "rgba(239, 68, 68, 0.13)", lightBd: "rgba(220, 38, 38, 0.42)", lightTxt: "#991b1b" },
  { darkBg: "rgba(132, 204, 22, 0.22)", darkBd: "rgba(132, 204, 22, 0.55)", darkTxt: "#a3e635", lightBg: "rgba(132, 204, 22, 0.16)", lightBd: "rgba(101, 163, 13, 0.45)", lightTxt: "#3f6212" }
];

function cleanCityName(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  s = s.split(",")[0].trim();
  s = s.replace(/\s*[-–\/]\s*(BR|[A-Z]{2})\s*$/i, "").trim();
  s = s.replace(/\s*\([^)]+\)\s*$/i, "").trim();
  return s;
}

function normCityKey(name) {
  return cleanCityName(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatCityLabel(cityName, spanDays, dayPx) {
  const clean = cleanCityName(cityName);
  if (!clean) return "";
  const maxPx = spanDays * dayPx - 10;
  if (clean.length * 6.6 <= maxPx) return clean;
  const letters = clean.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const raw = (letters.slice(0, 3) || clean.slice(0, 3)).trim();
  if (!raw) return "";
  return raw[0].toLocaleUpperCase("pt-BR") + raw.slice(1).toLocaleLowerCase("pt-BR");
}

function computeDailyCityTimeline(activitiesList, dateISOs) {
  if (!Array.isArray(activitiesList) || !dateISOs.length) return { dayCities: [], spans: [], colorMap: {} };
  const travelLegs = activitiesList
    .filter(a => a && a.start && (a.from || a.to))
    .slice()
    .sort((a, b) => {
      const ae = a.end || a.start, be = b.end || b.start;
      return ae.localeCompare(be) || a.start.localeCompare(b.start);
    });
  if (!travelLegs.length) return { dayCities: [], spans: [], colorMap: {} };

  // Constrói lista completa de datas do início dos trechos até o fim do grid para saber a cidade correta mesmo antes da 1ª data visível
  const minAll = travelLegs[0].start < dateISOs[0] ? travelLegs[0].start : dateISOs[0];
  const legsByArrival = new Map();
  travelLegs.forEach(a => {
    const arrDate = a.end || a.start;
    if (!legsByArrival.has(arrDate)) legsByArrival.set(arrDate, []);
    legsByArrival.get(arrDate).push(a);
  });

  let currentCity = cleanCityName(travelLegs[0].from) || cleanCityName(travelLegs[0].to);
  const cityByDate = {};
  const maxIso = dateISOs[dateISOs.length - 1] > (travelLegs[travelLegs.length - 1].end || travelLegs[travelLegs.length - 1].start)
    ? dateISOs[dateISOs.length - 1]
    : (travelLegs[travelLegs.length - 1].end || travelLegs[travelLegs.length - 1].start);

  const curDt = parseD(minAll);
  const endDt = parseD(maxIso);
  while (curDt <= endDt) {
    const iso = fmtISO(curDt);
    const legsToday = legsByArrival.get(iso);
    if (legsToday && legsToday.length) {
      const last = legsToday[legsToday.length - 1];
      const nextC = cleanCityName(last.to || last.from);
      if (nextC) currentCity = nextC;
    }
    if (currentCity) cityByDate[iso] = currentCity;
    curDt.setDate(curDt.getDate() + 1);
  }

  // Cor determinística e exclusiva (por viagem) por cidade normalizada
  const colorMap = {};
  const usedSlots = new Set();
  const assignColor = city => {
    const k = normCityKey(city);
    if (!k) return CITY_PALETTE[0];
    if (colorMap[k]) return colorMap[k];
    let hash = 0;
    for (let i = 0; i < k.length; i++) hash = ((hash * 31) + k.charCodeAt(i)) >>> 0;
    let slot = hash % CITY_PALETTE.length;
    for (let probe = 0; probe < CITY_PALETTE.length; probe++) {
      const cand = (slot + probe) % CITY_PALETTE.length;
      if (!usedSlots.has(cand)) { slot = cand; break; }
    }
    usedSlots.add(slot);
    colorMap[k] = CITY_PALETTE[slot];
    return colorMap[k];
  };

  const dayCities = dateISOs.map(iso => {
    const c = cityByDate[iso] || "";
    const k = normCityKey(c);
    if (c) assignColor(c);
    return { iso, city: c, key: k };
  });

  const spans = [];
  dayCities.forEach((dc, idx) => {
    if (!dc.city) return;
    const prev = spans[spans.length - 1];
    if (prev && prev.key === dc.key && prev.startIdx + prev.span === idx) {
      prev.span++;
      prev.endIso = dc.iso;
    } else {
      spans.push({
        startIdx: idx,
        span: 1,
        city: dc.city,
        key: dc.key,
        startIso: dc.iso,
        endIso: dc.iso,
        color: assignColor(dc.city)
      });
    }
  });

  return { dayCities, spans, colorMap };
}

function buildRightSummaryHTML(a, extraBadgeOpt = null) {
  const info = getTypeInfoAny(a);
  const meta = unifiedMetaMap.get(a);
  const attCount = Array.isArray(a.attachments) ? a.attachments.length : 0;
  const attBadge = attCount ? `<span class="g-summary-meta">📎 ${attCount}</span>` : "";
  const tktNote = formatTicketsNote(a);
  const actTags = Array.isArray(a.tags) ? a.tags.filter(Boolean) : [];
  const tagsHtml = actTags.length
    ? `<span class="g-summary-tags">${actTags.slice(0, 3).map(tg => `<span class="tag-mini">${esc(tg)}</span>`).join("")}${actTags.length > 3 ? `<span class="tag-mini">+${actTags.length - 3}</span>` : ""}</span>`
    : "";
  const badgeStr = extraBadgeOpt !== null ? extraBadgeOpt : getTripBadgeHTML(a);
  const uAttr = meta ? ` data-umode="${meta.mode}"` : "";

  if (a.type === "Viagem") {
    const c = calc(a);
    const routeTxt = (a.from || a.to) ? `${esc(a.from || "?")} ➔ ${esc(a.to || "?")}` : "";
    const parts = [];
    if (a.km) parts.push(`${num(a.km)} km`);
    if (a.drive) parts.push(hmHuman(a.drive) + (a.stopTime ? ` + ${hmHuman(a.stopTime)}` : ""));
    if (c.isCarpool) parts.push("Carona");
    else if (a.toll) parts.push(`Ped. ${money(a.toll)}`);
    return `
      <div class="g-summary ${info.cls}" data-id="${a.id}"${uAttr}>
        <span class="g-summary-title">${esc(a.name)}</span>
        ${routeTxt ? `<span class="g-summary-meta">${routeTxt}</span>` : ""}
        ${parts.length ? `<span class="g-summary-badge">${parts.join(" · ")}</span>` : ""}
        <span class="g-summary-meta">${c.isCarpool && !c.extra ? "Custo R$ 0" : money(c.total + c.extra)}</span>
        ${badgeStr}
        ${tagsHtml}
        ${attBadge}
      </div>`;
  }

  const d = days(a);
  const metaParts = [];
  if (a.from || a.to) metaParts.push(`${a.from || "?"} ➔ ${a.to || "?"}`);
  if (a.airline) metaParts.push(a.airline);
  if (a.km > 0 && (a.type === "Trem" || a.type === "Ônibus" || a.type === "Navio")) metaParts.push(`${num(a.km)} km`);
  if (a.extraCost > 0) metaParts.push(tktNote ? `${money(a.extraCost)} (${tktNote})` : money(a.extraCost));
  if (a.notes) metaParts.push(a.notes);
  const badgeTxt = d > 1 ? `${d} dias` : fmtShortBR(a.start);

  return `
    <div class="g-summary ${info.cls}" data-id="${a.id}"${uAttr}>
      <span class="g-summary-title">${esc(a.name)}</span>
      <span class="g-summary-badge">${badgeTxt}</span>
      ${badgeStr}
      ${tagsHtml}
      ${metaParts.length ? `<span class="g-summary-meta">${esc(metaParts.join(" · "))}</span>` : ""}
      ${attBadge}
    </div>`;
}

function getIsoWeekInfo(dt) {
  const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { isoYear, week, key: `${isoYear}-W${String(week).padStart(2, "0")}` };
}

function getIsoWeekMonday(dt) {
  const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function colorForUnifiedTrip(tripId) {
  const s = String(tripId || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 33) + s.charCodeAt(i)) >>> 0;
  return UNIFIED_CAL_PALETTE[h % UNIFIED_CAL_PALETTE.length];
}

async function ensureUnifiedTripsLoaded() {
  if (!tripsCache.ownTrips?.length && !tripsCache.sharedTrips?.length) {
    try { tripsCache = await window.FeriasApi.listTrips(); } catch {}
  }
  const allRefs = [...(tripsCache.ownTrips || []), ...(tripsCache.sharedTrips || [])];
  const missingIds = [...new Set(allRefs.map(t => t.id).filter(id => id && !loadedTripsMap.has(id)))];
  if (missingIds.length) {
    await Promise.all(missingIds.map(id => resolveTripRefById(id).catch(() => null)));
  }
  if (activeTrip && !loadedTripsMap.has(activeTrip.id)) {
    activeTrip.data = state;
    loadedTripsMap.set(activeTrip.id, activeTrip);
  }
}

function parseTimeMinutes(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}/.test(String(hhmm))) return null;
  const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
  return (isFinite(h) ? h : 0) * 60 + (isFinite(m) ? m : 0);
}

function detectUnifiedConflicts(items) {
  const buckets = new Map();
  items.forEach((it, idx) => buckets.set(idx, []));
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    const ma = unifiedMetaMap.get(a);
    if (!a.start || !ma) continue;
    const aEnd = a.end || a.start;
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      const mb = unifiedMetaMap.get(b);
      if (!b.start || !mb || ma.tripId === mb.tripId) continue;
      const bEnd = b.end || b.start;
      if (a.start > bEnd || b.start > aEnd) continue;

      // Se ambos são no mesmo dia e possuem horário explícito, verifica interseção de horário
      if (a.start === aEnd && b.start === bEnd && a.start === b.start) {
        const as = parseTimeMinutes(a.startTime);
        const bs = parseTimeMinutes(b.startTime);
        if (as !== null && bs !== null) {
          const ae = parseTimeMinutes(a.endTime) ?? (as + 60);
          const be = parseTimeMinutes(b.endTime) ?? (bs + 60);
          if (as >= be || bs >= ae) continue;
        }
      }
      const crossMode = ma.mode !== mb.mode;
      buckets.get(i).push({ peer: b, peerMeta: mb, crossMode });
      buckets.get(j).push({ peer: a, peerMeta: ma, crossMode });
    }
  }
  items.forEach((it, idx) => {
    const list = buckets.get(idx) || [];
    if (list.length) {
      const isCrossMode = list.some(x => x.crossMode);
      const preview = list.slice(0, 3).map(x => `${x.peer.name} (${x.peerMeta.tripName})`).join("; ");
      unifiedConflictMap.set(it, {
        count: list.length,
        isCrossMode,
        summary: `Conflito com ${list.length} item(ns): ${preview}${list.length > 3 ? "..." : ""}`
      });
    } else {
      unifiedConflictMap.delete(it);
    }
  });
}

function getUnifiedTripsStorageKey() {
  const uId = window.FeriasApi?.getUser?.()?.id || "local";
  return `myplan-unified-trips-${uId}`;
}

function getAllUnifiedTripEntries() {
  const byId = new Map();
  const upsert = (id, patch) => {
    if (!id) return;
    const prev = byId.get(id) || {};
    byId.set(id, { ...prev, ...patch, id });
  };
  (tripsCache.ownTrips || []).forEach(t => upsert(t.id, {
    name: t.name,
    mode: getTripMode(t),
    role: "owner",
    ownerName: t.ownerName || ""
  }));
  (tripsCache.sharedTrips || []).forEach(t => {
    const prev = byId.get(t.id);
    if (prev?.role === "owner") return;
    upsert(t.id, {
      name: t.name,
      mode: getTripMode(t),
      role: t.role || "viewer",
      ownerName: t.ownerName || ""
    });
  });
  loadedTripsMap.forEach(tr => {
    if (!tr || !tr.id) return;
    const prev = byId.get(tr.id);
    const r = prev?.role || tr.role || "owner";
    upsert(tr.id, {
      name: tr.data?.title || tr.name || prev?.name || "Agenda",
      mode: getTripMode(tr),
      role: r,
      ownerName: tr.ownerName || prev?.ownerName || ""
    });
  });
  const list = [...byId.values()].map(e => ({
    ...e,
    name: e.name || "Agenda",
    mode: e.mode === "professional" ? "professional" : "personal",
    calColor: colorForUnifiedTrip(e.id)
  }));
  list.sort((a, b) => {
    const aOwned = a.role === "owner" ? 0 : 1;
    const bOwned = b.role === "owner" ? 0 : 1;
    if (aOwned !== bOwned) return aOwned - bOwned;
    if (a.mode !== b.mode) return a.mode === "professional" ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
  return list;
}

function getUnifiedDefaultTripIds(entries) {
  const owned = entries.filter(e => e.role === "owner").map(e => e.id);
  return owned.length ? owned : entries.map(e => e.id);
}

function ensureUnifiedSelection(entries) {
  const validIds = new Set(entries.map(e => e.id));
  if (unifiedSelectedTripIds === null) {
    let loadedArr = null;
    try {
      const raw = localStorage.getItem(getUnifiedTripsStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) loadedArr = parsed;
      }
    } catch {}
    if (loadedArr !== null) {
      unifiedSelectionCustomized = true;
      const kept = loadedArr.filter(id => validIds.has(id));
      if (kept.length > 0 || loadedArr.length === 0) {
        unifiedSelectedTripIds = new Set(kept);
      } else {
        unifiedSelectionCustomized = false;
        unifiedSelectedTripIds = new Set(getUnifiedDefaultTripIds(entries));
      }
    } else {
      unifiedSelectionCustomized = false;
      unifiedSelectedTripIds = new Set(getUnifiedDefaultTripIds(entries));
    }
  } else if (!unifiedSelectionCustomized) {
    unifiedSelectedTripIds = new Set(getUnifiedDefaultTripIds(entries));
  } else {
    unifiedSelectedTripIds = new Set([...unifiedSelectedTripIds].filter(id => validIds.has(id)));
  }
  return unifiedSelectedTripIds;
}

function saveUnifiedSelection() {
  try {
    localStorage.setItem(getUnifiedTripsStorageKey(), JSON.stringify([...(unifiedSelectedTripIds || [])]));
  } catch {}
}

function buildUnifiedItems() {
  const items = [];
  const entries = getAllUnifiedTripEntries();
  const selectedIds = ensureUnifiedSelection(entries);
  const seenTripIds = new Set();
  const orderedTrips = [];
  const metaIndex = new Map();
  [...(tripsCache.ownTrips || []), ...(tripsCache.sharedTrips || [])].forEach(t => metaIndex.set(t.id, t));

  loadedTripsMap.forEach(tr => {
    if (!tr || seenTripIds.has(tr.id) || !selectedIds.has(tr.id)) return;
    seenTripIds.add(tr.id);
    orderedTrips.push(tr);
  });
  orderedTrips.forEach(tr => {
    const mode = getTripMode(tr);
    const cacheInfo = metaIndex.get(tr.id);
    const calColor = colorForUnifiedTrip(tr.id);
    const tripName = tr.data?.title || tr.name || cacheInfo?.name || "Agenda";
    const ownerName = tr.ownerName || cacheInfo?.ownerName || "";
    const acts = tr.data?.activities || [];
    acts.forEach(a => {
      if (!a || !a.start) return;
      const item = { ...a };
      unifiedMetaMap.set(item, {
        mode,
        tripId: tr.id,
        tripName,
        role: tr.role || cacheInfo?.role || "owner",
        ownerName,
        calColor,
        origRef: a,
        tripRef: tr
      });
      items.push(item);
    });
  });
  items.sort((a, b) => a.start.localeCompare(b.start) || (a.startTime || "").localeCompare(b.startTime || ""));
  detectUnifiedConflicts(items);
  return items;
}

function renderUnifiedStatusBar(barEl, allUnified, visibleUnified, onRefresh) {
  if (!barEl) return;
  if (!ganttUnifiedMode) {
    barEl.hidden = true;
    barEl.innerHTML = "";
    if (unifiedCalMenuOpenBarId === barEl.id) unifiedCalMenuOpenBarId = null;
    return;
  }
  const entries = getAllUnifiedTripEntries();
  const activeIds = ensureUnifiedSelection(entries);
  const selCount = activeIds.size;
  const isOpen = unifiedCalMenuOpenBarId === barEl.id;
  const conflictCnt = allUnified.filter(x => unifiedConflictMap.has(x)).length;
  const crossCnt = allUnified.filter(x => unifiedConflictMap.get(x)?.isCrossMode).length;

  const renderGroup = (mode, title) => {
    const grp = entries.filter(e => e.mode === mode);
    if (!grp.length) return "";
    const rowsHtml = grp.map(e => `
      <label class="unified-cal-opt">
        <input type="checkbox" data-unif-trip="${esc(e.id)}" ${activeIds.has(e.id) ? "checked" : ""}>
        <span class="unified-cal-dot" style="background:${e.calColor}"></span>
        <span class="unified-cal-name">${esc(e.name)}</span>
        ${e.role !== "owner" ? `<span class="unified-cal-shared" title="Compartilhada por ${esc(e.ownerName || "outro")}">Compart.</span>` : ""}
      </label>`).join("");
    return `<div class="unified-cal-group"><div class="unified-cal-gtitle">${title}</div>${rowsHtml}</div>`;
  };

  barEl.hidden = false;
  barEl.innerHTML = `
    <div class="unified-bar-left">
      <div class="unified-cal-host">
        <button type="button" class="btn ghost small unified-cal-trigger" data-unif-cal-trig aria-expanded="${isOpen ? "true" : "false"}">
          📅 Agendas (${selCount}/${entries.length}) <span class="msel-caret" aria-hidden="true">▾</span>
        </button>
        <div class="unified-cal-menu" data-unif-cal-menu ${isOpen ? "" : "hidden"}>
          <div class="unified-cal-presets">
            <button type="button" class="btn ghost small" data-unif-preset="mine">Só minhas</button>
            <button type="button" class="btn ghost small" data-unif-preset="all">Todas</button>
            <button type="button" class="btn ghost small" data-unif-preset="none">Limpar</button>
          </div>
          ${renderGroup("professional", "💼 Profissional")}
          ${renderGroup("personal", "🌴 Pessoal")}
        </div>
      </div>
      <span class="unified-conflict-pill">${selCount === 0
        ? "Selecione ao menos 1 agenda"
        : (conflictCnt ? `⚠️ ${conflictCnt} em conflito${crossCnt ? ` (${crossCnt} Pessoal×Pro)` : ""}` : "✅ Sem conflitos")}</span>
    </div>
    <div class="inline-actions">
      ${conflictCnt ? `<button type="button" class="btn ghost small" data-unif-conflicts>${ganttConflictsOnly ? "👁️ Mostrar todos" : "🔍 Só conflitos"}</button>` : ""}
      <button type="button" class="btn ghost small" data-unif-exit>✕ Sair</button>
    </div>`;

  const trig = barEl.querySelector("[data-unif-cal-trig]");
  const menu = barEl.querySelector("[data-unif-cal-menu]");
  if (trig && menu) {
    if (isOpen) positionFloatingMenu(menu, trig);
    trig.onclick = ev => {
      ev.stopPropagation();
      closeAllGanttPopovers();
      const nextOpen = menu.hidden;
      unifiedCalMenuOpenBarId = nextOpen ? barEl.id : null;
      menu.hidden = !nextOpen;
      trig.setAttribute("aria-expanded", nextOpen ? "true" : "false");
      if (nextOpen) positionFloatingMenu(menu, trig);
    };
  }
  barEl.querySelectorAll("[data-unif-trip]").forEach(cb => {
    cb.onchange = () => {
      const id = cb.dataset.unifTrip;
      const cur = new Set(ensureUnifiedSelection(entries));
      if (cb.checked) cur.add(id);
      else cur.delete(id);
      unifiedSelectedTripIds = cur;
      unifiedSelectionCustomized = true;
      saveUnifiedSelection();
      unifiedCalMenuOpenBarId = barEl.id;
      if (cb.checked && !loadedTripsMap.has(id) && window.FeriasApi?.isServer()) {
        resolveTripRefById(id).then(() => onRefresh()).catch(() => {});
      }
      onRefresh();
    };
  });
  barEl.querySelectorAll("[data-unif-preset]").forEach(btn => {
    btn.onclick = ev => {
      ev.stopPropagation();
      const mode = btn.dataset.unifPreset;
      unifiedSelectionCustomized = true;
      if (mode === "mine") unifiedSelectedTripIds = new Set(getUnifiedDefaultTripIds(entries));
      else if (mode === "all") unifiedSelectedTripIds = new Set(entries.map(e => e.id));
      else unifiedSelectedTripIds = new Set();
      saveUnifiedSelection();
      unifiedCalMenuOpenBarId = barEl.id;
      onRefresh();
    };
  });
  const btnOnly = barEl.querySelector("[data-unif-conflicts]");
  if (btnOnly) btnOnly.onclick = () => { ganttConflictsOnly = !ganttConflictsOnly; onRefresh(); };
  const btnEx = barEl.querySelector("[data-unif-exit]");
  if (btnEx) btnEx.onclick = () => toggleUnifiedGanttMode(false);
}

function buildGanttScale(rows, zoomPx, isMobile) {
  const isWeekOnly = Number(zoomPx) < 22; // Abaixo de 44% (50px = 100%)
  const todayDt = new Date();
  todayDt.setHours(0, 0, 0, 0);
  const todayISO = fmtISO(todayDt);
  const currentWeekKey = getIsoWeekInfo(todayDt).key;

  const formatMonthLabel = (mIdx, year, widthPx) => {
    if (widthPx < 24) return MON_ABBR[mIdx][0];
    if (widthPx < 92) return MON_ABBR[mIdx];
    if (widthPx < 156) return `${MON_ABBR[mIdx]} ${year}`;
    return `${MON_FULL[mIdx]} ${year}`;
  };

  if (isWeekOnly) {
    const dataMinMon = getIsoWeekMonday(parseD(rows[0].start));
    const maxS = rows.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, rows[0].start);
    const dataMaxMon = getIsoWeekMonday(parseD(maxS));
    const dataSpanWeeks = Math.max(4, Math.round((dataMaxMon.getTime() - dataMinMon.getTime()) / (7 * DAY)) + 2);
    const colW = Math.max(12, Math.round(Number(zoomPx) * 4.4));

    let minMon = dataMinMon;
    let weeksCount = dataSpanWeeks;
    if (colW <= 28) {
      const refYear = parseD(rows[0].start).getFullYear();
      const yearJan4Mon = getIsoWeekMonday(new Date(refYear, 0, 4));
      const totalIsoWeeksInYear = getIsoWeekInfo(new Date(refYear, 11, 28)).week || 52;
      const yearEndMonTs = yearJan4Mon.getTime() + (totalIsoWeeksInYear - 1) * 7 * DAY;
      if (dataMinMon.getTime() >= yearJan4Mon.getTime() && dataMaxMon.getTime() <= yearEndMonTs) {
        minMon = yearJan4Mon;
        weeksCount = Math.max(totalIsoWeeksInYear, Math.min(160, dataSpanWeeks));
      } else {
        weeksCount = Math.max(52, Math.min(160, dataSpanWeeks));
      }
    } else if (colW <= 44) {
      weeksCount = Math.max(dataSpanWeeks, Math.min(53, Math.ceil(920 / colW)));
    }
    weeksCount = Math.max(4, Math.min(160, weeksCount));

    const weeks = [];
    const monthSpans = [];
    const colMeta = [];

    for (let i = 0; i < weeksCount; i++) {
      const mon = new Date(minMon.getTime() + i * 7 * DAY + 3600e3);
      mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon.getTime() + 6 * DAY + 3600e3);
      sun.setHours(0, 0, 0, 0);
      const thu = new Date(mon.getTime() + 3 * DAY + 3600e3);
      const wi = getIsoWeekInfo(mon);
      const mKey = `${thu.getFullYear()}-${thu.getMonth()}`;
      const prevM = monthSpans[monthSpans.length - 1];
      let mStart = false;
      if (prevM && prevM.key === mKey) {
        prevM.span++;
      } else {
        mStart = i > 0;
        monthSpans.push({
          key: mKey,
          monthIdx: thu.getMonth(),
          year: thu.getFullYear(),
          label: `${MON_FULL[thu.getMonth()]} ${thu.getFullYear()}`,
          startCol: i + 2,
          span: 1,
          mOdd: monthSpans.length % 2 === 1
        });
      }
      const wOdd = i % 2 === 1;
      const mOdd = (monthSpans.length - 1) % 2 === 1;
      const mondayISO = fmtISO(mon);
      const sundayISO = fmtISO(sun);
      weeks.push({
        idx: i,
        col: i + 2,
        monday: mon,
        sunday: sun,
        mondayISO,
        sundayISO,
        week: wi.week,
        isoYear: wi.isoYear,
        weekLabel: colW < 48 ? String(wi.week) : `Sem ${wi.week}`,
        key: wi.key,
        wOdd,
        mOdd,
        wStart: true,
        mStart,
        isCurrentWeek: wi.key === currentWeekKey
      });
      colMeta.push({ wOdd, mOdd, wStart: true, mStart, we: false, isToday: wi.key === currentWeekKey });
    }

    monthSpans.forEach(ms => {
      const widthPx = ms.span * colW;
      ms.label = formatMonthLabel(ms.monthIdx, ms.year, widthPx);
      ms.isCentered = true;
    });

    return {
      isWeekOnly: true,
      isYearView: colW <= 26,
      colW,
      nCols: weeksCount,
      todayISO,
      headerRows: 2,
      monthSpans,
      weekSpans: weeks,
      dates: weeks,
      dateISOs: weeks.map(w => w.mondayISO),
      colMeta,
      baseTs: minMon.getTime(),
      locateBar(a) {
        const sMon = getIsoWeekMonday(parseD(a.start));
        const eMon = getIsoWeekMonday(parseD(a.end || a.start));
        const off = Math.max(0, Math.round((sMon.getTime() - minMon.getTime()) / (7 * DAY)));
        const endOff = Math.max(off, Math.round((eMon.getTime() - minMon.getTime()) / (7 * DAY)));
        const span = Math.max(1, endOff - off + 1);
        const minBar = Math.min(24, Math.max(11, colW - 3));
        return { off, span, barW: Math.max(minBar, span * colW - 4), unitDays: 7 };
      }
    };
  }

  const DW = Number(zoomPx);
  const minTs = parseD(rows[0].start).getTime() - 2 * DAY;
  const maxS = rows.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, rows[0].start);
  const trailingDays = isMobile ? 10 : 14;
  const nCols = Math.max(5, Math.round((parseD(maxS) - minTs) / DAY) + trailingDays);
  const dates = [];
  for (let i = 0; i < nCols; i++) {
    const d = new Date(minTs + i * DAY + 3600e3);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }

  const monthSpans = [];
  const weekSpans = [];
  const colMeta = [];
  dates.forEach((d, idx) => {
    const mKey = `${d.getFullYear()}-${d.getMonth()}`;
    const lastM = monthSpans[monthSpans.length - 1];
    let mStart = false;
    if (lastM && lastM.key === mKey) {
      lastM.span++;
    } else {
      mStart = idx > 0;
      monthSpans.push({
        key: mKey,
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
        label: `${MON_FULL[d.getMonth()]} ${d.getFullYear()}`,
        startCol: idx + 2,
        span: 1,
        mOdd: monthSpans.length % 2 === 1
      });
    }
    const wi = getIsoWeekInfo(d);
    const lastW = weekSpans[weekSpans.length - 1];
    let wStart = false;
    if (lastW && lastW.key === wi.key) {
      lastW.span++;
    } else {
      wStart = idx > 0;
      weekSpans.push({
        key: wi.key,
        week: wi.week,
        isoYear: wi.isoYear,
        startCol: idx + 2,
        span: 1,
        wOdd: weekSpans.length % 2 === 1,
        isCurrentWeek: wi.key === currentWeekKey
      });
    }
    const iso = fmtISO(d);
    const we = d.getDay() === 0 || d.getDay() === 6;
    const isToday = iso === todayISO;
    colMeta.push({
      iso,
      we,
      isToday,
      wOdd: (weekSpans.length - 1) % 2 === 1,
      mOdd: (monthSpans.length - 1) % 2 === 1,
      wStart,
      mStart
    });
  });

  monthSpans.forEach(ms => {
    const widthPx = ms.span * DW;
    ms.label = formatMonthLabel(ms.monthIdx, ms.year, widthPx);
    ms.isCentered = widthPx <= 420;
  });
  weekSpans.forEach(ws => {
    const widthPx = ws.span * DW;
    ws.weekLabel = widthPx < 48 ? String(ws.week) : `Sem ${ws.week}`;
  });

  return {
    isWeekOnly: false,
    isYearView: false,
    colW: DW,
    nCols,
    todayISO,
    headerRows: 3,
    monthSpans,
    weekSpans,
    dates,
    dateISOs: dates.map(d => fmtISO(d)),
    colMeta,
    baseTs: minTs,
    locateBar(a) {
      const off = Math.round((parseD(a.start) - minTs) / DAY);
      const len = days(a);
      return { off, span: len, barW: Math.max(12, len * DW - 6), unitDays: 1 };
    }
  };
}

function getUnifiedFilteredItems(filterByColFn = null) {
  const all = buildUnifiedItems();
  const personalTotal = Object.keys(window.ACTIVITY_TYPES || {}).length;
  const proTotal = Object.keys(window.PRO_ACTIVITY_TYPES || {}).length;
  const personalPartial = ganttFilterTypes.size < personalTotal;
  const filtered = all.filter(it => {
    const meta = unifiedMetaMap.get(it);
    if (!meta) return false;
    if (ganttConflictsOnly && !unifiedConflictMap.has(it)) return false;
    if (appMode === "personal") {
      if (meta.mode === "personal") {
        if (!ganttFilterTypes.has(it.type)) return false;
      } else if (personalPartial && !ganttFilterTypes.has(it.type)) {
        return false;
      }
      if (ganttFilterTags.size > 0 && !(Array.isArray(it.tags) && it.tags.some(tg => ganttFilterTags.has(tg)))) return false;
      if (personalDateFrom && (it.end || it.start) < personalDateFrom) return false;
      if (personalDateTo && it.start > personalDateTo) return false;
    } else if (typeof filterByColFn === "function") {
      if (!filterByColFn(it, meta, proTotal)) return false;
    }
    return true;
  });
  return { allUnified: all, filtered };
}

function getUnifiedBarExtraClasses(a) {
  const meta = unifiedMetaMap.get(a);
  if (!meta) return "";
  const cls = [meta.mode === "professional" ? "unified-pro" : "unified-personal"];
  if (unifiedConflictMap.has(a)) cls.push("has-conflict");
  return " " + cls.join(" ");
}

function getTypeInfoAny(a) {
  const meta = unifiedMetaMap.get(a);
  if (meta?.mode === "professional" && window.MyPlanPro) return window.MyPlanPro.getProTypeInfo(a.type);
  return getTypeInfo(a.type);
}

function renderUnifiedCardSubBadges(a) {
  const meta = unifiedMetaMap.get(a);
  if (!meta) return getTripBadgeHTML(a);
  const modePill = meta.mode === "professional"
    ? `<span class="unified-pill-pro">💼 PRO</span>`
    : `<span class="unified-pill-per">🌴 PESSOAL</span>`;
  const calBadge = `<span class="cal-color-chip" style="--cal-color:${meta.calColor}" title="${esc(meta.tripName)}">● ${esc(meta.tripName)}</span>`;
  const conf = unifiedConflictMap.get(a);
  const confBadge = conf ? `<span class="unified-conflict-pill" title="${esc(conf.summary)}">⚠️ Conflito</span>` : "";
  return `${modePill} ${calBadge}${confBadge ? " " + confBadge : ""}`;
}

function renderGantt(allSorted) {
  const g = $("#gantt");
  const wrap = $("#ganttWrap");
  const tlWrap = $("#timelineWrap");
  const trips = getSelectedTrips();
  const multiTrip = trips.length > 1;

  const unifBtn = $("#btnGanttUnified");
  if (unifBtn) unifBtn.setAttribute("aria-pressed", String(ganttUnifiedMode));
  const vBtn = $("#btnGanttViewPop");
  const vLbl = $("#ganttViewPopLabel");
  const vDot = $("#ganttViewUnifDot");
  if (vBtn) vBtn.classList.toggle("has-active", ganttUnifiedMode);
  if (vLbl) vLbl.textContent = ganttMode === "timeline" ? "Timeline" : "Gantt";
  if (vDot) vDot.hidden = !ganttUnifiedMode;
  if ($("#ganttZoomGroup")) $("#ganttZoomGroup").hidden = ganttMode !== "gantt";

  const roleBadge = $("#tripRoleBadge");
  if (roleBadge) {
    if (!ganttUnifiedMode && !multiTrip && activeTrip && activeTrip.role !== "owner") {
      roleBadge.textContent = `Compartilhada (${activeTrip.ownerName || "outro"})`;
      roleBadge.hidden = false;
    } else {
      roleBadge.hidden = true;
    }
  }

  let s;
  if (ganttUnifiedMode) {
    const u = getUnifiedFilteredItems();
    s = u.filtered;
    renderUnifiedStatusBar($("#ganttUnifiedBar"), u.allUnified, u.filtered, () => {
      renderGantt(sorted());
      renderTimeline(sorted());
    });
  } else {
    renderUnifiedStatusBar($("#ganttUnifiedBar"), [], [], null);
    s = applyPersonalFilters(allSorted);
  }

  wrap.hidden = ganttMode !== "gantt";
  tlWrap.hidden = ganttMode !== "timeline";
  updateGanttZoomReadout();
  if (ganttMode !== "gantt") return;

  const isWeekOnly = ganttZoom < 22;
  g.classList.toggle("slim-rail", ganttSlimRail);
  g.classList.toggle("zoom-week-only", isWeekOnly);
  g.classList.toggle("zoom-compact", !isWeekOnly && ganttZoom <= 24);
  g.classList.toggle("zoom-micro", !isWeekOnly && ganttZoom <= 18);

  if (!s.length) {
    g.style.gridTemplateColumns = "1fr";
    const unifEmpty = ganttUnifiedMode && ensureUnifiedSelection(getAllUnifiedTripEntries()).size === 0;
    if (unifEmpty) {
      g.innerHTML = `<div style="padding:28px;text-align:center">
        <p class="muted">Nenhuma agenda selecionada na Agenda Completa. Marque 1 ou mais agendas em <b>Agendas</b> acima.</p>
      </div>`;
    } else if (allSorted.length > 0 || ganttUnifiedMode) {
      g.innerHTML = `<div style="padding:28px;text-align:center">
        <p class="muted">Nenhuma atividade corresponde aos filtros selecionados.</p>
        <button type="button" class="btn primary" id="btnGanttResetFilter">☑️ Limpar filtros</button>
      </div>`;
      const rst = $("#btnGanttResetFilter");
      if (rst) rst.onclick = () => { ganttConflictsOnly = false; resetGanttTypeFilter(); };
    } else {
      g.innerHTML = `<div style="padding:28px;text-align:center">
        <p class="muted">Nenhuma atividade cadastrada ainda nesta viagem.</p>
        <button type="button" class="btn primary" onclick="openModal()">➕ Adicionar primeira atividade</button>
      </div>`;
    }
    return;
  }

  const scale = buildGanttScale(s, ganttZoom, window.innerWidth < 720);
  const DW = scale.colW;
  const n = scale.nCols;
  const nameW = ganttSlimRail ? 54 : (window.innerWidth < 720 ? 156 : (scale.isYearView && DW <= 18 ? 205 : 265));
  const todayISO = scale.todayISO;

  g.classList.toggle("zoom-year", Boolean(scale.isYearView));
  g.style.gridTemplateColumns = `${nameW}px repeat(${n}, ${DW}px)`;
  g.style.setProperty("--gantt-name-w", `${nameW}px`);
  g.dataset.unitDays = scale.isWeekOnly ? "7" : "1";
  g.dataset.colW = String(DW);

  let h = `<div class="g-corner">
    ${ganttSlimRail ? "" : `<span>${ganttUnifiedMode ? "Agenda Completa" : "Atividades"}</span>`}
    <button type="button" class="g-focus-btn${ganttSlimRail ? " g-focus-only" : ""}" id="btnGanttSlim" title="${ganttSlimRail ? "Expandir nomes das atividades" : "Retrair colunas de nome"}" aria-label="${ganttSlimRail ? "Expandir nomes das atividades" : "Retrair colunas de nome"}">${ganttSlimRail ? "⤢" : "⤡"}</button>
  </div>`;

  scale.monthSpans.forEach(ms => {
    h += `<div class="g-month-head ${ms.mOdd ? "m-odd" : "m-even"}${ms.isCentered ? " is-centered" : ""}" style="grid-column:${ms.startCol} / span ${ms.span};grid-row:1"><span class="g-month-label">${ms.label}</span></div>`;
  });

  if (scale.isWeekOnly) {
    scale.weekSpans.forEach(ws => {
      h += `<div class="g-week-head ${ws.wOdd ? "w-odd" : "w-even"} ${ws.isCurrentWeek ? "today" : ""}" style="grid-column:${ws.col};grid-row:2" data-date="${ws.mondayISO}" data-end-date="${ws.sundayISO}" title="Semana ${ws.week} (${fmtShortBR(ws.mondayISO)}–${fmtShortBR(ws.sundayISO)})">${ws.weekLabel}</div>`;
    });
  } else {
    scale.weekSpans.forEach(ws => {
      h += `<div class="g-week-head ${ws.wOdd ? "w-odd" : "w-even"} ${ws.isCurrentWeek ? "today" : ""}" style="grid-column:${ws.startCol} / span ${ws.span};grid-row:2" title="Semana ${ws.week} de ${ws.isoYear}">${ws.weekLabel}</div>`;
    });
    const numStep = DW <= 24 ? 2 : 1;
    scale.dates.forEach((d, i) => {
      const cm = scale.colMeta[i];
      const hideNum = numStep > 1 && d.getDate() !== 1 && (i % numStep !== 0);
      h += `<div class="g-head ${cm.we ? "weekend" : ""} ${cm.wOdd ? "w-odd" : "w-even"} ${cm.mOdd ? "m-odd" : "m-even"} ${cm.wStart ? "w-start" : ""} ${cm.mStart ? "m-start" : ""} ${cm.isToday ? "today" : ""}${hideNum ? " day-hide-num" : ""}" style="grid-column:${i + 2};grid-row:3" data-date="${cm.iso}">
        <span>${WD[d.getDay()][0]}</span><b>${d.getDate()}</b>
      </div>`;
    });
  }

  const cityTrack = (!scale.isWeekOnly && !ganttUnifiedMode && !multiTrip)
    ? computeDailyCityTimeline(state.activities || [], scale.dateISOs)
    : { spans: [] };
  const hasCityRow = !scale.isWeekOnly && !ganttUnifiedMode && !multiTrip && cityTrack.spans.length > 0;
  if (hasCityRow) {
    const dark = isDarkTheme();
    h += `<div class="g-city-corner" style="grid-column:1;grid-row:4" title="Cidade em cada dia">${ganttSlimRail ? "📍" : "📍 Cidade"}</div>`;
    cityTrack.spans.forEach(sp => {
      const col = sp.color;
      const bg = dark ? col.darkBg : col.lightBg;
      const bd = dark ? col.darkBd : col.lightBd;
      const txtCol = dark ? col.darkTxt : col.lightTxt;
      const shortTxt = formatCityLabel(sp.city, sp.span, DW);
      const tip = `${sp.city}: ${fmtBR(sp.startIso)}${sp.endIso !== sp.startIso ? ` a ${fmtBR(sp.endIso)}` : ""}`;
      h += `<div class="g-city-span" style="grid-column:${sp.startIdx + 2} / span ${sp.span};grid-row:4" title="${esc(tip)}">
        <span class="g-city-pill" style="background:${bg};border-color:${bd};color:${txtCol}">${esc(shortTxt)}</span>
      </div>`;
    });
  }

  const baseRow = (scale.isWeekOnly ? 3 : 4) + (hasCityRow ? 1 : 0);
  s.forEach((a, rowIdx) => {
    const meta = unifiedMetaMap.get(a);
    const info = getTypeInfoAny(a);
    const row = rowIdx + baseRow;
    const altCls = rowIdx % 2 ? "alt" : "";
    const conf = unifiedConflictMap.get(a);
    const isProRow = meta?.mode === "professional";
    const rowDone = isProRow && Boolean(a.completed || Number(a.progress) >= 100 || a.columnId === "done" || (meta?.tripRef?.data?.params?.doneColumnId && a.columnId === meta.tripRef.data.params.doneColumnId));
    const typeColAttr = info.isCustom && info.color ? `--t-color:${esc(info.color)};` : "";
    const rowStyleExtra = `${meta ? `--cal-color:${meta.calColor};` : ""}${typeColAttr}`;
    const subLeft = isProRow
      ? `${fmtShortBR(a.start)}${a.startTime ? ` ${a.startTime}` : ""}${days(a) > 1 ? ` · ${days(a)}d` : ""}`
      : (isTravelType(a.type) && (a.from || a.to)
        ? `${a.from || "?"} ➔ ${a.to || "?"}`
        : `${fmtShortBR(a.start)}${days(a) > 1 ? ` · ${days(a)}d` : ""}`);

    const doneBtnHtml = isProRow
      ? `<button type="button" class="g-done-btn${rowDone ? " is-done" : ""}" data-gantt-done="${esc(a.id)}" title="${rowDone ? "Reabrir tarefa" : "Marcar como concluída"}" aria-label="${rowDone ? "Reabrir tarefa" : "Marcar como concluída"}">✓</button>`
      : "";

    h += `<div class="g-name ${altCls}${meta ? " is-unified-row" : ""}${rowDone ? " is-done" : ""}" style="grid-column:1;grid-row:${row};${rowStyleExtra}" data-id="${esc(a.id)}" data-umode="${meta ? meta.mode : "personal"}" title="${esc(conf ? `${label(a)} — ${conf.summary}` : label(a))}">
      ${doneBtnHtml}
      <span class="g-type-dot ${info.cls}">${info.icon}</span>
      <div class="g-name-txt">
        <div class="g-name-title">${esc(a.name)}${conf ? " ⚠️" : ""}</div>
        <div class="g-name-sub">${esc(subLeft)} ${meta ? renderUnifiedCardSubBadges(a) : getTripBadgeHTML(a)}</div>
      </div>
    </div>`;

    const pos = scale.locateBar(a);
    for (let i = 0; i < n; i++) {
      const cm = scale.colMeta[i];
      let inner = "";
      if (i === pos.off) {
        const lenDays = days(a);
        const insideTxt = (scale.isWeekOnly || (DW <= 20 && lenDays === 1))
          ? `${info.icon}${scale.isWeekOnly && DW >= 52 ? ` ${esc(a.name.slice(0, 12))}` : ""}`
          : (lenDays > 1 ? `${info.icon} ${lenDays}d` : info.icon);
        const resizeHandle = (!scale.isWeekOnly && (lenDays > 1 || a.type === "Período" || a.type === "Hospedagem" || isProRow)) || scale.isWeekOnly
          ? `<span class="g-resize" data-resize="${esc(a.id)}" title="Arraste para alterar duração"></span>` : "";
        const unifCls = getUnifiedBarExtraClasses(a);
        const progBar = (isProRow && Number(a.progress) > 0)
          ? `<span class="g-bar-prog" style="width:${Number(a.progress)}%"></span>` : "";
        const summaryHtml = isProRow && window.MyPlanPro?.buildProSummaryHTML
          ? window.MyPlanPro.buildProSummaryHTML(a, renderUnifiedCardSubBadges(a))
          : buildRightSummaryHTML(a, meta ? renderUnifiedCardSubBadges(a) : null);

        inner = `
          <div class="g-event-wrap" style="left:3px">
            <div class="g-bar ${info.cls} ${lenDays === 1 && !scale.isWeekOnly ? "single-day" : ""}${unifCls}${rowDone ? " is-done" : ""}" data-id="${esc(a.id)}" data-umode="${meta ? meta.mode : "personal"}" style="width:${pos.barW}px;${typeColAttr}" title="${esc(conf ? conf.summary : a.name)}">
              ${progBar}<span>${insideTxt}</span>${resizeHandle}
            </div>
            ${summaryHtml}
          </div>`;
      }
      h += `<div class="g-cell ${altCls} ${cm.we ? "weekend" : ""} ${cm.wOdd ? "w-odd" : "w-even"} ${cm.mOdd ? "m-odd" : "m-even"} ${cm.wStart ? "w-start" : ""} ${cm.mStart ? "m-start" : ""} ${cm.isToday ? "today" : ""}" style="grid-column:${i + 2};grid-row:${row}">${inner}</div>`;
    }
  });

  g.innerHTML = h;
  const slimBtn = $("#btnGanttSlim");
  if (slimBtn) {
    slimBtn.onclick = () => {
      ganttSlimRail = !ganttSlimRail;
      renderGantt(sorted());
    };
  }
  const openTargetItem = el => {
    const id = el.dataset.id;
    const uMode = el.dataset.umode;
    if (uMode === "professional" && window.MyPlanPro) window.MyPlanPro.openProCardModal(id);
    else openModal(id);
  };
  g.querySelectorAll("[data-gantt-done]").forEach(btn => {
    btn.onclick = ev => {
      ev.stopPropagation();
      window.MyPlanPro?.toggleProCardDone?.(btn.dataset.ganttDone);
    };
  });
  g.querySelectorAll(".g-name[data-id], .g-summary[data-id]").forEach(el => {
    el.onclick = ev => {
      if (ev.target.closest("[data-gantt-done]")) return;
      openTargetItem(el);
    };
  });
  g.querySelectorAll(".g-bar").forEach(bindDrag);
  g.querySelectorAll(".g-resize").forEach(bindResize);
}

function bindDrag(bar) {
  bar.onpointerdown = e => {
    if (e.target.closest("[data-resize]")) return;
    const openTarget = () => {
      if (bar.dataset.umode === "professional" && window.MyPlanPro) window.MyPlanPro.openProCardModal(bar.dataset.id);
      else openModal(bar.dataset.id);
    };
    if (e.pointerType === "touch") {
      const x0 = e.clientX, y0 = e.clientY;
      bar.onpointerup = ev => {
        bar.onpointerup = null;
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 10) openTarget();
      };
      return;
    }

    e.preventDefault();
    bar.setPointerCapture(e.pointerId);
    const wrap = bar.closest(".g-event-wrap");
    const gridEl = bar.closest(".gantt");
    const colW = Number(gridEl?.dataset.colW) || ganttZoom;
    const unitDays = Number(gridEl?.dataset.unitDays) || 1;
    const x0 = e.clientX;
    let dCols = 0;
    const tip = document.createElement("div");
    tip.className = "drag-tip";
    const ctx = findActivityContext(bar.dataset.id);
    const a = ctx?.activity;
    if (!a) return;

    bar.onpointermove = ev => {
      const dx = ev.clientX - x0;
      dCols = Math.round(dx / colW);
      const dd = dCols * unitDays;
      if (Math.abs(dx) > 4) {
        bar.classList.add("dragging");
        wrap.style.transform = `translateX(${dCols * colW}px)`;
        const ns = fmtISO(new Date(parseD(a.start).getTime() + dd * DAY + 3600e3));
        tip.textContent = `${fmtShortBR(ns)} (${dd > 0 ? "+" : ""}${dd}d)`;
        tip.style.left = `${ev.clientX + 12}px`;
        tip.style.top = `${ev.clientY - 28}px`;
        if (!tip.parentNode) document.body.appendChild(tip);
      }
    };

    bar.onpointerup = () => {
      bar.onpointermove = bar.onpointerup = null;
      bar.classList.remove("dragging");
      wrap.style.transform = "";
      tip.remove();
      const dd = dCols * unitDays;
      if (!dd) return openTarget();
      if (ctx.trip?.role === "viewer") return toast("👁️ Planejamento compartilhado somente para visualização.");
      a.start = fmtISO(new Date(parseD(a.start).getTime() + dd * DAY + 3600e3));
      a.end = fmtISO(new Date(parseD(a.end || a.start).getTime() + dd * DAY + 3600e3));
      saveTripRecord(ctx.trip, `📅 ${a.name} movido ${dd > 0 ? "+" : ""}${dd} dia(s)`);
    };
  };
}

function bindResize(handle) {
  handle.onpointerdown = e => {
    if (e.pointerType === "touch") return;
    e.stopPropagation();
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const bar = handle.closest(".g-bar");
    const gridEl = bar.closest(".gantt");
    const colW = Number(gridEl?.dataset.colW) || ganttZoom;
    const unitDays = Number(gridEl?.dataset.unitDays) || 1;
    const ctx = findActivityContext(handle.dataset.resize);
    const a = ctx?.activity;
    if (!a) return;
    const x0 = e.clientX;
    const origLen = days(a);
    let dd = 0;

    handle.onpointermove = ev => {
      dd = Math.round((ev.clientX - x0) / colW) * unitDays;
      const newLen = Math.max(1, origLen + dd);
      const pxW = unitDays === 7 ? Math.max(24, Math.ceil(newLen / 7) * colW - 6) : Math.max(28, newLen * colW - 6);
      bar.style.width = `${pxW}px`;
    };
    handle.onpointerup = () => {
      handle.onpointermove = handle.onpointerup = null;
      const newLen = Math.max(1, origLen + dd);
      if (newLen === origLen) return;
      if (ctx.trip?.role === "viewer") {
        return render();
      }
      a.end = fmtISO(new Date(parseD(a.start).getTime() + (newLen - 1) * DAY + 3600e3));
      saveTripRecord(ctx.trip, `↔️ ${a.name}: duração ajustada para ${newLen} dia(s)`);
    };
  };
}

function renderTimeline(allSorted) {
  const tl = $("#timelineWrap");
  if (ganttMode !== "timeline") return;
  let s;
  if (ganttUnifiedMode) {
    const u = getUnifiedFilteredItems();
    s = u.filtered;
    renderUnifiedStatusBar($("#ganttUnifiedBar"), u.allUnified, u.filtered, () => {
      renderGantt(sorted());
      renderTimeline(sorted());
    });
  } else {
    renderUnifiedStatusBar($("#ganttUnifiedBar"), [], [], null);
    s = applyPersonalFilters(allSorted);
  }
  if (!s.length) {
    const unifEmpty = ganttUnifiedMode && ensureUnifiedSelection(getAllUnifiedTripEntries()).size === 0;
    tl.innerHTML = unifEmpty
      ? `<p class="muted">Nenhuma agenda selecionada na Agenda Completa. Marque 1 ou mais agendas em <b>Agendas</b> acima.</p>`
      : (allSorted.length > 0 || ganttUnifiedMode
        ? `<p class="muted">Nenhuma atividade corresponde aos filtros selecionados. <button type="button" class="link-btn" id="btnTlResetFilter">Limpar filtros</button></p>`
        : `<p class="muted">Nenhuma atividade encontrada.</p>`);
    const rst = $("#btnTlResetFilter");
    if (rst) rst.onclick = () => { ganttConflictsOnly = false; resetGanttTypeFilter(); };
    return;
  }
  tl.innerHTML = s.map(a => {
    const metaInfo = unifiedMetaMap.get(a);
    const info = getTypeInfoAny(a);
    const d = parseD(a.start);
    const attCount = Array.isArray(a.attachments) ? a.attachments.length : 0;
    const conf = unifiedConflictMap.get(a);
    let meta = "";
    if (metaInfo?.mode === "professional") {
      meta = `${days(a)} dia(s)${a.startTime ? ` · 🕒 ${a.startTime}` : ""}${a.client ? ` · Cliente: ${a.client}` : ""}${a.location ? ` · 📍 ${a.location}` : ""}${a.notes ? ` · ${a.notes}` : ""}`;
    } else {
      const c = calc(a);
      const tktNote = formatTicketsNote(a);
      meta = a.type === "Viagem"
        ? `${a.from || "?"} ➔ ${a.to || "?"} · ${num(a.km)} km · ${hmHuman(a.drive)}${a.stopTime ? ` (+${hmHuman(a.stopTime)} par.)` : ""} · ${c.isCarpool ? "Carona (s/ custo carro)" : `Ped. ${money(a.toll)}`} · Total ${money(c.total + c.extra)}`
        : `${days(a)} dia(s)${a.from || a.to ? ` · ${a.from || "?"} ➔ ${a.to || "?"}` : ""}${a.extraCost ? ` · ${money(a.extraCost)}${tktNote ? ` (${tktNote})` : ""}` : ""}${a.notes ? ` · ${a.notes}` : ""}`;
    }
    return `
      <div class="tl-item ${info.cls}${conf ? " has-conflict" : ""}" style="${metaInfo ? `border-left-color:${metaInfo.calColor}` : ""}" data-id="${esc(a.id)}" data-umode="${metaInfo ? metaInfo.mode : "personal"}">
        <div class="date-badge"><b>${d.getDate()}</b>${MON[d.getMonth()]}</div>
        <div class="tl-body">
          <div class="tl-top">
            <span class="tl-title">${info.icon} ${esc(a.name)} ${metaInfo ? renderUnifiedCardSubBadges(a) : getTripBadgeHTML(a)} ${attCount ? `<small class="muted">📎 ${attCount}</small>` : ""}</span>
            <span class="chip ${info.cls}">${esc(info.short)}</span>
          </div>
          <div class="tl-meta">${WD[d.getDay()]} · ${fmtBR(a.start)}${days(a) > 1 ? ` até ${fmtBR(a.end)}` : ""}${conf ? ` · ${conf.summary}` : ""}</div>
          <div class="tl-meta">${esc(meta)}</div>
        </div>
      </div>`;
  }).join("");
  tl.querySelectorAll(".tl-item[data-id]").forEach(el => {
    el.onclick = () => {
      if (el.dataset.umode === "professional" && window.MyPlanPro) window.MyPlanPro.openProCardModal(el.dataset.id);
      else openModal(el.dataset.id);
    };
  });
}

/* ---------- DASHBOARD ---------- */
function renderDashboard(s, t) {
  const avg = t.liters ? t.km / t.liters : 0;
  const perPerson = t.grandTotal / Math.max(1, +state.params.travelers || 1);
  const doneChk = state.checklist.filter(c => c.status === "Concluído").length;

  const k = [
    ["Distância total", `${num(t.km)} km`, `${t.trips} trechos de carro`, "var(--trip)"],
    ["Tempo na estrada", hmHuman(t.drive + t.stopTime), `Direção ${hmHuman(t.drive)} + ${t.stops} par. (${hmHuman(t.stopTime)})`, "var(--accent)"],
    ["Combustível estimado", `${num(t.liters, 1)} L`, `${num(t.tanks, 1)} tanques (${state.vehicle.tank} L)`, "var(--event)"],
    ["Custo combustível", money(t.fuel), avg ? `Média geral ${num(avg, 1)} km/L` : "Modo elétrico", "#fb7185"],
    ["Pedágios + recargas EV", money(t.toll + t.charge), `Ped. ${money(t.toll)} + EV ${money(t.charge)}`, "var(--period)"],
    ["Deslocamento carro", money(t.total), "Combustível + pedágios + EV", "var(--ok)"],
    ["Total geral das férias", money(t.grandTotal), `${num(state.params.travelers || 1)} viajante(s) · ${money(perPerson)}/pessoa`, "#06b6d4"],
    ["Checklist", `${doneChk}/${state.checklist.length}`, `${state.checklist.length ? Math.round(doneChk / state.checklist.length * 100) : 0}% concluído`, "#f59e0b"]
  ];

  $("#kpis").innerHTML = k.map(([l, v, sub, c]) =>
    `<div class="kpi" style="--c:${c}"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${sub}</div></div>`
  ).join("");

  const today = fmtISO(new Date());
  let up = s.filter(a => (a.end || a.start) >= today);
  if (!up.length) up = s;
  $("#upcoming").innerHTML = up.slice(0, 12).map(a => {
    const info = getTypeInfo(a.type);
    const d = parseD(a.start);
    const diff = Math.round((d - parseD(today)) / DAY);
    const c = calc(a);
    const sub = a.type === "Viagem"
      ? `${num(a.km)} km · ${hmHuman(c.time)} · ${c.isCarpool ? "Carona · " : ""}${money(c.total + c.extra)}`
      : `${days(a)} dia(s)${a.extraCost ? ` · ${money(a.extraCost)}` : ""}${a.notes ? ` · ${a.notes}` : ""}`;
    return `<li data-id="${a.id}">
      <div class="date-badge"><b>${d.getDate()}</b>${MON[d.getMonth()]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(label(a))} ${getTripBadgeHTML(a)}</div>
        <div class="muted small">${WD[d.getDay()]} · ${esc(sub)}${diff >= 0 ? ` · em ${diff}d` : ""}</div>
      </div>
      <span class="chip ${info.cls}">${esc(info.short)}</span>
    </li>`;
  }).join("") || `<li class="muted">Sem atividades</li>`;
  $("#upcoming").querySelectorAll("li[data-id]").forEach(li => li.onclick = () => openModal(li.dataset.id));

  renderCostCompositionInto($("#costStackedBar"), $("#costBars"), $("#extraBudgetSummary"), t);

  const trips = s.filter(a => a.type === "Viagem");
  const mx = Math.max(1, ...trips.map(a => +a.km || 0));
  $("#tripBars").innerHTML = trips.map(a => {
    const c = calc(a);
    return `
    <div class="bar-row clickable" data-id="${a.id}">
      <div class="top">
        <span>${fmtShortBR(a.start)} · ${esc(label(a))} ${getTripBadgeHTML(a)}</span>
        <span>${num(a.km)} km · ${hmHuman(c.time)} · <b>${c.isCarpool && !c.extra ? "Carona (R$ 0)" : money(c.total + c.extra)}</b></span>
      </div>
      <div class="bar"><div style="width:${(+a.km || 0) / mx * 100}%;background:linear-gradient(90deg,#06b6d4,#6366f1)"></div></div>
    </div>`;
  }).join("") || `<p class="muted">Nenhuma viagem de carro cadastrada.</p>`;
  $("#tripBars").querySelectorAll(".bar-row[data-id]").forEach(row => row.onclick = () => openModal(row.dataset.id));

  const ml = $("#mapsLink");
  const fullUrl = window.FeriasMaps.buildFullRouteUrl(trips);
  if (fullUrl) {
    ml.href = fullUrl;
    ml.textContent = `🗺️ Abrir rota completa no Google Maps (${num(t.km)} km)`;
    ml.style.display = "";
  } else {
    ml.style.display = "none";
  }

  const btnMap = $("#btnRenderFullMap");
  const hint = $("#dashboardMapHint");
  if (!window.FeriasMaps.hasKey()) {
    hint.innerHTML = `Configure sua Google Maps API Key na aba <b>Parâmetros</b> para desenhar o trajeto interativo completo aqui.`;
    btnMap.disabled = true;
  } else {
    hint.textContent = "Clique em 'Carregar mapa completo' para visualizar todos os trechos conectados.";
    btnMap.disabled = false;
  }
}

function renderCostCompositionInto(stackedEl, barsEl, extraBox, t) {
  const parts = t.costBreakdown || [];
  const denom = t.grandTotal || t.total || 1;
  if (stackedEl) {
    stackedEl.innerHTML = parts
      .filter(p => p.value > 0)
      .map(p => `<div class="stacked-seg" style="width:${(p.value / denom * 100).toFixed(2)}%;background:${p.color || p.gradient}" title="${esc(p.label)}: ${money(p.value)}"></div>`)
      .join("");
  }
  if (barsEl) {
    barsEl.innerHTML = parts.map(p => `
      <div class="bar-row">
        <div class="top"><span>${esc(p.label)}</span><span><b>${money(p.value)}</b> · ${t.grandTotal ? num(p.value / denom * 100) : 0}%</span></div>
        <div class="bar"><div style="width:${t.grandTotal ? Math.min(100, (p.value / denom * 100)) : 0}%;background:${p.gradient}"></div></div>
      </div>`).join("") || `<p class="muted small">Nenhum custo lançado ainda.</p>`;
  }
  if (extraBox) {
    const lines = [];
    if (t.lodgingParamCost > 0) lines.push(`<div>Hospedagem por diária (${t.lodgingNights} noites): <b>${money(t.lodgingParamCost)}</b></div>`);
    if (t.lodgingActCost > 0) lines.push(`<div>Hospedagens lançadas no cronograma: <b>${money(t.lodgingActCost)}</b></div>`);
    if (t.foodCost > 0) lines.push(`<div>Alimentação (${t.totalDays}d × ${state.params.travelers}p): <b>${money(t.foodCost)}</b></div>`);
    if (t.otherFixedBudget > 0) lines.push(`<div>Outros gastos fixos: <b>${money(t.otherFixedBudget)}</b></div>`);
    if (t.contingencyCost > 0) lines.push(`<div>Margem reserva (${state.params.contingencyPct}%): <b>${money(t.contingencyCost)}</b></div>`);
    extraBox.innerHTML = lines.join("");
    extraBox.hidden = lines.length === 0;
  }
}

/* ---------- MENU FINANCEIRO: LINHA DO TEMPO DIÁRIA & REDISTRIBUIÇÃO ---------- */
function distributeWaterFill(baseValues, targetTotal) {
  const n = baseValues.length;
  const out = new Array(n).fill(0);
  if (!n) return out;
  const sumBase = baseValues.reduce((a, b) => a + b, 0);
  const clampedTarget = Math.max(0, targetTotal);
  if (clampedTarget >= sumBase) {
    const extra = (clampedTarget - sumBase) / n;
    return baseValues.map(b => b + extra);
  }
  let active = baseValues.map((_, i) => i);
  while (active.length) {
    const remBase = active.reduce((s, i) => s + baseValues[i], 0);
    const avgDelta = (clampedTarget - remBase) / active.length;
    const neg = active.filter(i => baseValues[i] + avgDelta < 0);
    if (!neg.length) {
      active.forEach(i => { out[i] = Math.max(0, baseValues[i] + avgDelta); });
      break;
    }
    neg.forEach(i => { out[i] = 0; });
    active = active.filter(i => baseValues[i] + avgDelta >= 0);
  }
  return out;
}

function computeSingleTripFinancialTimeline(tripData, s, t) {
  if (!s.length) {
    return {
      daysList: [],
      plannedTotal: t.grandTotal || 0,
      savingsGoal: Math.max(0, Number(tripData.finance?.savingsGoal) || 0),
      effectiveCeiling: Math.max(0, (t.grandTotal || 0) - Math.max(0, Number(tripData.finance?.savingsGoal) || 0)),
      sumActualLogged: 0,
      sumLoggedGoal: 0,
      varianceSoFar: 0,
      loggedCount: 0,
      remainingCount: 0,
      remainingCeiling: 0,
      avgRemainingPerDay: 0,
      overBudgetBy: 0
    };
  }

  const minISO = s[0].start;
  const maxISO = s.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, minISO);
  const minD = parseD(minISO);
  const maxD = parseD(maxISO);
  const span = Math.max(1, Math.round((maxD - minD) / DAY) + 1);

  const daysList = [];
  const dayMap = {};
  for (let i = 0; i < span; i++) {
    const dt = new Date(minD.getTime() + i * DAY + 3600e3);
    dt.setHours(0, 0, 0, 0);
    const iso = fmtISO(dt);
    const obj = {
      idx: i,
      iso,
      date: dt,
      activities: [],
      items: [],
      cats: { fuel: 0, tollEv: 0, specificOther: 0, lodging: 0, linear: 0 },
      plannedBase: 0,
      goalTarget: 0,
      adjustedTarget: 0,
      redistDelta: 0,
      hasActual: false,
      actualSpent: 0,
      actualEntries: [],
      actualNote: "",
      deltaVsGoal: 0,
      cumPlanned: 0,
      cumExpectedOrReal: 0
    };
    daysList.push(obj);
    dayMap[iso] = obj;
  }

  // 1) Custos pontuais das atividades alocados nos dias exatos
  s.forEach(a => {
    const d0 = parseD(a.start);
    const d1 = parseD(a.end || a.start);
    const nDays = Math.max(1, Math.round((d1 - d0) / DAY) + 1);
    const info = getTypeInfo(a.type);
    const c = calc(a, undefined, tripData);
    const tktNote = formatTicketsNote(a);

    for (let k = 0; k < nDays; k++) {
      const cur = new Date(d0.getTime() + k * DAY + 3600e3);
      const cell = dayMap[fmtISO(cur)];
      if (!cell) continue;
      cell.activities.push({ id: a.id, name: label(a), icon: info.icon || "•", type: a.type });

      if (a.type === "Viagem") {
        if (c.fuel > 0) {
          const amt = c.fuel / nDays;
          cell.cats.fuel += amt;
          cell.items.push({ key: `${a.id}:fuel`, checkable: true, cat: "fuel", icon: "⛽", label: `Combustível (${a.name || "Viagem"})`, amount: amt });
        }
        if (c.toll > 0) {
          const amt = c.toll / nDays;
          cell.cats.tollEv += amt;
          cell.items.push({ key: `${a.id}:toll`, checkable: true, cat: "tollEv", icon: "🛣️", label: `Pedágio (${a.name || "Viagem"})`, amount: amt });
        }
        if (c.charge > 0) {
          const amt = c.charge / nDays;
          cell.cats.tollEv += amt;
          cell.items.push({ key: `${a.id}:charge`, checkable: true, cat: "tollEv", icon: "⚡", label: `Recarga EV (${a.name || "Viagem"})`, amount: amt });
        }
        if (c.extra > 0) {
          const amt = c.extra / nDays;
          cell.cats.specificOther += amt;
          cell.items.push({ key: `${a.id}:extra`, checkable: true, cat: "specificOther", icon: "🚗", label: `Extras viagem (${a.name || "Viagem"})`, amount: amt });
        }
      } else {
        const ex = +a.extraCost || 0;
        if (ex > 0) {
          const amt = ex / nDays;
          if (a.type === "Hospedagem") {
            cell.cats.lodging += amt;
            cell.items.push({ key: `${a.id}:act`, checkable: true, cat: "lodging", icon: "🏨", label: a.name || "Hospedagem", amount: amt });
          } else {
            cell.cats.specificOther += amt;
            cell.items.push({
              key: `${a.id}:act`,
              checkable: true,
              cat: "specificOther",
              icon: info.icon || "🎟️",
              label: tktNote ? `${a.name} (${tktNote})` : (a.name || info.short),
              amount: amt
            });
          }
        }
      }
    }
  });

  // 2) Rateio linear diário de Alimentação, Diárias de Hospedagem, Outros Fixos e Reserva
  const foodPerDay = t.foodCost / span;
  const lodgPerDay = t.lodgingParamCost / span;
  const fixedPerDay = t.otherFixedBudget / span;
  const contPerDay = t.contingencyCost / span;

  const records = (tripData.finance && tripData.finance.dailyRecords) || {};
  daysList.forEach(d => {
    if (foodPerDay > 0) {
      d.cats.linear += foodPerDay;
      d.items.push({ key: "param:food", checkable: false, cat: "linear", icon: "🍽️", label: "Alimentação (rateio diário)", amount: foodPerDay });
    }
    if (lodgPerDay > 0) {
      d.cats.lodging += lodgPerDay;
      d.items.push({ key: "param:lodging", checkable: true, cat: "lodging", icon: "🏨", label: "Hospedagem diária (Parâmetros)", amount: lodgPerDay });
    }
    if (fixedPerDay > 0) {
      d.cats.linear += fixedPerDay;
      d.items.push({ key: "param:fixed", checkable: false, cat: "linear", icon: "📦", label: "Outros gastos fixos (rateio)", amount: fixedPerDay });
    }
    if (contPerDay > 0) {
      d.cats.linear += contPerDay;
      d.items.push({ key: "param:cont", checkable: false, cat: "linear", icon: "🛟", label: `Reserva ${tripData.params?.contingencyPct || 0}% (rateio)`, amount: contPerDay });
    }
    d.plannedBase = d.cats.fuel + d.cats.tollEv + d.cats.specificOther + d.cats.lodging + d.cats.linear;

    const rec = records[d.iso];
    if (rec && typeof rec === "object") {
      const checkedMap = rec.checkedPlanned && typeof rec.checkedPlanned === "object" ? rec.checkedPlanned : {};
      let checkedCount = 0;
      let checkedSum = 0;
      d.items.forEach(it => {
        if (!it.checkable) return;
        const st = checkedMap[it.key];
        const isChk = Boolean(st && st.checked);
        const hasCustom = st && st.actualAmount !== null && st.actualAmount !== undefined && st.actualAmount !== "";
        const actualAmt = hasCustom ? Math.max(0, Number(st.actualAmount) || 0) : it.amount;
        it.checked = isChk;
        it.actualAmount = actualAmt;
        it.editedAmount = hasCustom && Math.abs(actualAmt - it.amount) > 0.005;
        if (isChk) {
          checkedCount++;
          checkedSum += actualAmt;
        }
      });
      d.checkedCount = checkedCount;
      d.checkedSum = checkedSum;
      d.actualEntries = Array.isArray(rec.entries) ? clone(rec.entries) : [];
      d.entriesSum = d.actualEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      d.actualNote = rec.note || "";

      if (rec.manualTotalOverride && rec.spent !== null && rec.spent !== undefined && rec.spent !== "") {
        d.hasActual = true;
        d.actualSpent = Math.max(0, Number(rec.spent) || 0);
      } else if (checkedCount > 0 || d.actualEntries.length > 0) {
        d.hasActual = true;
        d.actualSpent = checkedSum + d.entriesSum;
      } else if (rec.spent !== null && rec.spent !== undefined && rec.spent !== "") {
        d.hasActual = true;
        d.actualSpent = Math.max(0, Number(rec.spent) || 0);
      }
    }
  });

  // 3) Aplicação da meta de economia & redistribuição inteligente para os dias restantes
  const plannedTotal = t.grandTotal || 0;
  const savingsGoal = Math.max(0, Number(tripData.finance?.savingsGoal) || 0);
  const effectiveCeiling = Math.max(0, plannedTotal - savingsGoal);

  const goalTargets = distributeWaterFill(daysList.map(d => d.plannedBase), effectiveCeiling);
  daysList.forEach((d, idx) => { d.goalTarget = goalTargets[idx]; });

  let sumActualLogged = 0;
  let sumLoggedGoal = 0;
  const unloggedIndices = [];
  daysList.forEach((d, idx) => {
    if (d.hasActual) {
      sumActualLogged += d.actualSpent;
      sumLoggedGoal += d.goalTarget;
      d.deltaVsGoal = d.actualSpent - d.goalTarget;
      d.adjustedTarget = d.goalTarget;
    } else {
      unloggedIndices.push(idx);
    }
  });

  const remainingCeiling = Math.max(0, effectiveCeiling - sumActualLogged);
  const unloggedGoalSlice = unloggedIndices.map(i => daysList[i].goalTarget);
  const rebalancedUnlogged = distributeWaterFill(unloggedGoalSlice, remainingCeiling);
  unloggedIndices.forEach((dayIdx, pos) => {
    const d = daysList[dayIdx];
    d.adjustedTarget = rebalancedUnlogged[pos];
    d.redistDelta = d.adjustedTarget - d.goalTarget;
  });

  let runPlan = 0;
  let runRealOrAdj = 0;
  daysList.forEach(d => {
    runPlan += d.goalTarget;
    runRealOrAdj += d.hasActual ? d.actualSpent : d.adjustedTarget;
    d.cumPlanned = runPlan;
    d.cumExpectedOrReal = runRealOrAdj;
  });

  const overBudgetBy = Math.max(0, sumActualLogged - effectiveCeiling);
  const loggedCount = daysList.length - unloggedIndices.length;
  const remainingCount = unloggedIndices.length;
  return {
    daysList,
    plannedTotal,
    savingsGoal,
    effectiveCeiling,
    sumActualLogged,
    sumLoggedGoal,
    varianceSoFar: sumActualLogged - sumLoggedGoal,
    loggedCount,
    remainingCount,
    remainingCeiling,
    avgRemainingPerDay: remainingCount > 0 ? remainingCeiling / remainingCount : 0,
    overBudgetBy
  };
}

function computeFinancialTimeline(s, t) {
  const trips = getSelectedTrips();
  if (trips.length <= 1) {
    return computeSingleTripFinancialTimeline(trips[0]?.data || state, s, t);
  }
  const mergedDaysMap = new Map();
  let plannedTotal = 0, savingsGoal = 0, effectiveCeiling = 0;
  let sumActualLogged = 0, sumLoggedGoal = 0;

  trips.forEach(tr => {
    const trActs = [...(tr.data.activities || [])].sort((a, b) => a.start.localeCompare(b.start) || (a.type === "Viagem") - (b.type === "Viagem"));
    const trTotals = computeSingleTripTotals(tr.data);
    const sub = computeSingleTripFinancialTimeline(tr.data, trActs, trTotals);
    plannedTotal += sub.plannedTotal;
    savingsGoal += sub.savingsGoal;
    effectiveCeiling += sub.effectiveCeiling;
    sumActualLogged += sub.sumActualLogged;
    sumLoggedGoal += sub.sumLoggedGoal;

    sub.daysList.forEach(d => {
      let tgt = mergedDaysMap.get(d.iso);
      if (!tgt) {
        tgt = { ...clone(d), date: new Date(d.date), activities: [], items: [], actualEntries: [], actualNote: "" };
        tgt.cats = { fuel: 0, tollEv: 0, specificOther: 0, lodging: 0, linear: 0 };
        tgt.plannedBase = 0;
        tgt.goalTarget = 0;
        tgt.adjustedTarget = 0;
        tgt.redistDelta = 0;
        tgt.hasActual = false;
        tgt.actualSpent = 0;
        tgt.deltaVsGoal = 0;
        mergedDaysMap.set(d.iso, tgt);
      }
      tgt.activities.push(...d.activities.map(a => ({ ...a, name: `[${tr.name}] ${a.name}` })));
      tgt.items.push(...d.items.map(it => ({ ...it, label: `[${tr.name}] ${it.label}` })));
      for (const ck of Object.keys(tgt.cats)) tgt.cats[ck] += d.cats[ck] || 0;
      tgt.plannedBase += d.plannedBase;
      tgt.goalTarget += d.goalTarget;
      tgt.adjustedTarget += d.adjustedTarget;
      tgt.redistDelta += d.redistDelta;
      if (d.hasActual) {
        tgt.hasActual = true;
        tgt.actualSpent += d.actualSpent;
      }
      tgt.deltaVsGoal += d.deltaVsGoal;
    });
  });

  const daysList = [...mergedDaysMap.values()].sort((a, b) => a.iso.localeCompare(b.iso));
  let runPlan = 0, runReal = 0, loggedCount = 0;
  daysList.forEach((d, idx) => {
    d.idx = idx;
    if (d.hasActual) loggedCount++;
    runPlan += d.goalTarget;
    runReal += d.hasActual ? d.actualSpent : d.adjustedTarget;
    d.cumPlanned = runPlan;
    d.cumExpectedOrReal = runReal;
  });
  const remainingCount = daysList.length - loggedCount;
  const remainingCeiling = Math.max(0, effectiveCeiling - sumActualLogged);
  return {
    daysList,
    plannedTotal,
    savingsGoal,
    effectiveCeiling,
    sumActualLogged,
    sumLoggedGoal,
    varianceSoFar: sumActualLogged - sumLoggedGoal,
    loggedCount,
    remainingCount,
    remainingCeiling,
    avgRemainingPerDay: remainingCount > 0 ? remainingCeiling / remainingCount : 0,
    overBudgetBy: Math.max(0, sumActualLogged - effectiveCeiling)
  };
}

function renderFinance(s, t) {
  const kpisEl = $("#finKpis");
  if (!kpisEl) return;

  const data = computeFinancialTimeline(s, t);
  const fFood = $("#fin-food"), fLodg = $("#fin-lodging"), fFixed = $("#fin-fixed"), fCont = $("#fin-cont"), fSav = $("#fin-savingsGoal");
  if (fFood) fFood.value = state.params.dailyFoodPerPerson || 0;
  if (fLodg) fLodg.value = state.params.lodgingPerNight || 0;
  if (fFixed) fFixed.value = state.params.otherFixedBudget || 0;
  if (fCont) fCont.value = state.params.contingencyPct || 0;
  if (fSav) fSav.value = state.finance?.savingsGoal || 0;

  // Destaca preset ativo e percentual personalizado
  const exactPct = data.plannedTotal > 0 ? (data.savingsGoal / data.plannedTotal) * 100 : 0;
  const activePct = Math.round(exactPct);
  let matchedPreset = false;
  document.querySelectorAll(".fin-save-preset").forEach(btn => {
    const pct = Number(btn.dataset.savepct || 0);
    const isMatch = (pct === 0 && data.savingsGoal === 0) || (pct > 0 && Math.abs(exactPct - pct) <= 0.4 && data.savingsGoal > 0);
    if (isMatch && pct > 0) matchedPreset = true;
    btn.classList.toggle("active", isMatch);
  });
  const customPctInp = $("#fin-savingsPctCustom");
  const customPctWrap = $("#finCustomPctWrap");
  if (customPctInp && document.activeElement !== customPctInp) {
    customPctInp.value = data.savingsGoal > 0 ? Number(exactPct.toFixed(1)) : "";
  }
  if (customPctWrap) {
    customPctWrap.classList.toggle("active", data.savingsGoal > 0 && !matchedPreset);
  }

  // KPIs principais (4)
  const varLabel = data.loggedCount === 0
    ? "Nenhum dia lançado ainda"
    : (data.varianceSoFar > 0.05
        ? `⚠️ +${money(data.varianceSoFar)} acima da meta`
        : data.varianceSoFar < -0.05
          ? `💚 ${money(Math.abs(data.varianceSoFar))} economizados!`
          : "✅ Exatamente na meta");

  const kpis = [
    ["Planejado Base", money(data.plannedTotal), `${data.daysList.length} dia(s) · ${num(state.params.travelers || 1)} viajante(s)`, "var(--accent2)"],
    ["Orçamento Alvo", money(data.effectiveCeiling), data.savingsGoal > 0 ? `Economia alvo: -${money(data.savingsGoal)} (${num(exactPct, 1)}%)` : "Sem corte definido (Base)", "#10b981"],
    ["Já Executado (Real)", money(data.sumActualLogged), `${data.loggedCount}/${data.daysList.length} dias · ${varLabel}`, data.varianceSoFar > 0.05 ? "#fb7185" : "#34d399"],
    ["Saldo & Média Restante", data.remainingCount ? `${money(data.avgRemainingPerDay)}/dia` : (data.overBudgetBy > 0 ? `-${money(data.overBudgetBy)}` : money(data.remainingCeiling)),
      data.remainingCount ? `${money(data.remainingCeiling)} livres em ${data.remainingCount} dia(s)` : "Todos os dias lançados", data.overBudgetBy > 0 ? "#fb7185" : "#f59e0b"]
  ];
  kpisEl.innerHTML = kpis.map(([l, v, sub, c]) =>
    `<div class="kpi" style="--c:${c}"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${sub}</div></div>`
  ).join("");

  // Detalhamento expansível (todos os cards financeiros + composição de custos)
  const expSec = $("#finExpandedSection");
  const expBtn = $("#btnFinExpandAll");
  if (expSec) expSec.hidden = !finExpanded;
  if (expBtn) {
    expBtn.setAttribute("aria-expanded", String(finExpanded));
    expBtn.textContent = finExpanded
      ? "▴ Recolher cards detalhados e composição dos custos"
      : "▾ Ampliar todos os cards e composição dos custos";
  }
  const extraKpisEl = $("#finExtraKpis");
  if (extraKpisEl) {
    const avg = t.liters ? t.km / t.liters : 0;
    const perPerson = t.grandTotal / Math.max(1, +state.params.travelers || 1);
    const extraCards = [
      ["Distância total", `${num(t.km)} km`, `${t.trips} trecho(s) de carro`, "var(--trip)"],
      ["Custo combustível", money(t.fuel), avg ? `${num(t.liters, 1)} L · Média ${num(avg, 1)} km/L` : "Modo elétrico", "#fb7185"],
      ["Pedágios + recargas EV", money(t.toll + t.charge), `Ped. ${money(t.toll)} + EV ${money(t.charge)}`, "var(--period)"],
      ["Deslocamento carro", money(t.total), "Combustível + pedágios + EV", "var(--ok)"],
      ["Voos, Ingressos & Lazer", money(t.flightsCost + t.otherActCost), "Lançados no cronograma", "#38bdf8"],
      ["Hospedagens (Total)", money(t.lodgingParamCost + t.lodgingActCost), `${t.lodgingNights} noites + reservas`, "#10b981"],
      ["Alimentação & Fixos/Res.", money(t.foodCost + t.otherFixedBudget + t.contingencyCost), `Alim. ${money(t.foodCost)} · Fix/Res ${money(t.otherFixedBudget + t.contingencyCost)}`, "#fb923c"],
      ["Total por viajante", money(perPerson), `${num(state.params.travelers || 1)} viajante(s) · Alvo ${money(data.effectiveCeiling / Math.max(1, +state.params.travelers || 1))}`, "#06b6d4"]
    ];
    extraKpisEl.innerHTML = extraCards.map(([l, v, sub, c]) =>
      `<div class="kpi" style="--c:${c}"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${sub}</div></div>`
    ).join("");
  }
  renderCostCompositionInto($("#finCostStackedBar"), $("#finCostBars"), $("#finExtraBudgetSummary"), t);

  // Banner de redistribuição dinâmica
  const banner = $("#finRedistBanner");
  if (banner) {
    banner.className = "fin-redist-banner";
    if (!data.daysList.length) {
      banner.hidden = true;
    } else if (data.overBudgetBy > 0.05) {
      banner.classList.add("danger");
      banner.hidden = false;
      banner.innerHTML = `🚨 <b>Orçamento total excedido em ${money(data.overBudgetBy)}!</b> Você já gastou ${money(data.sumActualLogged)} contra um teto de ${money(data.effectiveCeiling)}. Reduza gastos futuros ou aumente o orçamento.`;
    } else if (data.loggedCount > 0 && Math.abs(data.varianceSoFar) > 0.05 && data.remainingCount > 0) {
      const avgShift = data.daysList.filter(d => !d.hasActual).reduce((sum, d) => sum + d.redistDelta, 0) / data.remainingCount;
      if (data.varianceSoFar > 0) {
        banner.classList.add("warn");
        banner.hidden = false;
        banner.innerHTML = `🔄 <b>Redistribuição ativa (compensando +${money(data.varianceSoFar)} gastos a mais):</b> para fechar dentro do orçamento de ${money(data.effectiveCeiling)}, a meta média dos próximos <b>${data.remainingCount} dias</b> foi reajustada em <b>${money(avgShift)}/dia</b>.`;
      } else {
        banner.classList.add("ok");
        banner.hidden = false;
        banner.innerHTML = `💚 <b>Economia acumulada de ${money(Math.abs(data.varianceSoFar))}!</b> Os próximos <b>${data.remainingCount} dias</b> ganharam uma folga extra média de <b>+${money(avgShift)}/dia</b> dentro do seu orçamento.`;
      }
    } else if (data.savingsGoal > 0) {
      banner.classList.add("ok");
      banner.hidden = false;
      banner.innerHTML = `🎯 <b>Meta de economia ativa (-${money(data.savingsGoal)}):</b> o orçamento alvo foi ajustado para <b>${money(data.effectiveCeiling)}</b>, reduzindo proporcionalmente a meta diária ao longo da viagem.`;
    } else {
      banner.hidden = true;
    }
  }

  // Filtro da timeline
  const visibleDays = data.daysList.filter(d => {
    if (financeFilter === "events") return d.activities.length > 0;
    if (financeFilter === "logged") return d.hasActual;
    return true;
  });

  const chartEl = $("#finChart");
  const listEl = $("#finTimelineList");
  const spanEl = $("#finTimelineSpan");

  if (spanEl) {
    spanEl.textContent = data.daysList.length
      ? `${fmtBR(data.daysList[0].iso)} até ${fmtBR(data.daysList[data.daysList.length - 1].iso)} (${data.daysList.length} dias)`
      : "";
  }

  if (!visibleDays.length) {
    const emptyMsg = `<p class="muted" style="padding:18px;text-align:center;width:100%">${data.daysList.length ? "Nenhum dia corresponde a este filtro." : "Adicione atividades no Cronograma para visualizar a linha do tempo financeira dia a dia."}</p>`;
    if (chartEl) chartEl.innerHTML = emptyMsg;
    if (listEl) listEl.innerHTML = emptyMsg;
    return;
  }

  // Escala do gráfico
  const maxBarVal = Math.max(10, ...visibleDays.map(d => Math.max(d.plannedBase, d.adjustedTarget, d.hasActual ? d.actualSpent : 0)));
  const BAR_PX = 148;
  if (chartEl) {
    chartEl.innerHTML = visibleDays.map(d => {
      const targetShow = d.hasActual ? d.goalTarget : d.adjustedTarget;
      const totalH = Math.max(3, Math.round((d.plannedBase / maxBarVal) * BAR_PX));
      const realH = d.hasActual ? Math.max(3, Math.round((d.actualSpent / maxBarVal) * BAR_PX)) : 0;
      const adjBottom = Math.min(BAR_PX, Math.round((targetShow / maxBarVal) * BAR_PX));
      const segOrder = [
        ["linear", "#fb923c"],
        ["lodging", "#10b981"],
        ["specificOther", "#38bdf8"],
        ["tollEv", "#a78bfa"],
        ["fuel", "#fb7185"]
      ];
      const baseDenom = d.plannedBase || 1;
      const segHtml = segOrder
        .filter(([k]) => d.cats[k] > 0)
        .map(([k, col]) => {
          const pct = (d.cats[k] / baseDenom) * 100;
          return `<div class="fin-stack-seg" style="height:${pct.toFixed(1)}%;background:${col}"></div>`;
        }).join("");

      const iconsTxt = [...new Set(d.activities.map(a => a.icon))].slice(0, 3).join("");
      const isOver = d.hasActual && d.actualSpent > d.goalTarget + 0.05;
      const valTop = d.hasActual ? d.actualSpent : targetShow;
      const tip = `${fmtBR(d.iso)} (${WD[d.date.getDay()]})\nPrevisto Base: ${money(d.plannedBase)}\nMeta p/ Dia: ${money(targetShow)}${d.hasActual ? `\nGasto Real: ${money(d.actualSpent)}` : ""}`;

      return `
      <div class="fin-bar-col ${d.hasActual ? "has-real" : ""} ${isOver ? "is-over" : ""}" data-fdate="${d.iso}" title="${esc(tip)}">
        <div class="fin-bar-val">${valTop >= 1000 ? `R$${num(valTop / 1000, 1)}k` : `R$${Math.round(valTop)}`}</div>
        <div class="fin-bar-pair">
          <div class="fin-stack-bar" style="height:${totalH}px">${segHtml}</div>
          ${d.hasActual ? `<div class="fin-real-bar ${isOver ? "over" : ""}" style="height:${realH}px"></div>` : ""}
          ${(data.savingsGoal > 0 || Math.abs(d.redistDelta) > 0.5) ? `<div class="fin-adj-dot" style="bottom:${adjBottom}px"></div>` : ""}
        </div>
        <div class="fin-bar-date">${fmtShortBR(d.iso)}</div>
        <div class="fin-bar-wd">${WD[d.date.getDay()]}</div>
        <div class="fin-bar-dots">${iconsTxt || "&nbsp;"}</div>
      </div>`;
    }).join("");
    chartEl.querySelectorAll(".fin-bar-col[data-fdate]").forEach(col => {
      col.onclick = () => openFinanceDayModal(col.dataset.fdate);
    });
  }

  // Lista Linha do Tempo Dia a Dia
  if (listEl) {
    listEl.innerHTML = visibleDays.map(d => {
      const wd = WD[d.date.getDay()];
      let statusClass = "";
      let pillHtml = `<span class="fin-status-pill">Previsto</span>`;
      if (d.hasActual) {
        if (d.deltaVsGoal > 0.05) {
          statusClass = "logged-over";
          pillHtml = `<span class="fin-status-pill over">⚠️ +${money(d.deltaVsGoal)} acima</span>`;
        } else if (d.deltaVsGoal < -0.05) {
          statusClass = "logged-ok";
          pillHtml = `<span class="fin-status-pill ok">💸 Economizou ${money(Math.abs(d.deltaVsGoal))}</span>`;
        } else {
          statusClass = "logged-ok";
          pillHtml = `<span class="fin-status-pill ok">✅ Na meta</span>`;
        }
      }

      const actTags = d.activities.map(a => `<span class="fin-act-tag">${a.icon} ${esc(a.name)}</span>`).join("");
      const itemsHtml = d.items.map(it => {
        if (!it.checkable) {
          return `<span class="fin-cost-chip">${it.icon} ${esc(it.label)}: <b>${money(it.amount)}</b></span>`;
        }
        const dispAmt = it.checked ? (it.actualAmount ?? it.amount) : it.amount;
        const diffMark = it.checked && it.editedAmount ? ` <small class="muted">(prev. ${money(it.amount)})</small>` : "";
        return `<label class="fin-cost-chip fin-cost-chk${it.checked ? " checked" : ""}" title="Marcar este gasto previsto como realizado">
          <input type="checkbox" data-fchk-day="${d.iso}" data-fchk-key="${esc(it.key)}" data-fchk-amt="${dispAmt}"${it.checked ? " checked" : ""}>
          <span>${it.icon} ${esc(it.label)}: <b>${money(dispAmt)}</b>${diffMark}</span>
        </label>`;
      }).join("") || `<span class="muted small">Sem custos lançados para este dia.</span>`;

      const redistBadge = !d.hasActual && Math.abs(d.redistDelta) > 0.5
        ? ` <small style="color:${d.redistDelta < 0 ? "#f59e0b" : "#34d399"}">(${d.redistDelta > 0 ? "+" : ""}${money(d.redistDelta)} redist.)</small>`
        : "";

      return `
      <div class="fin-day-card ${statusClass}" data-fday="${d.iso}">
        <div class="fin-day-top">
          <div class="fin-day-id">
            <div class="date-badge"><b>${d.date.getDate()}</b>${MON[d.date.getMonth()]}</div>
            <div style="min-width:0">
              <div style="font-weight:700;color:var(--text-strong)">${wd} · ${fmtBR(d.iso)}</div>
              ${actTags ? `<div class="fin-day-acts">${actTags}</div>` : `<div class="muted small">Dia livre / trânsito</div>`}
            </div>
          </div>
          ${pillHtml}
        </div>

        <div class="fin-day-breakdown">${itemsHtml}</div>

        ${d.actualEntries.length ? `<div class="muted small">🧾 Real detalhado: ${d.actualEntries.map(e => `${esc(e.desc || e.cat || "Gasto")} (${money(e.amount)})`).join(" · ")}</div>` : ""}
        ${d.actualNote ? `<div class="muted small">📝 ${esc(d.actualNote)}</div>` : ""}

        <div class="fin-day-metrics">
          <div class="fin-metric-box">
            <span>Previsto do dia</span>
            <b>${money(d.plannedBase)}</b>
          </div>
          <div class="fin-metric-box">
            <span>${d.hasActual ? "Meta do dia" : "Meta p/ gastar hoje"}</span>
            <b class="recalc">${money(d.hasActual ? d.goalTarget : d.adjustedTarget)}${redistBadge}</b>
          </div>
          <div class="fin-metric-box">
            <span>Executado Real</span>
            <b class="${d.hasActual ? (d.deltaVsGoal > 0.05 ? "real-over" : "real-ok") : ""}">${d.hasActual ? money(d.actualSpent) : "—"}</b>
          </div>
          <div class="fin-metric-box">
            <span>Acumulado até o dia</span>
            <b>${money(d.cumExpectedOrReal)} <small class="muted">/ ${money(d.cumPlanned)}</small></b>
          </div>
          <div class="fin-day-actions">
            <button type="button" class="btn ${d.hasActual ? "ghost" : "primary"} small" data-finlog="${d.iso}">
              ${d.hasActual ? "✏️ Editar Real" : "💵 Lançar Gasto"}
            </button>
          </div>
        </div>
      </div>`;
    }).join("");

    listEl.querySelectorAll("[data-finlog]").forEach(b => {
      b.onclick = () => openFinanceDayModal(b.dataset.finlog);
    });
    listEl.querySelectorAll("input[data-fchk-key]").forEach(chk => {
      chk.onchange = () => {
        const dayIso = chk.dataset.fchkDay;
        const itemKey = chk.dataset.fchkKey;
        const defAmt = Math.max(0, Number(chk.dataset.fchkAmt) || 0);
        if (!state.finance) state.finance = { savingsGoal: 0, dailyRecords: {} };
        if (!state.finance.dailyRecords) state.finance.dailyRecords = {};
        const rec = state.finance.dailyRecords[dayIso] || { checkedPlanned: {}, entries: [], note: "" };
        if (!rec.checkedPlanned) rec.checkedPlanned = {};
        const prev = rec.checkedPlanned[itemKey] || {};
        rec.checkedPlanned[itemKey] = {
          checked: chk.checked,
          actualAmount: prev.actualAmount != null ? prev.actualAmount : defAmt
        };
        rec.manualTotalOverride = false;
        const anyChecked = Object.values(rec.checkedPlanned).some(v => v && v.checked);
        const hasEntries = Array.isArray(rec.entries) && rec.entries.length > 0;
        if (!anyChecked && !hasEntries && !rec.note) {
          delete state.finance.dailyRecords[dayIso];
        } else {
          state.finance.dailyRecords[dayIso] = rec;
        }
        save(chk.checked ? "✅ Gasto previsto marcado como realizado!" : "↩️ Item desmarcado!");
      };
    });
  }
}

let modalFinEntries = [];
let modalFinPlanned = [];
let modalFinManualTotal = false;

function recalcFinModalTotal(forceSyncInput = true) {
  const checkedSum = modalFinPlanned
    .filter(p => p.checked)
    .reduce((sum, p) => sum + (Math.max(0, Number(p.actualAmount) || 0)), 0);
  const entriesSum = modalFinEntries.reduce((sum, r) => sum + (Math.max(0, Number(r.amount) || 0)), 0);
  const combined = Math.round((checkedSum + entriesSum) * 100) / 100;
  const hasAny = modalFinPlanned.some(p => p.checked) || modalFinEntries.length > 0;

  const calcBar = $("#finModalCalcBar");
  if (calcBar) {
    calcBar.innerHTML = `Previstos marcados: <b>${money(checkedSum)}</b> + Extras manuais: <b>${money(entriesSum)}</b> = Total automático: <b>${money(combined)}</b>`;
  }
  if (forceSyncInput && !modalFinManualTotal) {
    $("#finDayTotalInput").value = hasAny ? combined.toFixed(2) : "";
  }
  return { checkedSum, entriesSum, combined, hasAny };
}

function renderFinModalPlanned() {
  const box = $("#finModalPlannedBox");
  if (!box) return;
  if (!modalFinPlanned.length) {
    box.innerHTML = `<div class="muted small">Não há gastos específicos previstos (ingressos, combustível, pedágios, passagens) para este dia.</div>`;
    return;
  }
  box.innerHTML = `<div class="route-head-row"><strong>✅ Gastos Previstos neste Dia</strong><span class="muted small">Marque se realizado ou clique em ✏️ p/ alterar o valor</span></div>` +
    modalFinPlanned.map((it, i) => `
      <div class="fin-planned-row${it.checked ? " is-checked" : ""}" data-fpi="${i}">
        <label class="fin-planned-chk-lbl">
          <input type="checkbox" data-fp="chk"${it.checked ? " checked" : ""}>
          <div style="min-width:0">
            <div class="fin-planned-name">${it.icon} ${esc(it.label)}</div>
            <div class="fin-planned-orig">Previsto: ${money(it.plannedAmount)}</div>
          </div>
        </label>
        <div class="fin-planned-right">
          ${it.isEditing
            ? `<input type="number" step="0.01" min="0" class="fin-planned-edit-input" data-fp="amt" value="${Number(it.actualAmount).toFixed(2)}" aria-label="Valor real">`
            : `<span class="fin-planned-val">${money(it.actualAmount)}</span>`}
          <button type="button" class="icon-btn" data-fp="edit" title="Editar valor real deste item">✏️</button>
        </div>
      </div>`).join("");

  box.querySelectorAll('input[data-fp="chk"]').forEach(chk => {
    chk.onchange = () => {
      const idx = parseInt(chk.closest(".fin-planned-row").dataset.fpi, 10);
      modalFinPlanned[idx].checked = chk.checked;
      modalFinManualTotal = false;
      chk.closest(".fin-planned-row").classList.toggle("is-checked", chk.checked);
      recalcFinModalTotal(true);
    };
  });
  box.querySelectorAll('button[data-fp="edit"]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.closest(".fin-planned-row").dataset.fpi, 10);
      modalFinPlanned[idx].isEditing = !modalFinPlanned[idx].isEditing;
      renderFinModalPlanned();
      if (modalFinPlanned[idx].isEditing) {
        const inp = box.querySelector(`.fin-planned-row[data-fpi="${idx}"] input[data-fp="amt"]`);
        if (inp) { inp.focus(); inp.select(); }
      }
    };
  });
  box.querySelectorAll('input[data-fp="amt"]').forEach(inp => {
    inp.oninput = () => {
      const idx = parseInt(inp.closest(".fin-planned-row").dataset.fpi, 10);
      modalFinPlanned[idx].actualAmount = Math.max(0, parseFloat(inp.value) || 0);
      modalFinPlanned[idx].checked = true;
      modalFinManualTotal = false;
      const row = inp.closest(".fin-planned-row");
      const chk = row.querySelector('input[data-fp="chk"]');
      if (chk) chk.checked = true;
      row.classList.add("is-checked");
      recalcFinModalTotal(true);
    };
  });
}

function renderFinModalEntries() {
  const box = $("#finModalEntriesRows");
  if (!box) return;
  if (!modalFinEntries.length) {
    box.innerHTML = `<p class="muted small">Nenhum gasto manual extra lançado neste dia.</p>`;
    return;
  }
  const cats = ["Alimentação", "Combustível", "Pedágio", "Ingresso/Lazer", "Hospedagem", "Compras/Outro"];
  box.innerHTML = modalFinEntries.map((en, i) => `
    <div class="fin-entry-row" data-fi="${i}">
      <select data-fe="cat">${cats.map(c => `<option value="${c}"${en.cat === c ? " selected" : ""}>${c}</option>`).join("")}</select>
      <input type="text" data-fe="desc" value="${esc(en.desc || "")}" placeholder="Ex: Almoço / Posto">
      <input type="number" step="0.01" min="0" data-fe="amount" value="${en.amount ?? ""}" placeholder="R$ 0,00">
      <button type="button" class="icon-btn" data-frem="${i}" title="Remover">✕</button>
    </div>`).join("");

  box.querySelectorAll("[data-fe]").forEach(el => {
    el.oninput = () => {
      const idx = parseInt(el.closest(".fin-entry-row").dataset.fi, 10);
      modalFinEntries[idx][el.dataset.fe] = el.dataset.fe === "amount" ? (el.value === "" ? "" : parseFloat(el.value) || 0) : el.value;
      modalFinManualTotal = false;
      recalcFinModalTotal(true);
    };
  });
  box.querySelectorAll("[data-frem]").forEach(btn => {
    btn.onclick = () => {
      modalFinEntries.splice(parseInt(btn.dataset.frem, 10), 1);
      renderFinModalEntries();
      modalFinManualTotal = false;
      recalcFinModalTotal(true);
    };
  });
}

function openFinanceDayModal(iso) {
  if (isMultiTripMode()) {
    return toast("Em modo multi-viagens, selecione apenas 1 viagem no topo para lançar gastos diários.");
  }
  const s = sorted();
  const t = totals();
  const data = computeFinancialTimeline(s, t);
  const dayObj = data.daysList.find(d => d.iso === iso);
  if (!dayObj) return;

  activeFinanceDate = iso;
  $("#finModalTitle").textContent = `💰 ${WD[dayObj.date.getDay()]}, ${fmtBR(iso)}`;
  const targetVal = dayObj.hasActual ? dayObj.goalTarget : dayObj.adjustedTarget;
  $("#finModalSummary").innerHTML = `
    <div><b>Previsto original do dia:</b> ${money(dayObj.plannedBase)}</div>
    <div><b>Meta atual p/ este dia (c/ economia e redistribuição):</b> <span style="color:var(--accent2);font-weight:700">${money(targetVal)}</span></div>`;

  const rec = (state.finance && state.finance.dailyRecords && state.finance.dailyRecords[iso]) || {};
  const checkedMap = rec.checkedPlanned && typeof rec.checkedPlanned === "object" ? rec.checkedPlanned : {};
  modalFinPlanned = dayObj.items
    .filter(it => it.checkable)
    .map(it => {
      const st = checkedMap[it.key];
      const hasCustom = st && st.actualAmount !== null && st.actualAmount !== undefined && st.actualAmount !== "";
      return {
        key: it.key,
        icon: it.icon,
        label: it.label,
        plannedAmount: it.amount,
        checked: Boolean(st && st.checked),
        actualAmount: hasCustom ? Math.max(0, Number(st.actualAmount) || 0) : it.amount,
        isEditing: false
      };
    });

  modalFinEntries = Array.isArray(rec.entries) ? clone(rec.entries) : [];
  modalFinManualTotal = Boolean(rec.manualTotalOverride);
  renderFinModalPlanned();
  renderFinModalEntries();

  if (rec.manualTotalOverride && rec.spent != null && rec.spent !== "") {
    $("#finDayTotalInput").value = Number(rec.spent).toFixed(2);
    recalcFinModalTotal(false);
  } else {
    const res = recalcFinModalTotal(true);
    if (!res.hasAny && dayObj.hasActual) {
      $("#finDayTotalInput").value = dayObj.actualSpent.toFixed(2);
    }
  }
  $("#finDayNoteInput").value = rec.note || "";
  $("#btnFinClearDay").hidden = !dayObj.hasActual;
  $("#financeDayModal").showModal();
}

/* ---------- TABELA ---------- */
function renderTable(s, t) {
  const q = ($("#search").value || "").toLowerCase();
  const filtered = filterByTagSet(filterByTypeSet(s, tableFilterTypes), tableFilterTags);
  const rows = filtered.filter(a => !q || (label(a) + " " + (a.notes || "") + " " + (Array.isArray(a.tags) ? a.tags.join(" ") : "") + " " + (getActivityMeta(a)?.tripName || "")).toLowerCase().includes(q));
  const allTypes = Object.keys(window.ACTIVITY_TYPES);
  const multi = isMultiTripMode();

  const ed = (a, f, type = "text", cls = "") =>
    `<td class="ed ${cls}"><input data-id="${a.id}" data-f="${f}" type="${type}" ${type === "number" ? 'step="any"' : ""} value="${esc(f === "drive" || f === "stopTime" ? (a.type === "Viagem" || (isTransitOrShip(a.type) && f === "drive" && a.drive > 0) ? hm(a[f]) : "") : a[f] ?? "")}"></td>`;
  const nameCell = a => multi
    ? `<td class="ed wide"><div style="display:flex;align-items:center;gap:6px">${getTripBadgeHTML(a)}<input data-id="${a.id}" data-f="name" type="text" value="${esc(a.name ?? "")}"></div></td>`
    : ed(a, "name", "text", "wide");
  const typeSel = a =>
    `<td class="ed"><select data-id="${a.id}" data-f="type">${allTypes.map(o => `<option ${o === a.type ? "selected" : ""}>${o}</option>`).join("")}</select></td>`;

  let h = `<thead><tr>
    <th>#</th><th>Tipo</th><th>Início</th><th>Fim</th><th>Dia</th><th>Atividade</th>
    <th>Origem</th><th>Destino</th><th>Dias</th><th>Km</th><th>Direção</th><th>Paradas</th>
    <th>T. Paradas</th><th>Tempo Total</th><th>Recargas</th><th>Km EV</th><th>Km HEV</th>
    <th>Gas. (L)</th><th>Custo Gas.</th><th>Custo EV</th><th>Pedágio</th><th>Extras / Custo</th>
    <th>Total Item</th><th>Tanques</th><th>Observações</th><th>Ações</th>
  </tr></thead><tbody>`;

  rows.forEach((a, i) => {
    const c = calc(a);
    const v = a.type === "Viagem";
    const routeCols = isTravelType(a.type);
    const hasDist = v || isTransitOrShip(a.type);
    h += `<tr>
      <td>${i + 1}</td>
      ${typeSel(a)}
      ${ed(a, "start", "date")}
      ${ed(a, "end", "date")}
      <td>${WD[parseD(a.start).getDay()]}</td>
      ${nameCell(a)}
      ${routeCols ? ed(a, "from") + ed(a, "to") : "<td></td><td></td>"}
      <td class="num">${days(a)}</td>
      ${hasDist ? ed(a, "km", "number") + ed(a, "drive") : "<td></td><td></td>"}
      ${v ? ed(a, "stops", "number") + ed(a, "stopTime") : "<td></td><td></td>"}
      <td class="num">${v ? hm(c.time) : (hasDist && a.drive ? hm(a.drive) : "")}</td>
      ${v ? ed(a, "charges", "number") : "<td></td>"}
      <td class="num">${v ? num(c.ev) : ""}</td>
      <td class="num">${v ? num(c.hev) : ""}</td>
      <td class="num">${v ? num(c.liters, 1) : ""}</td>
      <td class="num">${v ? money(c.fuel) : ""}</td>
      <td class="num">${v ? money(c.charge) : ""}</td>
      ${v ? ed(a, "toll", "number") : "<td></td>"}
      ${ed(a, "extraCost", "number")}
      <td class="num"><b>${money(c.total + c.extra)}</b></td>
      <td class="num">${v ? num(c.tanks, 2) : ""}</td>
      ${ed(a, "notes", "text", "wide")}
      <td>
        ${v ? `<button class="icon-btn" data-gmaps="${a.id}" title="Calcular via Google Maps">🗺️</button>` : ""}
        <button class="icon-btn" data-edit="${a.id}" title="Editar">✏️</button>
        <button class="icon-btn" data-del="${a.id}" title="Excluir">🗑️</button>
      </td>
    </tr>`;
  });

  if (!rows.length) {
    h += `<tr><td colspan="26" style="text-align:center;padding:22px" class="muted">Nenhuma atividade corresponde aos filtros atuais. ${s.length ? `<button type="button" class="link-btn" id="btnTblResetFilter">Limpar filtros</button>` : ""}</td></tr>`;
  }

  h += `</tbody><tfoot><tr>
    <td colspan="9">TOTAL (${t.trips} viagens de carro)</td>
    <td class="num">${num(t.km)}</td>
    <td class="num">${hm(t.drive)}</td>
    <td class="num">${t.stops}</td>
    <td class="num">${hm(t.stopTime)}</td>
    <td class="num">${hm(t.drive + t.stopTime)}</td>
    <td></td>
    <td class="num">${num(t.ev)}</td>
    <td class="num">${num(t.hev)}</td>
    <td class="num">${num(t.liters, 1)}</td>
    <td class="num">${money(t.fuel)}</td>
    <td class="num">${money(t.charge)}</td>
    <td class="num">${money(t.toll)}</td>
    <td class="num">${money(t.activitiesExtra)}</td>
    <td class="num">${money(t.total + t.activitiesExtra)}</td>
    <td class="num">${num(t.tanks, 2)}</td>
    <td colspan="2">${t.liters ? `Média ${num(t.km / t.liters, 1)} km/L` : ""}</td>
  </tr></tfoot>`;

  const tb = $("#mainTable");
  tb.innerHTML = h;
  const tblRst = $("#btnTblResetFilter");
  if (tblRst) tblRst.onclick = resetTableTypeFilter;

  tb.querySelectorAll("[data-f]").forEach(el => {
    el.onchange = () => {
      const ctx = findActivityContext(el.dataset.id);
      if (!ctx?.activity) return;
      const a = ctx.activity;
      if (ctx.trip?.role === "viewer") {
        renderTable(sorted(), totals());
        return toast("👁️ Viagem compartilhada somente para visualização.");
      }
      const f = el.dataset.f;
      let val = el.value;
      if (f === "drive" || f === "stopTime") val = parseHM(val);
      else if (el.type === "number") val = val === "" ? 0 : parseFloat(val);
      a[f] = val;
      if (f === "extraCost") {
        a.tickets = val > 0 ? [{ label: "", qty: 1, unitPrice: val }] : [];
      }
      if (f === "start" && (!a.end || a.end < a.start)) a.end = a.start;
      if (f === "end" && a.end < a.start) a.start = a.end;
      if (f === "type" && val === "Viagem" && a.charges == null) a.charges = (ctx.data?.params?.defaultCharges ?? state.params.defaultCharges ?? 1);
      if (f === "drive" && a.type === "Viagem") {
        const auto = computeAutoStops(val);
        a.stops = auto.stops;
        a.stopTime = auto.stopTime;
      }
      saveTripRecord(ctx.trip, "✔️ Atualizado");
    };
  });

  tb.querySelectorAll("[data-edit]").forEach(b => { b.onclick = () => openModal(b.dataset.edit); });
  tb.querySelectorAll("[data-del]").forEach(b => { b.onclick = () => delActivity(b.dataset.del); });
  tb.querySelectorAll("[data-gmaps]").forEach(b => { b.onclick = () => recalcSingleTripById(b.dataset.gmaps); });

  const mc = $("#mobileTableCards");
  mc.innerHTML = rows.map(a => {
    const info = getTypeInfo(a.type);
    const c = calc(a);
    const v = a.type === "Viagem";
    const cardTags = Array.isArray(a.tags) && a.tags.length
      ? `<div class="m-card-tags">${a.tags.map(tg => `<span class="tag-mini">${esc(tg)}</span>`).join("")}</div>`
      : "";
    return `<div class="m-card" data-id="${a.id}">
      <div class="m-card-head">
        <strong>${info.icon} ${esc(label(a))} ${getTripBadgeHTML(a)}</strong>
        <span class="chip ${info.cls}">${esc(info.short)}</span>
      </div>
      ${cardTags}
      <div class="m-card-grid">
        <div><span class="muted">Data:</span> ${fmtBR(a.start)}${days(a) > 1 ? ` - ${fmtShortBR(a.end)}` : ""}</div>
        <div><span class="muted">Dias:</span> ${days(a)}</div>
        ${v ? `
          <div><span class="muted">Distância:</span> <b>${num(a.km)} km</b></div>
          <div><span class="muted">Tempo:</span> ${hmHuman(a.drive)} + ${hmHuman(a.stopTime)} (${a.stops}p)</div>
          <div><span class="muted">Pedágio:</span> ${money(a.toll)}</div>
          <div><span class="muted">Total:</span> <b>${money(c.total + c.extra)}</b></div>
        ` : `
          <div><span class="muted">Custo:</span> <b>${money(c.extra)}</b></div>
          <div><span class="muted">Notas:</span> ${esc(a.notes || "-")}</div>
        `}
      </div>
      <div class="inline-actions">
        <button type="button" class="btn ghost small" data-edit="${a.id}">✏️ Editar</button>
        ${v ? `<button type="button" class="btn ghost small" data-gmaps="${a.id}">🗺️ Google Maps</button>` : ""}
        <button type="button" class="btn danger-ghost small" data-del="${a.id}">🗑️</button>
      </div>
    </div>`;
  }).join("") || `<p class="muted">Nenhuma atividade encontrada.</p>`;
  mc.querySelectorAll("[data-edit]").forEach(b => { b.onclick = () => openModal(b.dataset.edit); });
  mc.querySelectorAll("[data-del]").forEach(b => { b.onclick = () => delActivity(b.dataset.del); });
  mc.querySelectorAll("[data-gmaps]").forEach(b => { b.onclick = () => recalcSingleTripById(b.dataset.gmaps); });
}

/* ---------- PARÂMETROS & CENÁRIOS ---------- */
const VEHICLE_PARAM_DEFS = [
  ["evRange", "Autonomia elétrica útil (por carga)", "km"],
  ["hevKmL", "Consumo médio rodoviário (HEV/Gas.)", "km/L"],
  ["bevKwhPer100", "Consumo elétrico (se 100% BEV)", "kWh/100km"],
  ["tank", "Capacidade do tanque", "litros"],
  ["battery", "Capacidade nominal da bateria", "kWh"],
  ["kwhPerCharge", "Energia útil por recarga (20–100%)", "kWh"]
];

const COST_PARAM_DEFS = [
  { group: "vehicle", key: "fuelPrice", label: "Preço médio da gasolina", unit: "R$ / litro", type: "number" },
  { group: "vehicle", key: "kwhPrice", label: "Tarifa média de energia elétrica", unit: "R$ / kWh", type: "number" },
  { group: "params", key: "tollPass", label: "Tag de pedágio (Google Maps)", unit: "passe", type: "select", options: [
    ["BR_SEM_PARAR", "Sem Parar"], ["BR_VELOE", "Veloe"], ["BR_CONECTCAR", "ConectCar"],
    ["BR_TAGGY", "Taggy"], ["BR_MOVE_MAIS", "Move Mais"], ["", "Dinheiro / Sem Tag"]
  ]},
  { group: "params", key: "travelers", label: "Número de viajantes", unit: "pessoas", type: "number" },
  { group: "params", key: "lodgingPerNight", label: "Hospedagem média por noite (férias)", unit: "R$ / noite", type: "number" },
  { group: "params", key: "lodgingNightsOverride", label: "Qtd. de noites (vazio = duração das férias)", unit: "noites (opcional)", type: "number", allowEmpty: true },
  { group: "params", key: "dailyFoodPerPerson", label: "Alimentação estimada por pessoa", unit: "R$ / dia", type: "number" },
  { group: "params", key: "otherFixedBudget", label: "Outros gastos fixos avulsos", unit: "R$ (extras)", type: "number" },
  { group: "params", key: "contingencyPct", label: "Margem para imprevistos", unit: "%", type: "number" }
];

const AUTO_PARAM_DEFS = [
  { key: "stopIntervalHours", label: "Intervalo padrão para paradas", unit: "horas (padrão 4h)", type: "number" },
  { key: "stopDurationMin", label: "Duração padrão de cada parada", unit: "min (padrão 60m = 1h)", type: "number" },
  { key: "defaultCharges", label: "Recargas EV padrão por viagem", unit: "qtd", type: "number" },
  { key: "calendarReminderTime", label: "Lembrete Google Agenda (dia anterior)", unit: "horário (09:00)", type: "time" },
  { key: "trafficAware", label: "Considerar trânsito ao vivo no Maps", unit: "TRAFFIC_AWARE", type: "checkbox" },
  { key: "avoidTolls", label: "Evitar pedágios quando possível", unit: "rota alternativa", type: "checkbox" },
  { key: "avoidHighways", label: "Evitar rodovias", unit: "rota local", type: "checkbox" },
  { key: "avoidFerries", label: "Evitar balsas", unit: "travessias", type: "checkbox" }
];

function renderParams() {
  const pmNote = $("#paramsMultiNote");
  if (pmNote) {
    if (isMultiTripMode()) {
      pmNote.hidden = false;
      pmNote.innerHTML = `🔎 <b>Modo multi-viagens ativo:</b> exibindo os parâmetros da viagem principal (<b>${esc(activeTrip?.name || state.title)}</b>). Selecione 1 viagem específica no topo para editar o veículo/orçamento de outra viagem.`;
    } else {
      pmNote.hidden = true;
      pmNote.innerHTML = "";
    }
  }
  const ptEl = $("#p-planTitle"), vnEl = $("#p-vehicleName"), pwEl = $("#p-powertrain");
  if (document.activeElement !== ptEl) ptEl.value = state.title || "";
  if (document.activeElement !== vnEl) vnEl.value = state.vehicle.name || "";
  if (document.activeElement !== pwEl) pwEl.value = state.vehicle.powertrain || "PHEV";

  $("#vehicleParamsList").innerHTML = VEHICLE_PARAM_DEFS.map(([k, l, u]) => `
    <label class="param-row">
      <span>${l}</span>
      <input type="number" step="any" min="0" data-vg="${k}" value="${state.vehicle[k] ?? 0}">
      <span class="u">${u}</span>
    </label>`).join("");

  $("#costParamsList").innerHTML = COST_PARAM_DEFS.map(d => {
    const val = state[d.group][d.key];
    if (d.type === "select") {
      return `<label class="param-row"><span>${d.label}</span>
        <select data-grp="${d.group}" data-k="${d.key}">
          ${d.options.map(([ov, ol]) => `<option value="${ov}" ${val === ov ? "selected" : ""}>${ol}</option>`).join("")}
        </select><span class="u">${d.unit}</span></label>`;
    }
    return `<label class="param-row"><span>${d.label}</span>
      <input type="number" step="any" min="0" data-grp="${d.group}" data-k="${d.key}" ${d.allowEmpty ? 'placeholder="Auto"' : ""} value="${val ?? (d.allowEmpty ? "" : 0)}">
      <span class="u">${d.unit}</span></label>`;
  }).join("");

  $("#automationParamsList").innerHTML = AUTO_PARAM_DEFS.map(d => {
    const val = state.params[d.key];
    if (d.type === "checkbox") {
      return `<label class="param-row"><span>${d.label}</span>
        <input type="checkbox" data-pk="${d.key}" ${val ? "checked" : ""}>
        <span class="u">${d.unit}</span></label>`;
    }
    if (d.type === "time") {
      return `<label class="param-row"><span>${d.label}</span>
        <input type="time" data-pk="${d.key}" value="${val || "09:00"}">
        <span class="u">${d.unit}</span></label>`;
    }
    return `<label class="param-row"><span>${d.label}</span>
      <input type="number" step="any" min="0" data-pk="${d.key}" value="${val ?? 0}">
      <span class="u">${d.unit}</span></label>`;
  }).join("");

  $("#vehicleParamsList").querySelectorAll("[data-vg]").forEach(i => {
    i.onchange = () => { state.vehicle[i.dataset.vg] = parseFloat(i.value) || 0; save("⚙️ Parâmetro atualizado"); };
  });
  $("#costParamsList").querySelectorAll("[data-grp]").forEach(i => {
    i.onchange = () => {
      const def = COST_PARAM_DEFS.find(x => x.key === i.dataset.k);
      if (i.tagName === "SELECT") state[i.dataset.grp][i.dataset.k] = i.value;
      else if (def?.allowEmpty && i.value === "") state[i.dataset.grp][i.dataset.k] = null;
      else state[i.dataset.grp][i.dataset.k] = parseFloat(i.value) || 0;
      save("⚙️ Orçamento atualizado");
    };
  });
  $("#automationParamsList").querySelectorAll("[data-pk]").forEach(i => {
    i.onchange = () => {
      state.params[i.dataset.pk] = i.type === "checkbox" ? i.checked : (i.type === "time" ? (i.value || "09:00") : (parseFloat(i.value) || 0));
      save("⚙️ Regra atualizada");
    };
  });

  const gBadge = $("#geminiStatusBadge");
  if (gBadge) {
    const caps = window.FeriasApi.getServerCaps ? window.FeriasApi.getServerCaps() : { hasGemini: false };
    if (caps.hasGemini) {
      const hint = window.FeriasApi.getUser()?.integrations?.geminiHint || "Servidor";
      gBadge.textContent = `Ativa (${hint})`;
      gBadge.className = "pill";
    } else {
      gBadge.textContent = "Não configurada";
      gBadge.className = "pill warn";
    }
  }

  const keyInput = $("#gmapsKeyInput");
  if (document.activeElement !== keyInput) keyInput.value = window.FeriasMaps.getKey();
  const badge = $("#gmapsKeyBadge");
  if (window.FeriasMaps.hasKey()) {
    badge.textContent = "Configurada";
    badge.className = "pill";
  } else {
    badge.textContent = "Não configurada";
    badge.className = "pill warn";
  }

  const remTime = state.params.calendarReminderTime || "09:00";
  if ($("#calBadge")) $("#calBadge").textContent = `Lembrete dia anterior ${remTime}`;
  const cidInput = $("#calClientIdInput");
  if (cidInput && document.activeElement !== cidInput) {
    cidInput.value = getEffectiveCalendarClientId();
  }

  renderParamTickets();
  renderScenarios();
}

function renderParamTickets() {
  const listEl = $("#paramTicketsList");
  const dateInp = $("#pt-start");
  if (dateInp && !dateInp.value) {
    dateInp.value = (sorted()[0] && sorted()[0].start) || fmtISO(new Date());
  }
  if (!listEl) return;
  const ticketItems = sorted().filter(a => a.extraCost > 0 || ["Ingresso", "Voo", "Trem", "Ônibus", "Navio", "Hospedagem", "Evento", "Passeio"].includes(a.type));
  if (!ticketItems.length) {
    listEl.innerHTML = `<p class="muted small">Nenhum ingresso, passagem ou reserva cadastrado ainda.</p>`;
    return;
  }
  listEl.innerHTML = ticketItems.map(a => {
    const info = getTypeInfo(a.type);
    const tktNote = formatTicketsNote(a);
    return `<div class="param-ticket-row">
      <div class="param-ticket-info">
        <span class="chip ${info.cls}">${info.icon} ${esc(info.short)}</span>
        <strong class="param-ticket-title">${esc(label(a))}</strong>
        <span class="muted small">${fmtBR(a.start)}${tktNote ? ` · ${esc(tktNote)}` : ""}</span>
      </div>
      <div class="inline-actions">
        <b>${money(a.extraCost || 0)}</b>
        <button type="button" class="icon-btn" data-ptedit="${a.id}" title="Editar">✏️</button>
        <button type="button" class="icon-btn" data-ptdel="${a.id}" title="Excluir">🗑️</button>
      </div>
    </div>`;
  }).join("");
  listEl.querySelectorAll("[data-ptedit]").forEach(b => b.onclick = () => openModal(b.dataset.ptedit));
  listEl.querySelectorAll("[data-ptdel]").forEach(b => b.onclick = () => delActivity(b.dataset.ptdel));
}

function applyVehicleSpecToState(spec, sourceLabel) {
  if (!spec || typeof spec !== "object") return;
  state.vehicle.name = spec.name || state.vehicle.name;
  const vn = $("#p-vehicleName");
  if (vn) {
    vn.value = state.vehicle.name;
    vn.blur();
  }
  if (["PHEV", "HEV", "COMBUSTION", "BEV"].includes(spec.powertrain)) state.vehicle.powertrain = spec.powertrain;
  for (const k of ["evRange", "hevKmL", "bevKwhPer100", "tank", "battery", "kwhPerCharge"]) {
    if (spec[k] != null && !Number.isNaN(Number(spec[k]))) {
      state.vehicle[k] = Number(spec[k]);
    }
  }
  const tag = $("#vehicleSourceTag");
  if (tag && sourceLabel) tag.textContent = sourceLabel;
  save(`🚗 ${state.vehicle.name}: especificações preenchidas (${sourceLabel || "auto"})`);
}

function renderScenarios() {
  const baseTotal = totals(state.vehicle.hevKmL).total;
  let h = "";
  state.scenarios.forEach(sc => {
    const kmL = sc.kmL || state.vehicle.hevKmL;
    const t = totals(kmL);
    const diff = t.total - baseTotal;
    const diffTxt = Math.abs(diff) < 0.05 ? "Base" : `${diff > 0 ? "+" : ""}${money(diff)}`;
    h += `<div class="scen">
      <div class="scen-top">
        <input class="scen-name" data-s="${sc.id}" data-k="name" value="${esc(sc.name)}" aria-label="Nome do cenário">
        <button type="button" class="icon-btn" data-sdel="${sc.id}" title="Excluir cenário">🗑️</button>
      </div>
      <div class="scen-metrics">
        <label class="scen-metric"><span>km/L</span><input data-s="${sc.id}" data-k="kmL" type="number" step="any" value="${sc.kmL ?? ""}" placeholder="${state.vehicle.hevKmL}"></label>
        <div class="scen-metric"><span>Litros</span><b>${num(t.liters, 1)} L</b></div>
        <div class="scen-metric"><span>Gasolina</span><b>${money(t.fuel)}</b></div>
        <div class="scen-metric"><span>Total viagens*</span><b class="tot">${money(t.total)}</b><small class="muted">${diffTxt}</small></div>
      </div>
    </div>`;
  });
  const box = $("#scenarios");
  box.innerHTML = h;
  box.querySelectorAll("[data-s]").forEach(i => {
    i.onchange = () => {
      const sc = state.scenarios.find(x => x.id === i.dataset.s);
      sc[i.dataset.k] = i.dataset.k === "kmL" ? (i.value ? parseFloat(i.value) : null) : i.value;
      save("📈 Cenário atualizado");
    };
  });
  box.querySelectorAll("[data-sdel]").forEach(b => {
    b.onclick = () => { state.scenarios = state.scenarios.filter(x => x.id !== b.dataset.sdel); save("Cenário removido"); };
  });
}

/* ---------- CHECKLIST (DRAG-AND-DROP PRIORIDADE + BOTÕES) ---------- */
function reorderChecklistItems(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const fromIdx = state.checklist.findIndex(x => x.id === fromId);
  const toIdx = state.checklist.findIndex(x => x.id === toId);
  if (fromIdx < 0 || toIdx < 0) return;
  const [moved] = state.checklist.splice(fromIdx, 1);
  state.checklist.splice(toIdx, 0, moved);
  save("↕️ Ordem de prioridade atualizada");
}

function moveChecklistStep(id, delta) {
  const idx = state.checklist.findIndex(x => x.id === id);
  const next = idx + delta;
  if (idx < 0 || next < 0 || next >= state.checklist.length) return;
  const [moved] = state.checklist.splice(idx, 1);
  state.checklist.splice(next, 0, moved);
  save("↕️ Ordem atualizada");
}

function renderChecklist() {
  const L = state.checklist;
  const done = L.filter(c => c.status === "Concluído").length;
  $("#checkProgress").textContent = `${done}/${L.length}`;
  $("#checkBar").style.width = `${L.length ? (done / L.length * 100) : 0}%`;

  const items = checklistFilter ? L.filter(c => c.status === checklistFilter) : L;
  const sel = (c, f, opts) => `<td class="ed"><select data-c="${c.id}" data-f="${f}">${opts.map(o => `<option ${o === c[f] ? "selected" : ""}>${o}</option>`).join("")}</select></td>`;
  const inp = (c, f, cls = "") => `<td class="ed ${cls}"><input data-c="${c.id}" data-f="${f}" value="${esc(c[f])}"></td>`;

  let h = `<thead><tr><th title="Arrastar">↕</th><th>✓</th><th>#</th><th>Categoria</th><th>Item</th><th>Prioridade</th><th>Status</th><th>Notas</th><th>Ações</th></tr></thead><tbody>`;
  items.forEach((c, i) => {
    h += `<tr class="chk-row ${c.status === "Concluído" ? "done" : ""}" draggable="true" data-dragid="${c.id}">
      <td style="width:28px"><span class="drag-handle" title="Arraste para reordenar prioridade">⋮⋮</span></td>
      <td><input type="checkbox" data-chk="${c.id}" ${c.status === "Concluído" ? "checked" : ""}></td>
      <td>${i + 1}</td>
      ${inp(c, "cat")}${inp(c, "item", "wide itm")}
      ${sel(c, "prio", ["Alta", "Média", "Baixa"])}
      ${sel(c, "status", ["Pendente", "Em andamento", "Concluído"])}
      ${inp(c, "notes", "wide")}
      <td>
        <button type="button" class="icon-btn" data-cmove="${c.id}:-1" title="Subir prioridade">▲</button>
        <button type="button" class="icon-btn" data-cmove="${c.id}:1" title="Descer prioridade">▼</button>
        <button type="button" class="icon-btn" data-cedit="${c.id}" title="Editar">✏️</button>
        <button type="button" class="icon-btn" data-cdel="${c.id}" title="Excluir">🗑️</button>
      </td>
    </tr>`;
  });
  const tb = $("#checkTable");
  tb.innerHTML = h + "</tbody>";

  let draggingId = null;
  const bindDnD = (container, selector) => {
    container.querySelectorAll(selector).forEach(row => {
      row.addEventListener("dragstart", ev => {
        draggingId = row.dataset.dragid;
        row.classList.add("dragging-row");
        if (ev.dataTransfer) {
          ev.dataTransfer.effectAllowed = "move";
          ev.dataTransfer.setData("text/plain", draggingId);
        }
      });
      row.addEventListener("dragover", ev => {
        ev.preventDefault();
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
        if (draggingId && draggingId !== row.dataset.dragid) row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", ev => {
        ev.preventDefault();
        row.classList.remove("drag-over");
        const from = draggingId || (ev.dataTransfer ? ev.dataTransfer.getData("text/plain") : "");
        const to = row.dataset.dragid;
        draggingId = null;
        if (from && to && from !== to) reorderChecklistItems(from, to);
      });
      row.addEventListener("dragend", () => {
        draggingId = null;
        container.querySelectorAll(selector).forEach(r => r.classList.remove("dragging-row", "drag-over"));
      });
    });
  };

  const bindEvents = root => {
    root.querySelectorAll("[data-f]").forEach(el => {
      el.onchange = () => { state.checklist.find(x => x.id === el.dataset.c)[el.dataset.f] = el.value; save(); };
    });
    root.querySelectorAll("[data-chk]").forEach(el => {
      el.onchange = () => {
        state.checklist.find(x => x.id === el.dataset.chk).status = el.checked ? "Concluído" : "Pendente";
        save(el.checked ? "✅ Item concluído!" : "");
      };
    });
    root.querySelectorAll("[data-cmove]").forEach(b => {
      b.onclick = () => {
        const [cid, d] = b.dataset.cmove.split(":");
        moveChecklistStep(cid, parseInt(d, 10));
      };
    });
    root.querySelectorAll("[data-cedit]").forEach(b => {
      b.onclick = () => openCheckModal(b.dataset.cedit);
    });
    root.querySelectorAll("[data-cdel]").forEach(b => {
      b.onclick = () => { state.checklist = state.checklist.filter(x => x.id !== b.dataset.cdel); save("Item removido"); };
    });
  };
  bindEvents(tb);
  bindDnD(tb, "tr.chk-row[data-dragid]");

  const mc = $("#mobileCheckCards");
  mc.innerHTML = items.map(c => `
    <div class="m-card" draggable="true" data-dragid="${c.id}">
      <div class="m-card-head">
        <label style="display:flex;align-items:center;gap:8px;font-weight:700">
          <span class="drag-handle" title="Arraste para reordenar">⋮⋮</span>
          <input type="checkbox" data-chk="${c.id}" ${c.status === "Concluído" ? "checked" : ""}>
          <span>${esc(c.item)}</span>
        </label>
        <div class="inline-actions">
          <button type="button" class="icon-btn" data-cmove="${c.id}:-1" title="Subir">▲</button>
          <button type="button" class="icon-btn" data-cmove="${c.id}:1" title="Descer">▼</button>
          <button type="button" class="icon-btn" data-cedit="${c.id}" title="Editar">✏️</button>
          <button type="button" class="icon-btn" data-cdel="${c.id}" title="Excluir">🗑️</button>
        </div>
      </div>
      <div class="m-card-grid">
        <div><span class="muted">Cat.:</span> ${esc(c.cat)}</div>
        <div><span class="muted">Prioridade:</span> ${esc(c.prio)} · ${esc(c.status)}</div>
      </div>
      ${c.notes ? `<div class="muted small">${esc(c.notes)}</div>` : ""}
    </div>`).join("") || `<p class="muted">Nenhum item nesta categoria.</p>`;
  bindEvents(mc);
  bindDnD(mc, ".m-card[data-dragid]");
}

let editingCheckId = null;
function openCheckModal(id) {
  const item = id ? state.checklist.find(x => x.id === id) : null;
  editingCheckId = item ? item.id : null;
  const dl = $("#checkCats");
  if (dl) {
    const cats = appMode === "professional"
      ? ["Escopo", "Financeiro", "Operacional", "Entrega", "Viagem Corp.", "Reunião", "Geral"]
      : ["Geral", "Recarga EV", "Veículo", "Pedágio", "Documentos", "Hospedagem", "Eventos", "Roteiro", "Bagagem"];
    dl.innerHTML = cats.map(c => `<option value="${esc(c)}">`).join("");
  }
  $("#checkModalTitle").textContent = item ? "Editar item do checklist" : "Novo item do checklist";
  $("#c-item").value = item ? item.item : "";
  $("#c-cat").value = item ? item.cat : (appMode === "professional" ? "Operacional" : "Geral");
  $("#c-prio").value = item ? item.prio : "Média";
  $("#c-status").value = item ? item.status : "Pendente";
  $("#c-notes").value = item ? (item.notes || "") : "";
  $("#btnCheckDelete").style.visibility = item ? "visible" : "hidden";
  $("#checkModal").showModal();
  setTimeout(() => $("#c-item").focus(), 40);
}

/* ---------- MODAL ATIVIDADE + MAPS + ANEXOS + AGENDA ---------- */
let editing = null;
let modalDraftId = "";
let modalAttachments = [];
let modalTickets = [];
let modalQrPayload = "";
let modalQrFormat = "";
let modalStartTime = "";
let stopsManualOverride = false;
let lastRouteKey = "";
let acFromCtrl = null;
let acToCtrl = null;
let acTFromCtrl = null;
let acTToCtrl = null;

function renderModalQrBadge() {
  const wrap = $("#f-qrBadgeWrap");
  const prev = $("#f-qrPreviewTxt");
  if (!wrap) return;
  const hasQr = Boolean(String(modalQrPayload || "").trim());
  wrap.hidden = !hasQr;
  if (prev) {
    const clean = String(modalQrPayload || "").trim();
    prev.textContent = hasQr ? `(${clean.slice(0, 32)}${clean.length > 32 ? "…" : ""})` : "";
  }
}

function initAutocompleteControllers() {
  if (!acFromCtrl) acFromCtrl = window.FeriasMaps.attachAutocomplete($("#f-from"), $("#ac-from"), () => maybeAutoComputeRoute(true));
  if (!acToCtrl) acToCtrl = window.FeriasMaps.attachAutocomplete($("#f-to"), $("#ac-to"), () => maybeAutoComputeRoute(true));
  if (!acTFromCtrl && $("#f-transitFrom")) acTFromCtrl = window.FeriasMaps.attachAutocomplete($("#f-transitFrom"), $("#ac-tfrom"), () => computeModalTransitRoute(false));
  if (!acTToCtrl && $("#f-transitTo")) acTToCtrl = window.FeriasMaps.attachAutocomplete($("#f-transitTo"), $("#ac-tto"), () => computeModalTransitRoute(false));
}

function getTicketBoxTitle(type) {
  if (type === "Viagem") return "💵 Gastos extras na viagem (opcional — ex: estacionamento, lanche, balsa)";
  if (type === "Voo") return "✈️ Passagens aéreas & Tarifas (Adulto / Criança / Bagagem)";
  if (type === "Trem") return "🚂 Passagens de Trem (Inteira / Meia / Classe)";
  if (type === "Ônibus") return "🚌 Passagens de Ônibus (Inteira / Meia / Leito)";
  if (type === "Navio") return "🚢 Passagens de Navio / Cruzeiro / Cabine";
  if (type === "Hospedagem") return "🏨 Diárias, Quartos & Taxas";
  return "🎟️ Quantidade & Valores (ex: Inteira, Meia, VIP...)";
}

function calcTicketsTotal(rows) {
  return rows.reduce((sum, r) => sum + Math.max(0, Number(r.qty) || 0) * Math.max(0, Number(r.unitPrice) || 0), 0);
}

function renderTicketRows() {
  const box = $("#ticketsRows");
  if (!box) return;
  if (!modalTickets.length) {
    modalTickets = [{ label: "", qty: 1, unitPrice: "" }];
  }
  box.innerHTML = modalTickets.map((t, idx) => {
    const sub = Math.max(0, Number(t.qty) || 0) * Math.max(0, Number(t.unitPrice) || 0);
    return `<div class="ticket-row" data-tidx="${idx}">
      <input type="text" data-tk="label" placeholder="Tipo (ex: Inteira, Meia, Adulto...)" value="${esc(t.label || "")}">
      <input type="number" min="1" step="1" data-tk="qty" placeholder="Qtd" title="Quantidade" value="${t.qty ?? 1}">
      <input type="number" min="0" step="any" data-tk="unitPrice" placeholder="Valor unit. R$" title="Valor por unidade" value="${t.unitPrice === "" || t.unitPrice == null ? "" : t.unitPrice}">
      <span class="ticket-sub">= ${money(sub)}</span>
      <button type="button" class="icon-btn" data-tdel="${idx}" title="Remover faixa" ${modalTickets.length === 1 && !t.unitPrice ? "style='opacity:0.35'" : ""}>🗑️</button>
    </div>`;
  }).join("");

  box.querySelectorAll(".ticket-row").forEach(rowEl => {
    const idx = parseInt(rowEl.dataset.tidx, 10);
    rowEl.querySelectorAll("[data-tk]").forEach(inp => {
      inp.addEventListener("input", () => {
        const k = inp.dataset.tk;
        modalTickets[idx][k] = k === "label" ? inp.value : (inp.value === "" ? "" : parseFloat(inp.value));
        const subEl = rowEl.querySelector(".ticket-sub");
        if (subEl) {
          const sub = Math.max(0, Number(modalTickets[idx].qty) || 0) * Math.max(0, Number(modalTickets[idx].unitPrice) || 0);
          subEl.textContent = `= ${money(sub)}`;
        }
        updateModalPreview();
      });
    });
  });

  box.querySelectorAll("[data-tdel]").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.tdel, 10);
      if (modalTickets.length <= 1) modalTickets = [{ label: "", qty: 1, unitPrice: "" }];
      else modalTickets.splice(idx, 1);
      renderTicketRows();
      updateModalPreview();
    };
  });
}

function renderModalAttachments() {
  const list = $("#modalAttachList");
  if (!modalAttachments.length) {
    list.innerHTML = `<div class="muted small">Nenhum documento anexado.</div>`;
    return;
  }
  list.innerHTML = modalAttachments.map((att, idx) => {
    const href = att.url ? att.url : window.FeriasApi.attachmentHref(att);
    const sizeTxt = att.size ? ` (${Math.max(1, Math.round(att.size / 1024))} KB)` : " (Link)";
    return `<div class="attach-item">
      <a href="${esc(href)}" target="_blank" rel="noopener">📄 ${esc(att.fileName || att.name || "Documento")}${sizeTxt}</a>
      <button type="button" class="icon-btn" data-attdel="${idx}" title="Remover anexo">🗑️</button>
    </div>`;
  }).join("");

  list.querySelectorAll("[data-attdel]").forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.attdel, 10);
      const att = modalAttachments[idx];
      if (att && att.id && !att.url) {
        await window.FeriasApi.deleteAttachment(att.id).catch(() => {});
      }
      modalAttachments.splice(idx, 1);
      renderModalAttachments();
      toast("Anexo removido.");
    };
  });
}

function updateModalPreview() {
  const a = readForm();
  const box = $("#modalTripCalcPreview");
  const tTitle = $("#ticketsBoxTitle");
  if (tTitle) tTitle.textContent = getTicketBoxTitle(a.type);
  const totQty = modalTickets.reduce((s, r) => s + ((Number(r.unitPrice) > 0 && Number(r.qty) > 0) ? Number(r.qty) : 0), 0);
  const badge = $("#ticketsTotalBadge");
  if (badge) badge.textContent = `Total: ${money(a.extraCost)}${totQty > 0 ? ` (${totQty} un.)` : ""}`;
  if ($("#calRemLabel")) $("#calRemLabel").textContent = state.params.calendarReminderTime || "09:00";
  if ($("#btnCalLink")) $("#btnCalLink").href = window.FeriasCalendar.buildGoogleCalendarTemplateUrl(a, state.title, "personal");

  if (a.type === "Trem" || a.type === "Ônibus") {
    const ext = $("#transitMapsStatus");
    if (ext && !window.FeriasMaps.hasKey() && !ext.textContent) {
      ext.innerHTML = `<span>ℹ️ Sem Maps Key: informe manualmente ou abra no Google Maps</span>
        <a href="${window.FeriasMaps.buildLegUrl(a.from, a.to, "transit")}" target="_blank" rel="noopener" style="color:var(--accent2)">Ver horários no Maps ↗</a>`;
    }
  } else if (a.type === "Navio") {
    const ext = $("#transitMapsStatus");
    if (ext) ext.innerHTML = `<span class="muted small">⚓ Informe portos, duração da travessia/cruzeiro, navio e cabine.</span>`;
  }

  if (a.type !== "Viagem") {
    box.innerHTML = "";
    return;
  }
  const c = calc(a);
  box.innerHTML = `
    <span><b>Tempo total:</b> ${hmHuman(c.time)} (${hmHuman(a.drive)} dir. + ${hmHuman(a.stopTime)} par.)</span>
    <span><b>EV / HEV:</b> ${num(c.ev)} / ${num(c.hev)} km (${num(c.liters, 1)} L)</span>
    <span><b>${c.isCarpool ? "Carona (rota R$ 0)" : "Rota"} + Extras:</b> ${money(c.total + c.extra)}</span>
  `;
  const ext = $("#modalMapsExternal");
  if (ext) ext.href = window.FeriasMaps.buildLegUrl(a.from, a.to, "driving");
}

function updateModalMapsUI() {
  const hasKey = window.FeriasMaps.hasKey();
  $("#modalKeyBox").hidden = hasKey;
  const interval = state.params.stopIntervalHours || 4;
  const durMin = state.params.stopDurationMin ?? 60;
  $("#autoStopTag").textContent = `1 / ${interval}h · ${hmHuman(durMin)}`;
  if (!hasKey && !$("#modalMapsStatus").textContent) {
    $("#modalMapsStatus").innerHTML = `<span>ℹ️ Sem chave Google Maps configurada (cole abaixo para cálculo automático)</span>
      <a href="${window.FeriasMaps.buildLegUrl($("#f-from").value, $("#f-to").value)}" target="_blank" rel="noopener" style="color:var(--accent2)">Abrir no Maps ↗</a>`;
  }
}

function applyAutoStopsToForm(force = false) {
  const driveMin = parseHM($("#f-drive").value);
  if (!force && stopsManualOverride) return;
  const { stops, stopTime } = computeAutoStops(driveMin);
  $("#f-stops").value = stops;
  $("#f-stopTime").value = hm(stopTime);
  updateModalPreview();
}

async function computeModalRoute(force = false) {
  const from = $("#f-from").value.trim();
  const to = $("#f-to").value.trim();
  if (!from || !to) { if (force) toast("Preencha Origem e Destino."); return; }

  const ext = $("#modalMapsExternal");
  if (ext) ext.href = window.FeriasMaps.buildLegUrl(from, to);

  if (!window.FeriasMaps.hasKey()) {
    updateModalMapsUI();
    if (force) toast("Configure sua Google Maps API Key abaixo.");
    return;
  }

  const routeKey = `${from}=>${to}`;
  if (!force && routeKey === lastRouteKey) return;

  const statusEl = $("#modalMapsStatus");
  const btn = $("#btnCalcMaps");
  statusEl.innerHTML = `<span>⏳ Calculando distância, tempo e pedágios no Google Maps...</span>`;
  btn.disabled = true;

  try {
    const originArg = (acFromCtrl && acFromCtrl.getSelectedPlace()) || from;
    const destArg = (acToCtrl && acToCtrl.getSelectedPlace()) || to;
    const res = await window.FeriasMaps.computeTripRoute({
      origin: originArg,
      destination: destArg,
      params: state.params,
      vehicle: state.vehicle
    });

    lastRouteKey = routeKey;
    $("#f-km").value = res.km;
    $("#f-drive").value = hm(res.driveMinutes);
    stopsManualOverride = false;
    applyAutoStopsToForm(true);

    if (res.toll.tollKnown) {
      $("#f-toll").value = res.toll.tollCost;
      $("#tollSourceTag").textContent = res.toll.hasTolls ? "✓ Auto Google Maps" : "✓ Sem pedágio";
    } else {
      $("#tollSourceTag").textContent = "⚠️ Tarifa não informada";
    }
    if (!$("#f-charges").value) $("#f-charges").value = state.params.defaultCharges ?? 1;
    if (!$("#f-name").value.trim()) $("#f-name").value = `Viagem ${to.split(",")[0].trim()}`;

    statusEl.innerHTML = `
      <span>✅ <b>Google Maps:</b> ${res.description ? `via ${esc(res.description)} · ` : ""}${num(res.km)} km · ${hmHuman(res.driveMinutes)}${res.toll.tollKnown ? ` · Pedágio ${money(res.toll.tollCost)}` : " · Rota c/ pedágio"}</span>
      <a href="${window.FeriasMaps.buildLegUrl(from, to)}" target="_blank" rel="noopener" style="color:var(--accent2)">Ver no Maps ↗</a>
    `;

    const mapWrap = $("#modalMapWrap");
    mapWrap.hidden = false;
    await window.FeriasMaps.renderRouteOnMap(mapWrap, res.route, isDarkTheme());
    updateModalPreview();
    toast("🗺️ Rota, paradas e pedágio atualizados!");
  } catch (err) {
    statusEl.innerHTML = `<span>❌ Erro Google Maps: ${esc(err.message || err)}</span>
      <a href="${window.FeriasMaps.buildLegUrl(from, to)}" target="_blank" rel="noopener" style="color:var(--accent2)">Abrir no Maps ↗</a>`;
    if (force) toast("Erro ao calcular rota no Google Maps.");
  } finally {
    btn.disabled = false;
  }
}

function maybeAutoComputeRoute(force = false) {
  if ($("#f-type").value !== "Viagem") return;
  if ($("#f-from").value.trim() && $("#f-to").value.trim()) computeModalRoute(force);
}

async function computeModalTransitRoute(force = false) {
  const t = $("#f-type").value;
  if (t !== "Trem" && t !== "Ônibus") return;
  const from = $("#f-transitFrom").value.trim();
  const to = $("#f-transitTo").value.trim();
  const statusEl = $("#transitMapsStatus");
  if (!from || !to) { if (force) toast("Preencha Origem e Destino."); return; }

  if (!window.FeriasMaps.hasKey()) {
    statusEl.innerHTML = `<span>ℹ️ Sem Google Maps Key configurada</span>
      <a href="${window.FeriasMaps.buildLegUrl(from, to, "transit")}" target="_blank" rel="noopener" style="color:var(--accent2)">Ver horários no Maps ↗</a>`;
    if (force) toast("Configure sua Google Maps Key em Parâmetros.");
    return;
  }

  const info = getTypeInfo(t);
  const btn = $("#btnCalcTransit");
  statusEl.innerHTML = `<span>⏳ Consultando trajeto de ${esc(info.short)} no Google Maps...</span>`;
  btn.disabled = true;
  try {
    const originArg = (acTFromCtrl && acTFromCtrl.getSelectedPlace()) || from;
    const destArg = (acTToCtrl && acTToCtrl.getSelectedPlace()) || to;
    const res = await window.FeriasMaps.computeTripRoute({
      origin: originArg,
      destination: destArg,
      travelMode: "TRANSIT",
      transitPreference: info.transitMode || null
    });
    $("#f-transitKm").value = res.km;
    $("#f-transitDrive").value = hm(res.driveMinutes);
    if (!$("#f-name").value.trim()) $("#f-name").value = `${info.short} ${to.split(",")[0].trim()}`;
    const note = res.travelModeUsed === "DRIVING_ESTIMATE" ? " (estimativa rodoviária)" : ` (${res.description || "Google Transit"})`;
    statusEl.innerHTML = `<span>✅ <b>Google Maps:</b> ${num(res.km)} km · ${hmHuman(res.driveMinutes)}${esc(note)}</span>
      <a href="${window.FeriasMaps.buildLegUrl(from, to, "transit")}" target="_blank" rel="noopener" style="color:var(--accent2)">Ver no Maps ↗</a>`;
    const mapWrap = $("#transitMapWrap");
    mapWrap.hidden = false;
    await window.FeriasMaps.renderRouteOnMap(mapWrap, res.route, isDarkTheme());
    updateModalPreview();
  } catch (err) {
    statusEl.innerHTML = `<span>❌ ${esc(err.message || err)}</span>
      <a href="${window.FeriasMaps.buildLegUrl(from, to, "transit")}" target="_blank" rel="noopener" style="color:var(--accent2)">Abrir no Maps ↗</a>`;
  } finally {
    btn.disabled = false;
  }
}

window.openModal = function (idOrOpts) {
  initAutocompleteControllers();
  const isObj = idOrOpts && typeof idOrOpts === "object";
  const id = isObj ? null : (idOrOpts || null);
  const preset = isObj ? idOrOpts : {};
  const ctx = id ? findActivityContext(id) : null;
  const baseDate = preset.start || (sorted()[0]?.start) || fmtISO(new Date());
  const a = ctx?.activity || {
    type: preset.type || "Viagem",
    start: baseDate,
    end: preset.end || baseDate,
    charges: state.params.defaultCharges ?? 1,
    extraCost: preset.extraCost || 0,
    includeRouteCost: true,
    tickets: [],
    attachments: []
  };

  const trips = getSelectedTrips();
  const editableTrips = trips.filter(t => t.role !== "viewer");
  editingTripRef = ctx?.trip || editableTrips[0] || activeTrip;

  const tgtModeSel = $("#f-targetMode");
  const tgtWrap = $("#f-targetTripWrap");
  const tgtSel = $("#f-targetTrip");
  if (tgtModeSel) {
    tgtModeSel.value = "personal";
    tgtModeSel.onchange = () => {
      const m = tgtModeSel.value === "professional" ? "professional" : "personal";
      const prefId = m === "personal" ? (editingTripRef?.id || activeTrip?.id || "") : "";
      populateEventSelect(tgtSel, m, prefId);
    };
  }
  if (tgtWrap && tgtSel) {
    populateEventSelect(tgtSel, "personal", editingTripRef?.id || activeTrip?.id || "");
    tgtWrap.hidden = false;
  }

  editing = id || null;
  modalDraftId = id || uid();
  modalAttachments = clone(a.attachments || []);
  modalDraftTags = dedupeTagList(a.tags || []);
  modalQrPayload = a.qrPayload || "";
  modalQrFormat = a.qrFormat || "";
  modalStartTime = a.startTime || "";
  if (Array.isArray(a.tickets) && a.tickets.length) {
    modalTickets = clone(a.tickets);
  } else if (a.extraCost > 0) {
    modalTickets = [{ label: "", qty: 1, unitPrice: a.extraCost }];
  } else {
    modalTickets = [{ label: "", qty: 1, unitPrice: "" }];
  }

  stopsManualOverride = false;
  lastRouteKey = a.from && a.to ? `${a.from.trim()}=>${a.to.trim()}` : "";
  acFromCtrl.clearSelected();
  acToCtrl.clearSelected();
  if (acTFromCtrl) acTFromCtrl.clearSelected();
  if (acTToCtrl) acTToCtrl.clearSelected();

  $("#modalTitle").textContent = id ? "Editar atividade" : "Nova atividade";
  const f = $("#form");
  for (const k of ["type", "name", "start", "end", "from", "to", "km", "stops", "toll", "charges", "notes"]) {
    if (f.elements[k]) f.elements[k].value = a[k] ?? "";
  }
  $("#f-includeRouteCost").checked = a.includeRouteCost !== false;
  $("#f-flightFrom").value = a.type === "Voo" ? (a.from || "") : "";
  $("#f-flightTo").value = a.type === "Voo" ? (a.to || "") : "";
  $("#f-airline").value = a.airline || "";
  $("#f-bookingRef").value = a.bookingRef || "";
  const trShip = isTransitOrShip(a.type);
  $("#f-transitFrom").value = trShip ? (a.from || "") : "";
  $("#f-transitTo").value = trShip ? (a.to || "") : "";
  $("#f-transitKm").value = trShip ? (a.km ?? "") : "";
  $("#f-transitDrive").value = trShip && a.drive ? hm(a.drive) : "";
  $("#f-transitCarrier").value = trShip ? (a.airline || "") : "";
  $("#f-transitRef").value = trShip ? (a.bookingRef || "") : "";
  $("#f-ticketRef").value = a.bookingRef || "";
  if ($("#f-diffArrival")) {
    $("#f-diffArrival").checked = Boolean(isTravelType(a.type) && a.start && a.end && a.end !== a.start);
  }
  f.elements.drive.value = a.drive && a.type === "Viagem" ? hm(a.drive) : "";
  f.elements.stopTime.value = a.stopTime != null && a.type === "Viagem" && id ? hm(a.stopTime) : "";

  $("#tollSourceTag").textContent = "";
  $("#modalMapsStatus").innerHTML = "";
  $("#transitMapsStatus").innerHTML = "";
  $("#modalMapWrap").hidden = true;
  $("#modalMapWrap").innerHTML = "";
  $("#transitMapWrap").hidden = true;
  $("#transitMapWrap").innerHTML = "";
  $("#btnDelete").style.visibility = id ? "visible" : "hidden";
  if ($("#btnDuplicate")) $("#btnDuplicate").hidden = !id;
  if ($("#btnHeadCal")) $("#btnHeadCal").hidden = !id;
  if ($("#btnHeadWallet")) $("#btnHeadWallet").hidden = !id;
  stopActAiRecording(true);
  setActAiBusy(false, "");
  if ($("#actAiTextRow")) $("#actAiTextRow").hidden = true;
  if ($("#actAiTextInput")) $("#actAiTextInput").value = "";

  renderModalQrBadge();
  renderTicketRows();
  refreshTagSelectors([], modalDraftTags);
  toggleTrip();
  updateModalMapsUI();
  renderModalAttachments();
  updateModalPreview();
  prefetchModalWalletPass();
  $("#modal").showModal();
};

function syncTravelArrivalUI() {
  const t = $("#f-type")?.value || "Viagem";
  const travel = isTravelType(t);
  const startInp = $("#f-start");
  const endInp = $("#f-end");
  const lblStart = $("#lbl-start");
  const lblEnd = $("#lbl-end");
  const diffWrap = $("#f-diffArrivalWrap");
  const diffChk = $("#f-diffArrival");
  const box = endInp ? endInp.closest(".arrival-date-box") : null;

  if (lblStart) lblStart.textContent = travel ? "Data da saída" : "Início";
  if (lblEnd) lblEnd.textContent = travel ? "Data da chegada" : "Fim";
  if (diffWrap) diffWrap.hidden = !travel;
  if (!endInp || !startInp) return;

  if (!travel) {
    endInp.disabled = false;
    endInp.min = "";
    endInp.classList.remove("input-muted");
    if (box) box.classList.remove("is-muted");
    return;
  }

  const allowDiff = Boolean(diffChk && diffChk.checked);
  if (!allowDiff) {
    endInp.value = startInp.value || endInp.value;
    endInp.disabled = true;
    endInp.min = "";
    endInp.classList.add("input-muted");
    if (box) box.classList.add("is-muted");
  } else {
    endInp.disabled = false;
    endInp.classList.remove("input-muted");
    if (box) box.classList.remove("is-muted");
    if (startInp.value) {
      endInp.min = startInp.value;
      if (!endInp.value || endInp.value < startInp.value) endInp.value = startInp.value;
    }
  }
}

function toggleTrip() {
  const t = $("#f-type").value;
  const isTransit = isTransitOrShip(t);
  const isShip = t === "Navio";
  $(".trip-only").hidden = t !== "Viagem";
  $(".trip-only").style.display = t === "Viagem" ? "" : "none";
  $(".flight-only").hidden = t !== "Voo";
  $(".transit-only").hidden = !isTransit;
  $(".transit-only").style.display = isTransit ? "" : "none";
  if (isTransit) {
    if ($("#transitBoxTitle")) {
      $("#transitBoxTitle").textContent = isShip
        ? "🚢 Dados da Viagem de Navio / Cruzeiro"
        : (t === "Trem" ? "🚂 Rota de Trem (Google Maps)" : "🚌 Rota de Ônibus (Google Maps)");
    }
    if ($("#lbl-transitFrom")) $("#lbl-transitFrom").textContent = isShip ? "Porto / Cidade Origem" : "Estação / Terminal / Cidade Origem";
    if ($("#lbl-transitTo")) $("#lbl-transitTo").textContent = isShip ? "Porto / Cidade Destino" : "Estação / Terminal / Cidade Destino";
    if ($("#f-transitFrom")) $("#f-transitFrom").placeholder = isShip ? "Ex: Porto de Santos" : "Origem";
    if ($("#f-transitTo")) $("#f-transitTo").placeholder = isShip ? "Ex: Búzios / Ilhabela" : "Destino";
    if ($("#lbl-transitCarrier")) $("#lbl-transitCarrier").textContent = isShip ? "Navio / Companhia" : "Empresa / Linha / Assento";
    if ($("#f-transitCarrier")) $("#f-transitCarrier").placeholder = isShip ? "Ex: MSC Grandiosa, Costa..." : "Ex: Viação Cometa, Eurostar...";
    if ($("#lbl-transitRef")) $("#lbl-transitRef").textContent = isShip ? "Cabine / Localizador" : "Localizador / Bilhete";
    if ($("#f-transitRef")) $("#f-transitRef").placeholder = isShip ? "Ex: Cabine 9124 / RES123" : "Código reserva";
    if ($("#btnCalcTransit")) $("#btnCalcTransit").hidden = isShip;
    if (isShip && $("#transitMapWrap")) $("#transitMapWrap").hidden = true;
  }
  $("#f-ticketRefWrap").hidden = (t === "Viagem" || t === "Voo" || isTransit);
  syncTravelArrivalUI();
  updateModalPreview();
}

function readForm() {
  const e = $("#form").elements;
  const n = k => !e[k] || e[k].value === "" ? null : parseFloat(e[k].value);
  const cleanTickets = modalTickets
    .map(r => ({ label: String(r.label || "").trim(), qty: Math.max(0, Number(r.qty) || 0), unitPrice: Math.max(0, Number(r.unitPrice) || 0) }))
    .filter(r => r.qty > 0 && r.unitPrice > 0);
  const computedCost = Math.round(calcTicketsTotal(cleanTickets) * 100) / 100;

  const tVal = e.type.value;
  const startVal = e.start.value;
  const diffChecked = Boolean($("#f-diffArrival")?.checked);
  const endVal = (isTravelType(tVal) && !diffChecked) ? startVal : (e.end.value || startVal);
  const formTags = modalTagsMsel ? dedupeTagList(modalTagsMsel.getSelected()) : dedupeTagList(modalDraftTags);

  const a = {
    type: tVal,
    name: e.name.value.trim(),
    start: startVal,
    end: endVal,
    tickets: cleanTickets,
    extraCost: computedCost,
    notes: e.notes.value,
    attachments: clone(modalAttachments)
  };
  if (formTags.length) a.tags = formTags;
  if (a.end < a.start) a.end = a.start;
  if (modalStartTime) a.startTime = modalStartTime;
  if (modalQrPayload) {
    a.qrPayload = modalQrPayload;
    a.qrFormat = modalQrFormat || "qr_code";
  }
  if (a.type === "Viagem") {
    Object.assign(a, {
      from: e.from.value.trim(),
      to: e.to.value.trim(),
      km: n("km"),
      drive: parseHM(e.drive.value),
      stops: n("stops") || 0,
      stopTime: parseHM(e.stopTime.value),
      toll: n("toll") || 0,
      charges: n("charges") ?? (state.params.defaultCharges ?? 1),
      includeRouteCost: $("#f-includeRouteCost").checked
    });
  } else if (a.type === "Voo") {
    a.from = $("#f-flightFrom").value.trim();
    a.to = $("#f-flightTo").value.trim();
    a.airline = $("#f-airline").value.trim();
    a.bookingRef = $("#f-bookingRef").value.trim();
  } else if (isTransitOrShip(a.type)) {
    a.from = $("#f-transitFrom").value.trim();
    a.to = $("#f-transitTo").value.trim();
    a.km = $("#f-transitKm").value === "" ? null : parseFloat($("#f-transitKm").value);
    a.drive = parseHM($("#f-transitDrive").value);
    a.airline = $("#f-transitCarrier").value.trim();
    a.bookingRef = $("#f-transitRef").value.trim();
  } else {
    const tr = $("#f-ticketRef").value.trim();
    if (tr) a.bookingRef = tr;
  }
  return a;
}

function delActivity(id) {
  const ctx = findActivityContext(id);
  const a = ctx?.activity;
  if (!a || !confirm(`Excluir "${label(a)}"?`)) return;
  if (ctx.trip?.role === "viewer") return toast("👁️ Viagem compartilhada somente para visualização.");
  const tgtData = ctx.data || state;
  tgtData.activities = tgtData.activities.filter(x => x.id !== id);
  saveTripRecord(ctx.trip, "🗑️ Excluído");
}

async function recalcSingleTripById(id) {
  const ctx = findActivityContext(id);
  const a = ctx?.activity;
  if (!a || a.type !== "Viagem") return;
  if (!a.from || !a.to) return toast("Defina Origem e Destino primeiro.");
  if (!window.FeriasMaps.hasKey()) { toast("Configure sua Google Maps API Key em Parâmetros."); return openModal(id); }
  toast(`🗺️ Calculando ${a.from} ➔ ${a.to}...`);
  try {
    const tripData = ctx.data || state;
    const res = await window.FeriasMaps.computeTripRoute({ origin: a.from, destination: a.to, params: tripData.params, vehicle: tripData.vehicle });
    a.km = res.km;
    a.drive = res.driveMinutes;
    const auto = computeAutoStops(res.driveMinutes);
    a.stops = auto.stops;
    a.stopTime = auto.stopTime;
    if (res.toll.tollKnown) a.toll = res.toll.tollCost;
    saveTripRecord(ctx.trip, "✅ Distância, tempo e pedágios recalculados!");
  } catch (err) {
    toast("❌ " + (err.message || err));
  }
}

async function recalcAllTripsWithMaps() {
  if (!window.FeriasMaps.hasKey()) return toast("Cole e salve sua Google Maps API Key primeiro.");
  const trips = state.activities.filter(a => a.type === "Viagem" && a.from && a.to);
  if (!trips.length) return toast("Nenhuma viagem com Origem e Destino.");
  const btn = $("#btnRecalcAllRoutes");
  btn.disabled = true;
  let ok = 0;
  for (const a of trips) {
    try {
      const res = await window.FeriasMaps.computeTripRoute({ origin: a.from, destination: a.to, params: state.params, vehicle: state.vehicle });
      a.km = res.km;
      a.drive = res.driveMinutes;
      const auto = computeAutoStops(res.driveMinutes);
      a.stops = auto.stops;
      a.stopTime = auto.stopTime;
      if (res.toll.tollKnown) a.toll = res.toll.tollCost;
      ok++;
    } catch {}
  }
  btn.disabled = false;
  save(`🗺️ ${ok}/${trips.length} viagens atualizadas pelo Google Maps!`);
}

/* ---------- MULTI-PLANEJAMENTOS, MODOS, COMPARTILHAMENTO & CONVITES ---------- */
function renderTripDropdown() {
  const wrap = $("#tripSelectWrap");
  if (!wrap) return;
  const isPro = appMode === "professional";
  const own = (tripsCache.ownTrips || []).filter(t => getTripMode(t) === appMode);
  const shared = (tripsCache.sharedTrips || []).filter(t => getTripMode(t) === appMode);
  const items = [
    ...own.map(t => ({ id: t.id, label: t.name, group: isPro ? "Meus Projetos" : "Minhas Férias" })),
    ...shared.map(t => ({ id: t.id, label: `👥 ${t.name} (${t.ownerName})`, group: isPro ? "Compartilhados comigo" : "Compartilhadas comigo" }))
  ];
  if (!tripMultiMsel) {
    tripMultiMsel = createMultiSelect(wrap, {
      minSelected: 1,
      minError: "Mantenha ao menos 1 planejamento selecionado.",
      closeOnOnly: true,
      getLabel(sel, all) {
        if (!sel.length) return appMode === "professional" ? "Selecionar projeto" : "Selecionar férias";
        if (sel.length === 1) return sel[0].label;
        const unit = appMode === "professional" ? "projetos" : "viagens";
        if (all.length > 1 && sel.length >= all.length) return `Todos (${sel.length} ${unit})`;
        return `${sel.length} ${unit}`;
      },
      isHighlighted: sel => sel.length > 1,
      onChange(ids) {
        openTripsByIds(ids);
      }
    });
  }
  const activeIds = selectedTripIds.length ? selectedTripIds : (activeTrip ? [activeTrip.id] : []);
  tripMultiMsel.setOptions(items, activeIds);
  updateCrossingsMenuVisibility();
}

function updateCrossingsMenuVisibility() {
  const btn = $("#btnMenuCrossings");
  if (!btn) return;
  if (appMode === "professional") {
    btn.hidden = true;
    return;
  }
  const hasShared = Boolean(
    window.FeriasApi?.isServer() && (
      tripsCache?.hasSharedTrips ||
      (tripsCache?.sharedTrips && tripsCache.sharedTrips.length > 0) ||
      (tripsCache?.ownTrips || []).some(t => getTripMode(t) === "personal" && (t.sharedCount || 0) > 0)
    )
  );
  btn.hidden = !hasShared;
}

function colorForCityStable(cityName) {
  const k = normCityKey(cityName);
  let h = 0;
  for (let i = 0; i < k.length; i++) h = ((h * 31) + k.charCodeAt(i)) >>> 0;
  return CITY_PALETTE[h % CITY_PALETTE.length];
}

function analyzeTripsCrossings(trips, opts = {}) {
  if (!Array.isArray(trips) || trips.length < 2) {
    return { crossings: [], analyzed: [], allDates: [] };
  }
  const allStarts = [], allEnds = [];
  trips.forEach(tr => {
    (tr.data?.activities || []).forEach(a => {
      if (a.start) {
        allStarts.push(a.start);
        allEnds.push(a.end || a.start);
      }
    });
  });
  if (!allStarts.length) return { crossings: [], analyzed: [], allDates: [] };
  allStarts.sort();
  allEnds.sort();
  const minDt = parseD(allStarts[0]);
  const maxDt = parseD(allEnds[allEnds.length - 1]);
  const allDates = [];
  for (let d = new Date(minDt); d <= maxDt; d.setDate(d.getDate() + 1)) {
    allDates.push(fmtISO(d));
  }

  const analyzed = trips.map(tr => {
    const acts = Array.isArray(tr.data?.activities) ? tr.data.activities : [];
    const track = computeDailyCityTimeline(acts, allDates);
    const cityByDay = {};
    track.dayCities.forEach(dc => { if (dc.key) cityByDay[dc.iso] = dc; });
    const minT = acts.map(a => a.start).filter(Boolean).sort()[0] || "";
    const maxT = acts.map(a => a.end || a.start).filter(Boolean).sort().pop() || minT;
    return {
      trip: tr,
      minStart: minT,
      maxEnd: maxT,
      cityByDay,
      spans: track.spans.filter(sp => sp.startIso >= minT && sp.endIso <= maxT),
      acts
    };
  });

  const crossings = [];
  for (let i = 0; i < analyzed.length; i++) {
    for (let j = i + 1; j < analyzed.length; j++) {
      const A = analyzed[i], B = analyzed[j];
      if (opts.requireDifferentOwners) {
        if (A.trip.ownerId && B.trip.ownerId && A.trip.ownerId === B.trip.ownerId) continue;
        if (A.trip.ownerEmail && B.trip.ownerEmail && A.trip.ownerEmail === B.trip.ownerEmail) continue;
      } else if (opts.requireSharedInvolvement) {
        if (!A.trip.isShared && !B.trip.isShared && A.trip.role === "owner" && B.trip.role === "owner") continue;
      }

      let cur = null;
      allDates.forEach(iso => {
        if (A.minStart && (iso < A.minStart || iso > A.maxEnd)) { cur = null; return; }
        if (B.minStart && (iso < B.minStart || iso > B.maxEnd)) { cur = null; return; }
        const cA = A.cityByDay[iso];
        const cB = B.cityByDay[iso];
        if (cA && cB && cA.key === cB.key) {
          if (cur && cur.key === cA.key) {
            cur.endIso = iso;
            cur.dates.push(iso);
          } else {
            cur = { key: cA.key, city: cA.city, startIso: iso, endIso: iso, dates: [iso], A, B };
            crossings.push(cur);
          }
        } else {
          cur = null;
        }
      });
    }
  }
  return { crossings, analyzed, allDates };
}

function buildOverlapVisualPairHTML(pairA, pairB, pairCrossings, dark) {
  const minS = [pairA.minStart, pairB.minStart].filter(Boolean).sort()[0];
  const maxE = [pairA.maxEnd, pairB.maxEnd].filter(Boolean).sort().pop();
  if (!minS || !maxE) return "";
  const dates = [];
  for (let d = parseD(minS); d <= parseD(maxE); d.setDate(d.getDate() + 1)) dates.push(fmtISO(d));
  const totalDays = Math.max(1, dates.length);
  const matchSet = new Set();
  pairCrossings.forEach(cr => cr.dates.forEach(iso => matchSet.add(iso)));

  const renderRow = item => {
    const segs = [];
    dates.forEach(iso => {
      const active = item.minStart && iso >= item.minStart && iso <= item.maxEnd;
      const dc = active ? item.cityByDay[iso] : null;
      const isMatch = Boolean(dc && matchSet.has(iso));
      const key = dc ? `${dc.key}:${isMatch ? 1 : 0}` : "empty";
      const last = segs[segs.length - 1];
      if (last && last.key === key) last.days++;
      else segs.push({ key, city: dc?.city || "", isMatch, days: 1 });
    });
    const who = item.trip.role === "owner" && !item.trip.isAdminGlobal
      ? `Você · ${item.trip.name}`
      : `${item.trip.ownerName || "Viajante"} · ${item.trip.name}`;
    return `<div class="overlap-track-row">
      <div class="overlap-who" title="${esc(who)}">${esc(who)}</div>
      <div class="overlap-bar-grid">
        ${segs.map(sg => {
          const wPct = (sg.days / totalDays) * 100;
          if (!sg.city) {
            return `<div class="overlap-seg" style="width:${wPct.toFixed(2)}%;opacity:0.25"></div>`;
          }
          const col = colorForCityStable(sg.city);
          const bg = dark ? col.darkBg : col.lightBg;
          const txt = dark ? col.darkTxt : col.lightTxt;
          return `<div class="overlap-seg ${sg.isMatch ? "match" : ""}" style="width:${wPct.toFixed(2)}%;background:${bg};color:${txt}" title="${esc(sg.city)}${sg.isMatch ? " (COINCIDE!)" : ""}">${wPct >= 7 ? esc(formatCityLabel(sg.city, sg.days, 28)) : ""}</div>`;
        }).join("")}
      </div>
    </div>`;
  };

  return `<div class="overlap-visual-box">
    <div class="overlap-pair-title">
      <span>📊 Linha Visual de Sobreposição (${totalDays} dias)</span>
      <span class="pill ok">${matchSet.size} dia(s) coincidentes destacados em verde</span>
    </div>
    <div class="overlap-track-wrap">
      ${renderRow(pairA)}
      ${renderRow(pairB)}
      <div class="overlap-axis"><span>${fmtBR(dates[0])}</span><span>${fmtBR(dates[dates.length - 1])}</span></div>
    </div>
  </div>`;
}

async function openCrossingsModal() {
  const modal = $("#crossingsModal");
  const body = $("#crossingsBody");
  if (!modal || !body) return;
  body.innerHTML = `<p class="muted">⏳ Analisando cidades e datas das viagens compartilhadas...</p>`;
  modal.showModal();

  try {
    const res = await window.FeriasApi.getCrossings();
    const trips = Array.isArray(res?.trips) ? res.trips : [];
    const sharedExist = trips.some(t => t.role !== "owner" || t.isShared);
    if (trips.length < 2 || !sharedExist) {
      body.innerHTML = `<p class="muted">É necessário ter ao menos uma viagem compartilhada e duas viagens cadastradas para calcular cruzamentos.</p>`;
      return;
    }

    const { crossings, analyzed } = analyzeTripsCrossings(trips, { requireSharedInvolvement: true });
    if (!analyzed.length) {
      body.innerHTML = `<p class="muted">Nenhuma atividade com datas encontrada nas viagens.</p>`;
      return;
    }

    const dark = isDarkTheme();
    let html = "";
    if (crossings.length) {
      // Agrupa pares distintos com sobreposição para exibir o gráfico visual de overlap acima dos cards
      const pairs = new Map();
      crossings.forEach(cr => {
        const pk = `${cr.A.trip.id}::${cr.B.trip.id}`;
        if (!pairs.has(pk)) pairs.set(pk, { A: cr.A, B: cr.B, items: [] });
        pairs.get(pk).items.push(cr);
      });
      pairs.forEach(p => {
        html += buildOverlapVisualPairHTML(p.A, p.B, p.items, dark);
      });

      html += crossings.map(cr => {
        const col = colorForCityStable(cr.city);
        const bg = dark ? col.darkBg : col.lightBg;
        const bd = dark ? col.darkBd : col.lightBd;
        const txt = dark ? col.darkTxt : col.lightTxt;
        const daysCnt = cr.dates.length;
        const actsA = cr.A.acts.filter(a => a.start <= cr.endIso && (a.end || a.start) >= cr.startIso).map(a => a.name);
        const actsB = cr.B.acts.filter(a => a.start <= cr.endIso && (a.end || a.start) >= cr.startIso).map(a => a.name);
        const lblA = `${esc(cr.A.trip.name)}${cr.A.trip.role === "owner" ? " (Sua)" : ` (${esc(cr.A.trip.ownerName)})`}`;
        const lblB = `${esc(cr.B.trip.name)}${cr.B.trip.role === "owner" ? " (Sua)" : ` (${esc(cr.B.trip.ownerName)})`}`;
        return `
        <div class="crossing-card">
          <div class="crossing-head">
            <span class="crossing-city-pill" style="background:${bg};border-color:${bd};color:${txt}">📍 ${esc(cr.city)}</span>
            <span class="pill ok">${daysCnt} dia${daysCnt > 1 ? "s" : ""} juntos!</span>
          </div>
          <div class="crossing-dates">📅 ${fmtBR(cr.startIso)}${cr.endIso !== cr.startIso ? ` até ${fmtBR(cr.endIso)}` : ""}</div>
          <div class="crossing-pair">🤝 <b>${lblA}</b> × <b>${lblB}</b></div>
          ${(actsA.length || actsB.length) ? `<div class="crossing-acts">Atividades no período: ${esc([...new Set([...actsA, ...actsB])].slice(0, 6).join(" · "))}</div>` : ""}
        </div>`;
      }).join("");
    } else {
      html += `<div class="crossing-summary-box"><b>Nenhum cruzamento de cidade na mesma data encontrado ainda.</b><span class="muted small">Verifique abaixo em quais cidades e datas cada viagem está programada.</span></div>`;
    }

    html += `<div class="crossing-summary-box">
      <strong>🗺️ Resumo de Cidades por Viagem</strong>
      ${analyzed.map(item => `
        <div>
          <div style="font-size:0.84rem;font-weight:700;margin-bottom:4px">
            ${item.trip.role === "owner" ? "🚗" : "👥"} ${esc(item.trip.name)} <small class="muted">(${esc(item.trip.ownerName)}${item.trip.role === "owner" ? " · Sua" : ""})</small>
          </div>
          <div class="crossing-trip-chips">
            ${item.spans.length
              ? item.spans.map(sp => {
                  const col = colorForCityStable(sp.city);
                  return `<span class="crossing-city-pill" style="font-size:0.74rem;background:${dark ? col.darkBg : col.lightBg};border-color:${dark ? col.darkBd : col.lightBd};color:${dark ? col.darkTxt : col.lightTxt}">${esc(sp.city)} (${fmtShortBR(sp.startIso)}–${fmtShortBR(sp.endIso)})</span>`;
                }).join("")
              : `<span class="muted small">Sem trechos com origem/destino cadastrados</span>`}
          </div>
        </div>`).join("")}
    </div>`;

    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<div class="auth-error">❌ ${esc(err.message || err)}</div>`;
  }
}

function renderPendingInvites() {
  const pend = tripsCache.pendingShares || [];
  const btn = $("#btnPendingInvites");
  const banner = $("#invitesBanner");
  if (btn) {
    btn.hidden = pend.length === 0;
    $("#inviteCount").textContent = String(pend.length);
  }
  if (!banner) return;
  if (!pend.length) {
    banner.hidden = true;
    banner.innerHTML = "";
    return;
  }
  banner.hidden = false;
  banner.innerHTML = pend.map(p => {
    const modeTag = p.mode === "professional" ? "💼 Projeto Pro" : "🌴 Pessoal";
    return `
    <div class="invite-card">
      <div>
        <strong>📩 Convite de planejamento compartilhado <span class="pill">${modeTag}</span></strong>
        <div class="small muted">${esc(p.ownerName)} (${esc(p.ownerEmail)}) compartilhou <b>"${esc(p.tripName)}"</b> com você.</div>
      </div>
      <div class="inline-actions">
        <button type="button" class="btn primary small" data-inv-accept="${p.id}" data-trip="${p.tripId}" data-mode="${p.mode === "professional" ? "professional" : "personal"}">✅ Aceitar</button>
        <button type="button" class="btn ghost small" data-inv-decline="${p.id}">✕ Recusar</button>
      </div>
    </div>`;
  }).join("");

  banner.querySelectorAll("[data-inv-accept]").forEach(b => {
    b.onclick = async () => {
      await window.FeriasApi.respondShare(b.dataset.invAccept, "accept");
      toast("✅ Planejamento aceito e adicionado à sua lista!");
      const invMode = b.dataset.mode === "professional" ? "professional" : "personal";
      if (invMode !== appMode) {
        await setAppMode(invMode, { skipLoad: true });
      }
      await refreshTripsAndLoad(b.dataset.trip);
    };
  });
  banner.querySelectorAll("[data-inv-decline]").forEach(b => {
    b.onclick = async () => {
      await window.FeriasApi.respondShare(b.dataset.invDecline, "decline");
      toast("Convite recusado.");
      await refreshTripsAndLoad();
    };
  });
}

async function openTripsByIds(tripIds, preferredPrimaryId) {
  const unique = [...new Set((tripIds || []).filter(Boolean))];
  if (!unique.length) return;
  const results = await Promise.all(unique.map(id => window.FeriasApi.getTrip(id).catch(() => null)));
  const loaded = [];
  results.forEach(res => {
    if (res && res.trip) {
      const m = getTripMode(res.trip);
      const data = m === "professional" && window.MyPlanPro
        ? window.MyPlanPro.migrateProState(res.trip.data)
        : migrateState(res.trip.data);
      const tr = { ...res.trip, mode: m, data };
      tr.data.title = tr.name || tr.data.title;
      loadedTripsMap.set(tr.id, tr);
      loaded.push(tr);
    }
  });
  if (!loaded.length) return;

  selectedTripIds = loaded.map(t => t.id);
  const primary = loaded.find(t => t.id === preferredPrimaryId) || loaded[0];
  activeTrip = primary;
  state = primary.data;
  window.FeriasApi.setActiveTripId(primary.id, appMode);
  try { localStorage.setItem(getSelectedTripsStorageKey(), JSON.stringify(selectedTripIds)); } catch {}
  if (primary.gmapsKey && window.FeriasMaps && primary.gmapsKey !== window.FeriasMaps.getKey()) {
    window.FeriasMaps.setKey(primary.gmapsKey);
  }
  renderTripDropdown();
  render();
}

async function openTripById(tripId) {
  return openTripsByIds([tripId], tripId);
}

async function refreshTripsAndLoad(preferredTripId) {
  tripsCache = await window.FeriasApi.listTrips();
  renderPendingInvites();
  updateCrossingsMenuVisibility();

  const isPro = appMode === "professional";
  const own = (tripsCache.ownTrips || []).filter(t => getTripMode(t) === appMode);
  const shared = (tripsCache.sharedTrips || []).filter(t => getTripMode(t) === appMode);
  let all = [...own, ...shared];
  const curUser = window.FeriasApi.getUser();
  const bootPrefix = isPro ? "myplan-pro-boot-" : "ferias-pro-own-boot-";
  const bootKey = curUser ? `${bootPrefix}${curUser.id}` : "";
  if (!all.length || (!own.length && bootKey && !localStorage.getItem(bootKey))) {
    let created = null;
    if (isPro) {
      const initialPro = clone(window.createDefaultProData ? window.createDefaultProData() : window.PRO_DEFAULT_DATA);
      created = await window.FeriasApi.createTrip(initialPro.title || "Roadmap & Entregas Profissionais", initialPro, "", "professional");
    } else {
      let initialData = clone(window.DEFAULT_DATA);
      try {
        const leg = localStorage.getItem(LEGACY_KEY_1) || localStorage.getItem(LEGACY_KEY_2);
        if (leg) initialData = migrateState(JSON.parse(leg));
      } catch {}
      created = await window.FeriasApi.createTrip(initialData.title || "Férias Final de Ano 2026", initialData, window.FeriasMaps.getKey(), "personal");
    }
    if (bootKey) { try { localStorage.setItem(bootKey, "1"); } catch {} }
    tripsCache = await window.FeriasApi.listTrips();
    const nextOwn = (tripsCache.ownTrips || []).filter(t => getTripMode(t) === appMode);
    const nextShared = (tripsCache.sharedTrips || []).filter(t => getTripMode(t) === appMode);
    all = [...nextOwn, ...nextShared];
    preferredTripId = created?.trip?.id || created?.id || all.find(t => t.role === "owner")?.id;
  } else if (own.length && bootKey) {
    try { localStorage.setItem(bootKey, "1"); } catch {}
  }

  const allIds = new Set(all.map(t => t.id));
  if (preferredTripId && allIds.has(preferredTripId)) {
    await openTripsByIds([preferredTripId], preferredTripId);
    return;
  }

  let savedMulti = [];
  try { savedMulti = JSON.parse(localStorage.getItem(getSelectedTripsStorageKey()) || "[]"); } catch {}
  const validSaved = Array.isArray(savedMulti) ? savedMulti.filter(id => allIds.has(id)) : [];
  if (validSaved.length) {
    const activeStored = window.FeriasApi.getActiveTripId(appMode);
    const prim = allIds.has(activeStored) ? activeStored : validSaved[0];
    await openTripsByIds(validSaved, prim);
    return;
  }

  const ownFirst = all.find(t => t.role === "owner") || all[0];
  const activeStored = window.FeriasApi.getActiveTripId(appMode);
  const targetId = allIds.has(activeStored) ? activeStored : ownFirst.id;
  await openTripsByIds([targetId], targetId);
}

async function openShareModal() {
  if (!activeTrip) return;
  if (!window.FeriasApi.isServer()) {
    return toast("Compartilhamento requer login no servidor da VPS.");
  }
  if (activeTrip.role !== "owner") {
    return toast("Apenas o criador da viagem pode gerenciar compartilhamentos.");
  }
  await refreshShareList();
  $("#shareModal").showModal();
}

async function refreshShareList() {
  const { shares } = await window.FeriasApi.getTrip(activeTrip.id);
  const box = $("#shareList");
  if (!shares || !shares.length) {
    box.innerHTML = `<p class="muted small">Esta viagem ainda não foi compartilhada com ninguém.</p>`;
    return;
  }
  const stLabel = { pending: "Aguardando aceite", accepted: "Aceito", declined: "Recusado" };
  box.innerHTML = shares.map(s => `
    <div class="share-row">
      <div>
        <strong>${esc(s.targetEmail)}</strong>
        <div class="muted small">${s.role === "viewer" ? "Só visualizar" : "Pode editar"} · <b>${stLabel[s.status] || s.status}</b></div>
      </div>
      <button type="button" class="icon-btn" data-srem="${s.id}" title="Remover acesso">🗑️</button>
    </div>`).join("");
  box.querySelectorAll("[data-srem]").forEach(b => {
    b.onclick = async () => {
      await window.FeriasApi.removeShare(activeTrip.id, b.dataset.srem);
      await refreshShareList();
      if (window.FeriasApi.isServer()) {
        tripsCache = await window.FeriasApi.listTrips();
        updateCrossingsMenuVisibility();
      }
      toast("Acesso removido.");
    };
  });
}

/* ---------- IMPORT / EXPORT ---------- */
function download(name, blob) {
  const u = URL.createObjectURL(blob);
  const l = document.createElement("a");
  l.href = u;
  l.download = name;
  l.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

function sanitizeSpreadsheetCell(val) {
  if (val === null || val === undefined || typeof val === "number" || typeof val === "boolean") return val;
  const s = String(val);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function sanitizeSheetRows(list) {
  return (list || []).map(row => {
    const out = {};
    for (const [k, v] of Object.entries(row || {})) out[k] = sanitizeSpreadsheetCell(v);
    return out;
  });
}

function exportXlsx() {
  if (!window.XLSX) return toast("Biblioteca Excel não carregou (sem internet?)");
  const wb = XLSX.utils.book_new();
  const t = totals();
  const rows = sorted().map((a, i) => {
    const c = calc(a);
    const v = a.type === "Viagem";
    return {
      "#": i + 1, Tipo: a.type, Início: fmtBR(a.start), Fim: fmtBR(a.end),
      "Dia Sem.": WD[parseD(a.start).getDay()], Atividade: label(a), Dias: days(a),
      "Distância (km)": v ? a.km : "", "Direção": v ? hm(a.drive) : "", Paradas: v ? a.stops : "",
      "Tempo Paradas": v ? hm(a.stopTime) : "", "Tempo Total": v ? hm(c.time) : "",
      "Km EV": v ? +c.ev.toFixed(1) : "", "Km HEV": v ? +c.hev.toFixed(1) : "",
      "Gasolina (L)": v ? +c.liters.toFixed(2) : "", "Custo Gasolina": v ? +c.fuel.toFixed(2) : "",
      "Custo Recarga": v ? +c.charge.toFixed(2) : "", Pedágio: v ? a.toll : "",
      Extras: +a.extraCost || 0, "Total Item": +(c.total + c.extra).toFixed(2),
      Tanques: v ? +c.tanks.toFixed(2) : "",
      Tags: Array.isArray(a.tags) ? a.tags.join(", ") : "",
      Observações: a.notes || ""
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizeSheetRows(rows)), "Tabela Completa");
  const par = VEHICLE_PARAM_DEFS.map(([k, l, u]) => ({ Parâmetro: l, Valor: state.vehicle[k], Unidade: u }));
  COST_PARAM_DEFS.forEach(d => par.push({ Parâmetro: d.label, Valor: state[d.group][d.key], Unidade: d.unit }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizeSheetRows(par)), "Resumo & Parâmetros");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizeSheetRows(state.checklist.map((c, i) => ({
    "#": i + 1, Categoria: c.cat, Item: c.item, Prioridade: c.prio, Status: c.status, Notas: c.notes
  })))), "Checklist");
  XLSX.writeFile(wb, `${(state.title || "My_Plan").replace(/[^\w\-]+/g, "_")}.xlsx`);
  toast("⬇️ Excel exportado");
}

async function importXlsx(file) {
  if (!window.XLSX) return toast("Biblioteca Excel não carregou");
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const g = wb.Sheets["Cronograma Gantt"], tb = wb.Sheets["Tabela Completa"], rs = wb.Sheets["Resumo & Dashboard"];
  if (!g) return toast("Aba 'Cronograma Gantt' não encontrada");

  const v = (sh, ref) => sh && sh[ref] ? sh[ref].v : null;
  const toISO = d => d instanceof Date ? fmtISO(new Date(d.getTime() + 12 * 3600e3))
    : (typeof d === "number" ? fmtISO(new Date(Math.round((d - 25569) * DAY) + 12 * 3600e3)) : null);
  const toMin = x => x instanceof Date ? x.getUTCHours() * 60 + x.getUTCMinutes() + Math.round(x.getUTCSeconds() / 60)
    : typeof x === "number" ? Math.round(x * 1440) : parseHM(x);

  const acts = [];
  for (let r = 7; r <= 60; r++) {
    const name = v(g, "C" + r);
    if (!name) continue;
    const a = { id: uid(), type: v(g, "B" + r) || "Evento", name: String(name), start: toISO(v(g, "D" + r)), end: toISO(v(g, "E" + r)), extraCost: 0, attachments: [] };
    if (!a.start) continue;
    a.end = a.end || a.start;
    const tr = r - 2;
    a.notes = v(tb, "U" + tr) || "";
    if (a.type === "Viagem") {
      const m = a.name.match(/^(.*?)\s*\((.*?)\s*➔\s*(.*?)\)\s*$/);
      if (m) { a.name = m[1]; a.from = m[2] === "BSB" ? "Brasília" : m[2]; a.to = m[3]; }
      Object.assign(a, {
        km: +v(tb, "H" + tr) || null, drive: toMin(v(tb, "I" + tr)), stops: +v(tb, "J" + tr) || 0,
        stopTime: toMin(v(tb, "K" + tr)), toll: +v(tb, "R" + tr) || 0, charges: state.params.defaultCharges ?? 1
      });
    }
    acts.push(a);
  }
  if (!acts.length) return toast("Nenhuma atividade encontrada");
  state.activities = acts;
  if (rs) {
    ["evRange", "hevKmL", "fuelPrice", "tank", "kwhPerCharge", "kwhPrice", "battery"].forEach((k, i) => {
      const x = v(rs, "C" + (10 + i));
      if (typeof x === "number") state.vehicle[k] = x;
    });
  }
  save(`📥 ${acts.length} atividades importadas`);
}

/* ---------- PWA INSTALL POP-UP ---------- */
function setupPwaInstall() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isMobile = isIOS || window.innerWidth <= 900 || /android|mobile/i.test(navigator.userAgent);
  const dismissedAt = Number(localStorage.getItem(PWA_DISMISS_KEY) || 0);
  const recentlyDismissed = Date.now() - dismissedAt < 3 * DAY;

  $("#btnMenuInstall").hidden = false;

  pwaPromptWaiters.push(() => {
    $("#btnMenuInstall").hidden = false;
    if (!recentlyDismissed) showPwaBanner(false);
  });

  if (deferredInstallPrompt && !recentlyDismissed) {
    showPwaBanner(false);
  } else if (isMobile && !recentlyDismissed) {
    setTimeout(() => showPwaBanner(isIOS), 700);
  }

  $("#btnPwaInstall").onclick = async () => {
    if (deferredInstallPrompt) {
      const promptEv = deferredInstallPrompt;
      deferredInstallPrompt = null;
      await promptEv.prompt();
      const res = await promptEv.userChoice.catch(() => ({ outcome: "dismissed" }));
      if (res && res.outcome === "accepted") $("#pwaInstallBanner").hidden = true;
    } else if (isIOS) {
      alert("No iPhone/iPad: toque no botão Compartilhar (quadrado com seta ⬆️) no Safari e escolha 'Adicionar à Tela de Início' para instalar o My Plan em tela cheia.");
      $("#pwaInstallBanner").hidden = true;
    } else {
      alert("Para instalar em tela cheia (sem barra de endereço): abra o menu (⋮) do Chrome e toque em 'Instalar aplicativo' (evite 'Criar atalho'). Se já tiver uma versão antiga instalada, desinstale o ícone anterior e instale novamente.");
      $("#pwaInstallBanner").hidden = true;
    }
  };

  $("#btnMenuInstall").onclick = () => $("#btnPwaInstall").click();
  $("#btnPwaDismiss").onclick = () => {
    localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
    $("#pwaInstallBanner").hidden = true;
  };
}

function showPwaBanner(isIOS) {
  const banner = $("#pwaInstallBanner");
  if (!banner || $("#appShell").hidden) return;
  if (isIOS) {
    $("#pwaPromptDesc").textContent = "Toque em Compartilhar (⬆️) e 'Adicionar à Tela de Início' para instalar o app My Plan.";
    $("#btnPwaInstall").textContent = "Baixar App";
  } else {
    $("#pwaPromptDesc").textContent = "Baixe o aplicativo My Plan no seu celular com ícone direto na tela inicial.";
    $("#btnPwaInstall").textContent = "Baixar App";
  }
  banner.hidden = false;
}

/* ---------- AUTH, SENHA FORTE, REDEFINIÇÃO & BOOT ---------- */
const EYE_OPEN_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function setPasswordFieldVisible(btn, input, show) {
  if (!input || !btn) return;
  input.type = show ? "text" : "password";
  btn.setAttribute("aria-pressed", show ? "true" : "false");
  btn.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
  btn.innerHTML = show ? EYE_OFF_SVG : EYE_OPEN_SVG;
}

function initPasswordToggles() {
  document.querySelectorAll(".pw-toggle").forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      const targetId = btn.dataset.pwTarget;
      const input = targetId ? document.getElementById(targetId) : btn.closest(".password-wrap")?.querySelector("input");
      if (!input) return;
      setPasswordFieldVisible(btn, input, input.type === "password");
    };
  });
}

function resetPasswordFieldVisibility(scopeEl) {
  if (!scopeEl) return;
  scopeEl.querySelectorAll(".pw-toggle").forEach(btn => {
    const targetId = btn.dataset.pwTarget;
    const input = targetId ? document.getElementById(targetId) : btn.closest(".password-wrap")?.querySelector("input");
    if (input) setPasswordFieldVisible(btn, input, false);
  });
}

function validateStrongPasswordClient(password) {
  const pw = String(password || "");
  const checks = {
    length: pw.length >= 8,
    upper: /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(pw),
    lower: /[a-záàâãéêíóôõúç]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-zÀ-ÿ0-9\s]/.test(pw)
  };
  const missing = [];
  if (!checks.length) missing.push("mínimo 8 caracteres");
  if (!checks.upper) missing.push("1 maiúscula");
  if (!checks.lower) missing.push("1 minúscula");
  if (!checks.number) missing.push("1 número");
  if (!checks.special) missing.push("1 caractere especial");
  return {
    valid: missing.length === 0,
    checks,
    error: missing.length ? `Senha fraca: inclua ${missing.join(", ")}.` : ""
  };
}

function renderPasswordRules(sel, pw) {
  const el = $(sel);
  if (!el) return;
  const { checks } = validateStrongPasswordClient(pw);
  const rules = [
    [checks.length, "8+ caracteres"],
    [checks.upper, "Maiúscula"],
    [checks.lower, "Minúscula"],
    [checks.number, "Número"],
    [checks.special, "Especial (!@#$)"]
  ];
  el.innerHTML = rules.map(([ok, txt]) => `<span class="pw-rule ${ok ? "ok" : ""}">${ok ? "✓ " : ""}${txt}</span>`).join("");
}

let activeResetToken = "";

function showAuthPanel(panel) {
  const loginPanel = $("#authLoginPanel");
  const forgotBox = $("#forgotBox");
  const resetBox = $("#resetBox");
  if (loginPanel) loginPanel.hidden = panel !== "login";
  if (forgotBox) forgotBox.hidden = panel !== "forgot";
  if (resetBox) resetBox.hidden = panel !== "reset";
  resetPasswordFieldVisibility($("#authView"));
}

const DEFAULT_GOOGLE_CLIENT_ID = "1075987097030-j9htnv6l02rfdbt4spbjp84btj8bopqq.apps.googleusercontent.com";
let gsiScriptLoaded = false;
function setupGoogleSignInButton(clientId) {
  const cid = String(clientId || window.FeriasApi?.getGoogleClientId?.() || DEFAULT_GOOGLE_CLIENT_ID).trim();
  const wrap = $("#googleBtnWrap");
  const fallbackBtn = $("#btnGoogleLoginFallback");
  const hint = $("#googleConfigHint");
  if (hint) hint.hidden = true;

  const initAndRender = () => {
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: cid,
      auto_select: false,
      callback: async resp => {
        try {
          const res = await window.FeriasApi.loginGoogle(resp.credential);
          if (res.legacyData && res.legacyData.data) {
            await window.FeriasApi.createTrip(res.legacyData.data.title || "Férias Final de Ano 2026", res.legacyData.data, res.legacyData.gmapsKey || "");
          }
          await enterApp();
        } catch (err) {
          $("#authError").textContent = err.message;
          $("#authError").hidden = false;
        }
      }
    });
    const w = Math.min(340, Math.max(240, (wrap.parentElement?.clientWidth || 340) - 4));
    wrap.innerHTML = "";
    window.google.accounts.id.renderButton(wrap, { theme: isDarkTheme() ? "filled_black" : "outline", size: "large", width: w, text: "continue_with" });
    if (fallbackBtn && wrap.children.length > 0) fallbackBtn.hidden = true;
  };

  if (fallbackBtn) {
    fallbackBtn.hidden = false;
    fallbackBtn.onclick = () => {
      if (window.google?.accounts?.id) {
        initAndRender();
        window.google.accounts.id.prompt();
      } else {
        toast("⏳ Carregando autenticação do Google... tente novamente em 1 segundo.");
      }
    };
  }

  if (window.google?.accounts?.id) {
    initAndRender();
    return;
  }
  if (gsiScriptLoaded) return;
  gsiScriptLoaded = true;
  const s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client";
  s.async = true;
  s.onload = initAndRender;
  s.onerror = () => { gsiScriptLoaded = false; };
  document.head.appendChild(s);
}

function updateAdminMenuVisibility() {
  const u = window.FeriasApi?.getUser();
  const isAdm = Boolean(window.FeriasApi?.isServer() && u?.isAdmin);
  const tabAdm = $("#tab-admin");
  const tabProAdm = $("#tab-pro-admin");
  const menuAdm = $("#btnMenuAdmin");
  if (tabAdm) tabAdm.hidden = !isAdm;
  if (tabProAdm) tabProAdm.hidden = !isAdm;
  if (menuAdm) menuAdm.hidden = !isAdm;
  if (!isAdm && $("#view-admin")?.classList.contains("active")) {
    if (appMode === "professional") switchProView("pro-board");
    else switchAppView("gantt");
  }
}

function updateUserMenu() {
  const u = window.FeriasApi.getUser();
  const box = $("#menuUserInfo");
  if (u) {
    const roleTag = u.isSuperAdmin ? " · 👑 Super Admin" : (u.isAdmin ? " · 🛡️ Admin" : "");
    box.innerHTML = `<strong>${esc(u.name)}${roleTag}</strong><span>${esc(u.email)}</span>`;
    $("#btnLogout").hidden = false;
  } else {
    box.innerHTML = `<strong>Modo Offline</strong><span>Somente este aparelho</span>`;
    $("#btnLogout").hidden = true;
  }
  updateAdminMenuVisibility();
}

async function enterApp() {
  $("#authView").hidden = true;
  $("#appShell").hidden = false;
  const usr = window.FeriasApi.getUser();
  if (usr?.integrations?.gmapsKey && window.FeriasMaps && !window.FeriasMaps.hasKey()) {
    window.FeriasMaps.setKey(usr.integrations.gmapsKey);
  }
  updateUserMenu();
  await setAppMode(appMode, { skipLoad: true });
  await refreshTripsAndLoad();
  setupPwaInstall();

  window.FeriasApi.startPolling(
    () => activeTrip?.id,
    full => {
      const m = getTripMode(full.trip);
      const data = m === "professional" && window.MyPlanPro
        ? window.MyPlanPro.migrateProState(full.trip.data)
        : migrateState(full.trip.data);
      const tr = { ...full.trip, mode: m, data };
      tr.data.title = tr.name || tr.data.title;
      loadedTripsMap.set(tr.id, tr);
      if ((!activeTrip || tr.id === activeTrip.id) && m === appMode) {
        activeTrip = tr;
        state = tr.data;
        if (tr.gmapsKey && window.FeriasMaps && tr.gmapsKey !== window.FeriasMaps.getKey()) {
          window.FeriasMaps.setKey(tr.gmapsKey);
        }
      }
      renderTripDropdown();
      render();
    },
    list => {
      tripsCache = list;
      renderTripDropdown();
      renderPendingInvites();
    }
  );
}

function updateSyncBadge(info) {
  const pill = $("#syncBadge"), txt = $("#syncText"), menuSync = $("#menuSyncStatus");
  if (!pill) return;
  pill.setAttribute("data-status", info.status);
  const map = { checking: "Conectando...", synced: "Sincronizado na nuvem", syncing: "Salvando...", offline: "Sem rede", local_only: "Local", unauth: "Desconectado" };
  const labelTxt = map[info.status] || "Local";
  if (txt) txt.textContent = labelTxt;
  pill.title = `Status: ${labelTxt}`;
  if (menuSync) {
    const dot = info.status === "synced" ? "🟢" : (info.status === "syncing" ? "🔵" : "🟡");
    menuSync.textContent = `${dot} ${labelTxt}`;
  }
}

async function boot() {
  document.documentElement.setAttribute("data-mode", appMode);
  initTheme();
  initPasswordToggles();
  populateTypeSelectors();
  if (window.MyPlanPro) {
    window.MyPlanPro.init({
      buildGanttScale,
      buildUnifiedItems,
      clone,
      closeAllGanttPopovers,
      convertPersonalActivityToProCard,
      convertProCardToPersonalActivity,
      createMultiSelect,
      DAY,
      days,
      detectUnifiedConflicts,
      ensureTargetTripForMode,
      ensureUnifiedSelection,
      ensureUnifiedTripsLoaded,
      esc,
      fileToBase64Obj,
      findActivityContext,
      fmtBR,
      fmtISO,
      fmtShortBR,
      GANTT_ZOOM_STEPS,
      getActiveTrip: () => activeTrip,
      getAllAvailableTags,
      getAllUnifiedTripEntries,
      getSelectedTrips,
      getState: () => state,
      getTypeInfoAny,
      getUnifiedBarExtraClasses,
      getUnifiedState: () => ({ unified: ganttUnifiedMode, conflictsOnly: ganttConflictsOnly }),
      isMultiTripMode,
      MON,
      MON_ABBR,
      MON_FULL,
      money,
      MULTI_TRIP_COLORS,
      num,
      openCheckModal,
      openModal: idOrOpts => window.openModal(idOrOpts),
      openPrintGanttModal,
      openProfileModal,
      openSmartCalendarModal,
      openWalletPassDirect,
      parseD,
      pickSupportedAudioMime,
      populateEventSelect,
      prefetchWalletPassForActivity,
      registerCustomTag,
      renderTripDropdown,
      renderUnifiedCardSubBadges,
      renderUnifiedStatusBar,
      reportHelpers,
      resolveTripRefById,
      sanitizeSheetRows,
      save,
      saveTripRecord,
      sendPlanToMyWhatsApp,
      setUnifiedState: next => toggleUnifiedGanttMode(next),
      switchProView,
      syncSingleActivityToCalendar,
      toast,
      toggleGanttFullscreen,
      uid,
      unifiedConflictMap,
      unifiedMetaMap,
      WD
    });
  }
  window.FeriasApi.onStatus(updateSyncBadge);

  const cfg = await window.FeriasApi.initServer();
  if (!cfg.serverAvailable) {
    // Fallback offline sem servidor
    await enterApp();
    return;
  }

  const resetToken = new URLSearchParams(location.search).get("resetToken");
  if (resetToken) {
    $("#authView").hidden = false;
    $("#appShell").hidden = true;
    showAuthPanel("reset");
    const fb = $("#resetFeedback");
    const hint = $("#resetEmailHint");
    const submitBtn = $("#btnResetSubmit");
    fb.hidden = true;
    activeResetToken = resetToken;
    renderPasswordRules("#resetPwChecklist", "");
    try {
      const info = await window.FeriasApi.validateResetToken(resetToken);
      if (hint) hint.textContent = `Redefinindo senha da conta ${info.emailMasked}.`;
      if (submitBtn) submitBtn.disabled = false;
    } catch (err) {
      if (hint) hint.textContent = "";
      fb.className = "auth-error";
      fb.textContent = err.message || "Link de redefinição inválido ou expirado.";
      fb.hidden = false;
      if (submitBtn) submitBtn.disabled = true;
    }
    return;
  }

  if (cfg.user) {
    await enterApp();
  } else {
    $("#authView").hidden = false;
    $("#appShell").hidden = true;
    showAuthPanel("login");
    setupGoogleSignInButton(cfg.googleClientId);
  }
}

/* ---------- EVENTOS ---------- */
$("#authThemeBtn").onclick = $("#btnTheme").onclick = () => applyTheme(isDarkTheme() ? "light" : "dark");

$("#authModeTabs").querySelectorAll("button").forEach(b => {
  b.onclick = () => {
    authMode = b.dataset.amode;
    const isReg = authMode === "register";
    $("#authModeTabs").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    $("#authNameWrap").hidden = !isReg;
    $("#authName").required = isReg;
    if ($("#authForgotRow")) $("#authForgotRow").hidden = isReg;
    if ($("#authPwChecklist")) {
      $("#authPwChecklist").hidden = !isReg;
      if (isReg) renderPasswordRules("#authPwChecklist", $("#authPassword").value);
    }
    $("#authPassword").minLength = isReg ? 8 : 6;
    $("#authPassword").autocomplete = isReg ? "new-password" : "current-password";
    $("#authPassword").placeholder = isReg ? "Mín. 8 caracteres (A-Z, a-z, 0-9, !@#)" : "Digite sua senha";
    $("#authSubmitBtn").textContent = isReg ? "Criar conta e entrar" : "Entrar";
    $("#authError").hidden = true;
  };
});

$("#authPassword").addEventListener("input", () => {
  if ($("#authError")) $("#authError").hidden = true;
  if (authMode === "register") renderPasswordRules("#authPwChecklist", $("#authPassword").value);
});

if ($("#btnForgotPassword")) {
  $("#btnForgotPassword").onclick = () => {
    $("#forgotEmail").value = $("#authEmail").value.trim();
    $("#forgotFeedback").hidden = true;
    showAuthPanel("forgot");
    $("#forgotEmail").focus();
  };
}

if ($("#btnBackToLogin")) {
  $("#btnBackToLogin").onclick = () => {
    showAuthPanel("login");
    setupGoogleSignInButton(window.FeriasApi.getGoogleClientId());
  };
}

if ($("#forgotForm")) {
  $("#forgotForm").onsubmit = async e => {
    e.preventDefault();
    const fb = $("#forgotFeedback");
    const btn = $("#btnSendForgot");
    fb.hidden = true;
    btn.disabled = true;
    try {
      const res = await window.FeriasApi.forgotPassword($("#forgotEmail").value.trim());
      fb.className = "auth-success";
      fb.textContent = "📩 " + (res.message || "Link de redefinição enviado para seu e-mail!");
      fb.hidden = false;
    } catch (err) {
      fb.className = "auth-error";
      fb.textContent = err.message || "Não foi possível enviar o link.";
      fb.hidden = false;
    } finally {
      btn.disabled = false;
    }
  };
}

if ($("#resetNewPassword")) {
  $("#resetNewPassword").addEventListener("input", () => {
    renderPasswordRules("#resetPwChecklist", $("#resetNewPassword").value);
  });
}

if ($("#btnResetBackLogin")) {
  $("#btnResetBackLogin").onclick = () => {
    activeResetToken = "";
    try { history.replaceState(null, "", location.pathname + location.hash); } catch {}
    showAuthPanel("login");
    setupGoogleSignInButton(window.FeriasApi.getGoogleClientId());
  };
}

if ($("#resetForm")) {
  $("#resetForm").onsubmit = async e => {
    e.preventDefault();
    const fb = $("#resetFeedback");
    const btn = $("#btnResetSubmit");
    fb.hidden = true;
    const newPw = $("#resetNewPassword").value;
    const confPw = $("#resetConfirmPassword").value;
    const check = validateStrongPasswordClient(newPw);
    if (!check.valid) {
      fb.className = "auth-error";
      fb.textContent = check.error;
      fb.hidden = false;
      return;
    }
    if (newPw !== confPw) {
      fb.className = "auth-error";
      fb.textContent = "As senhas digitadas não conferem.";
      fb.hidden = false;
      return;
    }
    btn.disabled = true;
    try {
      await window.FeriasApi.resetPassword(activeResetToken, newPw, confPw);
      activeResetToken = "";
      try { history.replaceState(null, "", location.pathname + location.hash); } catch {}
      toast("✅ Senha redefinida com sucesso!");
      await enterApp();
    } catch (err) {
      fb.className = "auth-error";
      fb.textContent = err.message || "Não foi possível redefinir a senha.";
      fb.hidden = false;
      btn.disabled = false;
    }
  };
}

$("#authForm").onsubmit = async e => {
  e.preventDefault();
  const errEl = $("#authError");
  errEl.hidden = true;
  const email = $("#authEmail").value.trim();
  const pass = $("#authPassword").value;
  try {
    if (authMode === "register") {
      const pwCheck = validateStrongPasswordClient(pass);
      if (!pwCheck.valid) {
        errEl.textContent = pwCheck.error;
        errEl.hidden = false;
        return;
      }
      const name = $("#authName").value.trim();
      const res = await window.FeriasApi.register(name, email, pass);
      if (res.legacyData && res.legacyData.data) {
        await window.FeriasApi.createTrip(res.legacyData.data.title || "Férias Final de Ano 2026", res.legacyData.data, res.legacyData.gmapsKey || "");
      }
    } else {
      await window.FeriasApi.login(email, pass);
    }
    await enterApp();
  } catch (err) {
    errEl.textContent = err.message || "Erro na autenticação.";
    errEl.hidden = false;
  }
};

$("#btnLogout").onclick = async () => {
  selectedTripIds = [];
  unifiedSelectedTripIds = null;
  unifiedSelectionCustomized = false;
  unifiedCalMenuOpenBarId = null;
  loadedTripsMap.clear();
  try {
    localStorage.removeItem(SELECTED_TRIPS_KEY);
    localStorage.removeItem(SELECTED_TRIPS_PRO_KEY);
    localStorage.removeItem(getUnifiedTripsStorageKey());
  } catch {}
  await window.FeriasApi.logout();
  location.reload();
};

$("#btnNewTrip").onclick = () => {
  const isPro = appMode === "professional";
  if ($("#nt-modalTitle")) $("#nt-modalTitle").textContent = isPro ? "💼 Criar Novo Projeto Profissional" : "✈️ Criar Nova Viagem / Férias";
  if ($("#nt-nameLabel")) $("#nt-nameLabel").textContent = isPro ? "Nome do projeto / agenda profissional" : "Nome das férias / viagem";
  if ($("#nt-name")) $("#nt-name").placeholder = isPro ? "Ex: Lançamento App Q2, Consultoria Cliente X..." : "Ex: Férias Julho 2027, Feriado Carnaval...";
  if ($("#nt-copyVehicleWrap")) $("#nt-copyVehicleWrap").hidden = isPro;
  if ($("#nt-submitBtn")) $("#nt-submitBtn").textContent = isPro ? "Criar projeto" : "Criar do zero";
  $("#nt-name").value = "";
  $("#newTripModal").showModal();
};
$("#btnCloseNewTrip").onclick = $("#btnCancelNewTrip").onclick = () => $("#newTripModal").close();
$("#newTripForm").onsubmit = async e => {
  e.preventDefault();
  const name = $("#nt-name").value.trim();
  if (!name) return;
  const isPro = appMode === "professional";
  if (isPro) {
    const data = window.createBlankProData ? window.createBlankProData(name) : { mode: "professional", title: name, activities: [], checklist: [] };
    const created = await window.FeriasApi.createTrip(name, data, "", "professional");
    $("#newTripModal").close();
    await refreshTripsAndLoad(created.id);
    toast(`💼 Projeto "${name}" criado!`);
  } else {
    const copyVeh = $("#nt-copyVehicle").checked;
    const data = window.createBlankTripData(name, copyVeh ? state.vehicle : null);
    const created = await window.FeriasApi.createTrip(name, data, window.FeriasMaps.getKey(), "personal");
    $("#newTripModal").close();
    await refreshTripsAndLoad(created.id);
    toast(`✈️ Viagem "${name}" criada!`);
  }
};

$("#btnRenameTrip").onclick = async () => {
  if (!activeTrip) return;
  const isPro = appMode === "professional";
  const n = prompt(isPro ? "Novo nome para este projeto:" : "Novo nome para estas férias:", state.title || activeTrip.name);
  if (!n || !n.trim()) return;
  state.title = n.trim();
  activeTrip.name = state.title;
  save(isPro ? "✏️ Projeto renomeado" : "✏️ Viagem renomeada");
  await refreshTripsAndLoad(activeTrip.id);
};

$("#btnDeleteTrip").onclick = async () => {
  const isPro = appMode === "professional";
  if (!activeTrip || activeTrip.role !== "owner") return toast(`Apenas o criador pode excluir este ${isPro ? "projeto" : "planejamento"}.`);
  if (!confirm(`Excluir permanentemente "${state.title}" e todos os anexos?`)) return;
  const delId = activeTrip.id;
  await window.FeriasApi.deleteTrip(delId);
  loadedTripsMap.delete(delId);
  selectedTripIds = selectedTripIds.filter(x => x !== delId);
  try { localStorage.setItem(getSelectedTripsStorageKey(), JSON.stringify(selectedTripIds)); } catch {}
  toast(isPro ? "🗑️ Projeto excluído" : "🗑️ Viagem excluída");
  await refreshTripsAndLoad();
};

if ($("#btnShareTrip")) $("#btnShareTrip").onclick = openShareModal;
$("#btnCloseShare").onclick = () => $("#shareModal").close();
$("#shareForm").onsubmit = async e => {
  e.preventDefault();
  try {
    await window.FeriasApi.shareTrip(activeTrip.id, $("#shareEmail").value.trim(), $("#shareRole").value);
    $("#shareEmail").value = "";
    await refreshShareList();
    if (window.FeriasApi.isServer()) {
      tripsCache = await window.FeriasApi.listTrips();
      updateCrossingsMenuVisibility();
    }
    toast("📩 Convite enviado!");
  } catch (err) {
    toast("❌ " + err.message);
  }
};

if ($("#btnMenuCrossings")) $("#btnMenuCrossings").onclick = openCrossingsModal;
if ($("#btnCloseCrossings")) $("#btnCloseCrossings").onclick = () => $("#crossingsModal").close();
if ($("#btnCrossingsDone")) $("#btnCrossingsDone").onclick = () => $("#crossingsModal").close();

$("#btnPendingInvites").onclick = () => $("#invitesBanner").scrollIntoView({ behavior: "smooth" });

function switchAppView(viewId) {
  if (viewId !== "admin") lastPersonalView = viewId;
  $("#tabs")?.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x.dataset.view === viewId));
  $("#tabsPro")?.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x.dataset.proView === viewId));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + viewId));
  if (viewId === "admin") loadAndRenderAdmin();
  closeAllGanttPopovers();
  closeAllUnifiedCalMenus();
}

function switchProView(viewId) {
  if (viewId !== "admin") lastProView = viewId;
  $("#tabsPro")?.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x.dataset.proView === viewId));
  $("#tabs")?.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x.dataset.view === viewId));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + viewId));
  if (viewId === "admin") loadAndRenderAdmin();
  if (viewId === "pro-map" && window.MyPlanPro?.renderProMap) window.MyPlanPro.renderProMap();
  if (viewId === "pro-travels" && window.MyPlanPro?.renderProTravels) window.MyPlanPro.renderProTravels();
  if (viewId === "pro-control" && window.MyPlanPro?.renderProControl) window.MyPlanPro.renderProControl();
  if (viewId === "pro-docs" && window.MyPlanPro?.renderProDocs) window.MyPlanPro.renderProDocs();
  closeAllGanttPopovers();
  closeAllUnifiedCalMenus();
}

async function setAppMode(nextMode, opts = {}) {
  const mode = nextMode === "professional" ? "professional" : "personal";
  appMode = mode;
  try { localStorage.setItem(APP_MODE_KEY, mode); } catch {}
  document.documentElement.setAttribute("data-mode", mode);
  applyTheme(isDarkTheme() ? "dark" : "light");
  exitAnyGanttFullscreen();
  closeAllGanttPopovers();
  closeAllUnifiedCalMenus();

  const isPro = mode === "professional";
  if ($("#brandModeTag")) $("#brandModeTag").textContent = isPro ? "PRO" : "Pessoal";
  const swBtn = $("#btnModeSwitch");
  if (swBtn) {
    const full = swBtn.querySelector(".mode-switch-full");
    const short = swBtn.querySelector(".mode-switch-short");
    if (full) full.textContent = isPro ? "Mudar para Pessoal" : "Mudar para Profissional";
    if (short) short.textContent = isPro ? "Pessoal" : "Pro";
    swBtn.title = isPro ? "Mudar para o Modo Pessoal (Férias & Viagens)" : "Mudar para o Modo Profissional (Quadro, Gantt & Projetos)";
  }

  if ($("#tabs")) $("#tabs").hidden = isPro;
  if ($("#tabsPro")) $("#tabsPro").hidden = !isPro;

  if ($("#btnAddLabel")) $("#btnAddLabel").textContent = isPro ? "Cartão" : "Evento";
  if ($("#btnAdd")) $("#btnAdd").title = isPro ? "Adicionar cartão profissional" : "Adicionar evento ou viagem";
  if ($("#btnNewTrip")) $("#btnNewTrip").title = isPro ? "Criar novo projeto profissional" : "Criar nova viagem";
  if ($("#btnPrintReport")) $("#btnPrintReport").textContent = isPro ? "🖨️ Imprimir relatório executivo" : "🖨️ Imprimir relatório da viagem";
  if ($("#btnShareTripLabel")) $("#btnShareTripLabel").textContent = isPro ? "Compartilhar projeto" : "Compartilhar viagem";
  if ($("#btnMenuCalendarAll")) $("#btnMenuCalendarAll").textContent = isPro ? "📅 Enviar agenda p/ Google Agenda" : "📅 Enviar férias p/ Google Agenda";
  if ($("#btnImportXlsx")) $("#btnImportXlsx").hidden = isPro;
  if ($("#btnRenameTrip")) $("#btnRenameTrip").textContent = isPro ? "✏️ Renomear projeto atual" : "✏️ Renomear viagem atual";
  if ($("#btnDeleteTrip")) $("#btnDeleteTrip").textContent = isPro ? "🗑️ Excluir projeto atual" : "🗑️ Excluir viagem atual";

  updateCrossingsMenuVisibility();
  updateAdminMenuVisibility();
  if (isPro) switchProView(lastProView || "pro-board");
  else switchAppView(lastPersonalView || "gantt");

  if (!opts.skipLoad) {
    selectedTripIds = [];
    await refreshTripsAndLoad();
  }
}

$("#tabs")?.querySelectorAll(".tab").forEach(b => {
  b.onclick = () => switchAppView(b.dataset.view);
});
$("#tabsPro")?.querySelectorAll(".tab").forEach(b => {
  b.onclick = () => switchProView(b.dataset.proView);
});
if ($("#btnModeSwitch")) {
  $("#btnModeSwitch").onclick = () => setAppMode(appMode === "professional" ? "personal" : "professional");
}

/* ---------- PAINEL SUPER ADMIN & ADMIN DELEGADO ---------- */
let adminCache = null;
let adminSubTab = "users";

const fmtDateTimeBR = ms => {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch { return "—"; }
};

const fmtBytes = b => {
  const n = Number(b) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

async function loadAndRenderAdmin() {
  if (!window.FeriasApi?.isServer() || !window.FeriasApi.getUser()?.isAdmin) return;
  const usersBox = $("#adminTab-users");
  if (usersBox && !adminCache) {
    usersBox.innerHTML = `<p class="muted">⏳ Carregando dados globais de administração...</p>`;
  }
  try {
    adminCache = await window.FeriasApi.adminOverview();
    renderAdminDashboard();
  } catch (err) {
    if (usersBox) usersBox.innerHTML = `<div class="auth-error">❌ ${esc(err.message || err)}</div>`;
  }
}

function getAdminGlobalOverlaps() {
  if (!adminCache?.trips?.length) return { crossings: [], analyzed: [], allDates: [] };
  const allTrips = adminCache.trips
    .filter(tr => getTripMode(tr) === "personal")
    .map(tr => ({
      ...tr,
      role: "owner",
      isAdminGlobal: true,
      data: migrateState(tr.data)
    }));
  return analyzeTripsCrossings(allTrips, { requireDifferentOwners: true });
}

function renderAdminDashboard() {
  if (!adminCache) return;
  const { stats, admins, users, trips, shares, isSuperAdmin } = adminCache;

  const badge = $("#adminRoleBadge");
  if (badge) {
    badge.textContent = isSuperAdmin ? "👑 Super Admin Principal" : "🛡️ Admin Delegado";
    badge.className = `pill ${isSuperAdmin ? "ok" : ""}`;
  }

  const delForm = $("#adminDelegateForm");
  const delHint = $("#adminDelegateHint");
  if (delForm) delForm.hidden = !isSuperAdmin;
  if (delHint) {
    delHint.textContent = isSuperAdmin
      ? "Adicione outros e-mails para terem acesso ao Painel Admin global (somente você é Super Admin permanente)."
      : "Lista de administradores configurados pelo Super Admin (somente leitura).";
  }

  if ($("#adminKpis")) {
    const cards = [
      ["Usuários Cadastrados", `${stats.totalUsers}`, `${stats.googleUsers} Google · ${stats.passwordUsers} c/ senha${stats.demoUsers ? ` · ${stats.demoUsers} demo` : ""}`, "#6366f1"],
      ["Viagens & Atividades", `${stats.totalTrips} viagens`, `${stats.totalActivities} atividades lançadas`, "#06b6d4"],
      ["Compartilhamentos", `${stats.acceptedShares} aceitos`, `${stats.pendingShares} pendentes (${stats.totalShares} total)`, "#10b981"],
      ["Armazenamento & Admins", `${stats.totalAttachments} anexos`, `${fmtBytes(stats.totalAttachmentBytes)} · ${stats.delegatedAdminsCount + 1} admin(s)`, "#f59e0b"]
    ];
    $("#adminKpis").innerHTML = cards.map(([l, v, sub, c]) =>
      `<div class="kpi" style="--c:${c}"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${sub}</div></div>`
    ).join("");
  }

  if ($("#adminDelegatesList")) {
    $("#adminDelegatesList").innerHTML = admins.map(a => `
      <div class="admin-del-chip ${a.isSuperAdmin ? "super" : ""}">
        <span>${a.isSuperAdmin ? "👑" : "🛡️"} <b>${esc(a.email)}</b></span>
        <span class="muted small">${a.registered ? esc(a.name || "Cadastrado") : "Aguardando 1º login"}</span>
        ${a.isSuperAdmin
          ? `<span class="admin-badge super">Super Admin</span>`
          : (isSuperAdmin ? `<button type="button" class="icon-btn" data-adm-revoke="${esc(a.email)}" title="Remover privilégio Admin">🗑️</button>` : `<span class="admin-badge admin">Delegado</span>`)}
      </div>
    `).join("");

    $("#adminDelegatesList").querySelectorAll("[data-adm-revoke]").forEach(btn => {
      btn.onclick = async () => {
        const em = btn.dataset.admRevoke;
        if (!confirm(`Remover privilégio de administrador de "${em}"?`)) return;
        try {
          await window.FeriasApi.adminSetDelegate(em, "remove");
          toast(`🛡️ Privilégio de ${em} removido.`);
          await loadAndRenderAdmin();
        } catch (err) { toast("❌ " + (err.message || err)); }
      };
    });
  }

  const ovData = getAdminGlobalOverlaps();
  const globalCrossings = ovData.crossings || [];

  if ($("#admCountUsers")) $("#admCountUsers").textContent = String(users.length);
  if ($("#admCountTrips")) $("#admCountTrips").textContent = String(trips.length);
  if ($("#admCountOverlaps")) $("#admCountOverlaps").textContent = String(globalCrossings.length);
  if ($("#admCountShares")) $("#admCountShares").textContent = String(shares.length);
  if ($("#admTabBtnVault")) $("#admTabBtnVault").hidden = !isSuperAdmin;
  if (!isSuperAdmin && adminSubTab === "vault") {
    adminSubTab = "users";
    if ($("#adminSubTabs")) {
      $("#adminSubTabs").querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.admtab === "users"));
    }
  }

  renderAdminSubView(ovData);
}

function renderAdminSubView(precomputedOv) {
  if (!adminCache) return;
  const q = ($("#adminSearch")?.value || "").trim().toLowerCase();
  const uFilter = $("#adminUserTypeFilter")?.value || "";
  if ($("#adminUserTypeFilter")) $("#adminUserTypeFilter").hidden = adminSubTab !== "users";
  if ($("#adminFilterBar")) $("#adminFilterBar").hidden = adminSubTab === "vault";

  ["users", "trips", "overlaps", "shares", "audit", "vault"].forEach(k => {
    const el = $(`#adminTab-${k}`);
    if (el) el.hidden = adminSubTab !== k;
  });

  if (adminSubTab === "users") {
    const box = $("#adminTab-users");
    const filtered = adminCache.users.filter(u => {
      if (uFilter === "google" && !u.hasGoogle) return false;
      if (uFilter === "password" && !u.hasPassword) return false;
      if (uFilter === "admin" && !u.isAdmin) return false;
      if (uFilter === "demo" && !u.isDemo) return false;
      if (!q) return true;
      const hay = `${u.name} ${u.email} ${u.whatsappFull} ${u.city} ${u.state}`.toLowerCase();
      return hay.includes(q);
    });
    if (!filtered.length) {
      box.innerHTML = `<p class="muted">Nenhum usuário encontrado para este filtro.</p>`;
      return;
    }
    box.innerHTML = `<div class="admin-users-list">${filtered.map(u => {
      const initials = (u.name || u.email || "?").trim().slice(0, 2).toUpperCase();
      return `
      <div class="admin-user-row" data-adm-uid="${esc(u.id)}" tabindex="0" role="button">
        <div class="admin-user-main">
          <div class="admin-avatar">${u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : esc(initials)}</div>
          <div class="admin-user-meta">
            <div class="admin-user-title">
              <span>${esc(u.name)}</span>
              ${u.isSuperAdmin ? `<span class="admin-badge super">👑 Super Admin</span>` : (u.isAdmin ? `<span class="admin-badge admin">🛡️ Admin</span>` : "")}
              ${u.isDemo ? `<span class="admin-badge demo">🤖 Fictício Demo</span>` : ""}
              ${u.hasGoogle ? `<span class="admin-badge google">G Google</span>` : ""}
              ${u.hasPassword ? `<span class="admin-badge pw">🔑 Senha</span>` : ""}
            </div>
            <div class="admin-user-sub">${esc(u.email)}${u.whatsappFull ? ` · ${esc(u.whatsappFull)}` : ""}${u.city ? ` · ${esc(u.city)}${u.state ? "/" + esc(u.state) : ""}` : ""}</div>
          </div>
        </div>
        <div class="admin-user-stats">
          <span class="pill">${u.ownTripsCount} própria(s)</span>
          ${u.sharedWithUserCount ? `<span class="pill">${u.sharedWithUserCount} compart.</span>` : ""}
          <span class="pill">${u.totalActivitiesCount} ativ.</span>
          <span class="muted small">Acesso: ${fmtDateTimeBR(u.lastLoginAt)}</span>
          <span class="btn ghost small">👁️ Abrir</span>
        </div>
      </div>`;
    }).join("")}</div>`;

    box.querySelectorAll("[data-adm-uid]").forEach(row => {
      row.onclick = () => openAdminUserModal(row.dataset.admUid);
      row.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openAdminUserModal(row.dataset.admUid); } };
    });
  } else if (adminSubTab === "trips") {
    const box = $("#adminTab-trips");
    const filtered = adminCache.trips.filter(t => {
      if (!q) return true;
      const hay = `${t.name} ${t.ownerName} ${t.ownerEmail}`.toLowerCase();
      return hay.includes(q);
    });
    if (!filtered.length) {
      box.innerHTML = `<p class="muted">Nenhuma viagem encontrada.</p>`;
      return;
    }
    box.innerHTML = `<div class="admin-mini-table-wrap"><table class="admin-mini-table">
      <thead><tr><th>Viagem</th><th>Proprietário</th><th>Período</th><th>Atividades</th><th>Km</th><th>Total Estimado</th><th>Compart.</th><th>Atualizado</th><th>Ações</th></tr></thead>
      <tbody>
        ${filtered.map(t => {
          const isProTrip = getTripMode(t) === "professional";
          const td = (isProTrip && window.MyPlanPro) ? window.MyPlanPro.migrateProState(t.data) : migrateState(t.data);
          const acts = [...(td.activities || [])].sort((a, b) => a.start.localeCompare(b.start));
          const spanTxt = acts.length ? `${fmtShortBR(acts[0].start)} – ${fmtShortBR(acts.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, acts[0].start))}` : "—";
          let kmTxt = "—", totTxt = "—";
          if (isProTrip && window.MyPlanPro) {
            const pt = window.MyPlanPro.computeProTotals(acts);
            totTxt = `+${money(pt.totalIncome)} / −${money(pt.totalExpense)}`;
          } else {
            const tot = computeSingleTripTotals(td);
            kmTxt = `${num(tot.km)} km`;
            totTxt = money(tot.grandTotal);
          }
          const mBadge = isProTrip ? `<span class="admin-badge admin">💼 Pro</span>` : `<span class="admin-badge">🌴 Pessoal</span>`;
          return `<tr>
            <td><b>${esc(t.name)}</b> ${mBadge} ${t.isDemoTrip ? `<span class="admin-badge demo">Demo</span>` : ""}</td>
            <td>${esc(t.ownerName)}<br><small class="muted">${esc(t.ownerEmail)}</small></td>
            <td>${spanTxt}</td>
            <td>${t.activitiesCount}</td>
            <td>${kmTxt}</td>
            <td><b>${totTxt}</b></td>
            <td>${t.sharesCount}</td>
            <td>${fmtDateTimeBR(t.updatedAt)}</td>
            <td>
              <div class="inline-actions">
                <button type="button" class="btn ghost small" data-adm-utrip="${esc(t.ownerId)}" data-adm-tid="${esc(t.id)}">👁️ Detalhes</button>
                <button type="button" class="btn ghost small" data-adm-ptrip="${esc(t.id)}">🖨️ PDF</button>
              </div>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table></div>`;

    box.querySelectorAll("[data-adm-utrip]").forEach(b => {
      b.onclick = () => openAdminUserModal(b.dataset.admUtrip, b.dataset.admTid);
    });
    box.querySelectorAll("[data-adm-ptrip]").forEach(b => {
      b.onclick = () => printAdminTripReport(b.dataset.admPtrip);
    });
  } else if (adminSubTab === "overlaps") {
    const box = $("#adminTab-overlaps");
    const ov = precomputedOv || getAdminGlobalOverlaps();
    const crossings = (ov.crossings || []).filter(cr => {
      if (!q) return true;
      const hay = `${cr.city} ${cr.A.trip.name} ${cr.A.trip.ownerName} ${cr.A.trip.ownerEmail} ${cr.B.trip.name} ${cr.B.trip.ownerName} ${cr.B.trip.ownerEmail}`.toLowerCase();
      return hay.includes(q);
    });
    if (!crossings.length) {
      box.innerHTML = `<p class="muted">Nenhuma sobreposição de cidade e data entre usuários diferentes encontrada ainda.</p>`;
      return;
    }
    const dark = isDarkTheme();
    const pairs = new Map();
    crossings.forEach(cr => {
      const pk = `${cr.A.trip.id}::${cr.B.trip.id}`;
      if (!pairs.has(pk)) pairs.set(pk, { A: cr.A, B: cr.B, items: [] });
      pairs.get(pk).items.push(cr);
    });

    let html = "";
    pairs.forEach(p => {
      const hasShared = adminCache.shares.some(s =>
        s.status === "accepted" &&
        ((s.tripId === p.A.trip.id && s.targetEmail === p.B.trip.ownerEmail) ||
         (s.tripId === p.B.trip.id && s.targetEmail === p.A.trip.ownerEmail))
      );
      html += `<div class="crossing-summary-box" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <strong>🤝 ${esc(p.A.trip.ownerName)} (${esc(p.A.trip.name)}) × ${esc(p.B.trip.ownerName)} (${esc(p.B.trip.name)})</strong>
          <span class="pill ${hasShared ? "ok" : ""}">${hasShared ? "✅ Viagem compartilhada entre eles" : "💡 Usuários sem compartilhamento mútuo ainda"}</span>
        </div>
        ${buildOverlapVisualPairHTML(p.A, p.B, p.items, dark)}
        <div class="crossing-trip-chips">
          ${p.items.map(cr => {
            const col = colorForCityStable(cr.city);
            return `<span class="crossing-city-pill" style="background:${dark ? col.darkBg : col.lightBg};border-color:${dark ? col.darkBd : col.lightBd};color:${dark ? col.darkTxt : col.lightTxt}">📍 ${esc(cr.city)} · ${fmtShortBR(cr.startIso)}${cr.endIso !== cr.startIso ? "–" + fmtShortBR(cr.endIso) : ""} (${cr.dates.length}d)</span>`;
          }).join("")}
        </div>
      </div>`;
    });
    box.innerHTML = html;
  } else if (adminSubTab === "shares") {
    const box = $("#adminTab-shares");
    const filtered = adminCache.shares.filter(s => {
      if (!q) return true;
      return `${s.tripName} ${s.ownerName} ${s.ownerEmail} ${s.targetEmail}`.toLowerCase().includes(q);
    });
    if (!filtered.length) {
      box.innerHTML = `<p class="muted">Nenhum compartilhamento registrado ainda.</p>`;
      return;
    }
    const stLbl = { accepted: "✅ Aceito", pending: "⏳ Pendente", declined: "❌ Recusado" };
    box.innerHTML = `<div class="admin-mini-table-wrap"><table class="admin-mini-table">
      <thead><tr><th>Viagem</th><th>Proprietário</th><th>Convidado</th><th>Permissão</th><th>Status</th><th>Data</th></tr></thead>
      <tbody>
        ${filtered.map(s => `<tr>
          <td><b>${esc(s.tripName)}</b></td>
          <td>${esc(s.ownerName)}<br><small class="muted">${esc(s.ownerEmail)}</small></td>
          <td>${esc(s.targetEmail)}</td>
          <td>${s.role === "viewer" ? "Só visualizar" : "Pode editar"}</td>
          <td>${stLbl[s.status] || esc(s.status)}</td>
          <td>${fmtDateTimeBR(s.createdAt)}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
  } else if (adminSubTab === "audit") {
    loadAndRenderAdminAudit(q);
  } else if (adminSubTab === "vault") {
    loadAndRenderAdminVault();
  }
}

async function loadAndRenderAdminAudit(q = "") {
  const box = $("#adminTab-audit");
  if (!box) return;
  box.innerHTML = `<p class="muted">⏳ Carregando trilha de auditoria...</p>`;
  try {
    const res = await window.FeriasApi.adminAudit(150);
    const logs = (res.logs || []).filter(item => {
      if (!q) return true;
      return `${item.action} ${item.email} ${item.ip} ${item.detail}`.toLowerCase().includes(q);
    });
    if (!logs.length) {
      box.innerHTML = `<p class="muted">Nenhum evento de auditoria encontrado.</p>`;
      return;
    }
    box.innerHTML = `<div class="admin-mini-table-wrap"><table class="admin-mini-table">
      <thead><tr><th>Data / Hora</th><th>Ação</th><th>Usuário / E-mail</th><th>IP</th><th>Detalhes</th></tr></thead>
      <tbody>
        ${logs.map(l => `<tr>
          <td>${fmtDateTimeBR(l.ts)}</td>
          <td><span class="admin-badge">${esc(l.action)}</span></td>
          <td>${esc(l.email || l.userId || "—")}</td>
          <td><code class="small">${esc(l.ip || "—")}</code></td>
          <td>${esc(l.detail || "—")}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
  } catch (err) {
    box.innerHTML = `<div class="auth-error">❌ ${esc(err.message || err)}</div>`;
  }
}

function srcBadgeHtml(src) {
  const map = {
    env: ["✅ Ativo no .env", "env"],
    vault: ["🔒 Cifrado AES-256-GCM", "vault"],
    default: ["🌐 ID Público Padrão", "default"],
    none: ["⚠️ Não configurado", "none"]
  };
  const [lbl, cls] = map[src] || map.none;
  return `<span class="admin-src-badge ${cls}">${lbl}</span>`;
}

async function loadAndRenderAdminVault() {
  const box = $("#adminTab-vault");
  if (!box) return;
  if (!adminCache?.isSuperAdmin) {
    box.innerHTML = `<div class="auth-error">Acesso exclusivo ao Super Admin principal.</div>`;
    return;
  }
  box.innerHTML = `<p class="muted">⏳ Carregando cofre criptografado (AES-256-GCM) e backups...</p>`;
  try {
    const [cfg, bkp] = await Promise.all([
      window.FeriasApi.adminGetSystemSettings(),
      window.FeriasApi.adminListBackups()
    ]);
    const s = cfg.settings || {};
    const src = cfg.sources || {};
    const backups = bkp.backups || [];
    const maskVal = (hasVal) => (hasVal ? "••••••••" : "");

    box.innerHTML = `
      <form id="adminVaultForm" style="display:grid;gap:14px">
        <div class="crossing-summary-box" style="padding:12px 14px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
            <strong>🔐 Cofre Global de Credenciais (Criptografia AES-256-GCM)</strong>
            <span class="pill ok">Chave externa: ${cfg.hasMasterKeyEnv ? "MASTER_KEY (.env)" : ".master.key (modo 0600)"}</span>
          </div>
          <p class="muted small" style="margin:0">As credenciais já definidas em <code>.env</code> permanecem preservadas com prioridade máxima. Campos secretos exibem <code>••••••••</code> para não expor nem sobrescrever chaves existentes.</p>
        </div>

        <div class="admin-vault-grid">
          <div class="admin-vault-card">
            <div class="admin-vault-head"><strong>🔑 Google OAuth (Login)</strong>${srcBadgeHtml(src.googleClientId)}</div>
            <div class="admin-vault-fields">
              <label>GOOGLE_CLIENT_ID (Público)
                <input type="text" id="vlt-googleClientId" value="${esc(s.googleClientId || "")}" placeholder="107598...apps.googleusercontent.com">
              </label>
              <label>GOOGLE_LOGIN_CLIENT_ID (Opcional separado)
                <input type="text" id="vlt-googleLoginClientId" value="${esc(s.googleLoginClientId || "")}" placeholder="Opcional">
              </label>
              <label>GOOGLE_CLIENT_SECRET ${s.hasGoogleClientSecret ? `(${esc(s.googleClientSecretHint || "Ativo")})` : ""}
                <input type="password" id="vlt-googleClientSecret" value="${s.vaultHasGoogleClientSecret ? "••••••••" : ""}" placeholder="${s.hasGoogleClientSecret ? "Configurado via .env (preservado)" : "GOCSPX-..."}">
              </label>
            </div>
          </div>

          <div class="admin-vault-card">
            <div class="admin-vault-head"><strong>✨ Gemini IA &amp; 🗺️ Google Maps</strong>${srcBadgeHtml(src.geminiKey === "env" || src.gmapsKey === "env" ? "env" : (src.geminiKey === "vault" || src.gmapsKey === "vault" ? "vault" : "none"))}</div>
            <div class="admin-vault-fields">
              <label>GEMINI_API_KEY ${s.hasGemini ? `(${esc(s.geminiHint || "Ativo")})` : ""}
                <input type="password" id="vlt-geminiKey" value="${s.vaultHasGemini ? "••••••••" : ""}" placeholder="${s.hasGemini ? "Ativo — digite apenas para trocar" : "AIza..."}">
              </label>
              <label>GOOGLE_MAPS_API_KEY ${s.hasMaps ? `(${esc(s.gmapsHint || "Ativo")})` : ""}
                <input type="password" id="vlt-gmapsKey" value="${s.vaultHasMaps ? "••••••••" : ""}" placeholder="${s.hasMaps ? "Ativo — digite apenas para trocar" : "AIza..."}">
              </label>
              <label>APP_BASE_URL (Links de reset de senha)
                <input type="url" id="vlt-appBaseUrl" value="${esc(s.appBaseUrl || "")}" placeholder="https://myplan.digitalinpulse.com.br">
              </label>
            </div>
          </div>

          <div class="admin-vault-card">
            <div class="admin-vault-head"><strong>📧 SMTP &amp; Resend (E-mail / Senha)</strong>${srcBadgeHtml(src.smtp === "env" || src.resend === "env" ? "env" : (src.smtp === "vault" || src.resend === "vault" ? "vault" : "none"))}</div>
            <div class="admin-vault-fields">
              <label>SMTP_HOST
                <input type="text" id="vlt-smtpHost" value="${esc(s.smtpHost || "")}" placeholder="smtp.gmail.com">
              </label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <label>SMTP_PORT<input type="number" id="vlt-smtpPort" value="${esc(s.smtpPort || "587")}"></label>
                <label>SMTP_SECURE
                  <select id="vlt-smtpSecure">
                    <option value="" ${!s.smtpSecure ? "selected" : ""}>Auto (STARTTLS)</option>
                    <option value="1" ${s.smtpSecure === "1" || s.smtpSecure === "true" ? "selected" : ""}>TLS Direto (465)</option>
                    <option value="0" ${s.smtpSecure === "0" || s.smtpSecure === "false" ? "selected" : ""}>Sem TLS</option>
                  </select>
                </label>
              </div>
              <label>SMTP_USER
                <input type="text" id="vlt-smtpUser" value="${esc(s.smtpUser || "")}" placeholder="seu@email.com">
              </label>
              <label>SMTP_PASS ${s.hasSmtpPass ? `(${esc(s.smtpPassHint || "Ativo")})` : ""}
                <input type="password" id="vlt-smtpPass" value="${s.vaultHasSmtpPass ? "••••••••" : ""}" placeholder="${s.hasSmtpPass ? "Ativo — digite apenas para trocar" : "Senha/App Password SMTP"}">
              </label>
              <label>SMTP_FROM
                <input type="text" id="vlt-smtpFrom" value="${esc(s.smtpFrom || "")}" placeholder="My Plan &lt;no-reply@...&gt;">
              </label>
              <label>RESEND_API_KEY (alternativa ao SMTP)
                <input type="password" id="vlt-resendApiKey" value="${s.vaultHasResend ? "••••••••" : ""}" placeholder="${s.hasResendApiKey ? "Ativo" : "re_..."}">
              </label>
            </div>
          </div>

          <div class="admin-vault-card">
            <div class="admin-vault-head"><strong>💳 Carteira do Google (Emissor Oficial do Sistema)</strong>${srcBadgeHtml(src.wallet)}</div>
            <div class="admin-vault-fields">
              <label>GOOGLE_WALLET_ISSUER_ID
                <input type="text" id="vlt-walletIssuerId" value="${esc(s.walletIssuerId || "")}" placeholder="3388000000012345678">
              </label>
              <label>GOOGLE_WALLET_SA_JSON ${s.hasWalletSaJson ? "(Chave ativa)" : ""}
                <textarea id="vlt-walletSaJson" rows="3" placeholder="${s.hasWalletSaJson ? "Service Account já configurada (cole novo JSON apenas para substituir)" : "Cole o JSON completo da Service Account"}"></textarea>
              </label>
            </div>
          </div>
        </div>

        <div class="inline-actions">
          <button type="submit" class="btn primary small">💾 Salvar Credenciais Criptografadas</button>
          <button type="button" class="btn ghost small" id="btnAdminTestSmtp">📩 Testar Envio de E-mail</button>
        </div>
      </form>

      <div class="admin-vault-card" style="margin-top:16px">
        <div class="admin-vault-head">
          <div>
            <strong>💾 Backups Compactados (.json.gz + SHA-256)</strong>
            <div class="muted small">Snapshots portáteis sem chave mestra (.master.key isolada em disco). Exclusivo Super Admin.</div>
          </div>
          <button type="button" class="btn primary small" id="btnAdminCreateBackup">➕ Gerar Backup Agora</button>
        </div>
        <div class="admin-backup-list">
          ${backups.length ? backups.map(b => `
            <div class="admin-backup-row">
              <div style="min-width:0">
                <b>${esc(b.filename)}</b>
                <div class="muted small">${fmtDateTimeBR(b.createdAt)} · ${fmtBytes(b.bytes)} · ${esc(b.reason)} · ${b.usersCount ?? "?"} usuários / ${b.tripsCount ?? "?"} viagens</div>
                ${b.sha256 ? `<div class="admin-backup-hash">SHA-256: ${esc(b.sha256)}</div>` : ""}
              </div>
              <a class="btn ghost small" href="${esc(window.FeriasApi.adminBackupDownloadHref(b.filename))}" download>⬇️ Baixar .gz</a>
            </div>
          `).join("") : `<p class="muted small">Nenhum backup gerado ainda.</p>`}
        </div>
      </div>
    `;

    $("#adminVaultForm").onsubmit = async e => {
      e.preventDefault();
      try {
        await window.FeriasApi.adminSaveSystemSettings({
          googleClientId: $("#vlt-googleClientId").value.trim(),
          googleLoginClientId: $("#vlt-googleLoginClientId").value.trim(),
          googleClientSecret: $("#vlt-googleClientSecret").value.trim(),
          geminiKey: $("#vlt-geminiKey").value.trim(),
          gmapsKey: $("#vlt-gmapsKey").value.trim(),
          appBaseUrl: $("#vlt-appBaseUrl").value.trim(),
          smtpHost: $("#vlt-smtpHost").value.trim(),
          smtpPort: $("#vlt-smtpPort").value.trim(),
          smtpSecure: $("#vlt-smtpSecure").value,
          smtpUser: $("#vlt-smtpUser").value.trim(),
          smtpPass: $("#vlt-smtpPass").value.trim(),
          smtpFrom: $("#vlt-smtpFrom").value.trim(),
          resendApiKey: $("#vlt-resendApiKey").value.trim(),
          walletIssuerId: $("#vlt-walletIssuerId").value.trim(),
          walletSaJson: $("#vlt-walletSaJson").value.trim()
        });
        toast("🔐 Credenciais salvas com criptografia AES-256-GCM!");
        await loadAndRenderAdminVault();
      } catch (err) { toast("❌ " + (err.message || err)); }
    };

    if ($("#btnAdminTestSmtp")) {
      $("#btnAdminTestSmtp").onclick = async () => {
        const dest = prompt("Enviar e-mail de teste para:", window.FeriasApi.getUser()?.email || "");
        if (!dest) return;
        try {
          const r = await window.FeriasApi.adminTestSmtp(dest.trim());
          toast(`📩 E-mail de teste enviado via ${r.transport} para ${r.to}!`);
        } catch (err) { toast("❌ " + (err.message || err)); }
      };
    }

    if ($("#btnAdminCreateBackup")) {
      $("#btnAdminCreateBackup").onclick = async () => {
        try {
          const r = await window.FeriasApi.adminCreateBackup();
          toast(`💾 Backup ${r.backup.filename} gerado (${fmtBytes(r.backup.bytes)})!`);
          await loadAndRenderAdminVault();
        } catch (err) { toast("❌ " + (err.message || err)); }
      };
    }
  } catch (err) {
    box.innerHTML = `<div class="auth-error">❌ ${esc(err.message || err)}</div>`;
  }
}

async function printAdminTripReport(tripId) {
  if (!adminCache) return;
  const tr = adminCache.trips.find(x => x.id === tripId);
  if (!tr) return toast("Planejamento não encontrado.");
  toast(`🖨️ Gerando relatório de "${tr.name}"...`);
  if (getTripMode(tr) === "professional" && window.MyPlanPro) {
    const td = window.MyPlanPro.migrateProState(tr.data);
    const acts = [...(td.activities || [])].sort((a, b) => a.start.localeCompare(b.start));
    const pt = window.MyPlanPro.computeProTotals(acts);
    const helpers = { ...reportHelpers(), getTypeInfo: t => window.MyPlanPro.getProTypeInfo(t) };
    await window.FeriasReport.printFullProReport(td, acts, pt, helpers);
    return;
  }
  const td = migrateState(tr.data);
  const acts = [...(td.activities || [])].sort((a, b) => a.start.localeCompare(b.start) || (a.type === "Viagem") - (b.type === "Viagem"));
  const tot = computeSingleTripTotals(td);
  const helpers = {
    ...reportHelpers(),
    calc: (a, kmL) => calc(a, kmL, td)
  };
  await window.FeriasReport.printFullTripReport(td, acts, tot, helpers, window.FeriasMaps ? window.FeriasMaps.getKey() : "");
}

async function openAdminUserModal(userId, focusTripId = null) {
  const modal = $("#adminUserModal");
  const body = $("#adminUserDetailBody");
  const titleEl = $("#adminUserModalTitle");
  if (!modal || !body) return;
  titleEl.textContent = "👤 Carregando dados do usuário...";
  body.innerHTML = `<p class="muted">⏳ Buscando perfil, viagens, finanças, checklist e anexos...</p>`;
  modal.showModal();

  try {
    const detail = await window.FeriasApi.adminGetUser(userId);
    const u = detail.user;
    const me = window.FeriasApi.getUser();
    const isSuper = Boolean(me?.isSuperAdmin);
    titleEl.textContent = `👤 ${u.name}`;

    // Sobreposições com as viagens do próprio admin logado
    let overlapHtml = "";
    const adminOwnTrips = (adminCache?.trips || []).filter(t => t.ownerId === me?.id).map(t => ({ ...t, role: "owner", isAdminGlobal: true, data: migrateState(t.data) }));
    const targetTrips = [...detail.ownTrips, ...detail.sharedTrips].map(t => ({
      ...t,
      ownerId: t.ownerId || u.id,
      ownerName: t.ownerName || u.name,
      ownerEmail: t.ownerEmail || u.email,
      isAdminGlobal: true,
      data: migrateState(t.data)
    }));
    if (adminOwnTrips.length && targetTrips.length && u.id !== me?.id) {
      const allForCheck = [...adminOwnTrips, ...targetTrips.map(t => ({ ...t, ownerId: u.id, ownerEmail: u.email }))];
      const ov = analyzeTripsCrossings(allForCheck, { requireDifferentOwners: true });
      const dark = isDarkTheme();
      if (ov.crossings.length) {
        const pairs = new Map();
        ov.crossings.forEach(cr => {
          const pk = `${cr.A.trip.id}::${cr.B.trip.id}`;
          if (!pairs.has(pk)) pairs.set(pk, { A: cr.A, B: cr.B, items: [] });
          pairs.get(pk).items.push(cr);
        });
        pairs.forEach(p => { overlapHtml += buildOverlapVisualPairHTML(p.A, p.B, p.items, dark); });
        overlapHtml += `<div class="crossing-trip-chips">${ov.crossings.map(cr => {
          const col = colorForCityStable(cr.city);
          return `<span class="crossing-city-pill" style="background:${dark ? col.darkBg : col.lightBg};border-color:${dark ? col.darkBd : col.lightBd};color:${dark ? col.darkTxt : col.lightTxt}">📍 ${esc(cr.city)}: ${fmtBR(cr.startIso)}${cr.endIso !== cr.startIso ? " até " + fmtBR(cr.endIso) : ""} (${cr.dates.length}d juntos)</span>`;
        }).join("")}</div>`;
      } else {
        overlapHtml = `<p class="muted small">Nenhuma data e cidade coincidente com as suas viagens no momento.</p>`;
      }
    }

    const renderTripCard = (tr, idx) => {
      const td = migrateState(tr.data);
      const acts = [...(td.activities || [])].sort((a, b) => a.start.localeCompare(b.start) || (a.type === "Viagem") - (b.type === "Viagem"));
      const tot = computeSingleTripTotals(td);
      const fin = computeSingleTripFinancialTimeline(td, acts, tot);
      const openAttr = (focusTripId ? tr.id === focusTripId : idx === 0) ? "open" : "";
      const roleLbl = tr.role === "owner" ? "👑 Proprietário" : `👥 Compartilhada (${tr.role === "viewer" ? "Só visualizar" : "Editor"} · ${tr.shareStatus || "accepted"})`;
      const recordsEntries = Object.entries(td.finance?.dailyRecords || {}).sort((a, b) => a[0].localeCompare(b[0]));

      return `
      <details class="admin-trip-card" ${openAttr}>
        <summary style="cursor:pointer;list-style:none">
          <div class="admin-trip-head">
            <div>
              <strong style="font-size:1rem;color:var(--text-strong)">✈️ ${esc(tr.name)}</strong>
              <div class="muted small">${roleLbl} · ${acts.length} atividade(s) · ${num(tot.km)} km · <b>Total ${money(tot.grandTotal)}</b></div>
            </div>
            <div class="inline-actions">
              <span class="pill">${fmtDateTimeBR(tr.updatedAt)}</span>
              <button type="button" class="btn ghost small" data-admu-print="${esc(tr.id)}">🖨️ Relatório A4</button>
            </div>
          </div>
        </summary>

        <div class="admin-kv-grid" style="margin-top:8px">
          <div class="admin-kv-item"><span>Veículo</span><b>${esc(td.vehicle.name)} (${esc(td.vehicle.powertrain)})</b></div>
          <div class="admin-kv-item"><span>Consumo / Combustível</span><b>${td.vehicle.hevKmL} km/L · ${money(td.vehicle.fuelPrice)}/L</b></div>
          <div class="admin-kv-item"><span>Elétrico (EV)</span><b>${td.vehicle.evRange} km · ${td.vehicle.kwhPerCharge} kWh · ${money(td.vehicle.kwhPrice)}/kWh</b></div>
          <div class="admin-kv-item"><span>Viajantes &amp; Orçamento</span><b>${td.params.travelers} viaj. · Hosp. ${money(td.params.lodgingPerNight)}/noite · Alim. ${money(td.params.dailyFoodPerPerson)}/dia</b></div>
          <div class="admin-kv-item"><span>Fixos &amp; Reserva</span><b>Fixos ${money(td.params.otherFixedBudget)} · Reserva ${td.params.contingencyPct}%</b></div>
          <div class="admin-kv-item"><span>Financeiro Real</span><b>Alvo ${money(fin.effectiveCeiling)} (Eco. ${money(fin.savingsGoal)}) · Executado ${money(fin.sumActualLogged)} (${fin.loggedCount}d)</b></div>
        </div>

        <strong style="font-size:0.84rem">📅 Atividades lançadas (${acts.length})</strong>
        ${acts.length ? `<div class="admin-mini-table-wrap"><table class="admin-mini-table">
          <thead><tr><th>Tipo</th><th>Datas</th><th>Atividade</th><th>Origem ➔ Destino</th><th>Km</th><th>Pedágio</th><th>Extras</th><th>Notas &amp; Anexos</th></tr></thead>
          <tbody>
            ${acts.map(a => {
              const atts = (tr.attachments || []).filter(at => at.activityId === a.id);
              return `<tr>
                <td>${esc(a.type)}</td>
                <td>${fmtShortBR(a.start)}${a.end && a.end !== a.start ? "–" + fmtShortBR(a.end) : ""}</td>
                <td><b>${esc(a.name)}</b></td>
                <td>${(a.from || a.to) ? esc(`${a.from || "?"} ➔ ${a.to || "?"}`) : "—"}</td>
                <td>${a.km ? num(a.km) + " km" : "—"}</td>
                <td>${a.toll ? money(a.toll) : "—"}</td>
                <td>${a.extraCost ? money(a.extraCost) : "—"}</td>
                <td>${esc(a.notes || "")}${atts.length ? `<br>${atts.map(at => `<a href="/api/attachments/${esc(at.id)}" target="_blank" rel="noopener" style="color:var(--accent2)">📎 ${esc(at.fileName)}</a>`).join(" · ")}` : ""}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table></div>` : `<p class="muted small">Sem atividades.</p>`}

        ${recordsEntries.length ? `
          <strong style="font-size:0.84rem">💳 Lançamentos Reais Diários (${recordsEntries.length} dias)</strong>
          <div class="admin-mini-table-wrap"><table class="admin-mini-table">
            <thead><tr><th>Data</th><th>Gasto Real</th><th>Observação</th></tr></thead>
            <tbody>${recordsEntries.map(([iso, r]) => `<tr><td>${fmtBR(iso)}</td><td><b>${money(r.spent || 0)}</b></td><td>${esc(r.note || "—")}</td></tr>`).join("")}</tbody>
          </table></div>` : ""}

        ${(td.checklist || []).length ? `
          <strong style="font-size:0.84rem">✅ Checklist (${td.checklist.filter(c => c.status === "Concluído").length}/${td.checklist.length} concluídos)</strong>
          <div class="admin-mini-table-wrap"><table class="admin-mini-table">
            <thead><tr><th>Categoria</th><th>Item</th><th>Prioridade</th><th>Status</th><th>Notas</th></tr></thead>
            <tbody>${td.checklist.map(c => `<tr><td>${esc(c.cat)}</td><td>${esc(c.item)}</td><td>${esc(c.prio)}</td><td>${esc(c.status)}</td><td>${esc(c.notes || "")}</td></tr>`).join("")}</tbody>
          </table></div>` : ""}

        ${(tr.shares || []).length ? `
          <strong style="font-size:0.84rem">🔗 Compartilhamentos desta viagem (${tr.shares.length})</strong>
          <div class="crossing-trip-chips">${tr.shares.map(sh => `<span class="pill">${esc(sh.targetEmail)} · ${sh.role} · ${sh.status}</span>`).join("")}</div>` : ""}
      </details>`;
    };

    const allUserTrips = [...detail.ownTrips, ...detail.sharedTrips];
    body.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${u.isSuperAdmin ? `<span class="admin-badge super">👑 Super Admin</span>` : (u.isAdmin ? `<span class="admin-badge admin">🛡️ Admin Delegado</span>` : `<span class="admin-badge">Viajante</span>`)}
          ${u.isDemo ? `<span class="admin-badge demo">🤖 Usuário Fictício Demo</span>` : ""}
          ${u.hasGoogle ? `<span class="admin-badge google">G Login Google</span>` : ""}
          ${u.hasPassword ? `<span class="admin-badge pw">🔑 Com Senha</span>` : `<span class="admin-badge">Sem senha (só Google)</span>`}
        </div>
        <div class="inline-actions">
          ${isSuper && !u.isSuperAdmin ? `
            <button type="button" class="btn ghost small" id="btnAdmModalDelegate">${u.isAdmin ? "🛡️ Revogar Admin" : "👑 Tornar Admin"}</button>
            ${u.id !== me?.id ? `<button type="button" class="btn danger-ghost small" id="btnAdmModalDeleteUser">🗑️ Excluir Usuário</button>` : ""}
          ` : ""}
        </div>
      </div>

      <div class="admin-kv-grid">
        <div class="admin-kv-item"><span>Nome completo</span><b>${esc(u.name)}</b></div>
        <div class="admin-kv-item"><span>E-mail</span><b>${esc(u.email)}</b></div>
        <div class="admin-kv-item"><span>ID da conta</span><b>${esc(u.id)}</b></div>
        <div class="admin-kv-item"><span>WhatsApp / Telefone</span><b>${esc(u.whatsappFull || "Não informado")}</b></div>
        <div class="admin-kv-item"><span>Idade / Documento</span><b>${esc(u.age || "—")} · ${esc(u.doc || "—")}</b></div>
        <div class="admin-kv-item"><span>Contato de emergência</span><b>${esc(u.emergencyContact || "—")}</b></div>
        <div class="admin-kv-item"><span>CEP / Cidade / UF</span><b>${esc(u.cep || "—")} · ${esc(u.city || "—")}${u.state ? "/" + esc(u.state) : ""}</b></div>
        <div class="admin-kv-item"><span>Endereço completo</span><b>${esc(u.address || "—")}</b></div>
        <div class="admin-kv-item"><span>Cadastro &amp; Último Acesso</span><b>${fmtDateTimeBR(u.createdAt)} · Último: ${fmtDateTimeBR(u.lastLoginAt)}</b></div>
        <div class="admin-kv-item"><span>Integrações</span><b>Gemini: ${u.integrations?.hasGemini ? esc(u.integrations.geminiHint || "Sim") : "Não"} · Maps: ${u.integrations?.hasMaps ? esc(u.integrations.gmapsHint || "Sim") : "Não"} · Wallet: ${u.integrations?.hasWallet ? "Sim" : "Não"}</b></div>
      </div>

      ${overlapHtml ? `<div class="crossing-summary-box"><strong>🔀 Coincidências / Overlap com as suas viagens</strong>${overlapHtml}</div>` : ""}

      <div class="admin-trips-wrap">
        <strong>🗺️ Todas as Viagens do Usuário (${allUserTrips.length})</strong>
        ${allUserTrips.length ? allUserTrips.map(renderTripCard).join("") : `<p class="muted small">Este usuário ainda não possui viagens cadastradas.</p>`}
      </div>
    `;

    body.querySelectorAll("[data-admu-print]").forEach(b => {
      b.onclick = () => printAdminTripReport(b.dataset.admuPrint);
    });
    if ($("#btnAdmModalDelegate")) {
      $("#btnAdmModalDelegate").onclick = async () => {
        try {
          await window.FeriasApi.adminSetDelegate(u.email, u.isAdmin ? "remove" : "add");
          toast(u.isAdmin ? `🛡️ Admin removido de ${u.email}.` : `👑 ${u.email} agora é Admin!`);
          await loadAndRenderAdmin();
          await openAdminUserModal(u.id, focusTripId);
        } catch (err) { toast("❌ " + (err.message || err)); }
      };
    }
    if ($("#btnAdmModalDeleteUser")) {
      $("#btnAdmModalDeleteUser").onclick = async () => {
        if (!confirm(`Excluir permanentemente a conta de "${u.name}" (${u.email}) e todas as suas viagens/anexos?`)) return;
        try {
          await window.FeriasApi.adminDeleteUser(u.id);
          modal.close();
          toast("🗑️ Usuário excluído.");
          await refreshTripsAndLoad();
          await loadAndRenderAdmin();
        } catch (err) { toast("❌ " + (err.message || err)); }
      };
    }
  } catch (err) {
    body.innerHTML = `<div class="auth-error">❌ ${esc(err.message || err)}</div>`;
  }
}

if ($("#btnMenuAdmin")) {
  $("#btnMenuAdmin").onclick = () => switchAppView("admin");
}
if ($("#btnAdminRefresh")) {
  $("#btnAdminRefresh").onclick = () => loadAndRenderAdmin();
}
if ($("#btnAdminSeedDemo")) {
  $("#btnAdminSeedDemo").onclick = async () => {
    try {
      await window.FeriasApi.adminSeedDemo();
      await refreshTripsAndLoad(activeTrip?.id);
      await loadAndRenderAdmin();
      toast("🌱 Usuário fictício + viagem com datas coincidentes criado e compartilhado!");
    } catch (err) { toast("❌ " + (err.message || err)); }
  };
}
if ($("#adminDelegateForm")) {
  $("#adminDelegateForm").onsubmit = async e => {
    e.preventDefault();
    const inp = $("#adminDelegateEmail");
    const email = inp.value.trim();
    if (!email) return;
    try {
      await window.FeriasApi.adminSetDelegate(email, "add");
      inp.value = "";
      toast(`👑 ${email} delegado(a) como Administrador!`);
      await loadAndRenderAdmin();
    } catch (err) { toast("❌ " + (err.message || err)); }
  };
}
if ($("#adminSubTabs")) {
  $("#adminSubTabs").querySelectorAll("button").forEach(b => {
    b.onclick = () => {
      adminSubTab = b.dataset.admtab || "users";
      $("#adminSubTabs").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
      renderAdminSubView();
    };
  });
}
if ($("#adminSearch")) $("#adminSearch").oninput = () => renderAdminSubView();
if ($("#adminUserTypeFilter")) $("#adminUserTypeFilter").onchange = () => renderAdminSubView();
if ($("#btnCloseAdminUser")) $("#btnCloseAdminUser").onclick = () => $("#adminUserModal").close();
if ($("#btnAdminUserDone")) $("#btnAdminUserDone").onclick = () => $("#adminUserModal").close();

$("#btnAdd").onclick = () => {
  if (appMode === "professional" && window.MyPlanPro) window.MyPlanPro.openProCardModal();
  else openModal();
};
if ($("#btnAddEventGantt")) $("#btnAddEventGantt").onclick = () => openModal();
$("#btnCloseX").onclick = $("#btnCancel").onclick = () => $("#modal").close();
$("#f-type").onchange = toggleTrip;

const syncStartDateInput = () => {
  if (isTravelType($("#f-type").value) && !$("#f-diffArrival")?.checked) {
    $("#f-end").value = $("#f-start").value;
  } else if (isTravelType($("#f-type").value) && $("#f-diffArrival")?.checked && $("#f-start").value) {
    $("#f-end").min = $("#f-start").value;
    if (!$("#f-end").value || $("#f-end").value < $("#f-start").value) {
      $("#f-end").value = $("#f-start").value;
    }
  }
  updateModalPreview();
};
$("#f-start").addEventListener("input", syncStartDateInput);
$("#f-start").addEventListener("change", syncStartDateInput);
if ($("#f-diffArrival")) {
  $("#f-diffArrival").addEventListener("change", () => {
    syncTravelArrivalUI();
    if ($("#f-diffArrival").checked && $("#f-end")) $("#f-end").focus();
    updateModalPreview();
  });
}
if ($("#btnClearActQr")) {
  $("#btnClearActQr").onclick = () => {
    modalQrPayload = "";
    modalQrFormat = "";
    renderModalQrBadge();
    prefetchModalWalletPass();
  };
}

$("#btnSwapRoute").onclick = () => {
  const f = $("#f-from").value;
  $("#f-from").value = $("#f-to").value;
  $("#f-to").value = f;
  if (acFromCtrl) acFromCtrl.clearSelected();
  if (acToCtrl) acToCtrl.clearSelected();
  lastRouteKey = "";
  maybeAutoComputeRoute(true);
};

$("#btnCalcMaps").onclick = () => computeModalRoute(true);
$("#btnSwapTransit").onclick = () => {
  const f = $("#f-transitFrom").value;
  $("#f-transitFrom").value = $("#f-transitTo").value;
  $("#f-transitTo").value = f;
  if (acTFromCtrl) acTFromCtrl.clearSelected();
  if (acTToCtrl) acTToCtrl.clearSelected();
  computeModalTransitRoute(true);
};
$("#btnCalcTransit").onclick = () => computeModalTransitRoute(true);
$("#btnAddTicketRow").onclick = () => {
  modalTickets.push({ label: "", qty: 1, unitPrice: "" });
  renderTicketRows();
  const rows = $$("#ticketsRows .ticket-row");
  const last = rows[rows.length - 1];
  if (last) last.querySelector('[data-tk="label"]')?.focus();
};
$("#f-includeRouteCost").onchange = updateModalPreview;
$("#f-from").addEventListener("blur", () => setTimeout(() => maybeAutoComputeRoute(false), 220));
$("#f-to").addEventListener("blur", () => setTimeout(() => maybeAutoComputeRoute(false), 220));
$("#f-drive").addEventListener("input", () => { applyAutoStopsToForm(false); updateModalPreview(); });
$("#f-stops").addEventListener("input", () => { stopsManualOverride = true; updateModalPreview(); });
$("#f-stopTime").addEventListener("input", () => { stopsManualOverride = true; updateModalPreview(); });
["#f-km", "#f-toll", "#f-charges", "#f-name", "#f-start", "#f-end", "#f-flightFrom", "#f-flightTo", "#f-transitFrom", "#f-transitTo", "#f-transitKm", "#f-transitDrive"].forEach(sel => {
  const el = $(sel);
  if (el) el.addEventListener("input", updateModalPreview);
});

$("#btnAutoStops").onclick = () => { stopsManualOverride = false; applyAutoStopsToForm(true); toast("⏱️ Paradas recalculadas!"); };

$("#btnAttachFile").onclick = () => $("#f-attachInput").click();
$("#f-attachInput").onchange = async e => {
  const files = [...e.target.files];
  if (!files.length) return;
  const loadEl = $("#f-attachLoading");
  const loadTxt = $("#f-attachLoadingText");
  const btn = $("#btnAttachFile");
  if (btn) btn.disabled = true;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      if (loadEl) loadEl.hidden = false;
      if (loadTxt) loadTxt.textContent = `Carregando arquivo "${file.name}" (${i + 1}/${files.length})...`;
      const att = await window.FeriasApi.uploadAttachment(activeTrip.id, modalDraftId, file);
      modalAttachments.push(att);
      renderModalAttachments();
      toast(`✅ "${file.name}" anexado!`);
    } catch (err) {
      toast("❌ " + err.message);
    }
  }
  if (loadEl) loadEl.hidden = true;
  if (btn) btn.disabled = false;
  e.target.value = "";
};

$("#btnAttachLink").onclick = () => {
  const url = prompt("Cole o link do documento / comprovante / ingresso (https://...):");
  if (!url || !url.trim()) return;
  const name = prompt("Nome do documento:", "Comprovante / Link") || "Documento";
  modalAttachments.push({ id: uid(), fileName: name.trim(), url: url.trim(), uploadedAt: Date.now() });
  renderModalAttachments();
};

const CALENDAR_CLIENT_ID_KEY = "ferias-pro-gcal-client-id";

function isLoginOnlyGoogleClientId(cid) {
  const clean = String(cid || "").trim();
  if (!clean) return false;
  const loginCid = String(window.FeriasApi?.getGoogleClientId?.() || "").trim();
  return clean === DEFAULT_GOOGLE_CLIENT_ID || (Boolean(loginCid) && clean === loginCid);
}

function getEffectiveCalendarClientId() {
  const explicit = String(
    (state.params && state.params.calendarGoogleClientId) ||
    localStorage.getItem(CALENDAR_CLIENT_ID_KEY) ||
    ""
  ).trim();
  if (explicit && !isLoginOnlyGoogleClientId(explicit)) return explicit;
  const legacy = String((state.params && state.params.googleClientId) || "").trim();
  return legacy && !isLoginOnlyGoogleClientId(legacy) ? legacy : "";
}

function setLocalCalendarClientId(cid) {
  const clean = String(cid || "").trim();
  if (clean && isLoginOnlyGoogleClientId(clean)) {
    toast("⚠️ Esse Client ID é exclusivo do Login Google e é bloqueado na Agenda sem verificação.");
    return false;
  }
  state.params.calendarGoogleClientId = clean;
  delete state.params.googleClientId;
  if (clean) localStorage.setItem(CALENDAR_CLIENT_ID_KEY, clean);
  else localStorage.removeItem(CALENDAR_CLIENT_ID_KEY);
  return true;
}

async function executeSmartCalendarSync() {
  const cid = getEffectiveCalendarClientId();
  const body = $("#calSyncBody");
  const btnNow = $("#btnCalSyncNow");
  const acts = (appMode === "professional" && window.MyPlanPro) ? window.MyPlanPro.getProSortedActivities() : sorted();
  const rem = state.params?.calendarReminderTime || "09:00";
  const tid = activeTrip?.id || "default";
  const calMode = appMode === "professional" ? "professional" : "personal";
  const calTitle = state.title || activeTrip?.name || "Planejamento";
  const dedicatedCalName = window.FeriasCalendar.getCalendarSummaryName
    ? window.FeriasCalendar.getCalendarSummaryName(calTitle, calMode)
    : `My Plan — ${calTitle}`;

  if (!cid) {
    btnNow.hidden = true;
    if (activeTrip?.role === "owner" && !activeTrip.calToken && window.FeriasApi?.rotateCalToken) {
      try {
        activeTrip.calToken = await window.FeriasApi.rotateCalToken(activeTrip.id);
      } catch {}
    }
    const feedUrl = activeTrip?.calToken ? window.FeriasApi.getCalendarFeedUrl(activeTrip.calToken) : "";
    const webcalUrl = feedUrl ? feedUrl.replace(/^https?:\/\//i, "webcal://") : "";
    const gcalSubscribeUrl = webcalUrl ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}` : "";
    const isLocalHost = location.hostname === "127.0.0.1" || location.hostname === "localhost";

    body.innerHTML = `
      ${feedUrl ? `
        <div class="gmaps-key-panel" style="margin-top:0">
          <strong>1️⃣ Assinar Calendário Exclusivo (${esc(dedicatedCalName)})</strong>
          <p class="muted small">Cada evento/projeto gera seu próprio calendário separado no Google Agenda (Pessoal ou Pro, incluindo itens compartilhados). <b>${acts.length}</b> atividade(s) com lembrete às <b>${esc(rem)}</b> na véspera.</p>
          <div class="key-actions-row">
            <a class="btn primary small" href="${esc(gcalSubscribeUrl)}" target="_blank" rel="noopener">📅 Assinar no Google Agenda</a>
            <a class="btn ghost small" href="${esc(webcalUrl)}">🍎 Assinar no iPhone / Mac</a>
            <button type="button" class="btn ghost small" id="btnCopyCalFeed">📋 Copiar link</button>
          </div>
          ${isLocalHost ? `<p class="muted small">💡 A assinatura automática por link webcal funciona no domínio público (<code>https://myplan.digitalinpulse.com.br</code>). Localmente, use o botão <b>Baixar .ics agora</b> abaixo.</p>` : `<p class="muted small">ℹ️ Ao assinar, este evento aparece como um calendário separado no seu Google Agenda sem misturar com outros planejamentos.</p>`}
        </div>
      ` : ""}

      <div class="gmaps-key-panel" style="margin-top:0">
        <strong>2️⃣ Importar / Atualizar em calendário separado (.ics inteligente)</strong>
        <p class="muted small">Baixe o arquivo <code>.ics</code> deste evento com todas as <b>${acts.length}</b> atividade(s). Dica: no Google Agenda, crie um calendário secundário para cada viagem/projeto caso prefira importar manualmente via arquivo.</p>
        <div class="key-actions-row">
          <a class="btn ghost small" href="https://calendar.google.com/calendar/u/0/r/settings/export" target="_blank" rel="noopener">📂 Abrir Importador do Google Agenda ↗</a>
        </div>
      </div>

      <details class="help-details">
        <summary>⚙️ Modo automático OAuth (cria calendário dedicado direto na conta)</summary>
        <div style="display:grid;gap:8px;margin-top:8px">
          <p class="muted small">Informe um <b>OAuth Client ID</b> com escopo <code>calendar</code> para criar/atualizar automaticamente o calendário exclusivo <b>${esc(dedicatedCalName)}</b> na sua conta Google e na de colaboradores:</p>
          <div class="key-input-row">
            <input type="text" id="calModalClientId" placeholder="Client ID verificado para Agenda..." style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:9px 11px;color:var(--text-strong);width:100%">
            <button type="button" class="btn primary small" id="btnModalConnectGcal">Ativar e Sincronizar</button>
          </div>
        </div>
      </details>`;

    const copyBtn = $("#btnCopyCalFeed");
    if (copyBtn && feedUrl) {
      copyBtn.onclick = async () => {
        try { await navigator.clipboard.writeText(feedUrl); toast("📋 Link do calendário copiado!"); }
        catch { prompt("Copie o link do calendário:", feedUrl); }
      };
    }
    const modalBtn = $("#btnModalConnectGcal");
    if (modalBtn) {
      modalBtn.onclick = () => {
        const val = ($("#calModalClientId")?.value || "").trim();
        if (!val) return toast("Cole um OAuth Client ID verificado do Google Agenda.");
        if (!setLocalCalendarClientId(val)) return;
        save();
        renderParams();
        executeSmartCalendarSync();
      };
    }
    return;
  }

  btnNow.hidden = false;
  btnNow.disabled = true;
  btnNow.textContent = "Sincronizando...";
  body.innerHTML = `<p>⏳ Abrindo autorização da sua conta Google e sincronizando <b>${acts.length}</b> item(ns) no calendário <b>${esc(dedicatedCalName)}</b>...</p>`;
  try {
    const res = await window.FeriasCalendar.smartSyncTrip(acts, calTitle, cid, rem, tid, true, calMode);
    body.innerHTML = `
      <p>✅ <b>Sincronização concluída</b> no calendário <b>${esc(res.calendarName || dedicatedCalName)}</b> (lembrete às <b>${esc(rem)}</b>):</p>
      <div class="cal-sync-stats">
        <div class="cal-stat"><b>${res.created}</b><span class="muted small">Criados</span></div>
        <div class="cal-stat"><b>${res.updated}</b><span class="muted small">Atualizados</span></div>
        <div class="cal-stat"><b>${res.deleted}</b><span class="muted small">Removidos</span></div>
        <div class="cal-stat"><b>${res.unchanged}</b><span class="muted small">Sem alteração</span></div>
      </div>
      <p class="muted small">Este evento possui calendário próprio separado no Google Agenda (Pessoal/Pro e compartilhamentos permanecem organizados).</p>`;
    btnNow.textContent = "🔄 Sincronizar Novamente";
    toast(`📅 ${res.calendarName || dedicatedCalName}: ${res.created} criados · ${res.updated} atualizados`);
  } catch (err) {
    body.innerHTML = `<div class="auth-error">❌ ${esc(err.message || err)}</div>
      <p class="muted small">Se o Google exibiu <b>Acesso bloqueado</b>, volte para o modo direto sem OAuth ou baixe o arquivo <code>.ics</code> abaixo.</p>
      <div class="key-actions-row" style="margin-top:8px">
        <button type="button" class="btn primary small" id="btnCalFallbackDirect">🔓 Voltar ao modo direto (sem bloqueio OAuth)</button>
      </div>`;
    const fb = $("#btnCalFallbackDirect");
    if (fb) {
      fb.onclick = () => {
        setLocalCalendarClientId("");
        save();
        renderParams();
        executeSmartCalendarSync();
      };
    }
    btnNow.textContent = "Tentar Novamente";
  } finally {
    btnNow.disabled = false;
  }
}

async function syncSingleActivityToCalendar(a, tripRefOpt = null) {
  const tr = tripRefOpt || editingTripRef || activeTrip;
  const tripMode = getTripMode(tr) === "professional" || appMode === "professional" ? "professional" : "personal";
  const tripName = tr?.data?.title || tr?.name || state.title || "My Plan";
  const tripId = tr?.id || activeTrip?.id || "default";
  const cid = getEffectiveCalendarClientId();
  const rem = tr?.data?.params?.calendarReminderTime || state.params?.calendarReminderTime || "09:00";
  if (!cid) {
    window.open(window.FeriasCalendar.buildGoogleCalendarTemplateUrl(a, tripName, tripMode), "_blank", "noopener");
    return toast(`📅 Abrindo no Google Agenda (${tripName})!`);
  }
  try {
    const res = await window.FeriasCalendar.syncSingleActivity(a, tripName, cid, rem, tripId, tripMode);
    toast(`📅 ${res.calendarName || tripName}: ${res.created ? "evento criado" : res.updated ? "evento atualizado" : "já sincronizado"}!`);
  } catch {
    window.open(window.FeriasCalendar.buildGoogleCalendarTemplateUrl(a, tripName, tripMode), "_blank", "noopener");
    toast("⚠️ Abrindo formulário direto no Google Agenda.");
  }
}

function openSmartCalendarModal() {
  const modal = $("#calSyncModal");
  modal.showModal();
  executeSmartCalendarSync();
}

if ($("#btnCalDirect")) {
  $("#btnCalDirect").onclick = async () => {
    updateModalPreview();
    const a = readForm();
    if (editing) a.id = editing;
    await syncSingleActivityToCalendar(a, editingTripRef || activeTrip);
  };
}
if ($("#btnHeadCal")) {
  $("#btnHeadCal").onclick = async () => {
    updateModalPreview();
    const a = readForm();
    if (!a.name) return toast("Preencha o nome da atividade primeiro.");
    if (editing) a.id = editing;
    const chosenId = $("#f-targetTrip")?.value;
    const tr = (chosenId && loadedTripsMap.get(chosenId)) || editingTripRef || activeTrip;
    await syncSingleActivityToCalendar(a, tr);
  };
}

if ($("#btnCalIcs")) {
  $("#btnCalIcs").onclick = () => {
    const a = readForm();
    if (editing) a.id = editing;
    window.FeriasCalendar.downloadIcs([a], a.name || state.title, state.params.calendarReminderTime, activeTrip?.id || "local", "personal");
    toast("📆 Arquivo .ics baixado (com lembrete na véspera)!");
  };
}

if ($("#btnSyncCalendarTop")) $("#btnSyncCalendarTop").onclick = openSmartCalendarModal;
$("#btnSyncAllCalendar").onclick = $("#btnMenuCalendarAll").onclick = openSmartCalendarModal;
$("#btnCloseCalSync").onclick = () => $("#calSyncModal").close();
$("#btnCalSyncIcs").onclick = $("#btnDownloadAllIcs").onclick = $("#btnExportIcs").onclick = () => {
  const list = (appMode === "professional" && window.MyPlanPro) ? window.MyPlanPro.getProSortedActivities() : sorted();
  window.FeriasCalendar.downloadIcs(list, state.title, state.params?.calendarReminderTime || "09:00", activeTrip?.id || "local", appMode);
  toast("📆 Agenda .ics inteligente baixada!");
};
$("#btnCalSyncNow").onclick = () => {
  const inp = $("#calModalClientId");
  if (inp && inp.value.trim()) {
    if (!setLocalCalendarClientId(inp.value.trim())) return;
    save();
    renderParams();
  }
  executeSmartCalendarSync();
};
$("#btnSaveCalClientId").onclick = () => {
  if (!setLocalCalendarClientId($("#calClientIdInput").value)) return;
  save("📅 Configuração da Google Agenda salva!");
};
if ($("#btnClearCalClientId")) {
  $("#btnClearCalClientId").onclick = () => {
    setLocalCalendarClientId("");
    if ($("#calClientIdInput")) $("#calClientIdInput").value = "";
    save("🔓 Modo direto da Google Agenda ativado (sem bloqueio OAuth)!");
  };
}

$("#btnModalSaveKey").onclick = () => {
  const val = $("#modalKeyInput").value.trim();
  if (!val) return toast("Cole uma chave válida.");
  const { needsReload } = window.FeriasMaps.setKey(val);
  save();
  updateModalMapsUI();
  renderParams();
  if (needsReload) { toast("Recarregando..."); setTimeout(() => location.reload(), 600); return; }
  computeModalRoute(true);
};

$("#form").onsubmit = async e => {
  e.preventDefault();
  const a = readForm();
  if (!a.name || !a.start) return;
  const sourceTrip = editingTripRef || activeTrip;
  const chosenMode = $("#f-targetMode")?.value === "professional" ? "professional" : "personal";
  const chosenId = $("#f-targetTrip")?.value;

  if (chosenMode === "professional") {
    if (editing && sourceTrip?.role === "viewer") {
      return toast("👁️ O evento de origem é somente leitura.");
    }
    const targetProTrip = await ensureTargetTripForMode(chosenId, "professional");
    if (!targetProTrip || targetProTrip.role === "viewer") {
      return toast("👁️ Projeto profissional destino é somente leitura.");
    }
    if (editing && sourceTrip?.data?.activities) {
      sourceTrip.data.activities = sourceTrip.data.activities.filter(x => x.id !== editing);
      saveTripRecord(sourceTrip, "", true);
    }
    const proCard = convertPersonalActivityToProCard({ ...a, id: editing || modalDraftId || uid() }, targetProTrip);
    if (!Array.isArray(targetProTrip.data.activities)) targetProTrip.data.activities = [];
    targetProTrip.data.activities.push(proCard);
    $("#modal").close();
    saveTripRecord(targetProTrip, `💼 Migrado para Profissional ("${targetProTrip.data.title || targetProTrip.name}")!`);
    return;
  }

  let targetTrip = sourceTrip;
  if (chosenId && chosenId !== sourceTrip?.id) {
    try {
      targetTrip = (await ensureTargetTripForMode(chosenId, "personal")) || sourceTrip;
    } catch {
      targetTrip = sourceTrip;
    }
  }
  if (targetTrip?.role === "viewer") {
    return toast("👁️ Evento compartilhado somente para visualização.");
  }
  const tgtData = targetTrip?.data || state;
  if (Array.isArray(a.tags) && a.tags.length) {
    const defaultsLower = new Set((window.DEFAULT_TAGS || ["Pessoal", "Profissional", "Férias", "Viagem"]).map(t => t.toLowerCase()));
    if (!Array.isArray(tgtData.customTags)) tgtData.customTags = [];
    a.tags.forEach(tg => {
      if (!defaultsLower.has(tg.toLowerCase()) && !tgtData.customTags.some(x => x.toLowerCase() === tg.toLowerCase())) {
        tgtData.customTags.push(tg);
      }
    });
  }
  const movedAcrossEvents = Boolean(editing && sourceTrip && targetTrip && sourceTrip.id !== targetTrip.id);
  if (movedAcrossEvents) {
    if (sourceTrip.role === "viewer") {
      return toast("👁️ O evento de origem é somente leitura.");
    }
    const srcActs = sourceTrip.data?.activities || [];
    const oldItem = srcActs.find(x => x.id === editing);
    sourceTrip.data.activities = srcActs.filter(x => x.id !== editing);
    const cloned = oldItem ? { ...oldItem, ...a, id: editing } : { id: editing, ...a };
    for (const k of ["from", "to", "km", "drive", "stops", "stopTime", "toll", "charges", "airline", "bookingRef", "includeRouteCost", "startTime", "qrPayload", "qrFormat", "tags"]) {
      if (!(k in a)) delete cloned[k];
    }
    tgtData.activities.push(cloned);
    $("#modal").close();
    saveTripRecord(sourceTrip, "", true);
    saveTripRecord(targetTrip, `📦 Atividade movida para "${tgtData.title || targetTrip.name}"`);
    return;
  }

  if (editing) {
    const o = tgtData.activities.find(x => x.id === editing);
    if (o) {
      for (const k of ["from", "to", "km", "drive", "stops", "stopTime", "toll", "charges", "airline", "bookingRef", "includeRouteCost", "startTime", "qrPayload", "qrFormat", "tags"]) delete o[k];
      Object.assign(o, a);
    }
  } else {
    tgtData.activities.push({ id: modalDraftId || uid(), ...a });
  }
  $("#modal").close();
  saveTripRecord(targetTrip, editing ? "✔️ Atividade atualizada" : "➕ Atividade adicionada");
};

$("#btnDelete").onclick = () => { const id = editing; $("#modal").close(); delActivity(id); };
$("#btnDuplicate").onclick = () => {
  const targetTrip = editingTripRef || activeTrip;
  if (targetTrip?.role === "viewer") return toast("👁️ Viagem compartilhada somente para visualização.");
  const tgtData = targetTrip?.data || state;
  const a = { id: uid(), ...readForm() };
  a.name += " (cópia)";
  tgtData.activities.push(a);
  $("#modal").close();
  saveTripRecord(targetTrip, "⧉ Duplicado");
};

// Gantt controls (Zoom -/+/Fit, Modo Semana <44%, Tela Cheia Real, Agenda Completa e Impressão WYSIWYG)
async function toggleUnifiedGanttMode(forceState = null) {
  const next = forceState === null ? !ganttUnifiedMode : Boolean(forceState);
  ganttUnifiedMode = next;
  if (!next) ganttConflictsOnly = false;
  if (next) {
    toast("🔀 Carregando todos os eventos Pessoais e Profissionais...");
    await ensureUnifiedTripsLoaded();
  }
  if ($("#btnGanttUnified")) $("#btnGanttUnified").setAttribute("aria-pressed", String(ganttUnifiedMode));
  if ($("#btnProGanttUnified")) $("#btnProGanttUnified").setAttribute("aria-pressed", String(ganttUnifiedMode));
  if (appMode === "professional" && window.MyPlanPro) {
    window.MyPlanPro.renderProGantt();
    window.MyPlanPro.renderProTimeline?.();
  } else {
    const s = sorted();
    renderGantt(s);
    renderTimeline(s);
  }
}

function updateGanttZoomReadout() {
  const btn = $("#btnGanttZoomReset");
  if (!btn) return;
  const pct = Math.round((ganttZoom / 50) * 100);
  btn.textContent = pct < 44 ? `${pct}% S` : `${pct}%`;
  btn.title = pct < 44 ? `Zoom ${pct}% (Modo Semanas do Ano)` : "Resetar zoom (100%)";
}

function stepGanttZoom(delta) {
  let idx = GANTT_ZOOM_STEPS.findIndex(v => v >= ganttZoom);
  if (idx < 0) idx = GANTT_ZOOM_STEPS.length - 1;
  const nextIdx = Math.max(0, Math.min(GANTT_ZOOM_STEPS.length - 1, idx + delta));
  const nextZoom = GANTT_ZOOM_STEPS[nextIdx];
  if (nextZoom === ganttZoom) return;
  const wrap = $("#ganttWrap");
  const nameW = ganttSlimRail ? 54 : (window.innerWidth < 720 ? 156 : (ganttZoom <= 4 ? 205 : 265));
  const oldUnitW = ganttZoom < 22 ? Math.max(12, Math.round(ganttZoom * 4.4)) / 7 : ganttZoom;
  const centerRatio = wrap ? Math.max(0, (wrap.scrollLeft + (wrap.clientWidth - nameW) / 2) / Math.max(1, oldUnitW)) : 0;
  ganttZoom = nextZoom;
  updateGanttZoomReadout();
  renderGantt(sorted());
  const newUnitW = ganttZoom < 22 ? Math.max(12, Math.round(ganttZoom * 4.4)) / 7 : ganttZoom;
  if (wrap && centerRatio > 0) {
    wrap.scrollLeft = Math.max(0, centerRatio * newUnitW - (wrap.clientWidth - nameW) / 2);
  }
}

function fitGanttZoom() {
  const s = ganttUnifiedMode ? getUnifiedFilteredItems().filtered : applyPersonalFilters(sorted());
  const wrap = $("#ganttWrap");
  if (!s.length || !wrap) return;
  const nameW = ganttSlimRail ? 54 : (window.innerWidth < 720 ? 156 : 265);
  const minTs = parseD(s[0].start).getTime() - 2 * DAY;
  const maxS = s.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, s[0].start);
  const n = Math.max(5, Math.round((parseD(maxS) - minTs) / DAY) + 6);
  const avail = Math.max(240, wrap.clientWidth - nameW - 24);
  ganttZoom = Math.max(2.5, Math.min(94, Math.floor((avail / n) * 10) / 10));
  updateGanttZoomReadout();
  renderGantt(sorted());
  wrap.scrollLeft = 0;
}

function positionFloatingMenu(menuEl, trigEl) {
  if (!menuEl || !trigEl) return;
  if (window.innerWidth <= 720) {
    const r = trigEl.getBoundingClientRect();
    const topPx = Math.max(8, Math.min(window.innerHeight - 160, Math.round(r.bottom + 6)));
    menuEl.style.top = `${topPx}px`;
  } else {
    menuEl.style.top = "";
  }
}

function closeAllUnifiedCalMenus() {
  unifiedCalMenuOpenBarId = null;
  document.querySelectorAll("[data-unif-cal-menu]").forEach(m => { m.hidden = true; });
  document.querySelectorAll("[data-unif-cal-trig]").forEach(t => t.setAttribute("aria-expanded", "false"));
}

function closeAllGanttPopovers(exceptPanel = null) {
  document.querySelectorAll(".gantt-pop-panel").forEach(panel => {
    if (exceptPanel && panel === exceptPanel) return;
    panel.hidden = true;
    const host = panel.closest(".gantt-pop-host");
    const trig = host?.querySelector(".gantt-pop-trigger");
    if (trig) trig.setAttribute("aria-expanded", "false");
  });
}

function setupGanttPopovers() {
  [
    ["#btnGanttFilterPop", "#ganttFilterPopPanel"],
    ["#btnGanttViewPop", "#ganttViewPopPanel"],
    ["#btnProBoardFilterPop", "#proBoardFilterPopPanel"],
    ["#btnProGanttFilterPop", "#proGanttFilterPopPanel"],
    ["#btnProGanttViewPop", "#proGanttViewPopPanel"],
    ["#btnProMapFilterPop", "#proMapFilterPopPanel"],
    ["#btnProTravelsFilterPop", "#proTravelsFilterPopPanel"],
    ["#btnProControlFilterPop", "#proControlFilterPopPanel"],
    ["#btnProDocsFilterPop", "#proDocsFilterPopPanel"],
    ["#btnProDashFilterPop", "#proDashFilterPopPanel"],
    ["#btnProFinFilterPop", "#proFinFilterPopPanel"],
    ["#btnProTableFilterPop", "#proTableFilterPopPanel"]
  ].forEach(([trigSel, panelSel]) => {
    const trig = $(trigSel);
    const panel = $(panelSel);
    if (!trig || !panel || trig.dataset.popBound) return;
    trig.dataset.popBound = "1";
    trig.onclick = ev => {
      ev.stopPropagation();
      const willOpen = panel.hidden;
      closeAllUnifiedCalMenus();
      closeAllGanttPopovers(willOpen ? panel : null);
      panel.hidden = !willOpen;
      trig.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (willOpen) positionFloatingMenu(panel, trig);
    };
  });
}
setupGanttPopovers();

document.addEventListener("click", ev => {
  if (!ev.target.closest(".gantt-pop-host")) closeAllGanttPopovers();
  if (!ev.target.closest(".unified-cal-host")) closeAllUnifiedCalMenus();
});

function setFullscreenBtnState(btnEl, active) {
  if (!btnEl) return;
  btnEl.setAttribute("aria-pressed", active ? "true" : "false");
  btnEl.innerHTML = active ? `⤡ <span>Sair</span>` : `⛶`;
  btnEl.title = active ? "Sair da tela cheia (Esc)" : "Ampliar Gantt em tela inteira";
}

let fsNativeActive = false;
function exitAnyGanttFullscreen(skipNativeExit = false) {
  const openCards = [...document.querySelectorAll(".gantt-card.is-fullscreen")];
  if (openCards.length) {
    openCards.forEach(c => c.classList.remove("is-fullscreen"));
    document.body.classList.remove("gantt-fullscreen-active");
    setFullscreenBtnState($("#btnGanttFullscreen"), false);
    setFullscreenBtnState($("#btnProGanttFullscreen"), false);
  }
  if (!skipNativeExit && document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }
  fsNativeActive = false;
}

function toggleGanttFullscreen(cardEl, btnEl, onChange) {
  if (!cardEl) return;
  closeAllGanttPopovers();
  const willEnter = !cardEl.classList.contains("is-fullscreen");
  exitAnyGanttFullscreen();
  if (willEnter) {
    cardEl.classList.add("is-fullscreen");
    document.body.classList.add("gantt-fullscreen-active");
    setFullscreenBtnState(btnEl, true);
    if (document.documentElement?.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => { fsNativeActive = true; }).catch(() => {});
    }
  }
  if (typeof onChange === "function") onChange();
}

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && fsNativeActive) {
    fsNativeActive = false;
    if (document.querySelector(".gantt-card.is-fullscreen")) {
      exitAnyGanttFullscreen(true);
      if (appMode === "professional" && window.MyPlanPro) window.MyPlanPro.renderProGantt();
      else renderGantt(sorted());
    }
  }
});

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  const hasOpenPop = Boolean(document.querySelector(".gantt-pop-panel:not([hidden]), [data-unif-cal-menu]:not([hidden])"));
  if (hasOpenPop) {
    closeAllGanttPopovers();
    closeAllUnifiedCalMenus();
    return;
  }
  if (document.querySelector(".gantt-card.is-fullscreen")) {
    exitAnyGanttFullscreen();
    if (appMode === "professional" && window.MyPlanPro) window.MyPlanPro.renderProGantt();
    else renderGantt(sorted());
  }
});

$("#ganttModeSeg").querySelectorAll("button").forEach(b => {
  b.onclick = () => {
    ganttMode = b.dataset.gmode;
    $("#ganttModeSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    closeAllGanttPopovers();
    const s = sorted();
    renderGantt(s);
    renderTimeline(s);
  };
});
if ($("#btnGanttUnified")) $("#btnGanttUnified").onclick = () => { closeAllGanttPopovers(); toggleUnifiedGanttMode(); };
if ($("#btnGanttZoomOut")) $("#btnGanttZoomOut").onclick = () => stepGanttZoom(-1);
if ($("#btnGanttZoomIn")) $("#btnGanttZoomIn").onclick = () => stepGanttZoom(1);
if ($("#btnGanttZoomReset")) {
  $("#btnGanttZoomReset").onclick = () => {
    ganttZoom = 50;
    updateGanttZoomReadout();
    renderGantt(sorted());
  };
}
if ($("#btnGanttFit")) $("#btnGanttFit").onclick = fitGanttZoom;
if ($("#btnGanttFullscreen")) {
  $("#btnGanttFullscreen").onclick = () => toggleGanttFullscreen($("#view-gantt .gantt-card"), $("#btnGanttFullscreen"), () => renderGantt(sorted()));
}
$("#btnGanttToday").onclick = () => {
  closeAllGanttPopovers();
  const wrap = $("#ganttWrap");
  const todayHead = wrap.querySelector(".g-head.today, .g-week-head.today");
  wrap.scrollTo({ left: todayHead ? Math.max(0, todayHead.offsetLeft - 180) : 0, behavior: "smooth" });
};

/* ---------- IMPRIMIR / EXPORTAR GANTT HORIZONTAL (CAPTURA WYSIWYG), TABELA & RELATÓRIO ---------- */
function reportHelpers() {
  return {
    parseD,
    fmtISO,
    fmtBR,
    fmtShortBR,
    days,
    hm,
    hmHuman,
    num,
    money,
    calc,
    getTypeInfo: t => {
      if (window.ACTIVITY_TYPES?.[t] && appMode !== "professional") return getTypeInfo(t);
      const legacy = window.PRO_LEGACY_TYPE_MAP?.[t] || t;
      if (window.MyPlanPro) {
        const allPro = window.MyPlanPro.getAllProTypes?.();
        if (allPro?.[legacy]) return allPro[legacy];
        if (window.PRO_ACTIVITY_TYPES?.[legacy]) return window.MyPlanPro.getProTypeInfo(legacy);
      }
      return getTypeInfo(t);
    },
    getIsoWeekInfo,
    getIsoWeekMonday,
    WD,
    MON_ABBR,
    MON_FULL,
    DAY
  };
}

function captureVisibleGanttSnapshot(wrapEl, filteredRows, opts = {}) {
  const rows = Array.isArray(filteredRows) ? filteredRows : [];
  const fullMinISO = rows.length ? rows[0].start : fmtISO(new Date());
  const fullMaxISO = rows.length ? rows.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, fullMinISO) : fullMinISO;

  if (!wrapEl) {
    return { visFromISO: fullMinISO, visToISO: fullMaxISO, fullMinISO, fullMaxISO, visibleRows: rows, filteredRows: rows, ...opts };
  }

  const wrapRect = wrapEl.getBoundingClientRect();
  const corner = wrapEl.querySelector(".g-corner");
  const cornerRight = corner ? corner.getBoundingClientRect().right : wrapRect.left;
  const leftBound = Math.max(wrapRect.left, cornerRight) - 2;
  const rightBound = wrapRect.right + 2;

  const isWeekMode = Boolean(opts.isWeekOnly || wrapEl.querySelector(".gantt.zoom-week-only"));
  const heads = [...wrapEl.querySelectorAll(isWeekMode ? ".g-week-head[data-date]" : ".g-head[data-date]")];
  const visibleHeads = wrapRect.width > 0
    ? heads.filter(h => {
        const r = h.getBoundingClientRect();
        return r.right > leftBound && r.left < rightBound;
      })
    : [];

  const visFromISO = visibleHeads.length ? visibleHeads[0].dataset.date : (heads[0]?.dataset.date || fullMinISO);
  const lastVis = visibleHeads.length ? visibleHeads[visibleHeads.length - 1] : heads[heads.length - 1];
  const visToISO = lastVis ? (lastVis.dataset.endDate || lastVis.dataset.date || fullMaxISO) : fullMaxISO;

  const headBottom = heads[0] ? heads[0].getBoundingClientRect().bottom : wrapRect.top;
  const topBound = Math.max(wrapRect.top, headBottom) - 4;
  const botBound = wrapRect.bottom + 4;
  const nameEls = [...wrapEl.querySelectorAll(".g-name[data-id]")];
  const visIds = new Set();
  if (wrapRect.height > 0) {
    nameEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom > topBound && r.top < botBound) visIds.add(el.dataset.id);
    });
  }
  const visibleRows = visIds.size ? rows.filter(a => visIds.has(a.id)) : rows;

  return {
    visFromISO,
    visToISO,
    fullMinISO,
    fullMaxISO,
    visibleRows,
    filteredRows: rows,
    isWeekOnly: isWeekMode,
    ...opts
  };
}

function openPrintGanttModal(wrapEl, filteredRows, opts = {}) {
  const snap = captureVisibleGanttSnapshot(wrapEl, filteredRows, opts);
  activeGanttPrintCtx = snap;

  $("#gp-from").value = snap.visFromISO;
  $("#gp-to").value = snap.visToISO;

  const zoomPct = Math.round(((snap.zoomPx || 50) / 50) * 100);
  const badge = $("#gpViewportBadge");
  if (badge) {
    badge.hidden = false;
    badge.innerHTML = `📸 <b>Captura exata da tela atual:</b> ${fmtBR(snap.visFromISO)} a ${fmtBR(snap.visToISO)} · <b>${snap.visibleRows.length}</b> de <b>${snap.filteredRows.length}</b> ${snap.isPro ? "cartões" : "itens"} visíveis · Zoom <b>${zoomPct}%${snap.isWeekOnly ? " (Semanal)" : ""}</b>`;
  }

  const onlyWrap = $("#gpOnlyVisibleRowsWrap");
  const onlyChk = $("#gpOnlyVisibleRows");
  const hasVertCrop = snap.visibleRows.length > 0 && snap.visibleRows.length < snap.filteredRows.length;
  if (onlyWrap && onlyChk) {
    onlyWrap.hidden = !hasVertCrop;
    onlyChk.checked = hasVertCrop;
  }

  const chipsEl = $("#gpQuickChips");
  const chips = [
    { lbl: `📸 Tela atual (${fmtShortBR(snap.visFromISO)}–${fmtShortBR(snap.visToISO)})`, from: snap.visFromISO, to: snap.visToISO },
    { lbl: `Tudo filtrado (${fmtShortBR(snap.fullMinISO)}–${fmtShortBR(snap.fullMaxISO)})`, from: snap.fullMinISO, to: snap.fullMaxISO }
  ];
  const startMs = parseD(snap.fullMinISO).getTime(), endMs = parseD(snap.fullMaxISO).getTime();
  const totalSpan = Math.round((endMs - startMs) / DAY) + 1;
  if (totalSpan > 10) {
    let idx = 1;
    for (let t0 = startMs; t0 <= endMs; t0 += 10 * DAY) {
      const f = fmtISO(new Date(t0 + 3600e3));
      const t = fmtISO(new Date(Math.min(endMs, t0 + 9 * DAY) + 3600e3));
      chips.push({ lbl: `Pág. ${idx++} (${fmtShortBR(f)}–${fmtShortBR(t)})`, from: f, to: t });
    }
  }
  chipsEl.innerHTML = chips.map((ch, i) => `<button type="button" class="btn ghost small" data-gpchip="${i}">${esc(ch.lbl)}</button>`).join("");
  chipsEl.querySelectorAll("[data-gpchip]").forEach(btn => {
    btn.onclick = () => {
      const c = chips[parseInt(btn.dataset.gpchip, 10)];
      if (c) { $("#gp-from").value = c.from; $("#gp-to").value = c.to; }
    };
  });
  $("#ganttPrintModal").showModal();
}

function buildPrintGanttParams(fromISO, toISO) {
  const ctx = activeGanttPrintCtx;
  if (!ctx) {
    const isPro = appMode === "professional";
    const rows = (isPro && window.MyPlanPro) ? window.MyPlanPro.getProSortedActivities() : sorted();
    return { rows, opts: { isPro } };
  }
  const useOnlyVis = Boolean($("#gpOnlyVisibleRowsWrap") && !$("#gpOnlyVisibleRowsWrap").hidden && $("#gpOnlyVisibleRows")?.checked);
  const rows = useOnlyVis ? ctx.visibleRows : ctx.filteredRows;
  let cityTrack = null;
  if (!ctx.isPro && !ctx.isUnified && !ctx.isWeekOnly && ctx.showCityRow && !isMultiTripMode()) {
    const dates = [];
    const minTs = parseD(fromISO).getTime();
    const maxTs = parseD(toISO).getTime();
    const nDays = Math.max(1, Math.min(366, Math.round((maxTs - minTs) / DAY) + 1));
    for (let i = 0; i < nDays; i++) {
      dates.push(fmtISO(new Date(minTs + i * DAY + 3600e3)));
    }
    cityTrack = computeDailyCityTimeline(state.activities || [], dates);
  }
  const unifiedLookup = ctx.isUnified
    ? rows.map(r => {
        const m = unifiedMetaMap.get(r);
        const c = unifiedConflictMap.get(r);
        return [r.id, { mode: m?.mode, tripName: m?.tripName, calColor: m?.calColor, conflict: Boolean(c) }];
      })
    : null;
  return {
    rows,
    opts: {
      isPro: Boolean(ctx.isPro),
      zoomPx: ctx.zoomPx,
      isWeekOnly: Boolean(ctx.isWeekOnly || (Number(ctx.zoomPx) > 0 && Number(ctx.zoomPx) < 22)),
      isUnified: Boolean(ctx.isUnified),
      unifiedLookup: unifiedLookup ? new Map(unifiedLookup) : null,
      slimRail: ctx.slimRail,
      colMap: ctx.colMap,
      showCityRow: Boolean(ctx.showCityRow && cityTrack?.spans?.length),
      cityTrack
    }
  };
}

$("#btnPrintGantt").onclick = () => {
  const filtered = ganttUnifiedMode ? getUnifiedFilteredItems().filtered : applyPersonalFilters(sorted());
  if (ganttMode === "timeline") {
    window.FeriasReport.printTimelinePdf(state, filtered, reportHelpers(), { isPro: false });
    return;
  }
  openPrintGanttModal($("#ganttWrap"), filtered, {
    isPro: false,
    isUnified: ganttUnifiedMode,
    isWeekOnly: ganttZoom < 22,
    zoomPx: ganttZoom,
    slimRail: ganttSlimRail,
    showCityRow: !isMultiTripMode() && !ganttUnifiedMode
  });
};
$("#btnCloseGanttPrint").onclick = () => $("#ganttPrintModal").close();
$("#btnGpImage").onclick = () => {
  const f = $("#gp-from").value, t = $("#gp-to").value;
  if (!f || !t) return toast("Selecione as datas.");
  const { rows, opts } = buildPrintGanttParams(f, t);
  const ok = window.FeriasReport.exportGanttImage(state, rows, f, t, reportHelpers(), opts);
  if (!ok) toast("Nenhuma atividade no intervalo selecionado.");
  else { $("#ganttPrintModal").close(); toast("🖼️ Imagem PNG horizontal baixada!"); }
};
$("#ganttPrintForm").onsubmit = async e => {
  e.preventDefault();
  const f = $("#gp-from").value, t = $("#gp-to").value;
  if (!f || !t) return;
  const { rows, opts } = buildPrintGanttParams(f, t);
  $("#ganttPrintModal").close();
  await window.FeriasReport.exportGanttPdf(state, rows, f, t, reportHelpers(), opts);
};

$("#btnTablePdf").onclick = () => {
  const q = ($("#search").value || "").toLowerCase();
  const rows = filterByTagSet(filterByTypeSet(sorted(), tableFilterTypes), tableFilterTags)
    .filter(a => !q || (label(a) + " " + (a.notes || "") + " " + (Array.isArray(a.tags) ? a.tags.join(" ") : "") + " " + (getActivityMeta(a)?.tripName || "")).toLowerCase().includes(q));
  window.FeriasReport.printTableLandscape(rows, state, totals(), reportHelpers());
};

$("#btnPrintReport").onclick = async () => {
  toast("🖨️ Gerando relatório completo...");
  if (appMode === "professional" && window.MyPlanPro) {
    const cards = window.MyPlanPro.getProSortedActivities();
    await window.FeriasReport.printFullProReport(state, cards, window.MyPlanPro.computeProTotals(cards), reportHelpers());
    return;
  }
  await window.FeriasReport.printFullTripReport(state, sorted(), totals(), reportHelpers(), window.FeriasMaps ? window.FeriasMaps.getKey() : "");
};

/* ---------- DASHBOARD QUICK ACTIONS & MAP ---------- */
$("#btnDashAddActivity").onclick = () => openModal();
$("#btnDashAddTicket").onclick = () => openModal({ type: "Ingresso" });
$("#btnTableAdd").onclick = () => openModal();

$("#btnRenderFullMap").onclick = async () => {
  const trips = sorted().filter(a => a.type === "Viagem" && a.from && a.to);
  if (!trips.length) return toast("Nenhuma viagem com origem/destino.");
  const pts = [];
  trips.forEach(a => { if (a.from && pts[pts.length - 1] !== a.from) pts.push(a.from); if (a.to && pts[pts.length - 1] !== a.to) pts.push(a.to); });
  if (pts.length < 2) return;
  const container = $("#dashboardMapContainer");
  container.hidden = false;
  container.innerHTML = `<div style="display:grid;place-items:center;height:100%" class="muted">⏳ Carregando rota completa no Google Maps...</div>`;
  try {
    const res = await window.FeriasMaps.computeTripRoute({
      origin: pts[0], destination: pts[pts.length - 1], intermediates: pts.slice(1, -1).slice(0, 23),
      params: state.params, vehicle: state.vehicle
    });
    await window.FeriasMaps.renderRouteOnMap(container, res.route, isDarkTheme());
  } catch (err) {
    container.innerHTML = `<div style="display:grid;place-items:center;height:100%;padding:16px" class="muted">❌ ${esc(err.message || err)}</div>`;
  }
};

/* ---------- PARÂMETROS: AUTOCOMPLETE VEÍCULO, IA VEÍCULO, INGRESSOS & CHAVES ---------- */
function setupVehicleCombobox() {
  const inp = $("#p-vehicleName");
  const list = $("#ac-vehicle");
  if (!inp || !list || !window.FeriasVehicles) return;

  const renderMatches = q => {
    const matches = window.FeriasVehicles.search(q, 24);
    if (!matches.length) {
      list.innerHTML = `<div class="ac-item" style="cursor:default">Nenhum no catálogo rápido — use <b>🌐 Explorar 1984–2026</b> abaixo ou <b>⚡ Preencher c/ IA</b>.</div>`;
      list.hidden = false;
      return;
    }
    list.innerHTML = matches.map(v => `
      <button type="button" class="ac-item" data-vid="${esc(v.id)}">
        <b>${esc(v.name)}</b> <span class="muted small">· ${esc(v.category || v.powertrain)} · ${v.hevKmL ? v.hevKmL + " km/L" : v.evRange + " km EV"}</span>
      </button>`).join("");
    list.hidden = false;
    list.querySelectorAll("[data-vid]").forEach(btn => {
      btn.onmousedown = ev => {
        ev.preventDefault();
        const item = matches.find(x => x.id === btn.dataset.vid);
        list.hidden = true;
        if (item) applyVehicleSpecToState(item, "catálogo auto");
      };
    });
  };

  inp.addEventListener("focus", () => renderMatches(inp.value));
  inp.addEventListener("input", () => renderMatches(inp.value));
  inp.addEventListener("blur", () => setTimeout(() => { list.hidden = true; }, 180));
}
setupVehicleCombobox();

function setupEpaVehicleBrowser() {
  const det = $("#epaBrowserDetails");
  const ySel = $("#epaYear"), mSel = $("#epaMake"), mdSel = $("#epaModel"), oSel = $("#epaOption");
  const btn = $("#btnApplyEpaVehicle"), st = $("#epaStatus");
  if (!det || !ySel) return;

  let loadedYears = false;
  const fillSelect = (sel, items, placeholder) => {
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      items.map(it => `<option value="${esc(it.value ?? it)}">${esc(it.text ?? it)}</option>`).join("");
  };

  det.addEventListener("toggle", () => {
    if (!det.open || loadedYears) return;
    loadedYears = true;
    const yrs = [];
    for (let y = 2026; y >= 1984; y--) yrs.push(String(y));
    fillSelect(ySel, yrs, "Ano...");
    ySel.value = "2024";
    ySel.dispatchEvent(new Event("change"));
  });

  ySel.onchange = async () => {
    fillSelect(mSel, [], "Carregando marcas...");
    fillSelect(mdSel, [], "Selecione a marca...");
    fillSelect(oSel, [], "Selecione o modelo...");
    try {
      const r = await window.FeriasApi.epaVehicles({ action: "makes", year: ySel.value });
      fillSelect(mSel, r.items || [], "Escolha a marca...");
      st.textContent = `${(r.items || []).length} marcas em ${ySel.value}`;
    } catch {
      fillSelect(mSel, [], "Sem acesso online ao catálogo EPA");
    }
  };

  mSel.onchange = async () => {
    if (!mSel.value) return;
    fillSelect(mdSel, [], "Carregando modelos...");
    fillSelect(oSel, [], "Selecione o modelo...");
    try {
      const r = await window.FeriasApi.epaVehicles({ action: "models", year: ySel.value, make: mSel.value });
      fillSelect(mdSel, r.items || [], "Escolha o modelo...");
      st.textContent = `${(r.items || []).length} modelos de ${mSel.value}`;
    } catch {}
  };

  mdSel.onchange = async () => {
    if (!mdSel.value) return;
    fillSelect(oSel, [], "Carregando versões...");
    try {
      const r = await window.FeriasApi.epaVehicles({ action: "options", year: ySel.value, make: mSel.value, model: mdSel.value });
      fillSelect(oSel, r.items || [], "Escolha motor/versão...");
      if ((r.items || []).length === 1) oSel.value = r.items[0].value;
    } catch {}
  };

  btn.onclick = async () => {
    const vid = oSel.value;
    if (!vid) return toast("Selecione Ano, Marca, Modelo e Versão.");
    st.textContent = "⏳ Buscando consumo oficial...";
    try {
      const r = await window.FeriasApi.epaVehicles({ action: "spec", id: vid });
      if (r.vehicle) {
        applyVehicleSpecToState(r.vehicle, "EPA 1984–2026");
        st.textContent = `✅ ${r.vehicle.name} aplicado!`;
      }
    } catch (err) {
      st.textContent = "❌ " + (err.message || err);
    }
  };
}
setupEpaVehicleBrowser();

$("#btnLookupVehicleAI").onclick = async () => {
  const model = $("#p-vehicleName").value.trim();
  if (!model) return toast("Digite o nome/modelo do carro primeiro.");
  const localMatch = window.FeriasVehicles ? window.FeriasVehicles.findExactOrBest(model) : null;
  if (localMatch && localMatch.name.toLowerCase().includes(model.toLowerCase())) {
    applyVehicleSpecToState(localMatch, "catálogo auto");
    return;
  }
  toast(`✨ Consultando Gemini AI sobre "${model}"...`);
  try {
    const spec = await window.FeriasApi.aiVehicleSpecs(model);
    applyVehicleSpecToState(spec, "Gemini IA");
  } catch (err) {
    if (localMatch) {
      applyVehicleSpecToState(localMatch, "aproximação catálogo");
    } else if (String(err.message).includes("GEMINI_NOT_CONFIGURED")) {
      toast("Configure sua Gemini API Key para consultar modelos fora do catálogo local.");
    } else {
      toast("❌ " + (err.message || err));
    }
  }
};

$("#paramTicketForm").onsubmit = e => {
  e.preventDefault();
  const type = $("#pt-type").value || "Ingresso";
  const name = $("#pt-name").value.trim();
  const start = $("#pt-start").value;
  const qty = Math.max(1, parseInt($("#pt-qty").value, 10) || 1);
  const unitPrice = parseFloat($("#pt-cost").value) || 0;
  const extraCost = Math.round(qty * unitPrice * 100) / 100;
  const notes = $("#pt-notes").value.trim();
  if (!name || !start) return;
  state.activities.push({
    id: uid(),
    type,
    name,
    start,
    end: start,
    tickets: unitPrice > 0 ? [{ label: "", qty, unitPrice }] : [],
    extraCost,
    notes,
    attachments: []
  });
  $("#pt-name").value = "";
  $("#pt-qty").value = "1";
  $("#pt-cost").value = "";
  $("#pt-notes").value = "";
  save(`🎟️ ${type} "${name}" adicionado ao Cronograma & Custos!`);
};

$("#p-planTitle").onchange = e => {
  state.title = e.target.value.trim() || "Férias";
  if (activeTrip) activeTrip.name = state.title;
  renderTripDropdown();
  save("⚙️ Nome da viagem atualizado");
};
$("#p-vehicleName").onchange = e => {
  const txt = e.target.value.trim() || "Veículo";
  state.vehicle.name = txt;
  save("⚙️ Modelo atualizado");
};
$("#p-powertrain").onchange = e => { state.vehicle.powertrain = e.target.value; save("⚙️ Motorização atualizada"); };

$("#btnSaveGeminiKey").onclick = async () => {
  const val = $("#geminiKeyInput").value.trim();
  if (!val) return toast("Cole sua Gemini API Key (AIza...).");
  try {
    await window.FeriasApi.saveIntegrations({ geminiKey: val });
    $("#geminiKeyInput").value = "";
    renderParams();
    toast("✨ Gemini API Key salva! IA ativada em todo o aplicativo.");
  } catch (err) {
    toast("❌ " + (err.message || err));
  }
};

$("#btnToggleKey").onclick = () => { const inp = $("#gmapsKeyInput"); inp.type = inp.type === "password" ? "text" : "password"; };
$("#btnSaveKey").onclick = async () => {
  const keyVal = $("#gmapsKeyInput").value.trim();
  const { saved, needsReload } = window.FeriasMaps.setKey(keyVal);
  if (window.FeriasApi.isServer() && window.FeriasApi.getUser()) {
    await window.FeriasApi.saveIntegrations({ gmapsKey: keyVal, clearMaps: !keyVal }).catch(() => {});
  }
  save();
  renderParams();
  renderDashboard(sorted(), totals());
  if (needsReload) { toast("Recarregando..."); setTimeout(() => location.reload(), 600); }
  else toast(saved ? "🔑 Chave salva e sincronizada!" : "Chave removida.");
};
$("#btnTestKey").onclick = async () => {
  const val = $("#gmapsKeyInput").value.trim();
  if (!val) return toast("Informe uma Google Maps API Key.");
  const { needsReload } = window.FeriasMaps.setKey(val);
  if (needsReload) { toast("Recarregando..."); setTimeout(() => location.reload(), 600); return; }
  toast("⚡ Testando Google Maps Routes API...");
  try {
    const r = await window.FeriasMaps.testApiKey(val);
    toast(`✅ Conexão OK! SP ➔ Campinas: ${r.km} km · ${hmHuman(r.driveMinutes)}`);
    save();
    renderParams();
  } catch (err) {
    toast(`❌ Falha na chave: ${err.message || err}`);
  }
};
$("#btnRecalcAllRoutes").onclick = recalcAllTripsWithMaps;
$("#btnReapplyStops").onclick = () => {
  let count = 0;
  state.activities.forEach(a => {
    if (a.type === "Viagem" && a.drive > 0) {
      const auto = computeAutoStops(a.drive);
      a.stops = auto.stops;
      a.stopTime = auto.stopTime;
      count++;
    }
  });
  save(`⏱️ Paradas reaplicadas em ${count} viagem(ns)!`);
};

/* ---------- CARTEIRA DO GOOGLE / PASSE POR ATIVIDADE ---------- */
function walletActSig(a) {
  return [
    a.id || "", a.type || "", a.name || "", a.start || "", a.end || "", a.startTime || "",
    a.extraCost || 0, a.airline || "", a.bookingRef || "", a.from || "", a.to || "", a.qrPayload || "", a.notes || ""
  ].join("|");
}

function prefetchWalletPassForActivity(a, tripTitle) {
  prefetchedPkpass = null;
  if (!a || !a.name || !window.FeriasApi || !window.FeriasApi.isServer() || !window.FeriasApi.createPkpassUrl) return;
  if (window.FeriasApi.getServerCaps && window.FeriasApi.getServerCaps().hasWallet) return;
  const sig = walletActSig(a);
  window.FeriasApi.createPkpassUrl(a, tripTitle || state.title)
    .then(pk => {
      if (pk && pk.pkpassUrl) prefetchedPkpass = { sig, pkpassUrl: pk.pkpassUrl, filename: pk.filename };
    })
    .catch(() => {});
}

function prefetchModalWalletPass() {
  const a = readForm();
  a.id = editing || modalDraftId || uid();
  prefetchWalletPassForActivity(a, state.title);
}

function triggerPkpassOpen(url, filename) {
  const fullUrl = new URL(url, window.location.origin).href;
  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  const link = document.createElement("a");
  link.href = fullUrl;
  if (!isIOS) link.download = filename || "passe_my_plan.pkpass";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => link.remove(), 1200);
}

async function setupSharePkpassButton(btn, pkpassUrl, filename, title) {
  if (!btn) return;
  btn.hidden = true;
  btn.onclick = null;
  if (typeof navigator.share !== "function" || typeof File !== "function") return;
  try {
    const probe = new File(["pk"], filename || "passe.pkpass", { type: "application/vnd.apple.pkpass" });
    if (navigator.canShare && !navigator.canShare({ files: [probe] })) return;
  } catch {
    return;
  }
  btn.hidden = false;
  btn.onclick = async () => {
    try {
      btn.disabled = true;
      const resp = await fetch(pkpassUrl, { credentials: "same-origin" });
      if (!resp.ok) throw new Error("Passe expirado. Gere novamente.");
      const blob = await resp.blob();
      const file = new File([blob], filename || "passe_my_plan.pkpass", { type: "application/vnd.apple.pkpass" });
      await navigator.share({ files: [file], title: title || "Carteira do Google — My Plan" });
    } catch (err) {
      if (err?.name !== "AbortError") toast("❌ " + (err.message || "Falha ao compartilhar o passe."));
    } finally {
      btn.disabled = false;
    }
  };
}

async function openWalletPassForCurrentActivity(actOpt = null, titleOpt = null) {
  const a = actOpt || readForm();
  if (!actOpt) {
    if (editing) a.id = editing;
    else a.id = modalDraftId || uid();
  }
  const tripTitle = titleOpt || state.title;
  if (!a.name) return toast("Preencha o título antes de adicionar à Carteira.");

  const modal = $("#walletModal");
  const body = $("#walletBody");
  const openBtn = $("#btnOpenGoogleWallet");
  const pkBtn = $("#btnDownloadPkpass");
  const shareBtn = $("#btnSharePkpass");
  openBtn.hidden = true;
  if (pkBtn) pkBtn.hidden = true;
  if (shareBtn) { shareBtn.hidden = true; shareBtn.onclick = null; }

  const sig = walletActSig(a);
  const hasServerWallet = Boolean(window.FeriasApi.getServerCaps && window.FeriasApi.getServerCaps().hasWallet);

  const showPkpassReady = async pk => {
    triggerPkpassOpen(pk.pkpassUrl, pk.filename);
    if (pkBtn) {
      pkBtn.href = pk.pkpassUrl;
      pkBtn.setAttribute("download", pk.filename || "passe_my_plan.pkpass");
      pkBtn.hidden = false;
    }
    await setupSharePkpassButton(shareBtn, pk.pkpassUrl, pk.filename, a.name);
    const qrMsg = a.qrPayload ? " com o <b>QR Code do bilhete</b> replicado" : "";
    body.innerHTML = `
      <p>✅ <b>Passe da Carteira do Google gerado${qrMsg}!</b> Toque em <b>Abrir</b> / <b>💳 Abrir na Carteira do Google</b> para adicionar.</p>`;
    window.FeriasReport.renderWalletPassCanvas($("#walletPassCanvas"), a, tripTitle, reportHelpers());
    modal.showModal();
  };

  if (!hasServerWallet && prefetchedPkpass && prefetchedPkpass.sig === sig) {
    const pk = prefetchedPkpass;
    prefetchedPkpass = null;
    await showPkpassReady(pk);
    prefetchWalletPassForActivity(a, tripTitle);
    return;
  }

  try {
    const res = await window.FeriasApi.signWalletPass(a, tripTitle);
    if (res.configured && res.saveUrl) {
      window.open(res.saveUrl, "_blank", "noopener");
      openBtn.href = res.saveUrl;
      openBtn.hidden = false;
      body.innerHTML = `<p>✅ <b>Carteira do Google aberta!</b> Confirme na tela do Google Wallet.</p>`;
      window.FeriasReport.renderWalletPassCanvas($("#walletPassCanvas"), a, tripTitle, reportHelpers());
      modal.showModal();
      return;
    }

    if (window.FeriasApi.isServer() && window.FeriasApi.createPkpassUrl) {
      const pk = await window.FeriasApi.createPkpassUrl(a, tripTitle);
      if (pk && pk.pkpassUrl) {
        await showPkpassReady(pk);
        return;
      }
    }

    body.innerHTML = `
      <p>📲 <b>Cartão pronto!</b> Salve o Passe QR abaixo (<b>⬇️ Salvar Passe QR</b>), abra o app <b>Carteira do Google</b> e toque em <b>"+ Adicionar à Carteira ➔ Foto"</b>.</p>`;
  } catch (err) {
    body.innerHTML = `<div class="auth-error">❌ ${esc(err.message || err)}</div>
      <p class="muted small">Você ainda pode salvar o cartão QR e importar direto pelo app Carteira do Google.</p>`;
  }
  window.FeriasReport.renderWalletPassCanvas($("#walletPassCanvas"), a, tripTitle, reportHelpers());
  modal.showModal();
}

async function openWalletPassDirect(act, tripTitle = "", triggerBtn = null) {
  const a = act || readForm();
  if (!a.id) a.id = editing || modalDraftId || uid();
  const title = tripTitle || state.title || "My Plan";
  if (!a.name) return toast("Preencha o título antes de adicionar à Carteira.");

  const sig = walletActSig(a);
  const hasServerWallet = Boolean(window.FeriasApi.getServerCaps && window.FeriasApi.getServerCaps().hasWallet);
  if (triggerBtn) triggerBtn.disabled = true;

  if (hasServerWallet) {
    let win = null;
    try { win = window.open("", "_blank"); } catch {}
    try {
      const res = await window.FeriasApi.signWalletPass(a, title);
      if (res.configured && res.saveUrl) {
        if (win && !win.closed) {
          win.location.href = res.saveUrl;
        } else {
          window.location.href = res.saveUrl;
        }
        toast("💳 Abrindo Carteira do Google diretamente...");
        if (triggerBtn) triggerBtn.disabled = false;
        return;
      }
    } catch {}
    if (win && !win.closed) { try { win.close(); } catch {} }
  } else if (prefetchedPkpass && prefetchedPkpass.sig === sig) {
    const pk = prefetchedPkpass;
    prefetchedPkpass = null;
    triggerPkpassOpen(pk.pkpassUrl, pk.filename);
    toast("💳 Passe aberto! Confirme na Carteira do Google.");
    prefetchWalletPassForActivity(a, title);
    if (triggerBtn) triggerBtn.disabled = false;
    return;
  } else if (window.FeriasApi.isServer() && window.FeriasApi.createPkpassUrl) {
    try {
      toast("💳 Abrindo Carteira do Google...");
      const pk = await window.FeriasApi.createPkpassUrl(a, title);
      if (pk && pk.pkpassUrl) {
        triggerPkpassOpen(pk.pkpassUrl, pk.filename);
        toast("💳 Passe pronto! Abra o arquivo para inserir na Carteira do Google.");
        if (triggerBtn) triggerBtn.disabled = false;
        return;
      }
    } catch {}
  }

  if (triggerBtn) triggerBtn.disabled = false;
  return openWalletPassForCurrentActivity(a, title);
}

if ($("#btnWalletDirect")) $("#btnWalletDirect").onclick = () => openWalletPassDirect();
if ($("#btnHeadWallet")) {
  $("#btnHeadWallet").onclick = () => {
    const a = readForm();
    if (editing) a.id = editing;
    else a.id = modalDraftId || uid();
    const chosenId = $("#f-targetTrip")?.value;
    const tr = (chosenId && loadedTripsMap.get(chosenId)) || editingTripRef || activeTrip;
    openWalletPassDirect(a, tr?.data?.title || tr?.name || state.title, $("#btnHeadWallet"));
  };
}
$("#btnCloseWallet").onclick = () => $("#walletModal").close();
$("#btnDownloadPassPng").onclick = () => {
  const c = $("#walletPassCanvas");
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = `passe_carteira_google_my_plan.png`;
  a.click();
  toast("🖼️ Passe QR salvo!");
};

/* ---------- IA GEMINI NA ATIVIDADE (IMAGEM / ÁUDIO / TEXTO — PREENCHIMENTO IMEDIATO) ---------- */
let actAiRecorder = null;
let actAiChunks = [];
let actAiRecTimer = null;
let actAiRecSec = 0;

function normalizeAiType(rawType) {
  const s = String(rawType || "").trim();
  if (!s) return "";
  if (window.ACTIVITY_TYPES && window.ACTIVITY_TYPES[s]) return s;
  const k = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(voo|aviao|aerea|aereo|flight|embarque)\b/.test(k)) return "Voo";
  if (/\b(navio|cruzeiro|barco|balsa|ferry|boat|ship)\b/.test(k)) return "Navio";
  if (/\b(trem|rail|train|metro|eurostar)\b/.test(k)) return "Trem";
  if (/\b(onibus|bus|rodoviaria|viacao)\b/.test(k)) return "Ônibus";
  if (/\b(carro|automovel|drive|rodoviario|viagem)\b/.test(k)) return "Viagem";
  if (/\b(hotel|hospedagem|pousada|resort|airbnb|hostel|estadia)\b/.test(k)) return "Hospedagem";
  if (/\b(ingresso|ticket|bilhete|entrada)\b/.test(k)) return "Ingresso";
  if (/\b(evento|jogo|show|concerto|festival|teatro)\b/.test(k)) return "Evento";
  if (/\b(passeio|parque|tour|excursao|atracao)\b/.test(k)) return "Passeio";
  if (/\b(restaurante|jantar|almoco|cafe|lazer|gastronomia)\b/.test(k)) return "Restaurante";
  if (/\b(periodo|permanencia)\b/.test(k)) return "Período";
  if (/\b(outro|other)\b/.test(k)) return "Outro";
  return "";
}

function normalizeAiDate(rawDate) {
  const s = String(rawDate || "").trim();
  if (!s) return { iso: "", time: "" };
  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s]+(\d{2}:\d{2}))?/);
  if (isoMatch) {
    return { iso: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`, time: isoMatch[4] || "" };
  }
  const brMatch = s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s+(\d{2}:\d{2}))?/);
  if (brMatch) {
    const dd = brMatch[1].padStart(2, "0");
    const mm = brMatch[2].padStart(2, "0");
    let yy = brMatch[3];
    if (yy.length === 2) yy = "20" + yy;
    return { iso: `${yy}-${mm}-${dd}`, time: brMatch[4] || "" };
  }
  return { iso: "", time: "" };
}

function parseAiNumber(val) {
  if (typeof val === "number") return isFinite(val) ? val : 0;
  let s = String(val ?? "").replace(/[^\d,.-]/g, "").trim();
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function normalizeExtractedActivity(raw) {
  let src = Array.isArray(raw) ? raw[0] : raw;
  if (src && typeof src === "object" && src.activity && typeof src.activity === "object") {
    src = src.activity;
  } else if (src && typeof src === "object" && Array.isArray(src.activities) && src.activities[0]) {
    src = src.activities[0];
  }
  if (!src || typeof src !== "object") return null;
  const st = normalizeAiDate(src.start);
  const en = normalizeAiDate(src.end);
  const tickets = Array.isArray(src.tickets)
    ? src.tickets.map(t => ({
        label: String(t?.label || "Tarifa").slice(0, 40),
        qty: Math.max(1, parseInt(t?.qty, 10) || 1),
        unitPrice: parseAiNumber(t?.unitPrice ?? t?.price ?? 0)
      })).filter(t => t.unitPrice > 0)
    : [];
  const startTimeRaw = String(src.startTime || st.time || "").trim().slice(0, 5);
  return {
    type: normalizeAiType(src.type),
    name: String(src.name || src.title || "").trim(),
    start: st.iso,
    end: en.iso,
    startTime: /^\d{2}:\d{2}$/.test(startTimeRaw) ? startTimeRaw : "",
    from: String(src.from || src.origin || "").trim(),
    to: String(src.to || src.destination || "").trim(),
    airline: String(src.airline || src.carrier || src.company || "").trim(),
    km: parseAiNumber(src.km),
    drive: parseAiNumber(src.drive),
    extraCost: parseAiNumber(src.extraCost ?? src.cost ?? src.price),
    tickets,
    bookingRef: String(src.bookingRef || src.locator || src.pnr || "").trim(),
    qrPayload: String(src.qrPayload || src.barcode || "").trim(),
    qrFormat: String(src.qrFormat || "").trim(),
    notes: String(src.notes || src.description || "").trim()
  };
}

function setActAiBusy(busy, msg = "", kind = "") {
  const btns = ["#btnActAiUpload", "#btnActAiAudio", "#btnActAiText", "#btnActAiTextRun", "#btnSave"];
  btns.forEach(sel => {
    const el = $(sel);
    if (el) el.disabled = Boolean(busy);
  });
  const st = $("#actAiStatus");
  if (!st) return;
  if (!msg) {
    st.hidden = true;
    st.className = "modal-ai-status";
    st.innerHTML = "";
    return;
  }
  st.hidden = false;
  st.className = `modal-ai-status${kind ? " is-" + kind : ""}`;
  st.innerHTML = kind === "loading"
    ? `<span class="ai-spinner" aria-hidden="true"></span><span>${esc(msg)}</span>`
    : `<span>${esc(msg)}</span>`;
}

function flashAiFilledFields(selectors) {
  selectors.forEach(sel => {
    const el = $(sel);
    if (!el) return;
    el.classList.remove("ai-filled-flash");
    void el.offsetWidth;
    el.classList.add("ai-filled-flash");
    setTimeout(() => el.classList.remove("ai-filled-flash"), 1600);
  });
}

function stopActAiRecording(silent = false) {
  clearInterval(actAiRecTimer);
  actAiRecTimer = null;
  const btn = $("#btnActAiAudio");
  if (btn) btn.textContent = "🎙️ Áudio";
  if (actAiRecorder && actAiRecorder.state === "recording") {
    if (silent) {
      actAiRecorder.onstop = () => {
        try { actAiRecorder.stream?.getTracks().forEach(t => t.stop()); } catch {}
      };
    }
    try { actAiRecorder.stop(); } catch {}
  }
}

async function detectBarcodeFromFile(fileOrBlob) {
  try {
    if (!fileOrBlob || !String(fileOrBlob.type || "").startsWith("image/")) return null;
    if (typeof window.BarcodeDetector !== "function" || typeof createImageBitmap !== "function") return null;
    const formats = ["qr_code", "aztec", "pdf417", "code_128"];
    const detector = new window.BarcodeDetector({ formats });
    const bmp = await createImageBitmap(fileOrBlob);
    try {
      const codes = await detector.detect(bmp);
      const hit = Array.isArray(codes) && codes.find(c => c && c.rawValue);
      if (hit) {
        return {
          rawValue: String(hit.rawValue).slice(0, 1200),
          format: String(hit.format || "qr_code")
        };
      }
    } finally {
      if (bmp && typeof bmp.close === "function") bmp.close();
    }
  } catch {}
  return null;
}

function applyExtractedActivityToForm(rawAct, detectedBarcode) {
  const act = normalizeExtractedActivity(rawAct);
  if (!act) return [];
  const touched = [];
  if (act.type && window.ACTIVITY_TYPES[act.type]) {
    $("#f-type").value = act.type;
    touched.push("#f-type");
  }
  const curType = $("#f-type").value;
  if (isTravelType(curType) && $("#f-diffArrival")) {
    $("#f-diffArrival").checked = Boolean(act.start && act.end && act.end !== act.start);
  }
  toggleTrip();
  if (act.name) {
    $("#f-name").value = act.name;
    touched.push("#f-name");
  } else if (act.from || act.to) {
    $("#f-name").value = `${getTypeInfo(curType).short} ${act.from || ""} - ${act.to || ""}`.trim();
    touched.push("#f-name");
  }
  if (act.start) { $("#f-start").value = act.start; touched.push("#f-start"); }
  if (act.end) {
    $("#f-end").value = act.end;
    touched.push("#f-end");
  } else if (isTravelType(curType) && act.start && !$("#f-diffArrival")?.checked) {
    $("#f-end").value = act.start;
  }
  syncTravelArrivalUI();

  if (act.tickets.length) {
    modalTickets = act.tickets;
    renderTicketRows();
    touched.push("#f-ticketsBox");
  } else if (act.extraCost > 0) {
    modalTickets = [{ label: curType === "Voo" ? "Passagem aérea" : (isTravelType(curType) ? "Passagem" : "IA"), qty: 1, unitPrice: act.extraCost }];
    renderTicketRows();
    touched.push("#f-ticketsBox");
  }

  if (curType === "Voo") {
    if (act.from) { $("#f-flightFrom").value = act.from; touched.push("#f-flightFrom"); }
    if (act.to) { $("#f-flightTo").value = act.to; touched.push("#f-flightTo"); }
    if (act.airline) { $("#f-airline").value = act.airline; touched.push("#f-airline"); }
    if (act.bookingRef) { $("#f-bookingRef").value = act.bookingRef; touched.push("#f-bookingRef"); }
  } else if (isTransitOrShip(curType)) {
    if (act.from) { $("#f-transitFrom").value = act.from; touched.push("#f-transitFrom"); }
    if (act.to) { $("#f-transitTo").value = act.to; touched.push("#f-transitTo"); }
    if (act.km > 0) { $("#f-transitKm").value = act.km; touched.push("#f-transitKm"); }
    if (act.drive > 0) { $("#f-transitDrive").value = hm(act.drive); touched.push("#f-transitDrive"); }
    if (act.airline) { $("#f-transitCarrier").value = act.airline; touched.push("#f-transitCarrier"); }
    if (act.bookingRef) { $("#f-transitRef").value = act.bookingRef; touched.push("#f-transitRef"); }
  } else if (curType === "Viagem") {
    if (act.from) { $("#f-from").value = act.from; touched.push("#f-from"); }
    if (act.to) { $("#f-to").value = act.to; touched.push("#f-to"); }
    if (act.km > 0) { $("#f-km").value = act.km; touched.push("#f-km"); }
    if (act.drive > 0) { $("#f-drive").value = hm(act.drive); touched.push("#f-drive"); }
  } else if (act.bookingRef) {
    $("#f-ticketRef").value = act.bookingRef;
    touched.push("#f-ticketRef");
  }

  modalStartTime = act.startTime || modalStartTime;
  const qrTxt = String(act.qrPayload || detectedBarcode?.rawValue || "").trim();
  if (qrTxt) {
    modalQrPayload = qrTxt.slice(0, 1200);
    modalQrFormat = String(act.qrFormat || detectedBarcode?.format || "qr_code");
  }
  renderModalQrBadge();

  if (act.notes) { $("#f-notes").value = act.notes; touched.push("#f-notes"); }
  updateModalPreview();
  prefetchModalWalletPass();
  flashAiFilledFields(touched);
  return touched;
}

function fileToBase64Obj(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const rawUrl = String(fr.result || "");
      const idx = rawUrl.indexOf("base64,");
      const cleanBase64 = idx !== -1 ? rawUrl.slice(idx + 7).replace(/\s+/g, "") : rawUrl;
      let cleanMime = String(file.type || "image/jpeg").split(";")[0].trim().toLowerCase();
      if (cleanMime === "audio/x-m4a") cleanMime = "audio/mp4";
      resolve({ fileName: file.name, mimeType: cleanMime || "application/octet-stream", dataBase64: cleanBase64 });
    };
    fr.onerror = () => reject(new Error("Erro ao ler arquivo."));
    fr.readAsDataURL(file);
  });
}

async function runActAiAnalyze({ prompt, media = [], detectedBarcode = null, loadingMsg = "Gemini IA analisando e preenchendo..." }) {
  setActAiBusy(true, loadingMsg, "loading");
  try {
    const act = await window.FeriasApi.aiAnalyzeActivity({
      prompt,
      baseDate: fmtISO(new Date()),
      media,
      detectedBarcode
    });
    const touched = applyExtractedActivityToForm(act, detectedBarcode);
    setActAiBusy(false);
    if (!touched.length) {
      setActAiBusy(false, "⚠️ Não foi possível identificar os campos desta entrada. Tente outra foto ou texto.", "error");
      return;
    }
    const qrNote = detectedBarcode || (act && act.qrPayload) ? " + QR Code" : "";
    setActAiBusy(false, `✅ Cartão preenchido automaticamente (${touched.length} campo(s)${qrNote})! Confira abaixo e salve quando quiser.`, "ok");
    if ($("#actAiTextRow")) $("#actAiTextRow").hidden = true;
  } catch (err) {
    setActAiBusy(false);
    const msg = String(err.message).includes("GEMINI_NOT_CONFIGURED")
      ? "Configure sua Gemini API Key em Parâmetros ou Planejar com IA."
      : (err.message || "Falha ao analisar com Gemini IA.");
    setActAiBusy(false, "❌ " + msg, "error");
  }
}

$("#btnActAiUpload").onclick = () => $("#actAiFile").click();
$("#actAiFile").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    setActAiBusy(true, `Lendo "${f.name}" com Gemini IA...`, "loading");
    const [m, detectedBarcode] = await Promise.all([fileToBase64Obj(f), detectBarcodeFromFile(f)]);
    await runActAiAnalyze({
      prompt: "Extraia todos os dados completos deste bilhete/passagem/reserva/áudio/documento (tipo, título, trecho, datas saída/chegada, cia/voo/navio, localizador, valor e QR Code).",
      media: [m],
      detectedBarcode,
      loadingMsg: `Preenchendo cartão a partir de "${f.name}"...`
    });
  } catch (err) {
    setActAiBusy(false, "❌ " + (err.message || err), "error");
  } finally {
    e.target.value = "";
  }
};

function pickSupportedAudioMime() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg"
  ];
  return candidates.find(m => MediaRecorder.isTypeSupported(m)) || "";
}

$("#btnActAiAudio").onclick = async () => {
  const btn = $("#btnActAiAudio");
  if (actAiRecorder && actAiRecorder.state === "recording") {
    stopActAiRecording(false);
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setActAiBusy(false, "Microfone indisponível neste navegador. Use 📷 Ler Imagem / Ticket (aceita áudio gravado) ou ✍️ Descrever.", "error");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    actAiChunks = [];
    const prefMime = pickSupportedAudioMime();
    actAiRecorder = prefMime ? new MediaRecorder(stream, { mimeType: prefMime }) : new MediaRecorder(stream);
    actAiRecorder.ondataavailable = ev => { if (ev.data.size > 0) actAiChunks.push(ev.data); };
    actAiRecorder.onstop = async () => {
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
      clearInterval(actAiRecTimer);
      btn.textContent = "🎙️ Áudio";
      const cleanMime = String(actAiRecorder.mimeType || prefMime || "audio/webm").split(";")[0].trim() || "audio/webm";
      const ext = cleanMime.includes("mp4") ? "m4a" : cleanMime.includes("ogg") ? "ogg" : "webm";
      const blob = new Blob(actAiChunks, { type: cleanMime });
      if (!blob.size || blob.size < 400) {
        setActAiBusy(false, "⚠️ Áudio muito curto ou mudo. Verifique o microfone.", "error");
        return;
      }
      const fileObj = await fileToBase64Obj(new File([blob], `atividade_${Date.now()}.${ext}`, { type: cleanMime }));
      await runActAiAnalyze({
        prompt: "Transcreva fielmente este áudio em português e extraia apenas os campos mencionados da atividade/passagem/viagem.",
        media: [fileObj],
        loadingMsg: "Transcrevendo áudio e preenchendo cartão..."
      });
    };
    actAiRecorder.start(250);
    actAiRecSec = 0;
    btn.textContent = "⏹️ Parar 0:00";
    setActAiBusy(false, "🎙️ Gravando áudio... fale sua atividade/viagem e toque em Parar para preencher automaticamente.", "loading");
    clearInterval(actAiRecTimer);
    actAiRecTimer = setInterval(() => {
      actAiRecSec++;
      const m = Math.floor(actAiRecSec / 60), s = actAiRecSec % 60;
      btn.textContent = `⏹️ Parar ${m}:${String(s).padStart(2, "0")}`;
    }, 1000);
  } catch (err) {
    setActAiBusy(false, "Permissão de microfone negada ou indisponível: " + (err.message || err), "error");
  }
};

$("#btnActAiText").onclick = () => {
  const row = $("#actAiTextRow");
  if (!row) return;
  row.hidden = !row.hidden;
  if (!row.hidden && $("#actAiTextInput")) $("#actAiTextInput").focus();
};

const runInlineTextFill = async () => {
  const txt = ($("#actAiTextInput")?.value || "").trim();
  if (!txt) {
    setActAiBusy(false, "Digite uma descrição rápida acima (ex: Voo LATAM Brasília para Maceió dia 15/01/2027 R$ 1.850).", "error");
    return;
  }
  await runActAiAnalyze({ prompt: txt, media: [], loadingMsg: "Extraindo informações com Gemini IA..." });
};
if ($("#btnActAiTextRun")) $("#btnActAiTextRun").onclick = runInlineTextFill;
if ($("#actAiTextInput")) {
  $("#actAiTextInput").addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      runInlineTextFill();
    }
  });
}
if ($("#modal")) {
  $("#modal").addEventListener("close", () => stopActAiRecording(true));
}

/* ---------- MODAL PLANEJAR COM IA (ÁUDIO TRANSCRITO + MÚLTIPLAS IMAGENS + DOCUMENTOS) ---------- */
let aiAttachedMedia = [];
let aiMediaRecorder = null;
let aiAudioChunks = [];
let aiRecordTimerInt = null;
let aiRecordSec = 0;
let aiAudioCtx = null;
let aiMicRaf = null;
let aiRecPeakRms = 0;
let aiAudioPreviewUrl = "";
let aiPendingAudioPromise = null;
let aiAudioStopResolve = null;

function stopAiMicMeter() {
  if (aiMicRaf) { cancelAnimationFrame(aiMicRaf); aiMicRaf = null; }
  if (aiAudioCtx) { try { aiAudioCtx.close(); } catch {} aiAudioCtx = null; }
  const meter = $("#aiMicMeter"), wrap = $("#aiMicMeterWrap");
  if (meter) meter.style.width = "0%";
  if (wrap) wrap.hidden = true;
}

function resetAiAudioUi() {
  stopAiMicMeter();
  if (aiAudioPreviewUrl) { try { URL.revokeObjectURL(aiAudioPreviewUrl); } catch {} aiAudioPreviewUrl = ""; }
  if ($("#aiAudioPreviewBox")) { $("#aiAudioPreviewBox").hidden = true; $("#aiAudioPreviewBox").innerHTML = ""; }
  if ($("#aiTranscriptBox")) { $("#aiTranscriptBox").hidden = true; $("#aiTranscriptBox").className = "ai-transcript-box"; $("#aiTranscriptBox").innerHTML = ""; }
  if ($("#aiRecordTimer")) $("#aiRecordTimer").hidden = true;
  if ($("#btnAiRecordAudio")) $("#btnAiRecordAudio").textContent = "🎙️ Gravar Áudio";
  clearInterval(aiRecordTimerInt);
}

function renderAiMediaList() {
  const box = $("#aiMediaList");
  if (!box) return;
  if (!aiAttachedMedia.length) {
    box.innerHTML = `<div class="muted small">Nenhum áudio ou imagem anexado ainda.</div>`;
    return;
  }
  box.innerHTML = aiAttachedMedia.map((m, idx) => `
    <div class="attach-item">
      <span>${m.mimeType.startsWith("audio/") ? "🎙️" : "🖼️"} <b>${esc(m.fileName)}</b> <small class="muted">(${esc(m.mimeType)})</small></span>
      <button type="button" class="icon-btn" data-aimdel="${idx}" title="Remover">🗑️</button>
    </div>`).join("");
  box.querySelectorAll("[data-aimdel]").forEach(b => {
    b.onclick = () => { aiAttachedMedia.splice(parseInt(b.dataset.aimdel, 10), 1); renderAiMediaList(); };
  });
}

function openAiPlanModal() {
  aiAttachedMedia = [];
  aiPendingAudioPromise = null;
  resetAiAudioUi();
  $("#aiPromptText").value = "";
  $("#aiPlanStatus").innerHTML = "";
  const isPro = appMode === "professional";
  const modal = $("#aiPlanModal");
  const h2 = modal?.querySelector(".modal-head h2");
  const desc = modal?.querySelector(".ai-plan-body > p");
  const runBtn = $("#btnRunAiPlan");
  if (h2) h2.textContent = isPro ? "✨ Estruturar Projeto Profissional com IA (Gemini)" : "✨ Planejar Viagem com IA (Gemini)";
  if (desc) desc.textContent = isPro
    ? "Fale por áudio (com transcrição automática na tela para conferência), envie prints de e-mails/propostas ou descreva seu projeto."
    : "Fale por áudio (com transcrição automática na tela para você confirmar), envie fotos de voos/ingressos/carro ou descreva sua viagem.";
  if ($("#aiPromptText")) {
    $("#aiPromptText").placeholder = isPro
      ? "Ex: Projeto Lançamento E-commerce em dezembro: kickoff dia 03, desenvolvimento até dia 18, viagem para SP dias 10 e 11, recebimento R$ 12.000 dia 20..."
      : "Ex: Vou viajar de 10 a 20 de julho de 2027 com 4 pessoas de Brasília para Gramado usando um Haval H6 PHEV, depois pego voo para Porto Alegre e vou ao Beto Carrero...";
  }
  if (runBtn) runBtn.textContent = isPro ? "✨ Criar Projeto com IA" : "✨ Criar Viagem com IA";
  const caps = window.FeriasApi.getServerCaps ? window.FeriasApi.getServerCaps() : { hasGemini: false };
  $("#aiKeyInlineBox").hidden = caps.hasGemini;
  renderAiMediaList();
  modal.showModal();
}

$("#btnAiPlan").onclick = $("#btnMenuAiPlan").onclick = openAiPlanModal;
$("#btnCloseAiPlan").onclick = $("#btnCancelAiPlan").onclick = () => {
  if (aiMediaRecorder && aiMediaRecorder.state === "recording") {
    try { aiMediaRecorder.stop(); } catch {}
  }
  resetAiAudioUi();
  $("#aiPlanModal").close();
};

$("#btnSaveInlineGemini").onclick = async () => {
  const val = $("#aiInlineKeyInput").value.trim();
  if (!val) return toast("Cole sua Gemini API Key.");
  try {
    await window.FeriasApi.saveIntegrations({ geminiKey: val });
    $("#aiInlineKeyInput").value = "";
    $("#aiKeyInlineBox").hidden = true;
    renderParams();
    toast("✨ Gemini IA ativada em todo o aplicativo!");
  } catch (err) {
    toast("❌ " + (err.message || err));
  }
};

$("#btnAiUploadMedia").onclick = () => $("#aiMediaInput").click();
$("#aiMediaInput").onchange = async e => {
  for (const f of [...e.target.files]) {
    try {
      const obj = await fileToBase64Obj(f);
      const bc = await detectBarcodeFromFile(f);
      if (bc) obj.detectedBarcode = bc;
      aiAttachedMedia.push(obj);
    } catch {}
  }
  renderAiMediaList();
  e.target.value = "";
};

$("#btnAiRecordAudio").onclick = async () => {
  const btn = $("#btnAiRecordAudio");
  const timerEl = $("#aiRecordTimer");
  if (aiMediaRecorder && aiMediaRecorder.state === "recording") {
    aiMediaRecorder.stop();
    btn.textContent = "🎙️ Gravar Áudio";
    clearInterval(aiRecordTimerInt);
    timerEl.hidden = true;
    stopAiMicMeter();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return toast("Seu navegador não liberou gravação de microfone aqui. Use Anexar Áudio ou descreva em texto.");
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    aiAudioChunks = [];
    aiRecPeakRms = 0;

    // Medidor ao vivo de volume do microfone para garantir captação real
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        aiAudioCtx = new Ctx();
        const src = aiAudioCtx.createMediaStreamSource(stream);
        const analyser = aiAudioCtx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const dataArr = new Uint8Array(analyser.fftSize);
        if ($("#aiMicMeterWrap")) $("#aiMicMeterWrap").hidden = false;
        const tickMeter = () => {
          analyser.getByteTimeDomainData(dataArr);
          let sum = 0;
          for (let i = 0; i < dataArr.length; i++) {
            const v = (dataArr[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArr.length);
          if (rms > aiRecPeakRms) aiRecPeakRms = rms;
          const pct = Math.min(100, Math.round(rms * 450));
          if ($("#aiMicMeter")) $("#aiMicMeter").style.width = `${pct}%`;
          aiMicRaf = requestAnimationFrame(tickMeter);
        };
        tickMeter();
      }
    } catch {}

    const prefMime = pickSupportedAudioMime();
    aiMediaRecorder = prefMime ? new MediaRecorder(stream, { mimeType: prefMime }) : new MediaRecorder(stream);
    aiMediaRecorder.ondataavailable = ev => { if (ev.data.size > 0) aiAudioChunks.push(ev.data); };
    aiPendingAudioPromise = new Promise(resolve => { aiAudioStopResolve = resolve; });

    aiMediaRecorder.onstop = async () => {
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
      clearInterval(aiRecordTimerInt);
      stopAiMicMeter();
      timerEl.hidden = true;
      btn.textContent = "🎙️ Gravar Áudio";

      const cleanMime = String(aiMediaRecorder.mimeType || prefMime || "audio/webm").split(";")[0].trim() || "audio/webm";
      const ext = cleanMime.includes("mp4") ? "m4a" : cleanMime.includes("ogg") ? "ogg" : "webm";
      const blob = new Blob(aiAudioChunks, { type: cleanMime });

      if (aiAudioPreviewUrl) { try { URL.revokeObjectURL(aiAudioPreviewUrl); } catch {} }
      aiAudioPreviewUrl = URL.createObjectURL(blob);
      const prevBox = $("#aiAudioPreviewBox");
      if (prevBox) {
        prevBox.hidden = false;
        prevBox.innerHTML = `<audio controls src="${aiAudioPreviewUrl}"></audio>`;
      }

      const trBox = $("#aiTranscriptBox");
      if (blob.size < 800 || aiRecPeakRms < 0.002) {
        if (trBox) {
          trBox.hidden = false;
          trBox.className = "ai-transcript-box is-warn";
          trBox.innerHTML = `⚠️ <b>Nenhum som detectado no microfone!</b> Confira nas permissões/configurações se o microfone correto está ativo e tente gravar novamente.`;
        }
        toast("⚠️ Áudio silencioso — verifique seu microfone.");
        aiAudioStopResolve?.({ ok: false });
        return;
      }

      const fileObj = await fileToBase64Obj(new File([blob], `planejamento_${Date.now()}.${ext}`, { type: cleanMime }));
      if (trBox) {
        trBox.hidden = false;
        trBox.className = "ai-transcript-box";
        trBox.innerHTML = `⏳ <b>Transcrevendo o que você falou...</b> aguarde 1–2s para confirmar o texto captado.`;
      }

      try {
        const res = await window.FeriasApi.aiTranscribeAudio(fileObj, "pt-BR");
        if (res && res.audible && res.transcript) {
          aiAttachedMedia.push(fileObj);
          renderAiMediaList();
          const cur = $("#aiPromptText").value.trim();
          $("#aiPromptText").value = cur ? `${cur}\n${res.transcript}` : res.transcript;
          if (trBox) {
            trBox.className = "ai-transcript-box";
            trBox.innerHTML = `✅ <b>Transcrição confirmada do seu áudio</b> (inserida no campo abaixo — pode editar se quiser):<br><i>"${esc(res.transcript)}"</i>`;
          }
          toast("🎙️ Áudio transcrito com sucesso!");
          aiAudioStopResolve?.({ ok: true, transcript: res.transcript });
        } else {
          if (trBox) {
            trBox.className = "ai-transcript-box is-warn";
            trBox.innerHTML = `⚠️ <b>Não foi possível entender fala no áudio:</b> ${esc(res?.warning || "áudio mudo ou baixo demais.")} Reproduza acima para conferir e grave novamente.`;
          }
          aiAudioStopResolve?.({ ok: false });
        }
      } catch (err) {
        const isNoKey = String(err.message).includes("GEMINI_NOT_CONFIGURED");
        aiAttachedMedia.push(fileObj);
        renderAiMediaList();
        if (trBox) {
          trBox.className = "ai-transcript-box is-warn";
          trBox.innerHTML = isNoKey
            ? `🔑 <b>Áudio gravado!</b> Ative sua Gemini API Key acima para transcrever e gerar automaticamente.`
            : `⚠️ Áudio gravado e anexado, mas a transcrição falhou (${esc(err.message)}).`;
        }
        aiAudioStopResolve?.({ ok: false });
      }
    };

    aiMediaRecorder.start(250);
    aiRecordSec = 0;
    timerEl.textContent = "● Gravando 0:00";
    timerEl.hidden = false;
    btn.textContent = "⏹️ Parar e Transcrever";
    clearInterval(aiRecordTimerInt);
    aiRecordTimerInt = setInterval(() => {
      aiRecordSec++;
      const m = Math.floor(aiRecordSec / 60), s = aiRecordSec % 60;
      timerEl.textContent = `● Gravando ${m}:${String(s).padStart(2, "0")}`;
    }, 1000);
  } catch (err) {
    stopAiMicMeter();
    toast("Permissão de microfone negada ou indisponível: " + (err.message || err));
  }
};

function buildFallbackOfflineTripPlan(promptText) {
  const today = fmtISO(new Date());
  const dMatch = [...promptText.matchAll(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g)];
  const toIsoMatch = m => {
    const dd = m[1].padStart(2, "0"), mm = m[2].padStart(2, "0");
    let yy = m[3] || String(new Date().getFullYear());
    if (yy.length === 2) yy = "20" + yy;
    return `${yy}-${mm}-${dd}`;
  };
  const start = dMatch[0] ? toIsoMatch(dMatch[0]) : today;
  const end = dMatch[1] ? toIsoMatch(dMatch[1]) : start;
  let veh = clone(state.vehicle);
  if (window.FeriasVehicles) {
    for (const v of window.FeriasVehicles.CATALOG) {
      if (promptText.toLowerCase().includes(v.name.split(" ").slice(0, 2).join(" ").toLowerCase())) {
        veh = { ...veh, ...v };
        break;
      }
    }
  }
  const hasFlight = /\b(voo|aviao|avião|aerea|aérea|passagem)\b/i.test(promptText);
  return {
    tripName: promptText.split(/[.,\n]/)[0].trim().slice(0, 46) || "Férias Planejadas",
    vehicle: veh,
    params: { travelers: 2, lodgingPerNight: 0, dailyFoodPerPerson: 0 },
    activities: [
      {
        type: hasFlight ? "Voo" : "Período",
        name: promptText.slice(0, 50) || "Roteiro principal",
        start,
        end,
        extraCost: 0,
        notes: promptText
      }
    ],
    checklist: [
      { cat: "Documentos", item: "Conferir reservas, documentos e ingressos", prio: "Alta", notes: "" }
    ]
  };
}

$("#btnRunAiPlan").onclick = async () => {
  if (aiMediaRecorder && aiMediaRecorder.state === "recording") {
    try { aiMediaRecorder.stop(); } catch {}
  }
  if (aiPendingAudioPromise) {
    $("#aiPlanStatus").innerHTML = `<span>⏳ Finalizando transcrição do áudio gravado...</span>`;
    await aiPendingAudioPromise;
    aiPendingAudioPromise = null;
  }
  const promptText = $("#aiPromptText").value.trim();
  if (!promptText && !aiAttachedMedia.length) {
    return toast("Grave um áudio audível, anexe imagens/documentos ou escreva seu planejamento.");
  }
  const st = $("#aiPlanStatus");
  const btn = $("#btnRunAiPlan");
  btn.disabled = true;
  st.innerHTML = `<span>⏳ Gemini IA analisando áudios, imagens e roteiro...</span>`;
  let plan = null;
  try {
    const bcNotes = aiAttachedMedia
      .filter(m => m?.detectedBarcode?.rawValue)
      .map(m => `${m.fileName} (${m.detectedBarcode.format}): ${m.detectedBarcode.rawValue}`)
      .join(" | ");
    const fullPrompt = bcNotes ? `${promptText}\n[QR/Códigos lidos dos anexos: ${bcNotes}]`.trim() : promptText;
    plan = await window.FeriasApi.aiPlanTrip({
      mode: appMode,
      prompt: fullPrompt,
      baseDate: fmtISO(new Date()),
      baseVehicle: appMode === "professional" ? undefined : state.vehicle,
      media: aiAttachedMedia
    });
  } catch (err) {
    if (String(err.message).includes("GEMINI_NOT_CONFIGURED") && promptText && !aiAttachedMedia.length && appMode !== "professional") {
      plan = buildFallbackOfflineTripPlan(promptText);
    } else {
      st.innerHTML = `<span class="auth-error">❌ ${esc(err.message === "GEMINI_NOT_CONFIGURED" ? "Ative sua Gemini API Key acima para processar áudio e imagens." : err.message)}</span>`;
      btn.disabled = false;
      return;
    }
  }

  try {
    if (appMode === "professional" && window.MyPlanPro) {
      const projTitle = plan.tripName || "Novo Projeto (IA)";
      const proData = window.MyPlanPro.migrateProState({
        mode: "professional",
        title: projTitle,
        params: plan.params || {},
        activities: Array.isArray(plan.activities) ? plan.activities : [],
        checklist: Array.isArray(plan.checklist) ? plan.checklist : []
      });
      const created = await window.FeriasApi.createTrip(projTitle, proData, "", "professional");
      $("#aiPlanModal").close();
      await refreshTripsAndLoad(created.id);
      toast(`✨ Projeto "${projTitle}" criado com ${proData.activities.length} cartão(ões)!`);
      return;
    }
    const tripTitle = plan.tripName || "Nova Viagem (IA)";
    const baseData = window.createBlankTripData(tripTitle, plan.vehicle || state.vehicle);
    if (plan.params) Object.assign(baseData.params, plan.params);
    const firstImgQr = aiAttachedMedia.find(m => m?.detectedBarcode?.rawValue)?.detectedBarcode || null;
    if (Array.isArray(plan.activities)) {
      baseData.activities = plan.activities.map((a, idx) => ({
        id: uid(),
        type: window.ACTIVITY_TYPES[a.type] ? a.type : "Outro",
        name: String(a.name || "Atividade"),
        start: /^\d{4}-\d{2}-\d{2}$/.test(a.start) ? a.start : fmtISO(new Date()),
        end: /^\d{4}-\d{2}-\d{2}$/.test(a.end) ? a.end : (/^\d{4}-\d{2}-\d{2}$/.test(a.start) ? a.start : fmtISO(new Date())),
        ...(a.startTime ? { startTime: String(a.startTime).slice(0, 5) } : {}),
        from: a.from || "",
        to: a.to || "",
        ...(a.airline ? { airline: String(a.airline) } : {}),
        km: Number(a.km) || 0,
        drive: Number(a.drive) || 0,
        stops: a.type === "Viagem" && a.drive ? computeAutoStops(Number(a.drive)).stops : 0,
        stopTime: a.type === "Viagem" && a.drive ? computeAutoStops(Number(a.drive)).stopTime : 0,
        toll: Number(a.toll) || 0,
        charges: a.type === "Viagem" ? 1 : undefined,
        extraCost: Number(a.extraCost) || 0,
        bookingRef: a.bookingRef || "",
        ...((a.qrPayload || (idx === 0 && firstImgQr?.rawValue))
          ? {
              qrPayload: String(a.qrPayload || firstImgQr?.rawValue).slice(0, 1200),
              qrFormat: String(a.qrFormat || firstImgQr?.format || "qr_code")
            }
          : {}),
        notes: a.notes || "",
        attachments: []
      }));
    }
    if (Array.isArray(plan.checklist)) {
      baseData.checklist = plan.checklist.map(c => ({
        id: uid(),
        cat: c.cat || "Geral",
        item: c.item || "Verificar item",
        prio: ["Alta", "Média", "Baixa"].includes(c.prio) ? c.prio : "Média",
        status: "Pendente",
        notes: c.notes || ""
      }));
    }
    const created = await window.FeriasApi.createTrip(tripTitle, baseData, window.FeriasMaps.getKey());
    $("#aiPlanModal").close();
    await refreshTripsAndLoad(created.id);
    toast(`✨ Viagem "${tripTitle}" criada com ${baseData.activities.length} atividade(s)!`);
  } catch (err) {
    st.innerHTML = `<span class="auth-error">❌ ${esc(err.message || err)}</span>`;
  } finally {
    btn.disabled = false;
  }
};

/* ---------- MODAL IMPORTAR CALENDÁRIO POR IMAGEM (IA MY PLAN — PRÉVIA + DESTINO) ---------- */
let impCalFiles = [];
let impCalEvents = [];

function getImpCalTargetMode() {
  const dm = $("#impCalDestMode")?.value || "new";
  if (dm === "new") return $("#impCalNewMode")?.value === "professional" ? "professional" : "personal";
  const chosenId = $("#impCalExistingSelect")?.value || "";
  const allRefs = [...(tripsCache.ownTrips || []), ...(tripsCache.sharedTrips || [])];
  const ref = allRefs.find(t => t.id === chosenId) || loadedTripsMap.get(chosenId) || activeTrip;
  return getTripMode(ref);
}

function populateImpCalExistingCalendars() {
  const sel = $("#impCalExistingSelect");
  if (!sel) return;
  const allOwn = (tripsCache.ownTrips || []);
  const allShared = (tripsCache.sharedTrips || []).filter(t => t.role !== "viewer");
  let html = "";
  if (allOwn.length) {
    html += `<optgroup label="Meus Calendários">`;
    allOwn.forEach(t => {
      const m = getTripMode(t) === "professional" ? "💼 Pro" : "🌴 Pessoal";
      html += `<option value="${esc(t.id)}">[${m}] ${esc(t.name)}</option>`;
    });
    html += `</optgroup>`;
  }
  if (allShared.length) {
    html += `<optgroup label="Compartilhados comigo (Editor)">`;
    allShared.forEach(t => {
      const m = getTripMode(t) === "professional" ? "💼 Pro" : "🌴 Pessoal";
      html += `<option value="${esc(t.id)}">[${m}] 👥 ${esc(t.name)} (${esc(t.ownerName || "")})</option>`;
    });
    html += `</optgroup>`;
  }
  if (!html && activeTrip) {
    html = `<option value="${esc(activeTrip.id)}">${esc(state.title || activeTrip.name)}</option>`;
  }
  sel.innerHTML = html;
  if (activeTrip && [...sel.options].some(o => o.value === activeTrip.id)) sel.value = activeTrip.id;
}

function syncImpCalDestUI() {
  const isNew = ($("#impCalDestMode")?.value || "new") === "new";
  if ($("#impCalNewNameWrap")) $("#impCalNewNameWrap").hidden = !isNew;
  if ($("#impCalNewModeWrap")) $("#impCalNewModeWrap").hidden = !isNew;
  if ($("#impCalExistingWrap")) $("#impCalExistingWrap").hidden = isNew;
  renderImpCalPreviewList();
}

function renderImpCalThumbs() {
  const box = $("#impCalThumbs");
  if (!box) return;
  if (!impCalFiles.length) {
    box.innerHTML = `<span class="muted small">Nenhuma imagem adicionada ainda. Aceita prints de Excel, PDFs, calendários mensais e agendas.</span>`;
    return;
  }
  box.innerHTML = impCalFiles.map((f, idx) => `
    <div class="imp-cal-thumb">
      ${f.mimeType.startsWith("image/") ? `<img src="data:${esc(f.mimeType)};base64,${f.dataBase64}" alt="">` : "<span>📄</span>"}
      <span>${esc(f.fileName)}</span>
      <button type="button" class="icon-btn" data-icdel="${idx}" title="Remover">✕</button>
    </div>`).join("");
  box.querySelectorAll("[data-icdel]").forEach(b => {
    b.onclick = () => { impCalFiles.splice(parseInt(b.dataset.icdel, 10), 1); renderImpCalThumbs(); };
  });
}

function updateImpCalSelectedCount() {
  const cnt = impCalEvents.filter(e => e._checked !== false).length;
  if ($("#impCalSelCount")) $("#impCalSelCount").textContent = String(cnt);
}

function renderImpCalPreviewList() {
  const list = $("#impCalPreviewList");
  if (!list) return;
  const targetMode = getImpCalTargetMode();
  const typesDict = targetMode === "professional"
    ? (window.MyPlanPro?.getAllProTypes?.() || window.PRO_ACTIVITY_TYPES || window.ACTIVITY_TYPES)
    : (window.ACTIVITY_TYPES || {});
  const typeOpts = Object.values(typesDict);
  const fallbackType = targetMode === "professional" ? "Outro" : "Evento";

  list.innerHTML = impCalEvents.map((ev, i) => {
    const rawMapped = targetMode === "professional" ? (window.PRO_LEGACY_TYPE_MAP?.[ev.type] || ev.type) : ev.type;
    const mappedType = typesDict[rawMapped] ? rawMapped : fallbackType;
    ev.type = mappedType;
    const typeSelect = typeOpts.map(t => {
      const optTxt = t.iconHtml ? t.short : `${t.icon} ${t.short}`;
      return `<option value="${esc(t.id)}"${t.id === mappedType ? " selected" : ""}>${esc(optTxt)}</option>`;
    }).join("");
    return `<div class="imp-cal-ev-row" data-icrow="${i}">
      <input type="checkbox" data-icchk="${i}" ${ev._checked !== false ? "checked" : ""} aria-label="Selecionar evento">
      <div class="imp-cal-ev-dates">
        <input type="date" data-icstart="${i}" value="${esc(ev.start)}" style="width:100%;font-size:0.74rem;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:3px 5px;color:var(--text-strong)">
        ${ev.startTime ? `<div class="muted" style="font-size:0.68rem;margin-top:2px">🕒 ${esc(ev.startTime)}</div>` : ""}
      </div>
      <div style="min-width:0;display:grid;gap:3px">
        <input type="text" data-icname="${i}" value="${esc(ev.name)}" style="width:100%;font-size:0.8rem;font-weight:600;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:4px 7px;color:var(--text-strong)">
        <div class="muted" style="font-size:0.71rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.end && ev.end !== ev.start ? `Até ${fmtBR(ev.end)} · ` : ""}${ev.amount > 0 ? `${ev.finDirection === "income" ? "+" : ""}${money(ev.amount)} · ` : ""}${esc(ev.notes || ev.location || "")}</div>
      </div>
      <select data-ictype="${i}" style="font-size:0.75rem;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:4px 6px;color:var(--text-strong)">${typeSelect}</select>
    </div>`;
  }).join("") || `<p class="muted small">Nenhum evento identificado nas imagens.</p>`;

  list.querySelectorAll("[data-icchk]").forEach(cb => {
    cb.onchange = () => { impCalEvents[+cb.dataset.icchk]._checked = cb.checked; updateImpCalSelectedCount(); };
  });
  list.querySelectorAll("[data-icstart]").forEach(inp => {
    inp.onchange = () => {
      const ev = impCalEvents[+inp.dataset.icstart];
      if (inp.value) { ev.start = inp.value; if (!ev.end || ev.end < ev.start) ev.end = ev.start; }
    };
  });
  list.querySelectorAll("[data-icname]").forEach(inp => {
    inp.oninput = () => { impCalEvents[+inp.dataset.icname].name = inp.value; };
  });
  list.querySelectorAll("[data-ictype]").forEach(sel => {
    sel.onchange = () => { impCalEvents[+sel.dataset.ictype].type = sel.value; };
  });
  updateImpCalSelectedCount();
}

async function appendImpCalFiles(fileList) {
  for (const f of [...(fileList || [])]) {
    if (impCalFiles.length >= 10) { toast("⚠️ Máximo de 10 imagens por importação."); break; }
    try {
      const obj = await fileToBase64Obj(f);
      impCalFiles.push(obj);
    } catch {}
  }
  renderImpCalThumbs();
}

function openImportCalModal() {
  impCalFiles = [];
  impCalEvents = [];
  if ($("#impCalHint")) $("#impCalHint").value = "";
  if ($("#impCalStatus")) $("#impCalStatus").innerHTML = "";
  if ($("#impCalPreviewWrap")) $("#impCalPreviewWrap").hidden = true;
  if ($("#btnImpCalConfirm")) $("#btnImpCalConfirm").hidden = true;
  if ($("#impCalDestMode")) $("#impCalDestMode").value = "new";
  if ($("#impCalNewMode")) $("#impCalNewMode").value = appMode;
  populateImpCalExistingCalendars();
  syncImpCalDestUI();
  renderImpCalThumbs();
  $("#aiImportCalModal")?.showModal();
}

if ($("#btnMenuImportCalImg")) $("#btnMenuImportCalImg").onclick = openImportCalModal;
if ($("#btnCloseImportCal")) $("#btnCloseImportCal").onclick = () => $("#aiImportCalModal").close();
if ($("#btnCancelImportCal")) $("#btnCancelImportCal").onclick = () => $("#aiImportCalModal").close();
if ($("#btnImpCalPick")) $("#btnImpCalPick").onclick = () => $("#impCalFileInput").click();
if ($("#impCalFileInput")) {
  $("#impCalFileInput").onchange = async e => {
    await appendImpCalFiles(e.target.files);
    e.target.value = "";
  };
}
if ($("#impCalDropzone")) {
  const dz = $("#impCalDropzone");
  dz.ondragover = e => { e.preventDefault(); dz.classList.add("dragover"); };
  dz.ondragleave = () => dz.classList.remove("dragover");
  dz.ondrop = async e => {
    e.preventDefault();
    dz.classList.remove("dragover");
    await appendImpCalFiles(e.dataTransfer?.files);
  };
}
document.addEventListener("paste", async e => {
  if (!$("#aiImportCalModal")?.open) return;
  const files = [...(e.clipboardData?.files || [])];
  if (files.length) await appendImpCalFiles(files);
});
if ($("#impCalDestMode")) $("#impCalDestMode").onchange = syncImpCalDestUI;
if ($("#impCalNewMode")) $("#impCalNewMode").onchange = renderImpCalPreviewList;
if ($("#impCalExistingSelect")) $("#impCalExistingSelect").onchange = renderImpCalPreviewList;
if ($("#btnImpCalAll")) {
  $("#btnImpCalAll").onclick = () => { impCalEvents.forEach(e => { e._checked = true; }); renderImpCalPreviewList(); };
}
if ($("#btnImpCalNone")) {
  $("#btnImpCalNone").onclick = () => { impCalEvents.forEach(e => { e._checked = false; }); renderImpCalPreviewList(); };
}

if ($("#btnImpCalAnalyze")) {
  $("#btnImpCalAnalyze").onclick = async () => {
    if (!impCalFiles.length) return toast("Envie ao menos 1 imagem ou PDF de calendário primeiro.");
    const st = $("#impCalStatus");
    const btn = $("#btnImpCalAnalyze");
    btn.disabled = true;
    st.innerHTML = `<span>⏳ My Plan IA analisando ${impCalFiles.length} imagem(ns) e extraindo datas e eventos...</span>`;
    try {
      const res = await window.FeriasApi.aiImportCalendar({
        mode: appMode,
        baseDate: fmtISO(new Date()),
        hint: ($("#impCalHint")?.value || "").trim(),
        media: impCalFiles
      });
      impCalEvents = (res?.events || []).map(ev => ({ ...ev, _checked: true }));
      if ($("#impCalNewName") && res?.suggestedName) $("#impCalNewName").value = res.suggestedName;
      if ($("#impCalSummaryBanner")) {
        $("#impCalSummaryBanner").innerHTML = `📅 <b>${esc(res?.summary || `${impCalEvents.length} eventos identificados`)}</b>${res?.detectedPeriod ? ` · ${esc(res.detectedPeriod)}` : ""}`;
      }
      if ($("#impCalWarnings")) {
        if (Array.isArray(res?.warnings) && res.warnings.length) {
          $("#impCalWarnings").hidden = false;
          $("#impCalWarnings").textContent = "⚠️ Observações da leitura: " + res.warnings.join(" · ");
        } else {
          $("#impCalWarnings").hidden = true;
        }
      }
      $("#impCalPreviewWrap").hidden = false;
      $("#btnImpCalConfirm").hidden = impCalEvents.length === 0;
      st.innerHTML = "";
      populateImpCalExistingCalendars();
      renderImpCalPreviewList();
    } catch (err) {
      const msg = String(err.message).includes("GEMINI_NOT_CONFIGURED")
        ? "Configure sua Gemini API Key em Parâmetros ou Planejar com IA para importar calendários por imagem."
        : (err.message || "Falha ao analisar imagens.");
      st.innerHTML = `<span class="auth-error">❌ ${esc(msg)}</span>`;
    } finally {
      btn.disabled = false;
    }
  };
}

if ($("#btnImpCalConfirm")) {
  $("#btnImpCalConfirm").onclick = async () => {
    const picked = impCalEvents.filter(e => e._checked !== false && e.name?.trim());
    if (!picked.length) return toast("Marque ao menos 1 evento para importar.");

    const destModeChoice = $("#impCalDestMode")?.value || "new";
    const targetMode = getImpCalTargetMode();
    const isPro = targetMode === "professional";
    const btn = $("#btnImpCalConfirm");
    btn.disabled = true;

    try {
      const allProTypes = isPro ? (window.MyPlanPro?.getAllProTypes?.() || window.PRO_ACTIVITY_TYPES || {}) : {};
      const toActivity = (ev, defaultColId) => {
        if (isPro) {
          const legType = window.PRO_LEGACY_TYPE_MAP?.[ev.type] || ev.type;
          const validType = allProTypes[legType] ? legType : "Outro";
          const finDir = ["income", "expense", "none"].includes(ev.finDirection)
            ? ev.finDirection
            : (validType === "Recebimento" ? "income" : (validType === "Despesa" ? "expense" : "none"));
          return {
            id: uid(),
            type: validType,
            columnId: defaultColId || "todo",
            name: String(ev.name).trim(),
            start: ev.start,
            end: ev.end && ev.end >= ev.start ? ev.end : ev.start,
            ...(ev.startTime ? { startTime: ev.startTime } : {}),
            ...(ev.endTime ? { endTime: ev.endTime } : {}),
            priority: "Média",
            progress: 0,
            client: ev.client || "",
            assignee: "",
            location: ev.location || "",
            coverColor: "",
            labels: [],
            tags: ["Importado IA"],
            finDirection: finDir,
            amount: Number(ev.amount) || 0,
            actualAmount: 0,
            finStatus: "Previsto",
            finDueDate: ev.end || ev.start,
            subtasks: [],
            notes: ev.notes || "",
            attachments: []
          };
        }
        const validType = window.ACTIVITY_TYPES?.[ev.type] ? ev.type : "Evento";
        return {
          id: uid(),
          type: validType,
          name: String(ev.name).trim(),
          start: ev.start,
          end: ev.end && ev.end >= ev.start ? ev.end : ev.start,
          ...(ev.startTime ? { startTime: ev.startTime } : {}),
          extraCost: Number(ev.amount) || 0,
          tickets: Number(ev.amount) > 0 ? [{ label: "Importado", qty: 1, unitPrice: Number(ev.amount) }] : [],
          tags: ["Importado IA"],
          notes: [ev.location ? `Local: ${ev.location}` : "", ev.notes || ""].filter(Boolean).join(" · "),
          attachments: []
        };
      };

      if (destModeChoice === "new") {
        const newName = ($("#impCalNewName")?.value || "").trim() || "Calendário Importado";
        let payloadData;
        if (isPro && window.MyPlanPro) {
          payloadData = window.createBlankProData ? window.createBlankProData(newName) : window.MyPlanPro.migrateProState({ title: newName, mode: "professional", activities: [] });
          const colId = payloadData.columns?.[0]?.id || "todo";
          payloadData.activities = picked.map(ev => toActivity(ev, colId));
        } else {
          payloadData = window.createBlankTripData(newName, state.vehicle);
          payloadData.activities = picked.map(ev => toActivity(ev));
        }
        const created = await window.FeriasApi.createTrip(newName, payloadData, window.FeriasMaps?.getKey?.() || "", targetMode);
        $("#aiImportCalModal").close();
        if (appMode !== targetMode) await setAppMode(targetMode, { skipLoad: true });
        await refreshTripsAndLoad(created.id);
        toast(`🖼️ Calendário "${newName}" criado com ${picked.length} evento(s)!`);
      } else {
        const destId = $("#impCalExistingSelect")?.value;
        const destTrip = await resolveTripRefById(destId);
        if (!destTrip) throw new Error("Calendário de destino não encontrado.");
        if (destTrip.role === "viewer") throw new Error("Este calendário está em modo somente leitura.");
        const dMode = getTripMode(destTrip);
        const colId = dMode === "professional" ? (destTrip.data?.columns?.[0]?.id || "todo") : "";
        const added = picked.map(ev => toActivity(ev, colId));
        if (!Array.isArray(destTrip.data.activities)) destTrip.data.activities = [];
        destTrip.data.activities.push(...added);
        await window.FeriasApi.updateTrip(destTrip.id, {
          name: destTrip.data.title || destTrip.name,
          mode: dMode,
          data: destTrip.data,
          updatedAt: Date.now()
        });
        $("#aiImportCalModal").close();
        if (appMode !== dMode) await setAppMode(dMode, { skipLoad: true });
        await refreshTripsAndLoad(destTrip.id);
        toast(`✅ ${added.length} evento(s) adicionados em "${destTrip.data.title || destTrip.name}"!`);
      }
    } catch (err) {
      toast("❌ " + (err.message || err));
    } finally {
      btn.disabled = false;
    }
  };
}

/* ---------- PERFIL, VALIDAÇÃO WHATSAPP BRASIL & ENVIO WHATSAPP ---------- */
function populateCountriesSelect() {
  const sel = $("#prof-waCountry");
  if (!sel || !window.FeriasCountries) return;
  sel.innerHTML = window.FeriasCountries.COUNTRIES.map(c =>
    `<option value="${esc(c.dial)}">${esc(c.dial)} — ${esc(c.name)}</option>`
  ).join("");
  sel.value = "+55";
}
populateCountriesSelect();

function refreshProfilePasswordSection(u) {
  const details = $("#profPasswordDetails");
  if (!details) return;
  if (!window.FeriasApi?.isServer()) {
    details.hidden = true;
    return;
  }
  details.hidden = false;
  const hasPw = Boolean(u?.hasPassword);
  if ($("#prof-oldPassword")) $("#prof-oldPassword").value = "";
  if ($("#prof-newPassword")) $("#prof-newPassword").value = "";
  if ($("#prof-confirmPassword")) $("#prof-confirmPassword").value = "";
  resetPasswordFieldVisibility($("#profileModal"));
  renderPasswordRules("#prof-pwChecklist", "");

  if ($("#prof-oldPasswordWrap")) $("#prof-oldPasswordWrap").hidden = !hasPw;
  if ($("#prof-confirmPasswordWrap")) $("#prof-confirmPasswordWrap").hidden = !hasPw;
  if ($("#btnProfileForgotPw")) $("#btnProfileForgotPw").hidden = !hasPw;
  if ($("#prof-pwStatusNote")) {
    $("#prof-pwStatusNote").textContent = hasPw
      ? "Sua conta já possui senha cadastrada. Informe a senha atual e digite a nova senha forte duas vezes."
      : "Sua conta está conectada pelo Google e não possui senha cadastrada (você pode continuar entrando apenas pelo Google). Se desejar, insira uma senha forte opcional abaixo:";
  }
  if ($("#btnSaveProfilePassword")) {
    $("#btnSaveProfilePassword").textContent = hasPw ? "🔑 Alterar Senha" : "🔑 Definir Senha";
  }
}

async function refreshProfileSessionsSection() {
  const listEl = $("#profSessionsList");
  const detailsEl = $("#profSessionsDetails");
  if (!listEl || !detailsEl) return;
  if (!window.FeriasApi.isServer()) {
    detailsEl.hidden = true;
    return;
  }
  detailsEl.hidden = false;
  listEl.innerHTML = `<p class="muted small">Carregando sessões ativas...</p>`;
  try {
    const r = await window.FeriasApi.listSessions();
    const sessions = r.sessions || [];
    if (!sessions.length) {
      listEl.innerHTML = `<p class="muted small">Nenhuma sessão ativa encontrada.</p>`;
      return;
    }
    listEl.innerHTML = sessions.map(s => `
      <div class="prof-session-row">
        <div style="min-width:0">
          <div>${s.current ? `<span class="pill ok">Sessão Atual</span>` : `<span class="pill">Outro Dispositivo</span>`} <b>${esc(s.ip || "IP local")}</b></div>
          <div class="muted small">${esc((s.userAgent || "Navegador").slice(0, 72))} · Acesso: ${fmtDateTimeBR(s.lastSeenAt)}</div>
        </div>
        ${s.current ? "" : `<button type="button" class="btn ghost small" data-rev-sess="${esc(s.id)}">Encerrar</button>`}
      </div>
    `).join("");
    listEl.querySelectorAll("[data-rev-sess]").forEach(btn => {
      btn.onclick = async () => {
        try {
          await window.FeriasApi.revokeSession(btn.dataset.revSess);
          toast("🚪 Sessão encerrada.");
          await refreshProfileSessionsSection();
        } catch (err) { toast("❌ " + (err.message || err)); }
      };
    });
  } catch {
    listEl.innerHTML = `<p class="muted small">Não foi possível consultar sessões agora.</p>`;
  }
}

function openProfileModal() {
  const u = window.FeriasApi.getUser() || {};
  $("#prof-name").value = u.name || "";
  if ($("#prof-email")) $("#prof-email").value = u.email || "";
  $("#prof-waCountry").value = u.whatsappCountry || "+55";
  $("#prof-waNumber").value = u.whatsappNumber ? window.FeriasCountries.formatPhoneMask(u.whatsappCountry || "+55", u.whatsappNumber) : "";
  if ($("#prof-age")) $("#prof-age").value = u.age || "";
  if ($("#prof-doc")) $("#prof-doc").value = u.doc || "";
  if ($("#prof-emergencyContact")) $("#prof-emergencyContact").value = u.emergencyContact || "";
  if ($("#prof-cep")) $("#prof-cep").value = u.cep || "";
  if ($("#prof-state")) $("#prof-state").value = u.state || "";
  if ($("#prof-city")) $("#prof-city").value = u.city || "";
  if ($("#prof-address")) $("#prof-address").value = u.address || "";
  $("#prof-waError").hidden = true;
  if ($("#prof-pwFeedback")) $("#prof-pwFeedback").hidden = true;
  refreshProfilePasswordSection(u);
  refreshProfileSessionsSection();
  $("#prof-geminiKey").value = "";
  $("#profileModal").showModal();
}

if ($("#btnRevokeOtherSessions")) {
  $("#btnRevokeOtherSessions").onclick = async () => {
    try {
      const r = await window.FeriasApi.revokeOtherSessions();
      toast(`🚪 ${r.revoked || 0} outra(s) sessão(ões) encerrada(s).`);
      await refreshProfileSessionsSection();
    } catch (err) { toast("❌ " + (err.message || err)); }
  };
}

if ($("#btnOpenProfile")) $("#btnOpenProfile").onclick = openProfileModal;
$("#btnMenuProfile").onclick = $("#btnParamProfile").onclick = openProfileModal;
if ($("#syncBadge")) $("#syncBadge").onclick = () => toast($("#menuSyncStatus")?.textContent || "🟢 Sincronizado na nuvem");
$("#btnCloseProfile").onclick = $("#btnCancelProfile").onclick = () => $("#profileModal").close();

if ($("#prof-cep")) {
  $("#prof-cep").addEventListener("blur", async () => {
    const clean = $("#prof-cep").value.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (!d || d.erro) return;
      if ($("#prof-city") && !$("#prof-city").value) $("#prof-city").value = d.localidade || "";
      if ($("#prof-state") && !$("#prof-state").value) $("#prof-state").value = d.uf || "";
      if ($("#prof-address") && !$("#prof-address").value && d.logradouro) {
        $("#prof-address").value = `${d.logradouro}${d.bairro ? ", " + d.bairro : ""}`;
      }
    } catch {}
  });
}
$("#prof-waCountry").onchange = () => {
  const d = $("#prof-waCountry").value;
  $("#prof-waNumber").placeholder = d === "+55" ? "(11) 99999-8888" : "Número com código de área";
  $("#prof-waNumber").value = window.FeriasCountries.formatPhoneMask(d, $("#prof-waNumber").value);
};
$("#prof-waNumber").addEventListener("input", () => {
  $("#prof-waNumber").value = window.FeriasCountries.formatPhoneMask($("#prof-waCountry").value, $("#prof-waNumber").value);
  $("#prof-waError").hidden = true;
});

async function saveProfileAndCredentials() {
  const name = $("#prof-name").value.trim();
  const email = ($("#prof-email")?.value || "").trim().toLowerCase();
  const dial = $("#prof-waCountry").value;
  const rawWa = $("#prof-waNumber").value.trim();
  const errEl = $("#prof-waError");
  errEl.hidden = true;

  if (!name) {
    errEl.textContent = "Informe seu nome completo.";
    errEl.hidden = false;
    return false;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = "Informe um e-mail válido.";
    errEl.hidden = false;
    return false;
  }
  if (!rawWa) {
    errEl.textContent = "O telefone / WhatsApp é obrigatório no perfil.";
    errEl.hidden = false;
    return false;
  }
  const check = window.FeriasCountries.validateWhatsApp(dial, rawWa);
  if (!check.valid) {
    errEl.textContent = check.error;
    errEl.hidden = false;
    return false;
  }

  await window.FeriasApi.updateProfile({
    name,
    email,
    whatsappCountry: dial,
    whatsappNumber: rawWa,
    age: $("#prof-age")?.value?.trim() || "",
    doc: $("#prof-doc")?.value?.trim() || "",
    emergencyContact: $("#prof-emergencyContact")?.value?.trim() || "",
    cep: $("#prof-cep")?.value?.trim() || "",
    state: $("#prof-state")?.value?.trim() || "",
    city: $("#prof-city")?.value?.trim() || "",
    address: $("#prof-address")?.value?.trim() || ""
  });
  const gk = $("#prof-geminiKey").value.trim();
  if (gk) {
    await window.FeriasApi.saveIntegrations({ geminiKey: gk });
  }
  updateUserMenu();
  renderParams();
  return true;
}

$("#profileForm").onsubmit = async e => {
  e.preventDefault();
  try {
    const ok = await saveProfileAndCredentials();
    if (!ok) return;
    $("#profileModal").close();
    toast("✅ Perfil e WhatsApp salvos!");
  } catch (err) {
    $("#prof-waError").textContent = err.message || err;
    $("#prof-waError").hidden = false;
  }
};

if ($("#prof-newPassword")) {
  $("#prof-newPassword").addEventListener("input", () => {
    renderPasswordRules("#prof-pwChecklist", $("#prof-newPassword").value);
  });
}

if ($("#btnSaveProfilePassword")) {
  $("#btnSaveProfilePassword").onclick = async () => {
    const u = window.FeriasApi.getUser() || {};
    const hasPw = Boolean(u.hasPassword);
    const fb = $("#prof-pwFeedback");
    const btn = $("#btnSaveProfilePassword");
    fb.hidden = true;

    const oldPw = $("#prof-oldPassword")?.value || "";
    const newPw = $("#prof-newPassword")?.value || "";
    const confPw = $("#prof-confirmPassword")?.value || "";

    if (hasPw && !oldPw) {
      fb.className = "auth-error span2";
      fb.textContent = "Informe sua senha atual para alterá-la.";
      fb.hidden = false;
      return;
    }
    const pwCheck = validateStrongPasswordClient(newPw);
    if (!pwCheck.valid) {
      fb.className = "auth-error span2";
      fb.textContent = pwCheck.error;
      fb.hidden = false;
      return;
    }
    if (hasPw) {
      if (newPw !== confPw) {
        fb.className = "auth-error span2";
        fb.textContent = "As duas digitações da nova senha não conferem.";
        fb.hidden = false;
        return;
      }
      if (oldPw === newPw) {
        fb.className = "auth-error span2";
        fb.textContent = "A nova senha deve ser diferente da senha atual.";
        fb.hidden = false;
        return;
      }
    }

    btn.disabled = true;
    try {
      const payload = hasPw
        ? { oldPassword: oldPw, newPassword: newPw, confirmPassword: confPw }
        : { newPassword: newPw };
      const res = await window.FeriasApi.changePassword(payload);
      refreshProfilePasswordSection(res.user);
      fb.className = "auth-success span2";
      fb.textContent = hasPw ? "✅ Senha alterada com sucesso!" : "✅ Senha cadastrada com sucesso! Agora você pode entrar com Google ou com e-mail e senha.";
      fb.hidden = false;
      toast("✅ Senha atualizada!");
    } catch (err) {
      fb.className = "auth-error span2";
      fb.textContent = err.message || "Erro ao atualizar senha.";
      fb.hidden = false;
    } finally {
      btn.disabled = false;
    }
  };
}

if ($("#btnProfileForgotPw")) {
  $("#btnProfileForgotPw").onclick = async () => {
    const u = window.FeriasApi.getUser() || {};
    if (!u.email) return;
    const fb = $("#prof-pwFeedback");
    const btn = $("#btnProfileForgotPw");
    fb.hidden = true;
    btn.disabled = true;
    try {
      const res = await window.FeriasApi.forgotPassword(u.email);
      fb.className = "auth-success span2";
      fb.textContent = "📩 " + (res.message || "Link de redefinição enviado para seu e-mail!");
      fb.hidden = false;
    } catch (err) {
      fb.className = "auth-error span2";
      fb.textContent = err.message || "Não foi possível enviar o link.";
      fb.hidden = false;
    } finally {
      btn.disabled = false;
    }
  };
}

function sendPlanToMyWhatsApp() {
  const u = window.FeriasApi.getUser();
  const dial = u?.whatsappCountry || "+55";
  const numStr = u?.whatsappNumber || "";
  if (!numStr) {
    toast("Cadastre seu WhatsApp no Perfil para receber o planejamento.");
    openProfileModal();
    return;
  }
  const check = window.FeriasCountries.validateWhatsApp(dial, numStr);
  if (!check.valid) {
    toast(check.error);
    openProfileModal();
    return;
  }
  const text = (appMode === "professional" && window.MyPlanPro)
    ? window.MyPlanPro.buildProWhatsAppText()
    : window.FeriasCountries.buildWhatsAppTripMessage(state, sorted(), totals(), calc, reportHelpers());
  const url = `https://wa.me/${check.e164Digits}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");
  toast(`💬 Abrindo WhatsApp para ${check.fullDisplay}...`);
}

if ($("#btnSendWhatsApp")) $("#btnSendWhatsApp").onclick = sendPlanToMyWhatsApp;
$("#btnMenuWhatsApp").onclick = $("#btnDashWhatsApp").onclick = sendPlanToMyWhatsApp;
$("#btnProfileSendWa").onclick = async () => {
  try {
    const ok = await saveProfileAndCredentials();
    if (!ok) return;
    sendPlanToMyWhatsApp();
  } catch (err) {
    $("#prof-waError").textContent = err.message || err;
    $("#prof-waError").hidden = false;
  }
};

/* ---------- BUSCA, CHECKLIST MODAL, MENU E BACKUP ---------- */
$("#search").oninput = () => renderTable(sorted(), totals());
$("#filterChecklist").onchange = e => { checklistFilter = e.target.value; renderChecklist(); };
$("#btnAddScenario").onclick = () => { state.scenarios.push({ id: uid(), name: "Novo cenário", kmL: state.vehicle.hevKmL }); save("➕ Cenário adicionado"); };
$("#btnAddCheck").onclick = () => openCheckModal();
$("#btnCloseCheckModal").onclick = $("#btnCheckCancel").onclick = () => $("#checkModal").close();
$("#checkForm").onsubmit = e => {
  e.preventDefault();
  const itemTxt = $("#c-item").value.trim();
  if (!itemTxt) return;
  const data = {
    item: itemTxt,
    cat: $("#c-cat").value.trim() || "Geral",
    prio: $("#c-prio").value || "Média",
    status: $("#c-status").value || "Pendente",
    notes: $("#c-notes").value.trim()
  };
  if (editingCheckId) {
    const existing = state.checklist.find(x => x.id === editingCheckId);
    if (existing) Object.assign(existing, data);
  } else {
    state.checklist.push({ id: uid(), ...data });
  }
  $("#checkModal").close();
  save(editingCheckId ? "✔️ Item atualizado" : "➕ Item adicionado ao checklist");
};
$("#btnCheckDelete").onclick = () => {
  if (!editingCheckId) return;
  state.checklist = state.checklist.filter(x => x.id !== editingCheckId);
  $("#checkModal").close();
  save("🗑️ Item removido");
};

$("#btnMenu").onclick = e => {
  e.stopPropagation();
  const open = $("#menu").classList.toggle("open");
  $("#btnMenu").setAttribute("aria-expanded", String(open));
};
document.addEventListener("click", () => {
  $("#menu").classList.remove("open");
  $("#btnMenu").setAttribute("aria-expanded", "false");
});

$("#btnExportXlsx").onclick = () => {
  if (appMode === "professional" && window.MyPlanPro) window.MyPlanPro.exportProXlsx();
  else exportXlsx();
};
$("#btnExportJson").onclick = () => {
  download(`${(state.title || "my_plan").replace(/[^\w\-]+/g, "_")}.json`, new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
  toast("💾 Backup salvo");
};
$("#btnImportJson").onclick = () => $("#fileJson").click();
$("#btnImportXlsx").onclick = () => $("#fileXlsx").click();

$("#fileJson").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.activities)) throw new Error("inválido");
    if ((appMode === "professional" || d.mode === "professional") && window.MyPlanPro) {
      if (appMode !== "professional") await setAppMode("professional", { skipLoad: true });
      state = window.MyPlanPro.migrateProState(d);
    } else {
      state = migrateState(d);
    }
    save("📂 Backup restaurado");
  } catch { toast("Arquivo JSON inválido"); }
  e.target.value = "";
};
$("#fileXlsx").onchange = async e => {
  const f = e.target.files[0];
  if (f) await importXlsx(f).catch(() => toast("Erro ao ler planilha"));
  e.target.value = "";
};

/* ---------- EVENTOS MENU FINANCEIRO & CONTROLE DIÁRIO ---------- */
[
  ["#fin-food", "dailyFoodPerPerson"],
  ["#fin-lodging", "lodgingPerNight"],
  ["#fin-fixed", "otherFixedBudget"],
  ["#fin-cont", "contingencyPct"]
].forEach(([sel, key]) => {
  const el = $(sel);
  if (el) {
    el.onchange = () => {
      state.params[key] = Math.max(0, parseFloat(el.value) || 0);
      save("💰 Orçamento diário atualizado");
    };
  }
});

if ($("#fin-savingsGoal")) {
  $("#fin-savingsGoal").onchange = () => {
    if (!state.finance) state.finance = { savingsGoal: 0, dailyRecords: {} };
    state.finance.savingsGoal = Math.max(0, parseFloat($("#fin-savingsGoal").value) || 0);
    save("🎯 Meta de economia atualizada");
  };
}

if ($("#fin-savingsPctCustom")) {
  $("#fin-savingsPctCustom").onchange = () => {
    const pct = Math.max(0, Math.min(100, parseFloat($("#fin-savingsPctCustom").value) || 0));
    if (!state.finance) state.finance = { savingsGoal: 0, dailyRecords: {} };
    const t = totals();
    state.finance.savingsGoal = pct > 0 ? Math.round((t.grandTotal || 0) * (pct / 100) * 100) / 100 : 0;
    save(pct > 0 ? `🎯 Meta de economia personalizada (-${num(pct, 1)}%) aplicada` : "🎯 Economia personalizada zerada");
  };
}

if ($("#btnFinExpandAll")) {
  $("#btnFinExpandAll").onclick = () => {
    finExpanded = !finExpanded;
    const sec = $("#finExpandedSection");
    if (sec) sec.hidden = !finExpanded;
    $("#btnFinExpandAll").setAttribute("aria-expanded", String(finExpanded));
    $("#btnFinExpandAll").textContent = finExpanded
      ? "▴ Recolher cards detalhados e composição dos custos"
      : "▾ Ampliar todos os cards e composição dos custos";
  };
}

document.querySelectorAll(".fin-save-preset").forEach(btn => {
  btn.onclick = () => {
    const pct = Number(btn.dataset.savepct || 0);
    if (!state.finance) state.finance = { savingsGoal: 0, dailyRecords: {} };
    const t = totals();
    state.finance.savingsGoal = pct > 0 ? Math.round((t.grandTotal || 0) * (pct / 100) * 100) / 100 : 0;
    save(pct > 0 ? `🎯 Meta de economia -${pct}% aplicada` : "🎯 Orçamento voltou para a base (0%)");
  };
});

if ($("#finFilterSeg")) {
  $("#finFilterSeg").querySelectorAll("button").forEach(b => {
    b.onclick = () => {
      financeFilter = b.dataset.ffilter || "all";
      $("#finFilterSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
      renderFinance(sorted(), totals());
    };
  });
}

if ($("#btnCloseFinModal")) $("#btnCloseFinModal").onclick = () => $("#financeDayModal").close();
if ($("#btnFinCancel")) $("#btnFinCancel").onclick = () => $("#financeDayModal").close();
if ($("#btnFinAddEntry")) {
  $("#btnFinAddEntry").onclick = () => {
    modalFinEntries.push({ cat: "Alimentação", desc: "", amount: "" });
    renderFinModalEntries();
    const rows = $$("#finModalEntriesRows .fin-entry-row");
    const last = rows[rows.length - 1];
    if (last) last.querySelector('[data-fe="desc"]')?.focus();
  };
}
if ($("#btnFinClearDay")) {
  $("#btnFinClearDay").onclick = () => {
    if (activeFinanceDate && state.finance?.dailyRecords) {
      delete state.finance.dailyRecords[activeFinanceDate];
    }
    $("#financeDayModal").close();
    save("🧹 Lançamento do dia removido — orçamento reequilibrado!");
  };
}
if ($("#finDayTotalInput")) {
  $("#finDayTotalInput").oninput = () => {
    const raw = $("#finDayTotalInput").value.trim();
    const res = recalcFinModalTotal(false);
    if (raw === "") {
      modalFinManualTotal = false;
    } else {
      const typed = Math.round((parseFloat(raw) || 0) * 100) / 100;
      modalFinManualTotal = Math.abs(typed - res.combined) > 0.01 || !res.hasAny;
    }
  };
}

if ($("#financeDayForm")) {
  $("#financeDayForm").onsubmit = e => {
    e.preventDefault();
    if (!activeFinanceDate) return;
    if (!state.finance || typeof state.finance !== "object") state.finance = { savingsGoal: 0, dailyRecords: {} };
    if (!state.finance.dailyRecords) state.finance.dailyRecords = {};

    const cleanEntries = modalFinEntries
      .map(en => ({ cat: en.cat || "Alimentação", desc: String(en.desc || "").trim(), amount: Math.max(0, Number(en.amount) || 0) }))
      .filter(en => en.desc || en.amount > 0);

    const checkedPlanned = {};
    let anyChecked = false;
    modalFinPlanned.forEach(it => {
      if (it.checked || Math.abs(it.actualAmount - it.plannedAmount) > 0.005) {
        checkedPlanned[it.key] = {
          checked: Boolean(it.checked),
          actualAmount: Math.round(Math.max(0, Number(it.actualAmount) || 0) * 100) / 100
        };
        if (it.checked) anyChecked = true;
      }
    });

    const totalRaw = $("#finDayTotalInput").value.trim();
    const note = $("#finDayNoteInput").value.trim();

    if (totalRaw === "" && !cleanEntries.length && !anyChecked && !note) {
      delete state.finance.dailyRecords[activeFinanceDate];
      $("#financeDayModal").close();
      save("🧹 Dia voltou para o status previsto");
      return;
    }

    const res = recalcFinModalTotal(false);
    const spentVal = totalRaw !== ""
      ? Math.max(0, parseFloat(totalRaw) || 0)
      : res.combined;

    state.finance.dailyRecords[activeFinanceDate] = {
      checkedPlanned,
      entries: cleanEntries,
      manualTotalOverride: Boolean(modalFinManualTotal),
      spent: Math.round(spentVal * 100) / 100,
      note
    };
    $("#financeDayModal").close();
    save("💰 Gasto real lançado e dias restantes redistribuídos!");
  };
}

window.addEventListener("resize", () => {
  if (appMode === "professional" && window.MyPlanPro) window.MyPlanPro.renderProGantt();
  else if (ganttMode === "gantt") renderGantt(sorted());
});

boot();
