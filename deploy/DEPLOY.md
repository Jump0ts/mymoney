# Despliegue en el servidor doméstico

Requiere: Docker + Docker Compose, Nginx, Certbot, un dominio propio con DNS gestionado en Cloudflare.

## 1. Preparar variables de entorno

Por cada entorno (`pre`, `staging`, `production`), copia el `.env.<entorno>.example` correspondiente a `.env.<entorno>` y rellena contraseñas/secretos reales. **No commitees nunca estos ficheros.**

## 2. Levantar un entorno

```bash
cd deploy
docker compose --env-file .env.pre -p mymoney-pre up -d --build
```

Repite con `.env.staging`/`mymoney-staging` y `.env.production`/`mymoney-prod`. Cada entorno usa su propio puerto y su propia base de datos (ver los ficheros `.env.*.example`).

## 3. Migraciones de base de datos

```bash
docker compose --env-file .env.pre -p mymoney-pre exec api npx prisma migrate deploy
```

## 4. Nginx + HTTPS

1. Copia `nginx/mymoney.conf.example` a `/etc/nginx/sites-available/mymoney.conf`, ajusta `tudominio.com` por tu dominio real, y enlázalo en `sites-enabled`.
2. `sudo nginx -t && sudo systemctl reload nginx`
3. `sudo certbot --nginx -d api-pre.tudominio.com -d api-staging.tudominio.com -d api.tudominio.com`
4. Certbot configura la renovación automática vía systemd timer/cron — verifícalo con `sudo certbot renew --dry-run`.

## 5. DNS dinámico (IP de casa cambia)

Instala `ddclient` apuntando al proveedor DNS de Cloudflare, actualizando el registro A de tu dominio cada vez que cambie tu IP pública. Documentación: https://github.com/ddclient/ddclient

## 6. Router

Abre el puerto 443 (y 80 temporalmente para la validación de Certbot) hacia la IP local de este servidor.
