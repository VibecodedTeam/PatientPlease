FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY src/backend/package.json src/backend/package.json
COPY src/frontend/package.json src/frontend/package.json
RUN pnpm install --frozen-lockfile --prod=false

FROM deps AS build
COPY src/backend src/backend

FROM node:20-alpine AS run
WORKDIR /app/src/backend
RUN corepack enable
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/server.js"]
