#!/usr/bin/env bash
# Pruebas de ssh-entry.sh, nginx-apply.sh y deploy.sh con un `docker` y un `stat` falsos
# (no necesitan Docker, nginx ni el servidor).   Uso: bash deploy/vps/vps.test.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SRC="$(cd "$HERE/../backup" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PASSED=0
fail() { echo "FALLO: $*" >&2; exit 1; }
pass() { PASSED=$((PASSED + 1)); echo "ok - $1"; }
# before <n1> <n2>: ambos numeros de linea existen y el primero va antes que el segundo
before() { [ -n "$1" ] && [ -n "$2" ] && [ "$1" -lt "$2" ]; }

# ---- docker y stat falsos. Cada llamada de docker queda en $FAKE_LOG; el comportamiento se controla con variables FAKE_* ----
mkdir -p "$WORK/bin"
cat >"$WORK/bin/docker" <<'EOF'
#!/usr/bin/env bash
ARGS="$*"
echo "docker $ARGS" >>"$FAKE_LOG"
case "$ARGS" in
  "login ghcr.io"*) cat >"$FAKE_DIR/login_stdin" ;;
  "logout"*) ;;
  "pull"*) [ -z "${FAKE_PULL_FAIL:-}" ] || { echo "pull rechazado" >&2; exit 1; } ;;
  "create"*) echo "cid123" ;;
  "cp cid123:/opt/deploy/."*) cp -r "$FAKE_BUNDLE/." "${ARGS##* }" ;;
  "rm"*) ;;
  "network inspect"*) [ -z "${FAKE_NO_NETWORK:-}" ] || exit 1 ;;
  "image prune"*) ;;
  "compose"*)
    case "$ARGS" in
      *" ps -q db"*) [ -z "${FAKE_DB_UP:-}" ] || echo "abc" ;;
      *"run --rm -T --no-deps api"*) [ -z "${FAKE_MIGRATE_FAIL:-}" ] || { echo "migracion rota" >&2; exit 1; } ;;
      *"--no-deps --wait --wait-timeout 90 api"*)
        # La imagen "mala" lleva el digest eeee...: en esa la API nunca queda sana.
        if grep -q 'sha256:eeeeeeee' "$FAKE_STATE/image.env" 2>/dev/null; then exit 1; fi ;;
      *"--no-deps --force-recreate --wait --wait-timeout 60 web"*) [ -z "${FAKE_WEB_FAIL:-}" ] || exit 1 ;;
      # FAKE_CERT: todos los dominios tienen certificado; FAKE_CERT_ONLY=<dominio>: solo ese.
      *"exec -T nginx test -f"*)
        [ -n "${FAKE_CERT:-}" ] || exit 1
        [ -z "${FAKE_CERT_ONLY:-}" ] || [[ "$ARGS" == *"/live/$FAKE_CERT_ONLY/"* ]] || exit 1 ;;
      *"exec -T nginx nginx -t"*) [ -z "${FAKE_NGINX_T_FAIL:-}" ] || { echo "nginx: [emerg] fallo" >&2; exit 1; } ;;
      *"exec -T db"*) printf -- '--\n-- PostgreSQL database dump\n--\nCREATE TABLE "User" (id text);\n' ;;
      *" logs "*) echo "linea de log" ;;
    esac ;;
esac
exit 0
EOF
cat >"$WORK/bin/stat" <<'EOF'
#!/usr/bin/env bash
echo "${FAKE_STAT_MODE:-600}"
EOF
chmod +x "$WORK/bin/docker" "$WORK/bin/stat"
export PATH="$WORK/bin:$PATH"

DIGEST="sha256:$(printf 'a%.0s' $(seq 64))"
BAD_DIGEST="sha256:$(printf 'e%.0s' $(seq 64))"
TOKEN="TOKEN_SECRETO_de_prueba_123"

