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

/* ===== CATÁLOGO & DADOS DO MODO PROFISSIONAL (TRELLO + GANTT + FLUXO DE CAIXA) ===== */
window.PRO_ACTIVITY_TYPES = {
  Desenvolvimento: { id: "Desenvolvimento", label: "💻 Desenvolvimento / Tarefa", short: "Dev",         icon: "💻", cls: "pro-dev",      defaultFin: "none" },
  "Reunião":       { id: "Reunião",         label: "🤝 Reunião / Call",            short: "Reunião",     icon: "🤝", cls: "pro-meet",     defaultFin: "none" },
  "Viagem Corp.":  { id: "Viagem Corp.",    label: "✈️ Viagem Corporativa",        short: "Viagem",      icon: "✈️", cls: "pro-travel",   defaultFin: "expense" },
  Recebimento:     { id: "Recebimento",     label: "💵 Recebimento / Faturamento", short: "Recebimento", icon: "💵", cls: "pro-income",   defaultFin: "income" },
  Despesa:         { id: "Despesa",         label: "💳 Despesa / Custo",           short: "Despesa",     icon: "💳", cls: "pro-expense",  defaultFin: "expense" },
  Entrega:         { id: "Entrega",         label: "🚀 Entrega / Deploy",          short: "Entrega",     icon: "🚀", cls: "pro-deliver",  defaultFin: "none" },
  Marco:           { id: "Marco",           label: "◆ Marco / Prazo Crítico",      short: "Marco",       icon: "◆",  cls: "pro-marco",    defaultFin: "none" },
  "Follow-up":     { id: "Follow-up",       label: "📞 Follow-up / Proposta",      short: "Follow-up",   icon: "📞", cls: "pro-followup", defaultFin: "none" },
  Outro:           { id: "Outro",           label: "📌 Outro Compromisso",         short: "Outro",       icon: "📌", cls: "pro-outro",    defaultFin: "none" }
};

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

window.PRO_DEFAULT_TAGS = ["Desenvolvimento", "Cliente", "Financeiro", "Reunião", "Viagem Corp.", "Entrega"];

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
      columns: JSON.parse(JSON.stringify(window.PRO_DEFAULT_COLUMNS)),
      labels: JSON.parse(JSON.stringify(window.PRO_DEFAULT_LABELS)),
      params: {
        clientDefault: "Carteira Executiva",
        revenueTarget: 45000,
        costBudget: 9500,
        taxRatePct: 6,
        hourlyRate: 220,
        calendarReminderTime: "09:00"
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
          type: "Viagem Corp.",
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
          tags: ["Viagem Corp.", "Cliente"],
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
          type: "Follow-up",
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
        { id: "pchk3", cat: "Viagem Corp.", item: "Reservar voo e hotel próximo ao local da reunião em SP", prio: "Alta", status: "Pendente", notes: "" },
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
      columns: JSON.parse(JSON.stringify(window.PRO_DEFAULT_COLUMNS)),
      labels: JSON.parse(JSON.stringify(window.PRO_DEFAULT_LABELS)),
      params: {
        clientDefault: "",
        revenueTarget: 0,
        costBudget: 0,
        taxRatePct: 0,
        hourlyRate: 0,
        calendarReminderTime: "09:00"
      },
      activities: [],
      checklist: [],
      finance: { dailyRecords: {} }
    };
  };
})();
