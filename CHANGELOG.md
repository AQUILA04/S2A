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

## [0.4.0] — 2026-03-04 · Story 1.4: Legacy Data Import Tool

### Ajouté / Modifié

#### Interface Utilisateur et Composants
- Création de la page multi-étapes `app/admin/import/page.tsx` permettant un flux d'import intuitif (Upload -> Aperçu -> Résultat).
- Intégration du composant de glisser-déposer (Dropzone) interactif.
- Ajout d'une table d'aperçu affichant le statut de validation pré-import (OK/Erreur) par ligne.
- Mise à jour du composant de navigation globale `MainNav` pour inclure un lien vers la nouvelle page d'import.

#### Serveur & Logique Métier
- Nouveau module de parsing `lib/import/parser.ts` gérant les fichiers `.csv`, `.xls`, et `.xlsx` via `xlsx` (SheetJS).
- Actions serveur sécurisées (`app/admin/import/actions.ts`) :
  - `previewImport` : Résolution des numéros de téléphone vers les ID membres et détection préventive des doublons existants en base de données.
  - `confirmImport` : Insertion atomique par lot transactionnelle des contributions historiques validées, et génération centralisée du log d'audit.
- Utilisation de `Zod` pour valider rigoureusement le format de la matrice d'import.

#### Tests
- Création de la suite complète `__tests__/import.test.ts` (Coverage exhaustif sur les actions de parsing et serveur).
- Tests garantissant le filtrage des doublons intra-fichier et l'atomisation des insertions.

### Review de code (AI)
- **Critical (DB Transaction)** : Refactorisation de l'insertion aléatoirement divisée (`BATCH_SIZE`) vers une insertion atomique de tableau unique traitée de façon transactionnelle par PostgREST avec une limite de sécurité à 5000 lignes (`MAX_INSERT_LIMIT`).
- **High (Performance)** : Optimisation sévère de la requête de détection de doublons en associant la vérification par `member_ids` combinés aux `years` extraits du payload, empêchant de fatales surcharges mémoire ou time-outs sur de larges jeux historiques.
- **High (UI UX)** : Correction de la table de prévisualisation (Aperçu) qui affichait un statut 'OK' trompeur pour des membres dont le numéro était absent de la BD. L'UI prévient dorénavant explicitement des échecs d'assignation.
- **Medium (Timestamps)** : Ajout de la génération du champ obligatoire `validated_at` au sein de la transaction `confirmImport`.

---

## [0.5.0] — 2026-03-05 · Story 1.5: Audit Logging Middleware

### Ajouté

#### Audit Logging
- Nouveau module utilitaire `lib/audit/logger.ts` avec la fonction exportée `logAudit(payload: AuditLogPayload)` :
  - `AuditActionType` : type union strict (`"CREATE_MEMBER" | "UPDATE_MEMBER" | "LEGACY_IMPORT"`) garantissant la cohérence des types d'actions à la compilation.
  - Insertion typée dans la table `AuditLogs` via `satisfies AuditLogInsert` (Supabase TypeScript généré).
  - Guard de protection anti-corruption : retour anticipé avec `console.warn` si `actor_id` est vide.
  - Erreur non-fatale : tout échec d'insertion est capturé et consigné sans interrompre l'action parente.

### Modifié

#### Serveur & Logique Métier
- `app/admin/members/actions.ts` : remplacement des blocs manuels `supabase.from("AuditLogs").insert(...)` dans `createMember` et `updateMember` par des appels standardisés à `logAudit`.
- `app/admin/import/actions.ts` : remplacement du bloc `AuditLogs` brut dans `confirmImport` par un appel à `logAudit`.

#### Tests
- `__tests__/audit.logger.test.ts` (nouveau) : 3 tests couvrant l'insertion correcte, la gestion non-fatale des erreurs DB, et le guard `actor_id` vide.
- `__tests__/members.actions.test.ts` : assertions mises à jour pour valider les appels à `logAudit` (mock Jest) avec les payloads exacts (`actor_id`, `action_type`, `metadata`).
- `__tests__/import.test.ts` : assertions ajoutées pour vérifier l'appel à `logAudit` avec `action_type: "LEGACY_IMPORT"` et `actor_id` correct.