# Entorno limpio para cada caso: BASE (como /opt/mymoney), TRAVEL (como /opt/travel-agency) y un bundle falso.
new_case() { # <nombre>
  CASE="$WORK/$1"
  export MYMONEY_BASE="$CASE/mymoney" TRAVEL_DIR="$CASE/travel" FAKE_DIR="$CASE" FAKE_STATE="$CASE/mymoney/state"
  export FAKE_LOG="$CASE/docker.log" FAKE_BUNDLE="$CASE/bundle"
  unset FAKE_PULL_FAIL FAKE_NO_NETWORK FAKE_DB_UP FAKE_MIGRATE_FAIL FAKE_CERT FAKE_CERT_ONLY FAKE_NGINX_T_FAIL FAKE_STAT_MODE FAKE_WEB_FAIL
  mkdir -p "$MYMONEY_BASE" "$TRAVEL_DIR/nginx/conf.d" "$FAKE_BUNDLE"
  : >"$FAKE_LOG"
  : >"$TRAVEL_DIR/docker-compose.yml"
}
installed_release() { # copia los ficheros reales como quedarian dentro de /opt/mymoney/release
  mkdir -p "$MYMONEY_BASE/release"
  cp -r "$HERE/." "$MYMONEY_BASE/release/"
  rm -rf "$MYMONEY_BASE/release/bin" "$MYMONEY_BASE/release/vps.test.sh"
  mkdir -p "$MYMONEY_BASE/release/backup"
  cp "$BACKUP_SRC/backup.sh" "$MYMONEY_BASE/release/backup/"
}
with_web() { # la web y la config de su nginx, como las dejaria extraer la imagen
  mkdir -p "$MYMONEY_BASE/release/web" "$MYMONEY_BASE/release/web-nginx"
  echo "<html></html>" >"$MYMONEY_BASE/release/web/index.html"
  echo "# nginx de la web" >"$MYMONEY_BASE/release/web-nginx/nginx.conf"
}
docker_calls() { grep -c "^docker $1" "$FAKE_LOG" || true; }

# =============================== ssh-entry.sh ===============================

ENTRY="$HERE/bin/ssh-entry.sh"
entry() { # <orden> [token]
  SSH_ORIGINAL_COMMAND="$1" bash "$ENTRY" <<<"${2-$TOKEN}" >"$CASE/out.txt" 2>&1
}

# E1. Solo se acepta exactamente "deploy <digest> <usuario>": todo lo demas se rechaza sin llamar a docker
new_case e1
BAD_COMMANDS=(
  ""
  "bash"
  "/bin/sh -c id"
  "deploy"
  "deploy $DIGEST"
  "deploy sha256:abc Jump0ts"
  "deploy sha256:$(printf 'a%.0s' $(seq 63)) Jump0ts"
  "deploy sha256:$(printf 'A%.0s' $(seq 64)) Jump0ts"
  "deploy latest Jump0ts"
  "deploy $DIGEST Jump0ts extra"
  "deploy $DIGEST Jump0ts; id"
  "deploy $DIGEST \$(id)"
  "deploy $DIGEST jump0ts && cat /etc/passwd"
  "deploy $DIGEST Jump0ts"$'\n'"bash"
  "deploy $DIGEST $(printf 'a%.0s' $(seq 40))"
  "scp -t /tmp"
  "rsync --server -e.iLsfxC . /opt/mymoney"
)
for CMD in "${BAD_COMMANDS[@]}"; do
  if entry "$CMD"; then fail "se acepto una orden no permitida: $CMD"; fi
done
[ "$(wc -l <"$FAKE_LOG" | tr -d ' ')" = "0" ] || fail "docker se llamo con una orden rechazada"
pass "rechaza cualquier orden que no sea 'deploy <digest> <usuario>' exacta (y no toca docker)"

# E2. Sin token por stdin no se hace nada
new_case e2
if SSH_ORIGINAL_COMMAND="deploy $DIGEST Jump0ts" bash "$ENTRY" </dev/null >"$CASE/out.txt" 2>&1; then
  fail "sin token deberia fallar"
fi
[ "$(docker_calls "pull")" = "0" ] || fail "sin token no deberia descargar nada"
pass "sin token en stdin no descarga ni despliega"

# E3. Caso valido: el token solo va por stdin, se cierra la sesion y se despliega por digest
new_case e3
# shellcheck disable=SC2016  # $1 debe llegar literal al script generado
printf '#!/usr/bin/env bash\necho "DEPLOY $1" >"%s/deploy_called"\n' "$CASE" >"$FAKE_BUNDLE/deploy.sh"
chmod +x "$FAKE_BUNDLE/deploy.sh"
entry "deploy $DIGEST Jump0ts" || { cat "$CASE/out.txt" >&2; fail "una orden valida deberia salir con 0"; }
[ "$(cat "$CASE/login_stdin")" = "$TOKEN" ] || fail "el token deberia llegar a docker login por stdin"
grep -q "login ghcr.io -u Jump0ts --password-stdin" "$FAKE_LOG" || fail "docker login mal formado"
! grep -q "$TOKEN" "$FAKE_LOG" || fail "el token aparece en los argumentos de docker"
! grep -q "$TOKEN" "$CASE/out.txt" || fail "el token aparece en la salida"
grep -q "docker pull --quiet ghcr.io/jump0ts/mymoney-api@$DIGEST" "$FAKE_LOG" || fail "deberia descargar la imagen fijada por digest"
[ "$(cat "$CASE/deploy_called")" = "DEPLOY ghcr.io/jump0ts/mymoney-api@$DIGEST" ] || fail "deploy.sh deberia recibir la imagen por digest"
LOGOUT_LINE="$(grep -n '^docker logout' "$FAKE_LOG" | head -1 | cut -d: -f1)"
PULL_LINE="$(grep -n '^docker pull' "$FAKE_LOG" | head -1 | cut -d: -f1)"
before "$PULL_LINE" "$LOGOUT_LINE" || fail "debe cerrar la sesion del registro justo despues de descargar"
[ -f "$MYMONEY_BASE/release/deploy.sh" ] || fail "los ficheros de despliegue deberian salir de la imagen"
pass "valida: token por stdin (nunca en argumentos), imagen por digest, sesion cerrada y despliegue lanzado"

