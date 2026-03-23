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

## [0.10.0] — 2026-03-15 · Story 3.1: Member Dashboard (3 Counters Layout)

### Ajouté / Modifié

#### Interface Utilisateur et Composants
- Layout du dashboard membre (`app/dashboard/page.tsx` et `dashboard-content.tsx`) affichant 3 compteurs financiers (Total Versé, Fonds de Fonctionnement 2/12, Solde Épargne 10/12).
- Création de composants UI réutilisables : `KpiCard` pour les compteurs et `ArrearsBanner` pour les alertes de retard de paiement.
- Gestion de l'état "Inactif" : application d'un filtre en niveaux de gris sur le dashboard et affichage d'une modale bloquante exigeant le paiement des arriérés.
- Intégration du motif d'interaction "Pull-to-refresh" (`components/s2a/pull-to-refresh.tsx`) pour recharger les données du membre sur mobile.

#### Serveur & Logique Métier
- Nouveau moteur de calcul de solde complet (`getMemberBalance` dans `lib/services/balance.service.ts`) gérant :
  - Le calcul du temps écoulé depuis l'adhésion en excluant les mois de trêve (`BlackoutMonths`).
  - Le calcul de la dette théorique.
  - L'allocation au prorata 10/12 et 2/12 sur les cotisations validées.
  - La déduction des investissements de projets approuvés pour obtenir le solde disponible.
  - Le calcul des mois d'impayés pour déterminer dynamiquement l'état `ACTIVE` ou `INACTIVE` (seuil de 24 mois).

#### Tests
- Suite complète de tests unitaires (`__tests__/balance.service.test.ts`) pour valider spécifiquement chaque règle mathématique et calendaire du moteur de calcul financier.

### Review de code (AI)
- **H1 (UX Pull-to-refresh)** : Implémentation manuelle avec `TouchEvent` non conforme aux recommandations du ticket → refactorisation intégrale avec `@react-spring/web` et `@use-gesture/react` pour une physique et une fluidité natives.
- **H2 (Type Safety/Crash)** : Risque de blocage lors du rendu côté serveur (`session.user.id`) → sécurisé par un chaînage optionnel.
- **Mediums** : Nettoyage d'imports inutilisés (`revalidatePath`, `Button`) et mise à jour de la documentation du suivi des fichiers pour le composant de `pull-to-refresh`.

## [0.11.0] — 2026-03-20 · Story 3.2: Balance Calculation Engine Integration

### Ajouté / Modifié

#### Serveur & Logique Métier
- Sécurisation RBAC serveur pour l'action `getMemberBalanceAction` afin de prévenir les vulnérabilités IDOR (accès limité au propriétaire ou à un administrateur privilégié).
- Optimisation des performances via `Promise.all` pour récupérer de manière concurrente les données financières : `BlackoutMonths`, `Contributions`, et `ProjectInvestments`.
- Protection stricte de l'algorithme financier (`balance.service.ts`) : itération `Date.UTC` pour la chronologie d'adhésion, gestion des divisions par zéro (`monthly_fee = 0`), et filtrage exclusif des statuts `VALIDATED` pour les cotisations et les investissements.
- Déclaration de l'API Contract avec le schéma strict `memberBalanceConfigSchema` (Zod).

#### Interface Utilisateur et Composants
- Intégration de l'Action serveur sécurisée (`getMemberBalanceAction`) directement dans le Server Component `DashboardContent`. L'interface utilise les données serveur sans aucun calcul côté client.

#### Tests
- Extension de la suite de tests unitaires (`__tests__/balance.service.test.ts`) avec 9 tests supplémentaires de cas aux limites : adhésion en année bissextile (29 Février), historique ancien (>10 ans), vérification de la limite frontière des 23 et 24 mois pour l'inactivité, surpaiement, et listes d'exclusion (`BlackoutMonths`) non séquentielles.

