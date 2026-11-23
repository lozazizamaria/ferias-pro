// Dados iniciais, catálogos uniformes (Pessoal & Profissional) e fábricas de planejamento — My Plan
window.ACTIVITY_TYPES = {
  Viagem:      { id: "Viagem",      label: "🚗 Viagem de Carro",       short: "Carro",       icon: "▶",  cls: "Viagem",      isRoute: true,   costLabel: "Gastos extras da viagem (estacionamento, balsa...)" },
  Voo:         { id: "Voo",         label: "✈️ Avião / Voo",           short: "Voo",         icon: "✈",  cls: "Voo",         isFlight: true,  costLabel: "Passagens aéreas / bagagem" },
  Trem:        { id: "Trem",        label: "🚂 Viagem de Trem",        short: "Trem",        icon: "🚂", cls: "Trem",        isTransit: true, transitMode: "RAIL", costLabel: "Passagens de trem" },
  "Ônibus":    { id: "Ônibus",      label: "🚌 Viagem de Ônibus",      short: "Ônibus",      icon: "🚌", cls: "Onibus",      isTransit: true, transitMode: "BUS",  costLabel: "Passagens de ônibus" },
  Navio:       { id: "Navio",       label: "🚢 Viagem de Navio",       short: "Navio",       icon: "🚢", cls: "Navio",       isTransit: true, transitMode: "BOAT", costLabel: "Passagens / cruzeiro / cabine" },
  Hospedagem:  { id: "Hospedagem",  label: "🏨 Hospedagem / Hotel",    short: "Hospedagem",  icon: "🏨", cls: "Hospedagem",  isStay: true,    costLabel: "Diárias ou valor da hospedagem" },
  Ingresso:    { id: "Ingresso",    label: "🎟️ Ingresso / Ticket",     short: "Ingresso",    icon: "🎟", cls: "Ingresso",    isTicket: true,  costLabel: "Ingressos / entradas" },
  Evento:      { id: "Evento",      label: "★ Evento / Jogo / Show",   short: "Evento",      icon: "★",  cls: "Evento",      costLabel: "Ingressos / entradas do evento" },
  Passeio:     { id: "Passeio",     label: "🎢 Passeio / Parque",      short: "Passeio",     icon: "🎢", cls: "Passeio",     costLabel: "Ingressos / passeio / atrações" },
  Restaurante: { id: "Restaurante", label: "🍽️ Restaurante / Lazer",   short: "Restaurante", icon: "🍽", cls: "Restaurante", costLabel: "Reserva / refeição" },
  "Período":   { id: "Período",     label: "■ Período / Estadia",      short: "Período",     icon: "■",  cls: "Período",     costLabel: "Custos no período" },
  Outro:       { id: "Outro",       label: "📌 Outra Atividade",       short: "Outro",       icon: "●",  cls: "Outro",       costLabel: "Outros custos / valores" }
};

window.DEFAULT_TAGS = ["Pessoal", "Profissional", "Férias", "Viagem"];