### Review de code (AI)
- **H1** : `action_type` typé `string` → remplacé par le type union strict `AuditActionType`.
- **H2** : Cast `as any` sur l'insertion Supabase → remplacé par `satisfies AuditLogInsert` (vérification structurelle à la compilation).
- **M1** : Guard `actor_id` manquant → ajout d'une vérification au début de `logAudit` avec retour anticipé.
- **M2** : Chemin d'import relatif `"../supabase/client"` → corrigé en alias `"@/lib/supabase/client"`.

---

## [0.6.0] — 2026-03-05 · Story 2.1: Payment Channel Configuration

### Ajouté / Modifié

#### Interface Utilisateur et Composants
- `PaymentChannelsClient` : gestion interactive des canaux avec interrupteurs d'activation (ToggleSwitch), formulaires d'édition rapide, et retour visuel (CopyButton).
- Ajout de "Payments" dans la navigation globale `main-nav.tsx`.
- Ajout d'une notification (Toast) pour les retours d'actions CRUD en temps réel.
- Hook réutilisable `hooks/use-payment-channels.ts` pour la récupération client-side des canaux actifs.

#### Base de données
- Migration `V003__payment_channels.sql` pour la table `PaymentChannels`.
- RLS strict implémenté permettant la configuration en écriture uniquement par le `TREASURER`, `TRESORIER_ADJOINT` et `PRESIDENT`.
- Trigger pour auto-màj du `updated_at`.
- Script de seed avec les 4 canaux officiels d'Amicale S2A (Flooz, Mixx, Virement, Western Union) en statut neutre originel (`is_active: false`).

#### Serveur & Logique Métier
- Actions serveur isolées dans `app/admin/settings/payment-channels/actions.ts` : CRUD standard + Toggle d'activation.
- Export centralisé des schémas de validation backend dans `schema.ts`.
- Maintien de l'intégrité référentielle en favorisant la désactivation virtuelle (`is_active = false`) à l'opposé de purges absolues.
- Utilisation de `logAudit` pour tous les appels de mutation.

#### Tests
- Création de la suite `__tests__/payment-channels.actions.test.ts` validant 24 scénarios complets au niveau des schémas de données `Zod`, du contrôle des accès `NextAuth` et de l'intégration `Supabase`.
- Simulation de contextes de mutation pour assurer le correct mapping des champs `old_value` et `new_value` enregistrés par l'Audit Logger.

### Review de code (AI)
- **H1 (Architecture Violation)** : Refactorisation impérative de `deletePaymentChannel` interdisant techniquement la commande `.delete()` au profit d'une invalidation de statut pour préserver l'intégrité de l'historique de paiement des membres.
- **H2 (UUID Validation)** : Injection du schéma `paymentChannelIdSchema` pour rejeter silencieusement toute payload dont l'ID est invalide sans casser drastiquement le runtime SQL Supabase.
- **M1 (Imports Serveur dynamiques)** : Standardisation locale des imports d'actions serveur dans l'arbre client via appels statiques globaux.
- **M2 (Formatage Instructions)** : Application css de la classe Tailwind `whitespace-pre-wrap` au bloc descriptif pour faire survivre nativement les sauts de ligne lors du rendu des informations transactionnelles.
- **L1 (Localisation)** : Remplacement des termes résiduels isolés ("Déconnexion/Quitter") par "Log Out" sur l'interface principale de menu.

---

## [0.8.0] — 2026-03-09 · Story 2.3: Executive Board Direct Recording (Cash)

### Ajouté / Modifié

#### Interface Utilisateur et Composants
- `RecordPaymentDialog` : Composant modal (Dialog) permettant aux membres du bureau exécutif d'enregistrer directement un paiement en espèces, depuis la liste des membres (`app/admin/members/page.tsx`). Multi-sélection de mois via une grille de boutons.
- Warning en temps réel dans le formulaire si le montant saisi ne correspond pas à la somme attendue pour le nombre de mois sélectionnés.
- Validation client et serveur (Zod) autorisant un `reference_id` vide *uniquement* pour le canal `CASH`.

#### Serveur & Logique Métier
- Action serveur `recordDirectPayment` (`app/admin/payments/actions.ts`) permettant l'enregistrement sécurisé (backend).
- Logique de distribution ("Bulk Splitting") : un paiement multi-mois (ex: N mois sélectionnés) est automatiquement divisé et inséré sous forme de N enregistrements distincts dans la table `Contributions`. Le reliquat (reste de division) est ajouté au premier mois.
- Statut automatique : les paiements directs sont immédiatement enregistrés avec le statut `VALIDATED`.
- Génération d'un log d'audit centralisé via `logAudit`.
- Revalidation du path `/admin/members` post-succès.