### Review de code (AI)
- **H1 (Sécurité/Corruption DB)** : Capture explicite et traitement des erreurs de réponse Supabase sur les promesses concurrentes du moteur de calcul. Empêche la défaillance silencieuse qui évaluait `totalPaid` à `0`, générant de faux arriérés d'impayés.
- **H2 (UX/Action orpheline)** : L'action sécurisée `getMemberBalanceAction` n'était utilisée par aucune interface. Le composant `DashboardContent` a été refactorisé pour l'utiliser à la place d'un appel direct au service.
- **M1 (Filtrage de base de données)** : Refonte de la requête `ProjectInvestments` qui omettait de filtrer par statut `VALIDATED`, risquant de déduire de l'épargne les projets rejetés ou en attente.
- **M2 (Tests)** : Ajout d'une suite de tests en échec dédiés pour garantir que l'algorithme `balance.service` intercepte et lève correctement les exceptions Supabase (Erreurs DB).
- **L1 (Code propre)** : Remplacement des multiplicateurs absolus (`2/12` et `10/12`) par des constantes nommées claires en entête de service.

---

## [0.12.0] — 2026-03-21 · Story 3.3: Interactive Contribution Calendar

### Ajouté / Modifié

#### Interface Utilisateur et Composants
- Création du composant `ContributionCalendar` permettant aux membres de visualiser leur historique complet de cotisations.
- Grille de rendu native purement CSS (CSS Grid) adaptée au responsive mobile (cible tactile minimale 44x44px) sans dépendre de bibliothèques tierces lourdes.
- Code de couleurs sémantique (design system S2A) pour distinguer les mois payés (`bg-success`), impayés (`bg-destructive`), et suspendus (`bg-muted`/strikethrough avec tooltip explicative).
- Intégration immédiate sous la rangée de KPI du membre dans `DashboardContent`.

#### Serveur & Logique Métier
- Extension du moteur de calcul (`balance.service.ts`) : génération chronologique d'un tableau `timeline` complet pour peupler le calendrier, de la date d'adhésion spécifique jusqu'au mois en cours.
- Consolidation du contrat de données via l'export du `timelineEntrySchema` sous format Zod.

#### Tests
- Suite de tests de composants UI (`__tests__/components/contribution-calendar.test.tsx`) avec React Testing Library.
- Actualisation du client `jest.config.ts` pour le support interactif des composants d'interface via l'environnement `jsdom`.
- Nouvelles assertions dans le service backend afin de garantir la structuration précise du `timeline`.

### Review de code (AI)
- **H1 (Asynchronisme / UI bloquante)** : La fonction de chargement visuel (`Skeleton`) du composant calendrier était neutralisée par le rendu statique `await` du Server Component parent. Extrait et export de `ContributionCalendarSkeleton` pour permettre de futures délimitation de rendu via `Suspense`.
- **M1 (Code Mort)** : La "prop" `memberId` acceptée par l'interface `ContributionCalendarProps` a été rattachée fonctionnellement à l'attribut DOM `data-member-id` prévenant une erreur algorithmique d'isolation et respectant la consigne d'extensibilité.
- **M2 (Transparence versioning)** : Correction documentaire de l'historique d'édition Git (`package.json`, `package-lock.json`).

---

## [0.13.0] — 2026-03-21 · Story 3.4: Arrears Alert & Inactive Status Handling

### Ajouté / Modifié

#### Interface Utilisateur et Composants
- `ArrearsBanner` : Création d'un composant de bannière d'alerte (`bg-destructive`) persistante indiquant le montant précis des arriérés pour les membres actifs.
- `InactiveAlertBox` : Création d'une modale bloquante plein écran signalant le statut "Inactif" et guidant vers la page de paiement.
- `DashboardContent` : Intégration des composants d'alerte, incluant le passage de l'interface en niveaux de gris (`grayscale`, `pointer-events-none`) pour bloquer toute interaction non liée au paiement en cas d'inactivité.

#### Serveur & Logique Métier
- `lib/auth/guards.ts` : Nouveau guard d'autorisation serveur (`requireActiveMember`) sécurisant les futures Server Actions (notamment les investissements) contre les membres de statut `INACTIVE`, consolidant le principe The Server-Side Integrity.

#### Tests
- Suite complète de tests RTL (`react-testing-library`) pour `ArrearsBanner` et `InactiveAlertBox` validant l'accessibilité textuelle et les liens (CTAs) de régularisation.
- Accompagné du transfert et de la validation explicite des tests chronologiques (`unpaidMonths >= 24`) depuis l'intégration préalable du moteur financier (Story 3.2).

