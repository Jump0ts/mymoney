# MyMoney on the DigitalOcean VPS

Production backend + database on the droplet that already hosts `travel_agency`; the web app on Cloudflare Pages.
This folder contains everything needed to deploy. Steps marked 🔴 in section 3 change real infrastructure, so they are done one at a
time, each with explicit confirmation.

```
 Mobile / Web (Cloudflare Pages)
        │ HTTPS
        ▼
 DNS (Cloudflare) ──► VPS 139.59.143.82 ── DO firewall: only 22, 80, 443
                       ┌──────────────────────────────────────────────┐
                       │ travel_agency's nginx (owns 80/443)          │
                       │   travel.…       → travel app                │
                       │   mymoney-api.…  → /api/ and /health only    │
                       └───────────────┬──────────────────────────────┘
                          network `travel-agency_default` (nginx ↔ api only)
                       ┌───────────────▼──────────────┐   network `internal` (no Internet)
                       │ api (Node, non-root, 200 MB) ├──────────► db (Postgres, no published ports)
                       └──────────────────────────────┘
```

## 1. Security principles

| What | How |
|---|---|
| Secrets | Only in `~/mymoney/.env.production` **on the server** (mode 600), generated there and never displayed. GitHub only holds a deploy SSH key (secret) and non-sensitive data (variables). Nothing goes into the repo: `.gitignore` blocks `.env.*` (except `*.example`), `*.pem`, `*.key` and `*.sql.gz`. |
| Exposure | Only `https://mymoney-api…/api/*` and `/health` are published. The database publishes no ports and lives on a network with no Internet access. Any other path returns 404. |
| Registration | `REGISTRATION_ENABLED=false`: nobody else can create accounts. It is switched on only for as long as needed to create your own. |
| Brute force | nginx limits `/api/auth/` to 10 attempts/min per IP (429) and `/api/` to 10 req/s. |
| CORS | Only the exact origin of the web app (`CORS_ORIGINS`, no wildcards; the deploy script validates it). |
| Containers | API runs as non-root with a read-only filesystem, no capabilities, `no-new-privileges` and a 200 MB limit. Image built from `package-lock.json`. |
| Supply chain | GitHub Actions pinned by commit SHA; image deployed by **digest** with its *attestation* verified before deploying; private GHCR package. |
| CI SSH key | A dedicated key with `restrict` and a **forced command**: it can only request `deploy <digest> <user>` (the GHCR token travels over stdin and the registry session is closed right after the pull). No shell, no tunnels, no scp. The image repository is pinned on the server. |
| Approval | Deployment is **automatic but gated by a human**: every push to `master` that changes what is deployed builds the image, and the deploy job then **waits for approval** from the required reviewer of the protected `production` environment (administrators cannot bypass it). The environment admits only the `master` branch, and `master` itself only accepts pull requests with passing CI. A deployment can also be launched by hand (`workflow_dispatch`) to roll back. |
| Web | Cloudflare Pages headers generated at build time: CSP without `unsafe-inline`/`unsafe-eval` for scripts (one hash per script), it can only connect to the API, HSTS, no framing, no referrer. |
| Data | Backups with 600/700 permissions, taken before every migration, downloaded to your PC with SHA-256 verification. |

## 2. What lives where (server, user `deploy`)

The `deploy` user has no `sudo`, so everything lives in its home directory (mode 750):

```
~/mymoney/
  .env.production     secrets (600). NEVER overwritten and never leaves the server
  bin/ssh-entry.sh    forced command of the CI key (555). You install it once; CI cannot change it
  release/            deployment files extracted from each verified image (compose, deploy.sh, nginx, backups)
  state/              current/previous image (current, previous, image.env)
  backups/            daily/weekly dumps
/opt/travel-agency/nginx/conf.d/zz-mymoney-api.conf   vhost (added; nothing of travel is touched)
```

## 3. First-time setup (once)

Recommended order. 🔴 = changes real infrastructure.

**3.1 🔴 DNS (Cloudflare).** `A` and `AAAA` records for `mymoney-api` pointing to the droplet's IP/IPv6 (the same ones as
`travel`), **DNS only** mode (grey cloud), just like travel. The web app will use a different name (3.8).

