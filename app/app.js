/* ===== Férias Pro — Aplicação Principal ===== */
const LEGACY_KEY_1 = "ferias-pro-state-v1";
const LEGACY_KEY_2 = "ferias-planner-v1";
const THEME_KEY = "ferias-pro-theme";
const PWA_DISMISS_KEY = "ferias-pro-pwa-dismissed";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = o => JSON.parse(JSON.stringify(o));
const DAY = 864e5;
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MON_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

let ganttFilter = "";
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

function save(msg, skipRender = false) {
  if (activeTrip && activeTrip.role === "viewer") {
    toast("👁️ Viagem compartilhada somente para visualização.");
    return;
  }
  if (activeTrip) {
    window.FeriasApi.schedulePush(activeTrip.id, () => ({
      name: state.title || activeTrip.name,
      data: state,
      gmapsKey: window.FeriasMaps ? window.FeriasMaps.getKey() : "",
      updatedAt: Date.now()
    }));
  }
  if (!skipRender) render();
  if (msg) toast(msg);
}

/* ---------- TEMA DIA / NOITE ---------- */
function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(THEME_KEY, t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t === "dark" ? "#0b0f1a" : "#f1f5f9");
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
const label = a => (a.type === "Viagem" || a.type === "Voo" || a.type === "Trem" || a.type === "Ônibus") && (a.from || a.to) ? `${a.name} (${a.from || "?"} ➔ ${a.to || "?"})` : a.name;
const sorted = () => [...state.activities].sort((a, b) => a.start.localeCompare(b.start) || (a.type === "Viagem") - (b.type === "Viagem"));

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

function calc(a, kmLOverride) {
  const v = state.vehicle;
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

  const ch = a.charges ?? state.params.defaultCharges ?? 1;
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

function totals(kmLOverride) {
  const s = sorted();
  const t = {
    km: 0, drive: 0, stopTime: 0, stops: 0, ev: 0, hev: 0, liters: 0,
    fuel: 0, charge: 0, toll: 0, total: 0, tanks: 0, trips: 0,
    flightsCost: 0, lodgingActCost: 0, otherActCost: 0, activitiesExtra: 0,
    lodgingParamCost: 0, lodgingNights: 0, foodCost: 0, otherFixedBudget: 0,
    contingencyCost: 0, grandTotal: 0, totalDays: 0
  };

  if (s.length) {
    const min = s[0].start;
    const max = s.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, min);
    t.totalDays = days({ start: min, end: max });
  }

  const COST_CATEGORY_STYLES = {
    Voo: { label: "Passagens Aéreas / Voos", color: "#38bdf8", gradient: "linear-gradient(90deg,#38bdf8,#0284c7)" },
    Trem: { label: "Passagens de Trem", color: "#14b8a6", gradient: "linear-gradient(90deg,#14b8a6,#0284c7)" },
    "Ônibus": { label: "Passagens de Ônibus", color: "#f59e0b", gradient: "linear-gradient(90deg,#f59e0b,#d97706)" },
    Viagem_Extra: { label: "Extras em Viagens de Carro", color: "#6366f1", gradient: "linear-gradient(90deg,#6366f1,#22d3ee)" },
    Hospedagem: { label: "Hospedagem", color: "#10b981", gradient: "linear-gradient(90deg,#10b981,#0d9488)" },
    Ingresso: { label: "Ingressos & Tickets", color: "#c084fc", gradient: "linear-gradient(90deg,#8b5cf6,#ec4899)" },
    Evento: { label: "Eventos / Jogos / Shows", color: "#f59e0b", gradient: "linear-gradient(90deg,#f59e0b,#e11d48)" },
    Passeio: { label: "Passeios & Parques", color: "#f472b6", gradient: "linear-gradient(90deg,#f472b6,#9333ea)" },
    Restaurante: { label: "Restaurantes & Lazer", color: "#fb923c", gradient: "linear-gradient(90deg,#fb923c,#dc2626)" },
    "Período": { label: "Estadias / Períodos", color: "#a78bfa", gradient: "linear-gradient(90deg,#7c3aed,#4338ca)" },
    Outro: { label: "Outros Gastos de Atividades", color: "#94a3b8", gradient: "linear-gradient(90deg,#64748b,#475569)" }
  };
  const extraBuckets = {};

  state.activities.forEach(a => {
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
      const c = calc(a, kmLOverride);
      t.trips++;
      t.km += +a.km || 0;
      t.drive += +a.drive || 0;
      t.stopTime += +a.stopTime || 0;
      t.stops += +a.stops || 0;
      for (const k of ["ev", "hev", "liters", "fuel", "charge", "toll", "total", "tanks"]) t[k] += c[k];
    }
  });

  const p = state.params;
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

  // Monta composição dinâmica ordenada do MAIOR custo para o MENOR (escalonando de cima para baixo)
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

/* ---------- POPULATE TYPE SELECTORS ---------- */
function populateTypeSelectors() {
  const types = Object.values(window.ACTIVITY_TYPES);
  const fType = $("#f-type");
  if (fType) fType.innerHTML = types.map(t => `<option value="${t.id}">${t.label}</option>`).join("");

  const optsAll = `<option value="">Todos os tipos</option>` + types.map(t => `<option value="${t.id}">${t.short}</option>`).join("");
  if ($("#ganttTypeFilter")) {
    $("#ganttTypeFilter").innerHTML = optsAll;
    $("#ganttTypeFilter").value = ganttFilter;
  }
  if ($("#filterType")) {
    const cur = $("#filterType").value;
    $("#filterType").innerHTML = optsAll;
    $("#filterType").value = cur;
  }
}

/* ---------- RENDER ---------- */
function render() {
  const s = sorted();
  const t = totals();
  renderGantt(s);
  renderTimeline(s);
  renderDashboard(s, t);
  renderFinance(s, t);
  renderTable(s, t);
  renderParams();
  renderChecklist();
}

function buildRightSummaryHTML(a) {
  const info = getTypeInfo(a.type);
  const attCount = Array.isArray(a.attachments) ? a.attachments.length : 0;
  const attBadge = attCount ? `<span class="g-summary-meta">📎 ${attCount}</span>` : "";
  const tktNote = formatTicketsNote(a);

  if (a.type === "Viagem") {
    const c = calc(a);
    const routeTxt = (a.from || a.to) ? `${esc(a.from || "?")} ➔ ${esc(a.to || "?")}` : "";
    const parts = [];
    if (a.km) parts.push(`${num(a.km)} km`);
    if (a.drive) parts.push(hmHuman(a.drive) + (a.stopTime ? ` + ${hmHuman(a.stopTime)}` : ""));
    if (c.isCarpool) parts.push("Carona");
    else if (a.toll) parts.push(`Ped. ${money(a.toll)}`);
    return `
      <div class="g-summary ${info.cls}" data-id="${a.id}">
        <span class="g-summary-title">${esc(a.name)}</span>
        ${routeTxt ? `<span class="g-summary-meta">${routeTxt}</span>` : ""}
        ${parts.length ? `<span class="g-summary-badge">${parts.join(" · ")}</span>` : ""}
        <span class="g-summary-meta">${c.isCarpool && !c.extra ? "Custo R$ 0" : money(c.total + c.extra)}</span>
        ${attBadge}
      </div>`;
  }

  const d = days(a);
  const metaParts = [];
  if (a.from || a.to) metaParts.push(`${a.from || "?"} ➔ ${a.to || "?"}`);
  if (a.km > 0 && (a.type === "Trem" || a.type === "Ônibus")) metaParts.push(`${num(a.km)} km`);
  if (a.extraCost > 0) metaParts.push(tktNote ? `${money(a.extraCost)} (${tktNote})` : money(a.extraCost));
  if (a.notes) metaParts.push(a.notes);
  const badgeTxt = d > 1 ? `${d} dias` : fmtShortBR(a.start);

  return `
    <div class="g-summary ${info.cls}" data-id="${a.id}">
      <span class="g-summary-title">${esc(a.name)}</span>
      <span class="g-summary-badge">${badgeTxt}</span>
      ${metaParts.length ? `<span class="g-summary-meta">${esc(metaParts.join(" · "))}</span>` : ""}
      ${attBadge}
    </div>`;
}

