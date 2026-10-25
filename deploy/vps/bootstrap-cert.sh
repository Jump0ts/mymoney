#!/usr/bin/env bash
# Pide los certificados de Let's Encrypt que falten (la API y, si hay WEB_DOMAIN, la web) y activa HTTPS.
# Es idempotente: un dominio que ya tiene certificado no se vuelve a pedir. Cada dominio debe tener su registro DNS
# apuntando a este VPS (sin proxy) ANTES de ejecutarlo: Let's Encrypt lo comprueba por HTTP.
# La renovacion posterior la hace el contenedor certbot de travel_agency (renueva todo lo que hay en su volumen).
#
# Uso (en el servidor, como el usuario de despliegue):
#   cd /home/deploy/mymoney/release && DOMAIN=mymoney-api.ejemplo.dev WEB_DOMAIN=mymoney.ejemplo.dev ./bootstrap-cert.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
TRAVEL_DIR="${TRAVEL_DIR:-/opt/travel-agency}"
DOMAIN="${DOMAIN:?Falta DOMAIN}"
WEB_DOMAIN="${WEB_DOMAIN:-}"
DOMAIN_REGEX='^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
for D in "$DOMAIN" ${WEB_DOMAIN:+"$WEB_DOMAIN"}; do
  [[ "$D" =~ $DOMAIN_REGEX ]] || { echo "dominio no valido: $D" >&2; exit 1; }
done

travel() { docker compose -f "$TRAVEL_DIR/docker-compose.yml" "$@"; }

echo "==> 1/3 Vhosts HTTP para el desafio de Let's Encrypt"
DOMAIN="$DOMAIN" WEB_DOMAIN="$WEB_DOMAIN" ./nginx-apply.sh

echo "==> 2/3 Certificados"
for D in "$DOMAIN" ${WEB_DOMAIN:+"$WEB_DOMAIN"}; do
  if travel exec -T nginx test -f "/etc/letsencrypt/live/$D/fullchain.pem"; then
    echo "$D ya tiene certificado"
    continue
  fi
  echo "Pidiendo el certificado de $D"
  travel run --rm -T --no-deps --entrypoint certbot certbot certonly \
    --webroot -w /var/www/certbot -d "$D" \
    --agree-tos --register-unsafely-without-email --non-interactive
done

echo "==> 3/3 Activando HTTPS"
DOMAIN="$DOMAIN" WEB_DOMAIN="$WEB_DOMAIN" ./nginx-apply.sh
