/* ===== Integração Google Agenda (OAuth API + .ics + Link Direto) — Férias Pro ===== */
(function () {
  const SCOPE = "https://www.googleapis.com/auth/calendar.events";
  let tokenClient = null;
  let accessToken = "";
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

  // Calcula minutos antes da meia-noite do dia de início para disparar às 09:00 do dia anterior (padrão = 900 min = 15h)
  function reminderMinutesBeforeMidnight(timeStr = "09:00") {
    const [hh, mm] = String(timeStr || "09:00").split(":").map(Number);
    const targetMin = (isFinite(hh) ? hh : 9) * 60 + (isFinite(mm) ? mm : 0);
    return Math.max(60, 24 * 60 - targetMin);
  }

  function formatActivitySummary(a) {
    if (a.type === "Viagem" && (a.from || a.to)) {
      return `${a.name} (${a.from || "?"} ➔ ${a.to || "?"})`;
    }
    if (a.type === "Voo" && (a.from || a.to)) {
      return `✈️ ${a.name} (${a.from || "?"} ➔ ${a.to || "?"})`;
    }
    return a.name;
  }

  function formatActivityDescription(a, tripName) {
    const lines = [`Planejamento: ${tripName || "Férias Pro"}`, `Tipo: ${a.type}`];
    if (a.from || a.to) lines.push(`Trecho: ${a.from || "?"} ➔ ${a.to || "?"}`);
    if (a.km) lines.push(`Distância: ${a.km} km`);
    if (a.toll) lines.push(`Pedágio: R$ ${Number(a.toll).toFixed(2)}`);
    if (a.extraCost) lines.push(`Custo previsto: R$ ${Number(a.extraCost).toFixed(2)}`);
    if (a.notes) lines.push(`Notas: ${a.notes}`);
    return lines.join("\n");
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

  function buildIcsContent(activities, tripName, reminderTime = "09:00") {
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

    activities.forEach(a => {
      if (!a.start) return;
      const summary = formatActivitySummary(a);
      const desc = formatActivityDescription(a, tripName);
      const dtStart = a.start.replace(/-/g, "");
      const dtEnd = addDaysISO(a.end || a.start, 1).replace(/-/g, "");
      const prevDay = addDaysISO(a.start, -1).replace(/-/g, "");

      // 1) Evento principal na data da atividade + VALARM no dia anterior às 09:00
      lines.push(
        "BEGIN:VEVENT",
        `UID:${a.id || Math.random().toString(36).slice(2)}@feriaspro`,
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

      // 2) Lembrete explícito no dia anterior às 09:00 com o nome da atividade
      lines.push(
        "BEGIN:VEVENT",
        `UID:${a.id || Math.random().toString(36).slice(2)}-rem@feriaspro`,
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

  function downloadIcs(activities, tripName, reminderTime = "09:00") {
    const ics = buildIcsContent(activities, tripName, reminderTime);
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
    await loadGsiScript();
    return new Promise((resolve, reject) => {
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPE,
          callback: resp => {
            if (resp && resp.access_token) {
              accessToken = resp.access_token;
              resolve(accessToken);
            } else {
              reject(new Error(resp?.error || "Autorização Google Agenda negada."));
            }
          }
        });
      }
      tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
    });
  }

  async function syncActivitiesToGoogleCalendar(activities, tripName, clientId, reminderTime = "09:00") {
    const token = await requestCalendarAccessToken(clientId);
    const minsBefore = reminderMinutesBeforeMidnight(reminderTime);
    const [hh, mm] = String(reminderTime || "09:00").split(":").map(x => String(parseInt(x, 10) || 0).padStart(2, "0"));
    const tzOffset = "-03:00";

    let created = 0;
    for (const a of activities) {
      if (!a.start) continue;
      const summary = formatActivitySummary(a);
      const description = formatActivityDescription(a, tripName);
      const endExclusive = addDaysISO(a.end || a.start, 1);
      const prevDay = addDaysISO(a.start, -1);

      // Evento principal com notificação às 09:00 do dia anterior
      const mainEvent = {
        summary,
        description,
        location: a.to || a.from || undefined,
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

      const r1 = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(mainEvent)
      });
      if (!r1.ok) throw new Error("Erro ao criar evento no Google Agenda.");

      // Lembrete explícito às 09:00 do dia anterior com o nome da atividade
      const remEvent = {
        summary: `🔔 Lembrete amanhã: ${summary}`,
        description,
        start: { dateTime: `${prevDay}T${hh}:${mm}:00${tzOffset}` },
        end: { dateTime: `${prevDay}T${hh}:${String(Math.min(59, (parseInt(mm, 10) || 0) + 15)).padStart(2, "0")}:00${tzOffset}` },
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 0 }]
        }
      };

      await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(remEvent)
      });

      created++;
    }
    return created;
  }

  window.FeriasCalendar = {
    buildGoogleCalendarTemplateUrl,
    downloadIcs,
    syncActivitiesToGoogleCalendar
  };
})();
