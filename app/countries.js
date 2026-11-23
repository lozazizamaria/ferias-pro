/* ===== Lista de Países (DDI), Validação WhatsApp Brasil & Resumo — My Plan ===== */
(function () {
  const COUNTRIES = [
    { dial: "+55", iso: "BR", name: "Brasil" },
    { dial: "+93", iso: "AF", name: "Afeganistão" },
    { dial: "+27", iso: "ZA", name: "África do Sul" },
    { dial: "+355", iso: "AL", name: "Albânia" },
    { dial: "+49", iso: "DE", name: "Alemanha" },
    { dial: "+376", iso: "AD", name: "Andorra" },
    { dial: "+244", iso: "AO", name: "Angola" },
    { dial: "+1268", iso: "AG", name: "Antígua e Barbuda" },
    { dial: "+966", iso: "SA", name: "Arábia Saudita" },
    { dial: "+213", iso: "DZ", name: "Argélia" },
    { dial: "+54", iso: "AR", name: "Argentina" },
    { dial: "+374", iso: "AM", name: "Armênia" },
    { dial: "+61", iso: "AU", name: "Austrália" },
    { dial: "+43", iso: "AT", name: "Áustria" },
    { dial: "+994", iso: "AZ", name: "Azerbaijão" },
    { dial: "+1242", iso: "BS", name: "Bahamas" },
    { dial: "+880", iso: "BD", name: "Bangladesh" },
    { dial: "+1246", iso: "BB", name: "Barbados" },
    { dial: "+973", iso: "BH", name: "Bahrein" },
    { dial: "+32", iso: "BE", name: "Bélgica" },
    { dial: "+501", iso: "BZ", name: "Belize" },
    { dial: "+229", iso: "BJ", name: "Benim" },
    { dial: "+375", iso: "BY", name: "Bielorrússia" },
    { dial: "+591", iso: "BO", name: "Bolívia" },
    { dial: "+387", iso: "BA", name: "Bósnia e Herzegovina" },
    { dial: "+267", iso: "BW", name: "Botsuana" },
    { dial: "+673", iso: "BN", name: "Brunei" },
    { dial: "+359", iso: "BG", name: "Bulgária" },
    { dial: "+226", iso: "BF", name: "Burkina Faso" },
    { dial: "+257", iso: "BI", name: "Burundi" },
    { dial: "+975", iso: "BT", name: "Butão" },
    { dial: "+238", iso: "CV", name: "Cabo Verde" },
    { dial: "+237", iso: "CM", name: "Camarões" },
    { dial: "+855", iso: "KH", name: "Camboja" },
    { dial: "+1", iso: "CA", name: "Canadá" },
    { dial: "+974", iso: "QA", name: "Catar" },
    { dial: "+7", iso: "KZ", name: "Cazaquistão" },
    { dial: "+235", iso: "TD", name: "Chade" },
    { dial: "+56", iso: "CL", name: "Chile" },
    { dial: "+86", iso: "CN", name: "China" },
    { dial: "+357", iso: "CY", name: "Chipre" },
    { dial: "+57", iso: "CO", name: "Colômbia" },
    { dial: "+269", iso: "KM", name: "Comores" },
    { dial: "+242", iso: "CG", name: "Congo" },
    { dial: "+243", iso: "CD", name: "Congo (RDC)" },
    { dial: "+82", iso: "KR", name: "Coreia do Sul" },
    { dial: "+225", iso: "CI", name: "Costa do Marfim" },
    { dial: "+506", iso: "CR", name: "Costa Rica" },
    { dial: "+385", iso: "HR", name: "Croácia" },
    { dial: "+53", iso: "CU", name: "Cuba" },
    { dial: "+45", iso: "DK", name: "Dinamarca" },
    { dial: "+253", iso: "DJ", name: "Djibuti" },
    { dial: "+1767", iso: "DM", name: "Dominica" },
    { dial: "+20", iso: "EG", name: "Egito" },
    { dial: "+503", iso: "SV", name: "El Salvador" },
    { dial: "+971", iso: "AE", name: "Emirados Árabes Unidos" },
    { dial: "+593", iso: "EC", name: "Equador" },
    { dial: "+291", iso: "ER", name: "Eritreia" },
    { dial: "+421", iso: "SK", name: "Eslováquia" },
    { dial: "+386", iso: "SI", name: "Eslovênia" },
    { dial: "+34", iso: "ES", name: "Espanha" },
    { dial: "+1", iso: "US", name: "Estados Unidos" },
    { dial: "+372", iso: "EE", name: "Estônia" },
    { dial: "+268", iso: "SZ", name: "Essuatíni" },
    { dial: "+251", iso: "ET", name: "Etiópia" },
    { dial: "+679", iso: "FJ", name: "Fiji" },
    { dial: "+63", iso: "PH", name: "Filipinas" },
    { dial: "+358", iso: "FI", name: "Finlândia" },
    { dial: "+33", iso: "FR", name: "França" },
    { dial: "+241", iso: "GA", name: "Gabão" },
    { dial: "+220", iso: "GM", name: "Gâmbia" },
    { dial: "+233", iso: "GH", name: "Gana" },
    { dial: "+995", iso: "GE", name: "Geórgia" },
    { dial: "+1473", iso: "GD", name: "Granada" },
    { dial: "+30", iso: "GR", name: "Grécia" },
    { dial: "+502", iso: "GT", name: "Guatemala" },
    { dial: "+592", iso: "GY", name: "Guiana" },
    { dial: "+224", iso: "GN", name: "Guiné" },
    { dial: "+245", iso: "GW", name: "Guiné-Bissau" },
    { dial: "+240", iso: "GQ", name: "Guiné Equatorial" },
    { dial: "+509", iso: "HT", name: "Haiti" },
    { dial: "+504", iso: "HN", name: "Honduras" },
    { dial: "+852", iso: "HK", name: "Hong Kong" },
    { dial: "+36", iso: "HU", name: "Hungria" },
    { dial: "+967", iso: "YE", name: "Iêmen" },
    { dial: "+91", iso: "IN", name: "Índia" },
    { dial: "+62", iso: "ID", name: "Indonésia" },
    { dial: "+964", iso: "IQ", name: "Iraque" },
    { dial: "+98", iso: "IR", name: "Irã" },
    { dial: "+353", iso: "IE", name: "Irlanda" },
    { dial: "+354", iso: "IS", name: "Islândia" },
    { dial: "+972", iso: "IL", name: "Israel" },
    { dial: "+39", iso: "IT", name: "Itália" },
    { dial: "+1876", iso: "JM", name: "Jamaica" },
    { dial: "+81", iso: "JP", name: "Japão" },
    { dial: "+962", iso: "JO", name: "Jordânia" },
    { dial: "+254", iso: "KE", name: "Quênia" },
    { dial: "+996", iso: "KG", name: "Quirguistão" },
    { dial: "+965", iso: "KW", name: "Kuwait" },
    { dial: "+856", iso: "LA", name: "Laos" },
    { dial: "+266", iso: "LS", name: "Lesoto" },
    { dial: "+371", iso: "LV", name: "Letônia" },
    { dial: "+961", iso: "LB", name: "Líbano" },
    { dial: "+231", iso: "LR", name: "Libéria" },
    { dial: "+218", iso: "LY", name: "Líbia" },
    { dial: "+423", iso: "LI", name: "Liechtenstein" },
    { dial: "+370", iso: "LT", name: "Lituânia" },
    { dial: "+352", iso: "LU", name: "Luxemburgo" },
    { dial: "+389", iso: "MK", name: "Macedônia do Norte" },
    { dial: "+261", iso: "MG", name: "Madagascar" },
    { dial: "+60", iso: "MY", name: "Malásia" },
    { dial: "+265", iso: "MW", name: "Malawi" },
    { dial: "+960", iso: "MV", name: "Maldivas" },
    { dial: "+223", iso: "ML", name: "Mali" },
    { dial: "+356", iso: "MT", name: "Malta" },
    { dial: "+212", iso: "MA", name: "Marrocos" },
    { dial: "+230", iso: "MU", name: "Maurício" },
    { dial: "+222", iso: "MR", name: "Mauritânia" },
    { dial: "+52", iso: "MX", name: "México" },
    { dial: "+95", iso: "MM", name: "Mianmar" },
    { dial: "+258", iso: "MZ", name: "Moçambique" },
    { dial: "+373", iso: "MD", name: "Moldávia" },
    { dial: "+377", iso: "MC", name: "Mônaco" },
    { dial: "+976", iso: "MN", name: "Mongólia" },
    { dial: "+382", iso: "ME", name: "Montenegro" },
    { dial: "+264", iso: "NA", name: "Namíbia" },
    { dial: "+977", iso: "NP", name: "Nepal" },
    { dial: "+505", iso: "NI", name: "Nicarágua" },
    { dial: "+227", iso: "NE", name: "Níger" },
    { dial: "+234", iso: "NG", name: "Nigéria" },
    { dial: "+47", iso: "NO", name: "Noruega" },
    { dial: "+64", iso: "NZ", name: "Nova Zelândia" },
    { dial: "+968", iso: "OM", name: "Omã" },
    { dial: "+31", iso: "NL", name: "Países Baixos" },
    { dial: "+92", iso: "PK", name: "Paquistão" },
    { dial: "+507", iso: "PA", name: "Panamá" },
    { dial: "+675", iso: "PG", name: "Papua-Nova Guiné" },
    { dial: "+595", iso: "PY", name: "Paraguai" },
    { dial: "+51", iso: "PE", name: "Peru" },
    { dial: "+48", iso: "PL", name: "Polônia" },
    { dial: "+351", iso: "PT", name: "Portugal" },
    { dial: "+44", iso: "GB", name: "Reino Unido" },
    { dial: "+236", iso: "CF", name: "Rep. Centro-Africana" },
    { dial: "+1809", iso: "DO", name: "República Dominicana" },
    { dial: "+420", iso: "CZ", name: "República Tcheca" },
    { dial: "+40", iso: "RO", name: "Romênia" },
    { dial: "+250", iso: "RW", name: "Ruanda" },
    { dial: "+7", iso: "RU", name: "Rússia" },
    { dial: "+685", iso: "WS", name: "Samoa" },
    { dial: "+378", iso: "SM", name: "San Marino" },
    { dial: "+239", iso: "ST", name: "São Tomé e Príncipe" },
    { dial: "+221", iso: "SN", name: "Senegal" },
    { dial: "+232", iso: "SL", name: "Serra Leoa" },
    { dial: "+381", iso: "RS", name: "Sérvia" },
    { dial: "+65", iso: "SG", name: "Singapura" },
    { dial: "+963", iso: "SY", name: "Síria" },
    { dial: "+252", iso: "SO", name: "Somália" },
    { dial: "+94", iso: "LK", name: "Sri Lanka" },
    { dial: "+249", iso: "SD", name: "Sudão" },
    { dial: "+46", iso: "SE", name: "Suécia" },
    { dial: "+41", iso: "CH", name: "Suíça" },
    { dial: "+597", iso: "SR", name: "Suriname" },
    { dial: "+66", iso: "TH", name: "Tailândia" },
    { dial: "+886", iso: "TW", name: "Taiwan" },
    { dial: "+255", iso: "TZ", name: "Tanzânia" },
    { dial: "+670", iso: "TL", name: "Timor-Leste" },
    { dial: "+228", iso: "TG", name: "Togo" },
    { dial: "+1868", iso: "TT", name: "Trinidad e Tobago" },
    { dial: "+216", iso: "TN", name: "Tunísia" },
    { dial: "+90", iso: "TR", name: "Turquia" },
    { dial: "+380", iso: "UA", name: "Ucrânia" },
    { dial: "+256", iso: "UG", name: "Uganda" },
    { dial: "+598", iso: "UY", name: "Uruguai" },
    { dial: "+998", iso: "UZ", name: "Uzbequistão" },
    { dial: "+58", iso: "VE", name: "Venezuela" },
    { dial: "+84", iso: "VN", name: "Vietnã" },
    { dial: "+260", iso: "ZM", name: "Zâmbia" },
    { dial: "+263", iso: "ZW", name: "Zimbábue" }
  ];

  // DDDs oficiais válidos da Anatel (Brasil)
  const VALID_BR_DDDS = new Set([
    "11","12","13","14","15","16","17","18","19",
    "21","22","24","27","28",
    "31","32","33","34","35","37","38",
    "41","42","43","44","45","46","47","48","49",
    "51","53","54","55",
    "61","62","63","64","65","66","67","68","69",
    "71","73","74","75","77","79",
    "81","82","83","84","85","86","87","88","89",
    "91","92","93","94","95","96","97","98","99"
  ]);

  function onlyDigits(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function formatPhoneMask(dial, raw) {
    const d = onlyDigits(raw);
    if (dial !== "+55") return d.slice(0, 14);
    const local = d.slice(0, 11);
    if (local.length <= 2) return local ? `(${local}` : "";
    if (local.length <= 7) return `(${local.slice(0, 2)}) ${local.slice(2)}`;
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }

  function validateWhatsApp(dial, rawNumber) {
    const cleanDial = String(dial || "+55").trim();
    const dialDigits = onlyDigits(cleanDial);
    if (!dialDigits) return { valid: false, error: "Selecione o DDI do país." };

    let local = onlyDigits(rawNumber);
    if (cleanDial === "+55") {
      // Remove prefixo 0 opcional ou 55 se usuário colou com DDI completo
      if (local.startsWith("0") && local.length === 12) local = local.slice(1);
      if (local.startsWith("55") && local.length === 13) local = local.slice(2);
      if (local.length !== 11) {
        return { valid: false, error: "Formato WhatsApp Brasil inválido. Use DDD (2 dígitos) + 9 + 8 dígitos, ex: (11) 99999-8888." };
      }
      const ddd = local.slice(0, 2);
      if (!VALID_BR_DDDS.has(ddd)) {
        return { valid: false, error: `DDD "${ddd}" não é um código brasileiro válido.` };
      }
      if (local[2] !== "9") {
        return { valid: false, error: "Número de celular/WhatsApp Brasil deve começar com 9 após o DDD: (DD) 9XXXX-XXXX." };
      }
      if (/^(\d)\1{8}$/.test(local.slice(2))) {
        return { valid: false, error: "Informe um número de WhatsApp real." };
      }
      return {
        valid: true,
        dial: "+55",
        localDigits: local,
        formatted: `(${ddd}) ${local.slice(2, 7)}-${local.slice(7)}`,
        e164Digits: `55${local}`,
        fullDisplay: `+55 (${ddd}) ${local.slice(2, 7)}-${local.slice(7)}`
      };
    }

    if (local.length < 6 || local.length > 14) {
      return { valid: false, error: "Informe o número com DDD/código de área (6 a 14 dígitos)." };
    }
    return {
      valid: true,
      dial: cleanDial,
      localDigits: local,
      formatted: local,
      e164Digits: `${dialDigits}${local}`,
      fullDisplay: `${cleanDial} ${local}`
    };
  }

  function buildWhatsAppTripMessage(state, sortedList, totalsObj, calcFn, helpers) {
    const { fmtBR, money, num, hmHuman } = helpers;
    const t = totalsObj;
    const lines = [
      `✈️ *${state.title || "Planejamento My Plan"}*`,
      `🚗 Veículo: ${state.vehicle?.name || "-"} (${state.vehicle?.powertrain || "-"})`,
      `👥 Viajantes: ${state.params?.travelers || 1} · Duração: ${t.totalDays || 0} dia(s)`,
      ""
    ];
    if (t.km > 0) {
      lines.push(`🛣️ *Distância carro:* ${num(t.km)} km (${hmHuman(t.drive)} dir. + ${t.stops} par.)`);
    }
    lines.push(`💰 *Total geral estimado:* *${money(t.grandTotal)}* (${money(t.grandTotal / Math.max(1, state.params?.travelers || 1))}/pessoa)`);
    lines.push("");
    lines.push("💳 *Composição de custos:*");
    (t.costBreakdown || []).forEach(c => {
      if (c.value > 0) lines.push(`• ${c.label}: ${money(c.value)}`);
    });
    lines.push("");
    lines.push("📅 *Cronograma completo:*");
    sortedList.forEach(a => {
      const c = calcFn(a);
      const val = c.total + c.extra;
      const dt = a.end && a.end !== a.start ? `${fmtBR(a.start)} a ${fmtBR(a.end)}` : fmtBR(a.start);
      const route = (a.from || a.to) ? ` (${a.from || "?"} ➔ ${a.to || "?"})` : "";
      const valStr = val > 0 ? ` — ${money(val)}` : "";
      lines.push(`• ${dt} · *[${a.type}]* ${a.name}${route}${valStr}`);
    });

    const pendingChk = (state.checklist || []).filter(c => c.status !== "Concluído");
    if (pendingChk.length) {
      lines.push("");
      lines.push(`✅ *Checklist pendente (${pendingChk.length}):*`);
      pendingChk.slice(0, 12).forEach(c => lines.push(`☐ [${c.prio}] ${c.item}`));
    }
    return lines.join("\n");
  }

  window.FeriasCountries = {
    COUNTRIES,
    formatPhoneMask,
    validateWhatsApp,
    buildWhatsAppTripMessage
  };
})();