# E4. Si la descarga falla: error, se cierra la sesion y no se despliega
new_case e4
printf '#!/usr/bin/env bash\ntouch "%s/deploy_called"\n' "$CASE" >"$FAKE_BUNDLE/deploy.sh"
chmod +x "$FAKE_BUNDLE/deploy.sh"
export FAKE_PULL_FAIL=1
if entry "deploy $DIGEST Jump0ts"; then fail "con la descarga rota deberia fallar"; fi
[ "$(docker_calls "logout")" -ge 1 ] || fail "debe cerrar la sesion aunque falle la descarga"
[ ! -e "$CASE/deploy_called" ] || fail "no deberia desplegar si la descarga falla"
pass "si la descarga falla cierra la sesion y no despliega"

# ============================== nginx-apply.sh ==============================

APPLY="$HERE/nginx-apply.sh"
apply() { (cd "$HERE" && DOMAIN="${1-mymoney-api.ejemplo.dev}" WEB_DOMAIN="${2-}" bash "$APPLY") >"$CASE/out.txt" 2>&1; }
API_CONF() { echo "$TRAVEL_DIR/nginx/conf.d/zz-mymoney-api.conf"; }
WEB_CONF() { echo "$TRAVEL_DIR/nginx/conf.d/zz-mymoney-web.conf"; }

# N1. Sin certificado: solo desafio ACME, sin ssl
new_case n1
apply || { cat "$CASE/out.txt" >&2; fail "nginx-apply sin certificado deberia salir con 0"; }
CONF="$TRAVEL_DIR/nginx/conf.d/zz-mymoney-api.conf"
grep -q "acme-challenge" "$CONF" || fail "falta el desafio ACME"
! grep -q "ssl_certificate" "$CONF" || fail "sin certificado no debe pedir ssl_certificate (rompería el nginx de travel)"
grep -q "server_name mymoney-api.ejemplo.dev;" "$CONF" || fail "no sustituyo el dominio"
! grep -q "__DOMAIN__" "$CONF" || fail "quedo un __DOMAIN__ sin sustituir"
grep -q "nginx -s reload" "$FAKE_LOG" || fail "deberia recargar nginx"
pass "sin certificado instala solo la fase HTTP del desafio"

# N2. Con certificado: vhost HTTPS completo con limites
new_case n2
export FAKE_CERT=1
apply || fail "nginx-apply con certificado deberia salir con 0"
CONF="$TRAVEL_DIR/nginx/conf.d/zz-mymoney-api.conf"
grep -q "live/mymoney-api.ejemplo.dev/fullchain.pem" "$CONF" || fail "falta el certificado"
grep -q "limit_req zone=mymoney_auth" "$CONF" || fail "falta el freno de fuerza bruta en /api/auth/"
grep -q "return 404" "$CONF" || fail "las rutas desconocidas deben dar 404"
grep -q "Strict-Transport-Security" "$CONF" || fail "falta HSTS"
[ -f "$TRAVEL_DIR/nginx/conf.d/mymoney-proxy.inc" ] || fail "falta el include del proxy"
# La API envia sus propias cabeceras (Helmet): el proxy debe descartarlas para que no salgan duplicadas con las del vhost.
for HEADER in Strict-Transport-Security X-Content-Type-Options X-Frame-Options Content-Security-Policy Referrer-Policy; do
  grep -q "^proxy_hide_header $HEADER;" "$TRAVEL_DIR/nginx/conf.d/mymoney-proxy.inc" || fail "el proxy no descarta $HEADER de la API"
  grep -q "add_header $HEADER " "$CONF" || fail "el vhost no define $HEADER"
done
# nginx carga conf.d por orden alfabetico: debe ir despues de site.conf para no quitarle a travel el "servidor por defecto".
[[ "$(basename "$CONF")" > "site.conf" ]] || fail "el vhost de MyMoney se cargaria antes que el de travel_agency"
{ [ ! -e "$(WEB_CONF)" ] && [ ! -e "$TRAVEL_DIR/nginx/conf.d/mymoney-web-proxy.inc" ]; } || fail "sin WEB_DOMAIN no debe instalarse nada de la web"
pass "con certificado instala el vhost HTTPS con limites, HSTS y 404 por defecto (y sin WEB_DOMAIN, nada de la web)"