### Review de code (AI)
- **H1 (Fausse Déclaration Fichier)** : Le rapport de développement incluait le fichier de test `balance.service.test.ts` sans modification Git. Les assertions de la limite d'inactivité ayant déjà été codées en 3.2, la trace documentée a été rectifiée.
- **M1 (Nesting HTML Invalide)** : Correction d'une invalidité HTML dans Next.js App Router où le CTA `InactiveAlertBox` insérait une balise `<button>` à l'intérieur d'un composant `<Link>` (lequel générait déjà une balise `<a>`).
- **M2 (Visual Redundancy)** : Masquage de la bannière `ArrearsBanner` lorsque le membre est inactif (l'écran d'alerte complet est suffisamment prioritaire).
- **L1 (Code style)** : Standardisation des classes dynamiques conditionnelles React via l'utilitaire local `cn()` dans le composant principal du dashboard.

---

## [0.14.0] — 2026-03-23 · Story 1.6: Mass Member Import (CSV/Excel)

### Ajouté / Modifié

#### Interface Utilisateur et Composants
- Création du composant interactif `MassImportDialog` (`app/admin/members/components/mass-import-dialog.tsx`) permettant d'importer des fichiers membres (CSV/Excel) avec un tableau de bord pré-import distinguant instantanément lignes valides et erreurs de forme.
- Intégration de la librairie de parsing client-side `xlsx` (SheetJS) qui soulage la bande passante serveur et évite les limites d'upload de Vercel (1MB Server Action).
- Découpage par lots (chunking de 500) à la volée des payloads JSON côté client pour fiabiliser les soumissions backend très volumineuses.

#### Serveur & Logique Métier
- Action serveur sécurisée `bulkImportMembers` (`actions.ts`) avec validation croisée : seules les entrées intègres aboutissent, avec rapport précis par ligne des rejets (doublons d'email ou de téléphone).
- Stratégie de Chunking transactionnelle : découpage des appels API en lots de 50 pour contourner l'effondrement REST de type `HTTP 414 URI Too Long` lors du scan expansif des duplicatas avec `.or()`.
- Dynamisation cryptographique native insérant un UUID aléatoire sécurisé distinct par individu au statut `PENDING_ACTIVATION`.
- Intégration fluide de la routine `parseFullName` (`lib/utils/name-parser.ts`) qui orchestre le fallback intelligent de prénoms composites et noms de familles fusionnés depuis Nom Complet si les champs cibles sont vides.
- Finalisation de l'audit tracking sur la constante événementielle `MASS_IMPORT_MEMBERS`.

#### Tests
- Déploiement d'une suite de robustesse `__tests__/utils/name-parser.test.ts` blindant la scission verbale des identités et les entrées muettes asymptotiques.
- Construction du rapporteur et validateur d'état d'import `__tests__/actions/bulk-import-members.test.ts` (Mock global NextAuth et abstraction logicielle de Supabase).

### Review de code (AI)
- **CRITICAL (Scalability/API Limit)** : L'action de check `bulkImportMembers` générait originellement un flux filtrant cumulatif provoquant inéluctablement un crash REST 414 sur les imports étendus. Refactorisation défensive en tranches (chunks) strictes de 50 unités.
- **HIGH (Data Integrity)** : Refus passif du standard d'acceptation 2, ignorant aveuglément la colonne `ADRESSE`. Inclusion formelle du point de collecte au sein de l'adaptateur UI tout en le sanitairement isolant du flux DB statique.
- **HIGH (Security/Flaw)** : Neutralisation d'une menace de mot de passe générique partagé pour toute l'enveloppe importée, et déport de l'instanciation de sel au cœur de la boucle itérative.
- **MEDIUM (Server Payloads)** : Fractionnement exclusif d'upload client épaulé d'un partitionnement logiciel des instances envoyées pour neutraliser les restrictions strictes Vercel/Next.js de 1 MB.

---

*Prochaine version (En revue) : [0.7.0] — Story 2.2: Member Payment Declaration Wizard*

