/* ===== Banco de Dados de Veículos & Autocompletar — Férias Pro ===== */
(function () {
  const CATALOG = [
    // BYD
    { id: "byd-song-plus-24", name: "BYD Song Plus DM-i 23/24", powertrain: "PHEV", evRange: 30, hevKmL: 16.0, bevKwhPer100: 18, tank: 57, battery: 8.3, kwhPerCharge: 6.5 },
    { id: "byd-song-plus-25", name: "BYD Song Plus DM-i 25/26 (18.3 kWh)", powertrain: "PHEV", evRange: 68, hevKmL: 16.5, bevKwhPer100: 18, tank: 60, battery: 18.3, kwhPerCharge: 14.5 },
    { id: "byd-song-pro-gl", name: "BYD Song Pro DM-i GL (12.9 kWh)", powertrain: "PHEV", evRange: 49, hevKmL: 16.2, bevKwhPer100: 18, tank: 52, battery: 12.9, kwhPerCharge: 10.2 },
    { id: "byd-song-pro-gs", name: "BYD Song Pro DM-i GS (18.3 kWh)", powertrain: "PHEV", evRange: 68, hevKmL: 16.2, bevKwhPer100: 18, tank: 52, battery: 18.3, kwhPerCharge: 14.5 },
    { id: "byd-king-gl", name: "BYD King DM-i GL", powertrain: "PHEV", evRange: 32, hevKmL: 18.5, bevKwhPer100: 16, tank: 48, battery: 8.3, kwhPerCharge: 6.6 },
    { id: "byd-king-gs", name: "BYD King DM-i GS", powertrain: "PHEV", evRange: 80, hevKmL: 18.5, bevKwhPer100: 16, tank: 48, battery: 18.3, kwhPerCharge: 14.5 },
    { id: "byd-dolphin-mini", name: "BYD Dolphin Mini (38 kWh)", powertrain: "BEV", evRange: 280, hevKmL: 0, bevKwhPer100: 13.5, tank: 0, battery: 38.0, kwhPerCharge: 30.0 },
    { id: "byd-dolphin", name: "BYD Dolphin GS (44.9 kWh)", powertrain: "BEV", evRange: 291, hevKmL: 0, bevKwhPer100: 15.4, tank: 0, battery: 44.9, kwhPerCharge: 36.0 },
    { id: "byd-dolphin-plus", name: "BYD Dolphin Plus (60.5 kWh)", powertrain: "BEV", evRange: 330, hevKmL: 0, bevKwhPer100: 17.5, tank: 0, battery: 60.5, kwhPerCharge: 48.0 },
    { id: "byd-yuan-plus", name: "BYD Yuan Plus (60.5 kWh)", powertrain: "BEV", evRange: 294, hevKmL: 0, bevKwhPer100: 18.5, tank: 0, battery: 60.5, kwhPerCharge: 48.0 },
    { id: "byd-yuan-pro", name: "BYD Yuan Pro (45.1 kWh)", powertrain: "BEV", evRange: 250, hevKmL: 0, bevKwhPer100: 17.2, tank: 0, battery: 45.1, kwhPerCharge: 36.0 },
    { id: "byd-seal", name: "BYD Seal AWD (82.5 kWh)", powertrain: "BEV", evRange: 372, hevKmL: 0, bevKwhPer100: 19.2, tank: 0, battery: 82.5, kwhPerCharge: 66.0 },
    { id: "byd-shark", name: "BYD Shark PHEV", powertrain: "PHEV", evRange: 57, hevKmL: 10.5, bevKwhPer100: 26, tank: 60, battery: 29.6, kwhPerCharge: 23.5 },

    // GWM Haval / Ora
    { id: "gwm-h6-hev", name: "GWM Haval H6 HEV2", powertrain: "HEV", evRange: 0, hevKmL: 14.5, bevKwhPer100: 19, tank: 55, battery: 1.6, kwhPerCharge: 0 },
    { id: "gwm-h6-phev19", name: "GWM Haval H6 PHEV19", powertrain: "PHEV", evRange: 74, hevKmL: 15.0, bevKwhPer100: 19, tank: 55, battery: 19.0, kwhPerCharge: 15.2 },
    { id: "gwm-h6-phev34", name: "GWM Haval H6 PHEV34 AWD", powertrain: "PHEV", evRange: 113, hevKmL: 14.2, bevKwhPer100: 21, tank: 55, battery: 34.0, kwhPerCharge: 27.0 },
    { id: "gwm-h6-gt", name: "GWM Haval H6 GT PHEV", powertrain: "PHEV", evRange: 105, hevKmL: 13.8, bevKwhPer100: 21, tank: 55, battery: 34.0, kwhPerCharge: 27.0 },
    { id: "gwm-ora-skin", name: "GWM Ora 03 Skin (48 kWh)", powertrain: "BEV", evRange: 232, hevKmL: 0, bevKwhPer100: 17.0, tank: 0, battery: 48.0, kwhPerCharge: 38.0 },
    { id: "gwm-ora-gt", name: "GWM Ora 03 GT (63 kWh)", powertrain: "BEV", evRange: 319, hevKmL: 0, bevKwhPer100: 17.8, tank: 0, battery: 63.0, kwhPerCharge: 50.0 },

    // Toyota
    { id: "toyota-corolla-hev", name: "Toyota Corolla Altis Hybrid", powertrain: "HEV", evRange: 0, hevKmL: 18.0, bevKwhPer100: 16, tank: 43, battery: 1.3, kwhPerCharge: 0 },
    { id: "toyota-corolla-20", name: "Toyota Corolla 2.0 Flex", powertrain: "COMBUSTION", evRange: 0, hevKmL: 14.2, bevKwhPer100: 18, tank: 50, battery: 0, kwhPerCharge: 0 },
    { id: "toyota-ccross-hev", name: "Toyota Corolla Cross Hybrid", powertrain: "HEV", evRange: 0, hevKmL: 16.8, bevKwhPer100: 17, tank: 36, battery: 1.3, kwhPerCharge: 0 },
    { id: "toyota-ccross-20", name: "Toyota Corolla Cross 2.0 Flex", powertrain: "COMBUSTION", evRange: 0, hevKmL: 13.5, bevKwhPer100: 18, tank: 47, battery: 0, kwhPerCharge: 0 },
    { id: "toyota-rav4-hev", name: "Toyota RAV4 SX Hybrid", powertrain: "HEV", evRange: 0, hevKmL: 15.8, bevKwhPer100: 19, tank: 55, battery: 1.6, kwhPerCharge: 0 },
    { id: "toyota-rav4-phev", name: "Toyota RAV4 Plug-in Hybrid", powertrain: "PHEV", evRange: 55, hevKmL: 15.5, bevKwhPer100: 19, tank: 55, battery: 18.1, kwhPerCharge: 14.5 },
    { id: "toyota-hilux-diesel", name: "Toyota Hilux 2.8 Diesel 4x4", powertrain: "COMBUSTION", evRange: 0, hevKmL: 11.2, bevKwhPer100: 25, tank: 80, battery: 0, kwhPerCharge: 0 },
    { id: "toyota-sw4", name: "Toyota SW4 2.8 Diesel", powertrain: "COMBUSTION", evRange: 0, hevKmL: 11.0, bevKwhPer100: 25, tank: 80, battery: 0, kwhPerCharge: 0 },
    { id: "toyota-yaris", name: "Toyota Yaris 1.5 Flex", powertrain: "COMBUSTION", evRange: 0, hevKmL: 14.5, bevKwhPer100: 16, tank: 45, battery: 0, kwhPerCharge: 0 },

    // Honda
    { id: "honda-hrv-15", name: "Honda HR-V 1.5 Aspirado/Turbo", powertrain: "COMBUSTION", evRange: 0, hevKmL: 13.9, bevKwhPer100: 18, tank: 50, battery: 0, kwhPerCharge: 0 },
    { id: "honda-civic-hev", name: "Honda Civic e:HEV Híbrido", powertrain: "HEV", evRange: 0, hevKmL: 18.5, bevKwhPer100: 16, tank: 40, battery: 1.05, kwhPerCharge: 0 },
    { id: "honda-zrv", name: "Honda ZR-V Touring 2.0", powertrain: "COMBUSTION", evRange: 0, hevKmL: 13.0, bevKwhPer100: 18, tank: 53, battery: 0, kwhPerCharge: 0 },
    { id: "honda-crv-hev", name: "Honda CR-V Advanced Hybrid", powertrain: "HEV", evRange: 0, hevKmL: 15.4, bevKwhPer100: 19, tank: 53, battery: 1.06, kwhPerCharge: 0 },
    { id: "honda-city", name: "Honda City 1.5 Flex", powertrain: "COMBUSTION", evRange: 0, hevKmL: 15.2, bevKwhPer100: 16, tank: 44, battery: 0, kwhPerCharge: 0 },

    // Volkswagen
    { id: "vw-tcross-200", name: "VW T-Cross 200 TSI", powertrain: "COMBUSTION", evRange: 0, hevKmL: 14.2, bevKwhPer100: 18, tank: 52, battery: 0, kwhPerCharge: 0 },
    { id: "vw-tcross-250", name: "VW T-Cross Highline 250 TSI", powertrain: "COMBUSTION", evRange: 0, hevKmL: 13.5, bevKwhPer100: 18, tank: 52, battery: 0, kwhPerCharge: 0 },
    { id: "vw-nivus", name: "VW Nivus 200 TSI", powertrain: "COMBUSTION", evRange: 0, hevKmL: 14.8, bevKwhPer100: 17, tank: 52, battery: 0, kwhPerCharge: 0 },
    { id: "vw-polo", name: "VW Polo TSI 1.0", powertrain: "COMBUSTION", evRange: 0, hevKmL: 15.8, bevKwhPer100: 16, tank: 52, battery: 0, kwhPerCharge: 0 },
    { id: "vw-taos", name: "VW Taos 250 TSI", powertrain: "COMBUSTION", evRange: 0, hevKmL: 13.2, bevKwhPer100: 19, tank: 51, battery: 0, kwhPerCharge: 0 },
    { id: "vw-tiguan", name: "VW Tiguan Allspace R-Line", powertrain: "COMBUSTION", evRange: 0, hevKmL: 11.8, bevKwhPer100: 20, tank: 60, battery: 0, kwhPerCharge: 0 },
    { id: "vw-id4", name: "VW ID.4 Pro (77 kWh)", powertrain: "BEV", evRange: 370, hevKmL: 0, bevKwhPer100: 19.0, tank: 0, battery: 77.0, kwhPerCharge: 61.0 },

    // Jeep & Fiat & Ram (Stellantis)
    { id: "jeep-compass-t270", name: "Jeep Compass T270 1.3 Turbo", powertrain: "COMBUSTION", evRange: 0, hevKmL: 12.6, bevKwhPer100: 19, tank: 55, battery: 0, kwhPerCharge: 0 },
    { id: "jeep-compass-4xe", name: "Jeep Compass 4xe PHEV", powertrain: "PHEV", evRange: 44, hevKmL: 13.8, bevKwhPer100: 20, tank: 36.5, battery: 11.4, kwhPerCharge: 9.2 },
    { id: "jeep-renegade-t270", name: "Jeep Renegade T270 1.3 Turbo", powertrain: "COMBUSTION", evRange: 0, hevKmL: 12.8, bevKwhPer100: 19, tank: 55, battery: 0, kwhPerCharge: 0 },
    { id: "jeep-commander", name: "Jeep Commander T270 / TD380", powertrain: "COMBUSTION", evRange: 0, hevKmL: 11.8, bevKwhPer100: 21, tank: 61, battery: 0, kwhPerCharge: 0 },
    { id: "fiat-pulse", name: "Fiat Pulse 1.0 Turbo / 1.3", powertrain: "COMBUSTION", evRange: 0, hevKmL: 14.5, bevKwhPer100: 17, tank: 47, battery: 0, kwhPerCharge: 0 },
    { id: "fiat-fastback", name: "Fiat Fastback Turbo 200/270", powertrain: "COMBUSTION", evRange: 0, hevKmL: 14.0, bevKwhPer100: 17, tank: 47, battery: 0, kwhPerCharge: 0 },
    { id: "fiat-toro", name: "Fiat Toro T270 / Diesel", powertrain: "COMBUSTION", evRange: 0, hevKmL: 12.4, bevKwhPer100: 21, tank: 55, battery: 0, kwhPerCharge: 0 },
    { id: "fiat-strada", name: "Fiat Strada 1.3 / 1.0 Turbo", powertrain: "COMBUSTION", evRange: 0, hevKmL: 14.2, bevKwhPer100: 17, tank: 55, battery: 0, kwhPerCharge: 0 },
    { id: "ram-rampage", name: "Ram Rampage 2.0 Turbo / Diesel", powertrain: "COMBUSTION", evRange: 0, hevKmL: 10.8, bevKwhPer100: 24, tank: 55, battery: 0, kwhPerCharge: 0 },

    // Caoa Chery
    { id: "chery-tiggo-5x", name: "Caoa Chery Tiggo 5X Pro / Hybrid", powertrain: "HEV", evRange: 0, hevKmL: 13.5, bevKwhPer100: 18, tank: 51, battery: 0.5, kwhPerCharge: 0 },
    { id: "chery-tiggo-7", name: "Caoa Chery Tiggo 7 Pro / Sport", powertrain: "COMBUSTION", evRange: 0, hevKmL: 12.8, bevKwhPer100: 19, tank: 51, battery: 0, kwhPerCharge: 0 },
    { id: "chery-tiggo-8-phev", name: "Caoa Chery Tiggo 8 Pro Plug-in Hybrid", powertrain: "PHEV", evRange: 54, hevKmL: 14.0, bevKwhPer100: 20, tank: 60, battery: 19.3, kwhPerCharge: 15.5 },

    // Hyundai & Kia
    { id: "hyundai-creta-10", name: "Hyundai Creta 1.0 TGDI / 1.6", powertrain: "COMBUSTION", evRange: 0, hevKmL: 13.8, bevKwhPer100: 18, tank: 50, battery: 0, kwhPerCharge: 0 },
    { id: "hyundai-hb20", name: "Hyundai HB20 1.0 TGDI", powertrain: "COMBUSTION", evRange: 0, hevKmL: 15.4, bevKwhPer100: 16, tank: 50, battery: 0, kwhPerCharge: 0 },
    { id: "hyundai-kona-hev", name: "Hyundai Kona Hybrid", powertrain: "HEV", evRange: 0, hevKmL: 19.0, bevKwhPer100: 16, tank: 38, battery: 1.56, kwhPerCharge: 0 },
    { id: "hyundai-kona-ev", name: "Hyundai Kona EV (64.8 kWh)", powertrain: "BEV", evRange: 360, hevKmL: 0, bevKwhPer100: 16.5, tank: 0, battery: 64.8, kwhPerCharge: 52.0 },
    { id: "kia-niro-hev", name: "Kia Niro Hybrid", powertrain: "HEV", evRange: 0, hevKmL: 19.2, bevKwhPer100: 16, tank: 42, battery: 1.32, kwhPerCharge: 0 },
    { id: "kia-sportage-hev", name: "Kia Sportage MHEV/HEV", powertrain: "HEV", evRange: 0, hevKmL: 14.5, bevKwhPer100: 19, tank: 54, battery: 1.5, kwhPerCharge: 0 },
    { id: "kia-ev5", name: "Kia EV5 (88 kWh)", powertrain: "BEV", evRange: 400, hevKmL: 0, bevKwhPer100: 19.5, tank: 0, battery: 88.0, kwhPerCharge: 70.0 },

    // Chevrolet
    { id: "chevy-onix", name: "Chevrolet Onix / Plus 1.0 Turbo", powertrain: "COMBUSTION", evRange: 0, hevKmL: 16.0, bevKwhPer100: 16, tank: 44, battery: 0, kwhPerCharge: 0 },
    { id: "chevy-tracker", name: "Chevrolet Tracker 1.0 / 1.2 Turbo", powertrain: "COMBUSTION", evRange: 0, hevKmL: 13.7, bevKwhPer100: 18, tank: 44, battery: 0, kwhPerCharge: 0 },
    { id: "chevy-equinox-ev", name: "Chevrolet Equinox EV (85 kWh)", powertrain: "BEV", evRange: 443, hevKmL: 0, bevKwhPer100: 19.0, tank: 0, battery: 85.0, kwhPerCharge: 68.0 },
    { id: "chevy-s10", name: "Chevrolet S10 2.8 Diesel", powertrain: "COMBUSTION", evRange: 0, hevKmL: 11.4, bevKwhPer100: 25, tank: 76, battery: 0, kwhPerCharge: 0 },

    // Nissan, Renault, Peugeot, Ford
    { id: "nissan-kicks", name: "Nissan Kicks 1.6 CVT", powertrain: "COMBUSTION", evRange: 0, hevKmL: 14.0, bevKwhPer100: 17, tank: 41, battery: 0, kwhPerCharge: 0 },
    { id: "nissan-sentra", name: "Nissan Sentra 2.0", powertrain: "COMBUSTION", evRange: 0, hevKmL: 14.2, bevKwhPer100: 17, tank: 47, battery: 0, kwhPerCharge: 0 },
    { id: "renault-kardian", name: "Renault Kardian 1.0 Turbo", powertrain: "COMBUSTION", evRange: 0, hevKmL: 14.4, bevKwhPer100: 17, tank: 50, battery: 0, kwhPerCharge: 0 },
    { id: "renault-duster", name: "Renault Duster 1.3 Turbo / 1.6", powertrain: "COMBUSTION", evRange: 0, hevKmL: 13.0, bevKwhPer100: 19, tank: 46, battery: 0, kwhPerCharge: 0 },
    { id: "renault-megane-ev", name: "Renault Megane E-Tech (60 kWh)", powertrain: "BEV", evRange: 337, hevKmL: 0, bevKwhPer100: 16.8, tank: 0, battery: 60.0, kwhPerCharge: 48.0 },
    { id: "peugeot-2008", name: "Peugeot 2008 Turbo 200", powertrain: "COMBUSTION", evRange: 0, hevKmL: 14.1, bevKwhPer100: 17, tank: 47, battery: 0, kwhPerCharge: 0 },
    { id: "peugeot-e2008", name: "Peugeot e-2008 (50 kWh)", powertrain: "BEV", evRange: 261, hevKmL: 0, bevKwhPer100: 17.8, tank: 0, battery: 50.0, kwhPerCharge: 40.0 },
    { id: "ford-territory", name: "Ford Territory 1.5 EcoBoost", powertrain: "COMBUSTION", evRange: 0, hevKmL: 12.2, bevKwhPer100: 19, tank: 60, battery: 0, kwhPerCharge: 0 },
    { id: "ford-ranger", name: "Ford Ranger V6 / 2.0 Diesel", powertrain: "COMBUSTION", evRange: 0, hevKmL: 10.8, bevKwhPer100: 25, tank: 80, battery: 0, kwhPerCharge: 0 },

    // Volvo, BMW, Mercedes, Audi, Porsche, Tesla
    { id: "volvo-ex30", name: "Volvo EX30 Extended Range (69 kWh)", powertrain: "BEV", evRange: 338, hevKmL: 0, bevKwhPer100: 18.0, tank: 0, battery: 69.0, kwhPerCharge: 55.0 },
    { id: "volvo-xc60-t8", name: "Volvo XC60 T8 Recharge PHEV", powertrain: "PHEV", evRange: 55, hevKmL: 12.5, bevKwhPer100: 22, tank: 71, battery: 18.8, kwhPerCharge: 15.0 },
    { id: "bmw-320i", name: "BMW 320i 2.0 TwinPower Turbo", powertrain: "COMBUSTION", evRange: 0, hevKmL: 13.8, bevKwhPer100: 18, tank: 59, battery: 0, kwhPerCharge: 0 },
    { id: "bmw-x1", name: "BMW X1 sDrive20i / ix1", powertrain: "COMBUSTION", evRange: 0, hevKmL: 13.2, bevKwhPer100: 19, tank: 54, battery: 0, kwhPerCharge: 0 },
    { id: "bmw-330e", name: "BMW 330e M Sport PHEV", powertrain: "PHEV", evRange: 48, hevKmL: 14.5, bevKwhPer100: 19, tank: 40, battery: 12.0, kwhPerCharge: 9.6 },
    { id: "bmw-x5-50e", name: "BMW X5 xDrive50e PHEV", powertrain: "PHEV", evRange: 79, hevKmL: 11.2, bevKwhPer100: 25, tank: 69, battery: 25.7, kwhPerCharge: 20.5 },
    { id: "mercedes-gla200", name: "Mercedes-Benz GLA 200", powertrain: "COMBUSTION", evRange: 0, hevKmL: 13.5, bevKwhPer100: 18, tank: 43, battery: 0, kwhPerCharge: 0 },
    { id: "audi-q3", name: "Audi Q3 2.0 TFSI Quattro", powertrain: "COMBUSTION", evRange: 0, hevKmL: 12.0, bevKwhPer100: 20, tank: 60, battery: 0, kwhPerCharge: 0 },
    { id: "audi-q5-phev", name: "Audi Q5 TFSIe Quattro PHEV", powertrain: "PHEV", evRange: 45, hevKmL: 13.0, bevKwhPer100: 22, tank: 54, battery: 17.9, kwhPerCharge: 14.3 },
    { id: "porsche-cayenne-eh", name: "Porsche Cayenne E-Hybrid", powertrain: "PHEV", evRange: 66, hevKmL: 10.5, bevKwhPer100: 26, tank: 75, battery: 25.9, kwhPerCharge: 20.7 },
    { id: "tesla-model-3-lr", name: "Tesla Model 3 Long Range (75 kWh)", powertrain: "BEV", evRange: 490, hevKmL: 0, bevKwhPer100: 14.5, tank: 0, battery: 75.0, kwhPerCharge: 60.0 },
    { id: "tesla-model-y-lr", name: "Tesla Model Y Long Range (75 kWh)", powertrain: "BEV", evRange: 455, hevKmL: 0, bevKwhPer100: 16.0, tank: 0, battery: 75.0, kwhPerCharge: 60.0 }
  ];

  function norm(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function search(query, limit = 12) {
    const q = norm(query);
    if (!q) return CATALOG.slice(0, limit);
    const terms = q.split(/\s+/).filter(Boolean);
    return CATALOG
      .map(v => {
        const hay = norm(`${v.name} ${v.powertrain}`);
        if (!terms.every(t => hay.includes(t))) return null;
        const score = hay.startsWith(q) ? 3 : (hay.includes(q) ? 2 : 1);
        return { v, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.v.name.localeCompare(b.v.name))
      .slice(0, limit)
      .map(x => x.v);
  }

  function findExactOrBest(name) {
    const q = norm(name);
    if (!q) return null;
    const exact = CATALOG.find(v => norm(v.name) === q);
    if (exact) return exact;
    const matches = search(name, 1);
    return matches[0] || null;
  }

  window.FeriasVehicles = {
    CATALOG,
    search,
    findExactOrBest
  };
})();
