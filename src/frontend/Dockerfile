FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY src/backend/package.json src/backend/package.json
COPY src/frontend/package.json src/frontend/package.json
RUN pnpm install --frozen-lockfile --prod=false

FROM deps AS build
COPY src/frontend src/frontend
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN pnpm --filter frontend build

FROM node:22-alpine AS run
WORKDIR /app/src/frontend
# Pin and activate pnpm at build time so the container never needs network access
# at startup — corepack otherwise re-fetches the packageManager version on every run.
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 4173
CMD ["pnpm", "start", "--host", "0.0.0.0", "--port", "4173"]
