#!/usr/bin/env bash
# Comando forzado de la clave SSH de la CI. Se instala UNA vez en el servidor (ver README.md) como
# /home/deploy/mymoney/bin/ssh-entry.sh con permisos 555 y se enlaza desde authorized_keys:
#
#   restrict,command="/home/deploy/mymoney/bin/ssh-entry.sh" ssh-ed25519 AAAA... mymoney-ci
#
# Con `restrict` y este comando, esa clave NO da shell, ni tuneles, ni scp: lo unico que puede hacer es
# pedir "deploy <digest> <usuario-github>" con un token de GHCR por stdin. El repositorio de imagenes
# esta fijado aqui, asi que aunque la clave se filtrase solo permitiria desplegar imagenes que la CI
# de este repo haya publicado (y que ademas hay que poder descargar con el token).
#
# Variable de pruebas: MYMONEY_BASE (por defecto /home/deploy/mymoney).
set -euo pipefail

IMAGE_REPO="ghcr.io/jump0ts/mymoney-api"
BASE="${MYMONEY_BASE:-/home/deploy/mymoney}"

die() { echo "ssh-entry: $*" >&2; exit 1; }

# Validacion estricta de TODA la orden (bash `=~` no deja que un salto de linea cuele nada tras el final).
CMD="${SSH_ORIGINAL_COMMAND:-}"
if ! [[ "$CMD" =~ ^deploy\ (sha256:[0-9a-f]{64})\ ([A-Za-z0-9-]{1,39})$ ]]; then
  die "orden no permitida"
fi
DIGEST="${BASH_REMATCH[1]}"
GH_USER="${BASH_REMATCH[2]}"
IMAGE_REF="$IMAGE_REPO@$DIGEST"

# El token de GHCR (de vida corta, lo da GitHub Actions) llega por stdin: nunca en argumentos ni en disco.
TOKEN=""
IFS= read -r -t 10 TOKEN || [[ -n "$TOKEN" ]] || die "falta el token en stdin"
[[ -n "$TOKEN" ]] || die "falta el token en stdin"

trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
printf '%s' "$TOKEN" | docker login ghcr.io -u "$GH_USER" --password-stdin >/dev/null
unset TOKEN

docker pull --quiet "$IMAGE_REF" >/dev/null
# Ya no hace falta la sesion en el registro: se cierra antes de seguir.
docker logout ghcr.io >/dev/null 2>&1 || true
trap - EXIT

# Los ficheros de despliegue (compose, deploy.sh, nginx, backups) salen de la propia imagen verificada.
NEW="$BASE/release.new"
rm -rf "$NEW"
mkdir -p "$NEW"
CID="$(docker create "$IMAGE_REF")"
trap 'docker rm "$CID" >/dev/null 2>&1 || true' EXIT
docker cp "$CID:/opt/deploy/." "$NEW/"
docker rm "$CID" >/dev/null
trap - EXIT

rm -rf "$BASE/release.old"
if [ -d "$BASE/release" ]; then mv "$BASE/release" "$BASE/release.old"; fi
mv "$NEW" "$BASE/release"
chmod -R go-w "$BASE/release"

exec "$BASE/release/deploy.sh" "$IMAGE_REF"
