# Build context is the monorepo root (see docker-compose.yml).
FROM node:20-alpine

# Prisma engine binaries need a real OpenSSL runtime on Alpine (musl) - without
# it, `prisma migrate deploy`/generate fail with an opaque engine-response error.
RUN apk add --no-cache openssl

WORKDIR /repo
COPY . .

RUN npm install --no-audit --no-fund \
 && npm run build --workspace=packages/shared-types \
 && npm run build --workspace=packages/event-bus \
 && npm run build --workspace=packages/auth-kit \
 && npm run build --workspace=packages/common-kit \
 && npx prisma generate --schema=services/gamification-service/prisma/schema.prisma \
 && npm run build --workspace=@campaigncell/gamification-service \
 && cp -r services/gamification-service/src/generated services/gamification-service/dist/generated

WORKDIR /repo/services/gamification-service
EXPOSE 3004

CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/main.js"]
