# 📜 Cahier des Charges : Portail Culturel Provençal (v1.2)

**Date :** 13/04/2026  
**Versions :** v1.0 → v1.1 (07/04) → v1.2 (13/04 — ajout module Articles, modèle de données, API, données de test) → v1.3 (13/04 — structure CSV dictionnaire, sources lexicographiques, Swagger) → v1.4 (13/04 — navigation desktop/mobile, catégories articles, contraintes typologies) → v1.5 (13/04 — UX/UI détaillé 30 décisions §4.2) → v1.6 (13/04 — terminologie : occitan/OC → provençal partout) → v1.7 (13/04 — états vides, pagination, filtres mobile, focus SPA, mentions légales, session, snackbar) → v1.8 (13/04 — module Dictons/Expressions, page accueil term-du-jour, graphies, traducteur, périodes auto, filtres date/lieu, session warning, À propos)  
**Statut :** Validé pour développement  
**Confidentialité :** Usage interne  
**Cible :** Sponsors, Product Owner, Équipes Dev & Ops

---

## 1. Vision Stratégique
Création d'un portail sobre et éditorial dédié à la valorisation de la langue provençale (toutes graphies confondues).

- **Public cible :** 20 à 90 ans (focus accessibilité seniors).
- **Modèle :** Non commercial, pas d'impératif SEO.
- **Design :** Inspiration *franceinfo.fr* (sobriété, clarté).

---

## 2. Gouvernance & Utilisateurs
Gestion simplifiée pour une équipe de confiance.

- **Contributeurs :** Maximum 10 personnes.
- **Authentification :** JWT + bcrypt (Pseudo / Mot de passe uniquement).
- **Administration :** Pas d'interface d'administration applicative. La création de compte et la maintenance lourde se font directement en base de données par l'administrateur système.
- **Gestion des conflits :** Verrouillage d'édition (`locked_by`) et système de **rollback** limité à la toute dernière action effectuée.

---

## 3. Modules Fonctionnels

### 3.1 Dictionnaire Français-Provençal
- **Import :** Via fichier CSV/Excel (séparateur `;`, encodage UTF-8). En cas d'erreur de format (ligne malformée, nombre de colonnes incorrect), l'import s'arrête immédiatement et retourne le numéro de ligne fautive. Les champs de traduction vides sont acceptés.
- **Structure du fichier d'import :** 13 colonnes (voir section 12 pour le détail complet).
- **Logique :** Relations N-N — un mot français peut avoir plusieurs traductions provençales selon la graphie et la source lexicographique.
- **Graphies par défaut :** Deux graphies sont activées par défaut et ont la même valeur (aucune n'est hiérarchiquement supérieure à l'autre) :
  - **Mistralienne** (graphie du Félibrige, codifiée par Frédéric Mistral, 1854)
  - **Classique IEO** (graphie de l'Institut d'Estudis Occitans, norme moderne)
  Les autres graphies historiques (pré-mistralienne, régionale) sont présentes en base via les sources lexicographiques mais ne sont pas mises en avant par défaut.
- **Affichage :** Tri par ordre alphabétique du mot français, groupement par thème puis catégorie.
- **Filtres :** Sélection par graphie (mistralienne, classique IEO, toutes) et par source lexicographique (Garcin, Honnorat, Pellas…).
- **Moteur :** Recherche avec suggestion de mots proches (distance de Levenshtein via `pg_trgm`).

### 3.2 Traducteur Lexical
- **Mécanisme :** Traduction **mot à mot** basée sur le dictionnaire. Il ne s'agit pas d'une traduction contextuelle ou grammaticale — chaque mot français est remplacé par sa traduction provençale la plus courante, sans accord ni conjugaison.
- **Mention explicite dans l'interface :** Un encart permanent sous le champ de saisie précise : *« Traducteur mot à mot — la traduction automatique de phrases complètes est prévue dans une version future. »*
- **Interface :** Traduction temps réel avec "debounce" (500ms) pour limiter les appels API.
- **Règles :** Conservation de la ponctuation et des mots inconnus.

### 3.3 Agenda Culturel
- **Champs :** `titre`, `date_debut` (date ISO), `date_fin` (date ISO), `lieu` (ville + code dept), `description` (≤ 1000 car.), `lien_externe` (URL optionnelle).
- **Cycle de vie :** Un événement est **archivé automatiquement** dès que `date_fin` < date du jour. Il reste consultable mais disparaît de l'affichage principal.
- **Consultation :** Vue principale = événements à venir (chronologique). Archives navigables par année puis par mois.
- **Droits :** Création, modification, suppression réservées aux contributeurs authentifiés. Consultation publique.

### 3.4 Bibliothèque (Histoires & Légendes)
- **Champs :** `titre`, `typologie` (`Histoire` | `Légende`), `periode` (texte libre), `description_courte` (≤ 200 car., texte brut), `description_longue` (Markdown, texte libre), `source_url` (lien externe optionnel).
- **Périodes :** Champ texte libre. Les périodes disponibles dans les filtres sont **calculées dynamiquement** à partir des valeurs distinctes présentes en base — aucune liste prédéfinie. L'interface de saisie propose une autocomplétion sur les valeurs existantes pour maintenir la cohérence.
- **Édition :** Saisie de `description_longue` en **Markdown** avec prévisualisation en temps réel.
- **Multilinguisme :** Lien bidirectionnel optionnel entre versions provençale et FR (même contenu, deux entrées liées par un `id_traduction`).
- **Images :** Compression automatique (côté client) à **2 Mo maximum** avant stockage en base de données (PostgreSQL). Une image par entrée, champ optionnel.
- **Droits :** Création, modification, suppression réservées aux contributeurs authentifiés. Consultation publique.

