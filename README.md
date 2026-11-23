# My Plan

Planejador inteligente Pessoal e Profissional (Quadro Trello, Gantt avançado em Tela Cheia, Fluxo de Caixa, cálculo automático de rotas, paradas e pedágios via **Google Maps Platform**, IA Gemini multimodal, Google Agenda, Carteira do Google e **sincronização automática em nuvem na sua VPS**).

## Principais recursos

- **Modo Profissional & Pessoal (Trello + Cronograma Gantt & Linha do Tempo)**:
  - Visualização clara com cabeçalho de meses/dias/semanas ISO, destaque para fins de semana e data atual.
  - Resumos de alto contraste exibidos ao lado direito de cada barra/evento no calendário.
  - Arraste barras para ajustar datas ou redimensione períodos diretamente no gráfico.
  - Alternância entre visualização **Quadro Kanban**, **Gantt** e **Linha do Tempo** responsiva para celular e computador.
- **Automação com Google Maps Platform**:
  - Ao editar Origem e Destino em qualquer viagem, calcula automaticamente **distância (km)**, **tempo de direção**, **pedágios oficiais** e exibe prévia do trajeto no mapa interativo.
  - Autocomplete de endereços e cidades (`Places API New`).
  - Regra automática de paradas: **1 parada a cada 4 horas** de viagem com **1 hora** por parada (configurável na aba Parâmetros).
- **Sincronização automática PC ⇄ Celular (VPS)**:
  - Servidor leve em Node.js puro (`server/server.js`, sem dependências externas) que persiste as alterações no servidor atrás do Nginx (`https://myplan.digitalinpulse.com.br`), sincronizando automaticamente entre computador e celular.
- **Dashboard & Tabela 100% reativos**:
  - Qualquer alteração no Cronograma, Tabela ou Parâmetros recalcula automaticamente todos os KPIs, custos de combustível, recargas EV, pedágios, orçamento por viajante e cenários.
- **Aba Parâmetros completa & Modo Dia / Noite**:
  - Motorização (`PHEV`, `HEV`, `Combustão`, `BEV`), consumo, autonomia elétrica, tanque, bateria, tag de pedágio (`Sem Parar`, `Veloe`, `ConectCar`, `Taggy`, `Move Mais`), viajantes, orçamento extra e cenários.
  - Botão **Dia / Noite** sempre visível e layout responsivo para celular e desktop.

## Executar com Sincronização na VPS (Ubuntu + Nginx)

1. Execute o servidor (`server/server.js`) em `/var/www/MyPlan` na porta local `3080` via `systemd` (`myplan.service`).
2. Configure o Nginx (`nginx.conf`) para responder em `myplan.digitalinpulse.com.br` com proxy reverso para `http://127.0.0.1:3080`.
