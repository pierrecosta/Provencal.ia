# Cahier des Charges Fonctionnel — Portail Culturel Provençal

**Date :** 14/04/2026
**Statut :** Validé pour développement
**Périmètre :** Contraintes utilisateurs, règles fonctionnelles, parcours et accessibilité

> Ce document est la **référence unique** pour toutes les contraintes fonctionnelles et utilisateurs de l'application Provençal.ia. Il ne contient aucune information technique (stack, API, SQL, infrastructure). Pour les spécifications techniques, se reporter au [cahier-des-charges-technique.md](cahier-des-charges-technique.md).

---

## 1. Présentation du projet

### 1.1 Vision

Création d'un portail sobre et éditorial dédié à la valorisation de la langue provençale (toutes graphies confondues). Le site met en avant le patrimoine linguistique et culturel de la Provence à travers un dictionnaire bilingue, des contenus éditoriaux et un agenda culturel.

- **Modèle :** Non commercial. Aucun impératif SEO, aucune publicité, aucun tracking.
- **Inspiration visuelle :** franceinfo.fr (sobriété, clarté, lisibilité).
- **Nom de domaine :** `le-provencal.ovh`.

### 1.2 Public cible

- **Tranche d'âge :** 20 à 90 ans.
- **Focus prioritaire :** Seniors provençaux (60–90 ans), principalement dans le Var et les Bouches-du-Rhône.
- **Profil type :** Retraités passionnés de culture provençale, souvent peu à l'aise avec les interfaces numériques complexes. Ils consultent le site depuis un ordinateur de bureau (écran 15" à 22") ou un smartphone. La tablette n'est pas ciblée dans cette version.
- **Conséquences sur la conception :**
  - Texte lisible sans effort → taille de corps minimum 18px
  - Zones cliquables larges → minimum 44×44px
  - Navigation claire et stable → pas de menus masqués, pas d'animations perturbatrices
  - Vocabulaire simple et direct → libellés français uniquement, pas de jargon
  - Pas de fonctionnalités cachées → tout est visible, pas de gestes complexes

### 1.3 Principes directeurs

| Principe | Règle |
|----------|-------|
| Simplicité | Chaque page a un objectif unique et clair |
| Lisibilité | Typographie senior-friendly, contrastes forts |
| Confiance | Pas d'inscription publique, pas de collecte de données, transparence via la page « À propos » |
| Éditorial | Contenu de qualité, pas de contenu généré par les utilisateurs anonymes |
| Neutralité linguistique | Les deux graphies principales (mistralienne et classique IEO) sont traitées à égalité |

---

## 2. Utilisateurs et rôles

### 2.1 Visiteur (non authentifié)

Le visiteur accède librement à l'intégralité du contenu public :
- Consultation du dictionnaire (recherche FR→Provençal et Provençal→FR)
- Utilisation du traducteur lexical
- Lecture des articles, histoires, légendes, dictons/expressions/proverbes
- Consultation de l'agenda culturel (événements à venir et archives)
- Consultation de la page « À propos » et des mentions légales

Le visiteur ne peut ni créer, ni modifier, ni supprimer de contenu.

### 2.2 Contributeur (authentifié)

- **Nombre maximum :** 10 contributeurs.
- **Création de compte :** Sur invitation uniquement. Les identifiants (pseudo + mot de passe) sont créés directement en base de données par l'administrateur système. Il n'existe aucun formulaire d'inscription public.
- **Droits :** Création, modification et suppression de contenu sur tous les modules éditoriaux (dictionnaire, bibliothèque, articles, agenda, dictons/expressions/proverbes) ainsi que modification du contenu éditorial de la page « À propos » (blocs Démarche et Sources).
- **Publication :** Directe, sans workflow de relecture ni statut brouillon. Le contenu est publié immédiatement.
- **Interface :** Intégrée au site public. Les boutons d'édition apparaissent directement sur les pages lorsque le contributeur est connecté. Il n'existe pas de section `/admin` séparée.

### 2.3 Administrateur système

L'administrateur gère l'application en dehors de l'interface web :
- Création et suppression de comptes contributeurs (directement en base de données)
- Import du dictionnaire (fichier CSV/Excel)
- Maintenance technique, sauvegardes, mises à jour

Il n'existe aucune interface d'administration applicative.

---

## 3. Modules fonctionnels

### 3.1 Mémoire vivante — Dictons, Expressions et Proverbes

**Objectif :** Valorisation du patrimoine oral provençal. Ce module regroupe des formes courtes transmises oralement et ancrées dans la culture locale.

**Types de contenu (liste fermée — 3 valeurs) :**
- `Dicton` — Formule populaire liée au temps, aux saisons, à la vie rurale
- `Expression` — Locution imagée du quotidien
- `Proverbe` — Sentence morale ou sagesse universelle en provençal

**Informations saisies pour chaque entrée :**

| Champ | Obligatoire | Contrainte | Description |
|-------|:-----------:|------------|-------------|
| Terme provençal | Oui | 500 caractères max | Le texte en provençal |
| Localité d'origine | Oui | 200 caractères max | Ville, département ou région d'origine |
| Traduction / sens en français | Oui | Texte libre | Traduction littérale et/ou explication du sens culturel |
| Type | Non | Valeur parmi les 3 types ci-dessus | Classification du terme |
| Contexte | Non | Texte libre | Explication du contexte d'usage |
| Source | Non | Texte libre | Origine documentaire ou personne ayant transmis le terme |

**Terme du jour :** Chaque jour, un terme est sélectionné automatiquement et affiché en position principale sur la page d'accueil. La sélection tourne sur 24h (un terme différent chaque jour, cycle sur l'ensemble des entrées).

**Droits :** Création, modification, suppression réservées aux contributeurs. Consultation publique.

---

### 3.2 Dictionnaire Français-Provençal

**Objectif :** Permettre la recherche de mots français et leur traduction provençale (et inversement), en présentant les variantes selon les graphies et les sources lexicographiques historiques.

#### Données du dictionnaire

