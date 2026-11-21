# Férias Pro

Planejador inteligente de viagens e férias com cronograma Gantt interativo, cálculo automático de rotas, paradas e pedágios via **Google Maps Platform**, parâmetros completos do veículo, dashboard financeiro e **sincronização automática em nuvem na sua VPS**.

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
- **Sincronização automática PC ⇄ Celular (VPS)**:
  - Servidor leve em Node.js puro (`server/server.js`, sem dependências externas) que persiste as alterações no servidor atrás do Nginx (`/api/state`) protegido por **PIN/Token**, sincronizando automaticamente entre computador e celular.
- **Dashboard & Tabela 100% reativos**:
  - Qualquer alteração no Cronograma, Tabela ou Parâmetros recalcula automaticamente todos os KPIs, custos de combustível, recargas EV, pedágios, orçamento por viajante e cenários.
- **Aba Parâmetros completa & Modo Dia / Noite**:
  - Motorização (`PHEV`, `HEV`, `Combustão`, `BEV`), consumo, autonomia elétrica, tanque, bateria, tag de pedágio (`Sem Parar`, `Veloe`, `ConectCar`, `Taggy`, `Move Mais`), viajantes, orçamento extra e cenários.
  - Botão **Dia / Noite** sempre visível e layout responsivo para celular e desktop.

## Executar com Sincronização na VPS (Ubuntu + Nginx)

1. Execute o servidor de sincronização (`server/server.js`) na porta local `3080` com `SYNC_TOKEN` definido em `/etc/ferias-pro.env` e `DATA_FILE=/var/lib/ferias-pro/state.json` via `systemd`.
2. Configure o Nginx para servir `/var/www/ferias-pro/app` na raiz `/` e redirecionar `/api/` para `http://127.0.0.1:3080`.
3. No navegador (PC e celular), clique no botão **PIN necessário** no topo (ou na aba **⚙️ Parâmetros ➔ Sincronização na Nuvem**) e informe o mesmo PIN configurado na VPS.
