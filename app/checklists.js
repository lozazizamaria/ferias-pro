/* ==========================================================================
   My Plan — Motor Unificado de Checklists (Global + Drag & Drop Desktop/Mobile)
   Agregação automática dos itens de todos os cartões ativos (Pro e Pessoal),
   Filtros completos, Classificação, Drag & Drop de prioridade e Sincronização.
   ========================================================================== */
(() => {
  const PRIO_RANK = { Alta: 1, "Média": 2, Baixa: 3 };
  const esc = s => (window.MyPlanUtils?.esc ? window.MyPlanUtils.esc(s) : String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));

  const stateByScope = {
    personal: {
      sort: "manual",
      filters: { search: "", status: "", prio: "", type: "", list: "", assignee: "", tag: "", dateFrom: "", dateTo: "" }
    },
    pro: {
      sort: "manual",
      filters: { search: "", status: "", prio: "", type: "", list: "", assignee: "", tag: "", dateFrom: "", dateTo: "" }
    }
  };

  function normScope(scope) {
    return scope === "pro" ? "pro" : "personal";
  }

  function normPrio(p) {
    if (p === "Alta" || p === "Baixa" || p === "Média") return p;
    return "Média";
  }

  function countActiveFilters(f) {
    let n = 0;
    if (f.search) n++;
    if (f.status) n++;
    if (f.prio) n++;
    if (f.type) n++;
    if (f.list) n++;
    if (f.assignee) n++;
    if (f.tag) n++;
    if (f.dateFrom || f.dateTo) n++;
    return n;
  }

  /* ---------- DRAG & DROP UNIFICADO (DESKTOP HTML5 + MOBILE TOUCH/POINTER) ---------- */
  function bindDragReorder(container, itemSelector, handleSelector, onReorder) {
    if (!container || typeof onReorder !== "function") return;
    let dragFromIdx = -1;

    const getItems = () => [...container.querySelectorAll(itemSelector)];
    const clearClasses = () => getItems().forEach(el => el.classList.remove("dragging-row", "drag-over"));

    // 1. Desktop HTML5 Drag & Drop
    getItems().forEach((el, idx) => {
      el.setAttribute("draggable", "true");
      el.dataset.dndIdx = String(idx);

      el.addEventListener("dragstart", ev => {
        if (ev.target && ev.target.closest("input, select, textarea, button, a")) {
          ev.preventDefault();
          return;
        }
        dragFromIdx = parseInt(el.dataset.dndIdx, 10);
        el.classList.add("dragging-row");
        if (ev.dataTransfer) {
          ev.dataTransfer.effectAllowed = "move";
          ev.dataTransfer.setData("text/plain", String(dragFromIdx));
        }
      });

      el.addEventListener("dragover", ev => {
        ev.preventDefault();
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
        const targetIdx = parseInt(el.dataset.dndIdx, 10);
        if (dragFromIdx >= 0 && dragFromIdx !== targetIdx) {
          clearClasses();
          const src = getItems()[dragFromIdx];
          if (src) src.classList.add("dragging-row");
          el.classList.add("drag-over");
        }
      });

      el.addEventListener("dragleave", () => el.classList.remove("drag-over"));

      el.addEventListener("drop", ev => {
        ev.preventDefault();
        const toIdx = parseInt(el.dataset.dndIdx, 10);
        const fromIdx = dragFromIdx >= 0 ? dragFromIdx : parseInt(ev.dataTransfer?.getData("text/plain") || "-1", 10);
        dragFromIdx = -1;
        clearClasses();
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          onReorder(fromIdx, toIdx);
        }
      });

      el.addEventListener("dragend", () => {
        dragFromIdx = -1;
        clearClasses();
      });

      // 2. Mobile / Touch Pointer Drag via alça ⋮⋮
      const handle = handleSelector ? el.querySelector(handleSelector) : el;
      if (handle) {
        handle.addEventListener("touchstart", ev => {
          if (ev.touches.length !== 1) return;
          const fromIdx = parseInt(el.dataset.dndIdx, 10);
          let currentTargetIdx = fromIdx;
          el.classList.add("dragging-row");

          const onMove = mv => {
            if (!mv.touches || !mv.touches.length) return;
            mv.preventDefault();
            const touch = mv.touches[0];
            const items = getItems();
            let hitIdx = currentTargetIdx;
            for (let i = 0; i < items.length; i++) {
              const r = items[i].getBoundingClientRect();
              if (touch.clientY >= r.top && touch.clientY <= r.bottom) {
                hitIdx = i;
                break;
              }
            }
            if (hitIdx !== currentTargetIdx) {
              currentTargetIdx = hitIdx;
              items.forEach((it, i) => it.classList.toggle("drag-over", i === hitIdx && i !== fromIdx));
            }
          };

          const onEnd = () => {
            document.removeEventListener("touchmove", onMove);
            document.removeEventListener("touchend", onEnd);
            document.removeEventListener("touchcancel", onEnd);
            clearClasses();
            if (currentTargetIdx >= 0 && currentTargetIdx !== fromIdx) {
              onReorder(fromIdx, currentTargetIdx);
            }
          };

          document.addEventListener("touchmove", onMove, { passive: false });
          document.addEventListener("touchend", onEnd);
          document.addEventListener("touchcancel", onEnd);
        }, { passive: true });
      }
    });
  }

  /* ---------- AGREGAÇÃO DE ITENS DE TODOS OS CARTÕES ATIVOS + AVULSOS ---------- */
  function buildEntries({ activities, manualChecklist, getTypeInfo, getListName, getAssignees }) {
    const entries = [];
    let fallbackSeq = 0;

    (activities || []).forEach(card => {
      if (!card || card.archived) return;
      const subs = Array.isArray(card.subtasks) ? card.subtasks : [];
      if (!subs.length) return;
      const typeInfo = getTypeInfo ? getTypeInfo(card.type) : { id: card.type || "Outro", short: card.type || "Outro", color: "#2563eb" };
      const listName = getListName ? getListName(card) : "";
      const listId = card.columnId || card.personalColId || "";
      const assignees = getAssignees ? getAssignees(card) : [];
      const tags = Array.isArray(card.tags) ? card.tags : [];
      const cardDate = card.start || card.end || "";

      subs.forEach((st, subIdx) => {
        if (!st || !String(st.text || "").trim()) return;
        if (!st.id) st.id = `sub_${card.id}_${subIdx}_${Date.now().toString(36)}`;
        const orderVal = Number.isFinite(Number(st.globalOrder)) ? Number(st.globalOrder) : (100000 + fallbackSeq++);
        entries.push({
          uid: `card::${card.id}::${st.id}`,
          kind: "card-subtask",
          card,
          cardId: card.id,
          cardName: card.name || "Sem título",
          cardTypeId: typeInfo.id || card.type || "Outro",
          cardTypeLabel: typeInfo.short || typeInfo.id || card.type || "Outro",
          cardTypeColor: typeInfo.color || "#2563eb",
          listId,
          listName,
          assignees,
          tags,
          subtask: st,
          subtaskId: st.id,
          subtaskIdx: subIdx,
          text: String(st.text || "").trim(),
          done: Boolean(st.done),
          prio: normPrio(st.prio),
          date: st.dueDate || cardDate || "",
          notes: "",
          globalOrder: orderVal
        });
      });
    });

    (manualChecklist || []).forEach((it, idx) => {
      if (!it) return;
      const orderVal = Number.isFinite(Number(it.globalOrder)) ? Number(it.globalOrder) : (200000 + idx);
      entries.push({
        uid: `manual::${it.id}`,
        kind: "manual",
        manualItem: it,
        manualId: it.id,
        card: null,
        cardId: "",
        cardName: it.cat ? `Avulso · ${it.cat}` : "Item Avulso",
        cardTypeId: "__manual__",
        cardTypeLabel: it.cat || "Checklist",
        cardTypeColor: "#64748b",
        listId: "",
        listName: "",
        assignees: [],
        tags: [],
        text: String(it.item || "").trim(),
        done: it.status === "Concluído",
        prio: normPrio(it.prio),
        date: it.dueDate || "",
        notes: it.notes || "",
        globalOrder: orderVal
      });
    });

    return entries;
  }

  function applyFilters(entries, f) {
    const q = String(f.search || "").trim().toLowerCase();
    return entries.filter(e => {
      if (q) {
        const hay = `${e.text} ${e.cardName} ${e.cardTypeLabel} ${e.listName} ${e.notes} ${e.assignees.join(" ")} ${e.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (f.status === "pending" && e.done) return false;
      if (f.status === "done" && !e.done) return false;
      if (f.prio && e.prio !== f.prio) return false;
      if (f.type && e.cardTypeId !== f.type) return false;
      if (f.list && e.listId !== f.list) return false;
      if (f.assignee && !e.assignees.some(a => a.toLowerCase() === f.assignee.toLowerCase())) return false;
      if (f.tag && !e.tags.some(t => t.toLowerCase() === f.tag.toLowerCase())) return false;
      if (f.dateFrom && (!e.date || e.date < f.dateFrom)) return false;
      if (f.dateTo && (!e.date || e.date > f.dateTo)) return false;
      return true;
    });
  }

  function sortEntries(entries, sortMode) {
    const list = entries.slice();
    const cmpText = (a, b) => String(a || "").localeCompare(String(b || ""), "pt-BR", { sensitivity: "base" });
    const cmpDateAsc = (a, b) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    };
    const cmpDateDesc = (a, b) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      return b.localeCompare(a);
    };
    list.sort((a, b) => {
      switch (sortMode) {
        case "prio_desc":
          return (PRIO_RANK[a.prio] || 2) - (PRIO_RANK[b.prio] || 2) || a.globalOrder - b.globalOrder;
        case "prio_asc":
          return (PRIO_RANK[b.prio] || 2) - (PRIO_RANK[a.prio] || 2) || a.globalOrder - b.globalOrder;
        case "date_asc":
          return cmpDateAsc(a.date, b.date) || (PRIO_RANK[a.prio] || 2) - (PRIO_RANK[b.prio] || 2);
        case "date_desc":
          return cmpDateDesc(a.date, b.date) || (PRIO_RANK[a.prio] || 2) - (PRIO_RANK[b.prio] || 2);
        case "type_asc":
          return cmpText(a.cardTypeLabel, b.cardTypeLabel) || cmpText(a.cardName, b.cardName) || a.globalOrder - b.globalOrder;
        case "card_asc":
          return cmpText(a.cardName, b.cardName) || a.globalOrder - b.globalOrder;
        case "status_pending":
          return (a.done === b.done ? 0 : (a.done ? 1 : -1)) || (PRIO_RANK[a.prio] || 2) - (PRIO_RANK[b.prio] || 2) || a.globalOrder - b.globalOrder;
        case "manual":
        default:
          return a.globalOrder - b.globalOrder || (PRIO_RANK[a.prio] || 2) - (PRIO_RANK[b.prio] || 2);
      }
    });
    return list;
  }

  function populateSelect(sel, defaultLabel, options, currentVal) {
    if (!sel) return;
    const html = [`<option value="">${esc(defaultLabel)}</option>`]
      .concat(options.map(([v, lbl]) => `<option value="${esc(v)}"${v === currentVal ? " selected" : ""}>${esc(lbl)}</option>`))
      .join("");
    sel.innerHTML = html;
    if (currentVal && !options.some(([v]) => v === currentVal)) sel.value = "";
    else sel.value = currentVal || "";
  }

  /* ---------- RENDERIZAÇÃO GLOBAL DO MENU CHECKLIST ---------- */
  function renderGlobalChecklist(opts) {
    const {
      scope = "personal",
      rootEl,
      activities,
      manualChecklist,
      allTypes = [],
      allLists = [],
      allAssignees = [],
      allTags = [],
      getTypeInfo,
      getListName,
      getAssignees,
      fmtBR,
      onOpenCard,
      onPromoteSubtask,
      onEditManual,
      onDeleteManual,
      onSyncCardProgress,
      onSave
    } = opts;

    if (!rootEl) return;
    const sc = normScope(scope);
    const stScope = stateByScope[sc];
    const f = stScope.filters;

    const allEntries = buildEntries({ activities, manualChecklist, getTypeInfo, getListName, getAssignees });
    const doneTotal = allEntries.filter(e => e.done).length;
    const totalCount = allEntries.length;

    const progEl = rootEl.querySelector("[data-chk-progress]");
    const barEl = rootEl.querySelector("[data-chk-bar]");
    if (progEl) progEl.textContent = `${doneTotal}/${totalCount}`;
    if (barEl) barEl.style.width = `${totalCount ? Math.round((doneTotal / totalCount) * 100) : 0}%`;

    // Popular selects do popover de filtros
    const typeOpts = allTypes.map(t => [t.id, t.short || t.label || t.id]);
    if (allEntries.some(e => e.kind === "manual")) typeOpts.push(["__manual__", "Item Avulso"]);
    populateSelect(rootEl.querySelector("[data-chk-f='type']"), "Todos os tipos", typeOpts, f.type);
    populateSelect(rootEl.querySelector("[data-chk-f='list']"), "Todas as listas", allLists.map(l => [l.id, l.title || l.name || l.id]), f.list);
    if (sc === "pro") {
      populateSelect(rootEl.querySelector("[data-chk-f='assignee']"), "Todos os responsáveis", allAssignees.map(a => [a, a]), f.assignee);
    }
    populateSelect(rootEl.querySelector("[data-chk-f='tag']"), "Todas as tags", allTags.map(t => [t, t]), f.tag);

    // Sincronizar inputs de filtro com estado atual
    const syncField = (k, val) => {
      const el = rootEl.querySelector(`[data-chk-f='${k}']`);
      if (el && el.value !== (val || "")) el.value = val || "";
    };
    syncField("search", f.search);
    syncField("status", f.status);
    syncField("prio", f.prio);
    syncField("dateFrom", f.dateFrom);
    syncField("dateTo", f.dateTo);

    const sortSel = rootEl.querySelector("[data-chk-sort]");
    if (sortSel && sortSel.value !== stScope.sort) sortSel.value = stScope.sort;

    const activeCnt = countActiveFilters(f);
    const fBtn = rootEl.querySelector("[data-chk-filter-btn]");
    const fCnt = rootEl.querySelector("[data-chk-filter-count]");
    const fClr = rootEl.querySelector("[data-chk-clear-filters]");
    if (fBtn) fBtn.classList.toggle("has-active", activeCnt > 0);
    if (fCnt) { fCnt.textContent = activeCnt ? String(activeCnt) : ""; fCnt.hidden = !activeCnt; }
    if (fClr) fClr.hidden = !activeCnt;

    // Filtrar e ordenar
    const filtered = applyFilters(allEntries, f);
    const sorted = sortEntries(filtered, stScope.sort);

    // Helper para persistir ordem manual após Drag & Drop ou ▲/▼
    const persistReorder = (fromIdx, toIdx) => {
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx || fromIdx >= sorted.length || toIdx >= sorted.length) return;
      const reorderedVisible = sorted.slice();
      const [moved] = reorderedVisible.splice(fromIdx, 1);
      reorderedVisible.splice(toIdx, 0, moved);

      // Reconstruir lista global completa mantendo itens ocultos pelo filtro nas suas posições relativas
      const visibleSet = new Set(reorderedVisible.map(x => x.uid));
      const fullCurrent = sortEntries(allEntries, stScope.sort);
      let visCursor = 0;
      const finalOrder = fullCurrent.map(item => (visibleSet.has(item.uid) ? reorderedVisible[visCursor++] : item));

      finalOrder.forEach((item, orderIdx) => {
        if (item.kind === "card-subtask" && item.subtask) {
          item.subtask.globalOrder = orderIdx;
        } else if (item.kind === "manual" && item.manualItem) {
          item.manualItem.globalOrder = orderIdx;
        }
      });

      stScope.sort = "manual";
      onSave?.("↕️ Prioridade do checklist atualizada!");
    };

    const prioClass = p => (p === "Alta" ? "is-alta" : p === "Baixa" ? "is-baixa" : "is-media");
    const fmtDate = iso => (iso && fmtBR ? fmtBR(iso) : (iso || "—"));

    // Tabela Desktop
    const tb = rootEl.querySelector("table");
    if (tb) {
      if (!sorted.length) {
        tb.innerHTML = `<tbody><tr><td colspan="7" class="muted" style="text-align:center;padding:28px">
          ${totalCount ? "Nenhum item de checklist corresponde aos filtros selecionados." : "Nenhum item de checklist encontrado. Adicione itens dentro dos seus cartões ou clique em ➕ Item."}
        </td></tr></tbody>`;
      } else {
        let html = `<thead><tr>
          <th style="width:32px" title="Arraste para alterar prioridade">↕</th>
          <th style="width:36px">✓</th>
          <th>Item do Checklist</th>
          <th style="width:112px">Prioridade</th>
          <th style="width:104px">Data</th>
          <th style="width:128px">Tipo</th>
          <th>Cartão de Origem</th>
          <th style="width:118px">Ações</th>
        </tr></thead><tbody>`;

        sorted.forEach((e, idx) => {
          const originBtn = e.kind === "card-subtask"
            ? `<button type="button" class="chk-origin-badge" data-chk-open-card="${esc(e.cardId)}" title="Abrir cartão: ${esc(e.cardName)}">
                 <span class="chk-origin-dot" style="background:${esc(e.cardTypeColor)}"></span>
                 <span class="chk-origin-txt">${esc(e.cardName)}</span>
                 <span class="chk-origin-arrow" aria-hidden="true">↗</span>
               </button>`
            : `<span class="chk-origin-badge is-manual">${esc(e.cardName)}</span>`;

          const promoteBtn = e.kind === "card-subtask" && onPromoteSubtask
            ? `<button type="button" class="icon-btn chk-promote-btn" data-chk-promote="${idx}" title="Transformar em cartão" aria-label="Transformar em cartão">↗️</button>`
            : "";

          const manualBtns = e.kind === "manual"
            ? `<button type="button" class="icon-btn" data-chk-medit="${esc(e.manualId)}" title="Editar">✏️</button>
               <button type="button" class="icon-btn" data-chk-mdel="${esc(e.manualId)}" title="Excluir">🗑️</button>`
            : `<button type="button" class="icon-btn" data-chk-sdel="${idx}" title="Remover item do cartão">🗑️</button>`;

          html += `<tr class="chk-row chk-global-row ${e.done ? "done" : ""}" data-chk-idx="${idx}">
            <td><span class="drag-handle chk-drag-handle" title="Arraste para alterar prioridade">⋮⋮</span></td>
            <td><input type="checkbox" data-chk-toggle="${idx}" ${e.done ? "checked" : ""} aria-label="Concluir ${esc(e.text)}"></td>
            <td class="chk-text-cell">
              <div class="chk-item-title">${esc(e.text)}</div>
              ${e.listName ? `<span class="chk-meta-chip">📋 ${esc(e.listName)}</span>` : ""}
              ${e.assignees.length ? `<span class="chk-meta-chip">👤 ${esc(e.assignees.join(", "))}</span>` : ""}
              ${e.notes ? `<div class="muted small">${esc(e.notes)}</div>` : ""}
            </td>
            <td>
              <select class="chk-prio-sel ${prioClass(e.prio)}" data-chk-prio="${idx}" aria-label="Prioridade">
                <option value="Alta" ${e.prio === "Alta" ? "selected" : ""}>🔴 Alta</option>
                <option value="Média" ${e.prio === "Média" ? "selected" : ""}>🟡 Média</option>
                <option value="Baixa" ${e.prio === "Baixa" ? "selected" : ""}>🟢 Baixa</option>
              </select>
            </td>
            <td class="chk-date-cell">${esc(fmtDate(e.date))}</td>
            <td><span class="chk-type-pill" style="--chk-type-c:${esc(e.cardTypeColor)}">${esc(e.cardTypeLabel)}</span></td>
            <td>${originBtn}</td>
            <td class="chk-actions-cell">
              <button type="button" class="icon-btn" data-chk-move="${idx}:-1" ${idx === 0 ? "disabled" : ""} title="Subir prioridade">▲</button>
              <button type="button" class="icon-btn" data-chk-move="${idx}:1" ${idx === sorted.length - 1 ? "disabled" : ""} title="Descer prioridade">▼</button>
              ${promoteBtn}
              ${manualBtns}
            </td>
          </tr>`;
        });
        tb.innerHTML = html + "</tbody>";
      }
    }

    // Cards Mobile
    const mc = rootEl.querySelector(".mobile-cards");
    if (mc) {
      if (!sorted.length) {
        mc.innerHTML = `<p class="muted" style="text-align:center;padding:18px 8px">${totalCount ? "Nenhum item corresponde aos filtros." : "Nenhum item de checklist encontrado."}</p>`;
      } else {
        mc.innerHTML = sorted.map((e, idx) => {
          const originBtn = e.kind === "card-subtask"
            ? `<button type="button" class="chk-origin-badge" data-chk-open-card="${esc(e.cardId)}">
                 <span class="chk-origin-dot" style="background:${esc(e.cardTypeColor)}"></span>
                 <span class="chk-origin-txt">${esc(e.cardName)}</span>
                 <span class="chk-origin-arrow">↗</span>
               </button>`
            : `<span class="chk-origin-badge is-manual">${esc(e.cardName)}</span>`;
          const promoteBtn = e.kind === "card-subtask" && onPromoteSubtask
            ? `<button type="button" class="icon-btn chk-promote-btn" data-chk-promote="${idx}" title="Transformar em cartão">↗️</button>`
            : "";
          const delBtn = e.kind === "manual"
            ? `<button type="button" class="icon-btn" data-chk-medit="${esc(e.manualId)}" title="Editar">✏️</button>
               <button type="button" class="icon-btn" data-chk-mdel="${esc(e.manualId)}" title="Excluir">🗑️</button>`
            : `<button type="button" class="icon-btn" data-chk-sdel="${idx}" title="Remover item">🗑️</button>`;

          return `<div class="m-card chk-mobile-card ${e.done ? "done" : ""}" data-chk-idx="${idx}">
            <div class="m-card-head">
              <label class="chk-mobile-main">
                <span class="drag-handle chk-drag-handle" title="Arraste para reordenar">⋮⋮</span>
                <input type="checkbox" data-chk-toggle="${idx}" ${e.done ? "checked" : ""}>
                <span class="chk-item-title">${esc(e.text)}</span>
              </label>
              <div class="inline-actions">
                <button type="button" class="icon-btn" data-chk-move="${idx}:-1" ${idx === 0 ? "disabled" : ""} title="Subir">▲</button>
                <button type="button" class="icon-btn" data-chk-move="${idx}:1" ${idx === sorted.length - 1 ? "disabled" : ""} title="Descer">▼</button>
                ${promoteBtn}
                ${delBtn}
              </div>
            </div>
            <div class="chk-mobile-meta">
              <select class="chk-prio-sel ${prioClass(e.prio)}" data-chk-prio="${idx}" aria-label="Prioridade">
                <option value="Alta" ${e.prio === "Alta" ? "selected" : ""}>🔴 Alta</option>
                <option value="Média" ${e.prio === "Média" ? "selected" : ""}>🟡 Média</option>
                <option value="Baixa" ${e.prio === "Baixa" ? "selected" : ""}>🟢 Baixa</option>
              </select>
              <span class="chk-type-pill" style="--chk-type-c:${esc(e.cardTypeColor)}">${esc(e.cardTypeLabel)}</span>
              ${e.date ? `<span class="chk-meta-chip">📅 ${esc(fmtDate(e.date))}</span>` : ""}
            </div>
            <div class="chk-mobile-origin">${originBtn}</div>
          </div>`;
        }).join("");
      }
    }

    // Bind eventos de linha (desktop + mobile)
    const bindListEvents = host => {
      if (!host) return;
      host.querySelectorAll("[data-chk-toggle]").forEach(cb => {
        cb.onchange = () => {
          const entry = sorted[parseInt(cb.dataset.chkToggle, 10)];
          if (!entry) return;
          if (entry.kind === "card-subtask" && entry.subtask) {
            entry.subtask.done = cb.checked;
            onSyncCardProgress?.(entry.card);
            onSave?.(cb.checked ? "✅ Item concluído e sincronizado com o cartão!" : "↩️ Item reaberto no cartão.");
          } else if (entry.kind === "manual" && entry.manualItem) {
            entry.manualItem.status = cb.checked ? "Concluído" : "Pendente";
            onSave?.(cb.checked ? "✅ Item concluído!" : "");
          }
        };
      });

      host.querySelectorAll("[data-chk-prio]").forEach(sel => {
        sel.onchange = () => {
          const entry = sorted[parseInt(sel.dataset.chkPrio, 10)];
          if (!entry) return;
          const nextPrio = normPrio(sel.value);
          if (entry.kind === "card-subtask" && entry.subtask) entry.subtask.prio = nextPrio;
          else if (entry.kind === "manual" && entry.manualItem) entry.manualItem.prio = nextPrio;
          onSave?.("🎯 Prioridade atualizada!");
        };
      });

      host.querySelectorAll("[data-chk-open-card]").forEach(btn => {
        btn.onclick = () => onOpenCard?.(btn.dataset.chkOpenCard);
      });

      host.querySelectorAll("[data-chk-move]").forEach(btn => {
        btn.onclick = () => {
          const [idxStr, deltaStr] = btn.dataset.chkMove.split(":");
          const idx = parseInt(idxStr, 10);
          const delta = parseInt(deltaStr, 10);
          persistReorder(idx, idx + delta);
        };
      });

      host.querySelectorAll("[data-chk-promote]").forEach(btn => {
        btn.onclick = () => {
          const entry = sorted[parseInt(btn.dataset.chkPromote, 10)];
          if (entry && entry.kind === "card-subtask") {
            onPromoteSubtask?.({
              cardId: entry.cardId,
              cardName: entry.cardName,
              subtaskId: entry.subtaskId,
              text: entry.text
            });
          }
        };
      });

      host.querySelectorAll("[data-chk-sdel]").forEach(btn => {
        btn.onclick = () => {
          const entry = sorted[parseInt(btn.dataset.chkSdel, 10)];
          if (!entry || entry.kind !== "card-subtask" || !entry.card) return;
          if (!confirm(`Remover o item "${entry.text}" do cartão "${entry.cardName}"?`)) return;
          entry.card.subtasks = (entry.card.subtasks || []).filter(s => s.id !== entry.subtaskId);
          onSyncCardProgress?.(entry.card);
          onSave?.("🗑️ Item removido do checklist do cartão.");
        };
      });

      host.querySelectorAll("[data-chk-medit]").forEach(btn => {
        btn.onclick = () => onEditManual?.(btn.dataset.chkMedit);
      });

      host.querySelectorAll("[data-chk-mdel]").forEach(btn => {
        btn.onclick = () => onDeleteManual?.(btn.dataset.chkMdel);
      });
    };

    bindListEvents(tb);
    bindListEvents(mc);

    // Drag & Drop Desktop + Mobile
    if (tb && sorted.length > 1) {
      bindDragReorder(tb.querySelector("tbody"), "tr.chk-global-row", ".chk-drag-handle", persistReorder);
    }
    if (mc && sorted.length > 1) {
      bindDragReorder(mc, ".chk-mobile-card", ".chk-drag-handle", persistReorder);
    }

    // Bind controles de filtro e ordenação (idempotente por container)
    if (!rootEl.dataset.chkControlsBound) {
      rootEl.dataset.chkControlsBound = "1";
      const popBtn = rootEl.querySelector("[data-chk-filter-btn]");
      const popPanel = rootEl.querySelector("[data-chk-filter-panel]");
      if (popBtn && popPanel) {
        popBtn.onclick = ev => {
          ev.stopPropagation();
          const willOpen = popPanel.hidden;
          popPanel.hidden = !willOpen;
          popBtn.setAttribute("aria-expanded", String(willOpen));
        };
        document.addEventListener("click", ev => {
          if (!popPanel.hidden && !popPanel.contains(ev.target) && !popBtn.contains(ev.target)) {
            popPanel.hidden = true;
            popBtn.setAttribute("aria-expanded", "false");
          }
        });
      }

      const rerender = () => {
        if (rootEl._lastRenderCb) rootEl._lastRenderCb();
      };

      rootEl.querySelectorAll("[data-chk-f]").forEach(el => {
        const key = el.dataset.chkF;
        const evt = el.tagName === "INPUT" && el.type === "search" ? "input" : "change";
        el.addEventListener(evt, () => {
          stateByScope[sc].filters[key] = el.value || "";
          rerender();
        });
      });

      const clrBtn = rootEl.querySelector("[data-chk-clear-filters]");
      if (clrBtn) {
        clrBtn.onclick = () => {
          stateByScope[sc].filters = { search: "", status: "", prio: "", type: "", list: "", assignee: "", tag: "", dateFrom: "", dateTo: "" };
          rerender();
        };
      }

      const srtEl = rootEl.querySelector("[data-chk-sort]");
      if (srtEl) {
        srtEl.onchange = () => {
          stateByScope[sc].sort = srtEl.value || "manual";
          rerender();
        };
      }
    }
    rootEl._lastRenderCb = () => renderGlobalChecklist(opts);
  }

  window.MyPlanChecklists = {
    bindDragReorder,
    renderGlobalChecklist,
    getScopeState: scope => stateByScope[normScope(scope)]
  };
})();