# N3. Idempotente: segunda ejecucion sin cambios no recarga
: >"$FAKE_LOG"
apply || fail "la segunda ejecucion deberia salir con 0"
grep -q "sin cambios" "$CASE/out.txt" || fail "deberia decir que no hay cambios"
! grep -q "nginx -s reload" "$FAKE_LOG" || fail "no deberia recargar si no cambia nada"
pass "es idempotente: sin cambios no recarga nginx"

# N4. Si nginx -t rechaza la configuracion se restaura la anterior y no se recarga
new_case n4
export FAKE_CERT=1
echo "# configuracion anterior" >"$TRAVEL_DIR/nginx/conf.d/zz-mymoney-api.conf"
export FAKE_NGINX_T_FAIL=1
if apply; then fail "con nginx -t fallando deberia salir con error"; fi
[ "$(cat "$TRAVEL_DIR/nginx/conf.d/zz-mymoney-api.conf")" = "# configuracion anterior" ] || fail "no restauro la configuracion anterior"
! grep -q "nginx -s reload" "$FAKE_LOG" || fail "no debe recargar una configuracion rechazada"
new_case n4b
export FAKE_CERT=1 FAKE_NGINX_T_FAIL=1
if apply; then fail "deberia fallar"; fi
[ ! -e "$TRAVEL_DIR/nginx/conf.d/zz-mymoney-api.conf" ] || fail "si no habia vhost antes, no debe quedar ninguno roto"
[ ! -e "$TRAVEL_DIR/nginx/conf.d/mymoney-proxy.inc" ] || fail "tampoco el include"
pass "si nginx rechaza la configuracion, la restaura (o la quita) y no recarga: travel_agency queda intacto"

# N5. Dominios raros se rechazan (se usan en rutas y en sed)
new_case n5
# shellcheck disable=SC2016  # '$(id).dev' es una cadena de prueba: no debe expandirse
for DOM in 'a;b.dev' '../etc' 'x y.dev' 'UPPER.dev' 'sin-punto' '$(id).dev' 'a/b.dev'; do
  if apply "$DOM"; then fail "dominio no valido aceptado: $DOM"; fi
done
[ -z "$(ls -A "$TRAVEL_DIR/nginx/conf.d")" ] || fail "no deberia escribir nada con un dominio invalido"
pass "rechaza dominios con caracteres peligrosos antes de escribir nada"

# N6. Con WEB_DOMAIN y sin certificados: los dos vhosts en fase HTTP (solo el desafio de Let's Encrypt)
new_case n6
apply "mymoney-api.ejemplo.dev" "mymoney.ejemplo.dev" || { cat "$CASE/out.txt" >&2; fail "deberia salir con 0"; }
for F in "$(API_CONF)" "$(WEB_CONF)"; do
  grep -q "acme-challenge" "$F" || fail "falta el desafio ACME en $(basename "$F")"
  ! grep -q "ssl_certificate" "$F" || fail "sin certificado no debe pedir ssl_certificate ($(basename "$F"))"
  ! grep -q "__DOMAIN__" "$F" || fail "quedo un __DOMAIN__ sin sustituir en $(basename "$F")"
done
grep -q "server_name mymoney.ejemplo.dev;" "$(WEB_CONF)" || fail "el vhost de la web debe llevar el dominio de la web"
grep -q "server_name mymoney-api.ejemplo.dev;" "$(API_CONF)" || fail "el vhost de la API debe llevar el dominio de la API"
[ "$(grep -c "nginx -s reload" "$FAKE_LOG")" = "1" ] || fail "debe recargar nginx una sola vez para los dos vhosts"
pass "con WEB_DOMAIN y sin certificados instala los dos vhosts en fase HTTP y recarga una vez"

