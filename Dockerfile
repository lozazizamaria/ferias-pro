FROM node:20-alpine

WORKDIR /app

# Zero dependências externas NPM: basta copiar o código da aplicação
COPY package.json ./
COPY server ./server
COPY app ./app

RUN mkdir -p /app/data

EXPOSE 3080

ENV NODE_ENV=production
ENV PORT=3080
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

VOLUME ["/app/data"]

CMD ["node", "server/server.js"]
