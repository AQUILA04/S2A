# 🎨 Spécification Visuelle et Parcours Utilisateurs : Amicale S2A

**Auteur :** Manus, Directeur Artistique & Designer Produit
**Date :** 02 Mars 2026
**Version :** 1.0

---

## 1. Introduction

Ce document détaille la spécification visuelle complète de la plateforme **Amicale S2A**. Il a pour objectif de traduire les exigences fonctionnelles (PRD) et l'architecture technique en une expérience utilisateur tangible, cohérente et esthétique. En adoptant une philosophie **Mobile-First**, chaque écran, composant et interaction est pensé pour une utilisation intuitive sur smartphone, tout en garantissant une parfaite lisibilité et une confiance absolue dans la manipulation des données financières.

La direction artistique s'articule autour de trois piliers :

*   **Clarté Financière :** Les chiffres clés (soldes, dettes, épargne) sont hiérarchisés et immédiatement accessibles.
*   **Confiance et Rigueur :** L'identité visuelle, sobre et professionnelle, utilise la couleur pour renforcer le sens des actions (validation, alerte, succès) et garantir un audit visuel permanent.
*   **Accessibilité :** La navigation est conçue pour être simple, avec des zones de clic généreuses et des contrastes élevés, conformément aux standards d'accessibilité web.

## 2. Parcours Utilisateurs (User Flows)

### 2.1 Profil : Membre

Le membre est au cœur de la plateforme. Son parcours est optimisé pour la consultation rapide de sa situation financière et la déclaration de ses cotisations. L'objectif est de lui fournir une visibilité totale et en temps réel, sans effort.

#### 2.1.1 Onboarding et Connexion

**Objectif :** Permettre à un nouveau membre de créer son mot de passe de manière sécurisée et aux membres existants d'accéder à leur espace.

**Écrans :**

1.  **Écran de Connexion (`/login`)**
2.  **Écran de Création de Mot de Passe (`/auth/setup-password`)**

| Écran | Composants Visuels Clés | Interactions Notables |
| :--- | :--- | :--- |
| **Connexion** | - Logo "Amicale S2A"<br>- Champs : "Email ou Téléphone", "Mot de passe"<br>- Bouton CTA Principal : "Se Connecter" (`#002366`)<br>- Lien secondaire : "Mot de passe oublié ?" | - Validation en temps réel des formats d'input.<br>- Affichage d'un message d'erreur explicite en cas d'échec. |
| **Création de Mot de Passe** | - Message de bienvenue : "Bienvenue, [Prénom Nom] !"<br>- Champs : "Nouveau mot de passe", "Confirmer le mot de passe"<br>- Indicateur de force du mot de passe.<br>- Bouton CTA : "Activer mon compte" | - Le lien d'accès à cette page est unique et à usage unique.<br>- Redirection automatique vers le Dashboard après succès. |

#### 2.1.2 Dashboard Principal

**Objectif :** Offrir une vue synthétique et immédiate de la santé financière du membre dès la connexion.

**Écran :**

1.  **Dashboard Membre (`/dashboard`)**

| Composant | Spécification Visuelle | Logique Associée |
| :--- | :--- | :--- |
| **Bannière d'Arriérés** | - Barre persistante en haut de l'écran.<br>- Couleur : Rouge (`#DC3545`).<br>- Texte : "Attention : Vous avez des arriérés de [Montant] CFA." | - N'est visible que si `Arrears > 0`. |
| **Header "Ma Situation"** | - Trois compteurs circulaires ou cartes distinctes, utilisant la police Monospace pour les chiffres.<br>1. **Total Versé :** Bleu Marine (`#002366`)<br>2. **Fonds de Fonctionnement (2/12) :** Gris Foncé<br>3. **Solde d'Épargne (10/12) :** Or Métallique (`#D4AF37`) | - Les données sont calculées côté serveur (`getMemberBalance`).<br>- Un effet "Shimmer/Skeleton" est affiché pendant le chargement. |
| **Alerte Inactivité** | - Si le statut est `INACTIVE`, l'interface passe en niveaux de gris.<br>- Un encadré rouge proéminent affiche : "Action Requise : Votre compte est inactif. Veuillez régulariser vos arriérés."<br>- Le bouton CTA principal devient "Régulariser ma situation". | - Bloque l'accès aux autres fonctionnalités (investissement, etc.). |
| **Calendrier des Cotisations** | - Grille interactive des mois depuis la date d'adhésion.<br>- **Vert (`#28A745`) :** Payé et validé.<br>- **Rouge (`#DC3545`) :** Impayé/Arriéré.<br>- **Gris barré (`#E9ECEF`) :** Mois de "Blackout". | - Au clic sur un mois "Blackout", une infobulle apparaît : "Activités suspendues par décision du Bureau." |
| **Bouton d'Action Flottant (FAB)** | - Icône "+" dans un cercle.<br>- Position : En bas à droite de l'écran. | - Ouvre l'assistant de déclaration de paiement. |

