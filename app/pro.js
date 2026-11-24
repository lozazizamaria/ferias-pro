/* ===== Modo Profissional (Quadro Trello, Gantt Avançado, Fluxo de Caixa & Parâmetros) — My Plan ===== */
(function () {
  let core = null;
  let proInitialized = false;

  const proOriginMap = new WeakMap();
  const COVER_SWATCHES = ["", "#1d4ed8", "#0284c7", "#0ea5e9", "#10b981", "#6366f1", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b"];
  const ASSIGNEE_PALETTE = [
    { darkBg: "rgba(37, 99, 235, 0.22)",  darkFg: "#93c5fd", darkBd: "rgba(59, 130, 246, 0.55)",  lightBg: "#dbeafe", lightFg: "#1e40af", lightBd: "#93c5fd", hex: "#3b82f6" },
    { darkBg: "rgba(16, 185, 129, 0.22)", darkFg: "#6ee7b7", darkBd: "rgba(16, 185, 129, 0.55)", lightBg: "#d1fae5", lightFg: "#065f46", lightBd: "#6ee7b7", hex: "#10b981" },
    { darkBg: "rgba(245, 158, 11, 0.22)", darkFg: "#fcd34d", darkBd: "rgba(245, 158, 11, 0.55)", lightBg: "#fef3c7", lightFg: "#92400e", lightBd: "#fcd34d", hex: "#f59e0b" },
    { darkBg: "rgba(168, 85, 247, 0.22)", darkFg: "#d8b4fe", darkBd: "rgba(168, 85, 247, 0.55)", lightBg: "#f3e8ff", lightFg: "#6b21a8", lightBd: "#d8b4fe", hex: "#a855f7" },
    { darkBg: "rgba(236, 72, 153, 0.22)", darkFg: "#f9a8d4", darkBd: "rgba(236, 72, 153, 0.55)", lightBg: "#fce7f3", lightFg: "#9d174d", lightBd: "#f9a8d4", hex: "#ec4899" },
    { darkBg: "rgba(6, 182, 212, 0.22)",  darkFg: "#67e8f9", darkBd: "rgba(6, 182, 212, 0.55)",  lightBg: "#cffafe", lightFg: "#155e75", lightBd: "#67e8f9", hex: "#06b6d4" },
    { darkBg: "rgba(249, 115, 22, 0.22)", darkFg: "#fdba74", darkBd: "rgba(249, 115, 22, 0.55)", lightBg: "#ffedd5", lightFg: "#9a3412", lightBd: "#fdba74", hex: "#f97316" },
    { darkBg: "rgba(99, 102, 241, 0.22)", darkFg: "#a5b4fc", darkBd: "rgba(99, 102, 241, 0.55)", lightBg: "#e0e7ff", lightFg: "#3730a3", lightBd: "#a5b4fc", hex: "#6366f1" },
    { darkBg: "rgba(20, 184, 166, 0.22)", darkFg: "#5eead4", darkBd: "rgba(20, 184, 166, 0.55)", lightBg: "#ccfbf1", lightFg: "#115e59", lightBd: "#5eead4", hex: "#14b8a6" },
    { darkBg: "rgba(244, 63, 94, 0.22)",  darkFg: "#fda4af", darkBd: "rgba(244, 63, 94, 0.55)",  lightBg: "#ffe4e6", lightFg: "#9f1239", lightBd: "#fda4af", hex: "#f43f5e" }
  ];
  const BOARD_ZOOM_STEPS = [0.55, 0.65, 0.75, 0.85, 1, 1.15, 1.3];
  let proBoardZoom = 1;

  let proBoardColSet = new Set();
  let proBoardTypeSet = new Set(Object.keys(window.PRO_ACTIVITY_TYPES || {}));
  let proBoardLabelSet = new Set();
  let proBoardTagSet = new Set();
  let proBoardColMsel = null;
  let proBoardTypeMsel = null;
  let proBoardLabelMsel = null;
  let proBoardTagMsel = null;

  let proGanttTypeSet = new Set(Object.keys(window.PRO_ACTIVITY_TYPES || {}));
  let proGanttColSet = new Set();
  let proGanttLabelSet = new Set();
  let proGanttTagSet = new Set();
  let proDateFrom = "";
  let proDateTo = "";
  let proFilterSearch = "";
  let proFilterPrio = "";
  let proFilterAssignee = "";
  let proFilterTravel = "";
  let proFilterClient = "";
  let proFilterLocation = "";
  let proFilterDone = "";
  let proFilterFinDir = "";
  let proFilterFinStatus = "";
  let proGanttTypeMsel = null;
  let proGanttColMsel = null;
  let proGanttLabelMsel = null;
  let proGanttTagMsel = null;
  let proMapColMsel = null;
  let proMapTypeMsel = null;
  let proMapLabelMsel = null;
  let proMapTagMsel = null;
  let proDashColMsel = null;
  let proDashTypeMsel = null;
  let proDashLabelMsel = null;
  let proDashTagMsel = null;
  let proFinColMsel = null;
  let proFinTypeMsel = null;
  let proFinLabelMsel = null;
  let proFinTagMsel = null;
  let proGanttMode = "gantt";
  let proGanttGroup = "none";
  let proGanttZoom = window.innerWidth < 720 ? 42 : 48;
  let proGanttSlimRail = window.innerWidth < 720;
  const collapsedGanttGroups = new Set();

  let proTableColSet = new Set();
  let proTableTypeSet = new Set(Object.keys(window.PRO_ACTIVITY_TYPES || {}));
  let proTableLabelSet = new Set();
  let proTableTagSet = new Set();
  let proTableColMsel = null;
  let proTableTypeMsel = null;
  let proTableLabelMsel = null;
  let proTableTagMsel = null;

  let proFinFilter = "all";
  let proCheckFilter = "";

  // Estado do modal de cartão
  let editingProCardId = null;
  let editingProTripRef = null;
  let proModalDraftId = "";
  let proModalAttachments = [];
  let proModalSubtasks = [];
  let proModalLabels = [];
  let proModalCoverColor = "";
  let proModalTagsMsel = null;
  let proModalDraftTags = [];
  let proModalExtraAssignees = [];
  let proModalLocationLat = null;
  let proModalLocationLng = null;
  let proLocationAcCtrl = null;
  let proAiRecorder = null;
  let proAiChunks = [];
  let proAiRecTimer = null;
  let proAiRecSec = 0;

  // Estado do modal de lista/coluna
  let editingProColId = null;
  let proColModalCallback = null;

  // Estado do modal de tipo de cartão customizado & conclusão
  let editingProTypeId = null;
  let proTypeModalCallback = null;
  let proTypePickedIcon = "flag";
  let proModalCompleted = false;
  let proModalPrevColId = "";
  let proModalPrevProg = 0;
  const knownProTypeIds = new Set(Object.keys(window.PRO_ACTIVITY_TYPES || {}));

  function $(sel, el = document) { return el.querySelector(sel); }

  function sanitizeProTypeName(raw) {
    const clean = String(raw || "").trim();
    if (!clean || /\s|\//.test(clean)) return "";
    return clean.slice(0, 24);
  }

  function resolveProIconHtml(iconId) {
    if (window.renderProIconSvg) return window.renderProIconSvg(iconId);
    return "•";
  }

  function getAllProTypes(dataOpt = null) {
    const out = {};
    const builtIn = window.PRO_ACTIVITY_TYPES || {};
    Object.values(builtIn).forEach(t => {
      const iconHtml = t.iconHtml || t.icon || resolveProIconHtml(t.iconId);
      out[t.id] = {
        ...t,
        label: t.id,
        short: t.id,
        icon: iconHtml,
        iconHtml,
        isCustom: false
      };
    });

    const dataList = [];
    if (dataOpt) dataList.push(dataOpt);
    const st = core?.getState?.();
    if (st) dataList.push(st);
    (core?.getSelectedTrips?.() || []).forEach(tr => { if (tr?.data) dataList.push(tr.data); });

    dataList.forEach(d => {
      const customs = Array.isArray(d?.customCardTypes) ? d.customCardTypes : [];
      customs.forEach(ct => {
        const name = sanitizeProTypeName(ct?.id || ct?.name);
        if (!name || out[name]) return;
        const iconId = (window.PRO_ICON_MAP && window.PRO_ICON_MAP[ct.iconId]) ? ct.iconId : "flag";
        const color = /^#[0-9a-f]{3,8}$/i.test(String(ct.color || "")) ? String(ct.color) : "#2563eb";
        const defaultFin = ["income", "expense", "none"].includes(ct.defaultFin) ? ct.defaultFin : "none";
        const iconHtml = resolveProIconHtml(iconId);
        out[name] = {
          id: name,
          label: name,
          short: name,
          iconId,
          icon: iconHtml,
          iconHtml,
          color,
          cls: "pro-custom",
          defaultFin,
          isCustom: true
        };
      });
    });
    return out;
  }

  function getProTypeInfo(type, dataOpt = null) {
    const mapped = (window.PRO_LEGACY_TYPE_MAP && window.PRO_LEGACY_TYPE_MAP[type]) || type || "Outro";
    const all = getAllProTypes(dataOpt);
    if (all[mapped]) return all[mapped];
    const iconHtml = resolveProIconHtml("pin");
    return {
      id: mapped,
      label: mapped,
      short: mapped,
      iconId: "pin",
      icon: iconHtml,
      iconHtml,
      color: "#64748b",
      cls: "pro-outro",
      defaultFin: "none",
      isCustom: false
    };
  }

  function migrateProState(raw) {
    const def = core.clone(window.createBlankProData ? window.createBlankProData() : window.PRO_DEFAULT_DATA);
    const s = raw && typeof raw === "object" ? raw : {};
    const validTypes = window.PRO_ACTIVITY_TYPES || {};
    const legacyMap = window.PRO_LEGACY_TYPE_MAP || {};
    const cols = Array.isArray(s.columns) && s.columns.length
      ? s.columns.map(c => ({
          id: String(c?.id || core.uid()),
          title: String(c?.title || "Lista").trim() || "Lista",
          color: String(c?.color || "#2563eb")
        }))
      : core.clone(def.columns);
    const colIds = new Set(cols.map(c => c.id));
    const firstColId = cols[0].id;

    const labels = Array.isArray(s.labels) && s.labels.length
      ? s.labels.map(l => ({
          id: String(l?.id || core.uid()),
          name: String(l?.name || "Etiqueta").trim() || "Etiqueta",
          color: String(l?.color || "#2563eb")
        }))
      : core.clone(def.labels);

    const customCardTypes = [];
    const seenCustom = new Set();
    if (Array.isArray(s.customCardTypes)) {
      s.customCardTypes.forEach(ct => {
        const name = sanitizeProTypeName(ct?.id || ct?.name);
        if (!name || validTypes[name] || seenCustom.has(name)) return;
        seenCustom.add(name);
        customCardTypes.push({
          id: name,
          name,
          iconId: (window.PRO_ICON_MAP && window.PRO_ICON_MAP[ct.iconId]) ? ct.iconId : "flag",
          color: /^#[0-9a-f]{3,8}$/i.test(String(ct.color || "")) ? String(ct.color) : "#2563eb",
          defaultFin: ["income", "expense", "none"].includes(ct.defaultFin) ? ct.defaultFin : "none"
        });
      });
    }
    const customTypeMap = new Map(customCardTypes.map(ct => [ct.id, ct]));

    const params = Object.assign({}, def.params, s.params || {});
    params.doneColumnId = params.doneColumnId && colIds.has(String(params.doneColumnId)) ? String(params.doneColumnId) : "";
    const assignees = Array.isArray(s.assignees)
      ? [...new Set(s.assignees.map(a => String(a || "").trim()).filter(Boolean))]
      : [];
    const ganttTypeOrder = Array.isArray(s.ganttTypeOrder)
      ? [...new Set(s.ganttTypeOrder.map(t => String(t || "").trim()).filter(Boolean))]
      : [];

    const merged = {
      mode: "professional",
      title: s.title || def.title,
      customTags: Array.isArray(s.customTags)
        ? [...new Set(s.customTags.map(t => String(t || "").trim()).filter(Boolean))]
        : [],
      assignees,
      ganttTypeOrder,
      customCardTypes,
      columns: cols,
      labels,
      params,
      activities: Array.isArray(s.activities) ? core.clone(s.activities) : [],
      checklist: Array.isArray(s.checklist) ? core.clone(s.checklist) : [],
      finance: s.finance && typeof s.finance === "object"
        ? { dailyRecords: s.finance.dailyRecords && typeof s.finance.dailyRecords === "object" ? core.clone(s.finance.dailyRecords) : {} }
        : { dailyRecords: {} }
    };

    const today = core.fmtISO(new Date());
    merged.activities.forEach((a, idx) => {
      if (!a.id) a.id = core.uid();
      const mappedType = legacyMap[a.type] || a.type;
      a.type = (validTypes[mappedType] || customTypeMap.has(mappedType)) ? mappedType : "Desenvolvimento";
      if (a.columnId === "") {
        a.columnId = "";
      } else if (!a.columnId || !colIds.has(a.columnId)) {
        a.columnId = firstColId;
      }
      if (a.order == null || !isFinite(Number(a.order))) a.order = idx;
      if (a.start === "" || a.start === null) {
        a.start = "";
        a.end = "";
      } else {
        if (!a.start) a.start = today;
        if (!a.end || a.end < a.start) a.end = a.start;
      }
      if (!["Crítica", "Alta", "Média", "Baixa"].includes(a.priority)) a.priority = "Média";
      a.progress = Math.max(0, Math.min(100, Math.round(Number(a.progress) || 0)));
      if (typeof a.completed !== "boolean") {
        a.completed = Boolean((params.doneColumnId && a.columnId === params.doneColumnId) || a.progress >= 100);
      }
      a.prevColumnId = a.prevColumnId && colIds.has(a.prevColumnId) ? String(a.prevColumnId) : "";
      if (a.prevProgress != null && isFinite(Number(a.prevProgress))) {
        a.prevProgress = Math.max(0, Math.min(100, Math.round(Number(a.prevProgress))));
      }
      a.client = String(a.client || "");
      a.assignee = String(a.assignee || "");
      a.assigneeTravels = Boolean(a.assigneeTravels);
      const normEntries = [];
      const seenEntry = new Set();
      const pushEntry = (rawName, travelsFlag) => {
        const nm = String(rawName || "").trim();
        if (!nm) return;
        const k = nm.toLowerCase();
        if (seenEntry.has(k)) {
          const ex = normEntries.find(e => e.name.toLowerCase() === k);
          if (ex && travelsFlag) ex.travels = true;
          return;
        }
        seenEntry.add(k);
        normEntries.push({ name: nm, travels: Boolean(travelsFlag) });
        if (!merged.assignees.some(x => x.toLowerCase() === k)) {
          merged.assignees.push(nm);
        }
      };
      if (a.assignee) pushEntry(a.assignee, a.assigneeTravels);
      if (Array.isArray(a.assigneesList)) {
        a.assigneesList.forEach(item => {
          if (item && typeof item === "object") pushEntry(item.name, item.travels);
          else if (typeof item === "string") pushEntry(item, false);
        });
      }
      a.assigneesList = normEntries;
      a.assignee = normEntries[0]?.name || "";
      a.assigneeTravels = Boolean(normEntries[0]?.travels);
      a.location = String(a.location || "");
      a.meetingLink = String(a.meetingLink || "");
      if (!a.meetingLink && /^https?:\/\//i.test(a.location.trim())) {
        a.meetingLink = a.location.trim();
        a.location = "";
      }
      a.locationLat = (a.locationLat != null && isFinite(Number(a.locationLat))) ? Number(a.locationLat) : null;
      a.locationLng = (a.locationLng != null && isFinite(Number(a.locationLng))) ? Number(a.locationLng) : null;
      a.coverColor = String(a.coverColor || "");
      a.labels = Array.isArray(a.labels) ? [...new Set(a.labels.map(String).filter(Boolean))] : [];
      a.tags = Array.isArray(a.tags) ? [...new Set(a.tags.map(t => String(t || "").trim()).filter(Boolean))] : [];
      a.attachments = Array.isArray(a.attachments) ? a.attachments : [];
      a.subtasks = Array.isArray(a.subtasks)
        ? a.subtasks.map(st => ({ id: st?.id || core.uid(), text: String(st?.text || "").trim(), done: Boolean(st?.done) })).filter(st => st.text)
        : [];
      const tInfo = getProTypeInfo(a.type, merged);
      if (!["income", "expense", "none"].includes(a.finDirection)) {
        a.finDirection = (Number(a.amount) > 0 && tInfo.defaultFin !== "none") ? tInfo.defaultFin : (tInfo.defaultFin || "none");
      }
      a.amount = Math.max(0, Number(a.amount) || 0);
      a.actualAmount = Math.max(0, Number(a.actualAmount) || 0);
      if (!["Previsto", "Liquidado"].includes(a.finStatus)) a.finStatus = "Previsto";
      if (!a.finDueDate) a.finDueDate = a.end || a.start || "";
    });
    merged.checklist.forEach(c => { if (!c.id) c.id = core.uid(); });
    return merged;
  }

  function getProSortedActivities() {
    const trips = core.getSelectedTrips();
    const all = [];
    trips.forEach((tr, idx) => {
      const data = tr?.data || core.getState();
      const acts = Array.isArray(data?.activities) ? data.activities : [];
      const cols = Array.isArray(data?.columns) ? data.columns : [];
      const colMap = new Map(cols.map(c => [c.id, c.title]));
      acts.forEach(a => {
        a.columnTitle = colMap.get(a.columnId) || "";
        proOriginMap.set(a, {
          tripId: tr?.id || "",
          tripName: tr?.name || data?.title || "Projeto",
          role: tr?.role || "owner",
          tripRef: tr,
          colorIdx: idx,
          colTitle: a.columnTitle
        });
        all.push(a);
      });
    });
    const prioWeight = { "Crítica": 0, Alta: 1, "Média": 2, Baixa: 3 };
    return all.sort((a, b) =>
      String(a.start || "9999-99-99").localeCompare(String(b.start || "9999-99-99")) ||
      ((prioWeight[a.priority] ?? 2) - (prioWeight[b.priority] ?? 2)) ||
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }

  function getCardMeta(a) {
    return a ? (proOriginMap.get(a) || null) : null;
  }

  function getCardTripBadgeHTML(a) {
    if (!core.isMultiTripMode()) return "";
    const meta = getCardMeta(a);
    if (!meta?.tripName) return "";
    const colors = core.MULTI_TRIP_COLORS || ["#2563eb", "#10b981", "#f59e0b"];
    const col = colors[(meta.colorIdx || 0) % colors.length];
    return `<span class="trip-tag-pill" style="--tc:${col}" title="Projeto: ${core.esc(meta.tripName)}">${core.esc(meta.tripName)}</span>`;
  }

  function findProCardContext(id) {
    const trips = core.getSelectedTrips();
    for (const tr of trips) {
      const acts = tr?.data?.activities || [];
      const act = acts.find(x => x.id === id);
      if (act) return { trip: tr, data: tr.data, activity: act };
    }
    const viaCore = core.findActivityContext ? core.findActivityContext(id) : null;
    if (viaCore) return viaCore;
    const st = core.getState();
    const fallback = (st.activities || []).find(x => x.id === id);
    return fallback ? { trip: core.getActiveTrip(), data: st, activity: fallback } : null;
  }

  function getMergedColumns() {
    const st = core.getState();
    return Array.isArray(st.columns) && st.columns.length ? st.columns : window.PRO_DEFAULT_COLUMNS;
  }

  function getMergedLabels() {
    const st = core.getState();
    return Array.isArray(st.labels) && st.labels.length ? st.labels : window.PRO_DEFAULT_LABELS;
  }

  function getCardAssigneesList(a) {
    if (!a) return [];
    const out = [];
    const seen = new Set();
    const push = (nm, tr) => {
      const clean = String(nm || "").trim();
      if (!clean) return;
      const k = clean.toLowerCase();
      if (seen.has(k)) {
        const ex = out.find(e => e.name.toLowerCase() === k);
        if (ex && tr) ex.travels = true;
        return;
      }
      seen.add(k);
      out.push({ name: clean, travels: Boolean(tr) });
    };
    if (Array.isArray(a.assigneesList) && a.assigneesList.length) {
      a.assigneesList.forEach(it => {
        if (it && typeof it === "object") push(it.name, it.travels);
        else if (typeof it === "string") push(it, false);
      });
    }
    if (a.assignee) push(a.assignee, a.assigneeTravels);
    return out;
  }

  function colorForAssignee(name) {
    const clean = String(name || "").trim().toLowerCase();
    const list = getAllProAssignees();
    const idx = list.findIndex(x => x.toLowerCase() === clean);
    let paletteIdx = idx;
    if (paletteIdx < 0) {
      let h = 0;
      for (let i = 0; i < clean.length; i++) h = ((h * 31) + clean.charCodeAt(i)) >>> 0;
      paletteIdx = h;
    }
    const p = ASSIGNEE_PALETTE[Math.abs(paletteIdx) % ASSIGNEE_PALETTE.length];
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    return {
      bg: isLight ? p.lightBg : p.darkBg,
      fg: isLight ? p.lightFg : p.darkFg,
      bd: isLight ? p.lightBd : p.darkBd,
      hex: p.hex
    };
  }

  function renderAssigneeBadgesHTML(a) {
    const list = getCardAssigneesList(a);
    if (!list.length) return "";
    return list.map(entry => {
      const col = colorForAssignee(entry.name);
      const travelIcon = entry.travels ? `<span class="asg-travel-tag" title="${core.esc(entry.name)} viaja nesta tarefa">✈️</span>` : "";
      return `<span class="pro-assignee-badge" style="--asg-bg:${col.bg};--asg-fg:${col.fg};--asg-bd:${col.bd}" title="Responsável: ${core.esc(entry.name)}${entry.travels ? " (Viaja)" : ""}">👤 ${core.esc(entry.name)}${travelIcon}</span>`;
    }).join("");
  }

  function getAllProAssignees(extraCards = []) {
    const seen = new Set();
    const out = [];
    const add = raw => {
      const clean = String(raw || "").trim();
      if (!clean) return;
      const k = clean.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(clean);
      }
    };
    const addFromCard = a => {
      if (!a) return;
      add(a.assignee);
      if (Array.isArray(a.assigneesList)) {
        a.assigneesList.forEach(it => add(typeof it === "object" ? it?.name : it));
      }
    };
    const st = core?.getState?.();
    if (Array.isArray(st?.assignees)) st.assignees.forEach(add);
    (st?.activities || []).forEach(addFromCard);
    (core?.getSelectedTrips?.() || []).forEach(tr => {
      if (Array.isArray(tr?.data?.assignees)) tr.data.assignees.forEach(add);
      (tr?.data?.activities || []).forEach(addFromCard);
    });
    (extraCards || []).forEach(addFromCard);
    return out;
  }

  function registerProAssignee(rawName, shouldSave = true) {
    const clean = String(rawName || "").trim().slice(0, 48);
    if (!clean) return "";
    const existing = getAllProAssignees().find(a => a.toLowerCase() === clean.toLowerCase());
    const canonical = existing || clean;
    const st = core.getState();
    if (!Array.isArray(st.assignees)) st.assignees = [];
    if (!st.assignees.some(a => a.toLowerCase() === canonical.toLowerCase())) {
      st.assignees.push(canonical);
    }
    const tgtData = editingProTripRef?.data;
    if (tgtData && tgtData !== st) {
      if (!Array.isArray(tgtData.assignees)) tgtData.assignees = [];
      if (!tgtData.assignees.some(a => a.toLowerCase() === canonical.toLowerCase())) {
        tgtData.assignees.push(canonical);
      }
    }
    populateProAssigneeSelect(canonical);
    if (shouldSave) core.save(`👤 Responsável "${canonical}" adicionado!`);
    return canonical;
  }

  function removeProAssignee(name) {
    const active = core.getActiveTrip();
    if (active?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
    const st = core.getState();
    const targetKey = String(name || "").toLowerCase();
    st.assignees = (st.assignees || []).filter(a => a.toLowerCase() !== targetKey);
    (st.activities || []).forEach(a => {
      if (String(a.assignee || "").toLowerCase() === targetKey) a.assignee = "";
      if (Array.isArray(a.assigneesList)) {
        a.assigneesList = a.assigneesList.filter(e => String(e?.name || "").toLowerCase() !== targetKey);
        a.assignee = a.assigneesList[0]?.name || "";
        a.assigneeTravels = Boolean(a.assigneesList[0]?.travels);
      }
    });
    core.save(`🗑️ Responsável "${name}" removido`);
  }

  function populateProAssigneeSelect(selectedVal = null) {
    const list = getAllProAssignees();
    const sel = $("#pc-assignee");
    if (sel) {
      const cur = selectedVal !== null ? selectedVal : sel.value;
      const items = [...list];
      if (cur && !items.some(x => x.toLowerCase() === cur.toLowerCase())) items.push(cur);
      sel.innerHTML = `<option value="">— Sem responsável —</option>`
        + items.map(a => `<option value="${core.esc(a)}">${core.esc(a)}</option>`).join("");
      sel.value = cur || "";
    }
    [
      "#proBoardAssigneeFilter",
      "#proGanttAssigneeFilter",
      "#proMapAssigneeFilter",
      "#proDashAssigneeFilter",
      "#proFinAssigneeFilter",
      "#proFilterAssignee"
    ].forEach(fSel => {
      const el = $(fSel);
      if (!el) return;
      const prev = el.value;
      el.innerHTML = `<option value="">Todos</option>`
        + `<option value="__none__">— Sem responsável —</option>`
        + list.map(a => `<option value="${core.esc(a)}">${core.esc(a)}</option>`).join("");
      if ([...el.options].some(o => o.value === prev)) el.value = prev;
    });
    const quickMapSel = $("#proMapQuickAssignee");
    if (quickMapSel) {
      const prev = quickMapSel.value;
      quickMapSel.innerHTML = `<option value="">👤 Todas as pessoas</option>`
        + list.map(a => `<option value="${core.esc(a)}">👤 ${core.esc(a)}</option>`).join("");
      if ([...quickMapSel.options].some(o => o.value === prev)) quickMapSel.value = prev;
    }
  }

  function isCardDone(a, cols, paramsOpt = null) {
    if (a.completed === true) return true;
    const p = paramsOpt || core.getState()?.params;
    const doneColId = String(p?.doneColumnId || "");
    if (doneColId && a.columnId === doneColId) return true;
    if (a.completed === false) return false;
    const col = (cols || []).find(c => c.id === a.columnId);
    const title = String(col?.title || "").toLowerCase();
    return a.columnId === "done" || /conclu|finaliz|entregue|feito/.test(title) || Number(a.progress) >= 100;
  }

  function toggleProCardDone(cardId) {
    const ctx = findProCardContext(cardId);
    if (!ctx) return;
    if (ctx.trip?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
    const a = ctx.activity;
    const cols = ctx.data?.columns || getMergedColumns();
    const params = ctx.data?.params || core.getState()?.params || {};
    const doneColId = String(params.doneColumnId || "");
    const validDoneCol = doneColId ? cols.find(c => c.id === doneColId) : null;
    const currentlyDone = isCardDone(a, cols, params);

    if (!currentlyDone) {
      if (!validDoneCol || a.columnId !== validDoneCol.id) a.prevColumnId = a.columnId;
      a.prevProgress = Number(a.progress) < 100 ? (Number(a.progress) || 0) : 0;
      a.completed = true;
      a.progress = 100;
      if (validDoneCol) {
        a.columnId = validDoneCol.id;
        a.order = (ctx.data.activities || []).filter(x => x.columnId === validDoneCol.id && x.id !== a.id).length;
        core.saveTripRecord(ctx.trip, `✅ "${a.name}" concluída e movida para "${validDoneCol.title}"!`);
      } else {
        core.saveTripRecord(ctx.trip, `✅ "${a.name}" marcada como concluída (100%)!`);
      }
      return;
    }

    a.completed = false;
    a.progress = (a.prevProgress != null && a.prevProgress < 100) ? a.prevProgress : 0;
    if ((validDoneCol && a.columnId === validDoneCol.id) || a.columnId === "done") {
      if (a.prevColumnId && cols.some(c => c.id === a.prevColumnId && c.id !== a.columnId)) {
        a.columnId = a.prevColumnId;
      } else if (validDoneCol && a.columnId === validDoneCol.id) {
        const fallback = cols.find(c => c.id !== validDoneCol.id);
        if (fallback) a.columnId = fallback.id;
      }
    }
    core.saveTripRecord(ctx.trip, `↩️ "${a.name}" reaberta (${a.progress}%).`);
  }

  function computeProTotals(cardsOpt) {
    const st = core.getState();
    const cols = getMergedColumns();
    const cards = cardsOpt || getProSortedActivities();
    const today = core.fmtISO(new Date());
    const plus7 = core.fmtISO(new Date(Date.now() + 7 * core.DAY));

    let doneCards = 0, overdueCount = 0, dueSoonCount = 0, sumProg = 0;
    let totalIncome = 0, receivedIncome = 0, totalExpense = 0, paidExpense = 0;
    const byColumn = {};
    const byType = {};
    const byClient = {};

    cols.forEach(c => { byColumn[c.id] = { id: c.id, title: c.title, color: c.color, count: 0, amount: 0 }; });

    cards.forEach(a => {
      const done = isCardDone(a, cols);
      if (done) doneCards++;
      sumProg += Number(a.progress) || 0;
      const due = a.end || a.start;
      if (!done && due && due < today) overdueCount++;
      else if (!done && due && due >= today && due <= plus7) dueSoonCount++;

      const planned = Number(a.amount) || 0;
      const real = Number(a.actualAmount) > 0 ? Number(a.actualAmount) : planned;
      const val = a.finStatus === "Liquidado" ? real : planned;

      if (a.finDirection === "income" && val > 0) {
        totalIncome += val;
        if (a.finStatus === "Liquidado") receivedIncome += val;
      } else if (a.finDirection === "expense" && val > 0) {
        totalExpense += val;
        if (a.finStatus === "Liquidado") paidExpense += val;
      }

      if (byColumn[a.columnId]) {
        byColumn[a.columnId].count++;
        byColumn[a.columnId].amount += val;
      }
      if (!byType[a.type]) byType[a.type] = { type: a.type, count: 0, income: 0, expense: 0 };
      byType[a.type].count++;
      if (a.finDirection === "income") byType[a.type].income += val;
      if (a.finDirection === "expense") byType[a.type].expense += val;

      const cl = String(a.client || "Geral").trim() || "Geral";
      if (!byClient[cl]) byClient[cl] = { client: cl, count: 0, income: 0, expense: 0 };
      byClient[cl].count++;
      if (a.finDirection === "income") byClient[cl].income += val;
      if (a.finDirection === "expense") byClient[cl].expense += val;
    });

    const taxPct = Math.max(0, Number(st.params?.taxRatePct) || 0);
    const taxAmount = Math.round((totalIncome * (taxPct / 100)) * 100) / 100;
    return {
      totalCards: cards.length,
      doneCards,
      overdueCount,
      dueSoonCount,
      avgProgress: cards.length ? (sumProg / cards.length) : 0,
      totalIncome,
      receivedIncome,
      pendingIncome: Math.max(0, totalIncome - receivedIncome),
      totalExpense,
      paidExpense,
      pendingExpense: Math.max(0, totalExpense - paidExpense),
      netPlanned: totalIncome - totalExpense,
      netRealized: receivedIncome - paidExpense,
      taxAmount,
      byColumn,
      byType,
      byClient
    };
  }

  function refreshProFilterOptions(allCards) {
    const cols = getMergedColumns();
    const labels = getMergedLabels();
    const allProTypes = getAllProTypes();
    Object.keys(allProTypes).forEach(tid => {
      if (!knownProTypeIds.has(tid)) {
        knownProTypeIds.add(tid);
        proBoardTypeSet.add(tid);
        proGanttTypeSet.add(tid);
        proTableTypeSet.add(tid);
      }
    });
    const typeItems = Object.values(allProTypes).map(t => ({
      id: t.id,
      label: t.short,
      iconHtml: t.iconHtml || t.icon,
      color: t.color
    }));
    const colItems = [...cols.map(c => ({ id: c.id, label: c.title })), { id: "__none__", label: "Sem lista (Gantt/Timeline)" }];
    const labelItems = labels.map(l => ({ id: l.id, label: l.name }));
    const tagItems = core.getAllAvailableTags(allCards).map(tg => ({ id: tg, label: tg }));
    populateProAssigneeSelect();

    if (!proBoardColMsel && $("#proBoardColFilter")) {
      proBoardColMsel = core.createMultiSelect($("#proBoardColFilter"), {
        minSelected: 0,
        allLabel: "☑️ Todas",
        noneLabel: "✕ Limpar",
        getLabel: sel => sel.length ? `Listas (${sel.length})` : "Lista: Todas",
        isHighlighted: sel => sel.length > 0,
        onChange: ids => { proBoardColSet = new Set(ids); renderProBoard(); }
      });
    }
    if (!proBoardTypeMsel && $("#proBoardTypeFilter")) {
      proBoardTypeMsel = core.createMultiSelect($("#proBoardTypeFilter"), {
        minSelected: 0,
        allLabel: "☑️ Todos",
        noneLabel: "✕ Nenhum",
        getLabel: (sel, all) => sel.length === 0 ? "Tipo: Nenhum" : (sel.length === all.length ? "Tipo: Todos" : `Tipos (${sel.length})`),
        onChange: ids => { proBoardTypeSet = new Set(ids); renderProBoard(); }
      });
    }
    if (!proBoardLabelMsel && $("#proBoardLabelFilter")) {
      proBoardLabelMsel = core.createMultiSelect($("#proBoardLabelFilter"), {
        minSelected: 0,
        allLabel: "☑️ Todas",
        noneLabel: "✕ Limpar",
        getLabel: sel => sel.length ? `Etiquetas (${sel.length})` : "Etiqueta: Todas",
        isHighlighted: sel => sel.length > 0,
        onChange: ids => { proBoardLabelSet = new Set(ids); renderProBoard(); }
      });
    }
    if (!proBoardTagMsel && $("#proBoardTagFilter")) {
      proBoardTagMsel = core.createMultiSelect($("#proBoardTagFilter"), {
        minSelected: 0,
        allLabel: "☑️ Todas",
        noneLabel: "✕ Limpar",
        getLabel: sel => sel.length ? `Tags (${sel.length})` : "Tag: Todas",
        isHighlighted: sel => sel.length > 0,
        onChange: ids => { proBoardTagSet = new Set(ids); renderProBoard(); }
      });
    }
    if (proBoardColMsel) proBoardColMsel.setOptions(cols.map(c => ({ id: c.id, label: c.title })), [...proBoardColSet]);
    if (proBoardTypeMsel) proBoardTypeMsel.setOptions(typeItems, [...proBoardTypeSet]);
    if (proBoardLabelMsel) proBoardLabelMsel.setOptions(labelItems, [...proBoardLabelSet]);
    if (proBoardTagMsel) proBoardTagMsel.setOptions(tagItems, [...proBoardTagSet]);

    // Gantt, Dashboard e Financeiro — Filtros Unificados Completos
    const onColChange = ids => { proGanttColSet = new Set(ids); applyAndRenderProFilteredViews(); };
    const onTypeChange = ids => { proGanttTypeSet = new Set(ids); applyAndRenderProFilteredViews(); };
    const onLabelChange = ids => { proGanttLabelSet = new Set(ids); applyAndRenderProFilteredViews(); };
    const onTagChange = ids => { proGanttTagSet = new Set(ids); applyAndRenderProFilteredViews(); };
    const colOptCfg = {
      minSelected: 0,
      allLabel: "☑️ Todas",
      noneLabel: "✕ Limpar",
      getLabel: sel => sel.length ? `Listas (${sel.length})` : "Lista: Todas",
      isHighlighted: sel => sel.length > 0,
      onChange: onColChange
    };
    const typeOptCfg = {
      minSelected: 0,
      allLabel: "☑️ Todos",
      noneLabel: "✕ Nenhum",
      getLabel: (sel, all) => sel.length === 0 ? "Tipo: Nenhum" : (sel.length === all.length ? "Tipo: Todos" : `Tipos (${sel.length})`),
      onChange: onTypeChange
    };
    const labelOptCfg = {
      minSelected: 0,
      allLabel: "☑️ Todas",
      noneLabel: "✕ Limpar",
      getLabel: sel => sel.length ? `Etiquetas (${sel.length})` : "Etiqueta: Todas",
      isHighlighted: sel => sel.length > 0,
      onChange: onLabelChange
    };
    const tagOptCfg = {
      minSelected: 0,
      allLabel: "☑️ Todas",
      noneLabel: "✕ Limpar",
      getLabel: sel => sel.length ? `Tags (${sel.length})` : "Tag: Todas",
      isHighlighted: sel => sel.length > 0,
      onChange: onTagChange
    };
    if (!proGanttColMsel && $("#proGanttColFilter")) proGanttColMsel = core.createMultiSelect($("#proGanttColFilter"), colOptCfg);
    if (!proMapColMsel && $("#proMapColFilter")) proMapColMsel = core.createMultiSelect($("#proMapColFilter"), colOptCfg);
    if (!proDashColMsel && $("#proDashColFilter")) proDashColMsel = core.createMultiSelect($("#proDashColFilter"), colOptCfg);
    if (!proFinColMsel && $("#proFinColFilter")) proFinColMsel = core.createMultiSelect($("#proFinColFilter"), colOptCfg);
    if (!proGanttTypeMsel && $("#proGanttTypeFilter")) proGanttTypeMsel = core.createMultiSelect($("#proGanttTypeFilter"), typeOptCfg);
    if (!proMapTypeMsel && $("#proMapTypeFilter")) proMapTypeMsel = core.createMultiSelect($("#proMapTypeFilter"), typeOptCfg);
    if (!proDashTypeMsel && $("#proDashTypeFilter")) proDashTypeMsel = core.createMultiSelect($("#proDashTypeFilter"), typeOptCfg);
    if (!proFinTypeMsel && $("#proFinTypeFilter")) proFinTypeMsel = core.createMultiSelect($("#proFinTypeFilter"), typeOptCfg);
    if (!proGanttLabelMsel && $("#proGanttLabelFilter")) proGanttLabelMsel = core.createMultiSelect($("#proGanttLabelFilter"), labelOptCfg);
    if (!proMapLabelMsel && $("#proMapLabelFilter")) proMapLabelMsel = core.createMultiSelect($("#proMapLabelFilter"), labelOptCfg);
    if (!proDashLabelMsel && $("#proDashLabelFilter")) proDashLabelMsel = core.createMultiSelect($("#proDashLabelFilter"), labelOptCfg);
    if (!proFinLabelMsel && $("#proFinLabelFilter")) proFinLabelMsel = core.createMultiSelect($("#proFinLabelFilter"), labelOptCfg);
    if (!proGanttTagMsel && $("#proGanttTagFilter")) proGanttTagMsel = core.createMultiSelect($("#proGanttTagFilter"), tagOptCfg);
    if (!proMapTagMsel && $("#proMapTagFilter")) proMapTagMsel = core.createMultiSelect($("#proMapTagFilter"), tagOptCfg);
    if (!proDashTagMsel && $("#proDashTagFilter")) proDashTagMsel = core.createMultiSelect($("#proDashTagFilter"), tagOptCfg);
    if (!proFinTagMsel && $("#proFinTagFilter")) proFinTagMsel = core.createMultiSelect($("#proFinTagFilter"), tagOptCfg);

    [proGanttColMsel, proMapColMsel, proDashColMsel, proFinColMsel].forEach(m => { if (m) m.setOptions(colItems, [...proGanttColSet]); });
    [proGanttTypeMsel, proMapTypeMsel, proDashTypeMsel, proFinTypeMsel].forEach(m => { if (m) m.setOptions(typeItems, [...proGanttTypeSet]); });
    [proGanttLabelMsel, proMapLabelMsel, proDashLabelMsel, proFinLabelMsel].forEach(m => { if (m) m.setOptions(labelItems, [...proGanttLabelSet]); });
    [proGanttTagMsel, proMapTagMsel, proDashTagMsel, proFinTagMsel].forEach(m => { if (m) m.setOptions(tagItems, [...proGanttTagSet]); });
    syncProFilterUIs();

    // Tabela filtros
    if (!proTableColMsel && $("#proFilterCol")) {
      proTableColMsel = core.createMultiSelect($("#proFilterCol"), {
        minSelected: 0,
        allLabel: "☑️ Todas",
        noneLabel: "✕ Limpar",
        getLabel: sel => sel.length ? `Listas (${sel.length})` : "Lista: Todas",
        isHighlighted: sel => sel.length > 0,
        onChange: ids => { proTableColSet = new Set(ids); renderProTable(); }
      });
    }
    if (!proTableTypeMsel && $("#proFilterType")) {
      proTableTypeMsel = core.createMultiSelect($("#proFilterType"), {
        minSelected: 0,
        allLabel: "☑️ Todos",
        noneLabel: "✕ Nenhum",
        getLabel: (sel, all) => sel.length === 0 ? "Tipo: Nenhum" : (sel.length === all.length ? "Tipo: Todos" : `Tipos (${sel.length})`),
        onChange: ids => { proTableTypeSet = new Set(ids); renderProTable(); }
      });
    }
    if (!proTableLabelMsel && $("#proFilterLabel")) {
      proTableLabelMsel = core.createMultiSelect($("#proFilterLabel"), {
        minSelected: 0,
        allLabel: "☑️ Todas",
        noneLabel: "✕ Limpar",
        getLabel: sel => sel.length ? `Etiquetas (${sel.length})` : "Etiqueta: Todas",
        isHighlighted: sel => sel.length > 0,
        onChange: ids => { proTableLabelSet = new Set(ids); renderProTable(); }
      });
    }
    if (!proTableTagMsel && $("#proFilterTag")) {
      proTableTagMsel = core.createMultiSelect($("#proFilterTag"), {
        minSelected: 0,
        allLabel: "☑️ Todas",
        noneLabel: "✕ Limpar",
        getLabel: sel => sel.length ? `Tags (${sel.length})` : "Tag: Todas",
        isHighlighted: sel => sel.length > 0,
        onChange: ids => { proTableTagSet = new Set(ids); renderProTable(); }
      });
    }
    if (proTableColMsel) proTableColMsel.setOptions(colItems, [...proTableColSet]);
    if (proTableTypeMsel) proTableTypeMsel.setOptions(typeItems, [...proTableTypeSet]);
    if (proTableLabelMsel) proTableLabelMsel.setOptions(labelItems, [...proTableLabelSet]);
    if (proTableTagMsel) proTableTagMsel.setOptions(tagItems, [...proTableTagSet]);
  }

  function formatProFinShort(a) {
    const val = Number(a.actualAmount) > 0 ? Number(a.actualAmount) : (Number(a.amount) || 0);
    if (val <= 0) return "";
    if (a.finDirection === "income") return `+${core.money(val)}`;
    if (a.finDirection === "expense") return `-${core.money(val)}`;
    return "";
  }

  function matchProCardFilters(a, cfg, colsOpt = null) {
    const cols = colsOpt || getMergedColumns();
    if (cfg.colSet && cfg.colSet.size > 0) {
      const colKey = a.columnId || "__none__";
      if (!cfg.colSet.has(colKey)) return false;
    }
    if (cfg.typeSet && !cfg.typeSet.has(a.type)) return false;
    if (cfg.labelSet && cfg.labelSet.size > 0 && !(Array.isArray(a.labels) && a.labels.some(id => cfg.labelSet.has(id)))) return false;
    if (cfg.tagSet && cfg.tagSet.size > 0 && !(Array.isArray(a.tags) && a.tags.some(t => cfg.tagSet.has(t)))) return false;
    if (cfg.prio && a.priority !== cfg.prio) return false;
    const asgList = getCardAssigneesList(a);
    if (cfg.assignee) {
      if (cfg.assignee === "__none__") {
        if (asgList.length > 0) return false;
      } else {
        const targetAsg = cfg.assignee.toLowerCase();
        if (!asgList.some(e => e.name.toLowerCase() === targetAsg)) return false;
      }
    }
    if (cfg.travel) {
      if (cfg.travel === "travels") {
        if (cfg.assignee && cfg.assignee !== "__none__") {
          const targetAsg = cfg.assignee.toLowerCase();
          if (!asgList.some(e => e.name.toLowerCase() === targetAsg && e.travels)) return false;
        } else if (!asgList.some(e => e.travels)) {
          return false;
        }
      } else if (cfg.travel === "local") {
        if (asgList.some(e => e.travels)) return false;
      }
    }
    if (cfg.client && !String(a.client || "").toLowerCase().includes(cfg.client)) return false;
    if (cfg.location && !String(a.location || "").toLowerCase().includes(cfg.location)) return false;
    if (cfg.done) {
      const isDone = isCardDone(a, cols);
      if (cfg.done === "done" && !isDone) return false;
      if (cfg.done === "pending" && isDone) return false;
      if (cfg.done === "nodate" && a.start) return false;
    }
    if (cfg.finDir) {
      const dir = a.finDirection || "none";
      if (dir !== cfg.finDir) return false;
    }
    if (cfg.finStatus) {
      if ((a.finDirection || "none") === "none") return false;
      if ((a.finStatus || "Previsto") !== cfg.finStatus) return false;
    }
    if (cfg.dateFrom) {
      if (!a.start || (a.end || a.start) < cfg.dateFrom) return false;
    }
    if (cfg.dateTo) {
      if (!a.start || a.start > cfg.dateTo) return false;
    }
    if (cfg.q) {
      const subTxt = Array.isArray(a.subtasks) ? a.subtasks.map(s => s.text).join(" ") : "";
      const asgTxt = asgList.map(e => e.name).join(" ");
      const hay = `${a.name} ${a.type} ${a.client || ""} ${asgTxt} ${a.location || ""} ${a.meetingLink || ""} ${a.notes || ""} ${(a.tags || []).join(" ")} ${subTxt}`.toLowerCase();
      if (!hay.includes(cfg.q)) return false;
    }
    return true;
  }

  /* ---------- 1. QUADRO KANBAN ---------- */
  function updateProBoardZoomReadout() {
    const btn = $("#btnProBoardZoomReset");
    if (btn) btn.textContent = `${Math.round(proBoardZoom * 100)}%`;
    const board = $("#proBoard");
    if (board) {
      board.style.setProperty("--board-zoom", String(proBoardZoom));
      board.setAttribute("data-zoom-compact", proBoardZoom < 0.85 ? "1" : "0");
    }
  }

  function stepProBoardZoom(delta) {
    let idx = BOARD_ZOOM_STEPS.findIndex(v => v >= proBoardZoom);
    if (idx < 0) idx = BOARD_ZOOM_STEPS.length - 1;
    const nextIdx = Math.max(0, Math.min(BOARD_ZOOM_STEPS.length - 1, idx + delta));
    proBoardZoom = BOARD_ZOOM_STEPS[nextIdx];
    updateProBoardZoomReadout();
  }

  function getProBoardFilterCfg() {
    return {
      colSet: proBoardColSet,
      typeSet: proBoardTypeSet,
      labelSet: proBoardLabelSet,
      tagSet: proBoardTagSet,
      q: ($("#proBoardSearch")?.value || "").trim().toLowerCase(),
      prio: $("#proBoardPrioFilter")?.value || "",
      assignee: $("#proBoardAssigneeFilter")?.value || "",
      travel: $("#proBoardTravelFilter")?.value || "",
      client: ($("#proBoardClientFilter")?.value || "").trim().toLowerCase(),
      location: ($("#proBoardLocationFilter")?.value || "").trim().toLowerCase(),
      done: $("#proBoardDoneFilter")?.value || "",
      finDir: $("#proBoardFinDirFilter")?.value || "",
      finStatus: $("#proBoardFinStatusFilter")?.value || "",
      dateFrom: $("#proBoardDateFrom")?.value || "",
      dateTo: $("#proBoardDateTo")?.value || ""
    };
  }

  function syncProBoardFilterUI() {
    const totalTypes = Object.keys(getAllProTypes()).length;
    const cfg = getProBoardFilterCfg();
    const activeCount = (cfg.q ? 1 : 0)
      + (proBoardColSet.size > 0 ? 1 : 0)
      + (proBoardTypeSet.size < totalTypes ? 1 : 0)
      + (proBoardLabelSet.size > 0 ? 1 : 0)
      + (proBoardTagSet.size > 0 ? 1 : 0)
      + (cfg.prio ? 1 : 0)
      + (cfg.assignee ? 1 : 0)
      + (cfg.travel ? 1 : 0)
      + (cfg.client ? 1 : 0)
      + (cfg.location ? 1 : 0)
      + (cfg.done ? 1 : 0)
      + (cfg.finDir ? 1 : 0)
      + (cfg.finStatus ? 1 : 0)
      + ((cfg.dateFrom || cfg.dateTo) ? 1 : 0);
    const fBtn = $("#btnProBoardFilterPop");
    const fCnt = $("#proBoardFilterCount");
    const clearBtn = $("#btnProBoardClearFilters");
    if (fBtn) fBtn.classList.toggle("has-active", activeCount > 0);
    if (fCnt) {
      fCnt.textContent = activeCount ? String(activeCount) : "";
      fCnt.hidden = !activeCount;
    }
    if (clearBtn) clearBtn.hidden = activeCount === 0;
  }

  function resetProBoardFilters() {
    proBoardColSet.clear();
    proBoardTypeSet = new Set(Object.keys(getAllProTypes()));
    proBoardLabelSet.clear();
    proBoardTagSet.clear();
    [
      "#proBoardSearch", "#proBoardPrioFilter", "#proBoardAssigneeFilter", "#proBoardTravelFilter",
      "#proBoardClientFilter", "#proBoardLocationFilter", "#proBoardDoneFilter",
      "#proBoardFinDirFilter", "#proBoardFinStatusFilter", "#proBoardDateFrom", "#proBoardDateTo"
    ].forEach(sel => { if ($(sel)) $(sel).value = ""; });
    if (proBoardColMsel) proBoardColMsel.setSelected([]);
    if (proBoardTypeMsel) proBoardTypeMsel.setSelected([...proBoardTypeSet]);
    if (proBoardLabelMsel) proBoardLabelMsel.setSelected([]);
    if (proBoardTagMsel) proBoardTagMsel.setSelected([]);
    renderProBoard();
  }

  function renderProBoard() {
    const board = $("#proBoard");
    if (!board) return;
    updateProBoardZoomReadout();
    syncProBoardFilterUI();
    const st = core.getState();
    const trips = core.getSelectedTrips();
    const multi = trips.length > 1;
    const active = core.getActiveTrip();

    const roleBadge = $("#proBoardRoleBadge");
    if (roleBadge) {
      if (!multi && active && active.role !== "owner") {
        roleBadge.textContent = `Compartilhado (${active.ownerName || "usuário"})`;
        roleBadge.hidden = false;
      } else {
        roleBadge.hidden = true;
      }
    }

    const cfg = getProBoardFilterCfg();
    const cols = getMergedColumns();
    const labels = getMergedLabels();
    const labelMap = new Map(labels.map(l => [l.id, l]));
    const today = core.fmtISO(new Date());
    const soon = core.fmtISO(new Date(Date.now() + 3 * core.DAY));

    const allCards = getProSortedActivities().filter(a => matchProCardFilters(a, cfg, cols));
    const visibleCols = proBoardColSet.size > 0 ? cols.filter(c => proBoardColSet.has(c.id)) : cols;

    board.innerHTML = visibleCols.map(col => {
      const colCards = allCards
        .filter(c => Boolean(c.columnId) && (c.columnId === col.id || (!cols.some(x => x.id === c.columnId) && col === cols[0])))
        .slice()
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.start || "9999-99-99").localeCompare(String(b.start || "9999-99-99")));

      const cardsHtml = colCards.map(c => {
        const info = getProTypeInfo(c.type);
        const done = isCardDone(c, cols);
        const due = c.end || c.start;
        let dueCls = "";
        if (done) dueCls = "due-ok";
        else if (!c.start) dueCls = "";
        else if (due < today) dueCls = "due-late";
        else if (due <= soon) dueCls = "due-soon";

        const lblsHtml = (c.labels || []).map(id => labelMap.get(id)).filter(Boolean)
          .map(l => `<span class="pro-lbl-pill" style="background:${core.esc(l.color)}">${core.esc(l.name)}</span>`).join("");

        const subs = Array.isArray(c.subtasks) ? c.subtasks : [];
        const subsDone = subs.filter(s => s.done).length;
        const finTxt = formatProFinShort(c);
        const prioCls = c.priority === "Crítica" ? "p-crit" : (c.priority === "Alta" ? "p-alta" : "");
        const attCount = Array.isArray(c.attachments) ? c.attachments.length : 0;
        const moveOpts = cols.map(mc => `<option value="${core.esc(mc.id)}" ${mc.id === c.columnId ? "selected" : ""}>${core.esc(mc.title)}</option>`).join("");
        const typeColStyle = info.isCustom && info.color ? ` style="--t-color:${core.esc(info.color)}"` : "";

        return `<article class="pro-card${done ? " is-done" : ""}" draggable="true" data-card-id="${core.esc(c.id)}"${typeColStyle}>
          ${c.coverColor ? `<div class="pro-card-cover" style="--cover-c:${core.esc(c.coverColor)}"></div>` : ""}
          ${lblsHtml ? `<div class="pro-card-labels">${lblsHtml}</div>` : ""}
          <div class="pro-card-top">
            <div class="pro-card-title" style="display:flex;align-items:flex-start;gap:6px">
              <button type="button" class="pro-done-btn${done ? " is-done" : ""}" data-pro-toggle-done="${core.esc(c.id)}" title="${done ? "Reabrir tarefa" : "Marcar como concluída"}" aria-label="${done ? "Reabrir tarefa" : "Marcar como concluída"}">✓</button>
              <span>${info.icon} ${core.esc(c.name)}</span>
            </div>
            <span class="chip ${info.cls}"${typeColStyle}>${core.esc(info.short)}</span>
          </div>
          ${(c.client || getCardAssigneesList(c).length || c.startTime || c.location) ? `<div class="pro-card-sub">
            ${c.client ? `<span>🏢 ${core.esc(c.client)}</span>` : ""}
            ${renderAssigneeBadgesHTML(c)}
            ${c.location ? `<span>📍 ${core.esc(c.location.split(",")[0])}</span>` : ""}
            ${c.startTime ? `<span>🕒 ${core.esc(c.startTime)}</span>` : ""}
          </div>` : ""}
          <div class="pro-card-meta">
            ${c.start ? `<span class="pro-due-chip ${dueCls}">📅 ${core.fmtShortBR(c.start)}${c.end && c.end !== c.start ? `–${core.fmtShortBR(c.end)}` : ""}</span>` : `<span class="pro-due-chip">⏳ Sem prazo</span>`}
            ${finTxt ? `<span class="pro-fin-chip ${c.finDirection === "income" ? "fin-in" : "fin-out"}">${core.esc(finTxt)}</span>` : ""}
            ${subs.length ? `<span class="pro-chk-chip">☑️ ${subsDone}/${subs.length}</span>` : ""}
            ${c.priority === "Crítica" || c.priority === "Alta" ? `<span class="pro-prio-chip ${prioCls}">${core.esc(c.priority)}</span>` : ""}
            ${attCount ? `<span class="pro-chk-chip">📎 ${attCount}</span>` : ""}
            ${getCardTripBadgeHTML(c)}
          </div>
          ${c.progress > 0 ? `<div class="pro-card-prog" title="Progresso: ${c.progress}%"><i style="width:${c.progress}%"></i></div>` : ""}
          <div class="pro-card-move-row">
            <span class="muted" style="font-size:0.7rem">${c.progress || 0}%</span>
            <select class="pro-card-move-select" data-move-card="${core.esc(c.id)}" title="Mover para outra lista">${moveOpts}</select>
          </div>
        </article>`;
      }).join("");

      return `<section class="pro-col" data-col-id="${core.esc(col.id)}" style="--col-c:${core.esc(col.color || "#2563eb")}">
        <header class="pro-col-head">
          <div class="pro-col-title-wrap">
            <span class="pro-col-title">${core.esc(col.title)}</span>
            <span class="pro-col-count">${colCards.length}</span>
          </div>
          <div class="inline-actions">
            <button type="button" class="icon-btn" data-edit-col="${core.esc(col.id)}" title="Editar lista">✏️</button>
          </div>
        </header>
        <div class="pro-col-body" data-col-body="${core.esc(col.id)}">
          ${cardsHtml || `<div class="muted small" style="text-align:center;padding:18px 8px;border:1px dashed var(--border);border-radius:10px">Arraste cartões para cá</div>`}
        </div>
        <footer class="pro-col-foot">
          <button type="button" class="btn ghost small pro-quick-add-btn" data-quick-open="${core.esc(col.id)}">➕ Adicionar um cartão</button>
          <form class="pro-quick-add-form" data-quick-form="${core.esc(col.id)}" hidden>
            <input type="text" placeholder="Título do cartão..." required>
            <div class="inline-actions">
              <button type="submit" class="btn primary small">Adicionar</button>
              <button type="button" class="btn ghost small" data-quick-cancel="${core.esc(col.id)}">✕</button>
            </div>
          </form>
        </footer>
      </section>`;
    }).join("");

    // Eventos dos cartões e colunas
    let draggingCardId = null;
    board.querySelectorAll(".pro-card[data-card-id]").forEach(cardEl => {
      cardEl.onclick = e => {
        if (e.target.closest("select, button, input")) return;
        openProCardModal(cardEl.dataset.cardId);
      };
      cardEl.addEventListener("dragstart", ev => {
        draggingCardId = cardEl.dataset.cardId;
        cardEl.classList.add("dragging");
        if (ev.dataTransfer) {
          ev.dataTransfer.effectAllowed = "move";
          ev.dataTransfer.setData("text/plain", draggingCardId);
        }
      });
      cardEl.addEventListener("dragend", () => {
        draggingCardId = null;
        board.querySelectorAll(".pro-card").forEach(x => x.classList.remove("dragging"));
        board.querySelectorAll(".pro-col").forEach(x => x.classList.remove("drag-over"));
      });
    });

    board.querySelectorAll(".pro-col[data-col-id]").forEach(colEl => {
      colEl.addEventListener("dragover", ev => {
        ev.preventDefault();
        colEl.classList.add("drag-over");
      });
      colEl.addEventListener("dragleave", ev => {
        if (!colEl.contains(ev.relatedTarget)) colEl.classList.remove("drag-over");
      });
      colEl.addEventListener("drop", ev => {
        ev.preventDefault();
        colEl.classList.remove("drag-over");
        const cid = draggingCardId || (ev.dataTransfer ? ev.dataTransfer.getData("text/plain") : "");
        const targetColId = colEl.dataset.colId;
        if (!cid || !targetColId) return;
        const targetCardEl = ev.target.closest(".pro-card[data-card-id]");
        moveCardToColumn(cid, targetColId, targetCardEl ? targetCardEl.dataset.cardId : null);
      });
    });

    board.querySelectorAll("[data-pro-toggle-done]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        toggleProCardDone(btn.dataset.proToggleDone);
      };
    });
    board.querySelectorAll("[data-move-card]").forEach(sel => {
      sel.onclick = e => e.stopPropagation();
      sel.onchange = e => {
        e.stopPropagation();
        moveCardToColumn(sel.dataset.moveCard, sel.value, null);
      };
    });

    board.querySelectorAll("[data-edit-col]").forEach(btn => {
      btn.onclick = () => openProColumnModal(btn.dataset.editCol);
    });

    board.querySelectorAll("[data-quick-open]").forEach(btn => {
      btn.onclick = () => {
        const colId = btn.dataset.quickOpen;
        const form = board.querySelector(`[data-quick-form="${colId}"]`);
        if (!form) return;
        btn.hidden = true;
        form.hidden = false;
        form.querySelector("input")?.focus();
      };
    });

    board.querySelectorAll("[data-quick-cancel]").forEach(btn => {
      btn.onclick = () => {
        const colId = btn.dataset.quickCancel;
        const form = board.querySelector(`[data-quick-form="${colId}"]`);
        const openBtn = board.querySelector(`[data-quick-open="${colId}"]`);
        if (form) form.hidden = true;
        if (openBtn) openBtn.hidden = false;
      };
    });

    board.querySelectorAll("[data-quick-form]").forEach(form => {
      form.onsubmit = ev => {
        ev.preventDefault();
        const colId = form.dataset.quickForm;
        const inp = form.querySelector("input");
        const title = inp ? inp.value.trim() : "";
        if (!title) return;
        const active = core.getActiveTrip();
        if (active?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
        const st = core.getState();
        const todayIso = core.fmtISO(new Date());
        const nextOrder = (st.activities || []).filter(a => a.columnId === colId).length;
        st.activities.push({
          id: core.uid(),
          type: "Desenvolvimento",
          columnId: colId,
          order: nextOrder,
          name: title,
          start: todayIso,
          end: todayIso,
          priority: "Média",
          progress: 0,
          client: st.params?.clientDefault || "",
          assignee: "",
          location: "",
          coverColor: "",
          labels: [],
          tags: [],
          finDirection: "none",
          amount: 0,
          actualAmount: 0,
          finStatus: "Previsto",
          subtasks: [],
          notes: "",
          attachments: []
        });
        core.save(`🗂️ Cartão "${title}" criado!`);
      };
    });
  }

  function moveCardToColumn(cardId, targetColId, beforeCardId = null) {
    const ctx = findProCardContext(cardId);
    if (!ctx) return;
    if (ctx.trip?.role === "viewer") {
      core.toast("👁️ Projeto compartilhado somente para visualização.");
      renderProBoard();
      return;
    }
    const acts = ctx.data.activities || [];
    const card = ctx.activity;
    const cols = ctx.data.columns || getMergedColumns();
    const targetCol = cols.find(c => c.id === targetColId);
    const doneColId = String(ctx.data.params?.doneColumnId || "");
    const wasDoneCol = (doneColId && card.columnId === doneColId) || card.columnId === "done";
    const isNowDoneCol = (doneColId && targetColId === doneColId) || targetColId === "done";
    card.columnId = targetColId;
    if (isNowDoneCol) {
      card.completed = true;
      if (card.progress < 100) card.progress = 100;
    } else if (wasDoneCol && !isNowDoneCol) {
      card.completed = false;
    }

    const siblings = acts
      .filter(a => a.columnId === targetColId && a.id !== cardId)
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    let insertIdx = siblings.length;
    if (beforeCardId) {
      const idx = siblings.findIndex(s => s.id === beforeCardId);
      if (idx >= 0) insertIdx = idx;
    }
    siblings.splice(insertIdx, 0, card);
    siblings.forEach((s, idx) => { s.order = idx; });

    core.saveTripRecord(ctx.trip, `🗂️ "${card.name}" movido para ${targetCol?.title || "lista"}`);
  }

  /* ---------- 2. GANTT PROFISSIONAL, LINHA DO TEMPO & FILTROS UNIFICADOS ---------- */
  function getProUnifiedFilterCfg() {
    return {
      colSet: proGanttColSet,
      typeSet: proGanttTypeSet,
      labelSet: proGanttLabelSet,
      tagSet: proGanttTagSet,
      q: proFilterSearch.trim().toLowerCase(),
      prio: proFilterPrio,
      assignee: proFilterAssignee,
      travel: proFilterTravel,
      client: proFilterClient.trim().toLowerCase(),
      location: proFilterLocation.trim().toLowerCase(),
      done: proFilterDone,
      finDir: proFilterFinDir,
      finStatus: proFilterFinStatus,
      dateFrom: proDateFrom,
      dateTo: proDateTo
    };
  }

  function countActiveProUnifiedFilters() {
    const totalTypes = Object.keys(getAllProTypes()).length;
    return (proFilterSearch.trim() ? 1 : 0)
      + (proGanttColSet.size > 0 ? 1 : 0)
      + (proGanttTypeSet.size < totalTypes ? 1 : 0)
      + (proGanttLabelSet.size > 0 ? 1 : 0)
      + (proGanttTagSet.size > 0 ? 1 : 0)
      + (proFilterPrio ? 1 : 0)
      + (proFilterAssignee ? 1 : 0)
      + (proFilterTravel ? 1 : 0)
      + (proFilterClient.trim() ? 1 : 0)
      + (proFilterLocation.trim() ? 1 : 0)
      + (proFilterDone ? 1 : 0)
      + (proFilterFinDir ? 1 : 0)
      + (proFilterFinStatus ? 1 : 0)
      + ((proDateFrom || proDateTo) ? 1 : 0);
  }

  function hasActiveProFilters() {
    return countActiveProUnifiedFilters() > 0;
  }

  function applyProUnifiedFilters(allCards) {
    const cols = getMergedColumns();
    const cfg = getProUnifiedFilterCfg();
    return (allCards || []).filter(a => matchProCardFilters(a, cfg, cols));
  }

  function syncProFilterUIs() {
    const colsArr = [...proGanttColSet];
    const typesArr = [...proGanttTypeSet];
    const labelsArr = [...proGanttLabelSet];
    const tagsArr = [...proGanttTagSet];
    [proGanttColMsel, proMapColMsel, proDashColMsel, proFinColMsel].forEach(m => { if (m) m.setSelected(colsArr); });
    [proGanttTypeMsel, proMapTypeMsel, proDashTypeMsel, proFinTypeMsel].forEach(m => { if (m) m.setSelected(typesArr); });
    [proGanttLabelMsel, proMapLabelMsel, proDashLabelMsel, proFinLabelMsel].forEach(m => { if (m) m.setSelected(labelsArr); });
    [proGanttTagMsel, proMapTagMsel, proDashTagMsel, proFinTagMsel].forEach(m => { if (m) m.setSelected(tagsArr); });
    const syncInps = (sels, val) => sels.forEach(s => { if ($(s) && $(s).value !== val) $(s).value = val; });
    syncInps(["#proGanttSearch", "#proMapSearch", "#proDashSearch", "#proFinSearch"], proFilterSearch);
    syncInps(["#proGanttPrioFilter", "#proMapPrioFilter", "#proDashPrioFilter", "#proFinPrioFilter"], proFilterPrio);
    syncInps(["#proGanttAssigneeFilter", "#proMapAssigneeFilter", "#proMapQuickAssignee", "#proDashAssigneeFilter", "#proFinAssigneeFilter"], proFilterAssignee);
    syncInps(["#proGanttTravelFilter", "#proMapTravelFilter", "#proMapQuickTravel", "#proDashTravelFilter", "#proFinTravelFilter"], proFilterTravel);
    syncInps(["#proGanttClientFilter", "#proMapClientFilter", "#proDashClientFilter", "#proFinClientFilter"], proFilterClient);
    syncInps(["#proGanttLocationFilter", "#proMapLocationFilter", "#proDashLocationFilter", "#proFinLocationFilter"], proFilterLocation);
    syncInps(["#proGanttDoneFilter", "#proMapDoneFilter", "#proDashDoneFilter", "#proFinDoneFilter"], proFilterDone);
    syncInps(["#proGanttFinDirFilter", "#proMapFinDirFilter", "#proDashFinDirFilter", "#proFinFinDirFilter"], proFilterFinDir);
    syncInps(["#proGanttFinStatusFilter", "#proMapFinStatusFilter", "#proDashFinStatusFilter", "#proFinFinStatusFilter"], proFilterFinStatus);
    syncInps(["#proGanttDateFrom", "#proMapDateFrom", "#proDashDateFrom", "#proFinDateFrom"], proDateFrom);
    syncInps(["#proGanttDateTo", "#proMapDateTo", "#proDashDateTo", "#proFinDateTo"], proDateTo);

    const activeCount = countActiveProUnifiedFilters();
    const dirty = activeCount > 0;
    ["#btnProGanttClearFilters", "#btnProMapClearFilters", "#btnProDashClearFilters", "#btnProFinClearFilters"].forEach(sel => {
      if ($(sel)) $(sel).hidden = !dirty;
    });
    [
      ["#btnProGanttFilterPop", "#proGanttFilterCount", activeCount],
      ["#btnProMapFilterPop", "#proMapFilterCount", activeCount],
      ["#btnProDashFilterPop", "#proDashFilterCount", activeCount],
      ["#btnProFinFilterPop", "#proFinFilterCount", activeCount]
    ].forEach(([btnSel, cntSel, cnt]) => {
      const fBtn = $(btnSel);
      const fCnt = $(cntSel);
      if (fBtn) fBtn.classList.toggle("has-active", cnt > 0);
      if (fCnt) {
        fCnt.textContent = cnt ? String(cnt) : "";
        fCnt.hidden = !cnt;
      }
    });
  }

  function applyAndRenderProFilteredViews() {
    syncProFilterUIs();
    const cards = getProSortedActivities();
    const filteredCards = applyProUnifiedFilters(cards);
    const t = computeProTotals(filteredCards);
    renderProGantt(cards);
    renderProTimeline(cards);
    renderProMap(filteredCards);
    renderProDashboard(filteredCards, t);
    renderProFinance(filteredCards, t);
  }

  function resetProUnifiedFilters() {
    proGanttTypeSet = new Set(Object.keys(getAllProTypes()));
    proGanttColSet.clear();
    proGanttLabelSet.clear();
    proGanttTagSet.clear();
    proDateFrom = "";
    proDateTo = "";
    proFilterSearch = "";
    proFilterPrio = "";
    proFilterAssignee = "";
    proFilterTravel = "";
    proFilterClient = "";
    proFilterLocation = "";
    proFilterDone = "";
    proFilterFinDir = "";
    proFilterFinStatus = "";
    applyAndRenderProFilteredViews();
  }

  function getFilteredProGanttRows(allSorted) {
    return applyProUnifiedFilters(allSorted || getProSortedActivities()).filter(a => Boolean(a.start));
  }

  function getProUnifiedFilteredItems() {
    const all = core.buildUnifiedItems();
    const unifiedState = core.getUnifiedState ? core.getUnifiedState() : { unified: true, conflictsOnly: false };
    const proTotal = Object.keys(getAllProTypes()).length;
    const proPartial = proGanttTypeSet.size < proTotal;
    const cols = getMergedColumns();
    const cfg = getProUnifiedFilterCfg();
    const filtered = all.filter(it => {
      if (!it.start) return false;
      const meta = core.unifiedMetaMap?.get(it);
      if (!meta) return false;
      if (unifiedState.conflictsOnly && !core.unifiedConflictMap?.has(it)) return false;
      if (meta.mode === "professional") {
        if (!matchProCardFilters(it, cfg, cols)) return false;
      } else {
        if (proGanttColSet.size > 0 || proGanttLabelSet.size > 0 || proFilterPrio || proFilterAssignee || proFilterClient.trim() || proFilterFinDir || proFilterFinStatus) return false;
        if (proPartial && !proGanttTypeSet.has(it.type)) return false;
        if (proGanttTagSet.size > 0 && !(Array.isArray(it.tags) && it.tags.some(tg => proGanttTagSet.has(tg)))) return false;
        if (proDateFrom && (it.end || it.start) < proDateFrom) return false;
        if (proDateTo && it.start > proDateTo) return false;
        if (proFilterLocation.trim() && !String(it.to || it.from || it.location || "").toLowerCase().includes(proFilterLocation.trim().toLowerCase())) return false;
        if (proFilterSearch.trim()) {
          const hay = `${it.name} ${it.type} ${it.from || ""} ${it.to || ""} ${it.notes || ""} ${(it.tags || []).join(" ")}`.toLowerCase();
          if (!hay.includes(proFilterSearch.trim().toLowerCase())) return false;
        }
      }
      return true;
    });
    return { allUnified: all, filtered };
  }

  function buildProSummaryHTML(a, extraBadgesHtml = null) {
    const meta = extraBadgesHtml ? core.unifiedMetaMap?.get(a) : null;
    const info = meta ? core.getTypeInfoAny(a) : getProTypeInfo(a.type);
    const attCount = Array.isArray(a.attachments) ? a.attachments.length : 0;
    const finTxt = meta?.mode === "personal" ? (a.city || "") : formatProFinShort(a);
    const subs = Array.isArray(a.subtasks) ? a.subtasks : [];
    const subsDone = subs.filter(s => s.done).length;
    const actTags = Array.isArray(a.tags) ? a.tags.filter(Boolean) : [];
    const tagsHtml = actTags.length
      ? `<span class="g-summary-tags">${actTags.slice(0, 2).map(tg => `<span class="tag-mini">${core.esc(tg)}</span>`).join("")}</span>`
      : "";
    const metaParts = [];
    if (a.columnTitle && meta?.mode !== "personal") metaParts.push(a.columnTitle);
    if (a.client) metaParts.push(a.client);
    if (a.startTime) metaParts.push(a.startTime);
    if (subs.length) metaParts.push(`☑ ${subsDone}/${subs.length}`);

    const typeColAttr = info.isCustom && info.color ? ` style="--t-color:${core.esc(info.color)}"` : "";
    return `<div class="g-summary ${info.cls}" data-id="${core.esc(a.id)}" data-umode="${meta ? meta.mode : "professional"}"${typeColAttr}>
      <span class="g-summary-title">${core.esc(a.name)}</span>
      <span class="g-summary-badge">${meta?.mode !== "personal" && a.progress > 0 ? `${a.progress}%` : core.fmtShortBR(a.start)}</span>
      ${finTxt ? `<span class="g-summary-badge">${core.esc(finTxt)}</span>` : ""}
      ${extraBadgesHtml !== null ? extraBadgesHtml : getCardTripBadgeHTML(a)}
      ${tagsHtml}
      ${metaParts.length ? `<span class="g-summary-meta">${core.esc(metaParts.join(" · "))}</span>` : ""}
      ${attCount ? `<span class="g-summary-meta">📎 ${attCount}</span>` : ""}
    </div>`;
  }

  function updateProZoomReadout() {
    const btn = $("#btnProGanttZoomReset");
    if (!btn) return;
    const pct = Math.round((proGanttZoom / 50) * 100);
    btn.textContent = pct < 44 ? `${pct}% S` : `${pct}%`;
    btn.title = pct < 44 ? `Zoom ${pct}% (Modo Semanas do Ano)` : "Resetar zoom (100%)";
  }

  function stepProGanttZoom(delta) {
    const steps = core.GANTT_ZOOM_STEPS || [2.5, 3, 3.5, 4.5, 6, 8, 10, 13, 16, 19, 21, 22, 26, 32, 38, 44, 50, 58, 68, 82, 98, 116];
    let idx = steps.findIndex(v => v >= proGanttZoom);
    if (idx < 0) idx = steps.length - 1;
    const nextIdx = Math.max(0, Math.min(steps.length - 1, idx + delta));
    const nextZoom = steps[nextIdx];
    if (nextZoom === proGanttZoom) return;
    const wrap = $("#proGanttWrap");
    const nameW = proGanttSlimRail ? 54 : (window.innerWidth < 720 ? 156 : (proGanttZoom <= 4 ? 205 : 265));
    const oldUnitW = proGanttZoom < 22 ? Math.max(12, Math.round(proGanttZoom * 4.4)) / 7 : proGanttZoom;
    const centerRatio = wrap ? Math.max(0, (wrap.scrollLeft + (wrap.clientWidth - nameW) / 2) / Math.max(1, oldUnitW)) : 0;
    proGanttZoom = nextZoom;
    updateProZoomReadout();
    renderProGantt();
    const newUnitW = proGanttZoom < 22 ? Math.max(12, Math.round(proGanttZoom * 4.4)) / 7 : proGanttZoom;
    if (wrap && centerRatio > 0) {
      wrap.scrollLeft = Math.max(0, centerRatio * newUnitW - (wrap.clientWidth - nameW) / 2);
    }
  }

  function fitProGanttZoom() {
    const unified = Boolean(core.getUnifiedState?.().unified);
    const s = unified ? getProUnifiedFilteredItems().filtered : getFilteredProGanttRows();
    const wrap = $("#proGanttWrap");
    if (!s.length || !wrap) return;
    const nameW = proGanttSlimRail ? 54 : (window.innerWidth < 720 ? 156 : 265);
    const minTs = core.parseD(s[0].start).getTime() - 2 * core.DAY;
    const maxS = s.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, s[0].start);
    const n = Math.max(5, Math.round((core.parseD(maxS) - minTs) / core.DAY) + 8);
    const avail = Math.max(240, wrap.clientWidth - nameW - 24);
    const ideal = Math.max(2.5, Math.min(94, Math.floor((avail / n) * 10) / 10));
    proGanttZoom = ideal;
    updateProZoomReadout();
    renderProGantt();
    wrap.scrollLeft = 0;
  }

  function renderProGantt(allSortedOpt) {
    const g = $("#proGantt");
    const wrap = $("#proGanttWrap");
    const tlWrap = $("#proTimelineWrap");
    if (!g || !wrap || !tlWrap) return;

    const st = core.getState();
    const trips = core.getSelectedTrips();
    const multi = trips.length > 1;
    const active = core.getActiveTrip();
    const unified = Boolean(core.getUnifiedState?.().unified);

    if ($("#btnProGanttUnified")) {
      $("#btnProGanttUnified").setAttribute("aria-pressed", String(unified));
    }
    const vBtn = $("#btnProGanttViewPop");
    const vLbl = $("#proGanttViewPopLabel");
    const vDot = $("#proGanttViewUnifDot");
    if (vBtn) vBtn.classList.toggle("has-active", unified);
    if (vLbl) vLbl.textContent = proGanttMode === "timeline" ? "Timeline" : "Gantt";
    if (vDot) vDot.hidden = !unified;
    if ($("#proGanttZoomGroup")) $("#proGanttZoomGroup").hidden = proGanttMode !== "gantt";

    const roleBadge = $("#proTripRoleBadge");
    if (roleBadge) {
      if (!unified && !multi && active && active.role !== "owner") {
        roleBadge.textContent = `Compartilhado (${active.ownerName || "usuário"})`;
        roleBadge.hidden = false;
      } else {
        roleBadge.hidden = true;
      }
    }

    let s;
    const allSorted = allSortedOpt || getProSortedActivities();
    if (unified) {
      const u = getProUnifiedFilteredItems();
      s = u.filtered;
      core.renderUnifiedStatusBar?.($("#proGanttUnifiedBar"), u.allUnified, u.filtered, () => {
        renderProGantt();
        renderProTimeline();
      });
    } else {
      core.renderUnifiedStatusBar?.($("#proGanttUnifiedBar"), [], [], null);
      s = getFilteredProGanttRows(allSorted);
    }

    updateProZoomReadout();
    wrap.hidden = proGanttMode !== "gantt";
    tlWrap.hidden = proGanttMode !== "timeline";
    if (proGanttMode !== "gantt") return;

    const isWeekOnly = proGanttZoom < 22;
    g.classList.toggle("slim-rail", proGanttSlimRail);
    g.classList.toggle("zoom-week-only", isWeekOnly);
    g.classList.toggle("zoom-compact", !isWeekOnly && proGanttZoom <= 24);
    g.classList.toggle("zoom-micro", !isWeekOnly && proGanttZoom <= 18);

    if (!s.length) {
      g.style.gridTemplateColumns = "1fr";
      const unifEmpty = unified && core.ensureUnifiedSelection && core.getAllUnifiedTripEntries
        && core.ensureUnifiedSelection(core.getAllUnifiedTripEntries()).size === 0;
      g.innerHTML = unifEmpty
        ? `<div style="padding:28px;text-align:center"><p class="muted">Nenhuma agenda selecionada na Agenda Completa. Marque 1 ou mais agendas em <b>Agendas</b> acima.</p></div>`
        : ((allSorted.length > 0 || unified)
          ? `<div style="padding:28px;text-align:center"><p class="muted">Nenhum cartão ou compromisso corresponde aos filtros selecionados.</p><button type="button" class="btn primary" id="btnProGanttResetFilter">☑️ Limpar filtros</button></div>`
          : `<div style="padding:28px;text-align:center"><p class="muted">Nenhum cartão cadastrado neste projeto ainda.</p><button type="button" class="btn primary" id="btnProGanttFirstCard">➕ Criar primeiro cartão</button></div>`);
      if ($("#btnProGanttResetFilter")) {
        $("#btnProGanttResetFilter").onclick = () => resetProUnifiedFilters();
      }
      if ($("#btnProGanttFirstCard")) $("#btnProGanttFirstCard").onclick = () => openProCardModal();
      return;
    }

    const scale = core.buildGanttScale(s, proGanttZoom, window.innerWidth < 720);
    const DW = scale.colW;
    const n = scale.nCols;
    const nameW = proGanttSlimRail ? 54 : (window.innerWidth < 720 ? 156 : (scale.isYearView && DW <= 18 ? 205 : 265));
    const todayISO = scale.todayISO;

    g.classList.toggle("zoom-year", Boolean(scale.isYearView));
    g.style.gridTemplateColumns = `${nameW}px repeat(${n}, ${DW}px)`;
    g.style.setProperty("--gantt-name-w", `${nameW}px`);
    g.dataset.unitDays = scale.isWeekOnly ? "7" : "1";
    g.dataset.colW = String(DW);

    let h = `<div class="g-corner">
      ${proGanttSlimRail ? "" : `<span>${unified ? "Agenda Completa" : "Cartões"}</span>`}
      <button type="button" class="g-focus-btn${proGanttSlimRail ? " g-focus-only" : ""}" id="btnProGanttSlim" title="${proGanttSlimRail ? "Expandir nomes" : "Retrair coluna"}">${proGanttSlimRail ? "⤢" : "⤡"}</button>
    </div>`;

    scale.monthSpans.forEach(ms => {
      h += `<div class="g-month-head ${ms.mOdd ? "m-odd" : "m-even"}${ms.isCentered ? " is-centered" : ""}" style="grid-column:${ms.startCol} / span ${ms.span};grid-row:1"><span class="g-month-label">${ms.label}</span></div>`;
    });

    if (scale.isWeekOnly) {
      scale.weekSpans.forEach(ws => {
        h += `<div class="g-week-head ${ws.wOdd ? "w-odd" : "w-even"} ${ws.isCurrentWeek ? "today" : ""}" style="grid-column:${ws.col};grid-row:2" data-date="${ws.mondayISO}" data-end-date="${ws.sundayISO}" title="Semana ${ws.week} (${core.fmtShortBR(ws.mondayISO)}–${core.fmtShortBR(ws.sundayISO)})">${ws.weekLabel}</div>`;
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
          <span>${core.WD[d.getDay()][0]}</span><b>${d.getDate()}</b>
        </div>`;
      });
    }

    const resetTypeOrderBtn = $("#btnProGanttResetTypeOrder");
    if (resetTypeOrderBtn) {
      const hasCustomOrder = Array.isArray(st.ganttTypeOrder) && st.ganttTypeOrder.length > 0;
      resetTypeOrderBtn.hidden = !(proGanttGroup === "type" && hasCustomOrder);
    }

    // Montar linhas com ou sem agrupamento (desativa agrupamento em modo unificado)
    const cols = getMergedColumns();
    const renderItems = [];
    if (!unified && proGanttGroup === "column") {
      cols.forEach(col => {
        const items = s.filter(a => a.columnId === col.id);
        if (!items.length) return;
        const gid = `col:${col.id}`;
        renderItems.push({ kind: "group", gid, label: col.title, count: items.length, color: col.color });
        if (!collapsedGanttGroups.has(gid)) items.forEach(a => renderItems.push({ kind: "card", a }));
      });
      const unlinkedItems = s.filter(a => !a.columnId || !cols.some(c => c.id === a.columnId));
      if (unlinkedItems.length) {
        const gid = "col:__none__";
        renderItems.push({ kind: "group", gid, label: "Sem lista (Gantt & Timeline)", count: unlinkedItems.length, color: "#64748b" });
        if (!collapsedGanttGroups.has(gid)) unlinkedItems.forEach(a => renderItems.push({ kind: "card", a }));
      }
    } else if (!unified && proGanttGroup === "type") {
      const allTypesMap = getAllProTypes();
      const rawGroups = [];
      Object.values(allTypesMap).forEach(tp => {
        const items = s.filter(a => a.type === tp.id);
        if (!items.length) return;
        const earliest = items.reduce((m, a) => (a.start && a.start < m ? a.start : m), items[0].start || "9999-99-99");
        rawGroups.push({ tp, items, earliest });
      });
      rawGroups.sort((a, b) => a.earliest.localeCompare(b.earliest) || a.tp.short.localeCompare(b.tp.short));
      const customOrder = Array.isArray(st.ganttTypeOrder) && st.ganttTypeOrder.length ? st.ganttTypeOrder : null;
      if (customOrder) {
        const posMap = new Map(customOrder.map((id, i) => [id, i]));
        rawGroups.sort((a, b) => {
          const pa = posMap.has(a.tp.id) ? posMap.get(a.tp.id) : 9999;
          const pb = posMap.has(b.tp.id) ? posMap.get(b.tp.id) : 9999;
          return pa - pb || a.earliest.localeCompare(b.earliest) || a.tp.short.localeCompare(b.tp.short);
        });
      }
      const orderedTypeIds = rawGroups.map(gObj => gObj.tp.id);
      rawGroups.forEach((gObj, gIdx) => {
        const { tp, items } = gObj;
        const gid = `type:${tp.id}`;
        renderItems.push({
          kind: "group",
          gid,
          typeId: tp.id,
          typeIdx: gIdx,
          totalTypeGroups: orderedTypeIds.length,
          orderedTypeIds,
          label: tp.short,
          iconHtml: tp.iconHtml,
          count: items.length,
          color: tp.color || "#2563eb"
        });
        if (!collapsedGanttGroups.has(gid)) items.forEach(a => renderItems.push({ kind: "card", a }));
      });
    } else {
      s.forEach(a => renderItems.push({ kind: "card", a }));
    }

    const baseRow = scale.isWeekOnly ? 3 : 4;
    renderItems.forEach((entry, rowIdx) => {
      const row = rowIdx + baseRow;
      if (entry.kind === "group") {
        const isCollapsed = collapsedGanttGroups.has(entry.gid);
        const reorderBtns = (entry.typeId && entry.totalTypeGroups > 1)
          ? `<span class="g-type-order-btns">
              <button type="button" class="icon-btn g-order-btn" data-ptype-move="${core.esc(entry.typeId)}:-1" ${entry.typeIdx === 0 ? "disabled" : ""} title="Mover tipo para cima (${core.esc(entry.label)})">▲</button>
              <button type="button" class="icon-btn g-order-btn" data-ptype-move="${core.esc(entry.typeId)}:1" ${entry.typeIdx === entry.totalTypeGroups - 1 ? "disabled" : ""} title="Mover tipo para baixo (${core.esc(entry.label)})">▼</button>
            </span>`
          : "";
        h += `<div class="g-group-corner" style="grid-column:1;grid-row:${row};border-left:3px solid ${core.esc(entry.color || "#2563eb")}" data-pgroup-toggle="${core.esc(entry.gid)}">
          <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${isCollapsed ? "▸" : "▾"} ${proGanttSlimRail ? "" : `${entry.iconHtml ? entry.iconHtml + " " : ""}${core.esc(entry.label)}`}</span>
          <span style="display:inline-flex;align-items:center;gap:3px;flex-shrink:0">${proGanttSlimRail ? "" : reorderBtns}<span class="pill" style="padding:1px 6px;font-size:0.68rem">${entry.count}</span></span>
        </div>`;
        h += `<div class="g-group-band" style="grid-column:2 / span ${n};grid-row:${row}">${proGanttSlimRail ? `<span style="display:inline-flex;align-items:center;gap:6px">${core.esc(entry.label)} ${reorderBtns}</span>` : ""}</div>`;
        return;
      }

      const a = entry.a;
      const meta = unified ? core.unifiedMetaMap?.get(a) : null;
      const conf = unified ? core.unifiedConflictMap?.get(a) : null;
      const umode = meta ? meta.mode : "professional";
      const info = meta ? core.getTypeInfoAny(a) : getProTypeInfo(a.type);
      const altCls = rowIdx % 2 ? "alt" : "";
      const finTxt = umode === "personal" ? (a.city || "") : formatProFinShort(a);
      const subParts = [core.fmtShortBR(a.start)];
      if (a.startTime) subParts.push(a.startTime);
      if (umode !== "personal" && a.columnTitle) subParts.push(a.columnTitle);
      if (finTxt) subParts.push(finTxt);
      const cardParams = meta?.tripRef?.data?.params || core.getState()?.params;
      const done = umode === "personal" ? Boolean(a.done) : isCardDone(a, cols, cardParams);
      const overdue = umode !== "personal" && !done && (a.end || a.start) < todayISO;
      const typeColStyle = info.isCustom && info.color ? `--t-color:${core.esc(info.color)};` : "";
      const rowStyleExtra = `${meta ? `--cal-color:${meta.calColor};` : ""}${typeColStyle}`;
      const badgeHtml = meta ? core.renderUnifiedCardSubBadges(a) : getCardTripBadgeHTML(a);
      const doneBtnHtml = (umode === "professional" && a.columnId)
        ? `<button type="button" class="g-done-btn${done ? " is-done" : ""}" data-gantt-done="${core.esc(a.id)}" title="${done ? "Reabrir tarefa" : "Marcar como concluída"}" aria-label="${done ? "Reabrir tarefa" : "Marcar como concluída"}">✓</button>`
        : "";

      h += `<div class="g-name ${altCls}${meta ? " is-unified-row" : ""}${done ? " is-done" : ""}" style="grid-column:1;grid-row:${row};${rowStyleExtra}" data-id="${core.esc(a.id)}" data-umode="${umode}" title="${core.esc(conf ? `${a.name} — ${conf.summary}` : a.name)}">
        ${doneBtnHtml}
        <span class="g-type-dot ${info.cls}">${info.icon}</span>
        <div class="g-name-txt">
          <div class="g-name-title">${core.esc(a.name)}${conf ? " ⚠️" : ""}</div>
          <div class="g-name-sub">${core.esc(subParts.join(" · "))} ${badgeHtml}</div>
        </div>
      </div>`;

      const pos = scale.locateBar(a);
      const len = core.days(a);
      const isMilestone = umode === "professional" && a.type === "Marco" && len === 1 && !scale.isWeekOnly;

      for (let i = 0; i < n; i++) {
        const cm = scale.colMeta[i];
        let inner = "";
        if (i === pos.off) {
          const barW = isMilestone ? 24 : pos.barW;
          const insideTxt = isMilestone
            ? (info.icon || "◆")
            : (scale.isWeekOnly
              ? `${barW >= 14 ? info.icon : ""}${DW >= 52 ? ` ${core.esc(a.name.slice(0, 12))}` : ""}`
              : (DW <= 20 && len === 1 ? info.icon : (len > 1 ? `${info.icon} ${len}d` : info.icon)));
          const progBar = (umode === "professional" && !isMilestone && a.progress > 0) ? `<span class="g-bar-prog" style="width:${a.progress}%"></span>` : "";
          const resizeHandle = !isMilestone && barW >= 18 ? `<span class="g-resize" data-resize="${core.esc(a.id)}" title="Arraste para ajustar duração"></span>` : "";
          const unifCls = meta ? core.getUnifiedBarExtraClasses(a) : "";
          inner = `<div class="g-event-wrap" style="left:3px">
            <div class="g-bar ${info.cls} ${len === 1 && !scale.isWeekOnly ? "single-day" : ""}${isMilestone ? " is-milestone" : ""}${overdue ? " is-overdue" : ""}${done ? " is-done" : ""}${unifCls}" data-id="${core.esc(a.id)}" data-umode="${umode}" style="width:${barW}px;${typeColStyle}" title="${core.esc(conf ? conf.summary : a.name)}">
              ${progBar}<span class="g-bar-txt">${insideTxt}</span>${resizeHandle}
            </div>
            ${buildProSummaryHTML(a, meta ? core.renderUnifiedCardSubBadges(a) : null)}
          </div>`;
        }
        h += `<div class="g-cell ${altCls} ${cm.we ? "weekend" : ""} ${cm.wOdd ? "w-odd" : "w-even"} ${cm.mOdd ? "m-odd" : "m-even"} ${cm.wStart ? "w-start" : ""} ${cm.mStart ? "m-start" : ""} ${cm.isToday ? "today" : ""}" style="grid-column:${i + 2};grid-row:${row}">${inner}</div>`;
      }
    });

    g.innerHTML = h;

    const slimBtn = $("#btnProGanttSlim");
    if (slimBtn) {
      slimBtn.onclick = () => { proGanttSlimRail = !proGanttSlimRail; renderProGantt(); };
    }
    g.querySelectorAll("[data-pgroup-toggle]").forEach(el => {
      el.onclick = ev => {
        if (ev.target.closest("[data-ptype-move]")) return;
        const gid = el.dataset.pgroupToggle;
        if (collapsedGanttGroups.has(gid)) collapsedGanttGroups.delete(gid);
        else collapsedGanttGroups.add(gid);
        renderProGantt();
      };
    });
    g.querySelectorAll("[data-ptype-move]").forEach(btn => {
      btn.onclick = ev => {
        ev.stopPropagation();
        const [typeId, deltaStr] = btn.dataset.ptypeMove.split(":");
        const delta = parseInt(deltaStr, 10) || 0;
        const currentOrder = renderItems.find(it => it.kind === "group" && it.orderedTypeIds)?.orderedTypeIds || Object.keys(getAllProTypes());
        const fullOrder = [...new Set([...currentOrder, ...Object.keys(getAllProTypes())])];
        const idx = currentOrder.indexOf(typeId);
        const swapIdx = idx + delta;
        if (idx < 0 || swapIdx < 0 || swapIdx >= currentOrder.length) return;
        const otherTypeId = currentOrder[swapIdx];
        const fi1 = fullOrder.indexOf(typeId);
        const fi2 = fullOrder.indexOf(otherTypeId);
        if (fi1 >= 0 && fi2 >= 0) {
          fullOrder[fi1] = otherTypeId;
          fullOrder[fi2] = typeId;
          st.ganttTypeOrder = fullOrder;
          core.save("↕️ Ordem dos Tipos de Cartão no Gantt atualizada");
        }
      };
    });
    g.querySelectorAll("[data-gantt-done]").forEach(btn => {
      btn.onclick = ev => {
        ev.stopPropagation();
        toggleProCardDone(btn.dataset.ganttDone);
      };
    });
    const openTarget = el => {
      if (el.dataset.umode === "personal") core.openModal(el.dataset.id);
      else openProCardModal(el.dataset.id);
    };
    g.querySelectorAll(".g-name[data-id], .g-summary[data-id]").forEach(el => {
      el.onclick = ev => {
        if (ev.target.closest("[data-gantt-done]")) return;
        openTarget(el);
      };
    });
    g.querySelectorAll(".g-bar").forEach(bindProGanttDrag);
    g.querySelectorAll(".g-resize").forEach(bindProGanttResize);
  }

  function bindProGanttDrag(bar) {
    bar.onpointerdown = e => {
      if (e.target.closest("[data-resize]")) return;
      const openTarget = () => {
        if (bar.dataset.umode === "personal") core.openModal(bar.dataset.id);
        else openProCardModal(bar.dataset.id);
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
      const colW = Number(gridEl?.dataset.colW) || proGanttZoom;
      const unitDays = Number(gridEl?.dataset.unitDays) || 1;
      const x0 = e.clientX;
      let dCols = 0;
      const tip = document.createElement("div");
      tip.className = "drag-tip";
      const ctx = findProCardContext(bar.dataset.id);
      const a = ctx?.activity;
      if (!a) return;

      bar.onpointermove = ev => {
        const dx = ev.clientX - x0;
        dCols = Math.round(dx / colW);
        const dd = dCols * unitDays;
        if (Math.abs(dx) > 4) {
          bar.classList.add("dragging");
          wrap.style.transform = `translateX(${dCols * colW}px)`;
          const ns = core.fmtISO(new Date(core.parseD(a.start).getTime() + dd * core.DAY + 3600e3));
          tip.textContent = `${core.fmtShortBR(ns)} (${dd > 0 ? "+" : ""}${dd}d)`;
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
        if (ctx.trip?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
        a.start = core.fmtISO(new Date(core.parseD(a.start).getTime() + dd * core.DAY + 3600e3));
        a.end = core.fmtISO(new Date(core.parseD(a.end || a.start).getTime() + dd * core.DAY + 3600e3));
        core.saveTripRecord(ctx.trip, `📅 "${a.name}" movido ${dd > 0 ? "+" : ""}${dd} dia(s)`);
      };
    };
  }

  function bindProGanttResize(handle) {
    handle.onpointerdown = e => {
      if (e.pointerType === "touch") return;
      e.stopPropagation();
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const bar = handle.closest(".g-bar");
      const gridEl = bar.closest(".gantt");
      const colW = Number(gridEl?.dataset.colW) || proGanttZoom;
      const unitDays = Number(gridEl?.dataset.unitDays) || 1;
      const ctx = findProCardContext(handle.dataset.resize);
      const a = ctx?.activity;
      if (!a) return;
      const x0 = e.clientX;
      const origLen = core.days(a);
      let dd = 0;

      handle.onpointermove = ev => {
        dd = Math.round((ev.clientX - x0) / colW) * unitDays;
        const newLen = Math.max(1, origLen + dd);
        const pxW = unitDays === 7 ? Math.max(24, Math.ceil(newLen / 7) * colW - 6) : Math.max(12, newLen * colW - 6);
        bar.style.width = `${pxW}px`;
      };
      handle.onpointerup = () => {
        handle.onpointermove = handle.onpointerup = null;
        const newLen = Math.max(1, origLen + dd);
        if (newLen === origLen) return;
        if (ctx.trip?.role === "viewer") {
          return renderProGantt();
        }
        a.end = core.fmtISO(new Date(core.parseD(a.start).getTime() + (newLen - 1) * core.DAY + 3600e3));
        core.saveTripRecord(ctx.trip, `↔️ "${a.name}": duração ajustada para ${newLen} dia(s)`);
      };
    };
  }

  function renderProTimeline(allSortedOpt) {
    const tl = $("#proTimelineWrap");
    if (!tl || proGanttMode !== "timeline") return;
    const unified = Boolean(core.getUnifiedState?.().unified);
    let s;
    if (unified) {
      const u = getProUnifiedFilteredItems();
      s = u.filtered;
      core.renderUnifiedStatusBar?.($("#proGanttUnifiedBar"), u.allUnified, u.filtered, () => {
        renderProGantt();
        renderProTimeline();
      });
    } else {
      core.renderUnifiedStatusBar?.($("#proGanttUnifiedBar"), [], [], null);
      s = getFilteredProGanttRows(allSortedOpt || getProSortedActivities());
    }
    if (!s.length) {
      const unifEmpty = unified && core.ensureUnifiedSelection && core.getAllUnifiedTripEntries
        && core.ensureUnifiedSelection(core.getAllUnifiedTripEntries()).size === 0;
      tl.innerHTML = unifEmpty
        ? `<p class="muted">Nenhuma agenda selecionada na Agenda Completa. Marque 1 ou mais agendas em <b>Agendas</b> acima.</p>`
        : `<p class="muted">Nenhum cartão ou compromisso encontrado com os filtros atuais.</p>`;
      return;
    }
    tl.innerHTML = s.map(a => {
      const metaObj = unified ? core.unifiedMetaMap?.get(a) : null;
      const conf = unified ? core.unifiedConflictMap?.get(a) : null;
      const umode = metaObj ? metaObj.mode : "professional";
      const info = metaObj ? core.getTypeInfoAny(a) : getProTypeInfo(a.type);
      const d = core.parseD(a.start);
      const finTxt = umode === "personal" ? (a.city || "") : formatProFinShort(a);
      const attCount = Array.isArray(a.attachments) ? a.attachments.length : 0;
      const meta = [
        `${core.days(a)} dia(s)`,
        a.startTime ? `🕒 ${a.startTime}` : "",
        umode !== "personal" && a.columnTitle ? `Lista: ${a.columnTitle}` : "",
        a.client ? `Cliente: ${a.client}` : "",
        a.location ? `📍 ${a.location}` : "",
        umode !== "personal" && a.progress > 0 ? `${a.progress}%` : "",
        finTxt,
        a.notes || "",
        conf ? `⚠️ ${conf.summary}` : ""
      ].filter(Boolean).join(" · ");
      const badgesHtml = metaObj ? core.renderUnifiedCardSubBadges(a) : getCardTripBadgeHTML(a);
      const tCol = info.isCustom && info.color ? `--t-color:${core.esc(info.color)};` : "";
      const unifStyle = `${metaObj ? `--cal-color:${metaObj.calColor};` : ""}${tCol}`;
      return `<div class="tl-item ${info.cls}${conf ? " has-conflict" : ""}" data-id="${core.esc(a.id)}" data-umode="${umode}" style="${unifStyle}">
        <div class="date-badge"><b>${d.getDate()}</b>${core.MON[d.getMonth()]}</div>
        <div class="tl-body">
          <div class="tl-top">
            <span class="tl-title">${info.icon} ${core.esc(a.name)} ${badgesHtml} ${attCount ? `<small class="muted">📎 ${attCount}</small>` : ""}</span>
            <span class="chip ${info.cls}"${tCol ? ` style="${tCol}"` : ""}>${core.esc(info.short)}</span>
          </div>
          <div class="tl-meta">${core.WD[d.getDay()]} · ${core.fmtBR(a.start)}${core.days(a) > 1 ? ` até ${core.fmtBR(a.end)}` : ""}</div>
          <div class="tl-meta">${core.esc(meta)}</div>
        </div>
      </div>`;
    }).join("");
    tl.querySelectorAll(".tl-item[data-id]").forEach(el => {
      el.onclick = () => {
        if (el.dataset.umode === "personal") core.openModal(el.dataset.id);
        else openProCardModal(el.dataset.id);
      };
    });
  }

  /* ---------- 2B. MAPA DE EVENTOS & VIAGENS DOS RESPONSÁVEIS ---------- */
  const PRO_MENU_ITEMS = [
    { id: "pro-board",     tabId: "tab-pro-board",     label: "🗂️ Quadro" },
    { id: "pro-gantt",     tabId: "tab-pro-gantt",     label: "📅 Gantt & Timeline" },
    { id: "pro-map",       tabId: "tab-pro-map",       label: "🗺️ Mapa" },
    { id: "pro-dashboard", tabId: "tab-pro-dashboard", label: "📊 Dashboard" },
    { id: "pro-finance",   tabId: "tab-pro-finance",   label: "💼 Financeiro" },
    { id: "pro-table",     tabId: "tab-pro-table",     label: "🧾 Tabela" },
    { id: "pro-checklist", tabId: "tab-pro-checklist", label: "✅ Checklist" }
  ];

  const PRO_DASH_WIDGETS = [
    { id: "kpisExecution", label: "🎯 KPIs de Execução & Prazos" },
    { id: "kpisFinance",   label: "💵 KPIs Financeiros (Recebimentos, Despesas e Saldo)" },
    { id: "upcomingCard",  label: "📅 Cartão: Próximos Compromissos & Prazos" },
    { id: "financeCard",   label: "💼 Cartão: Resumo Financeiro & Agenda" },
    { id: "chartStage",    label: "🗂️ Gráfico: Distribuição por Lista (Funil)" },
    { id: "chartType",     label: "📊 Gráfico: Carga por Tipo & Categoria" },
    { id: "chartStatus",   label: "🍩 Gráfico Rosca: Status & Saúde dos Prazos" },
    { id: "chartAssignee", label: "👤 Gráfico: Carga por Responsável & Viagens" },
    { id: "chartPriority", label: "🚦 Gráfico: Distribuição por Prioridade" },
    { id: "chartMonthly",  label: "📈 Gráfico: Evolução Mensal de Entregas" }
  ];

  function getVisibleProMenus(stOpt = null) {
    const st = stOpt || core?.getState?.() || {};
    const cfg = st.params?.visibleMenus;
    const out = {};
    PRO_MENU_ITEMS.forEach(m => {
      out[m.id] = (cfg && typeof cfg === "object" && m.id in cfg) ? Boolean(cfg[m.id]) : true;
    });
    return out;
  }

  function getProDashWidgetsCfg(stOpt = null) {
    const st = stOpt || core?.getState?.() || {};
    const cfg = st.params?.dashWidgets;
    const out = {};
    PRO_DASH_WIDGETS.forEach(w => {
      out[w.id] = (cfg && typeof cfg === "object" && w.id in cfg) ? Boolean(cfg[w.id]) : true;
    });
    return out;
  }

  function applyProVisibleMenusUI() {
    const vis = getVisibleProMenus();
    PRO_MENU_ITEMS.forEach(m => {
      const btn = document.getElementById(m.tabId);
      if (btn) btn.hidden = !vis[m.id];
    });
    const activeTab = document.querySelector("#tabsPro .tab.active");
    if (activeTab && activeTab.hidden) {
      const firstVis = PRO_MENU_ITEMS.find(m => vis[m.id]);
      core?.switchProView?.(firstVis ? firstVis.id : "pro-params");
    }
  }

  let proMapRenderSeq = 0;
  let proMapInstance = null;
  let proMapCachedGroups = [];
  let proMapActiveGroupKey = "";
  let proMapActiveCardId = "";
  let proMapTableSort = { col: "start", dir: "asc" };
  let proMapExploded = false;
  let proMapMarkers = [];
  let proMapPolylines = [];
  let proMapZoomListener = null;
  let proMapZoomTimer = null;
  let proMapMarkerClass = null;
  let proMapExplodedPosByCardId = new Map();

  function updateProMapExplodeBtn(totalCards = 0) {
    const host = $("#proMapFloatControls");
    const btn = $("#btnProMapExplode");
    const badge = $("#proMapExplodeBadge");
    if (host) host.hidden = totalCards <= 0;
    if (!btn) return;
    btn.classList.toggle("is-exploded", proMapExploded);
    btn.setAttribute("aria-pressed", proMapExploded ? "true" : "false");
    const ico = $(".pro-map-explode-ico", btn);
    const lbl = $(".pro-map-explode-lbl", btn);
    if (ico) ico.textContent = proMapExploded ? "📍" : "💥";
    if (lbl) lbl.textContent = proMapExploded ? "Agrupar locais" : "Explodir mapa";
    btn.title = proMapExploded
      ? "Voltar ao modo agrupado por localidade"
      : "Expandir e mostrar todas as missões separadas no mapa de uma só vez";
    if (badge) {
      badge.textContent = String(totalCards);
      badge.hidden = totalCards <= 0;
    }
  }

  function clearProMapOverlays() {
    proMapMarkers.forEach(m => { try { m.map = null; } catch {} });
    proMapMarkers = [];
    proMapPolylines.forEach(p => { try { p.setMap(null); } catch {} });
    proMapPolylines = [];
    proMapExplodedPosByCardId.clear();
  }

  function latLngToWorldPx(lat, lng, zoom) {
    const scale = 256 * Math.pow(2, zoom);
    const x = ((lng + 180) / 360) * scale;
    const sinLat = Math.max(-0.9999, Math.min(0.9999, Math.sin((lat * Math.PI) / 180)));
    const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
    return { x, y };
  }

  function worldPxToLatLng(x, y, zoom) {
    const scale = 256 * Math.pow(2, zoom);
    const lng = (x / scale) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / scale;
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return {
      lat: Math.max(-85, Math.min(85, lat)),
      lng: ((lng + 540) % 360) - 180
    };
  }

  function createExplodedMissionInnerHTML(card, group, isMobile = false) {
    const asgList = getCardAssigneesList(card);
    const primaryAsg = asgList.find(e => e.travels) || asgList[0];
    const hasTraveler = asgList.some(e => e.travels);
    const tagCol = primaryAsg ? colorForAssignee(primaryAsg.name).hex : (getProTypeInfo(card?.type).color || "#38bdf8");
    const maxLen = isMobile ? 16 : 24;
    const rawName = String(card?.name || "Sem título");
    const shortName = rawName.length > maxLen ? rawName.slice(0, maxLen - 1) + "…" : rawName;
    const dtChip = (!isMobile && card?.start)
      ? `<span class="pro-map-mission-dt">${core.esc(core.fmtShortBR(card.start))}</span>`
      : "";
    const pinIcon = hasTraveler ? "✈️" : "📍";
    const dur = cardDurationDays(card);
    const dtFull = card?.start ? `${core.fmtBR(card.start)}${card.end && card.end !== card.start ? ` – ${core.fmtBR(card.end)}` : ""} (${dur}d)` : "Sem data";
    const asgStr = asgList.length ? ` · ${asgList.map(e => e.name).join(", ")}` : "";
    const tooltip = `${rawName} — ${group.cityLabel} · ${dtFull}${asgStr}`;
    return {
      tagCol,
      shortName,
      hasDt: Boolean(dtChip),
      tooltip,
      html: `<span class="pro-map-marker-pin">${pinIcon}</span><span class="pro-map-marker-txt">${core.esc(shortName)}</span>${dtChip}`
    };
  }

  function layoutExplodedPointsPx(groups, toAnchorPx, boundsBox = null, isMobile = false) {
    const anchors = [];
    const items = [];
    const baseRx = isMobile ? 74 : 104;
    const baseRy = isMobile ? 42 : 52;

    groups.forEach(g => {
      const ancPt = toAnchorPx(g);
      const ax = ancPt.x;
      const ay = ancPt.y;
      const sortedCards = g.cards.slice().sort((a, b) =>
        String(a.start || a.end || "9999-99-99").localeCompare(String(b.start || b.end || "9999-99-99")) ||
        String(a.name || "").localeCompare(String(b.name || ""))
      );
      const n = sortedCards.length;
      const anchorRec = { group: g, ax, ay, hasSpread: n > 1 };
      anchors.push(anchorRec);

      // Distribui múltiplos cartões em anéis elípticos concêntricos sem sobreposição inicial
      let remaining = n;
      let ringIdx = 0;
      let cursor = 0;
      const ringSlots = [];
      while (remaining > 0) {
        const cap = Math.min(remaining, 6 + ringIdx * 4);
        ringSlots.push({ ringIdx, cap, start: cursor });
        cursor += cap;
        remaining -= cap;
        ringIdx++;
      }

      sortedCards.forEach((card, idx) => {
        const meta = createExplodedMissionInnerHTML(card, g, isMobile);
        const w = isMobile
          ? Math.min(166, Math.max(88, Math.ceil(meta.shortName.length * 7.2 + 40)))
          : Math.min(244, Math.max(96, Math.ceil(meta.shortName.length * 7.6 + 46 + (meta.hasDt ? 48 : 0))));
        const h = isMobile ? 31 : 34;

        let sx = ax;
        let sy = ay;
        if (n > 1) {
          const slot = ringSlots.find(s => idx >= s.start && idx < s.start + s.cap) || ringSlots[0];
          const posInRing = idx - slot.start;
          const scale = 1 + slot.ringIdx * 0.85;
          const angleOffset = -Math.PI / 2 + (slot.ringIdx % 2) * (Math.PI / Math.max(1, slot.cap));
          const theta = angleOffset + (2 * Math.PI * posInRing) / Math.max(1, slot.cap);
          sx = ax + Math.cos(theta) * baseRx * scale;
          sy = ay + Math.sin(theta) * baseRy * scale;
        }

        items.push({
          card,
          group: g,
          anchorRec,
          meta,
          ax,
          ay,
          x: sx,
          y: sy,
          w,
          h,
          isMulti: n > 1
        });
      });
    });

    // Solver iterativo AABB em espaço de pixels: elimina 100% das colisões dentro e entre cidades vizinhas
    const padX = isMobile ? 7 : 10;
    const padY = isMobile ? 7 : 9;
    const hubRadius = isMobile ? 16 : 18;

    const clampItem = (A) => {
      if (!boundsBox) return;
      const loX = boundsBox.minX + A.w / 2;
      const hiX = boundsBox.maxX - A.w / 2;
      const loY = boundsBox.minY + A.h / 2;
      const hiY = boundsBox.maxY - A.h / 2;
      if (hiX >= loX) A.x = Math.max(loX, Math.min(hiX, A.x));
      if (hiY >= loY) A.y = Math.max(loY, Math.min(hiY, A.y));
    };

    const getActiveHubs = () => anchors.filter(anc =>
      anc.group.cards.length > 1 ||
      items.some(it => it.anchorRec === anc && Math.hypot(it.x - anc.ax, it.y - anc.ay) > 4)
    );

    for (let iter = 0; iter < 120; iter++) {
      let movedAny = false;

      // 1. Repulsão pílula vs pílula (ciente das bordas quando limitado a boundsBox)
      for (let i = 0; i < items.length; i++) {
        const A = items[i];
        for (let j = i + 1; j < items.length; j++) {
          const B = items[j];
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const minDx = (A.w + B.w) / 2 + padX;
          const minDy = (A.h + B.h) / 2 + padY;
          const ovX = minDx - Math.abs(dx);
          const ovY = minDy - Math.abs(dy);
          if (ovX > 0 && ovY > 0) {
            movedAny = true;
            if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
              const ang = ((i * 7 + j * 13) % 12) * (Math.PI / 6);
              A.x -= Math.cos(ang) * 16;
              A.y -= Math.sin(ang) * 12;
              B.x += Math.cos(ang) * 16;
              B.y += Math.sin(ang) * 12;
            } else {
              const nearYWall = boundsBox && (
                A.y <= boundsBox.minY + A.h / 2 + 2 || A.y >= boundsBox.maxY - A.h / 2 - 2 ||
                B.y <= boundsBox.minY + B.h / 2 + 2 || B.y >= boundsBox.maxY - B.h / 2 - 2
              );
              const nearXWall = boundsBox && (
                A.x <= boundsBox.minX + A.w / 2 + 2 || A.x >= boundsBox.maxX - A.w / 2 - 2 ||
                B.x <= boundsBox.minX + B.w / 2 + 2 || B.x >= boundsBox.maxX - B.w / 2 - 2
              );
              const preferX = (nearYWall && !nearXWall) ? true : ((nearXWall && !nearYWall) ? false : (ovX / minDx <= ovY / minDy));
              if (preferX) {
                const sx = dx >= 0 ? 1 : -1;
                const push = ovX * 0.54;
                A.x -= sx * push;
                B.x += sx * push;
              } else {
                const sy = dy >= 0 ? 1 : -1;
                const push = ovY * 0.54;
                A.y -= sy * push;
                B.y += sy * push;
              }
            }
          }
        }
      }

      // 2. Repulsão pílula vs nós centrais de cidades (evita tampar qualquer ponto hub)
      const activeHubs = getActiveHubs();
      for (let hIdx = 0; hIdx < activeHubs.length; hIdx++) {
        const hub = activeHubs[hIdx];
        for (let i = 0; i < items.length; i++) {
          const A = items[i];
          const dx = A.x - hub.ax;
          const dy = A.y - hub.ay;
          const minDx = A.w / 2 + hubRadius;
          const minDy = A.h / 2 + hubRadius;
          const ovX = minDx - Math.abs(dx);
          const ovY = minDy - Math.abs(dy);
          if (ovX > 0 && ovY > 0) {
            movedAny = true;
            if (ovX / minDx <= ovY / minDy) {
              A.x += (dx >= 0 ? 1 : -1) * (ovX * 0.78 + 1);
            } else {
              A.y += (dy >= 0 ? 1 : -1) * (ovY * 0.78 + 1);
            }
          }
        }
      }

      // 3. Elástico suave mantendo missões próximas de suas cidades (apenas nas 40 primeiras passagens)
      if (iter < 40) {
        for (let i = 0; i < items.length; i++) {
          const A = items[i];
          const dist = Math.hypot(A.x - A.ax, A.y - A.ay);
          const minPullDist = A.isMulti ? (isMobile ? 48 : 64) : 0;
          if (dist > minPullDist + 6) {
            const k = A.isMulti ? 0.02 : 0.032;
            A.x += (A.ax - A.x) * k;
            A.y += (A.ay - A.y) * k;
          }
        }
      }

      if (boundsBox) {
        for (let i = 0; i < items.length; i++) clampItem(items[i]);
      }

      if (!movedAny && iter >= 42) break;
    }

    // 4. Garantia estrita final em container limitado (Fallback SVG): busca em espiral por vaga 100% livre
    if (boundsBox) {
      const calcPenalty = (idx, cx, cy, activeHubs) => {
        const A = items[idx];
        let pen = 0;
        for (let j = 0; j < items.length; j++) {
          if (j === idx) continue;
          const B = items[j];
          const ox = (A.w + B.w) / 2 + 4 - Math.abs(cx - B.x);
          const oy = (A.h + B.h) / 2 + 4 - Math.abs(cy - B.y);
          if (ox > 0 && oy > 0) pen += ox * oy;
        }
        for (let h = 0; h < activeHubs.length; h++) {
          const hub = activeHubs[h];
          const ox = A.w / 2 + 14 - Math.abs(cx - hub.ax);
          const oy = A.h / 2 + 14 - Math.abs(cy - hub.ay);
          if (ox > 0 && oy > 0) pen += ox * oy * 1.2;
        }
        return pen;
      };

      for (let pass = 0; pass < 3; pass++) {
        const activeHubs = getActiveHubs();
        let fixed = false;
        for (let i = 0; i < items.length; i++) {
          const A = items[i];
          const curPen = calcPenalty(i, A.x, A.y, activeHubs);
          if (curPen <= 0) continue;
          const loX = boundsBox.minX + A.w / 2;
          const hiX = boundsBox.maxX - A.w / 2;
          const loY = boundsBox.minY + A.h / 2;
          const hiY = boundsBox.maxY - A.h / 2;
          let bestX = A.x, bestY = A.y, bestPen = curPen, bestDist = Infinity;
          for (let r = 20; r <= 320; r += 18) {
            for (let a = 0; a < 24; a++) {
              const ang = (a * Math.PI * 2) / 24;
              const cx = hiX >= loX ? Math.max(loX, Math.min(hiX, A.ax + Math.cos(ang) * r)) : A.x;
              const cy = hiY >= loY ? Math.max(loY, Math.min(hiY, A.ay + Math.sin(ang) * r)) : A.y;
              const pen = calcPenalty(i, cx, cy, activeHubs);
              const dist = Math.hypot(cx - A.ax, cy - A.ay);
              if (pen < bestPen || (pen === 0 && bestPen === 0 && dist < bestDist)) {
                bestPen = pen;
                bestX = cx;
                bestY = cy;
                bestDist = dist;
              }
            }
            if (bestPen === 0) break;
          }
          if (bestPen < curPen) {
            A.x = bestX;
            A.y = bestY;
            fixed = true;
          }
        }
        if (!fixed) break;
      }
    }

    items.forEach(it => {
      it.movedPx = Math.hypot(it.x - it.ax, it.y - it.ay);
      if (it.movedPx > 4) it.anchorRec.hasSpread = true;
    });

    return { anchors, items };
  }

  function shortLocationCityName(rawLoc) {
    const clean = String(rawLoc || "").trim();
    if (!clean) return "Sem local";
    const parts = clean.split(",").map(s => s.trim()).filter(Boolean);
    const first = parts[0] || clean;
    if (parts.length >= 2 && parts[1].length <= 24 && !/brasil|brazil/i.test(parts[1])) {
      return `${first} (${parts[1]})`;
    }
    return first;
  }

  function cardDurationDays(a) {
    if (!a || !a.start) return 1;
    return Math.max(1, core.days(a));
  }

  async function resolveCardCoordinates(card) {
    if (card.locationLat != null && card.locationLng != null && isFinite(Number(card.locationLat)) && isFinite(Number(card.locationLng))) {
      return { lat: Number(card.locationLat), lng: Number(card.locationLng) };
    }
    const locStr = String(card.location || "").trim();
    if (!locStr) return null;
    if (window.FeriasMaps?.resolvePlaceStandard) {
      const res = await window.FeriasMaps.resolvePlaceStandard(locStr);
      if (res && isFinite(res.lat) && isFinite(res.lng)) {
        card.locationLat = res.lat;
        card.locationLng = res.lng;
        return { lat: res.lat, lng: res.lng };
      }
    }
    return null;
  }

  function clusterMapGroupsByProximity(rawGroups) {
    const sorted = rawGroups.slice().sort((a, b) => b.cards.length - a.cards.length);
    const clusters = [];
    const THRESHOLD_DEG = 0.14; // ~15 km — agrupa marcadores da mesma cidade/região sem sobrepor

    sorted.forEach(g => {
      const match = clusters.find(cl => Math.hypot(cl.lat - g.lat, cl.lng - g.lng) <= THRESHOLD_DEG);
      if (match) {
        g.cards.forEach(c => {
          if (!match.cards.some(x => x.id === c.id)) match.cards.push(c);
        });
      } else {
        const city = shortLocationCityName(g.label);
        clusters.push({
          key: `cl_${clusters.length}_${g.lat.toFixed(3)}_${g.lng.toFixed(3)}`,
          lat: g.lat,
          lng: g.lng,
          label: g.label,
          cityLabel: city,
          cards: [...g.cards]
        });
      }
    });

    // Segunda passagem: se dois clusters distintos ficarem próximos visualmente, calcula offset radial (spiderfy suave) para nunca colidir
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const A = clusters[i], B = clusters[j];
        const dist = Math.hypot(A.lat - B.lat, A.lng - B.lng);
        if (dist > 0 && dist < 0.45) {
          const angle = Math.atan2(B.lat - A.lat, B.lng - A.lng) || (j * 1.1);
          const push = (0.45 - dist) * 0.5;
          B.displayLat = (B.displayLat ?? B.lat) + Math.sin(angle) * push;
          B.displayLng = (B.displayLng ?? B.lng) + Math.cos(angle) * push;
        }
      }
    }
    clusters.forEach(cl => {
      if (cl.displayLat == null) cl.displayLat = cl.lat;
      if (cl.displayLng == null) cl.displayLng = cl.lng;
    });
    return clusters;
  }

  function closeProMapInspector() {
    proMapActiveGroupKey = "";
    proMapActiveCardId = "";
    const insp = $("#proMapInspector");
    const back = $("#proMapInspectorBackdrop");
    if (insp) { insp.hidden = true; insp.innerHTML = ""; }
    if (back) back.hidden = true;
    document.querySelectorAll(".pro-map-marker-pill.is-active, .pro-map-hub-node.is-active").forEach(el => el.classList.remove("is-active"));
    document.querySelectorAll("#proMapTripsTable tr.is-active, #proMapTripsMobileCards .m-card.is-active").forEach(el => el.classList.remove("is-active"));
  }

  function syncActiveMapHighlights() {
    document.querySelectorAll("[data-map-group-key]").forEach(el => {
      const match = el.dataset.mapGroupKey === proMapActiveGroupKey && (!proMapExploded || !proMapActiveCardId);
      el.classList.toggle("is-active", match);
    });
    document.querySelectorAll("[data-map-card-id]").forEach(el => {
      el.classList.toggle("is-active", el.dataset.mapCardId === proMapActiveCardId);
    });
    document.querySelectorAll("[data-map-row-card]").forEach(el => {
      el.classList.toggle("is-active", el.dataset.mapRowCard === proMapActiveCardId);
    });
  }

  function buildCardSummaryDetailHTML(c, groupOpt = null) {
    const cols = getMergedColumns();
    const info = getProTypeInfo(c.type);
    const done = isCardDone(c, cols);
    const dur = cardDurationDays(c);
    const periodStr = c.start
      ? `${core.fmtBR(c.start)}${c.end && c.end !== c.start ? ` até ${core.fmtBR(c.end)}` : ""} (${dur} ${dur === 1 ? "dia" : "dias"})`
      : "Sem data definida";
    const asgBadges = renderAssigneeBadgesHTML(c) || `<span class="muted small">Sem responsável atribuído</span>`;
    const colTitle = cols.find(col => col.id === c.columnId)?.title || c.columnTitle || "Sem lista";
    const typeColStyle = info.isCustom && info.color ? ` style="--t-color:${core.esc(info.color)}"` : "";
    const backBtn = (groupOpt && groupOpt.cards.length > 1)
      ? `<button type="button" class="btn ghost small" id="btnProMapInspBack">← Voltar para ${core.esc(groupOpt.cityLabel)} (${groupOpt.cards.length})</button>`
      : "";

    return `
      <div class="pro-map-insp-drag" aria-hidden="true"></div>
      <div class="pro-map-insp-head">
        <div style="min-width:0;flex:1">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
            <span class="chip ${info.cls}"${typeColStyle}>${info.icon} ${core.esc(info.short)}</span>
            <span class="pill ${done ? "ok" : ""}">${done ? "✅ Concluído" : `⏳ ${core.esc(colTitle)} (${c.progress || 0}%)`}</span>
            ${c.priority ? `<span class="pill">${core.esc(c.priority)}</span>` : ""}
          </div>
          <h3 class="pro-map-insp-title">${core.esc(c.name)}</h3>
        </div>
        <button type="button" class="icon-btn" id="btnProMapInspClose" aria-label="Fechar resumo">✕</button>
      </div>
      <div class="pro-map-insp-body">
        <div class="pro-map-insp-row">
          <span class="pro-map-insp-lbl">📍 Localidade</span>
          <strong>${core.esc(c.location || groupOpt?.label || "—")}</strong>
        </div>
        <div class="pro-map-insp-row">
          <span class="pro-map-insp-lbl">📅 Período &amp; Duração</span>
          <strong>${core.esc(periodStr)}${c.startTime ? ` · 🕒 ${core.esc(c.startTime)}${c.endTime ? `–${core.esc(c.endTime)}` : ""}` : ""}</strong>
        </div>
        <div class="pro-map-insp-row">
          <span class="pro-map-insp-lbl">👤 Responsável(is) / Participantes</span>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:2px">${asgBadges}</div>
        </div>
        ${c.client ? `<div class="pro-map-insp-row"><span class="pro-map-insp-lbl">🏢 Cliente / Conta</span><span>${core.esc(c.client)}</span></div>` : ""}
        ${c.meetingLink ? `<div class="pro-map-insp-row"><span class="pro-map-insp-lbl">🔗 Link da Reunião</span><a href="${core.esc(c.meetingLink)}" target="_blank" rel="noopener" style="color:var(--accent2);word-break:break-all">${core.esc(c.meetingLink)} ↗</a></div>` : ""}
        ${c.notes ? `<div class="pro-map-insp-row"><span class="pro-map-insp-lbl">📝 Notas</span><span class="muted small">${core.esc(c.notes)}</span></div>` : ""}
      </div>
      <div class="pro-map-insp-foot">
        ${backBtn}
        <button type="button" class="btn primary small" id="btnProMapInspEdit" style="margin-left:auto">✏️ Ver detalhes completos / Editar</button>
      </div>
    `;
  }

  function buildClusterListInspectorHTML(group) {
    const cols = getMergedColumns();
    const totalDays = group.cards.reduce((s, c) => s + cardDurationDays(c), 0);
    const itemsHtml = group.cards.map(c => {
      const info = getProTypeInfo(c.type);
      const done = isCardDone(c, cols);
      const dur = cardDurationDays(c);
      const dtStr = c.start ? `${core.fmtShortBR(c.start)}${c.end && c.end !== c.start ? `–${core.fmtShortBR(c.end)}` : ""} (${dur}d)` : "Sem data";
      const asgBadges = renderAssigneeBadgesHTML(c);
      const typeColStyle = info.isCustom && info.color ? ` style="--t-color:${core.esc(info.color)}"` : "";
      return `<div class="pro-map-cluster-item" data-insp-pick-card="${core.esc(c.id)}">
        <div class="pro-map-cluster-item-top">
          <span class="chip ${info.cls}"${typeColStyle}>${info.icon} ${core.esc(info.short)}</span>
          <span class="muted small">📅 ${core.esc(dtStr)}</span>
          <span class="pill ${done ? "ok" : ""}" style="margin-left:auto;font-size:0.66rem">${done ? "✅ 100%" : `${c.progress || 0}%`}</span>
        </div>
        <strong class="pro-map-cluster-item-title">${core.esc(c.name)}</strong>
        ${asgBadges ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px">${asgBadges}</div>` : ""}
      </div>`;
    }).join("");

    return `
      <div class="pro-map-insp-drag" aria-hidden="true"></div>
      <div class="pro-map-insp-head">
        <div style="min-width:0;flex:1">
          <span class="pill" style="margin-bottom:4px">📍 ${group.cards.length} cartões · ${totalDays} dia(s) acumulados</span>
          <h3 class="pro-map-insp-title">${core.esc(group.cityLabel)}</h3>
          <div class="muted small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${core.esc(group.label)}</div>
        </div>
        <button type="button" class="icon-btn" id="btnProMapInspClose" aria-label="Fechar lista do local">✕</button>
      </div>
      <div class="pro-map-cluster-list">
        ${itemsHtml}
      </div>
    `;
  }

  function openProMapInspector({ group = null, card = null, panMap = true } = {}) {
    const insp = $("#proMapInspector");
    const back = $("#proMapInspectorBackdrop");
    if (!insp) return;

    const resolvedGroup = group || (card ? proMapCachedGroups.find(g => g.cards.some(x => x.id === card.id)) : null);
    proMapActiveGroupKey = resolvedGroup?.key || "";
    proMapActiveCardId = card ? card.id : (resolvedGroup?.cards.length === 1 ? resolvedGroup.cards[0].id : "");

    if (panMap && resolvedGroup && proMapInstance) {
      try {
        const explodedPos = (proMapExploded && card) ? proMapExplodedPosByCardId.get(card.id) : null;
        const targetPos = explodedPos || { lat: resolvedGroup.displayLat ?? resolvedGroup.lat, lng: resolvedGroup.displayLng ?? resolvedGroup.lng };
        proMapInstance.panTo(targetPos);
        if (!proMapExploded && (proMapInstance.getZoom?.() || 5) < 7) proMapInstance.setZoom(8);
      } catch {}
    }

    const targetCard = card || (resolvedGroup && resolvedGroup.cards.length === 1 ? resolvedGroup.cards[0] : null);
    if (targetCard) {
      insp.innerHTML = buildCardSummaryDetailHTML(targetCard, resolvedGroup);
    } else if (resolvedGroup) {
      insp.innerHTML = buildClusterListInspectorHTML(resolvedGroup);
    } else {
      return closeProMapInspector();
    }

    insp.hidden = false;
    if (back) back.hidden = window.innerWidth >= 768;
    syncActiveMapHighlights();

    const closeBtn = $("#btnProMapInspClose", insp);
    if (closeBtn) closeBtn.onclick = closeProMapInspector;
    if (back) back.onclick = closeProMapInspector;

    const editBtn = $("#btnProMapInspEdit", insp);
    if (editBtn && targetCard) {
      editBtn.onclick = () => openProCardModal(targetCard.id);
    }
    const backListBtn = $("#btnProMapInspBack", insp);
    if (backListBtn && resolvedGroup) {
      backListBtn.onclick = () => openProMapInspector({ group: resolvedGroup, card: null, panMap: false });
    }
    insp.querySelectorAll("[data-insp-pick-card]").forEach(el => {
      el.onclick = () => {
        const picked = resolvedGroup?.cards.find(x => x.id === el.dataset.inspPickCard);
        if (picked) openProMapInspector({ group: resolvedGroup, card: picked, panMap: false });
      };
    });
  }

  function createClusterMarkerInnerHTML(g) {
    const count = g.cards.length;
    const firstCard = g.cards[0];
    const asgList = getCardAssigneesList(firstCard);
    const primaryAsg = asgList.find(e => e.travels) || asgList[0];
    const tagCol = primaryAsg ? colorForAssignee(primaryAsg.name).hex : (getProTypeInfo(firstCard?.type).color || "#38bdf8");
    const isSingle = count === 1;
    const mainTxt = isSingle
      ? `${g.cityLabel} · ${firstCard.name.length > 22 ? firstCard.name.slice(0, 21) + "…" : firstCard.name}`
      : `${g.cityLabel}`;
    const countBadge = count > 1
      ? `<span class="pro-map-marker-count">${count}</span>`
      : "";
    return {
      tagCol,
      html: `<span class="pro-map-marker-pin">📍</span><span class="pro-map-marker-txt">${core.esc(mainTxt)}</span>${countBadge}`
    };
  }

  function renderProMapFallbackSvg(canvas, groups) {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const bg = isLight ? "#e2e8f0" : "#0b1325";
    const gridCol = isLight ? "rgba(15,23,42,0.08)" : "rgba(148,163,184,0.1)";
    const isMobile = window.innerWidth < 768;
    if (!groups.length) {
      canvas.innerHTML = `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;gap:8px">
        <div style="font-size:1.8rem">🗺️</div>
        <strong>Nenhum cartão com local para exibir neste filtro</strong>
        <span class="muted small">Preencha o campo <b>Local</b> nos cartões (ex: Brasília, São Paulo, Rio de Janeiro...) para visualizá-los no mapa e no dashboard analítico abaixo.</span>
      </div>`;
      return;
    }
    const lats = groups.map(g => (proMapExploded ? g.lat : (g.displayLat ?? g.lat)));
    const lngs = groups.map(g => (proMapExploded ? g.lng : (g.displayLng ?? g.lng)));
    let minLat = Math.min(...lats) - 2.5, maxLat = Math.max(...lats) + 2.5;
    let minLng = Math.min(...lngs) - 3.5, maxLng = Math.max(...lngs) + 3.5;
    if (maxLat - minLat < 4) { minLat -= 2; maxLat += 2; }
    if (maxLng - minLng < 5) { minLng -= 2.5; maxLng += 2.5; }

    const rect = canvas.getBoundingClientRect();
    const W = Math.max(320, Math.round(rect.width || canvas.clientWidth || 720));
    const H = Math.max(300, Math.round(rect.height || canvas.clientHeight || 420));

    if (proMapExploded) {
      const padX = Math.max(48, Math.round(W * 0.12));
      const padYTop = 64;
      const padYBot = 46;
      const usableW = Math.max(120, W - padX * 2);
      const usableH = Math.max(120, H - padYTop - padYBot);

      const { anchors, items } = layoutExplodedPointsPx(
        groups,
        g => ({
          x: padX + ((g.lng - minLng) / (maxLng - minLng)) * usableW,
          y: padYTop + (1 - (g.lat - minLat) / (maxLat - minLat)) * usableH
        }),
        { minX: 8, maxX: W - 8, minY: 56, maxY: H - 8 },
        isMobile
      );

      const linesSvg = items
        .filter(it => it.movedPx > 4 || it.group.cards.length > 1)
        .map(it => `<line x1="${it.ax.toFixed(1)}" y1="${it.ay.toFixed(1)}" x2="${it.x.toFixed(1)}" y2="${it.y.toFixed(1)}" stroke="${core.esc(it.meta.tagCol)}" stroke-width="1.8" stroke-opacity="${isLight ? "0.62" : "0.7"}" stroke-dasharray="4 3" />`)
        .join("");

      const hubsHtml = anchors
        .filter(anc => anc.hasSpread)
        .map(anc => {
          const g = anc.group;
          const isAct = g.key === proMapActiveGroupKey && !proMapActiveCardId ? " is-active" : "";
          return `<button type="button" class="pro-map-hub-node${isAct}" data-map-group-key="${core.esc(g.key)}" style="position:absolute;left:${anc.ax.toFixed(1)}px;top:${anc.ay.toFixed(1)}px;transform:translate(-50%,-50%);z-index:4" title="📍 ${core.esc(g.cityLabel)} — ${g.cards.length} ${g.cards.length === 1 ? "missão" : "missões"}">${g.cards.length > 1 ? g.cards.length : ""}</button>`;
        }).join("");

      const pillsHtml = items.map(it => {
        const isAct = it.card.id === proMapActiveCardId ? " is-active" : "";
        return `<div class="pro-map-tag-group" style="position:absolute;left:${it.x.toFixed(1)}px;top:${it.y.toFixed(1)}px;transform:translate(-50%,-50%);z-index:${isAct ? 9 : 6}">
          <button type="button" class="pro-map-marker-pill pro-map-marker-pill--mission${isAct}" data-map-card-id="${core.esc(it.card.id)}" style="--tag-c:${core.esc(it.meta.tagCol)}" title="${core.esc(it.meta.tooltip)}">
            ${it.meta.html}
          </button>
        </div>`;
      }).join("");

      canvas.innerHTML = `<div style="position:relative;width:100%;height:100%;background:${bg};background-image:linear-gradient(${gridCol} 1px, transparent 1px),linear-gradient(90deg, ${gridCol} 1px, transparent 1px);background-size:44px 44px;overflow:hidden">
        <svg class="pro-map-spider-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${linesSvg}</svg>
        ${hubsHtml}
        ${pillsHtml}
      </div>`;

      canvas.querySelectorAll("[data-map-group-key]").forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          const grp = proMapCachedGroups.find(x => x.key === btn.dataset.mapGroupKey);
          if (grp) openProMapInspector({ group: grp, card: grp.cards.length === 1 ? grp.cards[0] : null, panMap: false });
        };
      });
      canvas.querySelectorAll("[data-map-card-id]").forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          const cid = btn.dataset.mapCardId;
          const grp = proMapCachedGroups.find(x => x.cards.some(c => c.id === cid));
          const crd = grp?.cards.find(c => c.id === cid);
          if (grp && crd) openProMapInspector({ group: grp, card: crd, panMap: false });
        };
      });
      return;
    }

    // Posicionamento sem colisão em pixels dentro do container para o fallback SVG (modo agrupado)
    const gPadX = Math.max(24, Math.round(W * 0.08));
    const gPadYTop = 64;
    const gPadYBot = 28;
    const gUsableW = Math.max(120, W - gPadX * 2);
    const gUsableH = Math.max(120, H - gPadYTop - gPadYBot);

    const nodes = groups.map(g => {
      const lat = g.displayLat ?? g.lat;
      const lng = g.displayLng ?? g.lng;
      const { tagCol, html } = createClusterMarkerInnerHTML(g);
      const labelTxt = g.cards.length === 1 ? `${g.cityLabel} · ${g.cards[0].name.slice(0, 22)}` : `${g.cityLabel} ${g.cards.length}`;
      const w = Math.min(isMobile ? 215 : 242, Math.max(106, Math.ceil(labelTxt.length * 7.5 + 48)));
      const h = 44;
      const x = gPadX + ((lng - minLng) / (maxLng - minLng)) * gUsableW;
      const y = gPadYTop + (1 - (lat - minLat) / (maxLat - minLat)) * gUsableH;
      return { g, tagCol, html, x, y, w, h };
    });

    for (let iter = 0; iter < 50; iter++) {
      let moved = false;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const A = nodes[i], B = nodes[j];
          const dx = B.x - A.x, dy = B.y - A.y;
          const minDx = (A.w + B.w) / 2 + 8;
          const minDy = (A.h + B.h) / 2 + 8;
          const ovX = minDx - Math.abs(dx);
          const ovY = minDy - Math.abs(dy);
          if (ovX > 0 && ovY > 0) {
            moved = true;
            const cantFitSideBySide = (A.w + B.w + 24) >= W;
            const nearXWall = A.x <= 10 + A.w / 2 || A.x >= W - 10 - A.w / 2 || B.x <= 10 + B.w / 2 || B.x >= W - 10 - B.w / 2;
            if (!cantFitSideBySide && !nearXWall && (ovX / minDx <= ovY / minDy)) {
              const s = dx >= 0 ? 1 : -1;
              A.x -= s * ovX * 0.52; B.x += s * ovX * 0.52;
            } else {
              const s = dy >= 0 ? 1 : -1;
              A.y -= s * ovY * 0.54; B.y += s * ovY * 0.54;
            }
          }
        }
      }
      nodes.forEach(A => {
        A.x = Math.max(8 + A.w / 2, Math.min(W - 8 - A.w / 2, A.x));
        A.y = Math.max(58 + A.h / 2, Math.min(H - 8 - A.h / 2, A.y));
      });
      if (!moved) break;
    }

    const pinsHtml = nodes.map(n => {
      const isAct = n.g.key === proMapActiveGroupKey ? " is-active" : "";
      return `<div class="pro-map-tag-group" style="position:absolute;left:${n.x.toFixed(1)}px;top:${n.y.toFixed(1)}px;transform:translate(-50%,-50%);z-index:5">
        <button type="button" class="pro-map-marker-pill${isAct}" data-map-group-key="${core.esc(n.g.key)}" style="--tag-c:${core.esc(n.tagCol)}" title="${core.esc(n.g.cityLabel)} (${n.g.cards.length} cartão/ões)">
          ${n.html}
        </button>
        <span class="pro-map-pin-dot" style="--tag-c:${core.esc(n.tagCol)}"></span>
      </div>`;
    }).join("");

    canvas.innerHTML = `<div style="position:relative;width:100%;height:100%;background:${bg};background-image:linear-gradient(${gridCol} 1px, transparent 1px),linear-gradient(90deg, ${gridCol} 1px, transparent 1px);background-size:44px 44px;overflow:hidden">
      ${pinsHtml}
    </div>`;
    canvas.querySelectorAll("[data-map-group-key]").forEach(btn => {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        const grp = proMapCachedGroups.find(x => x.key === btn.dataset.mapGroupKey);
        if (grp) openProMapInspector({ group: grp, card: grp.cards.length === 1 ? grp.cards[0] : null, panMap: false });
      };
    });
  }

  function renderProMapAnalytics(cards, groups) {
    const cols = getMergedColumns();
    const mapCards = groups.flatMap(g => g.cards);
    const totalTrips = mapCards.length;
    const totalDays = mapCards.reduce((sum, c) => sum + cardDurationDays(c), 0);
    const uniqueLocations = groups.length;

    const peopleSet = new Set();
    mapCards.forEach(c => {
      getCardAssigneesList(c).forEach(e => {
        if (e.name) peopleSet.add(e.name.trim());
      });
    });
    const uniquePeople = peopleSet.size;

    // 1. Cards de KPIs (grid-cols-2 no mobile, grid-cols-4 no desktop)
    const kpisEl = $("#proMapDashKpis");
    if (kpisEl) {
      const kpis = [
        ["Total de Viagens / Cartões", String(totalTrips), `${cards.length} cartão(ões) no filtro geral`, "#38bdf8"],
        ["Total de Dias", `${totalDays} ${totalDays === 1 ? "dia" : "dias"}`, totalTrips ? `Média de ${core.num(totalDays / totalTrips, 1)} d/cartão` : "Soma das durações", "#10b981"],
        ["Localidades Visitadas", String(uniqueLocations), uniqueLocations === 1 ? "1 destino único" : `${uniqueLocations} destinos únicos`, "#f59e0b"],
        ["Pessoas / Responsáveis", String(uniquePeople), uniquePeople === 1 ? "1 responsável envolvido" : `${uniquePeople} responsáveis únicos`, "#a855f7"]
      ];
      kpisEl.innerHTML = kpis.map(([lbl, val, sub, col]) => `
        <div class="kpi pro-map-kpi-card" style="--c:${col}">
          <div class="lbl">${lbl}</div>
          <div class="val">${val}</div>
          <div class="sub">${sub}</div>
        </div>
      `).join("");
    }

    // Agregações por Localidade
    const byLoc = groups.map(g => {
      const days = g.cards.reduce((s, c) => s + cardDurationDays(c), 0);
      return {
        key: g.key,
        city: g.cityLabel,
        fullLabel: g.label,
        trips: g.cards.length,
        days,
        group: g
      };
    });

    const renderHorizBarChart = (hostSel, items, valKey, unitSingular, unitPlural, barGradient, onPickItem) => {
      const host = $(hostSel);
      if (!host) return;
      if (!items.length) {
        host.innerHTML = `<p class="muted small" style="padding:14px 0;text-align:center">Sem dados para os filtros selecionados.</p>`;
        return;
      }
      const sorted = items.slice().sort((a, b) => b[valKey] - a[valKey] || a.label.localeCompare(b.label));
      const maxVal = Math.max(1, ...sorted.map(x => x[valKey]));
      host.innerHTML = `<div class="pro-map-hbars">${sorted.map((it, idx) => {
        const val = it[valKey];
        const pct = Math.max(6, Math.round((val / maxVal) * 100));
        const unit = val === 1 ? unitSingular : unitPlural;
        const barCol = it.color ? it.color : barGradient;
        const tooltip = it.tooltip || `${it.label}: ${val} ${unit}`;
        return `<button type="button" class="pro-map-hbar-row" data-hbar-idx="${idx}" data-tooltip="${core.esc(tooltip)}" title="${core.esc(tooltip)}">
          <div class="pro-map-hbar-top">
            <span class="pro-map-hbar-lbl">${core.esc(it.label)}</span>
            <b class="pro-map-hbar-val">${val} ${unit}</b>
          </div>
          <div class="pro-map-hbar-track">
            <div class="pro-map-hbar-fill" style="width:${pct}%;background:${barCol}"></div>
          </div>
        </button>`;
      }).join("")}</div>`;
      if (typeof onPickItem === "function") {
        host.querySelectorAll("[data-hbar-idx]").forEach(btn => {
          btn.onclick = () => {
            const it = sorted[parseInt(btn.dataset.hbarIdx, 10)];
            if (it) onPickItem(it);
          };
        });
      }
    };

    const locChartItems = byLoc.map(l => ({
      label: l.city,
      trips: l.trips,
      days: l.days,
      group: l.group,
      tooltip: `${l.city}: ${l.trips} viagem(ns)/cartão(ões) · ${l.days} dia(s)`
    }));

    // 2.1 Número de Viagens por Localidade
    renderHorizBarChart(
      "#proMapChartTripsByLoc",
      locChartItems,
      "trips",
      "viagem",
      "viagens",
      "linear-gradient(90deg, #2563eb, #38bdf8)",
      it => {
        if (it.group) {
          $("#proMapViewportCard")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          openProMapInspector({ group: it.group, card: it.group.cards.length === 1 ? it.group.cards[0] : null, panMap: true });
        }
      }
    );

    // 2.2 Total de Dias por Localidade
    renderHorizBarChart(
      "#proMapChartDaysByLoc",
      locChartItems,
      "days",
      "dia",
      "dias",
      "linear-gradient(90deg, #059669, #34d399)",
      it => {
        if (it.group) {
          $("#proMapViewportCard")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          openProMapInspector({ group: it.group, card: it.group.cards.length === 1 ? it.group.cards[0] : null, panMap: true });
        }
      }
    );

    // Agregações por Responsável
    const byPersonMap = new Map();
    mapCards.forEach(c => {
      const list = getCardAssigneesList(c);
      const dur = cardDurationDays(c);
      if (!list.length) {
        const k = "__none__";
        if (!byPersonMap.has(k)) {
          byPersonMap.set(k, { label: "Sem responsável", name: "__none__", trips: 0, days: 0, color: "#64748b" });
        }
        const b = byPersonMap.get(k);
        b.trips++;
        b.days += dur;
        return;
      }
      list.forEach(e => {
        const k = e.name.toLowerCase();
        if (!byPersonMap.has(k)) {
          byPersonMap.set(k, {
            label: e.name,
            name: e.name,
            trips: 0,
            days: 0,
            color: colorForAssignee(e.name).hex
          });
        }
        const b = byPersonMap.get(k);
        b.trips++;
        b.days += dur;
      });
    });
    const personChartItems = [...byPersonMap.values()].map(p => ({
      ...p,
      tooltip: `${p.label}: ${p.trips} viagem(ns) · ${p.days} dia(s)`
    }));

    // 2.3 Número de Viagens por Responsável
    renderHorizBarChart(
      "#proMapChartTripsByPerson",
      personChartItems,
      "trips",
      "viagem",
      "viagens",
      "linear-gradient(90deg, #6366f1, #a855f7)",
      it => {
        if (it.name) {
          proFilterAssignee = proFilterAssignee === it.name ? "" : it.name;
          applyAndRenderProFilteredViews();
        }
      }
    );

    // 2.4 Total de Dias por Responsável
    renderHorizBarChart(
      "#proMapChartDaysByPerson",
      personChartItems,
      "days",
      "dia",
      "dias",
      "linear-gradient(90deg, #d97706, #fbbf24)",
      it => {
        if (it.name) {
          proFilterAssignee = proFilterAssignee === it.name ? "" : it.name;
          applyAndRenderProFilteredViews();
        }
      }
    );

    // 2.5 Distribuição Temporal (Mensal) — Colunas interativas com tooltips
    const monthlyEl = $("#proMapChartMonthly");
    if (monthlyEl) {
      const byMonth = new Map();
      mapCards.forEach(c => {
        const iso = c.start || c.end;
        if (!iso || iso.length < 7) return;
        const ym = iso.slice(0, 7);
        if (!byMonth.has(ym)) byMonth.set(ym, { ym, trips: 0, days: 0 });
        const b = byMonth.get(ym);
        b.trips++;
        b.days += cardDurationDays(c);
      });
      const mList = [...byMonth.values()].sort((a, b) => a.ym.localeCompare(b.ym));
      if (!mList.length) {
        monthlyEl.innerHTML = `<p class="muted small" style="padding:14px 0;text-align:center">Adicione datas aos cartões com local para visualizar a distribuição mensal.</p>`;
      } else {
        const maxTrips = Math.max(1, ...mList.map(m => m.trips));
        const maxDays = Math.max(1, ...mList.map(m => m.days));
        monthlyEl.innerHTML = `
          <div class="fin-legend" style="margin-bottom:6px">
            <span><i style="background:#38bdf8"></i> Viagens / Cartões</span>
            <span><i style="background:#10b981"></i> Total de Dias</span>
          </div>
          <div class="pro-vbars-chart pro-map-monthly-chart">${mList.map(m => {
            const [yr, mo] = m.ym.split("-");
            const lbl = `${core.MON[parseInt(mo, 10) - 1]}/${yr.slice(2)}`;
            const tPct = Math.max(10, Math.round((m.trips / maxTrips) * 100));
            const dPct = Math.max(10, Math.round((m.days / maxDays) * 100));
            const tip = `${lbl}: ${m.trips} viagem(ns) · ${m.days} dia(s)`;
            return `<div class="pro-vbar-col pro-map-mcol" data-tooltip="${core.esc(tip)}" title="${core.esc(tip)}">
              <span class="pro-vbar-val">${m.trips}v · ${m.days}d</span>
              <div class="pro-map-mcol-pair">
                <div class="pro-vbar-track"><div class="pro-vbar-fill" style="height:${tPct}%;background:linear-gradient(180deg,#38bdf8,#2563eb)"></div></div>
                <div class="pro-vbar-track"><div class="pro-vbar-fill" style="height:${dPct}%;background:linear-gradient(180deg,#34d399,#059669)"></div></div>
              </div>
              <span class="pro-vbar-lbl">${lbl}</span>
            </div>`;
          }).join("")}</div>`;
      }
    }

    // 3. Lista / Tabela Detalhada das Viagens Filtradas (Ordenável no Desktop + Cards no Mobile)
    const tableEl = $("#proMapTripsTable");
    const mobileListEl = $("#proMapTripsMobileCards");
    const tblCountBadge = $("#proMapTableCountBadge");
    if (tblCountBadge) tblCountBadge.textContent = `${mapCards.length} ${mapCards.length === 1 ? "viagem/evento" : "viagens/eventos"}`;

    const groupByCardId = new Map();
    groups.forEach(g => g.cards.forEach(c => groupByCardId.set(c.id, g)));

    const sortedRows = mapCards.slice().sort((a, b) => {
      const dir = proMapTableSort.dir === "desc" ? -1 : 1;
      const col = proMapTableSort.col;
      if (col === "name") return dir * String(a.name || "").localeCompare(String(b.name || ""));
      if (col === "location") return dir * String(a.location || "").localeCompare(String(b.location || ""));
      if (col === "assignee") {
        const aAsg = getCardAssigneesList(a).map(e => e.name).join(", ");
        const bAsg = getCardAssigneesList(b).map(e => e.name).join(", ");
        return dir * aAsg.localeCompare(bAsg);
      }
      if (col === "days") return dir * (cardDurationDays(a) - cardDurationDays(b));
      return dir * String(a.start || "9999-99-99").localeCompare(String(b.start || "9999-99-99"));
    });

    const focusCardOnMap = (cardId) => {
      const card = mapCards.find(c => c.id === cardId);
      const grp = groupByCardId.get(cardId);
      if (!card || !grp) return;
      $("#proMapViewportCard")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      openProMapInspector({ group: grp, card, panMap: true });
    };

    if (tableEl) {
      const sortArrow = col => proMapTableSort.col === col ? (proMapTableSort.dir === "asc" ? " ▲" : " ▼") : "";
      tableEl.innerHTML = `
        <thead>
          <tr>
            <th><button type="button" class="pro-map-sort-th" data-map-sort="name">Nome da Viagem / Cartão${sortArrow("name")}</button></th>
            <th><button type="button" class="pro-map-sort-th" data-map-sort="location">Destino (Localidade)${sortArrow("location")}</button></th>
            <th><button type="button" class="pro-map-sort-th" data-map-sort="assignee">Responsável(is)${sortArrow("assignee")}</button></th>
            <th><button type="button" class="pro-map-sort-th" data-map-sort="start">Período${sortArrow("start")}</button></th>
            <th class="num"><button type="button" class="pro-map-sort-th" data-map-sort="days">Duração${sortArrow("days")}</button></th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          ${sortedRows.map(c => {
            const info = getProTypeInfo(c.type);
            const dur = cardDurationDays(c);
            const period = c.start ? `${core.fmtBR(c.start)}${c.end && c.end !== c.start ? ` – ${core.fmtBR(c.end)}` : ""}` : "Sem data";
            const asgHtml = renderAssigneeBadgesHTML(c) || `<span class="muted small">—</span>`;
            const isAct = c.id === proMapActiveCardId ? " is-active" : "";
            const typeColStyle = info.isCustom && info.color ? ` style="--t-color:${core.esc(info.color)}"` : "";
            return `<tr class="pro-map-trip-row${isAct}" data-map-row-card="${core.esc(c.id)}">
              <td>
                <div style="display:flex;align-items:center;gap:7px">
                  <span class="chip ${info.cls}"${typeColStyle}>${info.icon} ${core.esc(info.short)}</span>
                  <strong>${core.esc(c.name)}</strong>
                </div>
              </td>
              <td>📍 ${core.esc(c.location)}</td>
              <td><div style="display:flex;flex-wrap:wrap;gap:4px">${asgHtml}</div></td>
              <td>${core.esc(period)}</td>
              <td class="num"><span class="pill">${dur} ${dur === 1 ? "dia" : "dias"}</span></td>
              <td>
                <button type="button" class="btn ghost small" data-map-edit-direct="${core.esc(c.id)}" title="Editar cartão">✏️</button>
              </td>
            </tr>`;
          }).join("") || `<tr><td colspan="6" class="muted" style="text-align:center;padding:20px">Nenhuma viagem com localidade para os filtros atuais.</td></tr>`}
        </tbody>
      `;
      tableEl.querySelectorAll("[data-map-sort]").forEach(btn => {
        btn.onclick = () => {
          const col = btn.dataset.mapSort;
          if (proMapTableSort.col === col) {
            proMapTableSort.dir = proMapTableSort.dir === "asc" ? "desc" : "asc";
          } else {
            proMapTableSort.col = col;
            proMapTableSort.dir = col === "days" ? "desc" : "asc";
          }
          renderProMapAnalytics(cards, groups);
        };
      });
      tableEl.querySelectorAll("tr[data-map-row-card]").forEach(tr => {
        tr.onclick = (ev) => {
          if (ev.target.closest("[data-map-edit-direct]")) return;
          focusCardOnMap(tr.dataset.mapRowCard);
        };
      });
      tableEl.querySelectorAll("[data-map-edit-direct]").forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          openProCardModal(btn.dataset.mapEditDirect);
        };
      });
    }

    if (mobileListEl) {
      mobileListEl.innerHTML = sortedRows.map(c => {
        const info = getProTypeInfo(c.type);
        const dur = cardDurationDays(c);
        const period = c.start ? `${core.fmtShortBR(c.start)}${c.end && c.end !== c.start ? ` – ${core.fmtShortBR(c.end)}` : ""}` : "Sem data";
        const asgHtml = renderAssigneeBadgesHTML(c) || `<span class="muted small">Sem responsável</span>`;
        const isAct = c.id === proMapActiveCardId ? " is-active" : "";
        const typeColStyle = info.isCustom && info.color ? ` style="--t-color:${core.esc(info.color)}"` : "";
        return `<div class="m-card pro-map-mcard${isAct}" data-map-row-card="${core.esc(c.id)}">
          <div class="m-card-head">
            <div style="min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
                <span class="chip ${info.cls}"${typeColStyle}>${info.icon} ${core.esc(info.short)}</span>
                <span class="pill">${dur} ${dur === 1 ? "dia" : "dias"}</span>
              </div>
              <b style="display:block;font-size:0.9rem;color:var(--text-strong)">${core.esc(c.name)}</b>
            </div>
            <button type="button" class="icon-btn" data-map-edit-direct="${core.esc(c.id)}" title="Editar cartão">✏️</button>
          </div>
          <div class="pro-map-mcard-meta">
            <div>📍 <b>${core.esc(shortLocationCityName(c.location))}</b> <span class="muted small">(${core.esc(c.location)})</span></div>
            <div>📅 ${core.esc(period)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px">${asgHtml}</div>
          </div>
        </div>`;
      }).join("") || `<p class="muted small" style="text-align:center;padding:14px">Nenhuma viagem com localidade para os filtros atuais.</p>`;

      mobileListEl.querySelectorAll("[data-map-row-card]").forEach(cardEl => {
        cardEl.onclick = (ev) => {
          if (ev.target.closest("[data-map-edit-direct]")) return;
          focusCardOnMap(cardEl.dataset.mapRowCard);
        };
      });
      mobileListEl.querySelectorAll("[data-map-edit-direct]").forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          openProCardModal(btn.dataset.mapEditDirect);
        };
      });
    }
  }

  function drawGoogleMapOverlays(groups, { refit = false } = {}) {
    const map = proMapInstance;
    const AdvMarker = proMapMarkerClass;
    if (!map || !AdvMarker) return;

    clearProMapOverlays();
    if (!groups.length) return;

    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const isMobile = window.innerWidth < 768;

    if (!proMapExploded) {
      const bounds = new google.maps.LatLngBounds();
      groups.forEach(g => {
        const pos = { lat: g.displayLat ?? g.lat, lng: g.displayLng ?? g.lng };
        bounds.extend(pos);

        const content = document.createElement("div");
        content.className = "pro-map-tag-group";

        const { tagCol, html } = createClusterMarkerInnerHTML(g);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `pro-map-marker-pill${g.key === proMapActiveGroupKey ? " is-active" : ""}`;
        btn.dataset.mapGroupKey = g.key;
        btn.style.setProperty("--tag-c", tagCol);
        btn.innerHTML = html;
        btn.title = `${g.cityLabel} (${g.cards.length} ${g.cards.length === 1 ? "cartão" : "cartões"}) — clique para ver resumo`;
        btn.onclick = (ev) => {
          ev.stopPropagation();
          openProMapInspector({
            group: g,
            card: g.cards.length === 1 ? g.cards[0] : null,
            panMap: true
          });
        };
        content.appendChild(btn);

        const dot = document.createElement("span");
        dot.className = "pro-map-pin-dot";
        dot.style.setProperty("--tag-c", tagCol);
        content.appendChild(dot);

        const marker = new AdvMarker({
          map,
          position: pos,
          content,
          title: `${g.cityLabel} (${g.cards.length})`,
          zIndex: g.key === proMapActiveGroupKey ? 20 : 10
        });
        proMapMarkers.push(marker);
      });

      if (refit && groups.length > 1) {
        map.fitBounds(bounds, 64);
      }
      return;
    }

    // MODO EXPLODIDO: exibe todas as missões separadas com linhas spiderfy até o ponto real da localidade
    if (refit) {
      if (groups.length > 1) {
        const cityBounds = new google.maps.LatLngBounds();
        groups.forEach(g => cityBounds.extend({ lat: g.lat, lng: g.lng }));
        map.fitBounds(cityBounds, isMobile ? 66 : 96);
      } else if (groups.length === 1) {
        map.panTo({ lat: groups[0].lat, lng: groups[0].lng });
      }
    }

    const zoom = Number(map.getZoom?.()) || (groups.length === 1 ? 10 : 5);
    const { anchors, items } = layoutExplodedPointsPx(
      groups,
      g => latLngToWorldPx(g.lat, g.lng, zoom),
      null,
      isMobile
    );

    // 1. Nós centrais (Hubs) nos pontos reais das localidades com múltiplas missões ou deslocadas
    anchors.forEach(anc => {
      if (!anc.hasSpread) return;
      const g = anc.group;
      const hubWrap = document.createElement("div");
      hubWrap.className = "pro-map-hub-wrap";

      const hubBtn = document.createElement("button");
      hubBtn.type = "button";
      hubBtn.className = `pro-map-hub-node${g.key === proMapActiveGroupKey && !proMapActiveCardId ? " is-active" : ""}`;
      hubBtn.dataset.mapGroupKey = g.key;
      hubBtn.textContent = g.cards.length > 1 ? String(g.cards.length) : "";
      hubBtn.title = `📍 ${g.cityLabel} — ${g.cards.length} ${g.cards.length === 1 ? "missão" : "missões"} (clique para listar)`;
      hubBtn.onclick = (ev) => {
        ev.stopPropagation();
        openProMapInspector({
          group: g,
          card: g.cards.length === 1 ? g.cards[0] : null,
          panMap: false
        });
      };
      hubWrap.appendChild(hubBtn);

      const hubMarker = new AdvMarker({
        map,
        position: { lat: g.lat, lng: g.lng },
        content: hubWrap,
        title: `${g.cityLabel} (${g.cards.length})`,
        zIndex: 6
      });
      proMapMarkers.push(hubMarker);
    });

    // 2. Linhas conectoras (Spiderfy) + pílula individual de cada missão
    items.forEach(it => {
      const isSpread = it.movedPx > 4 || it.group.cards.length > 1;
      const pos = isSpread
        ? worldPxToLatLng(it.x, it.y, zoom)
        : { lat: it.group.lat, lng: it.group.lng };
      proMapExplodedPosByCardId.set(it.card.id, pos);

      if (isSpread) {
        const line = new google.maps.Polyline({
          path: [{ lat: it.group.lat, lng: it.group.lng }, pos],
          geodesic: false,
          strokeColor: it.meta.tagCol || (isDark ? "#38bdf8" : "#2563eb"),
          strokeOpacity: isDark ? 0.68 : 0.6,
          strokeWeight: 1.8,
          clickable: false,
          map
        });
        proMapPolylines.push(line);
      }

      const content = document.createElement("div");
      content.className = "pro-map-tag-group pro-map-tag-group--exploded";

      const btn = document.createElement("button");
      btn.type = "button";
      const isAct = it.card.id === proMapActiveCardId;
      btn.className = `pro-map-marker-pill pro-map-marker-pill--mission${isAct ? " is-active" : ""}`;
      btn.dataset.mapCardId = it.card.id;
      btn.style.setProperty("--tag-c", it.meta.tagCol);
      btn.innerHTML = it.meta.html;
      btn.title = it.meta.tooltip;
      btn.onclick = (ev) => {
        ev.stopPropagation();
        openProMapInspector({
          group: it.group,
          card: it.card,
          panMap: false
        });
      };
      content.appendChild(btn);

      if (!isSpread) {
        const dot = document.createElement("span");
        dot.className = "pro-map-pin-dot";
        dot.style.setProperty("--tag-c", it.meta.tagCol);
        content.appendChild(dot);
      }

      const marker = new AdvMarker({
        map,
        position: pos,
        content,
        title: it.meta.tooltip,
        zIndex: isAct ? 25 : 12
      });
      proMapMarkers.push(marker);
    });

    if (refit && groups.length > 1) {
      google.maps.event.addListenerOnce(map, "idle", () => {
        if (proMapInstance === map && proMapExploded && (Number(map.getZoom?.()) || zoom) !== zoom) {
          drawGoogleMapOverlays(proMapCachedGroups, { refit: false });
        }
      });
    }
  }

  async function renderProMap(filteredCardsOpt) {
    const canvas = $("#proMapCanvas");
    if (!canvas) return;
    const seq = ++proMapRenderSeq;
    const cards = filteredCardsOpt || applyProUnifiedFilters(getProSortedActivities());
    const withLoc = cards.filter(c => String(c.location || "").trim());

    // Resumo de deslocamentos/viagens por responsável ao longo do ano
    const summaryEl = $("#proMapTravelSummary");
    if (summaryEl) {
      const byPerson = new Map();
      cards.forEach(c => {
        const loc = String(c.location || "").trim();
        if (!loc) return;
        getCardAssigneesList(c).forEach(entry => {
          if (!entry.travels) return;
          const k = entry.name.toLowerCase();
          if (!byPerson.has(k)) byPerson.set(k, { name: entry.name, stops: [] });
          byPerson.get(k).stops.push({ card: c, loc, date: c.start || c.end || "" });
        });
      });
      if (!byPerson.size) {
        summaryEl.hidden = true;
        summaryEl.innerHTML = "";
      } else {
        summaryEl.hidden = false;
        summaryEl.innerHTML = [...byPerson.values()].map(p => {
          const col = colorForAssignee(p.name);
          const stopsHtml = p.stops.map(s => {
            const dt = s.date ? ` (${core.fmtShortBR(s.date)})` : "";
            return `<button type="button" class="btn ghost small" data-map-jump-card="${core.esc(s.card.id)}" style="padding:2px 8px;min-height:24px;font-size:0.74rem">📍 ${core.esc(shortLocationCityName(s.loc))} · <b>${core.esc(s.card.name)}</b>${dt}</button>`;
          }).join(" ➔ ");
          return `<div class="pro-map-person-row">
            <span class="pro-assignee-badge" style="--asg-bg:${col.bg};--asg-fg:${col.fg};--asg-bd:${col.bd}">✈️ ${core.esc(p.name)}</span>
            <span class="muted small">Roteiro de viagens:</span>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:5px">${stopsHtml}</div>
          </div>`;
        }).join("");
        summaryEl.querySelectorAll("[data-map-jump-card]").forEach(b => {
          b.onclick = () => {
            const cId = b.dataset.mapJumpCard;
            const grp = proMapCachedGroups.find(g => g.cards.some(x => x.id === cId));
            const crd = grp?.cards.find(x => x.id === cId);
            if (grp && crd) openProMapInspector({ group: grp, card: crd, panMap: true });
            else openProCardModal(cId);
          };
        });
      }
    }

    const rawGroupMap = new Map();
    for (const c of withLoc) {
      const coords = await resolveCardCoordinates(c);
      if (seq !== proMapRenderSeq) return;
      if (!coords) continue;
      const gKey = `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`;
      if (!rawGroupMap.has(gKey)) {
        rawGroupMap.set(gKey, { lat: coords.lat, lng: coords.lng, label: c.location, cards: [] });
      }
      rawGroupMap.get(gKey).cards.push(c);
    }

    const groups = clusterMapGroupsByProximity([...rawGroupMap.values()]);
    proMapCachedGroups = groups;

    const totalCardsOnMap = groups.reduce((s, g) => s + g.cards.length, 0);
    if ($("#proMapCountBadge")) {
      $("#proMapCountBadge").textContent = `Exibindo ${totalCardsOnMap} ${totalCardsOnMap === 1 ? "cartão" : "cartões"} em ${groups.length} ${groups.length === 1 ? "local" : "locais"}`;
    }
    updateProMapExplodeBtn(totalCardsOnMap);

    // Fechar inspector se o cartão/cluster selecionado não estiver mais no filtro atual
    if (proMapActiveGroupKey && !groups.some(g => g.key === proMapActiveGroupKey)) {
      closeProMapInspector();
    }

    // Renderizar Dashboard Analítico Reativo abaixo do mapa
    renderProMapAnalytics(cards, groups);

    if (proMapZoomListener) {
      try { google.maps.event.removeListener(proMapZoomListener); } catch {}
      proMapZoomListener = null;
    }
    clearTimeout(proMapZoomTimer);
    clearProMapOverlays();

    if (!groups.length || !window.FeriasMaps?.hasKey()) {
      proMapInstance = null;
      renderProMapFallbackSvg(canvas, groups);
      return;
    }

    try {
      await window.FeriasMaps.ensureLoaded();
      if (seq !== proMapRenderSeq) return;
      const { Map } = await google.maps.importLibrary("maps");
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
      proMapMarkerClass = AdvancedMarkerElement;
      const isDark = document.documentElement.getAttribute("data-theme") !== "light";

      canvas.innerHTML = "";
      const mapDiv = document.createElement("div");
      mapDiv.style.width = "100%";
      mapDiv.style.height = "100%";
      canvas.appendChild(mapDiv);

      const map = new Map(mapDiv, {
        mapId: "DEMO_MAP_ID",
        colorScheme: isDark ? "DARK" : "LIGHT",
        center: { lat: groups[0].displayLat ?? groups[0].lat, lng: groups[0].displayLng ?? groups[0].lng },
        zoom: groups.length === 1 ? 10 : 5,
        gestureHandling: "cooperative",
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });
      proMapInstance = map;

      map.addListener("click", () => {
        closeProMapInspector();
      });

      // Recalcula automaticamente o layout sem sobreposição do modo explodido ao dar zoom in/out
      proMapZoomListener = map.addListener("zoom_changed", () => {
        if (!proMapExploded || !proMapCachedGroups.length) return;
        clearTimeout(proMapZoomTimer);
        proMapZoomTimer = setTimeout(() => {
          if (proMapInstance === map && proMapExploded) {
            drawGoogleMapOverlays(proMapCachedGroups, { refit: false });
          }
        }, 90);
      });

      drawGoogleMapOverlays(groups, { refit: true });
    } catch {
      proMapInstance = null;
      renderProMapFallbackSvg(canvas, groups);
    }
  }

  /* ---------- 3. DASHBOARD EXECUTIVO ---------- */
  function renderProDashboard(allCardsOpt, tOpt) {
    const cards = allCardsOpt || getProSortedActivities();
    const t = tOpt || computeProTotals(cards);
    const st = core.getState();
    const revTarget = Number(st.params?.revenueTarget) || 0;
    const costBudget = Number(st.params?.costBudget) || 0;
    const today = core.fmtISO(new Date());
    const widgets = getProDashWidgetsCfg(st);
    const cols = getMergedColumns();

    const kpisEl = $("#proDashKpis");
    if (kpisEl) {
      const netColor = t.netPlanned >= 0 ? "#10b981" : "#f87171";
      const kpiItems = [];
      if (widgets.kpisFinance) {
        kpiItems.push(
          ["Recebimentos Previstos", core.money(t.totalIncome), `Liquidado: ${core.money(t.receivedIncome)}${revTarget > 0 ? ` · Meta ${Math.round(t.totalIncome / revTarget * 100)}%` : ""}`, "#10b981"],
          ["Despesas & Custos", core.money(t.totalExpense), `Pago: ${core.money(t.paidExpense)}${costBudget > 0 ? ` · Teto ${core.money(costBudget)}` : ""}`, "#ef4444"],
          ["Saldo Líquido Projetado", core.money(t.netPlanned - t.taxAmount), `Realizado: ${core.money(t.netRealized)}${t.taxAmount > 0 ? ` · Imp. ${core.money(t.taxAmount)}` : ""}`, netColor]
        );
      }
      if (widgets.kpisExecution) {
        kpiItems.push(
          ["Execução dos Cartões", `${t.doneCards}/${t.totalCards}`, `Progresso médio ${Math.round(t.avgProgress)}%`, "#38bdf8"],
          ["Prazos & Alertas", `${t.overdueCount} atrasado(s)`, `${t.dueSoonCount} vence(m) em 7 dias`, t.overdueCount > 0 ? "#f87171" : "#f59e0b"]
        );
      }
      kpisEl.hidden = kpiItems.length === 0;
      kpisEl.innerHTML = kpiItems.map(([l, v, s, c]) => `<div class="kpi" style="--c:${c}"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${s}</div></div>`).join("");
    }

    if ($("#proDashUpcomingCard")) $("#proDashUpcomingCard").hidden = !widgets.upcomingCard;
    if ($("#proDashFinanceCard")) $("#proDashFinanceCard").hidden = !widgets.financeCard;
    if ($("#proDashTopGrid")) $("#proDashTopGrid").hidden = !widgets.upcomingCard && !widgets.financeCard;
    if ($("#proDashChartStageCard")) $("#proDashChartStageCard").hidden = !widgets.chartStage;
    if ($("#proDashChartTypeCard")) $("#proDashChartTypeCard").hidden = !widgets.chartType;
    if ($("#proDashChartStatusCard")) $("#proDashChartStatusCard").hidden = !widgets.chartStatus;
    if ($("#proDashChartAssigneeCard")) $("#proDashChartAssigneeCard").hidden = !widgets.chartAssignee;
    if ($("#proDashChartPriorityCard")) $("#proDashChartPriorityCard").hidden = !widgets.chartPriority;
    if ($("#proDashChartMonthlyCard")) $("#proDashChartMonthlyCard").hidden = !widgets.chartMonthly;

    const upEl = $("#proUpcoming");
    if (upEl && widgets.upcomingCard) {
      const pending = cards.filter(a => !isCardDone(a, cols));
      const next = pending.filter(a => a.start && (a.end || a.start) >= today).slice(0, 7);
      const list = next.length ? next : pending.slice(0, 7);
      upEl.innerHTML = list.map(a => {
        const info = getProTypeInfo(a.type);
        const finTxt = widgets.kpisFinance ? formatProFinShort(a) : "";
        const overdue = Boolean(a.start && (a.end || a.start) < today);
        const tCol = info.isCustom && info.color ? ` style="--t-color:${core.esc(info.color)}"` : "";
        const badgeEl = a.start
          ? `<span class="date-badge"><b>${a.start.slice(8, 10)}</b>${core.MON[+a.start.slice(5, 7) - 1]}</span>`
          : `<span class="date-badge"><b>—</b>S/P</span>`;
        return `<li data-id="${core.esc(a.id)}"${tCol}>
          ${badgeEl}
          <div style="min-width:0;flex:1">
            <b>${info.icon} ${core.esc(a.name)}</b>
            <small>${core.esc(a.columnTitle || a.type)}${a.client ? ` · ${core.esc(a.client)}` : ""}${finTxt ? ` · ${core.esc(finTxt)}` : ""}${overdue ? " · ⚠️ Atrasado" : (!a.start ? " · ⏳ Sem prazo" : "")}</small>
          </div>
          <span class="chip ${info.cls}"${tCol}>${a.progress || 0}%</span>
        </li>`;
      }).join("") || `<li class="muted" style="cursor:default">Nenhum compromisso pendente 🎉</li>`;
      upEl.querySelectorAll("li[data-id]").forEach(li => { li.onclick = () => openProCardModal(li.dataset.id); });
    }

    const dfEl = $("#proDashFinance");
    if (dfEl && widgets.financeCard) {
      const margin = t.totalIncome > 0 ? ((t.netPlanned - t.taxAmount) / t.totalIncome * 100) : 0;
      if ($("#proDashMarginBadge")) $("#proDashMarginBadge").textContent = t.totalIncome > 0 ? `Margem líquida ${core.num(margin, 1)}%` : "";
      const rows = [
        ["Recebimentos Liquidados", t.receivedIncome, Math.max(t.totalIncome, revTarget, 1), "#10b981"],
        ["Recebimentos a Receber", t.pendingIncome, Math.max(t.totalIncome, revTarget, 1), "#38bdf8"],
        ["Despesas & Viagens", t.totalExpense, Math.max(t.totalIncome, costBudget, t.totalExpense, 1), "#ef4444"],
        ["Impostos Estimados", t.taxAmount, Math.max(t.totalIncome, 1), "#f59e0b"]
      ];
      dfEl.innerHTML = rows.map(([lbl, val, den, col]) => `
        <div class="bar-row" style="cursor:default">
          <div class="bar-top"><span>${lbl}</span><b>${core.money(val)}</b></div>
          <div class="bar-track"><div style="width:${Math.min(100, (val / Math.max(1, den)) * 100)}%;background:${col}"></div></div>
        </div>`).join("");
    }

    const stageEl = $("#proStageBars");
    if (stageEl && widgets.chartStage) {
      const maxC = Math.max(1, ...Object.values(t.byColumn).map(c => c.count));
      stageEl.innerHTML = Object.values(t.byColumn).map(c => `
        <div class="bar-row" data-jump-col="${core.esc(c.id)}">
          <div class="bar-top"><span>${core.esc(c.title)}</span><b>${c.count} cartão(ões)${widgets.kpisFinance && c.amount > 0 ? ` · ${core.money(c.amount)}` : ""}</b></div>
          <div class="bar-track"><div style="width:${(c.count / maxC) * 100}%;background:${core.esc(c.color || "#2563eb")}"></div></div>
        </div>`).join("") || `<p class="muted small">Sem colunas configuradas.</p>`;
      stageEl.querySelectorAll("[data-jump-col]").forEach(el => {
        el.onclick = () => core.switchProView("pro-board");
      });
    }

    const typeEl = $("#proTypeBars");
    if (typeEl && widgets.chartType) {
      const items = Object.values(t.byType).sort((a, b) => b.count - a.count);
      const maxT = Math.max(1, ...items.map(x => x.count));
      typeEl.innerHTML = items.map(it => {
        const info = getProTypeInfo(it.type);
        const finStr = widgets.kpisFinance ? [it.income > 0 ? `+${core.money(it.income)}` : "", it.expense > 0 ? `-${core.money(it.expense)}` : ""].filter(Boolean).join(" / ") : "";
        return `<div class="bar-row" style="cursor:default">
          <div class="bar-top"><span>${info.icon} ${core.esc(it.type)}</span><b>${it.count} ${finStr ? `· ${finStr}` : ""}</b></div>
          <div class="bar-track"><div style="width:${(it.count / maxT) * 100}%;background:linear-gradient(90deg,#1d4ed8,#38bdf8)"></div></div>
        </div>`;
      }).join("") || `<p class="muted small">Sem cartões cadastrados.</p>`;
    }

    // Gráfico Rosca: Status & Saúde dos Prazos
    const statusEl = $("#proStatusDonutChart");
    if (statusEl && widgets.chartStatus) {
      const total = Math.max(1, t.totalCards);
      const done = t.doneCards;
      const late = t.overdueCount;
      const soon = t.dueSoonCount;
      const onTrack = Math.max(0, t.totalCards - done - late - soon);
      const p1 = Math.round((done / total) * 100);
      const p2 = p1 + Math.round((onTrack / total) * 100);
      const p3 = p2 + Math.round((soon / total) * 100);
      const grad = t.totalCards
        ? `conic-gradient(#10b981 0% ${p1}%, #38bdf8 ${p1}% ${p2}%, #f59e0b ${p2}% ${p3}%, #ef4444 ${p3}% 100%)`
        : `conic-gradient(var(--border) 0% 100%)`;
      const donePct = t.totalCards ? Math.round((done / t.totalCards) * 100) : 0;
      statusEl.innerHTML = `<div class="pro-donut-wrap">
        <div class="pro-donut-ring" style="background:${grad}">
          <div class="pro-donut-hole">
            <b>${donePct}%</b>
            <small>${done}/${t.totalCards} concl.</small>
          </div>
        </div>
        <div class="pro-donut-legend">
          <div class="pro-donut-leg-row"><span class="pro-donut-leg-left"><i class="pro-donut-dot" style="background:#10b981"></i>Concluídos</span><b>${done}</b></div>
          <div class="pro-donut-leg-row"><span class="pro-donut-leg-left"><i class="pro-donut-dot" style="background:#38bdf8"></i>Em dia</span><b>${onTrack}</b></div>
          <div class="pro-donut-leg-row"><span class="pro-donut-leg-left"><i class="pro-donut-dot" style="background:#f59e0b"></i>Vencem em 7d</span><b>${soon}</b></div>
          <div class="pro-donut-leg-row"><span class="pro-donut-leg-left"><i class="pro-donut-dot" style="background:#ef4444"></i>Atrasados</span><b>${late}</b></div>
        </div>
      </div>`;
    }

    // Gráfico: Carga por Responsável & Viagens
    const asgChartEl = $("#proAssigneeBars");
    if (asgChartEl && widgets.chartAssignee) {
      const byAsg = new Map();
      cards.forEach(c => {
        const list = getCardAssigneesList(c);
        const done = isCardDone(c, cols);
        if (!list.length) {
          const k = "__none__";
          if (!byAsg.has(k)) byAsg.set(k, { name: "Sem responsável", count: 0, done: 0, travels: 0, hex: "#64748b" });
          const b = byAsg.get(k);
          b.count++;
          if (done) b.done++;
          return;
        }
        list.forEach(entry => {
          const k = entry.name.toLowerCase();
          if (!byAsg.has(k)) {
            byAsg.set(k, { name: entry.name, count: 0, done: 0, travels: 0, hex: colorForAssignee(entry.name).hex });
          }
          const b = byAsg.get(k);
          b.count++;
          if (done) b.done++;
          if (entry.travels) b.travels++;
        });
      });
      const items = [...byAsg.values()].sort((a, b) => b.count - a.count);
      const maxA = Math.max(1, ...items.map(x => x.count));
      asgChartEl.innerHTML = items.map(it => `
        <div class="bar-row" style="cursor:default">
          <div class="bar-top">
            <span>👤 ${core.esc(it.name)}</span>
            <b>${it.count} cartão(ões) · ${it.done} concl.${it.travels ? ` · ✈️ ${it.travels} viagem(ns)` : ""}</b>
          </div>
          <div class="bar-track"><div style="width:${(it.count / maxA) * 100}%;background:${core.esc(it.hex)}"></div></div>
        </div>`).join("") || `<p class="muted small">Sem cartões atribuídos.</p>`;
    }

    // Gráfico: Distribuição por Prioridade
    const prioEl = $("#proPriorityChart");
    if (prioEl && widgets.chartPriority) {
      const prioMeta = [
        ["Crítica", "#ef4444"],
        ["Alta", "#f59e0b"],
        ["Média", "#38bdf8"],
        ["Baixa", "#94a3b8"]
      ];
      const counts = { "Crítica": 0, Alta: 0, "Média": 0, Baixa: 0 };
      cards.forEach(c => { counts[c.priority] = (counts[c.priority] || 0) + 1; });
      const maxP = Math.max(1, ...Object.values(counts));
      prioEl.innerHTML = `<div class="pro-vbars-chart">${prioMeta.map(([lbl, col]) => {
        const cnt = counts[lbl] || 0;
        const hPct = cnt > 0 ? Math.max(8, Math.round((cnt / maxP) * 100)) : 0;
        return `<div class="pro-vbar-col">
          <span class="pro-vbar-val">${cnt}</span>
          <div class="pro-vbar-track"><div class="pro-vbar-fill" style="height:${hPct}%;background:${col}"></div></div>
          <span class="pro-vbar-lbl">${lbl}</span>
        </div>`;
      }).join("")}</div>`;
    }

    // Gráfico: Evolução Mensal de Entregas
    const monthEl = $("#proMonthlyChart");
    if (monthEl && widgets.chartMonthly) {
      const byMonth = new Map();
      cards.forEach(c => {
        const iso = c.start || c.end;
        if (!iso || iso.length < 7) return;
        const ym = iso.slice(0, 7);
        if (!byMonth.has(ym)) byMonth.set(ym, { ym, total: 0, done: 0 });
        const b = byMonth.get(ym);
        b.total++;
        if (isCardDone(c, cols)) b.done++;
      });
      const mList = [...byMonth.values()].sort((a, b) => a.ym.localeCompare(b.ym)).slice(-8);
      if (!mList.length) {
        monthEl.innerHTML = `<p class="muted small">Adicione datas aos cartões para ver a evolução mensal.</p>`;
      } else {
        const maxM = Math.max(1, ...mList.map(m => m.total));
        monthEl.innerHTML = `<div class="pro-vbars-chart">${mList.map(m => {
          const [yr, mo] = m.ym.split("-");
          const lbl = `${core.MON[parseInt(mo, 10) - 1]}/${yr.slice(2)}`;
          const hPct = Math.max(10, Math.round((m.total / maxM) * 100));
          return `<div class="pro-vbar-col" title="${lbl}: ${m.total} cartão(ões) (${m.done} concluídos)">
            <span class="pro-vbar-val">${m.total}</span>
            <div class="pro-vbar-track"><div class="pro-vbar-fill" style="height:${hPct}%;background:linear-gradient(180deg,#38bdf8,#2563eb)"></div></div>
            <span class="pro-vbar-lbl">${lbl}</span>
          </div>`;
        }).join("")}</div>`;
      }
    }
  }

  /* ---------- 4. FINANCEIRO EXECUTIVO (FLUXO DE CAIXA) ---------- */
  function renderProFinance(allCardsOpt, tOpt) {
    const allCards = allCardsOpt || getProSortedActivities();
    const t = tOpt || computeProTotals(allCards);
    const finCards = allCards.filter(a => a.finDirection === "income" || a.finDirection === "expense" || Number(a.amount) > 0);

    const kpisEl = $("#proFinKpis");
    if (kpisEl) {
      kpisEl.innerHTML = [
        ["Recebimentos Totais", core.money(t.totalIncome), `A receber: ${core.money(t.pendingIncome)}`, "#10b981"],
        ["Já Recebido (Caixa)", core.money(t.receivedIncome), `${t.totalIncome > 0 ? Math.round(t.receivedIncome / t.totalIncome * 100) : 0}% liquidado`, "#34d399"],
        ["Despesas Totais", core.money(t.totalExpense), `A pagar: ${core.money(t.pendingExpense)}`, "#ef4444"],
        ["Já Pago", core.money(t.paidExpense), `${t.totalExpense > 0 ? Math.round(t.paidExpense / t.totalExpense * 100) : 0}% liquidado`, "#fb7185"],
        ["Saldo Líquido", core.money(t.netPlanned - t.taxAmount), `Realizado hoje: ${core.money(t.netRealized)}`, t.netPlanned >= 0 ? "#38bdf8" : "#f87171"]
      ].map(([l, v, s, c]) => `<div class="kpi" style="--c:${c}"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${s}</div></div>`).join("");
    }

    const filtered = finCards.filter(a => {
      if (proFinFilter === "income") return a.finDirection === "income";
      if (proFinFilter === "expense") return a.finDirection === "expense";
      if (proFinFilter === "pending") return a.finStatus !== "Liquidado";
      if (proFinFilter === "settled") return a.finStatus === "Liquidado";
      return true;
    }).sort((a, b) => String(a.finDueDate || a.start).localeCompare(String(b.finDueDate || b.start)));

    // Gráfico diário entradas x saídas
    const chartEl = $("#proFinChart");
    if (chartEl) {
      const byDay = new Map();
      filtered.forEach(a => {
        const dt = a.finDueDate || a.end || a.start;
        if (!dt) return;
        if (!byDay.has(dt)) byDay.set(dt, { date: dt, inc: 0, exp: 0 });
        const b = byDay.get(dt);
        const val = Number(a.actualAmount) > 0 ? Number(a.actualAmount) : (Number(a.amount) || 0);
        if (a.finDirection === "income") b.inc += val;
        else if (a.finDirection === "expense") b.exp += val;
      });
      const daysList = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
      if (!daysList.length) {
        chartEl.innerHTML = `<div class="muted small" style="padding:28px;text-align:center;width:100%">Sem movimentações financeiras para este filtro. Use "+ Recebimento" ou "+ Despesa".</div>`;
      } else {
        const maxV = Math.max(100, ...daysList.map(d => Math.max(d.inc, d.exp)));
        chartEl.innerHTML = daysList.map(d => {
          const incH = d.inc > 0 ? Math.max(6, Math.round((d.inc / maxV) * 145)) : 0;
          const expH = d.exp > 0 ? Math.max(6, Math.round((d.exp / maxV) * 145)) : 0;
          const net = d.inc - d.exp;
          return `<div class="fin-bar-col" title="${core.fmtBR(d.date)}: +${core.money(d.inc)} / -${core.money(d.exp)}">
            <div class="fin-bar-val">${net >= 0 ? "+" : ""}${core.money(net).replace("R$\u00a0", "")}</div>
            <div class="fin-bar-pair">
              <div class="fin-stack-bar" style="height:${incH}px;background:#10b981;width:12px" title="Recebimento: ${core.money(d.inc)}"></div>
              <div class="fin-real-bar" style="height:${expH}px;background:#ef4444;width:12px" title="Despesa: ${core.money(d.exp)}"></div>
            </div>
            <div class="fin-bar-date">${core.fmtShortBR(d.date)}</div>
            <div class="fin-bar-wd">${core.WD[core.parseD(d.date).getDay()]}</div>
          </div>`;
        }).join("");
      }
    }

    if ($("#proFinTimelineSpan")) $("#proFinTimelineSpan").textContent = `${filtered.length} lançamento(s)`;
    const tlEl = $("#proFinTimeline");
    if (tlEl) {
      tlEl.innerHTML = filtered.map(a => {
        const dt = a.finDueDate || a.end || a.start;
        const isInc = a.finDirection === "income";
        const isDone = a.finStatus === "Liquidado";
        const planned = Number(a.amount) || 0;
        const real = Number(a.actualAmount) > 0 ? Number(a.actualAmount) : planned;
        const info = getProTypeInfo(a.type);
        return `<div class="fin-day-card ${isDone ? "logged-ok" : ""}">
          <div class="fin-day-top">
            <div class="fin-day-title">
              <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" data-pfin-toggle="${core.esc(a.id)}" ${isDone ? "checked" : ""} style="width:17px;height:17px;accent-color:var(--ok)">
                <strong>${info.icon} ${core.esc(a.name)}</strong>
              </label>
              <span class="fin-status-pill ${isDone ? "ok" : ""}">${isDone ? "✅ Liquidado" : "⏳ Previsto"}</span>
              ${a.client ? `<span class="pill">${core.esc(a.client)}</span>` : ""}
              ${getCardTripBadgeHTML(a)}
            </div>
            <div class="fin-day-actions">
              <span style="font-weight:800;font-size:1rem;color:${isInc ? "#34d399" : "#f87171"}">${isInc ? "+" : "−"}${core.money(real)}</span>
              <button type="button" class="btn ghost small" data-pfin-edit="${core.esc(a.id)}">✏️ Cartão</button>
            </div>
          </div>
          <div class="muted small">📅 Vencimento: ${dt ? core.fmtBR(dt) : "Sem prazo"}${planned !== real ? ` · Previsto: ${core.money(planned)}` : ""}${a.notes ? ` · ${core.esc(a.notes)}` : ""}</div>
        </div>`;
      }).join("") || `<p class="muted">Nenhum recebimento ou despesa cadastrado neste filtro.</p>`;

      tlEl.querySelectorAll("[data-pfin-toggle]").forEach(cb => {
        cb.onchange = () => {
          const ctx = findProCardContext(cb.dataset.pfinToggle);
          if (!ctx) return;
          if (ctx.trip?.role === "viewer") {
            cb.checked = !cb.checked;
            return core.toast("👁️ Projeto compartilhado somente para visualização.");
          }
          ctx.activity.finStatus = cb.checked ? "Liquidado" : "Previsto";
          if (cb.checked && !ctx.activity.actualAmount && ctx.activity.amount > 0) {
            ctx.activity.actualAmount = ctx.activity.amount;
          }
          core.saveTripRecord(ctx.trip, cb.checked ? "✅ Lançamento marcado como Liquidado!" : "⏳ Lançamento marcado como Previsto");
        };
      });
      tlEl.querySelectorAll("[data-pfin-edit]").forEach(b => {
        b.onclick = () => openProCardModal(b.dataset.pfinEdit);
      });
    }
  }

  /* ---------- 5. TABELA EXECUTIVA ---------- */
  function getProTableFilterCfg() {
    return {
      colSet: proTableColSet,
      typeSet: proTableTypeSet,
      labelSet: proTableLabelSet,
      tagSet: proTableTagSet,
      q: ($("#proSearch")?.value || "").trim().toLowerCase(),
      prio: $("#proFilterPrio")?.value || "",
      assignee: $("#proFilterAssignee")?.value || "",
      travel: $("#proFilterTravel")?.value || "",
      client: ($("#proFilterClient")?.value || "").trim().toLowerCase(),
      location: ($("#proFilterLocation")?.value || "").trim().toLowerCase(),
      done: $("#proFilterDone")?.value || "",
      finDir: $("#proFilterFinDir")?.value || "",
      finStatus: $("#proFilterFinStatus")?.value || "",
      dateFrom: $("#proFilterDateFrom")?.value || "",
      dateTo: $("#proFilterDateTo")?.value || ""
    };
  }

  function syncProTableFilterUI() {
    const totalTypes = Object.keys(getAllProTypes()).length;
    const cfg = getProTableFilterCfg();
    const activeCount = (cfg.q ? 1 : 0)
      + (proTableColSet.size > 0 ? 1 : 0)
      + (proTableTypeSet.size < totalTypes ? 1 : 0)
      + (proTableLabelSet.size > 0 ? 1 : 0)
      + (proTableTagSet.size > 0 ? 1 : 0)
      + (cfg.prio ? 1 : 0)
      + (cfg.assignee ? 1 : 0)
      + (cfg.travel ? 1 : 0)
      + (cfg.client ? 1 : 0)
      + (cfg.location ? 1 : 0)
      + (cfg.done ? 1 : 0)
      + (cfg.finDir ? 1 : 0)
      + (cfg.finStatus ? 1 : 0)
      + ((cfg.dateFrom || cfg.dateTo) ? 1 : 0);
    const fBtn = $("#btnProTableFilterPop");
    const fCnt = $("#proTableFilterCount");
    const clearBtn = $("#btnProTableClearFilters");
    if (fBtn) fBtn.classList.toggle("has-active", activeCount > 0);
    if (fCnt) {
      fCnt.textContent = activeCount ? String(activeCount) : "";
      fCnt.hidden = !activeCount;
    }
    if (clearBtn) clearBtn.hidden = activeCount === 0;
  }

  function resetProTableFilters() {
    proTableColSet.clear();
    proTableTypeSet = new Set(Object.keys(getAllProTypes()));
    proTableLabelSet.clear();
    proTableTagSet.clear();
    [
      "#proSearch", "#proFilterPrio", "#proFilterAssignee", "#proFilterTravel", "#proFilterClient",
      "#proFilterLocation", "#proFilterDone", "#proFilterFinDir",
      "#proFilterFinStatus", "#proFilterDateFrom", "#proFilterDateTo"
    ].forEach(sel => { if ($(sel)) $(sel).value = ""; });
    if (proTableColMsel) proTableColMsel.setSelected([]);
    if (proTableTypeMsel) proTableTypeMsel.setSelected([...proTableTypeSet]);
    if (proTableLabelMsel) proTableLabelMsel.setSelected([]);
    if (proTableTagMsel) proTableTagMsel.setSelected([]);
    renderProTable();
  }

  function getFilteredProTableRows(allCardsOpt) {
    const cols = getMergedColumns();
    const cfg = getProTableFilterCfg();
    const cards = allCardsOpt || getProSortedActivities();
    return cards.filter(a => matchProCardFilters(a, cfg, cols));
  }

  function renderProTable(allCardsOpt) {
    const tb = $("#proMainTable");
    const mc = $("#proMobileTableCards");
    if (!tb || !mc) return;
    syncProTableFilterUI();
    const cols = getMergedColumns();
    const rows = getFilteredProTableRows(allCardsOpt);
    const typeOpts = Object.keys(getAllProTypes());

    let h = `<thead><tr>
      <th>#</th><th>Lista</th><th>Tipo</th><th>Cartão / Título</th><th>Cliente</th>
      <th>Início</th><th>Fim</th><th>Prog.%</th><th>Prioridade</th><th>Movimento</th>
      <th>Valor R$</th><th>Status Fin.</th><th>Notas</th><th>Ações</th>
    </tr></thead><tbody>`;

    rows.forEach((a, idx) => {
      const colOpts = `<option value="" ${!a.columnId ? "selected" : ""}>— Sem lista —</option>`
        + cols.map(c => `<option value="${core.esc(c.id)}" ${c.id === a.columnId ? "selected" : ""}>${core.esc(c.title)}</option>`).join("");
      const tOpts = typeOpts.map(tp => `<option value="${core.esc(tp)}" ${tp === a.type ? "selected" : ""}>${core.esc(tp)}</option>`).join("");
      const pOpts = ["Crítica", "Alta", "Média", "Baixa"].map(p => `<option ${p === a.priority ? "selected" : ""}>${p}</option>`).join("");
      const fOpts = [["none", "—"], ["income", "+ Recebim."], ["expense", "− Despesa"]].map(([k, l]) => `<option value="${k}" ${k === a.finDirection ? "selected" : ""}>${l}</option>`).join("");
      const stOpts = ["Previsto", "Liquidado"].map(s => `<option ${s === a.finStatus ? "selected" : ""}>${s}</option>`).join("");
      const val = Number(a.actualAmount) > 0 ? a.actualAmount : (a.amount || "");

      h += `<tr data-id="${core.esc(a.id)}">
        <td>${idx + 1}</td>
        <td class="ed"><select data-pf="columnId">${colOpts}</select></td>
        <td class="ed"><select data-pf="type">${tOpts}</select></td>
        <td class="ed wide"><input data-pf="name" value="${core.esc(a.name)}"></td>
        <td class="ed"><input data-pf="client" value="${core.esc(a.client || "")}"></td>
        <td class="ed"><input type="date" data-pf="start" value="${core.esc(a.start)}"></td>
        <td class="ed"><input type="date" data-pf="end" value="${core.esc(a.end || a.start)}"></td>
        <td class="ed num"><input type="number" min="0" max="100" step="5" data-pf="progress" value="${a.progress || 0}"></td>
        <td class="ed"><select data-pf="priority">${pOpts}</select></td>
        <td class="ed"><select data-pf="finDirection">${fOpts}</select></td>
        <td class="ed num"><input type="number" step="0.01" min="0" data-pf="amount" value="${val}"></td>
        <td class="ed"><select data-pf="finStatus">${stOpts}</select></td>
        <td class="ed wide"><input data-pf="notes" value="${core.esc(a.notes || "")}"></td>
        <td>
          <button type="button" class="icon-btn" data-pedit="${core.esc(a.id)}" title="Abrir cartão">✏️</button>
          <button type="button" class="icon-btn" data-pdel="${core.esc(a.id)}" title="Excluir">🗑️</button>
        </td>
      </tr>`;
    });

    const t = computeProTotals(rows);
    h += `</tbody><tfoot><tr>
      <td colspan="9">TOTAL FILTRADO (${rows.length} cartões)</td>
      <td colspan="2" class="num">+${core.money(t.totalIncome)} / −${core.money(t.totalExpense)}</td>
      <td colspan="3">Líquido: ${core.money(t.netPlanned)}</td>
    </tr></tfoot>`;
    tb.innerHTML = h;

    tb.querySelectorAll("[data-pf]").forEach(el => {
      el.onchange = () => {
        const id = el.closest("tr")?.dataset.id;
        const ctx = findProCardContext(id);
        if (!ctx) return;
        if (ctx.trip?.role === "viewer") { renderProTable(); return core.toast("👁️ Somente visualização."); }
        const f = el.dataset.pf;
        const a = ctx.activity;
        if (f === "amount") {
          const num = Math.max(0, parseFloat(el.value) || 0);
          a.amount = num;
          if (a.finStatus === "Liquidado") a.actualAmount = num;
        } else if (f === "progress") {
          a.progress = Math.max(0, Math.min(100, parseInt(el.value, 10) || 0));
        } else {
          a[f] = el.value;
          if (f === "start") {
            if (!a.start) a.end = "";
            else if (!a.end || a.end < a.start) a.end = a.start;
          }
          if (f === "end") {
            if (!a.start) a.end = "";
            else if (a.end && a.end < a.start) a.end = a.start;
          }
        }
        core.saveTripRecord(ctx.trip, "💾 Planilha atualizada");
      };
    });
    tb.querySelectorAll("[data-pedit]").forEach(b => { b.onclick = () => openProCardModal(b.dataset.pedit); });
    tb.querySelectorAll("[data-pdel]").forEach(b => { b.onclick = () => deleteProCard(b.dataset.pdel); });

    mc.innerHTML = rows.map(a => {
      const info = getProTypeInfo(a.type);
      const finTxt = formatProFinShort(a);
      const tCol = info.isCustom && info.color ? ` style="--t-color:${core.esc(info.color)}"` : "";
      return `<div class="m-card">
        <div class="m-card-head">
          <div><span class="chip ${info.cls}"${tCol}>${info.icon} ${core.esc(a.type)}</span> <b>${core.esc(a.name)}</b></div>
          <div class="inline-actions">
            <button type="button" class="icon-btn" data-pedit="${core.esc(a.id)}">✏️</button>
            <button type="button" class="icon-btn" data-pdel="${core.esc(a.id)}">🗑️</button>
          </div>
        </div>
        <div class="m-card-grid">
          <div><span class="muted">Lista:</span> ${core.esc(a.columnTitle || "-")}</div>
          <div><span class="muted">Datas:</span> ${a.start ? `${core.fmtShortBR(a.start)}–${core.fmtShortBR(a.end || a.start)}` : "Sem prazo"}</div>
          <div><span class="muted">Progresso:</span> ${a.progress || 0}% · ${core.esc(a.priority)}</div>
          <div><span class="muted">Financeiro:</span> ${finTxt ? `${core.esc(finTxt)} (${core.esc(a.finStatus)})` : "—"}</div>
        </div>
      </div>`;
    }).join("") || `<p class="muted">Nenhum cartão encontrado.</p>`;
    mc.querySelectorAll("[data-pedit]").forEach(b => { b.onclick = () => openProCardModal(b.dataset.pedit); });
    mc.querySelectorAll("[data-pdel]").forEach(b => { b.onclick = () => deleteProCard(b.dataset.pdel); });
  }

  /* ---------- 6. PARÂMETROS PROFISSIONAIS & ESTRUTURA TRELLO ---------- */
  function renderProParams() {
    const st = core.getState();
    const multiNote = $("#proParamsMultiNote");
    if (multiNote) {
      if (core.isMultiTripMode()) {
        const active = core.getActiveTrip();
        multiNote.textContent = `📌 Você está visualizando múltiplos projetos combinados. As metas, listas e etiquetas abaixo editam o projeto principal "${active?.name || st.title}".`;
        multiNote.hidden = false;
      } else {
        multiNote.hidden = true;
      }
    }

    if ($("#pp-title")) $("#pp-title").value = st.title || "";
    if ($("#pp-client")) $("#pp-client").value = st.params?.clientDefault || "";
    if ($("#pp-revenueTarget")) $("#pp-revenueTarget").value = st.params?.revenueTarget || 0;
    if ($("#pp-costBudget")) $("#pp-costBudget").value = st.params?.costBudget || 0;
    if ($("#pp-taxRatePct")) $("#pp-taxRatePct").value = st.params?.taxRatePct || 0;
    if ($("#pp-hourlyRate")) $("#pp-hourlyRate").value = st.params?.hourlyRate || 0;
    if ($("#pp-remTime")) $("#pp-remTime").value = st.params?.calendarReminderTime || "09:00";

    const caps = window.FeriasApi?.getServerCaps?.() || {};
    const gBadge = $("#proGeminiStatusBadge");
    if (gBadge) {
      gBadge.textContent = caps.hasGemini ? "✅ IA Ativa na conta" : "Não configurada";
      gBadge.className = caps.hasGemini ? "pill ok" : "pill warn";
    }
    if ($("#proCalBadge")) {
      $("#proCalBadge").textContent = `Lembrete dia anterior ${st.params?.calendarReminderTime || "09:00"}`;
    }

    // Listas Trello
    const cols = getMergedColumns();
    const doneSel = $("#pp-doneColumnId");
    if (doneSel) {
      const doneVal = String(st.params?.doneColumnId || "");
      doneSel.innerHTML = `<option value="">Não mover (apenas marcar concluída e 100%)</option>`
        + cols.map(c => `<option value="${core.esc(c.id)}">${core.esc(c.title)}</option>`).join("");
      doneSel.value = cols.some(c => c.id === doneVal) ? doneVal : "";
    }

    // Tipos de Cartão (Padrão + Customizados)
    const typesMgr = $("#proCardTypesManager");
    if (typesMgr) {
      const allTypes = Object.values(getAllProTypes(st));
      typesMgr.innerHTML = allTypes.map(t => {
        const badgeStyle = `style="--t-color:${core.esc(t.color || "#2563eb")}"`;
        const finHint = t.defaultFin === "income" ? " · +Receb." : (t.defaultFin === "expense" ? " · −Desp." : "");
        const btns = t.isCustom
          ? `<div class="inline-actions">
              <button type="button" class="icon-btn" data-ptedit="${core.esc(t.id)}" title="Editar tipo">✏️</button>
              <button type="button" class="icon-btn" data-ptdel="${core.esc(t.id)}" title="Excluir tipo">🗑️</button>
            </div>`
          : `<span class="pill" style="font-size:0.68rem">Padrão</span>`;
        return `<div class="pro-type-row">
          <div class="pro-type-row-left">
            <span class="pro-type-row-badge" ${badgeStyle}>${t.iconHtml}</span>
            <div style="min-width:0">
              <div class="pro-type-row-name">${core.esc(t.short)}</div>
              <div class="muted" style="font-size:0.7rem">${t.isCustom ? "Personalizado" : "Sistema"}${finHint}</div>
            </div>
          </div>
          ${btns}
        </div>`;
      }).join("");
      typesMgr.querySelectorAll("[data-ptedit]").forEach(b => {
        b.onclick = () => openProTypeModal({ editId: b.dataset.ptedit });
      });
      typesMgr.querySelectorAll("[data-ptdel]").forEach(b => {
        b.onclick = () => deleteProCustomType(b.dataset.ptdel);
      });
    }
    const colsMgr = $("#proColumnsManager");
    if (colsMgr) {
      colsMgr.innerHTML = cols.map((c, idx) => `
        <div class="pro-col-mgr-row">
          <input type="color" data-pmcol-color="${core.esc(c.id)}" value="${core.esc(c.color || "#2563eb")}">
          <input type="text" data-pmcol-name="${core.esc(c.id)}" value="${core.esc(c.title)}">
          <button type="button" class="icon-btn" data-pmcol-up="${idx}" ${idx === 0 ? "disabled" : ""} title="Subir">▲</button>
          <button type="button" class="icon-btn" data-pmcol-down="${idx}" ${idx === cols.length - 1 ? "disabled" : ""} title="Descer">▼</button>
          <button type="button" class="icon-btn" data-pmcol-del="${core.esc(c.id)}" ${cols.length <= 1 ? "disabled" : ""} title="Remover">🗑️</button>
        </div>`).join("");

      colsMgr.querySelectorAll("[data-pmcol-color]").forEach(el => {
        el.onchange = () => {
          const col = st.columns.find(x => x.id === el.dataset.pmcolColor);
          if (col) { col.color = el.value; core.save("🎨 Cor da lista atualizada"); }
        };
      });
      colsMgr.querySelectorAll("[data-pmcol-name]").forEach(el => {
        el.onchange = () => {
          const col = st.columns.find(x => x.id === el.dataset.pmcolName);
          if (col && el.value.trim()) { col.title = el.value.trim(); core.save("✏️ Lista renomeada"); }
        };
      });
      colsMgr.querySelectorAll("[data-pmcol-up]").forEach(b => {
        b.onclick = () => {
          const i = parseInt(b.dataset.pmcolUp, 10);
          if (i > 0) { const [m] = st.columns.splice(i, 1); st.columns.splice(i - 1, 0, m); core.save("↕️ Ordem das listas atualizada"); }
        };
      });
      colsMgr.querySelectorAll("[data-pmcol-down]").forEach(b => {
        b.onclick = () => {
          const i = parseInt(b.dataset.pmcolDown, 10);
          if (i < st.columns.length - 1) { const [m] = st.columns.splice(i, 1); st.columns.splice(i + 1, 0, m); core.save("↕️ Ordem das listas atualizada"); }
        };
      });
      colsMgr.querySelectorAll("[data-pmcol-del]").forEach(b => {
        b.onclick = () => deleteProColumn(b.dataset.pmcolDel);
      });
    }

    // Etiquetas Trello
    const labels = getMergedLabels();
    const lblMgr = $("#proLabelsManager");
    if (lblMgr) {
      lblMgr.innerHTML = labels.map(l => `
        <div class="pro-col-mgr-row">
          <input type="color" data-pmlbl-color="${core.esc(l.id)}" value="${core.esc(l.color || "#2563eb")}">
          <input type="text" data-pmlbl-name="${core.esc(l.id)}" value="${core.esc(l.name)}">
        </div>`).join("");
      lblMgr.querySelectorAll("[data-pmlbl-color]").forEach(el => {
        el.onchange = () => {
          const l = st.labels.find(x => x.id === el.dataset.pmlblColor);
          if (l) { l.color = el.value; core.save("🎨 Cor da etiqueta atualizada"); }
        };
      });
      lblMgr.querySelectorAll("[data-pmlbl-name]").forEach(el => {
        el.onchange = () => {
          const l = st.labels.find(x => x.id === el.dataset.pmlblName);
          if (l && el.value.trim()) { l.name = el.value.trim(); core.save("🏷️ Etiqueta atualizada"); }
        };
      });
    }

    // Responsáveis do Projeto (com cor exclusiva por pessoa)
    const asgMgr = $("#proAssigneesManager");
    if (asgMgr) {
      const assignees = getAllProAssignees(st.activities);
      if (!assignees.length) {
        asgMgr.innerHTML = `<span class="muted small">Nenhum responsável cadastrado ainda.</span>`;
      } else {
        asgMgr.innerHTML = assignees.map(name => {
          const col = colorForAssignee(name);
          return `<span class="pro-assignee-badge" style="--asg-bg:${col.bg};--asg-fg:${col.fg};--asg-bd:${col.bd};padding:4px 10px;gap:6px">
            <span>👤 ${core.esc(name)}</span>
            <button type="button" class="icon-btn" data-passignee-del="${core.esc(name)}" title="Remover responsável" style="padding:0 3px;font-size:.75rem;color:inherit">✕</button>
          </span>`;
        }).join("");
        asgMgr.querySelectorAll("[data-passignee-del]").forEach(b => {
          b.onclick = () => removeProAssignee(b.dataset.passigneeDel);
        });
      }
    }

    // Menus Visíveis neste Projeto
    const menusMgr = $("#proVisibleMenusManager");
    if (menusMgr) {
      const vis = getVisibleProMenus(st);
      menusMgr.innerHTML = PRO_MENU_ITEMS.map(m => `
        <label class="pro-toggle-item">
          <input type="checkbox" data-pmenu-vis="${core.esc(m.id)}" ${vis[m.id] ? "checked" : ""}>
          <span>${core.esc(m.label)}</span>
        </label>`).join("");
      menusMgr.querySelectorAll("[data-pmenu-vis]").forEach(cb => {
        cb.onchange = () => {
          const id = cb.dataset.pmenuVis;
          if (!st.params.visibleMenus || typeof st.params.visibleMenus !== "object") {
            st.params.visibleMenus = getVisibleProMenus(st);
          }
          st.params.visibleMenus[id] = cb.checked;
          if (!Object.values(st.params.visibleMenus).some(Boolean)) {
            st.params.visibleMenus[id] = true;
            cb.checked = true;
            return core.toast("Mantenha ao menos 1 menu visível no projeto.");
          }
          applyProVisibleMenusUI();
          core.save("👁️ Menus visíveis do projeto atualizados");
        };
      });
    }

    // Seções & Gráficos do Dashboard
    const dashMgr = $("#proDashWidgetsManager");
    if (dashMgr) {
      const wCfg = getProDashWidgetsCfg(st);
      dashMgr.innerHTML = PRO_DASH_WIDGETS.map(w => `
        <label class="pro-toggle-item">
          <input type="checkbox" data-pdash-wid="${core.esc(w.id)}" ${wCfg[w.id] ? "checked" : ""}>
          <span>${core.esc(w.label)}</span>
        </label>`).join("");
      dashMgr.querySelectorAll("[data-pdash-wid]").forEach(cb => {
        cb.onchange = () => {
          const id = cb.dataset.pdashWid;
          if (!st.params.dashWidgets || typeof st.params.dashWidgets !== "object") {
            st.params.dashWidgets = getProDashWidgetsCfg(st);
          }
          st.params.dashWidgets[id] = cb.checked;
          core.save("📊 Painéis e gráficos do Dashboard atualizados");
        };
      });
    }
    applyProVisibleMenusUI();
  }

  /* ---------- 7. CHECKLIST EXECUTIVO ---------- */
  function renderProChecklist() {
    const st = core.getState();
    const L = st.checklist || [];
    const done = L.filter(c => c.status === "Concluído").length;
    if ($("#proCheckProgress")) $("#proCheckProgress").textContent = `${done}/${L.length}`;
    if ($("#proCheckBar")) $("#proCheckBar").style.width = `${L.length ? (done / L.length * 100) : 0}%`;

    const items = proCheckFilter ? L.filter(c => c.status === proCheckFilter) : L;
    const sel = (c, f, opts) => `<td class="ed"><select data-pc="${c.id}" data-f="${f}">${opts.map(o => `<option ${o === c[f] ? "selected" : ""}>${o}</option>`).join("")}</select></td>`;
    const inp = (c, f, cls = "") => `<td class="ed ${cls}"><input data-pc="${c.id}" data-f="${f}" value="${core.esc(c[f])}"></td>`;

    const tb = $("#proCheckTable");
    if (tb) {
      let h = `<thead><tr><th title="Arrastar">↕</th><th>✓</th><th>#</th><th>Categoria</th><th>Item</th><th>Prioridade</th><th>Status</th><th>Notas</th><th>Ações</th></tr></thead><tbody>`;
      items.forEach((c, i) => {
        h += `<tr class="chk-row ${c.status === "Concluído" ? "done" : ""}" draggable="true" data-dragid="${c.id}">
          <td style="width:28px"><span class="drag-handle" title="Arraste para reordenar">⋮⋮</span></td>
          <td><input type="checkbox" data-pchk="${c.id}" ${c.status === "Concluído" ? "checked" : ""}></td>
          <td>${i + 1}</td>
          ${inp(c, "cat")}${inp(c, "item", "wide itm")}
          ${sel(c, "prio", ["Alta", "Média", "Baixa"])}
          ${sel(c, "status", ["Pendente", "Em andamento", "Concluído"])}
          ${inp(c, "notes", "wide")}
          <td>
            <button type="button" class="icon-btn" data-pcmove="${c.id}:-1" title="Subir">▲</button>
            <button type="button" class="icon-btn" data-pcmove="${c.id}:1" title="Descer">▼</button>
            <button type="button" class="icon-btn" data-pcedit="${c.id}" title="Editar">✏️</button>
            <button type="button" class="icon-btn" data-pcdel="${c.id}" title="Excluir">🗑️</button>
          </td>
        </tr>`;
      });
      tb.innerHTML = h + "</tbody>";
    }

    const mc = $("#proMobileCheckCards");
    if (mc) {
      mc.innerHTML = items.map(c => `
        <div class="m-card" draggable="true" data-dragid="${c.id}">
          <div class="m-card-head">
            <label style="display:flex;align-items:center;gap:8px;font-weight:700">
              <span class="drag-handle">⋮⋮</span>
              <input type="checkbox" data-pchk="${c.id}" ${c.status === "Concluído" ? "checked" : ""}>
              <span>${core.esc(c.item)}</span>
            </label>
            <div class="inline-actions">
              <button type="button" class="icon-btn" data-pcmove="${c.id}:-1">▲</button>
              <button type="button" class="icon-btn" data-pcmove="${c.id}:1">▼</button>
              <button type="button" class="icon-btn" data-pcedit="${c.id}">✏️</button>
              <button type="button" class="icon-btn" data-pcdel="${c.id}">🗑️</button>
            </div>
          </div>
          <div class="m-card-grid">
            <div><span class="muted">Cat.:</span> ${core.esc(c.cat)}</div>
            <div><span class="muted">Prioridade:</span> ${core.esc(c.prio)} · ${core.esc(c.status)}</div>
          </div>
          ${c.notes ? `<div class="muted small">${core.esc(c.notes)}</div>` : ""}
        </div>`).join("") || `<p class="muted">Nenhum item nesta categoria.</p>`;
    }

    const bindRoot = root => {
      if (!root) return;
      root.querySelectorAll("[data-f]").forEach(el => {
        el.onchange = () => { const it = st.checklist.find(x => x.id === el.dataset.pc); if (it) { it[el.dataset.f] = el.value; core.save(); } };
      });
      root.querySelectorAll("[data-pchk]").forEach(el => {
        el.onchange = () => {
          const it = st.checklist.find(x => x.id === el.dataset.pchk);
          if (it) { it.status = el.checked ? "Concluído" : "Pendente"; core.save(el.checked ? "✅ Item concluído!" : ""); }
        };
      });
      root.querySelectorAll("[data-pcmove]").forEach(b => {
        b.onclick = () => {
          const [cid, deltaStr] = b.dataset.pcmove.split(":");
          const idx = st.checklist.findIndex(x => x.id === cid);
          const next = idx + parseInt(deltaStr, 10);
          if (idx >= 0 && next >= 0 && next < st.checklist.length) {
            const [m] = st.checklist.splice(idx, 1);
            st.checklist.splice(next, 0, m);
            core.save("↕️ Ordem atualizada");
          }
        };
      });
      root.querySelectorAll("[data-pcedit]").forEach(b => { b.onclick = () => core.openCheckModal(b.dataset.pcedit); });
      root.querySelectorAll("[data-pcdel]").forEach(b => {
        b.onclick = () => { st.checklist = st.checklist.filter(x => x.id !== b.dataset.pcdel); core.save("Item removido"); };
      });
    };
    let draggingId = null;
    const bindDnD = (container, selector) => {
      if (!container) return;
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
          if (from && to && from !== to) {
            const fromIdx = st.checklist.findIndex(x => x.id === from);
            const toIdx = st.checklist.findIndex(x => x.id === to);
            if (fromIdx >= 0 && toIdx >= 0) {
              const [moved] = st.checklist.splice(fromIdx, 1);
              st.checklist.splice(toIdx, 0, moved);
              core.save("↕️ Ordem de prioridade atualizada");
            }
          }
        });
        row.addEventListener("dragend", () => {
          draggingId = null;
          container.querySelectorAll(selector).forEach(r => r.classList.remove("dragging-row", "drag-over"));
        });
      });
    };

    bindRoot(tb);
    bindRoot(mc);
    bindDnD(tb, "tr.chk-row[data-dragid]");
    bindDnD(mc, ".m-card[data-dragid]");
  }

  /* ---------- MODAL DE CARTÃO ESTILO TRELLO ---------- */
  function renderProModalSubtasks() {
    const listEl = $("#pc-subtasksList");
    const progEl = $("#pc-subtasksProgress");
    const barEl = $("#pc-subtasksBar");
    const done = proModalSubtasks.filter(s => s.done).length;
    const total = proModalSubtasks.length;
    if (progEl) progEl.textContent = total ? `(${done}/${total})` : "";
    if (barEl) barEl.style.width = `${total ? (done / total * 100) : 0}%`;
    if (!listEl) return;
    listEl.innerHTML = proModalSubtasks.map((st, idx) => `
      <div class="pro-subtask-row ${st.done ? "done" : ""}">
        <input type="checkbox" data-sub-idx="${idx}" ${st.done ? "checked" : ""}>
        <span>${core.esc(st.text)}</span>
        <button type="button" class="icon-btn" data-sub-del="${idx}" title="Remover subtarefa">✕</button>
      </div>`).join("") || `<div class="muted small">Nenhuma subtarefa ainda.</div>`;

    listEl.querySelectorAll("[data-sub-idx]").forEach(cb => {
      cb.onchange = () => {
        const i = parseInt(cb.dataset.subIdx, 10);
        if (proModalSubtasks[i]) {
          proModalSubtasks[i].done = cb.checked;
          if (proModalSubtasks.length > 0 && $("#pc-progress")) {
            const pct = Math.round(proModalSubtasks.filter(s => s.done).length / proModalSubtasks.length * 100 / 5) * 5;
            $("#pc-progress").value = String(pct);
            if ($("#pc-progressVal")) $("#pc-progressVal").textContent = `${pct}%`;
          }
          renderProModalSubtasks();
        }
      };
    });
    listEl.querySelectorAll("[data-sub-del]").forEach(btn => {
      btn.onclick = () => {
        proModalSubtasks.splice(parseInt(btn.dataset.subDel, 10), 1);
        renderProModalSubtasks();
      };
    });
  }

  function renderProModalAttachments() {
    const box = $("#pc-attachList");
    if (!box) return;
    if (!proModalAttachments.length) {
      box.innerHTML = `<div class="muted small">Nenhum arquivo ou link anexado.</div>`;
      return;
    }
    box.innerHTML = proModalAttachments.map((att, idx) => {
      const href = att.isLink ? att.url : window.FeriasApi.attachmentHref(att);
      const ico = att.isLink ? "🔗" : (String(att.mimeType || "").includes("pdf") ? "📕" : "📄");
      return `<div class="attach-chip">
        <a href="${core.esc(href)}" target="_blank" rel="noopener">${ico} ${core.esc(att.fileName || att.url || "Anexo")}</a>
        <button type="button" class="icon-btn" data-patt-del="${idx}" title="Remover">✕</button>
      </div>`;
    }).join("");
    box.querySelectorAll("[data-patt-del]").forEach(b => {
      b.onclick = async () => {
        const idx = parseInt(b.dataset.pattDel, 10);
        const att = proModalAttachments[idx];
        if (att && att.id && !att.isLink) {
          await window.FeriasApi.deleteAttachment(att.id).catch(() => {});
        }
        proModalAttachments.splice(idx, 1);
        renderProModalAttachments();
      };
    });
  }

  function renderProModalCoverAndLabels() {
    const coverBar = $("#proCardCoverBar");
    if (coverBar) {
      coverBar.hidden = !proModalCoverColor;
      if (proModalCoverColor) coverBar.style.background = proModalCoverColor;
    }
    const swEl = $("#pc-coverColors");
    if (swEl) {
      swEl.innerHTML = COVER_SWATCHES.map(col => `
        <button type="button" class="pro-swatch ${proModalCoverColor === col ? "active" : ""}" data-sw="${core.esc(col)}"
          style="background:${col || "var(--bg)"};${col ? "" : "border:1px dashed var(--border-strong)"}" title="${col || "Sem capa"}"></button>`).join("");
      swEl.querySelectorAll("[data-sw]").forEach(btn => {
        btn.onclick = () => {
          proModalCoverColor = btn.dataset.sw;
          renderProModalCoverAndLabels();
        };
      });
    }
    const lblEl = $("#pc-labelsBox");
    if (lblEl) {
      const labels = getMergedLabels();
      const selSet = new Set(proModalLabels);
      lblEl.innerHTML = labels.map(l => `
        <button type="button" class="pro-label-opt ${selSet.has(l.id) ? "active" : ""}" data-lbl="${core.esc(l.id)}" style="--lbl-c:${core.esc(l.color)}">
          <span style="width:9px;height:9px;border-radius:50%;background:${core.esc(l.color)}"></span>
          <span>${core.esc(l.name)}</span>
        </button>`).join("");
      lblEl.querySelectorAll("[data-lbl]").forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.lbl;
          const idx = proModalLabels.indexOf(id);
          if (idx >= 0) proModalLabels.splice(idx, 1);
          else proModalLabels.push(id);
          renderProModalCoverAndLabels();
        };
      });
    }
  }

  function refreshProModalTagsSelector(selectedTags) {
    const host = $("#pc-tagsHost");
    if (!host) return;
    const opts = core.getAllAvailableTags().map(tg => ({ id: tg, label: tg }));
    if (!proModalTagsMsel) {
      proModalTagsMsel = core.createMultiSelect(host, {
        minSelected: 0,
        triggerId: "pc-tagsTrigger",
        allowCreate: true,
        createPlaceholder: "Nova tag (Enter)...",
        allLabel: "☑️ Todas",
        noneLabel: "✕ Limpar",
        showOnlyBtn: false,
        getLabel: sel => sel.length ? (sel.length <= 2 ? sel.map(s => s.label).join(", ") : `${sel.length} tags`) : "Selecionar ou criar tag...",
        isHighlighted: sel => sel.length > 0,
        onCreate(raw, selSet) {
          const name = core.registerCustomTag(raw, [...selSet]);
          if (name) {
            proModalDraftTags = [...new Set([...selSet, name])];
            refreshProModalTagsSelector(proModalDraftTags);
          }
          return name;
        },
        onChange(ids) { proModalDraftTags = [...ids]; }
      });
    }
    proModalTagsMsel?.setOptions(opts, selectedTags || proModalDraftTags || []);
  }

  function toggleProFinFields() {
    const dir = $("#pc-finDirection")?.value || "none";
    const row = $("#pc-finFieldsRow");
    if (row) row.hidden = dir === "none";
  }

  function updateProModalTypePreview() {
    const sel = $("#pc-type");
    const prev = $("#pc-typeIconPreview");
    if (!sel || !prev) return;
    const info = getProTypeInfo(sel.value);
    prev.innerHTML = info.iconHtml || info.icon;
    prev.style.setProperty("--t-color", info.color || "#38bdf8");
    prev.title = info.short;
  }

  function updateProModalDoneBtn() {
    const btn = $("#btnProCardDoneToggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", proModalCompleted ? "true" : "false");
    btn.textContent = proModalCompleted ? "✅ Concluída" : "☐ Concluir";
    btn.title = proModalCompleted ? "Tarefa concluída (clique para reabrir)" : "Marcar tarefa como concluída (100%)";
  }

  function renderProIconDropdown(hostEl, selectedIconId, colorHex, onPick) {
    if (!hostEl) return;
    const catalog = window.PRO_ICON_CATALOG || [];
    const current = (window.PRO_ICON_MAP && window.PRO_ICON_MAP[selectedIconId]) || catalog[0] || { id: "flag", label: "Missão" };
    const groups = [];
    const byGroup = new Map();
    catalog.forEach(ic => {
      const g = ic.group || "Ícones";
      if (!byGroup.has(g)) { byGroup.set(g, []); groups.push(g); }
      byGroup.get(g).push(ic);
    });

    const groupsHtml = groups.map(g => {
      const optsHtml = byGroup.get(g).map(ic => `
        <button type="button" class="pro-ico-dd-opt${ic.id === current.id ? " active" : ""}" data-ico-id="${core.esc(ic.id)}">
          ${window.renderProIconSvg(ic.id)}
          <span>${core.esc(ic.label)}</span>
        </button>`).join("");
      return `<div class="pro-ico-dd-group"><div class="pro-ico-dd-gtitle">${core.esc(g)}</div><div class="pro-ico-dd-grid">${optsHtml}</div></div>`;
    }).join("");

    hostEl.innerHTML = `
      <button type="button" class="pro-ico-dd-trigger" id="pct-iconTrigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="pro-ico-dd-val" style="--t-color:${core.esc(colorHex || "#2563eb")}">
          ${window.renderProIconSvg(current.id)}
          <span>${core.esc(current.label)}</span>
        </span>
        <span class="msel-caret" aria-hidden="true">▾</span>
      </button>
      <div class="pro-ico-dd-menu" id="pct-iconMenu" role="listbox" hidden>${groupsHtml}</div>`;

    const trig = hostEl.querySelector("#pct-iconTrigger");
    const menu = hostEl.querySelector("#pct-iconMenu");
    if (trig && menu) {
      trig.onclick = ev => {
        ev.stopPropagation();
        const willOpen = menu.hidden;
        menu.hidden = !willOpen;
        trig.setAttribute("aria-expanded", String(willOpen));
      };
      menu.querySelectorAll("[data-ico-id]").forEach(btn => {
        btn.onclick = ev => {
          ev.stopPropagation();
          const picked = btn.dataset.icoId;
          proTypePickedIcon = picked;
          menu.hidden = true;
          trig.setAttribute("aria-expanded", "false");
          renderProIconDropdown(hostEl, picked, $("#pct-color")?.value || colorHex, onPick);
          if (typeof onPick === "function") onPick(picked);
        };
      });
    }
  }

  function openProTypeModal({ editId = null, onCreated = null } = {}) {
    const active = core.getActiveTrip();
    if (active?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
    const st = core.getState();
    const existing = editId ? (st.customCardTypes || []).find(t => t.id === editId) : null;
    editingProTypeId = existing ? existing.id : null;
    proTypeModalCallback = typeof onCreated === "function" ? onCreated : null;
    proTypePickedIcon = existing?.iconId || "jet-gripen";

    if ($("#proTypeModalTitle")) $("#proTypeModalTitle").textContent = existing ? "Editar Tipo de Cartão" : "Novo Tipo de Cartão";
    if ($("#pct-name")) $("#pct-name").value = existing ? existing.id : "";
    const col = existing?.color || "#2563eb";
    if ($("#pct-color")) $("#pct-color").value = col;
    if ($("#pct-defaultFin")) $("#pct-defaultFin").value = existing?.defaultFin || "none";
    if ($("#btnProTypeDelete")) $("#btnProTypeDelete").hidden = !existing;
    renderProIconDropdown($("#pct-iconPicker"), proTypePickedIcon, col, id => { proTypePickedIcon = id; });

    const dlg = $("#proTypeModal");
    if (dlg) {
      dlg.showModal();
      setTimeout(() => $("#pct-name")?.focus(), 40);
    }
  }

  function deleteProCustomType(typeId) {
    const active = core.getActiveTrip();
    if (active?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
    const st = core.getState();
    st.customCardTypes = (st.customCardTypes || []).filter(t => t.id !== typeId);
    let reassigned = 0;
    (st.activities || []).forEach(a => {
      if (a.type === typeId) { a.type = "Outro"; reassigned++; }
    });
    proBoardTypeSet.delete(typeId);
    proGanttTypeSet.delete(typeId);
    proTableTypeSet.delete(typeId);
    core.save(`🗑️ Tipo "${typeId}" removido${reassigned ? ` (${reassigned} cartão(ões) movidos para Outro)` : ""}`);
  }

  function populateProColumnSelect(dataOpt = null) {
    const sel = $("#pc-column");
    if (!sel) return;
    const cols = (dataOpt && Array.isArray(dataOpt.columns) && dataOpt.columns.length)
      ? dataOpt.columns
      : (editingProTripRef?.data?.columns || getMergedColumns());
    sel.innerHTML = `<option value="">— Sem lista (apenas Gantt &amp; Timeline) —</option>`
      + cols.map(c => `<option value="${core.esc(c.id)}">${core.esc(c.title)}</option>`).join("");
  }

  function populateProTypeSelect(dataOpt = null) {
    const sel = $("#pc-type");
    if (!sel) return;
    const allTypes = Object.values(getAllProTypes(dataOpt));
    sel.innerHTML = allTypes.map(t => `<option value="${core.esc(t.id)}">${core.esc(t.short)}</option>`).join("");
  }

  function renderProModalExtraAssignees() {
    const box = $("#pc-extraAssigneesList");
    if (!box) return;
    const allList = getAllProAssignees();
    if (!proModalExtraAssignees.length) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML = proModalExtraAssignees.map((row, idx) => {
      const items = [...allList];
      if (row.name && !items.some(x => x.toLowerCase() === row.name.toLowerCase())) items.push(row.name);
      const opts = `<option value="">— Selecionar responsável —</option>`
        + items.map(a => `<option value="${core.esc(a)}" ${a.toLowerCase() === String(row.name || "").toLowerCase() ? "selected" : ""}>${core.esc(a)}</option>`).join("");
      return `<div class="pro-extra-assignee-row" data-ex-asg-idx="${idx}">
        <select data-ex-asg-sel="${idx}" aria-label="Responsável adicional">${opts}</select>
        <label class="pro-travel-chk-label" title="Marque se este responsável viaja nesta tarefa">
          <input type="checkbox" data-ex-asg-trv="${idx}" ${row.travels ? "checked" : ""}>
          <span>✈️ Viaja</span>
        </label>
        <button type="button" class="icon-btn" data-ex-asg-del="${idx}" title="Remover responsável deste cartão">✕</button>
      </div>`;
    }).join("");

    box.querySelectorAll("[data-ex-asg-sel]").forEach(sel => {
      sel.onchange = () => {
        const i = parseInt(sel.dataset.exAsgSel, 10);
        if (proModalExtraAssignees[i]) proModalExtraAssignees[i].name = sel.value;
      };
    });
    box.querySelectorAll("[data-ex-asg-trv]").forEach(chk => {
      chk.onchange = () => {
        const i = parseInt(chk.dataset.exAsgTrv, 10);
        if (proModalExtraAssignees[i]) proModalExtraAssignees[i].travels = chk.checked;
      };
    });
    box.querySelectorAll("[data-ex-asg-del]").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.exAsgDel, 10);
        proModalExtraAssignees.splice(i, 1);
        renderProModalExtraAssignees();
      };
    });
  }

  function ensureProLocationAutocomplete() {
    const inp = $("#pc-location");
    const listEl = $("#ac-pro-location");
    if (!inp || !listEl || proLocationAcCtrl) return;
    if (window.FeriasMaps?.attachAutocomplete) {
      proLocationAcCtrl = window.FeriasMaps.attachAutocomplete(inp, listEl, (place, display) => {
        if (display) inp.value = display;
        const loc = place?.location;
        const lat = typeof loc?.lat === "function" ? loc.lat() : Number(loc?.lat);
        const lng = typeof loc?.lng === "function" ? loc.lng() : Number(loc?.lng);
        if (isFinite(lat) && isFinite(lng)) {
          proModalLocationLat = lat;
          proModalLocationLng = lng;
        } else {
          proModalLocationLat = null;
          proModalLocationLng = null;
        }
      });
    }
    inp.addEventListener("change", async () => {
      const val = inp.value.trim();
      if (!val) {
        proModalLocationLat = null;
        proModalLocationLng = null;
        return;
      }
      if (window.FeriasMaps?.resolvePlaceStandard) {
        const std = await window.FeriasMaps.resolvePlaceStandard(val);
        if (std) {
          if (std.formatted) inp.value = std.formatted;
          if (isFinite(std.lat) && isFinite(std.lng)) {
            proModalLocationLat = std.lat;
            proModalLocationLng = std.lng;
          }
        }
      }
    });
  }

  function openProCardModal(idOrOpts) {
    ensureProLocationAutocomplete();
    const opts = (idOrOpts && typeof idOrOpts === "object") ? idOrOpts : null;
    const id = typeof idOrOpts === "string" ? idOrOpts : null;
    const ctx = id ? findProCardContext(id) : null;
    const a = ctx?.activity || null;
    editingProTripRef = ctx?.trip || core.getActiveTrip();
    editingProCardId = a ? a.id : null;
    proModalDraftId = a ? a.id : core.uid();

    const targetModeSel = $("#pc-targetMode");
    const targetTripWrap = $("#pc-targetTripWrap");
    const targetTripSel = $("#pc-targetTrip");
    if (targetModeSel) {
      targetModeSel.value = "professional";
      targetModeSel.onchange = () => {
        const chosenMode = targetModeSel.value || "professional";
        if (targetTripSel && core.populateEventSelect) {
          core.populateEventSelect(targetTripSel, chosenMode, chosenMode === "professional" ? (editingProTripRef?.id || core.getActiveTrip()?.id || "") : "");
        }
      };
    }
    if (targetTripWrap && targetTripSel) {
      if (core.populateEventSelect) {
        core.populateEventSelect(targetTripSel, "professional", editingProTripRef?.id || core.getActiveTrip()?.id || "");
      }
      targetTripWrap.hidden = false;
    }

    populateProTypeSelect(editingProTripRef?.data || null);
    const cols = editingProTripRef?.data?.columns || getMergedColumns();
    populateProColumnSelect(editingProTripRef?.data || null);

    const rawInitType = a ? a.type : (opts?.type || "Desenvolvimento");
    const initType = getProTypeInfo(rawInitType, editingProTripRef?.data || null).id;
    const tInfo = getProTypeInfo(initType, editingProTripRef?.data || null);
    const initFinDir = a ? a.finDirection : (opts?.finDirection || tInfo.defaultFin || "none");

    $("#proCardModalTitle").textContent = a ? `Editar Cartão` : "Novo Cartão Profissional";
    $("#pc-name").value = a ? a.name : "";
    $("#pc-notes").value = a ? (a.notes || "") : "";
    $("#pc-column").value = a ? (a.columnId ?? "") : (opts && "columnId" in opts ? opts.columnId : (cols[0]?.id || ""));
    $("#pc-type").value = initType;
    updateProModalTypePreview();
    $("#pc-start").value = a ? (a.start || "") : (opts && "start" in opts ? (opts.start || "") : "");
    $("#pc-end").value = a ? (a.end || a.start || "") : (opts && "end" in opts ? (opts.end || "") : (opts?.start || ""));
    $("#pc-startTime").value = a ? (a.startTime || "") : "";
    $("#pc-endTime").value = a ? (a.endTime || "") : "";
    $("#pc-priority").value = a ? (a.priority || "Média") : "Média";
    const prog = a ? (Number(a.progress) || 0) : 0;
    $("#pc-progress").value = String(prog);
    if ($("#pc-progressVal")) $("#pc-progressVal").textContent = `${prog}%`;
    const cardParams = editingProTripRef?.data?.params || core.getState()?.params;
    proModalCompleted = a ? isCardDone(a, cols, cardParams) : false;
    proModalPrevColId = a ? (a.prevColumnId || a.columnId || "") : (opts?.columnId || cols[0]?.id || "todo");
    proModalPrevProg = a ? (Number(a.prevProgress) < 100 ? Number(a.prevProgress) : (prog < 100 ? prog : 0)) : 0;
    updateProModalDoneBtn();
    $("#pc-client").value = a ? (a.client || "") : (core.getState().params?.clientDefault || "");
    const existingAsgList = a ? getCardAssigneesList(a) : [];
    const primaryAsg = existingAsgList[0] || { name: a?.assignee || "", travels: Boolean(a?.assigneeTravels) };
    populateProAssigneeSelect(primaryAsg.name, editingProTripRef?.data || null);
    if ($("#pc-assigneeTravels")) $("#pc-assigneeTravels").checked = Boolean(primaryAsg.travels);
    proModalExtraAssignees = existingAsgList.slice(1).map(e => ({ name: e.name, travels: Boolean(e.travels) }));
    renderProModalExtraAssignees();

    $("#pc-location").value = a ? (a.location || "") : "";
    if ($("#pc-meetingLink")) $("#pc-meetingLink").value = a ? (a.meetingLink || "") : "";
    proModalLocationLat = (a && a.locationLat != null && isFinite(Number(a.locationLat))) ? Number(a.locationLat) : null;
    proModalLocationLng = (a && a.locationLng != null && isFinite(Number(a.locationLng))) ? Number(a.locationLng) : null;
    if (proLocationAcCtrl) proLocationAcCtrl.clearSelected();
    if ($("#pc-attachLoading")) $("#pc-attachLoading").hidden = true;

    $("#pc-finDirection").value = initFinDir;
    $("#pc-amount").value = a && a.amount > 0 ? a.amount : "";
    $("#pc-actualAmount").value = a && a.actualAmount > 0 ? a.actualAmount : "";
    $("#pc-finStatus").value = a ? (a.finStatus || "Previsto") : "Previsto";
    $("#pc-finDueDate").value = a ? (a.finDueDate || a.end || a.start || "") : (opts?.start || "");
    toggleProFinFields();

    proModalSubtasks = a ? core.clone(a.subtasks || []) : [];
    proModalAttachments = a ? core.clone(a.attachments || []) : [];
    proModalLabels = a ? [...(a.labels || [])] : [];
    proModalCoverColor = a ? (a.coverColor || "") : "";
    proModalDraftTags = a && Array.isArray(a.tags) ? [...a.tags] : [];

    renderProModalSubtasks();
    renderProModalAttachments();
    renderProModalCoverAndLabels();
    refreshProModalTagsSelector(proModalDraftTags);

    if ($("#proCalRemLabel")) $("#proCalRemLabel").textContent = core.getState().params?.calendarReminderTime || "09:00";
    if ($("#btnProCardDelete")) $("#btnProCardDelete").style.visibility = a ? "visible" : "hidden";
    if ($("#btnProCardDuplicate")) $("#btnProCardDuplicate").hidden = !a;
    if ($("#btnProHeadCal")) $("#btnProHeadCal").hidden = !a;
    if ($("#btnProHeadWallet")) $("#btnProHeadWallet").hidden = !a;
    if (a && core.prefetchWalletPassForActivity) {
      core.prefetchWalletPassForActivity(a, editingProTripRef?.data?.title || core.getState().title);
    }
    stopProAiRecording(true);
    setProAiBusy(false, "");
    if ($("#proCardAiTextRow")) $("#proCardAiTextRow").hidden = true;
    if ($("#proCardAiTextInput")) $("#proCardAiTextInput").value = "";
    updateProModalCalLink();

    $("#proCardModal").showModal();
  }

  function readProCardForm() {
    let startVal = $("#pc-start").value || "";
    let endVal = $("#pc-end").value || "";
    if (!startVal && endVal) startVal = endVal;
    if (startVal && !endVal) endVal = startVal;
    if (startVal && endVal < startVal) endVal = startVal;
    const finDirection = $("#pc-finDirection").value || "none";
    const amount = finDirection === "none" ? 0 : Math.max(0, parseFloat($("#pc-amount").value) || 0);
    const actualAmount = finDirection === "none" ? 0 : Math.max(0, parseFloat($("#pc-actualAmount").value) || 0);
    const tags = proModalTagsMsel ? proModalTagsMsel.getSelected() : proModalDraftTags;

    const assigneesList = [];
    const seenAsg = new Set();
    const pushAsg = (nm, tr) => {
      const clean = String(nm || "").trim();
      if (!clean) return;
      const k = clean.toLowerCase();
      if (seenAsg.has(k)) {
        const ex = assigneesList.find(e => e.name.toLowerCase() === k);
        if (ex && tr) ex.travels = true;
        return;
      }
      seenAsg.add(k);
      assigneesList.push({ name: clean, travels: Boolean(tr) });
    };
    const primaryName = ($("#pc-assignee")?.value || "").trim();
    const primaryTravels = Boolean($("#pc-assigneeTravels")?.checked);
    if (primaryName) pushAsg(primaryName, primaryTravels);
    proModalExtraAssignees.forEach(r => pushAsg(r.name, r.travels));

    return {
      type: $("#pc-type").value || "Desenvolvimento",
      columnId: $("#pc-column").value || "",
      name: $("#pc-name").value.trim() || "Cartão Profissional",
      start: startVal,
      end: endVal,
      startTime: $("#pc-startTime").value || "",
      endTime: $("#pc-endTime").value || "",
      priority: $("#pc-priority").value || "Média",
      progress: Math.max(0, Math.min(100, parseInt($("#pc-progress").value, 10) || 0)),
      client: $("#pc-client").value.trim(),
      assignee: assigneesList[0]?.name || "",
      assigneeTravels: Boolean(assigneesList[0]?.travels),
      assigneesList,
      location: $("#pc-location").value.trim(),
      locationLat: proModalLocationLat,
      locationLng: proModalLocationLng,
      meetingLink: ($("#pc-meetingLink")?.value || "").trim(),
      coverColor: proModalCoverColor,
      labels: [...proModalLabels],
      tags: [...new Set(tags.map(t => String(t).trim()).filter(Boolean))],
      finDirection,
      amount,
      actualAmount,
      finStatus: $("#pc-finStatus").value || "Previsto",
      finDueDate: $("#pc-finDueDate").value || endVal || startVal || "",
      subtasks: core.clone(proModalSubtasks),
      notes: $("#pc-notes").value,
      attachments: core.clone(proModalAttachments)
    };
  }

  function updateProModalCalLink() {
    const el = $("#btnProCalLink");
    if (!el) return;
    const a = readProCardForm();
    const cols = getMergedColumns();
    a.columnTitle = cols.find(c => c.id === a.columnId)?.title || "";
    el.href = window.FeriasCalendar.buildGoogleCalendarTemplateUrl(a, core.getState().title);
  }

  function deleteProCard(id) {
    const ctx = findProCardContext(id);
    if (!ctx) return;
    if (ctx.trip?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
    ctx.data.activities = (ctx.data.activities || []).filter(x => x.id !== id);
    core.saveTripRecord(ctx.trip, "🗑️ Cartão removido");
  }

  /* ---------- IA GEMINI NO MODAL DE CARTÃO ---------- */
  function setProAiBusy(busy, msg = "", kind = "") {
    const el = $("#proCardAiStatus");
    const btns = ["#btnProCardAiUpload", "#btnProCardAiAudio", "#btnProCardAiText", "#btnProCardAiTextRun"];
    btns.forEach(s => { const b = $(s); if (b) b.disabled = busy && s !== "#btnProCardAiAudio"; });
    if (!el) return;
    if (!msg) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    const k = kind || (busy ? "loading" : "ok");
    el.className = `modal-ai-status is-${k}`;
    el.innerHTML = `${busy ? `<span class="ai-spinner" aria-hidden="true"></span>` : ""}<span>${core.esc(msg)}</span>`;
  }

  function stopProAiRecording(silent = false) {
    clearInterval(proAiRecTimer);
    proAiRecTimer = null;
    if (proAiRecorder && proAiRecorder.state === "recording") {
      try { proAiRecorder.stop(); } catch {}
    }
    if (silent && $("#btnProCardAiAudio")) $("#btnProCardAiAudio").textContent = "🎙️ Áudio";
  }

  function applyProAiExtracted(act) {
    if (!act || typeof act !== "object") return 0;
    let count = 0;
    const mappedAiType = (window.PRO_LEGACY_TYPE_MAP && window.PRO_LEGACY_TYPE_MAP[act.type]) || act.type;
    if (mappedAiType && getAllProTypes()[mappedAiType]) {
      $("#pc-type").value = mappedAiType;
      updateProModalTypePreview();
      count++;
    }
    if (act.columnId && getMergedColumns().some(c => c.id === act.columnId)) { $("#pc-column").value = act.columnId; count++; }
    if (act.name) { $("#pc-name").value = String(act.name); count++; }
    if (act.start && /^\d{4}-\d{2}-\d{2}$/.test(act.start)) { $("#pc-start").value = act.start; count++; }
    if (act.end && /^\d{4}-\d{2}-\d{2}$/.test(act.end)) { $("#pc-end").value = act.end; count++; }
    else if (act.start) $("#pc-end").value = $("#pc-start").value;
    if (act.startTime) { $("#pc-startTime").value = String(act.startTime).slice(0, 5); count++; }
    if (act.endTime) { $("#pc-endTime").value = String(act.endTime).slice(0, 5); count++; }
    if (["Crítica", "Alta", "Média", "Baixa"].includes(act.priority)) { $("#pc-priority").value = act.priority; count++; }
    if (act.progress != null && isFinite(Number(act.progress))) {
      const p = Math.max(0, Math.min(100, Math.round(Number(act.progress))));
      $("#pc-progress").value = String(p);
      if ($("#pc-progressVal")) $("#pc-progressVal").textContent = `${p}%`;
      count++;
    }
    if (act.client) { $("#pc-client").value = String(act.client); count++; }
    if (act.assignee) {
      const asg = registerProAssignee(act.assignee, false);
      populateProAssigneeSelect(asg, editingProTripRef?.data || null);
      count++;
    }
    if (act.location) { $("#pc-location").value = String(act.location); count++; }
    if (["income", "expense", "none"].includes(act.finDirection)) {
      $("#pc-finDirection").value = act.finDirection;
      toggleProFinFields();
      count++;
    }
    if (Number(act.amount) > 0) {
      $("#pc-amount").value = Number(act.amount);
      if ($("#pc-finDirection").value === "none") {
        $("#pc-finDirection").value = $("#pc-type").value === "Recebimento" ? "income" : "expense";
        toggleProFinFields();
      }
      count++;
    }
    if (["Previsto", "Liquidado"].includes(act.finStatus)) $("#pc-finStatus").value = act.finStatus;
    if (Array.isArray(act.subtasks) && act.subtasks.length) {
      proModalSubtasks = act.subtasks.map(s => ({ id: core.uid(), text: String(s.text || "").trim(), done: Boolean(s.done) })).filter(s => s.text);
      renderProModalSubtasks();
      count++;
    }
    if (act.notes) { $("#pc-notes").value = String(act.notes); count++; }
    updateProModalCalLink();
    return count;
  }

  async function runProAiAnalyze({ prompt, media = [], loadingMsg = "Gemini IA analisando..." }) {
    setProAiBusy(true, loadingMsg, "loading");
    try {
      const act = await window.FeriasApi.aiAnalyzeActivity({
        mode: "professional",
        prompt,
        baseDate: core.fmtISO(new Date()),
        media
      });
      const n = applyProAiExtracted(act);
      setProAiBusy(false, n ? `✅ Cartão preenchido (${n} campos)! Revise e salve.` : "⚠️ Não foi possível extrair os dados.", n ? "ok" : "error");
      if (n && $("#proCardAiTextRow")) $("#proCardAiTextRow").hidden = true;
    } catch (err) {
      setProAiBusy(false, "❌ " + (err.message || err), "error");
    }
  }

  /* ---------- MODAL DE LISTA/COLUNA ---------- */
  function openProColumnModal(colIdOrOpts = null) {
    const opts = (colIdOrOpts && typeof colIdOrOpts === "object") ? colIdOrOpts : null;
    const colId = typeof colIdOrOpts === "string" ? colIdOrOpts : (opts?.editId || null);
    const active = core.getActiveTrip();
    if (active?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
    const cols = editingProTripRef?.data?.columns || getMergedColumns();
    const col = colId ? cols.find(c => c.id === colId) : null;
    editingProColId = col ? col.id : null;
    proColModalCallback = typeof opts?.onCreated === "function" ? opts.onCreated : null;
    $("#proColModalTitle").textContent = col ? "Editar Lista do Quadro" : "Nova Lista do Quadro";
    $("#pcol-name").value = col ? col.title : "";
    $("#pcol-color").value = col ? (col.color || "#2563eb") : "#2563eb";
    $("#btnProColDelete").hidden = !col || cols.length <= 1;
    $("#proColumnModal").showModal();
    setTimeout(() => $("#pcol-name").focus(), 40);
  }

  function deleteProColumn(colId) {
    const st = core.getState();
    if (!Array.isArray(st.columns) || st.columns.length <= 1) {
      return core.toast("Mantenha ao menos 1 lista no quadro.");
    }
    const target = st.columns.find(c => c.id === colId);
    const fallback = st.columns.find(c => c.id !== colId);
    if (!target || !fallback) return;
    const count = (st.activities || []).filter(a => a.columnId === colId).length;
    if (count > 0 && !confirm(`Remover a lista "${target.title}" e mover ${count} cartão(ões) para "${fallback.title}"?`)) return;
    (st.activities || []).forEach(a => { if (a.columnId === colId) a.columnId = fallback.id; });
    st.columns = st.columns.filter(c => c.id !== colId);
    core.save(`🗑️ Lista "${target.title}" removida`);
  }

  /* ---------- EXPORTS & WHATSAPP PROFISSIONAL ---------- */
  function exportProXlsx() {
    if (!window.XLSX) return core.toast("Biblioteca Excel não carregou (sem internet?)");
    const wb = XLSX.utils.book_new();
    const st = core.getState();
    const cards = getProSortedActivities();
    const cols = getMergedColumns();
    const colMap = new Map(cols.map(c => [c.id, c.title]));
    const san = core.sanitizeSheetRows;

    const rows = cards.map((a, i) => ({
      "#": i + 1,
      Lista: colMap.get(a.columnId) || "-",
      Tipo: a.type,
      Cartão: a.name,
      Cliente: a.client || "",
      Responsável: a.assignee || "",
      Início: a.start ? core.fmtBR(a.start) : "Sem prazo",
      Fim: a.end ? core.fmtBR(a.end) : (a.start ? core.fmtBR(a.start) : "Sem prazo"),
      Dias: a.start ? core.days(a) : 0,
      "Progresso %": a.progress || 0,
      Prioridade: a.priority || "Média",
      "Recebimento R$": a.finDirection === "income" ? (Number(a.actualAmount) || Number(a.amount) || 0) : 0,
      "Despesa R$": a.finDirection === "expense" ? (Number(a.actualAmount) || Number(a.amount) || 0) : 0,
      "Status Financeiro": a.finDirection !== "none" ? a.finStatus : "",
      Notas: a.notes || ""
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(san(rows)), "Cartões & Cronograma");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(san((st.checklist || []).map((c, i) => ({
      "#": i + 1, Categoria: c.cat, Item: c.item, Prioridade: c.prio, Status: c.status, Notas: c.notes || ""
    })))), "Checklist Executivo");
    XLSX.writeFile(wb, `${(st.title || "My_Plan_Pro").replace(/[^\w\-]+/g, "_")}.xlsx`);
    core.toast("⬇️ Excel profissional exportado!");
  }

  function buildProWhatsAppText() {
    const st = core.getState();
    const cards = getProSortedActivities();
    const t = computeProTotals(cards);
    const lines = [
      `💼 *${st.title || "Projeto Profissional"}* (My Plan)`,
      `📊 Cartões: ${t.doneCards}/${t.totalCards} concluídos (${Math.round(t.avgProgress)}% médio)`,
      `💵 Recebimentos: *${core.money(t.totalIncome)}* (Liquidado: ${core.money(t.receivedIncome)})`,
      `💳 Despesas: *${core.money(t.totalExpense)}* (Pago: ${core.money(t.paidExpense)})`,
      `📈 Saldo Líquido: *${core.money(t.netPlanned - t.taxAmount)}*`,
      "",
      "📅 *Agenda & Entregas:*"
    ];
    cards.slice(0, 20).forEach(a => {
      const dt = !a.start ? "Sem prazo" : (a.end && a.end !== a.start ? `${core.fmtBR(a.start)}–${core.fmtBR(a.end)}` : core.fmtBR(a.start));
      const fin = formatProFinShort(a);
      lines.push(`• ${dt} · *[${a.type}]* ${a.name}${fin ? ` (${fin})` : ""}`);
    });
    const pendingChk = (st.checklist || []).filter(c => c.status !== "Concluído");
    if (pendingChk.length) {
      lines.push("", `✅ *Checklist pendente (${pendingChk.length}):*`);
      pendingChk.slice(0, 10).forEach(c => lines.push(`☐ [${c.prio}] ${c.item}`));
    }
    return lines.join("\n");
  }

  /* ---------- BINDING DE EVENTOS ---------- */
  function bindProEvents() {
    if (proInitialized) return;
    proInitialized = true;

    // Board controls
    if ($("#proBoardSearch")) $("#proBoardSearch").oninput = () => renderProBoard();
    [
      "#proBoardPrioFilter",
      "#proBoardAssigneeFilter",
      "#proBoardTravelFilter",
      "#proBoardClientFilter",
      "#proBoardLocationFilter",
      "#proBoardDoneFilter",
      "#proBoardFinDirFilter",
      "#proBoardFinStatusFilter",
      "#proBoardDateFrom",
      "#proBoardDateTo"
    ].forEach(sel => {
      if ($(sel)) $(sel).onchange = () => renderProBoard();
    });
    if ($("#btnProBoardClearFilters")) $("#btnProBoardClearFilters").onclick = resetProBoardFilters;
    if ($("#btnProBoardAdd")) $("#btnProBoardAdd").onclick = () => openProCardModal();
    if ($("#btnProBoardAddCol")) $("#btnProBoardAddCol").onclick = () => openProColumnModal();
    if ($("#btnProBoardZoomOut")) $("#btnProBoardZoomOut").onclick = () => stepProBoardZoom(-1);
    if ($("#btnProBoardZoomIn")) $("#btnProBoardZoomIn").onclick = () => stepProBoardZoom(1);
    if ($("#btnProBoardZoomReset")) $("#btnProBoardZoomReset").onclick = () => { proBoardZoom = 1; updateProBoardZoomReadout(); };

    // Mapa controls
    if ($("#btnProMapAddCard")) $("#btnProMapAddCard").onclick = () => openProCardModal();
    if ($("#btnProMapExplode")) {
      $("#btnProMapExplode").onclick = () => {
        proMapExploded = !proMapExploded;
        const totalCards = proMapCachedGroups.reduce((s, g) => s + g.cards.length, 0);
        updateProMapExplodeBtn(totalCards);
        if (proMapExploded && !proMapActiveCardId) {
          closeProMapInspector();
        }
        if (proMapInstance && proMapMarkerClass && proMapCachedGroups.length) {
          drawGoogleMapOverlays(proMapCachedGroups, { refit: true });
        } else {
          const canvas = $("#proMapCanvas");
          if (canvas) renderProMapFallbackSvg(canvas, proMapCachedGroups);
        }
        core.toast(proMapExploded
          ? `💥 Mapa explodido: ${totalCards} ${totalCards === 1 ? "missão separada" : "missões separadas"}`
          : `📍 Mapa agrupado em ${proMapCachedGroups.length} ${proMapCachedGroups.length === 1 ? "local" : "locais"}`
        );
      };
    }
    let proMapResizeTimer = null;
    window.addEventListener("resize", () => {
      if (!$("#view-pro-map")?.classList.contains("active")) return;
      clearTimeout(proMapResizeTimer);
      proMapResizeTimer = setTimeout(() => {
        if (!proMapCachedGroups.length) return;
        if (proMapInstance && proMapMarkerClass && proMapExploded) {
          drawGoogleMapOverlays(proMapCachedGroups, { refit: false });
        } else if (!proMapInstance) {
          const canvas = $("#proMapCanvas");
          if (canvas) renderProMapFallbackSvg(canvas, proMapCachedGroups);
        }
      }, 140);
    });
    if ($("#proMapQuickAssignee")) {
      $("#proMapQuickAssignee").onchange = e => {
        proFilterAssignee = e.target.value || "";
        applyAndRenderProFilteredViews();
      };
    }
    if ($("#proMapQuickTravel")) {
      $("#proMapQuickTravel").onchange = e => {
        proFilterTravel = e.target.value || "";
        applyAndRenderProFilteredViews();
      };
    }

    // Gantt controls
    if ($("#btnProAddCardGantt")) $("#btnProAddCardGantt").onclick = () => openProCardModal();
    $("#proGanttModeSeg")?.querySelectorAll("button").forEach(b => {
      b.onclick = () => {
        proGanttMode = b.dataset.pgmode;
        $("#proGanttModeSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
        core.closeAllGanttPopovers?.();
        renderProGantt();
        renderProTimeline();
      };
    });
    $("#proGanttGroupSeg")?.querySelectorAll("button").forEach(b => {
      b.onclick = () => {
        proGanttGroup = b.dataset.pgroup;
        $("#proGanttGroupSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
        if ($("#btnProGanttResetTypeOrder")) {
          const st = core.getState();
          $("#btnProGanttResetTypeOrder").hidden = !(proGanttGroup === "type" && Array.isArray(st.ganttTypeOrder) && st.ganttTypeOrder.length > 0);
        }
        core.closeAllGanttPopovers?.();
        renderProGantt();
      };
    });
    if ($("#btnProGanttResetTypeOrder")) {
      $("#btnProGanttResetTypeOrder").onclick = () => {
        const st = core.getState();
        st.ganttTypeOrder = [];
        core.save("↺ Ordem automática por Tipo de Cartão restaurada");
      };
    }
    // Filtros unificados (Gantt / Mapa / Dashboard / Financeiro)
    const bindUnifiedFilterGroup = (prefix, clearSel) => {
      const searchEl = $(`#${prefix}Search`);
      if (searchEl) {
        searchEl.oninput = () => {
          proFilterSearch = searchEl.value || "";
          ["#proGanttSearch", "#proMapSearch", "#proDashSearch", "#proFinSearch"].forEach(s => {
            if ($(s) && $(s) !== searchEl) $(s).value = proFilterSearch;
          });
          applyAndRenderProFilteredViews();
        };
      }
      const bindSel = (suffix, setter) => {
        const el = $(`#${prefix}${suffix}`);
        if (el) {
          el.onchange = () => {
            setter(el.value || "");
            applyAndRenderProFilteredViews();
          };
        }
      };
      bindSel("PrioFilter", v => { proFilterPrio = v; });
      bindSel("AssigneeFilter", v => { proFilterAssignee = v; });
      bindSel("TravelFilter", v => { proFilterTravel = v; });
      bindSel("ClientFilter", v => { proFilterClient = v; });
      bindSel("LocationFilter", v => { proFilterLocation = v; });
      bindSel("DoneFilter", v => { proFilterDone = v; });
      bindSel("FinDirFilter", v => { proFilterFinDir = v; });
      bindSel("FinStatusFilter", v => { proFilterFinStatus = v; });
      const fromEl = $(`#${prefix}DateFrom`);
      if (fromEl) {
        fromEl.onchange = () => {
          proDateFrom = fromEl.value || "";
          if (proDateTo && proDateFrom && proDateFrom > proDateTo) proDateTo = proDateFrom;
          applyAndRenderProFilteredViews();
        };
      }
      const toEl = $(`#${prefix}DateTo`);
      if (toEl) {
        toEl.onchange = () => {
          proDateTo = toEl.value || "";
          if (proDateFrom && proDateTo && proDateTo < proDateFrom) proDateFrom = proDateTo;
          applyAndRenderProFilteredViews();
        };
      }
      if ($(clearSel)) $(clearSel).onclick = resetProUnifiedFilters;
    };
    bindUnifiedFilterGroup("proGantt", "#btnProGanttClearFilters");
    bindUnifiedFilterGroup("proMap", "#btnProMapClearFilters");
    bindUnifiedFilterGroup("proDash", "#btnProDashClearFilters");
    bindUnifiedFilterGroup("proFin", "#btnProFinClearFilters");

    if ($("#btnProGanttUnified")) {
      $("#btnProGanttUnified").onclick = () => {
        core.closeAllGanttPopovers?.();
        core.setUnifiedState && core.setUnifiedState();
      };
    }
    if ($("#btnProGanttZoomOut")) $("#btnProGanttZoomOut").onclick = () => stepProGanttZoom(-1);
    if ($("#btnProGanttZoomIn")) $("#btnProGanttZoomIn").onclick = () => stepProGanttZoom(1);
    if ($("#btnProGanttZoomReset")) $("#btnProGanttZoomReset").onclick = () => { proGanttZoom = 50; updateProZoomReadout(); renderProGantt(); };
    if ($("#btnProGanttFit")) $("#btnProGanttFit").onclick = fitProGanttZoom;
    if ($("#btnProGanttFullscreen")) {
      $("#btnProGanttFullscreen").onclick = () => core.toggleGanttFullscreen($("#proGanttCard"), $("#btnProGanttFullscreen"), () => renderProGantt());
    }
    if ($("#btnProGanttToday")) {
      $("#btnProGanttToday").onclick = () => {
        core.closeAllGanttPopovers?.();
        const wrap = $("#proGanttWrap");
        const todayHead = wrap?.querySelector(".g-head.today, .g-week-head.today");
        wrap?.scrollTo({ left: todayHead ? Math.max(0, todayHead.offsetLeft - 180) : 0, behavior: "smooth" });
      };
    }
    if ($("#btnProPrintGantt")) {
      $("#btnProPrintGantt").onclick = () => {
        const unified = Boolean(core.getUnifiedState?.().unified);
        const filtered = unified ? getProUnifiedFilteredItems().filtered : getFilteredProGanttRows();
        const colMap = new Map(getMergedColumns().map(c => [c.id, c.title]));
        if (proGanttMode === "timeline") {
          window.FeriasReport.printTimelinePdf(core.getState(), filtered, core.reportHelpers(), { isPro: !unified, colMap });
          return;
        }
        core.openPrintGanttModal($("#proGanttWrap"), filtered, {
          isPro: !unified,
          isUnified: unified,
          isWeekOnly: proGanttZoom < 22,
          zoomPx: proGanttZoom,
          slimRail: proGanttSlimRail,
          colMap
        });
      };
    }

    // Dashboard controls
    if ($("#btnProDashAddCard")) $("#btnProDashAddCard").onclick = () => openProCardModal();
    if ($("#btnProDashCal")) $("#btnProDashCal").onclick = () => core.openSmartCalendarModal();
    if ($("#btnProDashWhatsApp")) $("#btnProDashWhatsApp").onclick = () => core.sendPlanToMyWhatsApp();

    // Financeiro controls
    if ($("#btnProFinAddIncome")) $("#btnProFinAddIncome").onclick = () => openProCardModal({ type: "Recebimento", finDirection: "income" });
    if ($("#btnProFinAddExpense")) $("#btnProFinAddExpense").onclick = () => openProCardModal({ type: "Despesa", finDirection: "expense" });
    $("#proFinFilterSeg")?.querySelectorAll("button").forEach(b => {
      b.onclick = () => {
        proFinFilter = b.dataset.pffilter;
        $("#proFinFilterSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
        renderProFinance();
      };
    });

    // Tabela controls
    if ($("#proSearch")) $("#proSearch").oninput = () => renderProTable();
    [
      "#proFilterPrio",
      "#proFilterAssignee",
      "#proFilterTravel",
      "#proFilterClient",
      "#proFilterLocation",
      "#proFilterDone",
      "#proFilterFinDir",
      "#proFilterFinStatus",
      "#proFilterDateFrom",
      "#proFilterDateTo"
    ].forEach(sel => {
      if ($(sel)) $(sel).onchange = () => renderProTable();
    });
    if ($("#btnProTableClearFilters")) $("#btnProTableClearFilters").onclick = resetProTableFilters;
    if ($("#btnProTableAdd")) $("#btnProTableAdd").onclick = () => openProCardModal();
    if ($("#btnProTablePdf")) {
      $("#btnProTablePdf").onclick = () => {
        window.FeriasReport.printProTableLandscape(getFilteredProTableRows(), core.getState(), computeProTotals(), core.reportHelpers());
      };
    }

    // Parâmetros controls
    if ($("#proAssigneeAddForm")) {
      $("#proAssigneeAddForm").onsubmit = e => {
        e.preventDefault();
        const inp = $("#proNewAssigneeInput");
        const val = (inp?.value || "").trim();
        if (!val) return;
        registerProAssignee(val, true);
        if (inp) inp.value = "";
      };
    }
    if ($("#btnProQuickAddAssignee")) {
      $("#btnProQuickAddAssignee").onclick = () => {
        const raw = prompt("Nome do novo responsável:");
        if (!raw || !raw.trim()) return;
        const clean = registerProAssignee(raw, true);
        if (clean) {
          const curPrimary = ($("#pc-assignee")?.value || "").trim();
          if (!curPrimary) {
            populateProAssigneeSelect(clean, editingProTripRef?.data || null);
            if ($("#pc-assignee")) $("#pc-assignee").value = clean;
          } else {
            populateProAssigneeSelect(curPrimary, editingProTripRef?.data || null);
            proModalExtraAssignees.push({ name: clean, travels: false });
          }
          renderProModalExtraAssignees();
        }
      };
    }
    if ($("#btnProAddCardAssigneeRow")) {
      $("#btnProAddCardAssigneeRow").onclick = () => {
        const all = getAllProAssignees();
        const used = new Set([($("#pc-assignee")?.value || "").toLowerCase(), ...proModalExtraAssignees.map(e => String(e.name || "").toLowerCase())]);
        const nextPick = all.find(a => !used.has(a.toLowerCase())) || "";
        proModalExtraAssignees.push({ name: nextPick, travels: false });
        renderProModalExtraAssignees();
      };
    }
    const bindParam = (id, key, isNum = false) => {
      const el = $(id);
      if (!el) return;
      el.onchange = () => {
        const st = core.getState();
        st.params[key] = isNum ? (parseFloat(el.value) || 0) : el.value;
        core.save("⚙️ Parâmetro atualizado");
      };
    };
    if ($("#pp-title")) {
      $("#pp-title").onchange = e => {
        const st = core.getState();
        st.title = e.target.value.trim() || "Projeto Profissional";
        const active = core.getActiveTrip();
        if (active) active.name = st.title;
        core.renderTripDropdown();
        core.save("⚙️ Nome do projeto atualizado");
      };
    }
    bindParam("#pp-client", "clientDefault", false);
    bindParam("#pp-revenueTarget", "revenueTarget", true);
    bindParam("#pp-costBudget", "costBudget", true);
    bindParam("#pp-taxRatePct", "taxRatePct", true);
    bindParam("#pp-hourlyRate", "hourlyRate", true);
    bindParam("#pp-remTime", "calendarReminderTime", false);
    bindParam("#pp-doneColumnId", "doneColumnId", false);
    if ($("#btnProAddColumn")) $("#btnProAddColumn").onclick = () => openProColumnModal();
    if ($("#btnProQuickAddCol")) {
      $("#btnProQuickAddCol").onclick = () => {
        openProColumnModal({
          onCreated(newCol) {
            populateProColumnSelect();
            if ($("#pc-column") && newCol?.id) {
              $("#pc-column").value = newCol.id;
            }
          }
        });
      };
    }
    if ($("#btnProAddCardType")) $("#btnProAddCardType").onclick = () => openProTypeModal({});
    if ($("#btnProQuickAddType")) {
      $("#btnProQuickAddType").onclick = () => {
        openProTypeModal({
          onCreated(newType) {
            populateProTypeSelect();
            if ($("#pc-type")) {
              $("#pc-type").value = newType.id;
              updateProModalTypePreview();
              if (!editingProCardId && newType.defaultFin && newType.defaultFin !== "none" && $("#pc-finDirection")) {
                $("#pc-finDirection").value = newType.defaultFin;
                toggleProFinFields();
              }
            }
          }
        });
      };
    }
    if ($("#btnProCardDoneToggle")) {
      $("#btnProCardDoneToggle").onclick = () => {
        const curColId = $("#pc-column")?.value || "";
        const curProg = parseInt($("#pc-progress")?.value || "0", 10) || 0;
        const cardParams = editingProTripRef?.data?.params || core.getState()?.params || {};
        const doneColId = String(cardParams.doneColumnId || "");
        const cols = editingProTripRef?.data?.columns || getMergedColumns();
        const validDone = doneColId ? cols.find(c => c.id === doneColId) : null;

        proModalCompleted = !proModalCompleted;
        if (proModalCompleted) {
          if (!validDone || curColId !== validDone.id) proModalPrevColId = curColId;
          if (curProg < 100) proModalPrevProg = curProg;
          if ($("#pc-progress")) $("#pc-progress").value = "100";
          if ($("#pc-progressVal")) $("#pc-progressVal").textContent = "100%";
          if (validDone && $("#pc-column")) $("#pc-column").value = validDone.id;
        } else {
          const restoreProg = proModalPrevProg < 100 ? proModalPrevProg : 0;
          if ($("#pc-progress")) $("#pc-progress").value = String(restoreProg);
          if ($("#pc-progressVal")) $("#pc-progressVal").textContent = `${restoreProg}%`;
          if ($("#pc-column") && validDone && curColId === validDone.id && proModalPrevColId && cols.some(c => c.id === proModalPrevColId && c.id !== validDone.id)) {
            $("#pc-column").value = proModalPrevColId;
          }
        }
        updateProModalDoneBtn();
      };
    }
    if ($("#btnProSaveGeminiKey")) {
      $("#btnProSaveGeminiKey").onclick = async () => {
        const val = $("#proGeminiKeyInput").value.trim();
        if (!val) return core.toast("Cole sua Gemini API Key (AIza...).");
        try {
          await window.FeriasApi.saveIntegrations({ geminiKey: val });
          $("#proGeminiKeyInput").value = "";
          renderProParams();
          core.toast("✨ Gemini API Key salva! IA ativada.");
        } catch (err) { core.toast("❌ " + (err.message || err)); }
      };
    }
    if ($("#btnProSyncAllCalendar")) $("#btnProSyncAllCalendar").onclick = () => core.openSmartCalendarModal();
    if ($("#btnProDownloadAllIcs")) {
      $("#btnProDownloadAllIcs").onclick = () => {
        const st = core.getState();
        window.FeriasCalendar.downloadIcs(getProSortedActivities(), st.title, st.params?.calendarReminderTime || "09:00", core.getActiveTrip()?.id || "local", "professional");
        core.toast("📆 Arquivo .ics baixado!");
      };
    }
    if ($("#btnProParamProfile")) $("#btnProParamProfile").onclick = () => core.openProfileModal();

    // Checklist controls
    if ($("#proFilterChecklist")) $("#proFilterChecklist").onchange = e => { proCheckFilter = e.target.value; renderProChecklist(); };
    if ($("#btnProAddCheck")) $("#btnProAddCheck").onclick = () => core.openCheckModal();

    // Modal Cartão Trello
    if ($("#btnProCardCloseX")) $("#btnProCardCloseX").onclick = () => $("#proCardModal").close();
    if ($("#btnProCardCancel")) $("#btnProCardCancel").onclick = () => $("#proCardModal").close();
    if ($("#proCardModal")) $("#proCardModal").addEventListener("close", () => stopProAiRecording(true));
    if ($("#pc-progress")) {
      $("#pc-progress").oninput = e => {
        const val = parseInt(e.target.value, 10) || 0;
        if ($("#pc-progressVal")) $("#pc-progressVal").textContent = `${val}%`;
        if (val >= 100 && !proModalCompleted) {
          proModalCompleted = true;
          updateProModalDoneBtn();
        } else if (val < 100 && proModalCompleted) {
          proModalCompleted = false;
          proModalPrevProg = val;
          updateProModalDoneBtn();
        }
      };
    }
    if ($("#pc-type")) {
      $("#pc-type").onchange = e => {
        const tInfo = getProTypeInfo(e.target.value);
        if (!editingProCardId && tInfo.defaultFin !== "none") {
          $("#pc-finDirection").value = tInfo.defaultFin;
          toggleProFinFields();
        }
        updateProModalTypePreview();
        updateProModalCalLink();
      };
    }
    if ($("#pc-finDirection")) $("#pc-finDirection").onchange = toggleProFinFields;
    if ($("#btnProAddSubtask")) {
      const addSub = () => {
        const inp = $("#pc-newSubtask");
        const txt = inp ? inp.value.trim() : "";
        if (!txt) return;
        proModalSubtasks.push({ id: core.uid(), text: txt, done: false });
        inp.value = "";
        renderProModalSubtasks();
      };
      $("#btnProAddSubtask").onclick = addSub;
      if ($("#pc-newSubtask")) {
        $("#pc-newSubtask").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addSub(); } };
      }
    }
    if ($("#btnProAttachFile")) $("#btnProAttachFile").onclick = () => $("#pc-attachInput").click();
    if ($("#pc-attachInput")) {
      $("#pc-attachInput").onchange = async e => {
        const files = [...(e.target.files || [])];
        if (!files.length) return;
        const tTripId = (!$("#pc-targetTripWrap")?.hidden && $("#pc-targetTrip")?.value) ? $("#pc-targetTrip").value : (editingProTripRef?.id || core.getActiveTrip()?.id || "local");
        const loadEl = $("#pc-attachLoading");
        const loadTxt = $("#pc-attachLoadingText");
        const btn = $("#btnProAttachFile");
        if (btn) btn.disabled = true;
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          try {
            if (loadEl) loadEl.hidden = false;
            if (loadTxt) loadTxt.textContent = `Carregando arquivo "${f.name}" (${i + 1}/${files.length})...`;
            const up = await window.FeriasApi.uploadAttachment(tTripId, proModalDraftId, f);
            proModalAttachments.push(up);
            renderProModalAttachments();
            core.toast(`📎 "${f.name}" anexado`);
          } catch (err) { core.toast("❌ " + (err.message || err)); }
        }
        if (loadEl) loadEl.hidden = true;
        if (btn) btn.disabled = false;
        e.target.value = "";
      };
    }
    if ($("#btnProAttachLink")) {
      $("#btnProAttachLink").onclick = () => {
        const url = prompt("Cole o link do documento, Figma, Drive ou reunião:");
        if (!url || !url.trim()) return;
        const cleanUrl = url.trim();
        if (!/^https?:\/\//i.test(cleanUrl)) return core.toast("Informe um link iniciando com http:// ou https://");
        const name = prompt("Nome curto do link (opcional):", cleanUrl.replace(/^https?:\/\//, "").slice(0, 32)) || cleanUrl;
        proModalAttachments.push({ id: core.uid(), isLink: true, fileName: name, url: cleanUrl });
        renderProModalAttachments();
      };
    }
    if ($("#btnProHeadCal")) {
      $("#btnProHeadCal").onclick = async () => {
        const a = { id: editingProCardId || proModalDraftId, ...readProCardForm() };
        const pickedId = $("#pc-targetTrip")?.value;
        const targetTrip = (pickedId && core.resolveTripRefById ? await core.resolveTripRefById(pickedId) : null) || editingProTripRef || core.getActiveTrip();
        const cols = targetTrip?.data?.columns || getMergedColumns();
        a.columnTitle = cols.find(c => c.id === a.columnId)?.title || "";
        await core.syncSingleActivityToCalendar(a, targetTrip);
      };
    }
    if ($("#btnProHeadWallet")) {
      $("#btnProHeadWallet").onclick = () => {
        const a = { id: editingProCardId || proModalDraftId, ...readProCardForm() };
        const cols = getMergedColumns();
        a.columnTitle = cols.find(c => c.id === a.columnId)?.title || "";
        const selTitle = $("#pc-targetTrip")?.selectedOptions?.[0]?.textContent?.replace(/\s*\(.*\)$/, "") || editingProTripRef?.data?.title || core.getState().title;
        if (core.openWalletPassDirect) core.openWalletPassDirect(a, selTitle, $("#btnProHeadWallet"));
      };
    }
    if ($("#btnProCalDirect")) {
      $("#btnProCalDirect").onclick = async () => {
        const a = { id: editingProCardId || proModalDraftId, ...readProCardForm() };
        const cols = getMergedColumns();
        a.columnTitle = cols.find(c => c.id === a.columnId)?.title || "";
        await core.syncSingleActivityToCalendar(a, editingProTripRef);
      };
    }
    if ($("#btnProCalIcs")) {
      $("#btnProCalIcs").onclick = () => {
        const a = { id: editingProCardId || proModalDraftId, ...readProCardForm() };
        window.FeriasCalendar.downloadIcs([a], core.getState().title, core.getState().params?.calendarReminderTime || "09:00", editingProTripRef?.id || core.getActiveTrip()?.id || "local", "professional");
      };
    }
    if ($("#btnProCardDelete")) {
      $("#btnProCardDelete").onclick = () => {
        const id = editingProCardId;
        $("#proCardModal").close();
        if (id) deleteProCard(id);
      };
    }
    if ($("#btnProCardDuplicate")) {
      $("#btnProCardDuplicate").onclick = () => {
        const target = editingProTripRef || core.getActiveTrip();
        if (target?.role === "viewer") return core.toast("👁️ Somente visualização.");
        const a = { id: core.uid(), ...readProCardForm() };
        a.name += " (cópia)";
        target.data.activities.push(a);
        $("#proCardModal").close();
        core.saveTripRecord(target, "⧉ Cartão duplicado");
      };
    }
    if ($("#proCardForm")) {
      $("#proCardForm").onsubmit = async e => {
        e.preventDefault();
        const chosenMode = $("#pc-targetMode")?.value || "professional";
        const pickedId = ($("#pc-targetTrip") && !$("#pc-targetTripWrap")?.hidden) ? $("#pc-targetTrip").value : "";
        const sourceTrip = editingProTripRef || core.getActiveTrip();

        const data = readProCardForm();
        data.completed = Boolean(proModalCompleted || data.progress >= 100);
        data.prevColumnId = proModalPrevColId || "";
        data.prevProgress = proModalPrevProg;
        if (data.completed && data.progress < 100) data.progress = 100;

        if (chosenMode === "personal") {
          if (editingProCardId && sourceTrip?.role === "viewer") {
            return core.toast("👁️ Projeto de origem somente para visualização.");
          }
          const targetPersonalTrip = core.ensureTargetTripForMode
            ? await core.ensureTargetTripForMode(pickedId, "personal")
            : null;
          if (!targetPersonalTrip) return core.toast("⚠️ Não foi possível encontrar o calendário pessoal de destino.");
          if (targetPersonalTrip.role === "viewer") return core.toast("👁️ Calendário pessoal de destino somente para visualização.");

          const orig = (editingProCardId && sourceTrip?.data?.activities)
            ? (sourceTrip.data.activities.find(x => x.id === editingProCardId) || {})
            : {};
          const converted = core.convertProCardToPersonalActivity
            ? core.convertProCardToPersonalActivity({ ...orig, ...data, id: editingProCardId || proModalDraftId || core.uid() })
            : { ...orig, ...data, id: editingProCardId || proModalDraftId || core.uid(), start: data.start || core.fmtISO(new Date()), end: data.end || data.start || core.fmtISO(new Date()) };

          if (editingProCardId && sourceTrip?.data?.activities) {
            sourceTrip.data.activities = sourceTrip.data.activities.filter(x => x.id !== editingProCardId);
          }
          if (!Array.isArray(targetPersonalTrip.data.activities)) targetPersonalTrip.data.activities = [];
          targetPersonalTrip.data.activities.push(converted);
          $("#proCardModal").close();
          if (editingProCardId && sourceTrip && sourceTrip.id !== targetPersonalTrip.id) {
            await core.saveTripRecord(sourceTrip, "");
          }
          await core.saveTripRecord(targetPersonalTrip, `🌴 Cartão migrado para Pessoal ("${targetPersonalTrip.data?.title || targetPersonalTrip.name}")!`);
          return;
        }

        let targetTrip = (pickedId && core.ensureTargetTripForMode ? await core.ensureTargetTripForMode(pickedId, "professional") : null)
          || (pickedId && core.resolveTripRefById ? await core.resolveTripRefById(pickedId) : null)
          || sourceTrip;
        if (!targetTrip) targetTrip = core.getActiveTrip();
        if (targetTrip?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");

        const tgtData = targetTrip?.data || core.getState();
        if (!Array.isArray(tgtData.activities)) tgtData.activities = [];
        if (Array.isArray(data.assigneesList) && data.assigneesList.length) {
          if (!Array.isArray(tgtData.assignees)) tgtData.assignees = [];
          data.assigneesList.forEach(entry => {
            if (entry?.name && !tgtData.assignees.some(x => String(x).toLowerCase() === entry.name.toLowerCase())) {
              tgtData.assignees.push(entry.name);
            }
          });
        }
        if (data.location && (data.locationLat == null || data.locationLng == null) && window.FeriasMaps?.resolvePlaceStandard) {
          try {
            const std = await window.FeriasMaps.resolvePlaceStandard(data.location);
            if (std) {
              if (std.formatted) data.location = std.formatted;
              if (isFinite(std.lat) && isFinite(std.lng)) {
                data.locationLat = std.lat;
                data.locationLng = std.lng;
              }
            }
          } catch {}
        }
        const tgtCols = Array.isArray(tgtData.columns) && tgtData.columns.length ? tgtData.columns : getMergedColumns();
        if (data.columnId && !tgtCols.some(c => c.id === data.columnId) && tgtCols[0]?.id) {
          data.columnId = tgtCols[0].id;
        }

        if (editingProCardId && sourceTrip && targetTrip && sourceTrip.id !== targetTrip.id) {
          if (sourceTrip.role === "viewer") return core.toast("👁️ Projeto de origem somente para visualização.");
          const orig = (sourceTrip.data?.activities || []).find(x => x.id === editingProCardId) || {};
          sourceTrip.data.activities = (sourceTrip.data?.activities || []).filter(x => x.id !== editingProCardId);
          data.order = tgtData.activities.filter(x => x.columnId === data.columnId).length;
          tgtData.activities.push({ ...orig, ...data, id: editingProCardId });
          $("#proCardModal").close();
          await core.saveTripRecord(sourceTrip, "");
          await core.saveTripRecord(targetTrip, `📦 Cartão movido para "${tgtData.title || targetTrip.name}"`);
          return;
        }

        if (editingProCardId) {
          const idx = tgtData.activities.findIndex(x => x.id === editingProCardId);
          if (idx >= 0) tgtData.activities[idx] = { ...tgtData.activities[idx], ...data };
        } else {
          data.order = tgtData.activities.filter(x => x.columnId === data.columnId).length;
          tgtData.activities.push({ id: proModalDraftId || core.uid(), ...data });
        }
        $("#proCardModal").close();
        core.saveTripRecord(targetTrip, editingProCardId ? "💾 Cartão atualizado!" : "🗂️ Cartão adicionado!");
      };
    }

    // IA Gemini no cartão Pro
    if ($("#btnProCardAiUpload")) $("#btnProCardAiUpload").onclick = () => $("#proCardAiFile").click();
    if ($("#proCardAiFile")) {
      $("#proCardAiFile").onchange = async e => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          setProAiBusy(true, `Lendo "${f.name}" com Gemini IA...`, "loading");
          const m = await core.fileToBase64Obj(f);
          await runProAiAnalyze({
            prompt: "Extraia todos os dados profissionais desta imagem/áudio/documento para preencher o cartão (tipo, título, datas, horários, cliente, local, valor financeiro, subtarefas e observações).",
            media: [m],
            loadingMsg: `Preenchendo cartão a partir de "${f.name}"...`
          });
        } catch (err) { setProAiBusy(false, "❌ " + (err.message || err), "error"); }
        finally { e.target.value = ""; }
      };
    }
    if ($("#btnProCardAiAudio")) {
      $("#btnProCardAiAudio").onclick = async () => {
        const btn = $("#btnProCardAiAudio");
        if (proAiRecorder && proAiRecorder.state === "recording") { stopProAiRecording(false); return; }
        if (!navigator.mediaDevices?.getUserMedia) return setProAiBusy(false, "Microfone indisponível neste navegador.", "error");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
          proAiChunks = [];
          const recMime = core.pickSupportedAudioMime ? core.pickSupportedAudioMime() : "";
          proAiRecorder = recMime ? new MediaRecorder(stream, { mimeType: recMime }) : new MediaRecorder(stream);
          proAiRecorder.ondataavailable = ev => { if (ev.data && ev.data.size > 0) proAiChunks.push(ev.data); };
          proAiRecorder.onstop = async () => {
            try { stream.getTracks().forEach(t => t.stop()); } catch {}
            clearInterval(proAiRecTimer);
            btn.textContent = "🎙️ Áudio";
            const cleanMime = String(proAiRecorder.mimeType || recMime || "audio/webm").split(";")[0].trim() || "audio/webm";
            const ext = cleanMime.includes("mp4") ? "m4a" : cleanMime.includes("ogg") ? "ogg" : "webm";
            const blob = new Blob(proAiChunks, { type: cleanMime });
            if (blob.size < 400) {
              return setProAiBusy(false, "⚠️ Áudio vazio ou curto demais — verifique seu microfone e tente novamente.", "error");
            }
            const fileObj = await core.fileToBase64Obj(new File([blob], `cartao_${Date.now()}.${ext}`, { type: cleanMime }));
            await runProAiAnalyze({
              prompt: "Transcreva fielmente este áudio em português e preencha somente os campos mencionados no áudio para este cartão profissional.",
              media: [fileObj],
              loadingMsg: "Transcrevendo áudio..."
            });
          };
          proAiRecorder.start(250);
          proAiRecSec = 0;
          btn.textContent = "⏹️ Parar 0:00";
          setProAiBusy(false, "🎙️ Gravando... fale sua demanda, reunião ou recebimento e clique em Parar.", "loading");
          clearInterval(proAiRecTimer);
          proAiRecTimer = setInterval(() => {
            proAiRecSec++;
            btn.textContent = `⏹️ Parar ${Math.floor(proAiRecSec / 60)}:${String(proAiRecSec % 60).padStart(2, "0")}`;
          }, 1000);
        } catch (err) { setProAiBusy(false, "Microfone bloqueado: " + (err.message || err), "error"); }
      };
    }
    if ($("#btnProCardAiText")) {
      $("#btnProCardAiText").onclick = () => {
        const row = $("#proCardAiTextRow");
        if (row) { row.hidden = !row.hidden; if (!row.hidden) $("#proCardAiTextInput")?.focus(); }
      };
    }
    if ($("#btnProCardAiTextRun")) {
      const runTxt = () => {
        const txt = ($("#proCardAiTextInput")?.value || "").trim();
        if (!txt) return setProAiBusy(false, "Digite a descrição acima.", "error");
        runProAiAnalyze({ prompt: txt, media: [], loadingMsg: "Extraindo informações com Gemini IA..." });
      };
      $("#btnProCardAiTextRun").onclick = runTxt;
      if ($("#proCardAiTextInput")) {
        $("#proCardAiTextInput").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); runTxt(); } };
      }
    }

    // Modal Lista/Coluna
    if ($("#btnProColClose")) $("#btnProColClose").onclick = () => $("#proColumnModal").close();
    if ($("#btnProColCancel")) $("#btnProColCancel").onclick = () => $("#proColumnModal").close();
    if ($("#btnProColDelete")) {
      $("#btnProColDelete").onclick = () => {
        const id = editingProColId;
        $("#proColumnModal").close();
        if (id) deleteProColumn(id);
      };
    }
    if ($("#proColumnForm")) {
      $("#proColumnForm").onsubmit = e => {
        e.preventDefault();
        const st = core.getState();
        const title = $("#pcol-name").value.trim();
        const color = $("#pcol-color").value || "#2563eb";
        if (!title) return;
        let createdObj = null;
        if (editingProColId) {
          const c = st.columns.find(x => x.id === editingProColId);
          if (c) { c.title = title; c.color = color; createdObj = c; }
        } else {
          createdObj = { id: "col_" + core.uid(), title, color };
          st.columns.push(createdObj);
        }
        if (editingProTripRef && editingProTripRef.data && editingProTripRef.data !== st) {
          if (!Array.isArray(editingProTripRef.data.columns)) editingProTripRef.data.columns = [];
          if (editingProColId) {
            const tc = editingProTripRef.data.columns.find(x => x.id === editingProColId);
            if (tc) { tc.title = title; tc.color = color; }
          } else if (createdObj) {
            editingProTripRef.data.columns.push({ ...createdObj });
          }
        }
        const cb = proColModalCallback;
        proColModalCallback = null;
        $("#proColumnModal").close();
        core.save(editingProColId ? "✏️ Lista atualizada" : "➕ Lista criada no quadro!");
        if (cb && createdObj) cb(createdObj);
      };
    }

    // Modal Tipo de Cartão Profissional
    if ($("#btnProTypeClose")) $("#btnProTypeClose").onclick = () => $("#proTypeModal").close();
    if ($("#btnProTypeCancel")) $("#btnProTypeCancel").onclick = () => $("#proTypeModal").close();
    if ($("#pct-color")) {
      $("#pct-color").oninput = e => {
        const valEl = $("#pct-iconPicker .pro-ico-dd-val");
        if (valEl) valEl.style.setProperty("--t-color", e.target.value || "#2563eb");
      };
    }
    if ($("#btnProTypeDelete")) {
      $("#btnProTypeDelete").onclick = () => {
        const delId = editingProTypeId;
        $("#proTypeModal").close();
        if (delId) deleteProCustomType(delId);
      };
    }
    if ($("#proTypeModal")) {
      $("#proTypeModal").addEventListener("click", ev => {
        const menu = $("#pct-iconMenu");
        const trig = $("#pct-iconTrigger");
        if (menu && !menu.hidden && !ev.target.closest("#pct-iconPicker")) {
          menu.hidden = true;
          if (trig) trig.setAttribute("aria-expanded", "false");
        }
      });
    }
    if ($("#proTypeForm")) {
      $("#proTypeForm").onsubmit = e => {
        e.preventDefault();
        const active = core.getActiveTrip();
        if (active?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
        const raw = $("#pct-name")?.value || "";
        const clean = sanitizeProTypeName(raw);
        if (!clean) {
          return core.toast("⚠️ O nome do tipo deve ter apenas uma palavra única (sem espaços nem '/').");
        }
        const st = core.getState();
        if (!Array.isArray(st.customCardTypes)) st.customCardTypes = [];
        const builtIn = window.PRO_ACTIVITY_TYPES || {};
        if (builtIn[clean] || (st.customCardTypes.some(t => t.id.toLowerCase() === clean.toLowerCase() && t.id !== editingProTypeId))) {
          return core.toast(`⚠️ Já existe um tipo chamado "${clean}".`);
        }

        const iconId = (window.PRO_ICON_MAP && window.PRO_ICON_MAP[proTypePickedIcon]) ? proTypePickedIcon : "flag";
        const color = $("#pct-color")?.value || "#2563eb";
        const defaultFin = $("#pct-defaultFin")?.value || "none";
        const nextObj = { id: clean, name: clean, iconId, color, defaultFin };

        if (editingProTypeId) {
          const idx = st.customCardTypes.findIndex(t => t.id === editingProTypeId);
          if (idx >= 0) st.customCardTypes[idx] = nextObj;
          else st.customCardTypes.push(nextObj);
          if (editingProTypeId !== clean) {
            (st.activities || []).forEach(a => { if (a.type === editingProTypeId) a.type = clean; });
            [proBoardTypeSet, proGanttTypeSet, proTableTypeSet].forEach(set => {
              if (set.has(editingProTypeId)) { set.delete(editingProTypeId); set.add(clean); }
            });
          }
        } else {
          st.customCardTypes.push(nextObj);
          knownProTypeIds.add(clean);
          proBoardTypeSet.add(clean);
          proGanttTypeSet.add(clean);
          proTableTypeSet.add(clean);
        }

        if (editingProTripRef && editingProTripRef.data && editingProTripRef.data !== st) {
          if (!Array.isArray(editingProTripRef.data.customCardTypes)) editingProTripRef.data.customCardTypes = [];
          const eIdx = editingProTripRef.data.customCardTypes.findIndex(t => t.id === (editingProTypeId || clean));
          if (eIdx >= 0) editingProTripRef.data.customCardTypes[eIdx] = nextObj;
          else editingProTripRef.data.customCardTypes.push(nextObj);
        }

        const cb = proTypeModalCallback;
        proTypeModalCallback = null;
        $("#proTypeModal").close();
        core.save(editingProTypeId ? `✏️ Tipo "${clean}" atualizado!` : `🧩 Tipo "${clean}" criado!`);
        if (cb) cb(nextObj);
      };
    }
  }

  function renderAll() {
    if (!core) return;
    bindProEvents();
    applyProVisibleMenusUI();
    const cards = getProSortedActivities();
    refreshProFilterOptions(cards);
    const filteredCards = applyProUnifiedFilters(cards, false);
    const t = computeProTotals(filteredCards);
    renderProBoard();
    renderProGantt(cards);
    renderProTimeline(cards);
    renderProMap(filteredCards);
    renderProDashboard(filteredCards, t);
    renderProFinance(filteredCards, t);
    renderProTable(cards);
    renderProParams();
    renderProChecklist();
  }

  window.MyPlanPro = {
    init(c) { core = c; bindProEvents(); },
    migrateProState,
    getAllProTypes,
    getProTypeInfo,
    toggleProCardDone,
    getProSortedActivities,
    computeProTotals,
    renderAll,
    renderProGantt,
    renderProTimeline,
    renderProMap,
    renderProBoard,
    buildProSummaryHTML,
    openProCardModal,
    exportProXlsx,
    buildProWhatsAppText
  };
})();
