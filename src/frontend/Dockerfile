FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY src/backend/package.json src/backend/package.json
COPY src/frontend/package.json src/frontend/package.json
RUN pnpm install --frozen-lockfile --prod=false

FROM deps AS build
COPY src/frontend src/frontend
RUN pnpm --filter frontend build

FROM node:20-alpine AS run
WORKDIR /app/src/frontend
RUN corepack enable
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 4173
CMD ["pnpm", "start", "--", "--host", "0.0.0.0", "--port", "4173"]
