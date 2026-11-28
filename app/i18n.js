/* ==========================================================================
   My Plan — Global Internationalization (i18n) & Localization (l10n) Engine
   7 Official Languages: pt-BR, en-US (default fallback), es, fr, it, de, zh-CN
   Modular JSON Dictionaries (/locales/<lang>.json), Intl Formatters,
   Regional Business Rules (BR Military Module & Pix vs. Global Payments)
   ========================================================================== */
(() => {
  const ASSET_VER = "70";
  const STORAGE_LANG_KEY = "myplan-lang";
  const STORAGE_FIRST_DAY_KEY = "myplan-first-day"; // "auto" | "0" | "1"
  const STORAGE_MILITARY_KEY = "myplan-br-military"; // "true" | "false"
  const DICT_CACHE_PREFIX = `myplan-dict-v${ASSET_VER}-`;

  const SUPPORTED_LOCALES = [
    { code: "pt-BR", nativeName: "Português", fullName: "Português (Brasil)", shortCode: "PT", defaultCurrency: "BRL", defaultFirstDay: 0 },
    { code: "en-US", nativeName: "English", fullName: "English", shortCode: "EN", defaultCurrency: "USD", defaultFirstDay: 0 },
    { code: "es",    nativeName: "Español", fullName: "Español", shortCode: "ES", defaultCurrency: "EUR", defaultFirstDay: 1 },
    { code: "fr",    nativeName: "Français", fullName: "Français", shortCode: "FR", defaultCurrency: "EUR", defaultFirstDay: 1 },
    { code: "it",    nativeName: "Italiano", fullName: "Italiano", shortCode: "IT", defaultCurrency: "EUR", defaultFirstDay: 1 },
    { code: "de",    nativeName: "Deutsch", fullName: "Deutsch", shortCode: "DE", defaultCurrency: "EUR", defaultFirstDay: 1 },
    { code: "zh-CN", nativeName: "中文 (简体)", fullName: "中文 (简体)", shortCode: "中文", defaultCurrency: "CNY", defaultFirstDay: 1 }
  ];

  const LOCALE_MAP = new Map(SUPPORTED_LOCALES.map(l => [l.code, l]));

  const SUPPORTED_CURRENCIES = [
    { code: "BRL", symbol: "R$", label: "BRL (R$) — Real Brasileiro" },
    { code: "USD", symbol: "$",  label: "USD ($) — US Dollar" },
    { code: "EUR", symbol: "€",  label: "EUR (€) — Euro" },
    { code: "CNY", symbol: "¥",  label: "CNY (¥) — Renminbi (人民币)" },
    { code: "GBP", symbol: "£",  label: "GBP (£) — British Pound" },
    { code: "CHF", symbol: "CHF", label: "CHF — Swiss Franc" },
    { code: "JPY", symbol: "¥",  label: "JPY (¥) — Japanese Yen" },
    { code: "CAD", symbol: "CA$", label: "CAD (CA$) — Canadian Dollar" },
    { code: "AUD", symbol: "A$", label: "AUD (A$) — Australian Dollar" },
    { code: "ARS", symbol: "ARS$", label: "ARS ($) — Peso Argentino" },
    { code: "MXN", symbol: "MX$", label: "MXN ($) — Peso Mexicano" }
  ];

  const CURRENCY_MAP = new Map(SUPPORTED_CURRENCIES.map(c => [c.code, c]));

  // Estado interno
  const dicts = new Map(); // code -> parsed JSON
  const pendingLoads = new Map();
  const listeners = new Set();
  const mountedButtons = new Set();
  let currentLang = "en-US";
  let projectCurrencyProvider = null; // () => "EUR" | ""
  let firstDayPref = "auto"; // "auto" | "0" | "1"
  let militaryPref = true;   // apenas efetivo quando currentLang === "pt-BR"
  let activePopover = null;
  let activePopoverAnchor = null;

  /* ---------- Normalização & Detecção Automática (NUNCA IP) ---------- */
  function normalizeLocale(raw) {
    const s = String(raw || "").trim().toLowerCase().replace(/_/g, "-");
    if (!s) return null;
    if (s === "pt" || s.startsWith("pt-")) return "pt-BR";
    if (s === "en" || s.startsWith("en-")) return "en-US";
    if (s === "es" || s.startsWith("es-")) return "es";
    if (s === "fr" || s.startsWith("fr-")) return "fr";
    if (s === "it" || s.startsWith("it-")) return "it";
    if (s === "de" || s.startsWith("de-")) return "de";
    if (s === "zh" || s.startsWith("zh-")) return "zh-CN";
    return null;
  }

  function detectInitialLocale(savedUserLang) {
    // 1. Preferência manual salva pelo usuário (DB ou localStorage)
    const fromUser = normalizeLocale(savedUserLang);
    if (fromUser) return fromUser;
    try {
      const fromStorage = normalizeLocale(localStorage.getItem(STORAGE_LANG_KEY));
      if (fromStorage) return fromStorage;
    } catch {}

    // 2. Idioma do navegador / sistema operacional (navigator.languages / navigator.language)
    const navList = [];
    if (typeof navigator !== "undefined") {
      if (Array.isArray(navigator.languages)) navList.push(...navigator.languages);
      if (navigator.language) navList.push(navigator.language);
    }
    for (const candidate of navList) {
      const mapped = normalizeLocale(candidate);
      if (mapped) return mapped;
    }

    // 3. Fallback global padrão: Inglês (en-US)
    return "en-US";
  }

  function loadStoredPrefs() {
    try {
      const fd = localStorage.getItem(STORAGE_FIRST_DAY_KEY);
      if (fd === "0" || fd === "1" || fd === "auto") firstDayPref = fd;
      const mil = localStorage.getItem(STORAGE_MILITARY_KEY);
      if (mil === "false") militaryPref = false;
      else if (mil === "true") militaryPref = true;
    } catch {}
  }

  function readCachedDict(code) {
    try {
      const raw = localStorage.getItem(DICT_CACHE_PREFIX + code);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeCachedDict(code, obj) {
    try {
      localStorage.setItem(DICT_CACHE_PREFIX + code, JSON.stringify(obj));
    } catch {}
  }

  async function loadLocale(code) {
    const clean = normalizeLocale(code) || "en-US";
    if (dicts.has(clean)) return dicts.get(clean);
    if (pendingLoads.has(clean)) return pendingLoads.get(clean);
    const p = fetch(`/locales/${clean}.json?v=${ASSET_VER}`, { cache: "no-cache" })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (json && typeof json === "object") {
          dicts.set(clean, json);
          writeCachedDict(clean, json);
        }
        pendingLoads.delete(clean);
        return json;
      })
      .catch(() => {
        pendingLoads.delete(clean);
        return dicts.get(clean) || null;
      });
    pendingLoads.set(clean, p);
    return p;
  }

  function getNested(obj, path) {
    if (!obj || !path) return undefined;
    const parts = String(path).split(".");
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = cur[parts[i]];
    }
    return typeof cur === "string" ? cur : undefined;
  }

  function interpolate(str, vars) {
    if (!vars || typeof vars !== "object") return str;
    return String(str).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : `{${k}}`));
  }

  function t(key, vars, fallbackText) {
    const active = dicts.get(currentLang);
    let val = getNested(active, key);
    if (val === undefined) {
      const en = dicts.get("en-US");
      val = getNested(en, key);
    }
    if (val === undefined) {
      const pt = dicts.get("pt-BR");
      val = getNested(pt, key);
    }
    if (val === undefined) {
      val = fallbackText !== undefined ? String(fallbackText) : String(key);
    }
    return interpolate(val, vars);
  }

  function getLocaleInfo(code = currentLang) {
    return LOCALE_MAP.get(normalizeLocale(code) || "en-US") || SUPPORTED_LOCALES[1];
  }

  function getLang() {
    return currentLang;
  }

  /* ---------- Regras Regionais ---------- */
  function isBrazilianMilitaryEnabled() {
    // Regra absoluta: Módulo Militar Brasileiro existe EXCLUSIVAMENTE em pt-BR
    if (currentLang !== "pt-BR") return false;
    return militaryPref !== false;
  }

  function getDefaultCurrency(code = currentLang) {
    return getLocaleInfo(code).defaultCurrency || "USD";
  }

  function setProjectCurrencyProvider(fn) {
    projectCurrencyProvider = typeof fn === "function" ? fn : null;
  }

  function normalizeCurrency(code) {
    const c = String(code || "").trim().toUpperCase();
    return CURRENCY_MAP.has(c) ? c : "";
  }

  function getActiveCurrency(explicitOverride) {
    const exp = normalizeCurrency(explicitOverride);
    if (exp) return exp;
    if (projectCurrencyProvider) {
      try {
        const provided = normalizeCurrency(projectCurrencyProvider());
        if (provided) return provided;
      } catch {}
    }
    return getDefaultCurrency(currentLang);
  }

  function getCurrencySymbol(currencyCode) {
    const code = getActiveCurrency(currencyCode);
    const meta = CURRENCY_MAP.get(code);
    if (meta) return meta.symbol;
    try {
      const parts = new Intl.NumberFormat(currentLang, { style: "currency", currency: code }).formatToParts(0);
      const sym = parts.find(p => p.type === "currency")?.value;
      if (sym) return sym;
    } catch {}
    return code;
  }

  function isPixEnabled(currencyOpt) {
    const cur = getActiveCurrency(currencyOpt);
    return currentLang === "pt-BR" || cur === "BRL";
  }

  function getFirstDayOfWeek() {
    if (firstDayPref === "0") return 0;
    if (firstDayPref === "1") return 1;
    return getLocaleInfo(currentLang).defaultFirstDay;
  }

  function getFirstDayPref() {
    return firstDayPref;
  }

  /* ---------- Formatadores Intl (Datas, Números, Moedas) ---------- */
  const monthCache = new Map();
  function getMonthNames(style = "short", langCode = currentLang) {
    const key = `${langCode}:${style}`;
    if (monthCache.has(key)) return monthCache.get(key).slice();
    const out = [];
    try {
      const fmt = new Intl.DateTimeFormat(langCode, { month: style, timeZone: "UTC" });
      for (let m = 0; m < 12; m++) {
        let s = fmt.format(new Date(Date.UTC(2026, m, 15)));
        if (style === "short" && langCode !== "zh-CN") {
          s = s.replace(/\.$/, "");
        }
        out.push(s);
      }
    } catch {
      const fb = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      out.push(...fb);
    }
    monthCache.set(key, out);
    return out.slice();
  }

  function getMonthNamesUpper(langCode = currentLang) {
    const list = getMonthNames("short", langCode);
    if (langCode === "zh-CN") return list;
    return list.map(m => m.toUpperCase());
  }

  const weekdayCache = new Map();
  function getWeekdayNames(style = "short", langCode = currentLang) {
    const key = `${langCode}:${style}`;
    if (weekdayCache.has(key)) return weekdayCache.get(key).slice();
    const out = [];
    try {
      const fmt = new Intl.DateTimeFormat(langCode, { weekday: style, timeZone: "UTC" });
      // 2026-01-04 é Domingo (day 0)
      for (let d = 0; d < 7; d++) {
        let s = fmt.format(new Date(Date.UTC(2026, 0, 4 + d)));
        if (style === "short" && langCode !== "zh-CN") {
          s = s.replace(/\.$/, "");
        }
        out.push(s);
      }
    } catch {
      out.push("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat");
    }
    weekdayCache.set(key, out);
    return out.slice();
  }

  function parseIsoParts(iso) {
    if (!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso).trim());
    if (!m) return null;
    return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatDate(iso, langCode = currentLang) {
    const p = parseIsoParts(iso);
    if (!p) return iso ? String(iso) : "—";
    if (langCode === "en-US") return `${pad2(p.mo)}/${pad2(p.d)}/${p.y}`;
    if (langCode === "de") return `${pad2(p.d)}.${pad2(p.mo)}.${p.y}`;
    if (langCode === "zh-CN") return `${p.y}/${pad2(p.mo)}/${pad2(p.d)}`;
    return `${pad2(p.d)}/${pad2(p.mo)}/${p.y}`;
  }

  function formatShortDate(iso, langCode = currentLang) {
    const p = parseIsoParts(iso);
    if (!p) return "";
    if (langCode === "en-US") return `${pad2(p.mo)}/${pad2(p.d)}`;
    if (langCode === "de") return `${pad2(p.d)}.${pad2(p.mo)}`;
    if (langCode === "zh-CN") return `${p.mo}/${p.d}`;
    return `${pad2(p.d)}/${pad2(p.mo)}`;
  }

  function formatEditorialDate(iso, langCode = currentLang) {
    const p = parseIsoParts(iso);
    if (!p) return "";
    const yy = String(p.y).slice(-2);
    const mon = getMonthNames("short", langCode)[p.mo - 1] || pad2(p.mo);
    if (langCode === "zh-CN") return `${p.y}年${p.mo}月${p.d}日`;
    if (langCode === "en-US") return `${mon} ${p.d}, ${yy}`;
    if (langCode === "de") return `${pad2(p.d)}. ${mon} ${yy}`;
    return `${pad2(p.d)}/${mon.toLowerCase()}/${yy}`;
  }

  function formatMonthDay(iso, langCode = currentLang) {
    const p = parseIsoParts(iso);
    if (!p) return "";
    const mon = getMonthNames("short", langCode)[p.mo - 1] || pad2(p.mo);
    if (langCode === "zh-CN") return `${p.mo}月${p.d}日`;
    if (langCode === "en-US") return `${mon} ${p.d}`;
    if (langCode === "de") return `${pad2(p.d)}. ${mon}`;
    return `${pad2(p.d)} ${mon}`;
  }

  function formatNumber(value, decimals = 1, langCode = currentLang) {
    const n = Number(value) || 0;
    try {
      return new Intl.NumberFormat(langCode, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(n);
    } catch {
      return n.toFixed(decimals);
    }
  }

  function formatMoney(value, currencyOpt, langCode = currentLang) {
    const n = Number(value) || 0;
    const currency = getActiveCurrency(currencyOpt);
    try {
      return new Intl.NumberFormat(langCode, {
        style: "currency",
        currency,
        minimumFractionDigits: currency === "JPY" ? 0 : 2,
        maximumFractionDigits: currency === "JPY" ? 0 : 2
      }).format(n);
    } catch {
      const sym = getCurrencySymbol(currency);
      return `${sym} ${formatNumber(n, 2, langCode)}`;
    }
  }

  function formatCents(cents, currencyOpt, langCode = currentLang) {
    const c = Math.round(Number(cents) || 0);
    return formatMoney(c / 100, currencyOpt, langCode);
  }

  function getCanvasFontFamily() {
    if (currentLang === "zh-CN") {
      return '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", Outfit, system-ui, sans-serif';
    }
    return 'Outfit, system-ui, -apple-system, "Segoe UI", sans-serif';
  }

  /* ---------- Aplicação no DOM & Atributos HTML ---------- */
  function syncDocumentAttributes() {
    if (typeof document === "undefined") return;
    document.documentElement.lang = currentLang;
    document.documentElement.dataset.lang = currentLang;
    document.documentElement.dataset.brMilitary = isBrazilianMilitaryEnabled() ? "true" : "false";
    document.documentElement.dataset.pixEnabled = isPixEnabled() ? "true" : "false";
  }

  function applyDomTranslations(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    syncDocumentAttributes();

    const docTitleEl = document.querySelector("[data-i18n-doc-title]");
    if (docTitleEl) {
      const key = docTitleEl.getAttribute("data-i18n-doc-title");
      if (key) document.title = t(key, null, document.title);
    }

    root.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const val = t(key, null, null);
      if (val && val !== key) el.textContent = val;
    });

    root.querySelectorAll("[data-i18n-html]").forEach(el => {
      const key = el.getAttribute("data-i18n-html");
      if (!key) return;
      const val = t(key, null, null);
      if (val && val !== key) el.innerHTML = val;
    });

    root.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      const val = t(key, null, null);
      if (val && val !== key) el.setAttribute("placeholder", val);
    });

    root.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      if (!key) return;
      const val = t(key, null, null);
      if (val && val !== key) el.setAttribute("title", val);
    });

    root.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
      const key = el.getAttribute("data-i18n-aria-label");
      if (!key) return;
      const val = t(key, null, null);
      if (val && val !== key) el.setAttribute("aria-label", val);
    });

    updateMountedButtons();
  }

  /* ---------- Notificação & Mudança de Idioma Sem Reload ---------- */
  function notifyChange(reason = "lang") {
    syncDocumentAttributes();
    applyDomTranslations(document);
    listeners.forEach(fn => {
      try { fn({ lang: currentLang, reason, locale: getLocaleInfo(currentLang) }); } catch {}
    });
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("myplan:langchange", {
          detail: { lang: currentLang, reason, locale: getLocaleInfo(currentLang) }
        }));
      } catch {}
    }
  }

  function onChange(fn) {
    if (typeof fn === "function") listeners.add(fn);
    return () => listeners.delete(fn);
  }

  async function setLang(nextCode, opts = {}) {
    const clean = normalizeLocale(nextCode) || "en-US";
    const changed = clean !== currentLang;
    currentLang = clean;

    if (opts.persist !== false) {
      try { localStorage.setItem(STORAGE_LANG_KEY, clean); } catch {}
      if (!opts.skipServer && window.FeriasApi?.isServer?.() && window.FeriasApi?.getUser?.() && typeof window.FeriasApi?.saveI18nPreferences === "function") {
        window.FeriasApi.saveI18nPreferences({ lang: clean }).catch(() => {});
      }
    }

    await Promise.all([
      loadLocale("en-US"),
      loadLocale(clean)
    ]);

    notifyChange(changed ? "lang" : "refresh");
    return clean;
  }

  function setFirstDayPref(val, opts = {}) {
    const clean = (val === "0" || val === "1" || val === "auto") ? val : "auto";
    firstDayPref = clean;
    if (opts.persist !== false) {
      try { localStorage.setItem(STORAGE_FIRST_DAY_KEY, clean); } catch {}
      if (!opts.skipServer && window.FeriasApi?.isServer?.() && window.FeriasApi?.getUser?.() && typeof window.FeriasApi?.saveI18nPreferences === "function") {
        window.FeriasApi.saveI18nPreferences({ firstDayOfWeek: clean }).catch(() => {});
      }
    }
    notifyChange("firstDay");
  }

  function setMilitaryPref(enabled, opts = {}) {
    militaryPref = enabled !== false;
    if (opts.persist !== false) {
      try { localStorage.setItem(STORAGE_MILITARY_KEY, militaryPref ? "true" : "false"); } catch {}
      if (!opts.skipServer && window.FeriasApi?.isServer?.() && window.FeriasApi?.getUser?.() && typeof window.FeriasApi?.saveI18nPreferences === "function") {
        window.FeriasApi.saveI18nPreferences({ militaryProfile: militaryPref }).catch(() => {});
      }
    }
    notifyChange("military");
  }

  async function hydrateFromUser(user) {
    const prefs = user?.i18n;
    if (!prefs || typeof prefs !== "object") return;
    if (prefs.firstDayOfWeek === "0" || prefs.firstDayOfWeek === "1" || prefs.firstDayOfWeek === "auto") {
      firstDayPref = prefs.firstDayOfWeek;
      try { localStorage.setItem(STORAGE_FIRST_DAY_KEY, firstDayPref); } catch {}
    }
    if (typeof prefs.militaryProfile === "boolean") {
      militaryPref = prefs.militaryProfile;
      try { localStorage.setItem(STORAGE_MILITARY_KEY, militaryPref ? "true" : "false"); } catch {}
    }
    const saved = normalizeLocale(prefs.lang);
    if (saved && saved !== currentLang) {
      await setLang(saved, { persist: true, skipServer: true });
    } else {
      notifyChange("hydrate");
    }
  }

  /* ---------- Componente Seletor de Idioma (Popover Flutuante) ---------- */
  function updateMountedButtons() {
    const info = getLocaleInfo(currentLang);
    mountedButtons.forEach(btn => {
      if (!btn || !btn.isConnected) return;
      const codeEl = btn.querySelector("[data-lang-code]");
      if (codeEl) codeEl.textContent = info.shortCode;
      else {
        const text = `🌐 ${info.shortCode}`;
        if (!btn.querySelector("span")) btn.textContent = text;
      }
      const nativeEl = btn.querySelector("[data-lang-native]");
      if (nativeEl) nativeEl.textContent = info.nativeName;
      btn.setAttribute("title", `${t("common.changeLanguage", null, "Change Language")} (${info.nativeName})`);
      btn.setAttribute("aria-label", `${t("common.language", null, "Language")}: ${info.nativeName}`);
    });
  }

  function closeLanguageMenu() {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }
    if (activePopoverAnchor) {
      activePopoverAnchor.setAttribute("aria-expanded", "false");
      activePopoverAnchor = null;
    }
  }

  function openLanguageMenu(anchorEl, onPicked) {
    if (!anchorEl) return;
    if (activePopover && activePopoverAnchor === anchorEl) {
      closeLanguageMenu();
      return;
    }
    closeLanguageMenu();

    const pop = document.createElement("div");
    pop.className = "i18n-lang-popover";
    pop.setAttribute("role", "menu");
    pop.setAttribute("aria-label", t("common.changeLanguage", null, "Change Language"));

    SUPPORTED_LOCALES.forEach(loc => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "i18n-lang-option" + (loc.code === currentLang ? " is-active" : "");
      btn.setAttribute("role", "menuitemradio");
      btn.setAttribute("aria-checked", loc.code === currentLang ? "true" : "false");
      btn.dataset.langPick = loc.code;

      const codeSpan = document.createElement("span");
      codeSpan.className = "i18n-lang-code";
      codeSpan.textContent = loc.shortCode;

      const nameSpan = document.createElement("span");
      nameSpan.className = "i18n-lang-native";
      nameSpan.textContent = loc.nativeName;

      const checkSpan = document.createElement("span");
      checkSpan.className = "i18n-lang-check";
      checkSpan.setAttribute("aria-hidden", "true");
      checkSpan.textContent = loc.code === currentLang ? "✓" : "";

      btn.append(codeSpan, nameSpan, checkSpan);
      btn.onclick = async (ev) => {
        ev.stopPropagation();
        closeLanguageMenu();
        await setLang(loc.code, { persist: true });
        if (typeof onPicked === "function") onPicked(loc);
      };
      pop.appendChild(btn);
    });

    document.body.appendChild(pop);
    activePopover = pop;
    activePopoverAnchor = anchorEl;
    anchorEl.setAttribute("aria-expanded", "true");

    // Posicionamento seguro dentro da viewport
    const rect = anchorEl.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.right - popRect.width;
    if (left < 10) left = Math.max(10, rect.left);
    if (left + popRect.width > vw - 10) left = Math.max(10, vw - popRect.width - 10);
    let top = rect.bottom + 8;
    if (top + popRect.height > vh - 10) {
      top = Math.max(10, rect.top - popRect.height - 8);
    }
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(top)}px`;

    requestAnimationFrame(() => {
      const firstActive = pop.querySelector(".is-active") || pop.querySelector("button");
      if (firstActive) firstActive.focus({ preventScroll: true });
    });
  }

  function mountLanguageButton(btn, onPicked) {
    if (!btn || btn.dataset.i18nLangMounted) return;
    btn.dataset.i18nLangMounted = "1";
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    mountedButtons.add(btn);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLanguageMenu(btn, onPicked);
    });
    updateMountedButtons();
  }

  // Fechar popover ao clicar fora ou pressionar Escape
  if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", (e) => {
      if (!activePopover) return;
      if (activePopover.contains(e.target)) return;
      if (activePopoverAnchor && activePopoverAnchor.contains(e.target)) return;
      closeLanguageMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && activePopover) {
        const anchor = activePopoverAnchor;
        closeLanguageMenu();
        anchor?.focus?.();
      }
    });
    window.addEventListener("resize", () => { if (activePopover) closeLanguageMenu(); }, { passive: true });
  }

  /* ---------- Inicialização ---------- */
  loadStoredPrefs();
  currentLang = detectInitialLocale();

  // Reidrata cache síncrono se já estiver no localStorage (evita flash de texto)
  ["en-US", "pt-BR", currentLang].forEach(c => {
    const cached = readCachedDict(c);
    if (cached) dicts.set(c, cached);
  });

  syncDocumentAttributes();

  const readyPromise = Promise.all([
    loadLocale("en-US"),
    loadLocale(currentLang)
  ]).then(() => {
    notifyChange("init");
    return currentLang;
  });

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        applyDomTranslations(document);
        document.querySelectorAll("[data-i18n-lang-btn]").forEach(b => mountLanguageButton(b));
      });
    } else {
      applyDomTranslations(document);
      document.querySelectorAll("[data-i18n-lang-btn]").forEach(b => mountLanguageButton(b));
    }
  }

  window.MyPlanI18n = {
    SUPPORTED_LOCALES,
    SUPPORTED_CURRENCIES,
    ready: readyPromise,
    normalizeLocale,
    detectInitialLocale,
    getLang,
    getLocaleInfo,
    setLang,
    t,
    applyDomTranslations,
    onChange,
    hydrateFromUser,
    // Regional rules & currency
    isBrazilianMilitaryEnabled,
    setMilitaryPref,
    getMilitaryPref: () => militaryPref,
    isPixEnabled,
    getDefaultCurrency,
    setProjectCurrencyProvider,
    getActiveCurrency,
    normalizeCurrency,
    getCurrencySymbol,
    getFirstDayOfWeek,
    getFirstDayPref,
    setFirstDayPref,
    // Formatters
    getMonthNames,
    getMonthNamesUpper,
    getWeekdayNames,
    formatDate,
    formatShortDate,
    formatEditorialDate,
    formatMonthDay,
    formatNumber,
    formatMoney,
    formatCents,
    getCanvasFontFamily,
    // UI Switcher
    mountLanguageButton,
    openLanguageMenu,
    closeLanguageMenu
  };
})();