Chaque entrée du dictionnaire comprend :
- **Un mot français** (obligatoire) avec éventuellement un synonyme français
- **Un thème** et une **catégorie** (classification hiérarchique)
- **Une ou plusieurs traductions provençales**, chacune rattachée à :
  - Une **graphie** (mistralienne, classique IEO, pré-mistralienne…)
  - Une **source lexicographique** (voir §10.4)
  - Une **région** d'usage

Un mot français peut avoir plusieurs traductions provençales selon la graphie et la source. C'est une relation un-à-plusieurs.

#### Graphies

Deux graphies sont mises en avant à égalité dans le dictionnaire :
- **Mistralienne** — graphie du Félibrige, codifiée par Frédéric Mistral (1854)
- **Classique IEO** — graphie de l'Institut d'Estudis Occitans (norme moderne)

Les autres graphies historiques (pré-mistralienne, régionale) sont présentes via les sources lexicographiques mais ne sont pas mises en avant par défaut.

**Graphie du reste du site :** En dehors du dictionnaire, le portail utilise une graphie neutre : une seule traduction provençale par terme, sans contrôle de graphie source.

#### Recherche

- **Bidirectionnelle :** Français → Provençal ET Provençal → Français (toutes graphies confondues)
- **Détection automatique :** Le champ de recherche détecte la direction selon les caractères saisis, ou l'utilisateur bascule manuellement via un sélecteur
- **Suggestion de mots proches :** Lorsque le mot exact n'est pas trouvé, le système propose des mots approchants (tolérance aux fautes de frappe et variations orthographiques)
- **La recherche textuelle désactive les filtres** : quand une recherche est saisie, les filtres Thème/Catégorie sont automatiquement grisés

#### Filtres

