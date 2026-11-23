/* ===== Integração Google Maps Platform — My Plan ===== */
(function () {
  const KEY_STORAGE = "ferias-pro-gmaps-key";
  const ATTR_ID = "gmp_git_agentskills_v1";

  let loadedKey = null;
  let loadPromise = null;

  function getKey() {
    const stored = (localStorage.getItem(KEY_STORAGE) || "").trim();
    if (stored) return stored;
    const cfg = window.FERIAS_PRO_CONFIG && window.FERIAS_PRO_CONFIG.googleMapsApiKey;
    return (cfg || "").trim();
  }

  function hasKey() {
    return Boolean(getKey());
  }

  function setKey(newKey) {
    const clean = (newKey || "").trim();
    if (clean) localStorage.setItem(KEY_STORAGE, clean);
    else localStorage.removeItem(KEY_STORAGE);
    const needsReload = Boolean(loadedKey && loadedKey !== clean);
    return { saved: Boolean(clean), needsReload };
  }

  function installBootstrap(apiKey) {
    if (window.google?.maps?.importLibrary) return;
    ((g) => {
      var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window;
      b = b[c] || (b[c] = {});
      var d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams();
      var u = () => h || (h = new Promise(async (f, n) => {
        await (a = m.createElement("script"));
        e.set("libraries", [...r] + "");
        for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]);
        e.set("callback", c + ".maps." + q);
        a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
        d[q] = f;
        a.onerror = () => { h = null; loadPromise = null; n(new Error(p + " não pôde ser carregada.")); };
        a.nonce = m.querySelector("script[nonce]")?.nonce || "";
        m.head.append(a);
      }));
      d[l] ? console.warn(p + " already loaded.") : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
    })({
      key: apiKey,
      v: "weekly",
      language: "pt-BR",
      region: "BR"
    });
  }

  async function ensureLoaded() {
    const apiKey = getKey();
    if (!apiKey) throw new Error("NO_API_KEY");
    if (loadedKey && loadedKey !== apiKey) {
      throw new Error("KEY_CHANGED_RELOAD_REQUIRED");
    }
    if (!loadPromise) {
      loadedKey = apiKey;
      installBootstrap(apiKey);
      loadPromise = Promise.all([
        google.maps.importLibrary("core"),
        google.maps.importLibrary("routes"),
        google.maps.importLibrary("places")
      ]).catch(err => {
        loadPromise = null;
        throw err;
      });
    }
    await loadPromise;
    return google.maps;
  }

  function formatWaypointInput(textOrPlace) {
    if (!textOrPlace) return "";
    if (typeof textOrPlace !== "string") return textOrPlace;
    const t = textOrPlace.trim();
    if (!t) return "";
    if (/,|\bbrasil\b|\bbrazil\b/i.test(t)) return t;
    return `${t}, Brasil`;
  }

  function mapEmissionType(powertrain) {
    switch (powertrain) {
      case "BEV": return "ELECTRIC";
      case "PHEV":
      case "HEV": return "HYBRID";
      default: return "GASOLINE";
    }
  }

  function parseTollMoney(tollInfo, legs) {
    let info = tollInfo;
    if (!info && Array.isArray(legs)) {
      const legPrices = legs.flatMap(l => l.travelAdvisory?.tollInfo?.estimatedPrices || l.travelAdvisory?.tollInfo?.estimatedPrice || []);
      if (legPrices.length) info = { estimatedPrices: legPrices };
    }
    if (!info) return { hasTolls: false, tollKnown: true, tollCost: 0, currency: "BRL" };
    const prices = info.estimatedPrices || info.estimatedPrice || [];
    if (!prices.length) {
      return { hasTolls: true, tollKnown: false, tollCost: null, currency: "BRL" };
    }
    const norm = prices.map(p => (p && typeof p.toJSON === "function" ? p.toJSON() : p));
    const brl = norm.filter(p => (p.currencyCode || p.currency || "BRL") === "BRL");
    const list = brl.length ? brl : norm;
    let total = 0;
    let currency = "BRL";
    for (const p of list) {
      currency = p.currencyCode || p.currency || "BRL";
      total += Number(p.units || 0) + Number(p.nanos || 0) / 1e9;
    }
    return {
      hasTolls: true,
      tollKnown: true,
      tollCost: Math.round(total * 100) / 100,
      currency
    };
  }

  async function computeTripRoute({ origin, destination, intermediates = [], params = {}, vehicle = {}, travelMode = "DRIVING", transitPreference = null }) {
    await ensureLoaded();
    const { Route } = await google.maps.importLibrary("routes");

    if (travelMode === "TRANSIT") {
      const transitReq = {
        origin: formatWaypointInput(origin),
        destination: formatWaypointInput(destination),
        travelMode: "TRANSIT",
        language: "pt-BR",
        region: "br",
        fields: [
          "distanceMeters",
          "durationMillis",
          "staticDurationMillis",
          "description",
          "legs",
          "path",
          "viewport",
          "warnings"
        ],
        internalUsageAttributionIds: [ATTR_ID]
      };
      if (transitPreference) {
        transitReq.transitPreference = { allowedTravelModes: [transitPreference] };
      }
      try {
        const { routes } = await Route.computeRoutes(transitReq);
        if (routes && routes.length) {
          const route = routes[0];
          const km = Math.round((route.distanceMeters || 0) / 1000);
          const ms = route.durationMillis ?? route.staticDurationMillis ?? 0;
          return {
            km,
            driveMinutes: Math.round(ms / 60000),
            toll: { hasTolls: false, tollKnown: true, tollCost: 0, currency: "BRL" },
            description: route.description || "Transporte público / coletivo",
            warnings: route.warnings || [],
            travelModeUsed: "TRANSIT",
            route
          };
        }
      } catch {}
      // Fallback rodoviário caso trecho intermunicipal não possua grade GTFS no Google Transit
      const roadFallback = await computeTripRoute({ origin, destination, params: { ...params, avoidTolls: false }, vehicle, travelMode: "DRIVING" });
      roadFallback.travelModeUsed = "DRIVING_ESTIMATE";
      roadFallback.toll = { hasTolls: false, tollKnown: true, tollCost: 0, currency: "BRL" };
      return roadFallback;
    }

    const routeModifiers = {
      avoidTolls: Boolean(params.avoidTolls),
      avoidHighways: Boolean(params.avoidHighways),
      avoidFerries: Boolean(params.avoidFerries),
      vehicleInfo: { emissionType: mapEmissionType(vehicle.powertrain) }
    };
    if (params.tollPass && !params.avoidTolls) {
      routeModifiers.tollPasses = [params.tollPass];
    }

    const request = {
      origin: formatWaypointInput(origin),
      destination: formatWaypointInput(destination),
      travelMode: "DRIVING",
      routingPreference: params.trafficAware !== false ? "TRAFFIC_AWARE" : "TRAFFIC_UNAWARE",
      extraComputations: ["TOLLS"],
      routeModifiers,
      language: "pt-BR",
      region: "br",
      fields: [
        "distanceMeters",
        "durationMillis",
        "staticDurationMillis",
        "travelAdvisory",
        "description",
        "legs",
        "path",
        "viewport",
        "warnings"
      ],
      internalUsageAttributionIds: [ATTR_ID]
    };

    if (intermediates && intermediates.length) {
      request.intermediates = intermediates.map(wp => ({
        location: formatWaypointInput(wp)
      }));
    }

    const { routes } = await Route.computeRoutes(request);
    if (!routes || !routes.length) {
      throw new Error("Nenhuma rota encontrada entre origem e destino.");
    }

    const route = routes[0];
    const km = Math.round((route.distanceMeters || 0) / 1000);
    const ms = route.durationMillis ?? route.staticDurationMillis ?? 0;
    const driveMinutes = Math.round(ms / 60000);
    const toll = parseTollMoney(route.travelAdvisory?.tollInfo, route.legs);

    return {
      km,
      driveMinutes,
      toll,
      description: route.description || "",
      warnings: route.warnings || [],
      travelModeUsed: "DRIVING",
      route
    };
  }

  async function renderRouteOnMap(container, route, isDark) {
    if (!container || !route) return null;
    await ensureLoaded();
    const { Map, Polyline } = await google.maps.importLibrary("maps");
    await google.maps.importLibrary("marker");

    container.innerHTML = "";
    const mapDiv = document.createElement("div");
    mapDiv.style.width = "100%";
    mapDiv.style.height = "100%";
    container.appendChild(mapDiv);

    const scheme = isDark ? "DARK" : "LIGHT";
    const map = new Map(mapDiv, {
      mapId: "DEMO_MAP_ID",
      colorScheme: scheme,
      center: { lat: -15.79, lng: -47.88 },
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      internalUsageAttributionIds: [ATTR_ID]
    });

    const polylines = route.createPolylines ? route.createPolylines({ colorScheme: scheme }) : [];
    if (polylines.length) {
      polylines.forEach(p => p.setMap(map));
    } else if (route.path && route.path.length) {
      new Polyline({
        path: route.path,
        strokeColor: "#06b6d4",
        strokeWeight: 5,
        strokeOpacity: 0.9,
        map
      });
    }

    if (route.createWaypointAdvancedMarkers) {
      await route.createWaypointAdvancedMarkers({ map });
    }

    if (route.viewport) {
      map.fitBounds(route.viewport, 36);
    }
    return map;
  }

  function attachAutocomplete(inputEl, listEl, onSelect) {
    if (!inputEl || !listEl) return { getSelectedPlace: () => null, clearSelected: () => {} };
    let sessionToken = null;
    let selectedPlace = null;
    let selectedText = "";
    let debounceTimer = null;
    let latestReqId = 0;

    function closeList() {
      listEl.innerHTML = "";
      listEl.hidden = true;
    }

    inputEl.addEventListener("input", () => {
      if (inputEl.value.trim() !== selectedText) {
        selectedPlace = null;
      }
      clearTimeout(debounceTimer);
      const val = inputEl.value.trim();
      if (!hasKey() || val.length < 3) {
        closeList();
        return;
      }
      debounceTimer = setTimeout(async () => {
        const reqId = ++latestReqId;
        try {
          await ensureLoaded();
          const { AutocompleteSessionToken, AutocompleteSuggestion } = await google.maps.importLibrary("places");
          if (!sessionToken) sessionToken = new AutocompleteSessionToken();
          const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: val,
            sessionToken,
            language: "pt-BR",
            region: "br",
            internalUsageAttributionIds: [ATTR_ID]
          });
          if (reqId !== latestReqId) return;
          listEl.innerHTML = "";
          if (!suggestions || !suggestions.length) {
            closeList();
            return;
          }
          suggestions.slice(0, 5).forEach(s => {
            const pred = s.placePrediction;
            if (!pred) return;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ac-item";
            btn.textContent = pred.text.toString();
            btn.onmousedown = async (ev) => {
              ev.preventDefault();
              try {
                const place = pred.toPlace();
                await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
                sessionToken = new AutocompleteSessionToken();
                const display = place.displayName || pred.text.toString();
                inputEl.value = display;
                selectedPlace = place;
                selectedText = display.trim();
                closeList();
                if (onSelect) onSelect(place, display);
              } catch {
                inputEl.value = pred.text.toString();
                selectedPlace = null;
                closeList();
                if (onSelect) onSelect(null, inputEl.value);
              }
            };
            listEl.appendChild(btn);
          });
          listEl.hidden = !listEl.children.length;
        } catch {
          closeList();
        }
      }, 280);
    });

    inputEl.addEventListener("blur", () => {
      setTimeout(closeList, 160);
    });

    return {
      getSelectedPlace: () => (inputEl.value.trim() === selectedText ? selectedPlace : null),
      clearSelected: () => { selectedPlace = null; selectedText = ""; closeList(); }
    };
  }

  function buildLegUrl(from, to, mode = "driving") {
    if (!from || !to) return "https://www.google.com/maps";
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(formatWaypointInput(from))}&destination=${encodeURIComponent(formatWaypointInput(to))}&travelmode=${encodeURIComponent(mode)}`;
  }

  function buildFullRouteUrl(trips) {
    const pts = [];
    trips.forEach(a => {
      if (a.from && pts[pts.length - 1] !== a.from) pts.push(a.from);
      if (a.to && pts[pts.length - 1] !== a.to) pts.push(a.to);
    });
    if (pts.length < 2) return null;
    // Google Maps URL supports up to ~10 waypoints cleanly in /dir/ path
    return "https://www.google.com/maps/dir/" + pts.slice(0, 12).map(p => encodeURIComponent(formatWaypointInput(p))).join("/");
  }

  async function testApiKey(keyOverride) {
    if (keyOverride !== undefined) setKey(keyOverride);
    await ensureLoaded();
    return computeTripRoute({
      origin: "São Paulo, SP",
      destination: "Campinas, SP",
      params: { trafficAware: false },
      vehicle: { powertrain: "HYBRID" }
    });
  }

  window.FeriasMaps = {
    getKey,
    hasKey,
    setKey,
    ensureLoaded,
    computeTripRoute,
    renderRouteOnMap,
    attachAutocomplete,
    buildLegUrl,
    buildFullRouteUrl,
    testApiKey
  };
})();
