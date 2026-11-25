/* ==========================================================================
   My Plan PRO — Módulo Completo de Atas de Reunião (v46)
   Editor estilo Word, Ações em Parágrafos, IA com Histórico de Versões,
   Apresentações Clean (Branco/Preto) e Exportação DOCX / PDF / PPTX
   ========================================================================== */
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);

  let host = null; // { core, findCardContext, getMergedColumns, getAllAssignees, openCardModal, openDocPreview, onCardMinutesChanged }
  let bound = false;

  let activeCardId = "";
  let activeTripRef = null;
  let activeMinuteId = "";
  let standaloneDraft = null;
  let standaloneLinkMode = "existing";
  let autoSaveTimer = null;
  let lastFocusedBlock = null;
  let pendingQuickCardText = "";
  let pendingQuickCardBlock = null;
  let selectedHistoryIdx = -1;
  let currentDeckSlides = [];
  let activeSlideIdx = 0;

  const TEMPLATES = {
    blank: () => `<p><br></p>`,
    executive: () => `
      <h2>1. Pauta da Reunião</h2>
      <ul><li>Definir escopo e prioridades do período</li><li>Alinhar prazos e responsáveis</li></ul>
      <h2>2. Principais Discussões</h2>
      <p>Registre aqui os principais pontos debatidos durante a reunião...</p>
      <h2>3. Decisões e Deliberações</h2>
      <ul><li>Decisão 1 — aprovada pelos participantes</li></ul>
      <h2>4. Próximos Passos e Encaminhamentos</h2>
      <table><thead><tr><th>Ação / Entrega</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody><tr><td>Definir plano de ação</td><td>—</td><td>—</td></tr></tbody></table>
    `,
    briefing: () => `
      <h2>1. Objetivo do Alinhamento</h2>
      <p>Descreva o objetivo central do briefing técnico...</p>
      <h2>2. Escopo Técnico &amp; Requisitos</h2>
      <ul><li>Requisito principal 1</li><li>Requisito principal 2</li></ul>
      <h2>3. Riscos e Dependências</h2>
      <ul><li>Dependência crítica a monitorar</li></ul>
      <h2>4. Encaminhamentos</h2>
      <p>Selecione qualquer parágrafo acima ou clique em <strong>+</strong> à esquerda para transformar em Checklist ou Novo Cartão.</p>
    `
  };

  function uid() {
    return host?.core?.uid ? host.core.uid() : ("min_" + Math.random().toString(36).slice(2, 10));
  }
  function esc(s) {
    return host?.core?.esc ? host.core.esc(s) : String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }
  function toast(msg) {
    host?.core?.toast?.(msg);
  }
  function fmtTimeNow() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  function fmtDateTimeBR(iso) {
    if (!iso) return "—";
    const s = String(iso);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
      const [dt, tm] = s.split("T");
      const [y, m, d] = dt.split("-");
      return `${d}/${m}/${y} ${tm.slice(0, 5)}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-");
      return `${d}/${m}/${y}`;
    }
    try { return new Date(s).toLocaleString("pt-BR"); } catch { return s; }
  }

  function sanitizeMinuteHtml(rawHtml) {
    if (window.MyPlanUtils?.sanitizeMinuteHtml) {
      return window.MyPlanUtils.sanitizeMinuteHtml(rawHtml);
    }
    return String(rawHtml || "<p><br></p>").trim() || "<p><br></p>";
  }

  function normalizeMinute(raw, cardName = "") {
    const m = raw && typeof raw === "object" ? raw : {};
    const nowIso = new Date().toISOString();
    return {
      id: String(m.id || uid()),
      title: String(m.title || `Ata - ${cardName || "Reunião"}`).trim(),
      meetingDate: String(m.meetingDate || nowIso.slice(0, 16)),
      location: String(m.location || "").trim(),
      participants: Array.isArray(m.participants) ? [...new Set(m.participants.map(p => String(p || "").trim()).filter(Boolean))] : [],
      html: sanitizeMinuteHtml(m.html || "<p><br></p>"),
      createdAt: String(m.createdAt || nowIso),
      updatedAt: String(m.updatedAt || nowIso),
      versions: Array.isArray(m.versions) ? m.versions.slice(-30).map(v => ({
        id: String(v?.id || uid()),
        label: String(v?.label || "Versão salva"),
        savedAt: String(v?.savedAt || nowIso),
        html: sanitizeMinuteHtml(v?.html || "")
      })) : [],
      attachments: Array.isArray(m.attachments) ? m.attachments.filter(a => a && typeof a === "object").map(a => ({ ...a })) : [],
      linkedActions: Array.isArray(m.linkedActions) ? m.linkedActions.filter(a => a && typeof a === "object").map(a => ({ ...a })) : []
    };
  }

  function getActiveContext() {
    if (!host) return null;
    if (!activeCardId) {
      if (standaloneDraft) {
        return { trip: host.core.getActiveTrip(), data: host.core.getState(), card: null, activity: null, minute: standaloneDraft, isStandalone: true };
      }
      return null;
    }
    const ctx = host.findCardContext(activeCardId);
    if (!ctx) return null;
    const a = ctx.activity;
    if (!Array.isArray(a.minutes)) a.minutes = [];
    const minute = a.minutes.find(m => m.id === activeMinuteId) || null;
    return { ...ctx, card: a, minute, isStandalone: false };
  }

  function populateStandaloneCardLinkUI(filterTxt = "") {
    const sel = $("#pm-linkCardSelect");
    const colSel = $("#pm-newCardCol");
    const cards = host?.getSortedActivities ? host.getSortedActivities() : [];
    const cols = host?.getMergedColumns ? host.getMergedColumns() : [];
    if (sel) {
      const q = String(filterTxt || "").trim().toLowerCase();
      const prev = sel.value || "";
      const filtered = q ? cards.filter(c => String(c.name || "").toLowerCase().includes(q) || String(c.location || "").toLowerCase().includes(q)) : cards;
      sel.innerHTML = `<option value="">— Selecione um cartão existente (${filtered.length}) —</option>`
        + filtered.map(c => `<option value="${esc(c.id)}">${esc(c.name)}${c.columnTitle ? ` (${esc(c.columnTitle)})` : ""}</option>`).join("");
      if (prev && filtered.some(c => c.id === prev)) sel.value = prev;
    }
    if (colSel && !colSel.options.length) {
      colSel.innerHTML = cols.map(c => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join("");
    }
  }

  function setStandaloneLinkMode(mode) {
    standaloneLinkMode = mode === "new" ? "new" : "existing";
    $("#pm-cardLinkModeSeg")?.querySelectorAll("button").forEach(b => {
      b.classList.toggle("active", b.dataset.pmLinkMode === standaloneLinkMode);
    });
    if ($("#pm-linkExistingWrap")) $("#pm-linkExistingWrap").hidden = standaloneLinkMode !== "existing";
    if ($("#pm-linkNewWrap")) $("#pm-linkNewWrap").hidden = standaloneLinkMode !== "new";
  }

  function ensureStandaloneLinked(explicit = false) {
    if (activeCardId && activeMinuteId) return getActiveContext();
    if (!standaloneDraft || !host) return null;
    // Sincronizar campos atuais no rascunho antes de vincular
    standaloneDraft.title = ($("#pm-title")?.value || "").trim() || "Ata de Reunião";
    standaloneDraft.meetingDate = $("#pm-meetingDate")?.value || "";
    standaloneDraft.location = ($("#pm-location")?.value || "").trim();
    standaloneDraft.html = sanitizeMinuteHtml($("#pm-editor")?.innerHTML || "<p><br></p>");
    standaloneDraft.updatedAt = new Date().toISOString();

    if (standaloneLinkMode === "existing") {
      const pickedId = $("#pm-linkCardSelect")?.value || "";
      if (!pickedId) {
        if (explicit) toast("⚠️ Selecione um cartão existente ou escolha 'Criar novo cartão' para salvar a ata.");
        return null;
      }
      const ctx = host.findCardContext(pickedId);
      if (!ctx) return null;
      if (ctx.trip?.role === "viewer") {
        if (explicit) toast("👁️ Este cartão pertence a um projeto somente visualização.");
        return null;
      }
      if (!Array.isArray(ctx.activity.minutes)) ctx.activity.minutes = [];
      ctx.activity.minutes.unshift(standaloneDraft);
      activeCardId = ctx.activity.id;
      activeTripRef = ctx.trip;
      activeMinuteId = standaloneDraft.id;
      standaloneDraft = null;
      if ($("#pm-cardLinkBox")) $("#pm-cardLinkBox").hidden = true;
      if ($("#pm-topCardBadge")) $("#pm-topCardBadge").textContent = `🗂️ ${ctx.activity.name || "Cartão"}`;
      return getActiveContext();
    }

    // Modo: Criar um novo cartão na lista escolhida
    const trip = host.core.getActiveTrip();
    if (!trip || trip.role === "viewer") {
      if (explicit) toast("👁️ Projeto atual é somente para visualização.");
      return null;
    }
    const cols = host.getMergedColumns ? host.getMergedColumns() : [];
    const colId = $("#pm-newCardCol")?.value || cols[0]?.id || "";
    const newCardTitle = ($("#pm-newCardTitle")?.value || "").trim() || standaloneDraft.title || "Novo Cartão";
    const mDateIso = String(standaloneDraft.meetingDate || "").slice(0, 10) || host.core.fmtISO(new Date());
    const newCardId = uid();
    const parts = Array.isArray(standaloneDraft.participants) ? standaloneDraft.participants : [];
    const newCard = {
      id: newCardId,
      name: newCardTitle,
      type: "Reunião",
      columnId: colId,
      start: mDateIso,
      end: mDateIso,
      startTime: String(standaloneDraft.meetingDate || "").slice(11, 16) || "",
      priority: "Média",
      progress: 0,
      location: standaloneDraft.location || "",
      assignee: parts[0] || "",
      assigneesList: parts.map(p => ({ name: p, travels: false })),
      minutes: [standaloneDraft],
      attachments: [],
      subtasks: []
    };
    if (!Array.isArray(trip.data.activities)) trip.data.activities = [];
    trip.data.activities.push(newCard);
    activeCardId = newCardId;
    activeTripRef = trip;
    activeMinuteId = standaloneDraft.id;
    standaloneDraft = null;
    if ($("#pm-cardLinkBox")) $("#pm-cardLinkBox").hidden = true;
    if ($("#pm-topCardBadge")) $("#pm-topCardBadge").textContent = `🗂️ ${newCardTitle}`;
    return getActiveContext();
  }

  function openStandaloneNewMinute() {
    if (!host) return;
    bindEvents();
    const trip = host.core.getActiveTrip();
    if (trip?.role === "viewer") return toast("👁️ Projeto compartilhado somente para visualização.");

    activeCardId = "";
    activeTripRef = trip;
    activeMinuteId = "";
    standaloneDraft = normalizeMinute({
      id: uid(),
      title: "Nova Ata de Reunião",
      meetingDate: `${host.core.fmtISO(new Date())}T${fmtTimeNow()}`,
      location: "",
      participants: [],
      html: TEMPLATES.executive()
    }, "Reunião");

    if ($("#pm-topCardBadge")) $("#pm-topCardBadge").textContent = "📝 Nova Ata (vincule a um cartão)";
    if ($("#pm-title")) $("#pm-title").value = standaloneDraft.title;
    if ($("#pm-meetingDate")) $("#pm-meetingDate").value = standaloneDraft.meetingDate.slice(0, 16);
    if ($("#pm-location")) $("#pm-location").value = "";
    if ($("#pm-linkCardSearch")) $("#pm-linkCardSearch").value = "";
    if ($("#pm-newCardTitle")) $("#pm-newCardTitle").value = "";
    if ($("#pm-newCardCol")) $("#pm-newCardCol").innerHTML = "";
    populateStandaloneCardLinkUI("");
    const hasCards = (host.getSortedActivities ? host.getSortedActivities().length : 0) > 0;
    setStandaloneLinkMode(hasCards ? "existing" : "new");
    if ($("#pm-cardLinkBox")) $("#pm-cardLinkBox").hidden = false;
    if ($("#pm-headerBox")) $("#pm-headerBox").open = true;

    populateParticipantsPicker(standaloneDraft);
    renderParticipantsChips(standaloneDraft);
    const ed = $("#pm-editor");
    if (ed) ed.innerHTML = sanitizeMinuteHtml(standaloneDraft.html);
    updateWordCount();
    updateHistoryBadge(standaloneDraft);
    renderMinuteAttachments(standaloneDraft);
    if ($("#pm-saveStatus")) $("#pm-saveStatus").textContent = "Selecione um cartão ou clique em Salvar Ata";
    hideFloatingMenus();

    const dlg = $("#proMinuteEditorModal");
    if (dlg) {
      dlg.classList.remove("is-focus-mode");
      if (!dlg.open) dlg.showModal();
    }
  }

  /* ---------- LISTA DE ATAS DENTRO DO MODAL DE CARTÃO ---------- */
  function renderCardMinutesList(cardId, containerEl) {
    const box = containerEl || $("#pc-minutesList");
    if (!box || !host) return;
    const ctx = cardId ? host.findCardContext(cardId) : null;
    const list = Array.isArray(ctx?.activity?.minutes) ? ctx.activity.minutes : [];
    if (!list.length) {
      const isPers = host.core?.getAppMode?.() === "personal";
      box.innerHTML = isPers
        ? `<div class="muted small">Nenhuma nota registrada neste cartão. Clique em <b>➕ Nova Nota</b> para criar.</div>`
        : `<div class="muted small">Nenhuma ata registrada neste cartão. Clique em <b>➕ Nova Ata de Reunião</b> para criar.</div>`;
      return;
    }
    box.innerHTML = list.map(m => {
      const dt = fmtDateTimeBR(m.meetingDate);
      const upd = fmtDateTimeBR(m.updatedAt);
      const parts = Array.isArray(m.participants) && m.participants.length ? m.participants.slice(0, 3).join(", ") + (m.participants.length > 3 ? ` +${m.participants.length - 3}` : "") : "Sem participantes";
      return `<div class="pro-min-card-row" data-min-id="${esc(m.id)}">
        <div class="pro-min-card-main">
          <button type="button" class="pro-min-title-btn" data-min-open="${esc(m.id)}" title="Abrir editor da ata">📝 ${esc(m.title)}</button>
          <div class="muted small">📅 ${esc(dt)} · 👥 ${esc(parts)} · 🕒 Atualizada ${esc(upd)}</div>
        </div>
        <div class="pro-min-card-acts">
          <button type="button" class="btn ghost small" data-min-open="${esc(m.id)}" title="Abrir / Editar Ata">✏️ Abrir</button>
          <button type="button" class="icon-btn" data-min-dl="${esc(m.id)}" title="Baixar Ata (Word / PDF / PPTX)">⬇️</button>
          <button type="button" class="icon-btn" data-min-dup="${esc(m.id)}" title="Duplicar Ata">⧉</button>
          <button type="button" class="icon-btn" data-min-del="${esc(m.id)}" title="Excluir Ata">🗑️</button>
        </div>
      </div>`;
    }).join("");

    box.querySelectorAll("[data-min-open]").forEach(btn => {
      btn.onclick = () => openMinuteEditor(cardId, btn.dataset.minOpen);
    });
    box.querySelectorAll("[data-min-dl]").forEach(btn => {
      btn.onclick = () => {
        const m = list.find(x => x.id === btn.dataset.minDl);
        if (m) exportMinute(ctx.activity, m, "simple", "docx");
      };
    });
    box.querySelectorAll("[data-min-dup]").forEach(btn => {
      btn.onclick = async () => {
        const orig = list.find(x => x.id === btn.dataset.minDup);
        if (!orig) return;
        const copy = normalizeMinute({
          ...host.core.clone(orig),
          id: uid(),
          title: `${orig.title} (cópia)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, ctx.activity.name);
        ctx.activity.minutes.unshift(copy);
        await host.core.saveTripRecord(ctx.trip, "⧉ Ata duplicada!");
        renderCardMinutesList(cardId, box);
      };
    });
    box.querySelectorAll("[data-min-del]").forEach(btn => {
      btn.onclick = async () => {
        const m = list.find(x => x.id === btn.dataset.minDel);
        if (!m || !confirm(`Excluir a ata "${m.title}"?`)) return;
        ctx.activity.minutes = ctx.activity.minutes.filter(x => x.id !== m.id);
        await host.core.saveTripRecord(ctx.trip, "🗑️ Ata excluída");
        renderCardMinutesList(cardId, box);
      };
    });
  }

  /* ---------- ABRIR / CRIAR ATA NO EDITOR EM TELA CHEIA ---------- */
  async function createNewMinuteForCard(cardId) {
    if (!host) return;
    const ctx = host.findCardContext(cardId);
    if (!ctx) return toast("⚠️ Salve o cartão primeiro antes de criar uma Ata de Reunião.");
    if (ctx.trip?.role === "viewer") return toast("👁️ Projeto compartilhado somente para visualização.");
    const a = ctx.activity;
    if (!Array.isArray(a.minutes)) a.minutes = [];
    const asgs = Array.isArray(a.assigneesList) && a.assigneesList.length
      ? a.assigneesList.map(e => e.name).filter(Boolean)
      : (a.assignee ? [a.assignee] : []);
    const numSuffix = a.minutes.length ? ` #${a.minutes.length + 1}` : "";
    const min = normalizeMinute({
      id: uid(),
      title: `Ata - ${a.name || "Reunião"}${numSuffix}`,
      meetingDate: `${a.start || host.core.fmtISO(new Date())}T${(a.startTime || "09:00").slice(0, 5)}`,
      location: a.meetingLink || a.location || "",
      participants: asgs,
      html: TEMPLATES.executive()
    }, a.name);
    a.minutes.unshift(min);
    await host.core.saveTripRecord(ctx.trip, "");
    renderCardMinutesList(cardId);
    openMinuteEditor(cardId, min.id);
  }

  function openMinuteEditor(cardId, minuteId) {
    if (!host) return;
    bindEvents();
    const ctx = host.findCardContext(cardId);
    if (!ctx) return toast("⚠️ Cartão não encontrado.");
    if (!Array.isArray(ctx.activity.minutes)) ctx.activity.minutes = [];
    const min = ctx.activity.minutes.find(m => m.id === minuteId);
    if (!min) return toast("⚠️ Ata não encontrada.");

    activeCardId = cardId;
    activeTripRef = ctx.trip;
    activeMinuteId = min.id;
    standaloneDraft = null;
    if ($("#pm-cardLinkBox")) $("#pm-cardLinkBox").hidden = true;

    if ($("#pm-topCardBadge")) $("#pm-topCardBadge").textContent = `🗂️ ${ctx.activity.name || "Cartão"}`;
    if ($("#pm-title")) $("#pm-title").value = min.title || "";
    if ($("#pm-meetingDate")) $("#pm-meetingDate").value = String(min.meetingDate || "").slice(0, 16);
    if ($("#pm-location")) $("#pm-location").value = min.location || "";
    populateParticipantsPicker(min);
    renderParticipantsChips(min);

    const ed = $("#pm-editor");
    if (ed) ed.innerHTML = sanitizeMinuteHtml(min.html || "<p><br></p>");
    updateWordCount();
    updateHistoryBadge(min);
    renderMinuteAttachments(min);
    if ($("#pm-saveStatus")) $("#pm-saveStatus").textContent = `Atualizada ${fmtDateTimeBR(min.updatedAt)}`;
    hideFloatingMenus();

    const dlg = $("#proMinuteEditorModal");
    if (dlg) {
      dlg.classList.remove("is-focus-mode");
      if (!dlg.open) dlg.showModal();
    }
  }

  function populateParticipantsPicker(min) {
    const sel = $("#pm-participantPick");
    if (!sel || !host) return;
    const all = host.getAllAssignees ? host.getAllAssignees() : [];
    sel.innerHTML = `<option value="">+ Pessoa do projeto...</option>`
      + all.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
  }

  function renderParticipantsChips(min) {
    const box = $("#pm-participantsChips");
    if (!box) return;
    const list = Array.isArray(min?.participants) ? min.participants : [];
    if (!list.length) {
      box.innerHTML = `<span class="muted small">Nenhum participante adicionado</span>`;
      return;
    }
    box.innerHTML = list.map((p, idx) => `
      <span class="pm-part-chip">
        <span>👤 ${esc(p)}</span>
        <button type="button" data-pm-part-del="${idx}" title="Remover">✕</button>
      </span>`).join("");
    box.querySelectorAll("[data-pm-part-del]").forEach(btn => {
      btn.onclick = () => {
        const ctx = getActiveContext();
        if (!ctx?.minute) return;
        ctx.minute.participants.splice(parseInt(btn.dataset.pmPartDel, 10), 1);
        renderParticipantsChips(ctx.minute);
        scheduleAutoSave();
      };
    });
  }

  function updateWordCount() {
    const ed = $("#pm-editor");
    const el = $("#pm-wordCount");
    if (!ed || !el) return;
    const txt = (ed.innerText || "").trim();
    const words = txt ? txt.split(/\s+/).filter(Boolean).length : 0;
    el.textContent = `${words} ${words === 1 ? "palavra" : "palavras"}`;
  }

  function updateHistoryBadge(min) {
    const el = $("#pm-historyCount");
    if (!el) return;
    const n = Array.isArray(min?.versions) ? min.versions.length : 0;
    el.textContent = n ? String(n) : "";
    el.hidden = !n;
  }

  function scheduleAutoSave(immediate = false, explicitFeedback = false) {
    clearTimeout(autoSaveTimer);
    if ($("#pm-saveStatus")) $("#pm-saveStatus").textContent = "Salvando...";
    const run = async () => {
      let ctx = getActiveContext();
      if (ctx?.isStandalone) {
        // No modo +Ata, só vincula automaticamente no auto-save se o usuário já escolheu um cartão existente;
        // se estiver em "Criar novo cartão", vincula ao clicar em "Salvar Ata" (explicitFeedback = true).
        if (standaloneLinkMode === "existing" && $("#pm-linkCardSelect")?.value) {
          ctx = ensureStandaloneLinked(false);
        } else if (explicitFeedback) {
          ctx = ensureStandaloneLinked(true);
        } else {
          if (standaloneDraft) {
            standaloneDraft.title = ($("#pm-title")?.value || "").trim() || "Nova Ata de Reunião";
            standaloneDraft.meetingDate = $("#pm-meetingDate")?.value || "";
            standaloneDraft.location = ($("#pm-location")?.value || "").trim();
            standaloneDraft.html = sanitizeMinuteHtml($("#pm-editor")?.innerHTML || "<p><br></p>");
          }
          if ($("#pm-saveStatus")) $("#pm-saveStatus").textContent = "Rascunho — vincule um cartão ou clique em Salvar Ata";
          return false;
        }
      }
      if (!ctx?.minute || !ctx?.trip) return false;
      ctx.minute.title = ($("#pm-title")?.value || "").trim() || `Ata - ${ctx.card?.name || "Reunião"}`;
      ctx.minute.meetingDate = $("#pm-meetingDate")?.value || "";
      ctx.minute.location = ($("#pm-location")?.value || "").trim();
      ctx.minute.html = sanitizeMinuteHtml($("#pm-editor")?.innerHTML || "<p><br></p>");
      ctx.minute.updatedAt = new Date().toISOString();
      await host.core.saveTripRecord(ctx.trip, "");
      if ($("#pm-saveStatus")) $("#pm-saveStatus").textContent = `✓ Salvo às ${fmtTimeNow()}`;
      renderCardMinutesList(activeCardId);
      if (explicitFeedback) {
        const btn = $("#btnPmSave");
        if (btn) {
          btn.classList.add("is-saved");
          btn.textContent = "✓ Ata salva!";
          setTimeout(() => {
            btn.classList.remove("is-saved");
            btn.textContent = "💾 Salvar Ata";
          }, 2200);
        }
        toast("✅ Ata salva com sucesso!");
      }
      return true;
    };
    if (immediate) return run();
    autoSaveTimer = setTimeout(run, 800);
  }

  function pushVersionSnapshot(minute, label) {
    if (!minute) return;
    if (!Array.isArray(minute.versions)) minute.versions = [];
    const curHtml = sanitizeMinuteHtml($("#pm-editor")?.innerHTML || minute.html || "");
    minute.versions.unshift({
      id: uid(),
      label: label || "Edição manual",
      savedAt: new Date().toISOString(),
      html: curHtml
    });
    if (minute.versions.length > 30) minute.versions = minute.versions.slice(0, 30);
    updateHistoryBadge(minute);
  }

  /* ---------- ANEXOS DEDICADOS DA ATA ---------- */
  function renderMinuteAttachments(min) {
    const box = $("#pm-attachmentsList");
    if (!box) return;
    const list = Array.isArray(min?.attachments) ? min.attachments : [];
    if (!list.length) {
      box.innerHTML = `<span class="muted small">Nenhum documento anexado nesta ata.</span>`;
      return;
    }
    box.innerHTML = list.map((att, idx) => {
      const href = host.resolveDocHref ? host.resolveDocHref(att) : (att.url || "");
      return `<div class="pm-att-chip">
        <span>📎</span>
        <button type="button" class="pm-att-name" data-pm-att-view="${idx}" title="Visualizar">${esc(att.fileName || "Arquivo")}</button>
        <button type="button" class="icon-btn" data-pm-att-ren="${idx}" title="Renomear">✏️</button>
        ${href ? `<a class="icon-btn" href="${esc(href)}" download="${esc(att.fileName || "arquivo")}" target="_blank" rel="noopener" title="Baixar">⬇️</a>` : ""}
        <button type="button" class="icon-btn" data-pm-att-del="${idx}" title="Remover">✕</button>
      </div>`;
    }).join("");
    box.querySelectorAll("[data-pm-att-ren]").forEach(b => {
      b.onclick = () => {
        const ctx = getActiveContext();
        if (!ctx?.minute) return;
        const idx = parseInt(b.dataset.pmAttRen, 10);
        const att = ctx.minute.attachments[idx];
        if (!att) return;
        const doRename = async nextName => {
          const cleanNew = String(nextName || "").trim();
          if (!cleanNew || cleanNew === att.fileName) return;
          if (att.id && window.FeriasApi?.renameAttachment) {
            try { await window.FeriasApi.renameAttachment(att.id, cleanNew); } catch (err) {
              toast("❌ " + (err.message || "Falha ao renomear documento."));
              return;
            }
          }
          att.fileName = cleanNew;
          renderMinuteAttachments(ctx.minute);
          scheduleAutoSave(true);
          toast(`✏️ Anexo renomeado para "${cleanNew}"`);
        };
        if (host.openRenameAttachment) {
          host.openRenameAttachment({ fileName: att.fileName || "Arquivo", isLink: false, onConfirm: doRename });
        } else if (window.myplanPromptDialog) {
          window.myplanPromptDialog({
            title: "✏️ Renomear Anexo",
            label: "Novo nome do arquivo",
            value: att.fileName || "Arquivo",
            submitLabel: "Salvar"
          }).then(next => { if (next) doRename(next); });
        }
      };
    });
    box.querySelectorAll("[data-pm-att-view]").forEach(b => {
      b.onclick = () => {
        const att = list[parseInt(b.dataset.pmAttView, 10)];
        if (att && host.openDocPreview) {
          host.openDocPreview({
            fileName: att.fileName,
            url: host.resolveDocHref ? host.resolveDocHref(att) : (att.url || ""),
            mimeType: att.mimeType || "",
            size: att.size || 0,
            originLabel: `📝 Anexo da Ata`,
            cardId: activeCardId,
            cardName: getActiveContext()?.card?.name || ""
          });
        }
      };
    });
    box.querySelectorAll("[data-pm-att-del]").forEach(b => {
      b.onclick = () => {
        const ctx = getActiveContext();
        if (!ctx?.minute) return;
        const idx = parseInt(b.dataset.pmAttDel, 10);
        const att = ctx.minute.attachments[idx];
        if (!confirm(`Excluir o documento "${att?.fileName || "anexo"}" desta ata?`)) return;
        ctx.minute.attachments.splice(idx, 1);
        renderMinuteAttachments(ctx.minute);
        scheduleAutoSave(true);
      };
    });
  }

  /* ---------- INSERIR IMAGEM NO CORPO DO TEXTO (BOTÃO, PASTE, DRAG) ---------- */
  function insertImageFileIntoEditor(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const fr = new FileReader();
    fr.onload = () => {
      const ed = $("#pm-editor");
      if (!ed) return;
      ed.focus();
      const figHtml = `<figure class="pm-img-fig" contenteditable="false"><img src="${fr.result}" alt="${esc(file.name)}" style="max-width:100%"><figcaption contenteditable="true" class="pm-img-cap">Legenda da imagem (clique para editar)</figcaption></figure><p><br></p>`;
      document.execCommand("insertHTML", false, figHtml);
      scheduleAutoSave();
      toast("🖼️ Imagem inserida na ata!");
    };
    fr.readAsDataURL(file);
  }

  /* ---------- BUBBLE MENU & BOTÃO + NA MARGEM (TRANSFORMAR EM CHECKLIST OU CARTÃO) ---------- */
  function hideFloatingMenus() {
    if ($("#pm-bubbleMenu")) $("#pm-bubbleMenu").hidden = true;
    if ($("#pm-marginPlusBtn")) $("#pm-marginPlusBtn").hidden = true;
  }

  function findEnclosingBlock(node) {
    const ed = $("#pm-editor");
    if (!ed || !node) return null;
    let cur = node.nodeType === 3 ? node.parentElement : node;
    while (cur && cur !== ed) {
      if (["P", "LI", "DIV", "H1", "H2", "H3", "BLOCKQUOTE"].includes(cur.tagName)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  function updateSelectionMenus() {
    const ed = $("#pm-editor");
    const wrap = $("#pm-paperWrap");
    const bubble = $("#pm-bubbleMenu");
    const plusBtn = $("#pm-marginPlusBtn");
    if (!ed || !wrap) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !ed.contains(sel.anchorNode)) {
      if (bubble) bubble.hidden = true;
      return;
    }
    const block = findEnclosingBlock(sel.anchorNode);
    if (block) {
      lastFocusedBlock = block;
      if (plusBtn) {
        const bRect = block.getBoundingClientRect();
        const wRect = wrap.getBoundingClientRect();
        plusBtn.style.top = `${Math.max(8, Math.round(bRect.top - wRect.top + 2))}px`;
        plusBtn.hidden = false;
      }
    }
    const selTxt = sel.toString().trim();
    if (bubble) {
      if (selTxt.length >= 2) {
        const r = sel.getRangeAt(0).getBoundingClientRect();
        const wRect = wrap.getBoundingClientRect();
        bubble.hidden = false;
        const bw = bubble.offsetWidth || 320;
        let left = r.left - wRect.left + (r.width / 2) - (bw / 2);
        left = Math.max(8, Math.min(wRect.width - bw - 8, left));
        const top = Math.max(6, r.top - wRect.top - 42);
        bubble.style.left = `${Math.round(left)}px`;
        bubble.style.top = `${Math.round(top)}px`;
      } else {
        bubble.hidden = true;
      }
    }
  }

  function getActionTextAndBlock() {
    const sel = window.getSelection();
    const selTxt = sel && $("#pm-editor")?.contains(sel.anchorNode) ? sel.toString().trim() : "";
    const block = (sel && sel.rangeCount && findEnclosingBlock(sel.anchorNode)) || lastFocusedBlock;
    const cleanBlockTxt = block
      ? String(block.innerText || "").replace(/✓ No Checklist.*$|🗂️ Cartão Criado:.*$/gm, "").trim()
      : "";
    return { text: selTxt || cleanBlockTxt, block };
  }

  function appendActionBadgeToBlock(block, kind, label, targetCardId = "") {
    if (!block) return;
    const badge = document.createElement("span");
    badge.className = `pm-action-badge is-${kind}`;
    badge.contentEditable = "false";
    if (targetCardId) badge.dataset.pmOpenCard = targetCardId;
    badge.textContent = label;
    block.appendChild(document.createTextNode(" "));
    block.appendChild(badge);
  }

  async function executeParagraphAction(actionKind) {
    const ctx = getActiveContext();
    if (!ctx?.minute) return;
    const { text, block } = getActionTextAndBlock();
    if (!text) return toast("Selecione um parágrafo ou digite um texto primeiro.");
    if ($("#pm-bubbleMenu")) $("#pm-bubbleMenu").hidden = true;

    if (actionKind === "card-check") {
      if (!Array.isArray(ctx.card.subtasks)) ctx.card.subtasks = [];
      ctx.card.subtasks.push({ id: uid(), text: text.slice(0, 200), done: false });
      ctx.minute.linkedActions.push({ id: uid(), kind: "card-check", text: text.slice(0, 200), createdAt: new Date().toISOString() });
      appendActionBadgeToBlock(block, "card-check", "✓ No Checklist do Cartão");
      scheduleAutoSave(true);
      toast("✓ Enviado para o Checklist deste Cartão!");
      return;
    }

    if (actionKind === "sys-check") {
      const st = host.core.getState();
      if (!Array.isArray(st.checklist)) st.checklist = [];
      st.checklist.push({
        id: uid(),
        cat: ctx.card.name || "Ata de Reunião",
        item: text.slice(0, 200),
        prio: "Média",
        status: "Pendente",
        notes: `Origem: ${ctx.minute.title}`
      });
      ctx.minute.linkedActions.push({ id: uid(), kind: "sys-check", text: text.slice(0, 200), createdAt: new Date().toISOString() });
      appendActionBadgeToBlock(block, "sys-check", "✓ No Checklist Geral");
      scheduleAutoSave(true);
      toast("📋 Enviado para o Checklist Geral do Sistema!");
      return;
    }

    if (actionKind === "new-card") {
      pendingQuickCardText = text;
      pendingQuickCardBlock = block;
      const cols = host.getMergedColumns ? host.getMergedColumns() : [];
      const asgs = host.getAllAssignees ? host.getAllAssignees() : [];
      if ($("#pmqc-title")) $("#pmqc-title").value = text.slice(0, 120);
      if ($("#pmqc-notes")) $("#pmqc-notes").value = `Criado a partir da ata "${ctx.minute.title}" (Cartão: ${ctx.card.name}):\n${text}`;
      if ($("#pmqc-col")) {
        $("#pmqc-col").innerHTML = cols.map(c => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join("");
        if (ctx.card.columnId) $("#pmqc-col").value = ctx.card.columnId;
      }
      if ($("#pmqc-assignee")) {
        $("#pmqc-assignee").innerHTML = `<option value="">— Sem responsável —</option>`
          + asgs.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
        if (ctx.card.assignee) $("#pmqc-assignee").value = ctx.card.assignee;
      }
      if ($("#pmqc-due")) $("#pmqc-due").value = ctx.card.end || host.core.fmtISO(new Date());
      $("#proMinuteQuickCardModal")?.showModal();
    }
  }

  /* ---------- MELHORAR COM IA + HISTÓRICO DE VERSÕES ---------- */
  async function runAiImproveMinute(style) {
    const ctx = getActiveContext();
    if (!ctx?.minute) return;
    const ed = $("#pm-editor");
    const plainText = (ed?.innerText || "").trim();
    if (!plainText) return toast("Escreva algum conteúdo na ata antes de melhorar com IA.");
    const btn = $("#btnPmAiMenu");
    if ($("#pm-aiMenu")) $("#pm-aiMenu").hidden = true;
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Melhorando com IA..."; }
    try {
      // REGRA OBRIGATÓRIA: Salvar snapshot do texto antigo ANTES de aplicar IA
      pushVersionSnapshot(ctx.minute, "Original (antes da IA)");
      const res = await window.FeriasApi.aiImproveMinutes({
        style,
        html: ed.innerHTML,
        plainText,
        title: $("#pm-title")?.value || ctx.minute.title,
        cardName: ctx.card.name
      });
      if (res && res.html) {
        ed.innerHTML = sanitizeMinuteHtml(res.html);
        const styleLbl = style === "clarity" ? "Clareza e Gramática" : (style === "bullets" ? "Tópicos Objetivos" : "Ata Executiva");
        pushVersionSnapshot(ctx.minute, `✨ Melhorado com IA (${styleLbl})`);
        updateWordCount();
        scheduleAutoSave(true);
        toast(`✨ ${res.summary || "Texto melhorado com IA! Versão anterior salva no Histórico."}`);
      }
    } catch (err) {
      toast("❌ " + (err.message || "Falha ao melhorar texto com IA."));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "✨ Melhorar o texto com IA ▾"; }
    }
  }

  function openHistoryModal() {
    const ctx = getActiveContext();
    if (!ctx?.minute) return;
    const list = Array.isArray(ctx.minute.versions) ? ctx.minute.versions : [];
    const listEl = $("#pm-historyList");
    const prevBody = $("#pm-histPrevBody");
    const prevTitle = $("#pm-histPrevTitle");
    const restoreBtn = $("#btnPmHistRestore");
    selectedHistoryIdx = list.length ? 0 : -1;

    const renderList = () => {
      if (!list.length) {
        if (listEl) listEl.innerHTML = `<div class="muted small" style="padding:10px">Nenhuma versão anterior salva ainda. Versões são criadas automaticamente ao usar a IA ou ao restaurar.</div>`;
        if (prevTitle) prevTitle.textContent = "Sem histórico";
        if (prevBody) prevBody.innerHTML = "";
        if (restoreBtn) restoreBtn.hidden = true;
        return;
      }
      if (listEl) {
        listEl.innerHTML = list.map((v, i) => `
          <button type="button" class="pm-hist-item${i === selectedHistoryIdx ? " active" : ""}" data-hist-i="${i}">
            <strong>${esc(v.label)}</strong>
            <small class="muted">${esc(fmtDateTimeBR(v.savedAt))}</small>
          </button>`).join("");
        listEl.querySelectorAll("[data-hist-i]").forEach(b => {
          b.onclick = () => {
            selectedHistoryIdx = parseInt(b.dataset.histI, 10);
            renderList();
          };
        });
      }
      const sel = list[selectedHistoryIdx];
      if (sel) {
        if (prevTitle) prevTitle.textContent = `${sel.label} · ${fmtDateTimeBR(sel.savedAt)}`;
        if (prevBody) prevBody.innerHTML = sel.html ? sanitizeMinuteHtml(sel.html) : "<p class='muted'>Vazio</p>";
        if (restoreBtn) restoreBtn.hidden = false;
      }
    };
    renderList();
    $("#proMinuteHistoryModal")?.showModal();
  }

  /* ---------- CONVERSÃO HTML -> BLOCOS OOXML & SLIDES CLEAN ---------- */
  function extractBlocksFromHtml(htmlStr) {
    const tmp = document.createElement("div");
    tmp.innerHTML = sanitizeMinuteHtml(htmlStr || "");
    const blocks = [];

    const parseRuns = (el) => {
      const runs = [];
      const walk = (node, style) => {
        if (node.nodeType === 3) {
          const t = node.nodeValue || "";
          if (t) runs.push({ text: t, ...style });
          return;
        }
        if (node.nodeType !== 1) return;
        const tag = node.tagName;
        if (tag === "BR") { runs.push({ text: "\n", ...style }); return; }
        const next = { ...style };
        if (tag === "B" || tag === "STRONG") next.bold = true;
        if (tag === "I" || tag === "EM") next.italic = true;
        if (tag === "U") next.underline = true;
        if (tag === "S" || tag === "STRIKE" || tag === "DEL") next.strike = true;
        node.childNodes.forEach(ch => walk(ch, next));
      };
      walk(el, {});
      return runs;
    };

    const walkBlock = (node) => {
      if (node.nodeType === 3) {
        const t = (node.nodeValue || "").trim();
        if (t) blocks.push({ type: "p", text: t });
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      if (tag === "H1" || tag === "H2" || tag === "H3") {
        const t = (node.innerText || "").trim();
        if (t) blocks.push({ type: tag.toLowerCase(), text: t, runs: parseRuns(node) });
      } else if (tag === "HR") {
        blocks.push({ type: "hr" });
      } else if (tag === "BLOCKQUOTE") {
        const t = (node.innerText || "").trim();
        if (t) blocks.push({ type: "quote", text: t, runs: parseRuns(node) });
      } else if (tag === "UL" || tag === "OL") {
        let idx = 1;
        node.querySelectorAll(":scope > li").forEach(li => {
          const chk = li.querySelector('input[type="checkbox"]');
          const t = (li.innerText || "").trim();
          if (!t) return;
          if (chk) blocks.push({ type: "task", checked: chk.checked, text: t, runs: parseRuns(li) });
          else blocks.push({ type: tag === "OL" ? "number" : "bullet", index: idx++, text: t, runs: parseRuns(li) });
        });
      } else if (tag === "TABLE") {
        const rows = [];
        node.querySelectorAll("tr").forEach(tr => {
          const cells = [...tr.querySelectorAll("th, td")].map(c => (c.innerText || "").trim());
          if (cells.length) rows.push(cells);
        });
        if (rows.length) blocks.push({ type: "table", rows });
      } else if (tag === "FIGURE" || tag === "IMG") {
        const img = tag === "IMG" ? node : node.querySelector("img");
        const cap = tag === "FIGURE" ? (node.querySelector("figcaption")?.innerText || "").trim() : "";
        if (img && img.src && img.src.startsWith("data:image/")) {
          blocks.push({ type: "image", dataUrl: img.src, caption: cap });
        }
      } else if (tag === "P" || tag === "DIV") {
        const img = node.querySelector("img");
        if (img && img.src && img.src.startsWith("data:image/") && !(node.innerText || "").trim()) {
          blocks.push({ type: "image", dataUrl: img.src, caption: "" });
          return;
        }
        const t = (node.innerText || "").trim();
        if (t) blocks.push({ type: "p", text: t, runs: parseRuns(node) });
      } else {
        node.childNodes.forEach(walkBlock);
      }
    };
    tmp.childNodes.forEach(walkBlock);
    return blocks;
  }

  function buildDeterministicSlides(card, minute, scope = "simple") {
    const blocks = extractBlocksFromHtml(minute.html);
    const images = blocks.filter(b => b.type === "image").map(b => b.dataUrl);
    const topics = [];
    let cur = null;
    blocks.forEach(b => {
      if (b.type === "h1" || b.type === "h2" || b.type === "h3") {
        if (cur && cur.bullets.length) topics.push(cur);
        cur = { kind: "topic", title: b.text, bullets: [] };
      } else if (b.type === "bullet" || b.type === "number" || b.type === "task" || b.type === "p" || b.type === "quote") {
        const txt = String(b.text || "").trim();
        if (!txt) return;
        if (!cur) cur = { kind: "topic", title: "Pontos Principais", bullets: [] };
        cur.bullets.push(txt.slice(0, 180));
      } else if (b.type === "table" && b.rows?.length > 1) {
        if (!cur) cur = { kind: "topic", title: "Encaminhamentos", bullets: [] };
        b.rows.slice(1, 6).forEach(r => cur.bullets.push(r.filter(Boolean).join(" — ").slice(0, 180)));
      }
    });
    if (cur && cur.bullets.length) topics.push(cur);
    if (!topics.length) {
      topics.push({ kind: "topic", title: "Resumo da Reunião", bullets: ["Registre tópicos na ata para preencher automaticamente os slides."] });
    }
    if (scope === "full" && card) {
      topics.unshift({
        kind: "topic",
        title: "Visão Geral do Cartão",
        bullets: [
          card.columnTitle ? `Status / Lista: ${card.columnTitle}` : "",
          card.priority ? `Prioridade: ${card.priority}` : "",
          card.start ? `Período: ${fmtDateTimeBR(card.start)}${card.end && card.end !== card.start ? ` a ${fmtDateTimeBR(card.end)}` : ""}` : "",
          card.location ? `Localidade: ${card.location}` : "",
          card.assignee ? `Responsável: ${card.assignee}` : ""
        ].filter(Boolean)
      });
    }
    if (Array.isArray(minute.linkedActions) && minute.linkedActions.length) {
      topics.push({
        kind: "actions",
        title: "Decisões e Encaminhamentos",
        bullets: minute.linkedActions.slice(0, 8).map(a => a.text)
      });
    }
    // Anexar imagens da ata aos primeiros slides de tópico
    images.slice(0, 3).forEach((dataUrl, i) => {
      if (topics[i]) topics[i].imageDataUrl = dataUrl;
    });

    const partsTxt = Array.isArray(minute.participants) && minute.participants.length
      ? `Participantes: ${minute.participants.join(", ")}`
      : "";
    const cover = {
      kind: "cover",
      title: card?.name || minute.title || "Apresentação",
      subtitle: minute.title || "",
      metaLines: [
        minute.meetingDate ? `Data: ${fmtDateTimeBR(minute.meetingDate)}` : "",
        partsTxt
      ].filter(Boolean)
    };
    const agenda = {
      kind: "agenda",
      title: "Roteiro",
      bullets: topics.map(t => t.title)
    };
    return [cover, agenda, ...topics];
  }

  async function openSlidesModal() {
    const ctx = getActiveContext();
    if (!ctx?.minute) return;
    scheduleAutoSave(true);
    const btn = $("#btnPmSlides");
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Gerando slides..."; }
    try {
      const plainText = ($("#pm-editor")?.innerText || "").trim();
      const aiRes = await window.FeriasApi.aiGenerateSlides({
        cardName: ctx.card.name,
        title: ctx.minute.title,
        meetingDate: fmtDateTimeBR(ctx.minute.meetingDate),
        participants: ctx.minute.participants,
        plainText,
        actions: ctx.minute.linkedActions || []
      });
      if (aiRes?.slides && Array.isArray(aiRes.slides) && aiRes.slides.length >= 2) {
        currentDeckSlides = aiRes.slides;
        // Preservar imagens inseridas na ata
        const imgs = extractBlocksFromHtml(ctx.minute.html).filter(b => b.type === "image").map(b => b.dataUrl);
        imgs.slice(0, 3).forEach((url, i) => {
          if (currentDeckSlides[i + 2]) currentDeckSlides[i + 2].imageDataUrl = url;
        });
      } else {
        currentDeckSlides = buildDeterministicSlides(ctx.card, ctx.minute, "simple");
      }
      activeSlideIdx = 0;
      renderSlidesPreview();
      $("#proMinuteSlidesModal")?.showModal();
      // Salvar e anexar automaticamente o arquivo .pptx na própria Ata (visível na Ata, em Documentos e no Google Drive)
      autoAttachPresentationToMinute(ctx, currentDeckSlides).catch(() => {});
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "📊 Criar Apresentação"; }
    }
  }

  async function autoAttachPresentationToMinute(ctx, slides) {
    if (!ctx?.minute || !Array.isArray(slides) || !slides.length) return;
    if (!window.FeriasApi?.buildMinutesPptxBlob || !window.FeriasApi?.uploadAttachment) return;
    const rawTitle = (ctx.minute.title || ctx.card?.name || "Ata").trim();
    const safeBase = rawTitle.replace(/[^\wÀ-ÿ\- ]+/g, "").replace(/\s+/g, "_").slice(0, 60) || "Ata";
    const fileName = `Apresentacao_${safeBase}.pptx`;
    const blob = await window.FeriasApi.buildMinutesPptxBlob({
      title: rawTitle,
      fileName: `Apresentacao_${safeBase}`,
      slides
    });
    const pptxMime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    const file = new File([blob], fileName, { type: pptxMime });
    const tripId = ctx.trip?.id || host.core?.getActiveTrip?.()?.id || "local";
    const cardId = ctx.card?.id || activeCardId || "minute";
    const up = await window.FeriasApi.uploadAttachment(tripId, cardId, file);
    if (!Array.isArray(ctx.minute.attachments)) ctx.minute.attachments = [];
    const newAtt = {
      ...up,
      fileName: up.fileName || fileName,
      size: up.size || file.size || 0,
      mimeType: up.mimeType || pptxMime,
      uploadedAt: up.uploadedAt || new Date().toISOString(),
      autoPresentation: true
    };
    const prevIdx = ctx.minute.attachments.findIndex(a => a && a.autoPresentation);
    if (prevIdx >= 0) {
      const oldAtt = ctx.minute.attachments[prevIdx];
      if (oldAtt?.driveFileId) newAtt.driveFileId = oldAtt.driveFileId;
      if (oldAtt?.id && oldAtt.id !== newAtt.id && window.FeriasApi?.deleteAttachment) {
        window.FeriasApi.deleteAttachment(oldAtt.id).catch(() => {});
      }
      ctx.minute.attachments[prevIdx] = newAtt;
    } else {
      ctx.minute.attachments.push(newAtt);
    }
    renderMinuteAttachments(ctx.minute);
    scheduleAutoSave(true);
    toast(`📊 Apresentação "${newAtt.fileName}" salva automaticamente nos anexos da Ata!`);
  }

  function renderSlidesPreview() {
    const rail = $("#pm-slidesRail");
    const canvas = $("#pm-slideCanvas");
    const edBar = $("#pm-slideEditorBar");
    if (!rail || !canvas) return;
    const sl = currentDeckSlides[activeSlideIdx] || currentDeckSlides[0];
    if (!sl) return;

    rail.innerHTML = currentDeckSlides.map((s, i) => `
      <button type="button" class="pm-slide-thumb${i === activeSlideIdx ? " active" : ""}" data-sl-i="${i}">
        <span class="pm-sl-num">${i + 1}</span>
        <strong>${esc(s.title || `Slide ${i + 1}`)}</strong>
      </button>`).join("");
    rail.querySelectorAll("[data-sl-i]").forEach(b => {
      b.onclick = () => { activeSlideIdx = parseInt(b.dataset.slI, 10); renderSlidesPreview(); };
    });

    if (sl.kind === "cover" || activeSlideIdx === 0) {
      canvas.innerHTML = `<div class="pm-clean-slide is-cover">
        <h1>${esc(sl.title)}</h1>
        ${sl.subtitle ? `<h3>${esc(sl.subtitle)}</h3>` : ""}
        ${(sl.metaLines || []).map(l => `<p class="pm-clean-meta">${esc(l)}</p>`).join("")}
      </div>`;
    } else {
      const bulletsHtml = (sl.bullets || []).map((b, bi) =>
        sl.kind === "agenda" ? `<li><b>${bi + 1}.</b> ${esc(b)}</li>` : `<li>${esc(b)}</li>`
      ).join("");
      canvas.innerHTML = `<div class="pm-clean-slide">
        <h2>${esc(sl.title)}</h2>
        <div class="pm-clean-slide-body${sl.imageDataUrl ? " has-img" : ""}">
          <ul class="${sl.kind === "agenda" ? "is-agenda" : ""}">${bulletsHtml}</ul>
          ${sl.imageDataUrl ? `<div class="pm-clean-slide-img"><img src="${sl.imageDataUrl}" alt="Imagem da ata"></div>` : ""}
        </div>
        <div class="pm-clean-slide-foot">${activeSlideIdx + 1} / ${currentDeckSlides.length}</div>
      </div>`;
    }

    if (edBar) {
      const isCover = sl.kind === "cover" || activeSlideIdx === 0;
      edBar.innerHTML = `
        <div class="form-grid" style="margin-top:8px">
          <label class="span2">Título do Slide ${activeSlideIdx + 1}
            <input type="text" id="pm-sl-ed-title" value="${esc(sl.title || "")}">
          </label>
          ${isCover
            ? `<label class="span2">Subtítulo<input type="text" id="pm-sl-ed-sub" value="${esc(sl.subtitle || "")}"></label>`
            : `<label class="span2">Tópicos (1 por linha)<textarea id="pm-sl-ed-bullets" rows="3">${esc((sl.bullets || []).join("\n"))}</textarea></label>`
          }
        </div>`;
      if ($("#pm-sl-ed-title")) {
        $("#pm-sl-ed-title").oninput = e => { sl.title = e.target.value; renderSlidesPreviewCanvasOnly(); };
      }
      if ($("#pm-sl-ed-sub")) {
        $("#pm-sl-ed-sub").oninput = e => { sl.subtitle = e.target.value; renderSlidesPreviewCanvasOnly(); };
      }
      if ($("#pm-sl-ed-bullets")) {
        $("#pm-sl-ed-bullets").oninput = e => {
          sl.bullets = e.target.value.split("\n").map(x => x.trim()).filter(Boolean);
          renderSlidesPreviewCanvasOnly();
        };
      }
    }
  }

  function renderSlidesPreviewCanvasOnly() {
    const sl = currentDeckSlides[activeSlideIdx];
    const canvas = $("#pm-slideCanvas");
    if (!sl || !canvas) return;
    const h = canvas.querySelector("h1, h2");
    if (h) h.textContent = sl.title || "";
    const sub = canvas.querySelector("h3");
    if (sub && sl.subtitle != null) sub.textContent = sl.subtitle;
    const ul = canvas.querySelector("ul");
    if (ul) {
      ul.innerHTML = (sl.bullets || []).map((b, bi) =>
        sl.kind === "agenda" ? `<li><b>${bi + 1}.</b> ${esc(b)}</li>` : `<li>${esc(b)}</li>`
      ).join("");
    }
  }

  function printSlidesCleanPdf(slides, title) {
    const pages = (slides || []).map((sl, idx) => {
      if (sl.kind === "cover" || idx === 0) {
        return `<section class="sl cover"><h1>${esc(sl.title)}</h1>${sl.subtitle ? `<h3>${esc(sl.subtitle)}</h3>` : ""}${(sl.metaLines || []).map(l => `<p class="meta">${esc(l)}</p>`).join("")}</section>`;
      }
      const ul = (sl.bullets || []).map((b, bi) => sl.kind === "agenda" ? `<li><b>${bi + 1}.</b> ${esc(b)}</li>` : `<li>${esc(b)}</li>`).join("");
      return `<section class="sl"><h2>${esc(sl.title)}</h2><div class="bd${sl.imageDataUrl ? " img" : ""}"><ul class="${sl.kind === "agenda" ? "ag" : ""}">${ul}</ul>${sl.imageDataUrl ? `<img src="${sl.imageDataUrl}">` : ""}</div><div class="ft">${idx + 1} / ${slides.length}</div></section>`;
    }).join("");
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title || "Apresentação")}</title>
      <style>
        @page { size: landscape; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #fff; color: #111; }
        .sl { width: 100vw; height: 100vh; padding: 48px 64px; page-break-after: always; display: flex; flex-direction: column; position: relative; background: #fff; }
        .sl.cover { justify-content: center; align-items: center; text-align: center; }
        .sl.cover h1 { font-size: 40px; margin: 0 0 14px; color: #111; }
        .sl.cover h3 { font-size: 20px; margin: 0 0 12px; color: #222; font-weight: 500; }
        .sl.cover .meta { font-size: 15px; color: #444; margin: 4px 0; }
        .sl h2 { font-size: 30px; margin: 0 0 18px; padding-bottom: 10px; border-bottom: 1.5px solid #e2e8f0; color: #111; }
        .bd { flex: 1; display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start; }
        .bd.img { grid-template-columns: 1.2fr 0.8fr; }
        .bd img { max-width: 100%; max-height: 62vh; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 6px; }
        ul { margin: 0; padding-left: 26px; font-size: 20px; line-height: 1.55; color: #111; }
        ul.ag { list-style: none; padding-left: 0; }
        li { margin-bottom: 10px; }
        .ft { position: absolute; right: 32px; bottom: 20px; font-size: 12px; color: #666; }
      </style></head><body>${pages}<script>window.onload=function(){window.print();};</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return toast("⚠️ Permita pop-ups para imprimir a apresentação.");
    w.document.open(); w.document.write(html); w.document.close();
  }

  /* ---------- EXPORTAÇÃO: ATA SIMPLES vs RELATÓRIO COMPLETO (DOCX / PDF / PPTX) ---------- */
  function buildDocBlocksForExport(card, minute, scope = "simple") {
    const blocks = [];
    if (scope === "full" && card) {
      blocks.push({ type: "h1", text: `Relatório Completo — ${card.name || "Cartão"}` });
      blocks.push({ type: "h2", text: "1. Dados do Cartão" });
      const infoRows = [
        ["Campo", "Informação"],
        ["Título do Cartão", card.name || "—"],
        ["Lista / Status", card.columnTitle || "—"],
        ["Prioridade", card.priority || "Média"],
        ["Datas do Evento", card.start ? `${fmtDateTimeBR(card.start)}${card.end && card.end !== card.start ? ` até ${fmtDateTimeBR(card.end)}` : ""}` : "—"],
        ["Localidade", card.location || "—"],
        ["Responsável(is)", Array.isArray(card.assigneesList) && card.assigneesList.length ? card.assigneesList.map(e => e.name).join(", ") : (card.assignee || "—")]
      ];
      if (card.client) infoRows.push(["Cliente", card.client]);
      if (Array.isArray(card.tags) && card.tags.length) infoRows.push(["Tags", card.tags.join(", ")]);
      blocks.push({ type: "table", rows: infoRows });

      if (Array.isArray(card.subtasks) && card.subtasks.length) {
        blocks.push({ type: "h3", text: "Checklist do Cartão" });
        card.subtasks.forEach(st => blocks.push({ type: "task", checked: Boolean(st.done), text: st.text }));
      }
      if (card.travelDetails && (card.travelDetails.transport || (card.travelDetails.segments || []).length)) {
        blocks.push({ type: "h3", text: "Resumo de Viagem / Financeiro" });
        const td = card.travelDetails;
        if (td.transport) blocks.push({ type: "p", text: `Modalidade de transporte: ${td.transport}${td.hasCost && td.costAmount ? ` · Custo: ${host.core.money(td.costAmount)}` : ""}` });
        (td.segments || []).forEach((s, i) => {
          blocks.push({ type: "bullet", text: `Trecho ${i + 1}: ${s.origin || "?"} → ${s.destination || "?"} (${fmtDateTimeBR(s.departAt)}) ${s.carrier || ""} ${s.flightNumber || ""} ${s.locator ? `Loc: ${s.locator}` : ""}` });
        });
      }
      blocks.push({ type: "hr" });
      blocks.push({ type: "h2", text: `2. Ata de Reunião — ${minute.title}` });
    } else {
      blocks.push({ type: "h1", text: minute.title || "Ata de Reunião" });
    }

    const hdrRows = [
      ["Cartão", card?.name || "—"],
      ["Data / Horário", fmtDateTimeBR(minute.meetingDate)],
      ["Local / Link", minute.location || "—"],
      ["Participantes", (minute.participants || []).join(", ") || "—"]
    ];
    blocks.push({ type: "table", rows: hdrRows });
    blocks.push({ type: "hr" });
    extractBlocksFromHtml(minute.html).forEach(b => blocks.push(b));

    if (scope === "full") {
      blocks.push({ type: "hr" });
      blocks.push({ type: "h2", text: "3. Anexos e Ações Vinculadas" });
      const allAtts = [
        ...(Array.isArray(minute.attachments) ? minute.attachments : []),
        ...(Array.isArray(card?.attachments) ? card.attachments : []),
        ...(Array.isArray(card?.travelDetails?.tickets) ? card.travelDetails.tickets : [])
      ];
      if (allAtts.length) {
        allAtts.forEach(a => blocks.push({ type: "bullet", text: `Anexo: ${a.fileName || a.name || "Documento"}` }));
      } else {
        blocks.push({ type: "p", text: "Nenhum anexo vinculado." });
      }
      if (Array.isArray(minute.linkedActions) && minute.linkedActions.length) {
        blocks.push({ type: "h3", text: "Ações / Cartões Criados a partir da Ata" });
        minute.linkedActions.forEach(la => {
          blocks.push({ type: "bullet", text: `[${la.kind === "new-card" ? "Novo Cartão" : (la.kind === "sys-check" ? "Checklist Geral" : "Checklist do Cartão")}] ${la.text}` });
        });
      }
    }
    return blocks;
  }

  function printMinutePdf(card, minute, scope = "simple") {
    const blocks = buildDocBlocksForExport(card, minute, scope);
    const bodyHtml = blocks.map(b => {
      if (b.type === "h1") return `<h1>${esc(b.text)}</h1>`;
      if (b.type === "h2") return `<h2>${esc(b.text)}</h2>`;
      if (b.type === "h3") return `<h3>${esc(b.text)}</h3>`;
      if (b.type === "hr") return `<hr>`;
      if (b.type === "quote") return `<blockquote>${esc(b.text)}</blockquote>`;
      if (b.type === "bullet") return `<div class="li">• ${esc(b.text)}</div>`;
      if (b.type === "number") return `<div class="li"><b>${b.index}.</b> ${esc(b.text)}</div>`;
      if (b.type === "task") return `<div class="li">${b.checked ? "☑" : "☐"} ${esc(b.text)}</div>`;
      if (b.type === "image") return `<figure><img src="${b.dataUrl}">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>`;
      if (b.type === "table") {
        const trs = b.rows.map((r, i) => `<tr>${r.map(c => i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
        return `<table><tbody>${trs}</tbody></table>`;
      }
      return `<p>${esc(b.text)}</p>`;
    }).join("");
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(minute.title)}</title>
      <style>
        @page { size: portrait; margin: 16mm 14mm; @bottom-right { content: "Página " counter(page) " de " counter(pages); font-size: 9pt; color: #64748b; } }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: Calibri, Arial, sans-serif; color: #111; font-size: 11pt; line-height: 1.48; margin: 0; }
        h1 { font-size: 18pt; color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin: 0 0 12px; }
        h2 { font-size: 13.5pt; color: #1e3a8a; margin: 16px 0 6px; break-after: avoid; }
        h3 { font-size: 11.5pt; color: #334155; margin: 12px 0 4px; break-after: avoid; }
        p { margin: 0 0 8px; }
        .li { padding-left: 16px; margin-bottom: 4px; }
        blockquote { border-left: 3px solid #2563eb; background: #f8fafc; padding: 6px 12px; margin: 8px 0; font-style: italic; break-inside: avoid; }
        hr { border: 0; border-top: 1px solid #cbd5e1; margin: 12px 0; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 10pt; break-inside: avoid; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; }
        th { background: #f1f5f9; font-weight: 700; }
        figure { text-align: center; margin: 10px 0; break-inside: avoid; }
        figure img { max-width: 90%; max-height: 360px; border-radius: 6px; }
        figcaption { font-size: 9pt; color: #64748b; margin-top: 4px; }
      </style></head><body>${bodyHtml}<script>window.onload=function(){window.print();};</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return toast("⚠️ Permita pop-ups para gerar o PDF.");
    w.document.open(); w.document.write(html); w.document.close();
  }

  async function exportMinute(card, minute, scope = "simple", format = "docx") {
    if (!minute) return;
    const prefix = scope === "full" ? "Relatorio_Completo" : "Ata_Reuniao";
    const safe = String(minute.title || card?.name || "Ata").replace(/[^\w\-]+/g, "_").slice(0, 60);
    try {
      if (format === "pdf") {
        printMinutePdf(card, minute, scope);
        return;
      }
      if (format === "docx") {
        const blocks = buildDocBlocksForExport(card, minute, scope);
        await window.FeriasApi.exportMinutesDocx({ title: minute.title, fileName: `${prefix}_${safe}`, blocks }, `${prefix}_${safe}.docx`);
        toast(`📘 Word (.docx) baixado com sucesso!`);
        return;
      }
      if (format === "pptx") {
        const slides = buildDeterministicSlides(card, minute, scope);
        await window.FeriasApi.exportMinutesPptx({ title: minute.title, fileName: `${prefix}_${safe}`, slides }, `${prefix}_${safe}.pptx`);
        toast(`📙 PowerPoint (.pptx) baixado com sucesso!`);
      }
    } catch (err) {
      toast("❌ " + (err.message || "Falha ao exportar ata."));
    }
  }

  /* ---------- BINDING DE EVENTOS DO EDITOR ---------- */
  function bindEvents() {
    if (bound) return;
    bound = true;

    const closeDropdowns = () => {
      if ($("#pm-aiMenu")) $("#pm-aiMenu").hidden = true;
      if ($("#pm-exportMenu")) $("#pm-exportMenu").hidden = true;
    };

    if ($("#btnPmSave")) {
      $("#btnPmSave").onclick = () => {
        closeDropdowns();
        scheduleAutoSave(true, true);
      };
    }
    $("#pm-cardLinkModeSeg")?.querySelectorAll("button").forEach(b => {
      b.onclick = () => setStandaloneLinkMode(b.dataset.pmLinkMode);
    });
    if ($("#pm-linkCardSearch")) {
      $("#pm-linkCardSearch").oninput = e => populateStandaloneCardLinkUI(e.target.value);
    }
    if ($("#pm-linkCardSelect")) {
      $("#pm-linkCardSelect").onchange = () => {
        if ($("#pm-linkCardSelect").value && standaloneDraft) {
          ensureStandaloneLinked(false);
          scheduleAutoSave(true);
        }
      };
    }
    if ($("#btnPmClose")) {
      $("#btnPmClose").onclick = () => {
        if (activeCardId) scheduleAutoSave(true);
        closeDropdowns();
        $("#proMinuteEditorModal")?.close();
      };
    }
    if ($("#btnPmFocusMode")) {
      $("#btnPmFocusMode").onclick = () => {
        const dlg = $("#proMinuteEditorModal");
        if (!dlg) return;
        const on = dlg.classList.toggle("is-focus-mode");
        $("#btnPmFocusMode").textContent = on ? "↩️ Sair do Foco" : "🎯 Foco";
      };
    }

    // Cabeçalho + Templates
    ["#pm-title", "#pm-meetingDate", "#pm-location"].forEach(s => {
      if ($(s)) $(s).oninput = () => scheduleAutoSave();
    });
    const addPart = (name) => {
      const clean = String(name || "").trim();
      const ctx = getActiveContext();
      if (!clean || !ctx?.minute) return;
      if (!ctx.minute.participants.some(p => p.toLowerCase() === clean.toLowerCase())) {
        ctx.minute.participants.push(clean);
        renderParticipantsChips(ctx.minute);
        scheduleAutoSave();
      }
    };
    if ($("#pm-participantPick")) {
      $("#pm-participantPick").onchange = e => {
        if (e.target.value) { addPart(e.target.value); e.target.value = ""; }
      };
    }
    if ($("#btnPmAddParticipant")) {
      $("#btnPmAddParticipant").onclick = () => {
        const inp = $("#pm-participantExt");
        if (inp?.value.trim()) { addPart(inp.value); inp.value = ""; }
      };
    }
    if ($("#pm-participantExt")) {
      $("#pm-participantExt").onkeydown = e => {
        if (e.key === "Enter") { e.preventDefault(); $("#btnPmAddParticipant")?.click(); }
      };
    }
    $("#pm-templatesBar")?.querySelectorAll("[data-pm-tpl]").forEach(btn => {
      btn.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        const tpl = btn.dataset.pmTpl;
        const ed = $("#pm-editor");
        if (!ed || !TEMPLATES[tpl]) return;
        const curTxt = (ed.innerText || "").trim();
        if (curTxt && !confirm("Aplicar este modelo na ata? A versão atual será salva no Histórico antes de trocar.")) return;
        const ctx = getActiveContext();
        if (curTxt && ctx?.minute) pushVersionSnapshot(ctx.minute, "Antes de aplicar modelo");
        ed.innerHTML = TEMPLATES[tpl]();
        updateWordCount();
        scheduleAutoSave(true);
        toast("📋 Modelo aplicado!");
      };
    });

    // Barra de Ferramentas estilo Word
    $("#pm-toolbar")?.querySelectorAll("[data-cmd]").forEach(btn => {
      btn.onmousedown = e => e.preventDefault();
      btn.onclick = () => {
        $("#pm-editor")?.focus();
        document.execCommand(btn.dataset.cmd, false, null);
        scheduleAutoSave();
      };
    });
    if ($("#pm-blockStyle")) {
      $("#pm-blockStyle").onchange = e => {
        $("#pm-editor")?.focus();
        document.execCommand("formatBlock", false, e.target.value);
        scheduleAutoSave();
      };
    }
    if ($("#pm-fontFamily")) {
      $("#pm-fontFamily").onchange = e => {
        $("#pm-editor")?.focus();
        document.execCommand("fontName", false, e.target.value);
        scheduleAutoSave();
      };
    }
    if ($("#pm-fontSize")) {
      $("#pm-fontSize").onchange = e => {
        $("#pm-editor")?.focus();
        document.execCommand("fontSize", false, e.target.value);
        scheduleAutoSave();
      };
    }
    if ($("#pm-foreColor")) {
      $("#pm-foreColor").oninput = e => {
        $("#pm-editor")?.focus();
        document.execCommand("foreColor", false, e.target.value);
        scheduleAutoSave();
      };
    }
    if ($("#pm-hiliteColor")) {
      $("#pm-hiliteColor").oninput = e => {
        $("#pm-editor")?.focus();
        document.execCommand("hiliteColor", false, e.target.value);
        scheduleAutoSave();
      };
    }
    if ($("#btnPmInsertTask")) {
      $("#btnPmInsertTask").onclick = () => {
        $("#pm-editor")?.focus();
        document.execCommand("insertHTML", false, `<ul><li class="pm-task-li"><input type="checkbox"> Tarefa da reunião</li></ul>`);
        scheduleAutoSave();
      };
    }
    if ($("#btnPmInsertTable")) {
      $("#btnPmInsertTable").onclick = () => {
        $("#pm-editor")?.focus();
        document.execCommand("insertHTML", false, `<table><thead><tr><th>Tópico / Ação</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>`);
        scheduleAutoSave();
      };
    }
    if ($("#btnPmTableAddRow")) {
      $("#btnPmTableAddRow").onclick = () => {
        const sel = window.getSelection();
        const tbl = sel?.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)?.closest("table") : null;
        if (!tbl) return toast("Clique dentro de uma tabela para adicionar linha.");
        const cols = tbl.rows[0]?.cells?.length || 3;
        const tr = (tbl.tBodies[0] || tbl).insertRow();
        for (let i = 0; i < cols; i++) tr.insertCell().innerHTML = "&nbsp;";
        scheduleAutoSave();
      };
    }
    if ($("#btnPmTableAddCol")) {
      $("#btnPmTableAddCol").onclick = () => {
        const sel = window.getSelection();
        const tbl = sel?.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)?.closest("table") : null;
        if (!tbl) return toast("Clique dentro de uma tabela para adicionar coluna.");
        [...tbl.rows].forEach((row, rIdx) => {
          const cell = document.createElement(rIdx === 0 ? "th" : "td");
          cell.innerHTML = rIdx === 0 ? "Coluna" : "&nbsp;";
          row.appendChild(cell);
        });
        scheduleAutoSave();
      };
    }
    if ($("#btnPmInsertQuote")) {
      $("#btnPmInsertQuote").onclick = () => {
        $("#pm-editor")?.focus();
        document.execCommand("formatBlock", false, "BLOCKQUOTE");
        scheduleAutoSave();
      };
    }
    if ($("#btnPmInsertLink")) {
      $("#btnPmInsertLink").onclick = async () => {
        const url = await window.myplanPromptDialog?.({
          title: "🔗 Inserir Link na Ata",
          label: "URL do link (https://...)",
          placeholder: "https://...",
          inputType: "url",
          submitLabel: "Inserir"
        });
        if (!url || !/^https?:\/\//i.test(url.trim())) return;
        $("#pm-editor")?.focus();
        document.execCommand("createLink", false, url.trim());
        scheduleAutoSave();
      };
    }
    if ($("#btnPmInsertImg")) $("#btnPmInsertImg").onclick = () => $("#pm-imgInput")?.click();
    if ($("#pm-imgInput")) {
      $("#pm-imgInput").onchange = e => {
        const f = e.target.files?.[0];
        if (f) insertImageFileIntoEditor(f);
        e.target.value = "";
      };
    }

    // Editor events: auto-save, paste image, drag-drop image, selection menus, clickable badges
    const ed = $("#pm-editor");
    if (ed) {
      ed.oninput = () => { updateWordCount(); scheduleAutoSave(); };
      ed.onmouseup = () => setTimeout(updateSelectionMenus, 10);
      ed.onkeyup = () => setTimeout(updateSelectionMenus, 10);
      ed.onpaste = e => {
        const items = [...(e.clipboardData?.items || [])];
        const imgItem = items.find(it => it.type.startsWith("image/"));
        if (imgItem) {
          e.preventDefault();
          insertImageFileIntoEditor(imgItem.getAsFile());
        }
      };
      ed.ondragover = e => e.preventDefault();
      ed.ondrop = e => {
        const f = [...(e.dataTransfer?.files || [])].find(x => x.type.startsWith("image/"));
        if (f) { e.preventDefault(); insertImageFileIntoEditor(f); }
      };
      ed.onclick = ev => {
        const badge = ev.target.closest("[data-pm-open-card]");
        if (badge && badge.dataset.pmOpenCard) {
          scheduleAutoSave(true);
          $("#proMinuteEditorModal")?.close();
          host.openCardModal?.(badge.dataset.pmOpenCard);
        }
      };
    }

    // Bubble Menu & Margin + Button
    $("#pm-bubbleMenu")?.querySelectorAll("[data-pm-act]").forEach(btn => {
      btn.onmousedown = e => e.preventDefault();
      btn.onclick = () => executeParagraphAction(btn.dataset.pmAct);
    });
    if ($("#pm-marginPlusBtn")) {
      $("#pm-marginPlusBtn").onmousedown = e => e.preventDefault();
      $("#pm-marginPlusBtn").onclick = () => {
        const bubble = $("#pm-bubbleMenu");
        const wrap = $("#pm-paperWrap");
        const plus = $("#pm-marginPlusBtn");
        if (!bubble || !wrap || !plus) return;
        bubble.hidden = !bubble.hidden;
        if (!bubble.hidden) {
          bubble.style.left = "36px";
          bubble.style.top = `${Math.max(6, parseInt(plus.style.top || "12", 10) - 6)}px`;
        }
      };
    }

    // Quick Card Modal submit
    if ($("#btnPmQcClose")) $("#btnPmQcClose").onclick = () => $("#proMinuteQuickCardModal")?.close();
    if ($("#btnPmQcCancel")) $("#btnPmQcCancel").onclick = () => $("#proMinuteQuickCardModal")?.close();
    if ($("#proMinuteQuickCardForm")) {
      $("#proMinuteQuickCardForm").onsubmit = async e => {
        e.preventDefault();
        const ctx = getActiveContext();
        if (!ctx?.minute) return;
        const title = ($("#pmqc-title")?.value || "").trim();
        if (!title) return;
        const newId = uid();
        const colId = $("#pmqc-col")?.value || ctx.card.columnId || "";
        const asg = $("#pmqc-assignee")?.value || "";
        const due = $("#pmqc-due")?.value || host.core.fmtISO(new Date());
        const prio = $("#pmqc-prio")?.value || "Média";
        const notes = $("#pmqc-notes")?.value || "";
        if (!Array.isArray(ctx.data.activities)) ctx.data.activities = [];
        ctx.data.activities.push({
          id: newId,
          name: title,
          type: "Desenvolvimento",
          columnId: colId,
          start: due,
          end: due,
          priority: prio,
          progress: 0,
          assignee: asg,
          assigneesList: asg ? [{ name: asg, travels: false }] : [],
          notes,
          labels: [...(ctx.card.labels || [])],
          tags: [...(ctx.card.tags || [])]
        });
        ctx.minute.linkedActions.push({
          id: uid(), kind: "new-card", text: title, targetCardId: newId, targetCardName: title, createdAt: new Date().toISOString()
        });
        appendActionBadgeToBlock(pendingQuickCardBlock, "new-card", `🗂️ Cartão Criado: #${title.slice(0, 32)}`, newId);
        $("#proMinuteQuickCardModal")?.close();
        scheduleAutoSave(true);
        toast(`🗂️ Novo cartão "${title}" criado e vinculado à ata!`);
      };
    }

    // Anexos da Ata
    if ($("#btnPmAttachFile")) $("#btnPmAttachFile").onclick = () => $("#pm-attachInput")?.click();
    if ($("#pm-attachInput")) {
      $("#pm-attachInput").onchange = async e => {
        const files = [...(e.target.files || [])];
        e.target.value = "";
        const ctx = getActiveContext();
        if (!files.length || !ctx?.minute) return;
        for (const f of files) {
          try {
            const up = await window.FeriasApi.uploadAttachment(ctx.trip?.id || "local", ctx.card.id, f);
            ctx.minute.attachments.push({
              ...up,
              size: up.size || f.size || 0,
              mimeType: up.mimeType || f.type || "",
              uploadedAt: up.uploadedAt || new Date().toISOString()
            });
          } catch (err) {
            toast("❌ " + (err.message || err));
          }
        }
        renderMinuteAttachments(ctx.minute);
        scheduleAutoSave(true);
        toast(`📎 ${files.length} documento(s) anexado(s) à ata!`);
      };
    }

    // Dropdown IA + Histórico + Slides + Exportar
    if ($("#btnPmAiMenu")) {
      $("#btnPmAiMenu").onclick = e => {
        e.stopPropagation();
        const m = $("#pm-aiMenu");
        if ($("#pm-exportMenu")) $("#pm-exportMenu").hidden = true;
        if (m) m.hidden = !m.hidden;
      };
    }
    $("#pm-aiMenu")?.querySelectorAll("[data-pm-ai-style]").forEach(b => {
      b.onclick = () => runAiImproveMinute(b.dataset.pmAiStyle);
    });
    if ($("#btnPmHistory")) $("#btnPmHistory").onclick = () => { closeDropdowns(); openHistoryModal(); };
    if ($("#btnPmHistClose")) $("#btnPmHistClose").onclick = () => $("#proMinuteHistoryModal")?.close();
    if ($("#btnPmHistRestore")) {
      $("#btnPmHistRestore").onclick = () => {
        const ctx = getActiveContext();
        const sel = ctx?.minute?.versions?.[selectedHistoryIdx];
        if (!sel) return;
        pushVersionSnapshot(ctx.minute, "Antes de restaurar versão");
        if ($("#pm-editor")) $("#pm-editor").innerHTML = sanitizeMinuteHtml(sel.html || "<p><br></p>");
        updateWordCount();
        scheduleAutoSave(true);
        $("#proMinuteHistoryModal")?.close();
        toast("↺ Versão restaurada com sucesso!");
      };
    }

    if ($("#btnPmSlides")) $("#btnPmSlides").onclick = () => { closeDropdowns(); openSlidesModal(); };
    if ($("#btnPmSlidesClose")) $("#btnPmSlidesClose").onclick = () => $("#proMinuteSlidesModal")?.close();
    if ($("#btnPmSlidesCancel")) $("#btnPmSlidesCancel").onclick = () => $("#proMinuteSlidesModal")?.close();
    if ($("#btnPmSlidesPrintPdf")) {
      $("#btnPmSlidesPrintPdf").onclick = () => printSlidesCleanPdf(currentDeckSlides, getActiveContext()?.minute?.title || "Apresentação");
    }
    if ($("#btnPmSlidesDownloadPptx")) {
      $("#btnPmSlidesDownloadPptx").onclick = async () => {
        const ctx = getActiveContext();
        const safe = String(ctx?.minute?.title || "Apresentacao").replace(/[^\w\-]+/g, "_").slice(0, 60);
        try {
          await window.FeriasApi.exportMinutesPptx({ title: ctx?.minute?.title || "Apresentação", fileName: `Apresentacao_${safe}`, slides: currentDeckSlides }, `Apresentacao_${safe}.pptx`);
          toast("📙 Apresentação PowerPoint (.pptx) baixada!");
        } catch (err) { toast("❌ " + (err.message || err)); }
      };
    }

    if ($("#btnPmExportMenu")) {
      $("#btnPmExportMenu").onclick = e => {
        e.stopPropagation();
        const m = $("#pm-exportMenu");
        if ($("#pm-aiMenu")) $("#pm-aiMenu").hidden = true;
        if (m) m.hidden = !m.hidden;
      };
    }
    $("#pm-exportMenu")?.querySelectorAll("[data-pm-exp]").forEach(b => {
      b.onclick = () => {
        closeDropdowns();
        const ctx = getActiveContext();
        if (!ctx?.minute) return;
        scheduleAutoSave(true);
        const [scope, fmt] = b.dataset.pmExp.split(":");
        exportMinute(ctx.card, ctx.minute, scope, fmt);
      };
    });

    $("#proMinuteEditorModal")?.addEventListener("click", ev => {
      if (!ev.target.closest(".pm-dd-host")) closeDropdowns();
    });
  }

  window.MyPlanMinutes = {
    init(h) { host = h; bindEvents(); },
    normalizeMinute,
    renderCardMinutesList,
    createNewMinuteForCard,
    openStandaloneNewMinute,
    openMinuteEditor,
    exportMinute
  };
})();
