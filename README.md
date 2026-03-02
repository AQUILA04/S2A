# Amicale S2A — Guide de Démarrage

Application de gestion pour l'Amicale S2A — suivi des cotisations, investissements et dépenses du bureau exécutif.

**Stack :** Next.js 15 · TypeScript · Tailwind CSS · Supabase (PostgreSQL) · NextAuth.js

---

## Prérequis

- Node.js 20+
- Un projet [Supabase](https://supabase.com) créé

---

## Installation

```bash
# 1. Cloner le dépôt
git clone <repo-url>
cd S2A

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# → Remplir .env.local avec tes valeurs Supabase et NextAuth
```

### Variables d'environnement (`.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role Supabase (⚠️ confidentielle) |
| `NEXTAUTH_SECRET` | Secret JWT — générer avec `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL de base de l'app (ex: `http://localhost:3000`) |

---

## Base de données

### 1. Appliquer la migration initiale

Copier et exécuter le contenu de `supabase/migrations/V001__initial_schema.sql` dans le **SQL Editor** du dashboard Supabase.

### 2. Créer le compte administrateur (GS)

```bash
npm run seed
```

Ce script est **idempotent** — il ne créera pas de doublon si le compte existe déjà.

Identifiants initiaux :
- **Email :** `gs@amicale-s2a.org`
- **Mot de passe :** `Change-Me-Now-2026!` ← **À changer immédiatement après connexion**

---

## Développement

```bash
npm run dev        # Démarrer le serveur (http://localhost:3000)
npm run test       # Lancer les tests unitaires
npm run lint       # Vérifier le code
npm run build      # Build de production
```

---

## Structure du projet

```
├── app/
│   ├── api/auth/[...nextauth]/  # Configuration NextAuth.js
│   ├── dashboard/               # Page protégée (après connexion)
│   ├── login/                   # Page de connexion
│   └── layout.tsx               # Layout racine
├── lib/
│   ├── auth/helpers.ts          # Fonctions d'auth réutilisables (hash, verify...)
│   └── supabase/client.ts       # Clients Supabase typés (server / public)
├── scripts/
│   └── seed.ts                  # Script de seeding du compte GS
├── supabase/migrations/
│   └── V001__initial_schema.sql # Schéma initial de la base de données
├── types/
│   ├── database.types.ts        # Types TypeScript générés depuis le schéma DB
│   └── next-auth.d.ts           # Augmentation des types NextAuth (role, id)
└── __tests__/                   # Tests unitaires (Jest + ts-jest)
```

---

## Tests

```bash
npm run test            # Tous les tests
npm run test:watch      # Mode watch
```

Couverture actuelle : **43 tests** sur 3 suites (`auth`, `seed`, `database.types`).

---

## Rôles (RBAC)

| Rôle | Description |
|---|---|
| `MEMBER` | Membre standard |
| `SG` | Secrétaire Général — accès complet |
| `PRESIDENT` | Président |
| `TREASURER` | Trésorier |
| `ADJOINT` | Adjoint |

Le rôle est encodé dans le JWT à la connexion et disponible via `session.user.role`.

---

## Sécurité

- Les mots de passe sont hashés avec **bcrypt** (12 rounds) — jamais stockés en clair
- La clé `SUPABASE_SERVICE_ROLE_KEY` ne doit **jamais** être exposée côté client
- Le `NEXTAUTH_SECRET` doit être généré aléatoirement et gardé confidentiel
- Le compte GS initial doit changer son mot de passe à la première connexion
