FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @glitch/api... --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @glitch/api build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN addgroup -S glitch && adduser -S glitch -G glitch
ENV NODE_ENV=production

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

USER glitch
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]

