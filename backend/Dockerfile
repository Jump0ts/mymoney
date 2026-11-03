# syntax=docker/dockerfile:1
#
# Imagen del backend de MyMoney. Lleva ademas, dentro de /opt/deploy, todo lo que se despliega junto a la API:
# los scripts del servidor y la web ya compilada (con la config del nginx que la sirve), para que una sola imagen,
# un solo digest y una sola aprobacion lleven API y web a la vez y siempre a la misma version.
# Contexto de construccion: la RAIZ del repositorio (el package-lock.json de los workspaces vive ahi):
#   docker build -f backend/Dockerfile --build-arg WEB_API_URL=https://api.ejemplo.dev -t mymoney-api .

# ---- build: dependencias completas, cliente de Prisma y TypeScript compilado ----
FROM node:24-alpine AS build
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

# ---- web: exportacion estatica de la app (Expo Router) y config del nginx que la sirve ----
# Imagen glibc (no alpine) porque es el mismo entorno que la CI de la app. Aqui nada llega al runtime salvo el resultado.
FROM node:24-bookworm-slim AS web
WORKDIR /app
# URL publica de la API: se incrusta en la web y fija el connect-src de su CSP (debe ser https).
ARG WEB_API_URL
ENV EXPO_PUBLIC_API_URL=$WEB_API_URL \
    EXPO_PUBLIC_APP_ENV=production \
    EXPO_NO_TELEMETRY=1 \
    CI=1
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --workspace=apps/mobile
COPY apps/mobile/ apps/mobile/
COPY deploy/vps/web-nginx/ deploy/vps/web-nginx/
WORKDIR /app/apps/mobile
# build:web falla si la URL no es https. El _headers es de hostings estaticos: aqui las cabeceras las pone nginx y
# un fichero con ese nombre no debe quedar servido.
RUN test -n "$EXPO_PUBLIC_API_URL" \
 && npm run build:web \
 && node scripts/web-nginx.js dist ../../deploy/vps/web-nginx/nginx.conf.template /out/nginx.conf \
 && rm dist/_headers

# ---- runtime: solo dependencias de produccion (incluye la CLI de Prisma para migrate deploy) ----
FROM node:24-alpine AS runtime
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
# La web (se monta de solo lectura en el contenedor `web`) y la config generada de su nginx.
COPY --from=web /app/apps/mobile/dist /opt/deploy/web/
COPY --from=web /out/nginx.conf /opt/deploy/web-nginx/nginx.conf

WORKDIR /app/backend
# Sin root: si alguien explotara la API no tendria privilegios dentro del contenedor.
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
