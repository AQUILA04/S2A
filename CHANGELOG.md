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

## [0.2.0] — 2026-03-03 · Story 1.2: Member Management (CRUD)

### Ajouté

#### Base de données
- Migration `supabase/migrations/V002__rbac_and_account_status.sql` :
  - Nouveau type enum `account_status` (`PENDING_ACTIVATION`, `ACTIVE`)
  - Types de rôles redéfinis (`SG_ADJOINT` au lieu de `ADJOINT`, ajout de `TRESORIER_ADJOINT`)

#### Interface Utilisateur et Composants
- Layout du dashboard admin : `app/admin/layout.tsx` (Sidebar + Bottom Nav Responsive)
- Liste paginée des membres : `app/admin/members/page.tsx`
- Formulaires de création et de modification de membre avec validations client/serveur : `app/admin/members/new/page.tsx`, `app/admin/members/[id]/edit/page.tsx`
- Nouveau composant partagé : `components/s2a/status-badge.tsx`

#### Serveur & Logique Métier
- Server Actions CRUD (`getMembers`, `createMember`, `updateMember`, `getMemberById`) via `app/admin/members/actions.ts`
- Écriture d'`AuditLogs` documentée pour les mutations CRUD des membres
- Protection conditionnelle avec Zod Validator dans les Server Actions.

#### Sécurité et Authentification
- Sécurisation du `app/api/auth/[...nextauth]/route.ts` contre la connexion de comptes non activés (statuts bloqués sur `PENDING_ACTIVATION` ou `INACTIVE`)
- `middleware.ts` basé sur token JWT limitant l'accès `/admin/*` aux rôles : SG, SG_ADJOINT, TRESORIER, TRESORIER_ADJOINT, PRESIDENT

#### Tests
- Suite complète de 14 tests pour les actions Serveur et les contraintes Supabase (`__tests__/members.actions.test.ts`)
- Mocks complets pour la session `next-auth` et le client Supabase
- Tests unitaires de la validation Zod, du mapping AuditLogs, et des contraintes d'interdiction de connexion pour le TRESORIER.

### Review de code (AI)
- **H1 (Atomicité)** : Révision de l'atomicité des Server Actions — la documentation a été corrigée pour indiquer l'écriture séquentielle de l'`update()` puis de l'`AuditLog`
- **H2 (Synchronisation Git/Story)** : Les fichiers de migration et middleware ayant clarifié la distinction entre `account_status` (connexion) et `status` (cotisation) ont été formellement validés et reportés dans le tracking du composant de la doc de conception. 
- **M1 (Tests unitaires)** : Assertions strictes ajoutées sur le mapping correct des valeurs de la mutation lors de la structuration de la paie (`old_value` et `new_value`) dans l'objet `AuditLogs`.

## [0.3.0] — 2026-03-04 · Story 1.3: Role-Based Authentication

### Ajouté / Modifié

#### Interface Utilisateur et Composants
- Refonte de `app/login/page.tsx` pour utiliser les composants de l'UI S2A (Card, Input, Button) au lieu d'éléments HTML natifs pour une cohérence visuelle.
- Implémentation de la fonctionnalité de **Déconnexion** via le composant de navigation globale `MainNav` (Desktop et Mobile) appelant `signOut` de NextAuth.

#### Serveur & Logique Métier
- Correction de la hiérarchie des rôles dans `lib/auth/helpers.ts` : les rôles `SG` et `TREASURER` (ainsi que leurs adjoints et le `PRESIDENT`) héritent désormais correctement des droits génériques du rôle `MEMBER`.
- Extraction de la logique `authorize` de NextAuth vers une fonction exportée indépendante `authorizeCredentials` dans `app/api/auth/[...nextauth]/route.ts` pour permettre des tests unitaires fiables sans l'entrave du mock interne de NextAuth.

#### Tests
- Refonte complète de `__tests__/auth.test.ts` (16 tests, 100% passing) :
  - Remplacement des placeholders par de véritables tests ciblant les vérifications de statut de compte (`ACTIVE`, `INACTIVE`, `PENDING_ACTIVATION`) via un mock de Supabase.
  - Couverture complète des règles de redirection du `middleware.ts` en fonction des rôles des utilisateurs (accès aux routes `/admin` bloqué pour un `MEMBER`, etc.).
  - Vérification approfondie du payload des callbacks JWT et Session.

### Sécurité
- Correction d'une vulnérabilité d'Open Redirect (Medium) sur la page de connexion (`app/login/page.tsx`) en imposant la validation du format (chemin relatif strict) via l'URL cible (vérification de `startsWith("/")` et `!startsWith("//")`).

### Review de code (AI)
- **Critical (Tests)** : Les faux tests ont été remplacés par une validation stricte du flux de connexion et de middleware.
- **Medium (Role Inheritance)** : Défaut de la transmission des droits résolu.
- **Medium (UI & Security)** : Open redirect comblé, layout refactorisé avec `S2A` UI system.

---

*Prochaine version : [0.4.0] — Epic 2: Tenant & Agency Management*
