/* ===== Modo Profissional (Quadro Trello, Gantt Avançado, Fluxo de Caixa & Parâmetros) — My Plan ===== */
(function () {
  let core = null;
  let proInitialized = false;

  const proOriginMap = new WeakMap();
  const COVER_SWATCHES = ["", "#1d4ed8", "#0284c7", "#0ea5e9", "#10b981", "#6366f1", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b"];

  let proBoardTypeSet = new Set(Object.keys(window.PRO_ACTIVITY_TYPES || {}));
  let proBoardLabelSet = new Set();
  let proBoardTypeMsel = null;
  let proBoardLabelMsel = null;

  let proGanttTypeSet = new Set(Object.keys(window.PRO_ACTIVITY_TYPES || {}));
  let proGanttColSet = new Set();
  let proGanttTagSet = new Set();
  let proDateFrom = "";
  let proDateTo = "";
  let proGanttTypeMsel = null;
  let proGanttColMsel = null;
  let proGanttTagMsel = null;
  let proDashTypeMsel = null;
  let proDashTagMsel = null;
  let proFinTypeMsel = null;
  let proFinTagMsel = null;
  let proGanttMode = "gantt";
  let proGanttGroup = "none";
  let proGanttZoom = window.innerWidth < 720 ? 42 : 48;
  let proGanttSlimRail = window.innerWidth < 720;
  const collapsedGanttGroups = new Set();

  let proTableColSet = new Set();
  let proTableTypeSet = new Set(Object.keys(window.PRO_ACTIVITY_TYPES || {}));
  let proTableTagSet = new Set();
  let proTableColMsel = null;
  let proTableTypeMsel = null;
  let proTableTagMsel = null;

  let proFinFilter = "all";
  let proCheckFilter = "";

  // Estado do modal de cartão Trello
  let editingProCardId = null;
  let editingProTripRef = null;
  let proModalDraftId = "";
  let proModalAttachments = [];
  let proModalSubtasks = [];
  let proModalLabels = [];
  let proModalCoverColor = "";
  let proModalTagsMsel = null;
  let proModalDraftTags = [];
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

    const merged = {
      mode: "professional",
      title: s.title || def.title,
      customTags: Array.isArray(s.customTags)
        ? [...new Set(s.customTags.map(t => String(t || "").trim()).filter(Boolean))]
        : [],
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
      if (!a.start) a.start = today;
      if (!a.end || a.end < a.start) a.end = a.start;
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
      a.location = String(a.location || "");
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
      if (!a.finDueDate) a.finDueDate = a.end || a.start;
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
      String(a.start || "").localeCompare(String(b.start || "")) ||
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
    if (proBoardTypeMsel) proBoardTypeMsel.setOptions(typeItems, [...proBoardTypeSet]);
    if (proBoardLabelMsel) proBoardLabelMsel.setOptions(labelItems, [...proBoardLabelSet]);

    // Gantt, Dashboard e Financeiro — Filtros Unificados (Tipo, Tag e Período)
    const onTypeChange = ids => { proGanttTypeSet = new Set(ids); applyAndRenderProFilteredViews(); };
    const onTagChange = ids => { proGanttTagSet = new Set(ids); applyAndRenderProFilteredViews(); };
    const typeOptCfg = {
      minSelected: 0,
      allLabel: "☑️ Todos",
      noneLabel: "✕ Nenhum",
      getLabel: (sel, all) => sel.length === 0 ? "Tipo: Nenhum" : (sel.length === all.length ? "Tipo: Todos" : `Tipos (${sel.length})`),
      onChange: onTypeChange
    };
    const tagOptCfg = {
      minSelected: 0,
      allLabel: "☑️ Todas",
      noneLabel: "✕ Limpar",
      getLabel: sel => sel.length ? `Tags (${sel.length})` : "Tag: Todas",
      isHighlighted: sel => sel.length > 0,
      onChange: onTagChange
    };
    if (!proGanttTypeMsel && $("#proGanttTypeFilter")) proGanttTypeMsel = core.createMultiSelect($("#proGanttTypeFilter"), typeOptCfg);
    if (!proDashTypeMsel && $("#proDashTypeFilter")) proDashTypeMsel = core.createMultiSelect($("#proDashTypeFilter"), typeOptCfg);
    if (!proFinTypeMsel && $("#proFinTypeFilter")) proFinTypeMsel = core.createMultiSelect($("#proFinTypeFilter"), typeOptCfg);
    if (!proGanttColMsel && $("#proGanttColFilter")) {
      proGanttColMsel = core.createMultiSelect($("#proGanttColFilter"), {
        minSelected: 0,
        allLabel: "☑️ Todas",
        noneLabel: "✕ Limpar",
        getLabel: sel => sel.length ? `Listas (${sel.length})` : "Lista: Todas",
        isHighlighted: sel => sel.length > 0,
        onChange: ids => { proGanttColSet = new Set(ids); renderProGantt(); renderProTimeline(); }
      });
    }
    if (!proGanttTagMsel && $("#proGanttTagFilter")) proGanttTagMsel = core.createMultiSelect($("#proGanttTagFilter"), tagOptCfg);
    if (!proDashTagMsel && $("#proDashTagFilter")) proDashTagMsel = core.createMultiSelect($("#proDashTagFilter"), tagOptCfg);
    if (!proFinTagMsel && $("#proFinTagFilter")) proFinTagMsel = core.createMultiSelect($("#proFinTagFilter"), tagOptCfg);

    [proGanttTypeMsel, proDashTypeMsel, proFinTypeMsel].forEach(m => { if (m) m.setOptions(typeItems, [...proGanttTypeSet]); });
    if (proGanttColMsel) proGanttColMsel.setOptions(colItems, [...proGanttColSet]);
    [proGanttTagMsel, proDashTagMsel, proFinTagMsel].forEach(m => { if (m) m.setOptions(tagItems, [...proGanttTagSet]); });
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
    if (proTableTagMsel) proTableTagMsel.setOptions(tagItems, [...proTableTagSet]);
  }

  function formatProFinShort(a) {
    const val = Number(a.actualAmount) > 0 ? Number(a.actualAmount) : (Number(a.amount) || 0);
    if (val <= 0) return "";
    if (a.finDirection === "income") return `+${core.money(val)}`;
    if (a.finDirection === "expense") return `-${core.money(val)}`;
    return "";
  }

  /* ---------- 1. QUADRO KANBAN ESTILO TRELLO ---------- */
  function syncProBoardFilterUI() {
    const totalTypes = Object.keys(getAllProTypes()).length;
    const q = ($("#proBoardSearch")?.value || "").trim();
    const prio = $("#proBoardPrioFilter")?.value || "";
    const activeCount = (q ? 1 : 0)
      + (proBoardTypeSet.size < totalTypes ? 1 : 0)
      + (proBoardLabelSet.size > 0 ? 1 : 0)
      + (prio ? 1 : 0);
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
    proBoardTypeSet = new Set(Object.keys(getAllProTypes()));
    proBoardLabelSet.clear();
    if ($("#proBoardSearch")) $("#proBoardSearch").value = "";
    if ($("#proBoardPrioFilter")) $("#proBoardPrioFilter").value = "";
    if (proBoardTypeMsel) proBoardTypeMsel.setSelected([...proBoardTypeSet]);
    if (proBoardLabelMsel) proBoardLabelMsel.setSelected([]);
    renderProBoard();
  }

  function renderProBoard() {
    const board = $("#proBoard");
    if (!board) return;
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

    const q = ($("#proBoardSearch")?.value || "").trim().toLowerCase();
    const prioFilter = $("#proBoardPrioFilter")?.value || "";
    const cols = getMergedColumns();
    const labels = getMergedLabels();
    const labelMap = new Map(labels.map(l => [l.id, l]));
    const today = core.fmtISO(new Date());
    const soon = core.fmtISO(new Date(Date.now() + 3 * core.DAY));

    const allCards = getProSortedActivities().filter(a => {
      if (!proBoardTypeSet.has(a.type)) return false;
      if (proBoardLabelSet.size > 0 && !(Array.isArray(a.labels) && a.labels.some(id => proBoardLabelSet.has(id)))) return false;
      if (prioFilter && a.priority !== prioFilter) return false;
      if (q) {
        const hay = `${a.name} ${a.type} ${a.client || ""} ${a.assignee || ""} ${a.notes || ""} ${(a.tags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    board.innerHTML = cols.map(col => {
      const colCards = allCards
        .filter(c => Boolean(c.columnId) && (c.columnId === col.id || (!cols.some(x => x.id === c.columnId) && col === cols[0])))
        .slice()
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.start).localeCompare(String(b.start)));

      const cardsHtml = colCards.map(c => {
        const info = getProTypeInfo(c.type);
        const done = isCardDone(c, cols);
        const due = c.end || c.start;
        let dueCls = "";
        if (done) dueCls = "due-ok";
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
          ${(c.client || c.assignee || c.startTime || c.location) ? `<div class="pro-card-sub">
            ${c.client ? `<span>🏢 ${core.esc(c.client)}</span>` : ""}
            ${c.assignee ? `<span>👤 ${core.esc(c.assignee)}</span>` : ""}
            ${c.startTime ? `<span>🕒 ${core.esc(c.startTime)}</span>` : ""}
          </div>` : ""}
          <div class="pro-card-meta">
            <span class="pro-due-chip ${dueCls}">📅 ${core.fmtShortBR(c.start)}${c.end && c.end !== c.start ? `–${core.fmtShortBR(c.end)}` : ""}</span>
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
  function hasActiveProFilters() {
    const totalTypes = Object.keys(getAllProTypes()).length;
    return proGanttTypeSet.size < totalTypes || proGanttColSet.size > 0 || proGanttTagSet.size > 0 || Boolean(proDateFrom) || Boolean(proDateTo);
  }

  function applyProUnifiedFilters(allCards, includeCol = false) {
    return (allCards || []).filter(a => {
      if (!proGanttTypeSet.has(a.type)) return false;
      if (includeCol && proGanttColSet.size > 0) {
        const colKey = a.columnId || "__none__";
        if (!proGanttColSet.has(colKey)) return false;
      }
      if (proGanttTagSet.size > 0 && !(Array.isArray(a.tags) && a.tags.some(t => proGanttTagSet.has(t)))) return false;
      if (proDateFrom && (a.end || a.start) < proDateFrom) return false;
      if (proDateTo && a.start > proDateTo) return false;
      return true;
    });
  }

  function syncProFilterUIs() {
    const typesArr = [...proGanttTypeSet];
    const tagsArr = [...proGanttTagSet];
    [proGanttTypeMsel, proDashTypeMsel, proFinTypeMsel].forEach(m => { if (m) m.setSelected(typesArr); });
    [proGanttTagMsel, proDashTagMsel, proFinTagMsel].forEach(m => { if (m) m.setSelected(tagsArr); });
    ["#proGanttDateFrom", "#proDashDateFrom", "#proFinDateFrom"].forEach(sel => {
      if ($(sel) && $(sel).value !== proDateFrom) $(sel).value = proDateFrom;
    });
    ["#proGanttDateTo", "#proDashDateTo", "#proFinDateTo"].forEach(sel => {
      if ($(sel) && $(sel).value !== proDateTo) $(sel).value = proDateTo;
    });
    const dirty = hasActiveProFilters();
    ["#btnProGanttClearFilters", "#btnProDashClearFilters", "#btnProFinClearFilters"].forEach(sel => {
      if ($(sel)) $(sel).hidden = !dirty;
    });
    const totalTypes = Object.keys(getAllProTypes()).length;
    const ganttCount = (proGanttTypeSet.size < totalTypes ? 1 : 0)
      + (proGanttColSet.size > 0 ? 1 : 0)
      + (proGanttTagSet.size > 0 ? 1 : 0)
      + ((proDateFrom || proDateTo) ? 1 : 0);
    const dashFinCount = (proGanttTypeSet.size < totalTypes ? 1 : 0)
      + (proGanttTagSet.size > 0 ? 1 : 0)
      + ((proDateFrom || proDateTo) ? 1 : 0);
    [
      ["#btnProGanttFilterPop", "#proGanttFilterCount", ganttCount],
      ["#btnProDashFilterPop", "#proDashFilterCount", dashFinCount],
      ["#btnProFinFilterPop", "#proFinFilterCount", dashFinCount]
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
    const filteredCards = applyProUnifiedFilters(cards, false);
    const t = computeProTotals(filteredCards);
    renderProGantt(cards);
    renderProTimeline(cards);
    renderProDashboard(filteredCards, t);
    renderProFinance(filteredCards, t);
  }

  function resetProUnifiedFilters() {
    proGanttTypeSet = new Set(Object.keys(getAllProTypes()));
    proGanttColSet.clear();
    proGanttTagSet.clear();
    proDateFrom = "";
    proDateTo = "";
    if (proGanttColMsel) proGanttColMsel.setSelected([]);
    applyAndRenderProFilteredViews();
  }

  function getFilteredProGanttRows(allSorted) {
    return applyProUnifiedFilters(allSorted || getProSortedActivities(), true);
  }

  function getProUnifiedFilteredItems() {
    const all = core.buildUnifiedItems();
    const unifiedState = core.getUnifiedState ? core.getUnifiedState() : { unified: true, conflictsOnly: false };
    const proTotal = Object.keys(getAllProTypes()).length;
    const proPartial = proGanttTypeSet.size < proTotal;
    const filtered = all.filter(it => {
      const meta = core.unifiedMetaMap?.get(it);
      if (!meta) return false;
      if (unifiedState.conflictsOnly && !core.unifiedConflictMap?.has(it)) return false;
      if (meta.mode === "professional") {
        if (!proGanttTypeSet.has(it.type)) return false;
        if (proGanttColSet.size > 0 && !proGanttColSet.has(it.columnId || "__none__")) return false;
      } else {
        if (proGanttColSet.size > 0) return false;
        if (proPartial && !proGanttTypeSet.has(it.type)) return false;
      }
      if (proGanttTagSet.size > 0 && !(Array.isArray(it.tags) && it.tags.some(tg => proGanttTagSet.has(tg)))) return false;
      if (proDateFrom && (it.end || it.start) < proDateFrom) return false;
      if (proDateTo && it.start > proDateTo) return false;
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
      Object.values(getAllProTypes()).forEach(tp => {
        const items = s.filter(a => a.type === tp.id);
        if (!items.length) return;
        const gid = `type:${tp.id}`;
        renderItems.push({ kind: "group", gid, label: tp.short, iconHtml: tp.iconHtml, count: items.length, color: tp.color || "#2563eb" });
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
        h += `<div class="g-group-corner" style="grid-column:1;grid-row:${row};border-left:3px solid ${core.esc(entry.color || "#2563eb")}" data-pgroup-toggle="${core.esc(entry.gid)}">
          <span>${isCollapsed ? "▸" : "▾"} ${proGanttSlimRail ? "" : `${entry.iconHtml ? entry.iconHtml + " " : ""}${core.esc(entry.label)}`}</span>
          <span class="pill" style="padding:1px 6px;font-size:0.68rem">${entry.count}</span>
        </div>`;
        h += `<div class="g-group-band" style="grid-column:2 / span ${n};grid-row:${row}">${proGanttSlimRail ? core.esc(entry.label) : ""}</div>`;
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
      el.onclick = () => {
        const gid = el.dataset.pgroupToggle;
        if (collapsedGanttGroups.has(gid)) collapsedGanttGroups.delete(gid);
        else collapsedGanttGroups.add(gid);
        renderProGantt();
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

  /* ---------- 3. DASHBOARD EXECUTIVO ---------- */
  function renderProDashboard(allCardsOpt, tOpt) {
    const cards = allCardsOpt || getProSortedActivities();
    const t = tOpt || computeProTotals(cards);
    const st = core.getState();
    const revTarget = Number(st.params?.revenueTarget) || 0;
    const costBudget = Number(st.params?.costBudget) || 0;
    const today = core.fmtISO(new Date());

    const kpisEl = $("#proDashKpis");
    if (kpisEl) {
      const netColor = t.netPlanned >= 0 ? "#10b981" : "#f87171";
      kpisEl.innerHTML = [
        ["Recebimentos Previstos", core.money(t.totalIncome), `Liquidado: ${core.money(t.receivedIncome)}${revTarget > 0 ? ` · Meta ${Math.round(t.totalIncome / revTarget * 100)}%` : ""}`, "#10b981"],
        ["Despesas & Custos", core.money(t.totalExpense), `Pago: ${core.money(t.paidExpense)}${costBudget > 0 ? ` · Teto ${core.money(costBudget)}` : ""}`, "#ef4444"],
        ["Saldo Líquido Projetado", core.money(t.netPlanned - t.taxAmount), `Realizado: ${core.money(t.netRealized)}${t.taxAmount > 0 ? ` · Imp. ${core.money(t.taxAmount)}` : ""}`, netColor],
        ["Execução dos Cartões", `${t.doneCards}/${t.totalCards}`, `Progresso médio ${Math.round(t.avgProgress)}%`, "#38bdf8"],
        ["Prazos & Alertas", `${t.overdueCount} atrasado(s)`, `${t.dueSoonCount} vence(m) em 7 dias`, t.overdueCount > 0 ? "#f87171" : "#f59e0b"]
      ].map(([l, v, s, c]) => `<div class="kpi" style="--c:${c}"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${s}</div></div>`).join("");
    }

    const upEl = $("#proUpcoming");
    if (upEl) {
      const cols = getMergedColumns();
      const pending = cards.filter(a => !isCardDone(a, cols));
      const next = pending.filter(a => (a.end || a.start) >= today).slice(0, 7);
      const list = next.length ? next : pending.slice(0, 7);
      upEl.innerHTML = list.map(a => {
        const info = getProTypeInfo(a.type);
        const finTxt = formatProFinShort(a);
        const overdue = (a.end || a.start) < today;
        const tCol = info.isCustom && info.color ? ` style="--t-color:${core.esc(info.color)}"` : "";
        return `<li data-id="${core.esc(a.id)}"${tCol}>
          <span class="date-badge"><b>${a.start.slice(8, 10)}</b>${core.MON[+a.start.slice(5, 7) - 1]}</span>
          <div style="min-width:0;flex:1">
            <b>${info.icon} ${core.esc(a.name)}</b>
            <small>${core.esc(a.columnTitle || a.type)}${a.client ? ` · ${core.esc(a.client)}` : ""}${finTxt ? ` · ${core.esc(finTxt)}` : ""}${overdue ? " · ⚠️ Atrasado" : ""}</small>
          </div>
          <span class="chip ${info.cls}"${tCol}>${a.progress || 0}%</span>
        </li>`;
      }).join("") || `<li class="muted" style="cursor:default">Nenhum compromisso pendente 🎉</li>`;
      upEl.querySelectorAll("li[data-id]").forEach(li => { li.onclick = () => openProCardModal(li.dataset.id); });
    }

    const dfEl = $("#proDashFinance");
    if (dfEl) {
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
    if (stageEl) {
      const maxC = Math.max(1, ...Object.values(t.byColumn).map(c => c.count));
      stageEl.innerHTML = Object.values(t.byColumn).map(c => `
        <div class="bar-row" data-jump-col="${core.esc(c.id)}">
          <div class="bar-top"><span>${core.esc(c.title)}</span><b>${c.count} cartão(ões)${c.amount > 0 ? ` · ${core.money(c.amount)}` : ""}</b></div>
          <div class="bar-track"><div style="width:${(c.count / maxC) * 100}%;background:${core.esc(c.color || "#2563eb")}"></div></div>
        </div>`).join("") || `<p class="muted small">Sem colunas configuradas.</p>`;
      stageEl.querySelectorAll("[data-jump-col]").forEach(el => {
        el.onclick = () => core.switchProView("pro-board");
      });
    }

    const typeEl = $("#proTypeBars");
    if (typeEl) {
      const items = Object.values(t.byType).sort((a, b) => b.count - a.count);
      const maxT = Math.max(1, ...items.map(x => x.count));
      typeEl.innerHTML = items.map(it => {
        const info = getProTypeInfo(it.type);
        const finStr = [it.income > 0 ? `+${core.money(it.income)}` : "", it.expense > 0 ? `-${core.money(it.expense)}` : ""].filter(Boolean).join(" / ");
        return `<div class="bar-row" style="cursor:default">
          <div class="bar-top"><span>${info.icon} ${core.esc(it.type)}</span><b>${it.count} ${finStr ? `· ${finStr}` : ""}</b></div>
          <div class="bar-track"><div style="width:${(it.count / maxT) * 100}%;background:linear-gradient(90deg,#1d4ed8,#38bdf8)"></div></div>
        </div>`;
      }).join("") || `<p class="muted small">Sem cartões cadastrados.</p>`;
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
          <div class="muted small">📅 Vencimento: ${core.fmtBR(dt)}${planned !== real ? ` · Previsto: ${core.money(planned)}` : ""}${a.notes ? ` · ${core.esc(a.notes)}` : ""}</div>
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
  function syncProTableFilterUI() {
    const totalTypes = Object.keys(getAllProTypes()).length;
    const q = ($("#proSearch")?.value || "").trim();
    const prio = $("#proFilterPrio")?.value || "";
    const activeCount = (q ? 1 : 0)
      + (proTableColSet.size > 0 ? 1 : 0)
      + (proTableTypeSet.size < totalTypes ? 1 : 0)
      + (proTableTagSet.size > 0 ? 1 : 0)
      + (prio ? 1 : 0);
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
    proTableTagSet.clear();
    if ($("#proSearch")) $("#proSearch").value = "";
    if ($("#proFilterPrio")) $("#proFilterPrio").value = "";
    if (proTableColMsel) proTableColMsel.setSelected([]);
    if (proTableTypeMsel) proTableTypeMsel.setSelected([...proTableTypeSet]);
    if (proTableTagMsel) proTableTagMsel.setSelected([]);
    renderProTable();
  }

  function getFilteredProTableRows(allCardsOpt) {
    const q = ($("#proSearch")?.value || "").toLowerCase();
    const prio = $("#proFilterPrio")?.value || "";
    const cards = allCardsOpt || getProSortedActivities();
    return cards.filter(a => {
      if (proTableColSet.size > 0 && !proTableColSet.has(a.columnId || "__none__")) return false;
      if (!proTableTypeSet.has(a.type)) return false;
      if (proTableTagSet.size > 0 && !(Array.isArray(a.tags) && a.tags.some(t => proTableTagSet.has(t)))) return false;
      if (prio && a.priority !== prio) return false;
      if (q) {
        const hay = `${a.name} ${a.type} ${a.client || ""} ${a.assignee || ""} ${a.notes || ""} ${(a.tags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
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
          if (f === "start" && a.end < a.start) a.end = a.start;
          if (f === "end" && a.end < a.start) a.end = a.start;
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
          <div><span class="muted">Datas:</span> ${core.fmtShortBR(a.start)}–${core.fmtShortBR(a.end)}</div>
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

  function openProCardModal(idOrOpts) {
    const opts = (idOrOpts && typeof idOrOpts === "object") ? idOrOpts : null;
    const id = typeof idOrOpts === "string" ? idOrOpts : null;
    const ctx = id ? findProCardContext(id) : null;
    const a = ctx?.activity || null;
    editingProTripRef = ctx?.trip || core.getActiveTrip();
    editingProCardId = a ? a.id : null;
    proModalDraftId = a ? a.id : core.uid();

    const targetTripWrap = $("#pc-targetTripWrap");
    const targetTripSel = $("#pc-targetTrip");
    if (targetTripWrap && targetTripSel) {
      if (core.populateEventSelect) {
        core.populateEventSelect(targetTripSel, "professional", editingProTripRef?.id || core.getActiveTrip()?.id || "");
      }
      targetTripWrap.hidden = false;
    }

    populateProTypeSelect(editingProTripRef?.data || null);
    const cols = editingProTripRef?.data?.columns || getMergedColumns();
    populateProColumnSelect(editingProTripRef?.data || null);

    const today = core.fmtISO(new Date());
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
    $("#pc-start").value = a ? a.start : (opts?.start || today);
    $("#pc-end").value = a ? (a.end || a.start) : (opts?.end || today);
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
    $("#pc-assignee").value = a ? (a.assignee || "") : "";
    $("#pc-location").value = a ? (a.location || "") : "";

    $("#pc-finDirection").value = initFinDir;
    $("#pc-amount").value = a && a.amount > 0 ? a.amount : "";
    $("#pc-actualAmount").value = a && a.actualAmount > 0 ? a.actualAmount : "";
    $("#pc-finStatus").value = a ? (a.finStatus || "Previsto") : "Previsto";
    $("#pc-finDueDate").value = a ? (a.finDueDate || a.end || a.start) : (opts?.start || today);
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
    const startVal = $("#pc-start").value || core.fmtISO(new Date());
    let endVal = $("#pc-end").value || startVal;
    if (endVal < startVal) endVal = startVal;
    const finDirection = $("#pc-finDirection").value || "none";
    const amount = finDirection === "none" ? 0 : Math.max(0, parseFloat($("#pc-amount").value) || 0);
    const actualAmount = finDirection === "none" ? 0 : Math.max(0, parseFloat($("#pc-actualAmount").value) || 0);
    const tags = proModalTagsMsel ? proModalTagsMsel.getSelected() : proModalDraftTags;

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
      assignee: $("#pc-assignee").value.trim(),
      location: $("#pc-location").value.trim(),
      coverColor: proModalCoverColor,
      labels: [...proModalLabels],
      tags: [...new Set(tags.map(t => String(t).trim()).filter(Boolean))],
      finDirection,
      amount,
      actualAmount,
      finStatus: $("#pc-finStatus").value || "Previsto",
      finDueDate: $("#pc-finDueDate").value || endVal,
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
    if (act.assignee) { $("#pc-assignee").value = String(act.assignee); count++; }
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
      Início: core.fmtBR(a.start),
      Fim: core.fmtBR(a.end),
      Dias: core.days(a),
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
      const dt = a.end && a.end !== a.start ? `${core.fmtBR(a.start)}–${core.fmtBR(a.end)}` : core.fmtBR(a.start);
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
    if ($("#proBoardPrioFilter")) $("#proBoardPrioFilter").onchange = () => renderProBoard();
    if ($("#btnProBoardClearFilters")) $("#btnProBoardClearFilters").onclick = resetProBoardFilters;
    if ($("#btnProBoardAdd")) $("#btnProBoardAdd").onclick = () => openProCardModal();
    if ($("#btnProBoardAddCol")) $("#btnProBoardAddCol").onclick = () => openProColumnModal();

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
        core.closeAllGanttPopovers?.();
        renderProGantt();
      };
    });
    // Filtros unificados de data & limpar filtros (Gantt / Dashboard / Financeiro)
    const bindDateFilterPair = (fromSel, toSel, clearSel) => {
      if ($(fromSel)) {
        $(fromSel).onchange = () => {
          proDateFrom = $(fromSel).value || "";
          if (proDateTo && proDateFrom && proDateFrom > proDateTo) proDateTo = proDateFrom;
          applyAndRenderProFilteredViews();
        };
      }
      if ($(toSel)) {
        $(toSel).onchange = () => {
          proDateTo = $(toSel).value || "";
          if (proDateFrom && proDateTo && proDateTo < proDateFrom) proDateFrom = proDateTo;
          applyAndRenderProFilteredViews();
        };
      }
      if ($(clearSel)) $(clearSel).onclick = resetProUnifiedFilters;
    };
    bindDateFilterPair("#proGanttDateFrom", "#proGanttDateTo", "#btnProGanttClearFilters");
    bindDateFilterPair("#proDashDateFrom", "#proDashDateTo", "#btnProDashClearFilters");
    bindDateFilterPair("#proFinDateFrom", "#proFinDateTo", "#btnProFinClearFilters");

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
    if ($("#proFilterPrio")) $("#proFilterPrio").onchange = () => renderProTable();
    if ($("#btnProTableClearFilters")) $("#btnProTableClearFilters").onclick = resetProTableFilters;
    if ($("#btnProTableAdd")) $("#btnProTableAdd").onclick = () => openProCardModal();
    if ($("#btnProTablePdf")) {
      $("#btnProTablePdf").onclick = () => {
        window.FeriasReport.printProTableLandscape(getFilteredProTableRows(), core.getState(), computeProTotals(), core.reportHelpers());
      };
    }

    // Parâmetros controls
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
        for (const f of files) {
          try {
            const up = await window.FeriasApi.uploadAttachment(tTripId, proModalDraftId, f);
            proModalAttachments.push(up);
            renderProModalAttachments();
            core.toast(`📎 "${f.name}" anexado`);
          } catch (err) { core.toast("❌ " + (err.message || err)); }
        }
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
        const pickedId = ($("#pc-targetTrip") && !$("#pc-targetTripWrap")?.hidden) ? $("#pc-targetTrip").value : "";
        const sourceTrip = editingProTripRef || core.getActiveTrip();
        let targetTrip = (pickedId && core.resolveTripRefById ? await core.resolveTripRefById(pickedId) : null) || sourceTrip;
        if (!targetTrip) targetTrip = core.getActiveTrip();
        if (targetTrip?.role === "viewer") return core.toast("👁️ Projeto compartilhado somente para visualização.");

        const data = readProCardForm();
        data.completed = Boolean(proModalCompleted || data.progress >= 100);
        data.prevColumnId = proModalPrevColId || "";
        data.prevProgress = proModalPrevProg;
        if (data.completed && data.progress < 100) data.progress = 100;
        const tgtData = targetTrip?.data || core.getState();
        if (!Array.isArray(tgtData.activities)) tgtData.activities = [];
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
    const cards = getProSortedActivities();
    refreshProFilterOptions(cards);
    const filteredCards = applyProUnifiedFilters(cards, false);
    const t = computeProTotals(filteredCards);
    renderProBoard();
    renderProGantt(cards);
    renderProTimeline(cards);
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
    renderProBoard,
    buildProSummaryHTML,
    openProCardModal,
    exportProXlsx,
    buildProWhatsAppText
  };
})();
