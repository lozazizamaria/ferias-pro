/* ==========================================================================
   My Plan PRO — Visualização Executiva: Calendário Anual por Semanas (v59)
   Swimlanes por Tipo de Cartão, Packing Inteligente sem sobreposição,
   Reordenação/Ocultação e Exportação Ultra-Clean PNG (3x) & PDF Paisagem
   ========================================================================== */
(() => {
  const MONTHS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const FULL_YEAR_WEEKS_PER_MONTH = [4, 4, 5, 4, 4, 5, 4, 5, 4, 4, 5, 4]; // soma = 52 semanas

  let selectedYear = new Date().getFullYear();
  let lastModel = null;
  let measureCtx = null;

  function getMeasureCtx() {
    if (!measureCtx && typeof document !== "undefined") {
      const c = document.createElement("canvas");
      measureCtx = c.getContext("2d");
    }
    return measureCtx;
  }

  function measureTextPx(text, font = "600 11.5px Outfit, Arial, sans-serif") {
    const str = String(text || "");
    const ctx = getMeasureCtx();
    if (ctx) {
      ctx.font = font;
      return Math.ceil(ctx.measureText(str).width);
    }
    return Math.ceil(str.length * 6.8);
  }

  function parseIsoDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return null;
    const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function toIsoDate(dt) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }

  function diffDays(a, b) {
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((utcB - utcA) / 86400000);
  }

  function getIsoWeekNumber(dt) {
    const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function contrastTextColor(hex) {
    const raw = String(hex || "").replace("#", "").trim();
    const norm = raw.length === 3 ? raw.split("").map(c => c + c).join("") : raw;
    if (!/^[0-9a-fA-F]{6}$/.test(norm)) return "#ffffff";
    const r = parseInt(norm.slice(0, 2), 16);
    const g = parseInt(norm.slice(2, 4), 16);
    const b = parseInt(norm.slice(4, 6), 16);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum > 152 ? "#111827" : "#ffffff";
  }

  function buildPeriodModel(year, dateFrom, dateTo) {
    const customStart = parseIsoDate(dateFrom);
    const customEnd = parseIsoDate(dateTo);

    if (!customStart && !customEnd) {
      const rangeStart = new Date(year, 0, 1);
      const rangeEnd = new Date(year, 11, 31);
      const totalDays = diffDays(rangeStart, rangeEnd) + 1;
      const months = [];
      let wCursor = 1;
      for (let m = 0; m < 12; m++) {
        const wCount = FULL_YEAR_WEEKS_PER_MONTH[m];
        const weeks = [];
        for (let i = 0; i < wCount; i++) weeks.push(wCursor++);
        months.push({
          label: MONTHS_PT[m],
          shaded: m % 2 === 0,
          weeks
        });
      }
      return {
        isFullYear: true,
        year,
        title: String(year),
        rangeStart,
        rangeEnd,
        totalDays,
        totalWeeks: 52,
        months
      };
    }

    const rStart = customStart || new Date(customEnd.getFullYear(), 0, 1);
    let rEnd = customEnd || new Date(rStart.getFullYear(), 11, 31);
    if (rEnd < rStart) rEnd = new Date(rStart.getTime());
    const totalDays = Math.max(1, diffDays(rStart, rEnd) + 1);

    const months = [];
    const curMonth = new Date(rStart.getFullYear(), rStart.getMonth(), 1);
    const endMonth = new Date(rEnd.getFullYear(), rEnd.getMonth(), 1);
    let idx = 0;
    const multiYear = rStart.getFullYear() !== rEnd.getFullYear();

    while (curMonth <= endMonth && idx < 48) {
      const y = curMonth.getFullYear();
      const m = curMonth.getMonth();
      const mFirst = new Date(y, m, 1);
      const mLast = new Date(y, m + 1, 0);
      const segStart = mFirst < rStart ? rStart : mFirst;
      const segEnd = mLast > rEnd ? rEnd : mLast;
      const weekNums = [];
      const seen = new Set();
      for (let dt = new Date(segStart); dt <= segEnd; dt.setDate(dt.getDate() + 1)) {
        const wn = getIsoWeekNumber(dt);
        if (!seen.has(wn)) {
          seen.add(wn);
          weekNums.push(wn);
        }
      }
      if (!weekNums.length) weekNums.push(getIsoWeekNumber(segStart));
      months.push({
        label: multiYear ? `${MONTHS_PT[m]}/${String(y).slice(-2)}` : MONTHS_PT[m],
        shaded: idx % 2 === 0,
        weeks: weekNums
      });
      curMonth.setMonth(curMonth.getMonth() + 1);
      idx++;
    }

    const totalWeeks = months.reduce((s, mo) => s + mo.weeks.length, 0) || 1;
    const title = multiYear
      ? `${rStart.getFullYear()} – ${rEnd.getFullYear()}`
      : `${rStart.getFullYear()} (${MONTHS_PT[rStart.getMonth()]}–${MONTHS_PT[rEnd.getMonth()]})`;

    return {
      isFullYear: false,
      year: rStart.getFullYear(),
      title,
      rangeStart: rStart,
      rangeEnd: rEnd,
      totalDays,
      totalWeeks,
      months
    };
  }

  function packSwimlaneEvents(cards, period, gridWidthPx, getTypeColor) {
    const mapped = [];
    cards.forEach(card => {
      const sDt = parseIsoDate(card.start || card.end);
      if (!sDt) return;
      let eDt = parseIsoDate(card.end || card.start) || sDt;
      if (eDt < sDt) eDt = sDt;
      if (eDt < period.rangeStart || sDt > period.rangeEnd) return;

      const cStart = sDt < period.rangeStart ? period.rangeStart : sDt;
      const cEnd = eDt > period.rangeEnd ? period.rangeEnd : eDt;
      const startDay = diffDays(period.rangeStart, cStart);
      const endDay = diffDays(period.rangeStart, cEnd);

      const startPct = (startDay / period.totalDays) * 100;
      const widthPct = Math.max(0.9, ((endDay - startDay + 1) / period.totalDays) * 100);
      const startPx = (startPct / 100) * gridWidthPx;
      const barPx = Math.max(14, (widthPct / 100) * gridWidthPx);
      const endPx = startPx + barPx;

      const label = String(card.name || "Sem título").trim();
      const textW = measureTextPx(label);
      const fitsInside = barPx >= textW + 10;
      const effectiveEndPx = fitsInside ? endPx : (endPx + 6 + textW + 8);
      const color = card.color || getTypeColor(card.type) || "#2563eb";
      const textColor = contrastTextColor(color);

      mapped.push({
        card,
        label,
        startDay,
        endDay,
        startPct,
        widthPct,
        startPx,
        barPx,
        endPx,
        textW,
        fitsInside,
        effectiveEndPx,
        color,
        textColor
      });
    });

    mapped.sort((a, b) => a.startDay - b.startDay || a.endDay - b.endDay || a.label.localeCompare(b.label, "pt-BR"));

    const rows = [];
    mapped.forEach(ev => {
      let placed = false;
      for (const row of rows) {
        // Regra estrita: não pode sobrepor datas, nem ser imediatamente colado (endDay + 1), nem colidir com texto externo à direita
        const noDateTouch = ev.startDay > row.lastEndDay + 1;
        const noVisualCollide = ev.startPx > row.lastEffectiveEndPx + 6;
        if (noDateTouch && noVisualCollide) {
          row.events.push(ev);
          row.lastEndDay = ev.endDay;
          row.lastEffectiveEndPx = ev.effectiveEndPx;
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push({
          events: [ev],
          lastEndDay: ev.endDay,
          lastEffectiveEndPx: ev.effectiveEndPx
        });
      }
    });

    return rows;
  }

  function ensureAnnualPrefs(st) {
    st.params = st.params || {};
    if (!Array.isArray(st.params.annualTypeOrder)) st.params.annualTypeOrder = [];
    if (!Array.isArray(st.params.annualHiddenTypes)) st.params.annualHiddenTypes = [];
    if (!Array.isArray(st.params.annualHiddenCards)) st.params.annualHiddenCards = [];
    return st.params;
  }

  function renderAnnualCanvas(model, scale = 3) {
    const gridW = 1140;
    const railW = 46;
    const padOuter = 18;
    const totalW = padOuter * 2 + railW + gridW;

    const hdrYearH = 28;
    const hdrMonthH = 22;
    const hdrWeekH = 20;
    const hdrTotalH = hdrYearH + hdrMonthH + hdrWeekH;
    const laneGap = 14;
    const rowH = 24;
    const rowGap = 6;
    const lanePadY = 12;

    const laneLayouts = model.lanes.map(lane => {
      const rCount = Math.max(1, lane.rows.length);
      const contentH = rCount * rowH + Math.max(0, rCount - 1) * rowGap + lanePadY * 2;
      const minH = Math.max(66, measureTextPx(lane.label.toUpperCase(), "800 12px Outfit, Arial, sans-serif") + 24);
      return { lane, h: Math.max(contentH, minH) };
    });

    const totalH = padOuter * 2 + hdrTotalH + laneLayouts.reduce((s, l) => s + laneGap + l.h, 0) + (laneLayouts.length ? 0 : 72);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(totalW * scale);
    canvas.height = Math.round(totalH * scale);
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    // Fundo branco puro executivo
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, totalW, totalH);

    const drawVerticalLabel = (text, x, y, w, h) => {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#0f172a";
      ctx.font = "800 12px Outfit, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const maxTxtW = Math.max(24, h - 12);
      let lbl = String(text || "").toUpperCase();
      while (lbl.length > 3 && ctx.measureText(lbl).width > maxTxtW) {
        lbl = lbl.slice(0, -2) + "…";
      }
      ctx.fillText(lbl, 0, 0);
      ctx.restore();
    };

    // 1. Cabeçalho ANO / Meses intercalados / Semanas
    const hx = padOuter;
    const hy = padOuter;
    const gx = hx + railW;

    // Título do Ano centralizado
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 16px Outfit, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(model.period.title, gx + gridW / 2, hy + hdrYearH / 2);

    // Meses & semanas
    const weekW = gridW / Math.max(1, model.period.totalWeeks);
    let wkCursor = 0;
    model.period.months.forEach(mo => {
      const mx = gx + wkCursor * weekW;
      const mw = mo.weeks.length * weekW;
      ctx.fillStyle = mo.shaded ? "#d1d5db" : "#ffffff";
      ctx.fillRect(mx, hy + hdrYearH, mw, hdrMonthH + hdrWeekH);

      ctx.fillStyle = "#0f172a";
      ctx.font = "700 11px Outfit, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(mo.label, mx + mw / 2, hy + hdrYearH + hdrMonthH / 2);

      ctx.font = "600 10px Outfit, Arial, sans-serif";
      mo.weeks.forEach((wn, wi) => {
        const wx = mx + wi * weekW;
        ctx.fillText(String(wn), wx + weekW / 2, hy + hdrYearH + hdrMonthH + hdrWeekH / 2);
      });
      wkCursor += mo.weeks.length;
    });

    // Rótulo vertical ANO e borda nítida do cabeçalho
    drawVerticalLabel("ANO", hx, hy, railW, hdrTotalH);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.6;
    ctx.strokeRect(hx, hy, railW + gridW, hdrTotalH);

    // 2. Swimlanes por Tipo de Cartão
    let curY = hy + hdrTotalH;
    laneLayouts.forEach(({ lane, h }) => {
      curY += laneGap;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(hx, curY, railW + gridW, h);

      drawVerticalLabel(lane.label, hx, curY, railW, h);

      const contentBlockH = lane.rows.length * rowH + Math.max(0, lane.rows.length - 1) * rowGap;
      const startY = curY + Math.max(lanePadY, (h - contentBlockH) / 2);

      lane.rows.forEach((row, rIdx) => {
        const ry = startY + rIdx * (rowH + rowGap);
        row.events.forEach(ev => {
          const bx = gx + (ev.startPct / 100) * gridW;
          const bw = Math.max(12, (ev.widthPct / 100) * gridW);
          ctx.fillStyle = ev.color;
          ctx.fillRect(bx, ry, bw, rowH);

          ctx.font = "600 11.5px Outfit, Arial, sans-serif";
          ctx.textBaseline = "middle";
          const txtW = ctx.measureText(ev.label).width;
          if (bw >= txtW + 10) {
            ctx.fillStyle = ev.textColor;
            ctx.textAlign = "center";
            ctx.fillText(ev.label, bx + bw / 2, ry + rowH / 2 + 0.5);
          } else {
            ctx.fillStyle = "#0f172a";
            const spaceRight = gx + gridW - (bx + bw + 6);
            if (spaceRight < txtW && bx - gx > txtW + 10) {
              ctx.textAlign = "right";
              ctx.fillText(ev.label, bx - 6, ry + rowH / 2 + 0.5);
            } else {
              ctx.textAlign = "left";
              const maxOutW = Math.max(20, spaceRight);
              let txt = ev.label;
              while (txt.length > 3 && ctx.measureText(txt).width > maxOutW) {
                txt = txt.slice(0, -2) + "…";
              }
              ctx.fillText(txt, bx + bw + 6, ry + rowH / 2 + 0.5);
            }
          }
        });
      });

      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.6;
      ctx.strokeRect(hx, curY, railW + gridW, h);
      curY += h;
    });

    if (!laneLayouts.length) {
      curY += laneGap;
      ctx.fillStyle = "#64748b";
      ctx.font = "500 13px Outfit, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Nenhum evento com data neste período.", hx + (railW + gridW) / 2, curY + 32);
    }

    return canvas;
  }

  function exportAnnualPng(toast) {
    if (!lastModel) return;
    try {
      const canvas = renderAnnualCanvas(lastModel, 3);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = String(lastModel.projectTitle || "Calendario_Anual").replace(/[^\w\-]+/g, "_").slice(0, 48);
      a.download = `${safeTitle}_${lastModel.period.year}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast?.("🖼️ Calendário Anual baixado em PNG de alta resolução!");
    } catch (err) {
      toast?.("❌ Falha ao gerar imagem PNG: " + (err.message || err));
    }
  }

  function exportAnnualPdfLandscape(toast) {
    if (!lastModel) return;
    try {
      const canvas = renderAnnualCanvas(lastModel, 3);
      const dataUrl = canvas.toDataURL("image/png");
      const win = window.open("", "_blank");
      if (!win) {
        toast?.("⚠️ Permita pop-ups no navegador para abrir a impressão em PDF Paisagem.");
        return;
      }
      const esc = window.MyPlanUtils?.esc || (s => String(s || ""));
      const docTitle = `${lastModel.projectTitle || "My Plan"} — Calendário Anual ${lastModel.period.title}`;
      win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${esc(docTitle)}</title>
<style>
  @page { size: A4 landscape; margin: 7mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0f172a;
    width: 100%;
    height: 100%;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    width: 100%;
    min-height: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background: #ffffff;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
    max-height: 194mm;
    object-fit: contain;
  }
</style>
</head>
<body>
  <div class="sheet"><img src="${dataUrl}" alt="${esc(docTitle)}"></div>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.focus(); window.print(); }, 180);
    });
  </script>
</body>
</html>`);
      win.document.close();
    } catch (err) {
      toast?.("❌ Falha ao preparar PDF horizontal: " + (err.message || err));
    }
  }

  function render({
    container,
    cards,
    state,
    projectTitle,
    dateFrom,
    dateTo,
    allTypes,
    getTypeInfo,
    fmtBR,
    esc,
    onOpenCard,
    onSavePrefs,
    toast
  }) {
    if (!container) return;
    const prefs = ensureAnnualPrefs(state);

    // Anos disponíveis (ano corrente ±3 + anos presentes nos cartões)
    const curYear = new Date().getFullYear();
    const yearsSet = new Set([curYear - 1, curYear, curYear + 1, curYear + 2, selectedYear]);
    (cards || []).forEach(c => {
      const sy = parseInt(String(c?.start || "").slice(0, 4), 10);
      const ey = parseInt(String(c?.end || "").slice(0, 4), 10);
      if (sy >= 2000 && sy <= 2100) yearsSet.add(sy);
      if (ey >= 2000 && ey <= 2100) yearsSet.add(ey);
    });
    const sortedYears = [...yearsSet].sort((a, b) => a - b);

    const period = buildPeriodModel(selectedYear, dateFrom, dateTo);
    const hiddenTypesSet = new Set(prefs.annualHiddenTypes);
    const hiddenCardsSet = new Set(prefs.annualHiddenCards);

    // Agrupar cartões por Tipo de Cartão
    const byType = new Map();
    const cardsInPeriod = [];
    (cards || []).forEach(c => {
      if (!c || (!c.start && !c.end)) return;
      const sDt = parseIsoDate(c.start || c.end);
      let eDt = parseIsoDate(c.end || c.start) || sDt;
      if (!sDt) return;
      if (eDt < sDt) eDt = sDt;
      if (eDt < period.rangeStart || sDt > period.rangeEnd) return;
      cardsInPeriod.push(c);
      const tId = getTypeInfo(c.type).id;
      if (!byType.has(tId)) byType.set(tId, []);
      if (!hiddenCardsSet.has(c.id)) byType.get(tId).push(c);
    });

    // Determinar ordem das categorias (apenas tipos com eventos no período OU já ordenados com eventos)
    const presentTypeIds = [...byType.keys()];
    const baseOrder = [
      ...prefs.annualTypeOrder.filter(id => presentTypeIds.includes(id)),
      ...presentTypeIds.filter(id => !prefs.annualTypeOrder.includes(id))
    ];
    const visibleTypeIds = baseOrder.filter(id => !hiddenTypesSet.has(id));
    const hiddenPresentTypes = baseOrder.filter(id => hiddenTypesSet.has(id));
    const hiddenPresentCards = cardsInPeriod.filter(c => hiddenCardsSet.has(c.id));
    const totalHiddenCount = hiddenPresentTypes.length + hiddenPresentCards.length;

    const gridRefPx = Math.max(780, Math.min(1260, (container.clientWidth || 1140) - 82));
    const getTypeColor = tId => getTypeInfo(tId).color || "#2563eb";

    const lanes = visibleTypeIds.map(tId => {
      const info = getTypeInfo(tId);
      const rows = packSwimlaneEvents(byType.get(tId) || [], period, gridRefPx, getTypeColor);
      return {
        typeId: tId,
        label: info.short || info.id || tId,
        color: info.color || "#2563eb",
        rows
      };
    });

    lastModel = {
      projectTitle: projectTitle || state?.title || "My Plan",
      period,
      lanes
    };

    const monthsHeaderHtml = period.months.map(mo => {
      const flexSpan = mo.weeks.length;
      const wksHtml = mo.weeks.map(w => `<span class="pa-wk-num">${w}</span>`).join("");
      return `<div class="pa-month-col${mo.shaded ? " is-shaded" : ""}" style="flex:${flexSpan} 0 0">
        <div class="pa-month-lbl">${esc(mo.label)}</div>
        <div class="pa-weeks-row">${wksHtml}</div>
      </div>`;
    }).join("");

    const lanesHtml = lanes.length
      ? lanes.map((lane, lIdx) => {
          const rowsHtml = lane.rows.length
            ? lane.rows.map(row => `
                <div class="pa-bar-row">
                  ${row.events.map(ev => {
                    const dtStr = ev.card.start
                      ? `${fmtBR(ev.card.start)}${ev.card.end && ev.card.end !== ev.card.start ? ` → ${fmtBR(ev.card.end)}` : ""}`
                      : "";
                    const tip = `${ev.label}${dtStr ? ` (${dtStr})` : ""}`;
                    const placeLeft = !ev.fitsInside && (ev.endPx + 8 + ev.textW > gridRefPx) && (ev.startPx > ev.textW + 10);
                    const outStyle = placeLeft
                      ? `right:calc(${(100 - ev.startPct).toFixed(4)}% + 5px);text-align:right;`
                      : `left:calc(${ev.startPct.toFixed(4)}% + ${ev.widthPct.toFixed(4)}% + 5px);`;
                    return `<div class="pa-bar-item" data-pa-card="${esc(ev.card.id)}" title="${esc(tip)}" style="left:${ev.startPct.toFixed(4)}%;width:${ev.widthPct.toFixed(4)}%;background:${esc(ev.color)};color:${ev.textColor}">
                      ${ev.fitsInside ? `<span class="pa-bar-txt-in">${esc(ev.label)}</span>` : ""}
                      <button type="button" class="pa-bar-hide annual-no-export" data-pa-hide-card="${esc(ev.card.id)}" title="Ocultar apenas no Calendário Anual" aria-label="Ocultar cartão ${esc(ev.label)}">✕</button>
                    </div>
                    ${!ev.fitsInside ? `<span class="pa-bar-txt-out" data-pa-card="${esc(ev.card.id)}" title="${esc(tip)}" style="${outStyle}">${esc(ev.label)}</span>` : ""}`;
                  }).join("")}
                </div>`).join("")
            : `<div class="pa-lane-empty">Sem cartões visíveis nesta categoria</div>`;

          return `<div class="pa-swimlane" data-pa-type="${esc(lane.typeId)}">
            <div class="pa-rail">
              <div class="pa-rail-controls annual-no-export">
                <button type="button" class="pa-rail-btn" data-pa-move="${esc(lane.typeId)}:-1" ${lIdx === 0 ? "disabled" : ""} title="Subir categoria" aria-label="Subir ${esc(lane.label)}">↑</button>
                <button type="button" class="pa-rail-btn" data-pa-move="${esc(lane.typeId)}:1" ${lIdx === lanes.length - 1 ? "disabled" : ""} title="Descer categoria" aria-label="Descer ${esc(lane.label)}">↓</button>
                <button type="button" class="pa-rail-btn" data-pa-hide-type="${esc(lane.typeId)}" title="Ocultar categoria" aria-label="Ocultar ${esc(lane.label)}">👁</button>
              </div>
              <span class="pa-rail-lbl">${esc(lane.label.toUpperCase())}</span>
            </div>
            <div class="pa-lane-grid">${rowsHtml}</div>
          </div>`;
        }).join("")
      : `<div class="pa-empty-box">
          <strong>Nenhum cartão com data para exibir em ${esc(period.title)}</strong>
          <span class="muted small">Altere o ano acima, ajuste os filtros ou restaure categorias/cartões ocultos.</span>
        </div>`;

    container.innerHTML = `
      <div class="pa-topbar annual-no-export">
        <div class="pa-topbar-left">
          <div class="pa-year-nav" ${!period.isFullYear ? 'title="Período personalizado ativo nos Filtros (limpe De/Até para navegar por ano)"' : ""}>
            <button type="button" class="btn ghost small icon-compact" id="btnPaPrevYear" ${!period.isFullYear ? "disabled" : ""} aria-label="Ano anterior">◀</button>
            <select id="paYearSelect" aria-label="Selecionar ano" ${!period.isFullYear ? "disabled" : ""}>
              ${sortedYears.map(y => `<option value="${y}" ${y === selectedYear ? "selected" : ""}>${y}</option>`).join("")}
            </select>
            <button type="button" class="btn ghost small icon-compact" id="btnPaNextYear" ${!period.isFullYear ? "disabled" : ""} aria-label="Próximo ano">▶</button>
          </div>
          ${!period.isFullYear ? `<span class="pill" style="font-size:0.72rem">Período filtrado: ${esc(period.title)}</span>` : ""}
          ${totalHiddenCount > 0 ? `<button type="button" class="btn ghost small" id="btnPaRestoreHidden" title="Restaurar categorias e cartões ocultos nesta visualização">👁️ Restaurar ocultos (${totalHiddenCount})</button>` : ""}
        </div>
        <div class="pa-topbar-right">
          <div class="pm-dd-host">
            <button type="button" class="btn primary small" id="btnPaExportMenu" aria-expanded="false">🖨️ Imprimir ▾</button>
            <div class="pm-dd-menu pa-export-menu" id="paExportMenu" hidden>
              <button type="button" id="btnPaExportPng">🖼️ Baixar como Imagem (.png alta resolução)</button>
              <button type="button" id="btnPaExportPdf">📄 Imprimir / Baixar em PDF (Horizontal)</button>
            </div>
          </div>
        </div>
      </div>

      <div class="pa-sheet-scroll">
        <div class="pa-sheet" id="paExecutiveSheet">
          <div class="pa-header-box">
            <div class="pa-rail pa-rail-ano"><span class="pa-rail-lbl">ANO</span></div>
            <div class="pa-header-main">
              <div class="pa-year-banner">${esc(period.title)}</div>
              <div class="pa-months-row">${monthsHeaderHtml}</div>
            </div>
          </div>
          ${lanesHtml}
        </div>
      </div>
    `;

    // Eventos da barra superior
    const yrSel = container.querySelector("#paYearSelect");
    if (yrSel) {
      yrSel.onchange = () => {
        selectedYear = parseInt(yrSel.value, 10) || curYear;
        render({ container, cards, state, projectTitle, dateFrom, dateTo, allTypes, getTypeInfo, fmtBR, esc, onOpenCard, onSavePrefs, toast });
      };
    }
    const prevBtn = container.querySelector("#btnPaPrevYear");
    if (prevBtn) {
      prevBtn.onclick = () => {
        selectedYear -= 1;
        render({ container, cards, state, projectTitle, dateFrom, dateTo, allTypes, getTypeInfo, fmtBR, esc, onOpenCard, onSavePrefs, toast });
      };
    }
    const nextBtn = container.querySelector("#btnPaNextYear");
    if (nextBtn) {
      nextBtn.onclick = () => {
        selectedYear += 1;
        render({ container, cards, state, projectTitle, dateFrom, dateTo, allTypes, getTypeInfo, fmtBR, esc, onOpenCard, onSavePrefs, toast });
      };
    }
    const restoreBtn = container.querySelector("#btnPaRestoreHidden");
    if (restoreBtn) {
      restoreBtn.onclick = () => {
        prefs.annualHiddenTypes = [];
        prefs.annualHiddenCards = [];
        onSavePrefs?.("👁️ Todos os itens ocultos restaurados no Calendário Anual!");
      };
    }

    // Menu Imprimir / Exportar
    const expBtn = container.querySelector("#btnPaExportMenu");
    const expMenu = container.querySelector("#paExportMenu");
    if (expBtn && expMenu) {
      expBtn.onclick = e => {
        e.stopPropagation();
        const nextOpen = expMenu.hidden;
        expMenu.hidden = !nextOpen;
        expBtn.setAttribute("aria-expanded", String(nextOpen));
      };
      document.addEventListener("click", function closeExpMenu(ev) {
        if (!expMenu.isConnected) { document.removeEventListener("click", closeExpMenu); return; }
        if (!expBtn.contains(ev.target) && !expMenu.contains(ev.target)) {
          expMenu.hidden = true;
          expBtn.setAttribute("aria-expanded", "false");
        }
      });
    }
    const pngBtn = container.querySelector("#btnPaExportPng");
    if (pngBtn) pngBtn.onclick = () => { if (expMenu) expMenu.hidden = true; exportAnnualPng(toast); };
    const pdfBtn = container.querySelector("#btnPaExportPdf");
    if (pdfBtn) pdfBtn.onclick = () => { if (expMenu) expMenu.hidden = true; exportAnnualPdfLandscape(toast); };

    // Reordenar / ocultar categorias e cartões
    container.querySelectorAll("[data-pa-move]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const [tId, deltaStr] = btn.dataset.paMove.split(":");
        const delta = parseInt(deltaStr, 10);
        const order = visibleTypeIds.slice();
        const idx = order.indexOf(tId);
        const target = idx + delta;
        if (idx < 0 || target < 0 || target >= order.length) return;
        const [moved] = order.splice(idx, 1);
        order.splice(target, 0, moved);
        prefs.annualTypeOrder = [...order, ...hiddenPresentTypes];
        onSavePrefs?.("↕️ Ordem das categorias atualizada!");
      };
    });

    container.querySelectorAll("[data-pa-hide-type]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const tId = btn.dataset.paHideType;
        if (!prefs.annualHiddenTypes.includes(tId)) prefs.annualHiddenTypes.push(tId);
        onSavePrefs?.("👁️ Categoria ocultada no Calendário Anual.");
      };
    });

    container.querySelectorAll("[data-pa-hide-card]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const cid = btn.dataset.paHideCard;
        if (!prefs.annualHiddenCards.includes(cid)) prefs.annualHiddenCards.push(cid);
        onSavePrefs?.("👁️ Atividade ocultada apenas no Calendário Anual.");
      };
    });

    // Clique na barra ou rótulo externo abre Editar Cartão
    container.querySelectorAll("[data-pa-card]").forEach(el => {
      el.onclick = e => {
        if (e.target.closest("[data-pa-hide-card]")) return;
        onOpenCard?.(el.dataset.paCard);
      };
    });
  }

  window.MyPlanProAnnual = {
    render,
    exportAnnualPng,
    exportAnnualPdfLandscape,
    setYear: y => { if (Number.isFinite(Number(y))) selectedYear = Number(y); },
    getYear: () => selectedYear
  };
})();