#### Tests
- Création de `__tests__/payments.actions.test.ts` pour valider la logique de découpe proportionnelle des paiements (`split amount evenly`) et la gestion des restes arithmétiques, ainsi que les guards RBAC.
- Extension de `__tests__/contribution.schema.test.ts` : valide l'acceptation de canal CASH sans identifiant de référence, et le rejet de tableau de mois passés/futurs illogiques.

### Review de code (AI)
- **H1 (Sécurité/RBAC)** : Restriction d'accès corrigée. Seuls `TREASURER`, `TRESORIER_ADJOINT` et `PRESIDENT` sont autorisés à utiliser la mutation (SG et SG_ADJOINT exclus conformément à l'architecture financière stricte).
- **H2 (Type Safety/Crash)** : L'action d'audit `RECORD_DIRECT_PAYMENT` était manquante dans le type union `AuditActionType`, ce qui a fait échouer le build TypeScript, corrigé dans `lib/audit/logger.ts`.
- **M1 (Nesting HTML Invalide)** : Correction d'une invalidation W3C/React où la modale interactive `RecordPaymentDialog` était imbriquée accidentellement dans une balise `<Link>` globale sur la rangée utilisateur. 

---

## [0.9.0] — 2026-03-10 · Story 2.4: Validation Console

### Ajouté / Modifié

#### Interface Utilisateur et Composants
- Nouvelle page `app/admin/validation/page.tsx` pour l'affichage des déclarations de paiement en attente.
- Implémentation du "Pull-to-Refresh" natif (`components/s2a/pull-to-refresh.tsx`) utilisant les événements tactiles et `router.refresh()` pour le rechargement mobile.
- Tiroir d'action contextuel (`ValidationDrawer`) encapsulé dans un client autonome (`ValidationRow`) utilisant `useOptimistic` pour la suppression instantanée (et l'annulation en cas d'erreur) des lignes validées ou rejetées sans round-trip serveur.
- État vide immersif et squelette de chargement interactif (`loading.tsx`).
- Ajout de l'entrée "Console de Validation" avec badge dynamique dans le `MainNav`.

#### Serveur & Logique Métier
- Actions serveur dédiées (`getPendingContributions`, `validatePayment`) dans `app/admin/validation/actions.ts`.
- Intégration du RBAC strict bloquant techniquement et visuellement la validation pour les profils `SG` ou `MEMBER`.
- Traçabilité complète via l'Audit Logger (`VALIDATE_PAYMENT`), avec obligation de fournir un motif en cas de rejet (enregistré dans le `metadata.new_value`).
- Revalidation automatique des caches pour `/admin/validation`, `/admin/members` et `/dashboard`.

#### Base de données & Types
- Restauration de l'inférence stricte de types de `@supabase/supabase-js` en injectant systématiquement les dépendances omises dans le type généré (`Views`, `Functions`, `CompositeTypes`, et la structure exacte `GenericRelationship`).
- Suppression absolue des forçages de type (`as any`, `as unknown`).

#### Tests
- Couverture approfondie via 17 nouveaux tests Jest (`__tests__/validation.actions.test.ts`), valident les cas aux limites du cache, des autorisations RBAC et des schémas.

### Review de code (AI)
- **H1 (UI Optimiste Incomplète)** : L'implémentation de base ne masquait que le bouton, corrompant la fluidité de l'action. Refactorisation dans une structure parente qui désactive instantanément toute la ligne de table concernée.
- **H2 (UX Pull-to-refresh Oublié)** : Le Critère d'Acceptation 5 n'était pas réalisé. Création d'un wrapper client interceptant les `TouchEvents` et un retour de friction mathématique pour rafraîchir le client.
- **M1 (Type Safety Silencieuse)** : L'inférence TypeScript de Supabase évaluait les requêtes comme retournant du type `never`, court-circuitant la détection des erreurs. Correction globale du fichier de type `database.types.ts` pour restaurer la sécurité type stricte dans l'intégralité du projet.

---

*Prochaine version (En revue) : [0.7.0] — Story 2.2: Member Payment Declaration Wizard*
