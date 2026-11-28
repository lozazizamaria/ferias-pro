/* ==========================================================================
   My Plan PRO — Visualização Executiva: Calendário Anual por Semanas (v59)
   Swimlanes por Tipo de Cartão, Packing Inteligente sem sobreposição,
   Reordenação/Ocultação e Exportação Ultra-Clean PNG (3x) & PDF Paisagem
   ========================================================================== */
(() => {
  const MONTHS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const FULL_YEAR_WEEKS_PER_MONTH = [4, 4, 5, 4, 4, 5, 4, 5, 4, 4, 5, 4]; // soma = 52 semanas

  const DEFAULT_YEAR = new Date().getFullYear();
  const selectedYearByScope = { pro: DEFAULT_YEAR, personal: DEFAULT_YEAR };
  const fitEventsByScope = { pro: false, personal: false };
  const zoomScaleByScope = { pro: 1, personal: 1 };
  const lastModelByScope = { pro: null, personal: null };
  let measureCtx = null;

  function normScope(scope) {
    return scope === "personal" ? "personal" : "pro";
  }

  function getFitEvents(scope) {
    return Boolean(fitEventsByScope[normScope(scope)]);
  }

  function setFitEvents(val, scope) {
    fitEventsByScope[normScope(scope)] = Boolean(val);
  }

  function computeFitEventsRange(cards, hiddenTypesSet, hiddenCardsSet, getTypeInfo) {
    let minDt = null;
    let maxDt = null;
    (cards || []).forEach(c => {
      if (!c || (!c.start && !c.end)) return;
      if (hiddenCardsSet?.has(c.id)) return;
      const tId = getTypeInfo ? getTypeInfo(c.type)?.id : c.type;
      if (tId && hiddenTypesSet?.has(tId)) return;
      const sDt = parseIsoDate(c.start || c.end);
      if (!sDt) return;
      let eDt = parseIsoDate(c.end || c.start) || sDt;
      if (eDt < sDt) eDt = sDt;
      if (!minDt || sDt < minDt) minDt = sDt;
      if (!maxDt || eDt > maxDt) maxDt = eDt;
    });
    if (!minDt || !maxDt) return null;
    const spanDays = Math.max(1, diffDays(minDt, maxDt) + 1);
    const padDays = spanDays <= 30 ? 3 : (spanDays <= 120 ? 5 : 7);
    const padStart = new Date(minDt.getFullYear(), minDt.getMonth(), minDt.getDate() - padDays);
    const padEnd = new Date(maxDt.getFullYear(), maxDt.getMonth(), maxDt.getDate() + padDays);
    return {
      startIso: toIsoDate(padStart),
      endIso: toIsoDate(padEnd),
      rawStartIso: toIsoDate(minDt),
      rawEndIso: toIsoDate(maxDt)
    };
  }

  function showAnnualPinchBadge(scrollEl, text) {
    if (!scrollEl) return;
    let badge = scrollEl.parentElement?.querySelector(".chart-pinch-toast");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "chart-pinch-toast";
      badge.setAttribute("aria-live", "polite");
      (scrollEl.parentElement || document.body).appendChild(badge);
    }
    badge.textContent = text;
    badge.classList.add("is-visible");
    clearTimeout(badge._hideTimer);
    badge._hideTimer = setTimeout(() => badge.classList.remove("is-visible"), 950);
  }

  function getSelectedYear(scope) {
    const k = normScope(scope);
    if (!Number.isFinite(selectedYearByScope[k])) selectedYearByScope[k] = DEFAULT_YEAR;
    return selectedYearByScope[k];
  }

  function setSelectedYear(y, scope) {
    const k = normScope(scope);
    if (Number.isFinite(Number(y))) selectedYearByScope[k] = Number(y);
  }

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
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        const days = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dow = new Date(year, m, d).getDay();
          days.push({ num: d, isWeekend: dow === 0 || dow === 6 });
        }
        months.push({
          label: MONTHS_PT[m],
          shaded: m % 2 === 0,
          weeks,
          days
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
      const days = [];
      for (let dt = new Date(segStart); dt <= segEnd; dt.setDate(dt.getDate() + 1)) {
        const wn = getIsoWeekNumber(dt);
        if (!seen.has(wn)) {
          seen.add(wn);
          weekNums.push(wn);
        }
        const dow = dt.getDay();
        days.push({ num: dt.getDate(), isWeekend: dow === 0 || dow === 6 });
      }
      if (!weekNums.length) weekNums.push(getIsoWeekNumber(segStart));
      months.push({
        label: multiYear ? `${MONTHS_PT[m]}/${String(y).slice(-2)}` : MONTHS_PT[m],
        shaded: idx % 2 === 0,
        weeks: weekNums,
        days
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

      const label = String(card.name || card.title || "Sem título").trim();
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

  function ensureAnnualPrefs(st, scope = "pro") {
    st.params = st.params || {};
    if (normScope(scope) === "personal") {
      if (!Array.isArray(st.params.personalAnnualTypeOrder)) st.params.personalAnnualTypeOrder = [];
      if (!Array.isArray(st.params.personalAnnualHiddenTypes)) st.params.personalAnnualHiddenTypes = [];
      if (!Array.isArray(st.params.personalAnnualHiddenCards)) st.params.personalAnnualHiddenCards = [];
      if (typeof st.params.personalAnnualShowDays !== "boolean") st.params.personalAnnualShowDays = false;
      return {
        get order() { return st.params.personalAnnualTypeOrder; },
        set order(v) { st.params.personalAnnualTypeOrder = v; },
        get hiddenTypes() { return st.params.personalAnnualHiddenTypes; },
        set hiddenTypes(v) { st.params.personalAnnualHiddenTypes = v; },
        get hiddenCards() { return st.params.personalAnnualHiddenCards; },
        set hiddenCards(v) { st.params.personalAnnualHiddenCards = v; },
        get showDays() { return Boolean(st.params.personalAnnualShowDays); },
        set showDays(v) { st.params.personalAnnualShowDays = Boolean(v); }
      };
    }
    if (!Array.isArray(st.params.annualTypeOrder)) st.params.annualTypeOrder = [];
    if (!Array.isArray(st.params.annualHiddenTypes)) st.params.annualHiddenTypes = [];
    if (!Array.isArray(st.params.annualHiddenCards)) st.params.annualHiddenCards = [];
    if (typeof st.params.annualShowDays !== "boolean") st.params.annualShowDays = false;
    return {
      get order() { return st.params.annualTypeOrder; },
      set order(v) { st.params.annualTypeOrder = v; },
      get hiddenTypes() { return st.params.annualHiddenTypes; },
      set hiddenTypes(v) { st.params.annualHiddenTypes = v; },
      get hiddenCards() { return st.params.annualHiddenCards; },
      set hiddenCards(v) { st.params.annualHiddenCards = v; },
      get showDays() { return Boolean(st.params.annualShowDays); },
      set showDays(v) { st.params.annualShowDays = Boolean(v); }
    };
  }

  function renderAnnualCanvas(model, scale = 3) {
    const showDays = Boolean(model.showDays);
    const gridW = showDays ? Math.max(1140, Math.round(model.period.totalDays * 14)) : 1140;
    const effScale = gridW > 2800 ? 2 : scale;
    const railW = 46;
    const padOuter = 18;
    const totalW = padOuter * 2 + railW + gridW;

    const hdrYearH = 28;
    const hdrMonthH = 22;
    const hdrWeekH = 20;
    const hdrDayH = showDays ? 18 : 0;
    const hdrTotalH = hdrYearH + hdrMonthH + hdrWeekH + hdrDayH;
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
    canvas.width = Math.round(totalW * effScale);
    canvas.height = Math.round(totalH * effScale);
    const ctx = canvas.getContext("2d");
    ctx.scale(effScale, effScale);

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

    // 1. Cabeçalho ANO / Meses intercalados / Semanas (+ Dias opcional)
    const hx = padOuter;
    const hy = padOuter;
    const gx = hx + railW;

    // Título do Ano centralizado
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 16px Outfit, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(model.period.title, gx + gridW / 2, hy + hdrYearH / 2);

    // Meses, semanas e (opcionalmente) dias do mês
    const weekW = gridW / Math.max(1, model.period.totalWeeks);
    const dayW = gridW / Math.max(1, model.period.totalDays);
    let wkCursor = 0;
    let dayCursor = 0;
    model.period.months.forEach(mo => {
      const mDays = Array.isArray(mo.days) ? mo.days : [];
      const mx = showDays ? (gx + dayCursor * dayW) : (gx + wkCursor * weekW);
      const mw = showDays ? (mDays.length * dayW) : (mo.weeks.length * weekW);
      ctx.fillStyle = mo.shaded ? "#d1d5db" : "#ffffff";
      ctx.fillRect(mx, hy + hdrYearH, mw, hdrMonthH + hdrWeekH + hdrDayH);

      ctx.fillStyle = "#0f172a";
      ctx.font = "700 11px Outfit, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(mo.label, mx + mw / 2, hy + hdrYearH + hdrMonthH / 2);

      const mWkW = mw / Math.max(1, mo.weeks.length);
      ctx.font = "600 10px Outfit, Arial, sans-serif";
      mo.weeks.forEach((wn, wi) => {
        const wx = mx + wi * mWkW;
        ctx.fillText(String(wn), wx + mWkW / 2, hy + hdrYearH + hdrMonthH + hdrWeekH / 2);
      });

      if (showDays && mDays.length) {
        const dayY = hy + hdrYearH + hdrMonthH + hdrWeekH;
        ctx.strokeStyle = "rgba(15, 23, 42, 0.14)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(mx, dayY);
        ctx.lineTo(mx + mw, dayY);
        ctx.stroke();

        mDays.forEach((dObj, di) => {
          const dx = mx + di * dayW;
          if (dObj.isWeekend) {
            ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
            ctx.fillRect(dx, dayY, dayW, hdrDayH);
          }
          if (di > 0) {
            ctx.strokeStyle = "rgba(15, 23, 42, 0.09)";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(dx, dayY);
            ctx.lineTo(dx, dayY + hdrDayH);
            ctx.stroke();
          }
          ctx.fillStyle = dObj.isWeekend ? "#475569" : "#0f172a";
          ctx.font = "600 8.5px Outfit, Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(dObj.num), dx + dayW / 2, dayY + hdrDayH / 2 + 0.5);
        });
      }

      wkCursor += mo.weeks.length;
      dayCursor += mDays.length;
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

  function exportAnnualPng(toast, scope = "pro") {
    const model = lastModelByScope[normScope(scope)];
    if (!model) return;
    try {
      const canvas = renderAnnualCanvas(model, 3);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = String(model.projectTitle || "Calendario_Anual").replace(/[^\w\-]+/g, "_").slice(0, 48);
      a.download = `${safeTitle}_${model.period.year}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast?.("🖼️ Calendário Anual baixado em PNG de alta resolução!");
    } catch (err) {
      toast?.("❌ Falha ao gerar imagem PNG: " + (err.message || err));
    }
  }

  function exportAnnualPdfLandscape(toast, scope = "pro") {
    const model = lastModelByScope[normScope(scope)];
    if (!model) return;
    try {
      const canvas = renderAnnualCanvas(model, 3);
      const dataUrl = canvas.toDataURL("image/png");
      const win = window.open("", "_blank");
      if (!win) {
        toast?.("⚠️ Permita pop-ups no navegador para abrir a impressão em PDF Paisagem.");
        return;
      }
      const esc = window.MyPlanUtils?.esc || (s => String(s || ""));
      const docTitle = `${model.projectTitle || "My Plan"} — Calendário Anual ${model.period.title}`;
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
    scope = "pro",
    container,
    cards,
    state,
    projectTitle,
    dateFrom,
    dateTo,
    fitEvents,
    allTypes,
    getTypeInfo,
    fmtBR,
    esc,
    onOpenCard,
    onCreateAtDate,
    onToggleFitEvents,
    onSavePrefs,
    toast
  }) {
    if (!container) return;
    const sc = normScope(scope);
    const idPrefix = sc === "personal" ? "personalPa" : "pa";
    const btnPrefix = sc === "personal" ? "btnPersonalPa" : "btnPa";
    const prefs = ensureAnnualPrefs(state, sc);
    if (typeof fitEvents === "boolean") fitEventsByScope[sc] = fitEvents;
    const fitActive = Boolean(fitEventsByScope[sc]);
    const selectedYear = getSelectedYear(sc);
    const hiddenTypesSet = new Set(prefs.hiddenTypes);
    const hiddenCardsSet = new Set(prefs.hiddenCards);

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

    const fitRange = fitActive ? computeFitEventsRange(cards, hiddenTypesSet, hiddenCardsSet, getTypeInfo) : null;
    const effDateFrom = fitRange ? fitRange.startIso : dateFrom;
    const effDateTo = fitRange ? fitRange.endIso : dateTo;
    const period = buildPeriodModel(selectedYear, effDateFrom, effDateTo);
    period.isFitToEvents = Boolean(fitRange);

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
      ...prefs.order.filter(id => presentTypeIds.includes(id)),
      ...presentTypeIds.filter(id => !prefs.order.includes(id))
    ];
    const visibleTypeIds = baseOrder.filter(id => !hiddenTypesSet.has(id));
    const hiddenPresentTypes = baseOrder.filter(id => hiddenTypesSet.has(id));
    const hiddenPresentCards = cardsInPeriod.filter(c => hiddenCardsSet.has(c.id));
    const totalHiddenCount = hiddenPresentTypes.length + hiddenPresentCards.length;

    const showDays = Boolean(prefs.showDays);
    const zoomScale = Math.max(0.75, Math.min(3.2, Number(zoomScaleByScope[sc]) || 1));
    const baseSheetMinWidth = showDays ? Math.max(960, 46 + period.totalDays * 14) : 960;
    const sheetMinWidth = Math.round(baseSheetMinWidth * zoomScale);
    const baseGridPx = Math.max(780, Math.min(1260, (container.clientWidth || 1140) - 82));
    const gridRefPx = Math.round((showDays ? Math.max(baseGridPx, period.totalDays * 14) : baseGridPx) * zoomScale);
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

    lastModelByScope[sc] = {
      projectTitle: projectTitle || state?.title || "My Plan",
      period,
      lanes,
      showDays
    };

    const monthsHeaderHtml = period.months.map(mo => {
      const mDays = Array.isArray(mo.days) ? mo.days : [];
      const flexSpan = showDays ? Math.max(1, mDays.length) : mo.weeks.length;
      const wksHtml = mo.weeks.map(w => `<span class="pa-wk-num">${w}</span>`).join("");
      const daysHtml = showDays
        ? `<div class="pa-days-row">${mDays.map(d => `<span class="pa-day-num${d.isWeekend ? " is-wknd" : ""}">${d.num}</span>`).join("")}</div>`
        : "";
      return `<div class="pa-month-col${mo.shaded ? " is-shaded" : ""}" style="flex:${flexSpan} 0 0">
        <div class="pa-month-lbl">${esc(mo.label)}</div>
        <div class="pa-weeks-row">${wksHtml}</div>
        ${daysHtml}
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
            <button type="button" class="btn ghost small icon-compact" id="${btnPrefix}PrevYear" data-pa-role="prevYear" ${!period.isFullYear ? "disabled" : ""} aria-label="Ano anterior">◀</button>
            <select id="${idPrefix}YearSelect" data-pa-role="yearSelect" aria-label="Selecionar ano" ${!period.isFullYear ? "disabled" : ""}>
              ${sortedYears.map(y => `<option value="${y}" ${y === selectedYear ? "selected" : ""}>${y}</option>`).join("")}
            </select>
            <button type="button" class="btn ghost small icon-compact" id="${btnPrefix}NextYear" data-pa-role="nextYear" ${!period.isFullYear ? "disabled" : ""} aria-label="Próximo ano">▶</button>
          </div>
          <label class="pa-days-toggle" title="Exibir ou ocultar os dias do mês no cabeçalho do Calendário Anual">
            <input type="checkbox" id="${idPrefix}ShowDays" data-pa-role="showDays" ${showDays ? "checked" : ""}>
            <span>Mostrar dias do mês</span>
          </label>
          <button type="button" class="btn ghost small gantt-fit-events-btn" id="${btnPrefix}FitEvents" data-pa-role="fitEvents" aria-pressed="${fitActive ? "true" : "false"}" title="Ajustar janela de datas apenas ao período com eventos cadastrados">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V5a1 1 0 0 1 1-1h4"/><path d="M20 9V5a1 1 0 0 0-1-1h-4"/><path d="M4 15v4a1 1 0 0 0 1 1h4"/><path d="M20 15v4a1 1 0 0 1-1 1h-4"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            <span>Ajustar aos eventos</span>
          </button>
          ${period.isFitToEvents ? `<span class="pill" style="font-size:0.72rem">🎯 ${esc(fmtBR(fitRange.rawStartIso))} → ${esc(fmtBR(fitRange.rawEndIso))}</span>` : (!period.isFullYear ? `<span class="pill" style="font-size:0.72rem">Período filtrado: ${esc(period.title)}</span>` : "")}
          ${totalHiddenCount > 0 ? `<button type="button" class="btn ghost small" id="${btnPrefix}RestoreHidden" data-pa-role="restoreHidden" title="Restaurar categorias e cartões ocultos nesta visualização">👁️ Restaurar ocultos (${totalHiddenCount})</button>` : ""}
        </div>
        <div class="pa-topbar-right">
          <div class="pm-dd-host">
            <button type="button" class="btn primary small" id="${btnPrefix}ExportMenu" data-pa-role="exportMenuBtn" aria-expanded="false">🖨️ Imprimir ▾</button>
            <div class="pm-dd-menu pa-export-menu" id="${idPrefix}ExportMenu" data-pa-role="exportMenu" hidden>
              <button type="button" id="${btnPrefix}ExportPng" data-pa-role="exportPng">🖼️ Baixar como Imagem (.png alta resolução)</button>
              <button type="button" id="${btnPrefix}ExportPdf" data-pa-role="exportPdf">📄 Imprimir / Baixar em PDF (Horizontal)</button>
            </div>
          </div>
        </div>
      </div>

      <div class="pa-sheet-scroll" tabindex="0" role="region" aria-label="Calendário Anual">
        <div class="pa-sheet${showDays ? " is-show-days" : ""}" id="${idPrefix}ExecutiveSheet"${(showDays || zoomScale !== 1) ? ` style="min-width:${sheetMinWidth}px"` : ""}>
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

    const rerender = () => render({
      scope: sc,
      container,
      cards,
      state,
      projectTitle,
      dateFrom,
      dateTo,
      fitEvents: fitEventsByScope[sc],
      allTypes,
      getTypeInfo,
      fmtBR,
      esc,
      onOpenCard,
      onCreateAtDate,
      onToggleFitEvents,
      onSavePrefs,
      toast
    });

    // Eventos da barra superior
    const showDaysChk = container.querySelector("[data-pa-role='showDays']");
    if (showDaysChk) {
      showDaysChk.onchange = () => {
        prefs.showDays = Boolean(showDaysChk.checked);
        rerender();
        onSavePrefs?.(prefs.showDays ? "📅 Dias do mês exibidos no Calendário Anual!" : "📅 Dias do mês ocultados no Calendário Anual.");
      };
    }
    const fitBtn = container.querySelector("[data-pa-role='fitEvents']");
    if (fitBtn) {
      fitBtn.onclick = () => {
        const nextVal = !fitEventsByScope[sc];
        fitEventsByScope[sc] = nextVal;
        if (typeof onToggleFitEvents === "function") {
          onToggleFitEvents(nextVal);
        } else {
          rerender();
        }
      };
    }
    const yrSel = container.querySelector("[data-pa-role='yearSelect']");
    if (yrSel) {
      yrSel.onchange = () => {
        setSelectedYear(parseInt(yrSel.value, 10) || curYear, sc);
        rerender();
      };
    }
    const prevBtn = container.querySelector("[data-pa-role='prevYear']");
    if (prevBtn) {
      prevBtn.onclick = () => {
        setSelectedYear(getSelectedYear(sc) - 1, sc);
        rerender();
      };
    }
    const nextBtn = container.querySelector("[data-pa-role='nextYear']");
    if (nextBtn) {
      nextBtn.onclick = () => {
        setSelectedYear(getSelectedYear(sc) + 1, sc);
        rerender();
      };
    }
    const restoreBtn = container.querySelector("[data-pa-role='restoreHidden']");
    if (restoreBtn) {
      restoreBtn.onclick = () => {
        prefs.hiddenTypes = [];
        prefs.hiddenCards = [];
        onSavePrefs?.("👁️ Todos os itens ocultos restaurados no Calendário Anual!");
      };
    }

    // Menu Imprimir / Exportar
    const expBtn = container.querySelector("[data-pa-role='exportMenuBtn']");
    const expMenu = container.querySelector("[data-pa-role='exportMenu']");
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
    const pngBtn = container.querySelector("[data-pa-role='exportPng']");
    if (pngBtn) pngBtn.onclick = () => { if (expMenu) expMenu.hidden = true; exportAnnualPng(toast, sc); };
    const pdfBtn = container.querySelector("[data-pa-role='exportPdf']");
    if (pdfBtn) pdfBtn.onclick = () => { if (expMenu) expMenu.hidden = true; exportAnnualPdfLandscape(toast, sc); };

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
        prefs.order = [...order, ...hiddenPresentTypes];
        onSavePrefs?.("↕️ Ordem das categorias atualizada!");
      };
    });

    container.querySelectorAll("[data-pa-hide-type]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const tId = btn.dataset.paHideType;
        if (!prefs.hiddenTypes.includes(tId)) prefs.hiddenTypes.push(tId);
        onSavePrefs?.("👁️ Categoria ocultada no Calendário Anual.");
      };
    });

    container.querySelectorAll("[data-pa-hide-card]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const cid = btn.dataset.paHideCard;
        if (!prefs.hiddenCards.includes(cid)) prefs.hiddenCards.push(cid);
        onSavePrefs?.("👁️ Atividade ocultada apenas no Calendário Anual.");
      };
    });

    // Clique na barra ou rótulo externo abre Editar Cartão
    container.querySelectorAll("[data-pa-card]").forEach(el => {
      el.onclick = e => {
        if (e.target.closest("[data-pa-hide-card]")) return;
        if (window.MyPlanDismiss?.wasRecentlyDismissed?.()) return;
        e.stopPropagation();
        onOpenCard?.(el.dataset.paCard);
      };
    });

    // Interações da área do gráfico: Clique no vazio -> Novo Evento + Pinça (Pinch-to-Zoom) Mobile
    const scrollEl = container.querySelector(".pa-sheet-scroll");
    const sheetEl = container.querySelector(".pa-sheet");
    let lastPinchEndTs = 0;

    if (scrollEl && sheetEl) {
      let pinchStartDist = 0;
      let pinchStartScale = zoomScale;
      let pinchFocalRatio = 0.5;
      let pinchActive = false;

      scrollEl.addEventListener("touchstart", e => {
        if (e.touches.length === 2) {
          pinchActive = true;
          const t0 = e.touches[0], t1 = e.touches[1];
          pinchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY) || 1;
          pinchStartScale = Math.max(0.75, Math.min(3.2, Number(zoomScaleByScope[sc]) || 1));
          const rect = scrollEl.getBoundingClientRect();
          const midX = ((t0.clientX + t1.clientX) / 2) - rect.left;
          const totalW = Math.max(1, scrollEl.scrollWidth);
          pinchFocalRatio = (scrollEl.scrollLeft + midX) / totalW;
        }
      }, { passive: true });

      scrollEl.addEventListener("touchmove", e => {
        if (!pinchActive || e.touches.length !== 2) return;
        e.preventDefault();
        const t0 = e.touches[0], t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY) || 1;
        const factor = dist / Math.max(10, pinchStartDist);
        const nextScale = Math.max(0.75, Math.min(3.2, Math.round(pinchStartScale * factor * 100) / 100));
        zoomScaleByScope[sc] = nextScale;
        const nextMinW = Math.round(baseSheetMinWidth * nextScale);
        sheetEl.style.minWidth = `${nextMinW}px`;
        const rect = scrollEl.getBoundingClientRect();
        const midX = ((t0.clientX + t1.clientX) / 2) - rect.left;
        scrollEl.scrollLeft = Math.max(0, Math.round(pinchFocalRatio * scrollEl.scrollWidth - midX));
        const pct = Math.round(nextScale * 100);
        const granularity = (prefs.showDays || nextScale >= 1.65) ? "Dias" : (nextScale < 0.9 ? "Meses" : "Semanas");
        showAnnualPinchBadge(scrollEl, `🔍 ${pct}% · ${granularity}`);
      }, { passive: false });

      const finishPinch = () => {
        if (!pinchActive) return;
        pinchActive = false;
        lastPinchEndTs = Date.now();
        const scVal = zoomScaleByScope[sc];
        const prevScrollLeft = scrollEl.scrollLeft;
        const prevScrollW = Math.max(1, scrollEl.scrollWidth);
        const ratio = prevScrollLeft / prevScrollW;
        // Alterna automaticamente granularidade Dias ↔ Semanas ao dar zoom forte na pinça
        if (scVal >= 1.75 && !prefs.showDays) prefs.showDays = true;
        else if (scVal <= 0.95 && prefs.showDays) prefs.showDays = false;
        rerender();
        const nextScroll = container.querySelector(".pa-sheet-scroll");
        if (nextScroll) {
          nextScroll.scrollLeft = Math.max(0, Math.round(ratio * nextScroll.scrollWidth));
        }
      };
      scrollEl.addEventListener("touchend", e => {
        if (pinchActive && e.touches.length < 2) finishPinch();
      }, { passive: true });
      scrollEl.addEventListener("touchcancel", finishPinch, { passive: true });

      // Clique em espaço vazio da grade -> Inserir novo evento com data pré-preenchida
      if (typeof onCreateAtDate === "function") {
        let downInfo = null;
        scrollEl.addEventListener("pointerdown", e => {
          if (e.button && e.button !== 0) return;
          if (e.target.closest("[data-pa-card], [data-pa-hide-card], .pa-rail, button, a, input, select")) {
            downInfo = null;
            return;
          }
          downInfo = {
            x: e.clientX,
            y: e.clientY,
            sl: scrollEl.scrollLeft,
            st: scrollEl.scrollTop,
            t: Date.now(),
            hadOverlay: Boolean(window.MyPlanDismiss?.hasOpenOverlay?.())
          };
        });
        scrollEl.addEventListener("click", e => {
          const di = downInfo;
          downInfo = null;
          if (!di || di.hadOverlay) return;
          if (Date.now() - lastPinchEndTs < 380) return;
          if (window.MyPlanDismiss?.hasOpenOverlay?.() || window.MyPlanDismiss?.wasRecentlyDismissed?.()) return;
          if (e.target.closest("[data-pa-card], [data-pa-hide-card], .pa-rail, .pa-header-box, button, a, input, select")) return;
          const laneGrid = e.target.closest(".pa-lane-grid");
          if (!laneGrid) return;
          if (Math.hypot(e.clientX - di.x, e.clientY - di.y) > 8) return;
          if (Math.abs(scrollEl.scrollLeft - di.sl) > 5 || Math.abs(scrollEl.scrollTop - di.st) > 5) return;

          const rect = laneGrid.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / Math.max(1, rect.width)));
          const dayOff = Math.floor(ratio * period.totalDays);
          const targetDt = new Date(period.rangeStart.getFullYear(), period.rangeStart.getMonth(), period.rangeStart.getDate() + dayOff);
          const isoDate = toIsoDate(targetDt);
          const laneTypeId = laneGrid.closest(".pa-swimlane")?.dataset.paType || "";
          onCreateAtDate(isoDate, laneTypeId);
        });
      }
    }
  }

  window.MyPlanProAnnual = {
    render,
    exportAnnualPng,
    exportAnnualPdfLandscape,
    setYear: (y, scope = "pro") => setSelectedYear(y, scope),
    getYear: (scope = "pro") => getSelectedYear(scope),
    setFitEvents: (v, scope = "pro") => setFitEvents(v, scope),
    getFitEvents: (scope = "pro") => getFitEvents(scope)
  };
})();
