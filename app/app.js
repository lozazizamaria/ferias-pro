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

let tripsCache = { ownTrips: [], sharedTrips: [], pendingShares: [] };
let activeTrip = null; // { id, name, role, ownerName, ... }
let state = migrateState(clone(window.DEFAULT_DATA));
let authMode = "login";
let deferredInstallPrompt = null;

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
    if (a.type === "Viagem" && a.charges == null) a.charges = merged.params.defaultCharges ?? 1;
  });
  merged.checklist.forEach(c => { if (!c.id) c.id = uid(); });
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
  const icon = $("#themeIcon"), lbl = $("#themeLabel"), authBtn = $("#authThemeBtn");
  if (icon) icon.textContent = t === "dark" ? "☀️" : "🌙";
  if (lbl) lbl.textContent = t === "dark" ? "Dia" : "Noite";
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
const label = a => (a.type === "Viagem" || a.type === "Voo") && (a.from || a.to) ? `${a.name} (${a.from || "?"} ➔ ${a.to || "?"})` : a.name;
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
  const r = { ev: 0, hev: 0, liters: 0, fuel: 0, charge: 0, toll: 0, total: 0, extra: +a.extraCost || 0, tanks: 0, time: 0 };
  if (a.type !== "Viagem" || !(a.km > 0)) return r;

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
  r.time = (+a.drive || 0) + (+a.stopTime || 0);
  return r;
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

  state.activities.forEach(a => {
    const ex = +a.extraCost || 0;
    t.activitiesExtra += ex;
    if (a.type === "Voo") t.flightsCost += ex;
    else if (a.type === "Hospedagem") t.lodgingActCost += ex;
    else t.otherActCost += ex;

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
  // Hospedagem flexível por todas as noites das férias (ou número personalizado), NÃO atrelada a "Período"
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
  renderTable(s, t);
  renderParams();
  renderChecklist();
}

function buildRightSummaryHTML(a) {
  const info = getTypeInfo(a.type);
  const attCount = Array.isArray(a.attachments) ? a.attachments.length : 0;
  const attBadge = attCount ? `<span class="g-summary-meta">📎 ${attCount}</span>` : "";

  if (a.type === "Viagem") {
    const c = calc(a);
    const routeTxt = (a.from || a.to) ? `${esc(a.from || "?")} ➔ ${esc(a.to || "?")}` : "";
    const parts = [];
    if (a.km) parts.push(`${num(a.km)} km`);
    if (a.drive) parts.push(hmHuman(a.drive) + (a.stopTime ? ` + ${hmHuman(a.stopTime)}` : ""));
    if (a.toll) parts.push(`Ped. ${money(a.toll)}`);
    return `
      <div class="g-summary ${info.cls}" data-id="${a.id}">
        <span class="g-summary-title">${esc(a.name)}</span>
        ${routeTxt ? `<span class="g-summary-meta">${routeTxt}</span>` : ""}
        ${parts.length ? `<span class="g-summary-badge">${parts.join(" · ")}</span>` : ""}
        <span class="g-summary-meta">${money(c.total + c.extra)}</span>
        ${attBadge}
      </div>`;
  }

  const d = days(a);
  const metaParts = [];
  if (a.from || a.to) metaParts.push(`${a.from || "?"} ➔ ${a.to || "?"}`);
  if (a.extraCost > 0) metaParts.push(money(a.extraCost));
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
  const nameW = ganttSlimRail ? 48 : (window.innerWidth < 720 ? 156 : 260);
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

  let h = `<div class="g-corner">${ganttSlimRail ? "Tipo" : "Atividade"}</div>`;

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
    const subLeft = (a.type === "Viagem" || a.type === "Voo") && (a.from || a.to)
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
    const meta = a.type === "Viagem"
      ? `${a.from || "?"} ➔ ${a.to || "?"} · ${num(a.km)} km · ${hmHuman(a.drive)}${a.stopTime ? ` (+${hmHuman(a.stopTime)} par.)` : ""} · Ped. ${money(a.toll)} · Total ${money(c.total + c.extra)}`
      : `${days(a)} dia(s)${a.extraCost ? ` · ${money(a.extraCost)}` : ""}${a.notes ? ` · ${a.notes}` : ""}`;
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
    const sub = a.type === "Viagem"
      ? `${num(a.km)} km · ${hmHuman(calc(a).time)} · ${money(calc(a).total)}`
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

  const lodgingAll = t.lodgingParamCost + t.lodgingActCost;
  const foodAndFixed = t.foodCost + t.otherFixedBudget + t.contingencyCost;
  const parts = [
    ["Gasolina / Combustível", t.fuel, "linear-gradient(90deg,#fb7185,#f5b544)"],
    ["Pedágios", t.toll, "linear-gradient(90deg,#a78bfa,#7c5cff)"],
    ["Recargas EV", t.charge, "linear-gradient(90deg,#34d399,#22d3ee)"]
  ];
  if (t.flightsCost > 0) parts.push(["Passagens Aéreas / Voos", t.flightsCost, "linear-gradient(90deg,#38bdf8,#0284c7)"]);
  if (lodgingAll > 0) parts.push(["Hospedagem", lodgingAll, "linear-gradient(90deg,#10b981,#0d9488)"]);
  if (t.otherActCost > 0) parts.push(["Ingressos, Parques, Jogos & Extras", t.otherActCost, "linear-gradient(90deg,#f472b6,#9333ea)"]);
  if (foodAndFixed > 0) parts.push(["Alimentação, Fixos & Reserva", foodAndFixed, "linear-gradient(90deg,#fb923c,#ef4444)"]);

  const denom = t.grandTotal || t.total || 1;
  $("#costBars").innerHTML = parts.map(([n, v, g]) => `
    <div class="bar-row">
      <div class="top"><span>${n}</span><span><b>${money(v)}</b> · ${t.grandTotal ? num(v / denom * 100) : 0}%</span></div>
      <div class="bar"><div style="width:${t.grandTotal ? (v / denom * 100) : 0}%;background:${g}"></div></div>
    </div>`).join("");

  const extraBox = $("#extraBudgetSummary");
  const lines = [];
  if (t.lodgingParamCost > 0) lines.push(`<div>Hospedagem por diária (${t.lodgingNights} noites): <b>${money(t.lodgingParamCost)}</b></div>`);
  if (t.lodgingActCost > 0) lines.push(`<div>Hospedagens lançadas no cronograma: <b>${money(t.lodgingActCost)}</b></div>`);
  if (t.foodCost > 0) lines.push(`<div>Alimentação (${t.totalDays}d × ${state.params.travelers}p): <b>${money(t.foodCost)}</b></div>`);
  if (t.otherFixedBudget > 0) lines.push(`<div>Outros gastos fixos: <b>${money(t.otherFixedBudget)}</b></div>`);
  if (t.contingencyCost > 0) lines.push(`<div>Margem reserva (${state.params.contingencyPct}%): <b>${money(t.contingencyCost)}</b></div>`);
  extraBox.innerHTML = lines.join("");
  extraBox.hidden = lines.length === 0;

  const trips = s.filter(a => a.type === "Viagem");
  const mx = Math.max(1, ...trips.map(a => +a.km || 0));
  $("#tripBars").innerHTML = trips.map(a => `
    <div class="bar-row clickable" data-id="${a.id}">
      <div class="top">
        <span>${fmtShortBR(a.start)} · ${esc(label(a))}</span>
        <span>${num(a.km)} km · ${hmHuman(calc(a).time)} · <b>${money(calc(a).total)}</b></span>
      </div>
      <div class="bar"><div style="width:${(+a.km || 0) / mx * 100}%;background:linear-gradient(90deg,#06b6d4,#6366f1)"></div></div>
    </div>`).join("") || `<p class="muted">Nenhuma viagem de carro cadastrada.</p>`;
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

/* ---------- TABELA ---------- */
function renderTable(s, t) {
  const q = ($("#search").value || "").toLowerCase();
  const ft = $("#filterType").value;
  const rows = s.filter(a => (!ft || a.type === ft) && (!q || (label(a) + " " + (a.notes || "")).toLowerCase().includes(q)));
  const allTypes = Object.keys(window.ACTIVITY_TYPES);

  const ed = (a, f, type = "text", cls = "") =>
    `<td class="ed ${cls}"><input data-id="${a.id}" data-f="${f}" type="${type}" ${type === "number" ? 'step="any"' : ""} value="${esc(f === "drive" || f === "stopTime" ? (a.type === "Viagem" ? hm(a[f]) : "") : a[f] ?? "")}"></td>`;
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
    const routeCols = (v || a.type === "Voo");
    h += `<tr>
      <td>${i + 1}</td>
      ${typeSel(a)}
      ${ed(a, "start", "date")}
      ${ed(a, "end", "date")}
      <td>${WD[parseD(a.start).getDay()]}</td>
      ${ed(a, "name", "text", "wide")}
      ${routeCols ? ed(a, "from") + ed(a, "to") : "<td></td><td></td>"}
      <td class="num">${days(a)}</td>
      ${v ? ed(a, "km", "number") + ed(a, "drive") + ed(a, "stops", "number") + ed(a, "stopTime") : "<td></td><td></td><td></td><td></td>"}
      <td class="num">${v ? hm(c.time) : ""}</td>
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

  renderScenarios();
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

/* ---------- CHECKLIST ---------- */
function renderChecklist() {
  const L = state.checklist;
  const done = L.filter(c => c.status === "Concluído").length;
  $("#checkProgress").textContent = `${done}/${L.length}`;
  $("#checkBar").style.width = `${L.length ? (done / L.length * 100) : 0}%`;

  const items = checklistFilter ? L.filter(c => c.status === checklistFilter) : L;
  const sel = (c, f, opts) => `<td class="ed"><select data-c="${c.id}" data-f="${f}">${opts.map(o => `<option ${o === c[f] ? "selected" : ""}>${o}</option>`).join("")}</select></td>`;
  const inp = (c, f, cls = "") => `<td class="ed ${cls}"><input data-c="${c.id}" data-f="${f}" value="${esc(c[f])}"></td>`;

  let h = `<thead><tr><th>✓</th><th>#</th><th>Categoria</th><th>Item</th><th>Prioridade</th><th>Status</th><th>Notas</th><th></th></tr></thead><tbody>`;
  items.forEach((c, i) => {
    h += `<tr class="${c.status === "Concluído" ? "done" : ""}">
      <td><input type="checkbox" data-chk="${c.id}" ${c.status === "Concluído" ? "checked" : ""}></td>
      <td>${i + 1}</td>
      ${inp(c, "cat")}${inp(c, "item", "wide itm")}
      ${sel(c, "prio", ["Alta", "Média", "Baixa"])}
      ${sel(c, "status", ["Pendente", "Em andamento", "Concluído"])}
      ${inp(c, "notes", "wide")}
      <td><button type="button" class="icon-btn" data-cdel="${c.id}">🗑️</button></td>
    </tr>`;
  });
  const tb = $("#checkTable");
  tb.innerHTML = h + "</tbody>";

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
    root.querySelectorAll("[data-cdel]").forEach(b => {
      b.onclick = () => { state.checklist = state.checklist.filter(x => x.id !== b.dataset.cdel); save("Item removido"); };
    });
  };
  bindEvents(tb);

  const mc = $("#mobileCheckCards");
  mc.innerHTML = items.map(c => `
    <div class="m-card">
      <div class="m-card-head">
        <label style="display:flex;align-items:center;gap:8px;font-weight:700">
          <input type="checkbox" data-chk="${c.id}" ${c.status === "Concluído" ? "checked" : ""}>
          <span>${esc(c.item)}</span>
        </label>
        <button type="button" class="icon-btn" data-cdel="${c.id}">🗑️</button>
      </div>
      <div class="m-card-grid">
        <div><span class="muted">Cat.:</span> ${esc(c.cat)}</div>
        <div><span class="muted">Prioridade:</span> ${esc(c.prio)}</div>
      </div>
      ${c.notes ? `<div class="muted small">${esc(c.notes)}</div>` : ""}
    </div>`).join("") || `<p class="muted">Nenhum item nesta categoria.</p>`;
  bindEvents(mc);
}

/* ---------- MODAL ATIVIDADE + MAPS + ANEXOS + AGENDA ---------- */
let editing = null;
let modalDraftId = "";
let modalAttachments = [];
let stopsManualOverride = false;
let lastRouteKey = "";
let acFromCtrl = null;
let acToCtrl = null;

function initAutocompleteControllers() {
  if (!acFromCtrl) acFromCtrl = window.FeriasMaps.attachAutocomplete($("#f-from"), $("#ac-from"), () => maybeAutoComputeRoute(true));
  if (!acToCtrl) acToCtrl = window.FeriasMaps.attachAutocomplete($("#f-to"), $("#ac-to"), () => maybeAutoComputeRoute(true));
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
  const info = getTypeInfo(a.type);
  $("#f-extraCostLabel").textContent = info.costLabel || "Custo (R$)";
  $("#calRemLabel").textContent = state.params.calendarReminderTime || "09:00";
  $("#btnCalLink").href = window.FeriasCalendar.buildGoogleCalendarTemplateUrl(a, state.title);

  if (a.type !== "Viagem") {
    box.innerHTML = "";
    return;
  }
  const c = calc(a);
  box.innerHTML = `
    <span><b>Tempo total:</b> ${hmHuman(c.time)} (${hmHuman(a.drive)} dir. + ${hmHuman(a.stopTime)} par.)</span>
    <span><b>EV / HEV:</b> ${num(c.ev)} / ${num(c.hev)} km (${num(c.liters, 1)} L)</span>
    <span><b>Total trecho:</b> ${money(c.total + c.extra)}</span>
  `;
  const ext = $("#modalMapsExternal");
  if (ext) ext.href = window.FeriasMaps.buildLegUrl(a.from, a.to);
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

window.openModal = function (id) {
  initAutocompleteControllers();
  const a = id
    ? state.activities.find(x => x.id === id)
    : { type: "Viagem", start: fmtISO(new Date()), charges: state.params.defaultCharges ?? 1, extraCost: 0, attachments: [] };

  editing = id || null;
  modalDraftId = id || uid();
  modalAttachments = clone(a.attachments || []);
  stopsManualOverride = false;
  lastRouteKey = a.from && a.to ? `${a.from.trim()}=>${a.to.trim()}` : "";
  acFromCtrl.clearSelected();
  acToCtrl.clearSelected();

  $("#modalTitle").textContent = id ? "Editar atividade" : "Nova atividade";
  const f = $("#form");
  for (const k of ["type", "name", "start", "end", "from", "to", "km", "stops", "toll", "charges", "extraCost", "notes"]) {
    if (f.elements[k]) f.elements[k].value = a[k] ?? "";
  }
  $("#f-flightFrom").value = a.type === "Voo" ? (a.from || "") : "";
  $("#f-flightTo").value = a.type === "Voo" ? (a.to || "") : "";
  f.elements.drive.value = a.drive ? hm(a.drive) : "";
  f.elements.stopTime.value = a.stopTime != null && a.type === "Viagem" && id ? hm(a.stopTime) : "";

  $("#tollSourceTag").textContent = "";
  $("#modalMapsStatus").innerHTML = "";
  $("#modalMapWrap").hidden = true;
  $("#modalMapWrap").innerHTML = "";
  $("#btnDelete").style.visibility = $("#btnDuplicate").style.visibility = id ? "visible" : "hidden";

  toggleTrip();
  updateModalMapsUI();
  renderModalAttachments();
  updateModalPreview();
  $("#modal").showModal();
};

function toggleTrip() {
  const t = $("#f-type").value;
  $(".trip-only").hidden = t !== "Viagem";
  $(".trip-only").style.display = t === "Viagem" ? "" : "none";
  $(".flight-only").hidden = t !== "Voo";
  updateModalPreview();
}

function readForm() {
  const e = $("#form").elements;
  const n = k => e[k].value === "" ? null : parseFloat(e[k].value);
  const a = {
    type: e.type.value,
    name: e.name.value.trim(),
    start: e.start.value,
    end: e.end.value || e.start.value,
    extraCost: n("extraCost") || 0,
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
      charges: n("charges") ?? (state.params.defaultCharges ?? 1)
    });
  } else if (a.type === "Voo") {
    a.from = $("#f-flightFrom").value.trim();
    a.to = $("#f-flightTo").value.trim();
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
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const dismissedAt = Number(localStorage.getItem(PWA_DISMISS_KEY) || 0);
  const recentlyDismissed = Date.now() - dismissedAt < 3 * DAY;

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    $("#btnMenuInstall").hidden = false;
    if (!recentlyDismissed) showPwaBanner(false);
  });

  if (isIOS && !recentlyDismissed) {
    setTimeout(() => showPwaBanner(true), 1200);
  }

  $("#btnPwaInstall").onclick = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const res = await deferredInstallPrompt.userChoice;
      if (res.outcome === "accepted") $("#pwaInstallBanner").hidden = true;
      deferredInstallPrompt = null;
    } else if (isIOS) {
      alert("No iPhone/iPad: toque no botão Compartilhar (quadrado com seta para cima) na barra do Safari e escolha 'Adicionar à Tela de Início'.");
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
    $("#pwaPromptDesc").textContent = "Toque em Compartilhar (⬆️) e 'Adicionar à Tela de Início' para baixar o app Férias Pro.";
    $("#btnPwaInstall").textContent = "Como instalar";
  } else {
    $("#pwaPromptDesc").textContent = "Baixe o aplicativo Férias Pro no celular ou computador com ícone na tela inicial.";
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
$("#f-from").addEventListener("blur", () => setTimeout(() => maybeAutoComputeRoute(false), 220));
$("#f-to").addEventListener("blur", () => setTimeout(() => maybeAutoComputeRoute(false), 220));
$("#f-drive").addEventListener("input", () => { applyAutoStopsToForm(false); updateModalPreview(); });
$("#f-stops").addEventListener("input", () => { stopsManualOverride = true; updateModalPreview(); });
$("#f-stopTime").addEventListener("input", () => { stopsManualOverride = true; updateModalPreview(); });
["#f-km", "#f-toll", "#f-charges", "#f-extraCost", "#f-name", "#f-start", "#f-end", "#f-flightFrom", "#f-flightTo"].forEach(sel => {
  $(sel).addEventListener("input", updateModalPreview);
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

$("#btnCalDirect").onclick = async () => {
  const cid = window.FeriasApi.getGoogleClientId();
  if (!cid) {
    window.open($("#btnCalLink").href, "_blank", "noopener");
    return toast("Abrindo Google Agenda com dados preenchidos (defina GOOGLE_CLIENT_ID para envio direto por API).");
  }
  try {
    const a = readForm();
    await window.FeriasCalendar.syncActivitiesToGoogleCalendar([a], state.title, cid, state.params.calendarReminderTime);
    toast("📅 Evento + lembrete (09:00 dia anterior) criados no Google Agenda!");
  } catch (err) {
    toast("❌ " + (err.message || err));
  }
};

$("#btnCalIcs").onclick = () => {
  const a = readForm();
  window.FeriasCalendar.downloadIcs([a], a.name || state.title, state.params.calendarReminderTime);
  toast("📆 Arquivo .ics baixado (com lembrete 09:00 do dia anterior)!");
};

async function syncAllToGoogleCalendar() {
  const cid = window.FeriasApi.getGoogleClientId();
  if (!cid) {
    window.FeriasCalendar.downloadIcs(sorted(), state.title, state.params.calendarReminderTime);
    return toast("📆 Arquivo .ics completo baixado para importar no Google Agenda (lembretes 09:00 dia anterior)!");
  }
  try {
    const n = await window.FeriasCalendar.syncActivitiesToGoogleCalendar(sorted(), state.title, cid, state.params.calendarReminderTime);
    toast(`📅 ${n} atividades sincronizadas com seu Google Agenda!`);
  } catch (err) {
    toast("❌ " + (err.message || err));
  }
}

$("#btnSyncAllCalendar").onclick = $("#btnMenuCalendarAll").onclick = syncAllToGoogleCalendar;
$("#btnDownloadAllIcs").onclick = $("#btnExportIcs").onclick = () => {
  window.FeriasCalendar.downloadIcs(sorted(), state.title, state.params.calendarReminderTime);
  toast("📆 Agenda .ics das férias baixada!");
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
    for (const k of ["from", "to", "km", "drive", "stops", "stopTime", "toll", "charges"]) delete o[k];
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
$("#btnGanttSlim").onclick = () => {
  ganttSlimRail = !ganttSlimRail;
  renderGantt(sorted());
};
$("#btnGanttToday").onclick = () => {
  const wrap = $("#ganttWrap");
  const todayHead = wrap.querySelector(".g-head.today");
  wrap.scrollTo({ left: todayHead ? Math.max(0, todayHead.offsetLeft - 180) : 0, behavior: "smooth" });
};

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

// Parâmetros
$("#p-planTitle").onchange = e => {
  state.title = e.target.value.trim() || "Férias";
  if (activeTrip) activeTrip.name = state.title;
  renderTripDropdown();
  save("⚙️ Nome da viagem atualizado");
};
$("#p-vehicleName").onchange = e => { state.vehicle.name = e.target.value.trim() || "Veículo"; save("⚙️ Modelo atualizado"); };
$("#p-powertrain").onchange = e => { state.vehicle.powertrain = e.target.value; save("⚙️ Motorização atualizada"); };

$("#btnToggleKey").onclick = () => { const inp = $("#gmapsKeyInput"); inp.type = inp.type === "password" ? "text" : "password"; };
$("#btnSaveKey").onclick = () => {
  const { saved, needsReload } = window.FeriasMaps.setKey($("#gmapsKeyInput").value);
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

$("#search").oninput = $("#filterType").onchange = () => renderTable(sorted(), totals());
$("#filterChecklist").onchange = e => { checklistFilter = e.target.value; renderChecklist(); };
$("#btnAddScenario").onclick = () => { state.scenarios.push({ id: uid(), name: "Novo cenário", kmL: state.vehicle.hevKmL }); save("➕ Cenário adicionado"); };
$("#btnAddCheck").onclick = () => { state.checklist.push({ id: uid(), cat: "Geral", item: "Novo item", prio: "Média", status: "Pendente", notes: "" }); save("➕ Item adicionado"); };

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
$("#btnPrint").onclick = () => window.print();

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

window.addEventListener("resize", () => { if (ganttMode === "gantt") renderGantt(sorted()); });

boot();
