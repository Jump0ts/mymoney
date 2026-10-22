# syntax=docker/dockerfile:1
#
# Imagen del backend de MyMoney.
# Contexto de construccion: la RAIZ del repositorio (el package-lock.json de los workspaces vive ahi):
#   docker build -f backend/Dockerfile -t mymoney-api .

# ---- build: dependencias completas, cliente de Prisma y TypeScript compilado ----
FROM node:25-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY apps/mobile/package.json apps/mobile/
# npm ci respeta el lockfile al pie de la letra; solo corren los scripts de install permitidos en allowScripts.
RUN npm ci --workspace=backend
COPY backend/ backend/
WORKDIR /app/backend
RUN npx prisma generate && npm run build

# ---- runtime: solo dependencias de produccion (incluye la CLI de Prisma para migrate deploy) ----
FROM node:25-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --workspace=backend --omit=dev && npm cache clean --force
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/prisma backend/prisma
# Ficheros de despliegue que viajan dentro de la imagen: el servidor solo ejecuta lo que sale de la CI
# (ver deploy/vps/README.md). No contienen secretos.
COPY deploy/vps/ /opt/deploy/
COPY deploy/backup/ /opt/deploy/backup/

WORKDIR /app/backend
# Sin root: si alguien explotara la API no tendria privilegios dentro del contenedor.
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