# N7. Con certificados: la web va por proxy al contenedor `web`, con limites y SIN anadir cabeceras (salen del servidor de la web)
new_case n7
export FAKE_CERT=1
apply "mymoney-api.ejemplo.dev" "mymoney.ejemplo.dev" || { cat "$CASE/out.txt" >&2; fail "deberia salir con 0"; }
WEB="$(WEB_CONF)"
grep -q "live/mymoney.ejemplo.dev/fullchain.pem" "$WEB" || fail "la web debe usar su propio certificado"
grep -q "http://mymoney-web:8080" "$WEB" || fail "la web debe ir por proxy a mymoney-web:8080"
grep -q "limit_req zone=mymoney_web" "$WEB" || fail "falta el limite de peticiones de la web"
grep -q 'GET|HEAD' "$WEB" || fail "la web solo debe admitir GET y HEAD"
grep -q "limit_req_zone .*zone=mymoney_web:" "$WEB" || fail "falta la zona del limite"
! grep -q "add_header" "$WEB" || fail "el vhost de la web no debe anadir cabeceras (saldrian duplicadas con las del servidor de la web)"
! grep -q "proxy_hide_header" "$TRAVEL_DIR/nginx/conf.d/mymoney-web-proxy.inc" || fail "el proxy de la web no debe descartar las cabeceras de seguridad del servidor de la web"
grep -q "^proxy_hide_header Content-Security-Policy;" "$TRAVEL_DIR/nginx/conf.d/mymoney-proxy.inc" || fail "el proxy de la API debe seguir descartando las suyas"
# nginx rechaza una directiva global repetida entre ficheros: limit_req_status solo puede ir una vez a nivel http.
[ "$(grep -c '^limit_req_status' "$(API_CONF)")" = "1" ] || fail "limit_req_status debe declararse solo en el vhost de la API"
! grep -q '^limit_req_status' "$WEB" || fail "el vhost de la web no puede repetir limit_req_status a nivel http"
[ "$(cat "$(API_CONF)" "$WEB" | grep -c '^limit_req_zone')" = "3" ] || fail "debe haber exactamente 3 zonas de limite (auth, api y web)"
[[ "$(basename "$WEB")" > "site.conf" ]] || fail "el vhost de la web se cargaria antes que el de travel_agency"
pass "con certificados la web va por proxy al contenedor, con limites y sin duplicar cabeceras"

# N8. Solo la web tiene certificado: cada vhost va en la fase que le corresponde
new_case n8
export FAKE_CERT=1 FAKE_CERT_ONLY="mymoney.ejemplo.dev"
apply "mymoney-api.ejemplo.dev" "mymoney.ejemplo.dev" || fail "deberia salir con 0"
grep -q "ssl_certificate" "$(WEB_CONF)" || fail "la web tiene certificado: debe ir en HTTPS"
! grep -q "ssl_certificate" "$(API_CONF)" || fail "la API no tiene certificado: debe seguir en fase HTTP"
pass "cada dominio se instala en su fase segun tenga o no certificado"

# N9. Si nginx -t rechaza la configuracion, se restauran (o quitan) los DOS vhosts y no se recarga
new_case n9
export FAKE_CERT=1
echo "# api anterior" >"$(API_CONF)"
echo "# web anterior" >"$(WEB_CONF)"
export FAKE_NGINX_T_FAIL=1
if apply "mymoney-api.ejemplo.dev" "mymoney.ejemplo.dev"; then fail "con nginx -t fallando deberia salir con error"; fi
{ [ "$(cat "$(API_CONF)")" = "# api anterior" ] && [ "$(cat "$(WEB_CONF)")" = "# web anterior" ]; } || fail "no restauro los dos vhosts anteriores"
! grep -q "nginx -s reload" "$FAKE_LOG" || fail "no debe recargar una configuracion rechazada"
new_case n9b
export FAKE_CERT=1 FAKE_NGINX_T_FAIL=1
if apply "mymoney-api.ejemplo.dev" "mymoney.ejemplo.dev"; then fail "deberia fallar"; fi
[ -z "$(ls -A "$TRAVEL_DIR/nginx/conf.d")" ] || fail "si no habia vhosts antes, no debe quedar ninguno roto ni ficheros temporales"
pass "si nginx rechaza la configuracion, los dos vhosts vuelven a como estaban y travel_agency queda intacto"

# N10. WEB_DOMAIN invalido o igual que el de la API: se rechaza antes de escribir nada
new_case n10
# shellcheck disable=SC2016  # '$(id).dev' es una cadena de prueba: no debe expandirse
for WDOM in 'a;b.dev' 'UPPER.dev' 'sin-punto' '$(id).dev' 'mymoney-api.ejemplo.dev'; do
  if apply "mymoney-api.ejemplo.dev" "$WDOM"; then fail "WEB_DOMAIN no valido aceptado: $WDOM"; fi
done
[ -z "$(ls -A "$TRAVEL_DIR/nginx/conf.d")" ] || fail "no deberia escribir nada con un WEB_DOMAIN invalido"
pass "rechaza un WEB_DOMAIN peligroso o repetido antes de escribir nada"

# ================================ deploy.sh ================================