**3.2 On your PC: deploy SSH key (new, used only for this).**

```powershell
ssh-keygen -t ed25519 -N '""' -C mymoney-ci -f $env:USERPROFILE\.ssh\mymoney_deploy_ci
```
The private key is pasted into the GitHub secret (3.5) and afterwards kept in your password manager or deleted from the PC.

**3.3 🔴 Server: directory and secrets.** Secrets are written straight into the file, without going through the screen or the shell history:

```bash
ssh -i ~/.ssh/do_travel_agency deploy@139.59.143.82
umask 077
mkdir -p ~/mymoney/bin ~/mymoney/state ~/mymoney/backups
{
  echo "DOMAIN=mymoney-api.josanfersal.dev"
  echo "POSTGRES_USER=mymoney"
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
  echo "POSTGRES_DB=mymoney_production"
  echo "JWT_SECRET=$(openssl rand -hex 48)"
  echo "CORS_ORIGINS=https://mymoney.josanfersal.dev"
  echo "REGISTRATION_ENABLED=true"      # temporary: until you create your account (3.7)
} > ~/mymoney/.env.production
chmod 600 ~/mymoney/.env.production
```
Store `POSTGRES_PASSWORD` and `JWT_SECRET` in your password manager by **reading them yourself** from the file on the server
(`less ~/mymoney/.env.production`), never in a chat or a ticket. Losing `JWT_SECRET` only signs everyone out.

**3.4 🔴 Server: forced command for the CI key.**

