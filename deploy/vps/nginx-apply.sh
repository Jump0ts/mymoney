#!/usr/bin/env bash
# Instala o actualiza el vhost de la API en el nginx de travel_agency SIN poder romperlo.
#
# - Fase HTTP (sin certificado): solo responde al desafio de Let's Encrypt.
# - Fase HTTPS (con certificado): vhost completo.
# - Si `nginx -t` rechaza la configuracion se restaura lo que habia y se sale con error; nginx
#   no se recarga nunca con una configuracion no validada (travel_agency comparte ese nginx).
#
# Uso: DOMAIN=mymoney-api.ejemplo.dev ./nginx-apply.sh
# Variables de pruebas: TRAVEL_DIR (por defecto /opt/travel-agency).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
TRAVEL_DIR="${TRAVEL_DIR:-/opt/travel-agency}"
CONF_DIR="$TRAVEL_DIR/nginx/conf.d"
DOMAIN="${DOMAIN:?Falta DOMAIN}"

die() { echo "nginx-apply: $*" >&2; exit 1; }
[[ "$DOMAIN" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] || die "DOMAIN no es valido"
[ -d "$CONF_DIR" ] || die "no existe $CONF_DIR (travel_agency no esta desplegado)"

travel() { docker compose -f "$TRAVEL_DIR/docker-compose.yml" "$@"; }

if travel exec -T nginx test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
  TEMPLATE="nginx/mymoney-api.https.conf"
  PHASE="HTTPS"
else
  TEMPLATE="nginx/mymoney-api.http.conf"
  PHASE="HTTP (aun no hay certificado)"
fi

# El prefijo zz- hace que nginx cargue este fichero DESPUES de site.conf (el de travel_agency): el primer
# servidor definido es el "por defecto" para Hosts desconocidos y debe seguir siendo el de travel.
CONF="$CONF_DIR/zz-mymoney-api.conf"
INC="$CONF_DIR/mymoney-proxy.inc"
TMP_CONF="$(mktemp "$CONF_DIR/.mymoney-api.XXXXXX")"
trap 'rm -f "$TMP_CONF"' EXIT
sed "s/__DOMAIN__/$DOMAIN/g" "$TEMPLATE" >"$TMP_CONF"
chmod 644 "$TMP_CONF"

if [ -f "$CONF" ] && cmp -s "$TMP_CONF" "$CONF" && cmp -s nginx/mymoney-proxy.inc "$INC" 2>/dev/null; then
  echo "nginx-apply: sin cambios ($PHASE)"
  exit 0
fi

# Copia de lo que habia, para poder volver atras.
BACKUP_DIR="$(mktemp -d)"
trap 'rm -f "$TMP_CONF"; rm -rf "$BACKUP_DIR"' EXIT
[ -f "$CONF" ] && cp -p "$CONF" "$BACKUP_DIR/conf"
[ -f "$INC" ] && cp -p "$INC" "$BACKUP_DIR/inc"

cp nginx/mymoney-proxy.inc "$INC"
chmod 644 "$INC"
mv "$TMP_CONF" "$CONF"

if ! travel exec -T nginx nginx -t; then
  echo "nginx-apply: nginx rechazo la configuracion; se restaura la anterior" >&2
  if [ -f "$BACKUP_DIR/conf" ]; then cp -p "$BACKUP_DIR/conf" "$CONF"; else rm -f "$CONF"; fi
  if [ -f "$BACKUP_DIR/inc" ]; then cp -p "$BACKUP_DIR/inc" "$INC"; else rm -f "$INC"; fi
  exit 1
fi

travel exec -T nginx nginx -s reload
echo "nginx-apply: vhost aplicado ($PHASE)"