window.DEFAULT_DATA = {
  title: "Férias Final de Ano 2026",
  customTags: [],
  vehicle: {
    name: "BYD Song Plus DM-i 23/24",
    powertrain: "PHEV",
    evRange: 30,
    hevKmL: 16,
    bevKwhPer100: 18,
    fuelPrice: 6.5,
    tank: 57,
    kwhPerCharge: 6.5,
    kwhPrice: 0.92,
    battery: 8.3
  },
  params: {
    travelers: 2,
    stopIntervalHours: 4,
    stopDurationMin: 60,
    defaultCharges: 1,
    tollPass: "BR_SEM_PARAR",
    trafficAware: true,
    avoidTolls: false,
    avoidHighways: false,
    avoidFerries: false,
    lodgingPerNight: 0,
    lodgingNightsOverride: null,
    dailyFoodPerPerson: 0,
    otherFixedBudget: 0,
    contingencyPct: 0,
    calendarReminderTime: "09:00"
  },
  scenarios: [
    { id: "s1", name: "Econômico (100–110 km/h)", kmL: 17.5 },
    { id: "s2", name: "Realista / Base (110–120 km/h)", kmL: null },
    { id: "s3", name: "Ritmo Forte / Serra (120+ km/h)", kmL: 14.5 }
  ],
  activities: [
    { type: "Evento", name: "Jogo GU", start: "2026-12-06", end: "2026-12-06", extraCost: 0, notes: "Brasília (DF)", attachments: [] },
    { type: "Evento", name: "Jogo Mané Garrincha", start: "2026-12-06", end: "2026-12-06", extraCost: 0, notes: "Brasília (DF)", attachments: [] },
    { type: "Viagem", name: "Viagem YS", from: "Brasília", to: "Pirassununga", start: "2026-12-07", end: "2026-12-07", km: 798, drive: 554, stops: 2, stopTime: 120, toll: 118.5, charges: 1, extraCost: 0, notes: "Saída bateria 100%. BR-050 / Anhanguera.", attachments: [] },
    { type: "Viagem", name: "Viagem SP", from: "Pirassununga", to: "São Paulo", start: "2026-12-08", end: "2026-12-08", km: 212, drive: 155, stops: 0, stopTime: 0, toll: 58, charges: 1, extraCost: 0, notes: "Bate-volta capital; pedágios Anhanguera/Bandeirantes.", attachments: [] },
    { type: "Evento", name: "Formatura GIGI", start: "2026-12-09", end: "2026-12-09", extraCost: 0, notes: "São Paulo (SP) — Mesmo dia do retorno p/ YS", attachments: [] },
    { type: "Viagem", name: "Viagem YS", from: "São Paulo", to: "Pirassununga", start: "2026-12-09", end: "2026-12-09", km: 209, drive: 169, stops: 0, stopTime: 0, toll: 58, charges: 1, extraCost: 0, notes: "Retorno pós-Formatura GIGI.", attachments: [] },
    { type: "Período", name: "Rô NVT", start: "2026-12-13", end: "2026-12-18", extraCost: 0, notes: "Navegantes (SC)", attachments: [] },
    { type: "Viagem", name: "Viagem CT", from: "Pirassununga", to: "Curitiba", start: "2026-12-20", end: "2026-12-20", km: 592, drive: 427, stops: 1, stopTime: 60, toll: 82, charges: 1, extraCost: 0, notes: "Rodovia Régis Bittencourt (BR-116).", attachments: [] },
    { type: "Viagem", name: "Viagem NVT", from: "Curitiba", to: "Navegantes", start: "2026-12-21", end: "2026-12-21", km: 212, drive: 184, stops: 0, stopTime: 0, toll: 18, charges: 1, extraCost: 0, notes: "Descida de serra BR-376/BR-101; ótima regeneração.", attachments: [] },
    { type: "Viagem", name: "Viagem CO", from: "Navegantes", to: "Canoas", start: "2026-12-24", end: "2026-12-24", km: 538, drive: 431, stops: 1, stopTime: 60, toll: 42, charges: 1, extraCost: 0, notes: "BR-101 Sul / Freeway. Véspera de Natal.", attachments: [] },
    { type: "Evento", name: "Natal", start: "2026-12-25", end: "2026-12-25", extraCost: 0, notes: "Canoas (RS) — Celebração em família", attachments: [] },
    { type: "Viagem", name: "Viagem Gramado", from: "Canoas", to: "Gramado", start: "2026-12-29", end: "2026-12-29", km: 90, drive: 114, stops: 0, stopTime: 0, toll: 16, charges: 1, extraCost: 0, notes: "Subida Serra Gaúcha: usar HEV + Save 25–30%.", attachments: [] },
    { type: "Viagem", name: "Viagem NVT", from: "Gramado", to: "Navegantes", start: "2026-12-30", end: "2026-12-30", km: 548, drive: 457, stops: 1, stopTime: 60, toll: 44, charges: 1, extraCost: 0, notes: "Descida rumo ao litoral SC.", attachments: [] },
    { type: "Evento", name: "Ano Novo", start: "2027-01-01", end: "2027-01-01", extraCost: 0, notes: "Navegantes (SC) — Virada de ano", attachments: [] },
    { type: "Passeio", name: "Niver Formiguinha Beto Carrero", start: "2027-01-04", end: "2027-01-04", extraCost: 0, notes: "Penha / NVT (SC) — Parque Beto Carrero", attachments: [] },
    { type: "Viagem", name: "Viagem YS", from: "Navegantes", to: "Pirassununga", start: "2027-01-05", end: "2027-01-05", km: 787, drive: 591, stops: 2, stopTime: 120, toll: 99.5, charges: 1, extraCost: 0, notes: "Subida serra PR/SP: usar HEV + Save 25–30%.", attachments: [] },
    { type: "Viagem", name: "Viagem BSB", from: "Pirassununga", to: "Brasília", start: "2027-01-09", end: "2027-01-09", km: 798, drive: 576, stops: 2, stopTime: 120, toll: 118.5, charges: 1, extraCost: 0, notes: "Retorno final para casa.", attachments: [] }
  ],
  checklist: [
    { cat: "Recarga EV", item: "Carregador portátil original + adaptador tomada 20A/10A", prio: "Alta", status: "Pendente", notes: "Carregador 3,3 kW leva ~2h30 a 3h (20% a 100%)" },
    { cat: "Recarga EV", item: "Extensão elétrica reforçada (cabo 2,5 mm², 10–15 m)", prio: "Alta", status: "Pendente", notes: "Essencial para casas/pousadas sem tomada próxima" },
    { cat: "Recarga EV", item: "Apps instalados: PlugShare, Tupinambá, Zletric, BYD", prio: "Média", status: "Pendente", notes: "Útil para recargas em paradas/hotéis" },
    { cat: "Veículo", item: "Calibragem dos pneus p/ carro carregado + estepe/kit", prio: "Alta", status: "Pendente", notes: "Verificar pressão recomendada na porta (carga plena)" },
    { cat: "Veículo", item: "Revisão pré-viagem (nível óleo, arrefecimento, palhetas)", prio: "Alta", status: "Pendente", notes: "Quase 5.000 km de estrada no verão/chuvas" },
    { cat: "Pedágio", item: "Tag de pedágio ativa (Sem Parar / Veloe / Taggy)", prio: "Alta", status: "Pendente", notes: "" },
    { cat: "Documentos", item: "CNH, CRLV digital, seguro com guincho p/ híbrido", prio: "Alta", status: "Pendente", notes: "Confirmar cobertura de km de guincho no Sul/SP" },
    { cat: "Eventos", item: "Ingressos Beto Carrero (04/01 - Niver Formiguinha)", prio: "Alta", status: "Pendente", notes: "Comprar antecipado para evitar filas na alta temporada" },
    { cat: "Eventos", item: "Confirmar horários: Jogos (06/12) e Formatura GIGI (09/12)", prio: "Média", status: "Pendente", notes: "Atenção ao retorno SP ➔ YS no dia 09/12" },
    { cat: "Roteiro", item: "Baixar mapas offline no Google Maps (DF, GO, MG, SP, PR, SC, RS)", prio: "Média", status: "Pendente", notes: "Trechos de serra têm áreas sem sinal de celular" }
  ]
};