GOOD_PASSWORD="abcdefghijklmnopqrstuvwx12"
GOOD_JWT="jwt-secreto-de-prueba-muy-largo-0123456789"
write_env() { # [sobrescrituras CLAVE=valor...]
  local file="$MYMONEY_BASE/.env.production"
  {
    echo "DOMAIN=mymoney-api.ejemplo.dev"
    echo "POSTGRES_USER=mymoney"
    echo "POSTGRES_PASSWORD=$GOOD_PASSWORD"
    echo "POSTGRES_DB=mymoney_production"
    echo "JWT_SECRET=$GOOD_JWT"
    echo "CORS_ORIGINS=https://mymoney.ejemplo.dev"
  } >"$file"
  for override in "$@"; do
    local key="${override%%=*}"
    grep -v "^$key=" "$file" >"$file.tmp" || true
    [ -z "${override#*=}" ] || echo "$override" >>"$file.tmp"
    mv "$file.tmp" "$file"
  done
  chmod 600 "$file"
}
GOOD_REF="ghcr.io/jump0ts/mymoney-api@$DIGEST"
BAD_REF="ghcr.io/jump0ts/mymoney-api@$BAD_DIGEST"
deploy() { # <imagen>
  bash "$MYMONEY_BASE/release/deploy.sh" "$1" >"$CASE/out.txt" 2>&1
}
setup_deploy() { new_case "$1"; installed_release; write_env; }

# D1. Configuracion ausente o insegura: no se hace nada
setup_deploy d1
rm "$MYMONEY_BASE/.env.production"
if deploy "$GOOD_REF"; then fail "sin .env deberia fallar"; fi
[ "$(docker_calls "compose")" = "0" ] || fail "sin .env no deberia tocar compose"
write_env
export FAKE_STAT_MODE=644
if deploy "$GOOD_REF"; then fail "con permisos 644 deberia fallar"; fi
grep -q "permisos 600" "$CASE/out.txt" || fail "deberia explicar lo de los permisos"
[ "$(docker_calls "compose")" = "0" ] || fail "con permisos abiertos no deberia tocar compose"
pass "sin .env, o con permisos abiertos, no despliega"

# D2. Valores debiles o peligrosos
for BAD in "POSTGRES_PASSWORD=corta" "POSTGRES_PASSWORD=con/caracteres:raros@aqui!!!!" "JWT_SECRET=corto" \
           "CORS_ORIGINS=*" "CORS_ORIGINS=http://inseguro.dev" "CORS_ORIGINS=https://*.dev" "DOMAIN=no es dominio" "DOMAIN=" "POSTGRES_DB="; do
  setup_deploy d2
  write_env "$BAD"
  if deploy "$GOOD_REF"; then fail "valor invalido aceptado: ${BAD%%=*}"; fi
  [ "$(docker_calls "compose")" = "0" ] || fail "con ${BAD%%=*} invalido no deberia tocar compose"
done
pass "rechaza contrasena/JWT debiles, CORS con comodin o sin https y dominios invalidos"

# D3. Imagen mal formada
setup_deploy d3
for REF in "ubuntu:latest" "ghcr.io/x/y:latest" "ghcr.io/x/y@sha256:corto" "docker.io/x/y@$DIGEST" "ghcr.io/x/y@$DIGEST; id"; do
  if deploy "$REF"; then fail "imagen no valida aceptada: $REF"; fi
done
pass "solo acepta imagenes de ghcr.io fijadas por digest"

# D4. Primer despliegue correcto: orden db -> migrar -> api, sin backup, y estado guardado
setup_deploy d4
deploy "$GOOD_REF" || { cat "$CASE/out.txt" >&2; fail "un despliegue valido deberia salir con 0"; }
[ "$(cat "$MYMONEY_BASE/state/current")" = "$GOOD_REF" ] || fail "deberia guardar la imagen actual"
grep -q "API_IMAGE=$GOOD_REF" "$MYMONEY_BASE/state/image.env" || fail "deberia fijar la imagen en image.env"
L_DB="$(grep -n 'up -d --wait --wait-timeout 90 db' "$FAKE_LOG" | head -1 | cut -d: -f1)"
L_MIG="$(grep -n 'prisma migrate deploy' "$FAKE_LOG" | head -1 | cut -d: -f1)"
L_API="$(grep -n -- '--no-deps --wait --wait-timeout 90 api' "$FAKE_LOG" | head -1 | cut -d: -f1)"
before "$L_DB" "$L_MIG" || fail "la base de datos debe levantarse antes de migrar"
before "$L_MIG" "$L_API" || fail "las migraciones deben aplicarse antes de arrancar la API nueva"
! grep -q "pg_dump" "$FAKE_LOG" || fail "el primer despliegue no tiene base que copiar"
grep -q "nginx -s reload" "$FAKE_LOG" || fail "deberia aplicar nginx"
pass "primer despliegue: base de datos, migraciones y API en ese orden, y nginx"

