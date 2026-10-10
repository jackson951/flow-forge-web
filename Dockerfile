# FlowForge web (Part 14): build with Node 22, serve the static build with unprivileged nginx.
# The final image holds only nginx + dist/ — no Node, no source, no .env, no build-time secrets.

FROM node:25-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Same origin as the API (nginx proxies /api/), so the base URL is a path, never a host.
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
# Runs as the image's non-root "nginx" user (uid 101) on port 8080.
COPY --chown=101:101 nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --chown=101:101 --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
