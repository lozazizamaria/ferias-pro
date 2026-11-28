/* ==========================================================================
   My Plan — Modo Pessoal: Filtros Unificados, Mapa & Rotas Aéreas (v58)
   Extraído de app/app.js para modularização limpa (zero-build PWA)
   ========================================================================== */
/* ---------- MODO PESSOAL: FILTROS UNIFICADOS + MAPA (SINCRONIZADO COM A BARRA DE CIDADES DO GANTT) ---------- */
let pmapRenderSeq = 0;
let pmapGmapInstance = null;
let pmapMarkers = [];
let pmapPolylines = [];
let pmapDirectionsRenderers = [];
let pmapEventsBound = false;
const pmapRouteCache = new Map();

const PERSONAL_FILTER_VIEW_LABELS = {
  "gantt": "Cronograma",
  "personal-map": "Mapa",
  "dashboard": "Dashboard",
  "finance": "Financeiro",
  "splitwise": "Dividir Despesas",
  "personal-board": "Quadros",
  "table": "Tabela",
  "checklist": "Checklist"
};

let personalFilterActiveView = "gantt";
let personalFilterAnchorBtn = null;

function createEmptyPersonalUnifiedFilter() {
  return {
    // Núcleo comum (todos os menus)
    search: "",
    year: "",
    month: "",
    dateFrom: "",
    dateTo: "",
    list: "",
    type: "",
    person: "",
    tag: "",
    doneStatus: "",
    // Contextuais por menu
    transport: "",
    city: "",
    attachType: "",
    finCategory: "",
    swCategory: "",
    swPayer: "",
    swSplitMode: "",
    chkPrio: "",
    chkKind: "",
    onlyTravel: false,
    onlyAttach: false,
    onlyCost: false
  };
}

let personalUnifiedFilter = createEmptyPersonalUnifiedFilter();

function getActivePersonalViewId() {
  const activeSec = document.querySelector("main > section.view.active");
  if (activeSec && activeSec.id && activeSec.id.startsWith("view-") && !activeSec.id.startsWith("view-pro-")) {
    const v = activeSec.id.slice(5);
    if (PERSONAL_FILTER_VIEW_LABELS[v]) return v;
  }
  return personalFilterActiveView || "gantt";
}

function readPersonalUnifiedFilterFromDOM() {
  personalUnifiedFilter = {
    search: ($("#pf-search")?.value || "").trim().toLowerCase(),
    year: ($("#pf-year")?.value || "").trim(),
    month: ($("#pf-month")?.value || "").trim(),
    dateFrom: ($("#pf-dateFrom")?.value || "").trim(),
    dateTo: ($("#pf-dateTo")?.value || "").trim(),
    list: ($("#pf-list")?.value || "").trim(),
    type: ($("#pf-type")?.value || "").trim(),
    person: ($("#pf-person")?.value || "").trim().toLowerCase(),
    tag: ($("#pf-tag")?.value || "").trim(),
    doneStatus: ($("#pf-doneStatus")?.value || "").trim(),
    transport: ($("#pf-transport")?.value || "").trim(),
    city: ($("#pf-city")?.value || "").trim(),
    attachType: ($("#pf-attachType")?.value || "").trim(),
    finCategory: ($("#pf-finCategory")?.value || "").trim(),
    swCategory: ($("#pf-swCategory")?.value || "").trim(),
    swPayer: ($("#pf-swPayer")?.value || "").trim(),
    swSplitMode: ($("#pf-swSplitMode")?.value || "").trim(),
    chkPrio: ($("#pf-chkPrio")?.value || "").trim(),
    chkKind: ($("#pf-chkKind")?.value || "").trim(),
    onlyTravel: Boolean($("#pf-onlyTravel")?.checked),
    onlyAttach: Boolean($("#pf-onlyAttach")?.checked),
    onlyCost: Boolean($("#pf-onlyCost")?.checked)
  };
  return personalUnifiedFilter;
}

function writePersonalUnifiedFilterToDOM() {
  const f = personalUnifiedFilter;
  const setVal = (sel, val) => { const el = $(sel); if (el && el.value !== (val || "")) el.value = val || ""; };
  setVal("#pf-search", f.search);
  setVal("#pf-year", f.year);
  setVal("#pf-month", f.month);
  setVal("#pf-dateFrom", f.dateFrom);
  setVal("#pf-dateTo", f.dateTo);
  setVal("#pf-list", f.list);
  setVal("#pf-type", f.type);
  setVal("#pf-person", f.person);
  setVal("#pf-tag", f.tag);
  setVal("#pf-doneStatus", f.doneStatus);
  setVal("#pf-transport", f.transport);
  setVal("#pf-city", f.city);
  setVal("#pf-attachType", f.attachType);
  setVal("#pf-finCategory", f.finCategory);
  setVal("#pf-swCategory", f.swCategory);
  setVal("#pf-swPayer", f.swPayer);
  setVal("#pf-swSplitMode", f.swSplitMode);
  setVal("#pf-chkPrio", f.chkPrio);
  setVal("#pf-chkKind", f.chkKind);
  if ($("#pf-onlyTravel")) $("#pf-onlyTravel").checked = Boolean(f.onlyTravel);
  if ($("#pf-onlyAttach")) $("#pf-onlyAttach").checked = Boolean(f.onlyAttach);
  if ($("#pf-onlyCost")) $("#pf-onlyCost").checked = Boolean(f.onlyCost);
  if ($("#pboardSearch") && document.activeElement !== $("#pboardSearch") && $("#pboardSearch").value !== f.search) {
    $("#pboardSearch").value = f.search || "";
  }
  if ($("#search") && document.activeElement !== $("#search") && $("#search").value !== f.search) {
    $("#search").value = f.search || "";
  }
}

function countActivePersonalUnifiedFilters() {
  const f = personalUnifiedFilter;
  let c = 0;
  if (f.search) c++;
  if (f.year) c++;
  if (f.month) c++;
  if (f.dateFrom) c++;
  if (f.dateTo) c++;
  if (f.list) c++;
  if (f.type) c++;
  if (f.person) c++;
  if (f.tag) c++;
  if (f.doneStatus) c++;
  if (f.transport) c++;
  if (f.city) c++;
  if (f.attachType) c++;
  if (f.finCategory) c++;
  if (f.swCategory) c++;
  if (f.swPayer) c++;
  if (f.swSplitMode) c++;
  if (f.chkPrio) c++;
  if (f.chkKind) c++;
  if (f.onlyTravel) c++;
  if (f.onlyAttach) c++;
  if (f.onlyCost) c++;
  return c;
}

