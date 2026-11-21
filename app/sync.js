/* ===== Sincronização em Nuvem (VPS) — Férias Pro ===== */
(function () {
  const TOKEN_KEY = "ferias-pro-sync-token";
  const META_KEY = "ferias-pro-sync-meta";

  let status = "checking"; // checking | synced | syncing | auth_required | offline | local_only
  let serverAvailable = false;
  let requiresAuth = false;
  let serverRevision = 0;
  let serverUpdatedAt = 0;
  let listeners = [];
  let pollTimer = null;
  let pushTimer = null;

  function getToken() {
    return (localStorage.getItem(TOKEN_KEY) || "").trim();
  }

  function setToken(tok) {
    const clean = (tok || "").trim();
    if (clean) localStorage.setItem(TOKEN_KEY, clean);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function getMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY)) || { updatedAt: 0, dirty: false }; }
    catch { return { updatedAt: 0, dirty: false }; }
  }

  function setMeta(patch) {
    const cur = getMeta();
    localStorage.setItem(META_KEY, JSON.stringify(Object.assign(cur, patch)));
  }

  function notify() {
    const info = { status, serverAvailable, requiresAuth, serverRevision, serverUpdatedAt, localUpdatedAt: getMeta().updatedAt };
    listeners.forEach(fn => fn(info));
  }

  function onStatus(fn) {
    listeners.push(fn);
    notify();
  }

  function authHeaders() {
    const tok = getToken();
    const h = { "Content-Type": "application/json" };
    if (tok) h["X-Sync-Token"] = tok;
    return h;
  }

  async function checkHealth() {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) throw new Error("NOT_OK");
      const data = await res.json();
      if (!data || !data.ok) throw new Error("INVALID");
      serverAvailable = true;
      requiresAuth = Boolean(data.requiresAuth);
      serverRevision = data.revision || 0;
      serverUpdatedAt = data.updatedAt || 0;
      return data;
    } catch {
      serverAvailable = false;
      status = "local_only";
      notify();
      return null;
    }
  }

  async function pull() {
    const health = await checkHealth();
    if (!health) return { ok: false, reason: "local_only" };

    if (requiresAuth && !getToken()) {
      status = "auth_required";
      notify();
      return { ok: false, reason: "auth_required" };
    }

    try {
      const res = await fetch("/api/state", { headers: authHeaders(), cache: "no-store" });
      if (res.status === 401) {
        status = "auth_required";
        notify();
        return { ok: false, reason: "auth_required" };
      }
      if (!res.ok) throw new Error("HTTP_" + res.status);
      const data = await res.json();
      serverRevision = data.revision || 0;
      serverUpdatedAt = data.updatedAt || 0;
      status = "synced";
      notify();
      return { ok: true, data };
    } catch {
      status = "offline";
      notify();
      return { ok: false, reason: "offline" };
    }
  }

  async function push(stateObj, gmapsKey) {
    if (!serverAvailable) {
      const health = await checkHealth();
      if (!health) return { ok: false, reason: "local_only" };
    }
    if (requiresAuth && !getToken()) {
      status = "auth_required";
      notify();
      return { ok: false, reason: "auth_required" };
    }

    status = "syncing";
    notify();
    const meta = getMeta();
    const updatedAt = meta.updatedAt || Date.now();

    try {
      const res = await fetch("/api/state", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ updatedAt, state: stateObj, gmapsKey: gmapsKey || "" })
      });
      if (res.status === 401) {
        status = "auth_required";
        notify();
        return { ok: false, reason: "auth_required" };
      }
      if (!res.ok) throw new Error("HTTP_" + res.status);
      const data = await res.json();
      serverRevision = data.revision || serverRevision + 1;
      serverUpdatedAt = data.updatedAt || updatedAt;
      setMeta({ updatedAt: serverUpdatedAt, dirty: false });
      status = "synced";
      notify();
      return { ok: true, data };
    } catch {
      setMeta({ dirty: true });
      status = "offline";
      notify();
      return { ok: false, reason: "offline" };
    }
  }

  function schedulePush(getPayloadFn, delayMs = 450) {
    setMeta({ updatedAt: Date.now(), dirty: true });
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      const { stateObj, gmapsKey } = getPayloadFn();
      push(stateObj, gmapsKey);
    }, delayMs);
  }

  function startAutoPoll(onRemoteUpdate, getPayloadFn) {
    clearInterval(pollTimer);
    const runCheck = async () => {
      if (document.hidden) return;
      const meta = getMeta();
      const res = await pull();
      if (!res.ok) return;

      const d = res.data;
      if (d.empty) {
        // Servidor ainda vazio: envia estado atual automaticamente
        const { stateObj, gmapsKey } = getPayloadFn();
        await push(stateObj, gmapsKey);
        return;
      }

      if (meta.dirty && meta.updatedAt > (d.updatedAt || 0)) {
        const { stateObj, gmapsKey } = getPayloadFn();
        await push(stateObj, gmapsKey);
        return;
      }

      if ((d.updatedAt || 0) > (meta.updatedAt || 0) || !meta.updatedAt) {
        setMeta({ updatedAt: d.updatedAt, dirty: false });
        onRemoteUpdate(d.state, d.gmapsKey || "");
      }
    };

    runCheck();
    pollTimer = setInterval(runCheck, 12000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) runCheck(); });
    window.addEventListener("focus", runCheck);
    return runCheck;
  }

  window.FeriasSync = {
    getToken,
    setToken,
    getMeta,
    setMeta,
    onStatus,
    pull,
    push,
    schedulePush,
    startAutoPoll
  };
})();