window.createBlankTripData = function (name, vehicleCopy) {
  const def = JSON.parse(JSON.stringify(window.DEFAULT_DATA));
  return {
    mode: "personal",
    title: name || "Nova Viagem",
    customTags: [],
    vehicle: vehicleCopy ? JSON.parse(JSON.stringify(vehicleCopy)) : def.vehicle,
    params: def.params,
    scenarios: def.scenarios,
    activities: [],
    checklist: []
  };
};

/* ===== CATÁLOGO DE ÍCONES LIMPOS & DADOS DO MODO PROFISSIONAL ===== */
window.PRO_ICON_CATALOG = [
  // Grupo: Aeronaves de Caça (silhuetas limpas vistas de cima)
  {
    id: "jet-gripen",
    label: "Caça Gripen (F-39)",
    group: "Aeronaves de Caça",
    mode: "fill",
    d: "M12 1.2 L13.1 4.8 L16.8 7.6 L16.2 8.7 L13.2 7.8 L13.3 9.7 L21.6 15.8 L21.6 17.6 L13.4 17.4 L12.9 21.8 L11.1 21.8 L10.6 17.4 L2.4 17.6 L2.4 15.8 L10.7 9.7 L10.8 7.8 L7.8 8.7 L7.2 7.6 L10.9 4.8 Z"
  },
  {
    id: "jet-f16",
    label: "Caça F-16 (Falcon)",
    group: "Aeronaves de Caça",
    mode: "fill",
    d: "M12 1.2 L13.0 5.4 L13.9 8.6 L21.4 13.4 L21.4 15.2 L13.5 15.3 L13.2 17.6 L17.6 20.1 L17.1 21.4 L13.0 20.4 L12.7 22.3 L11.3 22.3 L11.0 20.4 L6.9 21.4 L6.4 20.1 L10.8 17.6 L10.5 15.3 L2.6 15.2 L2.6 13.4 L10.1 8.6 L11.0 5.4 Z"
  },
  {
    id: "jet-f22",
    label: "Caça F-22 (Raptor)",
    group: "Aeronaves de Caça",
    mode: "fill",
    d: "M12 1.2 L13.6 5.2 L14.5 8.1 L21.8 12.6 L20.8 15.7 L14.3 15.7 L14.2 17.2 L18.4 19.6 L17.2 21.7 L13.9 20.4 L13.6 22.2 L12.4 22.2 L12.0 20.9 L11.6 22.2 L10.4 22.2 L10.1 20.4 L6.8 21.7 L5.6 19.6 L9.8 17.2 L9.7 15.7 L3.2 15.7 L2.2 12.6 L9.5 8.1 L10.4 5.2 Z"
  },
  {
    id: "jet-f5",
    label: "Caça F-5 (Tiger)",
    group: "Aeronaves de Caça",
    mode: "fill",
    d: "M12 1.0 L12.8 6.2 L13.3 10.6 L20.4 12.4 L20.4 14.2 L13.3 14.8 L13.0 18.4 L16.8 20.8 L16.3 21.7 L13.0 20.8 L12.7 22.5 L11.3 22.5 L11.0 20.8 L7.7 21.7 L7.2 20.8 L11.0 18.4 L10.7 14.8 L3.6 14.2 L3.6 12.4 L10.7 10.6 L11.2 6.2 Z"
  },
  // Grupo: Aviação & Operações
  {
    id: "plane",
    label: "Avião",
    group: "Aviação & Operações",
    mode: "fill",
    d: "M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z"
  },
  {
    id: "heli",
    label: "Helicóptero",
    group: "Aviação & Operações",
    mode: "fill",
    d: "M11 2h2v3.2a4.5 4.5 0 0 1 2.4 3.8v4.2l-2.1 2.5v4.8l2.5 1.1v1.4L12 21.8 8.2 23v-1.4l2.5-1.1v-4.8L8.6 13.2V9A4.5 4.5 0 0 1 11 5.2V2Zm-7.5 7.2h17v1.7h-17V9.2Z"
  },
  {
    id: "radar",
    label: "Alvo / Radar",
    group: "Aviação & Operações",
    mode: "stroke",
    d: "M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12l6-6M12 12v0"
  },
  {
    id: "shield",
    label: "Defesa / Escudo",
    group: "Aviação & Operações",
    mode: "stroke",
    d: "M12 2.5 4.5 5.5v6.2c0 4.9 3.2 8.9 7.5 10.3 4.3-1.4 7.5-5.4 7.5-10.3V5.5L12 2.5Z"
  },
  {
    id: "compass",
    label: "Navegação",
    group: "Aviação & Operações",
    mode: "stroke",
    d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.6 5.4-1.8 5.4-5.4 1.8 1.8-5.4 5.4-1.8Z"
  },
  {
    id: "flag",
    label: "Missão",
    group: "Aviação & Operações",
    mode: "stroke",
    d: "M5 21V4m0 1h12l-2.2 4L17 13H5"
  },
  // Grupo: Projetos & Gestão
  {
    id: "code",
    label: "Código / Tech",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.5 5.5l-3 13"
  },
  {
    id: "users",
    label: "Equipe / Reunião",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm9.5 9v-1.4a3 3 0 0 0-2.2-2.9M16 4.8a3 3 0 0 1 0 5.8"
  },
  {
    id: "briefcase",
    label: "Negócios / Proposta",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M3.5 8h17v11a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V8Zm5-3.5h7V8h-7V4.5ZM3.5 13h17"
  },
  {
    id: "rocket",
    label: "Entrega / Lançamento",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M14.5 4.2c3.2-.6 5.6 0 5.6 0s.6 2.4 0 5.6c-.7 3.3-3.4 6-6.2 7.2l-3.8-3.8c1.2-2.8 3.9-5.5 4.4-9ZM8.5 11.5H5l-1.5 3 3.5 1.2M12.5 15.5V19l-3 1.5-1.2-3.5"
  },
  {
    id: "diamond",
    label: "Marco",
    group: "Projetos & Gestão",
    mode: "fill",
    d: "M12 2.5 21.5 12 12 21.5 2.5 12 12 2.5Z"
  },
  {
    id: "income",
    label: "Recebimento",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M12 3v18M16.2 7.2c0-1.6-1.9-2.7-4.2-2.7S7.8 5.6 7.8 7.2c0 1.8 2 2.4 4.2 2.8s4.2 1 4.2 2.8c0 1.7-1.9 2.9-4.2 2.9s-4.2-1.1-4.2-2.8"
  },
  {
    id: "expense",
    label: "Despesa / Fatura",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M3 6.5h18v11H3v-11Zm0 4h18M7 14.5h4"
  },
  {
    id: "doc",
    label: "Documento / Ata",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M6 3.5h8.5L18 7v13.5H6V3.5Zm8 0V7h4M8.5 11.5h7M8.5 15.5h5"
  },
  {
    id: "wrench",
    label: "Manutenção / Técnica",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M14.7 6.3a4 4 0 0 0-5.3 5.3L4.2 16.8a1.4 1.4 0 0 0 2 2l5.2-5.2a4 4 0 0 0 5.3-5.3l-2.3 2.3-2-2 2.3-2.3Z"
  },
  {
    id: "clock",
    label: "Prazo / Agenda",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4.5V12l3.2 2"
  },
  {
    id: "chart",
    label: "Indicadores",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M4 20h16M7 16v-5M12 16V7M17 16v-8"
  },
  {
    id: "check",
    label: "Aprovação / Check",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3.8 9.2 2.5 2.5 5.3-5.4"
  },
  {
    id: "star",
    label: "Destaque",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "m12 3.2 2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.9L12 3.2Z"
  },
  {
    id: "bolt",
    label: "Urgência / Energia",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M13 2.8 4.8 13.5H12L11 21.2 19.2 10.5H12l1-7.7Z"
  },
  {
    id: "globe",
    label: "Global / Remoto",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3.5 12h17M12 3a14 14 0 0 1 3.6 9A14 14 0 0 1 12 21a14 14 0 0 1-3.6-9A14 14 0 0 1 12 3Z"
  },
  {
    id: "pin",
    label: "Geral / Marcador",
    group: "Projetos & Gestão",
    mode: "stroke",
    d: "M12 21s6-5.7 6-10.5a6 6 0 1 0-12 0C6 15.3 12 21 12 21Zm0-8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
  }
];

