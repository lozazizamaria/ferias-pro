/* ===== Férias Pro — Aplicação Principal ===== */
const KEY = "ferias-pro-state-v1";
const LEGACY_KEY = "ferias-planner-v1";
const THEME_KEY = "ferias-pro-theme";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = o => JSON.parse(JSON.stringify(o));
const DAY = 864e5;
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MON_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

let ganttFilter = "";
let ganttMode = "gantt"; // gantt | timeline
let ganttZoom = window.innerWidth < 720 ? 38 : 46;
let checklistFilter = "";
let state = load();

function migrateState(raw) {
  const def = clone(window.DEFAULT_DATA);
  const s = raw && typeof raw === "object" ? raw : {};
  const merged = {
    title: s.title || def.title,
    vehicle: Object.assign({}, def.vehicle, s.vehicle || {}),
    params: Object.assign({}, def.params, s.params || {}),
    scenarios: Array.isArray(s.scenarios) && s.scenarios.length ? s.scenarios : def.scenarios,
    activities: Array.isArray(s.activities) ? s.activities : def.activities,
    checklist: Array.isArray(s.checklist) ? s.checklist : def.checklist
  };
  merged.activities.forEach(a => {
    if (!a.id) a.id = uid();
    if (!a.end) a.end = a.start;
    if (a.extraCost == null) a.extraCost = 0;
    if (a.type === "Viagem" && a.charges == null) a.charges = merged.params.defaultCharges ?? 1;
  });
  merged.checklist.forEach(c => { if (!c.id) c.id = uid(); });
  return merged;
}

function seed() {
  return migrateState(clone(window.DEFAULT_DATA));
}

function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.activities)) return migrateState(parsed);
    }
  } catch {}
  return seed();
}

function save(msg, skipRender = false) {
  localStorage.setItem(KEY, JSON.stringify(state));
  if (window.FeriasSync) {
    window.FeriasSync.schedulePush(() => ({
      stateObj: state,
      gmapsKey: window.FeriasMaps ? window.FeriasMaps.getKey() : ""
    }));
  }
  if (!skipRender) render();
  if (msg) toast(msg);
}

/* ---------- tema Dia / Noite ---------- */
function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(THEME_KEY, t);
  const icon = $("#themeIcon");
  const lbl = $("#themeLabel");
  if (icon) icon.textContent = t === "dark" ? "☀️" : "🌙";
  if (lbl) lbl.textContent = t === "dark" ? "Dia" : "Noite";
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === "light" ? "light" : "dark");
}
function isDarkTheme() {
  return document.documentElement.getAttribute("data-theme") !== "light";
}