```bash
# From your PC (admin key): copy the script and make it read-only
scp -i ~/.ssh/do_travel_agency deploy/vps/bin/ssh-entry.sh deploy@139.59.143.82:~/mymoney/bin/ssh-entry.sh
ssh -i ~/.ssh/do_travel_agency deploy@139.59.143.82 'chmod 555 ~/mymoney/bin/ssh-entry.sh'

# On the server: add the CI public key with restrictions (a single line)
echo 'restrict,command="/home/deploy/mymoney/bin/ssh-entry.sh" <contents of mymoney_deploy_ci.pub>' >> ~/.ssh/authorized_keys
```
Check that the key does **not** give a shell: `ssh -i ~/.ssh/mymoney_deploy_ci deploy@139.59.143.82 id` must answer `ssh-entry: orden no permitida`
(the script's error messages are in Spanish).

**3.5 GitHub.** *Settings → Environments → New → `production`*, with *Deployment branches* restricted to `master`.
In that environment:

| Type | Name | Value |
|---|---|---|
| Secret | `DEPLOY_SSH_KEY` | the **private** key `mymoney_deploy_ci` |
| Variable | `DEPLOY_HOST` | `139.59.143.82` |
| Variable | `DEPLOY_USER` | `deploy` |
| Variable | `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 139.59.143.82`, **after checking the fingerprint** `SHA256:Comn+KcaSl0+Rby9Kl1xqAVR4fB8DaBamWeXPaTjbFE` (on the server: `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`) |
| Variable | `API_DOMAIN` | `mymoney-api.josanfersal.dev` |

**3.6 🔴 First deployment and certificate.** GitHub only knows the workflow once it is on `master`, so these changes must reach `master`
first (release PR). That merge triggers the first deployment: approve it in *Actions → Deploy API* when it asks for review. The first run ends red at the final check (there is no
HTTPS yet): that is expected. Then:

```bash
cd ~/mymoney/release && DOMAIN=mymoney-api.josanfersal.dev ./bootstrap-cert.sh
curl -fsS https://mymoney-api.josanfersal.dev/health
```
From then on travel's certbot renews the certificate by itself. If `nginx -t` rejects anything, `nginx-apply.sh` restores the previous
configuration and **does not reload**: travel is not affected.

**3.7 Your account, and closing registration.** Create your user from the app, then close registration:

```bash
sed -i 's/^REGISTRATION_ENABLED=.*/REGISTRATION_ENABLED=false/' ~/mymoney/.env.production
cd ~/mymoney/release && ./deploy.sh "$(cat ../state/current)"
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://mymoney-api.josanfersal.dev/api/auth/register \
  -H 'Content-Type: application/json' -d '{}'     # 403
```

**3.8 Web app on Cloudflare Pages** (no tokens in GitHub: it is connected from the Cloudflare dashboard).
*Workers & Pages → Create → Pages → Connect to Git* → this repository:

| Setting | Value |
|---|---|
| Production branch | `master` |
| Build command | `npm ci && npm run build:web --workspace=apps/mobile` |
| Build output directory | `apps/mobile/dist` |
| Variables (Production) | `NODE_VERSION=24`, `EXPO_PUBLIC_API_URL=https://mymoney-api.josanfersal.dev`, `EXPO_PUBLIC_APP_ENV=production` |
| Preview deployments | **Disabled** (there is no API for them and they would expose unreviewed builds) |
| Custom domain | `mymoney.josanfersal.dev` (must match `CORS_ORIGINS`) |

The build writes `dist/_headers` with the computed CSP (`apps/mobile/scripts/web-headers.js`). If you change the API's domain,
only `EXPO_PUBLIC_API_URL` needs to change.

**3.9 🔴 Backups.** On the server (the `deploy` user's cron):

```bash
crontab -e
15 3 * * * BACKUP_DIR=$HOME/mymoney/backups ENV_FILE=$HOME/mymoney/.env.production COMPOSE_FILE=$HOME/mymoney/release/docker-compose.yml $HOME/mymoney/release/backup/backup.sh production >> $HOME/mymoney-backup.log 2>&1
```
On your PC, an SSH alias and a scheduled download (see [../BACKUP.md](../BACKUP.md), in Spanish):

```
# ~/.ssh/config
Host mymoney-vps
  HostName 139.59.143.82
  User deploy
  IdentityFile ~/.ssh/do_travel_agency
  IdentitiesOnly yes
  StrictHostKeyChecking yes
```
```powershell
powershell -File deploy\backup\pull-backups.ps1 -Server mymoney-vps -RemoteRoot /home/deploy/mymoney/backups
```
Known limitation: this download uses the admin key (which gives a shell as `deploy`). It lives on your PC; protect the disk with BitLocker.

**3.10 Monitoring.** Add the check `https://mymoney-api.josanfersal.dev/health` to DigitalOcean (Uptime). travel's 85 % memory alert
already covers the droplet: if it fires repeatedly, upgrade to 2 GB.

## 4. Operations

```bash
# Status and logs (no secrets)
docker ps --filter name=mymoney-prod --format 'table {{.Names}}\t{{.Status}}'
docker logs --tail 50 mymoney-prod-api-1

# Roll back to the previous version: Actions → Deploy API → Run workflow → image_tag = sha-xxxxxxx (also needs the approval)
# Apply .env.production changes without changing the image:
cd ~/mymoney/release && ./deploy.sh "$(cat ../state/current)"
# Rotate JWT_SECRET (signs everyone out): edit the file and repeat the line above.
```
A deployment does, in this order: check configuration → backup → migrate → start the new API → nginx. If the new API does not become
healthy it rolls back to the previous one by itself. Migrations only move forward: write them so they stay compatible with the previous API version.

## 5. Accepted risks and limits

- **Shared nginx**: an nginx mistake also affects travel. That is why the vhost is validated with `nginx -t` and reverted on failure, the API is resolved on every request (if MyMoney is down only it returns 502) and the file loads after travel's `site.conf` (travel stays the default server).
- **Same droplet**: a MyMoney failure (memory) can affect travel. Memory limits on both containers and an 85 % alert.
- **`docker` group**: the `deploy` user is equivalent to root on the machine. That is why the CI key has a forced command and the admin key never leaves your PC.
- The image carries the deployment files (no secrets): the server only runs what comes out of your CI, verified by digest.
- Backups are not encrypted on the server (they contain the same as the live database); on your PC they are protected by BitLocker.

## 6. Tests

```bash
bash deploy/vps/vps.test.sh      # forced command, nginx-apply and deploy.sh with mocked docker/stat
bash deploy/backup/backup.test.sh
```
CI additionally builds the image, starts it with the same restrictions as production and checks health, a non-root user, closed registration (403) and 401 without a token.
