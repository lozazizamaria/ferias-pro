# Férias Pro

Planejador inteligente de viagens e férias com cronograma Gantt interativo, cálculo automático de rotas, paradas e pedágios via **Google Maps Platform**, parâmetros completos do veículo e dashboard financeiro em tempo real.

## Principais recursos

- **Cronograma Gantt & Linha do Tempo (1ª aba padrão)**:
  - Visualização clara com cabeçalho de meses/dias, destaque para fins de semana e data atual.
  - Resumos de alto contraste exibidos ao lado direito de cada barra/evento no calendário.
  - Arraste barras para ajustar datas ou redimensione períodos diretamente no gráfico.
  - Alternância entre visualização **Gantt** e **Linha do Tempo** responsiva para celular e computador.
- **Automação com Google Maps Platform**:
  - Ao editar Origem e Destino em qualquer viagem, calcula automaticamente **distância (km)**, **tempo de direção**, **pedágios oficiais** e exibe prévia do trajeto no mapa interativo.
  - Autocomplete de endereços e cidades (`Places API New`).
  - Regra automática de paradas: **1 parada a cada 4 horas** de viagem com **1 hora** por parada (configurável na aba Parâmetros).
- **Dashboard & Tabela 100% reativos**:
  - Qualquer alteração no Cronograma, Tabela ou Parâmetros recalcula automaticamente todos os KPIs, custos de combustível, recargas EV, pedágios, orçamento por viajante e cenários.
- **Aba Parâmetros completa**:
  - Modelo do carro, motorização (PHEV, HEV, Combustão ou 100% Elétrico BEV), consumo, autonomia elétrica, tanque, bateria, tarifas, tag de pedágio (Sem Parar, Veloe, ConectCar, Taggy, Move Mais), orçamento de hospedagem/alimentação, viajantes e simulação de cenários.
- **Modo Dia / Noite + Mobile-first**:
  - Botão Dia / Noite sempre visível no topo e layout totalmente adaptativo para celular e desktop.
- **Exportação e Backup**:
  - Exportação/importação `.xlsx` (Excel), backup/restauração `.json` e modo de impressão/PDF.

## Como usar

1. Sirva a pasta `app/` (ou a raiz do repositório) via HTTP local ou GitHub Pages, ou abra `app/index.html`.
2. Para ativar cálculo automático de rotas, pedágios e autocomplete em tempo real:
   - Acesse a aba **⚙️ Parâmetros** (ou o aviso dentro do modal de viagem) e cole sua **Google Maps API Key** (ou gere uma [Demo Key gratuita](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentskills_v1)).
   - A chave é salva apenas no `localStorage` do seu navegador (nunca no repositório).
   - Opcionalmente, copie `app/config.example.js` para `app/config.local.js` (arquivo ignorado pelo Git).
