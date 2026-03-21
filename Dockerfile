# ---- Base stage ----
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/bot/package.json packages/bot/
COPY packages/webapp/package.json packages/webapp/
RUN npm ci --ignore-scripts

# ---- Build shared ----
FROM base AS build-shared
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
RUN npm run -w packages/shared build

# ---- Build API ----
FROM build-shared AS build-api
COPY packages/api packages/api
RUN npm run -w packages/api build

# ---- Build Bot ----
FROM build-shared AS build-bot
COPY packages/bot packages/bot
RUN npm run -w packages/bot build

# ---- Build Webapp ----
FROM build-shared AS build-webapp
COPY packages/webapp packages/webapp
RUN npm run -w packages/webapp build

# ---- API Runtime ----
FROM node:20-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules node_modules
COPY --from=base /app/package.json ./
COPY --from=build-shared /app/packages/shared/dist packages/shared/dist
COPY --from=build-shared /app/packages/shared/package.json packages/shared/
COPY --from=build-api /app/packages/api/dist packages/api/dist
COPY --from=build-api /app/packages/api/package.json packages/api/
COPY --from=build-api /app/packages/api/drizzle packages/api/drizzle
EXPOSE 3000
CMD ["sh", "-c", "node packages/api/dist/migrate.js && node packages/api/dist/index.js"]

# ---- Bot Runtime ----
FROM node:20-alpine AS bot
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules node_modules
COPY --from=base /app/package.json ./
COPY --from=build-shared /app/packages/shared/dist packages/shared/dist
COPY --from=build-shared /app/packages/shared/package.json packages/shared/
COPY --from=build-bot /app/packages/bot/dist packages/bot/dist
COPY --from=build-bot /app/packages/bot/package.json packages/bot/
CMD ["node", "packages/bot/dist/index.js"]

# ---- Webapp (Nginx) ----
FROM nginx:alpine AS webapp
COPY --from=build-webapp /app/packages/webapp/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
