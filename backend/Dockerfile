# Backend image. Two stages so the runtime layer carries no toolchain and no dev deps.
# Prisma client is generated in the build stage and copied forward with node_modules.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# openssl: Prisma's query engine links against it on alpine.
RUN apk add --no-cache openssl

COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Equipment photos are served statically from ./public — see main.ts.
COPY public ./public

# Uploads live on a mounted volume, not in the image — see docker-compose.prod.yml.
ENV UPLOAD_DIR=/data/uploads
RUN mkdir -p /data/uploads

EXPOSE 3000

# Migrations run at boot: the container is the only thing that knows the DB is reachable,
# and `migrate deploy` is idempotent, so a restart is safe.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
