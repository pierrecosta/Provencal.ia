# 📜 Cahier des Charges : Portail Culturel Provençal (v1.2)

**Date :** 13/04/2026  
**Versions :** v1.0 → v1.1 (07/04) → v1.2 (13/04 — ajout module Articles, modèle de données, API, données de test) → v1.3 (13/04 — structure CSV dictionnaire, sources lexicographiques, Swagger) → v1.4 (13/04 — navigation desktop/mobile, catégories articles, contraintes typologies)  
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
- **Affichage :** Tri par ordre alphabétique du mot français, groupement par thème puis catégorie.
- **Filtres :** Sélection par graphie (mistralienne, classique) et par source lexicographique (Garcin, Honnorat, Pellas…).
- **Moteur :** Recherche avec suggestion de mots proches (distance de Levenshtein via `pg_trgm`).

### 3.2 Traducteur Lexical
- **Mécanisme :** Traduction mot à mot basée sur le dictionnaire.
- **Interface :** Traduction temps réel avec "debounce" (500ms) pour limiter les appels API.
- **Règles :** Conservation de la ponctuation et des mots inconnus.

### 3.3 Agenda Culturel
- **Champs :** `titre`, `date_debut` (date ISO), `date_fin` (date ISO), `lieu` (ville + code dept), `description` (≤ 1000 car.), `lien_externe` (URL optionnelle).
- **Cycle de vie :** Un événement est **archivé automatiquement** dès que `date_fin` < date du jour. Il reste consultable mais disparaît de l'affichage principal.
- **Consultation :** Vue principale = événements à venir (chronologique). Archives navigables par année puis par mois.
- **Droits :** Création, modification, suppression réservées aux contributeurs authentifiés. Consultation publique.

### 3.4 Bibliothèque (Histoires & Légendes)
- **Champs :** `titre`, `typologie` (`Histoire` | `Légende`), `periode` (voir valeurs normalisées ci-dessous), `description_courte` (≤ 200 car., texte brut), `description_longue` (Markdown, texte libre), `source_url` (lien externe optionnel).
- **Périodes normalisées :**
  - `Antiquité (avant 500 ap. J.-C.)`
  - `Moyen Âge (500–1500)`
  - `Époque Moderne (1500–1800)`
  - `Époque Contemporaine (1800–aujourd'hui)`
  - `Indéterminé / Mythologique`
- **Édition :** Saisie de `description_longue` en **Markdown** avec prévisualisation en temps réel.
- **Multilinguisme :** Lien bidirectionnel optionnel entre versions OC et FR (même contenu, deux entrées liées par un `id_traduction`).
- **Images :** Compression automatique (côté client) à **2 Mo maximum** avant stockage en base de données (PostgreSQL). Une image par entrée, champ optionnel.
- **Droits :** Création, modification, suppression réservées aux contributeurs authentifiés. Consultation publique.

### 3.5 Actualités / Articles Culturels
- **Champs :** `titre`, `description` (chapeau éditorial ≤ 300 car.), `image_url` (chemin relatif `/static/articles/`), `source_url` (lien externe optionnel), `date_publication` (date ISO), `auteur` (texte libre), `categorie` (valeur parmi la liste fixe ci-dessous).
- **Catégories (liste fermée — 20 valeurs) :**

| Valeur exacte | Description |
|---|---|
| `Langue & Culture` | Défense de la langue d'oc, graphies, linguistique |
| `Littérature` | Œuvres, auteurs, romans, nouvelles en langue d'oc ou sur la Provence |
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
| `Régionalisme & Politique linguistique` | Débats institutionnels, statut de l'occitan, politiques culturelles |
| `Divers` | Articles ne rentrant dans aucune autre catégorie |

- **Affichage :** Tri par `date_publication` décroissante sur la page d'accueil. Pas de pagination au-delà de 20 articles (archivage en base, non paginé).
- **Droits :** Création, modification, suppression réservées aux contributeurs authentifiés. Consultation publique.
- **Pas de commentaires ni de système de like.** Portail éditorial uniquement.

---

## 4. UX & Accessibilité (Standards Seniors)
- **Typographie :** Police sans empattement, taille de corps de texte minimale à **18px**.
- **Contrastes :** Respect strict des normes **WCAG AA** (ratio 4.5:1).
- **Interactions :** Zones cliquables de **44x44px** minimum pour faciliter la navigation tactile.
- **Navigation :** URLs uniques par contenu pour permettre le partage par lien direct.

---

## 4.1 Navigation — Spécifications

### Structure des entrées (Option B — 5 entrées condensées)

| # | Icône | Libellé | Contenu |
|---|-------|---------|---------|
| 1 | 🏠 | Accueil | Page principale — flux des articles actuels |
| 2 | 📖 | Langue | Dictionnaire FR→Provençal + Traducteur lexical (sous-menu) |
| 3 | 📅 | Agenda | Événements culturels à venir et archives |
| 4 | 📚 | Culture | Bibliothèque — Histoires & Légendes |
| 5 | 👤 | Compte | Connexion / Espace contributeur |

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
- **Libellés courts :** Accueil · Langue · Agenda · Culture · Compte (≤ 8 caractères).
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
**Palette de couleur :** "Terre d'Oc" (Chaleureuse et Culturelle) Cette palette utilise des tons liés à la Provence (ocre, olivier, pierre) tout en restant très sobre pour ne pas tomber dans le "cliché" touristique.

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
  periode           VARCHAR(60)
  description_courte VARCHAR(200)
  description_longue TEXT         -- Markdown
  source_url        VARCHAR(500)
  image             BYTEA        -- compressé ≤ 2 Mo
  lang              CHAR(2) DEFAULT 'fr'
  traduction_id     FK → library_entries.id (optionnel, lien OC↔FR)
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
| `articles_exemple.txt` | Actualités | 4 articles culturels réalistes (Félibrige, Saintes-Maries, enseignement OC, graphies) |
| `histoire_exemple.txt` | Bibliothèque | 5 entrées (3 Histoires, 2 Légendes) avec contenu Markdown réel |
| `agenda_exemple.txt` | Agenda | 5 événements culturels avec dates et lieux réels |

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

Les sept sources correspondent à des lexicographes et dictionnaires historiques qui constituent la base documentaire du dictionnaire. Chacune représente une zone géographique ou une époque précise de la langue d'oc en Provence.

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
