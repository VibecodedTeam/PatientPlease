# Build context is the repo root (pnpm workspace) — see docker-compose.yml.
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY src/backend/package.json ./src/backend/package.json
RUN pnpm install --frozen-lockfile --filter backend

FROM deps AS build
COPY src/backend ./src/backend
# prisma.config.ts requires DATABASE_URL to be set to load at all; `generate` never
# connects to it, so a placeholder is enough (override via --build-arg if needed).
ARG DATABASE_URL="postgresql://user:password@localhost:5432/db"
ENV DATABASE_URL=$DATABASE_URL
RUN pnpm --filter backend exec prisma generate
RUN pnpm --filter backend build

FROM base AS prod-deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY src/backend/package.json ./src/backend/package.json
RUN pnpm install --frozen-lockfile --filter backend --prod

FROM node:22-alpine AS run
WORKDIR /app/src/backend
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/src/backend/node_modules ./node_modules
COPY --from=build /app/node_modules/.pnpm/*/node_modules/.prisma /app/node_modules/.prisma
RUN target="$(dirname "$(dirname "$(readlink -f node_modules/@prisma/client)")")" \
  && cp -R /app/node_modules/.prisma "$target/.prisma"
COPY --from=build /app/src/backend/dist ./dist
COPY src/backend/package.json ./
COPY src/backend/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/server.js"]