/* ---------- utils ---------- */
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
const label = a => a.type === "Viagem" && (a.from || a.to) ? `${a.name} (${a.from || "?"} ➔ ${a.to || "?"})` : a.name;
const sorted = () => [...state.activities].sort((a, b) => a.start.localeCompare(b.start) || (a.type === "Viagem") - (b.type === "Viagem"));

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
    r.hev = 0;
    const kwh = (r.ev / 100) * (v.bevKwhPer100 || 18);
    r.charge = kwh * (v.kwhPrice || 0);
  } else if (pt === "PHEV") {
    r.ev = Math.min(+a.km, (v.evRange || 0) * ch);
    r.hev = Math.max(0, +a.km - r.ev);
    r.liters = r.hev / (kmLOverride || v.hevKmL || 16);
    r.fuel = r.liters * (v.fuelPrice || 0);
    r.charge = ch * (v.kwhPerCharge || 0) * (v.kwhPrice || 0);
  } else {
    // HEV or COMBUSTION
    r.ev = 0;
    r.hev = +a.km;
    r.liters = r.hev / (kmLOverride || v.hevKmL || 14);
    r.fuel = r.liters * (v.fuelPrice || 0);
    r.charge = 0;
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
    activitiesExtra: 0, lodgingCost: 0, foodCost: 0, contingencyCost: 0,
    grandTotal: 0, totalDays: 0, periodDays: 0
  };

  if (s.length) {
    const min = s[0].start;
    const max = s.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, min);
    t.totalDays = days({ start: min, end: max });
  }

  state.activities.forEach(a => {
    t.activitiesExtra += +a.extraCost || 0;
    if (a.type === "Período") t.periodDays += days(a);
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
  t.lodgingCost = t.periodDays * (+p.dailyLodging || 0);
  t.foodCost = t.totalDays * Math.max(1, +p.travelers || 1) * (+p.dailyFoodPerPerson || 0);
  const sub = t.total + t.activitiesExtra + t.lodgingCost + t.foodCost;
  t.contingencyCost = sub * ((+p.contingencyPct || 0) / 100);
  t.grandTotal = sub + t.contingencyCost;
  return t;
}

function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- render geral ---------- */
function render() {
  const s = sorted();
  const t = totals();
  renderGantt(s);
  renderTimeline(s);
  renderDashboard(s, t);
  renderTable(s, t);
  renderParams(t);
  renderChecklist();
}

/* ---------- GANTT REDESIGNED ---------- */
function buildRightSummaryHTML(a) {
  if (a.type === "Viagem") {
    const c = calc(a);
    const routeTxt = (a.from || a.to) ? `${esc(a.from || "?")} ➔ ${esc(a.to || "?")}` : "";
    const parts = [];
    if (a.km) parts.push(`${num(a.km)} km`);
    if (a.drive) parts.push(hmHuman(a.drive) + (a.stopTime ? ` + ${hmHuman(a.stopTime)} par.` : ""));
    if (a.toll) parts.push(`Ped. ${money(a.toll)}`);
    return `
      <div class="g-summary Viagem" data-id="${a.id}" title="Clique para editar ${esc(label(a))}">
        <span class="g-summary-title">${esc(a.name)}</span>
        ${routeTxt ? `<span class="g-summary-meta">${routeTxt}</span>` : ""}
        ${parts.length ? `<span class="g-summary-badge">${parts.join(" · ")}</span>` : ""}
        <span class="g-summary-meta">${money(c.total)}</span>
      </div>`;
  }
  if (a.type === "Período") {
    const d = days(a);
    const sub = a.notes ? esc(a.notes) : `${fmtShortBR(a.start)} a ${fmtShortBR(a.end || a.start)}`;
    return `
      <div class="g-summary Período" data-id="${a.id}" title="Clique para editar ${esc(a.name)}">
        <span class="g-summary-title">${esc(a.name)}</span>
        <span class="g-summary-badge">${d} dia${d > 1 ? "s" : ""}</span>
        <span class="g-summary-meta">${sub}</span>
      </div>`;
  }
  return `
    <div class="g-summary Evento" data-id="${a.id}" title="Clique para editar ${esc(a.name)}">
      <span class="g-summary-title">${esc(a.name)}</span>
      <span class="g-summary-badge">${fmtShortBR(a.start)}</span>
      ${a.notes ? `<span class="g-summary-meta">${esc(a.notes)}</span>` : ""}
    </div>`;
}

function renderGantt(allSorted) {
  const g = $("#gantt");
  const wrap = $("#ganttWrap");
  const tlWrap = $("#timelineWrap");
  const planTitle = $("#ganttPlanTitle");
  if (planTitle) planTitle.textContent = state.title || "Cronograma";

  wrap.hidden = ganttMode !== "gantt";
  tlWrap.hidden = ganttMode !== "timeline";
  if (ganttMode !== "gantt") return;

  const s = ganttFilter ? allSorted.filter(a => a.type === ganttFilter) : allSorted;
  if (!s.length) {
    g.style.gridTemplateColumns = "1fr";
    g.innerHTML = `<p class="muted" style="padding:24px">Nenhuma atividade encontrada para o filtro atual.</p>`;
    return;
  }

  const DW = ganttZoom;
  const nameW = window.innerWidth < 720 ? 148 : 265;
  const minTs = parseD(s[0].start).getTime() - 2 * DAY;
  const maxS = s.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, s[0].start);
  const trailingDays = window.innerWidth < 720 ? 9 : 14; // espaço para resumo à direita sem cortar
  const n = Math.round((parseD(maxS) - minTs) / DAY) + trailingDays;
  const todayISO = fmtISO(new Date());

  g.style.gridTemplateColumns = `${nameW}px repeat(${n}, ${DW}px)`;

  const dates = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(minTs + i * DAY);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }

  // Agrupamento de meses para cabeçalho superior
  const monthSpans = [];
  dates.forEach((d, idx) => {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = monthSpans[monthSpans.length - 1];
    if (last && last.key === key) last.span++;
    else monthSpans.push({ key, label: `${MON_FULL[d.getMonth()]} ${d.getFullYear()}`, startCol: idx + 2, span: 1 });
  });

  let h = `<div class="g-corner">Atividade</div>`;

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

  const typeIcon = { Viagem: "▶", Evento: "★", "Período": "■" };
  s.forEach((a, rowIdx) => {
    const row = rowIdx + 3;
    const altCls = rowIdx % 2 ? "alt" : "";
    const subLeft = a.type === "Viagem" && (a.from || a.to)
      ? `${a.from || "?"} ➔ ${a.to || "?"}`
      : `${fmtShortBR(a.start)}${days(a) > 1 ? ` · ${days(a)}d` : ""}`;

    h += `<div class="g-name ${altCls}" style="grid-column:1;grid-row:${row}" data-id="${a.id}" title="${esc(label(a))}">
      <span class="g-type-dot ${a.type}">${typeIcon[a.type] || "•"}</span>
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
        const barW = Math.max(24, len * DW - 6);
        const insideTxt = a.type === "Viagem"
          ? (len > 1 ? `▶ ${num(a.km)} km` : "▶")
          : a.type === "Período"
            ? `${len} dia${len > 1 ? "s" : ""}`
            : (len > 1 ? `★ ${len}d` : "★");
        const resizeHandle = a.type === "Período" || len > 1 ? `<span class="g-resize" data-resize="${a.id}" title="Arraste para alterar duração"></span>` : "";
        inner = `
          <div class="g-event-wrap" style="left:3px">
            <div class="g-bar ${a.type} ${len === 1 ? "single-day" : ""}" data-id="${a.id}" style="width:${barW}px">
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
    // Em touch, clique simples abre modal sem arrastar acidentalmente durante scroll
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
      bar.style.width = `${Math.max(24, newLen * DW - 6)}px`;
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
    const d = parseD(a.start);
    const c = calc(a);
    const meta = a.type === "Viagem"
      ? `${a.from || "?"} ➔ ${a.to || "?"} · ${num(a.km)} km · ${hmHuman(a.drive)}${a.stopTime ? ` (+${hmHuman(a.stopTime)} par.)` : ""} · Ped. ${money(a.toll)} · Total ${money(c.total)}`
      : `${days(a)} dia(s)${a.notes ? ` · ${a.notes}` : ""}`;
    return `
      <div class="tl-item ${a.type}" data-id="${a.id}">
        <div class="date-badge"><b>${d.getDate()}</b>${MON[d.getMonth()]}</div>
        <div class="tl-body">
          <div class="tl-top">
            <span class="tl-title">${esc(a.name)}</span>
            <span class="chip ${a.type}">${a.type}</span>
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
    ["Distância total", `${num(t.km)} km`, `${t.trips} trechos ativos`, "var(--trip)"],
    ["Tempo na estrada", hmHuman(t.drive + t.stopTime), `Direção ${hmHuman(t.drive)} + ${t.stops} par. (${hmHuman(t.stopTime)})`, "var(--accent)"],
    ["Combustível estimado", `${num(t.liters, 1)} L`, `${num(t.tanks, 1)} tanques (${state.vehicle.tank} L)`, "var(--event)"],
    ["Custo combustível", money(t.fuel), avg ? `Média geral ${num(avg, 1)} km/L` : "Modo elétrico", "#fb7185"],
    ["Pedágios + recargas EV", money(t.toll + t.charge), `Ped. ${money(t.toll)} + EV ${money(t.charge)}`, "var(--period)"],
    ["Custo deslocamento", money(t.total), "Combustível + pedágios + EV", "var(--ok)"],
    ["Total geral das férias", money(t.grandTotal), `${num(state.params.travelers || 1)} viajante(s) · ${money(perPerson)}/pessoa`, "#06b6d4"],
    ["Checklist preparação", `${doneChk}/${state.checklist.length}`, `${state.checklist.length ? Math.round(doneChk / state.checklist.length * 100) : 0}% concluído`, "#f59e0b"]
  ];

  $("#kpis").innerHTML = k.map(([l, v, sub, c]) =>
    `<div class="kpi" style="--c:${c}"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${sub}</div></div>`
  ).join("");

  const today = fmtISO(new Date());
  let up = s.filter(a => (a.end || a.start) >= today);
  if (!up.length) up = s;
  $("#upcoming").innerHTML = up.slice(0, 12).map(a => {
    const d = parseD(a.start);
    const diff = Math.round((d - parseD(today)) / DAY);
    const sub = a.type === "Viagem"
      ? `${num(a.km)} km · ${hmHuman(calc(a).time)} · ${money(calc(a).total)}`
      : `${days(a)} dia(s)${a.notes ? ` · ${a.notes}` : ""}`;
    return `<li data-id="${a.id}">
      <div class="date-badge"><b>${d.getDate()}</b>${MON[d.getMonth()]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(label(a))}</div>
        <div class="muted small">${WD[d.getDay()]} · ${esc(sub)}${diff >= 0 ? ` · em ${diff}d` : ""}</div>
      </div>
      <span class="chip ${a.type}">${a.type}</span>
    </li>`;
  }).join("") || `<li class="muted">Sem atividades</li>`;
  $("#upcoming").querySelectorAll("li[data-id]").forEach(li => li.onclick = () => openModal(li.dataset.id));

  const parts = [
    ["Gasolina / Combustível", t.fuel, "linear-gradient(90deg,#fb7185,#f5b544)"],
    ["Pedágios", t.toll, "linear-gradient(90deg,#a78bfa,#7c5cff)"],
    ["Recargas EV", t.charge, "linear-gradient(90deg,#34d399,#22d3ee)"]
  ];
  const extrasTotal = t.activitiesExtra + t.lodgingCost + t.foodCost + t.contingencyCost;
  if (extrasTotal > 0) parts.push(["Hospedagem, alimentação & extras", extrasTotal, "linear-gradient(90deg,#38bdf8,#6366f1)"]);
  const denom = extrasTotal > 0 ? t.grandTotal : t.total;

  $("#costBars").innerHTML = parts.map(([n, v, g]) => `
    <div class="bar-row">
      <div class="top"><span>${n}</span><span><b>${money(v)}</b> · ${denom ? num(v / denom * 100) : 0}%</span></div>
      <div class="bar"><div style="width:${denom ? (v / denom * 100) : 0}%;background:${g}"></div></div>
    </div>`).join("");

  const extraBox = $("#extraBudgetSummary");
  if (extrasTotal > 0) {
    const lines = [];
    if (t.lodgingCost > 0) lines.push(`<div>Hospedagem (${t.periodDays}d): <b>${money(t.lodgingCost)}</b></div>`);
    if (t.foodCost > 0) lines.push(`<div>Alimentação (${t.totalDays}d × ${state.params.travelers}p): <b>${money(t.foodCost)}</b></div>`);
    if (t.activitiesExtra > 0) lines.push(`<div>Extras nas atividades: <b>${money(t.activitiesExtra)}</b></div>`);
    if (t.contingencyCost > 0) lines.push(`<div>Reserva (${state.params.contingencyPct}%): <b>${money(t.contingencyCost)}</b></div>`);
    extraBox.innerHTML = lines.join("");
    extraBox.hidden = false;
  } else {
    extraBox.innerHTML = "";
    extraBox.hidden = true;
  }

  const trips = s.filter(a => a.type === "Viagem");
  const mx = Math.max(1, ...trips.map(a => +a.km || 0));
  $("#tripBars").innerHTML = trips.map(a => `
    <div class="bar-row clickable" data-id="${a.id}">
      <div class="top">
        <span>${fmtShortBR(a.start)} · ${esc(label(a))}</span>
        <span>${num(a.km)} km · ${hmHuman(calc(a).time)} · <b>${money(calc(a).total)}</b></span>
      </div>
      <div class="bar"><div style="width:${(+a.km || 0) / mx * 100}%;background:linear-gradient(90deg,#06b6d4,#6366f1)"></div></div>
    </div>`).join("") || `<p class="muted">Nenhuma viagem cadastrada.</p>`;
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
    hint.innerHTML = `Configure sua Google Maps API Key na aba <b>Parâmetros</b> para visualizar a rota interativa completa com pedágios e trechos aqui.`;
    btnMap.disabled = true;
  } else {
    hint.textContent = "Clique em 'Carregar mapa completo' para desenhar todos os trechos conectados no mapa interativo.";
    btnMap.disabled = false;
  }
}

/* ---------- TABELA ---------- */
function renderTable(s, t) {
  const q = ($("#search").value || "").toLowerCase();
  const ft = $("#filterType").value;
  const rows = s.filter(a => (!ft || a.type === ft) && (!q || (label(a) + " " + (a.notes || "")).toLowerCase().includes(q)));

  const ed = (a, f, type = "text", cls = "") =>
    `<td class="ed ${cls}"><input data-id="${a.id}" data-f="${f}" type="${type}" ${type === "number" ? 'step="any"' : ""} value="${esc(f === "drive" || f === "stopTime" ? (a.type === "Viagem" ? hm(a[f]) : "") : a[f] ?? "")}"></td>`;
  const typeSel = a =>
    `<td class="ed"><select data-id="${a.id}" data-f="type">${["Viagem", "Evento", "Período"].map(o => `<option ${o === a.type ? "selected" : ""}>${o}</option>`).join("")}</select></td>`;

  let h = `<thead><tr>
    <th>#</th><th>Tipo</th><th>Início</th><th>Fim</th><th>Dia</th><th>Atividade</th>
    <th>Origem</th><th>Destino</th><th>Dias</th><th>Km</th><th>Direção</th><th>Paradas</th>
    <th>T. Paradas</th><th>Tempo Total</th><th>Recargas</th><th>Km EV</th><th>Km HEV</th>
    <th>Gas. (L)</th><th>Custo Gas.</th><th>Custo EV</th><th>Pedágio</th><th>Extras</th>
    <th>Custo Viagem</th><th>Tanques</th><th>Observações</th><th>Ações</th>
  </tr></thead><tbody>`;

  rows.forEach((a, i) => {
    const c = calc(a);
    const v = a.type === "Viagem";
    h += `<tr>
      <td>${i + 1}</td>
      ${typeSel(a)}
      ${ed(a, "start", "date")}
      ${ed(a, "end", "date")}
      <td>${WD[parseD(a.start).getDay()]}</td>
      ${ed(a, "name", "text", "wide")}
      ${v ? ed(a, "from") + ed(a, "to") : "<td></td><td></td>"}
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
      <td class="num"><b>${v ? money(c.total) : money(c.extra)}</b></td>
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
    <td colspan="9">TOTAL (${t.trips} viagens)</td>
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
    <td class="num">${money(t.total)}</td>
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
      // Regra automática de paradas ao editar direção na tabela
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

  // Cards mobile responsivos
  const mc = $("#mobileTableCards");
  mc.innerHTML = rows.map(a => {
    const c = calc(a);
    const v = a.type === "Viagem";
    return `<div class="m-card" data-id="${a.id}">
      <div class="m-card-head">
        <strong>${esc(label(a))}</strong>
        <span class="chip ${a.type}">${a.type}</span>
      </div>
      <div class="m-card-grid">
        <div><span class="muted">Data:</span> ${fmtBR(a.start)}${days(a) > 1 ? ` - ${fmtShortBR(a.end)}` : ""}</div>
        <div><span class="muted">Dias:</span> ${days(a)}</div>
        ${v ? `
          <div><span class="muted">Distância:</span> <b>${num(a.km)} km</b></div>
          <div><span class="muted">Tempo:</span> ${hmHuman(a.drive)} + ${hmHuman(a.stopTime)} (${a.stops}p)</div>
          <div><span class="muted">Pedágio:</span> ${money(a.toll)}</div>
          <div><span class="muted">Total:</span> <b>${money(c.total)}</b></div>
        ` : `
          <div><span class="muted">Extras:</span> ${money(c.extra)}</div>
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
  ["evRange", "Autonomia elétrica útil (por carga)", "km", "evRange"],
  ["hevKmL", "Consumo médio rodoviário (HEV/Gas.)", "km/L", "hevKmL"],
  ["bevKwhPer100", "Consumo elétrico (se 100% BEV)", "kWh/100km", "bevKwhPer100"],
  ["tank", "Capacidade do tanque", "litros", "tank"],
  ["battery", "Capacidade nominal da bateria", "kWh", "battery"],
  ["kwhPerCharge", "Energia útil por recarga (20–100%)", "kWh", "kwhPerCharge"]
];

const COST_PARAM_DEFS = [
  { group: "vehicle", key: "fuelPrice", label: "Preço médio da gasolina", unit: "R$ / litro", type: "number" },
  { group: "vehicle", key: "kwhPrice", label: "Tarifa média de energia elétrica", unit: "R$ / kWh", type: "number" },
  { group: "params", key: "tollPass", label: "Tag de pedágio (Google Maps)", unit: "passe", type: "select", options: [
    ["BR_SEM_PARAR", "Sem Parar"],
    ["BR_VELOE", "Veloe"],
    ["BR_CONECTCAR", "ConectCar"],
    ["BR_TAGGY", "Taggy"],
    ["BR_MOVE_MAIS", "Move Mais"],
    ["", "Dinheiro / Sem Tag"]
  ]},
  { group: "params", key: "travelers", label: "Número de viajantes", unit: "pessoas", type: "number" },
  { group: "params", key: "dailyLodging", label: "Hospedagem estimada (dias de período)", unit: "R$ / dia", type: "number" },
  { group: "params", key: "dailyFoodPerPerson", label: "Alimentação estimada por pessoa", unit: "R$ / dia", type: "number" },
  { group: "params", key: "contingencyPct", label: "Margem para imprevistos", unit: "%", type: "number" }
];

const AUTO_PARAM_DEFS = [
  { key: "stopIntervalHours", label: "Intervalo padrão para paradas", unit: "horas (padrão 4h)", type: "number" },
  { key: "stopDurationMin", label: "Duração padrão de cada parada", unit: "min (padrão 60m = 1h)", type: "number" },
  { key: "defaultCharges", label: "Recargas EV padrão por viagem", unit: "qtd", type: "number" },
  { key: "trafficAware", label: "Considerar trânsito ao vivo no Maps", unit: "TRAFFIC_AWARE", type: "checkbox" },
  { key: "avoidTolls", label: "Evitar pedágios quando possível", unit: "rota alternativa", type: "checkbox" },
  { key: "avoidHighways", label: "Evitar rodovias", unit: "rota local", type: "checkbox" },
  { key: "avoidFerries", label: "Evitar balsas", unit: "travessias", type: "checkbox" }
];

function renderParams() {
  const ptEl = $("#p-planTitle");
  const vnEl = $("#p-vehicleName");
  const pwEl = $("#p-powertrain");
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
      <input type="number" step="any" min="0" data-grp="${d.group}" data-k="${d.key}" value="${val ?? 0}">
      <span class="u">${d.unit}</span></label>`;
  }).join("");

  $("#automationParamsList").innerHTML = AUTO_PARAM_DEFS.map(d => {
    const val = state.params[d.key];
    if (d.type === "checkbox") {
      return `<label class="param-row"><span>${d.label}</span>
        <input type="checkbox" data-pk="${d.key}" ${val ? "checked" : ""}>
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
      state[i.dataset.grp][i.dataset.k] = i.tagName === "SELECT" ? i.value : (parseFloat(i.value) || 0);
      save("⚙️ Parâmetro atualizado");
    };
  });
  $("#automationParamsList").querySelectorAll("[data-pk]").forEach(i => {
    i.onchange = () => {
      state.params[i.dataset.pk] = i.type === "checkbox" ? i.checked : (parseFloat(i.value) || 0);
      save("⚙️ Regra atualizada");
    };
  });

  // Google Maps Key UI
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

  const syncTokInp = $("#syncTokenInput");
  if (syncTokInp && document.activeElement !== syncTokInp && window.FeriasSync) {
    syncTokInp.value = window.FeriasSync.getToken();
  }

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
        <button type="button" class="icon-btn" data-sdel="${sc.id}" title="Excluir cenário" aria-label="Excluir cenário">🗑️</button>
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

/* ---------- MODAL + AUTOMATIZAÇÃO GOOGLE MAPS & PARADAS ---------- */
let editing = null;
let stopsManualOverride = false;
let lastRouteKey = "";
let acFromCtrl = null;
let acToCtrl = null;

function initAutocompleteControllers() {
  if (!acFromCtrl) {
    acFromCtrl = window.FeriasMaps.attachAutocomplete($("#f-from"), $("#ac-from"), () => maybeAutoComputeRoute(true));
  }
  if (!acToCtrl) {
    acToCtrl = window.FeriasMaps.attachAutocomplete($("#f-to"), $("#ac-to"), () => maybeAutoComputeRoute(true));
  }
}

function updateModalPreview() {
  const box = $("#modalTripCalcPreview");
  const type = $("#f-type").value;
  if (type !== "Viagem") { box.innerHTML = ""; return; }
  const a = readForm();
  const c = calc(a);
  box.innerHTML = `
    <span><b>Tempo total:</b> ${hmHuman(c.time)} (${hmHuman(a.drive)} dir. + ${hmHuman(a.stopTime)} par.)</span>
    <span><b>EV / HEV:</b> ${num(c.ev)} / ${num(c.hev)} km (${num(c.liters, 1)} L)</span>
    <span><b>Total trecho:</b> ${money(c.total)} (Gas. ${money(c.fuel)} + Ped. ${money(c.toll)} + EV ${money(c.charge)})</span>
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
  if (!from || !to) {
    if (force) toast("Preencha Origem e Destino primeiro.");
    return;
  }

  const ext = $("#modalMapsExternal");
  if (ext) ext.href = window.FeriasMaps.buildLegUrl(from, to);

  if (!window.FeriasMaps.hasKey()) {
    updateModalMapsUI();
    if (force) toast("Configure sua Google Maps API Key abaixo para calcular automaticamente.");
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

    // Regra automática: 1 parada a cada 4h (1h cada), respeitando parâmetros
    stopsManualOverride = false;
    applyAutoStopsToForm(true);

    if (res.toll.tollKnown) {
      $("#f-toll").value = res.toll.tollCost;
      $("#tollSourceTag").textContent = res.toll.hasTolls ? "✓ Auto Google Maps" : "✓ Sem pedágio";
    } else {
      $("#tollSourceTag").textContent = "⚠️ Tarifa não informada";
    }

    if (!$("#f-charges").value) {
      $("#f-charges").value = state.params.defaultCharges ?? 1;
    }

    // Sugere nome se estiver vazio
    if (!$("#f-name").value.trim()) {
      $("#f-name").value = `Viagem ${to.split(",")[0].trim()}`;
    }

    statusEl.innerHTML = `
      <span>✅ <b>Google Maps:</b> ${res.description ? `via ${esc(res.description)} · ` : ""}${num(res.km)} km · ${hmHuman(res.driveMinutes)}${res.toll.tollKnown ? ` · Pedágio ${money(res.toll.tollCost)}` : " · Rota c/ pedágio (valor não retornado)"}</span>
      <a href="${window.FeriasMaps.buildLegUrl(from, to)}" target="_blank" rel="noopener" style="color:var(--accent2)">Ver no Maps ↗</a>
    `;

    const mapWrap = $("#modalMapWrap");
    mapWrap.hidden = false;
    await window.FeriasMaps.renderRouteOnMap(mapWrap, res.route, isDarkTheme());
    updateModalPreview();
    toast("🗺️ Distância, duração, paradas e pedágio atualizados!");
  } catch (err) {
    statusEl.innerHTML = `<span>❌ Erro Google Maps: ${esc(err.message || err)}</span>
      <a href="${window.FeriasMaps.buildLegUrl(from, to)}" target="_blank" rel="noopener" style="color:var(--accent2)">Abrir no Maps ↗</a>`;
    if (force) toast("Não foi possível calcular via Google Maps.");
  } finally {
    btn.disabled = false;
  }
}

function maybeAutoComputeRoute(force = false) {
  if ($("#f-type").value !== "Viagem") return;
  if ($("#f-from").value.trim() && $("#f-to").value.trim()) {
    computeModalRoute(force);
  }
}

function openModal(id) {
  initAutocompleteControllers();
  const a = id
    ? state.activities.find(x => x.id === id)
    : { type: "Viagem", start: fmtISO(new Date()), charges: state.params.defaultCharges ?? 1, extraCost: 0 };

  editing = id || null;
  stopsManualOverride = false;
  lastRouteKey = a.from && a.to ? `${a.from.trim()}=>${a.to.trim()}` : "";
  acFromCtrl.clearSelected();
  acToCtrl.clearSelected();

  $("#modalTitle").textContent = id ? "Editar atividade" : "Nova atividade";
  const f = $("#form");
  for (const k of ["type", "name", "start", "end", "from", "to", "km", "stops", "toll", "charges", "extraCost", "notes"]) {
    if (f.elements[k]) f.elements[k].value = a[k] ?? "";
  }
  f.elements.drive.value = a.drive ? hm(a.drive) : "";
  f.elements.stopTime.value = a.stopTime != null && a.type === "Viagem" && id ? hm(a.stopTime) : "";

  $("#tollSourceTag").textContent = "";
  $("#modalMapsStatus").innerHTML = "";
  $("#modalMapWrap").hidden = true;
  $("#modalMapWrap").innerHTML = "";
  $("#btnDelete").style.visibility = $("#btnDuplicate").style.visibility = id ? "visible" : "hidden";

  toggleTrip();
  updateModalMapsUI();
  updateModalPreview();
  $("#modal").showModal();
}

function toggleTrip() {
  $(".trip-only").style.display = $("#f-type").value === "Viagem" ? "" : "none";
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
    notes: e.notes.value
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
  if (!window.FeriasMaps.hasKey()) {
    toast("Configure sua Google Maps API Key na aba Parâmetros.");
    return openModal(id);
  }
  toast(`🗺️ Calculando ${a.from} ➔ ${a.to}...`);
  try {
    const res = await window.FeriasMaps.computeTripRoute({
      origin: a.from,
      destination: a.to,
      params: state.params,
      vehicle: state.vehicle
    });
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
  if (!window.FeriasMaps.hasKey()) {
    return toast("Cole e salve sua Google Maps API Key primeiro.");
  }
  const trips = state.activities.filter(a => a.type === "Viagem" && a.from && a.to);
  if (!trips.length) return toast("Nenhuma viagem com Origem e Destino.");
  const btn = $("#btnRecalcAllRoutes");
  btn.disabled = true;
  let ok = 0;
  for (const a of trips) {
    try {
      const res = await window.FeriasMaps.computeTripRoute({
        origin: a.from,
        destination: a.to,
        params: state.params,
        vehicle: state.vehicle
      });
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
      "#": i + 1,
      Tipo: a.type,
      Início: fmtBR(a.start),
      Fim: fmtBR(a.end),
      "Dia Sem.": WD[parseD(a.start).getDay()],
      Atividade: label(a),
      Dias: days(a),
      "Distância (km)": v ? a.km : "",
      "Direção": v ? hm(a.drive) : "",
      Paradas: v ? a.stops : "",
      "Tempo Paradas": v ? hm(a.stopTime) : "",
      "Tempo Total": v ? hm(c.time) : "",
      "Km EV": v ? +c.ev.toFixed(1) : "",
      "Km HEV": v ? +c.hev.toFixed(1) : "",
      "Gasolina (L)": v ? +c.liters.toFixed(2) : "",
      "Custo Gasolina": v ? +c.fuel.toFixed(2) : "",
      "Custo Recarga": v ? +c.charge.toFixed(2) : "",
      Pedágio: v ? a.toll : "",
      Extras: +a.extraCost || 0,
      "Custo Viagem": v ? +c.total.toFixed(2) : "",
      Tanques: v ? +c.tanks.toFixed(2) : "",
      Observações: a.notes || ""
    };
  });
  rows.push({
    Atividade: "TOTAL (viagens)",
    "Distância (km)": t.km,
    "Tempo Total": hm(t.drive + t.stopTime),
    "Gasolina (L)": +t.liters.toFixed(2),
    "Custo Gasolina": +t.fuel.toFixed(2),
    "Custo Recarga": +t.charge.toFixed(2),
    Pedágio: t.toll,
    Extras: t.activitiesExtra,
    "Custo Viagem": +t.total.toFixed(2),
    Tanques: +t.tanks.toFixed(2)
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Tabela Completa");

  const par = VEHICLE_PARAM_DEFS.map(([k, l, u]) => ({ Parâmetro: l, Valor: state.vehicle[k], Unidade: u }));
  COST_PARAM_DEFS.forEach(d => par.push({ Parâmetro: d.label, Valor: state[d.group][d.key], Unidade: d.unit }));
  par.push({}, ...state.scenarios.map(sc => {
    const kl = sc.kmL || state.vehicle.hevKmL;
    const tt = totals(kl);
    return { Parâmetro: "Cenário: " + sc.name, Valor: kl, Unidade: `Gasolina ${money(tt.fuel)} · Total ${money(tt.total)}` };
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(par), "Resumo & Parâmetros");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.checklist.map((c, i) => ({
    "#": i + 1, Categoria: c.cat, Item: c.item, Prioridade: c.prio, Status: c.status, Notas: c.notes
  }))), "Checklist");
  XLSX.writeFile(wb, `Ferias_Pro_${fmtISO(new Date())}.xlsx`);
  toast("⬇️ Excel exportado");
}

async function importXlsx(file) {
  if (!window.XLSX) return toast("Biblioteca Excel não carregou");
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const g = wb.Sheets["Cronograma Gantt"];
  const tb = wb.Sheets["Tabela Completa"];
  const rs = wb.Sheets["Resumo & Dashboard"];
  if (!g) return toast("Aba 'Cronograma Gantt' não encontrada");

  const v = (sh, ref) => sh && sh[ref] ? sh[ref].v : null;
  const toISO = d => d instanceof Date
    ? fmtISO(new Date(d.getTime() + 12 * 3600e3))
    : (typeof d === "number" ? fmtISO(new Date(Math.round((d - 25569) * DAY) + 12 * 3600e3)) : null);
  const toMin = x => x instanceof Date
    ? x.getUTCHours() * 60 + x.getUTCMinutes() + Math.round(x.getUTCSeconds() / 60)
    : typeof x === "number" ? Math.round(x * 1440) : parseHM(x);

  const acts = [];
  for (let r = 7; r <= 60; r++) {
    const name = v(g, "C" + r);
    if (!name) continue;
    const a = { id: uid(), type: v(g, "B" + r) || "Evento", name: String(name), start: toISO(v(g, "D" + r)), end: toISO(v(g, "E" + r)), extraCost: 0 };
    if (!a.start) continue;
    a.end = a.end || a.start;
    const tr = r - 2;
    a.notes = v(tb, "U" + tr) || "";
    if (a.type === "Viagem") {
      const m = a.name.match(/^(.*?)\s*\((.*?)\s*➔\s*(.*?)\)\s*$/);
      if (m) { a.name = m[1]; a.from = m[2] === "BSB" ? "Brasília" : m[2]; a.to = m[3]; }
      Object.assign(a, {
        km: +v(tb, "H" + tr) || null,
        drive: toMin(v(tb, "I" + tr)),
        stops: +v(tb, "J" + tr) || 0,
        stopTime: toMin(v(tb, "K" + tr)),
        toll: +v(tb, "R" + tr) || 0,
        charges: state.params.defaultCharges ?? 1
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

/* ---------- EVENTOS ---------- */
document.querySelectorAll(".tab").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === b));
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + b.dataset.view));
  };
});

$("#btnTheme").onclick = () => applyTheme(isDarkTheme() ? "light" : "dark");
$("#btnAdd").onclick = () => openModal();
$("#btnCloseX").onclick = () => $("#modal").close();
$("#btnCancel").onclick = () => $("#modal").close();
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

$("#f-drive").addEventListener("input", () => {
  applyAutoStopsToForm(false);
  updateModalPreview();
});
$("#f-stops").addEventListener("input", () => { stopsManualOverride = true; updateModalPreview(); });
$("#f-stopTime").addEventListener("input", () => { stopsManualOverride = true; updateModalPreview(); });
["#f-km", "#f-toll", "#f-charges", "#f-extraCost"].forEach(sel => {
  $(sel).addEventListener("input", updateModalPreview);
});

$("#btnAutoStops").onclick = () => {
  stopsManualOverride = false;
  applyAutoStopsToForm(true);
  toast("⏱️ Paradas recalculadas pela regra padrão!");
};

$("#btnModalSaveKey").onclick = () => {
  const val = $("#modalKeyInput").value.trim();
  if (!val) return toast("Cole uma chave válida.");
  const { needsReload } = window.FeriasMaps.setKey(val);
  if (window.FeriasSync) {
    window.FeriasSync.push(state, val);
  }
  updateModalMapsUI();
  renderParams();
  if (needsReload) {
    toast("Chave salva! Recarregando para ativar...");
    setTimeout(() => location.reload(), 600);
    return;
  }
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
    state.activities.push({ id: uid(), ...a });
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
$("#ganttFilterSeg").querySelectorAll("button").forEach(b => {
  b.onclick = () => {
    ganttFilter = b.dataset.gfilter;
    $("#ganttFilterSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    const s = sorted();
    renderGantt(s);
    renderTimeline(s);
  };
});

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
    ganttZoom = parseInt(b.dataset.zoom, 10) || 46;
    $("#ganttZoomSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    renderGantt(sorted());
  };
});

$("#btnGanttToday").onclick = () => {
  const wrap = $("#ganttWrap");
  const todayHead = wrap.querySelector(".g-head.today");
  if (todayHead) {
    wrap.scrollTo({ left: Math.max(0, todayHead.offsetLeft - 300), behavior: "smooth" });
  } else {
    wrap.scrollTo({ left: 0, behavior: "smooth" });
  }
};

// Dashboard full interactive map
$("#btnRenderFullMap").onclick = async () => {
  const trips = sorted().filter(a => a.type === "Viagem" && a.from && a.to);
  if (!trips.length) return toast("Nenhuma viagem com origem/destino.");
  const pts = [];
  trips.forEach(a => {
    if (a.from && pts[pts.length - 1] !== a.from) pts.push(a.from);
    if (a.to && pts[pts.length - 1] !== a.to) pts.push(a.to);
  });
  if (pts.length < 2) return;
  const container = $("#dashboardMapContainer");
  container.hidden = false;
  container.innerHTML = `<div style="display:grid;place-items:center;height:100%" class="muted">⏳ Carregando rota completa no Google Maps...</div>`;
  try {
    const res = await window.FeriasMaps.computeTripRoute({
      origin: pts[0],
      destination: pts[pts.length - 1],
      intermediates: pts.slice(1, -1).slice(0, 23),
      params: state.params,
      vehicle: state.vehicle
    });
    await window.FeriasMaps.renderRouteOnMap(container, res.route, isDarkTheme());
  } catch (err) {
    container.innerHTML = `<div style="display:grid;place-items:center;height:100%;padding:16px" class="muted">❌ Erro ao renderizar mapa: ${esc(err.message || err)}</div>`;
  }
};

// Parâmetros bindings
$("#p-planTitle").onchange = e => { state.title = e.target.value.trim() || "Férias"; save("⚙️ Título atualizado"); };
$("#p-vehicleName").onchange = e => { state.vehicle.name = e.target.value.trim() || "Veículo"; save("⚙️ Modelo atualizado"); };
$("#p-powertrain").onchange = e => { state.vehicle.powertrain = e.target.value; save("⚙️ Motorização atualizada"); };

$("#btnToggleKey").onclick = () => {
  const inp = $("#gmapsKeyInput");
  inp.type = inp.type === "password" ? "text" : "password";
};
$("#btnSaveKey").onclick = () => {
  const { saved, needsReload } = window.FeriasMaps.setKey($("#gmapsKeyInput").value);
  if (window.FeriasSync) {
    window.FeriasSync.push(state, window.FeriasMaps.getKey());
  }
  renderParams();
  renderDashboard(sorted(), totals());
  if (needsReload) {
    toast("Chave atualizada! Recarregando página...");
    setTimeout(() => location.reload(), 600);
  } else {
    toast(saved ? "🔑 Chave Google Maps salva!" : "Chave removida.");
  }
};
$("#btnTestKey").onclick = async () => {
  const val = $("#gmapsKeyInput").value.trim();
  if (!val) return toast("Informe uma Google Maps API Key.");
  const { needsReload } = window.FeriasMaps.setKey(val);
  if (needsReload) {
    toast("Recarregando com a nova chave...");
    setTimeout(() => location.reload(), 600);
    return;
  }
  toast("⚡ Testando conexão com Google Maps Routes API...");
  try {
    const r = await window.FeriasMaps.testApiKey(val);
    toast(`✅ Conexão OK! Rota SP ➔ Campinas: ${r.km} km · ${hmHuman(r.driveMinutes)}`);
    renderParams();
    renderDashboard(sorted(), totals());
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
  save(`⏱️ Regra padrão reaplicada em ${count} viagem(ns)!`);
};

// Table & Checklist & Menu
$("#search").oninput = $("#filterType").onchange = () => renderTable(sorted(), totals());
$("#filterChecklist").onchange = e => { checklistFilter = e.target.value; renderChecklist(); };
$("#btnAddScenario").onclick = () => {
  state.scenarios.push({ id: uid(), name: "Novo cenário", kmL: state.vehicle.hevKmL });
  save("➕ Cenário adicionado");
};
$("#btnAddCheck").onclick = () => {
  state.checklist.push({ id: uid(), cat: "Geral", item: "Novo item", prio: "Média", status: "Pendente", notes: "" });
  save("➕ Item adicionado ao checklist");
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
  download(`ferias_pro_backup_${fmtISO(new Date())}.json`, new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
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
  } catch {
    toast("Arquivo JSON inválido");
  }
  e.target.value = "";
};

$("#fileXlsx").onchange = async e => {
  const f = e.target.files[0];
  if (f) await importXlsx(f).catch(() => toast("Erro ao ler planilha"));
  e.target.value = "";
};

$("#btnReset").onclick = () => {
  if (confirm("Restaurar os dados iniciais da planilha? Suas alterações serão perdidas.")) {
    state = seed();
    save("↺ Dados restaurados");
  }
};

window.addEventListener("resize", () => {
  if (ganttMode === "gantt") renderGantt(sorted());
});

/* ---------- SINCRONIZAÇÃO VPS ---------- */
let syncRunCheck = null;

function updateSyncUI(info) {
  const pill = $("#syncBadge");
  const txt = $("#syncText");
  const pBadge = $("#syncParamBadge");
  if (!pill || !txt) return;

  pill.setAttribute("data-status", info.status);
  const labels = {
    checking: "Conectando...",
    synced: "Sincronizado",
    syncing: "Salvando...",
    auth_required: "PIN necessário",
    offline: "Sem conexão",
    local_only: "Local"
  };
  txt.textContent = labels[info.status] || "Local";

  if (pBadge) {
    const pLabels = {
      checking: ["Verificando...", "pill"],
      synced: [`Conectado (rev. ${info.serverRevision})`, "pill"],
      syncing: ["Sincronizando...", "pill"],
      auth_required: ["PIN necessário", "pill warn"],
      offline: ["Sem conexão com VPS", "pill warn"],
      local_only: ["Modo local (sem API)", "pill warn"]
    };
    const [pt, pc] = pLabels[info.status] || ["Modo local", "pill warn"];
    pBadge.textContent = pt;
    pBadge.className = pc;
  }
}

function initSync() {
  if (!window.FeriasSync) return;
  const getPayload = () => ({
    stateObj: state,
    gmapsKey: window.FeriasMaps ? window.FeriasMaps.getKey() : ""
  });

  window.FeriasSync.onStatus(updateSyncUI);

  syncRunCheck = window.FeriasSync.startAutoPoll((remoteState, remoteGmapsKey) => {
    state = migrateState(remoteState);
    localStorage.setItem(KEY, JSON.stringify(state));
    if (remoteGmapsKey && window.FeriasMaps && remoteGmapsKey !== window.FeriasMaps.getKey()) {
      window.FeriasMaps.setKey(remoteGmapsKey);
    }
    render();
  }, getPayload);

  $("#syncBadge").onclick = async () => {
    const res = await window.FeriasSync.pull();
    if (res.reason === "auth_required") {
      $("#syncModalInput").value = window.FeriasSync.getToken();
      $("#syncModal").showModal();
      return;
    }
    if (res.reason === "local_only") {
      toast("💾 Modo local ativo (servidor de sincronização não detectado).");
      return;
    }
    if (syncRunCheck) await syncRunCheck();
    toast("☁️ Sincronização verificada!");
  };

  $("#btnCloseSyncModal").onclick = () => $("#syncModal").close();
  $("#btnCancelSyncModal").onclick = () => $("#syncModal").close();
  $("#syncForm").onsubmit = async e => {
    e.preventDefault();
    const tok = $("#syncModalInput").value.trim();
    if (!tok) return;
    window.FeriasSync.setToken(tok);
    const res = await window.FeriasSync.pull();
    if (res.ok) {
      $("#syncModal").close();
      if (syncRunCheck) await syncRunCheck();
      renderParams();
      toast("☁️ Conectado e sincronizado com a VPS!");
    } else if (res.reason === "auth_required") {
      toast("❌ PIN incorreto.");
    } else {
      toast("⚠️ Não foi possível conectar à VPS.");
    }
  };

  $("#btnToggleSyncToken").onclick = () => {
    const inp = $("#syncTokenInput");
    inp.type = inp.type === "password" ? "text" : "password";
  };

  $("#btnSaveSyncToken").onclick = async () => {
    window.FeriasSync.setToken($("#syncTokenInput").value);
    const res = await window.FeriasSync.pull();
    if (res.ok) {
      if (syncRunCheck) await syncRunCheck();
      toast("☁️ Conectado à VPS!");
    } else if (res.reason === "auth_required") {
      toast("❌ PIN incorreto.");
    } else if (res.reason === "local_only") {
      toast("Modo local (servidor /api não ativo neste endereço).");
    }
  };

  $("#btnSyncPull").onclick = async () => {
    const res = await window.FeriasSync.pull();
    if (!res.ok) return toast(res.reason === "auth_required" ? "Informe o PIN da VPS primeiro." : "Servidor indisponível.");
    if (res.data.empty) return toast("VPS ainda sem dados salvos.");
    state = migrateState(res.data.state);
    localStorage.setItem(KEY, JSON.stringify(state));
    window.FeriasSync.setMeta({ updatedAt: res.data.updatedAt, dirty: false });
    if (res.data.gmapsKey && window.FeriasMaps) window.FeriasMaps.setKey(res.data.gmapsKey);
    render();
    toast("⬇️ Dados carregados da VPS!");
  };

  $("#btnSyncPush").onclick = async () => {
    window.FeriasSync.setMeta({ updatedAt: Date.now(), dirty: true });
    const res = await window.FeriasSync.push(state, window.FeriasMaps ? window.FeriasMaps.getKey() : "");
    if (res.ok) toast("⬆️ Dados enviados para a VPS!");
    else toast(res.reason === "auth_required" ? "Informe o PIN da VPS primeiro." : "Falha ao enviar para VPS.");
  };
}

initTheme();
render();
initSync();