function renderGantt(allSorted) {
  const g = $("#gantt");
  const wrap = $("#ganttWrap");
  const tlWrap = $("#timelineWrap");
  const planTitle = $("#ganttPlanTitle");
  if (planTitle) planTitle.textContent = state.title || "Cronograma";

  const roleBadge = $("#tripRoleBadge");
  if (roleBadge) {
    if (activeTrip && activeTrip.role !== "owner") {
      roleBadge.textContent = `Compartilhada (${activeTrip.ownerName || "outro usuário"})`;
      roleBadge.hidden = false;
    } else {
      roleBadge.hidden = true;
    }
  }

  wrap.hidden = ganttMode !== "gantt";
  tlWrap.hidden = ganttMode !== "timeline";
  if (ganttMode !== "gantt") return;

  const s = ganttFilter ? allSorted.filter(a => a.type === ganttFilter) : allSorted;
  g.classList.toggle("slim-rail", ganttSlimRail);

  if (!s.length) {
    g.style.gridTemplateColumns = "1fr";
    g.innerHTML = `<div style="padding:28px;text-align:center">
      <p class="muted">Nenhuma atividade cadastrada ainda nesta viagem.</p>
      <button type="button" class="btn primary" onclick="openModal()">➕ Adicionar primeira atividade</button>
    </div>`;
    return;
  }

  const DW = ganttZoom;
  const nameW = ganttSlimRail ? 54 : (window.innerWidth < 720 ? 156 : 260);
  const minTs = parseD(s[0].start).getTime() - 2 * DAY;
  const maxS = s.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, s[0].start);
  const trailingDays = window.innerWidth < 720 ? 10 : 14;
  const n = Math.round((parseD(maxS) - minTs) / DAY) + trailingDays;
  const todayISO = fmtISO(new Date());

  g.style.gridTemplateColumns = `${nameW}px repeat(${n}, ${DW}px)`;

  const dates = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(minTs + i * DAY);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }

  const monthSpans = [];
  dates.forEach((d, idx) => {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = monthSpans[monthSpans.length - 1];
    if (last && last.key === key) last.span++;
    else monthSpans.push({ key, label: `${MON_FULL[d.getMonth()]} ${d.getFullYear()}`, startCol: idx + 2, span: 1 });
  });

  let h = `<div class="g-corner">
    ${ganttSlimRail ? "" : `<span>Atividades</span>`}
    <button type="button" class="g-focus-btn${ganttSlimRail ? " g-focus-only" : ""}" id="btnGanttSlim" title="${ganttSlimRail ? "Expandir nomes das atividades" : "Retrair colunas de nome"}" aria-label="${ganttSlimRail ? "Expandir nomes das atividades" : "Retrair colunas de nome"}">${ganttSlimRail ? "⤢" : "⤡"}</button>
  </div>`;

  monthSpans.forEach(ms => {
    h += `<div class="g-month-head" style="grid-column:${ms.startCol} / span ${ms.span};grid-row:1">${ms.label}</div>`;
  });

  dates.forEach((d, i) => {
    const iso = fmtISO(d);
    const we = d.getDay() === 0 || d.getDay() === 6;
    const isToday = iso === todayISO;
    h += `<div class="g-head ${we ? "weekend" : ""} ${isToday ? "today" : ""}" style="grid-column:${i + 2};grid-row:2" data-date="${iso}">
      <span>${WD[d.getDay()][0]}</span><b>${d.getDate()}</b>
    </div>`;
  });

  s.forEach((a, rowIdx) => {
    const info = getTypeInfo(a.type);
    const row = rowIdx + 3;
    const altCls = rowIdx % 2 ? "alt" : "";
    const subLeft = (a.type === "Viagem" || a.type === "Voo" || a.type === "Trem" || a.type === "Ônibus") && (a.from || a.to)
      ? `${a.from || "?"} ➔ ${a.to || "?"}`
      : `${fmtShortBR(a.start)}${days(a) > 1 ? ` · ${days(a)}d` : ""}`;

    h += `<div class="g-name ${altCls}" style="grid-column:1;grid-row:${row}" data-id="${a.id}" title="${esc(label(a))}">
      <span class="g-type-dot ${info.cls}">${info.icon}</span>
      <div class="g-name-txt">
        <div class="g-name-title">${esc(a.name)}</div>
        <div class="g-name-sub">${esc(subLeft)}</div>
      </div>
    </div>`;

    const off = Math.round((parseD(a.start) - minTs) / DAY);
    const len = days(a);

    for (let i = 0; i < n; i++) {
      const d = dates[i];
      const we = d.getDay() === 0 || d.getDay() === 6;
      const isToday = fmtISO(d) === todayISO;
      let inner = "";
      if (i === off) {
        const barW = Math.max(28, len * DW - 6);
        const insideTxt = len > 1 ? `${info.icon} ${len}d` : info.icon;
        const resizeHandle = len > 1 || a.type === "Período" || a.type === "Hospedagem"
          ? `<span class="g-resize" data-resize="${a.id}" title="Arraste para alterar duração"></span>` : "";
        inner = `
          <div class="g-event-wrap" style="left:3px">
            <div class="g-bar ${info.cls} ${len === 1 ? "single-day" : ""}" data-id="${a.id}" style="width:${barW}px">
              <span>${insideTxt}</span>${resizeHandle}
            </div>
            ${buildRightSummaryHTML(a)}
          </div>`;
      }
      h += `<div class="g-cell ${altCls} ${we ? "weekend" : ""} ${isToday ? "today" : ""}" style="grid-column:${i + 2};grid-row:${row}">${inner}</div>`;
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
  g.querySelectorAll(".g-name[data-id], .g-summary[data-id]").forEach(el => {
    el.onclick = () => openModal(el.dataset.id);
  });
  g.querySelectorAll(".g-bar").forEach(bindDrag);
  g.querySelectorAll(".g-resize").forEach(bindResize);
}

function bindDrag(bar) {
  bar.onpointerdown = e => {
    if (e.target.closest("[data-resize]")) return;
    if (e.pointerType === "touch") {
      const x0 = e.clientX, y0 = e.clientY;
      bar.onpointerup = ev => {
        bar.onpointerup = null;
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 10) openModal(bar.dataset.id);
      };
      return;
    }

    e.preventDefault();
    bar.setPointerCapture(e.pointerId);
    const wrap = bar.closest(".g-event-wrap");
    const DW = ganttZoom;
    const x0 = e.clientX;
    let dd = 0;
    const tip = document.createElement("div");
    tip.className = "drag-tip";
    const a = state.activities.find(x => x.id === bar.dataset.id);

    bar.onpointermove = ev => {
      const dx = ev.clientX - x0;
      dd = Math.round(dx / DW);
      if (Math.abs(dx) > 4) {
        bar.classList.add("dragging");
        wrap.style.transform = `translateX(${dd * DW}px)`;
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
      if (!dd) return openModal(a.id);
      a.start = fmtISO(new Date(parseD(a.start).getTime() + dd * DAY + 3600e3));
      a.end = fmtISO(new Date(parseD(a.end || a.start).getTime() + dd * DAY + 3600e3));
      save(`📅 ${a.name} movido ${dd > 0 ? "+" : ""}${dd} dia(s)`);
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
    const a = state.activities.find(x => x.id === handle.dataset.resize);
    const DW = ganttZoom;
    const x0 = e.clientX;
    const origLen = days(a);
    let dd = 0;

    handle.onpointermove = ev => {
      dd = Math.round((ev.clientX - x0) / DW);
      const newLen = Math.max(1, origLen + dd);
      bar.style.width = `${Math.max(28, newLen * DW - 6)}px`;
    };
    handle.onpointerup = () => {
      handle.onpointermove = handle.onpointerup = null;
      const newLen = Math.max(1, origLen + dd);
      if (newLen === origLen) return;
      a.end = fmtISO(new Date(parseD(a.start).getTime() + (newLen - 1) * DAY + 3600e3));
      save(`↔️ ${a.name}: duração ajustada para ${newLen} dia(s)`);
    };
  };
}

function renderTimeline(allSorted) {
  const tl = $("#timelineWrap");
  if (ganttMode !== "timeline") return;
  const s = ganttFilter ? allSorted.filter(a => a.type === ganttFilter) : allSorted;
  if (!s.length) {
    tl.innerHTML = `<p class="muted">Nenhuma atividade encontrada.</p>`;
    return;
  }
  tl.innerHTML = s.map(a => {
    const info = getTypeInfo(a.type);
    const d = parseD(a.start);
    const c = calc(a);
    const attCount = Array.isArray(a.attachments) ? a.attachments.length : 0;
    const tktNote = formatTicketsNote(a);
    const meta = a.type === "Viagem"
      ? `${a.from || "?"} ➔ ${a.to || "?"} · ${num(a.km)} km · ${hmHuman(a.drive)}${a.stopTime ? ` (+${hmHuman(a.stopTime)} par.)` : ""} · ${c.isCarpool ? "Carona (s/ custo carro)" : `Ped. ${money(a.toll)}`} · Total ${money(c.total + c.extra)}`
      : `${days(a)} dia(s)${a.from || a.to ? ` · ${a.from || "?"} ➔ ${a.to || "?"}` : ""}${a.extraCost ? ` · ${money(a.extraCost)}${tktNote ? ` (${tktNote})` : ""}` : ""}${a.notes ? ` · ${a.notes}` : ""}`;
    return `
      <div class="tl-item ${info.cls}" data-id="${a.id}">
        <div class="date-badge"><b>${d.getDate()}</b>${MON[d.getMonth()]}</div>
        <div class="tl-body">
          <div class="tl-top">
            <span class="tl-title">${info.icon} ${esc(a.name)} ${attCount ? `<small class="muted">📎 ${attCount}</small>` : ""}</span>
            <span class="chip ${info.cls}">${esc(info.short)}</span>
          </div>
          <div class="tl-meta">${WD[d.getDay()]} · ${fmtBR(a.start)}${days(a) > 1 ? ` até ${fmtBR(a.end)}` : ""}</div>
          <div class="tl-meta">${esc(meta)}</div>
        </div>
      </div>`;
  }).join("");
  tl.querySelectorAll(".tl-item[data-id]").forEach(el => { el.onclick = () => openModal(el.dataset.id); });
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
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(label(a))}</div>
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
        <span>${fmtShortBR(a.start)} · ${esc(label(a))}</span>
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

function computeFinancialTimeline(s, t) {
  if (!s.length) {
    return {
      daysList: [],
      plannedTotal: t.grandTotal || 0,
      savingsGoal: Math.max(0, Number(state.finance?.savingsGoal) || 0),
      effectiveCeiling: Math.max(0, (t.grandTotal || 0) - Math.max(0, Number(state.finance?.savingsGoal) || 0)),
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
    const c = calc(a);
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

  const records = (state.finance && state.finance.dailyRecords) || {};
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
      d.items.push({ key: "param:cont", checkable: false, cat: "linear", icon: "🛟", label: `Reserva ${state.params.contingencyPct || 0}% (rateio)`, amount: contPerDay });
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
  const savingsGoal = Math.max(0, Number(state.finance?.savingsGoal) || 0);
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
  const ft = $("#filterType").value;
  const rows = s.filter(a => (!ft || a.type === ft) && (!q || (label(a) + " " + (a.notes || "")).toLowerCase().includes(q)));
  const allTypes = Object.keys(window.ACTIVITY_TYPES);

  const ed = (a, f, type = "text", cls = "") =>
    `<td class="ed ${cls}"><input data-id="${a.id}" data-f="${f}" type="${type}" ${type === "number" ? 'step="any"' : ""} value="${esc(f === "drive" || f === "stopTime" ? (a.type === "Viagem" || ((a.type === "Trem" || a.type === "Ônibus") && f === "drive" && a.drive > 0) ? hm(a[f]) : "") : a[f] ?? "")}"></td>`;
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
    const routeCols = (v || a.type === "Voo" || a.type === "Trem" || a.type === "Ônibus");
    const hasDist = v || a.type === "Trem" || a.type === "Ônibus";
    h += `<tr>
      <td>${i + 1}</td>
      ${typeSel(a)}
      ${ed(a, "start", "date")}
      ${ed(a, "end", "date")}
      <td>${WD[parseD(a.start).getDay()]}</td>
      ${ed(a, "name", "text", "wide")}
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

  tb.querySelectorAll("[data-f]").forEach(el => {
    el.onchange = () => {
      const a = state.activities.find(x => x.id === el.dataset.id);
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
      if (f === "type" && val === "Viagem" && a.charges == null) a.charges = state.params.defaultCharges ?? 1;
      if (f === "drive" && a.type === "Viagem") {
        const auto = computeAutoStops(val);
        a.stops = auto.stops;
        a.stopTime = auto.stopTime;
      }
      save("✔️ Atualizado");
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
    return `<div class="m-card" data-id="${a.id}">
      <div class="m-card-head">
        <strong>${info.icon} ${esc(label(a))}</strong>
        <span class="chip ${info.cls}">${esc(info.short)}</span>
      </div>
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
    cidInput.value = getEffectiveGoogleClientId();
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
  const ticketItems = sorted().filter(a => a.extraCost > 0 || ["Ingresso", "Voo", "Trem", "Ônibus", "Hospedagem", "Evento", "Passeio"].includes(a.type));
  if (!ticketItems.length) {
    listEl.innerHTML = `<p class="muted small">Nenhum ingresso, passagem ou reserva cadastrado ainda.</p>`;
    return;
  }
  listEl.innerHTML = ticketItems.map(a => {
    const info = getTypeInfo(a.type);
    const tktNote = formatTicketsNote(a);
    return `<div class="param-ticket-row">
      <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">
        <span class="chip ${info.cls}">${info.icon} ${esc(info.short)}</span>
        <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label(a))}</strong>
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
  $("#checkModalTitle").textContent = item ? "Editar item do checklist" : "Novo item do checklist";
  $("#c-item").value = item ? item.item : "";
  $("#c-cat").value = item ? item.cat : "Geral";
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
let stopsManualOverride = false;
let lastRouteKey = "";
let acFromCtrl = null;
let acToCtrl = null;
let acTFromCtrl = null;
let acTToCtrl = null;

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
  $("#calRemLabel").textContent = state.params.calendarReminderTime || "09:00";
  $("#btnCalLink").href = window.FeriasCalendar.buildGoogleCalendarTemplateUrl(a, state.title);

  if (a.type === "Trem" || a.type === "Ônibus") {
    const ext = $("#transitMapsStatus");
    if (ext && !window.FeriasMaps.hasKey() && !ext.textContent) {
      ext.innerHTML = `<span>ℹ️ Sem Maps Key: informe manualmente ou abra no Google Maps</span>
        <a href="${window.FeriasMaps.buildLegUrl(a.from, a.to, "transit")}" target="_blank" rel="noopener" style="color:var(--accent2)">Ver horários no Maps ↗</a>`;
    }
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
  const baseDate = preset.start || (sorted()[0]?.start) || fmtISO(new Date());
  const a = id
    ? state.activities.find(x => x.id === id)
    : { type: preset.type || "Viagem", start: baseDate, end: preset.end || baseDate, charges: state.params.defaultCharges ?? 1, extraCost: preset.extraCost || 0, includeRouteCost: true, tickets: [], attachments: [] };

  editing = id || null;
  modalDraftId = id || uid();
  modalAttachments = clone(a.attachments || []);
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
  $("#f-transitFrom").value = (a.type === "Trem" || a.type === "Ônibus") ? (a.from || "") : "";
  $("#f-transitTo").value = (a.type === "Trem" || a.type === "Ônibus") ? (a.to || "") : "";
  $("#f-transitKm").value = (a.type === "Trem" || a.type === "Ônibus") ? (a.km ?? "") : "";
  $("#f-transitDrive").value = (a.type === "Trem" || a.type === "Ônibus") && a.drive ? hm(a.drive) : "";
  $("#f-transitCarrier").value = (a.type === "Trem" || a.type === "Ônibus") ? (a.airline || "") : "";
  $("#f-transitRef").value = (a.type === "Trem" || a.type === "Ônibus") ? (a.bookingRef || "") : "";
  $("#f-ticketRef").value = a.bookingRef || "";
  f.elements.drive.value = a.drive && a.type === "Viagem" ? hm(a.drive) : "";
  f.elements.stopTime.value = a.stopTime != null && a.type === "Viagem" && id ? hm(a.stopTime) : "";

  $("#tollSourceTag").textContent = "";
  $("#modalMapsStatus").innerHTML = "";
  $("#transitMapsStatus").innerHTML = "";
  $("#modalMapWrap").hidden = true;
  $("#modalMapWrap").innerHTML = "";
  $("#transitMapWrap").hidden = true;
  $("#transitMapWrap").innerHTML = "";
  $("#btnDelete").style.visibility = $("#btnDuplicate").style.visibility = id ? "visible" : "hidden";

  renderTicketRows();
  toggleTrip();
  updateModalMapsUI();
  renderModalAttachments();
  updateModalPreview();
  prefetchModalWalletPass();
  $("#modal").showModal();
};

function toggleTrip() {
  const t = $("#f-type").value;
  const isTransit = t === "Trem" || t === "Ônibus";
  $(".trip-only").hidden = t !== "Viagem";
  $(".trip-only").style.display = t === "Viagem" ? "" : "none";
  $(".flight-only").hidden = t !== "Voo";
  $(".transit-only").hidden = !isTransit;
  $(".transit-only").style.display = isTransit ? "" : "none";
  if (isTransit && $("#transitBoxTitle")) {
    $("#transitBoxTitle").textContent = t === "Trem" ? "🚂 Rota de Trem (Google Maps)" : "🚌 Rota de Ônibus (Google Maps)";
  }
  $("#f-ticketRefWrap").hidden = (t === "Viagem" || t === "Voo" || isTransit);
  updateModalPreview();
}

function readForm() {
  const e = $("#form").elements;
  const n = k => !e[k] || e[k].value === "" ? null : parseFloat(e[k].value);
  const cleanTickets = modalTickets
    .map(r => ({ label: String(r.label || "").trim(), qty: Math.max(0, Number(r.qty) || 0), unitPrice: Math.max(0, Number(r.unitPrice) || 0) }))
    .filter(r => r.qty > 0 && r.unitPrice > 0);
  const computedCost = Math.round(calcTicketsTotal(cleanTickets) * 100) / 100;

  const a = {
    type: e.type.value,
    name: e.name.value.trim(),
    start: e.start.value,
    end: e.end.value || e.start.value,
    tickets: cleanTickets,
    extraCost: computedCost,
    notes: e.notes.value,
    attachments: clone(modalAttachments)
  };
  if (a.end < a.start) a.end = a.start;
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
  } else if (a.type === "Trem" || a.type === "Ônibus") {
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
  const a = state.activities.find(x => x.id === id);
  if (!a || !confirm(`Excluir "${label(a)}"?`)) return;
  state.activities = state.activities.filter(x => x.id !== id);
  save("🗑️ Excluído");
}

async function recalcSingleTripById(id) {
  const a = state.activities.find(x => x.id === id);
  if (!a || a.type !== "Viagem") return;
  if (!a.from || !a.to) return toast("Defina Origem e Destino primeiro.");
  if (!window.FeriasMaps.hasKey()) { toast("Configure sua Google Maps API Key em Parâmetros."); return openModal(id); }
  toast(`🗺️ Calculando ${a.from} ➔ ${a.to}...`);
  try {
    const res = await window.FeriasMaps.computeTripRoute({ origin: a.from, destination: a.to, params: state.params, vehicle: state.vehicle });
    a.km = res.km;
    a.drive = res.driveMinutes;
    const auto = computeAutoStops(res.driveMinutes);
    a.stops = auto.stops;
    a.stopTime = auto.stopTime;
    if (res.toll.tollKnown) a.toll = res.toll.tollCost;
    save(`✅ ${a.name} recalculado via Google Maps!`);
  } catch (err) {
    toast("Erro ao calcular rota: " + (err.message || err));
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

/* ---------- MULTI-VIAGENS, COMPARTILHAMENTO & CONVITES ---------- */
function renderTripDropdown() {
  const sel = $("#tripSelect");
  if (!sel) return;
  const own = tripsCache.ownTrips || [];
  const shared = tripsCache.sharedTrips || [];

  let h = "";
  if (own.length) {
    h += `<optgroup label="Minhas Férias">` +
      own.map(t => `<option value="${t.id}" ${activeTrip && activeTrip.id === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("") +
      `</optgroup>`;
  }
  if (shared.length) {
    h += `<optgroup label="Compartilhadas comigo">` +
      shared.map(t => `<option value="${t.id}" ${activeTrip && activeTrip.id === t.id ? "selected" : ""}>👥 ${esc(t.name)} (${esc(t.ownerName)})</option>`).join("") +
      `</optgroup>`;
  }
  sel.innerHTML = h;
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
  banner.innerHTML = pend.map(p => `
    <div class="invite-card">
      <div>
        <strong>📩 Convite de viagem compartilhada</strong>
        <div class="small muted">${esc(p.ownerName)} (${esc(p.ownerEmail)}) compartilhou <b>"${esc(p.tripName)}"</b> com você.</div>
      </div>
      <div class="inline-actions">
        <button type="button" class="btn primary small" data-inv-accept="${p.id}" data-trip="${p.tripId}">✅ Aceitar</button>
        <button type="button" class="btn ghost small" data-inv-decline="${p.id}">✕ Recusar</button>
      </div>
    </div>`).join("");

  banner.querySelectorAll("[data-inv-accept]").forEach(b => {
    b.onclick = async () => {
      await window.FeriasApi.respondShare(b.dataset.invAccept, "accept");
      toast("✅ Viagem aceita e adicionada à sua lista!");
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

async function openTripById(tripId) {
  const res = await window.FeriasApi.getTrip(tripId);
  if (!res || !res.trip) return;
  activeTrip = res.trip;
  window.FeriasApi.setActiveTripId(activeTrip.id);
  state = migrateState(res.trip.data);
  state.title = res.trip.name || state.title;
  if (res.trip.gmapsKey && window.FeriasMaps && res.trip.gmapsKey !== window.FeriasMaps.getKey()) {
    window.FeriasMaps.setKey(res.trip.gmapsKey);
  }
  renderTripDropdown();
  render();
}

async function refreshTripsAndLoad(preferredTripId) {
  tripsCache = await window.FeriasApi.listTrips();
  renderPendingInvites();

  let all = [...(tripsCache.ownTrips || []), ...(tripsCache.sharedTrips || [])];
  if (!all.length) {
    // Se ainda não há nenhuma viagem na conta, cria a 1ª viagem padrão
    let initialData = clone(window.DEFAULT_DATA);
    try {
      const leg = localStorage.getItem(LEGACY_KEY_1) || localStorage.getItem(LEGACY_KEY_2);
      if (leg) initialData = migrateState(JSON.parse(leg));
    } catch {}
    const created = await window.FeriasApi.createTrip(initialData.title || "Férias Final de Ano 2026", initialData, window.FeriasMaps.getKey());
    tripsCache = await window.FeriasApi.listTrips();
    all = [...(tripsCache.ownTrips || []), ...(tripsCache.sharedTrips || [])];
    preferredTripId = created.id;
  }

  const targetId = preferredTripId && all.some(t => t.id === preferredTripId)
    ? preferredTripId
    : (all.some(t => t.id === window.FeriasApi.getActiveTripId()) ? window.FeriasApi.getActiveTripId() : all[0].id);

  await openTripById(targetId);
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
      Tanques: v ? +c.tanks.toFixed(2) : "", Observações: a.notes || ""
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Tabela Completa");
  const par = VEHICLE_PARAM_DEFS.map(([k, l, u]) => ({ Parâmetro: l, Valor: state.vehicle[k], Unidade: u }));
  COST_PARAM_DEFS.forEach(d => par.push({ Parâmetro: d.label, Valor: state[d.group][d.key], Unidade: d.unit }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(par), "Resumo & Parâmetros");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.checklist.map((c, i) => ({
    "#": i + 1, Categoria: c.cat, Item: c.item, Prioridade: c.prio, Status: c.status, Notas: c.notes
  }))), "Checklist");
  XLSX.writeFile(wb, `${(state.title || "Ferias_Pro").replace(/[^\w\-]+/g, "_")}.xlsx`);
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
      alert("No iPhone/iPad: toque no botão Compartilhar (quadrado com seta ⬆️) no Safari e escolha 'Adicionar à Tela de Início' para instalar o Férias Pro em tela cheia.");
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
    $("#pwaPromptDesc").textContent = "Toque em Compartilhar (⬆️) e 'Adicionar à Tela de Início' para instalar o app Férias Pro.";
    $("#btnPwaInstall").textContent = "Baixar App";
  } else {
    $("#pwaPromptDesc").textContent = "Baixe o aplicativo Férias Pro no seu celular com ícone direto na tela inicial.";
    $("#btnPwaInstall").textContent = "Baixar App";
  }
  banner.hidden = false;
}

/* ---------- AUTH & BOOT ---------- */
function setupGoogleSignInButton(clientId) {
  const wrap = $("#googleBtnWrap");
  const hint = $("#googleConfigHint");
  if (!clientId) {
    wrap.innerHTML = "";
    hint.hidden = false;
    return;
  }
  hint.hidden = true;
  const s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client";
  s.async = true;
  s.onload = () => {
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
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
    window.google.accounts.id.renderButton(wrap, { theme: isDarkTheme() ? "filled_black" : "outline", size: "large", width: 340, text: "continue_with" });
  };
  document.head.appendChild(s);
}

function updateUserMenu() {
  const u = window.FeriasApi.getUser();
  const box = $("#menuUserInfo");
  if (u) {
    box.innerHTML = `<strong>${esc(u.name)}</strong><span>${esc(u.email)}</span>`;
    $("#btnLogout").hidden = false;
  } else {
    box.innerHTML = `<strong>Modo Offline</strong><span>Somente este aparelho</span>`;
    $("#btnLogout").hidden = true;
  }
}

async function enterApp() {
  $("#authView").hidden = true;
  $("#appShell").hidden = false;
  const usr = window.FeriasApi.getUser();
  if (usr?.integrations?.gmapsKey && window.FeriasMaps && !window.FeriasMaps.hasKey()) {
    window.FeriasMaps.setKey(usr.integrations.gmapsKey);
  }
  updateUserMenu();
  await refreshTripsAndLoad();
  setupPwaInstall();

  window.FeriasApi.startPolling(
    () => activeTrip?.id,
    full => {
      activeTrip = full.trip;
      state = migrateState(full.trip.data);
      state.title = full.trip.name || state.title;
      if (full.trip.gmapsKey && window.FeriasMaps && full.trip.gmapsKey !== window.FeriasMaps.getKey()) {
        window.FeriasMaps.setKey(full.trip.gmapsKey);
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
  const pill = $("#syncBadge"), txt = $("#syncText");
  if (!pill || !txt) return;
  pill.setAttribute("data-status", info.status);
  const map = { checking: "Conectando...", synced: "Sincronizado", syncing: "Salvando...", offline: "Sem rede", local_only: "Local", unauth: "Desconectado" };
  txt.textContent = map[info.status] || "Local";
}

async function boot() {
  initTheme();
  populateTypeSelectors();
  window.FeriasApi.onStatus(updateSyncBadge);

  const cfg = await window.FeriasApi.initServer();
  if (!cfg.serverAvailable) {
    // Fallback offline sem servidor
    await enterApp();
    return;
  }

  if (cfg.user) {
    await enterApp();
  } else {
    $("#authView").hidden = false;
    $("#appShell").hidden = true;
    setupGoogleSignInButton(cfg.googleClientId);
  }
}

/* ---------- EVENTOS ---------- */
$("#authThemeBtn").onclick = $("#btnTheme").onclick = () => applyTheme(isDarkTheme() ? "light" : "dark");

$("#authModeTabs").querySelectorAll("button").forEach(b => {
  b.onclick = () => {
    authMode = b.dataset.amode;
    $("#authModeTabs").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    $("#authNameWrap").hidden = authMode !== "register";
    $("#authName").required = authMode === "register";
    $("#authSubmitBtn").textContent = authMode === "register" ? "Criar conta e entrar" : "Entrar";
    $("#authError").hidden = true;
  };
});

$("#authForm").onsubmit = async e => {
  e.preventDefault();
  const errEl = $("#authError");
  errEl.hidden = true;
  const email = $("#authEmail").value.trim();
  const pass = $("#authPassword").value;
  try {
    if (authMode === "register") {
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
  await window.FeriasApi.logout();
  location.reload();
};

$("#tripSelect").onchange = e => openTripById(e.target.value);
$("#btnNewTrip").onclick = () => { $("#nt-name").value = ""; $("#newTripModal").showModal(); };
$("#btnCloseNewTrip").onclick = $("#btnCancelNewTrip").onclick = () => $("#newTripModal").close();
$("#newTripForm").onsubmit = async e => {
  e.preventDefault();
  const name = $("#nt-name").value.trim();
  if (!name) return;
  const copyVeh = $("#nt-copyVehicle").checked;
  const data = window.createBlankTripData(name, copyVeh ? state.vehicle : null);
  const created = await window.FeriasApi.createTrip(name, data, window.FeriasMaps.getKey());
  $("#newTripModal").close();
  await refreshTripsAndLoad(created.id);
  toast(`✈️ Viagem "${name}" criada!`);
};

$("#btnRenameTrip").onclick = async () => {
  if (!activeTrip) return;
  const n = prompt("Novo nome para estas férias:", state.title || activeTrip.name);
  if (!n || !n.trim()) return;
  state.title = n.trim();
  activeTrip.name = state.title;
  save("✏️ Viagem renomeada");
  await refreshTripsAndLoad(activeTrip.id);
};

$("#btnDeleteTrip").onclick = async () => {
  if (!activeTrip || activeTrip.role !== "owner") return toast("Apenas o criador pode excluir esta viagem.");
  if (!confirm(`Excluir permanentemente "${state.title}" e todos os anexos?`)) return;
  await window.FeriasApi.deleteTrip(activeTrip.id);
  toast("🗑️ Viagem excluída");
  await refreshTripsAndLoad();
};

$("#btnShareTrip").onclick = openShareModal;
$("#btnCloseShare").onclick = () => $("#shareModal").close();
$("#shareForm").onsubmit = async e => {
  e.preventDefault();
  try {
    await window.FeriasApi.shareTrip(activeTrip.id, $("#shareEmail").value.trim(), $("#shareRole").value);
    $("#shareEmail").value = "";
    await refreshShareList();
    toast("📩 Convite enviado!");
  } catch (err) {
    toast("❌ " + err.message);
  }
};

$("#btnPendingInvites").onclick = () => $("#invitesBanner").scrollIntoView({ behavior: "smooth" });

document.querySelectorAll(".tab").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === b));
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + b.dataset.view));
  };
});

$("#btnAdd").onclick = () => openModal();
$("#btnCloseX").onclick = $("#btnCancel").onclick = () => $("#modal").close();
$("#f-type").onchange = toggleTrip;

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
  for (const file of files) {
    try {
      toast(`📎 Enviando ${file.name}...`);
      const att = await window.FeriasApi.uploadAttachment(activeTrip.id, modalDraftId, file);
      modalAttachments.push(att);
      renderModalAttachments();
      toast(`✅ "${file.name}" anexado!`);
    } catch (err) {
      toast("❌ " + err.message);
    }
  }
  e.target.value = "";
};

$("#btnAttachLink").onclick = () => {
  const url = prompt("Cole o link do documento / comprovante / ingresso (https://...):");
  if (!url || !url.trim()) return;
  const name = prompt("Nome do documento:", "Comprovante / Link") || "Documento";
  modalAttachments.push({ id: uid(), fileName: name.trim(), url: url.trim(), uploadedAt: Date.now() });
  renderModalAttachments();
};

function getEffectiveGoogleClientId() {
  return (
    (window.FeriasApi && window.FeriasApi.getGoogleClientId()) ||
    (state.params && state.params.googleClientId) ||
    localStorage.getItem("ferias-pro-gcal-client-id") ||
    ""
  ).trim();
}

function setLocalGoogleClientId(cid) {
  const clean = (cid || "").trim();
  state.params.googleClientId = clean;
  if (clean) localStorage.setItem("ferias-pro-gcal-client-id", clean);
  else localStorage.removeItem("ferias-pro-gcal-client-id");
}

async function executeSmartCalendarSync() {
  const cid = getEffectiveGoogleClientId();
  const body = $("#calSyncBody");
  const btnNow = $("#btnCalSyncNow");
  const acts = sorted();
  const rem = state.params.calendarReminderTime || "09:00";
  const tid = activeTrip?.id || "default";

  if (!cid) {
    btnNow.hidden = true;
    const feedUrl = activeTrip?.calToken ? window.FeriasApi.getCalendarFeedUrl(activeTrip.calToken) : "";
    const webcalUrl = feedUrl ? feedUrl.replace(/^https?:\/\//i, "webcal://") : "";
    const gcalSubscribeUrl = webcalUrl ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}` : "";
    const isLocalHost = location.hostname === "127.0.0.1" || location.hostname === "localhost";

    body.innerHTML = `
      ${feedUrl ? `
        <div class="gmaps-key-panel" style="margin-top:0">
          <strong>1️⃣ Assinar Calendário Automático (1 clique · sem configurar nada)</strong>
          <p class="muted small">Assine uma única vez: todas as viagens, eventos e lembretes (dia anterior às <b>${esc(rem)}</b>) são publicados pela sua VPS e atualizam sozinhos na sua agenda.</p>
          <div class="key-actions-row">
            <a class="btn primary small" href="${esc(gcalSubscribeUrl)}" target="_blank" rel="noopener">📅 Assinar no Google Agenda</a>
            <a class="btn ghost small" href="${esc(webcalUrl)}">🍎 Assinar no iPhone / Mac</a>
            <button type="button" class="btn ghost small" id="btnCopyCalFeed">📋 Copiar link</button>
          </div>
          ${isLocalHost ? `<p class="muted small">💡 A assinatura automática por link funciona quando acessado pelo seu domínio público (<code>https://feriaspro.digitalinpulse.com.br</code>).</p>` : `<p class="muted small">ℹ️ O Google Agenda atualiza assinaturas externas periodicamente. Para atualização no mesmo segundo, use o arquivo <code>.ics</code> abaixo ou o modo API.</p>`}
        </div>
      ` : ""}

      <div class="gmaps-key-panel" style="margin-top:0">
        <strong>2️⃣ Importar / Atualizar na hora (.ics inteligente)</strong>
        <p class="muted small">Baixe o arquivo e importe no Google Agenda — cada evento tem ID único para atualizar sem duplicar.</p>
        <div class="key-actions-row">
          <a class="btn ghost small" href="https://calendar.google.com/calendar/u/0/r/settings/export" target="_blank" rel="noopener">📂 Abrir Importador do Google Agenda ↗</a>
        </div>
      </div>

      <details class="help-details">
        <summary>⚡ Modo instantâneo com botão "Autorizar Google" (opcional)</summary>
        <div style="display:grid;gap:8px;margin-top:8px">
          <p class="muted small">Se você quiser que o app peça permissão na janela do Google e envie/altere/apague em 1 segundo, cole o <b>OAuth Client ID</b> (configurado 1 única vez):</p>
          <div class="key-input-row">
            <input type="text" id="calModalClientId" placeholder="123456-abc.apps.googleusercontent.com" style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:9px 11px;color:var(--text-strong);width:100%">
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
        if (!val) return toast("Cole o OAuth Client ID do Google.");
        setLocalGoogleClientId(val);
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
  body.innerHTML = `<p>⏳ Abrindo autorização da sua conta Google e comparando <b>${acts.length}</b> atividade(s)...</p>`;
  try {
    const res = await window.FeriasCalendar.smartSyncTrip(acts, state.title, cid, rem, tid, true);
    body.innerHTML = `
      <p>✅ <b>Sincronização concluída</b> para <b>${esc(state.title)}</b> (lembrete no dia anterior às <b>${esc(rem)}</b>):</p>
      <div class="cal-sync-stats">
        <div class="cal-stat"><b>${res.created}</b><span class="muted small">Criados</span></div>
        <div class="cal-stat"><b>${res.updated}</b><span class="muted small">Atualizados</span></div>
        <div class="cal-stat"><b>${res.deleted}</b><span class="muted small">Removidos</span></div>
        <div class="cal-stat"><b>${res.unchanged}</b><span class="muted small">Sem alteração</span></div>
      </div>
      <p class="muted small">Se você alterar datas, nomes ou excluir eventos no Férias Pro e clicar em Agenda novamente, apenas as mudanças serão aplicadas.</p>`;
    btnNow.textContent = "🔄 Sincronizar Novamente";
    toast(`📅 Agenda: ${res.created} criados · ${res.updated} atualizados · ${res.deleted} removidos`);
  } catch (err) {
    body.innerHTML = `<div class="auth-error">❌ ${esc(err.message || err)}</div>
      <p class="muted small">Você também pode usar o botão <b>Baixar .ics agora</b> abaixo para importar na hora.</p>`;
    btnNow.textContent = "Tentar Novamente";
  } finally {
    btnNow.disabled = false;
  }
}

function openSmartCalendarModal() {
  const modal = $("#calSyncModal");
  modal.showModal();
  executeSmartCalendarSync();
}

$("#btnCalDirect").onclick = async () => {
  const cid = getEffectiveGoogleClientId();
  if (!cid) {
    window.open($("#btnCalLink").href, "_blank", "noopener");
    return toast("Abrindo Google Agenda com dados preenchidos.");
  }
  try {
    const a = readForm();
    if (editing) a.id = editing;
    const res = await window.FeriasCalendar.syncSingleActivity(a, state.title, cid, state.params.calendarReminderTime, activeTrip?.id || "default");
    toast(`📅 Google Agenda: ${res.created ? "evento criado" : res.updated ? "evento atualizado" : "já atualizado"}!`);
  } catch (err) {
    toast("❌ " + (err.message || err));
  }
};

$("#btnCalIcs").onclick = () => {
  const a = readForm();
  if (editing) a.id = editing;
  window.FeriasCalendar.downloadIcs([a], a.name || state.title, state.params.calendarReminderTime, activeTrip?.id || "local");
  toast("📆 Arquivo .ics baixado (com lembrete 09:00 do dia anterior)!");
};

$("#btnSyncCalendarTop").onclick = $("#btnSyncAllCalendar").onclick = $("#btnMenuCalendarAll").onclick = openSmartCalendarModal;
$("#btnCloseCalSync").onclick = () => $("#calSyncModal").close();
$("#btnCalSyncIcs").onclick = $("#btnDownloadAllIcs").onclick = $("#btnExportIcs").onclick = () => {
  window.FeriasCalendar.downloadIcs(sorted(), state.title, state.params.calendarReminderTime, activeTrip?.id || "local");
  toast("📆 Agenda .ics inteligente baixada!");
};
$("#btnCalSyncNow").onclick = () => {
  const inp = $("#calModalClientId");
  if (inp && inp.value.trim()) {
    setLocalGoogleClientId(inp.value.trim());
    save();
    renderParams();
  }
  executeSmartCalendarSync();
};
$("#btnSaveCalClientId").onclick = () => {
  setLocalGoogleClientId($("#calClientIdInput").value);
  save("📅 Client ID Google Agenda salvo!");
};

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

$("#form").onsubmit = e => {
  e.preventDefault();
  const a = readForm();
  if (!a.name || !a.start) return;
  if (editing) {
    const o = state.activities.find(x => x.id === editing);
    for (const k of ["from", "to", "km", "drive", "stops", "stopTime", "toll", "charges", "airline", "bookingRef", "includeRouteCost"]) delete o[k];
    Object.assign(o, a);
  } else {
    state.activities.push({ id: modalDraftId || uid(), ...a });
  }
  $("#modal").close();
  save(editing ? "✔️ Atividade atualizada" : "➕ Atividade adicionada");
};

$("#btnDelete").onclick = () => { const id = editing; $("#modal").close(); delActivity(id); };
$("#btnDuplicate").onclick = () => {
  const a = { id: uid(), ...readForm() };
  a.name += " (cópia)";
  state.activities.push(a);
  $("#modal").close();
  save("⧉ Duplicado");
};

// Gantt controls
$("#ganttTypeFilter").onchange = e => {
  ganttFilter = e.target.value;
  const s = sorted();
  renderGantt(s);
  renderTimeline(s);
};
$("#ganttModeSeg").querySelectorAll("button").forEach(b => {
  b.onclick = () => {
    ganttMode = b.dataset.gmode;
    $("#ganttModeSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    const s = sorted();
    renderGantt(s);
    renderTimeline(s);
  };
});
$("#ganttZoomSeg").querySelectorAll("button").forEach(b => {
  b.onclick = () => {
    ganttZoom = parseInt(b.dataset.zoom, 10) || 50;
    $("#ganttZoomSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    renderGantt(sorted());
  };
});
$("#btnGanttToday").onclick = () => {
  const wrap = $("#ganttWrap");
  const todayHead = wrap.querySelector(".g-head.today");
  wrap.scrollTo({ left: todayHead ? Math.max(0, todayHead.offsetLeft - 180) : 0, behavior: "smooth" });
};

/* ---------- IMPRIMIR / EXPORTAR GANTT HORIZONTAL, TABELA & RELATÓRIO ---------- */
function reportHelpers() {
  return { parseD, fmtISO, fmtBR, fmtShortBR, days, hm, hmHuman, num, money, calc, getTypeInfo, WD, DAY };
}

$("#btnPrintGantt").onclick = () => {
  const s = sorted();
  const minISO = s.length ? s[0].start : fmtISO(new Date());
  const maxISO = s.length ? s.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, minISO) : minISO;
  $("#gp-from").value = minISO;
  $("#gp-to").value = maxISO;

  // Cria atalhos rápidos de intervalo / páginas semanais
  const chipsEl = $("#gpQuickChips");
  const chips = [{ lbl: `Tudo (${fmtShortBR(minISO)}–${fmtShortBR(maxISO)})`, from: minISO, to: maxISO }];
  const startMs = parseD(minISO).getTime(), endMs = parseD(maxISO).getTime();
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
};
$("#btnCloseGanttPrint").onclick = () => $("#ganttPrintModal").close();
$("#btnGpImage").onclick = () => {
  const f = $("#gp-from").value, t = $("#gp-to").value;
  if (!f || !t) return toast("Selecione as datas.");
  const ok = window.FeriasReport.exportGanttImage(state, sorted(), f, t, reportHelpers());
  if (!ok) toast("Nenhuma atividade no intervalo selecionado.");
  else { $("#ganttPrintModal").close(); toast("🖼️ Imagem PNG horizontal baixada!"); }
};
$("#ganttPrintForm").onsubmit = async e => {
  e.preventDefault();
  const f = $("#gp-from").value, t = $("#gp-to").value;
  if (!f || !t) return;
  $("#ganttPrintModal").close();
  await window.FeriasReport.exportGanttPdf(state, sorted(), f, t, reportHelpers());
};

$("#btnTablePdf").onclick = () => {
  const q = ($("#search").value || "").toLowerCase();
  const ft = $("#filterType").value;
  const rows = sorted().filter(a => (!ft || a.type === ft) && (!q || (label(a) + " " + (a.notes || "")).toLowerCase().includes(q)));
  window.FeriasReport.printTableLandscape(rows, state, totals(), reportHelpers());
};

$("#btnPrintReport").onclick = () => {
  window.FeriasReport.printFullTripReport(state, sorted(), totals(), reportHelpers(), window.FeriasMaps ? window.FeriasMaps.getKey() : "");
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

/* ---------- GOOGLE WALLET / PASSE POR ATIVIDADE ---------- */
function walletActSig(a) {
  return [a.id || "", a.type || "", a.name || "", a.start || "", a.end || "", a.extraCost || 0, a.bookingRef || "", a.from || "", a.to || ""].join("|");
}

function prefetchModalWalletPass() {
  prefetchedPkpass = null;
  if (!window.FeriasApi || !window.FeriasApi.isServer() || !window.FeriasApi.createPkpassUrl) return;
  if (window.FeriasApi.getServerCaps && window.FeriasApi.getServerCaps().hasWallet) return;
  const a = readForm();
  a.id = editing || modalDraftId || uid();
  if (!a.name) return;
  const sig = walletActSig(a);
  window.FeriasApi.createPkpassUrl(a, state.title)
    .then(pk => {
      if (pk && pk.pkpassUrl) prefetchedPkpass = { sig, pkpassUrl: pk.pkpassUrl, filename: pk.filename };
    })
    .catch(() => {});
}

function triggerPkpassOpen(url) {
  const fullUrl = new URL(url, window.location.origin).href;
  const isAndroid = /android/i.test(navigator.userAgent);
  if (isAndroid && fullUrl.startsWith("https://")) {
    const cleanHostPath = fullUrl.replace(/^https:\/\//, "");
    const intentUrl = `intent://${cleanHostPath}#Intent;scheme=https;action=android.intent.action.VIEW;type=application/vnd.apple.pkpass;package=com.google.android.apps.walletnfcrel;S.browser_fallback_url=${encodeURIComponent(fullUrl)};end`;
    window.location.href = intentUrl;
    return;
  }
  const link = document.createElement("a");
  link.href = fullUrl;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => link.remove(), 1200);
}

async function openWalletPassForCurrentActivity() {
  const a = readForm();
  if (editing) a.id = editing;
  else a.id = modalDraftId || uid();
  if (!a.name) return toast("Preencha o nome da atividade primeiro.");

  const modal = $("#walletModal");
  const body = $("#walletBody");
  const openBtn = $("#btnOpenGoogleWallet");
  const pkBtn = $("#btnDownloadPkpass");
  const setupDet = $("#walletSetupDetails");
  openBtn.hidden = true;
  if (pkBtn) pkBtn.hidden = true;

  const sig = walletActSig(a);
  const hasServerWallet = Boolean(window.FeriasApi.getServerCaps && window.FeriasApi.getServerCaps().hasWallet);

  // Caminho instantâneo síncrono dentro do clique (evita bloqueio do gesto pelo navegador)
  if (!hasServerWallet && prefetchedPkpass && prefetchedPkpass.sig === sig) {
    const pk = prefetchedPkpass;
    prefetchedPkpass = null;
    triggerPkpassOpen(pk.pkpassUrl);
    if (pkBtn) {
      pkBtn.href = pk.pkpassUrl;
      pkBtn.removeAttribute("download");
      pkBtn.hidden = false;
    }
    if (setupDet) setupDet.hidden = false;
    body.innerHTML = `
      <p>✅ <b>Passe enviado direto para o Google Wallet!</b> Caso o app não abra na hora, toque em <b>💳 Abrir Passe (.pkpass) no Google Wallet</b> abaixo ou salve o Passe QR.</p>`;
    window.FeriasReport.renderWalletPassCanvas($("#walletPassCanvas"), a, state.title, reportHelpers());
    modal.showModal();
    prefetchModalWalletPass();
    return;
  }

  try {
    const res = await window.FeriasApi.signWalletPass(a, state.title);
    if (res.configured && res.saveUrl) {
      window.open(res.saveUrl, "_blank", "noopener");
      openBtn.href = res.saveUrl;
      openBtn.hidden = false;
      if (setupDet) setupDet.hidden = true;
      body.innerHTML = `<p>✅ <b>Google Wallet aberto!</b> Autorize na janela do Google Wallet que abriu (ou toque em <b>💳 Autorizar no Google Wallet</b> abaixo).</p>`;
      window.FeriasReport.renderWalletPassCanvas($("#walletPassCanvas"), a, state.title, reportHelpers());
      modal.showModal();
      return;
    }

    if (window.FeriasApi.isServer() && window.FeriasApi.createPkpassUrl) {
      const pk = await window.FeriasApi.createPkpassUrl(a, state.title);
      if (pk && pk.pkpassUrl) {
        triggerPkpassOpen(pk.pkpassUrl);
        if (pkBtn) {
          pkBtn.href = pk.pkpassUrl;
          pkBtn.removeAttribute("download");
          pkBtn.hidden = false;
        }
        if (setupDet) setupDet.hidden = false;
        body.innerHTML = `
          <p>✅ <b>Passe enviado para o Google Wallet!</b> Caso o navegador peça confirmação, toque em <b>Abrir</b> (ou no botão azul abaixo).</p>
          <p class="muted small">Você também pode salvar o cartão visual QR ou ativar o link direto online (Issuer ID) abaixo.</p>`;
        window.FeriasReport.renderWalletPassCanvas($("#walletPassCanvas"), a, state.title, reportHelpers());
        modal.showModal();
        return;
      }
    }

    if (setupDet) setupDet.hidden = false;
    body.innerHTML = `
      <p>📲 <b>Cartão pronto!</b> Baixe o Passe QR abaixo (<b>⬇️ Salvar Passe QR</b>), abra o app <b>Google Wallet</b> e toque em <b>"+ Adicionar à Carteira ➔ Foto"</b>.</p>`;
  } catch (err) {
    if (setupDet) setupDet.hidden = false;
    body.innerHTML = `<div class="auth-error">❌ ${esc(err.message || err)}</div>
      <p class="muted small">Você ainda pode salvar a imagem QR e importar direto pelo app Google Wallet.</p>`;
  }
  window.FeriasReport.renderWalletPassCanvas($("#walletPassCanvas"), a, state.title, reportHelpers());
  modal.showModal();
}

$("#btnWalletDirect").onclick = openWalletPassForCurrentActivity;
$("#btnCloseWallet").onclick = () => $("#walletModal").close();
$("#btnDownloadPassPng").onclick = () => {
  const c = $("#walletPassCanvas");
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = `passe_ferias_pro.png`;
  a.click();
  toast("🖼️ Passe QR salvo!");
};
if ($("#btnWalletPickFile")) {
  $("#btnWalletPickFile").onclick = () => $("#walletInlineJsonFile").click();
  $("#walletInlineJsonFile").onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    const issuer = $("#walletIssuerInline").value.trim();
    if (!issuer) { e.target.value = ""; return toast("Informe o Issuer ID do Google Wallet primeiro."); }
    try {
      const jsonStr = await f.text();
      await window.FeriasApi.saveIntegrations({ walletIssuerId: issuer, walletSaJson: jsonStr });
      $("#walletFileStatus").textContent = "✅ Ativado! Reabrindo Google Wallet...";
      toast("✅ Google Wallet 1-clique ativado!");
      $("#walletModal").close();
      openWalletPassForCurrentActivity();
    } catch (err) {
      $("#walletFileStatus").textContent = "❌ " + (err.message || err);
    }
    e.target.value = "";
  };
}

/* ---------- IA GEMINI NA ATIVIDADE (PRINT DE VOO / TICKET / TEXTO) ---------- */
function applyExtractedActivityToForm(act) {
  if (!act || typeof act !== "object") return;
  if (act.type && window.ACTIVITY_TYPES[act.type]) $("#f-type").value = act.type;
  toggleTrip();
  if (act.name) $("#f-name").value = act.name;
  if (act.start) $("#f-start").value = act.start;
  if (act.end) $("#f-end").value = act.end;
  if (act.extraCost != null && Number(act.extraCost) > 0) {
    modalTickets = [{ label: "IA", qty: 1, unitPrice: Number(act.extraCost) }];
    renderTicketRows();
  }
  if ($("#f-type").value === "Voo") {
    if (act.from) $("#f-flightFrom").value = act.from;
    if (act.to) $("#f-flightTo").value = act.to;
    if (act.bookingRef) $("#f-bookingRef").value = act.bookingRef;
  } else if ($("#f-type").value === "Trem" || $("#f-type").value === "Ônibus") {
    if (act.from) $("#f-transitFrom").value = act.from;
    if (act.to) $("#f-transitTo").value = act.to;
    if (act.bookingRef) $("#f-transitRef").value = act.bookingRef;
  } else if ($("#f-type").value === "Viagem") {
    if (act.from) $("#f-from").value = act.from;
    if (act.to) $("#f-to").value = act.to;
  } else if (act.bookingRef) {
    $("#f-ticketRef").value = act.bookingRef;
  }
  if (act.notes) $("#f-notes").value = act.notes;
  updateModalPreview();
}

function fileToBase64Obj(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve({ fileName: file.name, mimeType: file.type || "image/jpeg", dataBase64: fr.result });
    fr.onerror = () => reject(new Error("Erro ao ler arquivo."));
    fr.readAsDataURL(file);
  });
}

$("#btnActAiUpload").onclick = () => $("#actAiFile").click();
$("#actAiFile").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  toast("✨ Analisando documento com Gemini IA...");
  try {
    const m = await fileToBase64Obj(f);
    const act = await window.FeriasApi.aiAnalyzeActivity({ prompt: "Extraia dados completos deste bilhete/passagem/reserva/documento.", media: [m] });
    applyExtractedActivityToForm(act);
    toast("✅ Campos preenchidos com IA!");
  } catch (err) {
    toast(String(err.message).includes("GEMINI_NOT_CONFIGURED") ? "Configure sua Gemini Key em Parâmetros ou Planejar com IA." : "❌ " + (err.message || err));
  }
  e.target.value = "";
};

$("#btnActAiText").onclick = async () => {
  const txt = prompt("Descreva a atividade (ex: Voo LATAM Brasília para Maceió dia 15/01/2027 por R$ 1.850 reserva ABC123):");
  if (!txt || !txt.trim()) return;
  toast("✨ Extraindo dados com Gemini IA...");
  try {
    const act = await window.FeriasApi.aiAnalyzeActivity({ prompt: txt.trim(), media: [] });
    applyExtractedActivityToForm(act);
    toast("✅ Campos preenchidos com IA!");
  } catch (err) {
    toast(String(err.message).includes("GEMINI_NOT_CONFIGURED") ? "Configure sua Gemini Key em Parâmetros ou Planejar com IA." : "❌ " + (err.message || err));
  }
};

/* ---------- MODAL PLANEJAR COM IA (ÁUDIO + MÚLTIPLAS IMAGENS + DOCUMENTOS) ---------- */
let aiAttachedMedia = [];
let aiMediaRecorder = null;
let aiAudioChunks = [];
let aiRecordTimerInt = null;
let aiRecordSec = 0;

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
  $("#aiPromptText").value = "";
  $("#aiPlanStatus").innerHTML = "";
  const caps = window.FeriasApi.getServerCaps ? window.FeriasApi.getServerCaps() : { hasGemini: false };
  $("#aiKeyInlineBox").hidden = caps.hasGemini;
  renderAiMediaList();
  $("#aiPlanModal").showModal();
}

$("#btnAiPlan").onclick = $("#btnMenuAiPlan").onclick = openAiPlanModal;
$("#btnCloseAiPlan").onclick = $("#btnCancelAiPlan").onclick = () => {
  if (aiMediaRecorder && aiMediaRecorder.state === "recording") {
    try { aiMediaRecorder.stop(); } catch {}
  }
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
      aiAttachedMedia.push(await fileToBase64Obj(f));
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
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return toast("Seu navegador não liberou gravação de microfone aqui. Use o botão Anexar Áudio ou descreva em texto.");
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    aiAudioChunks = [];
    aiMediaRecorder = new MediaRecorder(stream);
    aiMediaRecorder.ondataavailable = ev => { if (ev.data.size > 0) aiAudioChunks.push(ev.data); };
    aiMediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(aiAudioChunks, { type: aiMediaRecorder.mimeType || "audio/webm" });
      const fileObj = await fileToBase64Obj(new File([blob], `planejamento_${Date.now()}.webm`, { type: blob.type }));
      aiAttachedMedia.push(fileObj);
      renderAiMediaList();
      toast("🎙️ Áudio gravado e anexado!");
    };
    aiMediaRecorder.start();
    aiRecordSec = 0;
    timerEl.textContent = "● Gravando 0:00";
    timerEl.hidden = false;
    btn.textContent = "⏹️ Parar Gravação";
    clearInterval(aiRecordTimerInt);
    aiRecordTimerInt = setInterval(() => {
      aiRecordSec++;
      const m = Math.floor(aiRecordSec / 60), s = aiRecordSec % 60;
      timerEl.textContent = `● Gravando ${m}:${String(s).padStart(2, "0")}`;
    }, 1000);
  } catch (err) {
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
  const promptText = $("#aiPromptText").value.trim();
  if (!promptText && !aiAttachedMedia.length) {
    return toast("Grave um áudio, anexe imagens/documentos ou escreva seu planejamento.");
  }
  const st = $("#aiPlanStatus");
  const btn = $("#btnRunAiPlan");
  btn.disabled = true;
  st.innerHTML = `<span>⏳ Gemini IA analisando áudios, imagens e roteiro...</span>`;
  let plan = null;
  try {
    plan = await window.FeriasApi.aiPlanTrip({
      prompt: promptText,
      baseDate: fmtISO(new Date()),
      baseVehicle: state.vehicle,
      media: aiAttachedMedia
    });
  } catch (err) {
    if (String(err.message).includes("GEMINI_NOT_CONFIGURED") && promptText && !aiAttachedMedia.length) {
      plan = buildFallbackOfflineTripPlan(promptText);
    } else {
      st.innerHTML = `<span class="auth-error">❌ ${esc(err.message === "GEMINI_NOT_CONFIGURED" ? "Ative sua Gemini API Key acima para processar áudio e imagens." : err.message)}</span>`;
      btn.disabled = false;
      return;
    }
  }

  try {
    const tripTitle = plan.tripName || "Nova Viagem (IA)";
    const baseData = window.createBlankTripData(tripTitle, plan.vehicle || state.vehicle);
    if (plan.params) Object.assign(baseData.params, plan.params);
    if (Array.isArray(plan.activities)) {
      baseData.activities = plan.activities.map(a => ({
        id: uid(),
        type: window.ACTIVITY_TYPES[a.type] ? a.type : "Outro",
        name: String(a.name || "Atividade"),
        start: /^\d{4}-\d{2}-\d{2}$/.test(a.start) ? a.start : fmtISO(new Date()),
        end: /^\d{4}-\d{2}-\d{2}$/.test(a.end) ? a.end : (/^\d{4}-\d{2}-\d{2}$/.test(a.start) ? a.start : fmtISO(new Date())),
        from: a.from || "",
        to: a.to || "",
        km: Number(a.km) || 0,
        drive: Number(a.drive) || 0,
        stops: a.type === "Viagem" && a.drive ? computeAutoStops(Number(a.drive)).stops : 0,
        stopTime: a.type === "Viagem" && a.drive ? computeAutoStops(Number(a.drive)).stopTime : 0,
        toll: Number(a.toll) || 0,
        charges: a.type === "Viagem" ? 1 : undefined,
        extraCost: Number(a.extraCost) || 0,
        bookingRef: a.bookingRef || "",
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

function openProfileModal() {
  const u = window.FeriasApi.getUser() || {};
  $("#prof-name").value = u.name || "";
  $("#prof-waCountry").value = u.whatsappCountry || "+55";
  $("#prof-waNumber").value = u.whatsappNumber ? window.FeriasCountries.formatPhoneMask(u.whatsappCountry || "+55", u.whatsappNumber) : "";
  $("#prof-waError").hidden = true;
  $("#prof-geminiKey").value = "";
  $("#prof-walletIssuer").value = u.integrations?.walletIssuerId || "";
  $("#prof-walletSa").value = "";
  $("#profileModal").showModal();
}

$("#btnOpenProfile").onclick = $("#btnMenuProfile").onclick = $("#btnParamProfile").onclick = openProfileModal;
$("#btnCloseProfile").onclick = $("#btnCancelProfile").onclick = () => $("#profileModal").close();
if ($("#btnProfPickWalletJson")) {
  $("#btnProfPickWalletJson").onclick = () => $("#prof-walletJsonFile").click();
  $("#prof-walletJsonFile").onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    $("#prof-walletSa").value = await f.text();
    toast("📂 Chave .json carregada! Clique em Salvar Perfil.");
    e.target.value = "";
  };
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
  const dial = $("#prof-waCountry").value;
  const rawWa = $("#prof-waNumber").value.trim();
  const errEl = $("#prof-waError");
  errEl.hidden = true;

  if (rawWa) {
    const check = window.FeriasCountries.validateWhatsApp(dial, rawWa);
    if (!check.valid) {
      errEl.textContent = check.error;
      errEl.hidden = false;
      return false;
    }
  }
  await window.FeriasApi.updateProfile({ name, whatsappCountry: dial, whatsappNumber: rawWa });
  const gk = $("#prof-geminiKey").value.trim();
  const wi = $("#prof-walletIssuer").value.trim();
  const wsa = $("#prof-walletSa").value.trim();
  if (gk || wi || wsa) {
    await window.FeriasApi.saveIntegrations({
      ...(gk ? { geminiKey: gk } : {}),
      walletIssuerId: wi,
      ...(wsa ? { walletSaJson: wsa } : {})
    });
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
  const text = window.FeriasCountries.buildWhatsAppTripMessage(state, sorted(), totals(), calc, reportHelpers());
  const url = `https://wa.me/${check.e164Digits}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");
  toast(`💬 Abrindo WhatsApp para ${check.fullDisplay}...`);
}

$("#btnSendWhatsApp").onclick = $("#btnMenuWhatsApp").onclick = $("#btnDashWhatsApp").onclick = sendPlanToMyWhatsApp;
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
$("#search").oninput = $("#filterType").onchange = () => renderTable(sorted(), totals());
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

$("#btnExportXlsx").onclick = exportXlsx;
$("#btnExportJson").onclick = () => {
  download(`${(state.title || "ferias_pro").replace(/[^\w\-]+/g, "_")}.json`, new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
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
    state = migrateState(d);
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

window.addEventListener("resize", () => { if (ganttMode === "gantt") renderGantt(sorted()); });

boot();
