# GitHub Secrets — Contabo production

Configurer dans **Settings → Secrets and variables → Actions** (repo `AQUILA04/S2A`).

Créer aussi l'environnement **`prod`** (Settings → Environments) pour le job CD.

## Secrets obligatoires — App

| Secret | Description | Exemple / source |
|--------|-------------|------------------|
| `SSH_PRIVATE_KEY` | Clé privée SSH (ed25519) pour le VPS | `~/.ssh/optimizesolux_vps_ed25519` |
| `PROD_SERVER_HOST` | IP ou hostname VPS Contabo | `169.58.127.90` |
| `PROD_SERVER_USER` | Utilisateur SSH | `root` |
| `APP_HOST` | Host public Traefik | `s2a.optimizesolux.com` |
| `NEXTAUTH_URL` | URL base app (HTTPS) | `https://s2a.optimizesolux.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (serveur only) | Dashboard → Settings → API |
| `NEXTAUTH_SECRET` | Secret JWT | `openssl rand -base64 32` |

## Secrets obligatoires — Notification Hub (OTP activation)

| Secret | Description | Valeur typique |
|--------|-------------|----------------|
| `NOTIFICATION_HUB_BASE_URL` | API hub (HTTPS) | `https://notification-api.optimizesolux.com` |
| `NOTIFICATION_HUB_OAUTH_TOKEN_URI` | Token OAuth client credentials | `https://auth.optimizesolux.com/realms/notification-hub/protocol/openid-connect/token` |
| `NOTIFICATION_HUB_OAUTH_CLIENT_ID` | Client Keycloak realm `notification-hub` | `s2a` |
| `NOTIFICATION_HUB_OAUTH_CLIENT_SECRET` | Secret du client OAuth | Keycloak / Vault |

`NOTIFICATION_HUB_TENANT_ID` est optionnel (défaut `s2a` dans `init.sh`).  
`NOTIFICATION_HUB_OAUTH_ENABLED=true` est forcé en prod par `init.sh`.

### Prérequis common-infra

Le client OAuth `s2a` doit exister dans le realm **notification-hub** (`optimize-common-infra`) avec le rôle `notification-sender` et `tenant_id=s2a`. Après ajout du realm : `install.sh --force-update keycloak` sur le VPS.

## Secrets optionnels

| Secret | Description | Défaut |
|--------|-------------|--------|
| `DEPLOY_PATH` | Chemin sur le VPS | `/opt/optimizesolux/s2a` |
| `NOTIFICATION_HUB_TENANT_ID` | Tenant hub | `s2a` |
| `GHCR_TOKEN` | PAT `read:packages` si pull privé depuis VPS | GITHUB_TOKEN suffit si image publique |

## PowerShell — définir les secrets

```powershell
Get-Content -Raw C:\Users\kahonsu\.ssh\optimizesolux_vps_ed25519 | gh secret set SSH_PRIVATE_KEY -R AQUILA04/S2A
gh secret set PROD_SERVER_HOST -R AQUILA04/S2A -b "169.58.127.90"
gh secret set PROD_SERVER_USER -R AQUILA04/S2A -b "root"
gh secret set APP_HOST -R AQUILA04/S2A -b "s2a.optimizesolux.com"
gh secret set NEXTAUTH_URL -R AQUILA04/S2A -b "https://s2a.optimizesolux.com"
gh secret set NOTIFICATION_HUB_BASE_URL -R AQUILA04/S2A -b "https://notification-api.optimizesolux.com"
gh secret set NOTIFICATION_HUB_OAUTH_TOKEN_URI -R AQUILA04/S2A -b "https://auth.optimizesolux.com/realms/notification-hub/protocol/openid-connect/token"
gh secret set NOTIFICATION_HUB_OAUTH_CLIENT_ID -R AQUILA04/S2A -b "s2a"
gh secret set NOTIFICATION_HUB_OAUTH_CLIENT_SECRET -R AQUILA04/S2A -b "YOUR_CLIENT_SECRET"
# + NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, NEXTAUTH_SECRET depuis .env.local
```

## Fichier hors git (recommandé)

Résumer les valeurs dans `~/Documents/S2A-contabo-secrets.md` — **ne jamais committer**.

## DNS (manuel)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `s2a` | IP Contabo | DNS only (grey) |

Let's Encrypt HTTP-01 via Traefik nécessite que le proxy Cloudflare soit désactivé jusqu'à obtention du certificat.

## GHCR

Image : `ghcr.io/aquila04/s2a:latest`

Le workflow CD publie avec `GITHUB_TOKEN`. Sur le VPS, `docker login ghcr.io` n'est requis que si le package est privé.
