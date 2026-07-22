# Build context is the monorepo root (see docker-compose.yml) so this stage
# can reach the @campaigncell/shared-types workspace package.
FROM node:20-alpine AS builder
WORKDIR /repo
COPY . .

# Vite inlines VITE_* vars into the JS bundle at build time.
ARG VITE_API_BASE_URL
ARG VITE_GAMIFICATION_WS_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GAMIFICATION_WS_URL=$VITE_GAMIFICATION_WS_URL

RUN npm install --no-audit --no-fund \
 && npm run build --workspace=packages/shared-types \
 && npm run build --workspace=@campaigncell/frontend

FROM nginx:1.27-alpine
COPY --from=builder /repo/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
