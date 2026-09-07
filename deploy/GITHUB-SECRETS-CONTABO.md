# GitHub Secrets — Contabo production

Configurer dans **Settings → Secrets and variables → Actions** (repo `AQUILA04/S2A`).

## Secrets obligatoires — App

| Secret | Description | Valeur typique |
|--------|-------------|----------------|
| `SSH_PRIVATE_KEY` | Clé SSH VPS | `~/.ssh/optimizesolux_vps_ed25519` |
| `PROD_SERVER_HOST` | IP Contabo | `169.58.127.90` |
| `PROD_SERVER_USER` | User SSH | `root` |
| `APP_HOST` | Host Traefik | `s2a.optimizesolux.com` |
| `NEXTAUTH_URL` | URL publique | `https://s2a.optimizesolux.com` |
| `NEXTAUTH_SECRET` | Secret JWT | `openssl rand -base64 32` |
| `DB_PASSWORD` | Mot de passe Postgres (sans `$`) | généré localement |
| `DB_USER` | (optionnel) | `s2a` |
| `DB_NAME` | (optionnel) | `s2a` |

## Secrets — Notification Hub

| Secret | Valeur typique |
|--------|----------------|
| `NOTIFICATION_HUB_BASE_URL` | `https://notification-api.optimizesolux.com` |
| `NOTIFICATION_HUB_OAUTH_TOKEN_URI` | `https://auth.optimizesolux.com/realms/notification-hub/protocol/openid-connect/token` |
| `NOTIFICATION_HUB_OAUTH_CLIENT_ID` | `s2a` |
| `NOTIFICATION_HUB_OAUTH_CLIENT_SECRET` | Keycloak client secret |

`NOTIFICATION_HUB_TENANT_ID` optionnel (défaut `s2a`).

## Local

```bash
docker compose up -d
# DATABASE_URL=postgresql://s2a:s2a_dev_password@localhost:5433/s2a
npm run seed
```

Comptes seed : `president@`, `gs@`, `tresorier@`, `tresorier-adjoint@` `@amicale-s2a.org` — mot de passe défaut `Change-Me-Now-2026!`.