- **Sélecteur de direction :** FR → Provençal / Provençal → FR (bascule l'ordre des colonnes)
- **Filtre par graphie :** Mistralienne / Classique IEO / Toutes
- **Filtre par source lexicographique :** Garcin, Honnorat, Pellas, etc.
- **Filtre par thème puis catégorie :** En cascade (la liste des catégories se met à jour selon le thème choisi)

#### Affichage

- Tri par ordre alphabétique du mot français
- Groupement par thème puis catégorie
- **Groupement des traductions :** Les traductions multiples (par source) sont regroupées sous le mot français dans un bloc accordéon dépliable au clic. Une ligne par mot français — toutes les traductions disponibles sont regroupées dessous.
- **En mode Provençal → FR :** Les colonnes s'inversent — colonne traduction provençale en premier, mot français en second.
- **Pagination :** 10 / 20 / 50 / 100 résultats par page. Valeur par défaut : 20.

#### États vides

- Mot présent en base mais sans traduction → *« Mot non traduit »*
- Mot absent de la base → *« Pas de mot trouvé »*

#### Import du dictionnaire

- **Format accepté :** Fichier CSV ou Excel (séparateur `;`, encodage UTF-8)
- **Structure :** 13 colonnes exactement (voir §10.5 pour le détail)
- **Comportement en cas d'erreur :** L'import s'arrête immédiatement et retourne le numéro de ligne fautive. Toute ligne avec un nombre de colonnes différent de 13 est rejetée.
- **Champs de traduction vides :** Acceptés, tant qu'au moins une des colonnes de traduction est renseignée.
- **Doublons :** Un doublon (même mot français + thème + catégorie) arrête l'import.
- **Droits :** Réservé aux contributeurs authentifiés.

#### Modification d'une entrée

La modification d'une entrée existante est accessible aux contributeurs authentifiés directement depuis la page `/dictionnaire`.

**Données modifiables :**

| Champ | Obligatoire | Contrainte | Description |
|-------|:-----------:|------------|-------------|
| Mot français | Oui | 200 caractères max | Entrée principale |
| Synonyme français | Non | 200 caractères max | Variantes françaises |
| Description | Non | Texte libre | Contexte, notes d'usage, étymologie |
| Thème | Oui | Valeur parmi les 13 thèmes (§10.6) | Thème principal |
| Catégorie | Oui | 100 caractères max | Sous-catégorie du thème |
| Traductions provençales | — | 1 ligne par source (7 sources max) | Texte de traduction par source codifiée |

**Règle de modification des traductions :** L'ensemble des traductions existantes est remplacé par les valeurs saisies dans le formulaire. Une source laissée vide supprime la traduction correspondante. Au moins une traduction doit rester renseignée.

**Verrouillage :** Le verrou s'applique au niveau de l'entrée principale (mot français). Un seul contributeur peut modifier une entrée à la fois — ses traductions sont incluses dans le verrou.

**Rollback :** Disponible. Annule la dernière modification sur l'entrée (métadonnées et traductions simultanément).

**Droits :** Réservé aux contributeurs authentifiés.

---

### 3.3 Traducteur lexical

**Objectif :** Proposer une traduction rapide, mot à mot, du français vers le provençal.

**Mécanisme :** Chaque mot français saisi est recherché dans le dictionnaire et remplacé par sa traduction provençale la plus courante. Il ne s'agit **pas** d'une traduction contextuelle ou grammaticale — aucun accord ni conjugaison n'est appliqué.

**Règles :**
- La ponctuation est conservée telle quelle
- Les mots inconnus (absents du dictionnaire) sont conservés tels quels dans le résultat, mis en évidence visuellement (fond jaune pâle)
- La traduction se déclenche automatiquement avec un délai de 500 ms après la dernière frappe (pas de bouton « Traduire »)

**Mention obligatoire permanente :** Un encart est affiché en permanence sous le champ de saisie :
> *« Traducteur mot à mot — la traduction automatique de phrases complètes est prévue dans une version future. »*

**Mise en page :**
- **Desktop :** Zone de saisie à gauche, résultat à droite (50/50)
- **Mobile :** Zone de saisie en haut, résultat en dessous (empilé)

---

### 3.4 Agenda culturel

**Objectif :** Recenser et promouvoir les événements culturels provençaux.

**Informations saisies pour chaque événement :**

| Champ | Obligatoire | Contrainte | Description |
|-------|:-----------:|------------|-------------|
| Titre | Oui | 200 caractères max | Nom de l'événement |
| Date de début | Oui | Date | Jour de début |
| Date de fin | Oui | Date | Jour de fin |
| Lieu | Non | 200 caractères max | Ville + code département |
| Description | Non | 1 000 caractères max | Description de l'événement |
| Lien externe | Non | URL | Lien vers le site de l'événement |

**Cycle de vie :** Un événement est **archivé automatiquement** dès que sa date de fin est passée. Il reste consultable dans les archives mais disparaît de la vue principale.

**Vue principale :**
- Les 3 prochains événements sont mis en avant (cartes larges avec date + lieu + titre)
- Le reste est affiché en liste compacte chronologique en dessous
- Les événements passés ne sont pas affichés — ils sont accessibles via un lien « Archives » séparé

**Archives :** Navigables par année puis par mois.

**Filtres :**
- Par date (année/mois)
- Par lieu (champ texte libre)

**État vide :** Si aucun événement à venir, afficher un événement fictif générique avec la mention *« Mise à jour à faire par l'administrateur »*.

**Page de détail :** Titre, dates et lieu en bandeau coloré, description complète, lien externe si renseigné. Fil d'ariane + bouton Retour.

**Droits :** Création, modification, suppression réservées aux contributeurs. Consultation publique.

---

### 3.5 Bibliothèque — Histoires et Légendes

**Objectif :** Présenter le patrimoine narratif provençal (récits historiques et légendes locales).

**Informations saisies pour chaque entrée :**

| Champ | Obligatoire | Contrainte | Description |
|-------|:-----------:|------------|-------------|
| Titre | Oui | 200 caractères max | Titre de l'histoire ou légende |
| Typologie | Non | `Histoire` ou `Légende` | Classification |
| Période | Non | 200 caractères max, texte libre | Époque concernée (ex. « Moyen Âge », « XVIIIe siècle ») |
| Description courte | Non | 200 caractères max, texte brut | Résumé affiché en liste |
| Description longue | Non | Texte libre, Markdown | Contenu complet de l'entrée |
| URL source | Non | URL | Lien vers une source externe |
| Image | Non | 1 image max par entrée, 2 Mo max | Image d'illustration |

**Périodes :** Les valeurs disponibles dans les filtres sont calculées dynamiquement à partir des valeurs présentes en base — aucune liste prédéfinie. L'interface de saisie propose une autocomplétion sur les valeurs existantes pour maintenir la cohérence.

**Édition :** La description longue est saisie en Markdown avec prévisualisation en temps réel.

**Contenu bilingue :** Lien bidirectionnel optionnel entre une version française et une version provençale (même contenu, deux entrées liées). Un toggle « FR / Provençal » est affiché en haut de la page de lecture uniquement si une version dans l'autre langue existe.

**Affichage en liste :**
- Titre + description courte + période. Pas d'images en liste.
- Chargement par défilement infini (infinite scroll)
- Fin de liste : message *« Toutes les histoires ont été chargées »* (pas de spinner)

**Filtres :**
- Sélecteur Tout / Histoire / Légende
- Par période (valeurs dynamiques)
- Par lieu
- Par date de publication (année/mois)

**Page de lecture :** Colonne de texte centrée (max 720px), style article de magazine. Markdown rendu. Fil d'ariane + bouton Retour.

**Droits :** Création, modification, suppression réservées aux contributeurs. Consultation publique.

---

### 3.6 Actualités — Articles culturels

**Objectif :** Publier des articles éditoriaux sur la culture provençale.

**Informations saisies pour chaque article :**

| Champ | Obligatoire | Contrainte | Description |
|-------|:-----------:|------------|-------------|
| Titre | Oui | 200 caractères max | Titre de l'article |
| Description (chapeau) | Non | 300 caractères max | Résumé éditorial |
| Image | Non | 2 Mo max | Image d'illustration (fichier ou URL) |
| URL source | Non | URL | Lien vers une source externe |
| Date de publication | Oui | Date | Date de publication |
| Auteur | Non | 100 caractères max, texte libre | Nom ou pseudo de l'auteur |
| Catégorie | Non | Valeur parmi la liste fermée (voir §10.1) | Classification thématique |

**Page dédiée :** Les articles sont affichés sur la page `/articles`, **séparée de la page d'accueil**. La page d'accueil est exclusivement réservée à la Mémoire vivante.

**Affichage :**
- Tri par date de publication décroissante
- En liste : titre, auteur, date, chapeau, image (si renseignée, sinon placeholder logo du site)
- Pas de pagination au-delà de 20 articles (les anciens restent en base mais ne sont pas paginés)

**Filtres :**
- Par date (année/mois)
- Par catégorie (liste fermée de 20 valeurs — voir §10.1)

**Page de détail :**
- Image en en-tête (pleine largeur, hauteur max 400px)
- Chapeau en taille moyenne
- Corps de l'article (Markdown rendu)
- Bloc auteur / date / catégorie à gauche sous le titre
- Lien source si renseigné
- Fil d'ariane + bouton Retour

**Pas de commentaires ni de système de like.** Le portail est purement éditorial.

**Droits :** Création, modification, suppression réservées aux contributeurs. Consultation publique.

---

### 3.7 Page « À propos »

**URL :** `/a-propos`

**Objectif :** Instaurer la confiance auprès du public local. Les Provençaux aiment savoir à qui ils ont affaire — cette page présente le projet et ses acteurs.

**Structure (3 blocs) :**

1. **La démarche** — Pourquoi ce site ? Quel problème cherche-t-on à résoudre ? Texte éditorial libre, modifiable par les contributeurs.
2. **Les contributeurs** — Liste générée automatiquement à partir des comptes actifs en base (pseudo de chaque utilisateur inscrit). Non éditable manuellement — le contenu reflète l'état de la table `users`.
3. **Les sources** — Références des 7 sources lexicographiques du dictionnaire (voir §10.4) + liste des fonds documentaires utilisés pour la bibliothèque. Texte libre, modifiable par les contributeurs.

**Mise à jour :** Les blocs « Démarche » et « Sources » sont éditables en ligne par les contributeurs authentifiés, selon les règles du mode contributeur (§7). Le bloc « Contributeurs » est calculé dynamiquement — il ne peut pas être édité.

**Verrouillage :** La page est traitée comme un élément unique verrouillable. Un seul contributeur peut être en mode édition à la fois (30 minutes max). Si un contributeur est en cours de modification, le bouton « Modifier » est remplacé par l'icône de verrou avec le tooltip *« En cours de modification »*.

**Rollback :** Disponible. Annule la dernière modification sur les blocs « Démarche » et « Sources » indépendamment l'un de l'autre.

---

### 3.8 Page « Mentions légales »

**URL :** `/mentions-legales`

Contenu statique :
- *Hébergeur :* non applicable (hébergement privé)
- *Éditeur :* non applicable (projet privé non commercial, auteur anonyme)
- *SIRET :* non applicable (particulier)
- *Données personnelles :* aucune collecte de données personnelles identifiables. Pas de cookies tiers. Pas de tracking.
- *Contact :* adresse e-mail de contact (à renseigner)

---

## 4. Accessibilité et contraintes seniors

Le public cible principal étant des seniors provençaux (60-90 ans), l'intégralité de l'interface est conçue pour maximiser la lisibilité, la clarté et la facilité d'interaction.

### 4.1 Typographie

**Exigences fonctionnelles :**

| Exigence | Règle |
|----------|-------|
| Taille minimale de corps de texte | **18px** (1.125rem) — seuil minimum pour la lecture senior |
| Taille minimale autorisée (légendes techniques) | 12px (uniquement pour les labels secondaires) |
| Taille des libellés de navigation mobile | 11px minimum sous l'icône |
| Interligne du corps | 1.7 (aéré pour la lecture longue) |
| Interligne des titres | 1.3 |
| Police principale | Sans empattement (Inter ou équivalent système) |
| Police des termes provençaux | Serif (Georgia ou équivalent) — évoque le manuscrit sans nuire à la lisibilité |
| Graisse du corps | Regular (400) |
| Graisse des titres et labels actifs | Bold (700) |
| Ajustement de taille par l'utilisateur | Pas de bouton d'ajustement — le site respecte le réglage du navigateur (tailles en `rem`) |

**Échelle typographique (du plus petit au plus grand) :**

| Usage | Taille | Contexte |
|-------|--------|----------|
| Légendes techniques, labels de champs | 12px | Usage minimal |
| Libellés navigation mobile | 14px | Sous les icônes |
| **Corps de texte** | **18px** | Minimum pour tout texte courant |
| Chapeau article, description courte | 20px | Texte d'accroche |
| Titres de carte, sous-titres | 24px | Structuration visuelle |
| Titres de page | 30px | En-têtes de section |
| Terme du jour (accueil) | 36px | Mise en exergue principale |
| Titres exceptionnels | 44px | Usage rare |

### 4.2 Espacement et zones tactiles

| Exigence | Règle |
|----------|-------|
| Taille minimale des zones cliquables | **44×44px** (norme WCAG tactile) |
| Système d'espacement | Multiples de 8px (cohérence visuelle) |
| Padding interne des cartes | 16px (mobile) / 24px (desktop) |
| Espacement entre cartes | 16px |
| Espacement entre sections | 40px |
| Espacement entre champs de formulaire | 24px |
| Espacement label-champ | 8px |
| Largeur maximale du contenu principal | 1 100px |
| Largeur maximale des colonnes de lecture | 720px (bibliothèque, articles) |

### 4.3 Contrastes et couleurs

| Exigence | Règle |
|----------|-------|
| Norme de contraste | **WCAG AA** (ratio 4.5:1 minimum) |
| Mode sombre | Non implémenté — palette claire uniquement |
| Palette | « Terre de Provence » — tons chauds et sobres (ocre, olivier, pierre) |

**Palette de couleurs fonctionnelle :**

| Rôle | Couleur | Utilisation |
|------|---------|-------------|
| Fond principal | Blanc cassé « coquille d'œuf » | Fond de toutes les pages — plus doux que le blanc pur pour les yeux fatigués |
| Texte de corps | Brun très sombre (charbon de terre) | Tout texte courant — contraste fort sans agressivité du noir pur |
| Accent primaire | Vert olive sourd | Boutons, titres, liens actifs, éléments de navigation actifs |
| Accent secondaire | Terre cuite (terracotta) | Alertes, éléments d'agenda, bandeau des pages de détail, éléments suppression |
| Bordures | Gris doux | Séparations, contours de cartes |
| Fond d'erreur | Rouge modéré | Messages d'erreur |

### 4.4 Animations et mouvements

| Exigence | Règle |
|----------|-------|
| Animations autorisées | Transitions douces uniquement (fade-in discrets) |
| Animations interdites | Mouvements latéraux, zoom, rebonds, parallaxe |
| Respect des préférences utilisateur | Aucune animation si le navigateur indique `prefers-reduced-motion: reduce` |

### 4.5 Autres règles d'accessibilité

| Exigence | Règle |
|----------|-------|
| Langue de l'interface | Français uniquement |
| Focus après navigation SPA | Le focus est replacé sur le `<h1>` de la nouvelle page après chaque changement de route |
| Ancres et barre fixe | Les éléments cibles d'ancre sont décalés de 64px en desktop (hauteur de la barre de navigation) |
| Titre de page HTML | Titre de la page courante uniquement, sans suffixe (ex. « Agenda », pas « Agenda — Provençal.ia ») |
| Liens externes | Toujours ouverts dans un nouvel onglet |
| Barre de recherche globale | Aucune. Chaque module gère sa propre recherche. |

---

## 5. Navigation

### 5.1 Structure des entrées (7 entrées)

| # | Libellé | Contenu |
|---|---------|---------|
| 1 | Accueil | Page principale — Mémoire vivante (terme du jour + liste dictons/expressions/proverbes) |
| 2 | Actualités | Articles culturels (page `/articles`) |
| 3 | Langue | Sous-menu : Dictionnaire + Traducteur lexical |
| 4 | Agenda | Événements culturels à venir et archives |
| 5 | Culture | Bibliothèque — Histoires et Légendes |
| 6 | À propos | Démarche, contributeurs, sources |
| 7 | Compte | Connexion / Espace contributeur |

**Sous-menu « Langue » :** Deux entrées — « Dictionnaire » et « Traducteur ». Déclenché au clic (desktop) ou au tap (mobile).

### 5.2 Écrans cibles

- **Desktop :** 15" à 22" (résolutions ~1 280px à ~1 920px). Pas de support ultrawide/4K spécifique — le contenu reste centré avec des marges blanches au-delà de 1 440px.
- **Mobile :** 375px à 430px (smartphones standards).
- **Tablette :** Pas de support distinct dans cette version.

### 5.3 Navigation desktop (écran ≥ 768px)

- Barre horizontale **fixe en haut** de l'écran, toujours visible
- Logo texte « Provençal.ia » à gauche
- Entrées de menu (icône + libellé) centrées — libellés **toujours visibles** (pas d'icônes seules)
- Bouton « Compte » isolé à droite
- Hauteur : 64px
- Entrée active : libellé en gras, soulignement vert olive
- Le sous-menu « Langue » s'affiche au clic et au focus clavier, se ferme au clic extérieur ou touche Échap
- Comportement au scroll : la barre reste fixe, le contenu défile en dessous

### 5.4 Navigation mobile (écran < 768px)

- Barre horizontale **fixe en bas** de l'écran, toujours visible
- 7 entrées de largeur égale, icône centrée au-dessus du libellé court (≤ 8 caractères)
- Taille du libellé : 11px minimum
- Hauteur : 60px
- Entrée active : icône et libellé en vert olive, gras
- Le sous-menu « Langue » s'ouvre en panneau glissant depuis le bas (bottom sheet) avec deux boutons « Dictionnaire » et « Traducteur ». Fermé par tap en dehors ou sur une croix ×.
- **Pas de logo** dans la barre mobile — le titre de la page en cours est affiché dans un en-tête séparé
- Comportement au scroll : la barre reste fixe, le contenu défile au-dessus

### 5.5 Accessibilité de la navigation

- Attribut `aria-current="page"` sur l'entrée active
- Navigation clavier complète (Tab, Enter, Échap sur le sous-menu)
- Attribut `aria-label` sur chaque entrée de menu
- Le bottom sheet mobile est un dialogue modal accessible (focus piégé tant qu'il est ouvert)

---

## 6. Parcours utilisateur par page

### 6.1 Page d'accueil — Mémoire vivante

**URL :** `/`

La page d'accueil est **exclusivement dédiée à la Mémoire vivante**. Pas d'articles, pas d'agenda.

**Contenu affiché :**
1. **Terme du jour** (bloc mis en avant en haut de page) : terme provençal sélectionné automatiquement toutes les 24h. Affichage : terme + type + localité d'origine + traduction/sens. Carte large avec bordure terracotta.
2. **Liste des dictons, expressions et proverbes** en dessous : liste verticale, chargée par défilement infini.

**Filtres sur la liste :** Par type (Dicton / Expression / Proverbe) et par localité d'origine. Aucun filtre sur le terme du jour.

**Fin de liste :** Lorsque toutes les entrées ont été chargées, afficher le message :
> *« Vous avez parcouru toute la Mémoire vivante »*
Avec une icône de cigale décorative — pas de spinner.

---

### 6.2 Dictionnaire

**URL :** `/dictionnaire` (ou sous sous-menu « Langue »)

**Mise en page :**
1. Sélecteur de direction (FR → Provençal / Provençal → FR) en haut
2. Champ de recherche textuelle
3. Filtres (Thème, Catégorie) — deux sélecteurs en cascade. Sur mobile : deux listes déroulantes empilées.
4. Tableau de résultats à deux colonnes (mot français / traduction provençale)
5. Pagination en bas (10 / 20 / 50 / 100 résultats par page)

Voir §3.2 pour le détail des règles fonctionnelles.

**Mode contributeur :** Un bouton « Modifier » est affiché en bout de chaque ligne lorsque le contributeur est connecté. Il ouvre un formulaire d'édition inline présentant l'ensemble des champs de l'entrée (mot français, synonyme, thème, catégorie, description) ainsi que les 7 colonnes de traductions. Voir §3.2, sous-section « Modification d'une entrée ».

---

### 6.3 Traducteur lexical

**URL :** `/traducteur` (ou sous sous-menu « Langue »)

Voir §3.3 pour le détail complet.

---

### 6.4 Agenda culturel

**URL :** `/agenda`

**Mise en page :**
1. Les 3 prochains événements en cartes larges (date + lieu + titre)
2. Reste des événements à venir en liste compacte chronologique
3. Lien « Archives » séparé pour les événements passés

**Page de détail :** `/agenda/{id}` — Titre, dates et lieu en bande colorée terracotta, description complète, lien externe si renseigné. Fil d'ariane + bouton Retour.

Voir §3.4 pour le détail des règles fonctionnelles.

---

### 6.5 Bibliothèque — Histoires et Légendes

**URL :** `/bibliotheque`

**Mise en page :**
1. Filtres (Tout / Histoire / Légende + période + lieu + date)
2. Liste sobre : titre + description courte + période (pas d'images en liste)
3. Chargement par défilement infini

**Fin de liste :** *« Toutes les histoires ont été chargées »* + icône olivier — pas de spinner.

**Page de lecture :** `/bibliotheque/{id}` — Colonne de texte centrée (max 720px), Markdown rendu, toggle FR/Provençal si version bilingue disponible. Fil d'ariane + bouton Retour.

Voir §3.5 pour le détail des règles fonctionnelles.

---

### 6.6 Articles

**URL :** `/articles`

**Mise en page :**
1. Filtres (date + catégorie)
2. Liste journal : titre, auteur, date, chapeau, image

**Page de détail :** `/articles/{id}` — Image en-tête hero, chapeau, corps Markdown, bloc auteur/date/catégorie, lien source. Fil d'ariane + bouton Retour.

Voir §3.6 pour le détail des règles fonctionnelles.

---

### 6.7 Page de connexion

**URL :** `/connexion`

**Mise en page :** Centré verticalement et horizontalement. Carte unique, largeur max 400px.

**Contenu :**
1. Logo du site (centré)
2. Message informatif : *« Identifiants fournis par l'administrateur »*
3. Champ « Login » (label visible, placeholder vide)
4. Champ « Mot de passe » (label visible, type password, sans icône œil)
5. Bouton « Se connecter » (pleine largeur, couleur accent primaire)

**Règles :**
- Pas de lien « Mot de passe oublié » — gestion directe en base par l'administrateur
- Pas de formulaire d'inscription public
- Erreur d'authentification : message générique *« Identifiant ou mot de passe incorrect »* — pas de distinction login/mot de passe (sécurité)
- Après connexion réussie : retour sur la page d'origine (ou `/` si accès direct)

---

### 6.8 Page « À propos »

**URL :** `/a-propos`

Voir §3.7 pour le détail.

**Mode contributeur :** Les boutons « Modifier » apparaissent sur les blocs « Démarche » et « Sources » lorsque le contributeur est connecté. Le bloc « Contributeurs » est en lecture seule — aucun bouton d'édition n'y est affiché.

---

### 6.9 Page 404

Message clair + liens directs vers les 4 modules principaux (Dictionnaire, Agenda, Bibliothèque, Accueil).

---

### 6.10 Pied de page (footer)

- **Mobile :** Absent (la barre de navigation en bas remplace le footer)
- **Desktop :** Minimal — crédits lexicographiques (liste des 7 auteurs sources) + lien « Mentions légales »

---

## 7. Mode contributeur — Édition inline

Les contributeurs authentifiés voient des **icônes d'action** directement sur les pages publiques, sans interface d'administration séparée.

### 7.1 Actions disponibles

| Action | Où elle apparaît | Description |
|--------|-----------------|-------------|
| **Ajouter** | En bas de liste ou en en-tête de section | Ouvre le formulaire de création d'un nouvel élément |
| **Modifier** | Coin supérieur droit de chaque élément | Bascule l'élément en mode édition inline |
| **Valider** | Remplace « Modifier » après clic | Enregistre les modifications |
| **Supprimer** | Apparaît après clic sur « Modifier » | Supprime l'élément avec confirmation modale |
| **Rollback** | Apparaît après clic sur « Modifier » | Annule la **dernière action** sur cet élément |
| **Annuler** | Apparaît en mode édition | Ferme le mode édition sans enregistrer |

### 7.2 Séquence d'interaction

```
État normal      → clic Modifier
Mode édition     → icônes Valider / Supprimer / Rollback / Annuler visibles
Clic Valider     → enregistrement → notification succès → retour état normal
Clic Annuler     → annulation → retour état normal sans sauvegarde
Clic Supprimer   → modal de confirmation → suppression → notification → retour liste
Clic Rollback    → rollback dernière action → notification → retour état précédent
```

### 7.3 Verrouillage d'édition

Le verrouillage empêche deux contributeurs de modifier le même contenu en même temps :

- Lorsqu'un contributeur clique sur « Modifier », l'élément est **verrouillé** à son nom
- Si un autre contributeur consulte cet élément, le bouton « Modifier » est remplacé par une icône de verrou (terracotta) avec le tooltip *« En cours de modification »*
- Le verrou **expire automatiquement après 30 minutes** si non libéré (protection contre l'abandon de session)
- Le verrou est levé automatiquement à la sauvegarde ou à l'annulation
- Le verrouillage s'applique à **tous les modules éditoriaux** : dictionnaire, bibliothèque, articles, agenda, dictons/expressions/proverbes, et page « À propos » (blocs éditables)

### 7.4 Rollback

Le rollback est limité à la **dernière action effectuée** sur un élément donné. Il ne s'agit pas d'un historique complet — seul le dernier changement peut être annulé.

### 7.5 Formulaires d'édition — Règles communes

**Image (modules Bibliothèque et Articles) :**
Deux modes de saisie, l'upload de fichier étant prioritaire sur la saisie d'URL :
1. **Upload fichier :** Sélection d'un fichier local. Compression automatique côté client à 2 Mo maximum avant envoi. Si un fichier est sélectionné, le champ URL est grisé.
2. **Saisie URL :** Champ texte pour coller une URL web (`https://...`). Activé uniquement si aucun fichier n'est uploadé.

**Prévisualisation Markdown (Bibliothèque uniquement) :**
- **Desktop :** Éditeur à gauche, prévisualisation à droite (50/50), en temps réel
- **Mobile :** Deux onglets (Éditeur / Prévisualisation), bascule manuelle

---

## 8. Feedback et états de l'interface

### 8.1 Actions réussies

Notification (snackbar) en bas de l'écran, couleur accent primaire (vert olive), durée 3 secondes.
- **Desktop :** Positionnée à 16px du bas
- **Mobile :** Positionnée au-dessus de la barre de navigation (60px + 16px de marge)

### 8.2 Erreurs

**Erreur réseau / timeout :** Notification rouge, durée 4 secondes, même positionnement.

**Erreur de formulaire :** Texte d'erreur rouge sous le champ concerné + bordure du champ rouge. Pas de récapitulatif en haut du formulaire.

### 8.3 Session et expiration

- **Session expirée :** Redirection silencieuse vers la page de connexion. Les modifications en cours sont perdues sans avertissement.
- **Avertissement pré-expiration :** Si un contributeur est en cours de modification et que sa session expire dans **5 minutes**, une bannière d'avertissement s'affiche en haut de la page :
  > *« Votre session expire dans 5 minutes. Enregistrez vos modifications pour ne pas les perdre. »*
  La bannière affiche un compte à rebours (5 min, 3 min, 1 min). Elle n'apparaît que si un formulaire d'édition est ouvert.

### 8.4 Chargement

Spinner centré sur la zone concernée (pas de spinner pleine page sauf au chargement initial de l'application).

### 8.5 Fil d'ariane et retour

- **Fil d'ariane :** Présent sur toutes les pages de détail (article, histoire, événement)
- **Bouton Retour :** Bouton « ← Retour » explicite en haut à gauche de chaque page de détail, en plus du fil d'ariane

---

## 9. Règles métier transversales

### 9.1 Authentification

- **Méthode :** Pseudo + mot de passe (pas d'email, pas de SSO, pas de réseau social)
- **Création de compte :** Par l'administrateur système uniquement, directement en base de données
- **Nombre max de contributeurs :** 10
- **Récupération de mot de passe :** Pas de mécanisme self-service — l'administrateur réinitialise en base

### 9.2 Images

- **Format :** 1 image maximum par entrée (Bibliothèque et Articles)
- **Taille max :** 2 Mo (compression automatique côté client avant envoi)
- **Référence :** Le champ image accepte soit un chemin local (fichier uploadé) soit une URL web complète
- **Image absente :** Placeholder avec le logo du site

### 9.3 Liens externes

Tous les liens vers des sites externes s'ouvrent dans un nouvel onglet.

### 9.4 Recherche

Chaque module gère sa propre recherche. Il n'y a pas de barre de recherche globale sur le site.

### 9.5 URLs et partage

Chaque contenu (article, histoire, événement, terme) dispose d'une URL unique permettant le partage par lien direct.

---

## 10. Données de référence

### 10.1 Catégories d'articles (liste fermée — 20 valeurs)

| Catégorie | Description |
|-----------|-------------|
| Langue & Culture | Défense de la langue provençale, graphies, linguistique |
| Littérature | Œuvres, auteurs, romans, nouvelles en langue provençale ou sur la Provence |
| Poésie | Poèmes, récitations, prix littéraires poétiques |
| Histoire & Mémoire | Faits historiques, commémorations, archives |
| Traditions & Fêtes | Fêtes populaires, pèlerinages, jeux traditionnels |
| Musique | Chants, instruments, groupes, disques en lien avec la Provence |
| Danse | Danses folkloriques, farandole, cours, troupes |
| Gastronomie | Recettes, produits du terroir, savoirs culinaires |
| Artisanat | Métiers d'art, santons, céramique, tissage provençal |
| Patrimoine bâti | Architecture, monuments, mas, villages perchés |
| Environnement | Garrigue, Camargue, Alpilles, écologie du territoire |
| Personnalités | Portraits de figures provençales (vivants ou historiques) |
| Associations | Actualité des associations de défense de la langue et de la culture |
| Enseignement | Filières bilingues, pédagogie, ressources éducatives |
| Économie locale | Agriculture, viticulture, artisanat économique |
| Numismatique & Archives | Monnaies, documents, manuscrits anciens |
| Immigration & Diaspora | Communautés provençales hors de Provence |
| Jeunesse | Initiatives, projets, créations portés par les jeunes |
| Régionalisme & Politique linguistique | Débats institutionnels, statut du provençal, politiques culturelles |
| Divers | Articles ne rentrant dans aucune autre catégorie |

### 10.2 Types de dictons/expressions (liste fermée — 3 valeurs)

| Type | Description |
|------|-------------|
| Dicton | Formule populaire liée au temps, aux saisons, à la vie rurale |
| Expression | Locution imagée du quotidien |
| Proverbe | Sentence morale ou sagesse universelle |

### 10.3 Typologies de la bibliothèque (liste fermée — 2 valeurs)

| Typologie | Description |
|-----------|-------------|
| Histoire | Récit historique documenté |
| Légende | Récit traditionnel ou mythique |

### 10.4 Sources lexicographiques du dictionnaire (7 sources)

| Code | Auteur | Ouvrage | Année | Zone géographique |
|------|--------|---------|-------|-------------------|
| TradEG | Étienne Garcin | *Dictionnaire provençal-français* | 1823 | Grasse, Var |
| TradD | Autran | *(Glossaire manuscrit)* | XIXe s. | Alpes-Maritimes |
| TradA | Claude-François Achard | *Dictionnaire de la Provence et du Comté Venaissin* | 1785 | Alpes-Maritimes |
| TradH | Simon-Jude Honnorat | *Dictionnaire provençal-français* (4 vol.) | 1846–1848 | Var, Basses-Alpes |
| TradAv | Avril | *Dictionnaire provençal-français* | 1834 | Marseille, Bouches-du-Rhône |
| TradP | Abbé Pierre Pellas | *Dictionnaire provençal et français* | 1723 | Marseille |
| TradX | Xavier de Fourvières | *Lou Pichot Trésor* | 1901 | Vallée du Rhône, Vaucluse |

> Ces sources sont antérieures à la codification du Félibrige (1854) et à la norme classique (IEO). Les traductions contenues sont en graphie pré-mistralienne ou mistralienne ancienne, avec des variantes régionales significatives.

### 10.5 Structure du fichier d'import du dictionnaire (13 colonnes)

Le dictionnaire est alimenté par import de fichier (CSV ou Excel, séparateur `;`, UTF-8). Voici la structure attendue :

| N° | Nom de colonne | Obligatoire | Longueur max | Description |
|----|---------------|:-----------:|--------------|-------------|
| 1 | Thème | Oui | 100 | Thème principal (ex. Nature, Animaux, Cuisine) |
| 2 | Catégorie | Oui | 100 | Sous-catégorie du thème |
| 3 | Mot français | Oui | 200 | Entrée principale en français |
| 4 | Synonyme français | Non | 200 | Synonymes ou variantes françaises |
| 5 | Description | Non | Texte libre | Contexte, notes d'usage, étymologie |
| 6 | Traduction | Non* | 500 | Traductions provençales canoniques (toutes graphies) |
| 7 | TradEG | Non | 500 | Traduction selon Garcin (1823) |
| 8 | TradD | Non | 500 | Traduction selon Autran |
| 9 | TradA | Non | 500 | Traduction selon Achard (1785) |
| 10 | TradH | Non | 500 | Traduction selon Honnorat (1846) |
| 11 | TradAv | Non | 500 | Traduction selon Avril (1834) |
| 12 | TradP | Non | 500 | Traduction selon Pellas (1723) |
| 13 | TradX | Non | 500 | Traduction selon Xavier de Fourvières (1901) |

> \* Au moins une des colonnes 6 à 13 doit être non vide pour qu'une ligne soit importée.

### 10.6 Thèmes du dictionnaire (13 thèmes)

| Thème | Description |
|-------|-------------|
| Nature | Plantes, arbres, champignons, fleurs |
| Animaux | Oiseaux, poissons, insectes, mammifères |
| Cuisine | Recettes, techniques culinaires, ustensiles |
| Armée | Vocabulaire militaire et maritime |
| Quotidien | Métiers, outils, vie rurale |
| Travail | Vignoble, sériciculture, battage, liège |
| Divers | Jeux, mesures, monnaies, recettes anciennes |
| Corps Humain Et Sante | Anatomie, maladies, remèdes, soins |
| Maison Et Habitat | Pièces, mobilier, constructions rurales (mas, bastide…) |
| Famille Et Relations | Parenté, voisinage, états civils |
| Religion Et Croyances | Saints, rites, superstitions, fées, dracs |
| Geographie Et Territoire | Reliefs, cours d'eau, chemins |
| Langue Et Grammaire | Particules, expressions courantes, verbes |

### 10.7 Données de test — Dictons, expressions et proverbes (30 entrées)

Ces données servent de jeu initial pour valider le module Mémoire vivante.

#### 10 Dictons

| Terme provençal | Localité | Traduction / Sens |
|-----------------|----------|-------------------|
| *A la Candèu, l'ivèr s'en vèn o s'en vau* | Provence (général) | À la Chandeleur, l'hiver s'en vient ou s'en va |
| *Quand plèu pèr sant Mèdard, plèu quaranta jour mai tard* | Var | Quand il pleut pour la Saint-Médard, il pleut quarante jours plus tard |
| *Lou soulèu de jàniè es la mort dóu pàusant* | Arles | Le soleil de janvier est la mort du paresseux |
| *Après la plueio, lou bèu tèms* | Bouches-du-Rhône | Après la pluie, le beau temps |
| *Quand la cigalo canto, lou blad es madur* | Camargue | Quand la cigale chante, le blé est mûr |
| *Lou vent di mount porto lou frèi, lou vent de mar porto la plueio* | Basses-Alpes | Le vent des montagnes apporte le froid, le vent de mer apporte la pluie |
| *Figo passo, avèn gras* | Var (Fayence) | Figue passée, avoir gras — quand les figues tardent, c'est bon signe pour la récolte |
| *En avri, fai pas çò que vòles* | Vaucluse | En avril, ne fais pas ce que tu veux — méfiance envers les caprices du temps d'avril |
| *Lou bon Dieu fai plòure sus li bòn e sus li mauvàis* | Marseille | Le bon Dieu fait pleuvoir sur les bons et sur les mauvais |
| *Felibre que canto, tèms que s'amèliouro* | Félibrige | Félibrige qui chante, temps qui s'améliore — l'art provençal est un présage heureux |

#### 10 Expressions

| Terme provençal | Localité | Traduction / Sens |
|-----------------|----------|-------------------|
| *Aqueu que se buto en avans se tiro en arrié* | Aix-en-Provence | Celui qui se met en avant se tire en arrière — vantardise mal récompensée |
| *Faire lou figa* | Marseille | Faire la figue — geste d'irrespect, insulte gestuelle |
| *Sèn coume uno calheto* | Var | Sage comme une caille — qualité d'une personne calme et posée |
| *Avé lou ventre que canto* | Arles | Avoir le ventre qui chante — avoir très faim |
| *Faire bello figo de bèu fustet* | Manosque | Faire belle figue de beau fustet — belle apparence, peu de substance |
| *Ié manquo uno douga* | Bouches-du-Rhône | Il lui manque une douve (de tonneau) — il lui manque une case |
| *Sourti de la leissièiro* | Arles | Sortir de la lessive — être tiré d'une mauvaise situation |
| *Faire lou mounto-en-l'èr* | Toulon | Faire le monte-en-l'air — se vanter, se donner de l'importance |
| *Vaqui lou bèu tèms* | Aix-en-Provence | Voilà le beau temps — tout va bien, situation favorable |
| *Bello fèsto, courto joio* | Salon-de-Provence | Belle fête, courte joie — les bons moments passent vite |

#### 10 Proverbes

| Terme provençal | Localité | Traduction / Sens |
|-----------------|----------|-------------------|
| *Qu'a pas d'argent, a pas d'amis* | Provence (général) | Qui n'a pas d'argent n'a pas d'amis |
| *Fau pas vendre la pèu de l'ors avant de l'avé tuat* | Var | Il ne faut pas vendre la peau de l'ours avant de l'avoir tué |
| *La lengo n'a pas d'os, mai èu roumpo li os* | Arles | La langue n'a pas d'os, mais elle brise les os |
| *Lou tèms es de l'argent* | Marseille | Le temps est de l'argent |
| *Quau s'assemblo, s'assemblo* | Bouches-du-Rhône | Qui se ressemble s'assemble |
| *Mai vau un tèns que dous ou-auras* | Vaucluse | Mieux vaut un tien que deux tu l'auras |
| *La flour d'un jour duro uno journado* | Camargue | La fleur d'un jour dure une journée — la beauté éphémère passe vite |
| *Rèn que la vèritat es bello* | Aix-en-Provence | Rien que la vérité est belle |
| *Parlo pèr parla, es pèrdre soun tèms* | Manosque | Parler pour parler, c'est perdre son temps |
| *Aquèu qu'a pas soufèrt, coumpren pas la joio* | Haute-Provence | Celui qui n'a pas souffert ne comprend pas la joie |
