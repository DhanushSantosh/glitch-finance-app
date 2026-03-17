FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
# Install all deps (including dev) needed for the build
RUN pnpm install --filter @glitch/api... --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @glitch/api build

FROM node:22-alpine AS runtime
WORKDIR /app
# Patch OS-level packages (zlib CVE-2026-22184 etc.) and upgrade npm for patched tar
RUN apk upgrade --no-cache && \
    npm install -g npm@latest && \
    addgroup -S glitch && adduser -S glitch -G glitch
ENV NODE_ENV=production

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

# Re-install production-only deps — keeps drizzle-kit and other devDeps out of the image
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN corepack enable && \
    pnpm install --filter @glitch/api --frozen-lockfile --prod && \
    # Remove corepack cache to eliminate bundled tar/minimatch CVEs from the image
    rm -rf /root/.cache/node/corepack

USER glitch
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
