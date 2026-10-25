# Backups de la base de datos

Protege el entorno **production** (`mymoney-prod`). Los scripts aceptan `pre` y `staging` como parametro por si hace falta.

```
SERVIDOR (IP-DEL-SERVIDOR)                        ESTE PC (Windows)
backup.sh  (cron, 03:15)                        pull-backups.ps1  (Programador de tareas, 04:00)
  pg_dump -> gzip -> /var/backups/mymoney/  --ssh-->  %USERPROFILE%\MyMoneyBackups\
  14 diarios + 8 semanales (domingos)               verifica SHA-256, retencion propia,
                                                    NUNCA replica los borrados del servidor
```

La copia del PC es lo que te salva si muere el disco del servidor. No cubre un desastre que afecte a toda la casa (robo, incendio): si algun dia quieres eso, la ampliacion natural es subir tambien a la nube con `rclone`.

## 1. En el servidor

```bash
cd /ruta/a/mymoney && git pull
chmod +x deploy/backup/*.sh
sudo mkdir -p /var/backups/mymoney && sudo chown "$USER" /var/backups/mymoney

# Prueba manual (necesita deploy/.env.production y el stack mymoney-prod levantado)
./deploy/backup/backup.sh production
ls -lh /var/backups/mymoney/production/daily

# Programarlo cada noche
crontab -e
15 3 * * * /ruta/a/mymoney/deploy/backup/backup.sh production >> "$HOME/mymoney-backup.log" 2>&1
```

Si `backup.sh` falla (Postgres caido, volcado vacio o cortado a mitad) sale con error y **no guarda nada**: nunca deja un fichero roto que parezca un backup.

## 2. En este PC

Clave SSH para que la tarea programada no pida contrasena:

```powershell
ssh-keygen -t ed25519
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh usuario@IP-DEL-SERVIDOR "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
ssh -o BatchMode=yes usuario@IP-DEL-SERVIDOR echo ok     # debe imprimir "ok" sin pedir nada
```

Primera descarga a mano y despues programarla:

```powershell
powershell -File deploy\backup\pull-backups.ps1 -Server usuario@IP-DEL-SERVIDOR

schtasks /Create /SC DAILY /ST 04:00 /TN "MyMoney backup pull" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File G:\Desktop\Proyectos\mymoney\deploy\backup\pull-backups.ps1 -Server usuario@IP-DEL-SERVIDOR"
```

- El PC tiene que estar encendido a esa hora. En el Programador de tareas activa "Ejecutar la tarea lo antes posible si se omitio un inicio programado".
- El script sale con error (la tarea aparece como fallida) si el backup mas reciente tiene mas de 36 h: significa que el servidor ha dejado de generar copias.
- Los backups contienen tus finanzas y los hashes de las contrasenas: activa BitLocker en el disco donde se guardan.

## 3. Comprobar que se pueden restaurar (una vez al mes)

Un backup que nunca se ha restaurado no es un backup. En el servidor:

```bash
./deploy/backup/restore-test.sh production
```

Carga el ultimo backup en un Postgres desechable (no toca la base real) y compara el numero de filas por tabla.

## 4. Restaurar de verdad (desastre)

```bash
cd deploy
# 1. Levanta solo la base de datos (si es un servidor nuevo: configura .env.production antes)
docker compose --env-file .env.production -p mymoney-prod up -d db

# 2. (Si el backup esta en este PC) copialo al servidor:  scp fichero.sql.gz usuario@IP-DEL-SERVIDOR:/tmp/

# 3. Cargalo
gunzip -c /tmp/mymoney-production-AAAAMMDD-HHMMSS.sql.gz | \
  docker compose --env-file .env.production -p mymoney-prod exec -T db \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'

# 4. Levanta la API
docker compose --env-file .env.production -p mymoney-prod up -d
```

El volcado incluye la tabla de migraciones de Prisma, asi que no hace falta `migrate deploy`.

## Lo que el backup NO incluye

- **Los ficheros `.env.*`** (contrasena de Postgres, `JWT_SECRET`). Guardalos en un gestor de contrasenas. Perder `JWT_SECRET` solo cierra las sesiones abiertas; perder la contrasena de Postgres no importa si restauras en una base nueva.
- Certificados de Let's Encrypt y configuracion de Nginx: se regeneran siguiendo `DEPLOY.md`.

## Pruebas de los scripts

```bash
bash deploy/backup/backup.test.sh                        # backup.sh con un docker simulado
```
```powershell
Invoke-Pester deploy/backup/pull-backups.Tests.ps1      # pull-backups.ps1 con ssh/scp simulados
```

`restore-test.sh` necesita Docker real: es la prueba de extremo a extremo, y se ejecuta en el servidor.
