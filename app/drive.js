/* ===== Integração & Sincronização Google Drive (Zero Duplicidade) — My Plan ===== */
(function () {
  const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
  const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
  const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";
  const DRIVE_ABOUT_API = "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)";

  let gsiPromise = null;
  let tokenClient = null;
  let tokenClientId = "";
  let accessToken = "";
  let tokenExpiresAt = 0;
  let connectedEmail = "";
  let pendingResolve = null;
  let pendingReject = null;

  function loadGsiScript() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (gsiPromise) return gsiPromise;
    gsiPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existing) {
        let tries = 0;
        const iv = setInterval(() => {
          tries++;
          if (window.google?.accounts?.oauth2) { clearInterval(iv); resolve(); }
          else if (tries > 60) { clearInterval(iv); reject(new Error("Tempo esgotado ao carregar Google Identity Services.")); }
        }, 120);
        return;
      }
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Falha ao carregar Google Identity Services."));
      document.head.appendChild(s);
    });
    return gsiPromise;
  }

  function extractFolderId(input) {
    const raw = String(input || "").trim();
    if (!raw) return "";
    // URLs like https://drive.google.com/drive/folders/1AbC... or /u/0/folders/1AbC...?usp=sharing
    const mFolder = raw.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
    if (mFolder) return mFolder[1];
    // URLs like https://drive.google.com/open?id=1AbC...
    const mId = raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (mId) return mId[1];
    // Raw Folder ID
    if (/^[a-zA-Z0-9_-]{10,120}$/.test(raw)) return raw;
    return "";
  }

  function sanitizeDriveName(name, fallback = "Cartao") {
    const clean = String(name || "")
      .replace(/[\\/:*?"<>|\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    return clean || fallback;
  }

  function escapeDriveQuery(val) {
    return String(val || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  async function requestAccessToken(clientId, forceConsent = false) {
    if (!clientId) throw new Error("Google OAuth Client ID não configurado.");
    if (!forceConsent && accessToken && tokenClientId === clientId && Date.now() < tokenExpiresAt) {
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
          scope: DRIVE_SCOPE,
          callback: resp => {
            const res = pendingResolve;
            const rej = pendingReject;
            pendingResolve = pendingReject = null;
            if (resp && resp.access_token) {
              accessToken = resp.access_token;
              tokenExpiresAt = Date.now() + ((Number(resp.expires_in) || 3500) - 120) * 1000;
              if (res) res(accessToken);
            } else if (rej) {
              rej(new Error(resp?.error_description || resp?.error || "Autorização do Google Drive negada."));
            }
          },
          error_callback: err => {
            const rej = pendingReject;
            pendingResolve = pendingReject = null;
            if (rej) rej(new Error(err?.message || err?.type || "Janela de autorização do Google Drive fechada ou bloqueada."));
          }
        });
      }
      tokenClient.requestAccessToken({ prompt: forceConsent || !accessToken ? "consent" : "" });
    });
  }

  async function driveFetchJson(url, token, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.body && !(opts.body instanceof FormData) && !(opts.body instanceof Blob) ? { "Content-Type": "application/json" } : {}),
        ...(opts.headers || {})
      }
    });
    if (res.status === 404) return { status: 404, data: null };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error?.message || `Google Drive HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return { status: res.status, data };
  }

  async function connect(clientId, forceConsent = true) {
    const token = await requestAccessToken(clientId, forceConsent);
    try {
      const info = await driveFetchJson(DRIVE_ABOUT_API, token);
      connectedEmail = info.data?.user?.emailAddress || "";
    } catch {
      connectedEmail = connectedEmail || "";
    }
    return { token, email: connectedEmail };
  }

  function disconnect() {
    if (accessToken && window.google?.accounts?.oauth2?.revoke) {
      try { window.google.accounts.oauth2.revoke(accessToken, () => {}); } catch {}
    }
    accessToken = "";
    tokenExpiresAt = 0;
    connectedEmail = "";
  }

  function isConnected() {
    return Boolean(accessToken && Date.now() < tokenExpiresAt);
  }

  function getConnectedEmail() {
    return connectedEmail;
  }

  async function listFolders(clientId, queryText = "") {
    const token = await requestAccessToken(clientId, false);
    const clauses = ["mimeType='application/vnd.google-apps.folder'", "trashed=false"];
    if (queryText && queryText.trim()) {
      clauses.push(`name contains '${escapeDriveQuery(queryText.trim())}'`);
    }
    const qs = new URLSearchParams({
      q: clauses.join(" and "),
      fields: "files(id,name,modifiedTime,webViewLink)",
      orderBy: "modifiedTime desc",
      pageSize: "40",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true"
    });
    const r = await driveFetchJson(`${DRIVE_API}?${qs}`, token);
    return Array.isArray(r.data?.files) ? r.data.files : [];
  }

  async function verifyFolder(token, folderId) {
    if (!folderId) return null;
    try {
      const qs = new URLSearchParams({
        fields: "id,name,mimeType,trashed,webViewLink",
        supportsAllDrives: "true"
      });
      const r = await driveFetchJson(`${DRIVE_API}/${encodeURIComponent(folderId)}?${qs}`, token);
      if (!r.data || r.data.trashed || r.data.mimeType !== "application/vnd.google-apps.folder") return null;
      return r.data;
    } catch {
      return null;
    }
  }

  async function findOrCreateCardFolder(token, rootFolderId, card) {
    const targetName = sanitizeDriveName(card.name, `Cartao_${card.id || "sem_titulo"}`);

    // 1. Verificar por driveFolderId salvo no cartão
    if (card.driveFolderId) {
      const existing = await verifyFolder(token, card.driveFolderId);
      if (existing) {
        if (existing.name !== targetName) {
          await driveFetchJson(`${DRIVE_API}/${encodeURIComponent(existing.id)}?supportsAllDrives=true`, token, {
            method: "PATCH",
            body: JSON.stringify({ name: targetName })
          });
        }
        return existing.id;
      }
    }

    // 2. Buscar por appProperties.myplanCardId dentro da pasta raiz
    const q = [
      `'${escapeDriveQuery(rootFolderId)}' in parents`,
      `mimeType='application/vnd.google-apps.folder'`,
      `trashed=false`,
      `appProperties has { key='myplanCardId' and value='${escapeDriveQuery(String(card.id))}' }`
    ].join(" and ");
    const qs = new URLSearchParams({
      q,
      fields: "files(id,name)",
      pageSize: "5",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true"
    });
    const found = await driveFetchJson(`${DRIVE_API}?${qs}`, token);
    if (found.data?.files?.length) {
      const folder = found.data.files[0];
      if (folder.name !== targetName) {
        await driveFetchJson(`${DRIVE_API}/${encodeURIComponent(folder.id)}?supportsAllDrives=true`, token, {
          method: "PATCH",
          body: JSON.stringify({ name: targetName })
        });
      }
      return folder.id;
    }

    // 3. Criar nova subpasta com appProperties para zero duplicidade futura
    const created = await driveFetchJson(`${DRIVE_API}?supportsAllDrives=true&fields=id,name`, token, {
      method: "POST",
      body: JSON.stringify({
        name: targetName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [rootFolderId],
        appProperties: {
          myplanApp: "myplan",
          myplanCardId: String(card.id)
        }
      })
    });
    return created.data.id;
  }

  async function multipartUpload(token, fileId, metadata, blob) {
    const boundary = "myplan_drive_" + Math.random().toString(36).slice(2, 12);
    const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const mediaHeader = `--${boundary}\r\nContent-Type: ${blob.type || "application/octet-stream"}\r\n\r\n`;
    const closing = `\r\n--${boundary}--`;
    const bodyBlob = new Blob([metaPart, mediaHeader, blob, closing], {
      type: `multipart/related; boundary=${boundary}`
    });

    const url = fileId
      ? `${DRIVE_UPLOAD_API}/${encodeURIComponent(fileId)}?uploadType=multipart&supportsAllDrives=true&fields=id,name`
      : `${DRIVE_UPLOAD_API}?uploadType=multipart&supportsAllDrives=true&fields=id,name`;
    const method = fileId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: bodyBlob
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || `Falha ao enviar arquivo ao Drive (HTTP ${res.status})`);
    }
    return data;
  }

  async function checkFileExists(token, fileId) {
    if (!fileId) return null;
    try {
      const r = await driveFetchJson(`${DRIVE_API}/${encodeURIComponent(fileId)}?fields=id,name,trashed&supportsAllDrives=true`, token);
      if (!r.data || r.data.trashed) return null;
      return r.data;
    } catch {
      return null;
    }
  }

  async function findFileByAppProp(token, folderId, propKey, propVal) {
    const q = [
      `'${escapeDriveQuery(folderId)}' in parents`,
      `trashed=false`,
      `appProperties has { key='${escapeDriveQuery(propKey)}' and value='${escapeDriveQuery(String(propVal))}' }`
    ].join(" and ");
    const qs = new URLSearchParams({
      q,
      fields: "files(id,name)",
      pageSize: "5",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true"
    });
    const r = await driveFetchJson(`${DRIVE_API}?${qs}`, token);
    return r.data?.files?.[0] || null;
  }

  async function upsertDriveFile(token, folderId, { existingFileId, propKey, propVal, cardId, fileName, blob }) {
    let targetFileId = "";
    if (existingFileId) {
      const ok = await checkFileExists(token, existingFileId);
      if (ok) targetFileId = ok.id;
    }
    if (!targetFileId && propKey && propVal) {
      const found = await findFileByAppProp(token, folderId, propKey, propVal);
      if (found) targetFileId = found.id;
    }

    const cleanName = sanitizeDriveName(fileName, "arquivo");
    const metadata = targetFileId
      ? {
          name: cleanName,
          appProperties: {
            myplanApp: "myplan",
            myplanCardId: String(cardId),
            [propKey]: String(propVal)
          }
        }
      : {
          name: cleanName,
          parents: [folderId],
          appProperties: {
            myplanApp: "myplan",
            myplanCardId: String(cardId),
            [propKey]: String(propVal)
          }
        };

    const res = await multipartUpload(token, targetFileId || null, metadata, blob);
    return res.id;
  }

  function stripHtml(html) {
    return String(html || "")
      .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|blockquote)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function fmtDateBR(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }

  function buildCardDetailsText(card, { tripTitle, columns, labels }) {
    const colTitle = (columns || []).find(c => c.id === card.columnId)?.title || card.columnId || "—";
    const cardLabels = (Array.isArray(card.labels) ? card.labels : [])
      .map(lid => (labels || []).find(l => l.id === lid)?.name || lid)
      .filter(Boolean);
    const tags = Array.isArray(card.tags) ? card.tags.filter(Boolean) : [];
    const assignees = [];
    if (Array.isArray(card.assignees) && card.assignees.length) {
      card.assignees.forEach(a => {
        if (!a || !a.name) return;
        assignees.push(a.travels ? `${a.name} (Viaja)` : a.name);
      });
    } else if (card.assignee) {
      assignees.push(card.assigneeTravels ? `${card.assignee} (Viaja)` : card.assignee);
    }

    const lines = [];
    lines.push("====================================================================");
    lines.push(`CARTÃO: ${card.name || "Sem título"}`);
    lines.push("====================================================================");
    if (tripTitle) lines.push(`Projeto: ${tripTitle}`);
    lines.push(`Lista / Status: ${colTitle}`);
    if (card.type) lines.push(`Tipo: ${card.type}`);
    if (card.priority) lines.push(`Prioridade: ${card.priority}`);
    if (card.progress != null) lines.push(`Progresso: ${card.progress}%`);
    if (card.client) lines.push(`Cliente / Conta: ${card.client}`);

    const startStr = card.start ? `${fmtDateBR(card.start)}${card.startTime ? ` ${card.startTime}` : ""}` : "";
    const endStr = card.end ? `${fmtDateBR(card.end)}${card.endTime ? ` ${card.endTime}` : ""}` : "";
    if (startStr || endStr) {
      lines.push(`Datas do Evento: ${startStr || "—"}${endStr && endStr !== startStr ? ` até ${endStr}` : ""}`);
    }
    if (card.location) lines.push(`Localidade: ${card.location}`);
    if (card.meetingLink) lines.push(`Link da Reunião: ${card.meetingLink}`);
    if (assignees.length) lines.push(`Responsáveis: ${assignees.join(", ")}`);
    if (cardLabels.length) lines.push(`Etiquetas: ${cardLabels.join(", ")}`);
    if (tags.length) lines.push(`Tags: ${tags.map(t => `#${t}`).join(", ")}`);

    lines.push("");
    lines.push("--- DESCRIÇÃO ---");
    lines.push((card.notes || "").trim() || "(Sem descrição)");

    const subtasks = Array.isArray(card.subtasks) ? card.subtasks : [];
    if (subtasks.length) {
      lines.push("");
      lines.push("--- CHECKLIST ---");
      subtasks.forEach(st => {
        lines.push(`${st.done ? "[x]" : "[ ]"} ${st.text || st.title || ""}`);
      });
    }

    // Financeiro
    const hasFin = (card.finDirection && card.finDirection !== "none") || Number(card.amount) > 0 || Number(card.actualAmount) > 0;
    if (hasFin) {
      lines.push("");
      lines.push("--- FINANCEIRO ---");
      if (card.finDirection && card.finDirection !== "none") lines.push(`Movimento: ${card.finDirection}`);
      if (Number(card.amount) > 0) lines.push(`Valor Previsto: R$ ${Number(card.amount).toFixed(2)}`);
      if (Number(card.actualAmount) > 0) lines.push(`Valor Realizado: R$ ${Number(card.actualAmount).toFixed(2)}`);
      if (card.finStatus) lines.push(`Status Financeiro: ${card.finStatus}`);
    }

    // Viagem
    const td = card.travelDetails && typeof card.travelDetails === "object" ? card.travelDetails : null;
    if (td && (td.transport || td.hasCost || td.notes || (Array.isArray(td.segments) && td.segments.length))) {
      lines.push("");
      lines.push("--- DETALHES DE VIAGEM ---");
      if (td.transport) lines.push(`Transporte: ${td.transport}`);
      if (td.hasCost && Number(td.costAmount) > 0) lines.push(`Custo de Passagem: R$ ${Number(td.costAmount).toFixed(2)}`);
      if (card.travelFinanceMode) lines.push(`Modalidade Financeira: ${card.travelFinanceMode}`);
      if (td.notes) lines.push(`Observações: ${td.notes}`);
      if (Array.isArray(td.segments) && td.segments.length) {
        lines.push("Trechos:");
        td.segments.forEach((sg, idx) => {
          lines.push(`  ${idx + 1}. ${sg.from || "?"} -> ${sg.to || "?"} (${sg.departureDate ? fmtDateBR(sg.departureDate) : "—"} ${sg.departureTime || ""}) ${sg.carrier || ""} ${sg.flightNumber || ""} ${sg.locator ? `Loc: ${sg.locator}` : ""}`.trim());
        });
      }
    }

    // Atas vinculadas
    const minutes = Array.isArray(card.minutes) ? card.minutes : [];
    if (minutes.length) {
      lines.push("");
      lines.push("--- ATAS DE REUNIÃO VINCULADAS ---");
      minutes.forEach((m, i) => {
        lines.push(`\n[Ata ${i + 1}] ${m.title || "Ata de Reunião"}`);
        if (m.meetingDate) lines.push(`Data: ${fmtDateBR(m.meetingDate)} ${String(m.meetingDate).slice(11, 16)}`);
        if (Array.isArray(m.participants) && m.participants.length) lines.push(`Participantes: ${m.participants.join(", ")}`);
        if (m.location) lines.push(`Local/Link: ${m.location}`);
        const bodyTxt = stripHtml(m.html);
        if (bodyTxt) lines.push(bodyTxt);
      });
    }

    // Links externos anexados
    const links = (Array.isArray(card.attachments) ? card.attachments : []).filter(a => a && a.isLink);
    if (links.length) {
      lines.push("");
      lines.push("--- LINKS ANEXADOS ---");
      links.forEach(lk => lines.push(`- ${lk.fileName || lk.url}: ${lk.url}`));
    }

    lines.push("");
    lines.push(`Sincronizado pelo My Plan em ${new Date().toLocaleString("pt-BR")}`);
    return lines.join("\n");
  }

  async function fetchAttachmentBlob(att, resolveDocHref) {
    const href = resolveDocHref ? resolveDocHref(att) : (att.dataUrl || att.url || (att.id ? `/api/attachments/${encodeURIComponent(att.id)}` : ""));
    if (!href) return null;
    const res = await fetch(href, { credentials: "same-origin" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type && att.mimeType) {
      return new Blob([blob], { type: att.mimeType });
    }
    return blob;
  }

  async function syncProjectToDrive({ clientId, rootFolderId, trip, columns, labels, resolveDocHref, onProgress }) {
    const cleanRootId = extractFolderId(rootFolderId);
    if (!cleanRootId) throw new Error("Configure a pasta raiz do Google Drive em Parâmetros antes de sincronizar.");
    const token = await requestAccessToken(clientId, false);

    // Validar pasta raiz
    const rootInfo = await verifyFolder(token, cleanRootId);
    if (!rootInfo) {
      throw new Error("A pasta raiz informada não foi encontrada ou você não tem permissão de acesso no Google Drive.");
    }

    const cards = Array.isArray(trip?.data?.activities) ? trip.data.activities : [];
    let syncedCards = 0;
    let syncedFiles = 0;
    let failedFiles = 0;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card || !card.id) continue;
      if (onProgress) onProgress({ step: i + 1, total: cards.length, cardName: card.name || "Cartão" });

      // 1. Pasta do cartão (zero duplicidade)
      const folderId = await findOrCreateCardFolder(token, cleanRootId, card);
      card.driveFolderId = folderId;

      // 2. Detalhes_do_Cartao.txt (atualiza/sobrescreve sem duplicar)
      const txtContent = buildCardDetailsText(card, {
        tripTitle: trip.name || trip.data?.title || "",
        columns: columns || trip.data?.columns || [],
        labels: labels || trip.data?.labels || []
      });
      const txtBlob = new Blob([txtContent], { type: "text/plain; charset=utf-8" });
      const detailsFileId = await upsertDriveFile(token, folderId, {
        existingFileId: card.driveDetailsFileId || "",
        propKey: "myplanDetailsFor",
        propVal: String(card.id),
        cardId: card.id,
        fileName: "Detalhes_do_Cartao.txt",
        blob: txtBlob
      });
      card.driveDetailsFileId = detailsFileId;
      syncedFiles++;

      // 3. Coletar todos os anexos reais do cartão (gerais, bilhetes de viagem, anexos de atas/apresentações)
      const allAttRefs = [];
      const seenKeys = new Set();
      const pushRef = (att, prefix, idx) => {
        if (!att || typeof att !== "object" || att.isLink) return;
        const attKey = att.id ? `${prefix}_${att.id}` : `${prefix}_${idx}_${att.fileName || "file"}`;
        if (seenKeys.has(attKey)) return;
        seenKeys.add(attKey);
        allAttRefs.push({ att, attKey });
      };

      (Array.isArray(card.attachments) ? card.attachments : []).forEach((att, idx) => pushRef(att, "att", idx));
      const td = card.travelDetails && typeof card.travelDetails === "object" ? card.travelDetails : null;
      if (td) {
        const tks = Array.isArray(td.tickets) ? td.tickets : (td.ticketFile ? [td.ticketFile] : []);
        tks.forEach((tk, idx) => pushRef(tk, "tk", idx));
      }
      (Array.isArray(card.minutes) ? card.minutes : []).forEach(min => {
        (Array.isArray(min?.attachments) ? min.attachments : []).forEach((matt, idx) => pushRef(matt, `min_${min.id || "m"}`, idx));
      });

      for (const { att, attKey } of allAttRefs) {
        try {
          const blob = await fetchAttachmentBlob(att, resolveDocHref);
          if (!blob) { failedFiles++; continue; }
          const driveId = await upsertDriveFile(token, folderId, {
            existingFileId: att.driveFileId || "",
            propKey: "myplanAttId",
            propVal: attKey,
            cardId: card.id,
            fileName: att.fileName || "Anexo",
            blob
          });
          att.driveFileId = driveId;
          syncedFiles++;
        } catch {
          failedFiles++;
        }
      }
      syncedCards++;
    }

    return {
      ok: true,
      rootFolderId: rootInfo.id,
      rootFolderName: rootInfo.name,
      syncedCards,
      syncedFiles,
      failedFiles,
      syncedAt: new Date().toISOString()
    };
  }

  window.MyPlanDrive = {
    extractFolderId,
    connect,
    disconnect,
    isConnected,
    getConnectedEmail,
    listFolders,
    syncProjectToDrive
  };
})();
