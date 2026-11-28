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

window.DEFAULT_TAGS = ["Pessoal", "Profissional", "Férias", "Viagem", "Europa", "Road Trip", "Voo", "Hospedagem", "Passeio", "Gastronomia", "Cultura"];

window.createDefaultPersonalExampleData = function () {
  return {
    mode: "personal",
    isExample: true,
    title: "Férias Europa 2027 (Exemplo)",
    customTags: ["Europa", "Portugal", "Espanha", "Itália", "Road Trip", "Gastronomia", "Cultura"],
    personalColumns: [
      { id: "pcol_assuntos", title: "Assuntos", color: "#64748b" },
      { id: "pcol_plan",     title: "Planejando", color: "#0284c7" },
      { id: "pcol_conf",     title: "Reservado / Confirmado", color: "#2563eb" },
      { id: "pcol_done",     title: "Concluído", color: "#10b981" }
    ],
    vehicle: {
      name: "SUV Híbrido Alugado (Europa)",
      powertrain: "HEV",
      evRange: 0,
      hevKmL: 17.5,
      bevKwhPer100: 18,
      fuelPrice: 9.8,
      tank: 52,
      kwhPerCharge: 0,
      kwhPrice: 1.8,
      battery: 0
    },
    params: {
      travelers: 4,
      stopIntervalHours: 3.5,
      stopDurationMin: 60,
      defaultCharges: 0,
      tollPass: "",
      trafficAware: true,
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false,
      lodgingPerNight: 0,
      lodgingNightsOverride: null,
      dailyFoodPerPerson: 180,
      otherFixedBudget: 0,
      contingencyPct: 8,
      calendarReminderTime: "09:00",
      personalDoneColumnId: "pcol_done"
    },
    scenarios: [
      { id: "s1", name: "Ritmo Tranquilo (100–110 km/h)", kmL: 19.0 },
      { id: "s2", name: "Base Autoestradas (120 km/h)", kmL: null },
      { id: "s3", name: "Serras & Montanhas (130 km/h)", kmL: 15.2 }
    ],
    activities: [
      {
        id: "ex_eu_01",
        type: "Outro",
        name: "Check-in online, Seguro Schengen & Câmbio Euro",
        start: "2027-01-08",
        end: "2027-01-08",
        location: "São Paulo, Brasil",
        locationLat: -23.5505,
        locationLng: -46.6333,
        extraCost: 1120,
        personalColId: "pcol_done",
        completed: true,
        tags: ["Europa", "Férias"],
        notes: "Apólice Schengen (€30.000) emitida e cartões globais carregados em EUR.",
        subtasks: [
          { id: "ex_st_1", text: "Emitir apólice Seguro Viagem Schengen", done: true },
          { id: "ex_st_2", text: "Conferir validade dos passaportes (> 6 meses)", done: true },
          { id: "ex_st_3", text: "Carregar cartão multimoedas em Euro", done: true }
        ],
        attachments: [
          { id: "", fileName: "Portal Consular — Dicas Europa", url: "https://www.gov.br/mre/pt-br/assuntos/portal-consular", mimeType: "text/uri-list" }
        ],
        minutes: [
          {
            id: "ex_min_1",
            title: "Ata — Alinhamento Pré-Viagem Europa 2027",
            text: "Decisões do grupo (Lucas, Marina, Rafael e Camila):\n• Encontro no Terminal 3 de Guarulhos às 14h30 no dia 10/01.\n• Retirada do SUV em Lisboa no dia 14/01 às 08h30 para o road trip até Madrid.\n• Todos os gastos compartilhados serão lançados na aba Dividir Despesas (Splitwise).",
            createdAt: "2026-12-15T14:00:00.000Z",
            updatedAt: "2026-12-15T14:00:00.000Z"
          }
        ]
      },
      {
        id: "ex_eu_02",
        type: "Voo",
        name: "Voo Internacional São Paulo ➔ Lisboa",
        from: "São Paulo, Brasil",
        to: "Lisboa, Portugal",
        fromLat: -23.4356,
        fromLng: -46.4731,
        toLat: 38.7742,
        toLng: -9.1342,
        start: "2027-01-10",
        end: "2027-01-11",
        startTime: "17:45",
        airline: "TAP Air Portugal · TP 082",
        bookingRef: "MYP7EU",
        km: 7940,
        drive: 590,
        extraCost: 14800,
        personalColId: "pcol_conf",
        completed: false,
        tags: ["Europa", "Voo", "Portugal"],
        notes: "Aeroporto GRU Terminal 3 → Aeroporto Humberto Delgado (LIS). Chegada 07h35 horário local.",
        attachments: [
          { id: "", fileName: "Aeroporto de Lisboa — Guia de Chegada", url: "https://www.aeroportolisboa.pt", mimeType: "text/uri-list" }
        ]
      },
      {
        id: "ex_eu_03",
        type: "Hospedagem",
        name: "Hotel Boutique Baixa-Chiado",
        location: "Lisboa, Portugal",
        locationLat: 38.7117,
        locationLng: -9.1394,
        start: "2027-01-11",
        end: "2027-01-14",
        bookingRef: "HTL-LIS-2027",
        extraCost: 3400,
        personalColId: "pcol_conf",
        completed: false,
        tags: ["Hospedagem", "Portugal"],
        notes: "3 diárias com café da manhã incluído no coração do Chiado."
      },
      {
        id: "ex_eu_04",
        type: "Passeio",
        name: "Belém, Alfama & Bonde 28",
        location: "Lisboa, Portugal",
        locationLat: 38.6916,
        locationLng: -9.2160,
        start: "2027-01-12",
        end: "2027-01-12",
        startTime: "09:30",
        extraCost: 480,
        personalColId: "pcol_plan",
        completed: false,
        tags: ["Passeio", "Portugal", "Cultura"],
        notes: "Torre de Belém, Mosteiro dos Jerónimos, Pastéis de Belém e pôr do sol em Santa Luzia.",
        subtasks: [
          { id: "ex_st_4", text: "Comprar ingresso antecipado do Mosteiro dos Jerónimos", done: true },
          { id: "ex_st_5", text: "Reservar jantar com Fado em Alfama", done: false }
        ]
      },
      {
        id: "ex_eu_05",
        type: "Viagem",
        name: "Road Trip Lisboa ➔ Porto (via Óbidos)",
        from: "Lisboa, Portugal",
        to: "Porto, Portugal",
        waypoints: ["Óbidos, Portugal"],
        fromLat: 38.7223,
        fromLng: -9.1393,
        toLat: 41.1579,
        toLng: -8.6291,
        start: "2027-01-14",
        end: "2027-01-14",
        startTime: "08:30",
        km: 318,
        drive: 215,
        stops: 1,
        stopTime: 75,
        toll: 145,
        charges: 0,
        extraCost: 0,
        personalColId: "pcol_conf",
        completed: false,
        tags: ["Road Trip", "Portugal"],
        notes: "Autoestrada A8/A1 com parada panorâmica na vila medieval murada de Óbidos."
      },
      {
        id: "ex_eu_06",
        type: "Hospedagem",
        name: "Apartamento Ribeira Vista Douro",
        location: "Porto, Portugal",
        locationLat: 41.1406,
        locationLng: -8.6130,
        start: "2027-01-14",
        end: "2027-01-17",
        bookingRef: "RBR-OPO-884",
        extraCost: 2550,
        personalColId: "pcol_conf",
        completed: false,
        tags: ["Hospedagem", "Portugal"],
        notes: "Apartamento amplo para os 4 amigos com varanda frente à Ponte Dom Luís I."
      },
      {
        id: "ex_eu_07",
        type: "Passeio",
        name: "Caves de Vinho do Porto & Cruzeiro no Douro",
        location: "Porto, Portugal",
        locationLat: 41.1375,
        locationLng: -8.6122,
        start: "2027-01-15",
        end: "2027-01-15",
        startTime: "14:00",
        extraCost: 640,
        personalColId: "pcol_plan",
        completed: false,
        tags: ["Passeio", "Gastronomia", "Portugal"],
        notes: "Degustação em Vila Nova de Gaia, Livraria Lello e passeio das 6 Pontes."
      },
      {
        id: "ex_eu_08",
        type: "Viagem",
        name: "Road Trip Porto ➔ Madrid (via Salamanca)",
        from: "Porto, Portugal",
        to: "Madrid, Espanha",
        waypoints: ["Salamanca, Espanha"],
        fromLat: 41.1579,
        fromLng: -8.6291,
        toLat: 40.4168,
        toLng: -3.7038,
        start: "2027-01-17",
        end: "2027-01-17",
        startTime: "08:00",
        km: 562,
        drive: 345,
        stops: 1,
        stopTime: 90,
        toll: 98,
        charges: 0,
        extraCost: 0,
        personalColId: "pcol_conf",
        completed: false,
        tags: ["Road Trip", "Espanha"],
        notes: "Travessia Portugal-Espanha com almoço na Plaza Mayor de Salamanca."
      },
      {
        id: "ex_eu_09",
        type: "Hospedagem",
        name: "Hotel Gran Vía Central",
        location: "Madrid, Espanha",
        locationLat: 40.4203,
        locationLng: -3.7058,
        start: "2027-01-17",
        end: "2027-01-21",
        bookingRef: "MAD-GV-401",
        extraCost: 3900,
        personalColId: "pcol_conf",
        completed: false,
        tags: ["Hospedagem", "Espanha"],
        notes: "4 diárias no centro histórico, fácil acesso a pé ao Retiro e Plaza Mayor."
      },
      {
        id: "ex_eu_10",
        type: "Ingresso",
        name: "Museu do Prado, Parque do Retiro & Tapas",
        location: "Madrid, Espanha",
        locationLat: 40.4138,
        locationLng: -3.6921,
        start: "2027-01-19",
        end: "2027-01-19",
        startTime: "10:00",
        extraCost: 780,
        personalColId: "pcol_plan",
        completed: false,
        tags: ["Cultura", "Gastronomia", "Espanha"],
        notes: "Visita guiada ao Museu do Prado + Mercado de San Miguel no final da tarde.",
        attachments: [
          { id: "", fileName: "Site Oficial Museu do Prado", url: "https://www.museodelprado.es", mimeType: "text/uri-list" }
        ]
      },
      {
        id: "ex_eu_11",
        type: "Voo",
        name: "Voo Interno Madrid ➔ Roma",
        from: "Madrid, Espanha",
        to: "Roma, Itália",
        fromLat: 40.4983,
        fromLng: -3.5676,
        toLat: 41.8003,
        toLng: 12.2389,
        start: "2027-01-21",
        end: "2027-01-21",
        startTime: "10:20",
        airline: "ITA Airways · AZ 059",
        bookingRef: "ITA27R",
        km: 1365,
        drive: 155,
        extraCost: 2640,
        personalColId: "pcol_conf",
        completed: false,
        tags: ["Europa", "Voo", "Itália"],
        notes: "Devolução do carro em Barajas (MAD) e embarque para Roma Fiumicino (FCO)."
      },
      {
        id: "ex_eu_12",
        type: "Hospedagem",
        name: "Palazzo Trastevere Suites",
        location: "Roma, Itália",
        locationLat: 41.8897,
        locationLng: 12.4694,
        start: "2027-01-21",
        end: "2027-01-25",
        bookingRef: "ROM-TR-912",
        extraCost: 4200,
        personalColId: "pcol_conf",
        completed: false,
        tags: ["Hospedagem", "Itália"],
        notes: "4 diárias no charmoso bairro de Trastevere."
      },
      {
        id: "ex_eu_13",
        type: "Passeio",
        name: "Coliseu, Fórum Romano & Fontana di Trevi",
        location: "Roma, Itália",
        locationLat: 41.8902,
        locationLng: 12.4922,
        start: "2027-01-22",
        end: "2027-01-22",
        startTime: "08:45",
        extraCost: 920,
        personalColId: "pcol_conf",
        completed: false,
        tags: ["Passeio", "Cultura", "Itália"],
        notes: "Ingresso combinado Arena do Coliseu + Palatino + caminhada até Panteão e Piazza Navona.",
        subtasks: [
          { id: "ex_st_6", text: "Chegar 30 min antes na entrada da Arena", done: false },
          { id: "ex_st_7", text: "Reservar Capela Sistina / Museus do Vaticano (dia 23)", done: false }
        ]
      },
      {
        id: "ex_eu_14",
        type: "Viagem",
        name: "Road Trip Roma ➔ Florença (Toscana)",
        from: "Roma, Itália",
        to: "Florença, Itália",
        waypoints: ["Siena, Itália"],
        fromLat: 41.9028,
        fromLng: 12.4964,
        toLat: 43.7696,
        toLng: 11.2558,
        start: "2027-01-25",
        end: "2027-01-25",
        startTime: "09:00",
        km: 278,
        drive: 195,
        stops: 1,
        stopTime: 60,
        toll: 112,
        charges: 0,
        extraCost: 0,
        personalColId: "pcol_plan",
        completed: false,
        tags: ["Road Trip", "Itália"],
        notes: "Retirada do carro na Itália; rota cênica pela Toscana com parada em Siena."
      },
      {
        id: "ex_eu_15",
        type: "Hospedagem",
        name: "Residenza Duomo Firenze",
        location: "Florença, Itália",
        locationLat: 43.7731,
        locationLng: 11.2560,
        start: "2027-01-25",
        end: "2027-01-28",
        bookingRef: "FLR-DM-204",
        extraCost: 2950,
        personalColId: "pcol_conf",
        completed: false,
        tags: ["Hospedagem", "Itália"],
        notes: "3 diárias a poucos passos da Catedral Santa Maria del Fiore."
      },
      {
        id: "ex_eu_16",
        type: "Restaurante",
        name: "Galeria Uffizi & Bistecca alla Fiorentina",
        location: "Florença, Itália",
        locationLat: 43.7678,
        locationLng: 11.2553,
        start: "2027-01-26",
        end: "2027-01-26",
        startTime: "19:30",
        extraCost: 840,
        personalColId: "pcol_plan",
        completed: false,
        tags: ["Gastronomia", "Cultura", "Itália"],
        notes: "Ponte Vecchio no entardecer e jantar tradicional na Trattoria Dall'Oste."
      },
      {
        id: "ex_eu_17",
        type: "Viagem",
        name: "Road Trip Florença ➔ Veneza",
        from: "Florença, Itália",
        to: "Veneza, Itália",
        fromLat: 43.7696,
        fromLng: 11.2558,
        toLat: 45.4408,
        toLng: 12.3155,
        start: "2027-01-28",
        end: "2027-01-28",
        startTime: "09:30",
        km: 258,
        drive: 175,
        stops: 1,
        stopTime: 45,
        toll: 105,
        charges: 0,
        extraCost: 0,
        personalColId: "pcol_plan",
        completed: false,
        tags: ["Road Trip", "Itália"],
        notes: "Estacionamento Piazzale Roma e travessia de vaporetto pelo Grande Canal."
      },
      {
        id: "ex_eu_18",
        type: "Passeio",
        name: "Veneza: Praça São Marcos, Gôndola & Murano",
        location: "Veneza, Itália",
        locationLat: 45.4342,
        locationLng: 12.3388,
        start: "2027-01-28",
        end: "2027-01-30",
        extraCost: 2350,
        personalColId: "pcol_plan",
        completed: false,
        tags: ["Passeio", "Itália"],
        notes: "2 noites mágicas em Veneza: Ponte Rialto, Ilha de Murano e Burano."
      },
      {
        id: "ex_eu_19",
        type: "Viagem",
        name: "Road Trip Veneza ➔ Milão (via Verona)",
        from: "Veneza, Itália",
        to: "Milão, Itália",
        waypoints: ["Verona, Itália"],
        fromLat: 45.4408,
        fromLng: 12.3155,
        toLat: 45.4642,
        toLng: 9.1900,
        start: "2027-01-30",
        end: "2027-01-30",
        startTime: "09:00",
        km: 274,
        drive: 185,
        stops: 1,
        stopTime: 60,
        toll: 118,
        charges: 0,
        extraCost: 0,
        personalColId: "pcol_plan",
        completed: false,
        tags: ["Road Trip", "Itália"],
        notes: "Parada na Arena de Verona antes da chegada final em Milão."
      },
      {
        id: "ex_eu_20",
        type: "Passeio",
        name: "Duomo di Milano & Galleria Vittorio Emanuele",
        location: "Milão, Itália",
        locationLat: 45.4642,
        locationLng: 9.1919,
        start: "2027-01-31",
        end: "2027-01-31",
        startTime: "10:00",
        extraCost: 560,
        personalColId: "pcol_assuntos",
        completed: false,
        tags: ["Passeio", "Cultura", "Itália"],
        notes: "Subida aos terraços do Duomo, Castelo Sforzesco e jantar de despedida em Navigli."
      },
      {
        id: "ex_eu_21",
        type: "Voo",
        name: "Voo de Retorno Milão ➔ São Paulo",
        from: "Milão, Itália",
        to: "São Paulo, Brasil",
        fromLat: 45.6301,
        fromLng: 8.7255,
        toLat: -23.4356,
        toLng: -46.4731,
        start: "2027-02-01",
        end: "2027-02-02",
        startTime: "12:15",
        airline: "LATAM Airlines · LA 8073",
        bookingRef: "LTM27BR",
        km: 9480,
        drive: 710,
        extraCost: 13600,
        personalColId: "pcol_conf",
        completed: false,
        tags: ["Europa", "Voo"],
        notes: "Devolução do carro em Malpensa (MXP) e retorno ao Brasil com memórias inesquecíveis!"
      }
    ],
    checklist: [
      { id: "ex_chk_1", cat: "Documentos", item: "Passaportes com validade superior a 6 meses", prio: "Alta", status: "Concluído", notes: "Conferido por todos os 4 viajantes" },
      { id: "ex_chk_2", cat: "Documentos", item: "Seguro Viagem Europa (cobertura mínima €30.000 Schengen)", prio: "Alta", status: "Concluído", notes: "Apólice salva em PDF offline" },
      { id: "ex_chk_3", cat: "Documentos", item: "Emitir PID (Permissão Internacional para Dirigir) + CNH física", prio: "Alta", status: "Pendente", notes: "Obrigatória para locação de carro na Itália" },
      { id: "ex_chk_4", cat: "Roteiro", item: "Chip internacional / eSIM Europa (dados 5G multi-países)", prio: "Alta", status: "Pendente", notes: "Ativar na véspera do embarque" },
      { id: "ex_chk_5", cat: "Bagagem", item: "Roupas térmicas de inverno (casaco, luvas, bota impermeável)", prio: "Alta", status: "Pendente", notes: "Janeiro/Fevereiro: 2°C a 14°C na Europa" },
      { id: "ex_chk_6", cat: "Bagagem", item: "Adaptador universal de tomada (padrão europeu Tipo C/F/L)", prio: "Média", status: "Concluído", notes: "2 adaptadores + powerbank na mala de mão" },
      { id: "ex_chk_7", cat: "Roteiro", item: "Baixar mapas offline (Portugal, Espanha e Itália) no Google Maps", prio: "Média", status: "Pendente", notes: "Garantir navegação sem sinal em estradas da Toscana" },
      { id: "ex_chk_8", cat: "Eventos", item: "Conferir horários de trens/vaporettos e vouchers de museus", prio: "Média", status: "Pendente", notes: "Prado, Coliseu, Uffizi e Duomo di Milano" }
    ],
    splitwise: {
      participants: [
        { id: "ex_p1", name: "Lucas (Você)", pixKey: "lucas.exemplo@pix.myplan", pixName: "Lucas Silva", pixCity: "SAO PAULO" },
        { id: "ex_p2", name: "Marina", pixKey: "marina.exemplo@pix.myplan", pixName: "Marina Costa", pixCity: "SAO PAULO" },
        { id: "ex_p3", name: "Rafael", pixKey: "11999990103", pixName: "Rafael Oliveira", pixCity: "BRASILIA" },
        { id: "ex_p4", name: "Camila", pixKey: "camila.exemplo@pix.myplan", pixName: "Camila Souza", pixCity: "CURITIBA" }
      ],
      expenses: [
        {
          id: "ex_sw_1",
          desc: "Hotel Boutique Baixa-Chiado (Lisboa · 3 noites)",
          cat: "Hospedagem",
          date: "2027-01-11",
          amountCents: 340000,
          splitMode: "equal",
          payers: [{ participantId: "ex_p1", amountCents: 340000 }],
          shares: [
            { participantId: "ex_p1", included: true },
            { participantId: "ex_p2", included: true },
            { participantId: "ex_p3", included: true },
            { participantId: "ex_p4", included: true }
          ],
          notes: "Dividido igualmente entre os 4 amigos"
        },
        {
          id: "ex_sw_2",
          desc: "Locação SUV & Pedágios Portugal–Espanha",
          cat: "Transporte / Combustível",
          date: "2027-01-14",
          amountCents: 224000,
          splitMode: "equal",
          payers: [{ participantId: "ex_p2", amountCents: 224000 }],
          shares: [
            { participantId: "ex_p1", included: true },
            { participantId: "ex_p2", included: true },
            { participantId: "ex_p3", included: true },
            { participantId: "ex_p4", included: true }
          ],
          notes: "SUV + seguro completo + Via Verde"
        },
        {
          id: "ex_sw_3",
          desc: "Ingressos Coliseu, Prado & Uffizi (Grupo)",
          cat: "Passeios & Ingressos",
          date: "2027-01-19",
          amountCents: 170000,
          splitMode: "shares",
          payers: [{ participantId: "ex_p3", amountCents: 170000 }],
          shares: [
            { participantId: "ex_p1", weight: 2 },
            { participantId: "ex_p2", weight: 2 },
            { participantId: "ex_p3", weight: 1 },
            { participantId: "ex_p4", weight: 1 }
          ],
          notes: "Divisão por cotas (inclui audioguia extra p/ Lucas e Marina)"
        },
        {
          id: "ex_sw_4",
          desc: "Jantar Bistecca alla Fiorentina & Vinhos (Florença)",
          cat: "Alimentação",
          date: "2027-01-26",
          amountCents: 84000,
          splitMode: "percent",
          payers: [{ participantId: "ex_p4", amountCents: 84000 }],
          shares: [
            { participantId: "ex_p1", percent: 30 },
            { participantId: "ex_p2", percent: 25 },
            { participantId: "ex_p3", percent: 25 },
            { participantId: "ex_p4", percent: 20 }
          ],
          notes: "Divisão proporcional por consumo"
        },
        {
          id: "ex_sw_5",
          desc: "Passeio de Gôndola & Vaporetto (Veneza)",
          cat: "Passeios & Ingressos",
          date: "2027-01-29",
          amountCents: 96000,
          splitMode: "exact",
          payers: [{ participantId: "ex_p1", amountCents: 96000 }],
          shares: [
            { participantId: "ex_p1", amountCents: 26000 },
            { participantId: "ex_p2", amountCents: 26000 },
            { participantId: "ex_p3", amountCents: 22000 },
            { participantId: "ex_p4", amountCents: 22000 }
          ],
          notes: "Valores exatos por casal"
        }
      ],
      settlements: []
    }
  };
};