### 3.5 Actualités / Articles Culturels
- **Champs :** `titre`, `description` (chapeau éditorial ≤ 300 car.), `image_url` (chemin relatif `/static/articles/`), `source_url` (lien externe optionnel), `date_publication` (date ISO), `auteur` (texte libre), `categorie` (valeur parmi la liste fixe ci-dessous).
- **Catégories (liste fermée — 20 valeurs) :**

| Valeur exacte | Description |
|---|---|
| `Langue & Culture` | Défense de la langue provençale, graphies, linguistique |
| `Littérature` | Œuvres, auteurs, romans, nouvelles en langue provençale ou sur la Provence |
| `Poésie` | Poèmes, récitations, prix littéraires poétiques |
| `Histoire & Mémoire` | Faits historiques, commémorations, archives |
| `Traditions & Fêtes` | Fêtes populaires, pèlerinages, jeux traditionnels |
| `Musique` | Chants, instruments, groupes, disques en lien avec la Provence |
| `Danse` | Danses folkloriques, farandole, cours, troupes |
| `Gastronomie` | Recettes, produits du terroir, savoirs culinaires |
| `Artisanat` | Métiers d'art, santons, céramique, tissage provençal |
| `Patrimoine bâti` | Architecture, monuments, mas, villages perchés |
| `Environnement` | Garrigue, Camargue, Alpilles, écologie du territoire |
| `Personnalités` | Portraits de figures provençales (vivants ou historiques) |
| `Associations` | Actualité des associations de défense de la langue et de la culture |
| `Enseignement` | Filières bilingues, pédagogie, ressources éducatives |
| `Économie locale` | Agriculture, viticulture, artisanat économique |
| `Numismatique & Archives` | Monnaies, documents, manuscrits anciens |
| `Immigration & Diaspora` | Communautés provençales hors de Provence |
| `Jeunesse` | Initiatives, projets, créations portés par les jeunes |
| `Régionalisme & Politique linguistique` | Débats institutionnels, statut du provençal, politiques culturelles |
| `Divers` | Articles ne rentrant dans aucune autre catégorie |

- **Affichage :** Tri par `date_publication` décroissante sur la page d'accueil. Pas de pagination au-delà de 20 articles (archivage en base, non paginé).
- **Droits :** Création, modification, suppression réservées aux contributeurs authentifiés. Consultation publique.
- **Pas de commentaires ni de système de like.** Portail éditorial uniquement.

### 3.6 Dictons, Expressions, Proverbes & Mémoires Vivantes
- **Objectif :** Valorisation du patrimoine oral provençal. Ce module regroupe des formes courtes transmises oralement et ancrées dans la culture locale.
- **Types (liste fermée — 4 valeurs) :** `Dicton` · `Expression` · `Proverbe` · `Mémoire vivante`
- **Champs (tous obligatoires) :**

| Champ | Type | Contrainte |
|-------|------|------------|
| `terme_provencal` | VARCHAR(500) | Non vide |
| `localite_origine` | VARCHAR(200) | Non vide (ville, département, région) |
| `traduction_sens_fr` | TEXT | Non vide — traduction littérale et/ou sens culturel |

