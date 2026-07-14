FROM node:20-bookworm-slim AS base

WORKDIR /workspace
ENV NODE_ENV=development

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl procps \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.json prisma.config.ts ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY prisma/schema.prisma prisma/schema.prisma

RUN npm ci
RUN npm run prisma:generate

COPY apps/api apps/api
COPY packages/shared packages/shared
COPY prisma prisma

FROM base AS development

EXPOSE 3001 4000
CMD ["npm", "run", "dev:api"]

FROM base AS builder

RUN npm run build:shared && npm run build:api

FROM node:20-bookworm-slim AS production

WORKDIR /workspace
ENV NODE_ENV=production

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl procps \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json prisma.config.ts ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY prisma/schema.prisma prisma/schema.prisma
RUN npm ci --omit=dev --workspace @bid/api --workspace @bid/shared
RUN npm run prisma:generate

COPY --from=builder /workspace/apps/api/dist apps/api/dist
COPY --from=builder /workspace/packages/shared/dist packages/shared/dist
COPY --from=builder /workspace/prisma prisma

EXPOSE 4000
CMD ["npm", "run", "start:api"]