#### 2.1.3 Déclaration d'une Cotisation

**Objectif :** Guider le membre à travers un processus simple et sans ambiguïté pour déclarer un paiement.

**Écrans (Assistant/Wizard) :**

1.  **Sélection du Canal (`/payment/new/select-channel`)**
2.  **Information de Paiement (`/payment/new/info`)**
3.  **Confirmation (`/payment/new/confirm`)**
4.  **Statut en Attente (`/payment/pending`)**

| Étape | Composants Visuels Clés | Interactions Notables |
| :--- | :--- | :--- |
| **1. Sélection Canal** | - Grille d'icônes représentant les canaux (Flooz, T-Money, Virement, Western Union, Espèces).<br>- Chaque icône est un large bouton cliquable. | - L'état `hover`/`active` est clairement visible. |
| **2. Info Paiement** | - Affiche le numéro de compte ou de téléphone spécifique au canal choisi.<br>- Un bouton "Copier" flottant est positionné juste à côté de chaque information sensible. | - Le bouton "Copier" affiche une notification "Copié !" après le clic. |
| **3. Confirmation** | - Champ de texte unique : "Référence de la transaction".<br>- Bouton CTA : "Déclarer mon paiement". | - Le champ est obligatoire pour tous les canaux sauf "Espèces". |
| **4. Statut Attente** | - Écran de confirmation avec un visuel clair (ex: une icône d'horloge).<br>- Texte : "Paiement en cours de validation."<br>- Rappel de la référence saisie. | - L'utilisateur peut rafraîchir la page pour voir le statut mis à jour. |

#### 2.1.4 Consultation des Archives

**Objectif :** Permettre un accès facile et centralisé à tous les documents officiels de l'association.

**Écran :**

1.  **Archives des AG (`/assemblies`)**

| Composant | Spécification Visuelle | Interactions Notables |
| :--- | :--- | :--- |
| **Liste des AG** | - Liste chronologique des Assemblées Générales.<br>- Chaque élément affiche : Titre de l'AG, Date.<br>- Icônes distinctes pour télécharger les rapports (Moral, Financier, Activité) au format PDF. | - Le téléchargement se lance directement au clic sur l'icône. |

### 2.2 Profil : Trésorier

Le trésorier est le garant de l'intégrité financière. Son parcours est axé sur la validation des transactions, l'enregistrement des paiements directs et l'importation des données historiques. L'interface doit être efficace, sécurisée et fournir un maximum de contexte pour chaque décision.

#### 2.2.1 Vue d'Ensemble du Bureau Exécutif (EB)

**Objectif :** Donner au trésorier un aperçu immédiat de l'état de la trésorerie et des actions en attente.

**Écran :**

1.  **Dashboard EB (`/eb/dashboard`)**

| Composant | Spécification Visuelle | Logique Associée |
| :--- | :--- | :--- |
| **KPIs Globaux** | - Cartes d'information en haut de page.<br>- **Trésorerie Opérationnelle :** Montant total disponible pour les dépenses.<br>- **Total Épargné (Membres) :** Somme de l'épargne de tous les membres.<br>- **Validations en Attente :** Compteur avec un badge numérique rouge. | - Ces chiffres sont agrégés sur l'ensemble de la base de données. |
| **Console de Validation (Aperçu)** | - Une liste des 3-5 dernières déclarations de paiement en attente.<br>- Chaque élément affiche : Nom du membre, Montant, Canal.<br>- Un bouton "Voir tout" mène à la console complète. | - La liste est un lien direct vers la console de validation. |

#### 2.2.2 Console de Validation

**Objectif :** Fournir un outil efficace pour vérifier et statuer sur les paiements déclarés par les membres.

**Écran :**

1.  **Console de Validation (`/eb/validation`)**

| Composant | Spécification Visuelle | Interactions Notables |
| :--- | :--- | :--- |
| **File d'attente** | - Liste verticale des paiements en attente.<br>- Chaque item : Nom du membre, Montant, Canal, Référence de la transaction, Date de déclaration. | - Au clic, un tiroir (drawer) ou un modal s'ouvre avec les détails. |
| **Tiroir d'Action** | - Affiche en grand la **Référence de Transaction** avec un bouton "Copier".<br>- Deux boutons d'action principaux :<br>  - **Approuver** (Vert, `#28A745`)<br>  - **Rejeter** (Rouge, `#DC3545`) | - Si "Rejeter" est cliqué, un champ de texte ou une liste déroulante "Motif du rejet" devient visible et obligatoire.<br>- Une fois l'action effectuée, l'item disparaît de la liste et une notification "toast" confirme l'opération (ex: "Paiement de [Nom] validé et logué."). |

#### 2.2.3 Importation des Données Historiques

**Objectif :** Permettre l'importation en masse des cotisations antérieures à la mise en place de la plateforme.

**Écran :**

1.  **Importation (`/eb/import`)**

| Composant | Spécification Visuelle | Interactions Notables |
| :--- | :--- | :--- |
| **Zone d'Upload** | - Zone de glisser-déposer (drag-and-drop) pour les fichiers Excel/CSV.<br>- Un bouton "Sélectionner un fichier" est également disponible. | - Le système valide le format du fichier avant l'upload. |
| **Prévisualisation** | - Après l'upload, une table affiche les données extraites.<br>- Les lignes avec des erreurs (ex: format de date incorrect, membre inconnu) sont surlignées en rouge. | - Le trésorier peut corriger les données en ligne ou télécharger un rapport d'erreurs. |
| **Bouton d'Importation** | - Bouton "Importer et Recalculer les Soldes".<br>- Désactivé tant qu'il y a des erreurs bloquantes. | - Une confirmation modale demande de re-confirmer l'action, précisant son caractère irréversible. |

#### 2.2.4 Enregistrement d'un Paiement Direct

**Objectif :** Permettre au trésorier (ou autre membre du bureau) d'enregistrer directement un paiement, typiquement pour les espèces.

**Écran :**

1.  **Nouvel Enregistrement (`/eb/record-payment`)**

| Composant | Spécification Visuelle | Interactions Notables |
| :--- | :--- | :--- |
| **Formulaire** | - Champ de recherche pour sélectionner le **Membre**.<br>- Champs : **Montant**, **Mois/Année de cotisation**, **Canal de Paiement**.<br>- Champ optionnel : **Référence de transaction**. | - Le paiement est automatiquement marqué comme `VALIDATED`.<br>- L'action est enregistrée dans le journal d'audit. |

### 2.3 Profil : Président

Le président a un rôle de supervision et de gouvernance. Son interface lui donne accès aux outils de gestion stratégique, comme la configuration du calendrier global et la gestion des investissements, en plus des capacités de validation du trésorier.

#### 2.3.1 Gestion des Mois de "Blackout"

**Objectif :** Permettre au président de suspendre les cotisations pour des périodes spécifiques, affectant le calcul de la dette pour tous les membres.

**Écran :**

1.  **Calendrier Global (`/eb/settings/calendar`)**

| Composant | Spécification Visuelle | Interactions Notables |
| :--- | :--- | :--- |
| **Grille Annuelle** | - Une grille affichant les 12 mois pour une année sélectionnée.<br>- Chaque mois est un bouton "toggle".<br>- **Actif :** Couleur de fond neutre.<br>- **Inactif (Blackout) :** Gris barré (`#E9ECEF`). | - Le changement est sauvegardé automatiquement.<br>- Une notification "toast" confirme : "Calendrier mis à jour. Le recalcul des soldes est en cours."<br>- L'action est loguée dans l'audit. |

#### 2.3.2 Gestion des Investissements

**Objectif :** Enregistrer les investissements réalisés par les membres à partir de leur épargne disponible.

**Écran :**

1.  **Gestion des Investissements (`/eb/investments`)**

| Composant | Spécification Visuelle | Interactions Notables |
| :--- | :--- | :--- |
| **Formulaire d'Enregistrement** | - Champ de recherche pour sélectionner le **Membre**.<br>- Affichage du **Solde d'Épargne Disponible** du membre sélectionné.<br>- Champs : **Nom du Projet**, **Montant Investi**, **Date**. | - Le système vérifie en temps réel que `Montant Investi <= Solde d'Épargne Disponible`.<br>- Le bouton de soumission est désactivé si la condition n'est pas remplie. |
| **Liste des Investissements** | - Tableau récapitulatif de tous les investissements enregistrés.<br>- Colonnes : Membre, Projet, Montant, Date. | - La liste est consultable et filtrable. |

#### 2.3.3 Gestion des Dépenses de Fonctionnement

**Objectif :** Permettre au bureau d'enregistrer les dépenses courantes de l'association.

**Écran :**

1.  **Dépenses du Bureau (`/eb/expenses`)**

| Composant | Spécification Visuelle | Interactions Notables |
| :--- | :--- | :--- |
| **Formulaire de Dépense** | - Champs : **Description**, **Montant**, **Catégorie** (ex: Location, Logistique), **Date**.<br>- Champ optionnel pour uploader un **justificatif** (reçu). | - La dépense est directement déduite du fonds de roulement global. |
| **Historique des Dépenses** | - Tableau des dépenses enregistrées. | - Permet de garder une trace claire de l'utilisation des fonds de fonctionnement. |

### 2.4 Profil : Secrétaire Général (SG)

Le Secrétaire Général est responsable de la gestion administrative des membres et de la communication officielle. Son interface est centrée sur le registre des membres et la publication des documents d'Assemblée Générale.

#### 2.4.1 Gestion du Registre des Membres

**Objectif :** Permettre au SG de créer, modifier et gérer le statut des membres de l'association.

**Écran :**

1.  **Registre des Membres (`/eb/members`)**

| Composant | Spécification Visuelle | Interactions Notables |
| :--- | :--- | :--- |
| **Liste des Membres** | - Tableau avec les colonnes : Nom, Prénom, Email, Téléphone, Date d'adhésion, Statut (`ACTIVE`/`INACTIVE`).<br>- Un bouton "Ajouter un membre" est visible en haut. | - La liste est consultable, triable et filtrable par statut. |
| **Formulaire d'Ajout/Modification** | - Un modal ou une page dédiée avec les champs du membre.<br>- Champs : `first_name`, `last_name`, `email`, `phone`, `join_date`, `monthly_fee`.<br>- Le rôle (`role`) est assigné via une liste déroulante. | - À la création, le système envoie un lien d'activation au nouveau membre pour qu'il configure son mot de passe.<br>- Toute modification est enregistrée dans le journal d'audit. |

#### 2.4.2 Gestion des Assemblées Générales (AG)

**Objectif :** Créer les événements d'AG et y attacher les rapports officiels pour consultation par les membres.

**Écran :**

1.  **Gestion des AG (`/eb/assemblies`)**

| Composant | Spécification Visuelle | Interactions Notables |
| :--- | :--- | :--- |
| **Formulaire de Création d'AG** | - Champs : **Titre de l'AG**, **Date**.<br>- Zones d'upload pour les rapports : Rapport Moral, Rapport Financier, Rapport d'Activité. | - Le format accepté est le PDF.<br>- Une fois créée, l'AG et ses documents apparaissent dans l'espace "Archives" des membres. |

### 2.5 Parcours Transverse : Audit

**Objectif :** Fournir aux membres du bureau un accès transparent et sécurisé à l'historique de toutes les actions administratives.

**Écran :**

1.  **Journal d'Audit (`/eb/audit-log`)**

| Composant | Spécification Visuelle | Interactions Notables |
| :--- | :--- | :--- |
| **Journal des Logs** | - Tableau chronologique des actions.<br>- Colonnes : **Date/Heure**, **Acteur** (qui a fait l'action), **Action** (ex: `VALIDATE_PAYMENT`, `UPDATE_MEMBER`), **Détails** (metadata). | - Une barre de recherche et des filtres permettent de trier par acteur, type d'action ou plage de dates.<br>- Le clic sur une ligne peut afficher les détails complets de la modification (ancienne vs nouvelle valeur). |

## 3. Conclusion

Cette spécification visuelle constitue le plan directeur pour le développement de l'interface utilisateur de la plateforme Amicale S2A. En respectant scrupuleusement ces directives, l'équipe de développement s'assurera de produire une expérience utilisateur cohérente, intuitive et alignée avec les objectifs stratégiques du projet : la transparence financière, la rigueur administrative et la simplicité d'utilisation pour chaque membre, quel que soit son rôle. Chaque composant, couleur et interaction a été défini pour renforcer la confiance et l'efficacité, créant ainsi un outil puissant et agréable à utiliser pour la gestion de l'association.