function getPersonalActiveFilterChipList() {
  const f = personalUnifiedFilter;
  const chips = [];
  const cols = typeof ensurePersonalBoardColumns === "function" ? ensurePersonalBoardColumns() : [];
  const swParts = Array.isArray(state?.splitwise?.participants) ? state.splitwise.participants : [];
  if (f.search) chips.push({ key: "search", label: `Busca: "${f.search}"` });
  if (f.doneStatus) chips.push({ key: "doneStatus", label: f.doneStatus === "done" ? "✅ Concluídos" : "⏳ Pendentes" });
  if (f.year) chips.push({ key: "year", label: `Ano: ${f.year}` });
  if (f.month) chips.push({ key: "month", label: `Mês: ${f.month}` });
  if (f.dateFrom) chips.push({ key: "dateFrom", label: `De: ${typeof fmtShortBR === "function" ? fmtShortBR(f.dateFrom) : f.dateFrom}` });
  if (f.dateTo) chips.push({ key: "dateTo", label: `Até: ${typeof fmtShortBR === "function" ? fmtShortBR(f.dateTo) : f.dateTo}` });
  if (f.list) {
    const col = cols.find(c => c.id === f.list);
    chips.push({ key: "list", label: `Lista: ${col?.title || f.list}` });
  }
  if (f.type) chips.push({ key: "type", label: `Tipo: ${f.type}` });
  if (f.person) chips.push({ key: "person", label: `Pessoa: ${f.person}` });
  if (f.tag) chips.push({ key: "tag", label: `#${f.tag}` });
  if (f.transport) chips.push({ key: "transport", label: `Locomoção: ${f.transport}` });
  if (f.city) chips.push({ key: "city", label: `Cidade: ${f.city}` });
  if (f.attachType) chips.push({ key: "attachType", label: `Anexo: ${f.attachType.toUpperCase()}` });
  if (f.finCategory) chips.push({ key: "finCategory", label: `Categoria: ${f.finCategory}` });
  if (f.swCategory) chips.push({ key: "swCategory", label: `Despesa: ${f.swCategory}` });
  if (f.swPayer) {
    const p = swParts.find(x => x.id === f.swPayer);
    chips.push({ key: "swPayer", label: `Pagador: ${p?.name || f.swPayer}` });
  }
  if (f.swSplitMode) chips.push({ key: "swSplitMode", label: `Divisão: ${f.swSplitMode}` });
  if (f.chkPrio) chips.push({ key: "chkPrio", label: `Prioridade: ${f.chkPrio}` });
  if (f.chkKind) chips.push({ key: "chkKind", label: f.chkKind === "manual" ? "Itens Avulsos" : "Itens de Cartões" });
  if (f.onlyTravel) chips.push({ key: "onlyTravel", label: "✈️ Com viagem" });
  if (f.onlyAttach) chips.push({ key: "onlyAttach", label: "📎 Com anexos" });
  if (f.onlyCost) chips.push({ key: "onlyCost", label: "💰 Com custo" });
  return chips;
}

function updatePersonalUnifiedFilterBadge() {
  const cnt = countActivePersonalUnifiedFilters();
  document.querySelectorAll("[data-puf-count]").forEach(b => {
    b.textContent = cnt ? String(cnt) : "";
    b.hidden = !cnt;
  });
  document.querySelectorAll("[data-puf-trigger]").forEach(btn => {
    btn.classList.toggle("has-active", cnt > 0);
  });
  document.querySelectorAll("[data-puf-quick-clear]").forEach(btn => {
    btn.hidden = !cnt;
  });
  const hCnt = $("#pufHeaderCount");
  if (hCnt) { hCnt.textContent = cnt ? String(cnt) : ""; hCnt.hidden = !cnt; }
  const hClr = $("#btnPufHeadClear");
  if (hClr) hClr.hidden = !cnt;

  const chips = getPersonalActiveFilterChipList();
  const chipsHtml = chips.map(ch =>
    `<button type="button" class="puf-chip" data-puf-rm="${esc(ch.key)}" title="Remover filtro ${esc(ch.label)}"><span>${esc(ch.label)}</span><span aria-hidden="true">✕</span></button>`
  ).join("");
  document.querySelectorAll("[data-puf-chips]").forEach(host => {
    host.innerHTML = chipsHtml;
    host.hidden = !chips.length;
    host.querySelectorAll("[data-puf-rm]").forEach(b => {
      b.onclick = () => {
        const k = b.dataset.pufRm;
        if (typeof personalUnifiedFilter[k] === "boolean") personalUnifiedFilter[k] = false;
        else personalUnifiedFilter[k] = "";
        writePersonalUnifiedFilterToDOM();
        updatePersonalUnifiedFilterBadge();
        render();
      };
    });
  });
}

function adaptPersonalFilterPanelForView(viewIdOpt) {
  const v = PERSONAL_FILTER_VIEW_LABELS[viewIdOpt] ? viewIdOpt : getActivePersonalViewId();
  personalFilterActiveView = v;
  const lbl = PERSONAL_FILTER_VIEW_LABELS[v] || "Pessoal";
  if ($("#pufContextBadge")) $("#pufContextBadge").textContent = lbl;
  if ($("#pufContextualTitle")) $("#pufContextualTitle").textContent = `Filtros específicos · ${lbl}`;

  const ctxSec = $("#pufContextualSection");
  if (!ctxSec) return;
  let visibleCount = 0;
  ctxSec.querySelectorAll("[data-puf-views]").forEach(el => {
    const allowed = String(el.dataset.pufViews || "").split(",").map(x => x.trim()).filter(Boolean);
    const match = allowed.includes(v);
    el.hidden = !match;
    if (match && el.classList.contains("puf-field")) visibleCount++;
    if (match && el.classList.contains("puf-chk")) visibleCount++;
  });
  ctxSec.hidden = visibleCount === 0;
}

function positionPersonalFilterPanel(triggerBtn) {
  const panel = $("#pmapFilterPopPanel");
  const backdrop = $("#pufBackdrop");
  if (!panel) return;
  const isMobile = window.innerWidth < 768;
  panel.classList.toggle("is-sheet", isMobile);
  if (backdrop) backdrop.hidden = false;
  if (isMobile) {
    panel.style.top = "";
    panel.style.left = "";
    panel.style.right = "";
    panel.style.bottom = "";
    return;
  }
  const margin = 14;
  const panelW = Math.min(720, window.innerWidth - margin * 2);
  const estH = Math.min(580, window.innerHeight - 90);
  if (triggerBtn && triggerBtn.isConnected) {
    const r = triggerBtn.getBoundingClientRect();
    let left = r.left;
    if (left + panelW > window.innerWidth - margin) {
      left = Math.max(margin, r.right - panelW);
    }
    if (left < margin) left = margin;
    let top = r.bottom + 8;
    if (top + estH > window.innerHeight - margin && r.top - 8 > window.innerHeight - r.bottom) {
      top = Math.max(margin, window.innerHeight - estH - margin);
    }
    panel.style.left = `${Math.round(left)}px`;
    panel.style.right = "auto";
    panel.style.top = `${Math.round(Math.max(margin, top))}px`;
    panel.style.bottom = "auto";
  } else {
    panel.style.left = `${Math.round(Math.max(margin, (window.innerWidth - panelW) / 2))}px`;
    panel.style.right = "auto";
    panel.style.top = "78px";
    panel.style.bottom = "auto";
  }
}

function closePersonalFilterPanel(markDismiss = false) {
  const panel = $("#pmapFilterPopPanel");
  const backdrop = $("#pufBackdrop");
  const wasOpen = Boolean(panel && !panel.hidden);
  if (panel) panel.hidden = true;
  if (backdrop) backdrop.hidden = true;
  document.querySelectorAll("[data-puf-trigger]").forEach(btn => btn.setAttribute("aria-expanded", "false"));
  personalFilterAnchorBtn = null;
  if (wasOpen && markDismiss) window.MyPlanDismiss?.markDismissed?.();
}