# D5. Con la base ya en marcha: backup ANTES de migrar
setup_deploy d5
export FAKE_DB_UP=1
deploy "$GOOD_REF" || { cat "$CASE/out.txt" >&2; fail "deberia salir con 0"; }
L_BAK="$(grep -n 'exec -T db' "$FAKE_LOG" | head -1 | cut -d: -f1)"
L_MIG="$(grep -n 'prisma migrate deploy' "$FAKE_LOG" | head -1 | cut -d: -f1)"
before "$L_BAK" "$L_MIG" || fail "el backup debe hacerse antes de migrar"
[ "$(find "$MYMONEY_BASE/backups/production/daily" -type f | wc -l | tr -d ' ')" = "1" ] || fail "deberia haber un backup diario"
pass "con la base en marcha hace backup antes de migrar"

# D6. Migracion rota: no se sustituye la API
setup_deploy d6
export FAKE_DB_UP=1 FAKE_MIGRATE_FAIL=1
if deploy "$GOOD_REF"; then fail "con la migracion rota deberia fallar"; fi
! grep -q -- '--no-deps --wait --wait-timeout 90 api' "$FAKE_LOG" || fail "no debe arrancar la API nueva si la migracion falla"
[ ! -e "$MYMONEY_BASE/state/current" ] || fail "no debe marcar como actual una imagen que no se desplego"
pass "si la migracion falla, la API no se sustituye"

# D7. API nueva que no queda sana: vuelve a la anterior
setup_deploy d7
deploy "$GOOD_REF" || fail "el primer despliegue deberia ir bien"
export FAKE_DB_UP=1
if deploy "$BAD_REF"; then fail "una API que no queda sana deberia hacer fallar el despliegue"; fi
[ "$(cat "$MYMONEY_BASE/state/current")" = "$GOOD_REF" ] || fail "la imagen actual no debe cambiar"
grep -q "API_IMAGE=$GOOD_REF" "$MYMONEY_BASE/state/image.env" || fail "debe volver a la imagen anterior"
pass "si la API nueva no queda sana, se vuelve a la imagen anterior"

# D8. Falta la red de travel_agency
setup_deploy d8
export FAKE_NO_NETWORK=1
if deploy "$GOOD_REF"; then fail "sin la red de travel deberia fallar"; fi
grep -q "travel_agency" "$CASE/out.txt" || fail "deberia explicar que falta travel_agency"
pass "sin la red de travel_agency (nginx) no despliega"

# D9. Ningun secreto aparece en la salida ni en las llamadas a docker
setup_deploy d9
export FAKE_DB_UP=1
deploy "$GOOD_REF" || fail "deberia salir con 0"
for SECRET in "$GOOD_PASSWORD" "$GOOD_JWT"; do
  ! grep -rq "$SECRET" "$CASE/out.txt" "$FAKE_LOG" || fail "un secreto aparece en la salida o en los argumentos de docker"
done
pass "ningun secreto sale en la salida ni en los argumentos de docker"

# D10. El compose no incluye secretos ni publica puertos
! grep -qE '^\s+ports:' "$HERE/docker-compose.yml" || fail "el compose del VPS no debe publicar puertos"
! grep -qiE 'password: [^$]|jwt_secret: [^$]' "$HERE/docker-compose.yml" || fail "el compose no debe llevar secretos escritos"
pass "el compose del VPS no publica puertos ni lleva secretos"

# D11. Con WEB_DOMAIN: tras la API sana se recrea la web y despues se aplica nginx con los dos dominios
setup_deploy d11
write_env "WEB_DOMAIN=mymoney.ejemplo.dev"
with_web
deploy "$GOOD_REF" || { cat "$CASE/out.txt" >&2; fail "un despliegue con web deberia salir con 0"; }
L_API="$(grep -n -- '--no-deps --wait --wait-timeout 90 api' "$FAKE_LOG" | head -1 | cut -d: -f1)"
L_WEB="$(grep -n -- '--no-deps --force-recreate --wait --wait-timeout 60 web' "$FAKE_LOG" | head -1 | cut -d: -f1)"
L_NGX="$(grep -n 'nginx -s reload' "$FAKE_LOG" | head -1 | cut -d: -f1)"
before "$L_API" "$L_WEB" || fail "la web debe recrearse despues de que la API quede sana"
before "$L_WEB" "$L_NGX" || fail "nginx debe configurarse despues de levantar la web"
{ [ -f "$(WEB_CONF)" ] && [ -f "$(API_CONF)" ]; } || fail "deberia instalar los vhosts de la API y de la web"
pass "con WEB_DOMAIN: API sana, luego la web recreada y luego nginx con los dos dominios"

