# Single-service production image: builds the shared package, the React SPA, and
# the API, then runs the API which also serves the built SPA from the same
# origin (see app.ts static-serving block). One container = whole product.
FROM node:22-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate

WORKDIR /app

# Install with the lockfile (also runs the root `prepare` → builds @repeatless/shared)
COPY . .
RUN pnpm install --frozen-lockfile

# Build SPA + API (shared is already built by `prepare`, rebuilt here harmlessly)
RUN pnpm --filter @repeatless/shared build \
 && pnpm --filter @repeatless/web build \
 && pnpm --filter @repeatless/api build

ENV NODE_ENV=production
# Where the API finds the built SPA to serve.
ENV WEB_DIST_PATH=/app/apps/web/dist

# Render/most PaaS inject PORT at runtime; env.ts reads it (defaults to 4000).
EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