window.PRO_ICON_MAP = Object.fromEntries(window.PRO_ICON_CATALOG.map(ic => [ic.id, ic]));

window.renderProIconSvg = function (iconId, extraCls = "") {
  const item = window.PRO_ICON_MAP[iconId] || window.PRO_ICON_MAP.pin;
  const cls = extraCls ? `pro-ico-svg ${extraCls}` : "pro-ico-svg";
  if (item.mode === "fill") {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${item.d}"/></svg>`;
  }
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${item.d}"/></svg>`;
};

window.PRO_LEGACY_TYPE_MAP = {
  "Viagem Corp.": "Viagem",
  "Follow-up": "Proposta"
};

window.PRO_ACTIVITY_TYPES = {
  Desenvolvimento: { id: "Desenvolvimento", label: "Desenvolvimento", short: "Desenvolvimento", iconId: "code",      color: "#2563eb", cls: "pro-dev",      defaultFin: "none" },
  "Reunião":       { id: "Reunião",         label: "Reunião",         short: "Reunião",         iconId: "users",     color: "#0284c7", cls: "pro-meet",     defaultFin: "none" },
  Viagem:          { id: "Viagem",          label: "Viagem",          short: "Viagem",          iconId: "plane",     color: "#d97706", cls: "pro-travel",   defaultFin: "expense" },
  Recebimento:     { id: "Recebimento",     label: "Recebimento",     short: "Recebimento",     iconId: "income",    color: "#10b981", cls: "pro-income",   defaultFin: "income" },
  Despesa:         { id: "Despesa",         label: "Despesa",         short: "Despesa",         iconId: "expense",   color: "#ef4444", cls: "pro-expense",  defaultFin: "expense" },
  Entrega:         { id: "Entrega",         label: "Entrega",         short: "Entrega",         iconId: "rocket",    color: "#6366f1", cls: "pro-deliver",  defaultFin: "none" },
  Marco:           { id: "Marco",           label: "Marco",           short: "Marco",           iconId: "diamond",   color: "#0ea5e9", cls: "pro-marco",    defaultFin: "none" },
  Proposta:        { id: "Proposta",        label: "Proposta",        short: "Proposta",        iconId: "briefcase", color: "#8b5cf6", cls: "pro-followup", defaultFin: "none" },
  Outro:           { id: "Outro",           label: "Outro",           short: "Outro",           iconId: "pin",       color: "#64748b", cls: "pro-outro",    defaultFin: "none" }
};
Object.values(window.PRO_ACTIVITY_TYPES).forEach(t => {
  t.icon = window.renderProIconSvg(t.iconId);
  t.iconHtml = t.icon;
});

