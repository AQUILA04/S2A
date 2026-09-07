# Déploiement Contabo — Amicale S2A

Application Next.js sur VPS Contabo, TLS via Traefik partagé (`traefik-public`). La base PostgreSQL reste sur **Supabase cloud** — aucun conteneur DB sur le VPS.

## Prérequis VPS

1. Docker Engine installé
2. Traefik sur le réseau externe `traefik-public` (Let's Encrypt HTTP-01)
3. DNS **A** record `s2a` → IP Contabo (grey cloud / DNS only)

## Première installation (manuelle)

```bash
# Sur le VPS (root)
bash setup-server.sh

# Depuis votre machine — copier les fichiers deploy
scp -r deploy/* root@VPS_IP:/opt/optimizesolux/s2a/

# Sur le VPS
cd /opt/optimizesolux/s2a
cp .env.prod.example .env.prod
# Éditer .env.prod (Supabase, NextAuth, Notification Hub, APP_HOST)
bash deploy.sh
```

## Déploiement automatisé (GitHub Actions)

1. Configurer les secrets GitHub (voir `GITHUB-SECRETS-CONTABO.md`)
2. Créer l'environnement `prod` dans GitHub → Settings → Environments
3. Lancer **Actions → CD Contabo → Run workflow** ou pousser sur `release/**`

Le workflow build l'image GHCR, pousse sur le registry, puis SSH + `docker compose up`.

## Variables critiques

| Variable | Notes |
|----------|-------|
| `APP_HOST` | Host Traefik (ex. `s2a.optimizesolux.com`) |
| `NEXTAUTH_URL` | **Doit être identique** à `https://${APP_HOST}` — sinon login CSRF / redirection |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_*` | Baked au build Docker — le CD les passe en build-args |
| `NOTIFICATION_HUB_*` | OTP activation membres — OAuth client credentials vers le hub partagé |

## Notification Hub

L'app appelle `POST /v1/otp/send` et `/v1/otp/verify` sur le hub partagé (client `lib/services/notification-hub.client.ts`). En prod :

- `NOTIFICATION_HUB_OAUTH_ENABLED=true` (forcé par `init.sh`)
- Le conteneur S2A sort vers `notification-api.optimizesolux.com` en HTTPS (pas besoin du réseau Docker `optimizesolux-common`)
- Le client OAuth `s2a` doit être provisionné dans Keycloak realm `notification-hub`

## Post-déploiement

1. Migrations Supabase (SQL Editor, ordre V001 → V003)
2. Seed admin (une fois) : depuis machine locale avec `.env.local` prod ou script manuel
3. Changer le mot de passe `gs@amicale-s2a.org` après première connexion

## Structure

```
deploy/
  docker-compose.prod.yml   # Stack prod (app seule)
  .env.prod.example         # Template secrets
  setup-server.sh           # Bootstrap VPS
  deploy.sh                 # Pull + up
  init.sh                   # Génère .env.prod depuis env (CI)
  update-deploy.sh          # Rsync + deploy (CI helper)
```

## Dépannage login

Si la connexion réussit mais la redirection échoue :

- Vérifier `NEXTAUTH_URL=https://...` (pas `http`, pas trailing slash)
- Vérifier que le domaine Traefik correspond à `APP_HOST`
- Cookies : domaine HTTPS obligatoire en prod

## Dépannage OTP / activation

- Logs conteneur : `docker logs s2a-app`
- Erreur 401 hub → vérifier `NOTIFICATION_HUB_OAUTH_*` et client Keycloak `s2a`
- `OTP_NOT_CONFIGURED` → hub OTP internal / SMS Brevo non configuré (`OTP_PROVIDER=internal`, `SMS_PROVIDER=brevo`)
