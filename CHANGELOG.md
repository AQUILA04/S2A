# Changelog — Amicale S2A

Toutes les modifications notables sont documentées ici.
Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [0.1.0] — 2026-03-02 · Story 1.1: System Initialization & Super Admin

### Ajouté

#### Infrastructure & Configuration
- Scaffold complet Next.js 15 (App Router, TypeScript, Tailwind CSS, Turbopack)
- `package.json` avec toutes les dépendances : `next`, `next-auth`, `@supabase/supabase-js`, `bcryptjs`, `zod`, `dotenv`
- `tsconfig.json` (app) et `tsconfig.scripts.json` (scripts ts-node) configurés
- `postcss.config.mjs` + `tailwind.config.ts` + `autoprefixer` pour le CSS
- `.gitignore` couvrant `node_modules/`, `.env.local`, `.next/`, logs
- `.env.example` documentant toutes les variables d'environnement requises
- `README.md` avec guide de démarrage rapide pour les développeurs

#### Base de données
- Migration `supabase/migrations/V001__initial_schema.sql` :
  - Extension `uuid-ossp` pour les UUIDs
  - 4 enums PostgreSQL : `member_status`, `member_role`, `payment_channel`, `contribution_status`
  - 6 tables : `Members`, `Contributions`, `BlackoutMonths`, `ProjectInvestments`, `EBExpenses`, `AuditLogs`
  - Contraintes strictes : UUID PKs, `NOT NULL`, `CHECK`, `UNIQUE`, FK avec `ON DELETE CASCADE`
  - Index de performance : status, role, email, year/month, JSONB GIN sur `AuditLogs.metadata`
  - Index partiel `WHERE status = 'VALIDATED'` pour l'unicité des contributions validées

#### Types TypeScript
- `types/database.types.ts` : types stricts pour toutes les tables et enums
- `types/next-auth.d.ts` : augmentation de NextAuth avec `session.user.id` et `session.user.role`

#### Authentification (NextAuth.js)
- `app/api/auth/[...nextauth]/route.ts` :
  - Provider `Credentials` avec validation Zod
  - Vérification bcrypt du mot de passe
  - Guard de démarrage : `NEXTAUTH_SECRET` et `NEXTAUTH_URL` obligatoires
  - Stratégie JWT avec `role` (MemberRole) encodé dans le token
  - Session expirée après 8 heures
  - Erreurs génériques (anti-énumération d'emails)
- `lib/auth/helpers.ts` : fonctions partagées (`hashPassword`, `verifyPassword`, `isAccountActive`, `credentialsSchema`)
- `lib/supabase/client.ts` : clients Supabase typés (service role et anon)

#### Pages
- `app/login/page.tsx` : formulaire de connexion avec messages d'erreur localisés (français)
- `app/dashboard/page.tsx` : page protégée avec redirection si non authentifié

#### Script de seed
- `scripts/seed.ts` : création idempotente du compte Secrétaire Général (GS)
  - Hash bcrypt 12 rounds
  - Compte créé : `gs@amicale-s2a.org` / rôle `SG` / statut `ACTIVE`
  - Log d'audit `SYSTEM_INITIALIZATION` écrit en base

#### Tests
- `jest.config.ts` + suite de 43 tests (3 suites) :
  - `__tests__/auth.test.ts` : hashage, vérification, validation Zod, callbacks JWT/session
  - `__tests__/seed.test.ts` : validation env, payload GS, structure audit log
  - `__tests__/database.types.test.ts` : couverture complète des enums et interfaces

### Sécurité
- Mise à jour de `next` depuis `15.2.1` vers `16.1.6` (correctif CVE-2025-66478 — critique)
- Aucune vulnérabilité détectée (`npm audit`)

### Review de code (AI)
- **H1** : guard `NEXTAUTH_SECRET` manquant → ajouté via `requireEnv()`
- **H2** : message spécifique pour compte INACTIVE → remplacé par erreur générique
- **H3** : contrainte SQL `UNIQUE (member_id, month, year, status)` incorrecte → remplacé par index partiel
- **M1** : helpers de test en doublon → extraits dans `lib/auth/helpers.ts`
- **M2** : `NEXTAUTH_URL` non validé au démarrage → ajouté à `requireEnv()`
- **M3** : `dotenv` utilisé mais non déclaré dans `package.json` → ajouté
- **L2** : accès `session.user.name` sans optional chaining → corrigé
- **L3** : codes d'erreur NextAuth bruts affichés → mappés en messages français

---

*Prochaine version : [0.2.0] — Story 1.2: Member Management CRUD*