window.DEFAULT_DATA = window.createDefaultPersonalExampleData();

window.createBlankTripData = function (name, vehicleCopy) {
  const def = window.createDefaultPersonalExampleData();
  return {
    mode: "personal",
    isExample: false,
    title: name || "Nova Viagem",
    customTags: [],
    personalColumns: def.personalColumns,
    vehicle: vehicleCopy ? JSON.parse(JSON.stringify(vehicleCopy)) : {
      name: "Veículo Padrão",
      powertrain: "COMBUSTION",
      evRange: 0,
      hevKmL: 12.5,
      bevKwhPer100: 18,
      fuelPrice: 6.2,
      tank: 52,
      kwhPerCharge: 0,
      kwhPrice: 0.92,
      battery: 0
    },
    params: { ...def.params, travelers: 2, dailyFoodPerPerson: 0, contingencyPct: 0, personalDoneColumnId: "" },
    scenarios: def.scenarios,
    activities: [],
    checklist: [],
    splitwise: { participants: [], expenses: [], settlements: [] }
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
  Tarefa:          { id: "Tarefa",          label: "Tarefa",          short: "Tarefa",          iconId: "check",     color: "#2563eb", cls: "pro-dev",      defaultFin: "none" },
  Desenvolvimento: { id: "Desenvolvimento", label: "Desenvolvimento", short: "Desenvolvimento", iconId: "code",      color: "#1d4ed8", cls: "pro-dev",      defaultFin: "none" },
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
  { id: "assuntos", title: "Assuntos",            color: "#64748b" },
  { id: "todo",     title: "A Fazer",             color: "#0284c7" },
  { id: "doing",    title: "Em Andamento",        color: "#2563eb" },
  { id: "review",   title: "Revisão / Aprovação", color: "#d97706" },
  { id: "done",     title: "Concluído",           color: "#10b981" }
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
