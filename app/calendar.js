/* ===== Integração Inteligente Google Agenda (Calendário Dedicado por Evento + Smart Diff Sync + .ics UID) — My Plan ===== */
(function () {
  const SCOPE = "https://www.googleapis.com/auth/calendar";
  const CAL_EVENTS_URL = calId => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId || "primary")}/events`;
  const CAL_MAP_KEY = "myplan_gcal_calmap_v1";
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
    if ((a.type === "Viagem" || a.type === "Voo" || a.type === "Trem" || a.type === "Ônibus" || a.type === "Navio") && (a.from || a.to)) {
      const pfx = a.type === "Voo" ? "✈️ " : a.type === "Navio" ? "🚢 " : a.type === "Trem" ? "🚂 " : a.type === "Ônibus" ? "🚌 " : "";
      return `${pfx}${a.name} (${a.from || "?"} ➔ ${a.to || "?"})`;
    }
    if (a.columnTitle) return `[${a.columnTitle}] ${a.name}`;
    return a.name;
  }

  function formatActivityDescription(a, tripName, tag) {
    const isPro = Boolean(a.columnId || a.finDirection || a.client || a.assignee || a.priority);
    const lines = [`${isPro ? "Projeto" : "Planejamento"}: ${tripName || "My Plan"}`, `Tipo: ${a.type}`];
    if (a.columnTitle) lines.push(`Lista: ${a.columnTitle}`);
    if (a.startTime) lines.push(`Horário: ${String(a.startTime).slice(0, 5)}${a.endTime ? " – " + String(a.endTime).slice(0, 5) : ""}`);
    if (a.priority) lines.push(`Prioridade: ${a.priority}`);
    if (a.progress != null && a.progress !== "") lines.push(`Progresso: ${Number(a.progress) || 0}%`);
    if (a.client) lines.push(`Cliente / Conta: ${a.client}`);
    if (a.assignee) lines.push(`Responsável: ${a.assignee}`);
    if (a.location) lines.push(`Local / Link: ${a.location}`);
    if (a.from || a.to) lines.push(`Trecho: ${a.from || "?"} ➔ ${a.to || "?"}`);
    if (a.airline) lines.push(`Cia / Empresa / Navio: ${a.airline}`);
    if (a.bookingRef) lines.push(`Localizador / Reserva: ${a.bookingRef}`);
    if (a.km) lines.push(`Distância: ${a.km} km`);
    if (a.toll) lines.push(`Pedágio: R$ ${Number(a.toll).toFixed(2)}`);
    if (a.extraCost) lines.push(`Custo previsto: R$ ${Number(a.extraCost).toFixed(2)}`);
    if (a.finDirection === "income" && Number(a.amount) > 0) {
      lines.push(`Recebimento: +R$ ${Number(a.amount).toFixed(2)}${a.finStatus ? ` (${a.finStatus})` : ""}`);
    } else if (a.finDirection === "expense" && Number(a.amount) > 0) {
      lines.push(`Despesa: -R$ ${Number(a.amount).toFixed(2)}${a.finStatus ? ` (${a.finStatus})` : ""}`);
    }
    if (Array.isArray(a.subtasks) && a.subtasks.length) {
      const doneCnt = a.subtasks.filter(s => s && s.done).length;
      lines.push(`Subtarefas: ${doneCnt}/${a.subtasks.length} concluídas`);
    }
    if (Array.isArray(a.tags) && a.tags.length) lines.push(`Tags: ${a.tags.join(", ")}`);
    if (a.notes) lines.push(`Notas: ${a.notes}`);
    if (tag) lines.push(`\n[My Plan • ${tag}]`);
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

  function getCalendarSummaryName(tripName, mode = "personal") {
    const cleanMode = mode === "professional" ? "Pro" : "Pessoal";
    return `My Plan (${cleanMode}) — ${String(tripName || "Planejamento").trim()}`;
  }

  function buildGoogleCalendarTemplateUrl(a, tripName, mode = "personal") {
    const fallbackToday = new Date().toISOString().slice(0, 10);
    const startIso = a.start || fallbackToday;
    const endIso = a.end || startIso;
    const startCompact = startIso.replace(/-/g, "");
    let datesParam = `${startCompact}/${addDaysISO(endIso, 1).replace(/-/g, "")}`;
    if (a.startTime && /^\d{2}:\d{2}/.test(String(a.startTime))) {
      const st = String(a.startTime).slice(0, 5).replace(":", "") + "00";
      const endDateCompact = endIso.replace(/-/g, "");
      let et = st;
      if (a.endTime && /^\d{2}:\d{2}/.test(String(a.endTime))) {
        et = String(a.endTime).slice(0, 5).replace(":", "") + "00";
      } else {
        const [hh, mm] = String(a.startTime).slice(0, 5).split(":").map(Number);
        const endMin = Math.min(23 * 60 + 59, (hh || 9) * 60 + (mm || 0) + 60);
        et = `${String(Math.floor(endMin / 60)).padStart(2, "0")}${String(endMin % 60).padStart(2, "0")}00`;
      }
      datesParam = `${startCompact}T${st}/${endDateCompact}T${et}`;
    }
    const prefix = mode === "professional" ? "[Pro] " : "";
    const title = encodeURIComponent(`${prefix}${formatActivitySummary(a)}`);
    const calLabel = getCalendarSummaryName(tripName, mode);
    const details = encodeURIComponent(`${formatActivityDescription(a, tripName)}\nCalendário sugerido: ${calLabel}`);
    const loc = encodeURIComponent(a.location || a.to || a.from || "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}${loc ? `&location=${loc}` : ""}`;
  }

  function escapeIcs(txt) {
    return String(txt || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function buildIcsContent(activities, tripName, reminderTime = "09:00", tripId = "local", mode = "personal") {
    const [hh, mm] = String(reminderTime || "09:00").split(":").map(x => String(parseInt(x, 10) || 0).padStart(2, "0"));
    const minsBefore = reminderMinutesBeforeMidnight(reminderTime);
    const calName = getCalendarSummaryName(tripName, mode);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//My Plan//Agenda//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeIcs(calName)}`
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
        `UID:${uidBase}-main@myplan.app`,
        `SEQUENCE:${seq}`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${escapeIcs(summary)}`,
        ...(a.location || a.to || a.from ? [`LOCATION:${escapeIcs(a.location || a.to || a.from)}`] : []),
        `DESCRIPTION:${escapeIcs(desc)}`,
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcs("Lembrete My Plan: " + summary)}`,
        `TRIGGER:-PT${minsBefore}M`,
        "END:VALARM",
        "END:VEVENT"
      );

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uidBase}-rem@myplan.app`,
        `SEQUENCE:${seq}`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${prevDay}T${hh}${mm}00`,
        `DTEND:${prevDay}T${hh}${String(Math.min(59, (parseInt(mm, 10) || 0) + 15)).padStart(2, "0")}00`,
        `SUMMARY:${escapeIcs("🔔 Lembrete amanhã: " + summary)}`,
        ...(a.location || a.to || a.from ? [`LOCATION:${escapeIcs(a.location || a.to || a.from)}`] : []),
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

  function downloadIcs(activities, tripName, reminderTime = "09:00", tripId = "local", mode = "personal") {
    const ics = buildIcsContent(activities, tripName, reminderTime, tripId, mode);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    const prefix = mode === "professional" ? "pro" : "pessoal";
    a.download = `myplan_${prefix}_${(tripName || "agenda").replace(/[^\w\-]+/g, "_")}.ics`;
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
          },
          error_callback: err => {
            const rej = pendingReject;
            pendingResolve = pendingReject = null;
            if (rej) {
              rej(new Error(err?.message || err?.type || "Janela de autorização do Google Agenda fechada ou bloqueada."));
            }
          }
        });
      }
      tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
    });
  }

  async function gcalFetch(url, token, opts = {}) {
    const fetcher = window.MyPlanUtils?.fetchWithTimeout || ((u, o) => fetch(u, o));
    const res = await fetcher(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(opts.headers || {})
      }
    }, 15000);
    if (res.status === 204 || res.status === 404 || res.status === 410) return { status: res.status, data: null };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || `Google Agenda HTTP ${res.status}`);
    }
    return { status: res.status, data };
  }

  function readCalMap() {
    try { return JSON.parse(localStorage.getItem(CAL_MAP_KEY) || "{}"); }
    catch { return {}; }
  }

  function writeCalMap(map) {
    try { localStorage.setItem(CAL_MAP_KEY, JSON.stringify(map)); } catch {}
  }

  async function ensureDedicatedCalendar(token, tripId, tripName, mode = "personal") {
    const cleanMode = mode === "professional" ? "professional" : "personal";
    const mapKey = `${cleanMode}:${tripId}`;
    const targetSummary = getCalendarSummaryName(tripName, cleanMode);
    const marker = `[MyPlanCalendarId:${tripId}:${cleanMode}]`;
    const legacyMarker = `[MyPlanCalendarId:${tripId}]`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
    const calMap = readCalMap();
    const cached = calMap[mapKey];

    try {
      if (cached && cached.calendarId) {
        const probe = await gcalFetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(cached.calendarId)}`, token);
        if (probe.status === 200 && probe.data && (probe.data.accessRole === "owner" || probe.data.accessRole === "writer")) {
          if (probe.data.summary !== targetSummary) {
            await gcalFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cached.calendarId)}`, token, {
              method: "PATCH",
              body: JSON.stringify({ summary: targetSummary })
            }).catch(() => {});
          }
          calMap[mapKey] = { calendarId: cached.calendarId, summary: targetSummary };
          writeCalMap(calMap);
          return { calendarId: cached.calendarId, summary: targetSummary, isDedicated: true };
        }
      }

      // Busca no CalendarList pelo marcador do evento ou nome idêntico (suporta eventos compartilhados)
      let pageToken = "";
      let found = null;
      do {
        const qs = new URLSearchParams({ maxResults: "250", showHidden: "true" });
        if (pageToken) qs.set("pageToken", pageToken);
        const listRes = await gcalFetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList?${qs}`, token);
        const items = listRes.data?.items || [];
        found = items.find(c =>
          (c.accessRole === "owner" || c.accessRole === "writer") &&
          ((c.description && (c.description.includes(marker) || c.description.includes(legacyMarker))) || c.summary === targetSummary)
        );
        if (found) break;
        pageToken = listRes.data?.nextPageToken || "";
      } while (pageToken);

      if (found && found.id) {
        calMap[mapKey] = { calendarId: found.id, summary: found.summary || targetSummary };
        writeCalMap(calMap);
        return { calendarId: found.id, summary: found.summary || targetSummary, isDedicated: true };
      }

      // Cria um calendário secundário dedicado para este evento/modo
      const created = await gcalFetch("https://www.googleapis.com/calendar/v3/calendars", token, {
        method: "POST",
        body: JSON.stringify({
          summary: targetSummary,
          description: `Calendário dedicado criado pelo My Plan (${cleanMode === "professional" ? "Modo Profissional" : "Modo Pessoal"}).\n${marker}`,
          timeZone: tz
        })
      });
      if (created.data?.id) {
        const bgColor = cleanMode === "professional" ? "#1d4ed8" : "#0f766e";
        await gcalFetch(
          `https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(created.data.id)}?colorRgbFormat=true`,
          token,
          { method: "PATCH", body: JSON.stringify({ backgroundColor: bgColor, foregroundColor: "#ffffff" }) }
        ).catch(() => {});
        calMap[mapKey] = { calendarId: created.data.id, summary: targetSummary };
        writeCalMap(calMap);
        return { calendarId: created.data.id, summary: targetSummary, isDedicated: true, calendarCreated: true };
      }
    } catch {
      // Fallback seguro para primary se o Google recusar criação de calendário secundário
    }
    return { calendarId: "primary", summary: "Agenda Principal", isDedicated: false };
  }

  async function listExistingTripEvents(token, calendarId, tripId) {
    const map = new Map();
    let pageToken = "";
    const baseUrl = CAL_EVENTS_URL(calendarId);
    do {
      const params = new URLSearchParams({
        privateExtendedProperty: `feriasProTripId=${tripId}`,
        maxResults: "250",
        singleEvents: "false",
        showDeleted: "false"
      });
      if (pageToken) params.set("pageToken", pageToken);
      const { data } = await gcalFetch(`${baseUrl}?${params}`, token);
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
      const endDateBase = a.end || a.start;
      const endExclusive = addDaysISO(endDateBase, 1);
      const prevDay = addDaysISO(a.start, -1);
      const actId = a.id || simpleHash(summary + a.start);
      const hasTimed = Boolean(a.startTime && /^\d{2}:\d{2}/.test(String(a.startTime)));

      let startObj = { date: a.start };
      let endObj = { date: endExclusive };
      if (hasTimed) {
        const st = `${String(a.startTime).slice(0, 5)}:00`;
        let et = st;
        if (a.endTime && /^\d{2}:\d{2}/.test(String(a.endTime))) {
          et = `${String(a.endTime).slice(0, 5)}:00`;
        } else {
          const [sh, sm] = String(a.startTime).slice(0, 5).split(":").map(Number);
          const eMin = Math.min(23 * 60 + 59, (sh || 9) * 60 + (sm || 0) + 60);
          et = `${String(Math.floor(eMin / 60)).padStart(2, "0")}:${String(eMin % 60).padStart(2, "0")}:00`;
        }
        startObj = { dateTime: `${a.start}T${st}`, timeZone: tz };
        endObj = { dateTime: `${endDateBase}T${et}`, timeZone: tz };
      }

      const tagMain = `fp_${tripId}_${actId}_main`;
      const descMain = formatActivityDescription(a, tripName, tagMain);
      const payloadMain = {
        summary,
        description: descMain,
        location: a.location || a.to || a.from || "",
        start: startObj,
        end: endObj,
        reminders: {
          useDefault: false,
          overrides: hasTimed
            ? [{ method: "popup", minutes: 30 }, { method: "popup", minutes: 1440 }]
            : [{ method: "popup", minutes: minsBefore }, { method: "email", minutes: minsBefore }]
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
        location: a.location || a.to || a.from || "",
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

  // Sincronização inteligente em calendário Google dedicado por evento/modo
  async function smartSyncTrip(activities, tripName, clientId, reminderTime = "09:00", tripId = "default", deleteOrphans = true, mode = "personal") {
    const token = await requestCalendarAccessToken(clientId);
    const calInfo = await ensureDedicatedCalendar(token, String(tripId), tripName, mode);
    const baseUrl = CAL_EVENTS_URL(calInfo.calendarId);
    const existingByTag = await listExistingTripEvents(token, calInfo.calendarId, String(tripId));
    const desired = buildDesiredEvents(activities, tripName, String(tripId), reminderTime);

    let created = 0, updated = 0, deleted = 0, unchanged = 0;
    const seenTags = new Set();

    for (const item of desired) {
      seenTags.add(item.tag);
      const existing = existingByTag.get(item.tag);
      if (!existing) {
        await gcalFetch(baseUrl, token, { method: "POST", body: JSON.stringify(item.payload) });
        created++;
      } else {
        const remoteHash = existing.extendedProperties?.private?.feriasProHash;
        if (remoteHash === item.hash) {
          unchanged++;
        } else {
          await gcalFetch(`${baseUrl}/${encodeURIComponent(existing.id)}`, token, {
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
          await gcalFetch(`${baseUrl}/${encodeURIComponent(existing.id)}`, token, { method: "DELETE" });
          deleted++;
        }
      }
    }

    return {
      created,
      updated,
      deleted,
      unchanged,
      totalActivities: activities.length,
      calendarId: calInfo.calendarId,
      calendarName: calInfo.summary,
      isDedicated: calInfo.isDedicated
    };
  }

  // Sincronização unitária (cria ou atualiza apenas 1 atividade sem deletar as outras no calendário dedicado)
  async function syncSingleActivity(activity, tripName, clientId, reminderTime = "09:00", tripId = "default", mode = "personal") {
    return smartSyncTrip([activity], tripName, clientId, reminderTime, tripId, false, mode);
  }

  window.FeriasCalendar = {
    getCalendarSummaryName,
    buildGoogleCalendarTemplateUrl,
    downloadIcs,
    smartSyncTrip,
    syncSingleActivity
  };
})();
