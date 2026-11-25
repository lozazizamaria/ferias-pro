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

let personalUnifiedFilter = {
  search: "",
  year: "",
  month: "",
  dateFrom: "",
  dateTo: "",
  list: "",
  type: "",
  transport: "",
  city: "",
  person: "",
  tag: "",
  onlyTravel: false,
  onlyAttach: false
};

function readPersonalUnifiedFilterFromDOM() {
  personalUnifiedFilter = {
    search: ($("#pf-search")?.value || "").trim().toLowerCase(),
    year: ($("#pf-year")?.value || "").trim(),
    month: ($("#pf-month")?.value || "").trim(),
    dateFrom: ($("#pf-dateFrom")?.value || "").trim(),
    dateTo: ($("#pf-dateTo")?.value || "").trim(),
    list: ($("#pf-list")?.value || "").trim(),
    type: ($("#pf-type")?.value || "").trim(),
    transport: ($("#pf-transport")?.value || "").trim(),
    city: ($("#pf-city")?.value || "").trim(),
    person: ($("#pf-person")?.value || "").trim().toLowerCase(),
    tag: ($("#pf-tag")?.value || "").trim(),
    onlyTravel: Boolean($("#pf-onlyTravel")?.checked),
    onlyAttach: Boolean($("#pf-onlyAttach")?.checked)
  };
  return personalUnifiedFilter;
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
  if (f.transport) c++;
  if (f.city) c++;
  if (f.person) c++;
  if (f.tag) c++;
  if (f.onlyTravel) c++;
  if (f.onlyAttach) c++;
  return c;
}

function updatePersonalUnifiedFilterBadge() {
  const cnt = countActivePersonalUnifiedFilters();
  const badge = $("#pmapFilterCount");
  if (badge) {
    badge.textContent = cnt ? String(cnt) : "";
    badge.hidden = !cnt;
  }
  const trig = $("#btnPmapFilterPop");
  if (trig) trig.classList.toggle("has-active", cnt > 0);
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
  const years = [...new Set(acts.map(a => String(a.start || "").slice(0, 4)).filter(y => /^\d{4}$/.test(y)))].sort();
  fillSel($("#pf-year"), "Todos os anos", years.map(y => [y, y]));

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
  updatePersonalUnifiedFilterBadge();
}

function applyPersonalUnifiedFilter(list) {
  const f = personalUnifiedFilter;
  if (!countActivePersonalUnifiedFilters()) return list;
  const cols = ensurePersonalBoardColumns();
  const colIds = new Set(cols.map(c => c.id));
  const defColId = cols[0]?.id || "";
  return list.filter(a => {
    if (!a) return false;
    const s = String(a.start || "");
    const e = String(a.end || s);
    if (f.search) {
      const hay = [a.name || "", a.notes || "", a.from || "", a.to || "", a.location || "", a.city || "", a.airline || "", a.bookingRef || ""].join(" ").toLowerCase();
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
    if (f.transport && a.type !== f.transport) return false;
    if (f.city) {
      const want = normCityKey(f.city);
      const has = [a.from, a.to, a.location, a.city].some(raw => normCityKey(raw) === want);
      if (!has) return false;
    }
    if (f.person) {
      const pHay = [a.assignee || "", a.notes || "", a.name || "", ...(Array.isArray(a.tags) ? a.tags : [])].join(" ").toLowerCase();
      if (!pHay.includes(f.person)) return false;
    }
    if (f.tag && !(Array.isArray(a.tags) && a.tags.includes(f.tag))) return false;
    if (f.onlyTravel && !isTravelType(a.type)) return false;
    if (f.onlyAttach && !(Array.isArray(a.attachments) && a.attachments.length > 0)) return false;
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
  const popBtn = $("#btnPmapFilterPop");
  const popPanel = $("#pmapFilterPopPanel");
  const closePop = () => {
    if (popPanel) popPanel.hidden = true;
    if (popBtn) popBtn.setAttribute("aria-expanded", "false");
  };
  if (popBtn && popPanel) {
    popBtn.onclick = e => {
      e.stopPropagation();
      const willOpen = popPanel.hidden;
      if (willOpen) populatePersonalUnifiedFilterOptions(sorted());
      popPanel.hidden = !willOpen;
      popBtn.setAttribute("aria-expanded", String(willOpen));
    };
    document.addEventListener("click", e => {
      if (!popPanel.hidden && !popPanel.contains(e.target) && !popBtn.contains(e.target)) closePop();
    });
  }
  if ($("#btnPufClose")) $("#btnPufClose").onclick = closePop;
  if ($("#btnPufApply")) {
    $("#btnPufApply").onclick = () => {
      readPersonalUnifiedFilterFromDOM();
      updatePersonalUnifiedFilterBadge();
      closePop();
      render();
    };
  }
  if ($("#btnPmapClearFilters")) {
    $("#btnPmapClearFilters").onclick = () => {
      ["#pf-search", "#pf-year", "#pf-month", "#pf-dateFrom", "#pf-dateTo", "#pf-list", "#pf-type", "#pf-transport", "#pf-city", "#pf-person", "#pf-tag"].forEach(s => {
        if ($(s)) $(s).value = "";
      });
      if ($("#pf-onlyTravel")) $("#pf-onlyTravel").checked = false;
      if ($("#pf-onlyAttach")) $("#pf-onlyAttach").checked = false;
      readPersonalUnifiedFilterFromDOM();
      updatePersonalUnifiedFilterBadge();
      render();
    };
  }
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
    return `<g>
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="13" fill="${p.hex}" stroke="#ffffff" stroke-width="2.5"/>
      <text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">${i + 1}</text>
      <rect x="${(p.x + 17).toFixed(1)}" y="${(p.y - 11).toFixed(1)}" width="${pillW.toFixed(1)}" height="22" rx="11" fill="rgba(255,255,255,0.94)" stroke="rgba(15,23,42,0.16)" stroke-width="1"/>
      <text x="${(p.x + 25).toFixed(1)}" y="${(p.y + 4).toFixed(1)}" font-size="11" font-weight="700" fill="#0f172a">${esc(labelTxt)}</text>
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

  // 4. Geocodificar cidades em ordem cronológica e desenhar Mapa + Rota Completa
  const geocodeCity = async city => {
    if (window.FeriasMaps?.geocodeLocation) {
      const g = await window.FeriasMaps.geocodeLocation(city).catch(() => null);
      if (g && isFinite(g.lat) && isFinite(g.lng)) return g;
    }
    if (window.FeriasMaps?.lookupBuiltinLocation) {
      const b = window.FeriasMaps.lookupBuiltinLocation(city);
      if (b && isFinite(b.lat) && isFinite(b.lng)) return b;
    }
    return null;
  };

  const routeCoords = [];
  const cityCoordByKey = new Map();
  for (const stop of routeSequence) {
    const coords = await geocodeCity(stop.city);
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

