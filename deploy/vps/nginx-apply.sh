#!/usr/bin/env bash
# Instala o actualiza los vhosts de MyMoney (la API y, si hay WEB_DOMAIN, la web) en el nginx de travel_agency
# SIN poder romperlo.
#
# - Fase HTTP (sin certificado de ese dominio): solo responde al desafio de Let's Encrypt.
# - Fase HTTPS (con certificado): vhost completo.
# - Si `nginx -t` rechaza la configuracion se restaura lo que habia (de todos los vhosts a la vez) y se sale con
#   error; nginx no se recarga nunca con una configuracion no validada (travel_agency comparte ese nginx).
#
# Uso: DOMAIN=mymoney-api.ejemplo.dev [WEB_DOMAIN=mymoney.ejemplo.dev] ./nginx-apply.sh
# Variables de pruebas: TRAVEL_DIR (por defecto /opt/travel-agency).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
TRAVEL_DIR="${TRAVEL_DIR:-/opt/travel-agency}"
CONF_DIR="$TRAVEL_DIR/nginx/conf.d"
DOMAIN="${DOMAIN:?Falta DOMAIN}"
WEB_DOMAIN="${WEB_DOMAIN:-}"

die() { echo "nginx-apply: $*" >&2; exit 1; }
DOMAIN_REGEX='^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
[[ "$DOMAIN" =~ $DOMAIN_REGEX ]] || die "DOMAIN no es valido"
if [ -n "$WEB_DOMAIN" ]; then
  [[ "$WEB_DOMAIN" =~ $DOMAIN_REGEX ]] || die "WEB_DOMAIN no es valido"
  [ "$WEB_DOMAIN" != "$DOMAIN" ] || die "WEB_DOMAIN y DOMAIN deben ser distintos"
fi
[ -d "$CONF_DIR" ] || die "no existe $CONF_DIR (travel_agency no esta desplegado)"

travel() { docker compose -f "$TRAVEL_DIR/docker-compose.yml" "$@"; }

# Un sitio por linea: nombre|dominio|vhost instalado|include del proxy.
# El prefijo zz- hace que nginx cargue estos ficheros DESPUES de site.conf (el de travel_agency): el primer
# servidor definido es el "por defecto" para Hosts desconocidos y debe seguir siendo el de travel.
SITES=("api|$DOMAIN|zz-mymoney-api.conf|mymoney-proxy.inc")
if [ -n "$WEB_DOMAIN" ]; then SITES+=("web|$WEB_DOMAIN|zz-mymoney-web.conf|mymoney-web-proxy.inc"); fi

TMP_DIR="$(mktemp -d "$CONF_DIR/.mymoney.XXXXXX")"
BACKUP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR" "$BACKUP_DIR"' EXIT

# 1. Render de cada vhost en la fase que le toca (segun tenga ya certificado o no) y comparacion con lo instalado.
CHANGED=0
PHASES=()
for SITE in "${SITES[@]}"; do
  IFS='|' read -r NAME DOM CONF INC <<<"$SITE"
  if travel exec -T nginx test -f "/etc/letsencrypt/live/$DOM/fullchain.pem"; then
    TEMPLATE="nginx/mymoney-$NAME.https.conf"
    PHASES+=("$NAME: HTTPS")
  else
    TEMPLATE="nginx/mymoney-$NAME.http.conf"
    PHASES+=("$NAME: HTTP, aun no hay certificado")
  fi
  sed "s/__DOMAIN__/$DOM/g" "$TEMPLATE" >"$TMP_DIR/$CONF"
  chmod 644 "$TMP_DIR/$CONF"
  if ! { [ -f "$CONF_DIR/$CONF" ] && cmp -s "$TMP_DIR/$CONF" "$CONF_DIR/$CONF" && cmp -s "nginx/$INC" "$CONF_DIR/$INC" 2>/dev/null; }; then
    CHANGED=1
  fi
done
SUMMARY="$(IFS=';'; echo "${PHASES[*]}")"

if [ "$CHANGED" = 0 ]; then
  echo "nginx-apply: sin cambios ($SUMMARY)"
  exit 0
fi

# 2. Copia de lo que habia, para poder volver atras.
for SITE in "${SITES[@]}"; do
  IFS='|' read -r NAME DOM CONF INC <<<"$SITE"
  [ -f "$CONF_DIR/$CONF" ] && cp -p "$CONF_DIR/$CONF" "$BACKUP_DIR/$CONF"
  [ -f "$CONF_DIR/$INC" ] && cp -p "$CONF_DIR/$INC" "$BACKUP_DIR/$INC"
done

# 3. Instalacion.
for SITE in "${SITES[@]}"; do
  IFS='|' read -r NAME DOM CONF INC <<<"$SITE"
  cp "nginx/$INC" "$CONF_DIR/$INC"
  chmod 644 "$CONF_DIR/$INC"
  mv "$TMP_DIR/$CONF" "$CONF_DIR/$CONF"
done

# 4. Validar antes de recargar; si falla, todo vuelve a como estaba.
if ! travel exec -T nginx nginx -t; then
  echo "nginx-apply: nginx rechazo la configuracion; se restaura la anterior" >&2
  for SITE in "${SITES[@]}"; do
    IFS='|' read -r NAME DOM CONF INC <<<"$SITE"
    if [ -f "$BACKUP_DIR/$CONF" ]; then cp -p "$BACKUP_DIR/$CONF" "$CONF_DIR/$CONF"; else rm -f "$CONF_DIR/$CONF"; fi
    if [ -f "$BACKUP_DIR/$INC" ]; then cp -p "$BACKUP_DIR/$INC" "$CONF_DIR/$INC"; else rm -f "$CONF_DIR/$INC"; fi
  done
  exit 1
fi

travel exec -T nginx nginx -s reload
echo "nginx-apply: vhosts aplicados ($SUMMARY)"
