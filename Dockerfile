# syntax=docker/dockerfile:1
#
# Multi-stage build for Lightreach (pnpm workspaces + Turborepo + Next.js 16 standalone).
#
# Stages:
#   base    - Debian-slim + pnpm
#   deps    - install workspace dependencies (cached while lockfile is unchanged)
#   build   - full source + `pnpm build` (turbo -> next build w/ output: "standalone")
#   runner  - slim runtime image: only the standalone server output, no build tools

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

# --- runtime image -----------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Drizzle SQL migrations for PostgreSQL self-initialization
COPY --from=build --chown=nextjs:nodejs /app/packages/db/drizzle ./drizzle
ENV DRIZZLE_DIR=/app/drizzle

RUN chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
