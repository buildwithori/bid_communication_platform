FROM node:20-bookworm-slim AS base

WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY apps/web apps/web
COPY packages/shared packages/shared

FROM base AS development

EXPOSE 3000
CMD ["npm", "--workspace", "@bid/web", "run", "dev", "--", "--hostname", "0.0.0.0"]

FROM base AS builder

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN test -n "$NEXT_PUBLIC_API_BASE_URL"
RUN npm run build:shared && npm run build:web

FROM node:20-bookworm-slim AS production

WORKDIR /workspace
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --workspace @bid/web --workspace @bid/shared

COPY --chown=node:node --from=builder /workspace/apps/web/.next apps/web/.next
COPY --chown=node:node --from=builder /workspace/apps/web/public apps/web/public
COPY --chown=node:node --from=builder /workspace/apps/web/next.config.mjs apps/web/next.config.mjs
COPY --chown=node:node --from=builder /workspace/packages/shared/dist packages/shared/dist

EXPOSE 3000
USER node
CMD ["npm", "--workspace", "@bid/web", "run", "start", "--", "--hostname", "0.0.0.0"]
