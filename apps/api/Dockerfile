FROM node:20-bookworm-slim AS base

WORKDIR /workspace
ENV NODE_ENV=development

COPY package.json package-lock.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY prisma/schema.prisma prisma/schema.prisma

RUN npm ci

COPY apps/api apps/api
COPY packages/shared packages/shared
COPY prisma prisma

FROM base AS development

EXPOSE 4000
CMD ["npm", "run", "dev:api"]

FROM base AS builder

RUN npm run build:shared && npm run build:api

FROM node:20-bookworm-slim AS production

WORKDIR /workspace
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY prisma/schema.prisma prisma/schema.prisma
RUN npm ci --omit=dev --workspace @bid/api --workspace @bid/shared

COPY --from=builder /workspace/apps/api/dist apps/api/dist
COPY --from=builder /workspace/packages/shared/dist packages/shared/dist
COPY --from=builder /workspace/prisma prisma

EXPOSE 4000
CMD ["npm", "run", "start:api"]
