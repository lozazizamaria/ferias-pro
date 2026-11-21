/* ===== Cliente API (Auth, Multi-Viagens, Compartilhamento, Anexos e Sync) — Férias Pro ===== */
(function () {
  const ACTIVE_TRIP_KEY = "ferias-pro-active-trip";
  const LOCAL_TRIPS_KEY = "ferias-pro-local-trips-v2";

  let serverAvailable = false;
  let serverCaps = { hasGemini: false, hasMaps: false, hasWallet: false };
  let googleClientId = "";
  let currentUser = null;
  let status = "checking"; // checking | synced | syncing | unauth | offline | local_only
  let currentRevision = 0;
  let currentUpdatedAt = 0;
  let pollTimer = null;
  let pushTimer = null;
  let listeners = [];

  function notify() {
    const info = { status, serverAvailable, googleClientId, currentUser, currentRevision, currentUpdatedAt };
    listeners.forEach(fn => fn(info));
  }

  function onStatus(fn) {
    listeners.push(fn);
    notify();
  }

  async function req(url, opts = {}) {
    const res = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...opts,
      headers: {
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...(opts.headers || {})
      }
    });
    let data = null;
    try { data = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, data };
  }

  async function initServer() {
    try {
      const r = await req("/api/auth/config");
      if (!r.ok || !r.data?.ok) throw new Error("NO_SERVER");
      serverAvailable = true;
      googleClientId = r.data.googleClientId || "";
      serverCaps = {
        hasGemini: Boolean(r.data.hasGemini),
        hasMaps: Boolean(r.data.hasMaps),
        hasWallet: Boolean(r.data.hasWallet),
        hasEmailSender: Boolean(r.data.hasEmailSender)
      };
      const me = await req("/api/auth/me");
      if (me.ok && me.data?.user) {
        currentUser = me.data.user;
        status = "synced";
      } else {
        currentUser = null;
        status = "unauth";
      }
      notify();
      return { serverAvailable: true, googleClientId, user: currentUser, caps: serverCaps };
    } catch {
      serverAvailable = false;
      status = "local_only";
      notify();
      return { serverAvailable: false, googleClientId: "", user: null };
    }
  }

  async function login(email, password) {
    const r = await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if (!r.ok) throw new Error(r.data?.error || "Falha ao entrar.");
    currentUser = r.data.user;
    status = "synced";
    notify();
    return r.data;
  }

  async function register(name, email, password) {
    const r = await req("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
    if (!r.ok) throw new Error(r.data?.error || "Falha ao cadastrar.");
    currentUser = r.data.user;
    status = "synced";
    notify();
    return r.data;
  }

  async function loginGoogle(credential) {
    const r = await req("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) });
    if (!r.ok) throw new Error(r.data?.error || "Falha no login Google.");
    currentUser = r.data.user;
    status = "synced";
    notify();
    return r.data;
  }

  async function changePassword(payload) {
    if (!serverAvailable) throw new Error("Alteração de senha requer servidor online.");
    const r = await req("/api/auth/password", { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(r.data?.error || "Falha ao atualizar a senha.");
    currentUser = r.data.user;
    notify();
    return r.data;
  }

  async function forgotPassword(email) {
    if (!serverAvailable) throw new Error("Recuperação de senha requer servidor online.");
    const r = await req("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    if (!r.ok) throw new Error(r.data?.error || "Falha ao enviar e-mail de redefinição.");
    return r.data;
  }

  async function validateResetToken(token) {
    if (!serverAvailable) throw new Error("Servidor offline.");
    const r = await req(`/api/auth/reset-password/validate?token=${encodeURIComponent(token || "")}`);
    if (!r.ok) throw new Error(r.data?.error || "Link de redefinição inválido ou expirado.");
    return r.data;
  }

  async function resetPassword(token, newPassword, confirmPassword) {
    if (!serverAvailable) throw new Error("Servidor offline.");
    const r = await req("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword, confirmPassword })
    });
    if (!r.ok) throw new Error(r.data?.error || "Falha ao redefinir a senha.");
    currentUser = r.data.user;
    status = "synced";
    notify();
    return r.data;
  }

  /* ---------- Admin ---------- */
  async function adminOverview() {
    if (!serverAvailable) throw new Error("Servidor offline.");
    const r = await req("/api/admin/overview");
    if (!r.ok) throw new Error(r.data?.error || "Sem permissão de administrador.");
    return r.data;
  }

  async function adminGetUser(userId) {
    if (!serverAvailable) throw new Error("Servidor offline.");
    const r = await req(`/api/admin/users/${encodeURIComponent(userId)}`);
    if (!r.ok) throw new Error(r.data?.error || "Erro ao carregar detalhes do usuário.");
    return r.data;
  }

  async function adminDeleteUser(userId) {
    if (!serverAvailable) throw new Error("Servidor offline.");
    const r = await req(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao excluir usuário.");
    return r.data;
  }

  async function adminSetDelegate(email, action = "add") {
    if (!serverAvailable) throw new Error("Servidor offline.");
    const r = await req("/api/admin/delegates", { method: "POST", body: JSON.stringify({ email, action }) });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao atualizar administradores.");
    return r.data;
  }

  async function adminSeedDemo() {
    if (!serverAvailable) throw new Error("Servidor offline.");
    const r = await req("/api/admin/seed-demo", { method: "POST" });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao gerar usuário fictício.");
    return r.data;
  }

  async function logout() {
    if (serverAvailable) await req("/api/auth/logout", { method: "POST" }).catch(() => {});
    currentUser = null;
    status = serverAvailable ? "unauth" : "local_only";
    clearInterval(pollTimer);
    notify();
  }

  /* ---------- Viagens ---------- */
  async function listTrips() {
    if (!serverAvailable) return loadLocalTripsIndex();
    const r = await req("/api/trips");
    if (!r.ok) throw new Error(r.data?.error || "Erro ao listar férias.");
    return r.data;
  }

  async function getCrossings() {
    if (!serverAvailable) return { ok: true, trips: [] };
    const r = await req("/api/crossings");
    if (!r.ok) throw new Error(r.data?.error || "Erro ao carregar viagens para cruzamento.");
    return r.data;
  }

  async function createTrip(name, data, gmapsKey = "") {
    if (!serverAvailable) {
      const store = getLocalStore();
      const id = "local_" + Math.random().toString(36).slice(2, 10);
      store[id] = { id, name, role: "owner", updatedAt: Date.now(), revision: 1, data, gmapsKey };
      saveLocalStore(store);
      return store[id];
    }
    const r = await req("/api/trips", { method: "POST", body: JSON.stringify({ name, data, gmapsKey }) });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao criar viagem.");
    return r.data.trip;
  }

  async function getTrip(tripId) {
    if (!serverAvailable) {
      const store = getLocalStore();
      return { trip: store[tripId] || null, shares: [] };
    }
    const r = await req(`/api/trips/${encodeURIComponent(tripId)}`);
    if (!r.ok) throw new Error(r.data?.error || "Erro ao carregar viagem.");
    currentRevision = r.data.trip.revision || 1;
    currentUpdatedAt = r.data.trip.updatedAt || 0;
    status = "synced";
    notify();
    return r.data;
  }

  async function updateTrip(tripId, payload) {
    if (!serverAvailable) {
      const store = getLocalStore();
      if (store[tripId]) {
        Object.assign(store[tripId], payload, { updatedAt: Date.now(), revision: (store[tripId].revision || 1) + 1 });
        saveLocalStore(store);
      }
      return { ok: true };
    }
    status = "syncing";
    notify();
    try {
      const r = await req(`/api/trips/${encodeURIComponent(tripId)}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(r.data?.error || "Erro ao salvar.");
      currentRevision = r.data.revision;
      currentUpdatedAt = r.data.updatedAt;
      status = "synced";
      notify();
      return r.data;
    } catch (err) {
      status = "offline";
      notify();
      throw err;
    }
  }

  async function deleteTrip(tripId) {
    if (!serverAvailable) {
      const store = getLocalStore();
      delete store[tripId];
      saveLocalStore(store);
      return { ok: true };
    }
    const r = await req(`/api/trips/${encodeURIComponent(tripId)}`, { method: "DELETE" });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao excluir.");
    return r.data;
  }

  /* ---------- Compartilhamento ---------- */
  async function shareTrip(tripId, email, role = "editor") {
    const r = await req(`/api/trips/${encodeURIComponent(tripId)}/share`, {
      method: "POST",
      body: JSON.stringify({ email, role })
    });
    if (!r.ok) throw new Error(r.data?.error || "Não foi possível compartilhar.");
    return r.data.share;
  }

  async function removeShare(tripId, shareId) {
    const r = await req(`/api/trips/${encodeURIComponent(tripId)}/shares/${encodeURIComponent(shareId)}`, { method: "DELETE" });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao remover compartilhamento.");
    return r.data;
  }

  async function respondShare(shareId, action) {
    const r = await req(`/api/shares/${encodeURIComponent(shareId)}/respond`, {
      method: "POST",
      body: JSON.stringify({ action })
    });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao responder convite.");
    return r.data.share;
  }

  /* ---------- Anexos ---------- */
  async function uploadAttachment(tripId, activityId, file) {
    const base64Data = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error("Erro ao ler arquivo."));
      fr.readAsDataURL(file);
    });

    if (!serverAvailable) {
      if (file.size > 512 * 1024) throw new Error("No modo offline local, anexos devem ter até 500 KB.");
      return {
        id: "loc_" + Math.random().toString(36).slice(2, 10),
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl: base64Data,
        uploadedAt: Date.now()
      };
    }

    const r = await req(`/api/trips/${encodeURIComponent(tripId)}/attachments`, {
      method: "POST",
      body: JSON.stringify({
        activityId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        base64Data
      })
    });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao enviar documento.");
    return r.data.attachment;
  }

  async function deleteAttachment(attId) {
    if (!serverAvailable || String(attId).startsWith("loc_")) return { ok: true };
    const r = await req(`/api/attachments/${encodeURIComponent(attId)}`, { method: "DELETE" });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao excluir documento.");
    return r.data;
  }

  function attachmentHref(att) {
    if (att.dataUrl) return att.dataUrl;
    if (att.url) return att.url;
    return `/api/attachments/${encodeURIComponent(att.id)}`;
  }

  async function rotateCalToken(tripId) {
    if (!serverAvailable) return "";
    const r = await req(`/api/trips/${encodeURIComponent(tripId)}/cal-token`, { method: "POST" });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao gerar link.");
    return r.data.calToken;
  }

  function getCalendarFeedUrl(calToken) {
    if (!calToken) return "";
    return `${location.origin}/api/calendar/${encodeURIComponent(calToken)}.ics`;
  }

  async function updateProfile(payload) {
    if (!serverAvailable) {
      const loc = JSON.parse(localStorage.getItem("ferias-pro-local-profile") || "{}");
      Object.assign(loc, payload);
      localStorage.setItem("ferias-pro-local-profile", JSON.stringify(loc));
      currentUser = Object.assign({}, currentUser || { name: "Viajante", email: "local" }, loc);
      notify();
      return { ok: true, user: currentUser };
    }
    const r = await req("/api/auth/profile", { method: "PUT", body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao salvar perfil.");
    currentUser = r.data.user;
    notify();
    return r.data;
  }

  async function saveIntegrations(payload) {
    if (!serverAvailable) return { ok: true, user: currentUser };
    const r = await req("/api/integrations", { method: "PUT", body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(r.data?.error || "Erro ao salvar credenciais.");
    currentUser = r.data.user;
    notify();
    return r.data;
  }

  async function aiPlanTrip(payload) {
    if (!serverAvailable) throw new Error("GEMINI_NOT_CONFIGURED");
    const r = await req("/api/ai/plan-trip", { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(r.data?.error || r.data?.message || "Falha ao planejar com Gemini.");
    return r.data.plan;
  }

  async function aiVehicleSpecs(modelName) {
    if (!serverAvailable) throw new Error("GEMINI_NOT_CONFIGURED");
    const r = await req("/api/ai/vehicle-specs", { method: "POST", body: JSON.stringify({ modelName }) });
    if (!r.ok) throw new Error(r.data?.error || r.data?.message || "Falha ao consultar veículo.");
    return r.data.vehicle;
  }

  async function aiAnalyzeActivity(payload) {
    if (!serverAvailable) throw new Error("GEMINI_NOT_CONFIGURED");
    const r = await req("/api/ai/analyze-activity", { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(r.data?.error || r.data?.message || "Falha ao analisar com Gemini.");
    return r.data.activity;
  }

  async function signWalletPass(activity, tripName) {
    if (!serverAvailable) return { ok: true, configured: false };
    const r = await req("/api/wallet/sign", { method: "POST", body: JSON.stringify({ activity, tripName }) });
    if (!r.ok) throw new Error(r.data?.error || "Falha ao gerar passe Wallet.");
    return r.data;
  }

  async function createPkpassUrl(activity, tripName) {
    if (!serverAvailable) throw new Error("Servidor offline.");
    const r = await req("/api/wallet/pkpass", { method: "POST", body: JSON.stringify({ activity, tripName }) });
    if (!r.ok) throw new Error(r.data?.error || "Falha ao gerar passe .pkpass.");
    return r.data;
  }

  async function epaVehicles(params) {
    if (!serverAvailable) throw new Error("OFFLINE");
    const qs = new URLSearchParams(params).toString();
    const r = await req(`/api/vehicles/epa?${qs}`);
    if (!r.ok) throw new Error(r.data?.error || "Erro ao consultar catálogo online.");
    return r.data;
  }

  async function getStaticRouteMap(stops, gmapsKey) {
    if (!serverAvailable) return { ok: false, available: false };
    const r = await req("/api/maps/static-route", { method: "POST", body: JSON.stringify({ stops, gmapsKey }) });
    return r.ok ? r.data : { ok: false, available: false };
  }

  /* ---------- Local fallback ---------- */
  function getLocalStore() {
    try { return JSON.parse(localStorage.getItem(LOCAL_TRIPS_KEY)) || {}; }
    catch { return {}; }
  }
  function saveLocalStore(store) {
    localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(store));
  }
  function loadLocalTripsIndex() {
    const store = getLocalStore();
    const ownTrips = Object.values(store).map(t => ({
      id: t.id, name: t.name, role: "owner", updatedAt: t.updatedAt || 0, revision: t.revision || 1,
      count: Array.isArray(t.data?.activities) ? t.data.activities.length : 0
    }));
    return { ownTrips, sharedTrips: [], pendingShares: [] };
  }

  function schedulePush(tripId, getPayload, delayMs = 450) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      updateTrip(tripId, getPayload()).catch(() => {});
    }, delayMs);
  }

  function startPolling(getActiveTripId, onRemoteTripUpdate, onPendingSharesChange) {
    clearInterval(pollTimer);
    const check = async () => {
      if (!serverAvailable || !currentUser || document.hidden) return;
      try {
        const list = await listTrips();
        if (onPendingSharesChange) onPendingSharesChange(list);
        const activeId = getActiveTripId();
        if (!activeId) return;
        const all = [...list.ownTrips, ...list.sharedTrips];
        const summary = all.find(t => t.id === activeId);
        if (summary && (summary.updatedAt > currentUpdatedAt || summary.revision > currentRevision)) {
          const full = await getTrip(activeId);
          if (full && full.trip) onRemoteTripUpdate(full);
        }
      } catch {}
    };
    pollTimer = setInterval(check, 12000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
    window.addEventListener("focus", check);
    return check;
  }

  function getActiveTripId() { return localStorage.getItem(ACTIVE_TRIP_KEY) || ""; }
  function setActiveTripId(id) { if (id) localStorage.setItem(ACTIVE_TRIP_KEY, id); else localStorage.removeItem(ACTIVE_TRIP_KEY); }

  window.FeriasApi = {
    initServer,
    login,
    register,
    loginGoogle,
    changePassword,
    forgotPassword,
    validateResetToken,
    resetPassword,
    logout,
    listTrips,
    getCrossings,
    adminOverview,
    adminGetUser,
    adminDeleteUser,
    adminSetDelegate,
    adminSeedDemo,
    createTrip,
    getTrip,
    updateTrip,
    deleteTrip,
    shareTrip,
    removeShare,
    respondShare,
    uploadAttachment,
    deleteAttachment,
    attachmentHref,
    rotateCalToken,
    getCalendarFeedUrl,
    updateProfile,
    saveIntegrations,
    aiPlanTrip,
    aiVehicleSpecs,
    aiAnalyzeActivity,
    signWalletPass,
    createPkpassUrl,
    epaVehicles,
    getStaticRouteMap,
    schedulePush,
    startPolling,
    onStatus,
    getActiveTripId,
    setActiveTripId,
    isServer: () => serverAvailable,
    getServerCaps: () => ({
      hasGemini: Boolean(serverCaps.hasGemini || currentUser?.integrations?.hasGemini),
      hasMaps: Boolean(serverCaps.hasMaps || currentUser?.integrations?.hasMaps),
      hasWallet: Boolean(serverCaps.hasWallet || currentUser?.integrations?.hasWallet),
      hasEmailSender: Boolean(serverCaps.hasEmailSender)
    }),
    getGoogleClientId: () => (currentUser?.integrations?.googleClientId || googleClientId || ""),
    getUser: () => currentUser
  };
})();
