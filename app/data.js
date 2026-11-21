// Dados iniciais, catálogo uniforme de atividades e fábrica de viagens — Férias Pro
window.ACTIVITY_TYPES = {
  Viagem:      { id: "Viagem",      label: "🚗 Viagem (Carro)",       short: "Viagem",      icon: "▶",  cls: "Viagem",      isRoute: true,  costLabel: "Pedágio + combustível + extras" },
  Voo:         { id: "Voo",         label: "✈️ Voo / Passagem Aérea", short: "Voo",         icon: "✈",  cls: "Voo",         isFlight: true, costLabel: "Passagem aérea / bagagem (R$)" },
  Hospedagem:  { id: "Hospedagem",  label: "🏨 Hospedagem / Hotel",   short: "Hospedagem",  icon: "🏨", cls: "Hospedagem",  isStay: true,   costLabel: "Diária ou valor total hospedagem (R$)" },
  Evento:      { id: "Evento",      label: "★ Evento / Jogo / Show",  short: "Evento",      icon: "★",  cls: "Evento",      costLabel: "Ingresso / entrada / custo do evento (R$)" },
  Passeio:     { id: "Passeio",     label: "🎢 Passeio / Parque",     short: "Passeio",     icon: "🎢", cls: "Passeio",     costLabel: "Ingressos / passeio / atrações (R$)" },
  Restaurante: { id: "Restaurante", label: "🍽️ Restaurante / Lazer",  short: "Restaurante", icon: "🍽", cls: "Restaurante", costLabel: "Reserva / refeição estimada (R$)" },
  "Período":   { id: "Período",     label: "■ Período / Estadia",     short: "Período",     icon: "■",  cls: "Período",     costLabel: "Custo opcional no período (R$)" },
  Outro:       { id: "Outro",       label: "📌 Outra Atividade",      short: "Outro",       icon: "●",  cls: "Outro",       costLabel: "Custo opcional (R$)" }
};

window.DEFAULT_DATA = {
  title: "Férias Final de Ano 2026",
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
    title: name || "Nova Viagem",
    vehicle: vehicleCopy ? JSON.parse(JSON.stringify(vehicleCopy)) : def.vehicle,
    params: def.params,
    scenarios: def.scenarios,
    activities: [],
    checklist: []
  };
};