function openPersonalFilterPanel(triggerBtn = null, viewIdOpt = null) {
  const panel = $("#pmapFilterPopPanel");
  if (!panel) return;
  const isSameToggle = !panel.hidden && triggerBtn && personalFilterAnchorBtn === triggerBtn;
  if (isSameToggle) {
    closePersonalFilterPanel(true);
    return;
  }
  const targetView = viewIdOpt || triggerBtn?.dataset?.pufTrigger || getActivePersonalViewId();
  populatePersonalUnifiedFilterOptions(sorted());
  adaptPersonalFilterPanelForView(targetView);
  writePersonalUnifiedFilterToDOM();
  personalFilterAnchorBtn = triggerBtn;
  panel.hidden = false;
  positionPersonalFilterPanel(triggerBtn);
  document.querySelectorAll("[data-puf-trigger]").forEach(btn => {
    btn.setAttribute("aria-expanded", String(btn === triggerBtn));
  });
}

function clearPersonalUnifiedFilters(shouldRender = true) {
  personalUnifiedFilter = createEmptyPersonalUnifiedFilter();
  writePersonalUnifiedFilterToDOM();
  updatePersonalUnifiedFilterBadge();
  if (shouldRender && typeof render === "function") render();
}

function populatePersonalUnifiedFilterOptions(allActs) {
  bindPersonalMapControls();
  const acts = Array.isArray(allActs) ? allActs : sorted();
  const fillSel = (sel, defaultLbl, pairs) => {
    if (!sel) return;
    const prev = sel.value || "";
    sel.innerHTML = `<option value="">${defaultLbl}</option>`
      + pairs.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("");
    if (prev && pairs.some(([v]) => v === prev)) sel.value = prev;
  };
  const swExps = Array.isArray(state?.splitwise?.expenses) ? state.splitwise.expenses : [];
  const swParts = Array.isArray(state?.splitwise?.participants) ? state.splitwise.participants : [];

  const yearSet = new Set(acts.map(a => String(a.start || "").slice(0, 4)).filter(y => /^\d{4}$/.test(y)));
  swExps.forEach(ex => { const y = String(ex.date || "").slice(0, 4); if (/^\d{4}$/.test(y)) yearSet.add(y); });
  fillSel($("#pf-year"), "Todos os anos", [...yearSet].sort().map(y => [y, y]));

  const cols = ensurePersonalBoardColumns();
  fillSel($("#pf-list"), "Todas as listas", cols.map(c => [c.id, c.title]));

  const types = [...new Set(acts.map(a => a.type).filter(Boolean))].sort();
  fillSel($("#pf-type"), "Todos os tipos", types.map(t => [t, t]));

  const citySet = new Set();
  acts.forEach(a => {
    [a.from, a.to, a.location, a.city].forEach(raw => {
      const clean = cleanCityName(raw);
      if (clean) citySet.add(clean);
    });
  });
  fillSel($("#pf-city"), "Todas as cidades", [...citySet].sort().map(c => [c, c]));

  const tags = [...new Set(acts.flatMap(a => Array.isArray(a.tags) ? a.tags : []).filter(Boolean))].sort();
  fillSel($("#pf-tag"), "Todas as tags", tags.map(tg => [tg, `#${tg}`]));

  const swCats = [...new Set([
    ...(window.MyPlanSplitwise?.CATEGORIES || []),
    ...swExps.map(e => e.cat).filter(Boolean)
  ])];
  fillSel($("#pf-swCategory"), "Todas as categorias", swCats.map(c => [c, c]));
  fillSel($("#pf-swPayer"), "Todos os pagadores", swParts.map(p => [p.id, p.name]));

  const personDl = $("#pf-personList");
  if (personDl) {
    const people = new Set(swParts.map(p => p.name).filter(Boolean));
    acts.forEach(a => { if (a.assignee) people.add(String(a.assignee).trim()); });
    personDl.innerHTML = [...people].sort().map(p => `<option value="${esc(p)}"></option>`).join("");
  }

  adaptPersonalFilterPanelForView(getActivePersonalViewId());
  updatePersonalUnifiedFilterBadge();
}

function activityMatchesAttachType(a, attachType) {
  if (!attachType) return true;
  const list = [
    ...(Array.isArray(a.attachments) ? a.attachments : []),
    ...(Array.isArray(a.travelDetails?.tickets) ? a.travelDetails.tickets : [])
  ];
  if (!list.length) return false;
  return list.some(att => {
    const name = String(att.fileName || att.name || att.url || "").toLowerCase();
    const mime = String(att.mimeType || "").toLowerCase();
    if (attachType === "pdf") return mime.includes("pdf") || name.endsWith(".pdf");
    if (attachType === "image") return mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|bmp|heic)$/i.test(name);
    if (attachType === "sheet") return /(sheet|excel|csv|word|document|officedocument|presentation|text\/)/i.test(mime) || /\.(xlsx?|csv|docx?|pptx?|txt)$/i.test(name);
    if (attachType === "link") return Boolean(att.url && !att.id) || /^https?:\/\//i.test(name);
    return true;
  });
}

function activityMatchesFinCategory(a, cat) {
  if (!cat) return true;
  if (cat === "Viagem") return a.type === "Viagem";
  if (cat === "Hospedagem") return a.type === "Hospedagem";
  if (cat === "Restaurante") return a.type === "Restaurante";
  if (cat === "Voo") return ["Voo", "Trem", "Ônibus", "Navio"].includes(a.type);
  if (cat === "Ingresso") return ["Ingresso", "Passeio", "Evento"].includes(a.type);
  return !["Viagem", "Hospedagem", "Restaurante", "Voo", "Trem", "Ônibus", "Navio", "Ingresso", "Passeio", "Evento"].includes(a.type);
}

