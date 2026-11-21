/* ===== Relatórios PDF Horizontais, Gantt PNG/PDF, Mapa da Rota & Passe Wallet — Férias Pro ===== */
(function () {
  const TYPE_COLORS = {
    Viagem: ["#0284c7", "#4f46e5"],
    Voo: ["#0ea5e9", "#0369a1"],
    Hospedagem: ["#10b981", "#0f766e"],
    Ingresso: ["#8b5cf6", "#db2777"],
    Evento: ["#d97706", "#e11d48"],
    Passeio: ["#ec4899", "#9333ea"],
    Restaurante: ["#f97316", "#dc2626"],
    "Período": ["#7c3aed", "#4338ca"],
    Outro: ["#64748b", "#475569"]
  };

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
  function filterActivitiesByRange(activities, fromISO, toISO, helpers) {
    const { parseD, DAY } = helpers;
    return activities.filter(a => {
      const s = a.start;
      const e = a.end || a.start;
      return (!toISO || s <= toISO) && (!fromISO || e >= fromISO);
    });
  }

  function buildGanttHtmlBlock(activities, fromISO, toISO, helpers, compactTitle) {
    const { parseD, fmtISO, fmtShortBR, days, money, num, hmHuman, calc, getTypeInfo, WD, DAY } = helpers;
    const rows = filterActivitiesByRange(activities, fromISO, toISO, helpers);
    if (!rows.length) return `<p style="color:#64748b">Nenhuma atividade nas datas selecionadas.</p>`;

    const minTs = parseD(fromISO).getTime();
    const maxTs = parseD(toISO).getTime();
    const nDays = Math.max(1, Math.min(62, Math.round((maxTs - minTs) / DAY) + 1));
    const dates = [];
    for (let i = 0; i < nDays; i++) {
      const d = new Date(minTs + i * DAY + 3600e3);
      dates.push(d);
    }

    const leftW = 195;
    const colsCss = `${leftW}px repeat(${nDays}, minmax(0, 1fr))`;

    const monthSpans = [];
    dates.forEach((d, idx) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const mNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const last = monthSpans[monthSpans.length - 1];
      if (last && last.key === key) last.span++;
      else monthSpans.push({ key, label: `${mNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, col: idx + 2, span: 1 });
    });

    let cells = `<div class="pg-corner">${esc(compactTitle || "Atividade")}</div>`;
    monthSpans.forEach(ms => {
      cells += `<div class="pg-month" style="grid-column:${ms.col} / span ${ms.span};grid-row:1">${ms.label}</div>`;
    });
    dates.forEach((d, i) => {
      const we = d.getDay() === 0 || d.getDay() === 6;
      cells += `<div class="pg-day ${we ? "we" : ""}" style="grid-column:${i + 2};grid-row:2"><span>${WD[d.getDay()][0]}</span><b>${d.getDate()}</b></div>`;
    });

    rows.forEach((a, rIdx) => {
      const row = rIdx + 3;
      const info = getTypeInfo(a.type);
      const colors = TYPE_COLORS[a.type] || TYPE_COLORS.Outro;
      const c = calc(a);
      const costVal = c.total + c.extra;
      const meta = a.type === "Viagem"
        ? `${a.from || "?"}➔${a.to || "?"} · ${num(a.km)}km · ${money(costVal)}`
        : `${fmtShortBR(a.start)}${costVal > 0 ? ` · ${money(costVal)}` : ""}`;

      cells += `<div class="pg-name" style="grid-column:1;grid-row:${row}">
        <span class="pg-dot" style="background:${colors[0]}">${info.icon}</span>
        <div class="pg-ntxt"><b>${esc(a.name)}</b><small>${esc(meta)}</small></div>
      </div>`;

      const startTs = Math.max(minTs, parseD(a.start).getTime());
      const endTs = Math.min(maxTs, parseD(a.end || a.start).getTime());
      const startIdx = Math.max(0, Math.round((startTs - minTs) / DAY));
      const span = Math.max(1, Math.round((endTs - startTs) / DAY) + 1);

      for (let i = 0; i < nDays; i++) {
        const d = dates[i];
        const we = d.getDay() === 0 || d.getDay() === 6;
        cells += `<div class="pg-cell ${we ? "we" : ""}" style="grid-column:${i + 2};grid-row:${row}"></div>`;
      }

      const barLabel = span >= 3 ? `${esc(a.name)} (${days(a)}d)` : esc(a.name);
      cells += `<div class="pg-bar-wrap" style="grid-column:${startIdx + 2} / span ${span};grid-row:${row}">
        <div class="pg-bar" style="background:linear-gradient(135deg,${colors[0]},${colors[1]})">${info.icon} ${barLabel}</div>
      </div>`;
    });

    return `<div class="pg-grid" style="grid-template-columns:${colsCss}">${cells}</div>`;
  }

  function exportGanttImage(state, activities, fromISO, toISO, helpers) {
    const { parseD, fmtBR, money, num, calc, getTypeInfo, WD, DAY } = helpers;
    const rows = filterActivitiesByRange(activities, fromISO, toISO, helpers);
    if (!rows.length) return false;

    const minTs = parseD(fromISO).getTime();
    const maxTs = parseD(toISO).getTime();
    const nDays = Math.max(1, Math.min(62, Math.round((maxTs - minTs) / DAY) + 1));

    const W = 1920;
    const padX = 36;
    const headerH = 92;
    const gridHeadH = 54;
    const rowH = Math.max(38, Math.min(54, Math.floor(820 / Math.max(1, rows.length))));
    const H = Math.max(820, headerH + gridHeadH + rows.length * rowH + 44);
    const leftW = 360;
    const dayW = (W - padX * 2 - leftW) / nDays;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 28px Outfit, system-ui, sans-serif";
    ctx.fillText(`Férias Pro — ${state.title || "Cronograma Gantt"}`, padX, 46);
    ctx.fillStyle = "#475569";
    ctx.font = "500 18px Outfit, system-ui, sans-serif";
    ctx.fillText(`Período selecionado: ${fmtBR(fromISO)} a ${fmtBR(toISO)} · ${rows.length} atividade(s)`, padX, 76);

    const topY = headerH;
    // Grid header background
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(padX, topY, W - padX * 2, gridHeadH);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 16px Outfit, system-ui, sans-serif";
    ctx.fillText("Atividade / Tipo", padX + 14, topY + 34);

    for (let i = 0; i < nDays; i++) {
      const d = new Date(minTs + i * DAY + 3600e3);
      const x = padX + leftW + i * dayW;
      const we = d.getDay() === 0 || d.getDay() === 6;
      if (we) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.05)";
        ctx.fillRect(x, topY, dayW, gridHeadH + rows.length * rowH);
      }
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, topY + gridHeadH + rows.length * rowH);
      ctx.stroke();

      ctx.fillStyle = "#475569";
      ctx.font = "600 12px Outfit, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(WD[d.getDay()][0], x + dayW / 2, topY + 20);
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 16px Outfit, system-ui, sans-serif";
      ctx.fillText(String(d.getDate()), x + dayW / 2, topY + 42);
      ctx.textAlign = "left";
    }

    rows.forEach((a, idx) => {
      const y = topY + gridHeadH + idx * rowH;
      if (idx % 2 === 1) {
        ctx.fillStyle = "rgba(241, 245, 249, 0.7)";
        ctx.fillRect(padX, y, W - padX * 2, rowH);
      }
      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(padX, y + rowH);
      ctx.lineTo(W - padX, y + rowH);
      ctx.stroke();

      const info = getTypeInfo(a.type);
      const colors = TYPE_COLORS[a.type] || TYPE_COLORS.Outro;
      const c = calc(a);
      const costVal = c.total + c.extra;

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
      ctx.fillText(String(a.name).slice(0, 32), padX + 44, y + rowH / 2 - 2);
      ctx.fillStyle = "#64748b";
      ctx.font = "500 12px Outfit, sans-serif";
      const sub = a.type === "Viagem"
        ? `${a.from || "?"} -> ${a.to || "?"} (${num(a.km)} km)`
        : `${a.type}${costVal > 0 ? " · " + money(costVal) : ""}`;
      ctx.fillText(sub.slice(0, 40), padX + 44, y + rowH / 2 + 15);

      const startTs = Math.max(minTs, parseD(a.start).getTime());
      const endTs = Math.min(maxTs, parseD(a.end || a.start).getTime());
      const sIdx = Math.max(0, Math.round((startTs - minTs) / DAY));
      const span = Math.max(1, Math.round((endTs - startTs) / DAY) + 1);
      const bx = padX + leftW + sIdx * dayW + 3;
      const bw = Math.max(24, span * dayW - 6);
      const by = y + 8;
      const bh = rowH - 16;

      const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1]);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();

      const lbl = `${a.name}${costVal > 0 ? " · " + money(costVal) : ""}`;
      const labelFitsInside = bw > 140;
      ctx.font = "700 13px Outfit, sans-serif";
      if (labelFitsInside) {
        ctx.fillStyle = "#ffffff";
        ctx.fillText(lbl.slice(0, Math.floor(bw / 8)), bx + 10, y + rowH / 2 + 5);
      } else {
        const tx = bx + bw + 8;
        ctx.fillStyle = "#0f172a";
        if (tx + 120 < W - padX) {
          ctx.fillText(lbl.slice(0, 34), tx, y + rowH / 2 + 5);
        }
      }
    });

    canvas.toBlob(blob => {
      if (!blob) return;
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = `${(state.title || "ferias_pro").replace(/[^\w\-]+/g, "_")}_gantt_${fromISO}_${toISO}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1500);
    }, "image/png");
    return true;
  }

  function exportGanttPdf(state, activities, fromISO, toISO, helpers) {
    const { fmtBR } = helpers;
    const gridHtml = buildGanttHtmlBlock(activities, fromISO, toISO, helpers, "Atividade");
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Gantt — ${esc(state.title)}</title>
      <style>
        @page { size: A4 landscape; margin: 7mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Outfit, Arial, sans-serif; color: #0f172a; background: #fff; }
        h1 { margin: 0 0 2px; font-size: 15pt; }
        .sub { font-size: 9pt; color: #475569; margin-bottom: 8px; }
        .sheet { width: 100%; overflow: hidden; page-break-inside: avoid; }
        .pg-grid { display: grid; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; font-size: 7.5pt; width: 100%; }
        .pg-corner { grid-row: 1 / span 2; grid-column: 1; background: #f1f5f9; font-weight: 700; display: flex; align-items: center; padding: 4px 8px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
        .pg-month { background: #e2e8f0; font-weight: 700; font-size: 7pt; text-transform: uppercase; padding: 2px 5px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
        .pg-day { text-align: center; padding: 2px 0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #cbd5e1; font-size: 6.5pt; color: #475569; }
        .pg-day b { display: block; font-size: 8pt; color: #0f172a; }
        .pg-day.we, .pg-cell.we { background: #f8fafc; }
        .pg-name { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #e2e8f0; background: #fff; min-width: 0; }
        .pg-dot { width: 16px; height: 16px; border-radius: 4px; color: #fff; font-size: 7pt; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pg-ntxt { min-width: 0; overflow: hidden; }
        .pg-ntxt b { display: block; font-size: 7.4pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pg-ntxt small { display: block; font-size: 6.4pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pg-cell { border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; min-height: 22px; }
        .pg-bar-wrap { display: flex; align-items: center; padding: 2px; z-index: 2; pointer-events: none; overflow: hidden; }
        .pg-bar { width: 100%; border-radius: 5px; color: #fff; font-weight: 700; font-size: 7pt; padding: 2px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      </style></head><body>
      <div class="sheet">
        <h1>📅 Cronograma Gantt — ${esc(state.title || "Férias Pro")}</h1>
        <div class="sub">Período: ${fmtBR(fromISO)} a ${fmtBR(toISO)} · Impressão ajustada em 1 página A4 horizontal</div>
        ${gridHtml}
      </div></body></html>`;
    return printHtmlInFrame(html, false);
  }

  /* ---------- TABELA A4 HORIZONTAL (FIT WIDTH, PAGINATE ROWS DOWNWARDS) ---------- */
  function buildFittedTableHtml(rows, totalsObj, helpers) {
    const { fmtShortBR, days, hm, num, money, calc, WD, parseD } = helpers;
    const t = totalsObj;
    const bodyRows = rows.map((a, i) => {
      const c = calc(a);
      const v = a.type === "Viagem";
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(a.type)}</td>
        <td>${fmtShortBR(a.start)}${a.end && a.end !== a.start ? "–" + fmtShortBR(a.end) : ""}</td>
        <td>${WD[parseD(a.start).getDay()]}</td>
        <td class="wrap"><b>${esc(a.name)}</b></td>
        <td class="wrap">${v || a.type === "Voo" ? `${esc(a.from || "")} ➔ ${esc(a.to || "")}` : ""}</td>
        <td class="num">${days(a)}</td>
        <td class="num">${v ? num(a.km) : ""}</td>
        <td class="num">${v ? hm(a.drive) : ""}</td>
        <td class="num">${v ? `${a.stops || 0} (${hm(a.stopTime)})` : ""}</td>
        <td class="num">${v ? num(c.ev) : ""}</td>
        <td class="num">${v ? num(c.liters, 1) : ""}</td>
        <td class="num">${v ? money(c.fuel + c.charge) : ""}</td>
        <td class="num">${v ? money(a.toll) : ""}</td>
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
        @page { size: A4 landscape; margin: 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Outfit, Arial, sans-serif; color: #0f172a; background: #fff; }
        h1 { margin: 0 0 2px; font-size: 14pt; }
        .sub { font-size: 8.5pt; color: #475569; margin-bottom: 8px; }
        .a4-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6.8pt; }
        .a4-table thead { display: table-header-group; }
        .a4-table tfoot { display: table-row-group; }
        .a4-table tr { break-inside: avoid; page-break-inside: avoid; }
        .a4-table th, .a4-table td { border: 1px solid #cbd5e1; padding: 4px 3px; text-align: left; vertical-align: top; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .a4-table td.wrap { white-space: normal; word-break: break-word; }
        .a4-table th { background: #e2e8f0; font-weight: 700; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .a4-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .a4-table tfoot td { background: #f1f5f9; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      </style></head><body>
      <h1>🧾 Planilha Completa — ${esc(state.title || "Férias Pro")}</h1>
      <div class="sub">Largura ajustada à página A4 horizontal (${rows.length} registros)</div>
      ${tblHtml}
      </body></html>`;
    return printHtmlInFrame(html, false);
  }

  /* ---------- MAPA DA ROTA PARA O RELATÓRIO ---------- */
  function buildFallbackRouteMapDataUrl(trips, stateTitle) {
    const W = 1200, H = 420;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#eff6ff");
    grad.addColorStop(1, "#ecfeff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle map grid
    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const stops = [];
    trips.forEach(a => {
      if (a.from && stops[stops.length - 1] !== a.from) stops.push(a.from);
      if (a.to && stops[stops.length - 1] !== a.to) stops.push(a.to);
    });

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 22px Outfit, sans-serif";
    ctx.fillText(`🗺️ Mapa Esquemático da Rota — ${stateTitle || "Férias Pro"}`, 32, 42);

    if (stops.length < 2) {
      ctx.fillStyle = "#475569";
      ctx.font = "500 18px Outfit, sans-serif";
      ctx.fillText("Nenhuma rota rodoviária com origem e destino cadastrada.", 32, 210);
      return canvas.toDataURL("image/png");
    }

    const pts = stops.map((name, i) => {
      const t = i / (stops.length - 1);
      const x = 90 + t * (W - 180);
      const y = 215 + Math.sin(t * Math.PI * 2.2) * 75;
      return { x, y, name };
    });

    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], cur = pts[i];
      const mx = (prev.x + cur.x) / 2;
      ctx.bezierCurveTo(mx, prev.y, mx, cur.y, cur.x, cur.y);
    }
    ctx.stroke();

    pts.forEach((p, idx) => {
      ctx.fillStyle = idx === 0 ? "#10b981" : (idx === pts.length - 1 ? "#ef4444" : "#4f46e5");
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 12px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(idx + 1), p.x, p.y + 4);

      const lblY = idx % 2 === 0 ? p.y - 22 : p.y + 30;
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 14px Outfit, sans-serif";
      ctx.fillText(p.name.slice(0, 22), p.x, lblY);
      ctx.textAlign = "left";
    });

    return canvas.toDataURL("image/png");
  }

  function buildStaticMapImageUrl(trips, gmapsKey) {
    const pts = [];
    trips.forEach(a => {
      if (a.from && pts[pts.length - 1] !== a.from) pts.push(a.from);
      if (a.to && pts[pts.length - 1] !== a.to) pts.push(a.to);
    });
    if (!gmapsKey || pts.length < 2) return "";
    const markers = pts.slice(0, 10).map((p, i) => `markers=color:${i === 0 ? "green" : (i === pts.length - 1 ? "red" : "blue")}|label:${i + 1}|${encodeURIComponent(p + ", Brasil")}`).join("&");
    const path = "path=color:0x0284c7ff|weight:4|" + pts.slice(0, 10).map(p => encodeURIComponent(p + ", Brasil")).join("|");
    return `https://maps.googleapis.com/maps/api/staticmap?size=1100x400&scale=2&language=pt-BR&region=BR&${markers}&${path}&key=${encodeURIComponent(gmapsKey)}`;
  }

  /* ---------- RELATÓRIO COMPLETO LIMPO (ORDEM SOLICITADA) ----------
     1. Dashboards (+ Composição de Custos)
     2. Imagem do Maps da Rota
     3. Gráfico de Gantt (Horizontal)
     4. Linha do Tempo
     5. Checklist
     6. Planilha / Tabela (A4 Horizontal)
     7. Parâmetros
  */
  function printFullTripReport(state, sorted, totalsObj, helpers, gmapsKey) {
    const { parseD, fmtBR, fmtShortBR, days, money, num, hmHuman, calc, getTypeInfo, WD } = helpers;
    const t = totalsObj;
    const avg = t.liters ? t.km / t.liters : 0;
    const perPerson = t.grandTotal / Math.max(1, +state.params?.travelers || 1);
    const doneChk = (state.checklist || []).filter(c => c.status === "Concluído").length;

    const minISO = sorted.length ? sorted[0].start : fmtBR(new Date().toISOString().slice(0, 10));
    const maxISO = sorted.length ? sorted.reduce((m, a) => (a.end || a.start) > m ? (a.end || a.start) : m, sorted[0].start) : minISO;

    const kpisHtml = [
      ["Total Geral das Férias", money(t.grandTotal), `${state.params?.travelers || 1} viajantes · ${money(perPerson)}/pessoa`],
      ["Distância de Carro", `${num(t.km)} km`, `${t.trips} trechos rodoviários`],
      ["Tempo na Estrada", hmHuman(t.drive + t.stopTime), `Direção ${hmHuman(t.drive)} + ${t.stops} par.`],
      ["Combustível + EV + Ped.", money(t.total), `${num(t.liters, 1)} L (${avg ? num(avg, 1) + " km/L" : "BEV"}) · Ped. ${money(t.toll)}`],
      ["Checklist Preparação", `${doneChk}/${state.checklist.length}`, `${state.checklist.length ? Math.round(doneChk / state.checklist.length * 100) : 0}% concluído`]
    ].map(([l, v, s]) => `<div class="rkpi"><small>${l}</small><b>${v}</b><span>${s}</span></div>`).join("");

    const compRows = (t.costBreakdown || []).filter(b => b.value > 0);
    const denom = t.grandTotal || t.total || 1;
    const costHtml = compRows.map(b => `
      <div class="rbar">
        <div class="rbar-top"><span>${esc(b.label)}</span><b>${money(b.value)} (${num(b.value / denom * 100)}%)</b></div>
        <div class="rbar-track"><div style="width:${Math.min(100, b.value / denom * 100)}%;background:${b.gradient || "#4f46e5"}"></div></div>
      </div>`).join("") || `<p class="muted">Sem custos registrados.</p>`;

    const trips = sorted.filter(a => a.type === "Viagem" && (a.from || a.to));
    const fallbackMapImg = buildFallbackRouteMapDataUrl(trips, state.title);
    const staticMapUrl = buildStaticMapImageUrl(trips, gmapsKey);

    const ganttHtml = sorted.length
      ? buildGanttHtmlBlock(sorted, sorted[0].start, maxISO, helpers, "Atividade")
      : "<p>Sem atividades.</p>";

    const timelineHtml = sorted.map(a => {
      const info = getTypeInfo(a.type);
      const d = parseD(a.start);
      const c = calc(a);
      const val = c.total + c.extra;
      const meta = a.type === "Viagem"
        ? `${a.from || "?"} ➔ ${a.to || "?"} · ${num(a.km)} km · ${hmHuman(a.drive)} · Ped. ${money(a.toll)} · ${money(val)}`
        : `${days(a)} dia(s)${a.from || a.to ? ` · ${a.from || "?"} ➔ ${a.to || "?"}` : ""}${val > 0 ? ` · ${money(val)}` : ""}${a.notes ? ` · ${a.notes}` : ""}`;
      return `<div class="rtl-item">
        <div class="rtl-date">${fmtBR(a.start)}<small>${WD[d.getDay()]}</small></div>
        <div class="rtl-body"><b>${info.icon} [${esc(a.type)}] ${esc(a.name)}</b><span>${esc(meta)}</span></div>
      </div>`;
    }).join("") || "<p>Sem atividades.</p>";

    const checklistHtml = `<table class="a4-table">
      <thead><tr><th style="width:5%">#</th><th style="width:14%">Categoria</th><th style="width:36%">Item</th><th style="width:11%">Prioridade</th><th style="width:12%">Status</th><th style="width:22%">Notas</th></tr></thead>
      <tbody>${(state.checklist || []).map((c, i) => `
        <tr><td>${i + 1}</td><td>${esc(c.cat)}</td><td class="wrap"><b>${esc(c.item)}</b></td><td>${esc(c.prio)}</td><td>${esc(c.status)}</td><td class="wrap">${esc(c.notes || "")}</td></tr>`).join("")}
      </tbody></table>`;

    const tableHtml = buildFittedTableHtml(sorted, t, helpers);

    const paramsHtml = `<div class="rparams-grid">
      <div class="rbox"><h3>🚗 Veículo &amp; Motorização</h3>
        <div><b>Modelo:</b> ${esc(state.vehicle.name)} (${esc(state.vehicle.powertrain)})</div>
        <div><b>Autonomia EV:</b> ${state.vehicle.evRange} km · <b>Consumo HEV:</b> ${state.vehicle.hevKmL} km/L</div>
        <div><b>Tanque:</b> ${state.vehicle.tank} L · <b>Bateria:</b> ${state.vehicle.battery} kWh (${state.vehicle.kwhPerCharge} kWh/recarga)</div>
        <div><b>Tarifas:</b> Gasolina ${money(state.vehicle.fuelPrice)}/L · Energia ${money(state.vehicle.kwhPrice)}/kWh</div>
      </div>
      <div class="rbox"><h3>💰 Regras &amp; Cenários</h3>
        <div><b>Viajantes:</b> ${state.params.travelers} · <b>Hospedagem base:</b> ${money(state.params.lodgingPerNight)}/noite (${t.lodgingNights} noites)</div>
        <div><b>Alimentação/pessoa:</b> ${money(state.params.dailyFoodPerPerson)}/dia · <b>Reserva:</b> ${state.params.contingencyPct || 0}%</div>
        <div><b>Paradas auto:</b> 1 a cada ${state.params.stopIntervalHours}h (${state.params.stopDurationMin} min) · <b>Lembrete:</b> ${state.params.calendarReminderTime || "09:00"}</div>
        <div><b>Cenários:</b> ${(state.scenarios || []).map(sc => `${esc(sc.name)} (${sc.kmL || state.vehicle.hevKmL} km/L)`).join(" · ")}</div>
      </div>
    </div>`;

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório — ${esc(state.title)}</title>
      <style>
        @page { size: A4 landscape; margin: 9mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; font-family: Outfit, Arial, sans-serif; color: #0f172a; background: #fff; font-size: 9pt; }
        .rhead { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #4f46e5; padding-bottom: 6px; margin-bottom: 12px; }
        .rhead h1 { margin: 0; font-size: 16pt; color: #0f172a; }
        .rsec { margin-bottom: 16px; }
        .rsec-break { break-before: page; page-break-before: always; }
        .rsec h2 { margin: 0 0 8px; font-size: 12pt; color: #3730a3; border-left: 4px solid #4f46e5; padding-left: 8px; }
        .rkpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 12px; }
        .rkpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; background: #f8fafc; }
        .rkpi small { display: block; font-size: 7pt; text-transform: uppercase; color: #64748b; font-weight: 700; }
        .rkpi b { display: block; font-size: 12pt; margin: 2px 0; color: #0f172a; }
        .rkpi span { font-size: 7.3pt; color: #475569; }
        .rbar { margin-bottom: 6px; }
        .rbar-top { display: flex; justify-content: space-between; font-size: 8.2pt; margin-bottom: 2px; }
        .rbar-track { height: 7px; border-radius: 99px; background: #e2e8f0; overflow: hidden; }
        .rbar-track > div { height: 100%; border-radius: 99px; }
        .map-img-box { border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; text-align: center; background: #f8fafc; }
        .map-img-box img { width: 100%; max-height: 280px; object-fit: contain; display: block; margin: auto; }
        /* Gantt */
        .pg-grid { display: grid; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; font-size: 7pt; width: 100%; }
        .pg-corner { grid-row: 1 / span 2; grid-column: 1; background: #f1f5f9; font-weight: 700; display: flex; align-items: center; padding: 4px 8px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
        .pg-month { background: #e2e8f0; font-weight: 700; font-size: 6.8pt; text-transform: uppercase; padding: 2px 5px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
        .pg-day { text-align: center; padding: 2px 0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #cbd5e1; font-size: 6pt; color: #475569; }
        .pg-day b { display: block; font-size: 7.5pt; color: #0f172a; }
        .pg-day.we, .pg-cell.we { background: #f8fafc; }
        .pg-name { display: flex; align-items: center; gap: 5px; padding: 3px 5px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #e2e8f0; background: #fff; min-width: 0; }
        .pg-dot { width: 15px; height: 15px; border-radius: 4px; color: #fff; font-size: 6.5pt; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pg-ntxt { min-width: 0; overflow: hidden; }
        .pg-ntxt b { display: block; font-size: 7pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pg-ntxt small { display: block; font-size: 6pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pg-cell { border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; min-height: 20px; }
        .pg-bar-wrap { display: flex; align-items: center; padding: 2px; z-index: 2; overflow: hidden; }
        .pg-bar { width: 100%; border-radius: 4px; color: #fff; font-weight: 700; font-size: 6.5pt; padding: 2px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* Timeline */
        .rtl-list { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
        .rtl-item { display: flex; gap: 8px; border: 1px solid #cbd5e1; border-left: 3px solid #4f46e5; border-radius: 6px; padding: 6px 8px; break-inside: avoid; }
        .rtl-date { font-weight: 700; font-size: 7.5pt; color: #3730a3; min-width: 62px; }
        .rtl-date small { display: block; font-weight: 500; color: #64748b; }
        .rtl-body b { display: block; font-size: 8pt; }
        .rtl-body span { font-size: 7.2pt; color: #475569; }
        /* Tables */
        .a4-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6.8pt; }
        .a4-table thead { display: table-header-group; }
        .a4-table tr { break-inside: avoid; }
        .a4-table th, .a4-table td { border: 1px solid #cbd5e1; padding: 3.5px 3px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .a4-table td.wrap { white-space: normal; word-break: break-word; }
        .a4-table th { background: #e2e8f0; font-weight: 700; }
        .a4-table td.num { text-align: right; }
        .a4-table tfoot td { background: #f1f5f9; font-weight: 700; }
        .rparams-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .rbox { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; display: grid; gap: 4px; font-size: 8.2pt; }
        .rbox h3 { margin: 0 0 4px; font-size: 9.5pt; color: #0f172a; }
      </style></head><body>
      <div class="rhead">
        <h1>✈️ Relatório da Viagem — ${esc(state.title || "Férias Pro")}</h1>
        <span>Gerado em ${new Date().toLocaleDateString("pt-BR")} · ${sorted.length} atividades</span>
      </div>

      <section class="rsec">
        <h2>1. Dashboard &amp; Composição de Custos</h2>
        <div class="rkpis">${kpisHtml}</div>
        ${costHtml}
      </section>

      <section class="rsec">
        <h2>2. Mapa da Rota (Google Maps)</h2>
        <div class="map-img-box">
          <img src="${esc(staticMapUrl || fallbackMapImg)}" alt="Mapa da rota" onerror="this.onerror=null;this.src='${fallbackMapImg}'">
        </div>
      </section>

      <section class="rsec rsec-break">
        <h2>3. Cronograma Gráfico de Gantt (Horizontal)</h2>
        ${ganttHtml}
      </section>

      <section class="rsec rsec-break">
        <h2>4. Linha do Tempo</h2>
        <div class="rtl-list">${timelineHtml}</div>
      </section>

      <section class="rsec rsec-break">
        <h2>5. Checklist de Preparação (${doneChk}/${(state.checklist || []).length})</h2>
        ${checklistHtml}
      </section>

      <section class="rsec rsec-break">
        <h2>6. Planilha Completa (A4 Horizontal)</h2>
        ${tableHtml}
      </section>

      <section class="rsec rsec-break">
        <h2>7. Parâmetros &amp; Cenários</h2>
        ${paramsHtml}
      </section>
      </body></html>`;

    return printHtmlInFrame(html, true);
  }

  /* ---------- GOOGLE WALLET & PASSE VISUAL COM QR CODE ---------- */
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
    const W = 720, H = 400;
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
    ctx.fillRect(0, 82, W, 2);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 20px Outfit, sans-serif";
    ctx.fillText(`Férias Pro · ${tripName || "Passe Digital"}`, 32, 50);

    ctx.font = "700 32px Outfit, sans-serif";
    ctx.fillText(String(activity.name || "Atividade").slice(0, 28), 32, 138);

    ctx.font = "500 18px Outfit, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const dt = activity.end && activity.end !== activity.start
      ? `${fmtBR(activity.start)} até ${fmtBR(activity.end)}`
      : fmtBR(activity.start);
    ctx.fillText(`📅 ${dt}   ·   Tipo: ${activity.type}`, 32, 178);

    let lineY = 216;
    if (activity.from || activity.to) {
      ctx.fillText(`📍 ${activity.from || "?"} ➔ ${activity.to || "?"}`, 32, lineY);
      lineY += 34;
    }
    if (activity.bookingRef) {
      ctx.fillText(`🔖 Localizador / Código: ${activity.bookingRef}`, 32, lineY);
      lineY += 34;
    }
    if (activity.extraCost > 0) {
      ctx.fillText(`💳 Valor: ${money(activity.extraCost)}`, 32, lineY);
      lineY += 34;
    }
    if (activity.notes) {
      ctx.font = "400 16px Outfit, sans-serif";
      ctx.fillText(String(activity.notes).slice(0, 48), 32, 345);
    }

    drawQrMatrix(ctx, `${activity.id || ""}|${activity.name}|${activity.start}`, W - 196, 132, 160);
  }

  window.FeriasReport = {
    exportGanttImage,
    exportGanttPdf,
    printTableLandscape,
    printFullTripReport,
    renderWalletPassCanvas
  };
})();