window.PRO_DEFAULT_COLUMNS = [
  { id: "backlog", title: "Backlog / Ideias",    color: "#64748b" },
  { id: "todo",    title: "A Fazer",             color: "#0284c7" },
  { id: "doing",   title: "Em Andamento",        color: "#2563eb" },
  { id: "review",  title: "Revisão / Aprovação", color: "#d97706" },
  { id: "done",    title: "Concluído",           color: "#10b981" }
];

window.PRO_DEFAULT_LABELS = [
  { id: "lbl_urgente",    name: "Prioritário",  color: "#ef4444" },
  { id: "lbl_cliente",    name: "Cliente",      color: "#38bdf8" },
  { id: "lbl_entrega",    name: "Entregável",   color: "#2563eb" },
  { id: "lbl_financeiro", name: "Financeiro",   color: "#10b981" },
  { id: "lbl_estrategia", name: "Estratégia",   color: "#8b5cf6" },
  { id: "lbl_viagem",     name: "Deslocamento", color: "#f59e0b" }
];

window.PRO_DEFAULT_TAGS = ["Desenvolvimento", "Cliente", "Financeiro", "Reunião", "Viagem", "Entrega"];

(function () {
  function relIso(offsetDays) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  window.createDefaultProData = function (name) {
    return {
      mode: "professional",
      title: name || "Roadmap & Entregas Profissionais",
      customTags: [],
      customCardTypes: [],
      columns: JSON.parse(JSON.stringify(window.PRO_DEFAULT_COLUMNS)),
      labels: JSON.parse(JSON.stringify(window.PRO_DEFAULT_LABELS)),
      params: {
        clientDefault: "Carteira Executiva",
        revenueTarget: 45000,
        costBudget: 9500,
        taxRatePct: 6,
        hourlyRate: 220,
        calendarReminderTime: "09:00",
        doneColumnId: ""
      },
      activities: [
        {
          id: "pro_a1",
          type: "Reunião",
          columnId: "done",
          order: 0,
          name: "Kickoff & Alinhamento de Escopo",
          start: relIso(-4),
          end: relIso(-4),
          startTime: "09:30",
          endTime: "11:00",
          priority: "Alta",
          progress: 100,
          client: "Cliente Estratégico",
          assignee: "Você",
          location: "Google Meet",
          coverColor: "#0284c7",
          labels: ["lbl_cliente", "lbl_estrategia"],
          tags: ["Reunião", "Cliente"],
          finDirection: "none",
          amount: 0,
          actualAmount: 0,
          finStatus: "Previsto",
          subtasks: [
            { id: "st1", text: "Validar requisitos principais", done: true },
            { id: "st2", text: "Enviar ata e cronograma", done: true }
          ],
          notes: "Definição de marcos semanais e entregáveis do trimestre.",
          attachments: []
        },
        {
          id: "pro_a2",
          type: "Recebimento",
          columnId: "done",
          order: 1,
          name: "Recebimento Sinal / Parcela 1",
          start: relIso(-2),
          end: relIso(-2),
          priority: "Alta",
          progress: 100,
          client: "Cliente Estratégico",
          assignee: "Financeiro",
          location: "NF-e #1042",
          coverColor: "#10b981",
          labels: ["lbl_financeiro", "lbl_cliente"],
          tags: ["Financeiro"],
          finDirection: "income",
          amount: 14500,
          actualAmount: 14500,
          finStatus: "Liquidado",
          finDueDate: relIso(-2),
          subtasks: [],
          notes: "Entrada de 40% na assinatura da proposta.",
          attachments: []
        },
        {
          id: "pro_a3",
          type: "Desenvolvimento",
          columnId: "doing",
          order: 0,
          name: "Desenvolvimento Core & Integrações",
          start: relIso(-1),
          end: relIso(6),
          priority: "Crítica",
          progress: 65,
          client: "Cliente Estratégico",
          assignee: "Você",
          location: "Repositório Principal",
          coverColor: "#2563eb",
          labels: ["lbl_entrega", "lbl_urgente"],
          tags: ["Desenvolvimento"],
          finDirection: "none",
          amount: 0,
          actualAmount: 0,
          finStatus: "Previsto",
          subtasks: [
            { id: "st3", text: "API de autenticação e segurança", done: true },
            { id: "st4", text: "Módulo de painéis e relatórios", done: true },
            { id: "st5", text: "Testes automatizados ponta a ponta", done: false }
          ],
          notes: "Sprint principal de desenvolvimento da plataforma.",
          attachments: []
        },
        {
          id: "pro_a4",
          type: "Reunião",
          columnId: "todo",
          order: 0,
          name: "Checkpoint Executivo de Meio de Sprint",
          start: relIso(3),
          end: relIso(3),
          startTime: "14:00",
          endTime: "15:00",
          priority: "Média",
          progress: 0,
          client: "Cliente Estratégico",
          assignee: "Você",
          location: "Sala Executiva / Zoom",
          coverColor: "#0ea5e9",
          labels: ["lbl_cliente"],
          tags: ["Reunião"],
          finDirection: "none",
          amount: 0,
          actualAmount: 0,
          finStatus: "Previsto",
          subtasks: [{ id: "st6", text: "Preparar demo funcional", done: false }],
          notes: "Validação intermediária antes da fase de homologação.",
          attachments: []
        },
        {
          id: "pro_a5",
          type: "Viagem",
          columnId: "todo",
          order: 1,
          name: "Viagem Corporativa — São Paulo",
          start: relIso(8),
          end: relIso(10),
          startTime: "07:30",
          priority: "Alta",
          progress: 25,
          client: "Cliente Estratégico",
          assignee: "Você",
          location: "Av. Paulista, São Paulo - SP",
          coverColor: "#f59e0b",
          labels: ["lbl_viagem", "lbl_cliente"],
          tags: ["Viagem", "Cliente"],
          finDirection: "expense",
          amount: 2650,
          actualAmount: 0,
          finStatus: "Previsto",
          finDueDate: relIso(8),
          subtasks: [
            { id: "st7", text: "Confirmar check-in aéreo e hotel", done: true },
            { id: "st8", text: "Separar apresentação presencial", done: false }
          ],
          notes: "Apresentação presencial de roadmap e reunião com diretoria.",
          attachments: []
        },
        {
          id: "pro_a6",
          type: "Despesa",
          columnId: "doing",
          order: 1,
          name: "Infraestrutura Cloud & Ferramentas",
          start: relIso(5),
          end: relIso(5),
          priority: "Média",
          progress: 50,
          client: "Operacional",
          assignee: "Você",
          location: "AWS / Serviços SaaS",
          coverColor: "#ef4444",
          labels: ["lbl_financeiro"],
          tags: ["Financeiro"],
          finDirection: "expense",
          amount: 1280,
          actualAmount: 0,
          finStatus: "Previsto",
          finDueDate: relIso(5),
          subtasks: [],
          notes: "Servidores, certificados e assinaturas do projeto.",
          attachments: []
        },
        {
          id: "pro_a7",
          type: "Entrega",
          columnId: "review",
          order: 0,
          name: "Homologação & Deploy Produção",
          start: relIso(11),
          end: relIso(13),
          priority: "Crítica",
          progress: 20,
          client: "Cliente Estratégico",
          assignee: "Você",
          location: "Ambiente Produção",
          coverColor: "#6366f1",
          labels: ["lbl_entrega", "lbl_urgente"],
          tags: ["Entrega", "Desenvolvimento"],
          finDirection: "none",
          amount: 0,
          actualAmount: 0,
          finStatus: "Previsto",
          subtasks: [
            { id: "st9", text: "Checklist de segurança e performance", done: false },
            { id: "st10", text: "Publicação final e monitoramento", done: false }
          ],
          notes: "Janela de publicação assistida com acompanhamento.",
          attachments: []
        },
        {
          id: "pro_a8",
          type: "Marco",
          columnId: "backlog",
          order: 0,
          name: "Go-Live Oficial & Termo de Aceite",
          start: relIso(14),
          end: relIso(14),
          priority: "Crítica",
          progress: 0,
          client: "Cliente Estratégico",
          assignee: "Você",
          location: "Assinatura Digital",
          coverColor: "#38bdf8",
          labels: ["lbl_entrega", "lbl_cliente"],
          tags: ["Entrega"],
          finDirection: "none",
          amount: 0,
          actualAmount: 0,
          finStatus: "Previsto",
          subtasks: [],
          notes: "Marco contratual que libera o faturamento final.",
          attachments: []
        },
        {
          id: "pro_a9",
          type: "Recebimento",
          columnId: "backlog",
          order: 1,
          name: "Recebimento Entrega Final (Saldo 60%)",
          start: relIso(16),
          end: relIso(16),
          priority: "Alta",
          progress: 0,
          client: "Cliente Estratégico",
          assignee: "Financeiro",
          location: "Faturamento / PIX / TED",
          coverColor: "#10b981",
          labels: ["lbl_financeiro", "lbl_cliente"],
          tags: ["Financeiro"],
          finDirection: "income",
          amount: 21750,
          actualAmount: 0,
          finStatus: "Previsto",
          finDueDate: relIso(16),
          subtasks: [],
          notes: "Emissão de NF após termo de aceite assinado.",
          attachments: []
        },
        {
          id: "pro_a10",
          type: "Proposta",
          columnId: "backlog",
          order: 2,
          name: "Follow-up Pós-Entrega & Nova Fase",
          start: relIso(20),
          end: relIso(21),
          startTime: "10:00",
          priority: "Média",
          progress: 0,
          client: "Cliente Estratégico",
          assignee: "Você",
          location: "Call Executiva",
          coverColor: "#8b5cf6",
          labels: ["lbl_estrategia", "lbl_cliente"],
          tags: ["Reunião", "Cliente"],
          finDirection: "none",
          amount: 0,
          actualAmount: 0,
          finStatus: "Previsto",
          subtasks: [],
          notes: "Apresentar indicadores iniciais e proposta de evolução contínua.",
          attachments: []
        }
      ],
      checklist: [
        { id: "pchk1", cat: "Escopo", item: "Confirmar aprovações de design e requisitos com o cliente", prio: "Alta", status: "Concluído", notes: "" },
        { id: "pchk2", cat: "Financeiro", item: "Emitir nota fiscal e conferir liquidação no fluxo de caixa", prio: "Alta", status: "Em andamento", notes: "Parcela 1 liquidada; saldo após Go-Live" },
        { id: "pchk3", cat: "Viagem", item: "Reservar voo e hotel próximo ao local da reunião em SP", prio: "Alta", status: "Pendente", notes: "" },
        { id: "pchk4", cat: "Entrega", item: "Executar checklist de QA e backup antes do deploy final", prio: "Alta", status: "Pendente", notes: "" }
      ],
      finance: {
        dailyRecords: {}
      }
    };
  };

  window.PRO_DEFAULT_DATA = window.createDefaultProData();

  window.createBlankProData = function (name) {
    return {
      mode: "professional",
      title: name || "Novo Projeto Profissional",
      customTags: [],
      customCardTypes: [],
      columns: JSON.parse(JSON.stringify(window.PRO_DEFAULT_COLUMNS)),
      labels: JSON.parse(JSON.stringify(window.PRO_DEFAULT_LABELS)),
      params: {
        clientDefault: "",
        revenueTarget: 0,
        costBudget: 0,
        taxRatePct: 0,
        hourlyRate: 0,
        calendarReminderTime: "09:00",
        doneColumnId: ""
      },
      activities: [],
      checklist: [],
      finance: { dailyRecords: {} }
    };
  };
})();
