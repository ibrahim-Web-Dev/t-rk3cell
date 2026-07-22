# Build context is the monorepo root (see docker-compose.yml).
FROM node:20-alpine

WORKDIR /repo
COPY . .

RUN npm install --no-audit --no-fund \
 && npm run build --workspace=@campaigncell/gateway

WORKDIR /repo/gateway
EXPOSE 3000

CMD ["node", "dist/main.js"]