# D12. Sin WEB_DOMAIN la web no se toca (el comportamiento de antes no cambia)
setup_deploy d12
deploy "$GOOD_REF" || fail "deberia salir con 0"
! grep -q -- '--force-recreate' "$FAKE_LOG" || fail "sin WEB_DOMAIN no debe levantar el contenedor de la web"
[ ! -e "$(WEB_CONF)" ] || fail "sin WEB_DOMAIN no debe instalar el vhost de la web"
pass "sin WEB_DOMAIN no se despliega la web"

# D13. WEB_DOMAIN mal configurado: no se toca nada
for BAD in "WEB_DOMAIN=no es dominio" "WEB_DOMAIN=mymoney-api.ejemplo.dev" "WEB_DOMAIN=otra-web.ejemplo.dev"; do
  setup_deploy d13
  write_env "$BAD"
  with_web
  if deploy "$GOOD_REF"; then fail "WEB_DOMAIN mal configurado aceptado: $BAD"; fi
  [ "$(docker_calls "compose")" = "0" ] || fail "con '$BAD' no deberia tocar compose"
done
grep -q "CORS_ORIGINS debe incluir https://otra-web.ejemplo.dev" "$CASE/out.txt" || fail "deberia explicar que el CORS no incluye el origen de la web"
# Varios origenes: basta con que este el de la web.
setup_deploy d13b
write_env "WEB_DOMAIN=mymoney.ejemplo.dev" "CORS_ORIGINS=https://otra.dev,https://mymoney.ejemplo.dev"
with_web
deploy "$GOOD_REF" || { cat "$CASE/out.txt" >&2; fail "con varios origenes de CORS, incluyendo el de la web, deberia ir bien"; }
pass "WEB_DOMAIN debe ser un dominio valido, distinto de la API y estar en CORS_ORIGINS"

# D14. Si la imagen no trae la web no se despliega a medias
setup_deploy d14
write_env "WEB_DOMAIN=mymoney.ejemplo.dev"
if deploy "$GOOD_REF"; then fail "sin web en la imagen deberia fallar"; fi
grep -q "la imagen no lleva la web" "$CASE/out.txt" || fail "deberia explicar que falta la web"
[ "$(docker_calls "compose")" = "0" ] || fail "sin web en la imagen no deberia tocar compose"
pass "si la imagen no lleva la web, no despliega nada"

# D15. La web no queda sana: falla el despliegue, pero la API (ya sana) sigue siendo la actual
setup_deploy d15
write_env "WEB_DOMAIN=mymoney.ejemplo.dev"
with_web
export FAKE_WEB_FAIL=1
if deploy "$GOOD_REF"; then fail "una web que no queda sana deberia hacer fallar el despliegue"; fi
grep -q "la web no quedo sana" "$CASE/out.txt" || fail "deberia decir que la web no quedo sana"
[ "$(cat "$MYMONEY_BASE/state/current")" = "$GOOD_REF" ] || fail "la API ya estaba sana: debe quedar como actual"
! grep -q "nginx -s reload" "$FAKE_LOG" || fail "no debe tocar nginx si la web no esta sana"
pass "si la web no queda sana el despliegue falla sin deshacer la API y sin tocar nginx"

# D16. El servicio de la web en el compose esta endurecido
WEB_BLOCK="$(awk '/^  web:/{f=1;next} f && /^[^ ]/{exit} f && /^  [a-z]/{exit} f' "$HERE/docker-compose.yml")"
[ -n "$WEB_BLOCK" ] || fail "no encuentro el servicio web en el compose"
grep -q 'read_only: true' <<<"$WEB_BLOCK" || fail "la web debe tener el sistema de ficheros en solo lectura"
grep -q 'cap_drop: \[ALL\]' <<<"$WEB_BLOCK" || fail "la web debe quitar todas las capabilities"
grep -q 'no-new-privileges:true' <<<"$WEB_BLOCK" || fail "la web debe llevar no-new-privileges"
grep -q 'user: "101:101"' <<<"$WEB_BLOCK" || fail "la web no debe correr como root"
! grep -q 'ports:' <<<"$WEB_BLOCK" || fail "la web no debe publicar puertos"
grep -q './web:/usr/share/nginx/html:ro' <<<"$WEB_BLOCK" || fail "los ficheros de la web deben montarse de solo lectura"
grep -q './web-nginx/nginx.conf:/etc/nginx/nginx.conf:ro' <<<"$WEB_BLOCK" || fail "la config de nginx debe montarse de solo lectura"
grep -q 'mem_limit' <<<"$WEB_BLOCK" || fail "la web debe tener limite de memoria"
pass "el servicio de la web va sin root, en solo lectura, sin capabilities ni puertos y con limite de memoria"

echo "$PASSED pruebas correctas"