- **Champs optionnels :** `type` (valeur parmi les 4 ci-dessus), `contexte` (texte libre, explication du contexte d'usage), `source` (origine documentaire ou personne ayant transmis le terme), `created_by` (FK users).
- **Mise en avant quotidienne :** Chaque jour, un terme est sélectionné aléatoirement parmi tous les types et affiché en position principale sur la page d'accueil. La sélection tourne sur 24h (basée sur `CURRENT_DATE % COUNT(*)`).
- **Droits :** Création, modification, suppression réservées aux contributeurs. Consultation publique.

#### Données de test initiales (30 entrées)

**10 Dictons**

| Terme provençal | Localité | Traduction / Sens |
|-----------------|----------|-------------------|
| *A la Candèu, l'ivèr s'en vèn o s'en vau* | Provence (général) | À la Chandeleur, l'hiver s'en vient ou s'en va — le temps de la Chandeleur annonce la suite de l'hiver |
| *Quand plèu pèr sant Mèdard, plèu quaranta jour mai tard* | Var | Quand il pleut pour la Saint-Médard, il pleut quarante jours plus tard |
| *Lou soulèu de jàniè es la mort dóu pàusant* | Arles | Le soleil de janvier est la mort du paresseux — le beau temps d'hiver incite à travailler |
| *Après la plueio, lou bèu tèms* | Bouches-du-Rhône | Après la pluie, le beau temps |
| *Quand la cigalo canto, lou blad es madur* | Camargue | Quand la cigale chante, le blé est mûr |
| *Lou vent di mount porto lou frèi, lou vent de mar porto la plueio* | Basses-Alpes | Le vent des montagnes apporte le froid, le vent de mer apporte la pluie |
| *Figo passo, avèn gras* | Var (Fayence) | Figue passée, avoir gras — quand les figues tardent, c'est bon signe pour la récolte |
| *En avri, fai pas çò que vòles* | Vaucluse | En avril, ne fais pas ce que tu veux — méfiance envers les caprices du temps d'avril |
| *Lou bon Dieu fai plòure sus li bòn e sus li mauvàis* | Marseille | Le bon Dieu fait pleuvoir sur les bons et sur les mauvais — la nature ne fait pas de distinction |
| *Felibre que canto, tèms que s'amèliouro* | Félibrige | Félibrige qui chante, temps qui s'améliore — l'art provençal est un présage heureux |

**10 Expressions**

| Terme provençal | Localité | Traduction / Sens |
|-----------------|----------|-------------------|
| *Aqueu que se buto en avans se tiro en arrié* | Aix-en-Provence | Celui qui se met en avant se tire en arrière — vantardise mal récompensée |
| *Faire lou figa* | Marseille | Faire la figue — geste d'irrespect, insulte gestuelle |
| *Sèn coume uno calheto* | Var | Sage comme une caille — qualité d'une personne calme et posée |
| *Avé lou ventre que canto* | Arles | Avoir le ventre qui chante — avoir très faim |
| *Faire bello figo de bèu fustet* | Manosque | Faire belle figue de beau fustet — belle apparence, peu de substance |
| *Ié manquo uno douga* | Bouches-du-Rhône | Il lui manque une douve (de tonneau) — il lui manque une case, il est un peu fou |
| *Sourti de la leissièiro* | Arles | Sortir de la lessive — être tiré d'une mauvaise situation |
| *Faire lou mounto-en-l'èr* | Toulon | Faire le monte-en-l'air — se vanter, se donner de l'importance |
| *Vaqui lou bèu tèms* | Aix-en-Provence | Voilà le beau temps — tout va bien, situation favorable |
| *Bello fèsto, courto joio* | Salon-de-Provence | Belle fête, courte joie — les bons moments passent vite |

**10 Proverbes**

| Terme provençal | Localité | Traduction / Sens |
|-----------------|----------|-------------------|
| *Qu'a pas d'argent, a pas d'amis* | Provence (général) | Qui n'a pas d'argent n'a pas d'amis — la fortune conditionne les amitiés |
| *Fau pas vendre la pèu de l'ors avant de l'avé tuat* | Var | Il ne faut pas vendre la peau de l'ours avant de l'avoir tué |
| *La lengo n'a pas d'os, mai èu roumpo li os* | Arles | La langue n'a pas d'os, mais elle brise les os — la parole peut faire beaucoup de mal |
| *Lou tèms es de l'argent* | Marseille | Le temps est de l'argent — adapteur provençal du proverbe universel |
| *Quau s'assemblo, s'assemblo* | Bouches-du-Rhône | Qui se ressemble s'assemble |
| *Mai vau un tèns que dous ou-auras* | Vaucluse | Mieux vaut un tien que deux tu l'auras — l'acquis vaut mieux que l'espéré |
| *La flour d'un jour duro uno journado* | Camargue | La fleur d'un jour dure une journée — la beauté éphémère passe vite |
| *Rèn que la vèritat es bello* | Aix-en-Provence | Rien que la vérité est belle |
| *Parlo pèr parla, es pèrdre soun tèms* | Manosque | Parler pour parler, c'est perdre son temps — l'inutilité du bavardage |
| *Aquèu qu'a pas soufèrt, coumpren pas la joio* | Haute-Provence | Celui qui n'a pas souffert ne comprend pas la joie |

---

## 4. UX & Accessibilité (Standards Seniors)
- **Typographie :** Police sans empattement, taille de corps de texte minimale à **18px**. Pas de bouton d'ajustement de taille — on respecte le réglage navigateur de l'utilisateur.
- **Contrastes :** Respect strict des normes **WCAG AA** (ratio 4.5:1).
- **Interactions :** Zones cliquables de **44x44px** minimum pour faciliter la navigation tactile.
- **Navigation :** URLs uniques par contenu pour permettre le partage par lien direct.
- **Mode sombre :** Non implémenté — palette "Terre de Provence" claire uniquement.
- **Animations :** Transitions douces (fade-in discrets uniquement, pas de mouvements latéraux ni de zoom). Pas d'animation avec `prefers-reduced-motion: reduce`.
- **Langue de l'interface :** Français uniquement.
- **Focus SPA :** Après toute navigation côté client (React Router), le focus est replacé sur le `<h1>` de la nouvelle page (WCAG 2.4.3).
- **Ancres & barre fixe :** `scroll-margin-top: 64px` sur tout élément cible d'ancre en desktop (hauteur barre de navigation). Non applicable mobile (barre en bas).
- **`<title>` HTML :** Titre de la page courante uniquement, sans suffixe (ex. `Agenda`, `Lo Félibrige : 170 ans de combat…`).

---

## 4.1 Navigation — Spécifications

### Structure des entrées (Option B — 6 entrées)

| # | Icône | Libellé | Contenu |
|---|-------|---------|--------|
| 1 | 🏠 | Accueil | Page principale — Terme du jour + flux des articles |
| 2 | 📖 | Langue | Dictionnaire FR→Provençal + Traducteur lexical (sous-menu) |
| 3 | 📅 | Agenda | Événements culturels à venir et archives |
| 4 | 📚 | Culture | Bibliothèque — Histoires & Légendes |
| 5 | ℹ️ | À propos | Démarche, contributeurs, sources |
| 6 | 👤 | Compte | Connexion / Espace contributeur |

### Sous-menu "Langue" (entrée n°2)

Déclenché au clic (desktop) ou au tap (mobile) sur "Langue" :

| Entrée sous-menu | Cible |
|---|---|
| Dictionnaire | Recherche FR→Provençal avec filtres par source et graphie |
| Traducteur | Traducteur lexical temps réel (debounce 500 ms) |

---

### Navigation Desktop (≥ 768px)

- **Position :** Barre horizontale fixe en **haut** de page (`position: fixed; top: 0`).
- **Fond :** `#F9F7F2` — bordure basse `1px solid #D1CEC7`.
- **Contenu :** Logo texte "Provençal.ia" à gauche · entrées de menu (icône + libellé) centrées · bouton "Compte" isolé à droite.
- **Hauteur :** 64px.
- **Icônes + libellés :** toujours visibles (pas d'icônes seules), taille libellé 16px minimum.
- **Entrée active :** libellé en gras, soulignement `2px` couleur `#869121`.
- **Entrées inactives :** couleur `#2D2926`, opacité 0.75 au repos, 1.0 au survol/focus.
- **Sous-menu "Langue" :** dropdown affiché au clic ET au focus clavier (`:focus-within`), fermé au clic extérieur ou touche `Escape`. Fond `#F9F7F2`, bordure `#D1CEC7`, ombre portée légère.
- **Comportement au scroll :** barre **fixe en permanence** — le contenu principal a un `padding-top` égal à la hauteur de la barre (64px).

### Navigation Mobile (< 768px)

- **Position :** Barre horizontale fixe en **bas** de page (`position: fixed; bottom: 0`).
- **Fond :** `#F9F7F2` — bordure haute `1px solid #D1CEC7` — ombre portée vers le haut.
- **Hauteur :** 60px (zones tactiles ≥ 44x44px garanties).
- **Contenu :** 5 entrées de largeur égale (flex, `flex: 1`), icône centrée au-dessus du libellé court.
- **Libéllés courts :** Accueil · Langue · Agenda · Culture · À propos · Compte (≤ 8 caractères).
- **Taille libellé :** 11px minimum sous l'icône.
- **Entrée active :** icône couleur `#869121`, libellé gras `#869121`.
- **Entrées inactives :** icône et libellé `#2D2926` à 65% d'opacité.
- **Sous-menu "Langue" :** panneau modal demi-écran (bottom sheet) glissant depuis le bas au tap sur "Langue", avec deux boutons "Dictionnaire" et "Traducteur". Fermé par tap en dehors ou sur une croix ×.
- **Comportement au scroll :** barre **fixe en permanence** — le contenu principal a un `padding-bottom` égal à la hauteur de la barre (60px) pour ne jamais être masqué.
- **Pas de logo** dans la barre mobile — le titre de la page en cours est affiché dans un `<header>` séparé au haut du contenu.

### Accessibilité navigation

- Attribut `aria-current="page"` sur l'entrée active.
- Navigation clavier complète (Tab, Enter, Escape sur le sous-menu).
- Attribut `aria-label` sur chaque entrée de menu.
- Le bottom sheet mobile est un `<dialog>` natif ou géré avec `role="dialog"` + `aria-modal="true"`.
- Focus piégé dans le bottom sheet tant qu'il est ouvert.

---

## 4.2 UX par Page et Module

### Page d'accueil (Terme du jour + Articles)
- **URL :** `/` — la page d'accueil est la page principale du site.
- **Contenu affiché :**
  1. **Terme du jour** (bloc mis en avant en haut de page) : terme provençal issu du module Dictons/Expressions/Proverbes, sélectionné automatiquement toutes les 24h. Affichage : terme + type + localité d'origine + traduction/sens.
  2. **Flux des derniers articles publiés** en dessous, liste verticale type journal.
- **Mise en page :** Titre, auteur, date et chapeau (≤ 300 car.) par article. L'image est affichée uniquement si renseignée, sinon placeholder logo du site.
- **Pas de filtre** sur la page d'accueil.
- **Liens externes :** Toujours ouverts dans un nouvel onglet (`target="_blank" rel="noopener noreferrer"`).
- **Pas de barre de recherche globale.** Chaque module gère sa propre recherche.

### Dictionnaire
- **Affichage des résultats :** Tableau avec colonnes « Mot français » et « Traduction ». Les variantes par source (TradEG, TradD…) accessibles dans un bloc replié sous chaque ligne, dépliable au clic.
- **Filtres :** Deux filtres en cascade au-dessus du tableau : **Thème** puis **Catégorie** (la liste des catégories se met à jour selon le thème choisi). Toujours visibles. Sur mobile : deux `<select>` empilés au-dessus du tableau.
- **Recherche textuelle :** Champ de recherche libre au-dessus des filtres. Lorsqu'une recherche est saisie, les filtres Thème/Catégorie sont automatiquement désactivés (grisés) — la recherche porte sur toutes les entrées.
- **Pagination :** Sous le tableau, sélecteur : **10 / 20 / 50 / 100** résultats par page. Valeur par défaut : 20.
- **États vides :**
  - Mot présent en base mais sans traduction → *« Mot non traduit »*
  - Mot absent de la base → *« Pas de mot trouvé »*

### Articles (page `/articles`)
- **Accès :** Lien depuis la page d'accueil (« Voir tous les articles ») ou via fil d'Ariane.
- **URL :** `/articles`
- **Filtres :** Filtre par **date** (année/mois, sélecteur) + filtre par **lieu** (champ texte libre sur `auteur` ou lieu mentionné). Aucun autre filtre.
- **Affichage :** Identique à la page d'accueil (liste journal) avec filtres actifs.

### Traducteur lexical
- **Desktop :** Zone de saisie à gauche, résultat à droite (layout 50/50).
- **Mobile :** Zone de saisie en haut, résultat en dessous (empilé).
- **Mots inconnus :** Conservés tels quels dans le résultat, mis en évidence visuellement (ex. fond jaune pâle ou italique coloré).
- **Mention permanente :** Encart sous le champ : *« Traducteur mot à mot — la traduction automatique de phrases complètes est prévue dans une version future. »*

### Agenda culturel
- **Vue principale :** Les 3 prochains événements mis en avant (cartes larges avec date + lieu + titre). Le reste en liste compacte chronologique en dessous.
- **Événements passés :** Accessibles uniquement via un lien « Archives » séparé — absents de la vue principale.
- **Filtres :** Filtre par **date** (année/mois) + filtre par **lieu** (champ texte libre sur le champ `lieu`). Pas d'autres filtres.
- **État vide :** Si aucun événement à venir, afficher un événement fictif générique avec la mention *« Mise à jour à faire par l'administrateur »* en lieu et place du titre.

### Bibliothèque — Histoires & Légendes
- **Liste :** Liste sobre : titre + description courte + période. Pas d'images en liste.
- **Filtres :** Sélecteur **Tout / Histoire / Légende** + filtre par **période** (valeurs dynamiques issues de la base) + filtre par **lieu** (champ texte sur le champ `periode` ou métadonnées) + filtre par **date de publication** (année/mois).
- **Chargement :** Infinite scroll — les entrées se chargent automatiquement au défilement.
- **État vide :** Impossible en conditions normales (la base est initialisée avec des données de départ).
- **Page de lecture :** Colonne de texte centrée, large (max 720px), style article de magazine. Police sans-empattement (cohérence charte). Texte Markdown rendu proprement.
- **Contenu bilingue :** Toggle switch « FR / Provençal » en position `sticky` en haut de la page de lecture (reste visible au scroll), uniquement si une version dans l'autre langue existe. Pas de mémorisation entre pages.

### Feedback & États de l'interface
- **Action réussie :** Snackbar en bas de l'écran (durée 3 secondes, couleur `#869121`). Position : `bottom: 16px` desktop — `bottom: 76px` mobile (au-dessus de la barre de navigation de 60px + 16px de marge).
- **Erreur réseau / timeout :** Snackbar rouge (durée 4 secondes), même positionnement.
- **Session expirée :** Redirection silencieuse vers la page de connexion. Les modifications en cours sont perdues sans avertissement.
- **Avertissement pré-expiration :** Lorsqu'un contributeur est en cours de modification d'un contenu et que sa session expire dans **5 minutes**, une bannière d'avertissement s'affiche en haut de la page :
  *« Votre session expire dans 5 minutes. Enregistrez vos modifications pour ne pas les perdre. »*
  La bannière se met à jour avec un compte à rebours (ex. « 3 min », « 1 min »). Elle n'apparaît que si un formulaire d'édition est ouvert.
- **Erreur formulaire :** Texte d'erreur rouge sous le champ concerné + bordure du champ rouge. Pas de récapitulatif en haut.
- **Chargement :** Spinner centré sur la zone concernée (pas de spinner pleine page sauf chargement initial).
- **Page 404 :** Message clair + liens directs vers les 4 modules principaux (Dictionnaire, Agenda, Bibliothèque, Accueil).

### Authentification & Espace contributeur
- **Création de compte :** Sur invitation uniquement. Les identifiants (pseudo + mot de passe) sont créés directement en base par l'administrateur — aucun formulaire d'inscription public.
- **Redirection post-connexion :** L'utilisateur est renvoyé sur la page depuis laquelle il s'est connecté.
- **Interface contributeur :** Intégrée au site public — pas de section `/admin` séparée. Les boutons d'édition/création apparaissent directement sur les pages concernées lorsqu'un contributeur est connecté.

### Fil d'Ariane & Retour
- **Fil d'Ariane :** Présent sur toutes les pages de détail (article, histoire, événement).
- **Bouton Retour :** Bouton "← Retour" explicite en haut à gauche de chaque page de détail, en plus du fil d'Ariane.

### Page « À propos »
- **URL :** `/a-propos`
- **Objectif :** Instaurer la confiance auprès du public local avant toute contribution ou utilisation. Les Provençaux aiment savoir à qui ils ont affaire.
- **Structure de la page (3 blocs) :**
  1. **La démarche** — Pourquoi ce site ? Quel problème cherche-t-on à résoudre ? Texte éditorial, à renseigner par l'administrateur.
  2. **Les contributeurs** — Liste des contributeurs actifs avec leur pseudo et (optionnellement) leur domaine de compétence. Pas de nom réel si l'auteur choisit l'anonymat.
  3. **Les sources** — Références des 7 sources lexicographiques du dictionnaire (reprises de §12.4) + liste des fonds documentaires utilisés pour la bibliothèque.
- **Mise à jour :** Contenu statique géré directement en base ou via fichier de configuration — pas d’interface d’édition dédiée.

### Pied de page (footer)
- **Mobile :** Absent (la barre de navigation en bas remplace le footer).
- **Desktop :** Minimal — crédits lexicographiques (liste des 7 auteurs sources) + lien « Mentions légales ».
- **Page `/mentions-legales` (statique) :**
  - *Hébergeur :* non applicable (hébergement local / privé).
  - *Éditeur :* non applicable (auteur anonyme, projet privé non commercial).
  - *SIRET :* non applicable (particulier).
  - *Données personnelles :* aucune collecte de données personnelles identifiables. Pas de cookies tiers. Pas de tracking.
  - *Contact :* adresse e-mail de contact (à renseigner).

---

## 5. Spécifications Techniques
- **Stack :** React (TypeScript) / FastAPI (Python) / PostgreSQL.
- **Sécurité :** HTTPS forcé. Pas de collecte de données personnelles identifiables (RGPD non applicable sur pseudo/password sans lien identifiant).
- **CI/CD :** Pipeline automatisé (GitHub/GitLab) avec tests unitaires basiques (check routes API et santé BDD).

---

## 6. Infrastructure & Production (Ops)
- **Hébergement :** Cluster Kubernetes (3 pods minimum : Front, Back, BDD).
- **Certificat SSL :** Let's Encrypt automatique via Certbot ou Ingress Controller.
- **Disponibilité Nocturne :** Arrêt automatisé des pods de 20h à 8h via **CronJob K8s** (économie de ressources).
- **Maintenance :** Sauvegardes hebdomadaires du volume PostgreSQL. Logs console Docker.

---

## 7. Charte graphique
**Thème principal :** style général proche de franceinfo  
**Palette de couleur :** "Terre de Provence" (Chaleureuse et Culturelle) Cette palette utilise des tons liés à la Provence (ocre, olivier, pierre) tout en restant très sobre pour ne pas tomber dans le "cliché" touristique.

| Élément | Couleur (Hex) | Rôle |
|---|---:|---|
| Fond Principal | #F9F7F2 | Blanc cassé "coquille d'œuf" (plus doux pour les yeux). |
| Texte de Corps | #2D2926 | Brun très sombre (charbon de terre). |
| Accent Primaire | #869121 | Vert Olive sourd pour les boutons et titres. |
| Accent Secondaire | #D5713F | Terre cuite pour les alertes ou éléments d'agenda. |
| Bordures | #D1CEC7 | Gris |

---

## 8. Points à Trancher (Ouverts)
1. **Provider Cloud :** Choix de l'hébergeur Kubernetes (OVH, Scaleway, Hetzner…).
2. **Nom de domaine :** À réserver (provencal.ia ou autre).
3. **Graphie par défaut du dictionnaire :** Quelle graphie afficher en premier dans les résultats de recherche et dans le traducteur ? (Mistralienne recommandée comme graphie principale, les autres en secondaire.)
4. **Stockage des images :** Images en base PostgreSQL (blob) ou stockage objet S3-compatible (MinIO, OVH Object Storage) ? La limite de 2 Mo par image rend le stockage en base acceptable à court terme mais risqué à l'échelle.
5. **Workflow de validation du contenu :** Les contributeurs publient-ils directement (`published`) ou via un statut `draft` → validation par un relecteur avant mise en ligne ?
6. **Import dictionnaire — encodage :** Le fichier source CSV utilise un encodage non-UTF-8 (Windows-1252 probable). Confirmer l'encodage attendu lors des imports Excel/CSV et documenter la procédure de conversion.
7. **SSL en développement :** HTTPS non applicable en local (voir plan de travail). Confirmer si des certificats auto-signés sont nécessaires pour tester les cookies `Secure` en local.

---

## 9. Modèle de Données Simplifié

Schéma relationnel cible (PostgreSQL). Les types sont indicatifs.

```
users
  id            SERIAL PK
  pseudo        VARCHAR(50) UNIQUE NOT NULL
  password_hash VARCHAR(255) NOT NULL
  created_at    TIMESTAMP DEFAULT now()

dict_entries           -- mots français
  id            SERIAL PK
  mot_fr        VARCHAR(200) NOT NULL
  synonyme_fr   VARCHAR(200)
  description   TEXT
  theme         VARCHAR(100)
  categorie     VARCHAR(100)

dict_translations      -- traductions provençales (relation N-N)
  id            SERIAL PK
  entry_id      FK → dict_entries.id
  graphie       VARCHAR(50)  -- ex. "mistralienne", "classique", "doublon"
  traduction    VARCHAR(500) NOT NULL
  region        VARCHAR(50)  -- ex. "EG", "D", "A", "H", "Av", "P"

agenda_events
  id            SERIAL PK
  titre         VARCHAR(200) NOT NULL
  date_debut    DATE NOT NULL
  date_fin      DATE NOT NULL
  lieu          VARCHAR(200)
  description   VARCHAR(1000)
  lien_externe  VARCHAR(500)
  created_by    FK → users.id
  created_at    TIMESTAMP DEFAULT now()

library_entries        -- Histoires & Légendes
  id                SERIAL PK
  titre             VARCHAR(200) NOT NULL
  typologie         VARCHAR(20)  CHECK IN ('Histoire','Légende')
  periode           VARCHAR(200) -- texte libre, autocomplétion sur valeurs existantes
  description_courte VARCHAR(200)
  description_longue TEXT         -- Markdown
  source_url        VARCHAR(500)
  image             BYTEA        -- compressé ≤ 2 Mo
  lang              CHAR(2) DEFAULT 'fr'
  traduction_id     FK → library_entries.id (optionnel, lien Provençal↔FR)
  locked_by         FK → users.id (optionnel)
  created_by        FK → users.id
  created_at        TIMESTAMP DEFAULT now()

articles
  id               SERIAL PK
  titre            VARCHAR(200) NOT NULL
  description      VARCHAR(300)
  image_url        VARCHAR(500)
  source_url       VARCHAR(500)
  date_publication DATE NOT NULL
  auteur           VARCHAR(100)
  categorie        VARCHAR(100)  -- valeur parmi les 20 catégories définies en section 3.5
  created_by       FK → users.id
  created_at       TIMESTAMP DEFAULT now()

sayings                -- Dictons, Expressions, Proverbes & Mémoires vivantes
  id               SERIAL PK
  terme_provencal  TEXT NOT NULL
  localite_origine VARCHAR(200) NOT NULL
  traduction_sens_fr TEXT NOT NULL
  type             VARCHAR(30)  CHECK IN ('Dicton','Expression','Proverbe','Mémoire vivante')
  contexte         TEXT         -- explication contexte d'usage (optionnel)
  source           VARCHAR(300) -- référence ou transmetteur (optionnel)
  created_by       FK → users.id
  created_at       TIMESTAMP DEFAULT now()
```

> **Verrouillage d'édition :** Le champ `locked_by` sur `library_entries` (et potentiellement sur `articles`) empêche deux contributeurs d'éditer simultanément. Le verrou est levé à la sauvegarde ou après un timeout de 30 minutes.

---

## 10. Principaux Endpoints API

Base URL en production : `https://<domaine>/api/v1`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/auth/login` | Non | Retourne un JWT (`access_token`) |
| POST | `/auth/logout` | Oui | Invalide le token côté serveur (blacklist) |
| GET | `/health` | Non | Santé de l'API et de la BDD |
| GET | `/dictionary` | Non | Liste paginée + recherche (`?q=`) avec suggestions Levenshtein |
| POST | `/dictionary/import` | Oui | Import CSV/Excel (arrêt immédiat sur erreur de format) |
| GET | `/sayings/today` | Non | Terme du jour (sélection automatique 24h) |
| GET | `/sayings` | Non | Liste paginée + filtre `?type=Dicton\|Expression\|Proverbe\|Mémoire vivante` |
| POST | `/sayings` | Oui | Créer une entrée |
| PUT | `/sayings/{id}` | Oui | Modifier une entrée |
| DELETE | `/sayings/{id}` | Oui | Supprimer une entrée |
| GET | `/events` | Non | Événements à venir (`?archive=true` pour les archives) |
| POST | `/events` | Oui | Créer un événement |
| PUT | `/events/{id}` | Oui | Modifier un événement |
| DELETE | `/events/{id}` | Oui | Supprimer un événement |
| GET | `/library` | Non | Liste (`?type=Histoire\|Légende&periode=`) |
| GET | `/library/{id}` | Non | Détail d'une entrée |
| POST | `/library` | Oui | Créer une entrée |
| PUT | `/library/{id}` | Oui | Modifier (vérifie `locked_by`) |
| DELETE | `/library/{id}` | Oui | Supprimer (rollback dernière action uniquement) |
| GET | `/articles` | Non | Liste triée par `date_publication` desc |
| POST | `/articles` | Oui | Créer un article |
| PUT | `/articles/{id}` | Oui | Modifier un article |
| DELETE | `/articles/{id}` | Oui | Supprimer un article |
| POST | `/translate` | Non | Traduction lexicale mot-à-mot depuis le dictionnaire |

> **Codes HTTP standards :** `200 OK`, `201 Created`, `400 Bad Request` (validation), `401 Unauthorized`, `403 Forbidden` (verrou actif), `404 Not Found`, `409 Conflict` (doublon), `500 Internal Server Error`.

---

## 11. Données de Test de Référence

Les fichiers suivants dans `docs/sources/` constituent les jeux de données de test canoniques :

| Fichier | Module | Contenu |
|---------|--------|---------|
| `src_dict.csv` | Dictionnaire | 6 049 entrées réelles FR→Provençal, 13 thèmes, 41 catégories (UTF-8, séparateur `;`) |
| `articles_exemple.txt` | Actualités | 4 articles culturels réalistes (Félibrige, Saintes-Maries, enseignement provençal, graphies) |
| `histoire_exemple.txt` | Bibliothèque | 5 entrées (3 Histoires, 2 Légendes) avec contenu Markdown réel |
| `agenda_exemple.txt` | Agenda | 5 événements culturels avec dates et lieux réels |
| `sayings_exemple.txt` | Dictons/Expressions | 30 entrées (10 dictons, 10 expressions, 10 proverbes) issues de §3.6 |

> Ces données permettent de valider les imports, l'affichage, la recherche et les filtres de chaque module sans dépendre de données de production.

---

## 12. Structure du Fichier d'Import Dictionnaire

### 12.1 Format général

- **Fichier :** CSV ou Excel (`.csv` / `.xlsx`)
- **Séparateur :** `;` (point-virgule)
- **Encodage attendu :** UTF-8
- **Première ligne :** En-tête obligatoire (noms de colonnes exacts ci-dessous)
- **Colonnes :** 13 exactement — toute ligne avec un nombre différent de colonnes stoppe l'import

### 12.2 Colonnes détaillées

| N° | Nom de colonne | Obligatoire | Longueur max | Description |
|----|---------------|-------------|--------------|-------------|
| 1 | `Thème` | Oui | 100 | Thème principal du vocabulaire (ex. `Nature`, `Animaux`, `Cuisine`) |
| 2 | `Catégorie` | Oui | 100 | Sous-catégorie du thème (ex. `Plantes Potageres`, `Les Oiseaux`) |
| 3 | `Mot français` | Oui | 200 | Entrée principale en français. Une ligne sans ce champ est rejetée. |
| 4 | `Synonyme français` | Non | 200 | Synonymes ou variantes françaises du mot (texte libre, séparés par des espaces) |
| 5 | `Description` | Non | texte libre | Contexte, notes d'usage, étymologie ou précision botanique/zoologique |
| 6 | `Traduction` | Non* | 500 | Traductions provençales canoniques, toutes graphies confondues, séparées par des espaces. Au moins une traduction (col. 6 à 13) doit être renseignée. |
| 7 | `TradEG` | Non | 500 | Traduction selon **E. Garcin** (1823, Grasse/Var) |
| 8 | `TradD` | Non | 500 | Traduction selon **Autran** (Alpes-Maritimes) |
| 9 | `TradA` | Non | 500 | Traduction selon **Achard** (1785, Alpes-Maritimes) |
| 10 | `TradH` | Non | 500 | Traduction selon **S.J. Honnorat** (1846, Var) |
| 11 | `TradAv` | Non | 500 | Traduction selon **Avril** (1834, Marseille) |
| 12 | `TradP` | Non | 500 | Traduction selon **Abbé Pellas** (1723, Marseille) |
| 13 | `TradX` | Non | 500 | Traduction selon **Xavier de Fourvières** (1901, Vallée du Rhône) |

> \* Au moins une des colonnes 6 à 13 doit être non vide pour qu'une ligne soit importée.

### 12.3 Thèmes reconnus

| Thème | Description |
|-------|-------------|
| `Nature` | Plantes, arbres, champignons, fleurs |
| `Animaux` | Oiseaux, poissons, insectes, mammifères |
| `Cuisine` | Recettes, techniques culinaires, ustensiles |
| `Armée` | Vocabulaire militaire et maritime |
| `Quotidien` | Métiers, outils, vie rurale |
| `Travail` | Vignoble, sériciculture, battage, liège |
| `Divers` | Jeux, mesures, monnaies, recettes anciennes |
| `Corps Humain Et Sante` | Anatomie, maladies, remèdes, soins |
| `Maison Et Habitat` | Pièces, mobilier, constructions rurales (mas, bastide…) |
| `Famille Et Relations` | Parenté, voisinage, états civils |
| `Religion Et Croyances` | Saints, rites, superstitions, fées, dracs |
| `Geographie Et Territoire` | Reliefs, cours d'eau, chemins |
| `Langue Et Grammaire` | Particules, expressions courantes, verbes |

### 12.4 Sources lexicographiques provençales

Les sept sources correspondent à des lexicographes et dictionnaires historiques qui constituent la base documentaire du dictionnaire. Chacune représente une zone géographique ou une époque précise de la langue provençale.

| Code colonne | Auteur | Ouvrage / Référence | Année | Zone géographique |
|---|---|---|---|---|
| `TradEG` | **Étienne Garcin** | *Dictionnaire provençal-français* | 1823 | Grasse, Var |
| `TradD` | **Autran** | *(Glossaire manuscrit)* | XIXe s. | Alpes-Maritimes |
| `TradA` | **Claude-François Achard** | *Dictionnaire de la Provence et du Comté Venaissin* | 1785 | Alpes-Maritimes |
| `TradH` | **Simon-Jude Honnorat** | *Dictionnaire provençal-français* (4 vol.) | 1846–1848 | Var, Basses-Alpes |
| `TradAv` | **Avril** | *Dictionnaire provençal-français* | 1834 | Marseille, Bouches-du-Rhône |
| `TradP` | **l'Abbé Pierre Pellas** | *Dictionnaire provençal et français* | 1723 | Marseille |
| `TradX` | **Xavier de Fourvières** (pseudonyme de l'abbé Joseph Roux) | *Lou Pichot Trésor* | 1901 | Vallée du Rhône, Vaucluse |

> **Note graphique :** Ces sources sont antérieures à la codification du Félibrige (1854) et à la norme classique (IEO). Les traductions qu'elles contiennent sont en **graphie pré-mistralienne** ou **mistralienne ancienne**, avec des variantes régionales significatives d'une source à l'autre. La colonne `Traduction` (col. 6) consolide la ou les formes les plus répandues sans attribution à une source unique.

### 12.5 Comportement de l'import API

```
POST /api/v1/dictionary/import
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: { file: <fichier CSV ou XLSX> }
```

**Réponses :**

| Code | Cas |
|------|-----|
| `200` | Import réussi — retourne `{ imported: N, skipped: 0 }` |
| `400` | Erreur de format — retourne `{ error: "Ligne 42 : 11 colonnes trouvées, 13 attendues" }` |
| `400` | Encodage non-UTF-8 détecté — retourne `{ error: "Encodage non supporté. Convertir en UTF-8." }` |
| `401` | Token manquant ou invalide |
| `409` | Doublon détecté (même mot fr + thème + catégorie) — l'import s'arrête et retourne la ligne fautive |

---

## 13. Interface de Documentation API (Swagger)

L'API expose une documentation interactive **Swagger UI** accessible uniquement en environnement de développement local.

| Environnement | URL Swagger UI | URL ReDoc |
|---|---|---|
| Développement local | `http://localhost:8000/docs` | `http://localhost:8000/redoc` |
| Production | **Désactivé** (sécurité) | **Désactivé** |

> Le Swagger est désactivé en production via la variable d'environnement `ENVIRONMENT=production`. En développement (`ENVIRONMENT=development`), il est actif automatiquement au démarrage du backend.
