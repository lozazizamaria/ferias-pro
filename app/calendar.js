/* ===== Integração Inteligente Google Agenda (Smart Diff Sync + .ics UID) — Férias Pro ===== */
(function () {
  const SCOPE = "https://www.googleapis.com/auth/calendar.events";
  const BASE_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  let tokenClient = null;
  let tokenClientId = "";
  let accessToken = "";
  let tokenExpiresAt = 0;
  let pendingResolve = null;
  let pendingReject = null;
  let gsiLoadedPromise = null;

  function loadGsiScript() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (!gsiLoadedPromise) {
      gsiLoadedPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => { gsiLoadedPromise = null; reject(new Error("Falha ao carregar Google Identity Services.")); };
        document.head.appendChild(s);
      });
    }
    return gsiLoadedPromise;
  }

  function addDaysISO(iso, delta) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d + delta);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }

  function reminderMinutesBeforeMidnight(timeStr = "09:00") {
    const [hh, mm] = String(timeStr || "09:00").split(":").map(Number);
    const targetMin = (isFinite(hh) ? hh : 9) * 60 + (isFinite(mm) ? mm : 0);
    return Math.max(60, 24 * 60 - targetMin);
  }

  function formatActivitySummary(a) {
    if (a.type === "Viagem" && (a.from || a.to)) return `${a.name} (${a.from || "?"} ➔ ${a.to || "?"})`;
    if (a.type === "Voo" && (a.from || a.to)) return `✈️ ${a.name} (${a.from || "?"} ➔ ${a.to || "?"})`;
    return a.name;
  }

  function formatActivityDescription(a, tripName, tag) {
    const lines = [`Planejamento: ${tripName || "Férias Pro"}`, `Tipo: ${a.type}`];
    if (a.from || a.to) lines.push(`Trecho: ${a.from || "?"} ➔ ${a.to || "?"}`);
    if (a.km) lines.push(`Distância: ${a.km} km`);
    if (a.toll) lines.push(`Pedágio: R$ ${Number(a.toll).toFixed(2)}`);
    if (a.extraCost) lines.push(`Custo previsto: R$ ${Number(a.extraCost).toFixed(2)}`);
    if (a.notes) lines.push(`Notas: ${a.notes}`);
    if (tag) lines.push(`\n[Férias Pro • ${tag}]`);
    return lines.join("\n");
  }

  function simpleHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function buildGoogleCalendarTemplateUrl(a, tripName) {
    const startCompact = a.start.replace(/-/g, "");
    const endExclusive = addDaysISO(a.end || a.start, 1).replace(/-/g, "");
    const title = encodeURIComponent(formatActivitySummary(a));
    const details = encodeURIComponent(formatActivityDescription(a, tripName));
    const loc = encodeURIComponent(a.to || a.from || "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startCompact}/${endExclusive}&details=${details}${loc ? `&location=${loc}` : ""}`;
  }

  function escapeIcs(txt) {
    return String(txt || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function buildIcsContent(activities, tripName, reminderTime = "09:00", tripId = "local") {
    const [hh, mm] = String(reminderTime || "09:00").split(":").map(x => String(parseInt(x, 10) || 0).padStart(2, "0"));
    const minsBefore = reminderMinutesBeforeMidnight(reminderTime);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Ferias Pro//Agenda//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    const nowStamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const seq = Math.floor(Date.now() / 1000) % 100000000;

    activities.forEach(a => {
      if (!a.start) return;
      const summary = formatActivitySummary(a);
      const uidBase = `${tripId}-${a.id || simpleHash(summary + a.start)}`;
      const desc = formatActivityDescription(a, tripName, uidBase);
      const dtStart = a.start.replace(/-/g, "");
      const dtEnd = addDaysISO(a.end || a.start, 1).replace(/-/g, "");
      const prevDay = addDaysISO(a.start, -1).replace(/-/g, "");

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uidBase}-main@feriaspro.app`,
        `SEQUENCE:${seq}`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${escapeIcs(summary)}`,
        `DESCRIPTION:${escapeIcs(desc)}`,
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcs("Lembrete Férias Pro: " + summary)}`,
        `TRIGGER:-PT${minsBefore}M`,
        "END:VALARM",
        "END:VEVENT"
      );

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uidBase}-rem@feriaspro.app`,
        `SEQUENCE:${seq}`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${prevDay}T${hh}${mm}00`,
        `DTEND:${prevDay}T${hh}${String(Math.min(59, (parseInt(mm, 10) || 0) + 15)).padStart(2, "0")}00`,
        `SUMMARY:${escapeIcs("🔔 Lembrete amanhã: " + summary)}`,
        `DESCRIPTION:${escapeIcs(desc)}`,
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcs("Amanhã: " + summary)}`,
        "TRIGGER:-PT0M",
        "END:VALARM",
        "END:VEVENT"
      );
    });

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  function downloadIcs(activities, tripName, reminderTime = "09:00", tripId = "local") {
    const ics = buildIcsContent(activities, tripName, reminderTime, tripId);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `${(tripName || "ferias_pro").replace(/[^\w\-]+/g, "_")}_agenda.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }

  async function requestCalendarAccessToken(clientId) {
    if (!clientId) throw new Error("NO_GOOGLE_CLIENT_ID");
    if (accessToken && tokenClientId === clientId && Date.now() < tokenExpiresAt) {
      return accessToken;
    }
    await loadGsiScript();
    return new Promise((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      if (!tokenClient || tokenClientId !== clientId) {
        tokenClientId = clientId;
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPE,
          callback: resp => {
            const res = pendingResolve;
            const rej = pendingReject;
            pendingResolve = pendingReject = null;
            if (resp && resp.access_token) {
              accessToken = resp.access_token;
              tokenExpiresAt = Date.now() + ((Number(resp.expires_in) || 3500) - 120) * 1000;
              if (res) res(accessToken);
            } else if (rej) {
              rej(new Error(resp?.error || "Autorização Google Agenda negada."));
            }
          }
        });
      }
      tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
    });
  }

  async function gcalFetch(url, token, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(opts.headers || {})
      }
    });
    if (res.status === 204 || res.status === 404 || res.status === 410) return { status: res.status, data: null };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || `Google Agenda HTTP ${res.status}`);
    }
    return { status: res.status, data };
  }

  async function listExistingTripEvents(token, tripId) {
    const map = new Map();
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        privateExtendedProperty: `feriasProTripId=${tripId}`,
        maxResults: "250",
        singleEvents: "false",
        showDeleted: "false"
      });
      if (pageToken) params.set("pageToken", pageToken);
      const { data } = await gcalFetch(`${BASE_URL}?${params}`, token);
      if (data?.items) {
        data.items.forEach(ev => {
          const tag = ev.extendedProperties?.private?.feriasProTag;
          if (tag && ev.status !== "cancelled") {
            map.set(tag, ev);
          }
        });
      }
      pageToken = data?.nextPageToken || "";
    } while (pageToken);
    return map;
  }

  function buildDesiredEvents(activities, tripName, tripId, reminderTime) {
    const minsBefore = reminderMinutesBeforeMidnight(reminderTime);
    const [hh, mm] = String(reminderTime || "09:00").split(":").map(x => String(parseInt(x, 10) || 0).padStart(2, "0"));
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
    const desired = [];

    activities.forEach(a => {
      if (!a.start) return;
      const summary = formatActivitySummary(a);
      const endExclusive = addDaysISO(a.end || a.start, 1);
      const prevDay = addDaysISO(a.start, -1);
      const actId = a.id || simpleHash(summary + a.start);

      const tagMain = `fp_${tripId}_${actId}_main`;
      const descMain = formatActivityDescription(a, tripName, tagMain);
      const payloadMain = {
        summary,
        description: descMain,
        location: a.to || a.from || "",
        start: { date: a.start },
        end: { date: endExclusive },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: minsBefore },
            { method: "email", minutes: minsBefore }
          ]
        }
      };
      const hashMain = simpleHash(JSON.stringify(payloadMain));
      payloadMain.extendedProperties = {
        private: {
          feriasProTag: tagMain,
          feriasProTripId: String(tripId),
          feriasProActivityId: String(actId),
          feriasProKind: "main",
          feriasProHash: hashMain
        }
      };
      desired.push({ tag: tagMain, hash: hashMain, payload: payloadMain });

      const tagRem = `fp_${tripId}_${actId}_rem`;
      const descRem = formatActivityDescription(a, tripName, tagRem);
      const endRemMin = Math.min(59, (parseInt(mm, 10) || 0) + 15);
      const payloadRem = {
        summary: `🔔 Lembrete amanhã: ${summary}`,
        description: descRem,
        location: a.to || a.from || "",
        start: { dateTime: `${prevDay}T${hh}:${mm}:00`, timeZone: tz },
        end: { dateTime: `${prevDay}T${hh}:${String(endRemMin).padStart(2, "0")}:00`, timeZone: tz },
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 0 }]
        }
      };
      const hashRem = simpleHash(JSON.stringify(payloadRem));
      payloadRem.extendedProperties = {
        private: {
          feriasProTag: tagRem,
          feriasProTripId: String(tripId),
          feriasProActivityId: String(actId),
          feriasProKind: "rem",
          feriasProHash: hashRem
        }
      };
      desired.push({ tag: tagRem, hash: hashRem, payload: payloadRem });
    });

    return desired;
  }

  // Sincronização inteligente: cria novos, atualiza alterados (PATCH) e remove excluídos (DELETE)
  async function smartSyncTrip(activities, tripName, clientId, reminderTime = "09:00", tripId = "default", deleteOrphans = true) {
    const token = await requestCalendarAccessToken(clientId);
    const existingByTag = await listExistingTripEvents(token, String(tripId));
    const desired = buildDesiredEvents(activities, tripName, String(tripId), reminderTime);

    let created = 0, updated = 0, deleted = 0, unchanged = 0;
    const seenTags = new Set();

    for (const item of desired) {
      seenTags.add(item.tag);
      const existing = existingByTag.get(item.tag);
      if (!existing) {
        await gcalFetch(BASE_URL, token, { method: "POST", body: JSON.stringify(item.payload) });
        created++;
      } else {
        const remoteHash = existing.extendedProperties?.private?.feriasProHash;
        if (remoteHash === item.hash) {
          unchanged++;
        } else {
          await gcalFetch(`${BASE_URL}/${encodeURIComponent(existing.id)}`, token, {
            method: "PATCH",
            body: JSON.stringify(item.payload)
          });
          updated++;
        }
      }
    }

    if (deleteOrphans) {
      for (const [tag, existing] of existingByTag.entries()) {
        if (!seenTags.has(tag)) {
          await gcalFetch(`${BASE_URL}/${encodeURIComponent(existing.id)}`, token, { method: "DELETE" });
          deleted++;
        }
      }
    }

    return { created, updated, deleted, unchanged, totalActivities: activities.length };
  }

  // Sincronização unitária (cria ou atualiza apenas 1 atividade sem deletar as outras)
  async function syncSingleActivity(activity, tripName, clientId, reminderTime = "09:00", tripId = "default") {
    return smartSyncTrip([activity], tripName, clientId, reminderTime, tripId, false);
  }

  window.FeriasCalendar = {
    buildGoogleCalendarTemplateUrl,
    downloadIcs,
    smartSyncTrip,
    syncSingleActivity
  };
})();
