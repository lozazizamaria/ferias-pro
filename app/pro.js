/* ===== Modo Profissional (Quadro Trello, Gantt Avançado, Fluxo de Caixa & Parâmetros) — My Plan ===== */
(function () {
  let core = null;
  let proInitialized = false;

  const proOriginMap = new WeakMap();
  const isPersonalMode = () => core?.getAppMode?.() === "personal";
  const PT_MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function fmtDateShortPt(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return "";
    const [y, m, d] = String(iso).slice(0, 10).split("-");
    const mi = parseInt(m, 10) - 1;
    if (mi < 0 || mi > 11) return "";
    return `${d}/${PT_MONTHS_SHORT[mi]}/${y.slice(-2)}`;
  }
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
  let proFilterTripsOnly = false;
  let proModalTickets = [];
  let proModalSegments = [];
  let proEditingSegmentIdx = -1;
  let proDocsView = "list";
  let proDocsOrigin = "";
  let proDocsSort = "recent";
  let proDocsPendingDelete = null;
  let proDocsPreviewCurrent = null;
  let proGanttTypeMsel = null;
  let proGanttColMsel = null;
  let proGanttLabelMsel = null;
  let proGanttTagMsel = null;
  let proMapColMsel = null;
  let proMapTypeMsel = null;
  let proMapLabelMsel = null;
  let proMapTagMsel = null;
  let proTravelsColMsel = null;
  let proTravelsTypeMsel = null;
  let proTravelsLabelMsel = null;
  let proTravelsTagMsel = null;
  let proControlColMsel = null;
  let proControlTypeMsel = null;
  let proControlLabelMsel = null;
  let proControlTagMsel = null;
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
  let proModalTempUploadIds = [];
  let proModalSaved = false;
  let proModalInitialSnapshot = "";
  let proModalForceClose = false;
  let proModalSubtasks = [];
  let proPendingPromoteSubtask = null;
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
    const rawMap = {};
    const builtIn = window.PRO_ACTIVITY_TYPES || {};
    const st = dataOpt || core?.getState?.() || {};
    const overrides = (st.cardTypeOverrides && typeof st.cardTypeOverrides === "object") ? st.cardTypeOverrides : {};

    Object.values(builtIn).forEach(t => {
      const ov = overrides[t.id];
      if (ov && ov.hidden) return;
      const effId = ov?.id ? sanitizeProTypeName(ov.id) || t.id : t.id;
      const effIconId = (ov?.iconId && window.PRO_ICON_MAP && window.PRO_ICON_MAP[ov.iconId]) ? ov.iconId : t.iconId;
      const effColor = (ov?.color && /^#[0-9a-f]{3,8}$/i.test(ov.color)) ? ov.color : t.color;
      const effFin = (ov?.defaultFin && ["income", "expense", "none"].includes(ov.defaultFin)) ? ov.defaultFin : t.defaultFin;
      const iconHtml = resolveProIconHtml(effIconId);
      rawMap[effId] = {
        ...t,
        id: effId,
        origBuiltInId: t.id,
        label: effId,
        short: effId,
        iconId: effIconId,
        icon: iconHtml,
        iconHtml,
        color: effColor,
        defaultFin: effFin,
        isCustom: false
      };
    });

    const dataList = [];
    if (dataOpt) dataList.push(dataOpt);
    const curSt = core?.getState?.();
    if (curSt && curSt !== dataOpt) dataList.push(curSt);
    (core?.getSelectedTrips?.() || []).forEach(tr => { if (tr?.data) dataList.push(tr.data); });

    dataList.forEach(d => {
      const customs = Array.isArray(d?.customCardTypes) ? d.customCardTypes : [];
      customs.forEach(ct => {
        const name = sanitizeProTypeName(ct?.id || ct?.name);
        if (!name || rawMap[name]) return;
        const iconId = (window.PRO_ICON_MAP && window.PRO_ICON_MAP[ct.iconId]) ? ct.iconId : "flag";
        const color = /^#[0-9a-f]{3,8}$/i.test(String(ct.color || "")) ? String(ct.color) : "#2563eb";
        const defaultFin = ["income", "expense", "none"].includes(ct.defaultFin) ? ct.defaultFin : "none";
        const iconHtml = resolveProIconHtml(iconId);
        rawMap[name] = {
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

    // Aplicar ordem personalizada salva em st.cardTypeOrder
    const order = Array.isArray(st.cardTypeOrder) ? st.cardTypeOrder : [];
    if (!order.length) return rawMap;
    const ordered = {};
    order.forEach(id => { if (rawMap[id]) ordered[id] = rawMap[id]; });
    Object.keys(rawMap).forEach(id => { if (!ordered[id]) ordered[id] = rawMap[id]; });
    return ordered;
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
      const pushEntry = (rawName, travelsFlag, travelModeRaw = "", travelStartRaw = "", travelEndRaw = "") => {
        const nm = String(rawName || "").trim();
        if (!nm) return;
        const k = nm.toLowerCase();
        const tm = sanitizeTravelMode(travelModeRaw);
        const ts = sanitizeTravelDateTime(travelStartRaw);
        const te = sanitizeTravelDateTime(travelEndRaw);
        if (seenEntry.has(k)) {
          const ex = normEntries.find(e => e.name.toLowerCase() === k);
          if (ex) {
            if (travelsFlag) ex.travels = true;
            if (!ex.travelMode && tm) ex.travelMode = tm;
            if (!ex.travelStart && ts) ex.travelStart = ts;
            if (!ex.travelEnd && te) ex.travelEnd = te;
          }
          return;
        }
        seenEntry.add(k);
        normEntries.push({ name: nm, travels: Boolean(travelsFlag), travelMode: tm, travelStart: ts, travelEnd: te });
        if (!merged.assignees.some(x => x.toLowerCase() === k)) {
          merged.assignees.push(nm);
        }
      };
      if (Array.isArray(a.assigneesList)) {
        a.assigneesList.forEach(item => {
          if (item && typeof item === "object") pushEntry(item.name, item.travels, item.travelMode, item.travelStart, item.travelEnd);
          else if (typeof item === "string") pushEntry(item, false, "", "", "");
        });
      }
      if (a.assignee) pushEntry(a.assignee, a.assigneeTravels, a.assigneeTravelMode || "", a.assigneeTravelStart || "", a.assigneeTravelEnd || "");
      a.assigneesList = normEntries;
      a.assignee = normEntries[0]?.name || "";
      a.assigneeTravels = Boolean(normEntries[0]?.travels);
      a.assigneeTravelMode = normEntries[0]?.travelMode || "";
      a.assigneeTravelStart = normEntries[0]?.travelStart || "";
      a.assigneeTravelEnd = normEntries[0]?.travelEnd || "";
      a.travelFinanceMode = sanitizeTravelMode(a.travelFinanceMode) || "diaria";
      a.travelFreeLodging = Boolean(a.travelFreeLodging);
      if (a.travelDetails && typeof a.travelDetails === "object") {
        const td = a.travelDetails;
        const rawTickets = Array.isArray(td.tickets) ? td.tickets : [];
        const normTickets = rawTickets
          .filter(t => t && typeof t === "object" && (t.fileName || t.url || t.id))
          .map(t => ({
            id: String(t.id || core.uid()),
            fileName: String(t.fileName || "Bilhete").trim(),
            url: String(t.url || ""),
            mimeType: String(t.mimeType || ""),
            size: Math.max(0, Number(t.size) || 0),
            uploadedAt: String(t.uploadedAt || ""),
            legType: ["ida", "conexao_ida", "volta", "conexao_volta", "outro"].includes(t.legType) ? t.legType : "ida",
            label: String(t.label || "").trim()
          }));
        if (!normTickets.length && td.ticketFile && typeof td.ticketFile === "object" && (td.ticketFile.fileName || td.ticketFile.url)) {
          normTickets.push({
            id: String(td.ticketFile.id || core.uid()),
            fileName: String(td.ticketFile.fileName || "Bilhete").trim(),
            url: String(td.ticketFile.url || ""),
            mimeType: String(td.ticketFile.mimeType || ""),
            size: Math.max(0, Number(td.ticketFile.size) || 0),
            uploadedAt: String(td.ticketFile.uploadedAt || ""),
            legType: "ida",
            label: ""
          });
        }
        const normSegments = (Array.isArray(td.segments) ? td.segments : [])
          .filter(s => s && typeof s === "object")
          .map(s => ({
            id: String(s.id || core.uid()),
            legType: ["ida", "conexao_ida", "volta", "conexao_volta", "outro"].includes(s.legType) ? s.legType : "ida",
            origin: String(s.origin || "").trim(),
            destination: String(s.destination || "").trim(),
            departAt: sanitizeTravelDateTime(s.departAt),
            arriveAt: sanitizeTravelDateTime(s.arriveAt),
            carrier: String(s.carrier || "").trim(),
            flightNumber: String(s.flightNumber || "").trim(),
            locator: String(s.locator || "").trim(),
            seat: String(s.seat || "").trim(),
            terminal: String(s.terminal || "").trim(),
            gate: String(s.gate || "").trim(),
            transport: ["Avião", "Ônibus", "Carro", "Outro"].includes(s.transport) ? s.transport : "",
            passengerName: String(s.passengerName || "").trim(),
            barcodeValue: String(s.barcodeValue || "").trim(),
            barcodeType: String(s.barcodeType || "QR_CODE").trim(),
            ticketId: String(s.ticketId || ""),
            notes: String(s.notes || "").trim()
          }));
        a.travelDetails = {
          tickets: normTickets,
          segments: normSegments,
          ticketFile: normTickets[0] ? { ...normTickets[0] } : null,
          transport: ["Avião", "Ônibus", "Carro", "Outro"].includes(td.transport) ? td.transport : "",
          hasCost: Boolean(td.hasCost),
          costAmount: Math.max(0, Number(td.costAmount) || 0),
          notes: String(td.notes || "")
        };
      } else {
        a.travelDetails = { tickets: [], segments: [], ticketFile: null, transport: "", hasCost: false, costAmount: 0, notes: "" };
      }
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
      a.minutes = Array.isArray(a.minutes)
        ? a.minutes.map(m => (window.MyPlanMinutes?.normalizeMinute ? window.MyPlanMinutes.normalizeMinute(m, a.name) : m))
        : [];
      a.subtasks = Array.isArray(a.subtasks)
        ? a.subtasks.map(st => ({
            id: st?.id || core.uid(),
            text: String(st?.text || "").trim(),
            done: Boolean(st?.done),
            prio: ["Alta", "Média", "Baixa"].includes(st?.prio) ? st.prio : "Média",
            ...(st?.dueDate ? { dueDate: String(st.dueDate).slice(0, 10) } : {}),
            ...(Number.isFinite(Number(st?.globalOrder)) ? { globalOrder: Number(st.globalOrder) } : {})
          })).filter(st => st.text)
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

  function getProSortedActivities(opts = {}) {
    const includeArchived = Boolean(opts && opts.includeArchived);
    const onlyArchived = Boolean(opts && opts.onlyArchived);
    const trips = core.getSelectedTrips();
    const all = [];
    trips.forEach((tr, idx) => {
      const data = tr?.data || core.getState();
      const acts = Array.isArray(data?.activities) ? data.activities : [];
      const cols = Array.isArray(data?.columns) ? data.columns : [];
      const colMap = new Map(cols.map(c => [c.id, c.title]));
      acts.forEach(a => {
        const isArch = Boolean(a && a.archived);
        if (onlyArchived && !isArch) return;
        if (!onlyArchived && !includeArchived && isArch) return;
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

  function sanitizeTravelMode(v) {
    const clean = String(v || "").trim().toLowerCase();
    if (clean === "diaria" || clean === "grat_rep" || clean === "comissionamento") return clean;
    return "";
  }

  function sanitizeTravelDateTime(v) {
    const raw = String(v || "").trim();
    if (!raw) return "";
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
    if (m) return `${m[1]}T${m[2]}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T08:00`;
    return "";
  }

  function computeDefaultTravelDates(eventStart, eventEnd) {
    const s = String(eventStart || "").trim();
    const e = String(eventEnd || eventStart || "").trim();
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return { travelStart: "", travelEnd: "" };
    const d1 = core.parseD(s);
    const prevDay = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate() - 1);
    const idaIso = core.fmtISO(prevDay);
    const voltaIso = (e && /^\d{4}-\d{2}-\d{2}$/.test(e) && e >= s) ? e : s;
    return {
      travelStart: `${idaIso}T08:00`,
      travelEnd: `${voltaIso}T18:00`
    };
  }

  function formatDateTimeShortBR(dtStr, fallbackDateIso = "") {
    const clean = sanitizeTravelDateTime(dtStr);
    if (clean) return `${core.fmtShortBR(clean.slice(0, 10))} ${clean.slice(11, 16)}`;
    if (fallbackDateIso) return core.fmtShortBR(fallbackDateIso);
    return "—";
  }

  function formatDateTimeFullBR(dtStr, fallbackDateIso = "") {
    const clean = sanitizeTravelDateTime(dtStr);
    if (clean) return `${core.fmtBR(clean.slice(0, 10))} ${clean.slice(11, 16)}`;
    if (fallbackDateIso) return core.fmtBR(fallbackDateIso);
    return "";
  }

  function getEffectivePersonTravelDates(card, personEntry = null) {
    const ts = sanitizeTravelDateTime(personEntry?.travelStart);
    const te = sanitizeTravelDateTime(personEntry?.travelEnd);
    const evStart = String(card?._origStart || card?.start || "").trim();
    const evEnd = String(card?._origEnd || card?.end || evStart).trim();
    const idaIso = ts ? ts.slice(0, 10) : evStart;
    const rawVoltaIso = te ? te.slice(0, 10) : evEnd;
    const voltaIso = (idaIso && rawVoltaIso && rawVoltaIso < idaIso) ? idaIso : (rawVoltaIso || idaIso);
    const idaTime = ts ? ts.slice(11, 16) : "";
    const voltaTime = te ? te.slice(11, 16) : "";
    return {
      idaDt: ts || (idaIso ? `${idaIso}T08:00` : ""),
      voltaDt: te || (voltaIso ? `${voltaIso}T18:00` : ""),
      hasExplicitStart: Boolean(ts),
      hasExplicitEnd: Boolean(te),
      idaIso,
      voltaIso,
      idaTime,
      voltaTime
    };
  }

  function getCardTravelDateRange(card, assigneeFilter = "") {
    const list = getCardAssigneesList(card).filter(e => e.travels);
    if (!list.length) return null;
    const filt = String(assigneeFilter || "").trim().toLowerCase();
    const matched = (filt && filt !== "__none__")
      ? list.filter(e => e.name.toLowerCase() === filt)
      : list;
    if (!matched.length) return null;

    let minIso = "";
    let maxIso = "";
    let minTime = "";
    let maxTime = "";
    matched.forEach(ent => {
      const td = getEffectivePersonTravelDates(card, ent);
      if (td.idaIso && (!minIso || td.idaIso < minIso)) {
        minIso = td.idaIso;
        minTime = td.idaTime;
      }
      if (td.voltaIso && (!maxIso || td.voltaIso > maxIso)) {
        maxIso = td.voltaIso;
        maxTime = td.voltaTime;
      }
    });
    if (!minIso) minIso = String(card?.start || "");
    if (!maxIso) maxIso = String(card?.end || card?.start || minIso);
    if (minIso && maxIso && maxIso < minIso) maxIso = minIso;
    return { start: minIso, end: maxIso, startTime: minTime, endTime: maxTime, travelers: matched };
  }

  function projectCardsForTravelDates(cards, tripsOnly = false, assigneeFilter = "") {
    if (!tripsOnly) return cards;
    const out = [];
    (cards || []).forEach(c => {
      const rng = getCardTravelDateRange(c, assigneeFilter);
      if (!rng) return;
      out.push({
        ...c,
        start: rng.start,
        end: rng.end,
        startTime: rng.startTime || c.startTime || "",
        endTime: rng.endTime || c.endTime || "",
        _isTravelProjected: true,
        _origStart: c.start || "",
        _origEnd: c.end || c.start || ""
      });
    });
    return out.sort((a, b) =>
      String(a.start || "9999-99-99").localeCompare(String(b.start || "9999-99-99")) ||
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }

  function getCardAssigneesList(a) {
    if (!a) return [];
    const out = [];
    const seen = new Set();
    const push = (nm, tr, tm = "", ts = "", te = "") => {
      const clean = String(nm || "").trim();
      if (!clean) return;
      const k = clean.toLowerCase();
      const mode = sanitizeTravelMode(tm);
      const tStart = sanitizeTravelDateTime(ts);
      const tEnd = sanitizeTravelDateTime(te);
      if (seen.has(k)) {
        const ex = out.find(e => e.name.toLowerCase() === k);
        if (ex) {
          if (tr) ex.travels = true;
          if (!ex.travelMode && mode) ex.travelMode = mode;
          if (!ex.travelStart && tStart) ex.travelStart = tStart;
          if (!ex.travelEnd && tEnd) ex.travelEnd = tEnd;
        }
        return;
      }
      seen.add(k);
      out.push({ name: clean, travels: Boolean(tr), travelMode: mode, travelStart: tStart, travelEnd: tEnd });
    };
    if (Array.isArray(a.assigneesList) && a.assigneesList.length) {
      a.assigneesList.forEach(it => {
        if (it && typeof it === "object") push(it.name, it.travels, it.travelMode, it.travelStart, it.travelEnd);
        else if (typeof it === "string") push(it, false, "", "", "");
      });
    }
    if (a.assignee) push(a.assignee, a.assigneeTravels, a.assigneeTravelMode || "", a.assigneeTravelStart || "", a.assigneeTravelEnd || "");
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
      "#proTravelsAssigneeFilter",
      "#proControlAssigneeFilter",
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
    ["#proMapQuickAssignee", "#proTravelsQuickAssignee", "#proControlQuickAssignee"].forEach(qSel => {
      const el = $(qSel);
      if (!el) return;
      const prev = el.value;
      const allLbl = qSel === "#proTravelsQuickAssignee" ? "👤 Todos os responsáveis" : "👤 Todas as pessoas";
      el.innerHTML = `<option value="">${allLbl}</option>`
        + list.map(a => `<option value="${core.esc(a)}">👤 ${core.esc(a)}</option>`).join("");
      if ([...el.options].some(o => o.value === prev)) el.value = prev;
    });
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
    if (!proTravelsColMsel && $("#proTravelsColFilter")) proTravelsColMsel = core.createMultiSelect($("#proTravelsColFilter"), colOptCfg);
    if (!proControlColMsel && $("#proControlColFilter")) proControlColMsel = core.createMultiSelect($("#proControlColFilter"), colOptCfg);
    if (!proDashColMsel && $("#proDashColFilter")) proDashColMsel = core.createMultiSelect($("#proDashColFilter"), colOptCfg);
    if (!proFinColMsel && $("#proFinColFilter")) proFinColMsel = core.createMultiSelect($("#proFinColFilter"), colOptCfg);
    if (!proGanttTypeMsel && $("#proGanttTypeFilter")) proGanttTypeMsel = core.createMultiSelect($("#proGanttTypeFilter"), typeOptCfg);
    if (!proMapTypeMsel && $("#proMapTypeFilter")) proMapTypeMsel = core.createMultiSelect($("#proMapTypeFilter"), typeOptCfg);
    if (!proTravelsTypeMsel && $("#proTravelsTypeFilter")) proTravelsTypeMsel = core.createMultiSelect($("#proTravelsTypeFilter"), typeOptCfg);
    if (!proControlTypeMsel && $("#proControlTypeFilter")) proControlTypeMsel = core.createMultiSelect($("#proControlTypeFilter"), typeOptCfg);
    if (!proDashTypeMsel && $("#proDashTypeFilter")) proDashTypeMsel = core.createMultiSelect($("#proDashTypeFilter"), typeOptCfg);
    if (!proFinTypeMsel && $("#proFinTypeFilter")) proFinTypeMsel = core.createMultiSelect($("#proFinTypeFilter"), typeOptCfg);
    if (!proGanttLabelMsel && $("#proGanttLabelFilter")) proGanttLabelMsel = core.createMultiSelect($("#proGanttLabelFilter"), labelOptCfg);
    if (!proMapLabelMsel && $("#proMapLabelFilter")) proMapLabelMsel = core.createMultiSelect($("#proMapLabelFilter"), labelOptCfg);
    if (!proTravelsLabelMsel && $("#proTravelsLabelFilter")) proTravelsLabelMsel = core.createMultiSelect($("#proTravelsLabelFilter"), labelOptCfg);
    if (!proControlLabelMsel && $("#proControlLabelFilter")) proControlLabelMsel = core.createMultiSelect($("#proControlLabelFilter"), labelOptCfg);
    if (!proDashLabelMsel && $("#proDashLabelFilter")) proDashLabelMsel = core.createMultiSelect($("#proDashLabelFilter"), labelOptCfg);
    if (!proFinLabelMsel && $("#proFinLabelFilter")) proFinLabelMsel = core.createMultiSelect($("#proFinLabelFilter"), labelOptCfg);
    if (!proGanttTagMsel && $("#proGanttTagFilter")) proGanttTagMsel = core.createMultiSelect($("#proGanttTagFilter"), tagOptCfg);
    if (!proMapTagMsel && $("#proMapTagFilter")) proMapTagMsel = core.createMultiSelect($("#proMapTagFilter"), tagOptCfg);
    if (!proTravelsTagMsel && $("#proTravelsTagFilter")) proTravelsTagMsel = core.createMultiSelect($("#proTravelsTagFilter"), tagOptCfg);
    if (!proControlTagMsel && $("#proControlTagFilter")) proControlTagMsel = core.createMultiSelect($("#proControlTagFilter"), tagOptCfg);
    if (!proDashTagMsel && $("#proDashTagFilter")) proDashTagMsel = core.createMultiSelect($("#proDashTagFilter"), tagOptCfg);
    if (!proFinTagMsel && $("#proFinTagFilter")) proFinTagMsel = core.createMultiSelect($("#proFinTagFilter"), tagOptCfg);

    [proGanttColMsel, proMapColMsel, proTravelsColMsel, proControlColMsel, proDashColMsel, proFinColMsel].forEach(m => { if (m) m.setOptions(colItems, [...proGanttColSet]); });
    [proGanttTypeMsel, proMapTypeMsel, proTravelsTypeMsel, proControlTypeMsel, proDashTypeMsel, proFinTypeMsel].forEach(m => { if (m) m.setOptions(typeItems, [...proGanttTypeSet]); });
    [proGanttLabelMsel, proMapLabelMsel, proTravelsLabelMsel, proControlLabelMsel, proDashLabelMsel, proFinLabelMsel].forEach(m => { if (m) m.setOptions(labelItems, [...proGanttLabelSet]); });
    [proGanttTagMsel, proMapTagMsel, proTravelsTagMsel, proControlTagMsel, proDashTagMsel, proFinTagMsel].forEach(m => { if (m) m.setOptions(tagItems, [...proGanttTagSet]); });
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
    if (cfg.tripsOnly) {
      const rng = getCardTravelDateRange(a, cfg.assignee);
      if (!rng) return false;
      if (cfg.dateFrom && (!rng.start || (rng.end || rng.start) < cfg.dateFrom)) return false;
      if (cfg.dateTo && (!rng.start || rng.start > cfg.dateTo)) return false;
    } else {
      if (cfg.dateFrom) {
        if (!a.start || (a.end || a.start) < cfg.dateFrom) return false;
      }
      if (cfg.dateTo) {
        if (!a.start || a.start > cfg.dateTo) return false;
      }
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
      dateTo: $("#proBoardDateTo")?.value || "",
      tripsOnly: Boolean($("#proBoardTripsOnlyFilter")?.checked)
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
      + ((cfg.dateFrom || cfg.dateTo) ? 1 : 0)
      + (cfg.tripsOnly ? 1 : 0);
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
    if ($("#proBoardTripsOnlyFilter")) $("#proBoardTripsOnlyFilter").checked = false;
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

    const allCards = projectCardsForTravelDates(
      getProSortedActivities().filter(a => matchProCardFilters(a, cfg, cols)),
      cfg.tripsOnly,
      cfg.assignee
    );
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
      dateTo: proDateTo,
      tripsOnly: proFilterTripsOnly
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
      + ((proDateFrom || proDateTo) ? 1 : 0)
      + (proFilterTripsOnly ? 1 : 0);
  }

  function hasActiveProFilters() {
    return countActiveProUnifiedFilters() > 0;
  }

  function applyProUnifiedFilters(allCards) {
    const cols = getMergedColumns();
    const cfg = getProUnifiedFilterCfg();
    const matched = (allCards || []).filter(a => matchProCardFilters(a, cfg, cols));
    return projectCardsForTravelDates(matched, cfg.tripsOnly, cfg.assignee);
  }

  function syncProFilterUIs() {
    const colsArr = [...proGanttColSet];
    const typesArr = [...proGanttTypeSet];
    const labelsArr = [...proGanttLabelSet];
    const tagsArr = [...proGanttTagSet];
    [proGanttColMsel, proMapColMsel, proTravelsColMsel, proControlColMsel, proDashColMsel, proFinColMsel].forEach(m => { if (m) m.setSelected(colsArr); });
    [proGanttTypeMsel, proMapTypeMsel, proTravelsTypeMsel, proControlTypeMsel, proDashTypeMsel, proFinTypeMsel].forEach(m => { if (m) m.setSelected(typesArr); });
    [proGanttLabelMsel, proMapLabelMsel, proTravelsLabelMsel, proControlLabelMsel, proDashLabelMsel, proFinLabelMsel].forEach(m => { if (m) m.setSelected(labelsArr); });
    [proGanttTagMsel, proMapTagMsel, proTravelsTagMsel, proControlTagMsel, proDashTagMsel, proFinTagMsel].forEach(m => { if (m) m.setSelected(tagsArr); });
    const syncInps = (sels, val) => sels.forEach(s => { if ($(s) && $(s).value !== val) $(s).value = val; });
    syncInps(["#proGanttSearch", "#proMapSearch", "#proTravelsSearch", "#proControlSearch", "#proDashSearch", "#proFinSearch"], proFilterSearch);
    syncInps(["#proGanttPrioFilter", "#proMapPrioFilter", "#proTravelsPrioFilter", "#proControlPrioFilter", "#proDashPrioFilter", "#proFinPrioFilter"], proFilterPrio);
    syncInps(["#proGanttAssigneeFilter", "#proMapAssigneeFilter", "#proMapQuickAssignee", "#proTravelsAssigneeFilter", "#proTravelsQuickAssignee", "#proControlAssigneeFilter", "#proControlQuickAssignee", "#proDashAssigneeFilter", "#proFinAssigneeFilter"], proFilterAssignee);
    syncInps(["#proGanttTravelFilter", "#proMapTravelFilter", "#proMapQuickTravel", "#proTravelsTravelFilter", "#proControlTravelFilter", "#proDashTravelFilter", "#proFinTravelFilter"], proFilterTravel);
    syncInps(["#proGanttClientFilter", "#proMapClientFilter", "#proTravelsClientFilter", "#proControlClientFilter", "#proDashClientFilter", "#proFinClientFilter"], proFilterClient);
    syncInps(["#proGanttLocationFilter", "#proMapLocationFilter", "#proTravelsLocationFilter", "#proControlLocationFilter", "#proDashLocationFilter", "#proFinLocationFilter"], proFilterLocation);
    syncInps(["#proGanttDoneFilter", "#proMapDoneFilter", "#proTravelsDoneFilter", "#proControlDoneFilter", "#proDashDoneFilter", "#proFinDoneFilter"], proFilterDone);
    syncInps(["#proGanttFinDirFilter", "#proMapFinDirFilter", "#proTravelsFinDirFilter", "#proControlFinDirFilter", "#proDashFinDirFilter", "#proFinFinDirFilter"], proFilterFinDir);
    syncInps(["#proGanttFinStatusFilter", "#proMapFinStatusFilter", "#proTravelsFinStatusFilter", "#proControlFinStatusFilter", "#proDashFinStatusFilter", "#proFinFinStatusFilter"], proFilterFinStatus);
    syncInps(["#proGanttDateFrom", "#proMapDateFrom", "#proTravelsDateFrom", "#proControlDateFrom", "#proDashDateFrom", "#proFinDateFrom"], proDateFrom);
    syncInps(["#proGanttDateTo", "#proMapDateTo", "#proTravelsDateTo", "#proControlDateTo", "#proDashDateTo", "#proFinDateTo"], proDateTo);
    ["#proGanttTripsOnlyFilter", "#proMapTripsOnlyFilter", "#proTravelsTripsOnlyFilter", "#proControlTripsOnlyFilter", "#proDashTripsOnlyFilter", "#proFinTripsOnlyFilter"].forEach(s => {
      if ($(s) && $(s).checked !== proFilterTripsOnly) $(s).checked = proFilterTripsOnly;
    });

    const activeCount = countActiveProUnifiedFilters();
    const dirty = activeCount > 0;
    ["#btnProGanttClearFilters", "#btnProMapClearFilters", "#btnProTravelsClearFilters", "#btnProControlClearFilters", "#btnProDashClearFilters", "#btnProFinClearFilters"].forEach(sel => {
      if ($(sel)) $(sel).hidden = !dirty;
    });
    [
      ["#btnProGanttFilterPop", "#proGanttFilterCount", activeCount],
      ["#btnProMapFilterPop", "#proMapFilterCount", activeCount],
      ["#btnProTravelsFilterPop", "#proTravelsFilterCount", activeCount],
      ["#btnProControlFilterPop", "#proControlFilterCount", activeCount],
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
    renderProTravels(filteredCards);
    renderProControl(filteredCards);
    renderProDocs(cards);
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
    proFilterTripsOnly = false;
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
    if (proFilterTripsOnly) {
      const projected = [];
      filtered.forEach(it => {
        const meta = core.unifiedMetaMap?.get(it);
        if (meta?.mode === "professional") {
          const rng = getCardTravelDateRange(it, proFilterAssignee);
          if (!rng) return;
          const p = { ...it, start: rng.start, end: rng.end, startTime: rng.startTime || it.startTime, endTime: rng.endTime || it.endTime, _isTravelProjected: true };
          if (core.unifiedMetaMap) core.unifiedMetaMap.set(p, meta);
          projected.push(p);
        }
      });
      return { allUnified: all, filtered: projected.sort((a, b) => String(a.start || "").localeCompare(String(b.start || ""))) };
    }
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
    if (vBtn) vBtn.classList.toggle("has-active", unified || proGanttMode === "annual");
    if (vLbl) vLbl.textContent = proGanttMode === "annual" ? "Calendário Anual" : (proGanttMode === "timeline" ? "Timeline" : "Gantt");
    if (vDot) vDot.hidden = !unified;
    if ($("#proGanttZoomGroup")) $("#proGanttZoomGroup").hidden = proGanttMode !== "gantt";
    if ($("#btnProPrintGantt")) $("#btnProPrintGantt").hidden = proGanttMode === "annual";

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
    const annualWrap = $("#proAnnualWrap");
    wrap.hidden = proGanttMode !== "gantt";
    tlWrap.hidden = proGanttMode !== "timeline";
    if (annualWrap) annualWrap.hidden = proGanttMode !== "annual";
    if (proGanttMode === "annual") {
      if (annualWrap && window.MyPlanProAnnual?.render) {
        window.MyPlanProAnnual.render({
          container: annualWrap,
          cards: s,
          state: core.getState(),
          projectTitle: core.getActiveTrip()?.name || core.getState()?.title || "My Plan",
          dateFrom: proDateFrom,
          dateTo: proDateTo,
          allTypes: getAllProTypes(),
          getTypeInfo: t => getProTypeInfo(t),
          fmtBR: core.fmtBR,
          esc: core.esc,
          onOpenCard: cid => openProCardModal(cid),
          onSavePrefs: msg => core.save(msg),
          toast: core.toast
        });
      }
      return;
    }
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
              ? `${barW >= 14 ? info.icon : ""}`
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
        if (proFilterTripsOnly) return core.toast("✈️ Modo 'Apenas viagens' ativo — clique na barra para editar as datas de Ida/Volta do responsável.");
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
        if (proFilterTripsOnly) {
          core.toast("✈️ Modo 'Apenas viagens' ativo — clique na barra para editar as datas de Ida/Volta do responsável.");
          return renderProGantt();
        }
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
    { id: "pro-gantt",     tabId: "tab-pro-gantt",     label: "📅 Timeline" },
    { id: "pro-map",       tabId: "tab-pro-map",       label: "🗺️ Mapa" },
    { id: "pro-travels",   tabId: "tab-pro-travels",   label: "✈️ Viagens" },
    { id: "pro-control",   tabId: "tab-pro-control",   label: "📋 Controle" },
    { id: "pro-docs",      tabId: "tab-pro-docs",      label: "📁 Documentos" },
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
    const columns = [];
    const cardH = isMobile ? 32 : 35;
    const gapY = isMobile ? 7 : 8;
    const stepY = cardH + gapY;
    const stemGapX = isMobile ? 36 : 50;

    // 1. Monta uma coluna vertical coesa e ordenada cronologicamente por região/cidade
    const rawAnchors = groups.map(g => {
      const pt = toAnchorPx(g);
      return { g, ax: pt.x, ay: pt.y };
    });
    const avgAx = rawAnchors.length ? rawAnchors.reduce((s, r) => s + r.ax, 0) / rawAnchors.length : 0;

    rawAnchors.forEach(({ g, ax, ay }) => {
      // Ordem cronológica crescente obrigatória; cartões sem data vão para o final da coluna
      const sortedCards = g.cards.slice().sort((a, b) => {
        const aHas = Boolean(a && a.start);
        const bHas = Boolean(b && b.start);
        if (aHas !== bHas) return aHas ? -1 : 1;
        if (aHas && bHas) {
          const cmp = String(a.start).localeCompare(String(b.start));
          if (cmp !== 0) return cmp;
        }
        return String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR");
      });

      const n = sortedCards.length;
      const anchorRec = { group: g, ax, ay, hasSpread: true };
      anchors.push(anchorRec);

      const metas = sortedCards.map(card => {
        const meta = createExplodedMissionInnerHTML(card, g, isMobile);
        const estW = isMobile
          ? Math.min(168, Math.max(114, Math.ceil(meta.shortName.length * 7.1 + 42)))
          : Math.min(232, Math.max(150, Math.ceil(meta.shortName.length * 7.5 + 48 + (meta.hasDt ? 52 : 0))));
        return { card, meta, estW };
      });
      const colW = metas.reduce((m, x) => Math.max(m, x.estW), isMobile ? 124 : 162);
      const colH = n * cardH + Math.max(0, n - 1) * gapY;

      // Escolhe lado único para toda a coluna da cidade (direita por padrão; esquerda se próximo à borda direita)
      let side = 1;
      if (boundsBox) {
        const rightOverflow = (ax + stemGapX + colW) - boundsBox.maxX;
        const leftOverflow = boundsBox.minX - (ax - stemGapX - colW);
        if (rightOverflow > 0 && leftOverflow < rightOverflow) side = -1;
      } else if (rawAnchors.length > 1 && ax > avgAx + 110) {
        side = -1;
      }

      const cx = ax + side * (stemGapX + colW / 2);
      const cy = ay;
      columns.push({ group: g, anchorRec, ax, ay, side, w: colW, h: colH, cx, cy, metas });
    });

    // 2. Resolver colisões entre colunas de regiões vizinhas mantendo cada região como bloco vertical íntegro
    const colPadX = isMobile ? 12 : 16;
    const colPadY = isMobile ? 12 : 16;

    const clampCol = col => {
      if (!boundsBox) return;
      const loX = boundsBox.minX + col.w / 2;
      const hiX = boundsBox.maxX - col.w / 2;
      const loY = boundsBox.minY + col.h / 2;
      const hiY = boundsBox.maxY - col.h / 2;
      if (hiX >= loX) col.cx = Math.max(loX, Math.min(hiX, col.cx));
      if (hiY >= loY) col.cy = Math.max(loY, Math.min(hiY, col.cy));
    };

    const colOverlapArea = (A, B) => {
      const ox = (A.w + B.w) / 2 + colPadX - Math.abs(A.cx - B.cx);
      const oy = (A.h + B.h) / 2 + colPadY - Math.abs(A.cy - B.cy);
      return (ox > 0 && oy > 0) ? ox * oy : 0;
    };

    // Primeiro tenta inverter lado (direita <-> esquerda) se isso reduzir colisão com colunas vizinhas
    for (let i = 0; i < columns.length; i++) {
      const A = columns[i];
      const curPen = columns.reduce((s, B, j) => s + (j === i ? 0 : colOverlapArea(A, B)), 0);
      if (curPen > 0) {
        const origSide = A.side;
        const origCx = A.cx;
        A.side = -origSide;
        A.cx = A.ax + A.side * (stemGapX + A.w / 2);
        clampCol(A);
        const nextPen = columns.reduce((s, B, j) => s + (j === i ? 0 : colOverlapArea(A, B)), 0);
        if (nextPen >= curPen) {
          A.side = origSide;
          A.cx = origCx;
        }
      }
    }

    // Repulsão rígida entre colunas vizinhas (nunca separa cartões da mesma cidade)
    for (let iter = 0; iter < 60; iter++) {
      let moved = false;
      for (let i = 0; i < columns.length; i++) {
        const A = columns[i];
        for (let j = i + 1; j < columns.length; j++) {
          const B = columns[j];
          const dx = B.cx - A.cx;
          const dy = B.cy - A.cy;
          const minDx = (A.w + B.w) / 2 + colPadX;
          const minDy = (A.h + B.h) / 2 + colPadY;
          const ovX = minDx - Math.abs(dx);
          const ovY = minDy - Math.abs(dy);
          if (ovX > 0 && ovY > 0) {
            moved = true;
            if (ovY / minDy <= ovX / minDx) {
              const sy = dy >= 0 ? 1 : -1;
              const push = ovY * 0.54;
              A.cy -= sy * push;
              B.cy += sy * push;
            } else {
              const sx = dx >= 0 ? 1 : -1;
              const push = ovX * 0.54;
              A.cx -= sx * push;
              B.cx += sx * push;
            }
          }
        }
      }
      columns.forEach(clampCol);
      if (!moved) break;
    }

    // 3. Emitir cada cartão alinhado verticalmente em coluna centralizada no eixo da região
    columns.forEach(col => {
      const topCenterY = col.cy - col.h / 2 + cardH / 2;
      col.metas.forEach((m, idx) => {
        const y = topCenterY + idx * stepY;
        const x = col.cx;
        const movedPx = Math.hypot(x - col.ax, y - col.ay);
        items.push({
          card: m.card,
          group: col.group,
          anchorRec: col.anchorRec,
          meta: m.meta,
          ax: col.ax,
          ay: col.ay,
          x,
          y,
          w: col.w,
          h: cardH,
          uniformW: col.w,
          side: col.side,
          isMulti: col.metas.length > 1,
          movedPx
        });
      });
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

  const PRO_MAP_CITY_PALETTE = [
    "#2563eb", // Azul Royal
    "#10b981", // Esmeralda
    "#f59e0b", // Âmbar / Laranja
    "#8b5cf6", // Roxo
    "#ec4899", // Rosa / Magenta
    "#06b6d4", // Ciano / Teal
    "#4f46e5", // Índigo
    "#ef4444", // Vermelho Coral
    "#65a30d", // Verde-Oliva
    "#e11d48", // Carmesim
    "#0284c7", // Azul Celeste
    "#9333ea"  // Violeta
  ];

  function assignProMapCityColors(groups) {
    const usedSlots = new Set();
    const byKey = new Map();
    (groups || []).forEach(g => {
      const k = String(g.cityLabel || g.label || g.key || "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      if (byKey.has(k)) {
        g.cityColor = byKey.get(k);
        return;
      }
      let hash = 0;
      for (let i = 0; i < k.length; i++) hash = ((hash * 31) + k.charCodeAt(i)) >>> 0;
      let slot = hash % PRO_MAP_CITY_PALETTE.length;
      for (let probe = 0; probe < PRO_MAP_CITY_PALETTE.length; probe++) {
        const cand = (slot + probe) % PRO_MAP_CITY_PALETTE.length;
        if (!usedSlots.has(cand)) { slot = cand; break; }
      }
      usedSlots.add(slot);
      const col = PRO_MAP_CITY_PALETTE[slot];
      byKey.set(k, col);
      g.cityColor = col;
    });
    return groups;
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
        .map(it => `<line x1="${it.ax.toFixed(1)}" y1="${it.ay.toFixed(1)}" x2="${it.x.toFixed(1)}" y2="${it.y.toFixed(1)}" stroke="${core.esc(it.group.cityColor || it.meta.tagCol)}" stroke-width="2" stroke-opacity="0.72" stroke-dasharray="4 3" />`)
        .join("");

      const hubsHtml = anchors
        .filter(anc => anc.hasSpread)
        .map(anc => {
          const g = anc.group;
          const isAct = g.key === proMapActiveGroupKey && !proMapActiveCardId ? " is-active" : "";
          return `<button type="button" class="pro-map-hub-node${isAct}" data-map-group-key="${core.esc(g.key)}" style="--tag-c:${core.esc(g.cityColor || "#2563eb")};position:absolute;left:${anc.ax.toFixed(1)}px;top:${anc.ay.toFixed(1)}px;transform:translate(-50%,-50%);z-index:4" title="📍 ${core.esc(g.cityLabel)} — ${g.cards.length} ${g.cards.length === 1 ? "missão" : "missões"}">${g.cards.length > 1 ? g.cards.length : ""}</button>`;
        }).join("");

      const pillsHtml = items.map(it => {
        const isAct = it.card.id === proMapActiveCardId ? " is-active" : "";
        const cCol = it.group.cityColor || it.meta.tagCol;
        const uW = it.uniformW ? `width:${it.uniformW}px;` : "";
        return `<div class="pro-map-tag-group" style="position:absolute;left:${it.x.toFixed(1)}px;top:${it.y.toFixed(1)}px;transform:translate(-50%,-50%);z-index:${isAct ? 9 : 6}">
          <button type="button" class="pro-map-marker-pill pro-map-marker-pill--mission${isAct}" data-map-card-id="${core.esc(it.card.id)}" style="--tag-c:${core.esc(cCol)};${uW}" title="${core.esc(it.meta.tooltip)}">
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
      const { tagCol: fallbackCol, html } = createClusterMarkerInnerHTML(g);
      const tagCol = g.cityColor || fallbackCol;
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
        const cityCol = g.cityColor || tagCol;
        btn.type = "button";
        btn.className = `pro-map-marker-pill${g.key === proMapActiveGroupKey ? " is-active" : ""}`;
        btn.dataset.mapGroupKey = g.key;
        btn.style.setProperty("--tag-c", cityCol);
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
        dot.style.setProperty("--tag-c", cityCol);
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
      hubBtn.style.setProperty("--tag-c", g.cityColor || "#2563eb");
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

      const cityCol = it.group.cityColor || it.meta.tagCol;
      if (isSpread) {
        const line = new google.maps.Polyline({
          path: [{ lat: it.group.lat, lng: it.group.lng }, pos],
          geodesic: false,
          strokeColor: cityCol || (isDark ? "#38bdf8" : "#2563eb"),
          strokeOpacity: 0.72,
          strokeWeight: 2,
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
      btn.style.setProperty("--tag-c", cityCol);
      if (it.uniformW) btn.style.width = `${it.uniformW}px`;
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
        dot.style.setProperty("--tag-c", cityCol);
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
    bindProEvents();
    const seq = ++proMapRenderSeq;
    const rawCards = filteredCardsOpt || applyProUnifiedFilters(getProSortedActivities());
    const cards = rawCards;
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

    const groups = assignProMapCityColors(clusterMapGroupsByProximity([...rawGroupMap.values()]));
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

  /* ---------- 2C. RELATÓRIO & GRÁFICOS DE DESLOCAMENTOS POR RESPONSÁVEL ---------- */
  let proTravelsScope = "travels";
  let proTravelsTableSort = { col: "start", dir: "asc" };
  const proTravelsExpandedPeople = new Set();
  let proTravelsLastReport = null;

  function personInitials(name) {
    const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function computeUniqueCalendarDays(entries) {
    const daySet = new Set();
    entries.forEach(ent => {
      const c = ent.card;
      if (!c?.start) return;
      const dStart = core.parseD(c.start);
      const dEnd = core.parseD(c.end || c.start);
      if (!isFinite(dStart) || !isFinite(dEnd)) return;
      const span = Math.min(366, Math.max(1, Math.round((dEnd - dStart) / 86400000) + 1));
      for (let i = 0; i < span; i++) {
        const dt = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate() + i);
        daySet.add(core.fmtISO(dt));
      }
    });
    return daySet.size;
  }

  function detectPersonTravelConflicts(entries) {
    const conflicts = [];
    const dated = entries.filter(e => e.start).sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < dated.length; i++) {
      const A = dated[i];
      const aEnd = A.end || A.start;
      for (let j = i + 1; j < dated.length; j++) {
        const B = dated[j];
        if (B.start > aEnd) break;
        if (A.card.id === B.card.id) continue;
        conflicts.push({ a: A, b: B });
      }
    }
    return conflicts;
  }

  function buildProTravelsAnalytics(cards) {
    const cols = getMergedColumns();
    const todayIso = core.fmtISO(new Date());
    const filterAsgLow = (proFilterAssignee && proFilterAssignee !== "__none__") ? proFilterAssignee.toLowerCase() : "";

    const entries = [];
    const uniqueCardIds = new Set();
    const uniqueCitiesSet = new Set();
    const personMap = new Map();
    const destMap = new Map();
    const monthMap = new Map();

    let fallbackLocCount = 0;
    let fallbackAllAsgCount = 0;

    (cards || []).forEach(c => {
      const asgList = getCardAssigneesList(c);
      const rawLoc = String(c.location || "").trim();
      if (rawLoc && asgList.length) fallbackLocCount++;
      if (asgList.length) fallbackAllAsgCount++;

      let matchedAsgs = [];
      if (proTravelsScope === "travels") {
        matchedAsgs = asgList.filter(e => e.travels);
      } else if (proTravelsScope === "with_location") {
        if (!rawLoc) return;
        matchedAsgs = asgList;
      } else {
        matchedAsgs = asgList;
      }

      if (filterAsgLow) {
        matchedAsgs = matchedAsgs.filter(e => e.name.toLowerCase() === filterAsgLow);
      }
      if (!matchedAsgs.length) return;

      const dur = cardDurationDays(c);
      const city = rawLoc ? shortLocationCityName(rawLoc) : "Sem local definido";
      const start = c.start || "";
      const end = c.end || c.start || "";
      const ym = (start || end).slice(0, 7);
      const done = isCardDone(c, cols);
      const colTitle = cols.find(col => col.id === c.columnId)?.title || c.columnTitle || "Sem lista";
      const cost = c.finDirection === "expense"
        ? (Number(c.actualAmount) > 0 ? Number(c.actualAmount) : (Number(c.amount) || 0))
        : 0;

      uniqueCardIds.add(c.id);
      if (rawLoc) uniqueCitiesSet.add(city);

      matchedAsgs.forEach(asg => {
        const pKey = asg.name.toLowerCase();
        const pCol = colorForAssignee(asg.name);
        const coTravelers = asgList
          .filter(other => other.name.toLowerCase() !== pKey && (proTravelsScope !== "travels" || other.travels))
          .map(other => other.name);

        const ent = {
          personKey: pKey,
          personName: asg.name,
          personColor: pCol,
          travelsFlag: Boolean(asg.travels),
          card: c,
          city,
          rawLocation: rawLoc,
          dur,
          start,
          end,
          ym: ym.length === 7 ? ym : "",
          done,
          colTitle,
          cost,
          coTravelers
        };
        entries.push(ent);

        if (!personMap.has(pKey)) {
          personMap.set(pKey, {
            key: pKey,
            name: asg.name,
            initials: personInitials(asg.name),
            color: pCol,
            entries: [],
            tripCount: 0,
            totalDays: 0,
            doneCount: 0,
            pendingCount: 0,
            totalCost: 0,
            citiesMap: new Map(),
            monthsMap: new Map()
          });
        }
        const p = personMap.get(pKey);
        p.entries.push(ent);
        p.tripCount++;
        p.totalDays += dur;
        if (done) p.doneCount++;
        else p.pendingCount++;
        p.totalCost += cost;

        if (!p.citiesMap.has(city)) p.citiesMap.set(city, { city, trips: 0, days: 0 });
        const pc = p.citiesMap.get(city);
        pc.trips++;
        pc.days += dur;

        if (ent.ym) {
          if (!p.monthsMap.has(ent.ym)) p.monthsMap.set(ent.ym, { ym: ent.ym, trips: 0, days: 0, cities: new Set() });
          const pm = p.monthsMap.get(ent.ym);
          pm.trips++;
          pm.days += dur;
          if (rawLoc) pm.cities.add(city);

          if (!monthMap.has(ent.ym)) monthMap.set(ent.ym, { ym: ent.ym, trips: 0, days: 0, byPerson: new Map() });
          const gm = monthMap.get(ent.ym);
          gm.trips++;
          gm.days += dur;
          if (!gm.byPerson.has(pKey)) gm.byPerson.set(pKey, { key: pKey, name: asg.name, color: pCol.hex, trips: 0, days: 0 });
          const gmp = gm.byPerson.get(pKey);
          gmp.trips++;
          gmp.days += dur;
        }

        if (rawLoc) {
          if (!destMap.has(city)) destMap.set(city, { city, trips: 0, days: 0, byPerson: new Map() });
          const dRec = destMap.get(city);
          dRec.trips++;
          dRec.days += dur;
          if (!dRec.byPerson.has(pKey)) dRec.byPerson.set(pKey, { key: pKey, name: asg.name, color: pCol.hex, trips: 0, days: 0 });
          const dp = dRec.byPerson.get(pKey);
          dp.trips++;
          dp.days += dur;
        }
      });
    });

    const people = [...personMap.values()].map(p => {
      p.entries.sort((a, b) =>
        String(a.start || "9999-99-99").localeCompare(String(b.start || "9999-99-99")) ||
        String(a.card.name || "").localeCompare(String(b.card.name || ""))
      );
      p.uniqueDays = computeUniqueCalendarDays(p.entries);
      p.avgDays = p.tripCount ? p.totalDays / p.tripCount : 0;
      p.donePct = p.tripCount ? Math.round((p.doneCount / p.tripCount) * 100) : 0;
      p.topCities = [...p.citiesMap.values()].sort((a, b) => b.trips - a.trips || b.days - a.days || a.city.localeCompare(b.city));
      p.uniqueCitiesCount = p.topCities.filter(c => c.city !== "Sem local definido").length;
      p.favCity = p.topCities.find(c => c.city !== "Sem local definido") || p.topCities[0] || null;
      p.longestTrip = p.entries.reduce((best, e) => (!best || e.dur > best.dur ? e : best), null);
      p.nextTrip = p.entries.find(e => e.end && e.end >= todayIso && !e.done) || p.entries.find(e => e.end && e.end >= todayIso) || null;
      p.conflicts = detectPersonTravelConflicts(p.entries);
      return p;
    }).sort((a, b) => b.tripCount - a.tripCount || b.totalDays - a.totalDays || a.name.localeCompare(b.name));

    const monthsSorted = [...monthMap.values()].sort((a, b) => a.ym.localeCompare(b.ym));
    const destStacked = [...destMap.values()].sort((a, b) => b.trips - a.trips || b.days - a.days || a.city.localeCompare(b.city));
    const totalPersonTrips = entries.length;
    const totalPersonDays = entries.reduce((s, e) => s + e.dur, 0);
    const totalDoneEntries = entries.filter(e => e.done).length;
    const totalConflicts = people.reduce((s, p) => s + p.conflicts.length, 0);
    const upcomingSorted = entries
      .filter(e => e.end && e.end >= todayIso && !e.done)
      .sort((a, b) => String(a?.start || "").localeCompare(String(b?.start || "")));

    return {
      entries,
      people,
      monthsSorted,
      destStacked,
      totalUniqueTrips: uniqueCardIds.size,
      totalPersonTrips,
      totalPersonDays,
      uniqueCitiesCount: uniqueCitiesSet.size,
      totalDoneEntries,
      donePct: totalPersonTrips ? Math.round((totalDoneEntries / totalPersonTrips) * 100) : 0,
      totalConflicts,
      leader: people[0] || null,
      nextGlobalTrip: upcomingSorted[0] || null,
      fallbackLocCount,
      fallbackAllAsgCount
    };
  }

  function printProTravelsReport() {
    const rep = proTravelsLastReport || buildProTravelsAnalytics(applyProUnifiedFilters(getProSortedActivities()));
    if (!rep || !rep.entries.length) {
      return core.toast("✈️ Não há deslocamentos neste filtro para imprimir.");
    }
    const st = core.getState();
    const title = st.title || "Projeto Profissional";
    const scopeLabel = proTravelsScope === "travels"
      ? 'Apenas marcados como "Viaja"'
      : (proTravelsScope === "with_location" ? "Todos os cartões com Local" : "Todos os cartões com responsável");
    const generatedAt = new Date().toLocaleString("pt-BR");

    const summaryRows = rep.people.map(p => `
      <tr>
        <td><span class="dot" style="background:${core.esc(p.color.hex)}"></span><strong>${core.esc(p.name)}</strong></td>
        <td class="num">${p.tripCount}</td>
        <td class="num">${p.totalDays} d${p.uniqueDays && p.uniqueDays !== p.totalDays ? ` (${p.uniqueDays} únicos)` : ""}</td>
        <td class="num">${core.num(p.avgDays, 1)} d</td>
        <td class="num">${p.uniqueCitiesCount}</td>
        <td>${p.favCity ? `${core.esc(p.favCity.city)} (${p.favCity.trips}×)` : "—"}</td>
        <td class="num">${p.donePct}%</td>
        <td class="num">${p.conflicts.length ? `⚠️ ${p.conflicts.length}` : "OK"}</td>
      </tr>
    `).join("");

    const personSections = rep.people.map(p => {
      const rows = p.entries.map(e => {
        const dt = e.start ? `${core.fmtBR(e.start)}${e.end && e.end !== e.start ? ` – ${core.fmtBR(e.end)}` : ""}` : "Sem data";
        return `<tr>
          <td>${core.esc(dt)}</td>
          <td><strong>${core.esc(e.card.name)}</strong>${e.coTravelers.length ? `<br><small>Com: ${core.esc(e.coTravelers.join(", "))}</small>` : ""}</td>
          <td>${core.esc(e.rawLocation || e.city)}</td>
          <td class="num">${e.dur} ${e.dur === 1 ? "dia" : "dias"}</td>
          <td>${e.done ? "✅ Concluído" : `⏳ ${core.esc(e.colTitle)}`}</td>
        </tr>`;
      }).join("");
      return `
        <section class="person-block">
          <h3><span class="dot" style="background:${core.esc(p.color.hex)}"></span>${core.esc(p.name)} — ${p.tripCount} viagem(ns) · ${p.totalDays} dia(s) · ${p.uniqueCitiesCount} destino(s)</h3>
          <table>
            <thead><tr><th>Período</th><th>Viagem / Missão</th><th>Destino</th><th class="num">Duração</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
      `;
    }).join("");

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Relatório de Deslocamentos — ${core.esc(title)}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:24px;line-height:1.45}
        h1{margin:0 0 4px;font-size:20px}
        .meta{color:#475569;font-size:12px;margin-bottom:16px}
        .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
        .kpi{border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;background:#f8fafc}
        .kpi small{display:block;color:#64748b;font-size:11px;text-transform:uppercase;font-weight:700}
        .kpi strong{font-size:18px;color:#0f172a}
        h2{font-size:15px;margin:18px 0 8px;border-bottom:1px solid #cbd5e1;padding-bottom:4px}
        h3{font-size:13.5px;margin:14px 0 6px;display:flex;align-items:center;gap:6px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px}
        th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
        th{background:#f1f5f9;font-weight:700}
        .num{text-align:right;white-space:nowrap}
        .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}
        .person-block{page-break-inside:avoid;margin-bottom:14px}
        @media print{body{margin:12px}}
      </style></head><body>
      <h1>✈️ Relatório de Deslocamentos por Responsável — ${core.esc(title)}</h1>
      <div class="meta">Escopo: ${core.esc(scopeLabel)}${proFilterAssignee ? ` · Responsável: ${core.esc(proFilterAssignee)}` : ""} · Gerado em ${core.esc(generatedAt)}</div>
      <div class="kpis">
        <div class="kpi"><small>Viagens / Missões</small><strong>${rep.totalUniqueTrips} (${rep.totalPersonTrips} partic.)</strong></div>
        <div class="kpi"><small>Responsáveis</small><strong>${rep.people.length}</strong></div>
        <div class="kpi"><small>Dias Totais</small><strong>${rep.totalPersonDays} dias</strong></div>
        <div class="kpi"><small>Destinos Únicos</small><strong>${rep.uniqueCitiesCount}</strong></div>
      </div>
      <h2>Resumo Comparativo por Responsável</h2>
      <table>
        <thead><tr><th>Responsável</th><th class="num">Viagens</th><th class="num">Dias</th><th class="num">Média</th><th class="num">Destinos</th><th>Principal Destino</th><th class="num">Concluídas</th><th class="num">Conflitos</th></tr></thead>
        <tbody>${summaryRows}</tbody>
      </table>
      <h2>Roteiro Detalhado por Responsável</h2>
      ${personSections}
      <script>window.onload=function(){window.print();};</script>
      </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return core.toast("⚠️ Permita pop-ups para imprimir o relatório.");
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function renderProTravels(filteredCardsOpt) {
    const viewEl = $("#view-pro-travels");
    if (!viewEl) return;

    const cards = filteredCardsOpt || applyProUnifiedFilters(getProSortedActivities());
    const rep = buildProTravelsAnalytics(cards);
    proTravelsLastReport = rep;

    if ($("#proTravelsScopeSel") && $("#proTravelsScopeSel").value !== proTravelsScope) {
      $("#proTravelsScopeSel").value = proTravelsScope;
    }

    const badge = $("#proTravelsCountBadge");
    if (badge) {
      badge.textContent = `${rep.totalUniqueTrips} ${rep.totalUniqueTrips === 1 ? "viagem" : "viagens"} · ${rep.people.length} ${rep.people.length === 1 ? "responsável" : "responsáveis"} · ${rep.totalPersonDays}d`;
    }

    // Banner de estado vazio contextual
    const emptyEl = $("#proTravelsEmptyBanner");
    if (emptyEl) {
      if (!rep.entries.length) {
        emptyEl.hidden = false;
        const canSwitchLoc = proTravelsScope === "travels" && rep.fallbackLocCount > 0;
        const canSwitchAll = proTravelsScope !== "all" && rep.fallbackAllAsgCount > 0;
        emptyEl.innerHTML = `
          <div class="pro-travels-empty-inner">
            <div style="font-size:2rem">✈️</div>
            <h3>Nenhum deslocamento encontrado neste filtro</h3>
            <p class="muted small">
              ${proTravelsScope === "travels"
                ? 'Marque a opção <b>"✈️ Viaja"</b> no responsável dentro dos cartões ou altere o escopo acima para visualizar todos os cartões com localidade.'
                : "Atribua um responsável (e um local) aos cartões do projeto para gerar automaticamente os gráficos e o relatório de deslocamentos."}
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px">
              ${canSwitchLoc ? `<button type="button" class="btn primary small" id="btnProTravelsSwitchLoc">📍 Ver todos os cartões com Local (${rep.fallbackLocCount})</button>` : ""}
              ${!canSwitchLoc && canSwitchAll ? `<button type="button" class="btn primary small" id="btnProTravelsSwitchAll">🗂️ Ver todos os cartões com responsável (${rep.fallbackAllAsgCount})</button>` : ""}
              <button type="button" class="btn ghost small" id="btnProTravelsEmptyAdd">➕ Novo Cartão</button>
            </div>
          </div>`;
        if ($("#btnProTravelsSwitchLoc", emptyEl)) {
          $("#btnProTravelsSwitchLoc", emptyEl).onclick = () => {
            proTravelsScope = "with_location";
            renderProTravels();
          };
        }
        if ($("#btnProTravelsSwitchAll", emptyEl)) {
          $("#btnProTravelsSwitchAll", emptyEl).onclick = () => {
            proTravelsScope = "all";
            renderProTravels();
          };
        }
        if ($("#btnProTravelsEmptyAdd", emptyEl)) {
          $("#btnProTravelsEmptyAdd", emptyEl).onclick = () => openProCardModal();
        }
      } else {
        emptyEl.hidden = true;
        emptyEl.innerHTML = "";
      }
    }

    const togglePersonFilter = (personName) => {
      if (!personName) return;
      proFilterAssignee = proFilterAssignee.toLowerCase() === personName.toLowerCase() ? "" : personName;
      applyAndRenderProFilteredViews();
    };

    // 1. CARDS DE KPIs EXECUTIVOS (6 KPIs)
    const kpisEl = $("#proTravelsKpis");
    if (kpisEl) {
      const avgDays = rep.totalPersonTrips ? core.num(rep.totalPersonDays / rep.totalPersonTrips, 1) : "0,0";
      const leaderVal = rep.leader ? rep.leader.name : "—";
      const leaderSub = rep.leader
        ? `${rep.leader.tripCount} ${rep.leader.tripCount === 1 ? "viagem" : "viagens"} · ${rep.leader.totalDays}d`
        : "Sem viagens";
      const leaderCol = rep.leader ? rep.leader.color.hex : "#f59e0b";

      const statusLbl = rep.totalConflicts > 0
        ? "Alertas de Agenda"
        : (rep.nextGlobalTrip ? "Próxima Saída" : "Conclusão");
      const statusVal = rep.totalConflicts > 0
        ? `⚠️ ${rep.totalConflicts} ${rep.totalConflicts === 1 ? "conflito" : "conflitos"}`
        : (rep.nextGlobalTrip ? core.fmtShortBR(rep.nextGlobalTrip.start) : `${rep.donePct}%`);
      const statusSub = rep.totalConflicts > 0
        ? "Sobreposição de datas para a mesma pessoa"
        : (rep.nextGlobalTrip
            ? `${rep.nextGlobalTrip.personName} ➔ ${rep.nextGlobalTrip.city}`
            : `${rep.totalDoneEntries}/${rep.totalPersonTrips} viagens concluídas`);
      const statusCol = rep.totalConflicts > 0 ? "#f87171" : "#22d3ee";

      const kpis = [
        ["Viagens / Missões", String(rep.totalUniqueTrips), `${rep.totalPersonTrips} participação(ões) de equipe`, "#38bdf8"],
        ["Responsáveis Viajando", String(rep.people.length), rep.people.length === 1 ? "1 pessoa em deslocamento" : `${rep.people.length} pessoas em deslocamento`, "#a855f7"],
        ["Dias de Viagem", `${rep.totalPersonDays}d`, `Média de ${avgDays} dia(s) por viagem`, "#10b981"],
        ["Destinos Únicos", String(rep.uniqueCitiesCount), rep.destStacked[0] ? `Top: ${rep.destStacked[0].city} (${rep.destStacked[0].trips}×)` : "Cidades visitadas", "#f59e0b"],
        ["Mais Viajante", leaderVal, leaderSub, leaderCol],
        [statusLbl, statusVal, statusSub, statusCol]
      ];
      kpisEl.innerHTML = kpis.map(([lbl, val, sub, col]) => `
        <div class="kpi pro-map-kpi-card pro-travels-kpi" style="--c:${core.esc(col)}">
          <div class="lbl">${core.esc(lbl)}</div>
          <div class="val" title="${core.esc(val)}">${core.esc(val)}</div>
          <div class="sub" title="${core.esc(sub)}">${core.esc(sub)}</div>
        </div>
      `).join("");
    }

    const emptyChartHtml = `<p class="muted small" style="padding:18px 0;text-align:center">Sem deslocamentos para exibir neste filtro.</p>`;

    // 2.1 Gráfico: Ranking de Viagens por Responsável
    const cTrips = $("#proTravelsChartTripsByPerson");
    if (cTrips) {
      if (!rep.people.length) {
        cTrips.innerHTML = emptyChartHtml;
      } else {
        const maxT = Math.max(1, ...rep.people.map(p => p.tripCount));
        cTrips.innerHTML = `<div class="pro-map-hbars">${rep.people.map(p => {
          const pct = Math.max(6, Math.round((p.tripCount / maxT) * 100));
          const share = rep.totalPersonTrips ? Math.round((p.tripCount / rep.totalPersonTrips) * 100) : 0;
          const isFocus = proFilterAssignee && proFilterAssignee.toLowerCase() === p.key;
          const tip = `${p.name}: ${p.tripCount} viagem(ns) (${share}% do total) · ${p.totalDays} dia(s) · ${p.uniqueCitiesCount} destino(s)`;
          return `<button type="button" class="pro-map-hbar-row${isFocus ? " is-focused" : ""}" data-travel-pick-person="${core.esc(p.name)}" data-tooltip="${core.esc(tip)}" title="${core.esc(tip)}">
            <div class="pro-map-hbar-top">
              <span class="pro-map-hbar-lbl"><span class="pro-map-hbar-dot" style="background:${core.esc(p.color.hex)}"></span>${core.esc(p.name)}</span>
              <b class="pro-map-hbar-val">${p.tripCount} ${p.tripCount === 1 ? "viagem" : "viagens"} <span class="muted">(${share}%)</span></b>
            </div>
            <div class="pro-map-hbar-track">
              <div class="pro-map-hbar-fill" style="width:${pct}%;background:${core.esc(p.color.hex)}"></div>
            </div>
          </button>`;
        }).join("")}</div>`;
        cTrips.querySelectorAll("[data-travel-pick-person]").forEach(b => {
          b.onclick = () => togglePersonFilter(b.dataset.travelPickPerson);
        });
      }
    }

    // 2.2 Gráfico: Carga de Dias Viajados por Responsável
    const cDays = $("#proTravelsChartDaysByPerson");
    if (cDays) {
      if (!rep.people.length) {
        cDays.innerHTML = emptyChartHtml;
      } else {
        const byDays = rep.people.slice().sort((a, b) => b.totalDays - a.totalDays || b.tripCount - a.tripCount);
        const maxD = Math.max(1, ...byDays.map(p => p.totalDays));
        cDays.innerHTML = `<div class="pro-map-hbars">${byDays.map(p => {
          const pct = Math.max(6, Math.round((p.totalDays / maxD) * 100));
          const isFocus = proFilterAssignee && proFilterAssignee.toLowerCase() === p.key;
          const uniqNote = p.uniqueDays && p.uniqueDays !== p.totalDays ? ` · ${p.uniqueDays}d únicos` : "";
          const tip = `${p.name}: ${p.totalDays} dia(s) em missão · Média ${core.num(p.avgDays, 1)}d/viagem${uniqNote}`;
          return `<button type="button" class="pro-map-hbar-row${isFocus ? " is-focused" : ""}" data-travel-pick-person="${core.esc(p.name)}" data-tooltip="${core.esc(tip)}" title="${core.esc(tip)}">
            <div class="pro-map-hbar-top">
              <span class="pro-map-hbar-lbl"><span class="pro-map-hbar-dot" style="background:${core.esc(p.color.hex)}"></span>${core.esc(p.name)}</span>
              <b class="pro-map-hbar-val">${p.totalDays} ${p.totalDays === 1 ? "dia" : "dias"} <span class="muted">(Ø ${core.num(p.avgDays, 1)}d)</span></b>
            </div>
            <div class="pro-map-hbar-track">
              <div class="pro-map-hbar-fill" style="width:${pct}%;background:${core.esc(p.color.hex)}"></div>
            </div>
          </button>`;
        }).join("")}</div>`;
        cDays.querySelectorAll("[data-travel-pick-person]").forEach(b => {
          b.onclick = () => togglePersonFilter(b.dataset.travelPickPerson);
        });
      }
    }

    // 2.3 Gráfico: Donut SVG de Participação de Dias por Responsável
    const cDonut = $("#proTravelsChartShareDonut");
    if (cDonut) {
      if (!rep.people.length || rep.totalPersonDays <= 0) {
        cDonut.innerHTML = emptyChartHtml;
      } else {
        const byDays = rep.people.slice().sort((a, b) => b.totalDays - a.totalDays);
        const R = 58;
        const C = 2 * Math.PI * R;
        let offsetAcc = 0;
        const segsSvg = byDays.map(p => {
          const frac = p.totalDays / rep.totalPersonDays;
          const len = Math.max(2, frac * C);
          const dashOffset = -offsetAcc;
          offsetAcc += frac * C;
          const pct = Math.round(frac * 100);
          return `<circle cx="90" cy="90" r="${R}" fill="none" stroke="${core.esc(p.color.hex)}" stroke-width="20" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${dashOffset.toFixed(2)}" transform="rotate(-90 90 90)">
            <title>${core.esc(p.name)}: ${p.totalDays} dias (${pct}%)</title>
          </circle>`;
        }).join("");
        const legendHtml = byDays.map(p => {
          const pct = Math.round((p.totalDays / rep.totalPersonDays) * 100);
          return `<button type="button" class="pro-travels-donut-leg-item" data-travel-pick-person="${core.esc(p.name)}" title="Filtrar por ${core.esc(p.name)}">
            <span class="pro-map-hbar-dot" style="background:${core.esc(p.color.hex)}"></span>
            <span class="pro-travels-donut-name">${core.esc(p.name)}</span>
            <b>${pct}%</b>
            <span class="muted small">(${p.totalDays}d)</span>
          </button>`;
        }).join("");

        cDonut.innerHTML = `
          <div class="pro-travels-donut-wrap">
            <div class="pro-travels-donut-svg-box">
              <svg viewBox="0 0 180 180" width="164" height="164" role="img" aria-label="Participação de dias de viagem por responsável">
                <circle cx="90" cy="90" r="${R}" fill="none" stroke="var(--border)" stroke-width="20"></circle>
                ${segsSvg}
              </svg>
              <div class="pro-travels-donut-center">
                <strong>${rep.totalPersonDays}d</strong>
                <span>${rep.people.length} ${rep.people.length === 1 ? "pessoa" : "pessoas"}</span>
              </div>
            </div>
            <div class="pro-travels-donut-legend">${legendHtml}</div>
          </div>`;
        cDonut.querySelectorAll("[data-travel-pick-person]").forEach(b => {
          b.onclick = () => togglePersonFilter(b.dataset.travelPickPerson);
        });
      }
    }

    // 2.4 Gráfico: Top Destinos Empilhados por Responsável
    const cDest = $("#proTravelsChartDestByPerson");
    if (cDest) {
      if (!rep.destStacked.length) {
        cDest.innerHTML = emptyChartHtml;
      } else {
        const topDest = rep.destStacked.slice(0, 8);
        const maxDestTrips = Math.max(1, ...topDest.map(d => d.trips));
        cDest.innerHTML = `<div class="pro-map-hbars">${topDest.map(d => {
          const widthPct = Math.max(10, Math.round((d.trips / maxDestTrips) * 100));
          const pSegs = [...d.byPerson.values()].sort((a, b) => b.trips - a.trips);
          const segHtml = pSegs.map(ps => {
            const segPct = (ps.trips / d.trips) * 100;
            return `<span class="pro-travels-seg" style="width:${segPct.toFixed(2)}%;background:${core.esc(ps.color)}" title="${core.esc(ps.name)}: ${ps.trips} viagem(ns) · ${ps.days}d"></span>`;
          }).join("");
          const tipPeople = pSegs.map(ps => `${ps.name} (${ps.trips}×/${ps.days}d)`).join(", ");
          const tip = `${d.city}: ${d.trips} viagem(ns) · ${d.days}d — ${tipPeople}`;
          return `<div class="pro-map-hbar-row" data-tooltip="${core.esc(tip)}" title="${core.esc(tip)}" tabindex="0">
            <div class="pro-map-hbar-top">
              <span class="pro-map-hbar-lbl">📍 ${core.esc(d.city)}</span>
              <b class="pro-map-hbar-val">${d.trips}× <span class="muted">(${d.days}d)</span></b>
            </div>
            <div class="pro-map-hbar-track">
              <div class="pro-travels-stacked-fill" style="width:${widthPct}%">${segHtml}</div>
            </div>
            <div class="pro-travels-mini-who">${pSegs.slice(0, 4).map(ps => `<span class="pro-travels-who-chip"><i style="background:${core.esc(ps.color)}"></i>${core.esc(ps.name)} ${ps.trips}×</span>`).join("")}</div>
          </div>`;
        }).join("")}</div>`;
      }
    }

    // 2.5 Gráfico: Evolução Mensal Empilhada por Responsável
    const cMonthly = $("#proTravelsChartMonthlyStacked");
    if (cMonthly) {
      if (!rep.monthsSorted.length) {
        cMonthly.innerHTML = `<p class="muted small" style="padding:18px 0;text-align:center">Adicione datas aos cartões com deslocamento para visualizar a evolução mensal.</p>`;
      } else {
        const maxM = Math.max(1, ...rep.monthsSorted.map(m => m.trips));
        const legendPeople = rep.people.slice(0, 10).map(p =>
          `<button type="button" class="pro-travels-leg-pill" data-travel-pick-person="${core.esc(p.name)}"><i style="background:${core.esc(p.color.hex)}"></i>${core.esc(p.name)}</button>`
        ).join("");
        const colsHtml = rep.monthsSorted.map(m => {
          const [yr, mo] = m.ym.split("-");
          const lbl = `${core.MON[parseInt(mo, 10) - 1]}/${yr.slice(2)}`;
          const totalH = Math.max(14, Math.round((m.trips / maxM) * 100));
          const pSegs = [...m.byPerson.values()].sort((a, b) => b.trips - a.trips);
          const stackSegs = pSegs.map(ps => {
            const hPct = (ps.trips / m.trips) * 100;
            return `<div class="pro-travels-vseg" style="height:${hPct.toFixed(2)}%;background:${core.esc(ps.color)}" title="${core.esc(ps.name)}: ${ps.trips}v · ${ps.days}d"></div>`;
          }).join("");
          const tip = `${lbl}: ${m.trips} viagem(ns) · ${m.days}d — ${pSegs.map(ps => `${ps.name} (${ps.trips}v/${ps.days}d)`).join(", ")}`;
          return `<div class="pro-vbar-col pro-travels-mcol" data-tooltip="${core.esc(tip)}" title="${core.esc(tip)}" tabindex="0">
            <span class="pro-vbar-val">${m.trips}v · ${m.days}d</span>
            <div class="pro-travels-vcol-track">
              <div class="pro-travels-vcol-stack" style="height:${totalH}%">${stackSegs}</div>
            </div>
            <span class="pro-vbar-lbl">${lbl}</span>
          </div>`;
        }).join("");

        cMonthly.innerHTML = `
          <div class="pro-travels-legend-bar">${legendPeople}</div>
          <div class="pro-vbars-chart pro-travels-monthly-chart">${colsHtml}</div>`;
        cMonthly.querySelectorAll("[data-travel-pick-person]").forEach(b => {
          b.onclick = () => togglePersonFilter(b.dataset.travelPickPerson);
        });
      }
    }

    // 2.6 Gráfico: Matriz Calor (Heatmap Responsável × Mês)
    const cHeat = $("#proTravelsChartHeatmap");
    if (cHeat) {
      if (!rep.people.length || !rep.monthsSorted.length) {
        cHeat.innerHTML = `<p class="muted small" style="padding:16px 0;text-align:center">Adicione datas aos deslocamentos para visualizar a matriz mensal por responsável.</p>`;
      } else {
        let maxCellDays = 1;
        rep.people.forEach(p => {
          p.monthsMap.forEach(m => { if (m.days > maxCellDays) maxCellDays = m.days; });
        });
        const headMonths = rep.monthsSorted.map(m => {
          const [yr, mo] = m.ym.split("-");
          return `<th>${core.MON[parseInt(mo, 10) - 1]}/${yr.slice(2)}</th>`;
        }).join("");

        const bodyRows = rep.people.map(p => {
          const cells = rep.monthsSorted.map(m => {
            const pm = p.monthsMap.get(m.ym);
            if (!pm) return `<td class="heat-empty">—</td>`;
            const ratio = Math.min(1, pm.days / maxCellDays);
            const alpha = (0.18 + ratio * 0.56).toFixed(2);
            const citiesStr = [...pm.cities].join(", ");
            const tip = `${p.name} em ${m.ym}: ${pm.trips} viagem(ns) · ${pm.days} dia(s)${citiesStr ? ` (${citiesStr})` : ""}`;
            return `<td class="heat-cell" style="--hc:${core.esc(p.color.hex)};--ha:${alpha}" title="${core.esc(tip)}">
              <strong>${pm.trips}v</strong>
              <span>${pm.days}d</span>
            </td>`;
          }).join("");
          return `<tr class="pro-travels-heat-row" data-travel-pick-person="${core.esc(p.name)}">
            <td class="heat-person">
              <span class="pro-map-hbar-dot" style="background:${core.esc(p.color.hex)}"></span>
              <strong>${core.esc(p.name)}</strong>
            </td>
            ${cells}
            <td class="heat-total"><b>${p.tripCount}v</b> · ${p.totalDays}d</td>
          </tr>`;
        }).join("");

        cHeat.innerHTML = `
          <table class="pro-travels-heatmap-table">
            <thead>
              <tr>
                <th>Responsável</th>
                ${headMonths}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>`;
        cHeat.querySelectorAll("[data-travel-pick-person]").forEach(tr => {
          tr.onclick = () => togglePersonFilter(tr.dataset.travelPickPerson);
        });
      }
    }

    // 3. RELATÓRIO INDIVIDUAL DETALHADO POR RESPONSÁVEL
    const pplBadge = $("#proTravelsPeopleBadge");
    if (pplBadge) pplBadge.textContent = `${rep.people.length} ${rep.people.length === 1 ? "responsável" : "responsáveis"}`;

    const personGrid = $("#proTravelsPersonCards");
    if (personGrid) {
      if (!rep.people.length) {
        personGrid.innerHTML = "";
      } else {
        personGrid.innerHTML = rep.people.map(p => {
          const isExpanded = proTravelsExpandedPeople.has(p.key);
          const visibleTrips = isExpanded ? p.entries : p.entries.slice(0, 5);
          const hiddenCount = Math.max(0, p.entries.length - visibleTrips.length);
          const isFocused = proFilterAssignee && proFilterAssignee.toLowerCase() === p.key;

          const citiesChips = p.topCities.slice(0, 6).map(ct =>
            `<span class="pro-travels-city-chip">📍 ${core.esc(ct.city)} <b>${ct.trips}×</b> <small>(${ct.days}d)</small></span>`
          ).join("");

          const tripRowsHtml = visibleTrips.map(e => {
            const info = getProTypeInfo(e.card.type);
            const dt = e.start ? `${core.fmtShortBR(e.start)}${e.end && e.end !== e.start ? `–${core.fmtShortBR(e.end)}` : ""}` : "Sem data";
            const coTxt = e.coTravelers.length ? ` · 👥 ${core.esc(e.coTravelers.join(", "))}` : "";
            return `<button type="button" class="pro-travels-trip-item" data-travel-open-card="${core.esc(e.card.id)}">
              <span class="pro-travels-trip-dt">${core.esc(dt)}</span>
              <span class="pro-travels-trip-main">
                <strong>${info.icon} ${core.esc(e.card.name)}</strong>
                <small>📍 ${core.esc(e.city)}${coTxt}</small>
              </span>
              <span class="pro-travels-trip-right">
                <span class="pro-map-dur-pill">${e.dur}d</span>
                <span class="pill ${e.done ? "ok" : ""}" style="font-size:0.65rem">${e.done ? "✅" : `${e.card.progress || 0}%`}</span>
              </span>
            </button>`;
          }).join("");

          const conflictBanner = p.conflicts.length
            ? `<div class="pro-travels-conflict-alert">⚠️ <b>${p.conflicts.length} ${p.conflicts.length === 1 ? "choque de datas" : "choques de datas"}:</b> ${p.conflicts.slice(0, 2).map(cf => `${core.esc(cf.a.card.name)} (${core.esc(cf.a.city)}) × ${core.esc(cf.b.card.name)} (${core.esc(cf.b.city)})`).join("; ")}</div>`
            : "";

          return `<article class="card pro-travels-person-card" style="--p-col:${core.esc(p.color.hex)}">
            <div class="pro-travels-person-head">
              <div class="pro-travels-person-id">
                <span class="pro-travels-avatar" style="background:${core.esc(p.color.hex)}">${core.esc(p.initials)}</span>
                <div style="min-width:0">
                  <h3 class="pro-travels-person-name">${core.esc(p.name)}</h3>
                  <div class="muted small">
                    ${p.favCity ? `Destino nº 1: <b>${core.esc(p.favCity.city)}</b> (${p.favCity.trips}×)` : "Sem destino definido"}
                    ${p.nextTrip ? ` · Próxima: <b>${core.fmtShortBR(p.nextTrip.start)}</b> (${core.esc(p.nextTrip.city)})` : ""}
                  </div>
                </div>
              </div>
              <div class="pro-travels-person-actions">
                <button type="button" class="btn ghost small" data-travel-goto-map="${core.esc(p.name)}" title="Ver viagens desta pessoa no Mapa">🗺️ Mapa</button>
                <button type="button" class="btn ${isFocused ? "primary" : "ghost"} small" data-travel-pick-person="${core.esc(p.name)}" title="${isFocused ? "Remover filtro" : "Filtrar relatório nesta pessoa"}">${isFocused ? "✕ Limpar" : "🔍 Focar"}</button>
              </div>
            </div>

            ${conflictBanner}

            <div class="pro-travels-person-stats">
              <div class="pro-travels-pstat">
                <span>Viagens</span>
                <strong>${p.tripCount}</strong>
              </div>
              <div class="pro-travels-pstat">
                <span>Dias Totais</span>
                <strong>${p.totalDays}d</strong>
                ${p.uniqueDays && p.uniqueDays !== p.totalDays ? `<small>${p.uniqueDays}d únicos</small>` : ""}
              </div>
              <div class="pro-travels-pstat">
                <span>Média / Viagem</span>
                <strong>${core.num(p.avgDays, 1)}d</strong>
                ${p.longestTrip ? `<small>Máx: ${p.longestTrip.dur}d</small>` : ""}
              </div>
              <div class="pro-travels-pstat">
                <span>Destinos</span>
                <strong>${p.uniqueCitiesCount}</strong>
                <small>${p.donePct}% concluído</small>
              </div>
            </div>

            <div class="pro-travels-prog-wrap" title="${p.doneCount} de ${p.tripCount} viagens concluídas (${p.donePct}%)">
              <div class="pro-travels-prog-top">
                <span class="muted small">Conclusão das missões (${p.doneCount}/${p.tripCount})</span>
                <span class="muted small">${p.totalCost > 0 ? `💳 ${core.money(p.totalCost)} · ` : ""}<b>${p.donePct}%</b></span>
              </div>
              <div class="pro-travels-prog-track"><div class="pro-travels-prog-fill" style="width:${p.donePct}%;background:${core.esc(p.color.hex)}"></div></div>
            </div>

            ${citiesChips ? `<div class="pro-travels-cities-row">${citiesChips}</div>` : ""}

            <div class="pro-travels-trip-list">${tripRowsHtml}</div>

            ${p.entries.length > 5 ? `
              <button type="button" class="btn ghost small pro-travels-expand-btn" data-travel-expand="${core.esc(p.key)}">
                ${isExpanded ? "▴ Recolher roteiro" : `▾ Ver todas as ${p.entries.length} viagens (+${hiddenCount})`}
              </button>` : ""}
          </article>`;
        }).join("");

        personGrid.querySelectorAll("[data-travel-open-card]").forEach(b => {
          b.onclick = () => openProCardModal(b.dataset.travelOpenCard);
        });
        personGrid.querySelectorAll("[data-travel-pick-person]").forEach(b => {
          b.onclick = () => togglePersonFilter(b.dataset.travelPickPerson);
        });
        personGrid.querySelectorAll("[data-travel-goto-map]").forEach(b => {
          b.onclick = () => {
            proFilterAssignee = b.dataset.travelGotoMap;
            if (proTravelsScope === "travels") proFilterTravel = "travels";
            applyAndRenderProFilteredViews();
            core?.switchProView?.("pro-map");
          };
        });
        personGrid.querySelectorAll("[data-travel-expand]").forEach(b => {
          b.onclick = () => {
            const k = b.dataset.travelExpand;
            if (proTravelsExpandedPeople.has(k)) proTravelsExpandedPeople.delete(k);
            else proTravelsExpandedPeople.add(k);
            renderProTravels(cards);
          };
        });
      }
    }

    // 4. TABELA CONSOLIDADA DE TODOS OS DESLOCAMENTOS (DESKTOP ORDENÁVEL + CARDS MOBILE)
    const tblCount = $("#proTravelsTableCountBadge");
    if (tblCount) tblCount.textContent = `${rep.entries.length} ${rep.entries.length === 1 ? "registro" : "registros"}`;

    const sortedEntries = rep.entries.slice().sort((a, b) => {
      const dir = proTravelsTableSort.dir === "desc" ? -1 : 1;
      const col = proTravelsTableSort.col;
      if (col === "person") return dir * a.personName.localeCompare(b.personName);
      if (col === "name") return dir * String(a.card.name || "").localeCompare(String(b.card.name || ""));
      if (col === "city") return dir * a.city.localeCompare(b.city);
      if (col === "days") return dir * (a.dur - b.dur);
      if (col === "status") return dir * (Number(a.done) - Number(b.done) || (a.card.progress || 0) - (b.card.progress || 0));
      return dir * String(a.start || "9999-99-99").localeCompare(String(b.start || "9999-99-99"));
    });

    const tableEl = $("#proTravelsTable");
    if (tableEl) {
      const arrow = col => proTravelsTableSort.col === col ? (proTravelsTableSort.dir === "asc" ? " ▲" : " ▼") : "";
      tableEl.innerHTML = `
        <thead>
          <tr>
            <th><button type="button" class="pro-map-sort-th" data-trv-sort="person">Responsável${arrow("person")}</button></th>
            <th><button type="button" class="pro-map-sort-th" data-trv-sort="name">Viagem / Missão${arrow("name")}</button></th>
            <th><button type="button" class="pro-map-sort-th" data-trv-sort="city">Destino${arrow("city")}</button></th>
            <th><button type="button" class="pro-map-sort-th" data-trv-sort="start">Período${arrow("start")}</button></th>
            <th class="num"><button type="button" class="pro-map-sort-th" data-trv-sort="days">Duração${arrow("days")}</button></th>
            <th><button type="button" class="pro-map-sort-th" data-trv-sort="status">Status${arrow("status")}</button></th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${sortedEntries.map(e => {
            const info = getProTypeInfo(e.card.type);
            const period = e.start ? `${core.fmtBR(e.start)}${e.end && e.end !== e.start ? ` – ${core.fmtBR(e.end)}` : ""}` : "Sem data";
            const typeColStyle = info.isCustom && info.color ? ` style="--t-color:${core.esc(info.color)}"` : "";
            return `<tr class="pro-map-trip-row" data-travel-open-card="${core.esc(e.card.id)}">
              <td>
                <span class="pro-assignee-badge" style="--asg-bg:${e.personColor.bg};--asg-fg:${e.personColor.fg};--asg-bd:${e.personColor.bd}">
                  ${e.travelsFlag ? "✈️" : "👤"} ${core.esc(e.personName)}
                </span>
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:7px">
                  <span class="chip ${info.cls}"${typeColStyle}>${info.icon} ${core.esc(info.short)}</span>
                  <strong>${core.esc(e.card.name)}</strong>
                </div>
              </td>
              <td>📍 ${core.esc(e.rawLocation || e.city)}</td>
              <td>${core.esc(period)}</td>
              <td class="num"><span class="pro-map-dur-pill">${e.dur} ${e.dur === 1 ? "dia" : "dias"}</span></td>
              <td><span class="pill ${e.done ? "ok" : ""}">${e.done ? "✅ Concluído" : `⏳ ${core.esc(e.colTitle)}`}</span></td>
              <td>
                <div style="display:flex;gap:4px">
                  ${e.rawLocation ? `<button type="button" class="btn ghost small" data-travel-row-map="${core.esc(e.personName)}" title="Ver no Mapa">🗺️</button>` : ""}
                  <button type="button" class="btn ghost small" data-travel-row-edit="${core.esc(e.card.id)}" title="Editar cartão">✏️</button>
                </div>
              </td>
            </tr>`;
          }).join("") || `<tr><td colspan="7" class="muted" style="text-align:center;padding:20px">Nenhum deslocamento encontrado para os filtros atuais.</td></tr>`}
        </tbody>`;

      tableEl.querySelectorAll("[data-trv-sort]").forEach(btn => {
        btn.onclick = () => {
          const col = btn.dataset.trvSort;
          if (proTravelsTableSort.col === col) {
            proTravelsTableSort.dir = proTravelsTableSort.dir === "asc" ? "desc" : "asc";
          } else {
            proTravelsTableSort.col = col;
            proTravelsTableSort.dir = col === "days" ? "desc" : "asc";
          }
          renderProTravels(cards);
        };
      });
      tableEl.querySelectorAll("tr[data-travel-open-card]").forEach(tr => {
        tr.onclick = (ev) => {
          if (ev.target.closest("button")) return;
          openProCardModal(tr.dataset.travelOpenCard);
        };
      });
      tableEl.querySelectorAll("[data-travel-row-edit]").forEach(btn => {
        btn.onclick = (ev) => { ev.stopPropagation(); openProCardModal(btn.dataset.travelRowEdit); };
      });
      tableEl.querySelectorAll("[data-travel-row-map]").forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          proFilterAssignee = btn.dataset.travelRowMap;
          applyAndRenderProFilteredViews();
          core?.switchProView?.("pro-map");
        };
      });
    }

    const mobileEl = $("#proTravelsMobileCards");
    if (mobileEl) {
      mobileEl.innerHTML = sortedEntries.map(e => {
        const info = getProTypeInfo(e.card.type);
        const period = e.start ? `${core.fmtShortBR(e.start)}${e.end && e.end !== e.start ? ` – ${core.fmtShortBR(e.end)}` : ""}` : "Sem data";
        return `<div class="m-card pro-map-mcard" data-travel-open-card="${core.esc(e.card.id)}">
          <div class="m-card-head">
            <div style="min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
                <span class="pro-assignee-badge" style="--asg-bg:${e.personColor.bg};--asg-fg:${e.personColor.fg};--asg-bd:${e.personColor.bd}">${e.travelsFlag ? "✈️" : "👤"} ${core.esc(e.personName)}</span>
                <span class="pro-map-dur-pill">${e.dur}d</span>
                <span class="pill ${e.done ? "ok" : ""}" style="font-size:0.66rem">${e.done ? "✅" : core.esc(e.colTitle)}</span>
              </div>
              <b style="display:block;font-size:0.9rem;color:var(--text-strong)">${info.icon} ${core.esc(e.card.name)}</b>
            </div>
            <button type="button" class="icon-btn" data-travel-row-edit="${core.esc(e.card.id)}" title="Editar cartão">✏️</button>
          </div>
          <div class="pro-map-mcard-meta">
            <div>📍 <b>${core.esc(e.city)}</b></div>
            <div>📅 ${core.esc(period)}</div>
          </div>
        </div>`;
      }).join("") || `<p class="muted small" style="text-align:center;padding:14px">Nenhum deslocamento encontrado para os filtros atuais.</p>`;

      mobileEl.querySelectorAll("[data-travel-open-card]").forEach(el => {
        el.onclick = (ev) => {
          if (ev.target.closest("button")) return;
          openProCardModal(el.dataset.travelOpenCard);
        };
      });
      mobileEl.querySelectorAll("[data-travel-row-edit]").forEach(btn => {
        btn.onclick = (ev) => { ev.stopPropagation(); openProCardModal(btn.dataset.travelRowEdit); };
      });
    }
  }

  /* ---------- 2D. MOTOR FINANCEIRO DE VIAGENS (FORÇAS ARMADAS 2026) + ABA CONTROLE ---------- */
  const DEFAULT_TRAVEL_FINANCE_RANKS = [
    { id: "alm_esq",   name: "Almirante de Esquadra / Gen Ex / Ten-Brig", circle: "B", soldo: 14711, irPct: 27.5 },
    { id: "vice_alm",  name: "Vice-Almirante / Gen Div / Maj-Brig",       circle: "B", soldo: 14100, irPct: 27.5 },
    { id: "contra_alm",name: "Contra-Almirante / Gen Bda / Brig",         circle: "B", soldo: 13639, irPct: 27.5 },
    { id: "cmg_cel",   name: "Capitão de Mar e Guerra / Coronel",         circle: "C", soldo: 12505, irPct: 27.5 },
    { id: "cf_tencel", name: "Capitão de Fragata / Tenente-Coronel",      circle: "C", soldo: 12285, irPct: 27.5 },
    { id: "cc_maj",    name: "Capitão de Corveta / Major",                circle: "C", soldo: 12108, irPct: 27.5 },
    { id: "ct_cap",    name: "Capitão-Tenente / Capitão",                 circle: "D", soldo: 9976,  irPct: 27.5 },
    { id: "1ten",      name: "Primeiro-Tenente",                          circle: "D", soldo: 9004,  irPct: 27.5 },
    { id: "2ten",      name: "Segundo-Tenente",                           circle: "D", soldo: 8179,  irPct: 27.5 },
    { id: "gm_asp",    name: "Guarda-Marinha / Aspirante a Oficial",      circle: "D", soldo: 7988,  irPct: 27.5 },
    { id: "so_st",     name: "Suboficial / Subtenente",                   circle: "E", soldo: 6737,  irPct: 27.5 },
    { id: "1sgt",      name: "Primeiro-Sargento",                         circle: "E", soldo: 5988,  irPct: 27.5 },
    { id: "2sgt",      name: "Segundo-Sargento",                          circle: "E", soldo: 5209,  irPct: 27.5 },
    { id: "3sgt",      name: "Terceiro-Sargento",                         circle: "E", soldo: 4177,  irPct: 27.5 },
    { id: "cb_tm",     name: "Cabo (engajado) / Taifeiro-Mor",            circle: "G", soldo: 2869,  irPct: 0 },
    { id: "sd1_mn",    name: "Soldado 1ª Cl (esp/eng) / Marinheiro",      circle: "G", soldo: 2103,  irPct: 0 },
    { id: "sd2",       name: "Soldado 2ª Cl (eng) / Soldado Exército",    circle: "G", soldo: 1927,  irPct: 0 },
    { id: "recruta",   name: "Recruta / Soldado não engajado",            circle: "G", soldo: 1177,  irPct: 0 }
  ];

  const DEFAULT_TRAVEL_FINANCE_DIARIAS = [
    { circle: "A", desc: "Comandantes das Forças e Natureza Especial",                 f1: 800, f2: 700, f3: 650 },
    { circle: "B", desc: "Oficiais-Generais",                                          f1: 600, f2: 515, f3: 455 },
    { circle: "C", desc: "Oficiais-Superiores (Cel/CMG, Ten Cel/CF, Maj/CC)",          f1: 510, f2: 450, f3: 395 },
    { circle: "D", desc: "Oficiais-Intermediários, Subalternos, GM e Asp Of",          f1: 425, f2: 380, f3: 335 },
    { circle: "E", desc: "Suboficiais, Subtenentes, Sargentos, Aspirantes e Cadetes",  f1: 425, f2: 380, f3: 335 },
    { circle: "F", desc: "Alunos CFOAv, CPOR/NPOR, Colégio Naval e Esc. Prep.",        f1: 355, f2: 315, f3: 280 },
    { circle: "G", desc: "Demais Praças e Praças Especiais",                           f1: 355, f2: 315, f3: 280 }
  ];

  const DEFAULT_TRAVEL_FINANCE_CITIES_F1 = [
    "Brasília", "Manaus", "Rio de Janeiro", "São Paulo"
  ];

  const DEFAULT_TRAVEL_FINANCE_CITIES_F2 = [
    "Aracaju", "Belém", "Belo Horizonte", "Boa Vista", "Campo Grande", "Cuiabá",
    "Curitiba", "Florianópolis", "Fortaleza", "Goiânia", "João Pessoa", "Macapá",
    "Maceió", "Natal", "Palmas", "Porto Alegre", "Porto Velho", "Recife",
    "Rio Branco", "Salvador", "São Luís", "Teresina", "Vitória"
  ];

  function createDefaultTravelFinanceConfig() {
    return {
      gratRepPct: 2,
      ranks: DEFAULT_TRAVEL_FINANCE_RANKS.map(r => ({ ...r })),
      diarias: DEFAULT_TRAVEL_FINANCE_DIARIAS.map(d => ({ ...d })),
      citiesF1: [...DEFAULT_TRAVEL_FINANCE_CITIES_F1],
      citiesF2: [...DEFAULT_TRAVEL_FINANCE_CITIES_F2],
      assigneeRanks: {}
    };
  }

  function getTravelFinanceConfig(stOpt = null) {
    const st = stOpt || core?.getState?.() || {};
    const raw = st.params?.travelFinance;
    const def = createDefaultTravelFinanceConfig();
    if (!raw || typeof raw !== "object") return def;
    return {
      gratRepPct: (raw.gratRepPct != null && isFinite(Number(raw.gratRepPct))) ? Math.max(0, Number(raw.gratRepPct)) : def.gratRepPct,
      ranks: Array.isArray(raw.ranks) && raw.ranks.length
        ? raw.ranks.map((r, i) => ({
            id: String(r?.id || `rank_${i}`),
            name: String(r?.name || "Posto").trim() || "Posto",
            circle: ["A", "B", "C", "D", "E", "F", "G"].includes(String(r?.circle || "").toUpperCase()) ? String(r.circle).toUpperCase() : "D",
            soldo: Math.max(0, Number(r?.soldo) || 0),
            irPct: Math.max(0, Math.min(100, Number(r?.irPct) || 0))
          }))
        : def.ranks,
      diarias: Array.isArray(raw.diarias) && raw.diarias.length
        ? raw.diarias.map(d => ({
            circle: String(d?.circle || "G").toUpperCase(),
            desc: String(d?.desc || ""),
            f1: Math.max(0, Number(d?.f1) || 0),
            f2: Math.max(0, Number(d?.f2) || 0),
            f3: Math.max(0, Number(d?.f3) || 0)
          }))
        : def.diarias,
      citiesF1: Array.isArray(raw.citiesF1)
        ? raw.citiesF1.map(c => String(c || "").trim()).filter(Boolean)
        : def.citiesF1,
      citiesF2: Array.isArray(raw.citiesF2)
        ? raw.citiesF2.map(c => String(c || "").trim()).filter(Boolean)
        : def.citiesF2,
      assigneeRanks: raw.assigneeRanks && typeof raw.assigneeRanks === "object" ? { ...raw.assigneeRanks } : {}
    };
  }

  function ensureWritableTravelFinanceConfig(stOpt = null) {
    const st = stOpt || core.getState();
    if (!st.params || typeof st.params !== "object") st.params = {};
    if (!st.params.travelFinance || typeof st.params.travelFinance !== "object") {
      st.params.travelFinance = createDefaultTravelFinanceConfig();
    } else {
      const normalized = getTravelFinanceConfig(st);
      st.params.travelFinance = normalized;
    }
    return st.params.travelFinance;
  }

  function normalizeCityToken(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function classifyLocationTier(rawLocation, cfgOpt = null) {
    const cfg = cfgOpt || getTravelFinanceConfig();
    const clean = String(rawLocation || "").trim();
    if (!clean) return { tier: 3, label: "Faixa 3", short: "F3", desc: "Demais Localidades" };

    // Usa o primeiro segmento (cidade) antes da vírgula ou " - " para evitar confundir cidade do interior com estado (ex: Pirassununga, São Paulo)
    const primarySegment = clean.split(",")[0].split(" - ")[0].trim();
    const segNorm = normalizeCityToken(primarySegment);

    const matchesList = (list) => list.some(city => {
      const cn = normalizeCityToken(city);
      if (!cn) return false;
      if (segNorm === cn) return true;
      const re = new RegExp(`(^|\\s)${cn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
      return re.test(segNorm);
    });

    if (matchesList(cfg.citiesF1) || /\b(bsb|mao)\b/.test(segNorm)) {
      return { tier: 1, label: "Faixa 1", short: "F1", desc: "BSB / MAO / RJ / SP" };
    }
    if (matchesList(cfg.citiesF2)) {
      return { tier: 2, label: "Faixa 2", short: "F2", desc: "Demais Capitais" };
    }
    return { tier: 3, label: "Faixa 3", short: "F3", desc: "Demais Localidades" };
  }

  function getPersonRankRecord(personName, cfgOpt = null) {
    const cfg = cfgOpt || getTravelFinanceConfig();
    const key = String(personName || "").trim().toLowerCase();
    if (!key) return null;
    const rankId = cfg.assigneeRanks?.[key] || "";
    if (!rankId) return null;
    return cfg.ranks.find(r => r.id === rankId) || null;
  }

  const RANK_ABBREV_MAP = {
    alm_esq: "AE / Gen Ex",
    vice_alm: "VA / Gen Div",
    contra_alm: "CA / Gen Bda",
    cmg_cel: "CMG / Cel",
    cf_tencel: "CF / TC",
    cc_maj: "CC / Maj",
    ct_cap: "CT / Cap",
    "1ten": "1º Ten",
    "2ten": "2º Ten",
    gm_asp: "GM / Asp",
    so_st: "SO / ST",
    "1sgt": "1º Sgt",
    "2sgt": "2º Sgt",
    "3sgt": "3º Sgt",
    cb_tm: "Cb / TM",
    sd1_mn: "Sd 1ª / MN",
    sd2: "Sd 2ª",
    recruta: "Recruta"
  };

  function shortRankAbbrev(rank) {
    if (!rank) return "";
    if (RANK_ABBREV_MAP[rank.id]) return RANK_ABBREV_MAP[rank.id];
    const clean = String(rank.name || "").trim();
    if (clean.length <= 12) return clean;
    return `Círc. ${rank.circle || ""}`.trim();
  }

  function computePersonTravelFinance(card, personName, personEntry = null, cfgOpt = null) {
    const cfg = cfgOpt || getTravelFinanceConfig();
    const td = getEffectivePersonTravelDates(card, personEntry);
    const start = td.idaIso;
    const end = td.voltaIso;
    let diffDays = 0;
    if (start && end) {
      const d1 = core.parseD(start);
      const d2 = core.parseD(end);
      if (isFinite(d1) && isFinite(d2)) {
        diffDays = Math.max(0, Math.round((d2 - d1) / 86400000));
      }
    }
    const diasFora = diffDays + 1;
    const diariasQty = diffDays === 0 ? 0.5 : (diffDays + 0.5);
    const tierInfo = classifyLocationTier(card?.location || "", cfg);
    const rank = getPersonRankRecord(personName, cfg);
    const diariaRow = rank ? cfg.diarias.find(d => d.circle === rank.circle) : null;
    const diariaBase = diariaRow
      ? (tierInfo.tier === 1 ? diariaRow.f1 : (tierInfo.tier === 2 ? diariaRow.f2 : diariaRow.f3))
      : 0;
    const freeLodging = Boolean(card?.travelFreeLodging);
    const diariaTotal = Math.round(diariasQty * diariaBase * (freeLodging ? 0.5 : 1) * 100) / 100;

    const gratPct = Number(cfg.gratRepPct) >= 0 ? Number(cfg.gratRepPct) : 2;
    const soldo = rank ? (Number(rank.soldo) || 0) : 0;
    const irPct = rank ? (Number(rank.irPct) || 0) : 0;
    const gratBrutaDia = soldo * (gratPct / 100);
    const gratBruta = Math.round(diasFora * gratBrutaDia * 100) / 100;
    const gratLiquida = Math.round(gratBruta * (1 - irPct / 100) * 100) / 100;

    const activeMode = sanitizeTravelMode(personEntry?.travelMode) || sanitizeTravelMode(card?.travelFinanceMode) || "diaria";
    const effectiveDiaria = activeMode === "diaria" ? diariaTotal : 0;
    const effectiveGratBruta = activeMode === "grat_rep" ? gratBruta : 0;
    const effectiveGratLiquida = activeMode === "grat_rep" ? gratLiquida : 0;
    const effectiveTotal = Math.round((effectiveDiaria + effectiveGratLiquida) * 100) / 100;

    return {
      eventStart: String(card?._origStart || card?.start || "").trim(),
      eventEnd: String(card?._origEnd || card?.end || card?._origStart || card?.start || "").trim(),
      start,
      end,
      idaDt: td.idaDt,
      voltaDt: td.voltaDt,
      hasExplicitTravelDates: td.hasExplicitStart || td.hasExplicitEnd,
      diffDays,
      diasFora,
      diariasQty,
      tierInfo,
      rank,
      rankAbbrev: shortRankAbbrev(rank),
      diariaBase,
      freeLodging,
      diariaTotal,
      gratPct,
      soldo,
      irPct,
      gratBruta,
      gratLiquida,
      activeMode,
      effectiveDiaria,
      effectiveGratBruta,
      effectiveGratLiquida,
      effectiveTotal
    };
  }

  function setCardPersonTravelMode(cardId, personName, nextMode) {
    const mode = sanitizeTravelMode(nextMode) || "diaria";
    const ctx = findProCardContext(cardId);
    if (!ctx) return;
    if (ctx.trip?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
    const card = ctx.activity;
    const list = getCardAssigneesList(card);
    const targetLow = String(personName || "").trim().toLowerCase();
    const updatedList = list.map(e => ({
      name: e.name,
      travels: Boolean(e.travels),
      travelMode: e.name.toLowerCase() === targetLow ? mode : sanitizeTravelMode(e.travelMode),
      travelStart: sanitizeTravelDateTime(e.travelStart),
      travelEnd: sanitizeTravelDateTime(e.travelEnd)
    }));
    card.assigneesList = updatedList;
    if (updatedList[0]) {
      card.assignee = updatedList[0].name;
      card.assigneeTravels = Boolean(updatedList[0].travels);
      card.assigneeTravelMode = updatedList[0].travelMode || "";
      card.assigneeTravelStart = updatedList[0].travelStart || "";
      card.assigneeTravelEnd = updatedList[0].travelEnd || "";
    }
    const travelers = updatedList.filter(e => e.travels);
    if (travelers.length <= 1 || updatedList.length <= 1) {
      card.travelFinanceMode = mode;
    }
    const modeNames = { diaria: "💵 Diária", grat_rep: "🎖️ Grat. Representação", comissionamento: "📋 Comissionamento" };
    core.saveTripRecord(ctx.trip, `${modeNames[mode]} aplicada para ${personName}`);
  }

  /* ---------- TOOLTIP FLUTUANTE EM PRIMEIRO PLANO (Z-INDEX 9999) ---------- */
  let proTooltipInitDone = false;
  function initProFloatingTooltips() {
    if (proTooltipInitDone) return;
    proTooltipInitDone = true;
    let tipEl = $("#proFloatingTooltip");
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.id = "proFloatingTooltip";
      tipEl.className = "pro-float-tooltip";
      tipEl.setAttribute("role", "tooltip");
      tipEl.hidden = true;
      document.body.appendChild(tipEl);
    }

    let activeTarget = null;
    const hideTip = () => {
      activeTarget = null;
      tipEl.hidden = true;
    };
    const placeTip = (clientX, clientY, anchorRect = null) => {
      tipEl.hidden = false;
      const w = tipEl.offsetWidth || 220;
      const h = tipEl.offsetHeight || 34;
      const pad = 10;
      let left = anchorRect ? (anchorRect.left + anchorRect.width / 2 - w / 2) : (clientX - w / 2);
      let top = anchorRect ? (anchorRect.top - h - 10) : (clientY - h - 14);
      left = Math.max(pad, Math.min(window.innerWidth - w - pad, left));
      if (top < pad) {
        top = anchorRect ? (anchorRect.bottom + 10) : (clientY + 18);
      }
      if (top + h > window.innerHeight - pad) {
        top = Math.max(pad, window.innerHeight - h - pad);
      }
      tipEl.style.left = `${Math.round(left)}px`;
      tipEl.style.top = `${Math.round(top)}px`;
    };
    const showFor = (el, ev = null) => {
      const txt = el?.getAttribute("data-tooltip") || "";
      if (!txt) return hideTip();
      // Remove title nativo duplicado no primeiro hover preservando texto no data-tooltip
      if (el.hasAttribute("title")) el.removeAttribute("title");
      activeTarget = el;
      tipEl.textContent = txt;
      const rect = el.getBoundingClientRect();
      if (ev && typeof ev.clientX === "number" && (ev.clientX || ev.clientY)) {
        placeTip(ev.clientX, ev.clientY, null);
      } else {
        placeTip(0, 0, rect);
      }
    };

    document.addEventListener("mouseover", ev => {
      const host = ev.target?.closest?.("[data-tooltip]");
      if (host) showFor(host, ev);
      else if (activeTarget) hideTip();
    });
    document.addEventListener("mousemove", ev => {
      if (!activeTarget || tipEl.hidden) return;
      if (!ev.target?.closest?.("[data-tooltip]")) return hideTip();
      placeTip(ev.clientX, ev.clientY, null);
    });
    document.addEventListener("mouseout", ev => {
      if (!activeTarget) return;
      const toHost = ev.relatedTarget?.closest?.("[data-tooltip]");
      if (!toHost || toHost !== activeTarget) hideTip();
    });
    document.addEventListener("focusin", ev => {
      const host = ev.target?.closest?.("[data-tooltip]");
      if (host) showFor(host, null);
    });
    document.addEventListener("focusout", () => hideTip());
    window.addEventListener("scroll", hideTip, true);
  }

  /* ---------- RENDERIZAÇÃO EM PARÂMETROS: PARÂMETROS FINANCEIROS DE VIAGENS (FA 2026) ---------- */
  function renderProTravelFinanceParams(stOpt = null) {
    const card = $("#proTravelFinanceParamsCard");
    if (!card) return;
    const st = stOpt || core.getState();
    const cfg = getTravelFinanceConfig(st);
    const assignees = getAllProAssignees(st.activities);
    const gratPct = Number(cfg.gratRepPct) >= 0 ? Number(cfg.gratRepPct) : 2;

    if ($("#proTfGratPct")) $("#proTfGratPct").value = String(gratPct);

    // 1.1 Pessoas -> Posto / Graduação
    const pplWrap = $("#proTfPeopleRanksWrap");
    if (pplWrap) {
      if (!assignees.length) {
        pplWrap.innerHTML = `<p class="muted small" style="margin:4px 0">Adicione responsáveis na seção <b>"👤 Responsáveis do Projeto"</b> acima para vincular o Posto/Graduação de cada pessoa.</p>`;
      } else {
        const rankOpts = (selId) => `<option value="">— Selecionar Posto / Graduação —</option>`
          + cfg.ranks.map(r => `<option value="${core.esc(r.id)}" ${r.id === selId ? "selected" : ""}>${core.esc(r.name)} (Círc. ${core.esc(r.circle)})</option>`).join("");
        pplWrap.innerHTML = `<div class="pro-tf-people-grid">${assignees.map(name => {
          const key = name.toLowerCase();
          const col = colorForAssignee(name);
          const selRankId = cfg.assigneeRanks?.[key] || "";
          const rank = cfg.ranks.find(r => r.id === selRankId) || null;
          const dRow = rank ? cfg.diarias.find(d => d.circle === rank.circle) : null;
          const gLiq = rank ? (rank.soldo * (gratPct / 100) * (1 - rank.irPct / 100)) : 0;
          const preview = rank
            ? `Círculo <b>${core.esc(rank.circle)}</b> · Diária F1: <b>${core.money(dRow?.f1 || 0)}</b> · Grat. Rep. Líq./dia: <b>${core.money(gLiq)}</b>`
            : `<span class="muted">Sem posto vinculado (cálculo financeiro zerado)</span>`;
          return `<div class="pro-tf-person-row">
            <span class="pro-assignee-badge" style="--asg-bg:${col.bg};--asg-fg:${col.fg};--asg-bd:${col.bd}">👤 ${core.esc(name)}</span>
            <select data-tf-person-rank="${core.esc(key)}" aria-label="Posto ou graduação de ${core.esc(name)}">${rankOpts(selRankId)}</select>
            <span class="pro-tf-person-prev">${preview}</span>
          </div>`;
        }).join("")}</div>`;

        pplWrap.querySelectorAll("[data-tf-person-rank]").forEach(sel => {
          sel.onchange = () => {
            const tf = ensureWritableTravelFinanceConfig(st);
            if (!tf.assigneeRanks) tf.assigneeRanks = {};
            const pk = sel.dataset.tfPersonRank;
            if (sel.value) tf.assigneeRanks[pk] = sel.value;
            else delete tf.assigneeRanks[pk];
            core.save("🎖️ Posto/Graduação vinculado com sucesso");
          };
        });
      }
    }

    // 1.2 Tabela de Soldos e Gratificação de Representação
    const ranksTbl = $("#proTfRanksTable");
    if (ranksTbl) {
      const circleOpts = cur => ["A", "B", "C", "D", "E", "F", "G"]
        .map(c => `<option value="${c}" ${c === cur ? "selected" : ""}>${c}</option>`).join("");
      ranksTbl.innerHTML = `
        <thead>
          <tr>
            <th>Posto ou Graduação</th>
            <th style="width:76px;text-align:center">Círculo</th>
            <th style="width:125px" class="num">Soldo (R$)</th>
            <th style="width:115px" class="num">Grat. Bruta (${core.num(gratPct, 1)}%)</th>
            <th style="width:92px" class="num">IR (%)</th>
            <th style="width:115px" class="num">Grat. Líquida</th>
            <th style="width:42px"></th>
          </tr>
        </thead>
        <tbody>
          ${cfg.ranks.map((r, idx) => {
            const bruta = r.soldo * (gratPct / 100);
            const liq = bruta * (1 - r.irPct / 100);
            return `<tr data-tf-rank-idx="${idx}">
              <td><input type="text" class="pro-tf-inp" data-tf-rfield="name" value="${core.esc(r.name)}"></td>
              <td style="text-align:center"><select class="pro-tf-sel" data-tf-rfield="circle">${circleOpts(r.circle)}</select></td>
              <td class="num"><input type="number" step="0.01" min="0" class="pro-tf-inp num" data-tf-rfield="soldo" value="${r.soldo}"></td>
              <td class="num muted">${core.money(bruta)}</td>
              <td class="num"><input type="number" step="0.5" min="0" max="100" class="pro-tf-inp num" data-tf-rfield="irPct" value="${r.irPct}"></td>
              <td class="num"><strong style="color:var(--ok)">${core.money(liq)}</strong></td>
              <td><button type="button" class="icon-btn" data-tf-rank-del="${idx}" title="Remover posto">✕</button></td>
            </tr>`;
          }).join("")}
        </tbody>`;

      ranksTbl.querySelectorAll("[data-tf-rfield]").forEach(el => {
        el.onchange = () => {
          const tr = el.closest("tr[data-tf-rank-idx]");
          const idx = parseInt(tr?.dataset.tfRankIdx, 10);
          if (!isFinite(idx)) return;
          const tf = ensureWritableTravelFinanceConfig(st);
          const rec = tf.ranks[idx];
          if (!rec) return;
          const field = el.dataset.tfRfield;
          if (field === "name") rec.name = el.value.trim() || rec.name;
          else if (field === "circle") rec.circle = el.value;
          else if (field === "soldo") rec.soldo = Math.max(0, parseFloat(el.value) || 0);
          else if (field === "irPct") rec.irPct = Math.max(0, Math.min(100, parseFloat(el.value) || 0));
          core.save("🎖️ Tabela de soldos atualizada");
        };
      });
      ranksTbl.querySelectorAll("[data-tf-rank-del]").forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.tfRankDel, 10);
          const tf = ensureWritableTravelFinanceConfig(st);
          if (tf.ranks.length <= 1) return core.toast("Mantenha ao menos 1 posto/graduação na tabela.");
          if (!confirm(`Excluir o posto/graduação "${tf.ranks[idx]?.name || ""}" da tabela?`)) return;
          tf.ranks.splice(idx, 1);
          core.save("🗑️ Posto/Graduação removido da tabela");
        };
      });
    }

    // 1.3 Tabela de Diárias no País (Decreto 12.324/2024)
    const diariasTbl = $("#proTfDiariasTable");
    if (diariasTbl) {
      diariasTbl.innerHTML = `
        <thead>
          <tr>
            <th style="width:68px;text-align:center">Círculo</th>
            <th>Descrição</th>
            <th style="width:130px" class="num">Faixa 1 (BSB/MAO/RJ/SP)</th>
            <th style="width:130px" class="num">Faixa 2 (Demais Capitais)</th>
            <th style="width:130px" class="num">Faixa 3 (Demais Locais)</th>
          </tr>
        </thead>
        <tbody>
          ${cfg.diarias.map((d, idx) => `
            <tr data-tf-diaria-idx="${idx}">
              <td style="text-align:center"><span class="pill"><b>${core.esc(d.circle)}</b></span></td>
              <td><input type="text" class="pro-tf-inp" data-tf-dfield="desc" value="${core.esc(d.desc)}"></td>
              <td class="num"><input type="number" step="1" min="0" class="pro-tf-inp num" data-tf-dfield="f1" value="${d.f1}"></td>
              <td class="num"><input type="number" step="1" min="0" class="pro-tf-inp num" data-tf-dfield="f2" value="${d.f2}"></td>
              <td class="num"><input type="number" step="1" min="0" class="pro-tf-inp num" data-tf-dfield="f3" value="${d.f3}"></td>
            </tr>`).join("")}
        </tbody>`;

      diariasTbl.querySelectorAll("[data-tf-dfield]").forEach(el => {
        el.onchange = () => {
          const tr = el.closest("tr[data-tf-diaria-idx]");
          const idx = parseInt(tr?.dataset.tfDiariaIdx, 10);
          if (!isFinite(idx)) return;
          const tf = ensureWritableTravelFinanceConfig(st);
          const rec = tf.diarias[idx];
          if (!rec) return;
          const field = el.dataset.tfDfield;
          if (field === "desc") rec.desc = el.value.trim();
          else rec[field] = Math.max(0, parseFloat(el.value) || 0);
          core.save("💵 Tabela de diárias atualizada");
        };
      });
    }

    // 1.4 Classificação de Localidades (Faixa 1 e Faixa 2)
    if ($("#proTfCitiesF1")) $("#proTfCitiesF1").value = cfg.citiesF1.join(", ");
    if ($("#proTfCitiesF2")) $("#proTfCitiesF2").value = cfg.citiesF2.join(", ");
  }

  /* ---------- ABA CONTROLE (CONTROLE DE VIAGENS & FINANCEIRO) ---------- */
  let proControlQuickMode = "";
  let proControlQuickYear = "";
  let proControlQuickMonth = "";
  let proControlScope = "travels";
  let proControlSummaryTab = "all";
  let proControlTableSort = { col: "start", dir: "asc" };
  let proControlLastReport = null;

  function renderProControl(filteredCardsOpt) {
    const viewEl = $("#view-pro-control");
    if (!viewEl) return;

    const st = core.getState();
    const cfg = getTravelFinanceConfig(st);
    const cards = filteredCardsOpt || applyProUnifiedFilters(getProSortedActivities());
    const filterAsgLow = (proFilterAssignee && proFilterAssignee !== "__none__") ? proFilterAssignee.toLowerCase() : "";

    if ($("#proControlScopeSel") && $("#proControlScopeSel").value !== proControlScope) {
      $("#proControlScopeSel").value = proControlScope;
    }
    if ($("#proControlQuickMode") && $("#proControlQuickMode").value !== proControlQuickMode) {
      $("#proControlQuickMode").value = proControlQuickMode;
    }

    // Construir lista base de registros (antes do filtro de ano/mês/modalidade para popular Anos e Meses dinamicamente)
    const rawRows = [];
    let fallbackLocCount = 0;
    const allYearsSet = new Set();

    cards.forEach(c => {
      const asgList = getCardAssigneesList(c);
      const rawLoc = String(c.location || "").trim();
      if (rawLoc && asgList.length) fallbackLocCount++;

      let matched = proControlScope === "travels"
        ? asgList.filter(e => e.travels)
        : (rawLoc ? asgList : []);

      if (filterAsgLow) {
        matched = matched.filter(e => e.name.toLowerCase() === filterAsgLow);
      }
      if (!matched.length) return;

      matched.forEach(entry => {
        const calcFin = computePersonTravelFinance(c, entry.name, entry, cfg);
        const ym = String(calcFin.start || calcFin.eventStart || "").slice(0, 7);
        const yr = ym.length === 7 ? ym.slice(0, 4) : "";
        if (yr) allYearsSet.add(yr);
        rawRows.push({
          card: c,
          personName: entry.name,
          personKey: entry.name.toLowerCase(),
          personColor: colorForAssignee(entry.name),
          travelsFlag: Boolean(entry.travels),
          city: rawLoc ? shortLocationCityName(rawLoc) : "Sem local",
          rawLocation: rawLoc,
          yr,
          ym: ym.length === 7 ? ym : "",
          fin: calcFin
        });
      });
    });

    // Popular seletor dinâmico de Anos com base em todas as viagens planejadas
    const yearSel = $("#proControlQuickYear");
    if (yearSel) {
      const sortedYears = [...allYearsSet].sort();
      const prevY = proControlQuickYear;
      yearSel.innerHTML = `<option value="">🗓️ Todos os anos</option>`
        + sortedYears.map(y => `<option value="${y}" ${y === prevY ? "selected" : ""}>🗓️ ${y}</option>`).join("");
      if (prevY && !sortedYears.includes(prevY)) {
        proControlQuickYear = "";
        yearSel.value = "";
      } else {
        yearSel.value = prevY;
      }
    }

    // Popular seletor dinâmico de Meses filtrados pelo Ano selecionado (com opção "Todos os meses")
    const monthsForYearSet = new Set();
    rawRows.forEach(r => {
      if (!r.ym) return;
      if (proControlQuickYear && r.yr !== proControlQuickYear) return;
      monthsForYearSet.add(r.ym);
    });
    const monthSel = $("#proControlQuickMonth");
    if (monthSel) {
      const sortedYms = [...monthsForYearSet].sort();
      const prevM = proControlQuickMonth;
      monthSel.innerHTML = `<option value="">📅 Todos os meses</option>` + sortedYms.map(ym => {
        const [yr, mo] = ym.split("-");
        const lbl = `${core.MON[parseInt(mo, 10) - 1]}/${yr}`;
        return `<option value="${ym}" ${ym === prevM ? "selected" : ""}>📅 ${lbl}</option>`;
      }).join("");
      if (prevM && !sortedYms.includes(prevM)) {
        proControlQuickMonth = "";
        monthSel.value = "";
      } else {
        monthSel.value = prevM;
      }
    }

    // Aplicar filtros rápidos de Ano, Mês e Modalidade
    const rows = rawRows.filter(r => {
      if (proControlQuickMode && r.fin.activeMode !== proControlQuickMode) return false;
      if (proControlQuickYear && r.yr !== proControlQuickYear) return false;
      if (proControlQuickMonth && r.ym !== proControlQuickMonth) return false;
      return true;
    });

    // Totais efetivos (apenas modalidades selecionadas; Comissionamento = R$ 0,00)
    const uniqueCardIds = new Set(rows.map(r => r.card.id));
    let sumDiasFora = 0;
    let sumDiariasQty = 0;
    let sumDiariasVal = 0;
    let sumGratLiq = 0;
    let sumGratBruta = 0;
    let sumTotalGeral = 0;
    let countDiariaRows = 0;
    let countGratRows = 0;
    let countComissRows = 0;

    rows.forEach(r => {
      sumDiasFora += r.fin.diasFora;
      if (r.fin.activeMode === "diaria") {
        countDiariaRows++;
        sumDiariasQty += r.fin.diariasQty;
        sumDiariasVal += r.fin.effectiveDiaria;
      } else if (r.fin.activeMode === "grat_rep") {
        countGratRows++;
        sumGratLiq += r.fin.effectiveGratLiquida;
        sumGratBruta += r.fin.effectiveGratBruta;
      } else {
        countComissRows++;
      }
      sumTotalGeral += r.fin.effectiveTotal;
    });

    if ($("#proControlCountBadge")) {
      $("#proControlCountBadge").textContent = `${uniqueCardIds.size} ${uniqueCardIds.size === 1 ? "viagem" : "viagens"} · ${core.money(sumTotalGeral)}`;
    }

    // Empty state contextual
    const emptyEl = $("#proControlEmptyBanner");
    if (emptyEl) {
      if (!rows.length) {
        emptyEl.hidden = false;
        const canSwitchLoc = proControlScope === "travels" && fallbackLocCount > 0;
        emptyEl.innerHTML = `
          <div class="pro-travels-empty-inner">
            <div style="font-size:2rem">📋</div>
            <h3>Nenhuma viagem encontrada para o controle financeiro</h3>
            <p class="muted small">
              ${proControlScope === "travels"
                ? 'Marque <b>"✈️ Viaja"</b> no responsável dos cartões e vincule o <b>Posto/Graduação</b> em Parâmetros para calcular Diárias e Gratificação de Representação.'
                : "Adicione responsáveis e locais aos cartões para iniciar o controle financeiro."}
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px">
              ${canSwitchLoc ? `<button type="button" class="btn primary small" id="btnProControlSwitchLoc">📍 Ver todos com Local (${fallbackLocCount})</button>` : ""}
              <button type="button" class="btn ghost small" id="btnProControlEmptyParams">⚙️ Configurar Postos &amp; Soldos</button>
              <button type="button" class="btn ghost small" id="btnProControlEmptyAdd">➕ Novo Cartão</button>
            </div>
          </div>`;
        if ($("#btnProControlSwitchLoc", emptyEl)) {
          $("#btnProControlSwitchLoc", emptyEl).onclick = () => { proControlScope = "with_location"; renderProControl(); };
        }
        if ($("#btnProControlEmptyParams", emptyEl)) {
          $("#btnProControlEmptyParams", emptyEl).onclick = () => {
            core?.switchProView?.("pro-params");
            setTimeout(() => $("#proTravelFinanceParamsCard")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
          };
        }
        if ($("#btnProControlEmptyAdd", emptyEl)) {
          $("#btnProControlEmptyAdd", emptyEl).onclick = () => openProCardModal();
        }
      } else {
        emptyEl.hidden = true;
        emptyEl.innerHTML = "";
      }
    }

    // 4.2 Cards de KPIs (5 KPIs)
    const kpisEl = $("#proControlKpis");
    if (kpisEl) {
      const kpis = [
        ["Total de Viagens", String(uniqueCardIds.size), `${rows.length} lançamento(s) · ${countComissRows} comiss.`, "#38bdf8"],
        ["Total de Dias Fora", `${sumDiasFora}d`, `${core.num(sumDiariasQty, 1)} diárias em ${countDiariaRows} lanç.`, "#f59e0b"],
        ["Total em Diárias", core.money(sumDiariasVal), `${countDiariaRows} ${countDiariaRows === 1 ? "lançamento" : "lançamentos"} (isento IR)`, "#10b981"],
        ["Grat. Representação", core.money(sumGratLiq), `Líquido · Bruto: ${core.money(sumGratBruta)} (${countGratRows})`, "#a855f7"],
        ["Total Geral Recebido", core.money(sumTotalGeral), "Diárias + Grat. Rep. Líquida", "#22d3ee"]
      ];
      kpisEl.innerHTML = kpis.map(([lbl, val, sub, col]) => `
        <div class="kpi pro-map-kpi-card pro-travels-kpi" style="--c:${core.esc(col)}">
          <div class="lbl">${core.esc(lbl)}</div>
          <div class="val" title="${core.esc(val)}">${core.esc(val)}</div>
          <div class="sub" title="${core.esc(sub)}">${core.esc(sub)}</div>
        </div>
      `).join("");
    }

    // Ordenação da tabela principal
    const sortedRows = rows.slice().sort((a, b) => {
      const dir = proControlTableSort.dir === "desc" ? -1 : 1;
      const col = proControlTableSort.col;
      if (col === "person") return dir * a.personName.localeCompare(b.personName);
      if (col === "name") return dir * String(a.card.name || "").localeCompare(String(b.card.name || ""));
      if (col === "city") return dir * a.city.localeCompare(b.city);
      if (col === "evstart") return dir * String(a.fin.eventStart || "9999-99-99").localeCompare(String(b.fin.eventStart || "9999-99-99"));
      if (col === "end") return dir * String(a.fin.end || "9999-99-99").localeCompare(String(b.fin.end || "9999-99-99"));
      if (col === "days") return dir * (a.fin.diasFora - b.fin.diasFora);
      if (col === "diaria") return dir * (a.fin.diariaTotal - b.fin.diariaTotal);
      if (col === "grat") return dir * (a.fin.gratLiquida - b.fin.gratLiquida);
      return dir * String(a.fin.start || "9999-99-99").localeCompare(String(b.fin.start || "9999-99-99"));
    });

    if ($("#proControlTableCountBadge")) {
      $("#proControlTableCountBadge").textContent = `${rows.length} ${rows.length === 1 ? "lançamento" : "lançamentos"}`;
    }

    // 4.3 Tabela Principal de Controle Financeiro (Desktop — Layout Compacto Horizontalmente)
    const tblEl = $("#proControlTable");
    if (tblEl) {
      const arrow = col => proControlTableSort.col === col ? (proControlTableSort.dir === "asc" ? " ▲" : " ▼") : "";
      tblEl.innerHTML = `
        <thead>
          <tr>
            <th><button type="button" class="pro-map-sort-th" data-ctrl-sort="person">Pessoa${arrow("person")}</button></th>
            <th><button type="button" class="pro-map-sort-th" data-ctrl-sort="name">Viagem / Evento${arrow("name")}</button></th>
            <th><button type="button" class="pro-map-sort-th" data-ctrl-sort="city">Localidade${arrow("city")}</button></th>
            <th><button type="button" class="pro-map-sort-th" data-ctrl-sort="evstart">Data Evento${arrow("evstart")}</button></th>
            <th><button type="button" class="pro-map-sort-th" data-ctrl-sort="start">Ida e Volta${arrow("start")}</button></th>
            <th class="num"><button type="button" class="pro-map-sort-th" data-ctrl-sort="days">Dias${arrow("days")}</button></th>
            <th class="num"><button type="button" class="pro-map-sort-th" data-ctrl-sort="diaria">Diária (R$)${arrow("diaria")}</button></th>
            <th class="num"><button type="button" class="pro-map-sort-th" data-ctrl-sort="grat">Grat. Rep. (R$)${arrow("grat")}</button></th>
            <th style="text-align:center">Comiss.</th>
          </tr>
        </thead>
        <tbody>
          ${sortedRows.map(r => {
            const f = r.fin;
            const info = getProTypeInfo(r.card.type);
            const isDiaria = f.activeMode === "diaria";
            const isGrat = f.activeMode === "grat_rep";
            const isComiss = f.activeMode === "comissionamento";
            const rankSub = f.rank
              ? `<span class="pro-ctrl-rank-sub" title="${core.esc(f.rank.name)} — Círculo ${core.esc(f.rank.circle)}">${core.esc(f.rankAbbrev)} · Círc. ${core.esc(f.rank.circle)}</span>`
              : `<button type="button" class="pro-ctrl-no-rank-btn" data-ctrl-go-params="1" title="Vincular Posto/Graduação em Parâmetros">⚠️ Posto</button>`;
            const tierCls = `tier-${f.tierInfo.tier}`;
            const evStartShort = f.eventStart ? core.fmtBR(f.eventStart).slice(0, 5) + "/" + f.eventStart.slice(2, 4) : "—";
            const evEndShort = f.eventEnd ? core.fmtBR(f.eventEnd).slice(0, 5) + "/" + f.eventEnd.slice(2, 4) : "—";
            const idaLine = formatDateTimeShortBR(f.idaDt, f.start);
            const voltaLine = formatDateTimeShortBR(f.voltaDt, f.end);
            return `<tr class="pro-map-trip-row pro-ctrl-row${isComiss ? " is-comiss" : ""}" data-ctrl-open-card="${core.esc(r.card.id)}">
              <td class="pro-ctrl-col-person">
                <div class="pro-ctrl-person-cell">
                  <span class="pro-assignee-badge pro-ctrl-asg-compact" style="--asg-bg:${r.personColor.bg};--asg-fg:${r.personColor.fg};--asg-bd:${r.personColor.bd}" title="${core.esc(r.personName)}">${core.esc(r.personName)}</span>
                  ${rankSub}
                </div>
              </td>
              <td class="pro-ctrl-col-event">
                <div class="pro-ctrl-trip-stack">
                  <span class="chip ${info.cls} pro-ctrl-chip-mini"${info.isCustom && info.color ? ` style="--t-color:${core.esc(info.color)}"` : ""}>${info.icon} ${core.esc(info.short)}</span>
                  <strong class="pro-ctrl-trip-link">${core.esc(r.card.name)}</strong>
                </div>
              </td>
              <td class="pro-ctrl-col-loc">
                <div class="pro-ctrl-loc-cell">
                  <span class="pro-ctrl-loc-txt" title="${core.esc(r.rawLocation || r.city)}">📍 ${core.esc(r.city)}</span>
                  <span class="pro-ctrl-tier-badge ${tierCls}" title="${core.esc(f.tierInfo.desc)}">${core.esc(f.tierInfo.label)}</span>
                </div>
              </td>
              <td class="pro-ctrl-col-dates nowrap">
                <div class="pro-ctrl-date-stack">
                  <span>${core.esc(evStartShort)}</span>
                  <small class="muted">${core.esc(evEndShort)}</small>
                </div>
              </td>
              <td class="pro-ctrl-col-travel-dates nowrap">
                <div class="pro-ctrl-date-stack" title="Base do cálculo financeiro (Ida e Regresso do responsável)">
                  <span>🛫 ${core.esc(idaLine)}</span>
                  <small>🛬 ${core.esc(voltaLine)}</small>
                </div>
              </td>
              <td class="num pro-ctrl-col-days">
                <div class="pro-ctrl-days-cell">
                  <b>${f.diasFora}d</b>
                  <small class="muted">${core.num(f.diariasQty, 1)} diár.${f.freeLodging ? " · 🏠" : ""}</small>
                </div>
              </td>
              <td class="num pro-ctrl-col-fin">
                <button type="button" class="pro-ctrl-mode-box mode-diaria${isDiaria ? " is-selected" : (isComiss ? " is-neutral" : "")}" data-ctrl-set-mode="diaria" data-ctrl-card="${core.esc(r.card.id)}" data-ctrl-person="${core.esc(r.personName)}" aria-pressed="${isDiaria}" title="Clique para selecionar Diária">
                  <span class="pro-ctrl-box-top">
                    <span class="pro-ctrl-chk">${isDiaria ? "✓" : ""}</span>
                    <strong>${core.money(f.diariaTotal)}</strong>
                  </span>
                  <small>${f.rank ? `${core.num(f.diariasQty, 1)}× ${core.money(f.diariaBase)}` : "Sem posto"}</small>
                </button>
              </td>
              <td class="num pro-ctrl-col-fin">
                <button type="button" class="pro-ctrl-mode-box mode-grat${isGrat ? " is-selected" : (isComiss ? " is-neutral" : "")}" data-ctrl-set-mode="grat_rep" data-ctrl-card="${core.esc(r.card.id)}" data-ctrl-person="${core.esc(r.personName)}" aria-pressed="${isGrat}" title="Clique para selecionar Gratificação de Representação">
                  <span class="pro-ctrl-box-top">
                    <span class="pro-ctrl-chk">${isGrat ? "✓" : ""}</span>
                    <strong>${core.money(f.gratLiquida)}</strong>
                  </span>
                  <small>Bruto: ${core.money(f.gratBruta)}</small>
                </button>
              </td>
              <td class="pro-ctrl-col-comiss" style="text-align:center">
                <label class="pro-ctrl-comiss-lbl${isComiss ? " is-checked" : ""}" title="Marcar viagem como Comissionamento (R$ 0,00)">
                  <input type="checkbox" data-ctrl-comiss-chk="1" data-ctrl-card="${core.esc(r.card.id)}" data-ctrl-person="${core.esc(r.personName)}" ${isComiss ? "checked" : ""}>
                  <span>${isComiss ? "Sim" : "Não"}</span>
                </label>
              </td>
            </tr>`;
          }).join("") || `<tr><td colspan="9" class="muted" style="text-align:center;padding:20px">Nenhum lançamento de viagem para os filtros atuais.</td></tr>`}
        </tbody>
        ${rows.length ? `
        <tfoot>
          <tr class="pro-ctrl-tfoot-row">
            <td colspan="5"><strong>TOTAIS EFETIVAMENTE RECEBIDOS</strong> <span class="muted small">(apenas itens marcados em Diária ou Grat. Rep.)</span></td>
            <td class="num"><strong>${sumDiasFora}d</strong></td>
            <td class="num"><strong style="color:var(--ok)">${core.money(sumDiariasVal)}</strong><small class="muted" style="display:block">${countDiariaRows} Diária(s)</small></td>
            <td class="num"><strong style="color:#c084fc">${core.money(sumGratLiq)}</strong><small class="muted" style="display:block">Bruto: ${core.money(sumGratBruta)}</small></td>
            <td class="num">
              <div class="pro-ctrl-grand-total">
                <small>TOTAL GERAL</small>
                <strong>${core.money(sumTotalGeral)}</strong>
              </div>
            </td>
          </tr>
        </tfoot>` : ""}`;

      tblEl.querySelectorAll("[data-ctrl-sort]").forEach(btn => {
        btn.onclick = () => {
          const col = btn.dataset.ctrlSort;
          if (proControlTableSort.col === col) {
            proControlTableSort.dir = proControlTableSort.dir === "asc" ? "desc" : "asc";
          } else {
            proControlTableSort.col = col;
            proControlTableSort.dir = ["days", "diaria", "grat"].includes(col) ? "desc" : "asc";
          }
          renderProControl(cards);
        };
      });
      tblEl.querySelectorAll("tr[data-ctrl-open-card]").forEach(tr => {
        tr.onclick = (ev) => {
          if (ev.target.closest("button, label, input")) return;
          openProCardModal(tr.dataset.ctrlOpenCard);
        };
      });
      tblEl.querySelectorAll("[data-ctrl-set-mode]").forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          setCardPersonTravelMode(btn.dataset.ctrlCard, btn.dataset.ctrlPerson, btn.dataset.ctrlSetMode);
        };
      });
      tblEl.querySelectorAll("[data-ctrl-comiss-chk]").forEach(chk => {
        chk.onclick = (ev) => ev.stopPropagation();
        chk.onchange = () => {
          setCardPersonTravelMode(chk.dataset.ctrlCard, chk.dataset.ctrlPerson, chk.checked ? "comissionamento" : "diaria");
        };
      });
      tblEl.querySelectorAll("[data-ctrl-go-params]").forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          core?.switchProView?.("pro-params");
          setTimeout(() => $("#proTravelFinanceParamsCard")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
        };
      });
    }

    // 4.3B Cards Mobile do Controle Financeiro
    const mobEl = $("#proControlMobileCards");
    if (mobEl) {
      const cardsHtml = sortedRows.map(r => {
        const f = r.fin;
        const info = getProTypeInfo(r.card.type);
        const isDiaria = f.activeMode === "diaria";
        const isGrat = f.activeMode === "grat_rep";
        const isComiss = f.activeMode === "comissionamento";
        const dtStr = f.start ? `${core.fmtShortBR(f.start)}${f.end && f.end !== f.start ? ` – ${core.fmtShortBR(f.end)}` : ""}` : "Sem data";
        return `<div class="m-card pro-ctrl-mcard${isComiss ? " is-comiss" : ""}" data-ctrl-open-card="${core.esc(r.card.id)}">
          <div class="m-card-head">
            <div style="min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
                <span class="pro-assignee-badge" style="--asg-bg:${r.personColor.bg};--asg-fg:${r.personColor.fg};--asg-bd:${r.personColor.bd}">👤 ${core.esc(r.personName)}</span>
                <span class="pro-ctrl-tier-badge tier-${f.tierInfo.tier}">${core.esc(f.tierInfo.label)}</span>
                <span class="pro-map-dur-pill">${f.diasFora}d · ${core.num(f.diariasQty, 1)} diár.</span>
              </div>
              <b style="display:block;font-size:0.9rem;color:var(--text-strong)">${info.icon} ${core.esc(r.card.name)}</b>
              <div class="muted small">📍 ${core.esc(r.city)} · 📅 ${core.esc(dtStr)}${f.rank ? ` · ${core.esc(f.rank.name)}` : ""}</div>
            </div>
            <button type="button" class="icon-btn" data-ctrl-edit-btn="${core.esc(r.card.id)}" title="Editar cartão">✏️</button>
          </div>
          <div class="pro-ctrl-mob-modes">
            <button type="button" class="pro-ctrl-mode-box mode-diaria${isDiaria ? " is-selected" : (isComiss ? " is-neutral" : "")}" data-ctrl-set-mode="diaria" data-ctrl-card="${core.esc(r.card.id)}" data-ctrl-person="${core.esc(r.personName)}">
              <span class="pro-ctrl-box-top"><span class="pro-ctrl-chk">${isDiaria ? "✓" : ""}</span><span>Diária</span></span>
              <strong>${core.money(f.diariaTotal)}</strong>
            </button>
            <button type="button" class="pro-ctrl-mode-box mode-grat${isGrat ? " is-selected" : (isComiss ? " is-neutral" : "")}" data-ctrl-set-mode="grat_rep" data-ctrl-card="${core.esc(r.card.id)}" data-ctrl-person="${core.esc(r.personName)}">
              <span class="pro-ctrl-box-top"><span class="pro-ctrl-chk">${isGrat ? "✓" : ""}</span><span>Grat. Rep.</span></span>
              <strong>${core.money(f.gratLiquida)}</strong>
              <small>Bruto: ${core.money(f.gratBruta)}</small>
            </button>
          </div>
          <label class="pro-ctrl-comiss-mob${isComiss ? " is-checked" : ""}">
            <input type="checkbox" data-ctrl-comiss-chk="1" data-ctrl-card="${core.esc(r.card.id)}" data-ctrl-person="${core.esc(r.personName)}" ${isComiss ? "checked" : ""}>
            <span>Comissionamento (R$ 0,00 — não soma no total)</span>
          </label>
        </div>`;
      }).join("");

      const mobTotalFooter = rows.length ? `
        <div class="pro-ctrl-mob-total-card">
          <div class="pro-ctrl-mob-total-row"><span>Dias Fora</span><b>${sumDiasFora} dias</b></div>
          <div class="pro-ctrl-mob-total-row"><span>Diárias (${countDiariaRows})</span><b style="color:var(--ok)">${core.money(sumDiariasVal)}</b></div>
          <div class="pro-ctrl-mob-total-row"><span>Grat. Rep. Líq. (${countGratRows})</span><b style="color:#c084fc">${core.money(sumGratLiq)}</b></div>
          <div class="pro-ctrl-mob-total-row is-grand"><span>TOTAL GERAL RECEBIDO</span><strong>${core.money(sumTotalGeral)}</strong></div>
        </div>` : "";

      mobEl.innerHTML = (cardsHtml || `<p class="muted small" style="text-align:center;padding:14px">Nenhum lançamento para os filtros atuais.</p>`) + mobTotalFooter;

      mobEl.querySelectorAll("[data-ctrl-open-card]").forEach(el => {
        el.onclick = (ev) => {
          if (ev.target.closest("button, label, input")) return;
          openProCardModal(el.dataset.ctrlOpenCard);
        };
      });
      mobEl.querySelectorAll("[data-ctrl-edit-btn]").forEach(b => {
        b.onclick = (ev) => { ev.stopPropagation(); openProCardModal(b.dataset.ctrlEditBtn); };
      });
      mobEl.querySelectorAll("[data-ctrl-set-mode]").forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          setCardPersonTravelMode(btn.dataset.ctrlCard, btn.dataset.ctrlPerson, btn.dataset.ctrlSetMode);
        };
      });
      mobEl.querySelectorAll("[data-ctrl-comiss-chk]").forEach(chk => {
        chk.onclick = (ev) => ev.stopPropagation();
        chk.onchange = () => {
          setCardPersonTravelMode(chk.dataset.ctrlCard, chk.dataset.ctrlPerson, chk.checked ? "comissionamento" : "diaria");
        };
      });
    }

    // Agregações para os 4 Gráficos + 3 Tabelas Resumidas
    const byPerson = new Map();
    const byLoc = new Map();
    const byMonth = new Map();

    rows.forEach(r => {
      const f = r.fin;
      if (!byPerson.has(r.personKey)) {
        byPerson.set(r.personKey, {
          name: r.personName,
          key: r.personKey,
          color: r.personColor,
          rankName: f.rank ? f.rank.name : "Sem posto",
          trips: 0,
          days: 0,
          diaria: 0,
          gratLiq: 0,
          gratBruta: 0,
          total: 0
        });
      }
      const p = byPerson.get(r.personKey);
      p.trips++;
      p.days += f.diasFora;
      p.diaria += f.effectiveDiaria;
      p.gratLiq += f.effectiveGratLiquida;
      p.gratBruta += f.effectiveGratBruta;
      p.total += f.effectiveTotal;

      const locKey = r.city.toLowerCase();
      if (!byLoc.has(locKey)) {
        byLoc.set(locKey, {
          city: r.city,
          tierInfo: f.tierInfo,
          trips: 0,
          days: 0,
          diaria: 0,
          gratLiq: 0,
          total: 0
        });
      }
      const l = byLoc.get(locKey);
      l.trips++;
      l.days += f.diasFora;
      l.diaria += f.effectiveDiaria;
      l.gratLiq += f.effectiveGratLiquida;
      l.total += f.effectiveTotal;

      if (r.ym) {
        if (!byMonth.has(r.ym)) {
          byMonth.set(r.ym, { ym: r.ym, trips: 0, days: 0, diaria: 0, gratLiq: 0, total: 0 });
        }
        const m = byMonth.get(r.ym);
        m.trips++;
        m.days += f.diasFora;
        m.diaria += f.effectiveDiaria;
        m.gratLiq += f.effectiveGratLiquida;
        m.total += f.effectiveTotal;
      }
    });

    const personList = [...byPerson.values()].sort((a, b) => b.total - a.total || b.days - a.days || a.name.localeCompare(b.name));
    const locList = [...byLoc.values()].sort((a, b) => b.total - a.total || b.trips - a.trips || a.city.localeCompare(b.city));
    const monthList = [...byMonth.values()].sort((a, b) => a.ym.localeCompare(b.ym));
    const emptyChart = `<p class="muted small" style="padding:18px 0;text-align:center">Sem dados financeiros para exibir neste filtro.</p>`;

    // 4.4.1 Gráfico: Recebimentos por Pessoa (Barras Empilhadas Diária vs Grat. Rep.)
    const cRevPerson = $("#proControlChartRevByPerson");
    if (cRevPerson) {
      if (!personList.length) {
        cRevPerson.innerHTML = emptyChart;
      } else {
        const maxVal = Math.max(1, ...personList.map(p => p.total));
        cRevPerson.innerHTML = `
          <div class="fin-legend" style="margin-bottom:8px">
            <span><i style="background:#10b981"></i> Diária</span>
            <span><i style="background:#a855f7"></i> Grat. Rep. (Líq.)</span>
          </div>
          <div class="pro-map-hbars">${personList.map(p => {
            const totalW = p.total > 0 ? Math.max(8, Math.round((p.total / maxVal) * 100)) : 0;
            const dPct = p.total > 0 ? (p.diaria / p.total) * 100 : 0;
            const gPct = p.total > 0 ? (p.gratLiq / p.total) * 100 : 0;
            const tip = `${p.name} (${p.rankName}): Total ${core.money(p.total)} — Diárias: ${core.money(p.diaria)} · Grat. Rep. Líq.: ${core.money(p.gratLiq)}`;
            return `<button type="button" class="pro-map-hbar-row" data-ctrl-pick-person="${core.esc(p.name)}" data-tooltip="${core.esc(tip)}">
              <div class="pro-map-hbar-top">
                <span class="pro-map-hbar-lbl"><span class="pro-map-hbar-dot" style="background:${core.esc(p.color.hex)}"></span>${core.esc(p.name)}</span>
                <b class="pro-map-hbar-val">${core.money(p.total)}</b>
              </div>
              <div class="pro-map-hbar-track">
                <div class="pro-travels-stacked-fill" style="width:${totalW}%">
                  ${p.diaria > 0 ? `<span class="pro-travels-seg" style="width:${dPct.toFixed(2)}%;background:#10b981"></span>` : ""}
                  ${p.gratLiq > 0 ? `<span class="pro-travels-seg" style="width:${gPct.toFixed(2)}%;background:#a855f7"></span>` : ""}
                </div>
              </div>
            </button>`;
          }).join("")}</div>`;
        cRevPerson.querySelectorAll("[data-ctrl-pick-person]").forEach(b => {
          b.onclick = () => {
            const nm = b.dataset.ctrlPickPerson;
            proFilterAssignee = proFilterAssignee.toLowerCase() === nm.toLowerCase() ? "" : nm;
            applyAndRenderProFilteredViews();
          };
        });
      }
    }

    // 4.4.2 Gráfico: Recebimentos por Localidade (R$)
    const cRevLoc = $("#proControlChartRevByLoc");
    if (cRevLoc) {
      if (!locList.length) {
        cRevLoc.innerHTML = emptyChart;
      } else {
        const topLocs = locList.slice(0, 10);
        const maxLoc = Math.max(1, ...topLocs.map(l => l.total));
        cRevLoc.innerHTML = `<div class="pro-map-hbars">${topLocs.map(l => {
          const wPct = l.total > 0 ? Math.max(8, Math.round((l.total / maxLoc) * 100)) : 0;
          const tip = `${l.city} (${l.tierInfo.label}): ${core.money(l.total)} em ${l.trips} viagem(ns) · ${l.days} dias (Diárias: ${core.money(l.diaria)} | Grat. Rep.: ${core.money(l.gratLiq)})`;
          return `<div class="pro-map-hbar-row" data-tooltip="${core.esc(tip)}" tabindex="0">
            <div class="pro-map-hbar-top">
              <span class="pro-map-hbar-lbl">📍 ${core.esc(l.city)} <span class="pro-ctrl-tier-badge tier-${l.tierInfo.tier}">${core.esc(l.tierInfo.short)}</span></span>
              <b class="pro-map-hbar-val">${core.money(l.total)}</b>
            </div>
            <div class="pro-map-hbar-track">
              <div class="pro-map-hbar-fill" style="width:${wPct}%;background:linear-gradient(90deg,#0284c7,#22d3ee)"></div>
            </div>
          </div>`;
        }).join("")}</div>`;
      }
    }

    // 4.4.3 Gráfico: Evolução Mensal Financeira (R$)
    const cMonRev = $("#proControlChartMonthlyRev");
    if (cMonRev) {
      if (!monthList.length) {
        cMonRev.innerHTML = emptyChart;
      } else {
        const maxM = Math.max(1, ...monthList.map(m => m.total));
        cMonRev.innerHTML = `
          <div class="fin-legend" style="margin-bottom:6px">
            <span><i style="background:#10b981"></i> Diária</span>
            <span><i style="background:#a855f7"></i> Grat. Rep. (Líq.)</span>
          </div>
          <div class="pro-vbars-chart pro-travels-monthly-chart">${monthList.map(m => {
            const [yr, mo] = m.ym.split("-");
            const lbl = `${core.MON[parseInt(mo, 10) - 1]}/${yr.slice(2)}`;
            const hTotal = m.total > 0 ? Math.max(12, Math.round((m.total / maxM) * 100)) : 4;
            const dPct = m.total > 0 ? (m.diaria / m.total) * 100 : 0;
            const gPct = m.total > 0 ? (m.gratLiq / m.total) * 100 : 0;
            const tip = `${lbl}: Total ${core.money(m.total)} (${m.trips} viagens · ${m.days}d) — Diárias: ${core.money(m.diaria)} · Grat. Rep.: ${core.money(m.gratLiq)}`;
            return `<div class="pro-vbar-col pro-travels-mcol" data-tooltip="${core.esc(tip)}" tabindex="0">
              <span class="pro-vbar-val">${m.total >= 1000 ? `${core.num(m.total / 1000, 1)}k` : core.num(m.total, 0)}</span>
              <div class="pro-travels-vcol-track">
                <div class="pro-travels-vcol-stack" style="height:${hTotal}%">
                  ${m.diaria > 0 ? `<div class="pro-travels-vseg" style="height:${dPct.toFixed(2)}%;background:#10b981"></div>` : ""}
                  ${m.gratLiq > 0 ? `<div class="pro-travels-vseg" style="height:${gPct.toFixed(2)}%;background:#a855f7"></div>` : ""}
                </div>
              </div>
              <span class="pro-vbar-lbl">${lbl}</span>
            </div>`;
          }).join("")}</div>`;
      }
    }

    // 4.4.4 Gráfico: Total de Dias Fora por Pessoa
    const cDaysP = $("#proControlChartDaysByPerson");
    if (cDaysP) {
      if (!personList.length) {
        cDaysP.innerHTML = emptyChart;
      } else {
        const sortedDays = personList.slice().sort((a, b) => b.days - a.days || a.name.localeCompare(b.name));
        const maxD = Math.max(1, ...sortedDays.map(p => p.days));
        cDaysP.innerHTML = `<div class="pro-map-hbars">${sortedDays.map(p => {
          const wPct = Math.max(8, Math.round((p.days / maxD) * 100));
          const tip = `${p.name}: ${p.days} dia(s) fora em ${p.trips} viagem(ns) · Recebido: ${core.money(p.total)}`;
          return `<button type="button" class="pro-map-hbar-row" data-ctrl-pick-person="${core.esc(p.name)}" data-tooltip="${core.esc(tip)}">
            <div class="pro-map-hbar-top">
              <span class="pro-map-hbar-lbl"><span class="pro-map-hbar-dot" style="background:${core.esc(p.color.hex)}"></span>${core.esc(p.name)}</span>
              <b class="pro-map-hbar-val">${p.days} ${p.days === 1 ? "dia" : "dias"} <span class="muted">(${p.trips}v)</span></b>
            </div>
            <div class="pro-map-hbar-track">
              <div class="pro-map-hbar-fill" style="width:${wPct}%;background:${core.esc(p.color.hex)}"></div>
            </div>
          </button>`;
        }).join("")}</div>`;
        cDaysP.querySelectorAll("[data-ctrl-pick-person]").forEach(b => {
          b.onclick = () => {
            const nm = b.dataset.ctrlPickPerson;
            proFilterAssignee = proFilterAssignee.toLowerCase() === nm.toLowerCase() ? "" : nm;
            applyAndRenderProFilteredViews();
          };
        });
      }
    }

    // 4.4.5 3 Tabelas Resumidas Financeiras
    const applySummaryVis = () => {
      if ($("#proControlSummaryPersonCard")) $("#proControlSummaryPersonCard").hidden = !(proControlSummaryTab === "all" || proControlSummaryTab === "person");
      if ($("#proControlSummaryLocCard")) $("#proControlSummaryLocCard").hidden = !(proControlSummaryTab === "all" || proControlSummaryTab === "location");
      if ($("#proControlSummaryPeriodCard")) $("#proControlSummaryPeriodCard").hidden = !(proControlSummaryTab === "all" || proControlSummaryTab === "period");
    };
    applySummaryVis();

    const spTbl = $("#proControlSummaryPersonTable");
    if (spTbl) {
      spTbl.innerHTML = `
        <thead><tr><th>Pessoa</th><th>Posto</th><th class="num">Viagens</th><th class="num">Dias Fora</th><th class="num">Total Diárias</th><th class="num">Grat. Rep. (Líq.)</th><th class="num">Total Geral</th></tr></thead>
        <tbody>
          ${personList.map(p => `<tr>
            <td><span class="pro-assignee-badge" style="--asg-bg:${p.color.bg};--asg-fg:${p.color.fg};--asg-bd:${p.color.bd}">👤 ${core.esc(p.name)}</span></td>
            <td class="muted small">${core.esc(p.rankName)}</td>
            <td class="num">${p.trips}</td>
            <td class="num">${p.days}d</td>
            <td class="num">${core.money(p.diaria)}</td>
            <td class="num">${core.money(p.gratLiq)}</td>
            <td class="num"><strong>${core.money(p.total)}</strong></td>
          </tr>`).join("") || `<tr><td colspan="7" class="muted" style="text-align:center;padding:14px">Sem dados.</td></tr>`}
        </tbody>`;
    }

    const slTbl = $("#proControlSummaryLocTable");
    if (slTbl) {
      slTbl.innerHTML = `
        <thead><tr><th>Localidade</th><th>Faixa</th><th class="num">Viagens</th><th class="num">Dias Fora</th><th class="num">Total Financeiro</th></tr></thead>
        <tbody>
          ${locList.map(l => `<tr>
            <td><strong>📍 ${core.esc(l.city)}</strong></td>
            <td><span class="pro-ctrl-tier-badge tier-${l.tierInfo.tier}">${core.esc(l.tierInfo.label)}</span></td>
            <td class="num">${l.trips}</td>
            <td class="num">${l.days}d</td>
            <td class="num"><strong>${core.money(l.total)}</strong></td>
          </tr>`).join("") || `<tr><td colspan="5" class="muted" style="text-align:center;padding:14px">Sem dados.</td></tr>`}
        </tbody>`;
    }

    const smTbl = $("#proControlSummaryPeriodTable");
    if (smTbl) {
      smTbl.innerHTML = `
        <thead><tr><th>Mês / Ano</th><th class="num">Viagens</th><th class="num">Dias Fora</th><th class="num">Total Diárias</th><th class="num">Grat. Rep. (Líq.)</th><th class="num">Total Geral</th></tr></thead>
        <tbody>
          ${monthList.map(m => {
            const [yr, mo] = m.ym.split("-");
            const lbl = `${core.MON[parseInt(mo, 10) - 1]}/${yr}`;
            return `<tr>
              <td><strong>${lbl}</strong></td>
              <td class="num">${m.trips}</td>
              <td class="num">${m.days}d</td>
              <td class="num">${core.money(m.diaria)}</td>
              <td class="num">${core.money(m.gratLiq)}</td>
              <td class="num"><strong>${core.money(m.total)}</strong></td>
            </tr>`;
          }).join("") || `<tr><td colspan="6" class="muted" style="text-align:center;padding:14px">Sem dados datados.</td></tr>`}
        </tbody>`;
    }

    // Cachear dados filtrados atuais para os 3 botões de Impressão/Exportação (Planilha Paisagem, Excel .xlsx, Relatório PDF Retrato)
    proControlLastReport = {
      title: st.title || "Projeto Profissional",
      sortedRows,
      personList,
      locList,
      monthList,
      totals: {
        uniqueTrips: uniqueCardIds.size,
        launches: rows.length,
        sumDiasFora,
        sumDiariasQty,
        sumDiariasVal,
        sumGratLiq,
        sumGratBruta,
        sumTotalGeral,
        countDiariaRows,
        countGratRows,
        countComissRows
      }
    };
  }

  function describeProControlActiveFilters() {
    const parts = [];
    if (proFilterAssignee) parts.push(`Pessoa: ${proFilterAssignee}`);
    if (proControlQuickYear) parts.push(`Ano: ${proControlQuickYear}`);
    if (proControlQuickMonth) {
      const [yr, mo] = proControlQuickMonth.split("-");
      parts.push(`Mês: ${core.MON[parseInt(mo, 10) - 1]}/${yr}`);
    }
    if (proControlQuickMode) {
      const mMap = { diaria: "Diária", grat_rep: "Grat. Representação", comissionamento: "Comissionamento" };
      parts.push(`Modalidade: ${mMap[proControlQuickMode] || proControlQuickMode}`);
    }
    if (proFilterLocation) parts.push(`Local: ${proFilterLocation}`);
    if (proDateFrom || proDateTo) parts.push(`Período: ${proDateFrom ? core.fmtBR(proDateFrom) : "..."} a ${proDateTo ? core.fmtBR(proDateTo) : "..."}`);
    if (proFilterSearch) parts.push(`Busca: "${proFilterSearch}"`);
    return parts.length ? parts.join(" · ") : "Todos os registros do escopo selecionado";
  }

  function buildControlPrintableTableHTML(rep) {
    const t = rep.totals;
    const rowsHtml = rep.sortedRows.map(r => {
      const f = r.fin;
      const info = getProTypeInfo(r.card.type);
      const isD = f.activeMode === "diaria";
      const isG = f.activeMode === "grat_rep";
      const isC = f.activeMode === "comissionamento";
      const evS = f.eventStart ? core.fmtBR(f.eventStart) : "—";
      const evE = f.eventEnd ? core.fmtBR(f.eventEnd) : "—";
      const idaS = formatDateTimeShortBR(f.idaDt, f.start);
      const volS = formatDateTimeShortBR(f.voltaDt, f.end);
      return `<tr class="${isC ? "is-comiss" : ""}">
        <td><strong>${core.esc(r.personName)}</strong><br><small class="muted">${f.rank ? `${core.esc(f.rankAbbrev)} · Círc. ${core.esc(f.rank.circle)}` : "Sem posto"}</small></td>
        <td><span class="tag">${core.esc(info.short)}</span><br><strong>${core.esc(r.card.name)}</strong></td>
        <td>${core.esc(r.city)}<br><span class="tier t${f.tierInfo.tier}">${core.esc(f.tierInfo.label)}</span></td>
        <td class="nowrap">${core.esc(evS)}<br><small class="muted">${core.esc(evE)}</small></td>
        <td class="nowrap">🛫 ${core.esc(idaS)}<br><small>🛬 ${core.esc(volS)}</small></td>
        <td class="num"><strong>${f.diasFora}d</strong><br><small class="muted">${core.num(f.diariasQty, 1)} diár.${f.freeLodging ? " · 50%" : ""}</small></td>
        <td class="num"><div class="mbox ${isD ? "m-diaria" : (isC ? "m-neut" : "")}"><b>${isD ? "✓ " : ""}${core.money(f.diariaTotal)}</b><small>${f.rank ? `${core.num(f.diariasQty, 1)}× ${core.money(f.diariaBase)}` : "—"}</small></div></td>
        <td class="num"><div class="mbox ${isG ? "m-grat" : (isC ? "m-neut" : "")}"><b>${isG ? "✓ " : ""}${core.money(f.gratLiquida)}</b><small>Bruto: ${core.money(f.gratBruta)}</small></div></td>
        <td class="ctr">${isC ? '<span class="com-yes">✓ Sim</span>' : '<span class="muted">Não</span>'}</td>
      </tr>`;
    }).join("");

    return `<table class="ctrl-tbl">
      <thead>
        <tr>
          <th>Pessoa / Posto</th>
          <th>Viagem / Evento</th>
          <th>Localidade</th>
          <th>Data Evento</th>
          <th>Ida e Volta</th>
          <th class="num">Dias</th>
          <th class="num">Diária (R$)</th>
          <th class="num">Grat. Rep. (R$)</th>
          <th class="ctr">Comiss.</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="tfoot-row">
          <td colspan="5"><strong>TOTAIS EFETIVAMENTE RECEBIDOS</strong> <small class="muted">(apenas marcados em Diária ou Grat. Rep.)</small></td>
          <td class="num"><strong>${t.sumDiasFora}d</strong></td>
          <td class="num"><strong class="c-ok">${core.money(t.sumDiariasVal)}</strong><br><small>${t.countDiariaRows} Diária(s)</small></td>
          <td class="num"><strong class="c-purp">${core.money(t.sumGratLiq)}</strong><br><small>Bruto: ${core.money(t.sumGratBruta)}</small></td>
          <td class="num"><div class="gtot"><small>TOTAL GERAL</small><strong>${core.money(t.sumTotalGeral)}</strong></div></td>
        </tr>
      </tbody>
    </table>`;
  }

  function printProControlSheetLandscape() {
    if (!proControlLastReport) renderProControl();
    const rep = proControlLastReport;
    if (!rep || !rep.sortedRows.length) return core.toast("📋 Não há viagens neste filtro para imprimir a planilha.");
    const filtersTxt = describeProControlActiveFilters();
    const genAt = new Date().toLocaleString("pt-BR");

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Planilha de Controle Financeiro — ${core.esc(rep.title)}</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: system-ui,-apple-system,Segoe UI,Roboto,sans-serif; color: #0f172a; margin: 0; font-size: 11px; line-height: 1.35; }
        .hdr { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin-bottom: 10px; }
        .hdr h1 { margin: 0; font-size: 16px; }
        .hdr .meta { color: #475569; font-size: 10.5px; }
        .ctrl-tbl { width: 100%; border-collapse: collapse; }
        .ctrl-tbl thead { display: table-header-group; }
        .ctrl-tbl tfoot { display: table-row-group !important; }
        .ctrl-tbl tr { break-inside: avoid; page-break-inside: avoid; }
        .ctrl-tbl th, .ctrl-tbl td { border: 1px solid #cbd5e1; padding: 5px 6px; vertical-align: middle; text-align: left; }
        .ctrl-tbl th { background: #f1f5f9; font-weight: 700; font-size: 10.5px; color: #334155; }
        .ctrl-tbl .num { text-align: right; }
        .ctrl-tbl .ctr { text-align: center; }
        .nowrap { white-space: nowrap; }
        .muted { color: #64748b; }
        .tag { display: inline-block; padding: 1px 6px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 9.5px; font-weight: 700; margin-bottom: 2px; }
        .tier { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 9px; font-weight: 700; margin-top: 2px; }
        .tier.t1 { background: #cffafe; color: #0e7490; }
        .tier.t2 { background: #ede9fe; color: #6d28d9; }
        .tier.t3 { background: #f1f5f9; color: #475569; }
        .mbox { display: inline-flex; flex-direction: column; align-items: flex-end; padding: 4px 7px; border-radius: 7px; border: 1px solid #cbd5e1; background: #f8fafc; min-width: 96px; }
        .mbox small { font-size: 9px; color: #64748b; }
        .mbox.m-diaria { background: #d1fae5; border: 2px solid #059669; color: #065f46; }
        .mbox.m-grat { background: #f3e8ff; border: 2px solid #9333ea; color: #581c87; }
        .mbox.m-neut { opacity: 0.45; border-style: dashed; }
        .com-yes { display: inline-block; padding: 2px 6px; border-radius: 6px; background: #fef3c7; color: #b45309; font-weight: 700; font-size: 10px; }
        .tfoot-row td { background: #f1f5f9; border-top: 2px solid #64748b; padding: 7px 6px; }
        .c-ok { color: #047857; }
        .c-purp { color: #7e22ce; }
        .gtot { display: inline-flex; flex-direction: column; align-items: flex-end; background: #e0f2fe; border: 1.5px solid #0284c7; border-radius: 7px; padding: 3px 8px; }
        .gtot small { font-size: 8.5px; color: #0369a1; font-weight: 800; }
        .gtot strong { font-size: 12.5px; color: #0f172a; }
      </style></head><body>
      <div class="hdr">
        <div>
          <h1>📋 Planilha de Controle de Viagens e Financeiro — ${core.esc(rep.title)}</h1>
          <div class="meta">Filtros: ${core.esc(filtersTxt)}</div>
        </div>
        <div class="meta">Gerado em ${core.esc(genAt)}</div>
      </div>
      ${buildControlPrintableTableHTML(rep)}
      <script>window.onload=function(){window.print();};</script>
      </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return core.toast("⚠️ Permita pop-ups para imprimir a planilha.");
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function exportProControlXlsx() {
    if (!window.XLSX) return core.toast("Biblioteca Excel não carregou (verifique sua conexão).");
    if (!proControlLastReport) renderProControl();
    const rep = proControlLastReport;
    if (!rep || !rep.sortedRows.length) return core.toast("📊 Não há viagens neste filtro para exportar.");

    const modeLabels = { diaria: "Diária", grat_rep: "Gratificação de Representação", comissionamento: "Comissionamento" };
    const cleanRows = rep.sortedRows.map(r => {
      const f = r.fin;
      const info = getProTypeInfo(r.card.type);
      const td = r.card.travelDetails || {};
      const obsParts = [];
      if (td.notes) obsParts.push(td.notes);
      if (td.hasCost && Number(td.costAmount) > 0) obsParts.push(`Custo passagem: ${core.money(td.costAmount)}`);
      if (f.freeLodging) obsParts.push("Pousada/alojamento gratuito (50% diária)");
      return {
        "Pessoa": r.personName,
        "Posto": f.rank ? f.rank.name : "",
        "Evento": r.card.name || "",
        "Etiqueta": info.short || r.card.type || "",
        "Localidade": r.rawLocation || r.city || "",
        "Faixa": f.tierInfo.label,
        "Início Evento": f.eventStart ? core.fmtBR(f.eventStart) : "",
        "Fim Evento": f.eventEnd ? core.fmtBR(f.eventEnd) : "",
        "Ida (Data/Hora)": formatDateTimeFullBR(f.idaDt, f.start),
        "Volta (Data/Hora)": formatDateTimeFullBR(f.voltaDt, f.end),
        "Dias Fora": f.diasFora,
        "Modalidade Selecionada": modeLabels[f.activeMode] || "Diária",
        "Valor Diária": Number(f.diariaTotal.toFixed(2)),
        "Valor Grat. Rep. Bruta": Number(f.gratBruta.toFixed(2)),
        "Valor Grat. Rep. Líquida": Number(f.gratLiquida.toFixed(2)),
        "Valor Efetivo a Receber": Number(f.effectiveTotal.toFixed(2)),
        "Transporte": td.transport || "",
        "Observações": obsParts.join(" | ")
      };
    });

    const wb = XLSX.utils.book_new();
    const san = core.sanitizeSheetRows || (x => x);
    const ws = XLSX.utils.json_to_sheet(san(cleanRows));
    XLSX.utils.book_append_sheet(wb, ws, "Controle Viagens");
    const safeTitle = (rep.title || "Controle_Viagens").replace(/[^\w\-]+/g, "_");
    XLSX.writeFile(wb, `Controle_Viagens_${safeTitle}.xlsx`);
    core.toast(`📊 Excel exportado (${cleanRows.length} registros)!`);
  }

  function printProControlFullReportPortrait() {
    if (!proControlLastReport) renderProControl();
    const rep = proControlLastReport;
    if (!rep || !rep.sortedRows.length) return core.toast("📄 Não há viagens neste filtro para gerar o relatório.");
    const t = rep.totals;
    const filtersTxt = describeProControlActiveFilters();
    const genAt = new Date().toLocaleString("pt-BR");

    const maxPRev = Math.max(1, ...rep.personList.map(p => p.total));
    const maxLRev = Math.max(1, ...rep.locList.map(l => l.total));
    const maxPDays = Math.max(1, ...rep.personList.map(p => p.days));
    const maxMRev = Math.max(1, ...rep.monthList.map(m => m.total));

    const chartRevPersonHtml = rep.personList.map(p => {
      const w = p.total > 0 ? Math.max(4, Math.round((p.total / maxPRev) * 100)) : 0;
      const dW = p.total > 0 ? (p.diaria / p.total) * 100 : 0;
      const gW = p.total > 0 ? (p.gratLiq / p.total) * 100 : 0;
      return `<div class="bar-row"><div class="bar-top"><span>${core.esc(p.name)}</span><b>${core.money(p.total)}</b></div>
        <div class="bar-trk"><div class="bar-stk" style="width:${w}%"><span style="width:${dW.toFixed(1)}%;background:#10b981"></span><span style="width:${gW.toFixed(1)}%;background:#a855f7"></span></div></div></div>`;
    }).join("");

    const chartRevLocHtml = rep.locList.slice(0, 8).map(l => {
      const w = l.total > 0 ? Math.max(4, Math.round((l.total / maxLRev) * 100)) : 0;
      return `<div class="bar-row"><div class="bar-top"><span>${core.esc(l.city)} (${core.esc(l.tierInfo.short)})</span><b>${core.money(l.total)}</b></div>
        <div class="bar-trk"><div class="bar-fill" style="width:${w}%;background:#0284c7"></div></div></div>`;
    }).join("");

    const chartMonthHtml = rep.monthList.map(m => {
      const [yr, mo] = m.ym.split("-");
      const lbl = `${core.MON[parseInt(mo, 10) - 1]}/${yr.slice(2)}`;
      const w = m.total > 0 ? Math.max(4, Math.round((m.total / maxMRev) * 100)) : 0;
      return `<div class="bar-row"><div class="bar-top"><span>${lbl} (${m.trips}v · ${m.days}d)</span><b>${core.money(m.total)}</b></div>
        <div class="bar-trk"><div class="bar-fill" style="width:${w}%;background:#6366f1"></div></div></div>`;
    }).join("");

    const chartDaysHtml = rep.personList.slice().sort((a, b) => b.days - a.days).map(p => {
      const w = Math.max(4, Math.round((p.days / maxPDays) * 100));
      return `<div class="bar-row"><div class="bar-top"><span>${core.esc(p.name)}</span><b>${p.days}d (${p.trips}v)</b></div>
        <div class="bar-trk"><div class="bar-fill" style="width:${w}%;background:${core.esc(p.color.hex)}"></div></div></div>`;
    }).join("");

    const sumPersonTbl = `<table class="sum-tbl"><thead><tr><th>Pessoa</th><th>Posto</th><th class="num">Viagens</th><th class="num">Dias</th><th class="num">Diárias</th><th class="num">Grat. Rep. Líq.</th><th class="num">Total Geral</th></tr></thead><tbody>${rep.personList.map(p => `<tr><td><strong>${core.esc(p.name)}</strong></td><td>${core.esc(p.rankName)}</td><td class="num">${p.trips}</td><td class="num">${p.days}d</td><td class="num">${core.money(p.diaria)}</td><td class="num">${core.money(p.gratLiq)}</td><td class="num"><strong>${core.money(p.total)}</strong></td></tr>`).join("")}</tbody></table>`;

    const sumLocTbl = `<table class="sum-tbl"><thead><tr><th>Localidade</th><th>Faixa</th><th class="num">Viagens</th><th class="num">Dias</th><th class="num">Total Financeiro</th></tr></thead><tbody>${rep.locList.map(l => `<tr><td><strong>${core.esc(l.city)}</strong></td><td>${core.esc(l.tierInfo.label)}</td><td class="num">${l.trips}</td><td class="num">${l.days}d</td><td class="num"><strong>${core.money(l.total)}</strong></td></tr>`).join("")}</tbody></table>`;

    const sumMonthTbl = `<table class="sum-tbl"><thead><tr><th>Mês / Ano</th><th class="num">Viagens</th><th class="num">Dias</th><th class="num">Diárias</th><th class="num">Grat. Rep. Líq.</th><th class="num">Total Geral</th></tr></thead><tbody>${rep.monthList.map(m => {
      const [yr, mo] = m.ym.split("-");
      return `<tr><td><strong>${core.MON[parseInt(mo, 10) - 1]}/${yr}</strong></td><td class="num">${m.trips}</td><td class="num">${m.days}d</td><td class="num">${core.money(m.diaria)}</td><td class="num">${core.money(m.gratLiq)}</td><td class="num"><strong>${core.money(m.total)}</strong></td></tr>`;
    }).join("")}</tbody></table>`;

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Relatório Completo de Controle Financeiro — ${core.esc(rep.title)}</title>
      <style>
        @page { size: portrait; margin: 12mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: system-ui,-apple-system,Segoe UI,Roboto,sans-serif; color: #0f172a; margin: 0; font-size: 10.5px; line-height: 1.38; }
        .hdr { border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px; }
        .hdr h1 { margin: 0 0 3px; font-size: 17px; }
        .meta { color: #475569; font-size: 10px; }
        .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px; break-inside: avoid; }
        .kpi { border: 1px solid #cbd5e1; border-top: 3px solid var(--c,#0284c7); border-radius: 8px; padding: 7px 9px; background: #f8fafc; }
        .kpi small { display: block; font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: #64748b; }
        .kpi strong { font-size: 13px; color: #0f172a; display: block; margin-top: 2px; }
        .kpi span { font-size: 8.5px; color: #475569; }
        .sec { margin-bottom: 14px; break-inside: avoid; }
        .sec-open { margin-bottom: 14px; }
        h2 { font-size: 12.5px; margin: 0 0 6px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
        .ctrl-tbl, .sum-tbl { width: 100%; border-collapse: collapse; font-size: 9.5px; }
        .ctrl-tbl thead, .sum-tbl thead { display: table-header-group; }
        .ctrl-tbl tfoot, .sum-tbl tfoot { display: table-row-group !important; }
        .ctrl-tbl tr, .sum-tbl tr { break-inside: avoid; page-break-inside: avoid; }
        .ctrl-tbl th, .ctrl-tbl td, .sum-tbl th, .sum-tbl td { border: 1px solid #cbd5e1; padding: 4px 5px; vertical-align: middle; text-align: left; }
        .ctrl-tbl th, .sum-tbl th { background: #f1f5f9; font-weight: 700; color: #334155; }
        .num { text-align: right !important; }
        .ctr { text-align: center !important; }
        .nowrap { white-space: nowrap; }
        .muted { color: #64748b; }
        .tag { display: inline-block; padding: 1px 5px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 8.5px; font-weight: 700; }
        .tier { display: inline-block; padding: 1px 5px; border-radius: 999px; font-size: 8px; font-weight: 700; }
        .tier.t1 { background: #cffafe; color: #0e7490; }
        .tier.t2 { background: #ede9fe; color: #6d28d9; }
        .tier.t3 { background: #f1f5f9; color: #475569; }
        .mbox { display: inline-flex; flex-direction: column; align-items: flex-end; padding: 3px 5px; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc; min-width: 78px; }
        .mbox small { font-size: 8px; color: #64748b; }
        .mbox.m-diaria { background: #d1fae5; border: 1.5px solid #059669; color: #065f46; }
        .mbox.m-grat { background: #f3e8ff; border: 1.5px solid #9333ea; color: #581c87; }
        .mbox.m-neut { opacity: 0.45; border-style: dashed; }
        .com-yes { background: #fef3c7; color: #b45309; padding: 1px 5px; border-radius: 5px; font-weight: 700; font-size: 8.5px; }
        .tfoot-row td { background: #f1f5f9; border-top: 2px solid #64748b; }
        .c-ok { color: #047857; }
        .c-purp { color: #7e22ce; }
        .gtot { background: #e0f2fe; border: 1px solid #0284c7; border-radius: 6px; padding: 2px 6px; text-align: right; }
        .gtot small { display: block; font-size: 7.5px; color: #0369a1; font-weight: 800; }
        .charts-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        .ch-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; background: #fff; break-inside: avoid; }
        .ch-card h3 { margin: 0 0 6px; font-size: 11px; color: #0f172a; }
        .bar-row { margin-bottom: 5px; }
        .bar-top { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px; }
        .bar-trk { height: 7px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 999px; }
        .bar-stk { height: 100%; display: flex; border-radius: 999px; overflow: hidden; }
        .bar-stk span { display: block; height: 100%; }
      </style></head><body>
      <div class="hdr">
        <h1>📄 Relatório Completo de Controle de Viagens &amp; Financeiro — ${core.esc(rep.title)}</h1>
        <div class="meta">Filtros aplicados: ${core.esc(filtersTxt)} · Gerado em ${core.esc(genAt)}</div>
      </div>
      <div class="kpis">
        <div class="kpi" style="--c:#38bdf8"><small>Total Viagens</small><strong>${t.uniqueTrips}</strong><span>${t.launches} lançamentos</span></div>
        <div class="kpi" style="--c:#f59e0b"><small>Dias Fora</small><strong>${t.sumDiasFora}d</strong><span>${core.num(t.sumDiariasQty, 1)} diárias</span></div>
        <div class="kpi" style="--c:#10b981"><small>Total Diárias</small><strong>${core.money(t.sumDiariasVal)}</strong><span>${t.countDiariaRows} lanç.</span></div>
        <div class="kpi" style="--c:#a855f7"><small>Grat. Rep. Líq.</small><strong>${core.money(t.sumGratLiq)}</strong><span>Bruto: ${core.money(t.sumGratBruta)}</span></div>
        <div class="kpi" style="--c:#0284c7"><small>Total Geral</small><strong>${core.money(t.sumTotalGeral)}</strong><span>Diárias + Grat. Líq.</span></div>
      </div>
      <div class="sec-open">
        <h2>📋 Planilha de Controle de Viagens e Financeiro</h2>
        ${buildControlPrintableTableHTML(rep)}
      </div>
      <div class="charts-2">
        <div class="ch-card"><h3>💰 Recebimentos por Pessoa (Diária vs Grat. Rep.)</h3>${chartRevPersonHtml || '<span class="muted">Sem dados</span>'}</div>
        <div class="ch-card"><h3>📍 Recebimentos por Localidade</h3>${chartRevLocHtml || '<span class="muted">Sem dados</span>'}</div>
        <div class="ch-card"><h3>📈 Evolução Mensal Financeira</h3>${chartMonthHtml || '<span class="muted">Sem dados</span>'}</div>
        <div class="ch-card"><h3>🗓️ Total de Dias Fora por Pessoa</h3>${chartDaysHtml || '<span class="muted">Sem dados</span>'}</div>
      </div>
      <div class="sec"><h2>👤 Resumo Financeiro por Pessoa</h2>${sumPersonTbl}</div>
      <div class="sec"><h2>📍 Resumo Financeiro por Localidade</h2>${sumLocTbl}</div>
      <div class="sec"><h2>📅 Resumo Financeiro por Período (Mês/Ano)</h2>${sumMonthTbl}</div>
      <script>window.onload=function(){window.print();};</script>
      </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return core.toast("⚠️ Permita pop-ups para imprimir o relatório completo.");
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  /* ---------- 2E. CENTRAL DE DOCUMENTOS (ANEXOS GERAIS + BILHETES DE VIAGEM) ---------- */
  function collectAllProDocuments(allCardsOpt = null) {
    const cards = allCardsOpt || getProSortedActivities();
    const cols = getMergedColumns();
    const colMap = new Map(cols.map(c => [c.id, c.title]));
    const labelsMap = new Map(getMergedLabels().map(l => [l.id, l]));
    const out = [];

    cards.forEach(c => {
      const asgList = getCardAssigneesList(c);
      const asgNames = asgList.map(e => e.name);
      const hasTravel = asgList.some(e => e.travels);
      const travelModes = new Set();
      asgList.forEach(e => {
        if (e.travels) {
          travelModes.add(sanitizeTravelMode(e.travelMode) || sanitizeTravelMode(c.travelFinanceMode) || "diaria");
        }
      });
      if (!travelModes.size && c.travelFinanceMode) travelModes.add(sanitizeTravelMode(c.travelFinanceMode));

      const rawLoc = String(c.location || "").trim();
      const city = rawLoc ? shortLocationCityName(rawLoc) : "";
      const colTitle = colMap.get(c.columnId) || c.columnTitle || "Sem lista";
      const td = (c.travelDetails && typeof c.travelDetails === "object") ? c.travelDetails : {};
      const cardLabels = (Array.isArray(c.labels) ? c.labels : []).map(id => labelsMap.get(id)).filter(Boolean);
      const cardTags = Array.isArray(c.tags) ? c.tags : [];
      const cardTravelHasCost = Boolean(td.hasCost && Number(td.costAmount) > 0) || (c.finDirection === "expense" && (Number(c.actualAmount) > 0 || Number(c.amount) > 0));
      const locators = (Array.isArray(td.segments) ? td.segments : []).map(s => s.locator).filter(Boolean).join(" ");

      const pushDoc = (raw, origin) => {
        if (!raw || typeof raw !== "object") return;
        const fileName = String(raw.fileName || raw.name || "Documento").trim();
        const isLink = Boolean(raw.isLink);
        const mimeType = String(raw.mimeType || "");
        const fileCategory = detectFileCategory(fileName, mimeType, isLink);
        const uploadedAt = String(raw.uploadedAt || raw.createdAt || "").trim();
        const uploadIso = /^\d{4}-\d{2}-\d{2}/.test(uploadedAt) ? uploadedAt.slice(0, 10) : (c.start || "");
        const eventIso = String(c._origStart || c.start || "").trim();
        const legType = origin === "travel" ? (raw.legType || "ida") : "";
        const legMeta = legType ? (LEG_TYPE_META[legType] || LEG_TYPE_META.ida) : null;
        out.push({
          docKey: `${origin}:${c.id}:${raw._minuteId ? raw._minuteId + ":" : ""}${raw.id || fileName}`,
          id: String(raw.id || ""),
          minuteId: String(raw._minuteId || ""),
          origin,
          originLabel: origin === "travel" ? `✈️ Viagem${legMeta ? ` · ${legMeta.label}` : ""}` : "📎 Geral",
          originShort: origin === "travel" ? "✈️ Viagem" : "📎 Geral",
          legType,
          label: String(raw.label || ""),
          fileName,
          url: resolveDocHref(raw),
          rawUrl: String(raw.url || ""),
          isLink,
          mimeType,
          fileCategory,
          size: Math.max(0, Number(raw.size) || 0),
          uploadedAt,
          uploadIso,
          eventIso,
          eventEndIso: String(c._origEnd || c.end || eventIso),
          card: c,
          cardId: c.id,
          cardName: String(c.name || "Sem título"),
          cardType: String(c.type || "Outro"),
          columnId: String(c.columnId || ""),
          columnTitle: colTitle,
          priority: String(c.priority || "Média"),
          client: String(c.client || "").trim(),
          assignees: asgNames,
          hasTravel,
          location: rawLoc,
          city,
          labels: cardLabels,
          labelIds: Array.isArray(c.labels) ? c.labels : [],
          tags: cardTags,
          travelModes,
          hasCost: cardTravelHasCost,
          searchHay: [
            fileName,
            raw.label || "",
            c.name || "",
            c.notes || "",
            td.notes || "",
            locators,
            c.client || "",
            rawLoc,
            asgNames.join(" "),
            cardTags.join(" ")
          ].join(" ").toLowerCase()
        });
      };

      const seenTravelIds = new Set();
      const tickets = Array.isArray(td.tickets) ? td.tickets : (td.ticketFile ? [td.ticketFile] : []);
      tickets.forEach(tk => {
        if (tk?.id) seenTravelIds.add(tk.id);
        pushDoc(tk, "travel");
      });
      (Array.isArray(c.attachments) ? c.attachments : []).forEach(att => {
        // Evita duplicidade visual se um anexo legado também estava em ticketFile
        if (att?.id && seenTravelIds.has(att.id)) return;
        pushDoc(att, "general");
      });
      (Array.isArray(c.minutes) ? c.minutes : []).forEach(min => {
        if (!min || typeof min !== "object") return;
        const mDate = String(min.meetingDate || "").slice(0, 10) || String(c._origStart || c.start || "");
        const mUpd = String(min.updatedAt || min.createdAt || "");
        const mUpdIso = /^\d{4}-\d{2}-\d{2}/.test(mUpd) ? mUpd.slice(0, 10) : mDate;
        const plainSnip = String(min.html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
        out.push({
          docKey: `minutes:${c.id}:${min.id}`,
          id: min.id,
          minuteId: min.id,
          minuteObj: min,
          origin: "minutes",
          originLabel: "📝 Ata de Reunião",
          originShort: "📝 Ata",
          legType: "",
          label: Array.isArray(min.participants) && min.participants.length ? `👥 ${min.participants.slice(0, 2).join(", ")}` : "Ata de Reunião",
          fileName: min.title || `Ata - ${c.name || "Reunião"}`,
          url: "",
          rawUrl: "",
          isLink: false,
          mimeType: "text/html",
          fileCategory: "document",
          size: 0,
          uploadedAt: mUpd,
          uploadIso: mUpdIso,
          eventIso: mDate,
          eventEndIso: mDate,
          card: c,
          cardId: c.id,
          cardName: String(c.name || "Sem título"),
          cardType: String(c.type || "Outro"),
          columnId: String(c.columnId || ""),
          columnTitle: colTitle,
          priority: String(c.priority || "Média"),
          client: String(c.client || "").trim(),
          assignees: asgNames,
          hasTravel,
          location: rawLoc,
          city,
          labels: cardLabels,
          labelIds: Array.isArray(c.labels) ? c.labels : [],
          tags: cardTags,
          travelModes,
          hasCost: cardTravelHasCost,
          searchHay: [
            min.title || "", plainSnip, (min.participants || []).join(" "),
            c.name || "", c.client || "", rawLoc, asgNames.join(" "), cardTags.join(" ")
          ].join(" ").toLowerCase()
        });
        (Array.isArray(min.attachments) ? min.attachments : []).forEach(matt => {
          pushDoc({ ...matt, _minuteId: min.id, label: `Anexo da Ata: ${min.title || "Ata"}` }, "general");
        });
      });
    });

    return out;
  }

  function populateSelectPreserve(sel, defaultLabel, optionsArr) {
    if (!sel) return;
    const prev = sel.value || "";
    sel.innerHTML = `<option value="">${defaultLabel}</option>`
      + optionsArr.map(([val, lbl]) => `<option value="${core.esc(val)}">${core.esc(lbl)}</option>`).join("");
    if (prev && optionsArr.some(([v]) => v === prev)) sel.value = prev;
    else sel.value = "";
  }

  function refreshProDocsFilterOptions(allDocs) {
    const eventsMap = new Map();
    const yearsSet = new Set();
    const monthsSet = new Set();
    const colsMap = new Map();
    const typesSet = new Set();
    const asgSet = new Set();
    const clientsSet = new Set();
    const locsSet = new Set();
    const labelsMap = new Map();
    const tagsSet = new Set();
    const dateMode = $("#proDocsDateMode")?.value || "event";
    const pickedYear = $("#proDocsYearFilter")?.value || "";

    allDocs.forEach(d => {
      if (d.cardId) eventsMap.set(d.cardId, d.cardName);
      const refIso = dateMode === "upload" ? d.uploadIso : d.eventIso;
      if (refIso && refIso.length >= 7) {
        const y = refIso.slice(0, 4);
        yearsSet.add(y);
        if (!pickedYear || y === pickedYear) monthsSet.add(refIso.slice(0, 7));
      }
      if (d.columnId) colsMap.set(d.columnId, d.columnTitle);
      if (d.cardType) typesSet.add(d.cardType);
      d.assignees.forEach(a => asgSet.add(a));
      if (d.client) clientsSet.add(d.client);
      if (d.city || d.location) locsSet.add(d.city || d.location);
      d.labels.forEach(l => labelsMap.set(l.id, l.name));
      d.tags.forEach(t => tagsSet.add(t));
    });

    populateSelectPreserve($("#proDocsEventFilter"), "Todos os eventos", [...eventsMap.entries()].sort((a, b) => a[1].localeCompare(b[1])));
    populateSelectPreserve($("#proDocsYearFilter"), "Todos os anos", [...yearsSet].sort().map(y => [y, `🗓️ ${y}`]));
    populateSelectPreserve($("#proDocsMonthFilter"), "Todos os meses", [...monthsSet].sort().map(ym => {
      const [y, m] = ym.split("-");
      return [ym, `📅 ${core.MON[parseInt(m, 10) - 1]}/${y}`];
    }));
    populateSelectPreserve($("#proDocsColFilter"), "Todas as listas", [...colsMap.entries()]);
    populateSelectPreserve($("#proDocsCardTypeFilter"), "Todos os tipos", [...typesSet].sort().map(t => [t, getProTypeInfo(t).short]));
    populateSelectPreserve($("#proDocsAssigneeFilter"), "Todos os responsáveis", [...asgSet].sort().map(a => [a, a]));
    populateSelectPreserve($("#proDocsClientFilter"), "Todos os clientes", [...clientsSet].sort().map(c => [c, c]));
    populateSelectPreserve($("#proDocsLocationFilter"), "Todas as localidades", [...locsSet].sort().map(l => [l, l]));
    populateSelectPreserve($("#proDocsLabelFilter"), "Todas as etiquetas", [...labelsMap.entries()].sort((a, b) => a[1].localeCompare(b[1])));
    populateSelectPreserve($("#proDocsTagFilter"), "Todas as tags", [...tagsSet].sort().map(t => [t, `#${t}`]));
  }

  function getProDocsFilterCfg() {
    return {
      search: ($("#proDocsSearch")?.value || "").trim().toLowerCase(),
      origin: proDocsOrigin || $("#proDocsOriginFilter")?.value || "",
      fileType: $("#proDocsFileTypeFilter")?.value || "",
      eventId: $("#proDocsEventFilter")?.value || "",
      dateMode: $("#proDocsDateMode")?.value || "event",
      year: $("#proDocsYearFilter")?.value || "",
      month: $("#proDocsMonthFilter")?.value || "",
      dateFrom: $("#proDocsDateFrom")?.value || "",
      dateTo: $("#proDocsDateTo")?.value || "",
      colId: $("#proDocsColFilter")?.value || "",
      cardType: $("#proDocsCardTypeFilter")?.value || "",
      prio: $("#proDocsPrioFilter")?.value || "",
      assignee: $("#proDocsAssigneeFilter")?.value || "",
      client: $("#proDocsClientFilter")?.value || "",
      hasTravel: $("#proDocsHasTravelFilter")?.value || "",
      location: $("#proDocsLocationFilter")?.value || "",
      labelId: $("#proDocsLabelFilter")?.value || "",
      tag: $("#proDocsTagFilter")?.value || "",
      finMode: $("#proDocsFinModeFilter")?.value || ""
    };
  }

  function countActiveProDocsFilters(cfg) {
    return (cfg.search ? 1 : 0)
      + (cfg.origin ? 1 : 0)
      + (cfg.fileType ? 1 : 0)
      + (cfg.eventId ? 1 : 0)
      + (cfg.year ? 1 : 0)
      + (cfg.month ? 1 : 0)
      + ((cfg.dateFrom || cfg.dateTo) ? 1 : 0)
      + (cfg.colId ? 1 : 0)
      + (cfg.cardType ? 1 : 0)
      + (cfg.prio ? 1 : 0)
      + (cfg.assignee ? 1 : 0)
      + (cfg.client ? 1 : 0)
      + (cfg.hasTravel ? 1 : 0)
      + (cfg.location ? 1 : 0)
      + (cfg.labelId ? 1 : 0)
      + (cfg.tag ? 1 : 0)
      + (cfg.finMode ? 1 : 0);
  }

  function resetProDocsFilters() {
    proDocsOrigin = "";
    [
      "#proDocsSearch", "#proDocsOriginFilter", "#proDocsFileTypeFilter", "#proDocsEventFilter",
      "#proDocsYearFilter", "#proDocsMonthFilter", "#proDocsDateFrom", "#proDocsDateTo",
      "#proDocsColFilter", "#proDocsCardTypeFilter", "#proDocsPrioFilter", "#proDocsAssigneeFilter",
      "#proDocsClientFilter", "#proDocsHasTravelFilter", "#proDocsLocationFilter",
      "#proDocsLabelFilter", "#proDocsTagFilter", "#proDocsFinModeFilter"
    ].forEach(s => { if ($(s)) $(s).value = ""; });
    if ($("#proDocsDateMode")) $("#proDocsDateMode").value = "event";
    $("#proDocsOriginSeg")?.querySelectorAll("button").forEach(b => b.classList.toggle("active", (b.dataset.docOrigin || "") === ""));
    renderProDocs();
  }

  function openProDocPreviewModal(doc) {
    const dlg = $("#proDocPreviewModal");
    if (!dlg || !doc) return;
    proDocsPreviewCurrent = doc;
    const cat = doc.fileCategory || detectFileCategory(doc.fileName, doc.mimeType, doc.isLink);
    const href = doc.url || resolveDocHref(doc);
    if ($("#proDocPreviewTitle")) $("#proDocPreviewTitle").textContent = `${fileCategoryIcon(cat)} ${doc.fileName || "Documento"}`;
    const metaBits = [
      doc.originLabel || "",
      doc.cardName ? `Cartão: ${doc.cardName}` : "",
      doc.size ? formatBytesShort(doc.size) : ""
    ].filter(Boolean);
    if ($("#proDocPreviewMeta")) $("#proDocPreviewMeta").textContent = metaBits.join(" · ");

    const dlBtn = $("#btnProDocPreviewDownload");
    if (dlBtn) {
      if (href) {
        dlBtn.hidden = false;
        dlBtn.href = href;
        if (doc.isLink) {
          dlBtn.removeAttribute("download");
          dlBtn.textContent = "↗️ Abrir Link";
        } else {
          dlBtn.setAttribute("download", doc.fileName || "documento");
          dlBtn.textContent = "⬇️ Baixar";
        }
      } else {
        dlBtn.hidden = true;
      }
    }
    const cardBtn = $("#btnProDocPreviewOpenCard");
    if (cardBtn) cardBtn.hidden = !doc.cardId;

    const body = $("#proDocPreviewBody");
    if (body) {
      if (!href) {
        body.innerHTML = `<div class="pro-doc-preview-fallback"><div style="font-size:2.4rem">${fileCategoryIcon(cat)}</div><strong>Arquivo local sem URL de pré-visualização</strong><p class="muted small">Salve o cartão com servidor ativo para visualizar ou baixar o arquivo.</p></div>`;
      } else if (cat === "image") {
        body.innerHTML = `<div class="pro-doc-preview-img-wrap"><img src="${core.esc(href)}" alt="${core.esc(doc.fileName || "Imagem")}"></div>`;
      } else if (cat === "pdf") {
        body.innerHTML = `<iframe class="pro-doc-preview-frame" src="${core.esc(href)}" title="${core.esc(doc.fileName || "PDF")}"></iframe>`;
      } else {
        body.innerHTML = `<div class="pro-doc-preview-fallback">
          <div style="font-size:2.6rem">${fileCategoryIcon(cat)}</div>
          <strong>${core.esc(doc.fileName || "Documento")}</strong>
          <p class="muted small">${doc.isLink ? "Link externo anexado ao cartão. Clique em Abrir Link abaixo para acessar." : "Pré-visualização nativa indisponível para este formato no navegador. Use o botão Baixar abaixo."}</p>
        </div>`;
      }
    }
    dlg.showModal();
  }

  function openProDocDeleteModal(doc) {
    const dlg = $("#proDocDeleteModal");
    if (!dlg || !doc) return;
    proDocsPendingDelete = doc;
    const msgEl = $("#proDocDelMessage");
    if (msgEl) {
      msgEl.innerHTML = `Deseja excluir <strong>${core.esc(doc.fileName)}</strong> (${core.esc(doc.originShort)}) vinculado ao cartão <strong>${core.esc(doc.cardName)}</strong>?`;
    }
    dlg.showModal();
  }

  async function confirmDeleteProDoc() {
    const doc = proDocsPendingDelete;
    proDocsPendingDelete = null;
    $("#proDocDeleteModal")?.close();
    if (!doc || !doc.cardId) return;
    const ctx = findProCardContext(doc.cardId);
    if (!ctx) return core.toast("⚠️ Cartão vinculado não encontrado.");
    if (ctx.trip?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
    const a = ctx.activity;
    if (doc.origin === "minutes" && doc.minuteId) {
      a.minutes = (Array.isArray(a.minutes) ? a.minutes : []).filter(m => m.id !== doc.minuteId);
      await core.saveTripRecord(ctx.trip, `🗑️ Ata "${doc.fileName}" removida!`);
      return;
    }
    if (doc.origin === "travel") {
      if (a.travelDetails && Array.isArray(a.travelDetails.tickets)) {
        a.travelDetails.tickets = a.travelDetails.tickets.filter(t => !(
          (doc.id && t.id === doc.id) || (!doc.id && t.fileName === doc.fileName)
        ));
        a.travelDetails.ticketFile = a.travelDetails.tickets[0] ? { ...a.travelDetails.tickets[0] } : null;
      }
    }
    if (Array.isArray(a.attachments)) {
      a.attachments = a.attachments.filter(att => !(
        (doc.id && att.id === doc.id) || (!doc.id && att.fileName === doc.fileName)
      ));
    }
    if (Array.isArray(a.minutes)) {
      a.minutes.forEach(m => {
        if (Array.isArray(m.attachments)) {
          m.attachments = m.attachments.filter(att => !(
            (doc.id && att.id === doc.id) || (!doc.id && att.fileName === doc.fileName)
          ));
        }
      });
    }
    if (doc.id && !doc.isLink && window.FeriasApi?.deleteAttachment) {
      try { await window.FeriasApi.deleteAttachment(doc.id); } catch {}
    }
    await core.saveTripRecord(ctx.trip, `🗑️ Documento "${doc.fileName}" removido!`);
  }

  /* ---------- RENOMEAÇÃO DE ANEXOS (PRESERVANDO EXTENSÃO E SINCRONIZADA) ---------- */
  function splitFileNameExt(fullName, isLink = false) {
    const raw = String(fullName || "").trim();
    if (isLink || !raw) return { base: raw, ext: "" };
    const dot = raw.lastIndexOf(".");
    if (dot > 0 && dot < raw.length - 1 && (raw.length - dot) <= 10) {
      return { base: raw.slice(0, dot), ext: raw.slice(dot) };
    }
    return { base: raw, ext: "" };
  }

  let renameAttPendingCb = null;
  let renameAttPendingExt = "";

  function openRenameAttachmentModal({ fileName, isLink = false, onConfirm }) {
    const dlg = $("#renameAttModal");
    const inp = $("#renameAttInput");
    const extBadge = $("#renameAttExtBadge");
    if (!dlg || !inp) {
      const { base, ext } = splitFileNameExt(fileName, isLink);
      if (window.myplanPromptDialog) {
        window.myplanPromptDialog({
          title: "✏️ Renomear Arquivo",
          label: `Nome${ext ? ` (extensão ${ext} preservada)` : ""}`,
          value: base,
          submitLabel: "Salvar"
        }).then(next => { if (next && next.trim() && onConfirm) onConfirm(next.trim() + ext); });
      }
      return;
    }
    const { base, ext } = splitFileNameExt(fileName, isLink);
    renameAttPendingExt = ext;
    renameAttPendingCb = onConfirm || null;
    inp.value = base;
    if (extBadge) {
      extBadge.textContent = ext;
      extBadge.hidden = !ext;
    }
    dlg.showModal();
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
  }

  async function renameAttachmentOnCard(cardId, { id, oldFileName, isLink = false, newFileName }) {
    const cleanNew = String(newFileName || "").trim();
    if (!cleanNew || cleanNew === oldFileName) return false;
    const ctx = cardId ? findProCardContext(cardId) : null;
    if (ctx?.trip?.role === "viewer") {
      core.toast("👁️ Projeto compartilhado somente para visualização.");
      return false;
    }
    if (id && !isLink && window.FeriasApi?.renameAttachment) {
      try { await window.FeriasApi.renameAttachment(id, cleanNew); } catch (err) {
        core.toast("❌ " + (err.message || "Falha ao renomear arquivo no servidor."));
        return false;
      }
    }
    const matches = item => item && ((id && item.id === id) || (!id && item.fileName === oldFileName));
    if (ctx?.activity) {
      const a = ctx.activity;
      if (Array.isArray(a.attachments)) {
        a.attachments.forEach(att => { if (matches(att)) att.fileName = cleanNew; });
      }
      if (a.travelDetails && Array.isArray(a.travelDetails.tickets)) {
        a.travelDetails.tickets.forEach(tk => { if (matches(tk)) tk.fileName = cleanNew; });
        if (a.travelDetails.ticketFile && matches(a.travelDetails.ticketFile)) {
          a.travelDetails.ticketFile.fileName = cleanNew;
        }
      }
      if (Array.isArray(a.minutes)) {
        a.minutes.forEach(m => {
          if (Array.isArray(m.attachments)) {
            m.attachments.forEach(matt => { if (matches(matt)) matt.fileName = cleanNew; });
          }
        });
      }
    }
    // Sincronizar imediatamente caso o modal do cartão esteja aberto para o mesmo cartão
    if (editingProCardId && editingProCardId === cardId) {
      proModalAttachments.forEach(att => { if (matches(att)) att.fileName = cleanNew; });
      proModalTickets.forEach(tk => { if (matches(tk)) tk.fileName = cleanNew; });
      renderProModalAttachments();
      renderProModalTicketsList();
    }
    if (ctx?.trip) {
      await core.saveTripRecord(ctx.trip, `✏️ Documento renomeado para "${cleanNew}"`);
    } else {
      renderProDocs();
    }
    return true;
  }

  function renderProDocs(allCardsOpt = null) {
    if (!$("#view-pro-docs")) return;
    const allDocs = collectAllProDocuments(allCardsOpt);
    refreshProDocsFilterOptions(allDocs);
    const cfg = getProDocsFilterCfg();

    // Sincronizar segmented e select de origem
    if ($("#proDocsOriginFilter") && $("#proDocsOriginFilter").value !== cfg.origin) {
      $("#proDocsOriginFilter").value = cfg.origin;
    }
    $("#proDocsOriginSeg")?.querySelectorAll("button").forEach(b => {
      b.classList.toggle("active", (b.dataset.docOrigin || "") === cfg.origin);
    });

    const filtered = allDocs.filter(d => {
      if (cfg.search && !d.searchHay.includes(cfg.search)) return false;
      if ($("#proDocsHideMinutesChk")?.checked && d.origin === "minutes") return false;
      if (cfg.origin === "no_minutes" && d.origin === "minutes") return false;
      else if (cfg.origin && cfg.origin !== "no_minutes" && d.origin !== cfg.origin) return false;
      if (cfg.fileType && d.fileCategory !== cfg.fileType) return false;
      if (cfg.eventId && d.cardId !== cfg.eventId) return false;
      const refIso = cfg.dateMode === "upload" ? d.uploadIso : d.eventIso;
      if (cfg.year && (!refIso || !refIso.startsWith(cfg.year))) return false;
      if (cfg.month && (!refIso || !refIso.startsWith(cfg.month))) return false;
      if (cfg.dateFrom && (!refIso || refIso < cfg.dateFrom)) return false;
      if (cfg.dateTo && (!refIso || refIso > cfg.dateTo)) return false;
      if (cfg.colId && d.columnId !== cfg.colId) return false;
      if (cfg.cardType && d.cardType !== cfg.cardType) return false;
      if (cfg.prio && d.priority !== cfg.prio) return false;
      if (cfg.assignee && !d.assignees.some(a => a.toLowerCase() === cfg.assignee.toLowerCase())) return false;
      if (cfg.client && d.client.toLowerCase() !== cfg.client.toLowerCase()) return false;
      if (cfg.hasTravel === "yes" && !d.hasTravel) return false;
      if (cfg.hasTravel === "no" && d.hasTravel) return false;
      if (cfg.location && (d.city || d.location).toLowerCase() !== cfg.location.toLowerCase()) return false;
      if (cfg.labelId && !d.labelIds.includes(cfg.labelId)) return false;
      if (cfg.tag && !d.tags.some(t => t.toLowerCase() === cfg.tag.toLowerCase())) return false;
      if (cfg.finMode) {
        if (cfg.finMode === "has_cost" && !d.hasCost) return false;
        else if (cfg.finMode === "no_cost" && d.hasCost) return false;
        else if (["diaria", "grat_rep", "comissionamento"].includes(cfg.finMode) && !d.travelModes.has(cfg.finMode)) return false;
      }
      return true;
    });

    // Ordenação
    const sorted = filtered.slice().sort((a, b) => {
      if (proDocsSort === "name") return a.fileName.localeCompare(b.fileName);
      if (proDocsSort === "event_date") {
        return String(a.eventIso || "9999-99-99").localeCompare(String(b.eventIso || "9999-99-99")) || a.fileName.localeCompare(b.fileName);
      }
      const ta = a.uploadedAt || a.uploadIso || a.eventIso || "";
      const tb = b.uploadedAt || b.uploadIso || b.eventIso || "";
      if (proDocsSort === "oldest") return String(ta).localeCompare(String(tb)) || a.fileName.localeCompare(b.fileName);
      return String(tb).localeCompare(String(ta)) || a.fileName.localeCompare(b.fileName);
    });

    const activeCnt = countActiveProDocsFilters(cfg);
    if ($("#btnProDocsFilterPop")) $("#btnProDocsFilterPop").classList.toggle("has-active", activeCnt > 0);
    if ($("#proDocsFilterCount")) {
      $("#proDocsFilterCount").textContent = activeCnt ? String(activeCnt) : "";
      $("#proDocsFilterCount").hidden = !activeCnt;
    }
    if ($("#btnProDocsClearFilters")) $("#btnProDocsClearFilters").hidden = activeCnt === 0;
    if ($("#btnProDocsResetInline")) $("#btnProDocsResetInline").hidden = activeCnt === 0;

    const minutesCnt = sorted.filter(d => d.origin === "minutes").length;
    const travelCnt = sorted.filter(d => d.origin === "travel").length;
    const generalCnt = sorted.length - travelCnt - minutesCnt;
    if ($("#proDocsSummaryBar")) {
      $("#proDocsSummaryBar").textContent = `Exibindo ${sorted.length} ${sorted.length === 1 ? "documento" : "documentos"} (${minutesCnt} ${minutesCnt === 1 ? "ata" : "atas"}, ${travelCnt} de viagem, ${generalCnt} ${generalCnt === 1 ? "geral" : "gerais"})`;
    }

    const emptyEl = $("#proDocsEmptyBanner");
    const listCard = $("#proDocsListCard");
    const gridEl = $("#proDocsCardsGrid");

    if (!sorted.length) {
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.innerHTML = `<div class="pro-travels-empty-inner">
          <div style="font-size:2rem">📁</div>
          <h3>${allDocs.length ? "Nenhum documento encontrado com os filtros atuais" : "Nenhum documento anexado ainda"}</h3>
          <p class="muted small">${allDocs.length
            ? "Ajuste a busca ou limpe os filtros para visualizar todos os anexos e bilhetes do projeto."
            : "Anexe arquivos em qualquer cartão (Anexos Gerais ou Bilhetes em Detalhes da Viagem) e eles aparecerão automaticamente centralizados aqui."}</p>
          ${allDocs.length ? `<button type="button" class="btn primary small" id="btnProDocsEmptyReset">✕ Limpar filtros</button>` : ""}
        </div>`;
        if ($("#btnProDocsEmptyReset", emptyEl)) $("#btnProDocsEmptyReset", emptyEl).onclick = resetProDocsFilters;
      }
      if (listCard) listCard.hidden = true;
      if (gridEl) gridEl.hidden = true;
      return;
    }

    if (emptyEl) { emptyEl.hidden = true; emptyEl.innerHTML = ""; }
    const showGrid = proDocsView === "grid";
    if (listCard) listCard.hidden = showGrid;
    if (gridEl) gridEl.hidden = !showGrid;

    const docByKey = new Map(sorted.map(d => [d.docKey, d]));

    // Render Lista/Tabela (Desktop padrão)
    const tbl = $("#proDocsTable");
    if (tbl && !showGrid) {
      tbl.innerHTML = `
        <thead>
          <tr>
            <th>Documento</th>
            <th>Origem</th>
            <th>Cartão Vinculado</th>
            <th>Responsável(is)</th>
            <th>Localidade</th>
            <th>Etiquetas / Tags</th>
            <th>Data</th>
            <th style="text-align:right">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(d => {
            const asgHtml = d.assignees.length
              ? d.assignees.slice(0, 2).map(nm => {
                  const c = colorForAssignee(nm);
                  return `<span class="pro-assignee-badge pro-ctrl-asg-compact" style="--asg-bg:${c.bg};--asg-fg:${c.fg};--asg-bd:${c.bd}">${core.esc(nm)}</span>`;
                }).join("") + (d.assignees.length > 2 ? `<span class="muted small">+${d.assignees.length - 2}</span>` : "")
              : `<span class="muted small">—</span>`;
            const lblTagsHtml = [
              ...d.labels.slice(0, 2).map(l => `<span class="pro-doc-lbl-pill" style="--lc:${core.esc(l.color || "#2563eb")}">${core.esc(l.name)}</span>`),
              ...d.tags.slice(0, 2).map(tg => `<span class="pro-doc-tag-pill">#${core.esc(tg)}</span>`)
            ].join("") || `<span class="muted small">—</span>`;
            const dtEv = d.eventIso ? core.fmtBR(d.eventIso) : "—";
            const dtUp = d.uploadIso && d.uploadIso !== d.eventIso ? core.fmtBR(d.uploadIso) : "";
            const szTxt = formatBytesShort(d.size);
            return `<tr data-doc-key="${core.esc(d.docKey)}">
              <td>
                <div class="pro-doc-name-cell">
                  <span class="pro-doc-ico">${fileCategoryIcon(d.fileCategory)}</span>
                  <div style="min-width:0">
                    <button type="button" class="pro-doc-name-btn" data-doc-preview="${core.esc(d.docKey)}" title="Visualizar ${core.esc(d.fileName)}">${core.esc(d.fileName)}</button>
                    <div class="muted small">${d.label ? `${core.esc(d.label)}${szTxt ? ` · ${szTxt}` : ""}` : (szTxt || d.fileCategory.toUpperCase())}</div>
                  </div>
                </div>
              </td>
              <td><span class="pro-doc-origin-badge is-${d.origin}">${core.esc(d.originLabel)}</span></td>
              <td>
                <button type="button" class="pro-doc-card-link" data-doc-open-card="${core.esc(d.cardId)}" title="Abrir cartão">${core.esc(d.cardName)}</button>
                <div class="muted small">${core.esc(d.columnTitle)}${d.client ? ` · ${core.esc(d.client)}` : ""}</div>
              </td>
              <td><div class="pro-doc-asg-wrap">${asgHtml}</div></td>
              <td>${d.city ? `<span class="pro-ctrl-loc-txt" title="${core.esc(d.location)}">📍 ${core.esc(d.city)}</span>` : `<span class="muted small">—</span>`}</td>
              <td><div class="pro-doc-tags-wrap">${lblTagsHtml}</div></td>
              <td class="nowrap">
                <div class="pro-ctrl-date-stack">
                  <span>${core.esc(dtEv)}</span>
                  ${dtUp ? `<small>⬆️ ${core.esc(dtUp)}</small>` : ""}
                </div>
              </td>
              <td class="nowrap" style="text-align:right">
                <div class="pro-doc-actions">
                  <button type="button" class="icon-btn" data-doc-preview="${core.esc(d.docKey)}" title="${d.origin === "minutes" ? "Abrir Editor da Ata" : "Visualizar"}">${d.origin === "minutes" ? "📝" : "👁️"}</button>
                  ${d.origin !== "minutes" ? `<button type="button" class="icon-btn" data-doc-rename="${core.esc(d.docKey)}" title="Renomear documento">✏️</button>` : ""}
                  ${d.origin === "minutes" ? `<button type="button" class="icon-btn" data-doc-min-dl="${core.esc(d.docKey)}" title="Baixar Ata (.docx)">⬇️</button>` : (d.url ? `<a class="icon-btn" href="${core.esc(d.url)}" ${d.isLink ? 'target="_blank" rel="noopener"' : `download="${core.esc(d.fileName)}" target="_blank" rel="noopener"`} title="${d.isLink ? "Abrir link" : "Baixar"}">${d.isLink ? "↗️" : "⬇️"}</a>` : "")}
                  <button type="button" class="icon-btn" data-doc-open-card="${core.esc(d.cardId)}" title="Abrir Cartão">🗂️</button>
                  <button type="button" class="icon-btn" data-doc-del="${core.esc(d.docKey)}" title="Excluir documento">🗑️</button>
                </div>
              </td>
            </tr>`;
          }).join("")}
        </tbody>`;
    }

    // Render Grade de Cards (Mobile & Pré-visualização rápida)
    if (gridEl && showGrid) {
      gridEl.innerHTML = sorted.map(d => {
        const dtEv = d.eventIso ? core.fmtBR(d.eventIso) : "Sem data";
        const szTxt = formatBytesShort(d.size);
        const thumb = (d.fileCategory === "image" && d.url)
          ? `<div class="pro-doc-card-thumb" data-doc-preview="${core.esc(d.docKey)}"><img src="${core.esc(d.url)}" alt="${core.esc(d.fileName)}" loading="lazy"></div>`
          : `<div class="pro-doc-card-thumb is-ico" data-doc-preview="${core.esc(d.docKey)}"><span>${fileCategoryIcon(d.fileCategory)}</span><small>${core.esc(d.fileCategory.toUpperCase())}</small></div>`;
        const tagsHtml = [
          ...d.labels.slice(0, 2).map(l => `<span class="pro-doc-lbl-pill" style="--lc:${core.esc(l.color || "#2563eb")}">${core.esc(l.name)}</span>`),
          ...d.tags.slice(0, 2).map(tg => `<span class="pro-doc-tag-pill">#${core.esc(tg)}</span>`)
        ].join("");
        return `<article class="card pro-doc-grid-card">
          ${thumb}
          <div class="pro-doc-grid-body">
            <div class="pro-doc-grid-top">
              <span class="pro-doc-origin-badge is-${d.origin}">${core.esc(d.originLabel)}</span>
              <span class="muted small">${core.esc(szTxt || dtEv)}</span>
            </div>
            <button type="button" class="pro-doc-name-btn" data-doc-preview="${core.esc(d.docKey)}" title="${core.esc(d.fileName)}">${core.esc(d.fileName)}</button>
            <button type="button" class="pro-doc-card-link" data-doc-open-card="${core.esc(d.cardId)}">🗂️ ${core.esc(d.cardName)}</button>
            <div class="pro-doc-grid-meta muted small">
              ${d.assignees.length ? `<span>👤 ${core.esc(d.assignees.join(", "))}</span>` : ""}
              ${d.city ? `<span>📍 ${core.esc(d.city)}</span>` : ""}
              <span>📅 ${core.esc(dtEv)}</span>
            </div>
            ${tagsHtml ? `<div class="pro-doc-tags-wrap">${tagsHtml}</div>` : ""}
            <div class="pro-doc-grid-foot">
              <button type="button" class="btn ghost small" data-doc-preview="${core.esc(d.docKey)}">👁️ Ver</button>
              ${d.origin !== "minutes" ? `<button type="button" class="icon-btn" data-doc-rename="${core.esc(d.docKey)}" title="Renomear documento">✏️</button>` : ""}
              ${d.url ? `<a class="btn ghost small" href="${core.esc(d.url)}" ${d.isLink ? 'target="_blank" rel="noopener"' : `download="${core.esc(d.fileName)}" target="_blank" rel="noopener"`}>${d.isLink ? "↗️ Abrir" : "⬇️ Baixar"}</a>` : ""}
              <button type="button" class="icon-btn" data-doc-open-card="${core.esc(d.cardId)}" title="Abrir Cartão">🗂️</button>
              <button type="button" class="icon-btn" data-doc-del="${core.esc(d.docKey)}" title="Excluir">🗑️</button>
            </div>
          </div>
        </article>`;
      }).join("");
    }

    const activeHost = showGrid ? gridEl : tbl;
    if (activeHost) {
      activeHost.querySelectorAll("[data-doc-preview]").forEach(el => {
        el.onclick = () => {
          const doc = docByKey.get(el.dataset.docPreview);
          if (!doc) return;
          if (doc.origin === "minutes" && doc.minuteId && window.MyPlanMinutes?.openMinuteEditor) {
            window.MyPlanMinutes.openMinuteEditor(doc.cardId, doc.minuteId);
          } else {
            openProDocPreviewModal(doc);
          }
        };
      });
      activeHost.querySelectorAll("[data-doc-min-dl]").forEach(el => {
        el.onclick = () => {
          const doc = docByKey.get(el.dataset.docMinDl);
          if (doc?.minuteObj && window.MyPlanMinutes?.exportMinute) {
            window.MyPlanMinutes.exportMinute(doc.card, doc.minuteObj, "simple", "docx");
          }
        };
      });
      activeHost.querySelectorAll("[data-doc-open-card]").forEach(el => {
        el.onclick = () => openProCardModal(el.dataset.docOpenCard);
      });
      activeHost.querySelectorAll("[data-doc-rename]").forEach(el => {
        el.onclick = () => {
          const doc = docByKey.get(el.dataset.docRename);
          if (!doc) return;
          openRenameAttachmentModal({
            fileName: doc.fileName,
            isLink: Boolean(doc.isLink),
            onConfirm: async nextName => {
              await renameAttachmentOnCard(doc.cardId, {
                id: doc.id,
                oldFileName: doc.fileName,
                isLink: Boolean(doc.isLink),
                newFileName: nextName
              });
            }
          });
        };
      });
      activeHost.querySelectorAll("[data-doc-del]").forEach(el => {
        el.onclick = () => {
          const doc = docByKey.get(el.dataset.docDel);
          if (doc) openProDocDeleteModal(doc);
        };
      });
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
      dateTo: $("#proFilterDateTo")?.value || "",
      tripsOnly: Boolean($("#proFilterTripsOnly")?.checked)
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
      + ((cfg.dateFrom || cfg.dateTo) ? 1 : 0)
      + (cfg.tripsOnly ? 1 : 0);
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
    if ($("#proFilterTripsOnly")) $("#proFilterTripsOnly").checked = false;
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
    return projectCardsForTravelDates(
      cards.filter(a => matchProCardFilters(a, cfg, cols)),
      cfg.tripsOnly,
      cfg.assignee
    );
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
    const wBadge = $("#proWalletStatusBadge");
    if (wBadge) {
      wBadge.textContent = caps.hasWallet ? "✅ Carteira do Google Ativa" : "Não configurada";
      wBadge.className = caps.hasWallet ? "pill ok" : "pill warn";
    }
    const usrWalletIssuer = window.FeriasApi?.getUser?.()?.integrations?.walletIssuerId || "";
    if ($("#proWalletIssuerInput") && !$("#proWalletIssuerInput").value && usrWalletIssuer) {
      $("#proWalletIssuerInput").value = usrWalletIssuer;
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

    // Tipos de Cartão (Todos editáveis e reordenáveis via ↑/↓ ou arrastar e soltar)
    const typesMgr = $("#proCardTypesManager");
    if (typesMgr) {
      const allTypes = Object.values(getAllProTypes(st));
      const moveTypeOrder = (fromIdx, toIdx) => {
        if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || toIdx >= allTypes.length) return;
        const ids = allTypes.map(x => x.id);
        const [moved] = ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, moved);
        st.cardTypeOrder = ids;
        core.save("↕️ Ordem dos Tipos de Cartão atualizada");
      };
      typesMgr.innerHTML = allTypes.map((t, idx) => {
        const badgeStyle = `style="--t-color:${core.esc(t.color || "#2563eb")}"`;
        const finHint = t.defaultFin === "income" ? " · +Receb." : (t.defaultFin === "expense" ? " · −Desp." : "");
        return `<div class="pro-type-row" draggable="true" data-ptidx="${idx}" data-ptid="${core.esc(t.id)}">
          <div class="pro-type-row-left">
            <span class="drag-handle" title="Arraste para reordenar" style="cursor:grab">⋮⋮</span>
            <span class="pro-type-row-badge" ${badgeStyle}>${t.iconHtml}</span>
            <div style="min-width:0">
              <div class="pro-type-row-name">${core.esc(t.short)}</div>
              <div class="muted" style="font-size:0.7rem">${t.isCustom ? "Personalizado" : "Padrão"}${finHint}</div>
            </div>
          </div>
          <div class="inline-actions">
            <button type="button" class="icon-btn" data-ptup="${idx}" ${idx === 0 ? "disabled" : ""} title="Mover para cima">↑</button>
            <button type="button" class="icon-btn" data-ptdown="${idx}" ${idx === allTypes.length - 1 ? "disabled" : ""} title="Mover para baixo">↓</button>
            <button type="button" class="icon-btn" data-ptedit="${core.esc(t.id)}" title="Editar tipo">✏️</button>
            <button type="button" class="icon-btn" data-ptdel="${core.esc(t.id)}" ${allTypes.length <= 1 ? "disabled" : ""} title="Excluir tipo">🗑️</button>
          </div>
        </div>`;
      }).join("");
      typesMgr.querySelectorAll("[data-ptup]").forEach(b => {
        b.onclick = () => { const i = parseInt(b.dataset.ptup, 10); moveTypeOrder(i, i - 1); };
      });
      typesMgr.querySelectorAll("[data-ptdown]").forEach(b => {
        b.onclick = () => { const i = parseInt(b.dataset.ptdown, 10); moveTypeOrder(i, i + 1); };
      });
      typesMgr.querySelectorAll("[data-ptedit]").forEach(b => {
        b.onclick = () => openProTypeModal({ editId: b.dataset.ptedit });
      });
      typesMgr.querySelectorAll("[data-ptdel]").forEach(b => {
        b.onclick = () => deleteProCustomType(b.dataset.ptdel);
      });
      let dragFromIdx = -1;
      typesMgr.querySelectorAll(".pro-type-row[draggable]").forEach(row => {
        row.ondragstart = e => {
          dragFromIdx = parseInt(row.dataset.ptidx, 10);
          row.style.opacity = "0.5";
          try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(dragFromIdx)); } catch {}
        };
        row.ondragend = () => { row.style.opacity = ""; dragFromIdx = -1; };
        row.ondragover = e => { e.preventDefault(); row.classList.add("drag-over"); };
        row.ondragleave = () => row.classList.remove("drag-over");
        row.ondrop = e => {
          e.preventDefault();
          row.classList.remove("drag-over");
          const toIdx = parseInt(row.dataset.ptidx, 10);
          if (dragFromIdx >= 0 && toIdx >= 0 && dragFromIdx !== toIdx) {
            moveTypeOrder(dragFromIdx, toIdx);
          }
        };
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
    renderProTravelFinanceParams(st);
    renderProDriveParams(st);
  }

  /* ---------- 7. CHECKLIST EXECUTIVO (VISÃO GLOBAL DE TODOS OS CARTÕES) ---------- */
  function startPromoteProSubtask({ cardId, cardName, subtaskId, subtaskIdx, text }) {
    const cleanText = String(text || "").trim();
    if (!cleanText) return core.toast("O item do checklist está vazio.");
    const dlg = $("#proCardModal");
    let srcCardId = cardId || editingProCardId || "";
    let srcCardName = cardName || $("#pc-name")?.value?.trim() || "Cartão original";
    let srcTripRef = editingProTripRef || core.getActiveTrip();

    if (dlg && dlg.open) {
      if (editingProCardId) {
        const ctx = findProCardContext(editingProCardId);
        if (ctx?.activity) {
          ctx.activity.subtasks = core.clone(proModalSubtasks);
          srcTripRef = ctx.trip || srcTripRef;
          srcCardName = ctx.activity.name || srcCardName;
        }
      }
      proModalForceClose = true;
      dlg.close();
    } else if (srcCardId) {
      const ctx = findProCardContext(srcCardId);
      if (ctx) {
        srcTripRef = ctx.trip || srcTripRef;
        srcCardName = ctx.activity?.name || srcCardName;
      }
    }

    const pending = {
      sourceCardId: srcCardId,
      sourceTripRef: srcTripRef,
      sourceCardName: srcCardName,
      subtaskId: subtaskId || "",
      subtaskIdx: Number.isInteger(subtaskIdx) ? subtaskIdx : -1,
      text: cleanText
    };
    openProCardModal(null);
    proPendingPromoteSubtask = pending;
    if ($("#pc-name")) $("#pc-name").value = cleanText;
    const banner = $("#proPromoteBanner");
    if (banner) {
      banner.innerHTML = `<span>↗️ Convertendo item do checklist de <b>${core.esc(srcCardName)}</b> em novo cartão — o item será removido do cartão original ao salvar.</span>`;
      banner.hidden = false;
    }
    proModalInitialSnapshot = JSON.stringify(readProCardForm());
  }

  function completePromoteProSubtask(savedTargetTrip) {
    if (!proPendingPromoteSubtask) return false;
    const info = proPendingPromoteSubtask;
    proPendingPromoteSubtask = null;
    const banner = $("#proPromoteBanner");
    if (banner) { banner.hidden = true; banner.innerHTML = ""; }
    if (!info.sourceCardId) return false;
    const ctx = findProCardContext(info.sourceCardId);
    const srcAct = ctx?.activity || (info.sourceTripRef?.data?.activities || []).find(x => x.id === info.sourceCardId);
    if (!srcAct || !Array.isArray(srcAct.subtasks)) return false;

    const before = srcAct.subtasks.length;
    if (info.subtaskId) {
      srcAct.subtasks = srcAct.subtasks.filter(s => s.id !== info.subtaskId);
    }
    if (srcAct.subtasks.length === before && info.text) {
      const idx = srcAct.subtasks.findIndex(s => String(s.text || "").trim() === info.text);
      if (idx >= 0) srcAct.subtasks.splice(idx, 1);
    }
    if (srcAct.subtasks.length !== before) {
      if (srcAct.subtasks.length > 0) {
        srcAct.progress = Math.round(srcAct.subtasks.filter(s => s.done).length / srcAct.subtasks.length * 100 / 5) * 5;
      }
      const srcTrip = ctx?.trip || info.sourceTripRef;
      if (srcTrip && savedTargetTrip && srcTrip.id !== savedTargetTrip.id) {
        core.saveTripRecord(srcTrip, "", true);
      }
      return true;
    }
    return false;
  }

  function renderProChecklist() {
    const st = core.getState();
    const rootEl = $("#view-pro-checklist");
    if (!rootEl || !window.MyPlanChecklists?.renderGlobalChecklist) return;
    const acts = getProSortedActivities();
    const cols = getMergedColumns();
    const allTags = [...new Set(acts.flatMap(a => Array.isArray(a.tags) ? a.tags : []).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const allAssignees = [...new Set([
      ...(Array.isArray(st.assignees) ? st.assignees : []),
      ...acts.flatMap(a => getCardAssigneesList(a).map(x => x.name))
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));

    window.MyPlanChecklists.renderGlobalChecklist({
      scope: "pro",
      rootEl,
      activities: acts,
      manualChecklist: st.checklist || [],
      allTypes: Object.values(getAllProTypes()),
      allLists: cols,
      allAssignees,
      allTags,
      getTypeInfo: t => getProTypeInfo(t),
      getListName: card => (cols.find(c => c.id === card.columnId)?.title || ""),
      getAssignees: card => getCardAssigneesList(card).map(x => x.name).filter(Boolean),
      fmtBR: core.fmtBR,
      onOpenCard: cid => openProCardModal(cid),
      onPromoteSubtask: info => startPromoteProSubtask(info),
      onEditManual: id => core.openCheckModal(id),
      onDeleteManual: id => {
        const it = (st.checklist || []).find(x => x.id === id);
        if (!confirm(`Excluir o item "${it?.item || "selecionado"}" do checklist?`)) return;
        st.checklist = (st.checklist || []).filter(x => x.id !== id);
        core.save("🗑️ Item removido do checklist");
      },
      onSyncCardProgress: card => {
        if (card && Array.isArray(card.subtasks) && card.subtasks.length > 0) {
          card.progress = Math.round(card.subtasks.filter(s => s.done).length / card.subtasks.length * 100 / 5) * 5;
        }
      },
      onSave: msg => core.save(msg)
    });
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
    if (!total) {
      listEl.innerHTML = `<div class="muted small">Nenhuma subtarefa ainda.</div>`;
      return;
    }
    listEl.innerHTML = proModalSubtasks.map((st, idx) => `
      <div class="pro-subtask-row ${st.done ? "done" : ""}" data-sub-row="${idx}">
        <span class="drag-handle subtask-drag-handle" title="Arraste para reordenar">⋮⋮</span>
        <input type="checkbox" data-sub-idx="${idx}" ${st.done ? "checked" : ""}>
        <input type="text" class="pro-subtask-txt" data-sub-txt="${idx}" value="${core.esc(st.text || "")}" aria-label="Item do checklist">
        <button type="button" class="icon-btn subtask-promote-btn" data-sub-promote="${idx}" title="Transformar em cartão" aria-label="Transformar em cartão">↗️</button>
        <button type="button" class="icon-btn" data-sub-del="${idx}" title="Remover subtarefa">✕</button>
      </div>`).join("");

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
    listEl.querySelectorAll("[data-sub-txt]").forEach(inp => {
      inp.onchange = () => {
        const i = parseInt(inp.dataset.subTxt, 10);
        if (proModalSubtasks[i]) proModalSubtasks[i].text = inp.value.trim();
      };
    });
    listEl.querySelectorAll("[data-sub-promote]").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.subPromote, 10);
        const sub = proModalSubtasks[i];
        if (!sub) return;
        const txtInput = listEl.querySelector(`[data-sub-txt="${i}"]`);
        const liveText = (txtInput ? txtInput.value : sub.text || "").trim();
        if (liveText) sub.text = liveText;
        startPromoteProSubtask({
          cardId: editingProCardId || "",
          cardName: $("#pc-name")?.value?.trim() || "Cartão",
          subtaskId: sub.id || "",
          subtaskIdx: i,
          text: sub.text
        });
      };
    });
    listEl.querySelectorAll("[data-sub-del]").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.subDel, 10);
        const sub = proModalSubtasks[idx];
        if (!confirm(`Excluir a subtarefa "${sub?.text || ""}"?`)) return;
        proModalSubtasks.splice(idx, 1);
        renderProModalSubtasks();
      };
    });
    if (proModalSubtasks.length > 1 && window.MyPlanChecklists?.bindDragReorder) {
      window.MyPlanChecklists.bindDragReorder(listEl, ".pro-subtask-row", ".subtask-drag-handle", (fromIdx, toIdx) => {
        const [moved] = proModalSubtasks.splice(fromIdx, 1);
        proModalSubtasks.splice(toIdx, 0, moved);
        renderProModalSubtasks();
      });
    }
  }

  function buildMeetWhatsAppUrl({ title, date, time, url }) {
    const cleanTitle = String(title || $("#pc-name")?.value || "Reunião Google Meet").trim();
    const cleanUrl = String(url || "").trim();
    const parts = [`*${cleanTitle}*`];
    const dtFmt = fmtDateShortPt(date);
    if (dtFmt && time) parts.push(`📅 ${dtFmt} às ${String(time).slice(0, 5)}`);
    else if (dtFmt) parts.push(`📅 ${dtFmt}`);
    else if (time) parts.push(`🕐 ${String(time).slice(0, 5)}`);
    if (cleanUrl) parts.push(`📹 Google Meet: ${cleanUrl}`);
    return `https://wa.me/?text=${encodeURIComponent(parts.join("\n\n"))}`;
  }

  function openMinuteForMeet({ title, date, time, url }) {
    if (!editingProCardId) {
      core.toast("💾 Salve o cartão primeiro para abrir/criar a Ata vinculada.");
      return;
    }
    const cleanUrl = String(url || "").trim();
    const ctx = findProCardContext(editingProCardId);
    const existingList = Array.isArray(ctx?.activity?.minutes) ? ctx.activity.minutes : [];
    const matched = cleanUrl ? existingList.find(m => String(m?.location || "").trim() === cleanUrl) : null;
    if (matched && window.MyPlanMinutes?.openMinuteEditor) {
      window.MyPlanMinutes.openMinuteEditor(editingProCardId, matched.id);
      return;
    }
    if (window.MyPlanMinutes?.createNewMinuteForCard) {
      const mDate = date ? `${date}T${(time || "09:00").slice(0, 5)}` : "";
      window.MyPlanMinutes.createNewMinuteForCard(editingProCardId, {
        title: title ? `Ata - ${title}` : "",
        meetingDate: mDate,
        location: cleanUrl
      });
    }
  }

  function renderProModalAttachments() {
    const box = $("#pc-attachList");
    const aiReadBtn = $("#btnProCardAiReadAttachments");
    const totalAtts = proModalAttachments.length + proModalTickets.length;
    if (aiReadBtn) aiReadBtn.disabled = totalAtts === 0;
    if (!box) return;
    if (!proModalAttachments.length) {
      box.innerHTML = `<div class="muted small">Nenhum arquivo ou link anexado.</div>`;
      return;
    }
    box.innerHTML = proModalAttachments.map((att, idx) => {
      const href = att.isLink ? att.url : window.FeriasApi.attachmentHref(att);
      const isMeet = Boolean(att.isMeet || (att.isLink && /meet\.google\.com/i.test(String(att.url || ""))));
      if (isMeet) {
        const dtFmt = fmtDateShortPt(att.meetDate);
        const dtBadge = dtFmt
          ? `${dtFmt}${att.meetTime ? ` às ${String(att.meetTime).slice(0, 5)}` : ""}`
          : (att.meetTime ? String(att.meetTime).slice(0, 5) : "");
        return `<div class="attach-chip is-meet">
          <div class="attach-meet-main">
            <a href="${core.esc(href)}" target="_blank" rel="noopener" title="Entrar na sala Google Meet">📹 <b>${core.esc(att.fileName || "Reunião Google Meet")}</b></a>
            ${dtBadge ? `<span class="attach-meet-meta">📅 ${core.esc(dtBadge)}</span>` : ""}
          </div>
          <div class="attach-meet-actions">
            <button type="button" class="icon-btn" data-patt-copy="${idx}" title="Copiar link do Meet" aria-label="Copiar link do Meet">📋</button>
            <button type="button" class="icon-btn" data-patt-wa="${idx}" title="Enviar link no WhatsApp" aria-label="Enviar link no WhatsApp">💬</button>
            <button type="button" class="icon-btn" data-patt-min="${idx}" title="Abrir/Criar Ata desta Reunião" aria-label="Abrir ou criar ata desta reunião">📝</button>
            <button type="button" class="icon-btn" data-patt-ren="${idx}" title="Renomear" aria-label="Renomear">✏️</button>
            <button type="button" class="icon-btn" data-patt-del="${idx}" title="Remover" aria-label="Remover">✕</button>
          </div>
        </div>`;
      }
      const ico = att.isLink ? "🔗" : (String(att.mimeType || "").includes("pdf") ? "📕" : "📄");
      return `<div class="attach-chip">
        <a href="${core.esc(href)}" target="_blank" rel="noopener">${ico} ${core.esc(att.fileName || att.url || "Anexo")}</a>
        <button type="button" class="icon-btn" data-patt-ren="${idx}" title="Renomear" aria-label="Renomear">✏️</button>
        <button type="button" class="icon-btn" data-patt-del="${idx}" title="Remover" aria-label="Remover">✕</button>
      </div>`;
    }).join("");
    box.querySelectorAll("[data-patt-copy]").forEach(b => {
      b.onclick = async () => {
        const att = proModalAttachments[parseInt(b.dataset.pattCopy, 10)];
        if (!att?.url) return;
        try { await navigator.clipboard.writeText(att.url); core.toast("📋 Link do Google Meet copiado!"); }
        catch { core.toast("🔗 " + att.url); }
      };
    });
    box.querySelectorAll("[data-patt-wa]").forEach(b => {
      b.onclick = () => {
        const att = proModalAttachments[parseInt(b.dataset.pattWa, 10)];
        if (!att) return;
        window.open(buildMeetWhatsAppUrl({
          title: att.fileName,
          date: att.meetDate || $("#pc-start")?.value || "",
          time: att.meetTime || $("#pc-startTime")?.value || "",
          url: att.url
        }), "_blank", "noopener");
      };
    });
    box.querySelectorAll("[data-patt-min]").forEach(b => {
      b.onclick = () => {
        const att = proModalAttachments[parseInt(b.dataset.pattMin, 10)];
        if (!att) return;
        openMinuteForMeet({
          title: att.fileName,
          date: att.meetDate || $("#pc-start")?.value || "",
          time: att.meetTime || $("#pc-startTime")?.value || "",
          url: att.url
        });
      };
    });
    box.querySelectorAll("[data-patt-ren]").forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.pattRen, 10);
        const att = proModalAttachments[idx];
        if (!att) return;
        openRenameAttachmentModal({
          fileName: att.fileName || att.url || "Anexo",
          isLink: Boolean(att.isLink),
          onConfirm: async nextName => {
            const oldName = att.fileName;
            if (att.id && !att.isLink && window.FeriasApi?.renameAttachment) {
              try { await window.FeriasApi.renameAttachment(att.id, nextName); } catch (err) {
                core.toast("❌ " + (err.message || "Falha ao renomear arquivo."));
                return;
              }
            }
            att.fileName = nextName;
            renderProModalAttachments();
            if (editingProCardId) {
              await renameAttachmentOnCard(editingProCardId, {
                id: att.id,
                oldFileName: oldName,
                isLink: Boolean(att.isLink),
                newFileName: nextName
              });
            } else {
              core.toast(`✏️ Renomeado para "${nextName}"`);
            }
          }
        });
      };
    });
    box.querySelectorAll("[data-patt-del]").forEach(b => {
      b.onclick = async () => {
        const idx = parseInt(b.dataset.pattDel, 10);
        const att = proModalAttachments[idx];
        if (!confirm(`Excluir o anexo "${att?.fileName || att?.url || "arquivo"}"?`)) return;
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
    const allMap = getAllProTypes(st);
    const existing = editId ? (allMap[editId] || (st.customCardTypes || []).find(t => t.id === editId) || null) : null;
    editingProTypeId = existing ? existing.id : null;
    proTypeModalCallback = typeof onCreated === "function" ? onCreated : null;
    proTypePickedIcon = existing?.iconId || "check";

    if ($("#proTypeModalTitle")) $("#proTypeModalTitle").textContent = existing ? "Editar Tipo de Cartão" : "Novo Tipo de Cartão";
    if ($("#pct-name")) $("#pct-name").value = existing ? existing.id : "";
    const col = existing?.color || "#2563eb";
    if ($("#pct-color")) $("#pct-color").value = col;
    if ($("#pct-defaultFin")) $("#pct-defaultFin").value = existing?.defaultFin || "none";
    if ($("#btnProTypeDelete")) $("#btnProTypeDelete").hidden = !existing || Object.keys(allMap).length <= 1;
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
    const allMap = getAllProTypes(st);
    if (Object.keys(allMap).length <= 1) return core.toast("⚠️ Mantenha pelo menos 1 tipo de cartão.");
    if (!confirm(`Excluir o tipo de cartão "${typeId}"? Cartões existentes desse tipo serão movidos para "Outro".`)) return;
    const target = allMap[typeId];
    if (target && target.origBuiltInId) {
      if (!st.cardTypeOverrides || typeof st.cardTypeOverrides !== "object") st.cardTypeOverrides = {};
      st.cardTypeOverrides[target.origBuiltInId] = { ...(st.cardTypeOverrides[target.origBuiltInId] || {}), hidden: true };
    } else {
      st.customCardTypes = (st.customCardTypes || []).filter(t => t.id !== typeId);
    }
    if (Array.isArray(st.cardTypeOrder)) {
      st.cardTypeOrder = st.cardTypeOrder.filter(id => id !== typeId);
    }
    let reassigned = 0;
    const fallbackType = Object.keys(getAllProTypes(st))[0] || "Outro";
    (st.activities || []).forEach(a => {
      if (a.type === typeId) { a.type = fallbackType; reassigned++; }
    });
    proBoardTypeSet.delete(typeId);
    proGanttTypeSet.delete(typeId);
    proTableTypeSet.delete(typeId);
    core.save(`🗑️ Tipo "${typeId}" removido${reassigned ? ` (${reassigned} cartão(ões) movidos para ${fallbackType})` : ""}`);
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

  const LEG_TYPE_META = {
    ida:           { label: "Ida",           icon: "🛫", cls: "leg-ida" },
    conexao_ida:   { label: "Conexão Ida",   icon: "🔁", cls: "leg-con-ida" },
    volta:         { label: "Volta",         icon: "🛬", cls: "leg-volta" },
    conexao_volta: { label: "Conexão Volta", icon: "🔁", cls: "leg-con-volta" },
    outro:         { label: "Outro",         icon: "🧭", cls: "leg-outro" }
  };

  const GOOGLE_WALLET_ICON_SVG = `<svg class="gw-ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <rect x="2" y="4.5" width="20" height="15" rx="3.2" fill="#4285F4"/>
    <path d="M2 8.2a3.2 3.2 0 0 1 3.2-3.2h13.6A3.2 3.2 0 0 1 22 8.2v2.4H2V8.2z" fill="#34A853"/>
    <path d="M2 10.2h20v2.4H2z" fill="#FBBC04"/>
    <path d="M2 12.2h20v4.1a3.2 3.2 0 0 1-3.2 3.2H5.2A3.2 3.2 0 0 1 2 16.3v-4.1z" fill="#EA4335"/>
    <path d="M2 12.4h6.8c1.1 0 1.9.8 2.4 1.6.4.6 1.1 1 1.9 1h8.9v1.3a3.2 3.2 0 0 1-3.2 3.2H5.2A3.2 3.2 0 0 1 2 16.3v-3.9z" fill="#FFFFFF" fill-opacity="0.92"/>
  </svg>`;

  function formatBytesShort(bytes) {
    const n = Number(bytes) || 0;
    if (!n) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function detectFileCategory(fileName, mimeType = "", isLink = false) {
    if (isLink) return "link";
    const m = String(mimeType || "").toLowerCase();
    const ext = String(fileName || "").toLowerCase().split(".").pop() || "";
    if (m.includes("pdf") || ext === "pdf") return "pdf";
    if (m.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "heic"].includes(ext)) return "image";
    if (["xls", "xlsx", "csv", "ods"].includes(ext) || m.includes("spreadsheet") || m.includes("excel")) return "spreadsheet";
    if (["doc", "docx", "txt", "rtf", "odt", "md"].includes(ext) || m.includes("word") || m.startsWith("text/")) return "document";
    return "other";
  }

  function fileCategoryIcon(cat) {
    return { pdf: "📄", image: "🖼️", spreadsheet: "📊", document: "📝", link: "🔗", other: "📦" }[cat] || "📎";
  }

  function resolveDocHref(item) {
    if (!item) return "";
    if (item.dataUrl) return item.dataUrl;
    if (item.url) return item.url;
    if (item.isLink) return "";
    if (item.id && window.FeriasApi?.attachmentHref) {
      return window.FeriasApi.attachmentHref(item);
    }
    if (item.id) return `/api/attachments/${encodeURIComponent(item.id)}`;
    return "";
  }

  function renderProModalTicketsList() {
    const box = $("#pc-ticketsList");
    if (!box) return;
    if (!proModalTickets.length) {
      box.innerHTML = `<div class="muted small" style="padding:2px 0">Nenhum bilhete anexado ainda. Você pode anexar ida, conexões e volta juntos ou em momentos diferentes.</div>`;
      return;
    }
    const legOpts = cur => Object.entries(LEG_TYPE_META)
      .map(([k, v]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${v.icon} ${v.label}</option>`)
      .join("");
    box.innerHTML = proModalTickets.map((t, idx) => {
      const cat = detectFileCategory(t.fileName, t.mimeType, false);
      const href = resolveDocHref(t);
      const sz = formatBytesShort(t.size);
      return `<div class="pro-ticket-item" data-tk-idx="${idx}">
        <div class="pro-ticket-item-main">
          <span class="pro-ticket-ico">${fileCategoryIcon(cat)}</span>
          <div class="pro-ticket-item-info">
            <strong title="${core.esc(t.fileName || "Bilhete")}">${core.esc(t.fileName || "Bilhete")}</strong>
            <small class="muted">${t.label ? `${core.esc(t.label)}${sz ? ` · ${sz}` : ""}` : (sz || "Bilhete de viagem")}</small>
          </div>
        </div>
        <div class="pro-ticket-item-actions">
          <select class="pro-tk-leg-sel" data-tk-leg="${idx}" aria-label="Tipo do trecho deste bilhete">${legOpts(t.legType || "ida")}</select>
          <button type="button" class="icon-btn" data-tk-ren="${idx}" title="Renomear bilhete">✏️</button>
          ${href ? `<button type="button" class="icon-btn" data-tk-view="${idx}" title="Visualizar bilhete">👁️</button>` : ""}
          ${href ? `<a class="icon-btn" href="${core.esc(href)}" download="${core.esc(t.fileName || "bilhete")}" target="_blank" rel="noopener" title="Baixar bilhete">⬇️</a>` : ""}
          <button type="button" class="icon-btn" data-tk-del="${idx}" title="Remover bilhete">✕</button>
        </div>
      </div>`;
    }).join("");

    const aiReadBtn = $("#btnProCardAiReadAttachments");
    if (aiReadBtn) aiReadBtn.disabled = (proModalAttachments.length + proModalTickets.length) === 0;
    box.querySelectorAll("[data-tk-ren]").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.tkRen, 10);
        const tk = proModalTickets[i];
        if (!tk) return;
        openRenameAttachmentModal({
          fileName: tk.fileName || "Bilhete",
          isLink: false,
          onConfirm: async nextName => {
            const oldName = tk.fileName;
            if (tk.id && window.FeriasApi?.renameAttachment) {
              try { await window.FeriasApi.renameAttachment(tk.id, nextName); } catch (err) {
                core.toast("❌ " + (err.message || "Falha ao renomear bilhete."));
                return;
              }
            }
            tk.fileName = nextName;
            renderProModalTicketsList();
            if (editingProCardId) {
              await renameAttachmentOnCard(editingProCardId, {
                id: tk.id,
                oldFileName: oldName,
                isLink: false,
                newFileName: nextName
              });
            } else {
              core.toast(`✏️ Bilhete renomeado para "${nextName}"`);
            }
          }
        });
      };
    });
    box.querySelectorAll("[data-tk-leg]").forEach(sel => {
      sel.onchange = () => {
        const i = parseInt(sel.dataset.tkLeg, 10);
        if (proModalTickets[i]) proModalTickets[i].legType = sel.value || "ida";
      };
    });
    box.querySelectorAll("[data-tk-view]").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.tkView, 10);
        const t = proModalTickets[i];
        if (!t) return;
        openProDocPreviewModal({
          fileName: t.fileName || "Bilhete",
          url: resolveDocHref(t),
          mimeType: t.mimeType || "",
          originLabel: `✈️ Viagem · ${(LEG_TYPE_META[t.legType] || LEG_TYPE_META.ida).label}`,
          cardId: editingProCardId || "",
          cardName: $("#pc-name")?.value || ""
        });
      };
    });
    box.querySelectorAll("[data-tk-del]").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.tkDel, 10);
        const tk = proModalTickets[i];
        if (!confirm(`Excluir o bilhete "${tk?.fileName || "bilhete"}"?`)) return;
        proModalTickets.splice(i, 1);
        renderProModalTicketsList();
      };
    });
  }

  async function openGoogleWalletForSegment(seg, btnEl) {
    if (!seg) return;
    const noticeEl = $("#pc-walletSetupNotice");
    if (noticeEl) { noticeEl.hidden = true; noticeEl.innerHTML = ""; }
    const origHtml = btnEl ? btnEl.innerHTML : "";
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = `<span class="ai-spinner" aria-hidden="true"></span><span>Carteira</span>`;
    }
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "") || window.innerWidth <= 768;
    // Em desktop, pré-abre guia em branco para evitar bloqueio de pop-up após await
    const preWin = !isMobile ? window.open("", "_blank") : null;
    try {
      const draftCard = {
        id: editingProCardId || proModalDraftId || "card",
        name: ($("#pc-name")?.value || "").trim(),
        start: $("#pc-start")?.value || "",
        end: $("#pc-end")?.value || "",
        location: ($("#pc-location")?.value || "").trim(),
        assignee: ($("#pc-assignee")?.value || "").trim(),
        travelDetails: { transport: $("#pc-travelTransport")?.value || "" }
      };
      const tripName = editingProTripRef?.data?.title || core.getState()?.title || "My Plan";
      const res = await window.FeriasApi.generateWalletSegmentLink(seg, draftCard, tripName);
      if (res && res.configured && res.saveUrl) {
        if (isMobile) {
          window.location.href = res.saveUrl;
        } else if (preWin && !preWin.closed) {
          preWin.location.href = res.saveUrl;
        } else {
          const w = window.open(res.saveUrl, "_blank", "noopener");
          if (!w) window.location.href = res.saveUrl;
        }
        core.toast("💳 Abrindo trecho diretamente na Carteira do Google...");
        return;
      }
      if (preWin && !preWin.closed) preWin.close();
      if (noticeEl) {
        noticeEl.hidden = false;
        noticeEl.innerHTML = `
          <div>
            <strong>⚠️ Google Wallet API ainda não configurada no servidor</strong>
            <div class="muted small">Para abrir trechos diretamente na Carteira do Google (sem baixar arquivos), configure o <b>Issuer ID</b> e a <b>Service Account</b> em <b>Parâmetros</b> ou no <code>.env</code> do servidor (<code>GOOGLE_WALLET_ISSUER_ID</code>, <code>GOOGLE_WALLET_CLIENT_EMAIL</code> e <code>GOOGLE_WALLET_PRIVATE_KEY</code>).</div>
          </div>
          <button type="button" class="btn primary small" id="btnProGoWalletParams">⚙️ Configurar em Parâmetros</button>`;
        if ($("#btnProGoWalletParams", noticeEl)) {
          $("#btnProGoWalletParams", noticeEl).onclick = () => {
            $("#proCardModal")?.close();
            core?.switchProView?.("pro-params");
            setTimeout(() => $("#proWalletParamsPanel")?.scrollIntoView({ behavior: "smooth", block: "center" }), 140);
          };
        }
      }
      core.toast("⚠️ Configure a Google Wallet API em Parâmetros para envio direto.");
    } catch (err) {
      if (preWin && !preWin.closed) preWin.close();
      core.toast("❌ " + (err.message || "Falha ao abrir Carteira do Google."));
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = origHtml || `${GOOGLE_WALLET_ICON_SVG}<span>Carteira</span>`;
      }
    }
  }

  function renderProModalSegmentsList() {
    const box = $("#pc-segmentsList");
    const badge = $("#proSegmentsCountBadge");
    if (badge) {
      const n = proModalSegments.length;
      badge.textContent = `${n} ${n === 1 ? "trecho" : "trechos"}`;
    }
    if (!box) return;
    if (!proModalSegments.length) {
      box.innerHTML = `<div class="muted small" style="padding:2px 0">Nenhum trecho cadastrado. Envie bilhetes pela IA acima ou clique em <b>+ Adicionar Trecho</b>.</div>`;
      return;
    }
    const legOpts = cur => Object.entries(LEG_TYPE_META)
      .map(([k, v]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${v.icon} ${v.label}</option>`)
      .join("");
    const trOpts = cur => ["", "Avião", "Ônibus", "Carro", "Outro"]
      .map(v => `<option value="${v}" ${v === cur ? "selected" : ""}>${v || "— Transporte —"}</option>`)
      .join("");

    box.innerHTML = proModalSegments.map((s, idx) => {
      const lm = LEG_TYPE_META[s.legType] || LEG_TYPE_META.ida;
      const isEditing = proEditingSegmentIdx === idx;
      const routeTxt = `${s.origin || "Origem"} → ${s.destination || "Destino"}`;
      const depTxt = s.departAt ? formatDateTimeShortBR(s.departAt, "") : "Sem horário";
      const arrTxt = s.arriveAt ? formatDateTimeShortBR(s.arriveAt, "") : "";
      const carrierTxt = [s.transport || "", s.carrier || "", s.flightNumber || ""].filter(Boolean).join(" · ");
      const metaBits = [
        `🛫 ${depTxt}${arrTxt ? ` → 🛬 ${arrTxt}` : ""}`,
        carrierTxt,
        s.locator ? `Loc: ${s.locator}` : "",
        s.seat ? `Assento: ${s.seat}` : "",
        s.passengerName ? `👤 ${s.passengerName}` : ""
      ].filter(Boolean);

      return `<div class="pro-seg-card${isEditing ? " is-editing" : ""}" data-seg-idx="${idx}">
        <div class="pro-seg-head">
          <div class="pro-seg-title-wrap">
            <span class="pro-seg-badge ${lm.cls}">${lm.icon} Trecho ${idx + 1} · ${core.esc(lm.label)}</span>
            <strong class="pro-seg-route">${core.esc(routeTxt)}</strong>
          </div>
          <div class="pro-seg-actions">
            <button type="button" class="btn pro-gwallet-btn small" data-seg-wallet="${idx}" title="Abrir diretamente este trecho na Carteira do Google">
              ${GOOGLE_WALLET_ICON_SVG}<span>Carteira</span>
            </button>
            <button type="button" class="icon-btn" data-seg-edit="${idx}" title="${isEditing ? "Concluir edição" : "Editar trecho"}">${isEditing ? "✓" : "✏️"}</button>
            <button type="button" class="icon-btn" data-seg-del="${idx}" title="Remover trecho">✕</button>
          </div>
        </div>
        <div class="pro-seg-meta">${metaBits.map(b => `<span>${core.esc(b)}</span>`).join("")}</div>
        ${isEditing ? `
        <div class="pro-seg-editor">
          <div class="form-grid">
            <label>Tipo do Trecho
              <select data-seg-f="legType" data-seg-i="${idx}">${legOpts(s.legType || "ida")}</select>
            </label>
            <label>Transporte
              <select data-seg-f="transport" data-seg-i="${idx}">${trOpts(s.transport || "")}</select>
            </label>
            <label>Origem (ex: BSB - Brasília)
              <input type="text" data-seg-f="origin" data-seg-i="${idx}" value="${core.esc(s.origin || "")}" placeholder="Ex: BSB - Brasília">
            </label>
            <label>Destino (ex: GRU - São Paulo)
              <input type="text" data-seg-f="destination" data-seg-i="${idx}" value="${core.esc(s.destination || "")}" placeholder="Ex: GRU - São Paulo">
            </label>
            <label>Partida (Data/Hora)
              <input type="datetime-local" data-seg-f="departAt" data-seg-i="${idx}" value="${core.esc(s.departAt || "")}">
            </label>
            <label>Chegada (Data/Hora)
              <input type="datetime-local" data-seg-f="arriveAt" data-seg-i="${idx}" value="${core.esc(s.arriveAt || "")}">
            </label>
            <label>Companhia / Viação
              <input type="text" data-seg-f="carrier" data-seg-i="${idx}" value="${core.esc(s.carrier || "")}" placeholder="Ex: LATAM, GOL, Azul">
            </label>
            <label>Nº Voo / Linha
              <input type="text" data-seg-f="flightNumber" data-seg-i="${idx}" value="${core.esc(s.flightNumber || "")}" placeholder="Ex: LA3210">
            </label>
            <label>Localizador / PNR
              <input type="text" data-seg-f="locator" data-seg-i="${idx}" value="${core.esc(s.locator || "")}" placeholder="Ex: X9K4LP">
            </label>
            <label>Assento
              <input type="text" data-seg-f="seat" data-seg-i="${idx}" value="${core.esc(s.seat || "")}" placeholder="Ex: 12A">
            </label>
            <label class="span2">Passageiro (para a Carteira do Google)
              <input type="text" data-seg-f="passengerName" data-seg-i="${idx}" value="${core.esc(s.passengerName || "")}" placeholder="Nome no bilhete">
            </label>
          </div>
        </div>` : ""}
      </div>`;
    }).join("");

    box.querySelectorAll("[data-seg-wallet]").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.segWallet, 10);
        if (proModalSegments[i]) openGoogleWalletForSegment(proModalSegments[i], btn);
      };
    });
    box.querySelectorAll("[data-seg-edit]").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.segEdit, 10);
        proEditingSegmentIdx = (proEditingSegmentIdx === i) ? -1 : i;
        renderProModalSegmentsList();
      };
    });
    box.querySelectorAll("[data-seg-del]").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.segDel, 10);
        const s = proModalSegments[i];
        if (!confirm(`Excluir o trecho "${s?.origin || "Origem"} → ${s?.destination || "Destino"}"?`)) return;
        proModalSegments.splice(i, 1);
        if (proEditingSegmentIdx === i) proEditingSegmentIdx = -1;
        else if (proEditingSegmentIdx > i) proEditingSegmentIdx--;
        renderProModalSegmentsList();
      };
    });
    box.querySelectorAll("[data-seg-f]").forEach(inp => {
      const syncField = () => {
        const i = parseInt(inp.dataset.segI, 10);
        const f = inp.dataset.segF;
        if (!proModalSegments[i]) return;
        proModalSegments[i][f] = (f === "departAt" || f === "arriveAt")
          ? sanitizeTravelDateTime(inp.value)
          : inp.value;
      };
      inp.oninput = syncField;
      inp.onchange = () => {
        syncField();
        if (inp.dataset.segF === "legType" || inp.dataset.segF === "origin" || inp.dataset.segF === "destination") {
          renderProModalSegmentsList();
        }
      };
    });
  }

  function setProTicketStatus(busy, msg = "", kind = "") {
    const el = $("#pc-ticketStatus");
    ["#btnProTicketsAiUpload", "#btnProTicketsOnlyUpload"].forEach(s => {
      if ($(s)) $(s).disabled = busy;
    });
    if (!el) return;
    if (!msg) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.className = `modal-ai-status is-${kind || (busy ? "loading" : "ok")}`;
    el.innerHTML = `${busy ? `<span class="ai-spinner" aria-hidden="true"></span>` : ""}<span>${core.esc(msg)}</span>`;
  }

  function mergeAiTicketExtraction(aiRes, uploadedBatch) {
    if (!aiRes || typeof aiRes !== "object") return { addedSegments: 0, updatedFields: 0 };
    let addedSegments = 0;
    let updatedFields = 0;

    // 1. Classificar apenas os novos bilhetes deste lote (sem alterar bilhetes anteriores)
    const classList = Array.isArray(aiRes.ticketClassifications) ? aiRes.ticketClassifications : [];
    classList.forEach(cl => {
      const fIdx = Number(cl?.fileIndex);
      const targetTk = isFinite(fIdx) && uploadedBatch[fIdx] ? uploadedBatch[fIdx] : null;
      if (!targetTk) return;
      if (["ida", "conexao_ida", "volta", "conexao_volta", "outro"].includes(cl.legType)) {
        targetTk.legType = cl.legType;
      }
      if (cl.label && !targetTk.label) {
        targetTk.label = String(cl.label).trim().slice(0, 80);
      }
    });

    // 2. Mesclar trechos extraídos SEM apagar ou sobrescrever trechos existentes
    const newSegs = Array.isArray(aiRes.segments) ? aiRes.segments : [];
    let batchEarliestIda = "";
    let batchLatestVolta = "";
    let hasIdaInBatch = false;
    let hasVoltaInBatch = false;

    const normTok = s => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
    newSegs.forEach(raw => {
      if (!raw || typeof raw !== "object") return;
      const legType = ["ida", "conexao_ida", "volta", "conexao_volta", "outro"].includes(raw.legType) ? raw.legType : "ida";
      const fIdx = Number(raw.fileIndex);
      const linkedTk = (isFinite(fIdx) && uploadedBatch[fIdx]) ? uploadedBatch[fIdx] : (uploadedBatch[0] || null);
      const seg = {
        id: core.uid(),
        legType,
        origin: String(raw.origin || "").trim(),
        destination: String(raw.destination || "").trim(),
        departAt: sanitizeTravelDateTime(raw.departAt),
        arriveAt: sanitizeTravelDateTime(raw.arriveAt),
        carrier: String(raw.carrier || "").trim(),
        flightNumber: String(raw.flightNumber || "").trim(),
        locator: String(raw.locator || "").trim().toUpperCase(),
        seat: String(raw.seat || "").trim().toUpperCase(),
        terminal: String(raw.terminal || "").trim(),
        gate: String(raw.gate || "").trim(),
        transport: ["Avião", "Ônibus", "Carro", "Outro"].includes(raw.transport)
          ? raw.transport
          : (["Avião", "Ônibus", "Carro", "Outro"].includes(aiRes.transport) ? aiRes.transport : ""),
        passengerName: String(raw.passengerName || "").trim(),
        barcodeValue: String(raw.barcodeValue || "").trim(),
        barcodeType: String(raw.barcodeType || "QR_CODE").trim(),
        ticketId: linkedTk?.id || "",
        notes: String(raw.notes || "").trim()
      };
      if (!seg.origin && !seg.destination && !seg.departAt && !seg.flightNumber && !seg.locator) return;

      if (linkedTk && !linkedTk.label && (seg.origin || seg.destination)) {
        linkedTk.label = `${(LEG_TYPE_META[legType] || LEG_TYPE_META.ida).label}: ${seg.origin || "?"} → ${seg.destination || "?"}`;
        linkedTk.legType = legType;
      }

      if (legType === "ida" || legType === "conexao_ida") {
        hasIdaInBatch = true;
        if (seg.departAt && (!batchEarliestIda || seg.departAt < batchEarliestIda)) {
          batchEarliestIda = seg.departAt;
        }
      } else if (legType === "volta" || legType === "conexao_volta") {
        hasVoltaInBatch = true;
        const endRef = seg.arriveAt || seg.departAt;
        if (endRef && (!batchLatestVolta || endRef > batchLatestVolta)) {
          batchLatestVolta = endRef;
        }
      }

      // Deduplicação inteligente: se já existe trecho idêntico, apenas preenche lacunas vazias sem sobrescrever
      const existing = proModalSegments.find(ex =>
        normTok(ex.origin) === normTok(seg.origin) &&
        normTok(ex.destination) === normTok(seg.destination) &&
        (
          (ex.departAt && seg.departAt && ex.departAt.slice(0, 10) === seg.departAt.slice(0, 10)) ||
          (ex.flightNumber && seg.flightNumber && normTok(ex.flightNumber) === normTok(seg.flightNumber))
        )
      );
      if (existing) {
        ["departAt", "arriveAt", "carrier", "flightNumber", "locator", "seat", "terminal", "gate", "transport", "passengerName", "barcodeValue", "notes"].forEach(k => {
          if (!existing[k] && seg[k]) {
            existing[k] = seg[k];
            updatedFields++;
          }
        });
      } else {
        proModalSegments.push(seg);
        addedSegments++;
      }
    });

    // Ordenar trechos cronologicamente (preservando trechos sem data no fim)
    proModalSegments.sort((a, b) => String(a.departAt || "9999-99-99").localeCompare(String(b.departAt || "9999-99-99")));

    // 3. Atualizar SOMENTE a ponta correspondente (Ida ou Volta) — NUNCA sobrescrever a ponta oposta!
    const defs = computeDefaultTravelDates($("#pc-start")?.value, $("#pc-end")?.value);
    if (hasIdaInBatch && batchEarliestIda) {
      if ($("#pc-assigneeTravels") && !$("#pc-assigneeTravels").checked && !proModalExtraAssignees.some(r => r.travels)) {
        $("#pc-assigneeTravels").checked = true;
      }
      const startInp = $("#pc-primaryTravelStart");
      if (startInp && $("#pc-assigneeTravels")?.checked) {
        const cur = sanitizeTravelDateTime(startInp.value);
        if (!cur || cur === defs.travelStart || batchEarliestIda < cur) {
          startInp.value = batchEarliestIda;
          updatedFields++;
        }
      }
      proModalExtraAssignees.forEach(r => {
        if (r.travels && (!r.travelStart || r.travelStart === defs.travelStart)) {
          r.travelStart = batchEarliestIda;
        }
      });
    }
    if (hasVoltaInBatch && batchLatestVolta) {
      if ($("#pc-assigneeTravels") && !$("#pc-assigneeTravels").checked && !proModalExtraAssignees.some(r => r.travels)) {
        $("#pc-assigneeTravels").checked = true;
      }
      const endInp = $("#pc-primaryTravelEnd");
      if (endInp && $("#pc-assigneeTravels")?.checked) {
        const cur = sanitizeTravelDateTime(endInp.value);
        if (!cur || cur === defs.travelEnd || batchLatestVolta > cur) {
          endInp.value = batchLatestVolta;
          updatedFields++;
        }
      }
      proModalExtraAssignees.forEach(r => {
        if (r.travels && (!r.travelEnd || r.travelEnd === defs.travelEnd)) {
          r.travelEnd = batchLatestVolta;
        }
      });
    }

    // 4. Transporte: preenche apenas se ainda vazio
    const trSel = $("#pc-travelTransport");
    if (trSel && !trSel.value && ["Avião", "Ônibus", "Carro", "Outro"].includes(aiRes.transport)) {
      trSel.value = aiRes.transport;
      updatedFields++;
    }

    // 5. Custo financeiro: se vazio preenche; se já preenchido preserva o existente e anota o novo valor
    const newCost = Number(aiRes.costAmount) || 0;
    if (newCost > 0) {
      const curHasCost = $("#pc-travelHasCost")?.value === "yes";
      const curCost = parseFloat($("#pc-travelCostAmount")?.value || "0") || 0;
      if (!curHasCost || curCost <= 0) {
        if ($("#pc-travelHasCost")) $("#pc-travelHasCost").value = "yes";
        if ($("#pc-travelCostWrap")) $("#pc-travelCostWrap").hidden = false;
        if ($("#pc-travelCostAmount")) $("#pc-travelCostAmount").value = String(newCost);
        updatedFields++;
      } else if (Math.abs(newCost - curCost) > 0.01) {
        const tn = $("#pc-travelNotes");
        const costNote = `Valor adicional detectado no bilhete: ${core.money(newCost)}`;
        if (tn && !tn.value.includes(costNote)) {
          tn.value = tn.value.trim() ? `${tn.value.trim()}\n${costNote}` : costNote;
        }
      }
    }

    // 6. Observações: mescla acrescentando linhas inéditas (jamais apaga o que já estava escrito)
    if (aiRes.notes && String(aiRes.notes).trim()) {
      const tn = $("#pc-travelNotes");
      const cleanNote = String(aiRes.notes).trim();
      if (tn && !tn.value.toLowerCase().includes(cleanNote.toLowerCase())) {
        tn.value = tn.value.trim() ? `${tn.value.trim()}\n${cleanNote}` : cleanNote;
        updatedFields++;
      }
    }

    return { addedSegments, updatedFields };
  }

  async function handleProTicketsUpload(fileList, useAi = true) {
    const files = [...(fileList || [])].filter(Boolean);
    if (!files.length) return;
    const tTripId = (!$("#pc-targetTripWrap")?.hidden && $("#pc-targetTrip")?.value)
      ? $("#pc-targetTrip").value
      : (editingProTripRef?.id || core.getActiveTrip()?.id || "local");
    setProTicketStatus(
      true,
      useAi
        ? `Enviando ${files.length} bilhete(s) e analisando trechos com IA (modo incremental)...`
        : `Enviando ${files.length} bilhete(s)...`,
      "loading"
    );
    const uploadedBatch = [];
    const nowIso = new Date().toISOString();
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        let rec;
        if (window.FeriasApi?.uploadAttachment) {
          try {
            const up = await window.FeriasApi.uploadAttachment(tTripId, proModalDraftId, f);
            rec = {
              id: up.id,
              fileName: up.fileName || f.name,
              url: up.url || "",
              mimeType: f.type || up.mimeType || "",
              size: f.size || up.size || 0,
              uploadedAt: up.uploadedAt || nowIso,
              legType: proModalTickets.length ? "volta" : "ida",
              label: ""
            };
          } catch {
            rec = {
              id: core.uid(),
              fileName: f.name,
              url: "",
              mimeType: f.type || "",
              size: f.size || 0,
              uploadedAt: nowIso,
              legType: proModalTickets.length ? "volta" : "ida",
              label: ""
            };
          }
        } else {
          rec = {
            id: core.uid(),
            fileName: f.name,
            url: "",
            mimeType: f.type || "",
            size: f.size || 0,
            uploadedAt: nowIso,
            legType: proModalTickets.length ? "volta" : "ida",
            label: ""
          };
        }
        proModalTickets.push(rec);
        uploadedBatch.push(rec);
      }
      renderProModalTicketsList();

      if (useAi && window.FeriasApi?.aiAnalyzeTickets && core.fileToBase64Obj) {
        try {
          const mediaArr = [];
          const fileNames = [];
          for (const f of files.slice(0, 8)) {
            mediaArr.push(await core.fileToBase64Obj(f));
            fileNames.push(f.name);
          }
          const aiRes = await window.FeriasApi.aiAnalyzeTickets({
            baseDate: core.fmtISO(new Date()),
            media: mediaArr,
            fileNames,
            existingContext: {
              segments: proModalSegments,
              eventStart: $("#pc-start")?.value || "",
              eventEnd: $("#pc-end")?.value || "",
              location: ($("#pc-location")?.value || "").trim()
            }
          });
          const merged = mergeAiTicketExtraction(aiRes, uploadedBatch);
          renderProModalTicketsList();
          renderProModalSegmentsList();
          renderProModalExtraAssignees();
          updateProModalTravelFinancePreview();
          const msg = merged.addedSegments > 0
            ? `✅ ${files.length} bilhete(s) anexado(s) e ${merged.addedSegments} novo(s) trecho(s) mesclado(s) sem sobrescrever dados anteriores!`
            : `✅ ${files.length} bilhete(s) anexado(s) e analisado(s) pela IA (dados anteriores preservados)!`;
          setProTicketStatus(false, msg, "ok");
          return;
        } catch (aiErr) {
          setProTicketStatus(false, `🎫 ${files.length} bilhete(s) anexado(s)! (IA indisponível: ${aiErr?.message || "adicione os trechos manualmente"})`, "ok");
          return;
        }
      }
      setProTicketStatus(false, `🎫 ${files.length} bilhete(s) anexado(s) à lista!`, "ok");
    } catch (err) {
      setProTicketStatus(false, "❌ " + (err.message || err), "error");
    }
  }

  function updateProModalTravelFinancePreview() {
    const box = $("#pc-travelFinanceBox");
    const detailsBox = $("#pc-travelDetailsBox");
    const primaryDatesRow = $("#pc-primaryTravelDatesRow");
    if (!box) return;
    const primaryName = ($("#pc-assignee")?.value || "").trim();
    const primaryTravels = Boolean($("#pc-assigneeTravels")?.checked);
    const primaryModeSel = $("#pc-primaryTravelMode");
    const extraTravelers = proModalExtraAssignees.filter(r => r.name && r.travels);
    const hasAnyTraveler = primaryTravels || proModalExtraAssignees.some(r => r.travels);
    const totalTravelersCount = (primaryName && primaryTravels ? 1 : 0) + extraTravelers.length;

    let startVal = $("#pc-start")?.value || "";
    let endVal = $("#pc-end")?.value || "";
    if (!startVal && endVal) startVal = endVal;
    if (startVal && !endVal) endVal = startVal;
    if (startVal && endVal < startVal) endVal = startVal;

    if (primaryDatesRow) {
      primaryDatesRow.hidden = !primaryTravels;
      if (primaryTravels) {
        const defs = computeDefaultTravelDates(startVal, endVal);
        if ($("#pc-primaryTravelStart") && !$("#pc-primaryTravelStart").value && defs.travelStart) {
          $("#pc-primaryTravelStart").value = defs.travelStart;
        }
        if ($("#pc-primaryTravelEnd") && !$("#pc-primaryTravelEnd").value && defs.travelEnd) {
          $("#pc-primaryTravelEnd").value = defs.travelEnd;
        }
      }
    }

    if (primaryModeSel) {
      primaryModeSel.hidden = !(primaryTravels && totalTravelersCount > 1);
    }

    box.hidden = !hasAnyTraveler;
    if (detailsBox) detailsBox.hidden = false;
    if (!hasAnyTraveler) return;

    const cfg = getTravelFinanceConfig(editingProTripRef?.data || null);

    const draftCard = {
      start: startVal,
      end: endVal,
      location: ($("#pc-location")?.value || "").trim(),
      travelFinanceMode: sanitizeTravelMode($("#pc-travelFinanceMode")?.value) || "diaria",
      travelFreeLodging: Boolean($("#pc-travelFreeLodging")?.checked)
    };

    const tierInfo = classifyLocationTier(draftCard.location, cfg);
    const tierBadge = $("#pc-travelFinanceTierBadge");
    if (tierBadge) {
      tierBadge.textContent = draftCard.location
        ? `${tierInfo.label} (${tierInfo.desc})`
        : "Informe o Local para classificar a Faixa";
    }

    const previewEl = $("#pc-travelFinancePreview");
    if (!previewEl) return;

    const participants = [];
    if (primaryName && primaryTravels) {
      participants.push({
        name: primaryName,
        travels: true,
        travelMode: sanitizeTravelMode(primaryModeSel?.value),
        travelStart: sanitizeTravelDateTime($("#pc-primaryTravelStart")?.value),
        travelEnd: sanitizeTravelDateTime($("#pc-primaryTravelEnd")?.value)
      });
    }
    proModalExtraAssignees.forEach(r => {
      if (r.name && r.travels && !participants.some(p => p.name.toLowerCase() === r.name.toLowerCase())) {
        participants.push({
          name: r.name,
          travels: true,
          travelMode: sanitizeTravelMode(r.travelMode),
          travelStart: sanitizeTravelDateTime(r.travelStart),
          travelEnd: sanitizeTravelDateTime(r.travelEnd)
        });
      }
    });

    if (!participants.length) {
      previewEl.innerHTML = `<span class="muted small">Selecione ao menos um responsável para calcular a estimativa financeira.</span>`;
      return;
    }

    const modeLabels = { diaria: "💵 Diária", grat_rep: "🎖️ Grat. Rep.", comissionamento: "📋 Comissionamento" };
    let grandSum = 0;
    const rowsHtml = participants.map(pt => {
      const f = computePersonTravelFinance(draftCard, pt.name, pt, cfg);
      grandSum += f.effectiveTotal;
      const rankTxt = f.rank ? `${core.esc(f.rankAbbrev)} (Círc. ${core.esc(f.rank.circle)})` : `<span style="color:var(--event)">⚠️ Posto não vinculado em Parâmetros</span>`;
      const dtSpanTxt = (f.idaDt || f.start) ? ` · 🛫 ${formatDateTimeShortBR(f.idaDt, f.start)} ➔ 🛬 ${formatDateTimeShortBR(f.voltaDt, f.end)}` : "";
      let valHtml = "";
      if (f.activeMode === "diaria") {
        valHtml = `<strong style="color:var(--ok)">${core.money(f.diariaTotal)}</strong> <small class="muted">(${core.num(f.diariasQty, 1)} diár.${f.freeLodging ? " · 50%" : ""})</small>`;
      } else if (f.activeMode === "grat_rep") {
        valHtml = `<strong style="color:#c084fc">${core.money(f.gratLiquida)}</strong> <small class="muted">(Líq. · Bruto ${core.money(f.gratBruta)} · ${f.diasFora}d)</small>`;
      } else {
        valHtml = `<strong class="muted">R$ 0,00</strong> <small class="muted">(Comissionamento)</small>`;
      }
      return `<div class="pro-tf-prev-row">
        <div style="min-width:0">
          <b>${core.esc(pt.name)}</b> <span class="pill" style="font-size:0.65rem;padding:1px 6px">${modeLabels[f.activeMode]}</span>
          <div class="muted small">${rankTxt}${core.esc(dtSpanTxt)}</div>
        </div>
        <div style="text-align:right;white-space:nowrap">${valHtml}</div>
      </div>`;
    }).join("");

    previewEl.innerHTML = `
      ${rowsHtml}
      ${participants.length > 1 ? `<div class="pro-tf-prev-total"><span>Total estimado do cartão</span><strong>${core.money(grandSum)}</strong></div>` : ""}`;
  }

  function renderProModalExtraAssignees() {
    const box = $("#pc-extraAssigneesList");
    if (!box) return;
    const allList = getAllProAssignees();
    if (!proModalExtraAssignees.length) {
      box.innerHTML = "";
      updateProModalTravelFinancePreview();
      return;
    }
    const defs = computeDefaultTravelDates($("#pc-start")?.value, $("#pc-end")?.value);
    box.innerHTML = proModalExtraAssignees.map((row, idx) => {
      const items = [...allList];
      if (row.name && !items.some(x => x.toLowerCase() === row.name.toLowerCase())) items.push(row.name);
      const opts = `<option value="">— Selecionar responsável —</option>`
        + items.map(a => `<option value="${core.esc(a)}" ${a.toLowerCase() === String(row.name || "").toLowerCase() ? "selected" : ""}>${core.esc(a)}</option>`).join("");
      const modeVal = sanitizeTravelMode(row.travelMode);
      if (row.travels) {
        if (!row.travelStart && defs.travelStart) row.travelStart = defs.travelStart;
        if (!row.travelEnd && defs.travelEnd) row.travelEnd = defs.travelEnd;
      }
      const tsVal = sanitizeTravelDateTime(row.travelStart);
      const teVal = sanitizeTravelDateTime(row.travelEnd);
      return `<div class="pro-extra-assignee-block" data-ex-asg-idx="${idx}">
        <div class="pro-extra-assignee-row">
          <select data-ex-asg-sel="${idx}" aria-label="Responsável adicional">${opts}</select>
          <label class="pro-travel-chk-label" title="Marque se este responsável viaja nesta tarefa">
            <input type="checkbox" data-ex-asg-trv="${idx}" ${row.travels ? "checked" : ""}>
            <span>✈️ Viaja</span>
          </label>
          <select class="pro-asg-mode-sel" data-ex-asg-mode="${idx}" aria-label="Modalidade individual" title="Modalidade individual (opcional)" ${row.travels ? "" : "hidden"}>
            <option value="" ${!modeVal ? "selected" : ""}>Padrão</option>
            <option value="diaria" ${modeVal === "diaria" ? "selected" : ""}>💵 Diária</option>
            <option value="grat_rep" ${modeVal === "grat_rep" ? "selected" : ""}>🎖️ Grat. Rep.</option>
            <option value="comissionamento" ${modeVal === "comissionamento" ? "selected" : ""}>📋 Comiss.</option>
          </select>
          <button type="button" class="icon-btn" data-ex-asg-del="${idx}" title="Remover responsável deste cartão">✕</button>
        </div>
        ${row.travels ? `<div class="pro-asg-travel-dates">
          <label>
            <span>🛫 Saída (Ida)</span>
            <input type="datetime-local" data-ex-asg-tstart="${idx}" value="${core.esc(tsVal)}" aria-label="Saída do responsável adicional">
          </label>
          <label>
            <span>🛬 Regresso (Volta)</span>
            <input type="datetime-local" data-ex-asg-tend="${idx}" value="${core.esc(teVal)}" aria-label="Regresso do responsável adicional">
          </label>
        </div>` : ""}
      </div>`;
    }).join("");

    box.querySelectorAll("[data-ex-asg-sel]").forEach(sel => {
      sel.onchange = () => {
        const i = parseInt(sel.dataset.exAsgSel, 10);
        if (proModalExtraAssignees[i]) proModalExtraAssignees[i].name = sel.value;
        updateProModalTravelFinancePreview();
      };
    });
    box.querySelectorAll("[data-ex-asg-trv]").forEach(chk => {
      chk.onchange = () => {
        const i = parseInt(chk.dataset.exAsgTrv, 10);
        if (proModalExtraAssignees[i]) {
          proModalExtraAssignees[i].travels = chk.checked;
          if (chk.checked) {
            const d = computeDefaultTravelDates($("#pc-start")?.value, $("#pc-end")?.value);
            if (!proModalExtraAssignees[i].travelStart && d.travelStart) proModalExtraAssignees[i].travelStart = d.travelStart;
            if (!proModalExtraAssignees[i].travelEnd && d.travelEnd) proModalExtraAssignees[i].travelEnd = d.travelEnd;
          }
        }
        renderProModalExtraAssignees();
      };
    });
    box.querySelectorAll("[data-ex-asg-mode]").forEach(sel => {
      sel.onchange = () => {
        const i = parseInt(sel.dataset.exAsgMode, 10);
        if (proModalExtraAssignees[i]) proModalExtraAssignees[i].travelMode = sanitizeTravelMode(sel.value);
        updateProModalTravelFinancePreview();
      };
    });
    box.querySelectorAll("[data-ex-asg-tstart]").forEach(inp => {
      inp.onchange = () => {
        const i = parseInt(inp.dataset.exAsgTstart, 10);
        if (proModalExtraAssignees[i]) proModalExtraAssignees[i].travelStart = sanitizeTravelDateTime(inp.value);
        updateProModalTravelFinancePreview();
      };
    });
    box.querySelectorAll("[data-ex-asg-tend]").forEach(inp => {
      inp.onchange = () => {
        const i = parseInt(inp.dataset.exAsgTend, 10);
        if (proModalExtraAssignees[i]) proModalExtraAssignees[i].travelEnd = sanitizeTravelDateTime(inp.value);
        updateProModalTravelFinancePreview();
      };
    });
    box.querySelectorAll("[data-ex-asg-del]").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.exAsgDel, 10);
        const nm = proModalExtraAssignees[i]?.name || "este responsável";
        if (!confirm(`Remover "${nm}" deste cartão?`)) return;
        proModalExtraAssignees.splice(i, 1);
        renderProModalExtraAssignees();
      };
    });
    updateProModalTravelFinancePreview();
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
    proModalTempUploadIds = [];
    proModalSaved = false;
    if ($("#pc-aiReadStatus")) { $("#pc-aiReadStatus").hidden = true; $("#pc-aiReadStatus").innerHTML = ""; }

    const curMode = "professional";
    const targetModeSel = $("#pc-targetMode");
    const targetTripWrap = $("#pc-targetTripWrap");
    const targetTripSel = $("#pc-targetTrip");
    if (targetModeSel) {
      targetModeSel.value = curMode;
      targetModeSel.onchange = () => {
        const chosenMode = targetModeSel.value || curMode;
        if (targetTripSel && core.populateEventSelect) {
          core.populateEventSelect(targetTripSel, chosenMode, chosenMode === curMode ? (editingProTripRef?.id || core.getActiveTrip()?.id || "") : "");
        }
      };
    }
    if (targetTripWrap && targetTripSel) {
      if (core.populateEventSelect) {
        core.populateEventSelect(targetTripSel, curMode, editingProTripRef?.id || core.getActiveTrip()?.id || "");
      }
      targetTripWrap.hidden = false;
    }

    populateProTypeSelect(editingProTripRef?.data || null);
    const cols = editingProTripRef?.data?.columns || getMergedColumns();
    populateProColumnSelect(editingProTripRef?.data || null);

    // Valores padrão ao criar novo cartão: Lista = "Assuntos", Tipo = "Tarefa"
    const allTypesForCard = getAllProTypes(editingProTripRef?.data || null);
    const defaultTypeKey = Object.keys(allTypesForCard).find(k => k.toLowerCase() === "tarefa") || Object.keys(allTypesForCard)[0] || "Tarefa";
    const rawInitType = a ? a.type : (opts?.type || defaultTypeKey);
    const initType = getProTypeInfo(rawInitType, editingProTripRef?.data || null).id;
    const tInfo = getProTypeInfo(initType, editingProTripRef?.data || null);
    const initFinDir = a ? a.finDirection : (opts?.finDirection || tInfo.defaultFin || "none");
    const defaultAssuntosCol = cols.find(c => String(c.title || "").trim().toLowerCase() === "assuntos" || c.id === "assuntos") || cols[0];

    $("#proCardModalTitle").textContent = a ? `Editar Cartão` : "Novo Cartão Profissional";
    $("#pc-name").value = a ? a.name : "";
    $("#pc-notes").value = a ? (a.notes || "") : "";
    $("#pc-column").value = a ? (a.columnId ?? "") : (opts && "columnId" in opts ? opts.columnId : (defaultAssuntosCol?.id || ""));
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
    const primaryAsg = existingAsgList[0] || {
      name: a?.assignee || "",
      travels: Boolean(a?.assigneeTravels),
      travelMode: sanitizeTravelMode(a?.assigneeTravelMode),
      travelStart: sanitizeTravelDateTime(a?.assigneeTravelStart),
      travelEnd: sanitizeTravelDateTime(a?.assigneeTravelEnd)
    };
    populateProAssigneeSelect(primaryAsg.name, editingProTripRef?.data || null);
    if ($("#pc-assigneeTravels")) $("#pc-assigneeTravels").checked = Boolean(primaryAsg.travels);
    if ($("#pc-primaryTravelMode")) $("#pc-primaryTravelMode").value = sanitizeTravelMode(primaryAsg.travelMode);
    if ($("#pc-primaryTravelStart")) $("#pc-primaryTravelStart").value = sanitizeTravelDateTime(primaryAsg.travelStart);
    if ($("#pc-primaryTravelEnd")) $("#pc-primaryTravelEnd").value = sanitizeTravelDateTime(primaryAsg.travelEnd);
    if ($("#pc-travelFinanceMode")) $("#pc-travelFinanceMode").value = sanitizeTravelMode(a?.travelFinanceMode) || "diaria";
    if ($("#pc-travelFreeLodging")) $("#pc-travelFreeLodging").checked = Boolean(a?.travelFreeLodging);
    proModalExtraAssignees = existingAsgList.slice(1).map(e => ({
      name: e.name,
      travels: Boolean(e.travels),
      travelMode: sanitizeTravelMode(e.travelMode),
      travelStart: sanitizeTravelDateTime(e.travelStart),
      travelEnd: sanitizeTravelDateTime(e.travelEnd)
    }));

    // Detalhes da Viagem (opcionais — múltiplos bilhetes + trechos + Google Wallet)
    const td = (a && a.travelDetails && typeof a.travelDetails === "object") ? a.travelDetails : {};
    proModalTickets = Array.isArray(td.tickets)
      ? td.tickets.map(t => ({ ...t }))
      : (td.ticketFile && typeof td.ticketFile === "object" ? [{ ...td.ticketFile, legType: td.ticketFile.legType || "ida" }] : []);
    proModalSegments = Array.isArray(td.segments) ? td.segments.map(s => ({ ...s })) : [];
    proEditingSegmentIdx = -1;
    if ($("#pc-travelTransport")) $("#pc-travelTransport").value = td.transport || "";
    if ($("#pc-travelHasCost")) $("#pc-travelHasCost").value = td.hasCost ? "yes" : "no";
    if ($("#pc-travelCostWrap")) $("#pc-travelCostWrap").hidden = !td.hasCost;
    if ($("#pc-travelCostAmount")) $("#pc-travelCostAmount").value = Number(td.costAmount) > 0 ? String(td.costAmount) : "";
    if ($("#pc-travelNotes")) $("#pc-travelNotes").value = td.notes || "";
    if ($("#pc-walletSetupNotice")) { $("#pc-walletSetupNotice").hidden = true; $("#pc-walletSetupNotice").innerHTML = ""; }
    setProTicketStatus(false, "");
    renderProModalTicketsList();
    renderProModalSegmentsList();
    if ($("#pc-travelDetailsBox")) {
      $("#pc-travelDetailsBox").open = Boolean(proModalTickets.length || proModalSegments.length || td.transport || td.hasCost || td.notes);
    }

    $("#pc-location").value = a ? (a.location || "") : "";
    if ($("#pc-meetingLink")) $("#pc-meetingLink").value = a ? (a.meetingLink || "") : "";
    proModalLocationLat = (a && a.locationLat != null && isFinite(Number(a.locationLat))) ? Number(a.locationLat) : null;
    proModalLocationLng = (a && a.locationLng != null && isFinite(Number(a.locationLng))) ? Number(a.locationLng) : null;
    renderProModalExtraAssignees();
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
    if (window.MyPlanMinutes?.renderCardMinutesList) {
      window.MyPlanMinutes.renderCardMinutesList(a ? a.id : "", $("#pc-minutesList"));
    }

    if ($("#proCalRemLabel")) $("#proCalRemLabel").textContent = core.getState().params?.calendarReminderTime || "09:00";
    if ($("#btnProCardDelete")) $("#btnProCardDelete").style.visibility = a ? "visible" : "hidden";
    const archBtn = $("#btnProCardArchive");
    if (archBtn) {
      archBtn.hidden = !a;
      if (a) {
        archBtn.textContent = a.archived ? "📤 Desarquivar Cartão" : "📦 Arquivar Cartão";
        archBtn.title = a.archived ? "Restaurar este cartão para as visualizações normais" : "Arquivar cartão sem excluir seus dados";
      }
    }
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

    proModalForceClose = false;
    proModalInitialSnapshot = JSON.stringify(readProCardForm());
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
    const pushAsg = (nm, tr, tm = "", ts = "", te = "") => {
      const clean = String(nm || "").trim();
      if (!clean) return;
      const k = clean.toLowerCase();
      const mode = sanitizeTravelMode(tm);
      const tStart = tr ? sanitizeTravelDateTime(ts) : "";
      const tEnd = tr ? sanitizeTravelDateTime(te) : "";
      if (seenAsg.has(k)) {
        const ex = assigneesList.find(e => e.name.toLowerCase() === k);
        if (ex) {
          if (tr) ex.travels = true;
          if (!ex.travelMode && mode) ex.travelMode = mode;
          if (!ex.travelStart && tStart) ex.travelStart = tStart;
          if (!ex.travelEnd && tEnd) ex.travelEnd = tEnd;
        }
        return;
      }
      seenAsg.add(k);
      assigneesList.push({ name: clean, travels: Boolean(tr), travelMode: mode, travelStart: tStart, travelEnd: tEnd });
    };
    const primaryName = ($("#pc-assignee")?.value || "").trim();
    const primaryTravels = Boolean($("#pc-assigneeTravels")?.checked);
    const primaryMode = sanitizeTravelMode($("#pc-primaryTravelMode")?.value);
    const primaryTStart = sanitizeTravelDateTime($("#pc-primaryTravelStart")?.value);
    const primaryTEnd = sanitizeTravelDateTime($("#pc-primaryTravelEnd")?.value);
    if (primaryName) pushAsg(primaryName, primaryTravels, primaryMode, primaryTStart, primaryTEnd);
    proModalExtraAssignees.forEach(r => pushAsg(r.name, r.travels, r.travelMode, r.travelStart, r.travelEnd));

    const travelFinanceMode = sanitizeTravelMode($("#pc-travelFinanceMode")?.value) || "diaria";
    const travelFreeLodging = Boolean($("#pc-travelFreeLodging")?.checked);
    const travelHasCost = ($("#pc-travelHasCost")?.value || "no") === "yes";
    const travelDetails = {
      tickets: proModalTickets.map(t => ({ ...t })),
      segments: proModalSegments.map(s => ({ ...s })),
      ticketFile: proModalTickets[0] ? { ...proModalTickets[0] } : null,
      transport: $("#pc-travelTransport")?.value || "",
      hasCost: travelHasCost,
      costAmount: travelHasCost ? Math.max(0, parseFloat($("#pc-travelCostAmount")?.value) || 0) : 0,
      notes: ($("#pc-travelNotes")?.value || "").trim()
    };

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
      assigneeTravelMode: assigneesList[0]?.travelMode || "",
      assigneeTravelStart: assigneesList[0]?.travelStart || "",
      assigneeTravelEnd: assigneesList[0]?.travelEnd || "",
      assigneesList,
      travelFinanceMode,
      travelFreeLodging,
      travelDetails,
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
    if (!confirm(`Excluir permanentemente o cartão "${ctx.activity?.name || "Sem título"}"?`)) return;
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
    const msg = count > 0
      ? `Excluir a lista "${target.title}" e mover ${count} cartão(ões) para "${fallback.title}"?`
      : `Excluir a lista "${target.title}"?`;
    if (!confirm(msg)) return;
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
    const title = st.title || "Projeto";
    const lines = [`*${title}*`, ""];
    cards.forEach(a => {
      const name = String(a.name || "Sem título").trim();
      const s = fmtDateShortPt(a.start);
      const e = fmtDateShortPt(a.end);
      if (s && e && e !== s) lines.push(`${s} a ${e} - ${name}`);
      else if (s) lines.push(`${s} - ${name}`);
      else lines.push(name);
    });
    return lines.join("\n").trim();
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
      "#proBoardDateTo",
      "#proBoardTripsOnlyFilter"
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

    // Deslocamentos controls
    initProFloatingTooltips();
    if ($("#btnProTravelsAddCard")) $("#btnProTravelsAddCard").onclick = () => openProCardModal();
    if ($("#btnProTravelsPrint")) $("#btnProTravelsPrint").onclick = printProTravelsReport;
    if ($("#proTravelsQuickAssignee")) {
      $("#proTravelsQuickAssignee").onchange = e => {
        proFilterAssignee = e.target.value || "";
        applyAndRenderProFilteredViews();
      };
    }
    if ($("#proTravelsScopeSel")) {
      $("#proTravelsScopeSel").onchange = e => {
        proTravelsScope = e.target.value || "travels";
        renderProTravels();
      };
    }

    // Controle Financeiro de Viagens controls
    if ($("#btnProControlAddCard")) $("#btnProControlAddCard").onclick = () => openProCardModal();
    if ($("#btnProControlGoParams")) {
      $("#btnProControlGoParams").onclick = () => {
        core?.switchProView?.("pro-params");
        setTimeout(() => $("#proTravelFinanceParamsCard")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      };
    }
    if ($("#proControlQuickAssignee")) {
      $("#proControlQuickAssignee").onchange = e => {
        proFilterAssignee = e.target.value || "";
        applyAndRenderProFilteredViews();
      };
    }
    if ($("#proControlQuickMode")) {
      $("#proControlQuickMode").onchange = e => {
        proControlQuickMode = e.target.value || "";
        renderProControl();
      };
    }
    if ($("#proControlQuickYear")) {
      $("#proControlQuickYear").onchange = e => {
        proControlQuickYear = e.target.value || "";
        proControlQuickMonth = "";
        renderProControl();
      };
    }
    if ($("#proControlQuickMonth")) {
      $("#proControlQuickMonth").onchange = e => {
        proControlQuickMonth = e.target.value || "";
        renderProControl();
      };
    }
    if ($("#btnProControlPrintSheet")) $("#btnProControlPrintSheet").onclick = printProControlSheetLandscape;
    if ($("#btnProControlExportXlsx")) $("#btnProControlExportXlsx").onclick = exportProControlXlsx;
    if ($("#btnProControlPrintReport")) $("#btnProControlPrintReport").onclick = printProControlFullReportPortrait;
    if ($("#proControlScopeSel")) {
      $("#proControlScopeSel").onchange = e => {
        proControlScope = e.target.value || "travels";
        renderProControl();
      };
    }
    $("#proControlSummarySeg")?.querySelectorAll("button").forEach(b => {
      b.onclick = () => {
        proControlSummaryTab = b.dataset.ctrlSum || "all";
        $("#proControlSummarySeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
        renderProControl();
      };
    });

    // Parâmetros Financeiros de Viagens (Forças Armadas) controls
    if ($("#proTfGratPct")) {
      $("#proTfGratPct").onchange = e => {
        const st = core.getState();
        const tf = ensureWritableTravelFinanceConfig(st);
        tf.gratRepPct = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
        core.save("🎖️ Percentual da Gratificação de Representação atualizado");
      };
    }
    if ($("#btnProTfAddRank")) {
      $("#btnProTfAddRank").onclick = () => {
        const st = core.getState();
        const tf = ensureWritableTravelFinanceConfig(st);
        tf.ranks.push({
          id: `rank_${Date.now().toString(36)}`,
          name: "Novo Posto / Graduação",
          circle: "D",
          soldo: 5000,
          irPct: 27.5
        });
        core.save("➕ Novo posto/graduação adicionado à tabela");
      };
    }
    if ($("#btnProTfResetDefaults")) {
      $("#btnProTfResetDefaults").onclick = () => {
        if (!confirm("Restaurar as tabelas padrão 2026 de Soldos, Diárias (Decreto 12.324/2024) e Localidades? Os vínculos de Posto/Graduação das pessoas serão mantidos.")) return;
        const st = core.getState();
        const prevMap = getTravelFinanceConfig(st).assigneeRanks || {};
        const def = createDefaultTravelFinanceConfig();
        def.assigneeRanks = { ...prevMap };
        if (!st.params || typeof st.params !== "object") st.params = {};
        st.params.travelFinance = def;
        core.save("↺ Tabelas padrão 2026 de Soldos e Diárias restauradas");
      };
    }
    const bindCitiesTextarea = (sel, key, label) => {
      const el = $(sel);
      if (!el) return;
      el.onchange = () => {
        const st = core.getState();
        const tf = ensureWritableTravelFinanceConfig(st);
        tf[key] = el.value.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
        core.save(`📍 Cidades da ${label} atualizadas`);
      };
    };
    bindCitiesTextarea("#proTfCitiesF1", "citiesF1", "Faixa 1");
    bindCitiesTextarea("#proTfCitiesF2", "citiesF2", "Faixa 2");

    // Modal Cartão: preview reativo da Modalidade Financeira da Viagem, datas individuais e Detalhes da Viagem
    ["#pc-start", "#pc-end", "#pc-location", "#pc-assignee", "#pc-assigneeTravels", "#pc-primaryTravelMode", "#pc-primaryTravelStart", "#pc-primaryTravelEnd", "#pc-travelFinanceMode", "#pc-travelFreeLodging"].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      el.addEventListener("change", () => {
        if ((sel === "#pc-start" || sel === "#pc-end") && proModalExtraAssignees.some(r => r.travels && (!r.travelStart || !r.travelEnd))) {
          renderProModalExtraAssignees();
        } else {
          updateProModalTravelFinancePreview();
        }
      });
      if (sel === "#pc-location") el.addEventListener("input", updateProModalTravelFinancePreview);
    });
    if ($("#pc-travelHasCost")) {
      $("#pc-travelHasCost").onchange = e => {
        if ($("#pc-travelCostWrap")) $("#pc-travelCostWrap").hidden = e.target.value !== "yes";
      };
    }
    if ($("#btnProTicketsAiUpload")) {
      $("#btnProTicketsAiUpload").onclick = () => $("#pc-ticketsAiInput")?.click();
    }
    if ($("#pc-ticketsAiInput")) {
      $("#pc-ticketsAiInput").onchange = async e => {
        const files = [...(e.target.files || [])];
        e.target.value = "";
        if (files.length) await handleProTicketsUpload(files, true);
      };
    }
    if ($("#btnProTicketsOnlyUpload")) {
      $("#btnProTicketsOnlyUpload").onclick = () => $("#pc-ticketsOnlyInput")?.click();
    }
    if ($("#pc-ticketsOnlyInput")) {
      $("#pc-ticketsOnlyInput").onchange = async e => {
        const files = [...(e.target.files || [])];
        e.target.value = "";
        if (files.length) await handleProTicketsUpload(files, false);
      };
    }
    if ($("#btnProAddSegment")) {
      $("#btnProAddSegment").onclick = () => {
        const nextLeg = proModalSegments.length === 0 ? "ida" : (proModalSegments.some(s => s.legType === "ida") ? "volta" : "conexao_ida");
        proModalSegments.push({
          id: core.uid(),
          legType: nextLeg,
          origin: "",
          destination: nextLeg === "ida" ? ($("#pc-location")?.value || "").trim() : "",
          departAt: nextLeg === "ida" ? ($("#pc-primaryTravelStart")?.value || "") : ($("#pc-primaryTravelEnd")?.value || ""),
          arriveAt: "",
          carrier: "",
          flightNumber: "",
          locator: "",
          seat: "",
          terminal: "",
          gate: "",
          transport: $("#pc-travelTransport")?.value || "Avião",
          passengerName: ($("#pc-assignee")?.value || "").trim(),
          barcodeValue: "",
          barcodeType: "QR_CODE",
          ticketId: "",
          notes: ""
        });
        proEditingSegmentIdx = proModalSegments.length - 1;
        renderProModalSegmentsList();
      };
    }

    // Parâmetros: salvar credenciais Google Wallet (Cofre AES-256-GCM do usuário)
    if ($("#btnProSaveWalletCreds")) {
      $("#btnProSaveWalletCreds").onclick = async () => {
        const issuer = ($("#proWalletIssuerInput")?.value || "").trim();
        const saJson = ($("#proWalletSaInput")?.value || "").trim();
        if (!issuer) return core.toast("⚠️ Informe o Google Wallet Issuer ID.");
        const payload = { walletIssuerId: issuer };
        if (saJson) {
          try {
            const parsed = JSON.parse(saJson);
            if (!parsed.client_email || !parsed.private_key) {
              return core.toast("⚠️ O JSON da Service Account precisa conter client_email e private_key.");
            }
            payload.walletSaJson = saJson;
          } catch {
            return core.toast("⚠️ JSON da Service Account inválido. Cole o conteúdo completo do arquivo .json do Google Cloud.");
          }
        }
        try {
          await window.FeriasApi.saveIntegrations(payload);
          if ($("#proWalletSaInput")) $("#proWalletSaInput").value = "";
          renderProParams();
          core.toast("💳 Credenciais da Carteira do Google salvas no Cofre AES-256-GCM!");
        } catch (err) {
          core.toast("❌ " + (err.message || err));
        }
      };
    }

    // Central de Documentos controls
    if ($("#proDocsSearch")) $("#proDocsSearch").oninput = () => renderProDocs();
    if ($("#btnProDocsFilterPop") && $("#proDocsFilterPopPanel")) {
      $("#btnProDocsFilterPop").onclick = () => {
        const panel = $("#proDocsFilterPopPanel");
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        $("#btnProDocsFilterPop").setAttribute("aria-expanded", String(willOpen));
        $("#btnProDocsFilterPop").classList.toggle("is-open", willOpen);
      };
    }
    if ($("#proDocsOriginFilter")) {
      $("#proDocsOriginFilter").onchange = e => {
        proDocsOrigin = e.target.value || "";
        renderProDocs();
      };
    }
    [
      "#proDocsFileTypeFilter", "#proDocsEventFilter", "#proDocsDateMode",
      "#proDocsYearFilter", "#proDocsMonthFilter", "#proDocsDateFrom", "#proDocsDateTo",
      "#proDocsColFilter", "#proDocsCardTypeFilter", "#proDocsPrioFilter",
      "#proDocsAssigneeFilter", "#proDocsClientFilter", "#proDocsHasTravelFilter",
      "#proDocsLocationFilter", "#proDocsLabelFilter", "#proDocsTagFilter", "#proDocsFinModeFilter"
    ].forEach(sel => {
      if ($(sel)) {
        $(sel).onchange = () => {
          if (sel === "#proDocsYearFilter" && $("#proDocsMonthFilter")) $("#proDocsMonthFilter").value = "";
          renderProDocs();
        };
      }
    });
    if ($("#proDocsSort")) {
      $("#proDocsSort").onchange = e => {
        proDocsSort = e.target.value || "recent";
        renderProDocs();
      };
    }
    $("#proDocsViewSeg")?.querySelectorAll("button").forEach(b => {
      b.onclick = () => {
        proDocsView = b.dataset.docView === "grid" ? "grid" : "list";
        $("#proDocsViewSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
        renderProDocs();
      };
    });
    if ($("#btnProDocsClearFilters")) $("#btnProDocsClearFilters").onclick = () => {
      if ($("#proDocsHideMinutesChk")) $("#proDocsHideMinutesChk").checked = false;
      resetProDocsFilters();
    };
    if ($("#proDocsHideMinutesChk")) $("#proDocsHideMinutesChk").onchange = () => renderProDocs();
    if ($("#btnProCardNewMinute")) {
      $("#btnProCardNewMinute").onclick = () => {
        if (!editingProCardId) {
          return core.toast("⚠️ Salve o cartão primeiro para criar Atas de Reunião vinculadas.");
        }
        window.MyPlanMinutes?.createNewMinuteForCard(editingProCardId);
      };
    }
    if ($("#btnProCardHeadSave")) {
      $("#btnProCardHeadSave").onclick = () => {
        $("#proCardForm")?.requestSubmit();
      };
    }
    if ($("#btnProCardHeadNewMinute")) {
      $("#btnProCardHeadNewMinute").onclick = () => {
        if (!editingProCardId) {
          return core.toast("⚠️ Salve o cartão primeiro (botão Salvar ao lado) para abrir uma Ata vinculada.");
        }
        window.MyPlanMinutes?.createNewMinuteForCard(editingProCardId);
      };
    }
    if ($("#btnAddMinuteTop")) {
      $("#btnAddMinuteTop").onclick = () => {
        window.MyPlanMinutes?.openStandaloneNewMinute();
      };
    }
    if ($("#btnProDocsResetInline")) $("#btnProDocsResetInline").onclick = resetProDocsFilters;

    // Modal Preview de Documento & Confirmação de Exclusão
    if ($("#btnProDocPreviewClose")) $("#btnProDocPreviewClose").onclick = () => $("#proDocPreviewModal")?.close();
    if ($("#btnProDocPreviewDone")) $("#btnProDocPreviewDone").onclick = () => $("#proDocPreviewModal")?.close();
    if ($("#btnProDocPreviewOpenCard")) {
      $("#btnProDocPreviewOpenCard").onclick = () => {
        const cid = proDocsPreviewCurrent?.cardId;
        $("#proDocPreviewModal")?.close();
        if (cid) openProCardModal(cid);
      };
    }
    if ($("#btnProDocDelClose")) $("#btnProDocDelClose").onclick = () => $("#proDocDeleteModal")?.close();
    if ($("#btnProDocDelCancel")) $("#btnProDocDelCancel").onclick = () => $("#proDocDeleteModal")?.close();
    if ($("#btnProDocDelConfirm")) $("#btnProDocDelConfirm").onclick = confirmDeleteProDoc;

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
    // Filtros unificados (Gantt / Mapa / Deslocamentos / Controle / Dashboard / Financeiro)
    const bindUnifiedFilterGroup = (prefix, clearSel) => {
      const searchEl = $(`#${prefix}Search`);
      if (searchEl) {
        searchEl.oninput = () => {
          proFilterSearch = searchEl.value || "";
          ["#proGanttSearch", "#proMapSearch", "#proTravelsSearch", "#proControlSearch", "#proDashSearch", "#proFinSearch"].forEach(s => {
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
      const tripsOnlyEl = $(`#${prefix}TripsOnlyFilter`);
      if (tripsOnlyEl) {
        tripsOnlyEl.onchange = () => {
          proFilterTripsOnly = Boolean(tripsOnlyEl.checked);
          applyAndRenderProFilteredViews();
        };
      }
      if ($(clearSel)) $(clearSel).onclick = resetProUnifiedFilters;
    };
    bindUnifiedFilterGroup("proGantt", "#btnProGanttClearFilters");
    bindUnifiedFilterGroup("proMap", "#btnProMapClearFilters");
    bindUnifiedFilterGroup("proTravels", "#btnProTravelsClearFilters");
    bindUnifiedFilterGroup("proControl", "#btnProControlClearFilters");
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
      "#proFilterDateTo",
      "#proFilterTripsOnly"
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
      $("#btnProQuickAddAssignee").onclick = async () => {
        const raw = await window.myplanPromptDialog?.({
          title: "👤 Novo Responsável",
          label: "Nome do responsável",
          placeholder: "Ex: Maria Silva",
          submitLabel: "Adicionar"
        });
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

    // Modal Cartão Trello (com detecção de alterações não salvas ao sair)
    function isProCardDirty() {
      if (proModalSaved || proModalForceClose) return false;
      try {
        return JSON.stringify(readProCardForm()) !== proModalInitialSnapshot;
      } catch {
        return false;
      }
    }
    function requestCloseProCardModal() {
      const dlg = $("#proCardModal");
      if (!dlg || !dlg.open) return;
      if (!isProCardDirty()) {
        proModalForceClose = true;
        dlg.close();
        return;
      }
      window.__myplanUnsavedTarget = "pro";
      const unsavedDlg = $("#proCardUnsavedModal");
      if (unsavedDlg && !unsavedDlg.open) {
        unsavedDlg.showModal();
      } else {
        proModalForceClose = true;
        dlg.close();
      }
    }
    if ($("#btnProCardCloseX")) $("#btnProCardCloseX").onclick = () => requestCloseProCardModal();
    if ($("#btnProCardCancel")) $("#btnProCardCancel").onclick = () => requestCloseProCardModal();
    if ($("#proCardModal")) {
      $("#proCardModal").addEventListener("cancel", e => {
        if (!proModalSaved && !proModalForceClose && isProCardDirty()) {
          e.preventDefault();
          requestCloseProCardModal();
        }
      });
      $("#proCardModal").addEventListener("close", () => {
        stopProAiRecording(true);
        const dlg = $("#proCardModal");
        if (dlg && dlg.open) return;
        if (!proModalSaved) {
          proPendingPromoteSubtask = null;
        }
        const pb = $("#proPromoteBanner");
        if (pb) { pb.hidden = true; pb.innerHTML = ""; }
      });
    }
    if ($("#btnProUnsavedDiscard")) {
      $("#btnProUnsavedDiscard").onclick = () => {
        $("#proCardUnsavedModal")?.close();
        if (window.__myplanUnsavedTarget === "personal") {
          window.__myplanUnsavedTarget = "pro";
          core.discardPersonalModalChanges?.();
          return;
        }
        proModalForceClose = true;
        $("#proCardModal")?.close();
      };
    }
    if ($("#btnProUnsavedCancel")) {
      $("#btnProUnsavedCancel").onclick = () => {
        $("#proCardUnsavedModal")?.close();
        window.__myplanUnsavedTarget = "pro";
      };
    }
    if ($("#btnProUnsavedSaveExit")) {
      $("#btnProUnsavedSaveExit").onclick = () => {
        $("#proCardUnsavedModal")?.close();
        if (window.__myplanUnsavedTarget === "personal") {
          window.__myplanUnsavedTarget = "pro";
          core.savePersonalModalFromUnsaved?.();
          return;
        }
        $("#proCardForm")?.requestSubmit();
      };
    }

    // Arquivar / Desarquivar Cartão
    if ($("#btnProCardArchive")) {
      $("#btnProCardArchive").onclick = async () => {
        const id = editingProCardId;
        if (!id) return;
        const ctx = findProCardContext(id);
        if (!ctx?.activity) return;
        if (ctx.trip?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
        const nextArch = !Boolean(ctx.activity.archived);
        ctx.activity.archived = nextArch;
        ctx.activity.archivedAt = nextArch ? new Date().toISOString() : "";
        proModalForceClose = true;
        proModalSaved = true;
        $("#proCardModal")?.close();
        await core.saveTripRecord(ctx.trip, nextArch ? `📦 Cartão "${ctx.activity.name || "Sem título"}" arquivado!` : `📤 Cartão "${ctx.activity.name || "Sem título"}" desarquivado!`);
        if ($("#proArchivedCardsModal")?.open) renderArchivedCardsModal();
        if ($("#proAllCardsModal")?.open) renderAllCardsModal();
      };
    }

    // Busca Global no Topo do Site
    (function bindGlobalCardSearch() {
      const inp = $("#globalCardSearchInput");
      const dd = $("#globalCardSearchDropdown");
      const wrap = $("#globalCardSearchWrap");
      if (!inp || !dd || inp.dataset.gsBound) return;
      inp.dataset.gsBound = "1";

      const closeDd = () => { dd.hidden = true; dd.innerHTML = ""; };
      const renderResults = () => {
        const q = (inp.value || "").trim().toLowerCase();
        if (!q) { closeDd(); return; }
        const inPersonal = isPersonalMode();
        const allCards = inPersonal && core.getPersonalAllActivities
          ? core.getPersonalAllActivities({ includeArchived: true })
          : getProSortedActivities({ includeArchived: true });
        const matches = allCards.filter(c => {
          const hay = [
            c.name || "", c.notes || "", c.client || "",
            c.location || "", c.from || "", c.to || "",
            c.assignee || "", c.columnTitle || ""
          ].join(" ").toLowerCase();
          return hay.includes(q);
        }).slice(0, 20);

        if (!matches.length) {
          dd.innerHTML = `<div class="global-search-empty">Nenhum cartão encontrado para "${core.esc(inp.value.trim())}".</div>`;
          dd.hidden = false;
          return;
        }
        dd.innerHTML = matches.map(c => {
          const hasList = Boolean(c.columnId && c.columnTitle);
          const hasDate = Boolean(c.start || c.end);
          const dtStr = hasDate
            ? `${c.start ? core.fmtBR(c.start) : ""}${c.end && c.end !== c.start ? ` → ${core.fmtBR(c.end)}` : ""}`
            : "Sem data";
          const badges = [];
          if (c.archived) badges.push(`<span class="global-search-badge is-archived">Arquivado</span>`);
          if (!hasList) badges.push(`<span class="global-search-badge is-nolist">Sem lista</span>`);
          return `<button type="button" class="global-search-item" data-gs-card="${core.esc(c.id)}">
            <div class="global-search-item-top">
              <span class="global-search-item-title">${core.esc(c.name || "Sem título")}</span>
              <span class="global-search-badges">${badges.join("")}</span>
            </div>
            <div class="global-search-item-meta">
              <span>${hasList ? `🗂️ ${core.esc(c.columnTitle)}` : "🗂️ Sem lista"}</span>
              <span>📅 ${core.esc(dtStr)}</span>
              ${c.assignee ? `<span>👤 ${core.esc(c.assignee)}</span>` : ""}
            </div>
          </button>`;
        }).join("");
        dd.hidden = false;
        dd.querySelectorAll("[data-gs-card]").forEach(btn => {
          btn.onclick = () => {
            const cid = btn.dataset.gsCard;
            closeDd();
            inp.value = "";
            if (isPersonalMode()) core.openModal(cid);
            else openProCardModal(cid);
          };
        });
      };

      inp.addEventListener("input", renderResults);
      inp.addEventListener("focus", () => { if (inp.value.trim()) renderResults(); });
      inp.addEventListener("keydown", e => {
        if (e.key === "Escape") { closeDd(); inp.blur(); }
        else if (e.key === "Enter") {
          const first = dd.querySelector("[data-gs-card]");
          if (first) { e.preventDefault(); first.click(); }
        }
      });
      document.addEventListener("click", e => {
        if (wrap && !wrap.contains(e.target)) closeDd();
      });
    })();

    // Modais: Mostrar todos os cartões & Mostrar cartões arquivados
    if ($("#btnProAllCardsClose")) $("#btnProAllCardsClose").onclick = () => $("#proAllCardsModal")?.close();
    if ($("#btnProAllCardsFooterClose")) $("#btnProAllCardsFooterClose").onclick = () => $("#proAllCardsModal")?.close();
    if ($("#proAllCardsSearch")) $("#proAllCardsSearch").oninput = () => renderAllCardsModal();
    if ($("#proAllCardsFilterSeg")) {
      $("#proAllCardsFilterSeg").querySelectorAll("button").forEach(b => {
        b.onclick = () => {
          $("#proAllCardsFilterSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
          renderAllCardsModal();
        };
      });
    }
    if ($("#btnProArchivedClose")) $("#btnProArchivedClose").onclick = () => $("#proArchivedCardsModal")?.close();
    if ($("#btnProArchivedFooterClose")) $("#btnProArchivedFooterClose").onclick = () => $("#proArchivedCardsModal")?.close();
    if ($("#proArchivedCardsSearch")) $("#proArchivedCardsSearch").oninput = () => renderArchivedCardsModal();
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
    async function uploadFilesToProCardModal(files, { isTemp = false } = {}) {
      if (!files || !files.length) return;
      const tTripId = (!$("#pc-targetTripWrap")?.hidden && $("#pc-targetTrip")?.value)
        ? $("#pc-targetTrip").value
        : (editingProTripRef?.id || core.getActiveTrip()?.id || "local");
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
          const rec = {
            ...up,
            size: up.size || f.size || 0,
            mimeType: up.mimeType || f.type || "",
            uploadedAt: up.uploadedAt || new Date().toISOString()
          };
          proModalAttachments.push(rec);
          if (isTemp && rec.id) proModalTempUploadIds.push(rec.id);
          renderProModalAttachments();
          core.toast(`📎 "${f.name}" anexado`);
        } catch (err) { core.toast("❌ " + (err.message || err)); }
      }
      if (loadEl) loadEl.hidden = true;
      if (btn) btn.disabled = false;
    }

    if ($("#btnProAttachFile")) $("#btnProAttachFile").onclick = () => $("#pc-attachInput").click();
    if ($("#pc-attachInput")) {
      $("#pc-attachInput").onchange = async e => {
        const files = [...(e.target.files || [])];
        if (!files.length) return;
        await uploadFilesToProCardModal(files, { isTemp: !editingProCardId });
        e.target.value = "";
      };
    }

    // Limpeza de uploads temporários se o modal for fechado/cancelado sem salvar
    if ($("#proCardModal")) {
      $("#proCardModal").addEventListener("close", () => {
        if (!proModalSaved && proModalTempUploadIds.length && window.FeriasApi?.deleteAttachment) {
          const toClean = proModalTempUploadIds.slice();
          proModalTempUploadIds = [];
          toClean.forEach(id => { window.FeriasApi.deleteAttachment(id).catch(() => {}); });
        }
      });
      // Permitir soltar arquivos diretamente dentro do modal de cartão já aberto
      $("#proCardModal").addEventListener("dragover", e => {
        if (e.dataTransfer?.types && [...e.dataTransfer.types].includes("Files")) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
      $("#proCardModal").addEventListener("drop", async e => {
        const files = [...(e.dataTransfer?.files || [])];
        if (!files.length) return;
        e.preventDefault();
        e.stopPropagation();
        await uploadFilesToProCardModal(files, { isTemp: !editingProCardId });
      });
    }

    // PARTE 2: Botão "Ler anexos com IA e inserir na Descrição" (preserva texto existente!)
    if ($("#btnProCardAiReadAttachments")) {
      $("#btnProCardAiReadAttachments").onclick = async () => {
        const allAtts = [...proModalAttachments, ...proModalTickets];
        if (!allAtts.length) return core.toast("📎 Anexe pelo menos 1 arquivo antes de ler com IA.");
        const btn = $("#btnProCardAiReadAttachments");
        const stEl = $("#pc-aiReadStatus");
        const origText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "⏳ Lendo anexos com IA...";
        if (stEl) {
          stEl.hidden = false;
          stEl.className = "modal-ai-status is-loading";
          stEl.innerHTML = `<span class="ai-spinner" aria-hidden="true"></span><span>Analisando ${allAtts.length} ${allAtts.length === 1 ? "anexo" : "anexos"} com Gemini AI...</span>`;
        }
        try {
          const res = await window.FeriasApi.aiSummarizeAttachments({
            cardTitle: ($("#pc-name")?.value || "").trim(),
            attachments: allAtts.map(a => ({
              id: a.id || "",
              fileName: a.fileName || a.name || "",
              mimeType: a.mimeType || "",
              isLink: Boolean(a.isLink),
              url: a.url || "",
              dataUrl: a.dataUrl || ""
            }))
          });
          const summary = String(res?.summary || "").trim();
          if (!summary) throw new Error("A IA não retornou resumo.");
          const notesEl = $("#pc-notes");
          if (notesEl) {
            const existing = notesEl.value || "";
            if (!existing.trim()) {
              notesEl.value = summary;
            } else {
              // Regra obrigatória: preserva texto existente, pula uma linha (\n\n) e inicia o resumo abaixo
              notesEl.value = existing.replace(/\s+$/, "") + "\n\n" + summary;
            }
            notesEl.scrollTop = notesEl.scrollHeight;
          }
          if (stEl) {
            stEl.className = "modal-ai-status";
            stEl.innerHTML = `✅ Resumo inserido na Descrição (${(res?.filesRead || []).length} ${(res?.filesRead || []).length === 1 ? "anexo lido" : "anexos lidos"}).`;
          }
          core.toast("✨ Resumo dos anexos inserido na Descrição!");
        } catch (err) {
          if (stEl) {
            stEl.className = "modal-ai-status is-error";
            stEl.textContent = "❌ " + (err.message || "Falha ao ler anexos com IA.");
          }
          core.toast("❌ " + (err.message || "Falha ao ler anexos com IA."));
        } finally {
          btn.disabled = (proModalAttachments.length + proModalTickets.length) === 0;
          btn.textContent = origText;
        }
      };
    }

    // PARTE 3: Botão de Encaminhar para WhatsApp no topo de cada Cartão
    if ($("#btnProCardHeadWhatsApp")) {
      $("#btnProCardHeadWhatsApp").onclick = () => {
        const title = ($("#pc-name")?.value || "").trim() || "Cartão My Plan";
        const desc = ($("#pc-notes")?.value || "").trim();
        const endIso = ($("#pc-end")?.value || "").trim();
        const parts = [`*${title}*`];
        if (desc) parts.push(desc);
        const prazoFmt = fmtDateShortPt(endIso);
        if (prazoFmt) {
          parts.push(`*Prazo:* ${prazoFmt}`);
        }
        const msg = parts.join("\n\n");
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
      };
    }

    // PARTE 5.2: Modal de Renomeação de Anexos
    if ($("#renameAttForm")) {
      const closeRen = () => { renameAttPendingCb = null; $("#renameAttModal")?.close(); };
      if ($("#btnRenameAttClose")) $("#btnRenameAttClose").onclick = closeRen;
      if ($("#btnRenameAttCancel")) $("#btnRenameAttCancel").onclick = closeRen;
      $("#renameAttForm").onsubmit = async e => {
        e.preventDefault();
        const base = ($("#renameAttInput")?.value || "").trim();
        if (!base) return core.toast("Informe um nome válido.");
        const fullName = base + (renameAttPendingExt || "");
        const cb = renameAttPendingCb;
        renameAttPendingCb = null;
        $("#renameAttModal")?.close();
        if (cb) await cb(fullName);
      };
    }

    // PARTE 1: Drag & Drop Global (funciona em qualquer tela do aplicativo)
    (function setupGlobalDragAndDrop() {
      if (window.__myplanGlobalDropBound) return;
      window.__myplanGlobalDropBound = true;
      const overlay = $("#globalDropOverlay");
      let dragDepth = 0;

      const isExternalFileDrag = e => {
        const types = e.dataTransfer?.types ? [...e.dataTransfer.types] : [];
        return types.includes("Files");
      };
      const hasBlockingModalOpen = () => Boolean(
        $("#proCardModal")?.open ||
        $("#proMinuteEditorModal")?.open ||
        $("#modal")?.open ||
        $("#authView")?.hidden === false
      );
      const showOverlay = () => {
        if (!overlay) return;
        overlay.hidden = false;
        overlay.setAttribute("aria-hidden", "false");
      };
      const hideOverlay = () => {
        dragDepth = 0;
        if (!overlay) return;
        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
      };

      window.addEventListener("dragenter", e => {
        if (!isExternalFileDrag(e)) return;
        if (hasBlockingModalOpen()) return;
        e.preventDefault();
        dragDepth++;
        showOverlay();
      }, true);

      window.addEventListener("dragover", e => {
        if (!isExternalFileDrag(e)) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        if (!hasBlockingModalOpen()) showOverlay();
      }, true);

      window.addEventListener("dragleave", e => {
        if (!isExternalFileDrag(e)) return;
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0 || (e.clientX <= 0 && e.clientY <= 0)) {
          hideOverlay();
        }
      }, true);

      window.addEventListener("drop", async e => {
        if (!isExternalFileDrag(e)) return;
        const files = [...(e.dataTransfer?.files || [])];
        hideOverlay();
        if (hasBlockingModalOpen()) return;
        e.preventDefault();
        if (!files.length) return;
        if (isPersonalMode() && core.openPersonalModalWithFiles) {
          await core.openPersonalModalWithFiles(files);
          return;
        }
        openProCardModal();
        const nameInput = $("#pc-name");
        if (nameInput && !nameInput.value.trim()) {
          const { base } = splitFileNameExt(files[0].name, false);
          nameInput.value = base || files[0].name;
        }
        await uploadFilesToProCardModal(files, { isTemp: true });
      }, true);

      window.addEventListener("blur", hideOverlay);
      window.addEventListener("keydown", e => { if (e.key === "Escape") hideOverlay(); });
    })();

    // PARTE 4: Eventos da Integração com Google Drive
    if ($("#btnProDriveConnect")) {
      $("#btnProDriveConnect").onclick = async () => {
        const clientId = window.FeriasApi?.getGoogleClientId?.() || "";
        if (!clientId) return core.toast("⚠️ Google OAuth Client ID não configurado.");
        const btn = $("#btnProDriveConnect");
        btn.disabled = true;
        btn.textContent = "⏳ Conectando...";
        try {
          const res = await window.MyPlanDrive.connect(clientId, true);
          const st = core.getState();
          st.params = st.params || {};
          st.params.drive = { ...(st.params.drive || {}), connectedEmail: res.email || "" };
          await window.FeriasApi.saveIntegrations({ driveConnectedEmail: res.email || "" }).catch(() => {});
          renderProDriveParams(st);
          core.toast(`✅ Google Drive conectado${res.email ? ` (${res.email})` : ""}!`);
        } catch (err) {
          core.toast("❌ " + (err.message || "Falha ao conectar Google Drive."));
        } finally {
          btn.disabled = false;
          btn.textContent = "🔗 Conectar Google Drive";
        }
      };
    }
    if ($("#btnProDriveDisconnect")) {
      $("#btnProDriveDisconnect").onclick = async () => {
        window.MyPlanDrive?.disconnect?.();
        const st = core.getState();
        if (st.params?.drive) st.params.drive.connectedEmail = "";
        await window.FeriasApi.saveIntegrations({ driveConnectedEmail: "" }).catch(() => {});
        renderProDriveParams(st);
        core.toast("🔌 Google Drive desconectado.");
      };
    }
    if ($("#btnProDrivePickFolder")) {
      $("#btnProDrivePickFolder").onclick = () => openDriveFolderPickerModal();
    }
    if ($("#btnDrivePickerClose")) $("#btnDrivePickerClose").onclick = () => $("#driveFolderPickerModal")?.close();
    if ($("#btnDrivePickerCancel")) $("#btnDrivePickerCancel").onclick = () => $("#driveFolderPickerModal")?.close();
    if ($("#btnDrivePickerSearch")) {
      $("#btnDrivePickerSearch").onclick = () => loadDrivePickerFolders($("#drivePickerSearch")?.value || "");
    }
    if ($("#drivePickerSearch")) {
      $("#drivePickerSearch").onkeydown = e => {
        if (e.key === "Enter") { e.preventDefault(); loadDrivePickerFolders(e.target.value || ""); }
      };
    }
    if ($("#btnProSaveDriveConfig")) {
      $("#btnProSaveDriveConfig").onclick = async () => {
        const raw = ($("#proDriveFolderInput")?.value || "").trim();
        const folderId = window.MyPlanDrive?.extractFolderId ? window.MyPlanDrive.extractFolderId(raw) : raw;
        if (raw && !folderId) {
          return core.toast("⚠️ URL ou ID de pasta do Google Drive inválido. Cole o link completo da pasta ou o ID.");
        }
        const st = core.getState();
        st.params = st.params || {};
        st.params.drive = {
          ...(st.params.drive || {}),
          folderId: folderId || "",
          folderUrl: raw || ""
        };
        const integPayload = isPersonalMode()
          ? { personalDriveFolderId: folderId || "", personalDriveFolderUrl: raw || "" }
          : { driveFolderId: folderId || "", driveFolderUrl: raw || "" };
        await window.FeriasApi.saveIntegrations(integPayload).catch(() => {});
        core.save("💾 Configuração do Google Drive salva!");
        renderProDriveParams(st);
      };
    }
    if ($("#btnProSyncDriveNow")) {
      $("#btnProSyncDriveNow").onclick = () => syncGoogleDrive();
    }
    if ($("#btnProAttachLink")) {
      $("#btnProAttachLink").onclick = async () => {
        const res = await window.myplanPromptDialog?.({
          title: "🔗 Anexar Link ao Cartão",
          label: "URL do documento, Figma, Drive ou reunião (https://...)",
          placeholder: "https://...",
          inputType: "url",
          secondLabel: "Nome curto do link (opcional)",
          secondPlaceholder: "Ex: Apresentação Q3",
          submitLabel: "Anexar Link"
        });
        if (!res || !res.value) return;
        const cleanUrl = res.value.trim();
        if (!/^https?:\/\//i.test(cleanUrl)) return core.toast("Informe um link iniciando com http:// ou https://");
        const name = (res.secondValue || "").trim() || cleanUrl.replace(/^https?:\/\//, "").slice(0, 32) || cleanUrl;
        proModalAttachments.push({ id: core.uid(), isLink: true, fileName: name, url: cleanUrl, uploadedAt: new Date().toISOString() });
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

    // Botão Reunião (Google Meet) no topo do cartão Profissional
    const syncMeetQuickActions = () => {
      const urlVal = ($("#pmeet-url")?.value || "").trim();
      const bar = $("#pmeetQuickActions");
      const joinEl = $("#btnPmeetJoin");
      const valid = /^https?:\/\//i.test(urlVal);
      if (bar) bar.hidden = !valid;
      if (joinEl && valid) joinEl.href = urlVal;
    };
    if ($("#btnProHeadMeet")) {
      $("#btnProHeadMeet").onclick = () => {
        const dlg = $("#proMeetModal");
        if (!dlg) return;
        const existingMeet = proModalAttachments.find(a => a && (a.isMeet || /meet\.google\.com/i.test(String(a.url || ""))));
        const cardTitle = ($("#pc-name")?.value || "").trim() || "Reunião";
        if ($("#pmeet-title")) $("#pmeet-title").value = existingMeet?.fileName || cardTitle;
        if ($("#pmeet-date")) $("#pmeet-date").value = existingMeet?.meetDate || $("#pc-start")?.value || "";
        if ($("#pmeet-time")) $("#pmeet-time").value = existingMeet?.meetTime || $("#pc-startTime")?.value || "";
        if ($("#pmeet-notes")) $("#pmeet-notes").value = existingMeet?.meetNotes || $("#pc-location")?.value || "";
        if ($("#pmeet-url")) $("#pmeet-url").value = existingMeet?.url || $("#pc-meetingLink")?.value || "";
        if ($("#pmeetHelperHint")) $("#pmeetHelperHint").hidden = true;
        syncMeetQuickActions();
        dlg.showModal();
      };
    }
    if ($("#pmeet-url")) $("#pmeet-url").oninput = syncMeetQuickActions;
    if ($("#btnPmeetClose")) $("#btnPmeetClose").onclick = () => $("#proMeetModal")?.close();
    if ($("#btnPmeetCancel")) $("#btnPmeetCancel").onclick = () => $("#proMeetModal")?.close();
    if ($("#btnPmeetCreateNew")) {
      $("#btnPmeetCreateNew").onclick = () => {
        window.open("https://meet.google.com/new", "_blank", "noopener");
        if ($("#pmeetHelperHint")) $("#pmeetHelperHint").hidden = false;
        setTimeout(() => $("#pmeet-url")?.focus(), 80);
      };
    }
    if ($("#btnPmeetCopy")) {
      $("#btnPmeetCopy").onclick = async () => {
        const u = ($("#pmeet-url")?.value || "").trim();
        if (!u) return;
        try { await navigator.clipboard.writeText(u); core.toast("📋 Link do Google Meet copiado!"); }
        catch { core.toast("🔗 " + u); }
      };
    }
    if ($("#btnPmeetWhatsApp")) {
      $("#btnPmeetWhatsApp").onclick = () => {
        const u = ($("#pmeet-url")?.value || "").trim();
        if (!u) return core.toast("⚠️ Informe o link do Google Meet primeiro.");
        window.open(buildMeetWhatsAppUrl({
          title: $("#pmeet-title")?.value,
          date: $("#pmeet-date")?.value,
          time: $("#pmeet-time")?.value,
          url: u
        }), "_blank", "noopener");
      };
    }
    if ($("#btnPmeetOpenMinute")) {
      $("#btnPmeetOpenMinute").onclick = () => {
        const u = ($("#pmeet-url")?.value || "").trim();
        $("#proMeetModal")?.close();
        openMinuteForMeet({
          title: $("#pmeet-title")?.value,
          date: $("#pmeet-date")?.value,
          time: $("#pmeet-time")?.value,
          url: u
        });
      };
    }
    if ($("#proMeetForm")) {
      $("#proMeetForm").onsubmit = e => {
        e.preventDefault();
        const title = ($("#pmeet-title")?.value || "").trim() || "Reunião Google Meet";
        const date = ($("#pmeet-date")?.value || "").trim();
        const time = ($("#pmeet-time")?.value || "").trim();
        const notes = ($("#pmeet-notes")?.value || "").trim();
        const url = ($("#pmeet-url")?.value || "").trim();
        if (!/^https?:\/\//i.test(url)) return core.toast("⚠️ Informe um link válido iniciando com https://");
        if ($("#pc-meetingLink")) $("#pc-meetingLink").value = url;
        const idx = proModalAttachments.findIndex(a => a && (a.isMeet || /meet\.google\.com/i.test(String(a.url || ""))));
        const rec = {
          id: idx >= 0 ? proModalAttachments[idx].id : core.uid(),
          isLink: true,
          isMeet: true,
          fileName: title,
          url,
          meetDate: date,
          meetTime: time,
          meetNotes: notes,
          uploadedAt: new Date().toISOString()
        };
        if (idx >= 0) proModalAttachments[idx] = rec;
        else proModalAttachments.unshift(rec);
        renderProModalAttachments();
        $("#proMeetModal")?.close();
        core.toast("📹 Reunião Google Meet vinculada aos Anexos/Links do cartão!");
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
        if (!id) return;
        const ctx = findProCardContext(id);
        if (!ctx) return;
        if (ctx.trip?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");
        if (!confirm(`Excluir permanentemente o cartão "${ctx.activity?.name || "Sem título"}"?`)) return;
        $("#proCardModal").close();
        ctx.data.activities = (ctx.data.activities || []).filter(x => x.id !== id);
        core.saveTripRecord(ctx.trip, "🗑️ Cartão removido");
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
          const promotedPers = completePromoteProSubtask(targetPersonalTrip);
          proModalSaved = true;
          proModalTempUploadIds = [];
          $("#proCardModal").close();
          if (editingProCardId && sourceTrip && sourceTrip.id !== targetPersonalTrip.id) {
            await core.saveTripRecord(sourceTrip, "");
          }
          await core.saveTripRecord(targetPersonalTrip, promotedPers
            ? `✅ Novo cartão criado em Pessoal e item removido do checklist original!`
            : `🌴 Cartão migrado para Pessoal ("${targetPersonalTrip.data?.title || targetPersonalTrip.name}")!`);
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
          proModalSaved = true;
          proModalTempUploadIds = [];
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
        const promoted = completePromoteProSubtask(targetTrip);
        proModalSaved = true;
        proModalTempUploadIds = [];
        $("#proCardModal").close();
        core.saveTripRecord(targetTrip, promoted
          ? "✅ Novo cartão criado e item removido do checklist original!"
          : (editingProCardId ? "💾 Cartão atualizado!" : "🗂️ Cartão adicionado!"));
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
        const allMap = getAllProTypes(st);
        const dup = Object.values(allMap).some(t => t.id.toLowerCase() === clean.toLowerCase() && t.id !== editingProTypeId);
        if (dup) {
          return core.toast(`⚠️ Já existe um tipo chamado "${clean}".`);
        }

        const iconId = (window.PRO_ICON_MAP && window.PRO_ICON_MAP[proTypePickedIcon]) ? proTypePickedIcon : "flag";
        const color = $("#pct-color")?.value || "#2563eb";
        const defaultFin = $("#pct-defaultFin")?.value || "none";
        const nextObj = { id: clean, name: clean, iconId, color, defaultFin };

        const editingItem = editingProTypeId ? allMap[editingProTypeId] : null;
        if (editingItem && editingItem.origBuiltInId) {
          if (!st.cardTypeOverrides || typeof st.cardTypeOverrides !== "object") st.cardTypeOverrides = {};
          st.cardTypeOverrides[editingItem.origBuiltInId] = { ...nextObj, hidden: false };
          if (editingProTypeId !== clean) {
            (st.activities || []).forEach(a => { if (a.type === editingProTypeId) a.type = clean; });
            if (Array.isArray(st.cardTypeOrder)) {
              st.cardTypeOrder = st.cardTypeOrder.map(id => id === editingProTypeId ? clean : id);
            }
            [proBoardTypeSet, proGanttTypeSet, proTableTypeSet].forEach(set => {
              if (set.has(editingProTypeId)) { set.delete(editingProTypeId); set.add(clean); }
            });
          }
        } else if (editingProTypeId) {
          const idx = st.customCardTypes.findIndex(t => t.id === editingProTypeId);
          if (idx >= 0) st.customCardTypes[idx] = nextObj;
          else st.customCardTypes.push(nextObj);
          if (editingProTypeId !== clean) {
            (st.activities || []).forEach(a => { if (a.type === editingProTypeId) a.type = clean; });
            if (Array.isArray(st.cardTypeOrder)) {
              st.cardTypeOrder = st.cardTypeOrder.map(id => id === editingProTypeId ? clean : id);
            }
            [proBoardTypeSet, proGanttTypeSet, proTableTypeSet].forEach(set => {
              if (set.has(editingProTypeId)) { set.delete(editingProTypeId); set.add(clean); }
            });
          }
        } else {
          st.customCardTypes.push(nextObj);
          if (Array.isArray(st.cardTypeOrder) && !st.cardTypeOrder.includes(clean)) {
            st.cardTypeOrder.push(clean);
          }
          knownProTypeIds.add(clean);
          proBoardTypeSet.add(clean);
          proGanttTypeSet.add(clean);
          proTableTypeSet.add(clean);
        }

        const cb = proTypeModalCallback;
        proTypeModalCallback = null;
        $("#proTypeModal").close();
        core.save(editingProTypeId ? `✏️ Tipo "${clean}" atualizado!` : `🧩 Tipo "${clean}" criado!`);
        if (cb) cb(nextObj);
      };
    }
  }

  const ALL_PRO_VIEWS = [
    "pro-board", "pro-gantt", "pro-timeline", "pro-map",
    "pro-travels", "pro-control", "pro-docs", "pro-dashboard",
    "pro-finance", "pro-table", "pro-params", "pro-checklist"
  ];
  const proDirtyViews = new Set();
  let proLastRenderCtx = null;
  let drivePickerMode = "professional";

  function renderSingleProView(viewId, ctx) {
    if (!ctx) return;
    switch (viewId) {
      case "pro-board": renderProBoard(); break;
      case "pro-gantt": renderProGantt(ctx.cards); break;
      case "pro-timeline": renderProTimeline(ctx.cards); break;
      case "pro-map": renderProMap(ctx.filteredCards); break;
      case "pro-travels": renderProTravels(ctx.filteredCards); break;
      case "pro-control": renderProControl(ctx.filteredCards); break;
      case "pro-docs": renderProDocs(ctx.cards); break;
      case "pro-dashboard": renderProDashboard(ctx.filteredCards, ctx.t); break;
      case "pro-finance": renderProFinance(ctx.filteredCards, ctx.t); break;
      case "pro-table": renderProTable(ctx.cards); break;
      case "pro-params": renderProParams(); break;
      case "pro-checklist": renderProChecklist(); break;
    }
  }

  function renderProViewIfDirty(viewId) {
    if (!core || !proDirtyViews.has(viewId)) return false;
    if (!proLastRenderCtx) {
      const cards = getProSortedActivities();
      const filteredCards = applyProUnifiedFilters(cards, false);
      const t = computeProTotals(filteredCards);
      proLastRenderCtx = { cards, filteredCards, t };
    }
    proDirtyViews.delete(viewId);
    renderSingleProView(viewId, proLastRenderCtx);
    return true;
  }

  function renderAll() {
    if (!core) return;
    bindProEvents();
    applyProVisibleMenusUI();
    const cards = getProSortedActivities();
    refreshProFilterOptions(cards);
    const filteredCards = applyProUnifiedFilters(cards, false);
    const t = computeProTotals(filteredCards);
    proLastRenderCtx = { cards, filteredCards, t };
    ALL_PRO_VIEWS.forEach(v => proDirtyViews.add(v));

    const activeEl = document.querySelector(".view.active");
    const activeView = activeEl && activeEl.id && activeEl.id.startsWith("view-") ? activeEl.id.slice(5) : "pro-board";
    const targetView = ALL_PRO_VIEWS.includes(activeView) ? activeView : "pro-board";
    proDirtyViews.delete(targetView);
    renderSingleProView(targetView, proLastRenderCtx);

    if ($("#proAllCardsModal")?.open) renderAllCardsModal();
    if ($("#proArchivedCardsModal")?.open) renderArchivedCardsModal();
  }

  /* ---------- INTEGRAÇÃO & SINCRONIZAÇÃO COM GOOGLE DRIVE ---------- */
  function getDriveConfig(stOpt = null) {
    const st = stOpt || core?.getState?.() || {};
    const uInteg = window.FeriasApi?.getUser?.()?.integrations || {};
    const pDrive = (st.params && st.params.drive && typeof st.params.drive === "object") ? st.params.drive : {};
    const pers = isPersonalMode();
    const uUrl = pers ? (uInteg.personalDriveFolderUrl || "") : (uInteg.driveFolderUrl || "");
    const uId = pers ? (uInteg.personalDriveFolderId || "") : (uInteg.driveFolderId || "");
    const uName = pers ? (uInteg.personalDriveFolderName || "") : (uInteg.driveFolderName || "");
    const folderUrl = pDrive.folderUrl || uUrl || "";
    const folderId = pDrive.folderId || uId || (window.MyPlanDrive?.extractFolderId ? window.MyPlanDrive.extractFolderId(folderUrl) : "");
    const connectedEmail = window.MyPlanDrive?.getConnectedEmail?.() || pDrive.connectedEmail || uInteg.driveConnectedEmail || "";
    const folderName = pDrive.folderName || uName || "";
    const lastSyncAt = pDrive.lastSyncAt || "";
    return { folderId, folderUrl, folderName, connectedEmail, lastSyncAt };
  }

  function renderProDriveParams(stOpt = null) {
    const cfg = getDriveConfig(stOpt);
    const liveConnected = Boolean(window.MyPlanDrive?.isConnected?.());
    const badge = $("#proDriveStatusBadge");
    const accInfo = $("#proDriveAccountInfo");
    const btnConn = $("#btnProDriveConnect");
    const btnDisc = $("#btnProDriveDisconnect");
    const folderInp = $("#proDriveFolderInput");
    const lastSyncEl = $("#proDriveLastSyncInfo");

    if (badge) {
      if (liveConnected || cfg.connectedEmail) {
        badge.textContent = liveConnected ? "Conectado" : "Configurado";
        badge.className = "pill ok";
      } else {
        badge.textContent = "Desconectado";
        badge.className = "pill warn";
      }
    }
    if (accInfo) {
      accInfo.textContent = cfg.connectedEmail
        ? `Conta: ${cfg.connectedEmail}${cfg.folderName ? ` · Pasta: ${cfg.folderName}` : ""}`
        : "";
    }
    if (btnConn) btnConn.textContent = (liveConnected || cfg.connectedEmail) ? "🔄 Reconectar Google Drive" : "🔗 Conectar Google Drive";
    if (btnDisc) btnDisc.hidden = !(liveConnected || cfg.connectedEmail);
    if (folderInp && document.activeElement !== folderInp) {
      folderInp.value = cfg.folderUrl || cfg.folderId || "";
    }
    if (lastSyncEl) {
      lastSyncEl.textContent = cfg.lastSyncAt
        ? `Última sincronização: ${new Date(cfg.lastSyncAt).toLocaleString("pt-BR")}`
        : "";
    }
  }

  async function loadDrivePickerFolders(queryText = "") {
    const listEl = $("#drivePickerList");
    if (!listEl) return;
    const clientId = window.FeriasApi?.getGoogleClientId?.() || "";
    if (!clientId) {
      listEl.innerHTML = `<div class="muted small" style="padding:12px">Google OAuth Client ID não configurado.</div>`;
      return;
    }
    listEl.innerHTML = `<div class="muted small" style="padding:12px">⏳ Carregando pastas do seu Google Drive...</div>`;
    try {
      const folders = await window.MyPlanDrive.listFolders(clientId, queryText);
      if (!folders.length) {
        listEl.innerHTML = `<div class="muted small" style="padding:12px">Nenhuma pasta encontrada.</div>`;
        return;
      }
      listEl.innerHTML = folders.map(f => `
        <button type="button" class="drive-picker-item" data-dp-id="${core.esc(f.id)}" data-dp-name="${core.esc(f.name)}" data-dp-url="${core.esc(f.webViewLink || "")}">
          <span class="drive-picker-ico">📁</span>
          <span class="drive-picker-main">
            <strong>${core.esc(f.name)}</strong>
            <small class="muted">${core.esc(f.id)}</small>
          </span>
        </button>`).join("");
      listEl.querySelectorAll("[data-dp-id]").forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.dpId;
          const name = btn.dataset.dpName || "";
          const url = btn.dataset.dpUrl || `https://drive.google.com/drive/folders/${id}`;
          const st = core.getState();
          st.params = st.params || {};
          st.params.drive = { ...(st.params.drive || {}), folderId: id, folderName: name, folderUrl: url };
          if (drivePickerMode === "personal") {
            if ($("#personalDriveFolderInput")) $("#personalDriveFolderInput").value = url;
            await window.FeriasApi.saveIntegrations({ personalDriveFolderId: id, personalDriveFolderName: name, personalDriveFolderUrl: url }).catch(() => {});
            core.save(`📂 Pasta "${name}" selecionada para o Google Drive Pessoal!`);
            core.renderPersonalDriveParams?.();
          } else {
            if ($("#proDriveFolderInput")) $("#proDriveFolderInput").value = url;
            await window.FeriasApi.saveIntegrations({ driveFolderId: id, driveFolderName: name, driveFolderUrl: url }).catch(() => {});
            core.save(`📂 Pasta "${name}" selecionada para o Google Drive!`);
            renderProDriveParams(st);
          }
          $("#driveFolderPickerModal")?.close();
        };
      });
    } catch (err) {
      listEl.innerHTML = `<div class="auth-error" style="margin:8px">❌ ${core.esc(err.message || "Falha ao listar pastas.")}</div>`;
    }
  }

  function openDriveFolderPickerModal(modeOpt = null) {
    const dlg = $("#driveFolderPickerModal");
    if (!dlg) return;
    drivePickerMode = (modeOpt === "personal" || modeOpt === "professional")
      ? modeOpt
      : (isPersonalMode() ? "personal" : "professional");
    if ($("#drivePickerSearch")) $("#drivePickerSearch").value = "";
    dlg.showModal();
    loadDrivePickerFolders("");
  }

  let driveSyncRunning = false;
  async function syncGoogleDrive() {
    if (driveSyncRunning) return core.toast("⏳ Sincronização com o Google Drive já está em andamento...");
    const trip = core.getActiveTrip?.();
    if (!trip || !trip.data) return core.toast("⚠️ Nenhum planejamento ativo para sincronizar.");
    const pers = isPersonalMode();
    const cfg = getDriveConfig(trip.data);
    const rootFolderId = cfg.folderId || (window.MyPlanDrive?.extractFolderId ? window.MyPlanDrive.extractFolderId(cfg.folderUrl) : "");
    if (!rootFolderId) {
      core.toast("⚙️ Configure a pasta raiz do Google Drive em Parâmetros primeiro.");
      if (pers) {
        if (core.switchAppView) core.switchAppView("params");
        setTimeout(() => $("#personalDriveParamsPanel")?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
      } else {
        if (core.switchProView) core.switchProView("pro-params");
        setTimeout(() => $("#proDriveParamsPanel")?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
      }
      return;
    }
    const clientId = window.FeriasApi?.getGoogleClientId?.() || "";
    if (!clientId) return core.toast("⚠️ Google OAuth Client ID não configurado.");

    driveSyncRunning = true;
    const syncBtn = pers ? $("#btnPersonalSyncDriveNow") : $("#btnProSyncDriveNow");
    const syncOrigText = syncBtn ? syncBtn.textContent : "";
    if (syncBtn) { syncBtn.disabled = true; syncBtn.textContent = "⏳ Sincronizando..."; }
    core.toast("☁️ Sincronizando cartões com o Google Drive...");
    try {
      const result = await window.MyPlanDrive.syncProjectToDrive({
        clientId,
        rootFolderId,
        trip,
        columns: pers ? (trip.data.personalColumns || []) : (trip.data.columns || getMergedColumns()),
        labels: pers ? [] : (trip.data.labels || getMergedLabels()),
        resolveDocHref,
        onProgress: ({ step, total, cardName }) => {
          core.toast(`☁️ Sincronizando Google Drive (${step}/${total}): ${String(cardName || "").slice(0, 32)}...`);
        }
      });
      trip.data.params = trip.data.params || {};
      trip.data.params.drive = {
        ...(trip.data.params.drive || {}),
        folderId: result.rootFolderId,
        folderName: result.rootFolderName || cfg.folderName || "",
        lastSyncAt: result.syncedAt,
        connectedEmail: window.MyPlanDrive?.getConnectedEmail?.() || cfg.connectedEmail || ""
      };
      await core.saveTripRecord(trip, "");
      if (pers) core.renderPersonalDriveParams?.();
      else renderProDriveParams(trip.data);
      const warnBit = result.failedFiles ? ` (${result.failedFiles} anexo(s) indisponível(is))` : "";
      core.toast(`✅ Google Drive atualizado com sucesso! (${result.syncedCards} ${result.syncedCards === 1 ? "cartão" : "cartões"}, ${result.syncedFiles} arquivos)${warnBit}`);
    } catch (err) {
      core.toast("❌ " + (err.message || "Falha ao sincronizar com o Google Drive."));
    } finally {
      driveSyncRunning = false;
      if (syncBtn) { syncBtn.disabled = false; syncBtn.textContent = syncOrigText || "🔄 Atualizar Google Drive"; }
    }
  }

  /* ---------- MOSTRAR TODOS OS CARTÕES & CARTÕES ARQUIVADOS ---------- */
  function renderAllCardsModal() {
    const tbl = $("#proAllCardsTable");
    const emptyEl = $("#proAllCardsEmpty");
    const countEl = $("#proAllCardsCount");
    if (!tbl) return;
    const q = ($("#proAllCardsSearch")?.value || "").trim().toLowerCase();
    const filterMode = $("#proAllCardsFilterSeg")?.querySelector("button.active")?.dataset?.allFilter || "all";
    const inPersonal = isPersonalMode();
    const labelsMap = new Map(getMergedLabels().map(l => [l.id, l]));

    const allActive = (inPersonal && core.getPersonalAllActivities)
      ? core.getPersonalAllActivities({ includeArchived: false })
      : getProSortedActivities({ includeArchived: false });
    const filtered = allActive.filter(c => {
      const hasList = Boolean(c.columnId && c.columnTitle);
      const hasDate = Boolean(c.start || c.end);
      if (filterMode === "no_list" && hasList) return false;
      if (filterMode === "no_date" && hasDate) return false;
      if (filterMode === "orphan" && (hasList || hasDate)) return false;
      if (q) {
        const asgNames = getCardAssigneesList(c).map(e => e.name).join(" ");
        const lblNames = (Array.isArray(c.labels) ? c.labels : []).map(id => labelsMap.get(id)?.name || "").join(" ");
        const hay = [c.name || "", c.notes || "", c.columnTitle || "", c.location || "", c.from || "", c.to || "", asgNames, lblNames, c.client || ""].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (countEl) countEl.textContent = `${filtered.length} ${filtered.length === 1 ? "cartão" : "cartões"}`;
    if (!filtered.length) {
      tbl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    tbl.innerHTML = `
      <thead>
        <tr>
          <th>Título do Cartão</th>
          <th>Lista</th>
          <th>Datas</th>
          <th>Responsável(is)</th>
          <th>Etiquetas</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(c => {
          const hasList = Boolean(c.columnId && c.columnTitle);
          const hasDate = Boolean(c.start || c.end);
          const dtTxt = hasDate
            ? `${c.start ? core.fmtBR(c.start) : ""}${c.end && c.end !== c.start ? ` → ${core.fmtBR(c.end)}` : ""}`
            : "";
          const asgs = getCardAssigneesList(c).map(e => e.name).filter(Boolean);
          const asgHtml = asgs.length
            ? asgs.slice(0, 3).map(nm => {
                const col = colorForAssignee(nm);
                return `<span class="pro-assignee-badge pro-ctrl-asg-compact" style="--asg-bg:${col.bg};--asg-fg:${col.fg};--asg-bd:${col.bd}">${core.esc(nm)}</span>`;
              }).join(" ")
            : `<span class="muted small">—</span>`;
          const lbls = (Array.isArray(c.labels) ? c.labels : []).map(id => labelsMap.get(id)).filter(Boolean);
          const lblHtml = lbls.length
            ? lbls.slice(0, 3).map(l => `<span class="pro-doc-lbl-pill" style="--lc:${core.esc(l.color || "#2563eb")}">${core.esc(l.name)}</span>`).join(" ")
            : `<span class="muted small">—</span>`;
          return `<tr data-all-card="${core.esc(c.id)}">
            <td><strong>${core.esc(c.name || "Sem título")}</strong>${c.client ? `<div class="muted small">${core.esc(c.client)}</div>` : ""}</td>
            <td>${hasList ? `<span class="pill">${core.esc(c.columnTitle)}</span>` : `<span class="global-search-badge is-nolist">Sem lista</span>`}</td>
            <td class="nowrap">${hasDate ? core.esc(dtTxt) : `<span class="global-search-badge">Sem data</span>`}</td>
            <td>${asgHtml}</td>
            <td>${lblHtml}</td>
          </tr>`;
        }).join("")}
      </tbody>`;

    tbl.querySelectorAll("[data-all-card]").forEach(tr => {
      tr.onclick = () => {
        if (isPersonalMode()) core.openModal(tr.dataset.allCard);
        else openProCardModal(tr.dataset.allCard);
      };
    });
  }

  function openAllCardsModal() {
    const dlg = $("#proAllCardsModal");
    if (!dlg) return;
    if ($("#proAllCardsSearch")) $("#proAllCardsSearch").value = "";
    $("#proAllCardsFilterSeg")?.querySelectorAll("button").forEach(b => {
      b.classList.toggle("active", b.dataset.allFilter === "all");
    });
    renderAllCardsModal();
    dlg.showModal();
  }

  function renderArchivedCardsModal() {
    const listEl = $("#proArchivedCardsList");
    const emptyEl = $("#proArchivedCardsEmpty");
    const countEl = $("#proArchivedCardsCount");
    if (!listEl) return;
    const inPersonal = isPersonalMode();
    const q = ($("#proArchivedCardsSearch")?.value || "").trim().toLowerCase();
    const archivedList = (inPersonal && core.getPersonalAllActivities)
      ? core.getPersonalAllActivities({ onlyArchived: true })
      : getProSortedActivities({ onlyArchived: true });
    const archived = archivedList.filter(c => {
      if (!q) return true;
      const hay = [c.name || "", c.notes || "", c.columnTitle || "", c.location || "", c.from || "", c.to || "", c.assignee || "", c.client || ""].join(" ").toLowerCase();
      return hay.includes(q);
    });

    if (countEl) countEl.textContent = `${archived.length} ${archived.length === 1 ? "arquivado" : "arquivados"}`;
    if (!archived.length) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    listEl.innerHTML = archived.map(c => {
      const archDate = c.archivedAt ? new Date(c.archivedAt).toLocaleDateString("pt-BR") : "";
      const hasList = Boolean(c.columnId && c.columnTitle);
      const dtStr = (c.start || c.end)
        ? `${c.start ? core.fmtBR(c.start) : ""}${c.end && c.end !== c.start ? ` → ${core.fmtBR(c.end)}` : ""}`
        : "Sem data";
      return `<div class="pro-archived-row">
        <div class="pro-archived-main" data-arch-open="${core.esc(c.id)}" title="Clique para visualizar ou editar">
          <strong>${core.esc(c.name || "Sem título")}</strong>
          <div class="muted small">
            ${hasList ? `🗂️ ${core.esc(c.columnTitle)}` : "🗂️ Sem lista"} · 📅 ${core.esc(dtStr)}${archDate ? ` · Arquivado em ${core.esc(archDate)}` : ""}
          </div>
        </div>
        <div class="pro-archived-actions">
          <button type="button" class="btn ghost small" data-arch-open="${core.esc(c.id)}">👁️ Abrir</button>
          <button type="button" class="btn primary small" data-arch-restore="${core.esc(c.id)}">📤 Desarquivar</button>
          <button type="button" class="btn danger-ghost small" data-arch-del="${core.esc(c.id)}">🗑️ Excluir</button>
        </div>
      </div>`;
    }).join("");

    listEl.querySelectorAll("[data-arch-open]").forEach(el => {
      el.onclick = () => {
        if (isPersonalMode()) core.openModal(el.dataset.archOpen);
        else openProCardModal(el.dataset.archOpen);
      };
    });
    listEl.querySelectorAll("[data-arch-restore]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.archRestore;
        if (isPersonalMode() && core.unarchivePersonalCard) {
          await core.unarchivePersonalCard(id);
          renderArchivedCardsModal();
          return;
        }
        const ctx = findProCardContext(id);
        if (!ctx?.activity) return;
        if (ctx.trip?.role === "viewer") return core.toast("👁️ Somente visualização.");
        ctx.activity.archived = false;
        ctx.activity.archivedAt = "";
        await core.saveTripRecord(ctx.trip, `📤 Cartão "${ctx.activity.name || "Sem título"}" desarquivado!`);
        renderArchivedCardsModal();
      };
    });
    listEl.querySelectorAll("[data-arch-del]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.archDel;
        if (isPersonalMode() && core.deletePersonalCardPermanent) {
          if (!confirm("Excluir definitivamente este cartão arquivado? Esta ação não pode ser desfeita.")) return;
          await core.deletePersonalCardPermanent(id);
          renderArchivedCardsModal();
          return;
        }
        const ctx = findProCardContext(id);
        if (!ctx?.activity) return;
        if (ctx.trip?.role === "viewer") return core.toast("👁️ Somente visualização.");
        if (!confirm(`Excluir definitivamente o cartão arquivado "${ctx.activity.name || "Sem título"}"? Esta ação não pode ser desfeita.`)) return;
        ctx.data.activities = (ctx.data.activities || []).filter(x => x.id !== id);
        await core.saveTripRecord(ctx.trip, "🗑️ Cartão arquivado excluído definitivamente.");
        renderArchivedCardsModal();
      };
    });
  }

  function openArchivedCardsModal() {
    const dlg = $("#proArchivedCardsModal");
    if (!dlg) return;
    if ($("#proArchivedCardsSearch")) $("#proArchivedCardsSearch").value = "";
    renderArchivedCardsModal();
    dlg.showModal();
  }

  window.MyPlanPro = {
    init(c) {
      core = c;
      bindProEvents();
      if (window.MyPlanMinutes?.init) {
        window.MyPlanMinutes.init({
          core,
          findCardContext: findProCardContext,
          getSortedActivities: getProSortedActivities,
          getMergedColumns,
          getAllAssignees: getAllProAssignees,
          openCardModal: openProCardModal,
          openDocPreview: openProDocPreviewModal,
          openRenameAttachment: openRenameAttachmentModal,
          resolveDocHref
        });
      }
    },
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
    renderProTravels,
    renderProControl,
    renderProDocs,
    renderProBoard,
    buildProSummaryHTML,
    openProCardModal,
    exportProXlsx,
    buildProWhatsAppText,
    syncGoogleDrive,
    openAllCardsModal,
    openArchivedCardsModal,
    openRenameAttachmentModal,
    openDriveFolderPickerModal,
    renderProViewIfDirty
  };
})();