function applyPersonalUnifiedFilter(list) {
  const f = personalUnifiedFilter;
  if (!countActivePersonalUnifiedFilters()) return list;
  const cols = ensurePersonalBoardColumns();
  const colIds = new Set(cols.map(c => c.id));
  const defColId = cols[0]?.id || "";
  const swParts = Array.isArray(state?.splitwise?.participants) ? state.splitwise.participants : [];
  const payerObj = f.swPayer ? swParts.find(p => p.id === f.swPayer) : null;

  return list.filter(a => {
    if (!a) return false;
    const s = String(a.start || "");
    const e = String(a.end || s);
    if (f.search) {
      const hay = [
        a.name || "", a.notes || "", a.from || "", a.to || "",
        a.location || "", a.city || "", a.airline || "", a.bookingRef || "",
        a.type || "", ...(Array.isArray(a.tags) ? a.tags : [])
      ].join(" ").toLowerCase();
      if (!hay.includes(f.search)) return false;
    }
    if (f.year && !s.startsWith(f.year) && !e.startsWith(f.year)) return false;
    if (f.month && s.slice(5, 7) !== f.month && e.slice(5, 7) !== f.month) return false;
    if (f.dateFrom && e && e < f.dateFrom) return false;
    if (f.dateTo && s && s > f.dateTo) return false;
    if (f.list) {
      const cid = (a.personalColId && colIds.has(a.personalColId)) ? a.personalColId : defColId;
      if (cid !== f.list) return false;
    }
    if (f.type && a.type !== f.type) return false;
    if (f.doneStatus) {
      const done = typeof isPersonalCardDone === "function" ? isPersonalCardDone(a, cols, state?.params) : Boolean(a.completed);
      if (f.doneStatus === "done" && !done) return false;
      if (f.doneStatus === "pending" && done) return false;
    }
    if (f.transport && a.type !== f.transport) return false;
    if (f.city) {
      const want = normCityKey(f.city);
      const has = [a.from, a.to, a.location, a.city].some(raw => normCityKey(raw) === want);
      if (!has) return false;
    }
    if (f.person) {
      const pName = a.splitConfig?.payerId ? (swParts.find(p => p.id === a.splitConfig.payerId)?.name || "") : "";
      const pHay = [a.assignee || "", pName, a.notes || "", a.name || "", ...(Array.isArray(a.tags) ? a.tags : [])].join(" ").toLowerCase();
      if (!pHay.includes(f.person)) return false;
    }
    if (f.tag && !(Array.isArray(a.tags) && a.tags.includes(f.tag))) return false;
    if (f.attachType && !activityMatchesAttachType(a, f.attachType)) return false;
    if (f.finCategory && !activityMatchesFinCategory(a, f.finCategory)) return false;
    if (f.swPayer) {
      const matchId = a.splitConfig?.payerId === f.swPayer;
      const matchTxt = payerObj && `${a.assignee || ""} ${a.notes || ""}`.toLowerCase().includes(payerObj.name.toLowerCase());
      if (!matchId && !matchTxt) return false;
    }
    if (f.onlyTravel && !isTravelType(a.type)) return false;
    if (f.onlyAttach) {
      const hasAtt = (Array.isArray(a.attachments) && a.attachments.length > 0) || (Array.isArray(a.travelDetails?.tickets) && a.travelDetails.tickets.length > 0);
      if (!hasAtt) return false;
    }
    if (f.onlyCost) {
      const cVal = (typeof calc === "function") ? calc(a) : { total: 0, extra: Number(a.extraCost) || 0 };
      if ((cVal.total + cVal.extra) <= 0) return false;
    }
    return true;
  });
}

function haversineKm(p1, p2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function isPersonalFlightLeg(a) {
  if (!a || typeof a !== "object") return false;
  if (a.type === "Voo") return true;
  const tr = String(a.transport || a.travelDetails?.transport || "").toLowerCase();
  return /avi[aã]o|voo|a[eé]reo/.test(tr);
}

function computeBezierFlightArc(p1, p2, steps = 36) {
  const dLat = p2.lat - p1.lat;
  const dLng = p2.lng - p1.lng;
  const dist = Math.hypot(dLat, dLng) || 0.01;
  // Vetor perpendicular para criar arco suave (sempre curvando ligeiramente para o norte/cima)
  let perpLat = -dLng / dist;
  let perpLng = dLat / dist;
  if (perpLat < 0) { perpLat = -perpLat; perpLng = -perpLng; }
  const offset = Math.min(3.5, Math.max(0.18, dist * 0.2));
  const cLat = (p1.lat + p2.lat) / 2 + perpLat * offset;
  const cLng = (p1.lng + p2.lng) / 2 + perpLng * offset;

  const path = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    path.push({
      lat: u * u * p1.lat + 2 * u * t * cLat + t * t * p2.lat,
      lng: u * u * p1.lng + 2 * u * t * cLng + t * t * p2.lng
    });
  }
  const midpoint = path[Math.floor(steps / 2)];
  // Ângulo da tangente no ponto médio (0° = Norte, sentido horário)
  const cosLat = Math.cos((midpoint.lat * Math.PI) / 180) || 1;
  const vx = (p2.lng - p1.lng) * cosLat;
  const vy = p2.lat - p1.lat;
  const bearingDeg = ((Math.atan2(vx, vy) * 180) / Math.PI + 360) % 360;
  return { path, midpoint, bearingDeg };
}

function bindPersonalMapControls() {
  if (pmapEventsBound) return;
  pmapEventsBound = true;
  const popPanel = $("#pmapFilterPopPanel");
  const backdrop = $("#pufBackdrop");

  document.querySelectorAll("[data-puf-trigger]").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      openPersonalFilterPanel(btn, btn.dataset.pufTrigger);
    };
  });
  document.querySelectorAll("[data-puf-quick-clear]").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      clearPersonalUnifiedFilters(true);
    };
  });

  if (backdrop) {
    backdrop.onclick = e => {
      e.stopPropagation();
      closePersonalFilterPanel(true);
    };
  }
  if ($("#btnPufClose")) $("#btnPufClose").onclick = () => closePersonalFilterPanel(true);
  if ($("#btnPufHeadClear")) $("#btnPufHeadClear").onclick = () => clearPersonalUnifiedFilters(true);
  if ($("#btnPmapClearFilters")) $("#btnPmapClearFilters").onclick = () => clearPersonalUnifiedFilters(true);
  if ($("#btnPufApply")) {
    $("#btnPufApply").onclick = () => {
      readPersonalUnifiedFilterFromDOM();
      writePersonalUnifiedFilterToDOM();
      updatePersonalUnifiedFilterBadge();
      closePersonalFilterPanel(false);
      render();
    };
  }

  // Live update em mudança de selects/checkboxes dentro do painel unificado
  if (popPanel) {
    popPanel.addEventListener("change", () => {
      readPersonalUnifiedFilterFromDOM();
      updatePersonalUnifiedFilterBadge();
      render();
    });
    const pfSearch = $("#pf-search");
    if (pfSearch) {
      let tmr = null;
      pfSearch.addEventListener("input", () => {
        clearTimeout(tmr);
        tmr = setTimeout(() => {
          readPersonalUnifiedFilterFromDOM();
          writePersonalUnifiedFilterToDOM();
          updatePersonalUnifiedFilterBadge();
          render();
        }, 160);
      });
    }
  }

  window.addEventListener("resize", () => {
    if (popPanel && !popPanel.hidden) positionPersonalFilterPanel(personalFilterAnchorBtn);
  });

  window.MyPlanPersonalFilters = {
    open: openPersonalFilterPanel,
    close: closePersonalFilterPanel,
    clear: clearPersonalUnifiedFilters,
    getState: () => personalUnifiedFilter,
    count: countActivePersonalUnifiedFilters,
    adaptForView: adaptPersonalFilterPanelForView,
    syncBadges: updatePersonalUnifiedFilterBadge
  };
}

