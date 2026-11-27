/* ==========================================================================
   My Plan — Divisão de Custos Estilo Splitwise (Modo Pessoal, v63)
   100% Determinístico (Integer Cents, Zero IA), Algoritmo Min-Cash-Flow,
   BR Code Pix EMV (CRC16-CCITT) + Gerador QR Code SVG Zero-Dependências.
   ========================================================================== */
(() => {
  const esc = s => (window.MyPlanUtils?.esc ? window.MyPlanUtils.esc(s) : String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
  const uid = () => "sw_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  const CATEGORIES = [
    "Alimentação",
    "Hospedagem",
    "Transporte / Combustível",
    "Passeios & Ingressos",
    "Mercado & Compras",
    "Pedágio & Estacionamento",
    "Voos & Passagens",
    "Outros"
  ];

  /* ========================================================================
     1. ARITMÉTICA SEGURA EM CENTAVOS (INTEGER CENTS)
     ======================================================================== */
  function parseMoneyToCents(raw) {
    if (typeof raw === "number") {
      return Number.isFinite(raw) ? Math.round(raw * 100) : 0;
    }
    let s = String(raw ?? "").trim().replace(/[R$\s]/g, "");
    if (!s) return 0;
    // Se tiver vírgula e ponto (ex: 1.234,56), remove separador de milhar
    if (s.includes(",") && s.includes(".")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const n = Number(s);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100);
  }

  function formatCents(cents) {
    const c = Math.round(Number(cents) || 0);
    const neg = c < 0;
    const abs = Math.abs(c) / 100;
    const formatted = abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${neg ? "-" : ""}R$ ${formatted}`;
  }

  function centsToInput(cents) {
    const c = Math.round(Number(cents) || 0);
    return (c / 100).toFixed(2).replace(".", ",");
  }

  // Distribuição de resto de centavos (Hamilton / Largest Remainder) — soma SEMPRE === totalCents
  function allocateByWeights(totalCents, items) {
    const total = Math.max(0, Math.round(Number(totalCents) || 0));
    const valid = items.filter(it => Number(it.weight) > 0);
    if (!valid.length || total === 0) {
      return items.map(it => ({ participantId: it.participantId, amountCents: 0 }));
    }
    const sumW = valid.reduce((s, it) => s + Number(it.weight), 0);
    const calcs = valid.map((it, idx) => {
      const exact = (total * Number(it.weight)) / sumW;
      const base = Math.floor(exact);
      return { participantId: it.participantId, base, frac: exact - base, idx };
    });
    let rem = total - calcs.reduce((s, x) => s + x.base, 0);
    const byFrac = calcs.slice().sort((a, b) => b.frac - a.frac || a.idx - b.idx);
    for (let i = 0; i < rem; i++) {
      byFrac[i % byFrac.length].base += 1;
    }
    const map = new Map(calcs.map(x => [x.participantId, x.base]));
    return items.map(it => ({ participantId: it.participantId, amountCents: map.get(it.participantId) || 0 }));
  }

  function computeExpenseSplits(expense, participants) {
    const total = Math.max(0, Math.round(Number(expense.amountCents) || 0));
    const shares = Array.isArray(expense.shares) ? expense.shares : [];
    const pIds = participants.map(p => p.id);
    const shareMap = new Map(shares.map(s => [s.participantId, s]));

    if (expense.splitMode === "exact") {
      return pIds.map(id => ({
        participantId: id,
        amountCents: Math.max(0, Math.round(Number(shareMap.get(id)?.amountCents) || 0))
      }));
    }
    if (expense.splitMode === "percent") {
      return allocateByWeights(total, pIds.map(id => ({
        participantId: id,
        weight: Math.max(0, Number(shareMap.get(id)?.percent) || 0)
      })));
    }
    if (expense.splitMode === "shares") {
      return allocateByWeights(total, pIds.map(id => ({
        participantId: id,
        weight: Math.max(0, Number(shareMap.get(id)?.weight) || 0)
      })));
    }
    // Default: equal
    return allocateByWeights(total, pIds.map(id => {
      const sh = shareMap.get(id);
      const inc = sh ? sh.included !== false : true;
      return { participantId: id, weight: inc ? 1 : 0 };
    }));
  }

  /* ========================================================================
     2. MOTOR DE SIMPLIFICAÇÃO DE DÍVIDAS (GREEDY MIN-CASH-FLOW)
     ======================================================================== */
  function computeLedgerAndSettlements(swData) {
    const participants = Array.isArray(swData?.participants) ? swData.participants : [];
    const expenses = Array.isArray(swData?.expenses) ? swData.expenses : [];
    const settlements = Array.isArray(swData?.settlements) ? swData.settlements : [];

    const stats = new Map();
    participants.forEach(p => {
      stats.set(p.id, {
        participant: p,
        paidCents: 0,
        owedCents: 0,
        settledOutCents: 0,
        settledInCents: 0,
        netCents: 0
      });
    });

    let totalGroupCents = 0;

    expenses.forEach(exp => {
      const amount = Math.max(0, Math.round(Number(exp.amountCents) || 0));
      totalGroupCents += amount;

      const payers = Array.isArray(exp.payers) && exp.payers.length ? exp.payers : [];
      payers.forEach(py => {
        const rec = stats.get(py.participantId);
        if (rec) rec.paidCents += Math.max(0, Math.round(Number(py.amountCents) || 0));
      });

      const splits = computeExpenseSplits(exp, participants);
      splits.forEach(sp => {
        const rec = stats.get(sp.participantId);
        if (rec) rec.owedCents += sp.amountCents;
      });
    });

    settlements.forEach(st => {
      const amt = Math.max(0, Math.round(Number(st.amountCents) || 0));
      const fromRec = stats.get(st.fromId);
      const toRec = stats.get(st.toId);
      if (fromRec) fromRec.settledOutCents += amt;
      if (toRec) toRec.settledInCents += amt;
    });

    const balances = [];
    const debtors = [];
    const creditors = [];

    stats.forEach(rec => {
      // Saldo líquido: > 0 tem a receber; < 0 tem a pagar
      rec.netCents = (rec.paidCents - rec.owedCents) + rec.settledOutCents - rec.settledInCents;
      balances.push(rec);
      if (rec.netCents < 0) debtors.push({ id: rec.participant.id, rem: -rec.netCents });
      else if (rec.netCents > 0) creditors.push({ id: rec.participant.id, rem: rec.netCents });
    });

    // Greedy Min-Cash-Flow: emparelha sempre o maior devedor com o maior credor
    const transfers = [];
    while (debtors.length && creditors.length) {
      debtors.sort((a, b) => b.rem - a.rem);
      creditors.sort((a, b) => b.rem - a.rem);
      const d = debtors[0];
      const c = creditors[0];
      const amt = Math.min(d.rem, c.rem);
      if (amt > 0) {
        transfers.push({ fromId: d.id, toId: c.id, amountCents: amt });
      }
      d.rem -= amt;
      c.rem -= amt;
      if (d.rem <= 0) debtors.shift();
      if (c.rem <= 0) creditors.shift();
    }

    const avgPerPersonCents = participants.length ? Math.round(totalGroupCents / participants.length) : 0;
    return {
      totalGroupCents,
      avgPerPersonCents,
      balances,
      transfers
    };
  }

  /* ========================================================================
     3. BR CODE PIX EMV (CRC16-CCITT) — 100% OFFLINE / ZERO DEPENDÊNCIAS
     ======================================================================== */
  function asciiClean(str, maxLen, fallback) {
    const clean = String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9 \-._]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase()
      .slice(0, maxLen);
    return clean || fallback;
  }

  function emvField(id, val) {
    const v = String(val ?? "");
    const len = String(v.length).padStart(2, "0");
    return `${id}${len}${v}`;
  }

  function crc16Ccitt(payload) {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
      crc ^= (payload.charCodeAt(i) & 0xff) << 8;
      for (let b = 0; b < 8; b++) {
        if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
        else crc = (crc << 1) & 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function buildPixBrCode({ key, name, city, amountCents, txid }) {
    const cleanKey = String(key || "").trim();
    if (!cleanKey) return "";
    const merchantName = asciiClean(name, 25, "RECEBEDOR");
    const merchantCity = asciiClean(city, 15, "BRASILIA");
    const cleanTxid = String(txid || "***").replace(/[^A-Za-z0-9*]/g, "").slice(0, 25) || "***";

    const gui = emvField("00", "br.gov.bcb.pix");
    const keyFld = emvField("01", cleanKey);
    const mai = emvField("26", gui + keyFld);

    let payload = "";
    payload += emvField("00", "01"); // Payload Format Indicator
    payload += mai;                  // Merchant Account Information (Pix)
    payload += emvField("52", "0000"); // Merchant Category Code
    payload += emvField("53", "986");  // Currency BRL (986)
    const cents = Math.max(0, Math.round(Number(amountCents) || 0));
    if (cents > 0) {
      payload += emvField("54", (cents / 100).toFixed(2));
    }
    payload += emvField("58", "BR");
    payload += emvField("59", merchantName);
    payload += emvField("60", merchantCity);
    payload += emvField("62", emvField("05", cleanTxid));
    payload += "6304";
    return payload + crc16Ccitt(payload);
  }

  /* ========================================================================
     4. GERADOR DE QR CODE SVG (ISO/IEC 18004, BYTE MODE, ECC-M, V1..V10)
     Zero dependências externas — escaneável por qualquer app bancário Pix
     ======================================================================== */
  const QR_M_SPECS = [
    // [ver, totalCodewords, ecPerBlock, numBlocksGroup1, dataPerBlockG1, numBlocksGroup2, dataPerBlockG2, alignCoords]
    [1,  26,  10, 1, 16, 0, 0,  []],
    [2,  44,  16, 1, 28, 0, 0,  [6, 18]],
    [3,  70,  26, 1, 44, 0, 0,  [6, 22]],
    [4,  100, 18, 2, 32, 0, 0,  [6, 26]],
    [5,  134, 24, 2, 43, 0, 0,  [6, 30]],
    [6,  172, 16, 4, 27, 0, 0,  [6, 34]],
    [7,  196, 18, 4, 31, 0, 0,  [6, 22, 38]],
    [8,  242, 22, 2, 38, 2, 39, [6, 24, 42]],
    [9,  292, 22, 3, 36, 2, 37, [6, 26, 46]],
    [10, 346, 26, 4, 43, 1, 44, [6, 28, 50]]
  ];

  // GF(256) com polinômio primitivo 0x11d
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = GF_EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsComputeEc(data, ecLen) {
    const gen = rsGeneratorPoly(ecLen);
    const res = new Uint8Array(ecLen);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ res[0];
      res.copyWithin(0, 1);
      res[ecLen - 1] = 0;
      if (factor !== 0) {
        for (let j = 0; j < ecLen; j++) {
          res[j] ^= gfMul(gen[j + 1], factor);
        }
      }
    }
    return res;
  }

  function generateQrMatrix(text) {
    const bytes = new TextEncoder().encode(String(text || ""));
    let spec = null;
    for (const sp of QR_M_SPECS) {
      const dataCap = sp[3] * sp[4] + sp[5] * sp[6];
      const countBits = sp[0] <= 9 ? 8 : 16;
      const neededBytes = Math.ceil((4 + countBits + bytes.length * 8) / 8);
      if (neededBytes <= dataCap) {
        spec = sp;
        break;
      }
    }
    if (!spec) return null;

    const [ver, , ecPerBlock, b1, d1, b2, d2, alignCoords] = spec;
    const totalDataBytes = b1 * d1 + b2 * d2;
    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };

    // Byte mode (0100)
    pushBits(0b0100, 4);
    pushBits(bytes.length, ver <= 9 ? 8 : 16);
    for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);
    // Terminator (até 4 zeros)
    const maxBits = totalDataBytes * 8;
    for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const codewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      codewords.push(b);
    }
    let padToggle = 0;
    while (codewords.length < totalDataBytes) {
      codewords.push(padToggle ? 0x11 : 0xec);
      padToggle ^= 1;
    }

    // Dividir em blocos e calcular ECC Reed-Solomon
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (let i = 0; i < b1; i++) {
      const blk = codewords.slice(offset, offset + d1);
      offset += d1;
      dataBlocks.push(blk);
      ecBlocks.push(rsComputeEc(blk, ecPerBlock));
    }
    for (let i = 0; i < b2; i++) {
      const blk = codewords.slice(offset, offset + d2);
      offset += d2;
      dataBlocks.push(blk);
      ecBlocks.push(rsComputeEc(blk, ecPerBlock));
    }

    // Interleave data + ECC
    const finalBytes = [];
    const maxDataLen = Math.max(d1, d2);
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < dataBlocks.length; b++) {
        if (i < dataBlocks[b].length) finalBytes.push(dataBlocks[b][i]);
      }
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (let b = 0; b < ecBlocks.length; b++) {
        finalBytes.push(ecBlocks[b][i]);
      }
    }

    const size = ver * 4 + 17;
    const mat = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
    const isFunc = Array.from({ length: size }, () => new Uint8Array(size));

    const setFunc = (r, c, v) => {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        mat[r][c] = v ? 1 : 0;
        isFunc[r][c] = 1;
      }
    };

    // Finder patterns + separadores
    const placeFinder = (r0, c0) => {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const r = r0 + dr, c = c0 + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          const inBox = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
          const dark = inBox && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
          setFunc(r, c, dark ? 1 : 0);
        }
      }
    };
    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    // Alignment patterns
    for (let i = 0; i < alignCoords.length; i++) {
      for (let j = 0; j < alignCoords.length; j++) {
        const ar = alignCoords[i], ac = alignCoords[j];
        if ((i === 0 && j === 0) || (i === 0 && j === alignCoords.length - 1) || (i === alignCoords.length - 1 && j === 0)) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            setFunc(ar + dr, ac + dc, dark ? 1 : 0);
          }
        }
      }
    }

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      if (!isFunc[6][i]) setFunc(6, i, i % 2 === 0 ? 1 : 0);
      if (!isFunc[i][6]) setFunc(i, 6, i % 2 === 0 ? 1 : 0);
    }

    // Dark module + reservar áreas de format info
    setFunc(size - 8, 8, 1);
    for (let i = 0; i < 9; i++) {
      if (!isFunc[8][i]) setFunc(8, i, 0);
      if (!isFunc[i][8]) setFunc(i, 8, 0);
    }
    for (let i = 0; i < 8; i++) {
      if (!isFunc[8][size - 1 - i]) setFunc(8, size - 1 - i, 0);
      if (!isFunc[size - 1 - i][8]) setFunc(size - 1 - i, 8, 0);
    }

    // Version info (>= 7)
    if (ver >= 7) {
      let rem = ver;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const vBits = (ver << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const bit = (vBits >>> i) & 1;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFunc(a, b, bit);
        setFunc(b, a, bit);
      }
    }

    // Colocar bits em zigue-zague
    const dataBits = [];
    for (let i = 0; i < finalBytes.length; i++) {
      for (let b = 7; b >= 0; b--) dataBits.push((finalBytes[i] >>> b) & 1);
    }
    let bitIdx = 0;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        const r = upward ? (size - 1 - vert) : vert;
        for (let j = 0; j < 2; j++) {
          const c = right - j;
          if (!isFunc[r][c]) {
            mat[r][c] = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
          }
        }
      }
      upward = !upward;
    }

    // Escolher melhor máscara (0..7)
    const maskCond = (m, r, c) => {
      switch (m) {
        case 0: return (r + c) % 2 === 0;
        case 1: return r % 2 === 0;
        case 2: return c % 3 === 0;
        case 3: return (r + c) % 3 === 0;
        case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
        case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
        case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
        default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      }
    };

    const writeFormat = (grid, mask) => {
      // ECC Level M = 00
      const data = (0b00 << 3) | mask;
      let rem = data;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const fmt = ((data << 10) | rem) ^ 0x5412;
      const coordsA = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
      const coordsB = [[size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],[8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]];
      for (let i = 0; i < 15; i++) {
        const bit = (fmt >>> i) & 1;
        grid[coordsA[i][0]][coordsA[i][1]] = bit;
        grid[coordsB[i][0]][coordsB[i][1]] = bit;
      }
    };

    let bestGrid = null;
    let bestPenalty = Infinity;
    for (let m = 0; m < 8; m++) {
      const g = mat.map((row, r) => row.map((v, c) => (isFunc[r][c] ? v : (maskCond(m, r, c) ? (v ^ 1) : v))));
      writeFormat(g, m);
      let pen = 0;
      for (let r = 0; r < size; r++) {
        let run = 1;
        for (let c = 1; c < size; c++) {
          if (g[r][c] === g[r][c - 1]) { run++; if (run === 5) pen += 3; else if (run > 5) pen += 1; }
          else run = 1;
        }
      }
      for (let c = 0; c < size; c++) {
        let run = 1;
        for (let r = 1; r < size; r++) {
          if (g[r][c] === g[r - 1][c]) { run++; if (run === 5) pen += 3; else if (run > 5) pen += 1; }
          else run = 1;
        }
      }
      if (pen < bestPenalty) {
        bestPenalty = pen;
        bestGrid = g;
      }
    }
    return bestGrid;
  }

  function renderQrSvg(text, pxSize = 230) {
    const grid = generateQrMatrix(text);
    if (!grid) return `<div class="muted small">Código muito longo para QR Code.</div>`;
    const n = grid.length;
    const quiet = 4;
    const total = n + quiet * 2;
    let d = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c]) {
          d += `M${c + quiet},${r + quiet}h1v1h-1z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${pxSize}" height="${pxSize}" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix">
      <rect width="${total}" height="${total}" fill="#ffffff"/>
      <path d="${d}" fill="#000000"/>
    </svg>`;
  }

  /* ========================================================================
     5. NORMALIZAÇÃO & INTERFACE DE USUÁRIO (SUB-ABA "DIVIDIR CUSTOS")
     ======================================================================== */
  function ensureSplitwiseState(st) {
    if (!st.splitwise || typeof st.splitwise !== "object") {
      st.splitwise = { participants: [], expenses: [], settlements: [] };
    }
    if (!Array.isArray(st.splitwise.participants)) st.splitwise.participants = [];
    if (!Array.isArray(st.splitwise.expenses)) st.splitwise.expenses = [];
    if (!Array.isArray(st.splitwise.settlements)) st.splitwise.settlements = [];
    return st.splitwise;
  }

  function buildWhatsAppBillingUrl({ fromName, toName, amountCents, pixCode, tripTitle }) {
    const lines = [
      `🤝 *Acerto de Custos — ${tripTitle || "My Plan"}*`,
      `👤 *${fromName}* deve *${formatCents(amountCents)}* para *${toName}*.`
    ];
    if (pixCode) {
      lines.push(`📱 *Pix Copia e Cola (valor exato):*`);
      lines.push(pixCode);
    }
    return `https://wa.me/?text=${encodeURIComponent(lines.join("\n\n"))}`;
  }

  function openPixModal({ fromName, toParticipant, amountCents, tripTitle, toast }) {
    const dlg = document.getElementById("swPixModal");
    if (!dlg) return;
    const pixCode = buildPixBrCode({
      key: toParticipant.pixKey,
      name: toParticipant.pixName || toParticipant.name,
      city: toParticipant.pixCity || "BRASILIA",
      amountCents,
      txid: "MYPLAN" + Date.now().toString(36).slice(-6).toUpperCase()
    });
    const qrHost = document.getElementById("swPixQrHost");
    const summaryEl = document.getElementById("swPixSummary");
    const codeEl = document.getElementById("swPixCode");
    const copyBtn = document.getElementById("btnSwPixCopy");
    const waBtn = document.getElementById("btnSwPixWhatsApp");

    if (summaryEl) {
      summaryEl.innerHTML = `<strong>${esc(fromName)}</strong> paga <span class="sw-amt-hi">${esc(formatCents(amountCents))}</span> para <strong>${esc(toParticipant.name)}</strong>`;
    }
    if (qrHost) qrHost.innerHTML = renderQrSvg(pixCode, 232);
    if (codeEl) codeEl.value = pixCode;
    if (copyBtn) {
      copyBtn.textContent = "📋 Copiar Pix Copia e Cola";
      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(pixCode);
        } catch {
          if (codeEl) { codeEl.select(); document.execCommand("copy"); }
        }
        copyBtn.textContent = "✅ Copiado!";
        toast?.("📋 Código Pix Copia e Cola copiado!");
        setTimeout(() => { copyBtn.textContent = "📋 Copiar Pix Copia e Cola"; }, 2200);
      };
    }
    if (waBtn) {
      waBtn.href = buildWhatsAppBillingUrl({
        fromName,
        toName: toParticipant.name,
        amountCents,
        pixCode,
        tripTitle
      });
    }
    if (!dlg.open) dlg.showModal();
  }

  function openParticipantModal({ sw, participant, onSave, toast }) {
    const dlg = document.getElementById("swParticipantModal");
    if (!dlg) return;
    const isEdit = Boolean(participant);
    document.getElementById("swPartModalTitle").textContent = isEdit ? "Editar Participante" : "Novo Participante";
    const nameIn = document.getElementById("swp-name");
    const keyIn = document.getElementById("swp-pixKey");
    const holderIn = document.getElementById("swp-pixName");
    const cityIn = document.getElementById("swp-pixCity");
    const delBtn = document.getElementById("btnSwpDelete");

    nameIn.value = participant?.name || "";
    keyIn.value = participant?.pixKey || "";
    holderIn.value = participant?.pixName || "";
    cityIn.value = participant?.pixCity || "";
    if (delBtn) {
      delBtn.hidden = !isEdit;
      delBtn.onclick = () => {
        if (!participant) return;
        const used = sw.expenses.some(e =>
          (e.payers || []).some(p => p.participantId === participant.id) ||
          (e.shares || []).some(s => s.participantId === participant.id && (s.included || s.amountCents > 0 || s.percent > 0 || s.weight > 0))
        );
        if (used && !confirm(`"${participant.name}" participa de despesas lançadas. Remover mesmo assim?`)) return;
        sw.participants = sw.participants.filter(p => p.id !== participant.id);
        dlg.close();
        onSave?.("🗑️ Participante removido.");
      };
    }

    const form = document.getElementById("swParticipantForm");
    form.onsubmit = e => {
      e.preventDefault();
      const name = nameIn.value.trim();
      if (!name) return toast?.("Informe o nome do participante.");
      const data = {
        id: participant?.id || uid(),
        name,
        pixKey: keyIn.value.trim(),
        pixName: holderIn.value.trim(),
        pixCity: cityIn.value.trim()
      };
      if (isEdit) {
        const idx = sw.participants.findIndex(p => p.id === participant.id);
        if (idx >= 0) sw.participants[idx] = data;
      } else {
        sw.participants.push(data);
      }
      dlg.close();
      onSave?.(isEdit ? "✔️ Participante atualizado!" : "👤 Participante adicionado!");
    };
    if (!dlg.open) dlg.showModal();
    setTimeout(() => nameIn.focus(), 40);
  }

  function openExpenseModal({ sw, expense, onSave, toast }) {
    const dlg = document.getElementById("swExpenseModal");
    if (!dlg) return;
    if (!sw.participants.length) {
      toast?.("Adicione pelo menos 1 participante antes de lançar despesas.");
      return;
    }
    const isEdit = Boolean(expense);
    document.getElementById("swExpModalTitle").textContent = isEdit ? "Editar Despesa" : "Nova Despesa";

    const descIn = document.getElementById("swe-desc");
    const amtIn = document.getElementById("swe-amount");
    const dateIn = document.getElementById("swe-date");
    const catIn = document.getElementById("swe-cat");
    const multiPayerChk = document.getElementById("swe-multiPayer");
    const payersHost = document.getElementById("swe-payersHost");
    const splitTabs = document.getElementById("swe-splitTabs");
    const splitHost = document.getElementById("swe-splitHost");
    const valStatus = document.getElementById("swe-validation");
    const delBtn = document.getElementById("btnSweDelete");

    catIn.innerHTML = CATEGORIES.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");

    descIn.value = expense?.desc || "";
    amtIn.value = expense ? centsToInput(expense.amountCents) : "";
    dateIn.value = expense?.date || new Date().toISOString().slice(0, 10);
    catIn.value = expense?.cat || CATEGORIES[0];

    let splitMode = expense?.splitMode || "equal";
    let multiPayer = Boolean(expense && Array.isArray(expense.payers) && expense.payers.length > 1);
    multiPayerChk.checked = multiPayer;

    let singlePayerId = (expense?.payers?.[0]?.participantId) || sw.participants[0].id;
    const payerCentsMap = new Map();
    sw.participants.forEach(p => {
      const found = (expense?.payers || []).find(x => x.participantId === p.id);
      payerCentsMap.set(p.id, found ? found.amountCents : 0);
    });

    const shareState = new Map();
    sw.participants.forEach(p => {
      const found = (expense?.shares || []).find(x => x.participantId === p.id);
      shareState.set(p.id, {
        included: found ? found.included !== false : true,
        amountCents: found ? (found.amountCents || 0) : 0,
        percent: found ? (Number(found.percent) || 0) : (Math.round((10000 / sw.participants.length)) / 100),
        weight: found ? (Number(found.weight) || 0) : 1
      });
    });

    const renderPayers = () => {
      if (!multiPayer) {
        payersHost.innerHTML = `<div class="sw-payer-chips">${sw.participants.map(p => `
          <button type="button" class="sw-payer-chip${p.id === singlePayerId ? " active" : ""}" data-sw-payer="${esc(p.id)}">${esc(p.name)}</button>
        `).join("")}</div>`;
        payersHost.querySelectorAll("[data-sw-payer]").forEach(btn => {
          btn.onclick = () => { singlePayerId = btn.dataset.swPayer; renderPayers(); };
        });
      } else {
        payersHost.innerHTML = `<div class="sw-multi-list">${sw.participants.map(p => `
          <div class="sw-split-row">
            <span class="sw-split-name">${esc(p.name)}</span>
            <div class="sw-num-wrap"><span>R$</span><input type="text" inputmode="decimal" data-sw-mpay="${esc(p.id)}" value="${esc(centsToInput(payerCentsMap.get(p.id) || 0))}"></div>
          </div>
        `).join("")}</div>`;
        payersHost.querySelectorAll("[data-sw-mpay]").forEach(inp => {
          inp.oninput = () => { payerCentsMap.set(inp.dataset.swMpay, parseMoneyToCents(inp.value)); updateValidation(); };
        });
      }
      updateValidation();
    };

    const renderSplitRows = () => {
      splitTabs.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.swMode === splitMode));
      const totalCents = parseMoneyToCents(amtIn.value);

      if (splitMode === "equal") {
        const preview = computeExpenseSplits({
          amountCents: totalCents,
          splitMode: "equal",
          shares: sw.participants.map(p => ({ participantId: p.id, included: shareState.get(p.id).included }))
        }, sw.participants);
        const pMap = new Map(preview.map(x => [x.participantId, x.amountCents]));
        splitHost.innerHTML = sw.participants.map(p => {
          const st = shareState.get(p.id);
          return `<label class="sw-split-row sw-split-check">
            <input type="checkbox" data-sw-eq="${esc(p.id)}" ${st.included ? "checked" : ""}>
            <span class="sw-split-name">${esc(p.name)}</span>
            <span class="sw-split-calc">${esc(formatCents(pMap.get(p.id) || 0))}</span>
          </label>`;
        }).join("");
        splitHost.querySelectorAll("[data-sw-eq]").forEach(cb => {
          cb.onchange = () => { shareState.get(cb.dataset.swEq).included = cb.checked; renderSplitRows(); };
        });
      } else if (splitMode === "exact") {
        splitHost.innerHTML = sw.participants.map(p => {
          const st = shareState.get(p.id);
          return `<div class="sw-split-row">
            <span class="sw-split-name">${esc(p.name)}</span>
            <div class="sw-num-wrap"><span>R$</span><input type="text" inputmode="decimal" data-sw-ex="${esc(p.id)}" value="${esc(centsToInput(st.amountCents))}"></div>
          </div>`;
        }).join("");
        splitHost.querySelectorAll("[data-sw-ex]").forEach(inp => {
          inp.oninput = () => { shareState.get(inp.dataset.swEx).amountCents = parseMoneyToCents(inp.value); updateValidation(); };
        });
      } else if (splitMode === "percent") {
        const preview = computeExpenseSplits({
          amountCents: totalCents,
          splitMode: "percent",
          shares: sw.participants.map(p => ({ participantId: p.id, percent: shareState.get(p.id).percent }))
        }, sw.participants);
        const pMap = new Map(preview.map(x => [x.participantId, x.amountCents]));
        splitHost.innerHTML = sw.participants.map(p => {
          const st = shareState.get(p.id);
          return `<div class="sw-split-row">
            <span class="sw-split-name">${esc(p.name)} <small class="muted">(${esc(formatCents(pMap.get(p.id) || 0))})</small></span>
            <div class="sw-num-wrap"><input type="number" step="0.01" min="0" max="100" data-sw-pct="${esc(p.id)}" value="${esc(String(st.percent))}"><span>%</span></div>
          </div>`;
        }).join("");
        splitHost.querySelectorAll("[data-sw-pct]").forEach(inp => {
          inp.oninput = () => {
            shareState.get(inp.dataset.swPct).percent = Math.max(0, Number(inp.value) || 0);
            updateValidation();
          };
        });
      } else {
        // shares (cotas/partes)
        const preview = computeExpenseSplits({
          amountCents: totalCents,
          splitMode: "shares",
          shares: sw.participants.map(p => ({ participantId: p.id, weight: shareState.get(p.id).weight }))
        }, sw.participants);
        const pMap = new Map(preview.map(x => [x.participantId, x.amountCents]));
        splitHost.innerHTML = sw.participants.map(p => {
          const st = shareState.get(p.id);
          return `<div class="sw-split-row">
            <span class="sw-split-name">${esc(p.name)} <small class="muted" data-sw-sh-calc="${esc(p.id)}">(${esc(formatCents(pMap.get(p.id) || 0))})</small></span>
            <div class="sw-num-wrap"><input type="number" step="0.5" min="0" data-sw-sh="${esc(p.id)}" value="${esc(String(st.weight))}"><span>cota(s)</span></div>
          </div>`;
        }).join("");
        splitHost.querySelectorAll("[data-sw-sh]").forEach(inp => {
          inp.oninput = () => {
            shareState.get(inp.dataset.swSh).weight = Math.max(0, Number(inp.value) || 0);
            const liveTotal = parseMoneyToCents(amtIn.value);
            const livePrev = computeExpenseSplits({
              amountCents: liveTotal,
              splitMode: "shares",
              shares: sw.participants.map(p => ({ participantId: p.id, weight: shareState.get(p.id).weight }))
            }, sw.participants);
            livePrev.forEach(x => {
              const sp = splitHost.querySelector(`[data-sw-sh-calc="${x.participantId}"]`);
              if (sp) sp.textContent = `(${formatCents(x.amountCents)})`;
            });
            updateValidation();
          };
        });
      }
      updateValidation();
    };

    const updateValidation = () => {
      const totalCents = parseMoneyToCents(amtIn.value);
      const msgs = [];
      let ok = totalCents > 0;
      if (totalCents <= 0) msgs.push("Informe um valor maior que R$ 0,00.");

      if (multiPayer) {
        const sumPaid = sw.participants.reduce((s, p) => s + (payerCentsMap.get(p.id) || 0), 0);
        const diff = totalCents - sumPaid;
        if (diff !== 0) {
          ok = false;
          msgs.push(`Pagadores somam ${formatCents(sumPaid)} (${diff > 0 ? "faltam " + formatCents(diff) : "excede " + formatCents(-diff)}).`);
        }
      }

      if (splitMode === "equal") {
        const cnt = sw.participants.filter(p => shareState.get(p.id).included).length;
        if (cnt === 0) { ok = false; msgs.push("Marque ao menos 1 participante na divisão."); }
      } else if (splitMode === "exact") {
        const sumEx = sw.participants.reduce((s, p) => s + (shareState.get(p.id).amountCents || 0), 0);
        const diff = totalCents - sumEx;
        if (diff !== 0) {
          ok = false;
          msgs.push(`Valores exatos somam ${formatCents(sumEx)} (${diff > 0 ? "faltam " + formatCents(diff) : "excede " + formatCents(-diff)}).`);
        }
      } else if (splitMode === "percent") {
        const sumPct = Math.round(sw.participants.reduce((s, p) => s + (Number(shareState.get(p.id).percent) || 0), 0) * 100) / 100;
        if (Math.abs(sumPct - 100) > 0.01) {
          ok = false;
          msgs.push(`Porcentagens somam ${sumPct.toFixed(2)}% (precisa somar exatamente 100%).`);
        }
      } else if (splitMode === "shares") {
        const sumW = sw.participants.reduce((s, p) => s + (Number(shareState.get(p.id).weight) || 0), 0);
        if (sumW <= 0) { ok = false; msgs.push("Informe pelo menos 1 cota maior que zero."); }
      }

      valStatus.className = `sw-val-status ${ok ? "is-ok" : "is-warn"}`;
      valStatus.textContent = ok ? "✅ Divisão balanceada com precisão exata em centavos." : "⚠️ " + msgs.join(" ");
      return ok;
    };

    multiPayerChk.onchange = () => {
      multiPayer = multiPayerChk.checked;
      if (multiPayer) {
        const tot = parseMoneyToCents(amtIn.value);
        const curSum = sw.participants.reduce((s, p) => s + (payerCentsMap.get(p.id) || 0), 0);
        if (curSum === 0 && tot > 0) payerCentsMap.set(singlePayerId, tot);
      }
      renderPayers();
    };

    amtIn.oninput = () => {
      if (splitMode === "equal" || splitMode === "shares") renderSplitRows();
      else updateValidation();
    };

    splitTabs.querySelectorAll("button").forEach(b => {
      b.onclick = () => { splitMode = b.dataset.swMode; renderSplitRows(); };
    });

    if (delBtn) {
      delBtn.hidden = !isEdit;
      delBtn.onclick = () => {
        if (!expense || !confirm(`Excluir a despesa "${expense.desc}"?`)) return;
        sw.expenses = sw.expenses.filter(x => x.id !== expense.id);
        dlg.close();
        onSave?.("🗑️ Despesa removida.");
      };
    }

    const form = document.getElementById("swExpenseForm");
    form.onsubmit = e => {
      e.preventDefault();
      if (!updateValidation()) return toast?.("Ajuste os valores antes de salvar.");
      const desc = descIn.value.trim();
      if (!desc) return toast?.("Informe a descrição da despesa.");
      const totalCents = parseMoneyToCents(amtIn.value);

      const payers = multiPayer
        ? sw.participants.map(p => ({ participantId: p.id, amountCents: payerCentsMap.get(p.id) || 0 })).filter(x => x.amountCents > 0)
        : [{ participantId: singlePayerId, amountCents: totalCents }];

      const shares = sw.participants.map(p => {
        const st = shareState.get(p.id);
        return {
          participantId: p.id,
          included: Boolean(st.included),
          amountCents: Math.max(0, Math.round(st.amountCents || 0)),
          percent: Math.max(0, Number(st.percent) || 0),
          weight: Math.max(0, Number(st.weight) || 0)
        };
      });

      const rec = {
        id: expense?.id || uid(),
        desc,
        amountCents: totalCents,
        date: dateIn.value || new Date().toISOString().slice(0, 10),
        cat: catIn.value || CATEGORIES[0],
        payers,
        splitMode,
        shares
      };

      if (isEdit) {
        const idx = sw.expenses.findIndex(x => x.id === expense.id);
        if (idx >= 0) sw.expenses[idx] = rec;
      } else {
        sw.expenses.unshift(rec);
      }
      dlg.close();
      onSave?.(isEdit ? "✔️ Despesa atualizada!" : "💸 Despesa adicionada e divisão recalculada!");
    };

    renderPayers();
    renderSplitRows();
    if (!dlg.open) dlg.showModal();
    setTimeout(() => descIn.focus(), 40);
  }

  function renderSplitwiseView({ container, state, tripTitle, fmtBR, onSave, toast }) {
    if (!container || !state) return;
    const sw = ensureSplitwiseState(state);
    const ledger = computeLedgerAndSettlements(sw);
    const pById = new Map(sw.participants.map(p => [p.id, p]));
    const fmtDate = iso => (iso && fmtBR ? fmtBR(iso) : (iso || ""));

    const participantsHtml = sw.participants.length
      ? ledger.balances.map(b => {
          const cls = b.netCents > 0 ? "is-pos" : b.netCents < 0 ? "is-neg" : "is-zero";
          const lbl = b.netCents > 0 ? `Recebe ${formatCents(b.netCents)}` : b.netCents < 0 ? `Deve ${formatCents(-b.netCents)}` : "Quitado";
          return `<div class="sw-part-card ${cls}" data-sw-edit-part="${esc(b.participant.id)}" role="button" tabindex="0" title="Clique para editar participante ou chave Pix">
            <div class="sw-part-top">
              <strong>${esc(b.participant.name)}</strong>
              ${b.participant.pixKey ? `<span class="sw-pix-tag" title="Chave Pix cadastrada">🔑 Pix</span>` : `<span class="sw-pix-tag is-empty">Sem Pix</span>`}
            </div>
            <div class="sw-part-net">${esc(lbl)}</div>
            <div class="sw-part-sub muted small">Pagou ${esc(formatCents(b.paidCents))} · Parte ${esc(formatCents(b.owedCents))}</div>
          </div>`;
        }).join("")
      : `<div class="sw-empty-hint">
          <p class="muted">Adicione os participantes da viagem ou evento (ex: Casal, Amigos, Família) para começar a dividir os custos automaticamente.</p>
        </div>`;

    const transfersHtml = ledger.transfers.length
      ? ledger.transfers.map((tr, idx) => {
          const from = pById.get(tr.fromId);
          const to = pById.get(tr.toId);
          if (!from || !to) return "";
          const hasPix = Boolean(String(to.pixKey || "").trim());
          const pixCode = hasPix ? buildPixBrCode({
            key: to.pixKey,
            name: to.pixName || to.name,
            city: to.pixCity || "BRASILIA",
            amountCents: tr.amountCents
          }) : "";
          const waUrl = buildWhatsAppBillingUrl({
            fromName: from.name,
            toName: to.name,
            amountCents: tr.amountCents,
            pixCode,
            tripTitle
          });
          return `<div class="sw-transfer-card">
            <div class="sw-transfer-main">
              <div class="sw-transfer-text">
                <strong>${esc(from.name)}</strong> <span class="muted">paga</span>
                <span class="sw-transfer-amt">${esc(formatCents(tr.amountCents))}</span>
                <span class="muted">para</span> <strong>${esc(to.name)}</strong>
              </div>
              ${!hasPix ? `<div class="muted small">Cadastre a chave Pix de ${esc(to.name)} para gerar QR Code automático.</div>` : ""}
            </div>
            <div class="sw-transfer-actions">
              ${hasPix ? `<button type="button" class="btn primary small" data-sw-pix="${idx}">📱 Pagar com Pix</button>` : ""}
              <a class="btn ghost small sw-wa-btn" href="${esc(waUrl)}" target="_blank" rel="noopener">💬 Cobrar no WhatsApp</a>
              <button type="button" class="btn ghost small sw-settle-btn" data-sw-settle="${idx}">✅ Marcar como pago</button>
            </div>
          </div>`;
        }).join("")
      : `<div class="sw-all-settled">🎉 ${sw.expenses.length ? "Todas as contas estão quitadas! Nenhuma transferência pendente." : "Lance despesas abaixo para gerar a proposta automática de acertos."}</div>`;

    const modeLabels = { equal: "Igualmente", exact: "Valores exatos", percent: "Porcentagem", shares: "Cotas" };
    const expensesHtml = sw.expenses.length
      ? sw.expenses.map(exp => {
          const payerNames = (exp.payers || []).map(py => {
            const p = pById.get(py.participantId);
            return p ? (exp.payers.length > 1 ? `${p.name} (${formatCents(py.amountCents)})` : p.name) : "—";
          }).join(", ");
          return `<div class="sw-exp-row" data-sw-edit-exp="${esc(exp.id)}" role="button" tabindex="0">
            <div class="sw-exp-main">
              <div class="sw-exp-title">${esc(exp.desc)}</div>
              <div class="sw-exp-meta muted small">
                <span>📅 ${esc(fmtDate(exp.date))}</span> ·
                <span>🏷️ ${esc(exp.cat || "Outros")}</span> ·
                <span>💳 Pago por <b>${esc(payerNames || "—")}</b></span> ·
                <span>⚖️ ${esc(modeLabels[exp.splitMode] || "Igualmente")}</span>
              </div>
            </div>
            <div class="sw-exp-right">
              <strong>${esc(formatCents(exp.amountCents))}</strong>
              <span class="muted small">✏️</span>
            </div>
          </div>`;
        }).join("")
      : `<div class="muted small" style="padding:12px 2px">Nenhuma despesa lançada neste grupo ainda.</div>`;

    const historyHtml = sw.settlements.length
      ? `<div class="card sw-section-card">
          <div class="card-head">
            <h2>📜 Histórico de Acertos Quitados <span class="pill">${sw.settlements.length}</span></h2>
          </div>
          <div class="sw-history-list">${sw.settlements.map(st => {
            const from = pById.get(st.fromId)?.name || "Participante";
            const to = pById.get(st.toId)?.name || "Participante";
            return `<div class="sw-history-row">
              <span>✅ <b>${esc(from)}</b> pagou <b>${esc(formatCents(st.amountCents))}</b> para <b>${esc(to)}</b> <small class="muted">(${esc(fmtDate(st.date))})</small></span>
              <button type="button" class="icon-btn" data-sw-undo-settle="${esc(st.id)}" title="Desfazer quitação">↩️</button>
            </div>`;
          }).join("")}</div>
        </div>`
      : "";

    container.innerHTML = `
      <div class="kpis fin-kpis sw-kpis">
        <div class="kpi"><span class="k">Total gasto no grupo</span><strong class="v">${esc(formatCents(ledger.totalGroupCents))}</strong><span class="s">${sw.expenses.length} despesa(s)</span></div>
        <div class="kpi"><span class="k">Custo médio por pessoa</span><strong class="v">${esc(formatCents(ledger.avgPerPersonCents))}</strong><span class="s">${sw.participants.length} participante(s)</span></div>
        <div class="kpi"><span class="k">Transferências pendentes</span><strong class="v">${ledger.transfers.length}</strong><span class="s">${ledger.transfers.length ? "Simplificadas ao mínimo" : "Tudo quitado"}</span></div>
      </div>

      <div class="card sw-section-card">
        <div class="card-head">
          <h2>👥 Participantes &amp; Chaves Pix</h2>
          <div class="inline-actions">
            <button type="button" class="btn ghost small" id="btnSwAddParticipant">➕ Participante</button>
            <button type="button" class="btn primary small" id="btnSwAddExpense" ${sw.participants.length ? "" : "disabled"}>💸 + Nova Despesa</button>
          </div>
        </div>
        <div class="sw-parts-grid">${participantsHtml}</div>
      </div>

      <div class="card sw-section-card">
        <div class="card-head">
          <h2>⚖️ Proposta Automática de Acertos</h2>
          <span class="muted small">Menor número possível de transferências</span>
        </div>
        <div class="sw-transfers-list">${transfersHtml}</div>
      </div>

      <div class="card sw-section-card">
        <div class="card-head">
          <h2>🧾 Despesas do Grupo <span class="pill">${sw.expenses.length}</span></h2>
          <button type="button" class="btn primary small" id="btnSwAddExpense2" ${sw.participants.length ? "" : "disabled"}>➕ Nova Despesa</button>
        </div>
        <div class="sw-expenses-list">${expensesHtml}</div>
      </div>

      ${historyHtml}
    `;

    // Bindings
    const addPartBtn = container.querySelector("#btnSwAddParticipant");
    if (addPartBtn) addPartBtn.onclick = () => openParticipantModal({ sw, participant: null, onSave, toast });

    ["#btnSwAddExpense", "#btnSwAddExpense2"].forEach(s => {
      const b = container.querySelector(s);
      if (b) b.onclick = () => openExpenseModal({ sw, expense: null, onSave, toast });
    });

    container.querySelectorAll("[data-sw-edit-part]").forEach(el => {
      el.onclick = () => {
        const p = pById.get(el.dataset.swEditPart);
        if (p) openParticipantModal({ sw, participant: p, onSave, toast });
      };
    });

    container.querySelectorAll("[data-sw-edit-exp]").forEach(el => {
      el.onclick = () => {
        const exp = sw.expenses.find(x => x.id === el.dataset.swEditExp);
        if (exp) openExpenseModal({ sw, expense: exp, onSave, toast });
      };
    });

    container.querySelectorAll("[data-sw-pix]").forEach(btn => {
      btn.onclick = () => {
        const tr = ledger.transfers[parseInt(btn.dataset.swPix, 10)];
        if (!tr) return;
        const from = pById.get(tr.fromId);
        const to = pById.get(tr.toId);
        if (from && to) openPixModal({ fromName: from.name, toParticipant: to, amountCents: tr.amountCents, tripTitle, toast });
      };
    });

    container.querySelectorAll("[data-sw-settle]").forEach(btn => {
      btn.onclick = () => {
        const tr = ledger.transfers[parseInt(btn.dataset.swSettle, 10)];
        if (!tr) return;
        const from = pById.get(tr.fromId);
        const to = pById.get(tr.toId);
        if (!from || !to) return;
        sw.settlements.unshift({
          id: uid(),
          fromId: tr.fromId,
          toId: tr.toId,
          amountCents: tr.amountCents,
          date: new Date().toISOString().slice(0, 10)
        });
        onSave?.(`✅ Quitado: ${from.name} pagou ${formatCents(tr.amountCents)} para ${to.name}!`);
      };
    });

    container.querySelectorAll("[data-sw-undo-settle]").forEach(btn => {
      btn.onclick = () => {
        if (!confirm("Desfazer esta quitação e reabrir o saldo?")) return;
        sw.settlements = sw.settlements.filter(s => s.id !== btn.dataset.swUndoSettle);
        onSave?.("↩️ Quitação desfeita.");
      };
    });
  }

  window.MyPlanSplitwise = {
    parseMoneyToCents,
    formatCents,
    computeExpenseSplits,
    computeLedgerAndSettlements,
    crc16Ccitt,
    buildPixBrCode,
    renderQrSvg,
    ensureSplitwiseState,
    renderSplitwiseView
  };
})();
