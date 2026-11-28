/* ==========================================================================
   My Plan — Jornada da Viagem com IA (Exclusivo Modo Pessoal, v68)
   Resumo visual compartilhável estilo Spotify Wrapped / Cartão Postal
   Formatos: Card Vertical 9:16 (Stories/Status) & Resumo Horizontal/PDF
   Privacidade Estrita: ZERO dados financeiros ou Splitwise
   ========================================================================== */
(() => {
  const MONTHS_SHORT_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const MONTHS_UPPER_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

  const COUNTRY_CONTINENT_MAP = {
    brasil: ["Brasil", "América do Sul"],
    brazil: ["Brasil", "América do Sul"],
    argentina: ["Argentina", "América do Sul"],
    chile: ["Chile", "América do Sul"],
    uruguai: ["Uruguai", "América do Sul"],
    peru: ["Peru", "América do Sul"],
    colombia: ["Colômbia", "América do Sul"],
    portugal: ["Portugal", "Europa"],
    espanha: ["Espanha", "Europa"],
    spain: ["Espanha", "Europa"],
    italia: ["Itália", "Europa"],
    italy: ["Itália", "Europa"],
    franca: ["França", "Europa"],
    france: ["França", "Europa"],
    alemanha: ["Alemanha", "Europa"],
    germany: ["Alemanha", "Europa"],
    suica: ["Suíça", "Europa"],
    switzerland: ["Suíça", "Europa"],
    "reino unido": ["Reino Unido", "Europa"],
    inglaterra: ["Reino Unido", "Europa"],
    holanda: ["Holanda", "Europa"],
    grecia: ["Grécia", "Europa"],
    austria: ["Áustria", "Europa"],
    belgica: ["Bélgica", "Europa"],
    croacia: ["Croácia", "Europa"],
    irlanda: ["Irlanda", "Europa"],
    "estados unidos": ["Estados Unidos", "América do Norte"],
    eua: ["Estados Unidos", "América do Norte"],
    usa: ["Estados Unidos", "América do Norte"],
    canada: ["Canadá", "América do Norte"],
    mexico: ["México", "América do Norte"],
    japao: ["Japão", "Ásia"],
    japan: ["Japão", "Ásia"],
    tailandia: ["Tailândia", "Ásia"],
    emirados: ["Emirados Árabes", "Ásia"],
    dubai: ["Emirados Árabes", "Ásia"],
    egito: ["Egito", "África"],
    marrocos: ["Marrocos", "África"],
    "africa do sul": ["África do Sul", "África"],
    australia: ["Austrália", "Oceania"],
    "nova zelandia": ["Nova Zelândia", "Oceania"]
  };

  const CITY_COUNTRY_HINTS = {
    "sao paulo": "brasil",
    brasilia: "brasil",
    "rio de janeiro": "brasil",
    curitiba: "brasil",
    gramado: "brasil",
    navegantes: "brasil",
    florianopolis: "brasil",
    fortaleza: "brasil",
    salvador: "brasil",
    recife: "brasil",
    "porto alegre": "brasil",
    lisboa: "portugal",
    porto: "portugal",
    obidos: "portugal",
    sintra: "portugal",
    faro: "portugal",
    coimbra: "portugal",
    madrid: "espanha",
    barcelona: "espanha",
    salamanca: "espanha",
    sevilha: "espanha",
    valencia: "espanha",
    toledo: "espanha",
    roma: "italia",
    florenca: "italia",
    firenze: "italia",
    veneza: "italia",
    venezia: "italia",
    milao: "italia",
    milano: "italia",
    siena: "italia",
    verona: "italia",
    bolonha: "italia",
    napoles: "italia",
    paris: "franca",
    nice: "franca",
    lyon: "franca",
    londres: "reino unido",
    amsterda: "holanda",
    zurique: "suica",
    genebra: "suica",
    berlim: "alemanha",
    munique: "alemanha",
    atenas: "grecia",
    orlando: "estados unidos",
    miami: "estados unidos",
    "nova york": "estados unidos",
    "buenos aires": "argentina",
    santiago: "chile",
    montevideu: "uruguai",
    toquio: "japao",
    dubai: "emirados"
  };

  const JOURNEY_THEMES = {
    aurora: {
      id: "aurora",
      label: "Aurora",
      bgStops: ["#081024", "#12244d", "#1c1f4a"],
      glowA: "rgba(56, 189, 248, 0.34)",
      glowB: "rgba(167, 139, 250, 0.30)",
      accent: "#38bdf8",
      accent2: "#a78bfa",
      flightColor: "#fb923c",
      roadColor: "#38bdf8",
      cardBg: "rgba(255, 255, 255, 0.08)",
      cardBorder: "rgba(255, 255, 255, 0.16)",
      text: "#f8fafc",
      muted: "#cbd5e1",
      lightHeroStart: "#0f172a",
      lightHeroEnd: "#1e3a8a"
    },
    sunset: {
      id: "sunset",
      label: "Mediterrâneo",
      bgStops: ["#2a0f1f", "#6b2139", "#a3472a"],
      glowA: "rgba(251, 146, 60, 0.36)",
      glowB: "rgba(244, 114, 182, 0.28)",
      accent: "#fbbf24",
      accent2: "#fb7185",
      flightColor: "#fde047",
      roadColor: "#fb923c",
      cardBg: "rgba(255, 255, 255, 0.10)",
      cardBorder: "rgba(255, 255, 255, 0.20)",
      text: "#fff7ed",
      muted: "#fed7aa",
      lightHeroStart: "#7c2d12",
      lightHeroEnd: "#be185d"
    },
    ocean: {
      id: "ocean",
      label: "Oceano",
      bgStops: ["#06212c", "#0c4257", "#0f5c63"],
      glowA: "rgba(45, 212, 191, 0.34)",
      glowB: "rgba(56, 189, 248, 0.28)",
      accent: "#2dd4bf",
      accent2: "#38bdf8",
      flightColor: "#f59e0b",
      roadColor: "#2dd4bf",
      cardBg: "rgba(255, 255, 255, 0.09)",
      cardBorder: "rgba(255, 255, 255, 0.18)",
      text: "#f0fdfa",
      muted: "#bae6fd",
      lightHeroStart: "#083344",
      lightHeroEnd: "#0f766e"
    }
  };

  let activeFormat = "story"; // "story" | "timeline"
  let activeTone = "inspirador"; // "inspirador" | "divertido" | "minimalista"
  let activeTheme = "aurora";
  let currentFacts = null;
  let currentCopy = null;
  let currentUsedAi = false;
  let journeyEventsBound = false;

  const esc = s => (window.MyPlanUtils?.esc
    ? window.MyPlanUtils.esc(s)
    : String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));

  function normKey(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanCity(raw) {
    let s = String(raw || "").trim();
    if (!s) return "";
    s = s.split(",")[0].trim();
    s = s.replace(/\s*[-–\/]\s*(BR|[A-Z]{2})\s*$/i, "").trim();
    s = s.replace(/\s*\([^)]+\)\s*$/i, "").trim();
    return s;
  }

  function inferCountryAndContinent(rawPlace, lat, lng) {
    const fullNorm = normKey(rawPlace);
    for (const [k, pair] of Object.entries(COUNTRY_CONTINENT_MAP)) {
      if (fullNorm.includes(k)) return { country: pair[0], continent: pair[1] };
    }
    const cityNorm = normKey(cleanCity(rawPlace));
    if (CITY_COUNTRY_HINTS[cityNorm]) {
      const pair = COUNTRY_CONTINENT_MAP[CITY_COUNTRY_HINTS[cityNorm]];
      if (pair) return { country: pair[0], continent: pair[1] };
    }
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      const la = Number(lat), lo = Number(lng);
      if (la < 14 && lo < -30) return { country: "", continent: "América do Sul" };
      if (la >= 14 && lo < -30) return { country: "", continent: "América do Norte" };
      if (la >= 35 && lo >= -15 && lo <= 45) return { country: "", continent: "Europa" };
      if (la < 35 && lo >= -20 && lo <= 52) return { country: "", continent: "África" };
      if (la < -10 && lo >= 110) return { country: "", continent: "Oceania" };
      if (lo > 45) return { country: "", continent: "Ásia" };
    }
    return { country: "", continent: "" };
  }

  function parseIso(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return null;
    const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function fmtDateShortEditorial(iso) {
    const d = parseIso(iso);
    if (!d) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mmm = MONTHS_SHORT_PT[d.getMonth()] || "";
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mmm}/${yy}`;
  }

  function fmtPeriodEyebrow(startIso, endIso) {
    const s = parseIso(startIso);
    const e = parseIso(endIso || startIso);
    if (!s || !e) return "ROTEIRO ESPECIAL";
    if (s.getFullYear() === e.getFullYear()) {
      if (s.getMonth() === e.getMonth()) return `${MONTHS_UPPER_PT[s.getMonth()]} ${s.getFullYear()}`;
      return `${MONTHS_UPPER_PT[s.getMonth()]} – ${MONTHS_UPPER_PT[e.getMonth()]} ${s.getFullYear()}`;
    }
    return `${MONTHS_UPPER_PT[s.getMonth()]}/${String(s.getFullYear()).slice(-2)} – ${MONTHS_UPPER_PT[e.getMonth()]}/${String(e.getFullYear()).slice(-2)}`;
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    if (![lat1, lng1, lat2, lng2].every(v => Number.isFinite(Number(v)))) return 0;
    const R = 6371;
    const toRad = x => (Number(x) * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function fmtKm(n) {
    return `${Math.round(Number(n) || 0).toLocaleString("pt-BR")} km`;
  }

  /* ========================================================================
     1. COLETA DE DADOS REAIS (100% PRIVACIDADE — ZERO DADOS FINANCEIROS)
     ======================================================================== */
  function collectJourneyFacts(st, activeTrip) {
    const acts = (Array.isArray(st?.activities) ? st.activities : [])
      .filter(a => a && !a.archived && a.start)
      .slice()
      .sort((a, b) => String(a.start || "").localeCompare(String(b.start || "")) || String(a.startTime || "").localeCompare(String(b.startTime || "")));

    const rawTitle = String(activeTrip?.name || st?.title || "Minha Viagem").trim();
    const projectTitle = rawTitle.replace(/\s*\(Exemplo\)\s*$/i, "").trim() || rawTitle;

    const travelActs = acts.filter(a => ["Voo", "Viagem", "Trem", "Ônibus", "Navio"].includes(a.type));
    const coreActs = travelActs.length ? acts.filter(a => a.start >= travelActs[0].start) : acts;
    const dated = coreActs.length ? coreActs : acts;

    const startIso = dated.length ? dated.reduce((m, a) => (a.start < m ? a.start : m), dated[0].start) : "";
    const endIso = dated.length ? dated.reduce((m, a) => ((a.end || a.start) > m ? (a.end || a.start) : m), dated[0].end || dated[0].start) : "";
    const sDt = parseIso(startIso);
    const eDt = parseIso(endIso || startIso);
    const totalDays = (sDt && eDt) ? Math.max(1, Math.round((eDt - sDt) / 86400000) + 1) : 0;

    const countriesSet = new Set();
    const continentsSet = new Set();
    const citiesOrder = [];
    const uniqueCityKeys = new Set();
    const cityCountryMap = new Map();
    const routeLegs = [];

    const registerPlace = (raw, lat, lng) => {
      const cName = cleanCity(raw);
      const cKey = normKey(cName);
      if (!cName || !cKey) return null;
      const geo = inferCountryAndContinent(raw, lat, lng);
      if (geo.country) {
        countriesSet.add(geo.country);
        if (!cityCountryMap.has(cKey)) cityCountryMap.set(cKey, geo.country);
      }
      if (geo.continent) continentsSet.add(geo.continent);
      if (!citiesOrder.length || citiesOrder[citiesOrder.length - 1].key !== cKey) {
        citiesOrder.push({ key: cKey, city: cName, country: geo.country || cityCountryMap.get(cKey) || "" });
      }
      uniqueCityKeys.add(cKey);
      return { key: cKey, city: cName };
    };

    let flightsCount = 0;
    let roadLegsCount = 0;
    let totalKm = 0;

    acts.forEach(a => {
      const isFlight = a.type === "Voo";
      const isRoad = ["Viagem", "Ônibus", "Trem", "Navio"].includes(a.type);
      if (isFlight) flightsCount++;
      if (isRoad) roadLegsCount++;

      if (isFlight || isRoad) {
        let legKm = Number(a.km) || 0;
        if (legKm <= 0 && a.fromLat != null && a.toLat != null) {
          legKm = haversineKm(a.fromLat, a.fromLng, a.toLat, a.toLng);
        }
        totalKm += Math.max(0, legKm);

        const fromP = a.from ? registerPlace(a.from, a.fromLat, a.fromLng) : null;
        const toP = a.to ? registerPlace(a.to, a.toLat, a.toLng) : null;
        if (fromP && toP && fromP.key !== toP.key) {
          routeLegs.push({
            from: fromP.city,
            to: toP.city,
            isFlight,
            type: a.type,
            date: a.start,
            km: legKm
          });
        }
      } else if (a.location || a.city) {
        const rawLoc = a.location || a.city;
        const cKey = normKey(cleanCity(rawLoc));
        const geo = inferCountryAndContinent(rawLoc, a.locationLat, a.locationLng);
        if (geo.country) {
          countriesSet.add(geo.country);
          if (cKey && !cityCountryMap.has(cKey)) cityCountryMap.set(cKey, geo.country);
        }
        if (geo.continent) continentsSet.add(geo.continent);
        if (cKey && !uniqueCityKeys.has(cKey) && !travelActs.length) {
          registerPlace(rawLoc, a.locationLat, a.locationLng);
        }
      }
    });

    // Destaques positivos (passeios, ingressos, eventos, restaurantes, hospedagens) — ZERO valores!
    const highlights = acts
      .filter(a => ["Passeio", "Ingresso", "Evento", "Restaurante", "Hospedagem", "Período"].includes(a.type))
      .slice(0, 14)
      .map(a => ({
        date: fmtDateShortEditorial(a.start),
        startIso: a.start,
        endIso: a.end || a.start,
        city: cleanCity(a.location || a.city || a.to || ""),
        title: String(a.name || "").trim(),
        type: a.type
      }));

    // Montar linha do tempo agrupada por parada cronológica
    const stops = [];
    const seenStopCities = new Set();
    const pushStop = (city, startD, endD, arrivalMode) => {
      const k = normKey(city);
      if (!k) return null;
      const existing = stops.length && stops[stops.length - 1].key === k ? stops[stops.length - 1] : null;
      if (existing) {
        if (endD && endD > existing.endIso) existing.endIso = endD;
        return existing;
      }
      const obj = {
        key: k,
        city,
        country: cityCountryMap.get(k) || "",
        startIso: startD || "",
        endIso: endD || startD || "",
        arrivalMode: arrivalMode || "",
        highlights: []
      };
      stops.push(obj);
      seenStopCities.add(k);
      return obj;
    };

    acts.forEach(a => {
      if (["Voo", "Viagem", "Trem", "Ônibus", "Navio"].includes(a.type)) {
        const toCity = cleanCity(a.to);
        if (toCity) {
          const isReturnHome = stops.length >= 2 && normKey(toCity) === stops[0].key;
          if (!isReturnHome) {
            pushStop(toCity, a.end || a.start, a.end || a.start, a.type === "Voo" ? "flight" : "road");
          }
        }
      } else {
        const c = cleanCity(a.location || a.city);
        const k = normKey(c);
        let target = stops.slice().reverse().find(sp => sp.key === k);
        if (!target && c && a.type !== "Outro") {
          target = pushStop(c, a.start, a.end || a.start, "");
        }
        if (target) {
          if (a.end && a.end > target.endIso) target.endIso = a.end;
          if (["Passeio", "Ingresso", "Evento", "Restaurante"].includes(a.type) && target.highlights.length < 3) {
            target.highlights.push(String(a.name || "").trim());
          }
        }
      }
    });

    const uniqueCitiesList = [];
    const seenU = new Set();
    citiesOrder.forEach(c => {
      if (!seenU.has(c.key)) {
        seenU.add(c.key);
        uniqueCitiesList.push(c.city);
      }
    });

    // Sequência limpa da rota visual (sem duplicatas consecutivas nem vai-e-volta de eventos no mesmo dia)
    const cleanRouteCities = [];
    if (routeLegs.length) {
      routeLegs.forEach((lg, idx) => {
        if (idx === 0) cleanRouteCities.push(lg.from);
        else if (normKey(cleanRouteCities[cleanRouteCities.length - 1]) !== normKey(lg.from)) {
          cleanRouteCities.push(lg.from);
        }
        if (normKey(cleanRouteCities[cleanRouteCities.length - 1]) !== normKey(lg.to)) {
          cleanRouteCities.push(lg.to);
        }
      });
      // Se volta exatamente para a cidade de origem no último trecho e já temos >= 4 nós, mantém o foco nos destinos principais
      if (cleanRouteCities.length > 8 && normKey(cleanRouteCities[0]) === normKey(cleanRouteCities[cleanRouteCities.length - 1])) {
        cleanRouteCities.pop();
      }
    }
    const finalRouteCities = cleanRouteCities.length ? cleanRouteCities : uniqueCitiesList;

    return {
      projectTitle,
      startIso,
      endIso,
      periodEyebrow: fmtPeriodEyebrow(startIso, endIso),
      periodHuman: startIso ? `${fmtDateShortEditorial(startIso)}${endIso && endIso !== startIso ? ` → ${fmtDateShortEditorial(endIso)}` : ""}` : "",
      totalDays,
      cities: uniqueCitiesList,
      routeCities: finalRouteCities,
      countries: [...countriesSet],
      continents: [...continentsSet],
      flightsCount,
      roadLegsCount,
      totalKm: Math.round(totalKm),
      routeLegs,
      highlights,
      stops
    };
  }

  /* ========================================================================
     2. GERADOR LOCAL DE FALLBACK (TONS: INSPIRADOR, DIVERTIDO, MINIMALISTA)
     ======================================================================== */
  function buildLocalJourneyCopy(facts, tone = "inspirador") {
    const nCities = facts.cities.length;
    const nDays = facts.totalDays;
    const firstCity = facts.cities[0] || "";
    const lastCity = facts.cities[facts.cities.length - 1] || "";
    const destCities = facts.cities.filter((c, i) => !(i === 0 && facts.cities.length > 2 && normKey(c) === normKey(lastCity)));
    const destPreview = destCities.slice(0, 4).join(", ");
    const hasBothModes = facts.flightsCount > 0 && facts.roadLegsCount > 0;
    const modePhrase = hasBothModes
      ? "combinando grandes voos e estradas inesquecíveis"
      : (facts.flightsCount > 0 ? "cruzando novos céus e horizontes" : "explorando cada quilômetro pela estrada");

    const stopNotes = facts.stops.map(sp => {
      const hl = sp.highlights[0]
        ? sp.highlights[0]
        : (sp.arrivalMode === "flight" ? `Chegada de avião para descobrir ${sp.city}` : `Parada especial em ${sp.city}`);
      return { city: sp.city, highlight: hl };
    });

    if (tone === "divertido") {
      return {
        headline: nCities > 1 ? `${nDays || "Muitos"} dias, ${nCities} destinos e zero tédio!` : `${facts.projectTitle}: modo férias ON!`,
        tagline: destPreview ? `De ${firstCity} até ${destPreview} com muita história boa pra contar` : `Roteiro pronto para colecionar sorrisos e fotos épicas`,
        narrative: `Foram ${nDays || 1} dias incríveis ${modePhrase}${facts.totalKm > 0 ? ` — somando ${fmtKm(facts.totalKm)} de pura aventura` : ""}! ${destPreview ? `Passando por ${destPreview}, cada parada rendeu memórias para a vida toda.` : "Cada parada trouxe descobertas inesquecíveis e boas risadas."}`,
        stopNotes,
        shareCaption: `✈️🚗 Nossa Jornada: ${facts.projectTitle}! ${nDays} dias • ${nCities} cidades${facts.totalKm > 0 ? ` • ${fmtKm(facts.totalKm)}` : ""}! Que viagem sensacional!`
      };
    }

    if (tone === "minimalista") {
      return {
        headline: facts.projectTitle,
        tagline: [
          nDays ? `${nDays} dias` : "",
          nCities ? `${nCities} cidades` : "",
          facts.countries.length > 1 ? `${facts.countries.length} países` : ""
        ].filter(Boolean).join(" · ") || "Diário de Bordo",
        narrative: `${facts.periodHuman ? `${facts.periodHuman}. ` : ""}${destPreview ? `${destPreview}. ` : ""}${facts.totalKm > 0 ? `${fmtKm(facts.totalKm)} percorridos ` : "Uma jornada "}com calma, propósito e belas paisagens em cada etapa.`,
        stopNotes,
        shareCaption: `${facts.projectTitle} — ${nDays} dias, ${nCities} cidades${facts.totalKm > 0 ? `, ${fmtKm(facts.totalKm)}` : ""}.`
      };
    }

    // Default: inspirador
    return {
      headline: facts.continents.length > 1
        ? `${facts.projectTitle}: Cruzando Fronteiras`
        : `${facts.projectTitle}: Uma Jornada Inesquecível`,
      tagline: destPreview
        ? `${nDays} dias descobrindo ${destPreview} e celebrando cada instante`
        : `Cada quilômetro transformado em memória extraordinária`,
      narrative: `Uma viagem marcante de ${nDays || 1} dias ${modePhrase}${facts.totalKm > 0 ? `, conectando ${fmtKm(facts.totalKm)} de descobertas` : ""}. ${facts.countries.length > 1 ? `Entre ${facts.countries.join(", ")}, cada cidade deixou uma marca única nessa história.` : "Cada destino selecionado para viver experiências autênticas e inspiradoras."}`,
      stopNotes,
      shareCaption: `✨ ${facts.projectTitle}: ${nDays} dias • ${nCities} cidades${facts.totalKm > 0 ? ` • ${fmtKm(facts.totalKm)}` : ""}${facts.continents.length > 1 ? ` • ${facts.continents.length} continentes` : ""}! Memórias para sempre.`
    };
  }

  /* ========================================================================
     3. MOTOR DE DESENHO CANVAS HI-DPI (STORY 9:16 + TIMELINE HORIZONTAL/PDF)
     ======================================================================== */
  function drawRoundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function wrapCanvasText(ctx, text, maxWidth, maxLines = 4) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = cur + " " + words[i];
      if (ctx.measureText(test).width <= maxWidth) {
        cur = test;
      } else {
        lines.push(cur);
        cur = words[i];
        if (lines.length >= maxLines - 1) break;
      }
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
      let last = lines[maxLines - 1];
      while (last.length > 4 && ctx.measureText(last + "…").width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = last.trim() + "…";
    }
    return lines;
  }

  function buildImpactMetrics(facts) {
    const metrics = [
      { value: `${facts.totalDays || 1}`, label: facts.totalDays === 1 ? "dia de viagem" : "dias de viagem", icon: "📅" },
      { value: `${Math.max(1, facts.cities.length)}`, label: facts.cities.length === 1 ? "cidade" : "cidades", icon: "📍" },
      { value: facts.totalKm > 0 ? facts.totalKm.toLocaleString("pt-BR") : `${facts.highlights.length || 1}`, label: facts.totalKm > 0 ? "km percorridos" : "destaques", icon: facts.totalKm > 0 ? "🧭" : "✨" }
    ];
    if (facts.continents.length >= 2) {
      metrics.push({ value: `${facts.continents.length}`, label: "continentes", icon: "🌍" });
    } else if (facts.countries.length >= 2) {
      metrics.push({ value: `${facts.countries.length}`, label: "países", icon: "🗺️" });
    } else if (facts.flightsCount + facts.roadLegsCount > 0) {
      const bits = [];
      if (facts.flightsCount) bits.push(`${facts.flightsCount} voo${facts.flightsCount > 1 ? "s" : ""}`);
      if (facts.roadLegsCount) bits.push(`${facts.roadLegsCount} estrada${facts.roadLegsCount > 1 ? "s" : ""}`);
      metrics.push({ value: `${facts.flightsCount + facts.roadLegsCount}`, label: bits.join(" · "), icon: "✈️" });
    } else {
      metrics.push({ value: `${facts.highlights.length || 1}`, label: "experiências", icon: "⭐" });
    }
    return metrics;
  }

  function renderStoryCanvas(facts, copy, themeId = "aurora") {
    const theme = JOURNEY_THEMES[themeId] || JOURNEY_THEMES.aurora;
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // 1. Fundo editorial gradiente + halos suaves
    const bgGrad = ctx.createLinearGradient(0, 0, W * 0.85, H);
    bgGrad.addColorStop(0, theme.bgStops[0]);
    bgGrad.addColorStop(0.52, theme.bgStops[1]);
    bgGrad.addColorStop(1, theme.bgStops[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const drawGlow = (cx, cy, r, color) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    };
    drawGlow(W * 0.85, H * 0.14, 520, theme.glowA);
    drawGlow(W * 0.14, H * 0.78, 560, theme.glowB);

    // Textura sutil de pontos
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    for (let x = 44; x < W; x += 48) {
      for (let y = 44; y < H; y += 48) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    const padX = 84;
    let curY = 120;

    // 2. Eyebrow & Período Pill
    ctx.font = "700 24px Outfit, system-ui, sans-serif";
    const eyebrow = `✨ JORNADA DA VIAGEM  •  ${facts.periodEyebrow}`;
    const pillW = Math.min(W - padX * 2, ctx.measureText(eyebrow).width + 52);
    drawRoundedRect(ctx, padX, curY, pillW, 56, 28);
    ctx.fillStyle = theme.cardBg;
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = theme.accent;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(eyebrow, padX + 26, curY + 29);
    curY += 98;

    // 3. Manchete inspiradora (IA)
    ctx.fillStyle = theme.text;
    ctx.font = "800 72px Outfit, system-ui, sans-serif";
    const hLines = wrapCanvasText(ctx, copy.headline || facts.projectTitle, W - padX * 2, 3);
    hLines.forEach(line => {
      ctx.fillText(line, padX, curY + 34);
      curY += 86;
    });
    curY += 10;

    // Subtítulo / Tagline
    if (copy.tagline) {
      ctx.fillStyle = theme.muted;
      ctx.font = "500 32px Outfit, system-ui, sans-serif";
      const tLines = wrapCanvasText(ctx, copy.tagline, W - padX * 2, 2);
      tLines.forEach(line => {
        ctx.fillText(line, padX, curY + 18);
        curY += 44;
      });
    }
    curY += 36;

    // 4. Card de Rota Visual Conectando Cidades (Avião + Carro)
    const routeCardH = 420;
    drawRoundedRect(ctx, padX, curY, W - padX * 2, routeCardH, 34);
    ctx.fillStyle = theme.cardBg;
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = theme.muted;
    ctx.font = "700 22px Outfit, system-ui, sans-serif";
    const modeSummary = [
      facts.flightsCount ? `✈ ${facts.flightsCount} voo${facts.flightsCount > 1 ? "s" : ""}` : "",
      facts.roadLegsCount ? `🚗 ${facts.roadLegsCount} trecho${facts.roadLegsCount > 1 ? "s" : ""} de carro` : "",
      facts.countries.length ? `🌍 ${facts.countries.join(" · ")}` : ""
    ].filter(Boolean).join("   •   ");
    ctx.fillText(modeSummary || "ROTA DA JORNADA", padX + 34, curY + 44);

    // Desenhar nós conectados em serpenteada elegante
    const stopsForMap = (facts.routeCities.length ? facts.routeCities : ["Origem", "Destino"]).slice(0, 8);
    const mapX = padX + 54;
    const mapW = W - padX * 2 - 108;
    const mapTop = curY + 115;
    const mapH = 245;

    const pts = stopsForMap.map((city, idx) => {
      const ratio = stopsForMap.length === 1 ? 0.5 : idx / (stopsForMap.length - 1);
      const x = mapX + ratio * mapW;
      const wave = stopsForMap.length > 2 ? Math.sin(ratio * Math.PI * 2) * 58 : 0;
      const y = mapTop + mapH * 0.5 + wave;
      return { city, x, y, idx };
    });

    // Conectar segmentos com arcos curvos para avião e curvas suaves para carro
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i], p2 = pts[i + 1];
      const leg = facts.routeLegs.find(l => normKey(l.from) === normKey(p1.city) && normKey(l.to) === normKey(p2.city))
        || facts.routeLegs[i]
        || { isFlight: i === 0 || i === pts.length - 2 };
      const cx = (p1.x + p2.x) / 2;
      const cy = Math.min(p1.y, p2.y) - (leg.isFlight ? 66 : 24);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(cx, cy, p2.x, p2.y);
      ctx.strokeStyle = leg.isFlight ? theme.flightColor : theme.roadColor;
      ctx.lineWidth = leg.isFlight ? 5 : 6;
      if (leg.isFlight) ctx.setLineDash([12, 10]);
      ctx.stroke();
      ctx.restore();

      // Ícone no ponto médio
      const mx = 0.25 * p1.x + 0.5 * cx + 0.25 * p2.x;
      const my = 0.25 * p1.y + 0.5 * cy + 0.25 * p2.y;
      ctx.beginPath();
      ctx.arc(mx, my, 18, 0, Math.PI * 2);
      ctx.fillStyle = theme.bgStops[1];
      ctx.fill();
      ctx.strokeStyle = leg.isFlight ? theme.flightColor : theme.roadColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = theme.text;
      ctx.font = "700 18px Outfit, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(leg.isFlight ? "✈" : "🚗", mx, my + 1);
    }

    // Nós das cidades + rótulos
    pts.forEach((p, idx) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = idx === 0 || idx === pts.length - 1 ? theme.flightColor : theme.accent;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = theme.text;
      ctx.font = "700 22px Outfit, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lblY = idx % 2 === 0 ? p.y + 42 : p.y - 38;
      const shortCity = p.city.length > 13 ? p.city.slice(0, 12) + "…" : p.city;
      ctx.fillText(shortCity, p.x, lblY);
    });
    ctx.textAlign = "left";
    curY += routeCardH + 34;

    // 5. Grid 2x2 de Números de Impacto
    const metrics = buildImpactMetrics(facts);
    const gap = 24;
    const cardW = (W - padX * 2 - gap) / 2;
    const cardH = 186;
    metrics.forEach((m, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = padX + col * (cardW + gap);
      const y = curY + row * (cardH + gap);
      drawRoundedRect(ctx, x, y, cardW, cardH, 28);
      ctx.fillStyle = theme.cardBg;
      ctx.fill();
      ctx.strokeStyle = theme.cardBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = theme.accent;
      ctx.font = "700 32px Outfit, system-ui, sans-serif";
      ctx.fillText(m.icon, x + 28, y + 48);

      ctx.fillStyle = theme.text;
      ctx.font = "800 58px Outfit, system-ui, sans-serif";
      ctx.fillText(m.value, x + 28, y + 112);

      ctx.fillStyle = theme.muted;
      ctx.font = "600 24px Outfit, system-ui, sans-serif";
      ctx.fillText(m.label, x + 28, y + 154);
    });
    curY += cardH * 2 + gap + 36;

    // 6. Card de Narrativa Positiva da IA
    const quoteH = Math.max(240, H - curY - 148);
    drawRoundedRect(ctx, padX, curY, W - padX * 2, quoteH, 32);
    ctx.fillStyle = theme.cardBg;
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Barra lateral de destaque
    drawRoundedRect(ctx, padX + 28, curY + 34, 8, quoteH - 68, 4);
    ctx.fillStyle = theme.accent;
    ctx.fill();

    ctx.fillStyle = theme.text;
    ctx.font = "500 33px Outfit, system-ui, sans-serif";
    const nLines = wrapCanvasText(ctx, copy.narrative || "", W - padX * 2 - 92, 5);
    let qy = curY + 58;
    nLines.forEach(line => {
      ctx.fillText(line, padX + 58, qy);
      qy += 48;
    });

    // 7. Rodapé editorial discreto
    ctx.fillStyle = theme.muted;
    ctx.font = "600 24px Outfit, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(facts.periodHuman || facts.projectTitle, padX, H - 72);
    ctx.textAlign = "right";
    ctx.fillStyle = theme.accent;
    ctx.font = "700 25px Outfit, system-ui, sans-serif";
    ctx.fillText("My Plan ✨", W - padX, H - 72);

    return canvas;
  }

  function renderTimelineCanvas(facts, copy, themeId = "aurora") {
    const theme = JOURNEY_THEMES[themeId] || JOURNEY_THEMES.aurora;
    const W = 1600;
    const padX = 64;
    const stops = facts.stops.length
      ? facts.stops
      : facts.cities.map(c => ({ city: c, country: "", startIso: facts.startIso, endIso: facts.endIso, arrivalMode: "", highlights: [] }));
    const noteMap = new Map((copy.stopNotes || []).map(sn => [normKey(sn.city), sn.highlight]));

    const cols = stops.length <= 2 ? Math.max(1, stops.length) : (stops.length <= 4 ? 2 : 3);
    const rows = Math.max(1, Math.ceil(stops.length / cols));
    const cardGap = 24;
    const stopCardH = 216;
    const heroH = 310;
    const narrativeH = 112;
    const H = Math.max(960, heroH + narrativeH + 92 + rows * (stopCardH + cardGap) + 76);

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Fundo limpo editorial (excelente p/ PDF & WhatsApp)
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, W, H);

    // 1. Cabeçalho Hero Editorial
    const heroGrad = ctx.createLinearGradient(0, 0, W, heroH);
    heroGrad.addColorStop(0, theme.lightHeroStart);
    heroGrad.addColorStop(1, theme.lightHeroEnd);
    ctx.fillStyle = heroGrad;
    ctx.fillRect(0, 0, W, heroH);

    // Glow sutil no hero
    const hg = ctx.createRadialGradient(W * 0.88, 70, 0, W * 0.88, 70, 420);
    hg.addColorStop(0, theme.glowA);
    hg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(W * 0.5, 0, W * 0.5, heroH);

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = theme.accent;
    ctx.font = "700 20px Outfit, system-ui, sans-serif";
    ctx.fillText(`✨ JORNADA DA VIAGEM  •  ${facts.periodEyebrow}${facts.periodHuman ? `  (${facts.periodHuman})` : ""}`, padX, 54);

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 50px Outfit, system-ui, sans-serif";
    const hlLines = wrapCanvasText(ctx, copy.headline || facts.projectTitle, W - padX * 2, 2);
    let hy = 112;
    hlLines.forEach(l => { ctx.fillText(l, padX, hy); hy += 58; });

    // Chips de métricas de impacto no hero
    const metrics = buildImpactMetrics(facts);
    let mx = padX;
    const my = heroH - 56;
    ctx.font = "700 22px Outfit, system-ui, sans-serif";
    metrics.forEach(m => {
      const txt = `${m.icon} ${m.value} ${m.label}`;
      const bw = ctx.measureText(txt).width + 34;
      drawRoundedRect(ctx, mx, my - 24, bw, 46, 23);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(txt, mx + 17, my);
      mx += bw + 14;
    });

    // 2. Faixa de Narrativa Positiva da IA
    let curY = heroH + 28;
    drawRoundedRect(ctx, padX, curY, W - padX * 2, narrativeH, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();

    drawRoundedRect(ctx, padX + 20, curY + 22, 6, narrativeH - 44, 3);
    ctx.fillStyle = theme.lightHeroEnd;
    ctx.fill();

    ctx.fillStyle = "#1e293b";
    ctx.font = "500 23px Outfit, system-ui, sans-serif";
    const narLines = wrapCanvasText(ctx, copy.narrative || "", W - padX * 2 - 70, 3);
    let ny = curY + 34;
    narLines.forEach(l => { ctx.fillText(l, padX + 44, ny); ny += 31; });
    curY += narrativeH + 34;

    // 3. Título da Linha do Tempo
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 24px Outfit, system-ui, sans-serif";
    ctx.fillText("🗺️ LINHA DO TEMPO DAS PARADAS & DESTAQUES", padX, curY);
    curY += 32;

    // 4. Grid de Cards por Parada
    const cardW = (W - padX * 2 - cardGap * (cols - 1)) / cols;
    stops.forEach((sp, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = padX + col * (cardW + cardGap);
      const y = curY + row * (stopCardH + cardGap);

      drawRoundedRect(ctx, x, y, cardW, stopCardH, 20);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Badge numérico + modo de chegada
      ctx.beginPath();
      ctx.arc(x + 34, y + 36, 18, 0, Math.PI * 2);
      ctx.fillStyle = sp.arrivalMode === "flight" ? "#f97316" : theme.lightHeroEnd;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 18px Outfit, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(idx + 1), x + 34, y + 37);

      ctx.textAlign = "left";
      ctx.fillStyle = "#0f172a";
      ctx.font = "800 24px Outfit, system-ui, sans-serif";
      const cityTitle = sp.country ? `${sp.city}, ${sp.country}` : sp.city;
      ctx.fillText(cityTitle.slice(0, 28), x + 64, y + 30);

      const dtRange = sp.startIso
        ? `${fmtDateShortEditorial(sp.startIso)}${sp.endIso && sp.endIso !== sp.startIso ? ` → ${fmtDateShortEditorial(sp.endIso)}` : ""}`
        : "";
      const modeLbl = sp.arrivalMode === "flight" ? "✈ Voo" : (sp.arrivalMode === "road" ? "🚗 Carro" : "📍 Parada");
      ctx.fillStyle = "#64748b";
      ctx.font = "600 17px Outfit, system-ui, sans-serif";
      ctx.fillText(`${modeLbl}${dtRange ? `  •  ${dtRange}` : ""}`, x + 64, y + 58);

      // Nota IA ou destaque principal
      const note = noteMap.get(sp.key) || sp.highlights[0] || `Momentos inesquecíveis em ${sp.city}`;
      ctx.fillStyle = "#334155";
      ctx.font = "500 18px Outfit, system-ui, sans-serif";
      const noteLines = wrapCanvasText(ctx, note, cardW - 44, 2);
      let sy = y + 102;
      noteLines.forEach(nl => { ctx.fillText(nl, x + 22, sy); sy += 25; });

      // Lista de destaques extras
      const extras = sp.highlights.filter(h => h && h !== note).slice(0, 2);
      if (extras.length) {
        ctx.fillStyle = "#475569";
        ctx.font = "600 15.5px Outfit, system-ui, sans-serif";
        extras.forEach(ex => {
          const line = `• ${ex.length > 42 ? ex.slice(0, 41) + "…" : ex}`;
          ctx.fillText(line, x + 22, sy + 6);
          sy += 23;
        });
      }
    });

    // Rodapé
    ctx.fillStyle = "#64748b";
    ctx.font = "600 18px Outfit, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${facts.projectTitle}  •  Resumo visual compartilhável (sem valores financeiros)`, padX, H - 34);
    ctx.textAlign = "right";
    ctx.fillStyle = theme.lightHeroEnd;
    ctx.font = "700 19px Outfit, system-ui, sans-serif";
    ctx.fillText("My Plan ✨", W - padX, H - 34);

    return canvas;
  }

  /* ========================================================================
     4. MODAL INTERATIVO, COMPARTILHAMENTO (WEB SHARE / WHATSAPP) & PDF
     ======================================================================== */
  function renderPreviewIntoModal() {
    if (!currentFacts || !currentCopy) return;
    const storyCanvas = renderStoryCanvas(currentFacts, currentCopy, activeTheme);
    const timelineCanvas = renderTimelineCanvas(currentFacts, currentCopy, activeTheme);

    const storyImg = document.getElementById("journeyStoryPreviewImg");
    const timelineImg = document.getElementById("journeyTimelinePreviewImg");
    if (storyImg) storyImg.src = storyCanvas.toDataURL("image/png");
    if (timelineImg) timelineImg.src = timelineCanvas.toDataURL("image/png");

    const aiBadge = document.getElementById("journeyAiSourceBadge");
    if (aiBadge) {
      aiBadge.textContent = currentUsedAi
        ? "✨ Texto exclusivo gerado com Gemini IA"
        : "✨ Resumo editorial pronto (configure Gemini IA nas Configurações para textos exclusivos)";
    }

    const dlg = document.getElementById("travelJourneyModal");
    if (dlg) {
      dlg._storyCanvas = storyCanvas;
      dlg._timelineCanvas = timelineCanvas;
    }
  }

  function downloadCanvasPng(canvas, filePrefix, toast) {
    if (!canvas) return;
    const safe = String(filePrefix || "Jornada_Viagem").replace(/[^\w\-]+/g, "_").slice(0, 48);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${safe}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast?.("🖼️ Imagem PNG de alta resolução baixada!");
  }

  async function shareJourneyVisual(canvas, facts, copy, toast) {
    const caption = copy?.shareCaption || `${copy?.headline || facts?.projectTitle} — ${facts?.totalDays || 1} dias, ${facts?.cities?.length || 1} cidades!`;
    try {
      if (canvas && navigator.share) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          const safe = String(facts?.projectTitle || "Jornada_Viagem").replace(/[^\w\-]+/g, "_").slice(0, 42);
          const file = new File([blob], `${safe}_Story.png`, { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: copy?.headline || facts?.projectTitle || "Jornada da Viagem",
              text: caption,
              files: [file]
            });
            return;
          }
        }
        await navigator.share({
          title: copy?.headline || facts?.projectTitle || "Jornada da Viagem",
          text: caption
        });
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    // Fallback Desktop / sem Web Share de arquivos: baixa a imagem + abre WhatsApp com legenda pronta
    if (canvas) downloadCanvasPng(canvas, `${facts?.projectTitle || "Jornada"}_Story_9x16`, null);
    window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank", "noopener");
    toast?.("📤 Imagem baixada e legenda aberta no WhatsApp para compartilhar!");
  }

  function printJourneyPdf(canvas, facts, copy, toast) {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) {
      toast?.("⚠️ Permita pop-ups para gerar o PDF da Jornada da Viagem.");
      return;
    }
    const docTitle = `${facts?.projectTitle || "My Plan"} — Jornada da Viagem`;
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${esc(docTitle)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { width: 100%; display: flex; justify-content: center; align-items: flex-start; }
  img { width: 100%; height: auto; max-height: 194mm; object-fit: contain; display: block; border-radius: 6px; }
</style>
</head>
<body>
  <div class="sheet"><img src="${dataUrl}" alt="${esc(docTitle)}"></div>
  <script>window.addEventListener("load", function () { setTimeout(function () { window.focus(); window.print(); }, 180); });</script>
</body>
</html>`);
    win.document.close();
  }

  function selectFormatTab(format) {
    activeFormat = format === "timeline" ? "timeline" : "story";
    const tabStory = document.getElementById("journeyTabStory");
    const tabTimeline = document.getElementById("journeyTabTimeline");
    const panelStory = document.getElementById("journeyPanelStory");
    const panelTimeline = document.getElementById("journeyPanelTimeline");
    if (tabStory) tabStory.setAttribute("aria-selected", String(activeFormat === "story"));
    if (tabTimeline) tabTimeline.setAttribute("aria-selected", String(activeFormat === "timeline"));
    if (panelStory) panelStory.hidden = activeFormat !== "story";
    if (panelTimeline) panelTimeline.hidden = activeFormat !== "timeline";
  }

  async function regenerateJourneyCopy(toast) {
    if (!currentFacts) return;
    const loadingEl = document.getElementById("journeyLoadingBar");
    const regenBtn = document.getElementById("btnJourneyRegenerate");
    // Renderiza fallback local instantaneamente para zero tela branca
    currentCopy = buildLocalJourneyCopy(currentFacts, activeTone);
    currentUsedAi = false;
    renderPreviewIntoModal();

    if (loadingEl) loadingEl.hidden = false;
    if (regenBtn) regenBtn.disabled = true;
    try {
      if (window.FeriasApi?.aiGenerateTravelJourney) {
        const res = await window.FeriasApi.aiGenerateTravelJourney(currentFacts, activeTone);
        if (res?.usedAi && res.journey) {
          currentCopy = res.journey;
          currentUsedAi = true;
          renderPreviewIntoModal();
        }
      }
    } catch {
      // Mantém versão local já renderizada sem erro
    } finally {
      if (loadingEl) loadingEl.hidden = true;
      if (regenBtn) regenBtn.disabled = false;
    }
  }

  function bindJourneyModalEvents(toast) {
    if (journeyEventsBound) return;
    journeyEventsBound = true;
    const dlg = document.getElementById("travelJourneyModal");
    if (!dlg) return;

    const closeBtn = document.getElementById("btnCloseJourneyModal");
    if (closeBtn) closeBtn.onclick = () => dlg.close();

    // Tabs acessíveis (setas esquerda/direita + clique)
    const tabList = document.getElementById("journeyFormatTablist");
    const tabs = tabList ? [...tabList.querySelectorAll('[role="tab"]')] : [];
    tabs.forEach((tab, idx) => {
      tab.onclick = () => selectFormatTab(tab.dataset.jfmt);
      tab.onkeydown = e => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const next = tabs[(idx + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
          next.focus();
          selectFormatTab(next.dataset.jfmt);
        }
      };
    });

    // Seletor de Tom
    dlg.querySelectorAll("[data-jtone]").forEach(btn => {
      btn.onclick = () => {
        activeTone = btn.dataset.jtone || "inspirador";
        dlg.querySelectorAll("[data-jtone]").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
        regenerateJourneyCopy(toast);
      };
    });

    // Seletor de Tema Visual
    dlg.querySelectorAll("[data-jtheme]").forEach(btn => {
      btn.onclick = () => {
        activeTheme = btn.dataset.jtheme || "aurora";
        dlg.querySelectorAll("[data-jtheme]").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
        renderPreviewIntoModal();
      };
    });

    const regenBtn = document.getElementById("btnJourneyRegenerate");
    if (regenBtn) regenBtn.onclick = () => regenerateJourneyCopy(toast);

    const dlStory = document.getElementById("btnJourneyDownloadStory");
    if (dlStory) dlStory.onclick = () => downloadCanvasPng(dlg._storyCanvas, `${currentFacts?.projectTitle || "Jornada"}_Story_9x16`, toast);

    const shStory = document.getElementById("btnJourneyShareStory");
    if (shStory) shStory.onclick = () => shareJourneyVisual(dlg._storyCanvas, currentFacts, currentCopy, toast);

    const dlTl = document.getElementById("btnJourneyDownloadTimeline");
    if (dlTl) dlTl.onclick = () => downloadCanvasPng(dlg._timelineCanvas, `${currentFacts?.projectTitle || "Jornada"}_Resumo`, toast);

    const pdfTl = document.getElementById("btnJourneyExportPdf");
    if (pdfTl) pdfTl.onclick = () => printJourneyPdf(dlg._timelineCanvas, currentFacts, currentCopy, toast);

    const waTl = document.getElementById("btnJourneyShareWa");
    if (waTl) {
      waTl.onclick = () => {
        const cap = currentCopy?.shareCaption || `${currentCopy?.headline || currentFacts?.projectTitle}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(cap)}`, "_blank", "noopener");
      };
    }
  }

  async function openModal({ state, activeTrip, toast }) {
    const dlg = document.getElementById("travelJourneyModal");
    if (!dlg) return;
    bindJourneyModalEvents(toast);
    currentFacts = collectJourneyFacts(state, activeTrip);
    selectFormatTab(activeFormat);
    dlg.querySelectorAll("[data-jtone]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.jtone === activeTone)));
    dlg.querySelectorAll("[data-jtheme]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.jtheme === activeTheme)));
    if (!dlg.open) dlg.showModal();
    await regenerateJourneyCopy(toast);
  }

  window.MyPlanJourney = {
    collectJourneyFacts,
    buildLocalJourneyCopy,
    renderStoryCanvas,
    renderTimelineCanvas,
    openModal
  };
})();