function buildPersonalDateRangeISOs(acts, dateFrom, dateTo) {
  const dated = acts.filter(a => a && a.start);
  if (!dated.length) return [];
  let minIso = dated.reduce((m, a) => (a.start < m ? a.start : m), dated[0].start);
  let maxIso = dated.reduce((m, a) => {
    const e = a.end || a.start;
    return e > m ? e : m;
  }, dated[0].end || dated[0].start);
  if (dateFrom && dateFrom > minIso) minIso = dateFrom;
  if (dateTo && dateTo < maxIso) maxIso = dateTo;
  if (minIso > maxIso) return [];
  const out = [];
  const cur = parseD(minIso);
  const end = parseD(maxIso);
  let guard = 0;
  while (cur <= end && guard < 730) {
    out.push(fmtISO(cur));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return out;
}

function renderPersonalMapSvgFallback(canvas, cityPoints, legSegments = []) {
  if (!cityPoints.length) {
    canvas.innerHTML = `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;gap:8px">
      <div style="font-size:2.4rem">🗺️</div>
      <strong>Nenhuma cidade encontrada no período selecionado</strong>
      <span class="muted small">Adicione trechos de viagem (Origem ➔ Destino) no Cronograma para visualizar a rota e os dias por cidade.</span>
    </div>`;
    return;
  }
  const lats = cityPoints.map(p => p.lat);
  const lngs = cityPoints.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const padLat = Math.max(0.6, (maxLat - minLat) * 0.22);
  const padLng = Math.max(0.6, (maxLng - minLng) * 0.22);
  const W = 720, H = 440;
  const proj = (lat, lng) => ({
    x: 56 + ((lng - (minLng - padLng)) / Math.max(0.001, (maxLng + padLng) - (minLng - padLng))) * (W - 112),
    y: H - 56 - ((lat - (minLat - padLat)) / Math.max(0.001, (maxLat + padLat) - (minLat - padLat))) * (H - 112)
  });
  const pts = cityPoints.map(p => ({ ...p, ...proj(p.lat, p.lng) }));
  const ptByKey = new Map(pts.map(p => [p.key, p]));

  let routesSvg = "";
  if (legSegments.length) {
    routesSvg = legSegments.map(leg => {
      const a = ptByKey.get(leg.fromKey);
      const b = ptByKey.get(leg.toKey);
      if (!a || !b || a.key === b.key) return "";
      if (leg.isFlight) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        let nx = -dy / d, ny = dx / d;
        if (ny > 0) { nx = -nx; ny = -ny; }
        const bend = Math.min(72, Math.max(22, d * 0.22));
        const cx = (a.x + b.x) / 2 + nx * bend;
        const cy = (a.y + b.y) / 2 + ny * bend;
        const mx = 0.25 * a.x + 0.5 * cx + 0.25 * b.x;
        const my = 0.25 * a.y + 0.5 * cy + 0.25 * b.y;
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        return `<g>
          <path d="M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}" fill="none" stroke="#f97316" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round"/>
          <g transform="translate(${mx.toFixed(1)},${my.toFixed(1)}) rotate(${angleDeg.toFixed(1)})">
            <circle r="11" fill="#ffffff" stroke="#f97316" stroke-width="2"/>
            <path d="M0 -6.5 L1.6 -1.5 L6.5 1 L6.5 2.6 L1.6 1.2 L1.6 4.8 L3.6 6 L3.6 7.2 L0 6.2 L-3.6 7.2 L-3.6 6 L-1.6 4.8 L-1.6 1.2 L-6.5 2.6 L-6.5 1 L-1.6 -1.5 Z" fill="#f97316"/>
          </g>
        </g>`;
      }
      return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#2563eb" stroke-width="3.2" stroke-linecap="round"/>`;
    }).join("");
  } else if (pts.length >= 2) {
    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    routesSvg = `<path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="3.2" stroke-dasharray="8 6" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  const markersSvg = pts.map((p, i) => {
    const labelTxt = p.days ? `${p.city} • ${p.days}d` : p.city;
    const pillW = Math.max(66, labelTxt.length * 6.5 + 16);
    const flipLeft = (p.x + 17 + pillW) > (W - 10);
    const rx = flipLeft ? Math.max(6, p.x - 17 - pillW) : (p.x + 17);
    const tx = rx + 8;
    return `<g>
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="13" fill="${p.hex}" stroke="#ffffff" stroke-width="2.5"/>
      <text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">${i + 1}</text>
      <rect x="${rx.toFixed(1)}" y="${(p.y - 11).toFixed(1)}" width="${pillW.toFixed(1)}" height="22" rx="11" fill="rgba(255,255,255,0.94)" stroke="rgba(15,23,42,0.16)" stroke-width="1"/>
      <text x="${tx.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" font-size="11" font-weight="700" fill="#0f172a">${esc(labelTxt)}</text>
    </g>`;
  }).join("");
  canvas.innerHTML = `<div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:10px">
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%;max-height:500px;color:var(--text)">
      ${routesSvg}
      ${markersSvg}
    </svg>
  </div>`;
}

async function renderPersonalMap() {
  bindPersonalMapControls();
  const canvas = $("#personalMapCanvas");
  if (!canvas) return;
  const seq = ++pmapRenderSeq;
  const acts = applyPersonalUnifiedFilter(sorted());

  const dateFrom = personalUnifiedFilter.dateFrom || "";
  const dateTo = personalUnifiedFilter.dateTo || "";
  const citySearch = (personalUnifiedFilter.city || "").toLowerCase();
  updatePersonalUnifiedFilterBadge();
  if ($("#pmapPeriodBadge")) {
    $("#pmapPeriodBadge").textContent = (dateFrom || dateTo)
      ? `${dateFrom ? fmtShortBR(dateFrom) : "Início"} → ${dateTo ? fmtShortBR(dateTo) : "Fim"}`
      : (personalUnifiedFilter.year ? `Ano ${personalUnifiedFilter.year}` : "Roteiro completo");
  }

  // 1. Fonte Única de Verdade: barra de cidades do Gantt (computeDailyCityTimeline)
  const dateISOs = buildPersonalDateRangeISOs(acts, dateFrom, dateTo);
  const cityTimeline = computeDailyCityTimeline(acts, dateISOs);
  const dark = isDarkTheme();

  // Filtrar dias pela busca de cidade se informada
  const dayCitiesFiltered = cityTimeline.dayCities.filter(dc => {
    if (!dc.city) return false;
    if (citySearch && !dc.city.toLowerCase().includes(citySearch)) return false;
    return true;
  });

  // Agregar dias reais por cidade (mantendo ordem cronológica de visita)
  const cityDaysMap = new Map();
  const chronologicalStayCities = [];
  dayCitiesFiltered.forEach(dc => {
    const colObj = cityTimeline.colorMap[dc.key] || CITY_PALETTE[0];
    const hex = dark ? colObj.darkTxt : colObj.lightTxt;
    if (!cityDaysMap.has(dc.key)) {
      const rec = { key: dc.key, city: dc.city, days: 0, hex, firstIso: dc.iso, lastIso: dc.iso };
      cityDaysMap.set(dc.key, rec);
      chronologicalStayCities.push(rec);
    }
    const rec = cityDaysMap.get(dc.key);
    rec.days++;
    rec.lastIso = dc.iso;
  });

  // Sequência completa de cidades passadas (origem + paradas intermediárias + destinos) e distância/tempo de estrada
  const legsInRange = acts.filter(a => {
    if (!a || !(a.from || a.to)) return false;
    const s = a.start || "";
    const e = a.end || s;
    if (dateFrom && e < dateFrom) return false;
    if (dateTo && s > dateTo) return false;
    return true;
  });

  let totalKm = 0;
  let totalRoadMin = 0;
  let roadLegsCount = 0;
  let flightLegsCount = 0;
  let totalFlightMin = 0;
  let totalFlightKm = 0;
  const passedCityKeys = new Set();
  const routeSequence = [];
  const routeLegs = [];
  const pushRouteCity = raw => {
    const clean = cleanCityName(raw);
    const k = normCityKey(clean);
    if (!clean || !k) return null;
    passedCityKeys.add(k);
    if (!routeSequence.length || routeSequence[routeSequence.length - 1].key !== k) {
      routeSequence.push({ key: k, city: clean });
    }
    return { key: k, city: clean };
  };
  legsInRange.forEach(a => {
    const isFlight = isPersonalFlightLeg(a);
    if (isFlight) {
      flightLegsCount++;
      if (Number(a.drive) > 0) totalFlightMin += Number(a.drive);
      if (Number(a.km) > 0) totalFlightKm += Number(a.km);
    } else {
      roadLegsCount++;
      totalKm += Number(a.km) || 0;
      totalRoadMin += (Number(a.drive) || 0) + (Number(a.stopTime) || 0);
    }
    const legCities = [];
    if (a.from) { const c = pushRouteCity(a.from); if (c) legCities.push(c); }
    if (Array.isArray(a.waypoints)) a.waypoints.forEach(w => { const c = pushRouteCity(w); if (c) legCities.push(c); });
    if (a.to) { const c = pushRouteCity(a.to); if (c) legCities.push(c); }
    for (let i = 0; i < legCities.length - 1; i++) {
      if (legCities[i].key !== legCities[i + 1].key) {
        routeLegs.push({
          fromKey: legCities[i].key,
          fromCity: legCities[i].city,
          toKey: legCities[i + 1].key,
          toCity: legCities[i + 1].city,
          isFlight,
          hasExplicitDrive: Number(a.drive) > 0,
          hasExplicitKm: Number(a.km) > 0
        });
      }
    }
  });
  chronologicalStayCities.forEach(c => {
    passedCityKeys.add(c.key);
    if (!routeSequence.some(r => r.key === c.key)) routeSequence.push({ key: c.key, city: c.city });
  });

  const totalVacationDays = dayCitiesFiltered.length;
  const visitedCitiesCount = chronologicalStayCities.length;
  const passedCitiesCount = Math.max(visitedCitiesCount, passedCityKeys.size);

  const renderSummaryStats = () => {
    const statsEl = $("#pmapStatsGrid");
    if (!statsEl) return;
    const onlyFlights = flightLegsCount > 0 && roadLegsCount === 0;
    const isMixed = flightLegsCount > 0 && roadLegsCount > 0;
    const combinedKm = totalKm + totalFlightKm;
    const distLbl = onlyFlights ? "✈️ Distância aérea" : "🛣️ Distância total";
    const distVal = combinedKm > 0 ? `${num(combinedKm)} km` : "—";
    let timeLbl = "⏱️ Tempo de estrada";
    let timeVal = totalRoadMin > 0 ? hmHuman(totalRoadMin) : "—";
    if (onlyFlights) {
      timeLbl = "✈️ Tempo de voo estimado";
      timeVal = totalFlightMin > 0 ? hmHuman(totalFlightMin) : "—";
    } else if (isMixed) {
      timeLbl = "⏱️ Estrada + Voo";
      timeVal = `${totalRoadMin > 0 ? hmHuman(totalRoadMin) : "0h"} · ✈️ ${totalFlightMin > 0 ? hmHuman(totalFlightMin) : "—"}`;
    }
    const statsList = [
      [distLbl, distVal],
      [timeLbl, timeVal],
      ["📍 Cidades a visitar", `${visitedCitiesCount} ${visitedCitiesCount === 1 ? "cidade" : "cidades"}`],
      [flightLegsCount > 0 ? "✈️ Voos / Rota" : "🧭 Total na rota", flightLegsCount > 0 ? `${flightLegsCount} ${flightLegsCount === 1 ? "voo" : "voos"} · ${passedCitiesCount} cid.` : `${passedCitiesCount} ${passedCitiesCount === 1 ? "cidade" : "cidades"}`]
    ];
    statsEl.innerHTML = statsList.map(([lbl, val]) => `
      <div class="pmap-stat-box">
        <div class="pmap-stat-lbl">${lbl}</div>
        <div class="pmap-stat-val" title="${esc(val)}">${esc(val)}</div>
      </div>`).join("");
  };
  renderSummaryStats();

  const citiesListEl = $("#pmapCitiesList");
  if (citiesListEl) {
    if (!chronologicalStayCities.length) {
      citiesListEl.innerHTML = `<div class="muted small" style="padding:8px 0">Nenhuma cidade encontrada no cronograma para este filtro.</div>`;
    } else {
      citiesListEl.innerHTML = chronologicalStayCities.map(c => `
        <button type="button" class="pmap-city-row" data-pmap-city="${esc(c.key)}" title="${esc(c.city)} — ${c.days} ${c.days === 1 ? "dia" : "dias"}">
          <span class="pmap-city-left">
            <span class="pmap-city-dot" style="background:${esc(c.hex)}"></span>
            <span class="pmap-city-name">${esc(c.city)}</span>
          </span>
          <span class="pmap-city-days">${c.days} ${c.days === 1 ? "dia" : "dias"}</span>
        </button>`).join("");
    }
  }
  if ($("#pmapTotalDaysFoot")) {
    $("#pmapTotalDaysFoot").textContent = `${totalVacationDays} ${totalVacationDays === 1 ? "dia" : "dias"}`;
  }

  // 3. Dashboard Abaixo do Mapa (EXATAMENTE 2 cards lado a lado: Total de dias por localidade + Distribuição Temporal Mensal)
  const daysChartEl = $("#pmapChartDaysByCity");
  if (daysChartEl) {
    const sortedCities = chronologicalStayCities.slice().sort((a, b) => b.days - a.days);
    if (!sortedCities.length) {
      daysChartEl.innerHTML = `<div class="muted small" style="padding:16px 0">Sem dados de permanência no período selecionado.</div>`;
    } else {
      const maxD = Math.max(1, ...sortedCities.map(c => c.days));
      daysChartEl.innerHTML = `<div class="pmap-hbar-list">${sortedCities.map(c => `
        <div class="pmap-hbar-row">
          <div class="pmap-hbar-top">
            <span><span class="pmap-city-dot" style="display:inline-block;margin-right:6px;background:${esc(c.hex)}"></span>${esc(c.city)}</span>
            <strong>${c.days} ${c.days === 1 ? "dia" : "dias"}</strong>
          </div>
          <div class="pmap-hbar-track">
            <div class="pmap-hbar-fill" style="width:${Math.round((c.days / maxD) * 100)}%;background:${esc(c.hex)}"></div>
          </div>
        </div>`).join("")}</div>`;
    }
  }

  const monthChartEl = $("#pmapChartMonthly");
  if (monthChartEl) {
    const byMonth = new Map();
    dayCitiesFiltered.forEach(dc => {
      const ym = String(dc.iso || "").slice(0, 7);
      if (ym.length === 7) byMonth.set(ym, (byMonth.get(ym) || 0) + 1);
    });
    const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (!months.length) {
      monthChartEl.innerHTML = `<div class="muted small" style="padding:16px 0">Sem dados mensais no período selecionado.</div>`;
    } else {
      const maxM = Math.max(1, ...months.map(m => m[1]));
      monthChartEl.innerHTML = `<div class="pmap-vbars">${months.map(([ym, cnt]) => {
        const [y, m] = ym.split("-");
        const lbl = `${MON[parseInt(m, 10) - 1]}/${y.slice(-2)}`;
        const pct = Math.max(8, Math.round((cnt / maxM) * 100));
        return `<div class="pmap-vbar-col" title="${lbl}: ${cnt} ${cnt === 1 ? "dia" : "dias"}">
          <span class="pmap-vbar-val">${cnt}d</span>
          <div class="pmap-vbar-track"><div class="pmap-vbar-fill" style="height:${pct}%"></div></div>
          <span class="pmap-vbar-lbl">${esc(lbl)}</span>
        </div>`;
      }).join("")}</div>`;
    }
  }

  // 4. Geocodificar cidades em ordem cronológica (priorizando coordenadas já salvas nos cartões) e desenhar Mapa + Rota Completa
  const embeddedCoordByKey = new Map();
  const regEmbeddedCoord = (rawPlace, lat, lng) => {
    if (!rawPlace) return;
    const la = Number(lat), lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || (la === 0 && lo === 0)) return;
    const k = normCityKey(rawPlace);
    if (k && !embeddedCoordByKey.has(k)) embeddedCoordByKey.set(k, { lat: la, lng: lo });
  };
  acts.forEach(a => {
    regEmbeddedCoord(a.from, a.fromLat, a.fromLng);
    regEmbeddedCoord(a.to, a.toLat, a.toLng);
    regEmbeddedCoord(a.location || a.city, a.locationLat, a.locationLng);
  });

  const EXTRA_CITY_COORDS = {
    "sao paulo": { lat: -23.5505, lng: -46.6333 },
    brasilia: { lat: -15.7975, lng: -47.8919 },
    lisboa: { lat: 38.7223, lng: -9.1393 },
    obidos: { lat: 39.3606, lng: -9.1567 },
    porto: { lat: 41.1579, lng: -8.6291 },
    salamanca: { lat: 40.9701, lng: -5.6635 },
    madrid: { lat: 40.4168, lng: -3.7038 },
    roma: { lat: 41.9028, lng: 12.4964 },
    siena: { lat: 43.3188, lng: 11.3308 },
    florenca: { lat: 43.7696, lng: 11.2558 },
    veneza: { lat: 45.4408, lng: 12.3155 },
    verona: { lat: 45.4384, lng: 10.9916 },
    milao: { lat: 45.4642, lng: 9.1900 }
  };

  const geocodeCity = async (city, keyOpt = "") => {
    const k = keyOpt || normCityKey(city);
    if (k && embeddedCoordByKey.has(k)) return embeddedCoordByKey.get(k);
    if (k && EXTRA_CITY_COORDS[k]) return EXTRA_CITY_COORDS[k];
    if (window.FeriasMaps?.lookupBuiltinLocation) {
      const b = window.FeriasMaps.lookupBuiltinLocation(city);
      if (b && isFinite(b.lat) && isFinite(b.lng)) return b;
    }
    if (window.FeriasMaps?.geocodeLocation) {
      const g = await window.FeriasMaps.geocodeLocation(city).catch(() => null);
      if (g && isFinite(g.lat) && isFinite(g.lng)) return g;
    }
    return null;
  };

  const routeCoords = [];
  const cityCoordByKey = new Map();
  for (const stop of routeSequence) {
    const coords = await geocodeCity(stop.city, stop.key);
    if (seq !== pmapRenderSeq) return;
    if (coords) {
      const stay = cityDaysMap.get(stop.key);
      const pt = {
        key: stop.key,
        city: stop.city,
        lat: coords.lat,
        lng: coords.lng,
        days: stay ? stay.days : 0,
        hex: stay ? stay.hex : "#2563eb"
      };
      routeCoords.push(pt);
      cityCoordByKey.set(stop.key, pt);
    }
  }

  // Estimar distância aérea e tempo de voo (~800 km/h + 40 min decolagem/pouso) para voos sem duração cadastrada
  routeLegs.forEach(leg => {
    if (!leg.isFlight) return;
    const p1 = cityCoordByKey.get(leg.fromKey);
    const p2 = cityCoordByKey.get(leg.toKey);
    if (!p1 || !p2) return;
    const airKm = haversineKm(p1, p2);
    if (!leg.hasExplicitKm) totalFlightKm += airKm;
    if (!leg.hasExplicitDrive) totalFlightMin += Math.round((airKm / 800) * 60 + 40);
  });
  renderSummaryStats();

  const hasGmaps = Boolean(window.FeriasMaps?.hasKey?.());
  const uniqueCityPts = routeCoords.filter((p, i, arr) => arr.findIndex(x => x.key === p.key) === i);
  if (!hasGmaps || !routeCoords.length) {
    renderPersonalMapSvgFallback(canvas, uniqueCityPts, routeLegs);
    return;
  }

  try {
    await window.FeriasMaps.ensureLoaded();
    if (seq !== pmapRenderSeq) return;
    const { Map: GMap } = await google.maps.importLibrary("maps");
    let AdvMarker = null;
    try { const mLib = await google.maps.importLibrary("marker"); AdvMarker = mLib?.AdvancedMarkerElement || null; } catch {}
    if (seq !== pmapRenderSeq) return;

    pmapMarkers.forEach(m => { try { if (m.setMap) m.setMap(null); else m.map = null; } catch {} });
    pmapPolylines.forEach(pl => { try { pl.setMap(null); } catch {} });
    pmapDirectionsRenderers.forEach(dr => { try { dr.setMap(null); } catch {} });
    pmapMarkers = [];
    pmapPolylines = [];
    pmapDirectionsRenderers = [];

    canvas.innerHTML = "";
    pmapGmapInstance = new GMap(canvas, {
      center: { lat: routeCoords[0].lat, lng: routeCoords[0].lng },
      zoom: 6,
      mapId: "MYPLAN_PERSONAL_MAP",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    const bounds = new google.maps.LatLngBounds();
    const infoWin = new google.maps.InfoWindow();
    uniqueCityPts.forEach(pt => bounds.extend({ lat: pt.lat, lng: pt.lng }));

    uniqueCityPts.forEach((pt, idx) => {
      if (AdvMarker) {
        const wrap = document.createElement("div");
        wrap.className = "pmap-pin-wrap";
        wrap.innerHTML = `<span class="pmap-pin-num" style="background:${esc(pt.hex || "#2563eb")}">${idx + 1}</span>
          <span class="pmap-pin-pill"><span>${esc(pt.city)}</span>${pt.days ? `<span class="pmap-pin-sep">•</span><span class="pmap-pin-days">${pt.days}d</span>` : ""}</span>`;
        const adv = new AdvMarker({
          map: pmapGmapInstance,
          position: { lat: pt.lat, lng: pt.lng },
          content: wrap,
          title: `${pt.city}${pt.days ? ` — ${pt.days} ${pt.days === 1 ? "dia" : "dias"}` : ""}`
        });
        adv.addListener("click", () => {
          infoWin.setContent(`<div style="color:#0f172a;padding:2px 4px"><strong>${esc(pt.city)}</strong><br><span>${pt.days ? `${pt.days} ${pt.days === 1 ? "dia" : "dias"} no cronograma` : "Cidade de passagem"}</span></div>`);
          infoWin.open(pmapGmapInstance, adv);
        });
        pmapMarkers.push(adv);
      } else {
        const marker = new google.maps.Marker({
          position: { lat: pt.lat, lng: pt.lng },
          map: pmapGmapInstance,
          label: { text: `${idx + 1}`, color: "#ffffff", fontWeight: "700", fontSize: "12px" },
          title: `${pt.city}${pt.days ? ` — ${pt.days} ${pt.days === 1 ? "dia" : "dias"}` : ""}`
        });
        marker.addListener("click", () => {
          infoWin.setContent(`<div style="color:#0f172a;padding:2px 4px"><strong>${esc(pt.city)}</strong><br><span>${pt.days ? `${pt.days} ${pt.days === 1 ? "dia" : "dias"} no cronograma` : "Cidade de passagem"}</span></div>`);
          infoWin.open(pmapGmapInstance, marker);
        });
        pmapMarkers.push(marker);
      }
    });

    // Traçar trechos: Avião = curva Bézier laranja + ícone avião rotacionado; Terrestre = rota rodoviária azul
    const drawRoadPolyline = (p1, p2) => {
      const pl = new google.maps.Polyline({
        path: [{ lat: p1.lat, lng: p1.lng }, { lat: p2.lat, lng: p2.lng }],
        geodesic: true,
        strokeColor: "#2563eb",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map: pmapGmapInstance
      });
      pmapPolylines.push(pl);
    };

    const drawFlightArc = (p1, p2) => {
      const { path, midpoint, bearingDeg } = computeBezierFlightArc(p1, p2, 36);
      path.forEach(pt => bounds.extend(pt));
      const dashSymbol = {
        path: "M 0,-1 0,1",
        strokeOpacity: 0.92,
        strokeColor: "#f97316",
        scale: 3.2
      };
      const arc = new google.maps.Polyline({
        path,
        geodesic: false,
        strokeOpacity: 0,
        icons: [{ icon: dashSymbol, offset: "0", repeat: "14px" }],
        map: pmapGmapInstance
      });
      pmapPolylines.push(arc);

      const planeIcon = {
        path: "M 0,-10 L 2.2,-2.2 L 10,1.5 L 10,3.8 L 2.2,1.8 L 2.2,7.2 L 5.2,9 L 5.2,10.8 L 0,9.4 L -5.2,10.8 L -5.2,9 L -2.2,7.2 L -2.2,1.8 L -10,3.8 L -10,1.5 L -2.2,-2.2 Z",
        fillColor: "#f97316",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 1.5,
        scale: 1.25,
        rotation: bearingDeg,
        anchor: new google.maps.Point(0, 0)
      };
      const planeMarker = new google.maps.Marker({
        position: midpoint,
        map: pmapGmapInstance,
        icon: planeIcon,
        title: `✈️ Voo: ${p1.city} ➔ ${p2.city}`,
        zIndex: 30
      });
      pmapMarkers.push(planeMarker);
    };

    if (routeLegs.length) {
      const ds = google.maps.DirectionsService ? new google.maps.DirectionsService() : null;
      const runLeg = (p1, p2) => new Promise(resolve => {
        const key = `${p1.lat.toFixed(4)},${p1.lng.toFixed(4)}=>${p2.lat.toFixed(4)},${p2.lng.toFixed(4)}`;
        const applyOk = res => {
          const dr = new google.maps.DirectionsRenderer({
            map: pmapGmapInstance,
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: { strokeColor: "#2563eb", strokeWeight: 4.2, strokeOpacity: 0.9 }
          });
          pmapDirectionsRenderers.push(dr);
          dr.setDirections(res);
        };
        const cached = pmapRouteCache.get(key);
        if (cached) {
          applyOk(cached);
          resolve(true);
          return;
        }
        try {
          ds.route({
            origin: { lat: p1.lat, lng: p1.lng },
            destination: { lat: p2.lat, lng: p2.lng },
            travelMode: google.maps.TravelMode.DRIVING
          }, (result, stDir) => {
            if (seq !== pmapRenderSeq) { resolve(false); return; }
            if (stDir === "OK" && result) {
              if (pmapRouteCache.size >= 120) {
                const oldestKey = pmapRouteCache.keys().next().value;
                if (oldestKey !== undefined) pmapRouteCache.delete(oldestKey);
              }
              pmapRouteCache.set(key, result);
              applyOk(result);
            } else {
              drawRoadPolyline(p1, p2);
            }
            resolve(false);
          });
        } catch {
          drawRoadPolyline(p1, p2);
          resolve(false);
        }
      });

      const roadLegsToFetch = [];
      routeLegs.forEach(leg => {
        const p1 = cityCoordByKey.get(leg.fromKey);
        const p2 = cityCoordByKey.get(leg.toKey);
        if (!p1 || !p2) return;
        if (leg.isFlight) {
          drawFlightArc(p1, p2);
        } else if (ds) {
          roadLegsToFetch.push([p1, p2]);
        } else {
          drawRoadPolyline(p1, p2);
        }
      });
      if (uniqueCityPts.length > 1) pmapGmapInstance.fitBounds(bounds, 48);
      else { pmapGmapInstance.setCenter({ lat: uniqueCityPts[0].lat, lng: uniqueCityPts[0].lng }); pmapGmapInstance.setZoom(10); }

      (async () => {
        for (let i = 0; i < roadLegsToFetch.length; i++) {
          if (seq !== pmapRenderSeq) return;
          const [p1, p2] = roadLegsToFetch[i];
          const fromCache = await runLeg(p1, p2);
          if (!fromCache && i < roadLegsToFetch.length - 1) {
            await new Promise(r => setTimeout(r, 120));
          }
        }
      })();
    } else if (uniqueCityPts.length >= 2) {
      for (let i = 0; i < uniqueCityPts.length - 1; i++) drawRoadPolyline(uniqueCityPts[i], uniqueCityPts[i + 1]);
      pmapGmapInstance.fitBounds(bounds, 48);
    } else {
      pmapGmapInstance.setCenter({ lat: routeCoords[0].lat, lng: routeCoords[0].lng });
      pmapGmapInstance.setZoom(10);
    }

    // Clique na lista lateral de cidades foca a cidade no mapa
    if (citiesListEl) {
      citiesListEl.querySelectorAll("[data-pmap-city]").forEach(btn => {
        btn.onclick = () => {
          const pt = cityCoordByKey.get(btn.dataset.pmapCity);
          if (pt && pmapGmapInstance) {
            pmapGmapInstance.panTo({ lat: pt.lat, lng: pt.lng });
            pmapGmapInstance.setZoom(11);
          }
        };
      });
    }
  } catch {
    renderPersonalMapSvgFallback(canvas, uniqueCityPts, routeLegs);
  }
}

