#!/usr/bin/env bash
# Pide el certificado de Let's Encrypt para la API (una sola vez, tras crear el registro DNS) y activa HTTPS.
# La renovacion posterior la hace el contenedor certbot de travel_agency (renueva todo lo que hay en su volumen).
#
# Uso (en el servidor, como el usuario de despliegue):
#   cd /home/deploy/mymoney/release && DOMAIN=mymoney-api.ejemplo.dev ./bootstrap-cert.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
TRAVEL_DIR="${TRAVEL_DIR:-/opt/travel-agency}"
DOMAIN="${DOMAIN:?Falta DOMAIN}"
[[ "$DOMAIN" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] || { echo "DOMAIN no es valido" >&2; exit 1; }

echo "==> 1/3 Vhost HTTP para el desafio de Let's Encrypt"
./nginx-apply.sh

echo "==> 2/3 Pidiendo el certificado de $DOMAIN"
docker compose -f "$TRAVEL_DIR/docker-compose.yml" run --rm -T --no-deps --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot -d "$DOMAIN" \
  --agree-tos --register-unsafely-without-email --non-interactive

echo "==> 3/3 Activando HTTPS"
./nginx-apply.sh
