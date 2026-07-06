FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod=false

FROM deps AS build
COPY . .
RUN pnpm exec prisma generate

FROM node:20-alpine AS run
WORKDIR /app
RUN corepack enable
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/server.js"]
