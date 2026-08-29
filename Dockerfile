# Stage 1: Build
FROM node:24.20.0-alpine AS build
WORKDIR /app

# Copy root workspace config
COPY package.json package-lock.json ./

# Copy shared package
COPY packages/shared/package.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src

# Copy dashboard package
COPY packages/dashboard/package.json packages/dashboard/
COPY packages/dashboard/tsconfig.json packages/dashboard/
COPY packages/dashboard/vite.config.ts packages/dashboard/
COPY packages/dashboard/index.html packages/dashboard/
COPY packages/dashboard/src packages/dashboard/src
COPY packages/dashboard/public packages/dashboard/public
COPY packages/dashboard/server.js packages/dashboard/

# Copy lambdas package.json (needed for workspace resolution)
COPY packages/lambdas/package.json packages/lambdas/

# Install all workspace dependencies
RUN npm ci --ignore-scripts --no-audit

# Build shared package first
RUN cd packages/shared && npx tsc --build

# Build dashboard (vite build only, skip tsc since noEmit is true)
RUN cd packages/dashboard && npx vite build

# Stage 2: Serve
FROM node:24.20.0-alpine
WORKDIR /app

COPY --chown=node:node --from=build /app/packages/dashboard/dist ./dist
COPY --chown=node:node --from=build /app/packages/dashboard/server.js ./server.js

ENV HOST=0.0.0.0
ENV NODE_ENV=production
EXPOSE 8080
USER node
CMD ["node", "server.js"]
