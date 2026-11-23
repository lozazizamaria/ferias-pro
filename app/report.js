/* ===== Relatórios PDF Horizontais, Gantt PNG/PDF, Mapa da Rota & Passe Wallet — My Plan ===== */
(function () {
  const TYPE_COLORS = {
    Viagem: ["#0284c7", "#4f46e5"],
    Voo: ["#0ea5e9", "#0284c7"],
    Trem: ["#14b8a6", "#0284c7"],
    "Ônibus": ["#f59e0b", "#d97706"],
    Navio: ["#0891b2", "#1d4ed8"],
    Hospedagem: ["#10b981", "#0f766e"],
    Ingresso: ["#8b5cf6", "#db2777"],
    Evento: ["#d97706", "#e11d48"],
    Passeio: ["#ec4899", "#9333ea"],
    Restaurante: ["#f97316", "#dc2626"],
    "Período": ["#7c3aed", "#4338ca"],
    Outro: ["#64748b", "#475569"]
  };

  const PRO_TYPE_COLORS = {
    Desenvolvimento: ["#2563eb", "#1d4ed8"],
    "Reunião": ["#0284c7", "#0369a1"],
    "Viagem Corp.": ["#d97706", "#b45309"],
    Recebimento: ["#10b981", "#059669"],
    Despesa: ["#ef4444", "#dc2626"],
    Entrega: ["#6366f1", "#4338ca"],
    Marco: ["#0ea5e9", "#0284c7"],
    "Follow-up": ["#8b5cf6", "#6d28d9"],
    Outro: ["#64748b", "#475569"]
  };

  function getTypeColorPair(type, isPro) {
    if (isPro) return PRO_TYPE_COLORS[type] || TYPE_COLORS[type] || PRO_TYPE_COLORS.Outro;
    return TYPE_COLORS[type] || TYPE_COLORS.Outro;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function printHtmlInFrame(html, waitForImages = true) {
    return new Promise(resolve => {
      const old = document.getElementById("fpPrintFrame");
      if (old) old.remove();
      const iframe = document.createElement("iframe");
      iframe.id = "fpPrintFrame";
      iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      let printed = false;
      const triggerPrint = () => {
        if (printed) return;
        printed = true;
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch {}
        resolve(true);
      };

      if (!waitForImages) {
        setTimeout(triggerPrint, 180);
        return;
      }

      const imgs = [...doc.querySelectorAll("img")];
      if (!imgs.length) {
        setTimeout(triggerPrint, 200);
        return;
      }
      let pending = imgs.length;
      const doneImg = () => {
        pending--;
        if (pending <= 0) setTimeout(triggerPrint, 180);
      };
      imgs.forEach(img => {
        if (img.complete) doneImg();
        else {
          img.onload = doneImg;
          img.onerror = doneImg;
        }
      });
      setTimeout(triggerPrint, 2600);
    });
  }

  /* ---------- GANTT HORIZONTAL RENDERER (HTML p/ PDF & CANVAS p/ PNG) ---------- */
  function filterActivitiesByRange(activities, fromISO, toISO) {
    return activities.filter(a => {
      const s = a.start;
      const e = a.end || a.start;
      return (!toISO || s <= toISO) && (!fromISO || e >= fromISO);
    });
  }

  function formatProFinBadge(a, money) {
    const amt = Number(a.actualAmount) > 0 ? Number(a.actualAmount) : (Number(a.amount) || 0);
    if (amt <= 0) return "";
    if (a.finDirection === "income") return `+${money(amt)}`;
    if (a.finDirection === "expense") return `-${money(amt)}`;
    return "";
  }

  function getIsoWeekInfoLocal(dateInput, helpers) {
    if (helpers?.getIsoWeekInfo) return helpers.getIsoWeekInfo(dateInput);
    const d = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return { week, isoYear: d.getFullYear(), key: `${d.getFullYear()}-W${String(week).padStart(2, "0")}` };
  }

  function getIsoWeekMondayLocal(dateInput, helpers) {
    if (helpers?.getIsoWeekMonday) return helpers.getIsoWeekMonday(dateInput);
    const d = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    const diff = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }

  const GANTT_PRINT_EXTRA_CSS = `
    .pg-grid { display: grid; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; font-size: 7pt; width: 100%; }
    .pg-corner { grid-row: 1 / span 3; grid-column: 1; background: #f1f5f9; font-weight: 700; display: flex; align-items: center; padding: 4px 8px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
    .pg-grid.is-week-only .pg-corner { grid-row: 1 / span 2; }
    .pg-month { background: #e2e8f0; font-weight: 700; font-size: 6.7pt; text-transform: uppercase; padding: 2px 5px; border-right: 1px solid #94a3b8; border-bottom: 1px solid #cbd5e1; color: #0f172a; }
    .pg-month.m-odd { background: #dbeafe; color: #1e3a8a; }
    .pg-week { background: #f8fafc; font-weight: 700; font-size: 6pt; text-align: center; padding: 2px 2px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; color: #334155; }
    .pg-week.w-odd { background: #eef2ff; color: #1e3a8a; }
    .pg-day { text-align: center; padding: 2px 0; border-right: 1px solid rgba(203,213,225,0.55); border-bottom: 1px solid #cbd5e1; font-size: 5.9pt; color: #475569; }
    .pg-day.compact { padding: 1px 0; }
    .pg-day b { display: block; font-size: 7.1pt; color: #0f172a; }
    .pg-day.compact b { font-size: 6.2pt; }
    .pg-day.w-odd, .pg-cell.w-odd { background: rgba(59, 130, 246, 0.045); }
    .pg-day.we, .pg-cell.we { background: rgba(15, 23, 42, 0.04); }
    .pg-day.we.w-odd, .pg-cell.we.w-odd { background: rgba(59, 130, 246, 0.075); }
    .pg-day.w-start, .pg-cell.w-start { border-left: 1px solid rgba(100,116,139,0.45); }
    .pg-day.m-start, .pg-cell.m-start { border-left: 1.5px solid rgba(59,130,246,0.55); }
    .pg-cell { border-right: 1px solid rgba(203,213,225,0.45); border-bottom: 1px solid #e2e8f0; min-height: 21px; }
    .pg-city-corner { background: #f8fafc; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 2px 6px; font-size: 6.5pt; font-weight: 700; color: #475569; display: flex; align-items: center; }
    .pg-city-cell { border-right: 1px solid #e2e8f0; border-bottom: 1px solid #cbd5e1; display: flex; align-items: center; padding: 1px 2px; min-width: 0; overflow: hidden; }
    .pg-city-pill { width: 100%; border-radius: 4px; padding: 1px 4px; font-size: 6pt; font-weight: 700; border: 1px solid transparent; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }
    .pg-name { display: flex; align-items: center; gap: 5px; padding: 3.5px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #e2e8f0; background: #fff; min-width: 0; }
    .pg-dot { width: 15px; height: 15px; border-radius: 4px; color: #fff; font-size: 6.5pt; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pg-ntxt { min-width: 0; overflow: hidden; }
    .pg-ntxt b { display: block; font-size: 7pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pg-ntxt small { display: block; font-size: 6pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pg-bar-wrap { display: flex; align-items: center; padding: 2px; z-index: 2; pointer-events: none; overflow: hidden; }
    .pg-bar { position: relative; width: 100%; border-radius: 5px; color: #fff; font-weight: 700; font-size: 6.5pt; padding: 2px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .pg-bar.has-conflict { outline: 1.5px dashed #dc2626; }
    .pg-bar-prog { position: absolute; left: 0; bottom: 0; height: 2px; background: rgba(255,255,255,0.65); }
    .pg-bar-lbl { position: relative; z-index: 1; }
    .pg-u-pill { display: inline-block; font-size: 5.5pt; font-weight: 800; padding: 0 3px; border-radius: 3px; margin-right: 3px; }
    .pg-u-pill.pro { background: #1e3a8a; color: #dbeafe; }
    .pg-u-pill.per { background: #0f766e; color: #d1fae5; }
  `;

  function buildGanttHtmlBlock(activities, fromISO, toISO, helpers, compactTitle, opts = {}) {
    const { parseD, fmtShortBR, days, money, num, calc, getTypeInfo, WD, DAY } = helpers;
    const isPro = Boolean(opts.isPro);
    const isUnified = Boolean(opts.isUnified && opts.unifiedLookup);
    const isWeekOnly = Boolean(opts.isWeekOnly || (Number(opts.zoomPx) > 0 && Number(opts.zoomPx) < 22));
    const colMap = opts.colMap || new Map();
    const rows = filterActivitiesByRange(activities, fromISO, toISO);
    if (!rows.length) return `<p style="color:#64748b">Nenhuma atividade nas datas selecionadas.</p>`;

    const mNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const leftW = opts.slimRail ? 150 : 210;

    if (isWeekOnly) {
      const minMon = getIsoWeekMondayLocal(parseD(fromISO), helpers);
      const maxMon = getIsoWeekMondayLocal(parseD(toISO), helpers);
      const weeksCount = Math.max(1, Math.min(160, Math.round((maxMon.getTime() - minMon.getTime()) / (7 * DAY)) + 1));
      const colsCss = `${leftW}px repeat(${weeksCount}, minmax(0, 1fr))`;
      const weeks = [];
      const monthSpans = [];
      for (let i = 0; i < weeksCount; i++) {
        const mon = new Date(minMon.getTime() + i * 7 * DAY + 3600e3);
        const thu = new Date(mon.getTime() + 3 * DAY + 3600e3);
        const wi = getIsoWeekInfoLocal(mon, helpers);
        const mKey = `${thu.getFullYear()}-${thu.getMonth()}`;
        const prevM = monthSpans[monthSpans.length - 1];
        let mStart = false;
        if (prevM && prevM.key === mKey) prevM.span++;
        else {
          mStart = i > 0;
          monthSpans.push({ key: mKey, label: `${mNames[thu.getMonth()]}/${String(thu.getFullYear()).slice(2)}`, col: i + 2, span: 1, mOdd: monthSpans.length % 2 === 1 });
        }
        weeks.push({ idx: i, week: wi.week, wOdd: i % 2 === 1, mStart });
      }

      let cells = `<div class="pg-corner">${esc(compactTitle || (isUnified ? "Agenda Completa" : (isPro ? "Cartão / Entrega" : "Atividade")))}</div>`;
      monthSpans.forEach(ms => {
        cells += `<div class="pg-month ${ms.mOdd ? "m-odd" : "m-even"}" style="grid-column:${ms.col} / span ${ms.span};grid-row:1">${ms.label}</div>`;
      });
      weeks.forEach(w => {
        cells += `<div class="pg-week ${w.wOdd ? "w-odd" : "w-even"}" style="grid-column:${w.idx + 2};grid-row:2">${weeksCount > 24 ? `S${w.week}` : `Sem ${w.week}`}</div>`;
      });

      rows.forEach((a, rIdx) => {
        const row = rIdx + 3;
        const um = isUnified ? opts.unifiedLookup.get(a.id) : null;
        const effPro = um ? (um.mode === "professional") : isPro;
        const info = getTypeInfo(a.type);
        const colors = getTypeColorPair(a.type, effPro);
        const finBadge = effPro ? formatProFinBadge(a, money) : "";
        const c = (!effPro && calc) ? calc(a) : { total: 0, extra: 0 };
        const costVal = c.total + c.extra;
        const baseMeta = effPro
          ? ([a.columnTitle || colMap.get(a.columnId), a.client, a.progress > 0 ? `${a.progress}%` : "", finBadge].filter(Boolean).join(" · ") || fmtShortBR(a.start))
          : (a.type === "Viagem" ? `${a.from || "?"}➔${a.to || "?"}` : `${fmtShortBR(a.start)}${costVal > 0 ? ` · ${money(costVal)}` : ""}`);
        const uPrefix = um
          ? `<span class="pg-u-pill ${effPro ? "pro" : "per"}">${effPro ? "PRO" : "PES"}</span>${um.conflict ? "⚠️ " : ""}`
          : "";

        cells += `<div class="pg-name" style="grid-column:1;grid-row:${row}${um?.calColor ? `;border-left:3px solid ${esc(um.calColor)}` : ""}">
          <span class="pg-dot" style="background:${colors[0]}">${info.icon}</span>
          <div class="pg-ntxt"><b>${esc(a.name)}</b><small>${uPrefix}${esc(baseMeta)}</small></div>
        </div>`;

        const sMon = getIsoWeekMondayLocal(parseD(a.start), helpers);
        const eMon = getIsoWeekMondayLocal(parseD(a.end || a.start), helpers);
        const startIdx = Math.max(0, Math.min(weeksCount - 1, Math.round((sMon.getTime() - minMon.getTime()) / (7 * DAY))));
        const endIdx = Math.max(startIdx, Math.min(weeksCount - 1, Math.round((eMon.getTime() - minMon.getTime()) / (7 * DAY))));
        const span = Math.max(1, endIdx - startIdx + 1);

        weeks.forEach(w => {
          cells += `<div class="pg-cell ${w.wOdd ? "w-odd" : "w-even"} ${w.mStart ? "m-start" : ""}" style="grid-column:${w.idx + 2};grid-row:${row}"></div>`;
        });

        const barLabel = `${esc(a.name)}${effPro && a.progress > 0 && span >= 2 ? ` (${Number(a.progress)}%)` : ""}`;
        const progW = effPro && Number(a.progress) > 0 ? Math.min(100, Math.max(0, Number(a.progress))) : 0;
        const progHtml = progW > 0 ? `<span class="pg-bar-prog" style="width:${progW}%"></span>` : "";
        cells += `<div class="pg-bar-wrap" style="grid-column:${startIdx + 2} / span ${span};grid-row:${row}">
          <div class="pg-bar${um?.conflict ? " has-conflict" : ""}" style="background:linear-gradient(135deg,${colors[0]},${colors[1]})${um?.calColor ? `;border-left:3px solid ${esc(um.calColor)}` : ""}">${progHtml}<span class="pg-bar-lbl">${info.icon} ${barLabel}</span></div>
        </div>`;
      });

      return `<div class="pg-grid is-week-only" style="grid-template-columns:${colsCss}">${cells}</div>`;
    }

    const minTs = parseD(fromISO).getTime();
    const maxTs = parseD(toISO).getTime();
    const nDays = Math.max(1, Math.min(366, Math.round((maxTs - minTs) / DAY) + 1));
    const dates = [];
    for (let i = 0; i < nDays; i++) {
      const d = new Date(minTs + i * DAY + 3600e3);
      dates.push(d);
    }

    const colsCss = `${leftW}px repeat(${nDays}, minmax(0, 1fr))`;
    const monthSpans = [];
    const weekSpans = [];
    const dayMeta = [];
    dates.forEach((d, idx) => {
      const mKey = `${d.getFullYear()}-${d.getMonth()}`;
      const lastM = monthSpans[monthSpans.length - 1];
      let mStart = false;
      if (lastM && lastM.key === mKey) lastM.span++;
      else {
        mStart = idx > 0;
        monthSpans.push({ key: mKey, label: `${mNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, col: idx + 2, span: 1, mOdd: monthSpans.length % 2 === 1 });
      }
      const wi = getIsoWeekInfoLocal(d, helpers);
      const lastW = weekSpans[weekSpans.length - 1];
      let wStart = false;
      if (lastW && lastW.key === wi.key) lastW.span++;
      else {
        wStart = idx > 0;
        weekSpans.push({ key: wi.key, week: wi.week, col: idx + 2, span: 1, wOdd: weekSpans.length % 2 === 1 });
      }
      dayMeta.push({
        we: d.getDay() === 0 || d.getDay() === 6,
        wOdd: (weekSpans.length - 1) % 2 === 1,
        mStart,
        wStart
      });
    });

    let cells = `<div class="pg-corner">${esc(compactTitle || (isUnified ? "Agenda Completa" : (isPro ? "Cartão / Entrega" : "Atividade")))}</div>`;
    monthSpans.forEach(ms => {
      cells += `<div class="pg-month ${ms.mOdd ? "m-odd" : "m-even"}" style="grid-column:${ms.col} / span ${ms.span};grid-row:1">${ms.label}</div>`;
    });
    weekSpans.forEach(ws => {
      const wLbl = ws.span >= 4 ? `Sem ${ws.week}` : (ws.span >= 2 ? `S${ws.week}` : String(ws.week));
      cells += `<div class="pg-week ${ws.wOdd ? "w-odd" : "w-even"}" style="grid-column:${ws.col} / span ${ws.span};grid-row:2">${wLbl}</div>`;
    });
    const compactDays = nDays > 45;
    const numStep = nDays > 160 ? 5 : (nDays > 95 ? 2 : 1);
    dates.forEach((d, i) => {
      const dm = dayMeta[i];
      const showNum = numStep === 1 || d.getDate() === 1 || i % numStep === 0;
      const dayLbl = compactDays ? "" : `<span>${WD[d.getDay()][0]}</span>`;
      const numLbl = showNum ? `<b>${d.getDate()}</b>` : `<b></b>`;
      cells += `<div class="pg-day ${dm.we ? "we" : ""} ${dm.wOdd ? "w-odd" : "w-even"} ${dm.wStart ? "w-start" : ""} ${dm.mStart ? "m-start" : ""}${compactDays ? " compact" : ""}" style="grid-column:${i + 2};grid-row:3">${dayLbl}${numLbl}</div>`;
    });

    let rowOffset = 4;
    const citySpans = !isPro && !isUnified && opts.showCityRow && Array.isArray(opts.cityTrack?.spans) ? opts.cityTrack.spans : [];
    if (citySpans.length) {
      cells += `<div class="pg-city-corner" style="grid-column:1;grid-row:4">📍 Cidade</div>`;
      citySpans.forEach(sp => {
        const bg = sp.color?.lightBg || "rgba(2,132,199,0.12)";
        const bd = sp.color?.lightBd || "rgba(2,132,199,0.4)";
        const txt = sp.color?.lightTxt || "#0f172a";
        cells += `<div class="pg-city-cell" style="grid-column:${sp.startIdx + 2} / span ${sp.span};grid-row:4"><span class="pg-city-pill" style="background:${bg};border-color:${bd};color:${txt}">${esc(sp.city)}</span></div>`;
      });
      rowOffset = 5;
    }

    rows.forEach((a, rIdx) => {
      const row = rIdx + rowOffset;
      const um = isUnified ? opts.unifiedLookup.get(a.id) : null;
      const effPro = um ? (um.mode === "professional") : isPro;
      const info = getTypeInfo(a.type);
      const colors = getTypeColorPair(a.type, effPro);
      let meta = "";
      let finBadge = "";
      if (effPro) {
        const colName = a.columnTitle || colMap.get(a.columnId) || "";
        finBadge = formatProFinBadge(a, money);
        const parts = [];
        if (colName) parts.push(colName);
        if (a.client) parts.push(a.client);
        if (a.progress > 0) parts.push(`${Number(a.progress)}%`);
        if (finBadge) parts.push(finBadge);
        meta = parts.join(" · ") || fmtShortBR(a.start);
      } else {
        const c = calc ? calc(a) : { total: 0, extra: 0 };
        const costVal = c.total + c.extra;
        meta = a.type === "Viagem"
          ? `${a.from || "?"}➔${a.to || "?"} · ${num(a.km)}km · ${money(costVal)}`
          : `${fmtShortBR(a.start)}${costVal > 0 ? ` · ${money(costVal)}` : ""}`;
      }
      const uPrefix = um
        ? `<span class="pg-u-pill ${effPro ? "pro" : "per"}">${effPro ? "PRO" : "PES"}</span>${um.conflict ? "⚠️ " : ""}`
        : "";

      cells += `<div class="pg-name" style="grid-column:1;grid-row:${row}${um?.calColor ? `;border-left:3px solid ${esc(um.calColor)}` : ""}">
        <span class="pg-dot" style="background:${colors[0]}">${info.icon}</span>
        <div class="pg-ntxt"><b>${esc(a.name)}</b><small>${uPrefix}${esc(meta)}</small></div>
      </div>`;

      const startTs = Math.max(minTs, parseD(a.start).getTime());
      const endTs = Math.min(maxTs, parseD(a.end || a.start).getTime());
      const startIdx = Math.max(0, Math.round((startTs - minTs) / DAY));
      const span = Math.max(1, Math.round((endTs - startTs) / DAY) + 1);

      for (let i = 0; i < nDays; i++) {
        const dm = dayMeta[i];
        cells += `<div class="pg-cell ${dm.we ? "we" : ""} ${dm.wOdd ? "w-odd" : "w-even"} ${dm.wStart ? "w-start" : ""} ${dm.mStart ? "m-start" : ""}" style="grid-column:${i + 2};grid-row:${row}"></div>`;
      }

      const barLabel = effPro
        ? `${esc(a.name)}${a.progress > 0 && span >= 3 ? ` (${Number(a.progress)}%)` : ""}${finBadge && span >= 3 ? ` · ${esc(finBadge)}` : ""}`
        : (span >= 3 ? `${esc(a.name)} (${days(a)}d)` : esc(a.name));
      const progW = effPro && Number(a.progress) > 0 ? Math.min(100, Math.max(0, Number(a.progress))) : 0;
      const progHtml = progW > 0 ? `<span class="pg-bar-prog" style="width:${progW}%"></span>` : "";
      cells += `<div class="pg-bar-wrap" style="grid-column:${startIdx + 2} / span ${span};grid-row:${row}">
        <div class="pg-bar${effPro && a.type === "Marco" ? " is-milestone" : ""}${um?.conflict ? " has-conflict" : ""}" style="background:linear-gradient(135deg,${colors[0]},${colors[1]})${um?.calColor ? `;border-left:3px solid ${esc(um.calColor)}` : ""}">${progHtml}<span class="pg-bar-lbl">${info.icon} ${barLabel}</span></div>
      </div>`;
    });

    return `<div class="pg-grid" style="grid-template-columns:${colsCss}">${cells}</div>`;
  }

  function exportGanttImage(state, activities, fromISO, toISO, helpers, opts = {}) {
    const { parseD, fmtBR, money, num, calc, getTypeInfo, WD, MON_FULL, DAY } = helpers;
    const isPro = Boolean(opts.isPro);
    const isUnified = Boolean(opts.isUnified && opts.unifiedLookup);
    const isWeekOnly = Boolean(opts.isWeekOnly || (Number(opts.zoomPx) > 0 && Number(opts.zoomPx) < 22));
    const colMap = opts.colMap || new Map();
    const rows = filterActivitiesByRange(activities, fromISO, toISO);
    if (!rows.length) return false;

    const mNames = MON_FULL || ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const padX = 36;
    const leftW = opts.slimRail ? 230 : 370;

    let nCols = 1;
    let dates = [];
    let weeks = [];
    let monthSpans = [];
    let weekSpans = [];
    let dayMeta = [];
    const minMon = getIsoWeekMondayLocal(parseD(fromISO), helpers);
    const maxMon = getIsoWeekMondayLocal(parseD(toISO), helpers);
    const minTs = parseD(fromISO).getTime();
    const maxTs = parseD(toISO).getTime();

    if (isWeekOnly) {
      nCols = Math.max(1, Math.min(160, Math.round((maxMon.getTime() - minMon.getTime()) / (7 * DAY)) + 1));
      for (let i = 0; i < nCols; i++) {
        const mon = new Date(minMon.getTime() + i * 7 * DAY + 3600e3);
        const thu = new Date(mon.getTime() + 3 * DAY + 3600e3);
        const wi = getIsoWeekInfoLocal(mon, helpers);
        const mKey = `${thu.getFullYear()}-${thu.getMonth()}`;
        const prevM = monthSpans[monthSpans.length - 1];
        let mStart = false;
        if (prevM && prevM.key === mKey) prevM.span++;
        else {
          mStart = i > 0;
          monthSpans.push({ key: mKey, label: `${mNames[thu.getMonth()].slice(0, 3).toUpperCase()} ${thu.getFullYear()}`, idx: i, span: 1, mOdd: monthSpans.length % 2 === 1 });
        }
        weeks.push({ idx: i, week: wi.week, wOdd: i % 2 === 1, mStart });
      }
    } else {
      nCols = Math.max(1, Math.min(366, Math.round((maxTs - minTs) / DAY) + 1));
      for (let i = 0; i < nCols; i++) {
        const d = new Date(minTs + i * DAY + 3600e3);
        dates.push(d);
        const mKey = `${d.getFullYear()}-${d.getMonth()}`;
        const lastM = monthSpans[monthSpans.length - 1];
        let mStart = false;
        if (lastM && lastM.key === mKey) lastM.span++;
        else {
          mStart = i > 0;
          monthSpans.push({ key: mKey, label: `${mNames[d.getMonth()].slice(0, 3).toUpperCase()} ${d.getFullYear()}`, idx: i, span: 1, mOdd: monthSpans.length % 2 === 1 });
        }
        const wi = getIsoWeekInfoLocal(d, helpers);
        const lastW = weekSpans[weekSpans.length - 1];
        let wStart = false;
        if (lastW && lastW.key === wi.key) lastW.span++;
        else {
          wStart = i > 0;
          weekSpans.push({ key: wi.key, week: wi.week, idx: i, span: 1, wOdd: weekSpans.length % 2 === 1 });
        }
        dayMeta.push({
          we: d.getDay() === 0 || d.getDay() === 6,
          wOdd: (weekSpans.length - 1) % 2 === 1,
          mStart,
          wStart
        });
      }
    }

    const targetColW = isWeekOnly ? Math.max(64, Math.min(140, Math.round((Number(opts.zoomPx) || 18) * 5))) : Math.max(14, Math.min(64, Number(opts.zoomPx) || 44));
    const W = Math.max(1920, Math.min(3400, padX * 2 + leftW + Math.round(nCols * targetColW)));
    const headerH = 92;
    const cityH = !isPro && !isUnified && !isWeekOnly && opts.showCityRow && opts.cityTrack?.spans?.length ? 28 : 0;
    const gridHeadH = isWeekOnly ? 52 : 76;
    const rowH = Math.max(34, Math.min(54, Math.floor(820 / Math.max(1, rows.length))));
    const H = Math.max(820, headerH + gridHeadH + cityH + rows.length * rowH + 44);
    const colW = (W - padX * 2 - leftW) / nCols;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = isPro ? "#0a1628" : "#0f172a";
    ctx.font = "700 28px Outfit, system-ui, sans-serif";
    ctx.fillText(`My Plan${isUnified ? " · Agenda Completa" : (isPro ? " Pro" : "")} — ${state.title || "Cronograma Gantt"}`, padX, 46);
    ctx.fillStyle = "#475569";
    ctx.font = "500 18px Outfit, system-ui, sans-serif";
    const modeSub = isUnified ? "Pessoal + Profissional · " : (isPro ? "Modo Profissional · " : "");
    const scaleSub = isWeekOnly ? " · Escala Semanal ISO" : "";
    ctx.fillText(`${modeSub}Período: ${fmtBR(fromISO)} a ${fmtBR(toISO)} · ${rows.length} itens${scaleSub}`, padX, 76);

    const topY = headerH;
    ctx.fillStyle = isPro ? "#eff6ff" : "#f1f5f9";
    ctx.fillRect(padX, topY, leftW, gridHeadH);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 16px Outfit, system-ui, sans-serif";
    ctx.fillText(isUnified ? "Agenda Completa" : (isPro ? "Cartão / Lista" : "Atividade / Tipo"), padX + 14, topY + gridHeadH / 2 + 6);

    const monthH = 24;
    const weekH = isWeekOnly ? gridHeadH - monthH : 22;
    const dayY = topY + monthH + weekH;
    const dayH = gridHeadH - monthH - weekH;

    // Month header bands
    monthSpans.forEach(ms => {
      const x = padX + leftW + ms.idx * colW;
      const w = ms.span * colW;
      ctx.fillStyle = ms.mOdd ? (isPro ? "#dbeafe" : "#e2e8f0") : (isPro ? "#eff6ff" : "#f1f5f9");
      ctx.fillRect(x, topY, w, monthH);
      ctx.strokeStyle = "rgba(100,116,139,0.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, topY, w, monthH);
      ctx.fillStyle = isPro && ms.mOdd ? "#1e3a8a" : "#0f172a";
      ctx.font = "700 12px Outfit, system-ui, sans-serif";
      ctx.fillText(ms.label, x + 8, topY + 16);
    });

    if (isWeekOnly) {
      weeks.forEach(w => {
        const x = padX + leftW + w.idx * colW;
        ctx.fillStyle = w.wOdd ? "rgba(59,130,246,0.08)" : "#ffffff";
        ctx.fillRect(x, topY + monthH, colW, weekH);
        if (w.wOdd) {
          ctx.fillStyle = "rgba(59,130,246,0.045)";
          ctx.fillRect(x, topY + gridHeadH, colW, rows.length * rowH);
        }
        ctx.strokeStyle = w.mStart ? "rgba(59,130,246,0.5)" : "rgba(148,163,184,0.45)";
        ctx.lineWidth = w.mStart ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x, topY + monthH);
        ctx.lineTo(x, topY + gridHeadH + rows.length * rowH);
        ctx.stroke();

        ctx.fillStyle = w.wOdd ? "#1e3a8a" : "#334155";
        ctx.font = "700 13px Outfit, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(nCols > 24 ? `S${w.week}` : `Sem ${w.week}`, x + colW / 2, topY + monthH + 19);
        ctx.textAlign = "left";
      });
    } else {
      weekSpans.forEach(ws => {
        const x = padX + leftW + ws.idx * colW;
        const w = ws.span * colW;
        ctx.fillStyle = ws.wOdd ? "#eef2ff" : "#f8fafc";
        ctx.fillRect(x, topY + monthH, w, weekH);
        ctx.strokeStyle = "rgba(148,163,184,0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, topY + monthH, w, weekH);
        ctx.fillStyle = ws.wOdd ? "#1e3a8a" : "#475569";
        ctx.font = "700 11px Outfit, system-ui, sans-serif";
        ctx.textAlign = "center";
        const lbl = w > 56 ? `Sem ${ws.week}` : (w > 24 ? `S${ws.week}` : String(ws.week));
        ctx.fillText(lbl, x + w / 2, topY + monthH + 15);
        ctx.textAlign = "left";
      });

      const hideWd = colW < 22;
      const numStep = colW < 12 ? 3 : (colW < 17 ? 2 : 1);
      for (let i = 0; i < nCols; i++) {
        const d = dates[i];
        const dm = dayMeta[i];
        const x = padX + leftW + i * colW;
        if (dm.wOdd) {
          ctx.fillStyle = "rgba(59, 130, 246, 0.045)";
          ctx.fillRect(x, dayY, colW, dayH + cityH + rows.length * rowH);
        }
        if (dm.we) {
          ctx.fillStyle = "rgba(15, 23, 42, 0.04)";
          ctx.fillRect(x, dayY, colW, dayH + cityH + rows.length * rowH);
        }
        ctx.strokeStyle = dm.mStart ? "rgba(59,130,246,0.5)" : (dm.wStart ? "rgba(100,116,139,0.45)" : "rgba(203,213,225,0.55)");
        ctx.lineWidth = dm.mStart ? 1.5 : (dm.wStart ? 1.1 : 0.7);
        ctx.beginPath();
        ctx.moveTo(x, dayY);
        ctx.lineTo(x, topY + gridHeadH + cityH + rows.length * rowH);
        ctx.stroke();

        if (!hideWd) {
          ctx.fillStyle = "#64748b";
          ctx.font = "600 11px Outfit, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(WD[d.getDay()][0], x + colW / 2, dayY + 11);
        }
        if (numStep === 1 || d.getDate() === 1 || i % numStep === 0) {
          ctx.fillStyle = "#0f172a";
          ctx.font = `700 ${hideWd ? 11 : 13}px Outfit, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(String(d.getDate()), x + colW / 2, hideWd ? dayY + 20 : dayY + 25);
        }
        ctx.textAlign = "left";
      }
    }

    if (cityH > 0) {
      const cy = topY + gridHeadH;
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(padX, cy, W - padX * 2, cityH);
      ctx.fillStyle = "#475569";
      ctx.font = "700 12px Outfit, sans-serif";
      ctx.fillText("📍 CIDADE", padX + 12, cy + 18);
      opts.cityTrack.spans.forEach(sp => {
        const sx = padX + leftW + sp.startIdx * colW + 2;
        const sw = Math.max(18, sp.span * colW - 4);
        ctx.fillStyle = sp.color?.lightBg || "rgba(2,132,199,0.14)";
        ctx.beginPath();
        ctx.roundRect(sx, cy + 4, sw, cityH - 8, 5);
        ctx.fill();
        ctx.fillStyle = sp.color?.lightTxt || "#0f172a";
        ctx.font = "700 11px Outfit, sans-serif";
        ctx.fillText(String(sp.city).slice(0, Math.max(3, Math.floor(sw / 7))), sx + 6, cy + 18);
      });
    }

    rows.forEach((a, idx) => {
      const y = topY + gridHeadH + cityH + idx * rowH;
      if (idx % 2 === 1) {
        ctx.fillStyle = "rgba(241, 245, 249, 0.55)";
        ctx.fillRect(padX, y, W - padX * 2, rowH);
      }
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX, y + rowH);
      ctx.lineTo(W - padX, y + rowH);
      ctx.stroke();

      const um = isUnified ? opts.unifiedLookup.get(a.id) : null;
      const effPro = um ? (um.mode === "professional") : isPro;
      const info = getTypeInfo(a.type);
      const colors = getTypeColorPair(a.type, effPro);
      const finBadge = effPro ? formatProFinBadge(a, money) : "";
      const c = (!effPro && calc) ? calc(a) : { total: 0, extra: 0 };
      const costVal = c.total + c.extra;

      if (um?.calColor) {
        ctx.fillStyle = um.calColor;
        ctx.fillRect(padX, y + 2, 4, rowH - 4);
      }

      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.roundRect(padX + 10, y + (rowH - 24) / 2, 24, 24, 6);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 13px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(info.icon, padX + 22, y + rowH / 2 + 5);
      ctx.textAlign = "left";

      ctx.fillStyle = "#0f172a";
      ctx.font = "700 15px Outfit, sans-serif";
      const nmTxt = `${a.name}${um?.conflict ? " ⚠️" : ""}`;
      ctx.fillText(nmTxt.slice(0, opts.slimRail ? 18 : 32), padX + 44, y + rowH / 2 - 2);
      ctx.fillStyle = "#64748b";
      ctx.font = "500 12px Outfit, sans-serif";
      let sub = "";
      if (effPro) {
        const colName = a.columnTitle || colMap.get(a.columnId) || a.type;
        sub = [um ? "PRO" : "", colName, a.client, a.progress > 0 ? `${a.progress}%` : "", finBadge].filter(Boolean).join(" · ");
      } else {
        sub = a.type === "Viagem"
          ? `${um ? "PES · " : ""}${a.from || "?"} -> ${a.to || "?"} (${num(a.km)} km)`
          : `${um ? "PES · " : ""}${a.type}${costVal > 0 ? " · " + money(costVal) : ""}`;
      }
      ctx.fillText(sub.slice(0, opts.slimRail ? 24 : 42), padX + 44, y + rowH / 2 + 15);

      let sIdx = 0;
      let span = 1;
      if (isWeekOnly) {
        const sMon = getIsoWeekMondayLocal(parseD(a.start), helpers);
        const eMon = getIsoWeekMondayLocal(parseD(a.end || a.start), helpers);
        sIdx = Math.max(0, Math.min(nCols - 1, Math.round((sMon.getTime() - minMon.getTime()) / (7 * DAY))));
        const eIdx = Math.max(sIdx, Math.min(nCols - 1, Math.round((eMon.getTime() - minMon.getTime()) / (7 * DAY))));
        span = Math.max(1, eIdx - sIdx + 1);
      } else {
        const startTs = Math.max(minTs, parseD(a.start).getTime());
        const endTs = Math.min(maxTs, parseD(a.end || a.start).getTime());
        sIdx = Math.max(0, Math.round((startTs - minTs) / DAY));
        span = Math.max(1, Math.round((endTs - startTs) / DAY) + 1);
      }
      const bx = padX + leftW + sIdx * colW + 3;
      const bw = Math.max(isWeekOnly ? 24 : 18, span * colW - 6);
      const by = y + 7;
      const bh = rowH - 14;

      const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1]);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();

      if (um?.conflict) {
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
      }

      if (effPro && Number(a.progress) > 0) {
        const pw = Math.round(bw * Math.min(100, Number(a.progress)) / 100);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.beginPath();
        ctx.roundRect(bx, by + bh - 5, pw, 5, 3);
        ctx.fill();
      }

      const lbl = effPro
        ? `${a.name}${a.progress > 0 ? ` · ${a.progress}%` : ""}${finBadge ? ` · ${finBadge}` : ""}`
        : `${a.name}${costVal > 0 ? " · " + money(costVal) : ""}`;
      const labelFitsInside = bw > 140;
      ctx.font = "700 13px Outfit, sans-serif";
      if (labelFitsInside) {
        ctx.fillStyle = "#ffffff";
        ctx.fillText(lbl.slice(0, Math.floor(bw / 8)), bx + 10, y + rowH / 2 + 5);
      } else {
        const tx = bx + bw + 8;
        ctx.fillStyle = "#0f172a";
        if (tx + 100 < W - padX) {
          ctx.fillText(lbl.slice(0, 34), tx, y + rowH / 2 + 5);
        }
      }
    });

    canvas.toBlob(blob => {
      if (!blob) return;
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = `${(state.title || "my_plan").replace(/[^\w\-]+/g, "_")}_gantt_${fromISO}_${toISO}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1500);
    }, "image/png");
    return true;
  }

  function exportGanttPdf(state, activities, fromISO, toISO, helpers, opts = {}) {
    const { fmtBR } = helpers;
    const isPro = Boolean(opts.isPro);
    const gridHtml = buildGanttHtmlBlock(activities, fromISO, toISO, helpers, isPro ? "Cartão / Entrega" : "Atividade", opts);
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Gantt — ${esc(state.title)}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm 15mm; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 14px 20px; font-family: Outfit, Arial, sans-serif; color: #0f172a; background: #fff; }
        .sheet-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; ${isPro ? "background:linear-gradient(135deg,#0a1628,#1d4ed8);color:#fff;padding:11px 16px;border-radius:10px;" : ""} }
        h1 { margin: 0 0 2px; font-size: 14.5pt; ${isPro ? "color:#fff;" : ""} }
        .sub { font-size: 8.5pt; color: ${isPro ? "#dbeafe" : "#475569"}; }
        .sheet { width: 100%; overflow: hidden; page-break-inside: avoid; }
        ${GANTT_PRINT_EXTRA_CSS}
        ${isPro ? ".pg-month { background: #dbeafe; color: #1e3a8a; } .pg-month.m-odd { background: #bfdbfe; }" : ""}
      </style></head><body>
      <div class="sheet">
        <div class="sheet-head">
          <div>
            <h1>📅 Cronograma Gantt — ${esc(state.title || "My Plan")}</h1>
            <div class="sub">${opts.isUnified ? "Agenda Completa (Pessoal + Profissional) · " : (isPro ? "My Plan Profissional · " : "My Plan · ")}Período: ${fmtBR(fromISO)} a ${fmtBR(toISO)} · Visão capturada em 1 página A4 horizontal</div>
          </div>
          <div class="sub">${opts.filterLabel ? esc(opts.filterLabel) : ""}</div>
        </div>
        ${gridHtml}
      </div></body></html>`;
    return printHtmlInFrame(html, false);
  }

  function printTimelinePdf(state, rows, helpers, opts = {}) {
    const { parseD, fmtBR, days, money, num, hmHuman, calc, getTypeInfo, WD } = helpers;
    const isPro = Boolean(opts.isPro);
    const colMap = opts.colMap || new Map();
    const listHtml = rows.map(a => {
      const info = getTypeInfo(a.type);
      const colors = getTypeColorPair(a.type, isPro);
      const d = parseD(a.start);
      let meta = "";
      if (isPro) {
        const colName = a.columnTitle || colMap.get(a.columnId) || "";
        const finBadge = formatProFinBadge(a, money);
        meta = [
          `${days(a)} dia(s)`,
          a.startTime ? a.startTime : "",
          colName ? `Lista: ${colName}` : "",
          a.client ? `Cliente: ${a.client}` : "",
          a.progress > 0 ? `${a.progress}%` : "",
          finBadge,
          a.notes || ""
        ].filter(Boolean).join(" · ");
      } else {
        const c = calc ? calc(a) : { total: 0, extra: 0 };
        const val = c.total + c.extra;
        meta = a.type === "Viagem"
          ? `${a.from || "?"} ➔ ${a.to || "?"} · ${num(a.km)} km · ${hmHuman(a.drive)} · Ped. ${money(a.toll)} · ${money(val)}`
          : `${days(a)} dia(s)${a.from || a.to ? ` · ${a.from || "?"} ➔ ${a.to || "?"}` : ""}${val > 0 ? ` · ${money(val)}` : ""}${a.notes ? ` · ${a.notes}` : ""}`;
      }
      return `<div class="rtl-item" style="border-left-color:${colors[0]}">
        <div class="rtl-date">${fmtBR(a.start)}<small>${WD[d.getDay()]}</small></div>
        <div class="rtl-body"><b>${info.icon} <span class="rbadge" style="background:${colors[0]}18;color:${colors[0]}">${esc(a.type)}</span> ${esc(a.name)}</b><span>${esc(meta)}</span></div>
      </div>`;
    }).join("") || "<p>Nenhum registro encontrado.</p>";

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Linha do Tempo — ${esc(state.title)}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm 15mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; padding: 14px 20px; font-family: Outfit, Arial, sans-serif; color: #0f172a; background: #fff; }
        .rhead { display: flex; justify-content: space-between; align-items: center; background: ${isPro ? "linear-gradient(135deg,#0a1628,#1d4ed8)" : "linear-gradient(135deg,#1e1b4b,#4338ca)"}; color: #fff; padding: 12px 16px; border-radius: 10px; margin-bottom: 14px; }
        .rhead h1 { margin: 0; font-size: 14pt; color: #fff; }
        .rhead-sub { font-size: 8.5pt; color: #dbeafe; margin-top: 2px; }
        .rtl-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .rtl-item { display: flex; gap: 10px; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; border-radius: 8px; padding: 7px 10px; background: #fcfcfd; break-inside: avoid; }
        .rtl-date { font-weight: 700; font-size: 7.8pt; color: #1e3a8a; min-width: 64px; }
        .rtl-date small { display: block; font-weight: 500; color: #64748b; }
        .rtl-body b { display: block; font-size: 8.2pt; }
        .rtl-body span { font-size: 7.4pt; color: #475569; }
        .rbadge { font-size: 6.8pt; padding: 1px 6px; border-radius: 99px; font-weight: 700; vertical-align: middle; }
      </style></head><body>
      <div class="rhead">
        <div>
          <h1>📌 Linha do Tempo — ${esc(state.title || "My Plan")}</h1>
          <div class="rhead-sub">My Plan${isPro ? " Profissional" : ""} · ${rows.length} item(ns) visíveis</div>
        </div>
        <div class="rhead-sub">${new Date().toLocaleDateString("pt-BR")}</div>
      </div>
      <div class="rtl-list">${listHtml}</div>
      </body></html>`;
    return printHtmlInFrame(html, false);
  }

  /* ---------- TABELA A4 HORIZONTAL (FIT WIDTH, PAGINATE ROWS DOWNWARDS) ---------- */
  function buildFittedTableHtml(rows, totalsObj, helpers) {
    const { fmtShortBR, days, hm, num, money, calc, WD, parseD } = helpers;
    const t = totalsObj;
    const bodyRows = rows.map((a, i) => {
      const c = calc(a);
      const v = a.type === "Viagem";
      const hasRoute = v || a.type === "Voo" || a.type === "Trem" || a.type === "Ônibus" || a.type === "Navio";
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(a.type)}</td>
        <td>${fmtShortBR(a.start)}${a.end && a.end !== a.start ? "–" + fmtShortBR(a.end) : ""}</td>
        <td>${WD[parseD(a.start).getDay()]}</td>
        <td class="wrap"><b>${esc(a.name)}</b></td>
        <td class="wrap">${hasRoute ? `${esc(a.from || "")} ➔ ${esc(a.to || "")}` : ""}</td>
        <td class="num">${days(a)}</td>
        <td class="num">${a.km > 0 ? num(a.km) : ""}</td>
        <td class="num">${a.drive > 0 ? hm(a.drive) : ""}</td>
        <td class="num">${v ? `${a.stops || 0} (${hm(a.stopTime)})` : ""}</td>
        <td class="num">${v ? num(c.ev) : ""}</td>
        <td class="num">${v ? num(c.liters, 1) : ""}</td>
        <td class="num">${v ? money(c.fuel + c.charge) : ""}</td>
        <td class="num">${v ? money(c.toll) : ""}</td>
        <td class="num">${c.extra > 0 ? money(c.extra) : ""}</td>
        <td class="num"><b>${money(c.total + c.extra)}</b></td>
        <td class="wrap">${esc(a.notes || "")}</td>
      </tr>`;
    }).join("");

    return `<table class="a4-table">
      <thead><tr>
        <th style="width:2.5%">#</th>
        <th style="width:6%">Tipo</th>
        <th style="width:7.5%">Datas</th>
        <th style="width:3.5%">Dia</th>
        <th style="width:12%">Atividade</th>
        <th style="width:12%">Trecho</th>
        <th style="width:3%">D.</th>
        <th style="width:4.5%">Km</th>
        <th style="width:4.5%">Dir.</th>
        <th style="width:6%">Paradas</th>
        <th style="width:4.5%">EV km</th>
        <th style="width:4.5%">Gas L</th>
        <th style="width:6.5%">Comb.+EV</th>
        <th style="width:5.5%">Pedágio</th>
        <th style="width:5.5%">Extras</th>
        <th style="width:6.5%">Total</th>
        <th style="width:15.5%">Notas</th>
      </tr></thead>
      <tbody>${bodyRows}</tbody>
      <tfoot><tr>
        <td colspan="7"><b>TOTAL (${t.trips} viagens carro)</b></td>
        <td class="num"><b>${num(t.km)}</b></td>
        <td class="num"><b>${hm(t.drive)}</b></td>
        <td class="num">${t.stops}</td>
        <td class="num">${num(t.ev)}</td>
        <td class="num">${num(t.liters, 1)}</td>
        <td class="num">${money(t.fuel + t.charge)}</td>
        <td class="num">${money(t.toll)}</td>
        <td class="num">${money(t.activitiesExtra)}</td>
        <td class="num"><b>${money(t.total + t.activitiesExtra)}</b></td>
        <td>${t.liters ? `Média ${num(t.km / t.liters, 1)} km/L` : ""}</td>
      </tr></tfoot>
    </table>`;
  }

  function printTableLandscape(rows, state, totalsObj, helpers) {
    const tblHtml = buildFittedTableHtml(rows, totalsObj, helpers);
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Tabela — ${esc(state.title)}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm 15mm; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 14px 20px; font-family: Outfit, Arial, sans-serif; color: #0f172a; background: #fff; }
        h1 { margin: 0 0 2px; font-size: 14pt; }
        .sub { font-size: 8.5pt; color: #475569; margin-bottom: 10px; }
        .a4-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6.8pt; }
        .a4-table thead { display: table-header-group; }
        .a4-table tfoot { display: table-row-group; }
        .a4-table tr { break-inside: avoid; page-break-inside: avoid; }
        .a4-table tbody tr:nth-child(even) { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .a4-table th, .a4-table td { border: 1px solid #cbd5e1; padding: 4px 4px; text-align: left; vertical-align: top; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .a4-table td.wrap { white-space: normal; word-break: break-word; }
        .a4-table th { background: #e2e8f0; font-weight: 700; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .a4-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .a4-table tfoot td { background: #eef2ff; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      </style></head><body>
      <h1>🧾 Planilha Completa — ${esc(state.title || "My Plan")}</h1>
      <div class="sub">Largura ajustada à página A4 horizontal (${rows.length} registros)</div>
      ${tblHtml}
      </body></html>`;
    return printHtmlInFrame(html, false);
  }

  /* ---------- MAPA DA ROTA PARA O RELATÓRIO (100% IMUNE A IMAGEM QUEBRADA) ---------- */
  function collectRouteStops(trips) {
    const stops = [];
    trips.forEach(a => {
      if (a.from && stops[stops.length - 1] !== a.from) stops.push(a.from);
      if (a.to && stops[stops.length - 1] !== a.to) stops.push(a.to);
    });
    return stops;
  }

  function buildGeoOrSchematicMapDataUrl(trips, stateTitle, coordsMap, helpers) {
    const { num } = helpers || { num: v => String(v || 0) };
    const W = 1280, H = 480;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Atmosfera cartográfica clean
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#f0f7ff");
    grad.addColorStop(0.55, "#f8fafc");
    grad.addColorStop(1, "#ecfeff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grade sutil + paralelos/meridianos decorativos
    ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Rosa dos ventos discreta no canto superior direito
    ctx.save();
    ctx.translate(W - 58, 56);
    ctx.strokeStyle = "rgba(79, 70, 229, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#4f46e5";
    ctx.font = "700 12px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", 0, -27);
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(6, 0); ctx.lineTo(0, 16); ctx.lineTo(-6, 0); ctx.closePath();
    ctx.fillStyle = "rgba(79, 70, 229, 0.22)";
    ctx.fill();
    ctx.restore();

    const stops = collectRouteStops(trips);
    const totalKm = trips.reduce((s, a) => s + (+a.km || 0), 0);

    // Card de título no mapa
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.roundRect(24, 18, 560, 44, 12);
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 18px Outfit, sans-serif";
    ctx.fillText(`🗺️ Trajeto Rodoviário — ${String(stateTitle || "My Plan").slice(0, 28)} (${num(totalKm)} km)`, 40, 46);

    if (stops.length < 2) {
      ctx.fillStyle = "#475569";
      ctx.font = "500 18px Outfit, sans-serif";
      ctx.fillText("Nenhuma rota rodoviária com origem e destino cadastrada.", 40, 240);
      return canvas.toDataURL("image/png");
    }

    // Usa coordenadas geográficas reais se disponíveis, caso contrário esquema ondulado limpo
    const geoValid = coordsMap && stops.every(s => coordsMap[s] && isFinite(coordsMap[s].lat) && isFinite(coordsMap[s].lng));
    let pts;
    if (geoValid) {
      const lats = stops.map(s => coordsMap[s].lat);
      const lngs = stops.map(s => coordsMap[s].lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const latSpan = Math.max(0.4, maxLat - minLat);
      const lngSpan = Math.max(0.4, maxLng - minLng);
      pts = stops.map((name, i) => {
        const ll = coordsMap[name];
        const nx = (ll.lng - minLng) / lngSpan;
        const ny = 1 - (ll.lat - minLat) / latSpan;
        return {
          x: 110 + nx * (W - 220),
          y: 96 + ny * (H - 185),
          name
        };
      });
    } else {
      pts = stops.map((name, i) => {
        const t = i / (stops.length - 1);
        const x = 95 + t * (W - 190);
        const y = 248 + Math.sin(t * Math.PI * 2.2) * 85;
        return { x, y, name };
      });
    }

    // Sombra da rota + linha gradiente principal
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(79, 70, 229, 0.16)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], cur = pts[i];
      const mx = (prev.x + cur.x) / 2;
      ctx.bezierCurveTo(mx, prev.y, mx, cur.y, cur.x, cur.y);
    }
    ctx.stroke();

    const routeGrad = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
    routeGrad.addColorStop(0, "#10b981");
    routeGrad.addColorStop(0.5, "#0284c7");
    routeGrad.addColorStop(1, "#4f46e5");
    ctx.strokeStyle = routeGrad;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();

    // Pinos e rótulos com pílula branca legível
    pts.forEach((p, idx) => {
      const col = idx === 0 ? "#10b981" : (idx === pts.length - 1 ? "#ef4444" : "#4f46e5");
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 12px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(idx + 1), p.x, p.y + 4);

      const lbl = p.name.slice(0, 20);
      ctx.font = "700 13px Outfit, sans-serif";
      const tw = Math.min(180, ctx.measureText(lbl).width + 18);
      const boxY = idx % 2 === 0 ? Math.max(70, p.y - 44) : Math.min(H - 36, p.y + 22);
      const boxX = Math.max(12, Math.min(W - tw - 12, p.x - tw / 2));

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, tw, 24, 8);
      ctx.fill();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.fillText(lbl, boxX + tw / 2, boxY + 16);
      ctx.textAlign = "left";
    });

    // Legenda inferior
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.roundRect(24, H - 38, 360, 26, 8);
    ctx.fill();
    ctx.fillStyle = "#10b981"; ctx.beginPath(); ctx.arc(40, H - 25, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#334155"; ctx.font = "600 12px Outfit, sans-serif"; ctx.fillText("Origem", 52, H - 21);
    ctx.fillStyle = "#4f46e5"; ctx.beginPath(); ctx.arc(125, H - 25, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#334155"; ctx.fillText("Paradas", 137, H - 21);
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(215, H - 25, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#334155"; ctx.fillText(geoValid ? "Destino (Coordenadas Reais)" : "Destino Final", 227, H - 21);

    return canvas.toDataURL("image/png");
  }

  async function resolveRouteMapDataUrl(trips, stateTitle, helpers, gmapsKey) {
    const stops = collectRouteStops(trips);
    if (stops.length >= 2 && window.FeriasApi && window.FeriasApi.isServer && window.FeriasApi.isServer() && window.FeriasApi.getStaticRouteMap) {
      try {
        const res = await window.FeriasApi.getStaticRouteMap(stops, gmapsKey);
        if (res && res.available && res.dataUrl) {
          return { dataUrl: res.dataUrl, isGoogleStatic: true };
        }
      } catch {}
    }

    let coordsMap = null;
    if (stops.length >= 2 && window.google?.maps?.Geocoder) {
      try {
        const geocoder = new google.maps.Geocoder();
        const unique = [...new Set(stops)].slice(0, 12);
        const results = await Promise.race([
          Promise.all(unique.map(name => new Promise(resolve => {
            geocoder.geocode({ address: /brasil|brazil/i.test(name) ? name : `${name}, Brasil` }, (res, st) => {
              if (st === "OK" && res && res[0]?.geometry?.location) {
                const loc = res[0].geometry.location;
                resolve([name, { lat: loc.lat(), lng: loc.lng() }]);
              } else resolve(null);
            });
          }))),
          new Promise(r => setTimeout(() => r([]), 2400))
        ]);
        const pairs = (results || []).filter(Boolean);
        if (pairs.length >= 2) coordsMap = Object.fromEntries(pairs);
      } catch {}
    }

    return {
      dataUrl: buildGeoOrSchematicMapDataUrl(trips, stateTitle, coordsMap, helpers),
      isGoogleStatic: false
    };
  }

  /* ---------- RELATÓRIO COMPLETO LIMPO E VISUAL (ORDEM SOLICITADA) ----------
     1. Dashboards (+ Composição de Custos)
     2. Imagem do Maps da Rota (pré-resolvida, sem quebra!)
     3. Gráfico de Gantt (Horizontal)
     4. Linha do Tempo
     5. Checklist
     6. Planilha / Tabela (A4 Horizontal)
     7. Parâmetros & Finanças
  */
  async function printFullTripReport(state, sorted, totalsObj, helpers, gmapsKey) {
    const { parseD, fmtBR, fmtShortBR, days, money, num, hmHuman, calc, getTypeInfo, WD } = helpers;
    const t = totalsObj;
    const avg = t.liters ? t.km / t.liters : 0;
    const perPerson = t.grandTotal / Math.max(1, +state.params?.travelers || 1);
    const doneChk = (state.checklist || []).filter(c => c.status === "Concluído").length;

    const minISO = sorted.length ? fmtBR(sorted[0].start) : fmtBR(new Date().toISOString().slice(0, 10));
    const maxRaw = sorted.length ? sorted.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, sorted[0].start) : "";
    const maxISO = maxRaw ? fmtBR(maxRaw) : minISO;

    const kpisHtml = [
      ["Total Geral das Férias", money(t.grandTotal), `${state.params?.travelers || 1} viajante(s) · ${money(perPerson)}/pessoa`, "#4f46e5"],
      ["Distância de Carro", `${num(t.km)} km`, `${t.trips} trechos rodoviários`, "#0284c7"],
      ["Tempo na Estrada", hmHuman(t.drive + t.stopTime), `Direção ${hmHuman(t.drive)} + ${t.stops} par.`, "#7c3aed"],
      ["Combustível + EV + Ped.", money(t.total), `${num(t.liters, 1)} L (${avg ? num(avg, 1) + " km/L" : "BEV"}) · Ped. ${money(t.toll)}`, "#059669"],
      ["Checklist Preparação", `${doneChk}/${(state.checklist || []).length}`, `${(state.checklist || []).length ? Math.round(doneChk / state.checklist.length * 100) : 0}% concluído`, "#d97706"]
    ].map(([l, v, s, col]) => `<div class="rkpi" style="--rc:${col}"><small>${l}</small><b>${v}</b><span>${s}</span></div>`).join("");

    const compRows = (t.costBreakdown || []).filter(b => b.value > 0);
    const denom = t.grandTotal || t.total || 1;
    const costHtml = compRows.map(b => `
      <div class="rbar">
        <div class="rbar-top">
          <span><i class="rdot" style="background:${b.color || "#4f46e5"}"></i>${esc(b.label)}</span>
          <b>${money(b.value)} <small>(${num(b.value / denom * 100)}%)</small></b>
        </div>
        <div class="rbar-track"><div style="width:${Math.min(100, b.value / denom * 100)}%;background:${b.gradient || "#4f46e5"}"></div></div>
      </div>`).join("") || `<p class="muted">Sem custos registrados.</p>`;

    const trips = sorted.filter(a => a.type === "Viagem" && (a.from || a.to));
    const mapRes = await resolveRouteMapDataUrl(trips, state.title, helpers, gmapsKey);
    const routeLegsHtml = trips.map((tr, i) => `
      <span class="rleg-pill"><b>${i + 1}.</b> ${esc(tr.from)} ➔ ${esc(tr.to)} · ${num(tr.km)} km</span>`
    ).join("");

    const ganttHtml = sorted.length
      ? buildGanttHtmlBlock(sorted, sorted[0].start, maxRaw || sorted[0].start, helpers, "Atividade")
      : "<p>Sem atividades.</p>";

    const timelineHtml = sorted.map(a => {
      const info = getTypeInfo(a.type);
      const colors = TYPE_COLORS[a.type] || TYPE_COLORS.Outro;
      const d = parseD(a.start);
      const c = calc(a);
      const val = c.total + c.extra;
      const meta = a.type === "Viagem"
        ? `${a.from || "?"} ➔ ${a.to || "?"} · ${num(a.km)} km · ${hmHuman(a.drive)} · Ped. ${money(a.toll)} · ${money(val)}`
        : `${days(a)} dia(s)${a.from || a.to ? ` · ${a.from || "?"} ➔ ${a.to || "?"}` : ""}${val > 0 ? ` · ${money(val)}` : ""}${a.notes ? ` · ${a.notes}` : ""}`;
      return `<div class="rtl-item" style="border-left-color:${colors[0]}">
        <div class="rtl-date">${fmtBR(a.start)}<small>${WD[d.getDay()]}</small></div>
        <div class="rtl-body"><b>${info.icon} <span class="rbadge" style="background:${colors[0]}18;color:${colors[0]}">${esc(a.type)}</span> ${esc(a.name)}</b><span>${esc(meta)}</span></div>
      </div>`;
    }).join("") || "<p>Sem atividades.</p>";

    const checklistHtml = `<table class="a4-table">
      <thead><tr><th style="width:5%">#</th><th style="width:14%">Categoria</th><th style="width:36%">Item</th><th style="width:11%">Prioridade</th><th style="width:12%">Status</th><th style="width:22%">Notas</th></tr></thead>
      <tbody>${(state.checklist || []).map((c, i) => {
        const stCls = c.status === "Concluído" ? "ok" : (c.status === "Em andamento" ? "mid" : "pend");
        return `<tr><td>${i + 1}</td><td>${esc(c.cat)}</td><td class="wrap"><b>${esc(c.item)}</b></td><td>${esc(c.prio)}</td><td><span class="rpill ${stCls}">${esc(c.status)}</span></td><td class="wrap">${esc(c.notes || "")}</td></tr>`;
      }).join("")}
      </tbody></table>`;

    const tableHtml = buildFittedTableHtml(sorted, t, helpers);

    const savingsGoal = Number(state.finance?.savingsGoal) || 0;
    const paramsHtml = `<div class="rparams-grid">
      <div class="rbox"><h3>🚗 Veículo &amp; Motorização</h3>
        <div><b>Modelo:</b> ${esc(state.vehicle.name)} (${esc(state.vehicle.powertrain)})</div>
        <div><b>Autonomia EV:</b> ${state.vehicle.evRange} km · <b>Consumo HEV:</b> ${state.vehicle.hevKmL} km/L</div>
        <div><b>Tanque:</b> ${state.vehicle.tank} L · <b>Bateria:</b> ${state.vehicle.battery} kWh (${state.vehicle.kwhPerCharge} kWh/recarga)</div>
        <div><b>Tarifas:</b> Gasolina ${money(state.vehicle.fuelPrice)}/L · Energia ${money(state.vehicle.kwhPrice)}/kWh</div>
      </div>
      <div class="rbox"><h3>💰 Regras, Economia &amp; Cenários</h3>
        <div><b>Viajantes:</b> ${state.params.travelers} · <b>Hospedagem base:</b> ${money(state.params.lodgingPerNight)}/noite (${t.lodgingNights} noites)</div>
        <div><b>Alimentação/pessoa:</b> ${money(state.params.dailyFoodPerPerson)}/dia · <b>Reserva:</b> ${state.params.contingencyPct || 0}%${savingsGoal > 0 ? ` · <b>Meta Economia:</b> -${money(savingsGoal)}` : ""}</div>
        <div><b>Paradas auto:</b> 1 a cada ${state.params.stopIntervalHours}h (${state.params.stopDurationMin} min) · <b>Lembrete:</b> ${state.params.calendarReminderTime || "09:00"}</div>
        <div><b>Cenários:</b> ${(state.scenarios || []).map(sc => `${esc(sc.name)} (${sc.kmL || state.vehicle.hevKmL} km/L)`).join(" · ")}</div>
      </div>
    </div>`;

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório — ${esc(state.title)}</title>
      <style>
        @page { size: A4 landscape; margin: 13mm 15mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; padding: 14px 22px; font-family: Outfit, Arial, sans-serif; color: #0f172a; background: #fff; font-size: 9pt; line-height: 1.4; }
        .rwrap { max-width: 100%; margin: 0 auto; }
        .rhead {
          display: flex; justify-content: space-between; align-items: center; gap: 16px;
          background: linear-gradient(135deg, #1e1b4b, #4338ca); color: #fff;
          padding: 14px 18px; border-radius: 12px; margin-bottom: 16px;
        }
        .rhead h1 { margin: 0; font-size: 16pt; color: #fff; letter-spacing: -0.2px; }
        .rhead-sub { font-size: 8.5pt; color: #e0e7ff; margin-top: 2px; }
        .rhead-meta { text-align: right; font-size: 8.2pt; color: #c7d2fe; white-space: nowrap; }
        .rsec { margin-bottom: 18px; }
        .rsec-break { break-before: page; page-break-before: always; padding-top: 4px; }
        .rsec h2 {
          margin: 0 0 10px; font-size: 11.5pt; color: #1e293b;
          display: flex; align-items: center; gap: 8px;
          border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;
        }
        .rsec-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 7px; font-size: 9pt; font-weight: 700;
          background: #4f46e5; color: #fff;
        }
        .rkpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 14px; }
        .rkpi { border: 1px solid #cbd5e1; border-top: 3px solid var(--rc, #4f46e5); border-radius: 10px; padding: 10px 11px; background: #f8fafc; }
        .rkpi small { display: block; font-size: 6.8pt; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.4px; }
        .rkpi b { display: block; font-size: 12.5pt; margin: 3px 0; color: #0f172a; }
        .rkpi span { font-size: 7.4pt; color: #475569; }
        .rcost-box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 14px; background: #fff; }
        .rbar { margin-bottom: 8px; }
        .rbar:last-child { margin-bottom: 0; }
        .rbar-top { display: flex; justify-content: space-between; font-size: 8.4pt; margin-bottom: 3px; }
        .rbar-top small { color: #64748b; font-weight: 600; }
        .rdot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        .rbar-track { height: 8px; border-radius: 99px; background: #e2e8f0; overflow: hidden; }
        .rbar-track > div { height: 100%; border-radius: 99px; }
        .map-img-box { border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; text-align: center; background: #f8fafc; padding: 6px; }
        .map-img-box img { width: 100%; max-height: 295px; object-fit: contain; display: block; margin: auto; border-radius: 8px; }
        .rlegs-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
        .rleg-pill { font-size: 7.3pt; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 999px; padding: 3px 9px; color: #334155; }
        /* Gantt */
        ${GANTT_PRINT_EXTRA_CSS}
        /* Timeline */
        .rtl-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .rtl-item { display: flex; gap: 10px; border: 1px solid #cbd5e1; border-left: 4px solid #4f46e5; border-radius: 8px; padding: 7px 10px; background: #fcfcfd; break-inside: avoid; }
        .rtl-date { font-weight: 700; font-size: 7.8pt; color: #3730a3; min-width: 64px; }
        .rtl-date small { display: block; font-weight: 500; color: #64748b; }
        .rtl-body b { display: block; font-size: 8.2pt; }
        .rtl-body span { font-size: 7.4pt; color: #475569; }
        .rbadge { font-size: 6.8pt; padding: 1px 6px; border-radius: 99px; font-weight: 700; vertical-align: middle; }
        /* Tables */
        .a4-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6.9pt; }
        .a4-table thead { display: table-header-group; }
        .a4-table tr { break-inside: avoid; }
        .a4-table tbody tr:nth-child(even) { background: #f8fafc; }
        .a4-table th, .a4-table td { border: 1px solid #cbd5e1; padding: 4px 4px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .a4-table td.wrap { white-space: normal; word-break: break-word; }
        .a4-table th { background: #e2e8f0; font-weight: 700; color: #0f172a; }
        .a4-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .a4-table tfoot td { background: #eef2ff; font-weight: 700; }
        .rpill { padding: 2px 7px; border-radius: 99px; font-size: 6.8pt; font-weight: 700; }
        .rpill.ok { background: #dcfce7; color: #166534; }
        .rpill.mid { background: #fef3c7; color: #92400e; }
        .rpill.pend { background: #f1f5f9; color: #475569; }
        .rparams-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .rbox { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 14px; background: #f8fafc; display: grid; gap: 5px; font-size: 8.4pt; }
        .rbox h3 { margin: 0 0 4px; font-size: 9.8pt; color: #1e293b; }
      </style></head><body>
      <div class="rwrap">
        <header class="rhead">
          <div>
            <h1>✈️ Relatório da Viagem — ${esc(state.title || "My Plan")}</h1>
            <div class="rhead-sub">Período: ${minISO} a ${maxISO} · ${t.totalDays || sorted.length} dias planejados · ${state.params?.travelers || 1} viajante(s)</div>
          </div>
          <div class="rhead-meta">Gerado em ${new Date().toLocaleDateString("pt-BR")}<br>${sorted.length} atividades · My Plan</div>
        </header>

        <section class="rsec">
          <h2><span class="rsec-num">1</span> Dashboard &amp; Composição de Custos</h2>
          <div class="rkpis">${kpisHtml}</div>
          <div class="rcost-box">${costHtml}</div>
        </section>

        <section class="rsec">
          <h2><span class="rsec-num">2</span> Mapa da Rota (${mapRes.isGoogleStatic ? "Google Maps" : "Trajeto Visual"})</h2>
          <div class="map-img-box">
            <img src="${mapRes.dataUrl}" alt="Mapa visual da rota">
          </div>
          ${routeLegsHtml ? `<div class="rlegs-row">${routeLegsHtml}</div>` : ""}
        </section>

        <section class="rsec rsec-break">
          <h2><span class="rsec-num">3</span> Cronograma Gráfico de Gantt (Horizontal)</h2>
          ${ganttHtml}
        </section>

        <section class="rsec rsec-break">
          <h2><span class="rsec-num">4</span> Linha do Tempo</h2>
          <div class="rtl-list">${timelineHtml}</div>
        </section>

        <section class="rsec rsec-break">
          <h2><span class="rsec-num">5</span> Checklist de Preparação (${doneChk}/${(state.checklist || []).length})</h2>
          ${checklistHtml}
        </section>

        <section class="rsec rsec-break">
          <h2><span class="rsec-num">6</span> Planilha Completa (A4 Horizontal)</h2>
          ${tableHtml}
        </section>

        <section class="rsec rsec-break">
          <h2><span class="rsec-num">7</span> Parâmetros, Economia &amp; Cenários</h2>
          ${paramsHtml}
        </section>
      </div>
      </body></html>`;

    return printHtmlInFrame(html, true);
  }

  /* ---------- CARTEIRA DO GOOGLE & PASSE VISUAL COM QR CODE ---------- */
  function drawQrMatrix(ctx, seedStr, x, y, size) {
    const N = 21;
    const cell = size / N;
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const drawFinder = (fx, fy) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(x + fx * cell, y + fy * cell, 7 * cell, 7 * cell);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + (fx + 1) * cell, y + (fy + 1) * cell, 5 * cell, 5 * cell);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(x + (fx + 2) * cell, y + (fy + 2) * cell, 3 * cell, 3 * cell);
    };
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 6, y - 6, size + 12, size + 12);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        h ^= (r * 31 + c * 17);
        h = Math.imul(h, 16777619);
        if ((h >>> 0) % 2 === 0) {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(x + c * cell, y + r * cell, Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
    drawFinder(0, 0);
    drawFinder(N - 7, 0);
    drawFinder(0, N - 7);
  }

  function renderWalletPassCanvas(canvas, activity, tripName, helpers) {
    const { fmtBR, money } = helpers;
    const W = 720, H = 420;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const colors = TYPE_COLORS[activity.type] || TYPE_COLORS.Outro;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 26);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, 78, W, 2);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 19px Outfit, sans-serif";
    ctx.fillText(`My Plan · ${tripName || "Carteira do Google"}`, 32, 48);

    ctx.font = "700 30px Outfit, sans-serif";
    ctx.fillText(String(activity.name || "Atividade").slice(0, 30), 32, 130);

    ctx.font = "500 17px Outfit, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const dt = activity.end && activity.end !== activity.start
      ? `${fmtBR(activity.start)} ➔ ${fmtBR(activity.end)}`
      : fmtBR(activity.start);
    const timePart = activity.startTime ? ` · ${String(activity.startTime).slice(0, 5)}` : "";
    ctx.fillText(`📅 ${dt}${timePart}   ·   ${activity.type}`, 32, 168);

    let lineY = 204;
    if (activity.from || activity.to) {
      ctx.fillText(`📍 ${activity.from || "?"} ➔ ${activity.to || "?"}`.slice(0, 44), 32, lineY);
      lineY += 30;
    }
    if (activity.airline) {
      ctx.fillText(`🛫 ${activity.airline}`.slice(0, 44), 32, lineY);
      lineY += 30;
    }
    if (activity.bookingRef) {
      ctx.fillText(`🔖 Localizador / Código: ${activity.bookingRef}`.slice(0, 44), 32, lineY);
      lineY += 30;
    }
    const tktArr = Array.isArray(activity.tickets) ? activity.tickets.filter(t => (Number(t.qty) || 0) > 0 && (Number(t.unitPrice) || 0) > 0) : [];
    const totalTkts = tktArr.reduce((s, t) => s + (Number(t.qty) || 0), 0);
    if (activity.extraCost > 0 || totalTkts > 0) {
      const valStr = activity.extraCost > 0 ? money(activity.extraCost) : "";
      const qtyStr = totalTkts > 0 ? ` (${totalTkts} un.)` : "";
      ctx.fillText(`💳 Valor: ${valStr}${qtyStr}`.trim(), 32, lineY);
      lineY += 30;
    }
    if (activity.notes) {
      ctx.font = "400 15px Outfit, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(String(activity.notes).slice(0, 54), 32, Math.max(lineY + 8, 372));
    }

    const qrValue = String(activity.qrPayload || "").trim() || `${activity.id || ""}|${activity.name}|${activity.start}|${activity.bookingRef || ""}`;
    drawQrMatrix(ctx, qrValue, W - 196, 128, 160);
    if (activity.qrPayload) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "700 12px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("QR DO BILHETE", W - 116, 314);
      ctx.textAlign = "left";
    }
  }

  /* ---------- RELATÓRIO E TABELA EXECUTIVA DO MODO PROFISSIONAL ---------- */
  function buildProFittedTableHtml(rows, state, totalsObj, helpers) {
    const { fmtShortBR, days, money } = helpers;
    const colMap = new Map((state.columns || []).map(c => [c.id, c.title]));
    let totalIn = 0, totalOut = 0;
    const bodyRows = rows.map((a, i) => {
      const val = Number(a.actualAmount) > 0 ? Number(a.actualAmount) : (Number(a.amount) || 0);
      const inc = a.finDirection === "income" ? val : 0;
      const exp = a.finDirection === "expense" ? val : 0;
      totalIn += inc;
      totalOut += exp;
      const who = [a.client, a.assignee].filter(Boolean).join(" / ");
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(colMap.get(a.columnId) || "-")}</td>
        <td>${esc(a.type)}</td>
        <td class="wrap"><b>${esc(a.name)}</b></td>
        <td class="wrap">${esc(who)}</td>
        <td>${fmtShortBR(a.start)}${a.end && a.end !== a.start ? "–" + fmtShortBR(a.end) : ""}</td>
        <td class="num">${days(a)}</td>
        <td class="num">${Number(a.progress) || 0}%</td>
        <td>${esc(a.priority || "Média")}</td>
        <td class="num" style="color:#059669">${inc > 0 ? money(inc) : ""}</td>
        <td class="num" style="color:#dc2626">${exp > 0 ? money(exp) : ""}</td>
        <td>${val > 0 ? esc(a.finStatus || "Previsto") : ""}</td>
        <td class="wrap">${esc(a.notes || "")}</td>
      </tr>`;
    }).join("");

    const net = totalIn - totalOut;
    return `<table class="a4-table">
      <thead><tr>
        <th style="width:2.5%">#</th>
        <th style="width:9%">Lista</th>
        <th style="width:8%">Tipo</th>
        <th style="width:16%">Cartão / Título</th>
        <th style="width:11%">Cliente / Resp.</th>
        <th style="width:8%">Datas</th>
        <th style="width:3%">D.</th>
        <th style="width:4%">Prog.</th>
        <th style="width:5.5%">Prior.</th>
        <th style="width:7.5%">Recebim.</th>
        <th style="width:7.5%">Despesa</th>
        <th style="width:6%">Status Fin.</th>
        <th style="width:12%">Notas</th>
      </tr></thead>
      <tbody>${bodyRows}</tbody>
      <tfoot><tr>
        <td colspan="9"><b>TOTAIS DO PROJETO (${rows.length} cartões)</b></td>
        <td class="num" style="color:#059669"><b>${money(totalIn)}</b></td>
        <td class="num" style="color:#dc2626"><b>${money(totalOut)}</b></td>
        <td colspan="2"><b>Saldo Líquido: ${money(net)}</b></td>
      </tr></tfoot>
    </table>`;
  }

  function printProTableLandscape(rows, state, totalsObj, helpers) {
    const tblHtml = buildProFittedTableHtml(rows, state, totalsObj, helpers);
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Tabela Executiva — ${esc(state.title)}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm 15mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; padding: 14px 20px; font-family: Outfit, Arial, sans-serif; color: #0f172a; background: #fff; }
        .rhead { background: linear-gradient(135deg, #0a1628, #1d4ed8); color: #fff; padding: 11px 16px; border-radius: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
        .rhead h1 { margin: 0; font-size: 14pt; color: #fff; }
        .sub { font-size: 8.5pt; color: #dbeafe; margin-top: 2px; }
        .a4-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7pt; }
        .a4-table thead { display: table-header-group; }
        .a4-table tr { break-inside: avoid; }
        .a4-table tbody tr:nth-child(even) { background: #f8fafc; }
        .a4-table th, .a4-table td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: left; vertical-align: top; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .a4-table td.wrap { white-space: normal; word-break: break-word; }
        .a4-table th { background: #dbeafe; font-weight: 700; color: #0f172a; }
        .a4-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .a4-table tfoot td { background: #eff6ff; font-weight: 700; }
      </style></head><body>
      <div class="rhead">
        <div>
          <h1>🧾 Planilha Executiva — ${esc(state.title || "My Plan")}</h1>
          <div class="sub">My Plan Profissional · Largura ajustada à página A4 horizontal (${rows.length} cartões)</div>
        </div>
        <div class="sub">${new Date().toLocaleDateString("pt-BR")}</div>
      </div>
      ${tblHtml}
      </body></html>`;
    return printHtmlInFrame(html, false);
  }

  async function printFullProReport(state, sorted, totalsObj, helpers) {
    const { parseD, fmtBR, days, money, getTypeInfo, WD } = helpers;
    const t = totalsObj || {};
    const colMap = new Map((state.columns || []).map(c => [c.id, c.title]));
    const doneChk = (state.checklist || []).filter(c => c.status === "Concluído").length;
    const minISO = sorted.length ? fmtBR(sorted[0].start) : fmtBR(new Date().toISOString().slice(0, 10));
    const maxRaw = sorted.length ? sorted.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, sorted[0].start) : "";
    const maxISO = maxRaw ? fmtBR(maxRaw) : minISO;

    const kpisHtml = [
      ["Recebimentos Totais", money(t.totalIncome || 0), `Liquidado: ${money(t.receivedIncome || 0)}`, "#10b981"],
      ["Despesas Totais", money(t.totalExpense || 0), `Liquidado: ${money(t.paidExpense || 0)}`, "#ef4444"],
      ["Resultado Líquido", money(t.netPlanned || 0), `Realizado: ${money(t.netRealized || 0)}`, "#1d4ed8"],
      ["Execução dos Cartões", `${t.doneCards || 0}/${t.totalCards || sorted.length}`, `Progresso médio ${Math.round(t.avgProgress || 0)}%`, "#0284c7"],
      ["Checklist Executivo", `${doneChk}/${(state.checklist || []).length}`, `${t.overdueCount || 0} atrasado(s)`, "#d97706"]
    ].map(([l, v, s, col]) => `<div class="rkpi" style="--rc:${col}"><small>${l}</small><b>${v}</b><span>${s}</span></div>`).join("");

    const kanbanHtml = `<div class="rk-board">${(state.columns || []).map(col => {
      const cards = sorted.filter(a => a.columnId === col.id);
      return `<div class="rk-col">
        <div class="rk-col-head" style="border-top-color:${col.color || "#2563eb"}"><span>${esc(col.title)}</span><b>${cards.length}</b></div>
        <div class="rk-col-body">${cards.map(c => {
          const fin = formatProFinBadge(c, money);
          return `<div class="rk-card">
            <b>${esc(c.name)}</b>
            <small>${esc(c.type)} · ${fmtBR(c.start)}${c.client ? " · " + esc(c.client) : ""}${fin ? " · " + esc(fin) : ""}</small>
          </div>`;
        }).join("") || `<div class="rk-empty">Sem cartões</div>`}</div>
      </div>`;
    }).join("")}</div>`;

    const ganttHtml = sorted.length
      ? buildGanttHtmlBlock(sorted, sorted[0].start, maxRaw || sorted[0].start, helpers, "Cartão / Entrega", { isPro: true, colMap })
      : "<p>Sem cartões no cronograma.</p>";

    const timelineHtml = sorted.map(a => {
      const info = getTypeInfo(a.type);
      const colors = getTypeColorPair(a.type, true);
      const d = parseD(a.start);
      const fin = formatProFinBadge(a, money);
      const meta = [`${days(a)}d`, colMap.get(a.columnId) || "", a.client || "", a.progress > 0 ? `${a.progress}%` : "", fin, a.notes || ""].filter(Boolean).join(" · ");
      return `<div class="rtl-item" style="border-left-color:${colors[0]}">
        <div class="rtl-date">${fmtBR(a.start)}<small>${WD[d.getDay()]}</small></div>
        <div class="rtl-body"><b>${info.icon} <span class="rbadge" style="background:${colors[0]}18;color:${colors[0]}">${esc(a.type)}</span> ${esc(a.name)}</b><span>${esc(meta)}</span></div>
      </div>`;
    }).join("") || "<p>Sem registros.</p>";

    const checklistHtml = `<table class="a4-table">
      <thead><tr><th style="width:5%">#</th><th style="width:16%">Categoria</th><th style="width:36%">Item</th><th style="width:11%">Prioridade</th><th style="width:12%">Status</th><th style="width:20%">Notas</th></tr></thead>
      <tbody>${(state.checklist || []).map((c, i) => {
        const stCls = c.status === "Concluído" ? "ok" : (c.status === "Em andamento" ? "mid" : "pend");
        return `<tr><td>${i + 1}</td><td>${esc(c.cat)}</td><td class="wrap"><b>${esc(c.item)}</b></td><td>${esc(c.prio)}</td><td><span class="rpill ${stCls}">${esc(c.status)}</span></td><td class="wrap">${esc(c.notes || "")}</td></tr>`;
      }).join("")}</tbody></table>`;

    const tableHtml = buildProFittedTableHtml(sorted, state, t, helpers);
    const p = state.params || {};
    const paramsHtml = `<div class="rparams-grid">
      <div class="rbox"><h3>💼 Metas &amp; Parâmetros do Projeto</h3>
        <div><b>Cliente / Carteira Padrão:</b> ${esc(p.clientDefault || "—")}</div>
        <div><b>Meta de Faturamento:</b> ${money(p.revenueTarget || 0)} · <b>Orçamento de Custos:</b> ${money(p.costBudget || 0)}</div>
        <div><b>Alíquota Impostos:</b> ${p.taxRatePct || 0}% · <b>Valor Hora:</b> ${money(p.hourlyRate || 0)}/h</div>
        <div><b>Lembrete Agenda:</b> ${esc(p.calendarReminderTime || "09:00")}</div>
      </div>
      <div class="rbox"><h3>📊 Resumo de Fluxo de Caixa</h3>
        <div><b>Recebimentos Previstos:</b> ${money(t.totalIncome || 0)} (Liquidado: ${money(t.receivedIncome || 0)})</div>
        <div><b>Despesas Previstas:</b> ${money(t.totalExpense || 0)} (Pago: ${money(t.paidExpense || 0)})</div>
        <div><b>Impostos Estimados:</b> ${money(t.taxAmount || 0)}</div>
        <div><b>Resultado Líquido Projetado:</b> ${money((t.netPlanned || 0) - (t.taxAmount || 0))}</div>
      </div>
    </div>`;

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Executivo — ${esc(state.title)}</title>
      <style>
        @page { size: A4 landscape; margin: 13mm 15mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; padding: 14px 22px; font-family: Outfit, Arial, sans-serif; color: #0f172a; background: #fff; font-size: 9pt; line-height: 1.4; }
        .rhead { display: flex; justify-content: space-between; align-items: center; gap: 16px; background: linear-gradient(135deg, #0a1628, #1d4ed8); color: #fff; padding: 14px 18px; border-radius: 12px; margin-bottom: 16px; }
        .rhead h1 { margin: 0; font-size: 16pt; color: #fff; }
        .rhead-sub { font-size: 8.5pt; color: #dbeafe; margin-top: 2px; }
        .rhead-meta { text-align: right; font-size: 8.2pt; color: #bfdbfe; white-space: nowrap; }
        .rsec { margin-bottom: 18px; }
        .rsec-break { break-before: page; page-break-before: always; padding-top: 4px; }
        .rsec h2 { margin: 0 0 10px; font-size: 11.5pt; color: #0f172a; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; }
        .rsec-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 7px; font-size: 9pt; font-weight: 700; background: #1d4ed8; color: #fff; }
        .rkpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 14px; }
        .rkpi { border: 1px solid #cbd5e1; border-top: 3px solid var(--rc, #1d4ed8); border-radius: 10px; padding: 10px 11px; background: #f8fafc; }
        .rkpi small { display: block; font-size: 6.8pt; text-transform: uppercase; color: #64748b; font-weight: 700; }
        .rkpi b { display: block; font-size: 12.5pt; margin: 3px 0; color: #0f172a; }
        .rkpi span { font-size: 7.4pt; color: #475569; }
        .rk-board { display: grid; grid-template-columns: repeat(${Math.max(1, (state.columns || []).length)}, minmax(0, 1fr)); gap: 8px; }
        .rk-col { border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; overflow: hidden; }
        .rk-col-head { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: #eff6ff; border-top: 3px solid #2563eb; border-bottom: 1px solid #cbd5e1; font-size: 7.8pt; font-weight: 700; }
        .rk-col-body { padding: 6px; display: grid; gap: 5px; }
        .rk-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 6px; font-size: 7.2pt; }
        .rk-card b { display: block; color: #0f172a; }
        .rk-card small { color: #64748b; font-size: 6.5pt; }
        .rk-empty { color: #94a3b8; font-size: 7pt; text-align: center; padding: 8px 0; }
        ${GANTT_PRINT_EXTRA_CSS}
        .pg-month { background: #dbeafe; color: #1e3a8a; }
        .pg-month.m-odd { background: #bfdbfe; }
        .rtl-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .rtl-item { display: flex; gap: 10px; border: 1px solid #cbd5e1; border-left: 4px solid #1d4ed8; border-radius: 8px; padding: 7px 10px; background: #fcfcfd; break-inside: avoid; }
        .rtl-date { font-weight: 700; font-size: 7.8pt; color: #1e3a8a; min-width: 64px; }
        .rtl-date small { display: block; font-weight: 500; color: #64748b; }
        .rtl-body b { display: block; font-size: 8.2pt; }
        .rtl-body span { font-size: 7.4pt; color: #475569; }
        .rbadge { font-size: 6.8pt; padding: 1px 6px; border-radius: 99px; font-weight: 700; vertical-align: middle; }
        .a4-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6.9pt; }
        .a4-table thead { display: table-header-group; }
        .a4-table tr { break-inside: avoid; }
        .a4-table tbody tr:nth-child(even) { background: #f8fafc; }
        .a4-table th, .a4-table td { border: 1px solid #cbd5e1; padding: 4px 4px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .a4-table td.wrap { white-space: normal; word-break: break-word; }
        .a4-table th { background: #dbeafe; font-weight: 700; color: #0f172a; }
        .a4-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .a4-table tfoot td { background: #eff6ff; font-weight: 700; }
        .rpill { padding: 2px 7px; border-radius: 99px; font-size: 6.8pt; font-weight: 700; }
        .rpill.ok { background: #dcfce7; color: #166534; }
        .rpill.mid { background: #fef3c7; color: #92400e; }
        .rpill.pend { background: #f1f5f9; color: #475569; }
        .rparams-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .rbox { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 14px; background: #f8fafc; display: grid; gap: 5px; font-size: 8.4pt; }
        .rbox h3 { margin: 0 0 4px; font-size: 9.8pt; color: #1e293b; }
      </style></head><body>
      <header class="rhead">
        <div>
          <h1>💼 Relatório Executivo — ${esc(state.title || "My Plan")}</h1>
          <div class="rhead-sub">Período: ${minISO} a ${maxISO} · ${sorted.length} cartões · My Plan Profissional</div>
        </div>
        <div class="rhead-meta">Gerado em ${new Date().toLocaleDateString("pt-BR")}<br>My Plan Executivo</div>
      </header>
      <section class="rsec">
        <h2><span class="rsec-num">1</span> Dashboard Executivo &amp; Fluxo de Caixa</h2>
        <div class="rkpis">${kpisHtml}</div>
      </section>
      <section class="rsec">
        <h2><span class="rsec-num">2</span> Quadro Kanban por Listas</h2>
        ${kanbanHtml}
      </section>
      <section class="rsec rsec-break">
        <h2><span class="rsec-num">3</span> Cronograma Gráfico de Gantt (Horizontal)</h2>
        ${ganttHtml}
      </section>
      <section class="rsec rsec-break">
        <h2><span class="rsec-num">4</span> Linha do Tempo Executiva</h2>
        <div class="rtl-list">${timelineHtml}</div>
      </section>
      <section class="rsec rsec-break">
        <h2><span class="rsec-num">5</span> Checklist Executivo (${doneChk}/${(state.checklist || []).length})</h2>
        ${checklistHtml}
      </section>
      <section class="rsec rsec-break">
        <h2><span class="rsec-num">6</span> Planilha Completa (A4 Horizontal)</h2>
        ${tableHtml}
      </section>
      <section class="rsec rsec-break">
        <h2><span class="rsec-num">7</span> Parâmetros &amp; Metas do Projeto</h2>
        ${paramsHtml}
      </section>
      </body></html>`;
    return printHtmlInFrame(html, false);
  }

  window.FeriasReport = {
    exportGanttImage,
    exportGanttPdf,
    printTimelinePdf,
    printTableLandscape,
    printProTableLandscape,
    printFullTripReport,
    printFullProReport,
    renderWalletPassCanvas
  };
})();
