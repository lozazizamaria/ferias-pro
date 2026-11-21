/* ===== Banco de Dados Completo de Veículos (Clássicos, Combustão, Flex, Diesel, HEV, PHEV, BEV) — Férias Pro ===== */
(function () {
  // C = Combustão (Gasolina/Flex/Diesel), HEV = Híbrido Convencional, PHEV = Plug-in, BEV = 100% Elétrico
  // Formato compacto: [id, name, powertrain, hevKmL, tank, evRange, battery, kwhPerCharge, bevKwhPer100, category]
  const RAW = [
    // === CLÁSSICOS & ANTIGOS (1968–2005) ===
    ["vw-fusca-1300", "VW Fusca 1300 / 1300L (1968–1983)", "COMBUSTION", 10.5, 41, 0, 0, 0, 18, "Clássico"],
    ["vw-fusca-1500", "VW Fusca 1500 / 1600 (1970–1996)", "COMBUSTION", 11.2, 41, 0, 0, 0, 18, "Clássico"],
    ["vw-brasilia", "VW Brasília 1600 (1973–1982)", "COMBUSTION", 10.5, 46, 0, 0, 0, 18, "Clássico"],
    ["vw-variant", "VW Variant / TL 1600 (1969–1981)", "COMBUSTION", 10.2, 46, 0, 0, 0, 18, "Clássico"],
    ["vw-kombi-1600", "VW Kombi 1600 / 1.4 Flex", "COMBUSTION", 9.0, 45, 0, 0, 0, 22, "Clássico"],
    ["vw-gol-quadrado-ap", "VW Gol Quadrado 1.6 / 1.8 AP (1984–1994)", "COMBUSTION", 12.2, 47, 0, 0, 0, 18, "Clássico"],
    ["vw-gol-gti", "VW Gol GTI / GTS 2.0 (1989–1996)", "COMBUSTION", 10.8, 55, 0, 0, 0, 19, "Clássico"],
    ["vw-gol-g2-g3", "VW Gol G2 / G3 1.0 / 1.6 / 1.8 (1995–2005)", "COMBUSTION", 13.5, 51, 0, 0, 0, 17, "Clássico"],
    ["vw-parati", "VW Parati 1.6 / 1.8 / 2.0 AP (1982–2012)", "COMBUSTION", 12.5, 51, 0, 0, 0, 18, "Clássico"],
    ["vw-voyage-antigo", "VW Voyage 1.6 / 1.8 AP (1981–1995)", "COMBUSTION", 12.6, 55, 0, 0, 0, 18, "Clássico"],
    ["vw-santana", "VW Santana / Quantum 2.0 AP (1984–2006)", "COMBUSTION", 11.5, 68, 0, 0, 0, 19, "Clássico"],
    ["vw-pointer-logus", "VW Logus / Pointer 1.8 / 2.0 (1993–1997)", "COMBUSTION", 11.8, 64, 0, 0, 0, 18, "Clássico"],
    ["vw-golf-mk3-mk4", "VW Golf MK3 / MK4 1.6 / 2.0 (1994–2013)", "COMBUSTION", 12.0, 55, 0, 0, 0, 18, "Clássico"],
    ["gm-opala-4cc", "Chevrolet Opala / Caravan 4cc 2.5 (1969–1992)", "COMBUSTION", 8.8, 65, 0, 0, 0, 22, "Clássico"],
    ["gm-opala-6cc", "Chevrolet Opala / Diplomata 6cc 4.1 (1971–1992)", "COMBUSTION", 6.8, 84, 0, 0, 0, 25, "Clássico"],
    ["gm-chevette", "Chevrolet Chevette / Marajó 1.4 / 1.6 (1973–1993)", "COMBUSTION", 11.5, 45, 0, 0, 0, 18, "Clássico"],
    ["gm-monza", "Chevrolet Monza 1.8 / 2.0 (1982–1996)", "COMBUSTION", 11.2, 61, 0, 0, 0, 19, "Clássico"],
    ["gm-kadett-ipanema", "Chevrolet Kadett / Ipanema 1.8 / 2.0 (1989–1998)", "COMBUSTION", 11.5, 60, 0, 0, 0, 18, "Clássico"],
    ["gm-omega-antigo", "Chevrolet Omega 2.0 / 3.0 / 4.1 (1992–1998)", "COMBUSTION", 9.2, 75, 0, 0, 0, 21, "Clássico"],
    ["gm-vectra-a-b", "Chevrolet Vectra 2.0 / 2.2 (1994–2005)", "COMBUSTION", 11.8, 60, 0, 0, 0, 19, "Clássico"],
    ["gm-corsa-wind", "Chevrolet Corsa B / Classic 1.0 / 1.6 (1994–2016)", "COMBUSTION", 14.5, 46, 0, 0, 0, 16, "Clássico"],
    ["gm-astra-antigo", "Chevrolet Astra 1.8 / 2.0 Flex (1999–2011)", "COMBUSTION", 12.2, 52, 0, 0, 0, 18, "Clássico"],
    ["gm-zafira", "Chevrolet Zafira 2.0 8V/16V (2001–2012)", "COMBUSTION", 10.8, 58, 0, 0, 0, 20, "Clássico"],
    ["gm-d20", "Chevrolet D-20 / Silverado Diesel (1985–2001)", "COMBUSTION", 8.5, 110, 0, 0, 0, 26, "Clássico"],
    ["gm-blazer-v6", "Chevrolet Blazer / S10 4.3 V6 / 2.4 (1995–2011)", "COMBUSTION", 8.4, 70, 0, 0, 0, 24, "Clássico"],
    ["fiat-147", "Fiat 147 / Spazio / Oggi (1976–1987)", "COMBUSTION", 13.0, 38, 0, 0, 0, 16, "Clássico"],
    ["fiat-uno-mille", "Fiat Uno Mille 1.0 Fire / EP (1984–2013)", "COMBUSTION", 15.6, 50, 0, 0, 0, 15, "Clássico"],
    ["fiat-uno-turbo", "Fiat Uno Turbo / 1.6R (1990–1996)", "COMBUSTION", 11.5, 50, 0, 0, 0, 18, "Clássico"],
    ["fiat-elba-premio", "Fiat Prêmio / Elba 1.5 / 1.6 (1985–1996)", "COMBUSTION", 12.0, 55, 0, 0, 0, 17, "Clássico"],
    ["fiat-tempra", "Fiat Tempra 2.0 8V/16V (1992–1999)", "COMBUSTION", 10.5, 65, 0, 0, 0, 19, "Clássico"],
    ["fiat-marea", "Fiat Marea 2.0 / 2.4 5cc (1998–2007)", "COMBUSTION", 9.8, 63, 0, 0, 0, 20, "Clássico"],
    ["fiat-palio-g1", "Fiat Palio / Siena / Weekend Fire (1996–2016)", "COMBUSTION", 14.5, 48, 0, 0, 0, 16, "Clássico"],
    ["ford-corcel-delrey", "Ford Corcel II / Belina / Del Rey 1.6 (1978–1991)", "COMBUSTION", 11.2, 57, 0, 0, 0, 18, "Clássico"],
    ["ford-maverick-v8", "Ford Maverick V8 / 6cc / Landau V8", "COMBUSTION", 5.8, 68, 0, 0, 0, 26, "Clássico"],
    ["ford-escort-xr3", "Ford Escort / Verona / XR3 1.6 / 1.8 / 2.0", "COMBUSTION", 12.2, 55, 0, 0, 0, 18, "Clássico"],
    ["ford-pampa", "Ford Pampa 1.6 / 1.8 4x4 (1982–1997)", "COMBUSTION", 11.0, 57, 0, 0, 0, 18, "Clássico"],
    ["ford-f1000", "Ford F-1000 MWM Diesel (1979–1998)", "COMBUSTION", 9.0, 118, 0, 0, 0, 26, "Clássico"],
    ["ford-ka-endura", "Ford Ka 1.0 / 1.3 / 1.6 Zetec (1997–2013)", "COMBUSTION", 14.8, 42, 0, 0, 0, 16, "Clássico"],
    ["ford-fiesta-antigo", "Ford Fiesta 1.0 / 1.6 Rocam (1996–2014)", "COMBUSTION", 13.8, 45, 0, 0, 0, 17, "Clássico"],
    ["honda-civic-g5-g7", "Honda Civic 1.6 / 1.7 (1992–2006)", "COMBUSTION", 13.5, 45, 0, 0, 0, 17, "Clássico"],
    ["toyota-corolla-g7-g9", "Toyota Corolla 1.6 / 1.8 (1993–2008)", "COMBUSTION", 13.6, 50, 0, 0, 0, 17, "Clássico"],
    ["peugeot-206-307", "Peugeot 206 / 207 / 307 1.4 / 1.6 / 2.0", "COMBUSTION", 13.2, 50, 0, 0, 0, 17, "Clássico"],
    ["renault-clio-megane", "Renault Clio / Mégane / Scénic 1.0 / 1.6 / 2.0", "COMBUSTION", 13.8, 50, 0, 0, 0, 17, "Clássico"],
    ["citroen-xsara-c3", "Citroën C3 / Xsara Picasso 1.4 / 1.6 / 2.0", "COMBUSTION", 13.0, 47, 0, 0, 0, 17, "Clássico"],

    // === HATCHES & COMPACTOS MODERNOS (FLEX / COMBUSTÃO) ===
    ["vw-gol-g5-g8", "VW Gol 1.0 / 1.6 MSI Flex (2008–2023)", "COMBUSTION", 14.8, 55, 0, 0, 0, 16, "Hatch"],
    ["vw-fox-spacefox", "VW Fox / SpaceFox / CrossFox 1.0 / 1.6", "COMBUSTION", 13.8, 50, 0, 0, 0, 17, "Hatch"],
    ["vw-up-mpi", "VW Up! 1.0 MPI / Take / Move", "COMBUSTION", 16.5, 50, 0, 0, 0, 14, "Hatch"],
    ["vw-up-tsi", "VW Up! 1.0 TSI Pepper / Cross", "COMBUSTION", 16.8, 50, 0, 0, 0, 15, "Hatch"],
    ["vw-polo-tsi", "VW Polo 1.0 MPI / 170 TSI / 200 TSI", "COMBUSTION", 15.8, 52, 0, 0, 0, 16, "Hatch"],
    ["vw-polo-gts", "VW Polo GTS / Golf GTI 2.0 TSI", "COMBUSTION", 12.6, 52, 0, 0, 0, 18, "Esportivo"],
    ["gm-celta", "Chevrolet Celta / Prisma 1.0 / 1.4 (2000–2016)", "COMBUSTION", 15.2, 54, 0, 0, 0, 15, "Hatch"],
    ["gm-onix-10", "Chevrolet Onix / Plus 1.0 Aspirado", "COMBUSTION", 16.2, 44, 0, 0, 0, 15, "Hatch"],
    ["gm-onix-turbo", "Chevrolet Onix / Plus 1.0 Turbo", "COMBUSTION", 15.8, 44, 0, 0, 0, 16, "Hatch"],
    ["gm-cruze-sport", "Chevrolet Cruze Hatch/Sedan 1.4 Turbo", "COMBUSTION", 14.0, 52, 0, 0, 0, 17, "Sedan"],
    ["fiat-argo-10", "Fiat Argo / Cronos 1.0 Firefly", "COMBUSTION", 15.4, 48, 0, 0, 0, 15, "Hatch"],
    ["fiat-argo-13", "Fiat Argo / Cronos 1.3 Firefly / CVT", "COMBUSTION", 14.6, 48, 0, 0, 0, 16, "Hatch"],
    ["fiat-mobi", "Fiat Mobi 1.0 Fire / Like / Trekking", "COMBUSTION", 15.5, 47, 0, 0, 0, 15, "Hatch"],
    ["fiat-punto-bravo", "Fiat Punto / Bravo 1.4 T-Jet / 1.6 / 1.8", "COMBUSTION", 13.0, 48, 0, 0, 0, 17, "Hatch"],
    ["hyundai-hb20-10", "Hyundai HB20 / HB20S 1.0 Aspirado", "COMBUSTION", 15.6, 50, 0, 0, 0, 15, "Hatch"],
    ["hyundai-hb20-tgdi", "Hyundai HB20 / HB20S 1.0 Turbo / 1.6", "COMBUSTION", 14.8, 50, 0, 0, 0, 16, "Hatch"],
    ["hyundai-i30", "Hyundai i30 1.8 / 2.0", "COMBUSTION", 12.2, 53, 0, 0, 0, 18, "Hatch"],
    ["renault-kwid", "Renault Kwid 1.0 SCe Zen / Intense / Outsider", "COMBUSTION", 16.4, 38, 0, 0, 0, 14, "Hatch"],
    ["renault-sandero-logan", "Renault Sandero / Stepway / Logan 1.0 / 1.6", "COMBUSTION", 14.2, 50, 0, 0, 0, 16, "Hatch"],
    ["peugeot-208-10", "Peugeot 208 1.0 Firefly / 1.6 / Turbo 200", "COMBUSTION", 15.4, 47, 0, 0, 0, 16, "Hatch"],
    ["citroen-c3-novo", "Citroën C3 / C3 Aircross 1.0 / 1.6 / Turbo", "COMBUSTION", 14.5, 47, 0, 0, 0, 16, "Hatch"],
    ["honda-fit", "Honda Fit / WR-V 1.4 / 1.5 i-VTEC", "COMBUSTION", 14.8, 45, 0, 0, 0, 16, "Hatch"],
    ["toyota-etios", "Toyota Etios Hatch/Sedan 1.3 / 1.5", "COMBUSTION", 15.0, 45, 0, 0, 0, 15, "Hatch"],
    ["toyota-yaris", "Toyota Yaris Hatch/Sedan 1.5", "COMBUSTION", 14.5, 45, 0, 0, 0, 16, "Hatch"],
    ["ford-ka-novo", "Ford Ka / Ka Sedan 1.0 / 1.5 3cc", "COMBUSTION", 15.2, 51, 0, 0, 0, 15, "Hatch"],
    ["ford-focus", "Ford Focus 1.6 / 2.0 Duratec", "COMBUSTION", 12.8, 55, 0, 0, 0, 18, "Hatch"],
    ["nissan-march", "Nissan March 1.0 / 1.6", "COMBUSTION", 15.2, 41, 0, 0, 0, 15, "Hatch"],
    ["mini-cooper", "MINI Cooper 1.5 Turbo / 2.0 S", "COMBUSTION", 13.8, 44, 0, 0, 0, 17, "Hatch"],

    // === SEDANS MÉDIOS & EXECUTIVOS ===
    ["vw-virtus", "VW Virtus 170 TSI / 200 TSI / 250 TSI", "COMBUSTION", 15.2, 52, 0, 0, 0, 16, "Sedan"],
    ["vw-jetta-14", "VW Jetta 1.4 TSI / 2.0 Aspirado", "COMBUSTION", 14.4, 55, 0, 0, 0, 17, "Sedan"],
    ["vw-jetta-gli", "VW Jetta GLI / Passat 2.0 TSI", "COMBUSTION", 12.5, 50, 0, 0, 0, 18, "Sedan"],
    ["toyota-corolla-20", "Toyota Corolla XEi / Altis 2.0 Dynamic Force", "COMBUSTION", 14.5, 50, 0, 0, 0, 17, "Sedan"],
    ["toyota-camry", "Toyota Camry 3.5 V6 / Hybrid", "HEV", 15.5, 60, 0, 1.6, 0, 18, "Sedan"],
    ["honda-city", "Honda City / City Hatch 1.5", "COMBUSTION", 15.4, 44, 0, 0, 0, 16, "Sedan"],
    ["honda-civic-g8-g10", "Honda Civic 1.8 / 2.0 / 1.5 Turbo (2007–2021)", "COMBUSTION", 13.6, 56, 0, 0, 0, 17, "Sedan"],
    ["nissan-versa", "Nissan Versa 1.6 Advance / Exclusive", "COMBUSTION", 15.0, 41, 0, 0, 0, 16, "Sedan"],
    ["nissan-sentra", "Nissan Sentra 2.0 Exclusive", "COMBUSTION", 14.4, 47, 0, 0, 0, 17, "Sedan"],
    ["ford-fusion", "Ford Fusion 2.5 / 2.0 EcoBoost Titanium", "COMBUSTION", 11.8, 62, 0, 0, 0, 19, "Sedan"],
    ["ford-fusion-hybrid", "Ford Fusion Hybrid 2.0", "HEV", 16.5, 53, 0, 1.4, 0, 17, "Sedan"],
    ["hyundai-elantra-azera", "Hyundai Elantra / Azera V6", "COMBUSTION", 12.2, 65, 0, 0, 0, 19, "Sedan"],
    ["kia-cerato", "Kia Cerato 1.6 / 2.0", "COMBUSTION", 13.5, 50, 0, 0, 0, 17, "Sedan"],
    ["bmw-320i", "BMW 320i 2.0 TwinPower Turbo", "COMBUSTION", 13.8, 59, 0, 0, 0, 18, "Sedan"],
    ["bmw-330e", "BMW 330e M Sport PHEV", "PHEV", 14.5, 40, 48, 12.0, 9.6, 19, "Sedan"],
    ["mercedes-c180-c200", "Mercedes-Benz C180 / C200 / A200", "COMBUSTION", 13.8, 66, 0, 0, 0, 18, "Sedan"],
    ["audi-a3-a4", "Audi A3 / A4 / A5 1.4 / 2.0 TFSI", "COMBUSTION", 13.5, 54, 0, 0, 0, 18, "Sedan"],

    // === SUVs & CROSSOVERS ===
    ["vw-nivus", "VW Nivus 200 TSI Comfortline / Highline", "COMBUSTION", 14.8, 52, 0, 0, 0, 17, "SUV"],
    ["vw-tera", "VW Tera 1.0 TSI", "COMBUSTION", 14.8, 50, 0, 0, 0, 17, "SUV"],
    ["vw-tcross", "VW T-Cross 200 TSI / Highline 250 TSI", "COMBUSTION", 14.0, 52, 0, 0, 0, 18, "SUV"],
    ["vw-taos", "VW Taos 250 TSI Comfortline / Highline", "COMBUSTION", 13.2, 51, 0, 0, 0, 19, "SUV"],
    ["vw-tiguan", "VW Tiguan Allspace 2.0 / 1.4 TSI", "COMBUSTION", 11.8, 60, 0, 0, 0, 20, "SUV"],
    ["fiat-pulse", "Fiat Pulse 1.3 / Turbo 200 / Abarth", "COMBUSTION", 14.4, 47, 0, 0, 0, 17, "SUV"],
    ["fiat-fastback", "Fiat Fastback Turbo 200 / 270 / Hybrid", "COMBUSTION", 14.2, 47, 0, 0, 0, 17, "SUV"],
    ["jeep-renegade", "Jeep Renegade 1.3 T270 / 1.8 / Diesel", "COMBUSTION", 12.8, 55, 0, 0, 0, 19, "SUV"],
    ["jeep-compass-t270", "Jeep Compass T270 1.3 Turbo / 2.0 Diesel", "COMBUSTION", 12.6, 55, 0, 0, 0, 19, "SUV"],
    ["jeep-compass-4xe", "Jeep Compass 4xe PHEV", "PHEV", 13.8, 36.5, 44, 11.4, 9.2, 20, "SUV"],
    ["jeep-commander", "Jeep Commander 1.3 T270 / Diesel TD380", "COMBUSTION", 12.0, 61, 0, 0, 0, 21, "SUV"],
    ["jeep-wrangler-gcherokee", "Jeep Wrangler / Grand Cherokee V6 / 2.0T", "COMBUSTION", 9.0, 81, 0, 0, 0, 24, "SUV"],
    ["gm-tracker", "Chevrolet Tracker 1.0 / 1.2 Turbo", "COMBUSTION", 13.8, 44, 0, 0, 0, 17, "SUV"],
    ["gm-spin", "Chevrolet Spin 1.8 Flex (5 ou 7 lugares)", "COMBUSTION", 12.8, 53, 0, 0, 0, 18, "Minivan/SUV"],
    ["gm-equinox-turbo", "Chevrolet Equinox 1.5 / 2.0 Turbo", "COMBUSTION", 11.8, 56, 0, 0, 0, 20, "SUV"],
    ["gm-trailblazer", "Chevrolet Trailblazer 2.8 Diesel 4x4", "COMBUSTION", 11.0, 76, 0, 0, 0, 24, "SUV"],
    ["hyundai-creta", "Hyundai Creta 1.0 TGDI / 1.6 / 2.0", "COMBUSTION", 13.8, 50, 0, 0, 0, 18, "SUV"],
    ["hyundai-tucson-ix35", "Hyundai ix35 / New Tucson 2.0 / 1.6T", "COMBUSTION", 12.2, 58, 0, 0, 0, 19, "SUV"],
    ["hyundai-santafe", "Hyundai Santa Fe V6 / 2.4", "COMBUSTION", 10.2, 64, 0, 0, 0, 22, "SUV"],
    ["honda-hrv", "Honda HR-V 1.5 / 1.8 / Touring Turbo", "COMBUSTION", 13.9, 50, 0, 0, 0, 18, "SUV"],
    ["honda-zrv", "Honda ZR-V Touring 2.0", "COMBUSTION", 13.0, 53, 0, 0, 0, 18, "SUV"],
    ["toyota-ccross-20", "Toyota Corolla Cross 2.0 Flex", "COMBUSTION", 13.5, 47, 0, 0, 0, 18, "SUV"],
    ["toyota-sw4", "Toyota Hilux SW4 2.8 Diesel / Flex", "COMBUSTION", 11.0, 80, 0, 0, 0, 25, "SUV"],
    ["nissan-kicks", "Nissan Kicks 1.6 Play / Active / Advance", "COMBUSTION", 14.0, 41, 0, 0, 0, 17, "SUV"],
    ["renault-kardian", "Renault Kardian 1.0 TCe Turbo", "COMBUSTION", 14.4, 50, 0, 0, 0, 17, "SUV"],
    ["renault-duster-captur", "Renault Duster / Captur 1.6 / 1.3 Turbo", "COMBUSTION", 13.0, 46, 0, 0, 0, 19, "SUV"],
    ["peugeot-2008-3008", "Peugeot 2008 / 3008 / 5008 1.6 THP / Turbo", "COMBUSTION", 13.5, 47, 0, 0, 0, 18, "SUV"],
    ["ford-ecosport", "Ford EcoSport 1.5 / 1.6 / 2.0", "COMBUSTION", 13.0, 52, 0, 0, 0, 18, "SUV"],
    ["ford-territory", "Ford Territory 1.5 EcoBoost", "COMBUSTION", 12.2, 60, 0, 0, 0, 19, "SUV"],
    ["ford-bronco", "Ford Bronco Sport 2.0 EcoBoost 4x4", "COMBUSTION", 11.2, 64, 0, 0, 0, 21, "SUV"],
    ["chery-tiggo-5x", "Caoa Chery Tiggo 5X Pro / Sport", "COMBUSTION", 12.8, 51, 0, 0, 0, 18, "SUV"],
    ["chery-tiggo-7", "Caoa Chery Tiggo 7 Sport / Pro", "COMBUSTION", 12.8, 51, 0, 0, 0, 19, "SUV"],
    ["chery-tiggo-8", "Caoa Chery Tiggo 8 1.6 TGDI / Pro", "COMBUSTION", 12.2, 51, 0, 0, 0, 20, "SUV"],
    ["mitsubishi-asx-eclipse", "Mitsubishi ASX / Outlander Sport / Eclipse Cross", "COMBUSTION", 12.2, 60, 0, 0, 0, 19, "SUV"],
    ["mitsubishi-pajero", "Mitsubishi Pajero TR4 / Dakar / Sport Diesel", "COMBUSTION", 10.5, 70, 0, 0, 0, 24, "SUV"],
    ["suzuki-jimny-vitara", "Suzuki Jimny / Vitara / S-Cross", "COMBUSTION", 13.2, 43, 0, 0, 0, 17, "SUV"],
    ["subaru-forester-xv", "Subaru Forester / XV / Outback AWD", "COMBUSTION", 11.8, 63, 0, 0, 0, 20, "SUV"],
    ["bmw-x1-x3", "BMW X1 / X2 / X3 / X4", "COMBUSTION", 12.8, 54, 0, 0, 0, 19, "SUV"],
    ["bmw-x5-50e", "BMW X5 xDrive50e PHEV", "PHEV", 11.2, 69, 79, 25.7, 20.5, 25, "SUV"],
    ["mercedes-gla-glb", "Mercedes-Benz GLA / GLB / GLC", "COMBUSTION", 13.2, 43, 0, 0, 0, 19, "SUV"],
    ["audi-q3-q5", "Audi Q3 / Q5 / Q7", "COMBUSTION", 12.0, 60, 0, 0, 0, 20, "SUV"],
    ["landrover-evoque-disc", "Land Rover Evoque / Discovery Sport / Defender", "COMBUSTION", 11.0, 67, 0, 0, 0, 22, "SUV"],
    ["porsche-macan-cayenne", "Porsche Macan / Cayenne", "COMBUSTION", 10.2, 75, 0, 0, 0, 24, "SUV"],

    // === PICAPES (FLEX & DIESEL) ===
    ["fiat-strada", "Fiat Strada 1.3 / 1.0 Turbo", "COMBUSTION", 14.2, 55, 0, 0, 0, 17, "Picape"],
    ["fiat-toro-flex", "Fiat Toro T270 1.3 Turbo Flex", "COMBUSTION", 11.8, 55, 0, 0, 0, 20, "Picape"],
    ["fiat-toro-diesel", "Fiat Toro 2.0 / 2.2 Turbodiesel 4x4", "COMBUSTION", 13.4, 60, 0, 0, 0, 22, "Picape"],
    ["vw-saveiro", "VW Saveiro 1.6 MSI", "COMBUSTION", 13.5, 55, 0, 0, 0, 17, "Picape"],
    ["vw-amarok", "VW Amarok 2.0 TDI / V6 3.0", "COMBUSTION", 10.8, 80, 0, 0, 0, 24, "Picape"],
    ["gm-montana", "Chevrolet Montana 1.2 Turbo / 1.4", "COMBUSTION", 13.5, 44, 0, 0, 0, 18, "Picape"],
    ["gm-s10-diesel", "Chevrolet S10 2.8 Turbodiesel 4x4", "COMBUSTION", 11.4, 76, 0, 0, 0, 25, "Picape"],
    ["toyota-hilux-diesel", "Toyota Hilux 2.8 Turbodiesel 4x4", "COMBUSTION", 11.2, 80, 0, 0, 0, 25, "Picape"],
    ["ford-ranger", "Ford Ranger 2.0 / V6 3.0 / 3.2 Diesel", "COMBUSTION", 10.8, 80, 0, 0, 0, 25, "Picape"],
    ["ford-maverick-picape", "Ford Maverick Lariat / Tremor / Hybrid", "COMBUSTION", 12.2, 64, 0, 0, 0, 20, "Picape"],
    ["mitsubishi-l200", "Mitsubishi L200 Triton 2.4 Diesel 4x4", "COMBUSTION", 11.4, 75, 0, 0, 0, 24, "Picape"],
    ["nissan-frontier", "Nissan Frontier 2.3 Biturbo Diesel 4x4", "COMBUSTION", 11.0, 73, 0, 0, 0, 24, "Picape"],
    ["ram-rampage", "Ram Rampage 2.0 Hurricane4 / Diesel", "COMBUSTION", 10.8, 55, 0, 0, 0, 24, "Picape"],
    ["ram-1500-2500", "Ram 1500 V8/Hurricane6 / 2500/3500 Cummins", "COMBUSTION", 7.2, 98, 0, 0, 0, 30, "Picape"],
    ["renault-oroch", "Renault Oroch 1.6 / 1.3 Turbo", "COMBUSTION", 12.8, 50, 0, 0, 0, 18, "Picape"],

    // === HÍBRIDOS CONVENCIONAIS (HEV) ===
    ["toyota-corolla-hev", "Toyota Corolla Altis Hybrid", "HEV", 18.0, 43, 0, 1.3, 0, 16, "Híbrido HEV"],
    ["toyota-ccross-hev", "Toyota Corolla Cross Hybrid", "HEV", 16.8, 36, 0, 1.3, 0, 17, "Híbrido HEV"],
    ["toyota-rav4-hev", "Toyota RAV4 SX Hybrid", "HEV", 15.8, 55, 0, 1.6, 0, 19, "Híbrido HEV"],
    ["toyota-prius", "Toyota Prius Hybrid", "HEV", 19.5, 43, 0, 1.3, 0, 15, "Híbrido HEV"],
    ["gwm-h6-hev", "GWM Haval H6 HEV2", "HEV", 14.5, 55, 0, 1.6, 0, 19, "Híbrido HEV"],
    ["honda-civic-hev", "Honda Civic e:HEV Híbrido", "HEV", 18.5, 40, 0, 1.05, 0, 16, "Híbrido HEV"],
    ["honda-crv-hev", "Honda CR-V Advanced Hybrid", "HEV", 15.4, 53, 0, 1.06, 0, 19, "Híbrido HEV"],
    ["hyundai-kona-hev", "Hyundai Kona Hybrid", "HEV", 19.0, 38, 0, 1.56, 0, 16, "Híbrido HEV"],
    ["kia-niro-hev", "Kia Niro Hybrid", "HEV", 19.2, 42, 0, 1.32, 0, 16, "Híbrido HEV"],
    ["kia-sportage-hev", "Kia Sportage / Sorento Hybrid", "HEV", 14.5, 54, 0, 1.5, 0, 19, "Híbrido HEV"],
    ["chery-tiggo-5x-hev", "Caoa Chery Tiggo 5X / 7 Pro Hybrid", "HEV", 13.8, 51, 0, 0.5, 0, 18, "Híbrido HEV"],
    ["lexus-ux-nx-rx", "Lexus UX 250h / NX 350h / RX 500h", "HEV", 16.2, 55, 0, 1.6, 0, 18, "Híbrido HEV"],

    // === HÍBRIDOS PLUG-IN (PHEV) ===
    ["byd-song-plus-24", "BYD Song Plus DM-i 23/24", "PHEV", 16.0, 57, 30, 8.3, 6.5, 18, "Plug-in PHEV"],
    ["byd-song-plus-25", "BYD Song Plus DM-i 25/26 (18.3 kWh)", "PHEV", 16.5, 60, 68, 18.3, 14.5, 18, "Plug-in PHEV"],
    ["byd-song-pro-gl", "BYD Song Pro DM-i GL (12.9 kWh)", "PHEV", 16.2, 52, 49, 12.9, 10.2, 18, "Plug-in PHEV"],
    ["byd-song-pro-gs", "BYD Song Pro DM-i GS (18.3 kWh)", "PHEV", 16.2, 52, 68, 18.3, 14.5, 18, "Plug-in PHEV"],
    ["byd-king-gl", "BYD King DM-i GL / GS", "PHEV", 18.5, 48, 80, 18.3, 14.5, 16, "Plug-in PHEV"],
    ["byd-shark", "BYD Shark PHEV", "PHEV", 10.5, 60, 57, 29.6, 23.5, 26, "Plug-in PHEV"],
    ["gwm-h6-phev19", "GWM Haval H6 PHEV19", "PHEV", 15.0, 55, 74, 19.0, 15.2, 19, "Plug-in PHEV"],
    ["gwm-h6-phev34", "GWM Haval H6 PHEV34 / GT AWD", "PHEV", 14.0, 55, 113, 34.0, 27.0, 21, "Plug-in PHEV"],
    ["toyota-rav4-phev", "Toyota RAV4 Plug-in Hybrid", "PHEV", 15.5, 55, 55, 18.1, 14.5, 19, "Plug-in PHEV"],
    ["chery-tiggo-8-phev", "Caoa Chery Tiggo 8 Pro PHEV", "PHEV", 14.0, 60, 54, 19.3, 15.5, 20, "Plug-in PHEV"],
    ["volvo-xc60-t8", "Volvo XC60 / XC90 T8 Recharge PHEV", "PHEV", 12.5, 71, 55, 18.8, 15.0, 22, "Plug-in PHEV"],
    ["audi-q5-phev", "Audi Q5 TFSIe Quattro PHEV", "PHEV", 13.0, 54, 45, 17.9, 14.3, 22, "Plug-in PHEV"],
    ["porsche-cayenne-eh", "Porsche Cayenne / Panamera E-Hybrid", "PHEV", 10.5, 75, 66, 25.9, 20.7, 26, "Plug-in PHEV"],

    // === 100% ELÉTRICOS (BEV) ===
    ["byd-dolphin-mini", "BYD Dolphin Mini (38 kWh)", "BEV", 0, 0, 280, 38.0, 30.0, 13.5, "Elétrico BEV"],
    ["byd-dolphin", "BYD Dolphin GS (44.9 kWh)", "BEV", 0, 0, 291, 44.9, 36.0, 15.4, "Elétrico BEV"],
    ["byd-dolphin-plus", "BYD Dolphin Plus (60.5 kWh)", "BEV", 0, 0, 330, 60.5, 48.0, 17.5, "Elétrico BEV"],
    ["byd-yuan-plus", "BYD Yuan Plus / Pro", "BEV", 0, 0, 294, 60.5, 48.0, 18.5, "Elétrico BEV"],
    ["byd-seal", "BYD Seal AWD (82.5 kWh)", "BEV", 0, 0, 372, 82.5, 66.0, 19.2, "Elétrico BEV"],
    ["gwm-ora-skin", "GWM Ora 03 Skin / GT", "BEV", 0, 0, 232, 48.0, 38.0, 17.0, "Elétrico BEV"],
    ["renault-kwid-etech", "Renault Kwid E-Tech (26.8 kWh)", "BEV", 0, 0, 185, 26.8, 21.5, 13.0, "Elétrico BEV"],
    ["renault-megane-ev", "Renault Megane E-Tech (60 kWh)", "BEV", 0, 0, 337, 60.0, 48.0, 16.8, "Elétrico BEV"],
    ["volvo-ex30", "Volvo EX30 / XC40 / EX40 Electric", "BEV", 0, 0, 338, 69.0, 55.0, 18.0, "Elétrico BEV"],
    ["gm-equinox-ev", "Chevrolet Equinox EV / Blazer EV", "BEV", 0, 0, 443, 85.0, 68.0, 19.0, "Elétrico BEV"],
    ["hyundai-kona-ev", "Hyundai Kona EV / Ioniq 5", "BEV", 0, 0, 360, 64.8, 52.0, 16.5, "Elétrico BEV"],
    ["kia-ev5", "Kia EV5 / EV6 / EV9", "BEV", 0, 0, 400, 88.0, 70.0, 19.5, "Elétrico BEV"],
    ["vw-id4", "VW ID.4 / ID.Buzz", "BEV", 0, 0, 370, 77.0, 61.0, 19.0, "Elétrico BEV"],
    ["tesla-model-3-y", "Tesla Model 3 / Model Y Long Range", "BEV", 0, 0, 480, 75.0, 60.0, 15.0, "Elétrico BEV"],
    ["porsche-taycan", "Porsche Taycan / Audi Q8 e-tron", "BEV", 0, 0, 410, 93.0, 74.0, 22.0, "Elétrico BEV"]
  ];

  const CATALOG = RAW.map(([id, name, powertrain, hevKmL, tank, evRange, battery, kwhPerCharge, bevKwhPer100, category]) => ({
    id, name, powertrain, hevKmL, tank, evRange, battery, kwhPerCharge, bevKwhPer100, category
  }));

  function norm(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function search(query, limit = 18) {
    const q = norm(query);
    if (!q) return CATALOG.slice(0, limit);
    const terms = q.split(/\s+/).filter(Boolean);
    return CATALOG
      .map(v => {
        const hay = norm(`${v.name} ${v.powertrain} ${v.category || ""}`);
        if (!terms.every(t => hay.includes(t))) return null;
        const score = hay.startsWith(q) ? 4 : (norm(v.name).includes(q) ? 3 : 1);
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
    return search(name, 1)[0] || null;
  }

  window.FeriasVehicles = {
    CATALOG,
    search,
    findExactOrBest
  };
})();
