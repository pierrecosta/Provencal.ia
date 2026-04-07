# 📜 Cahier des Charges : Portail Culturel Provençal (v1.1)

**Date :** 07/04/2026  
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
- **Import :** Via fichier Excel. En cas d'erreur (donnée malformée), l'import s'arrête immédiatement. Les champs manquants sont acceptés (laissés vides).
- **Logique :** Relations N-N (plusieurs traductions possibles).
- **Affichage :** Tri par ordre alphabétique, groupement par source.
- **Filtres :** Sélection possible par graphie (mistralienne, classique, etc.).
- **Moteur :** Recherche avec suggestion de mots proches (distance de Levenshtein via `pg_trgm`).

### 3.2 Traducteur Lexical
- **Mécanisme :** Traduction mot à mot basée sur le dictionnaire.
- **Interface :** Traduction temps réel avec "debounce" (500ms) pour limiter les appels API.
- **Règles :** Conservation de la ponctuation et des mots inconnus.

### 3.3 Agenda Culturel
- **Contenu :** Titre, Dates, Lieu, Description (1000 car. max), Lien externe.
- **Cycle de vie :** Archivage automatique après la date de fin.
- **Consultation :** Navigation dans les archives par année et par mois.

### 3.4 Bibliothèque (Contes & Légendes)
- **Édition :** Saisie en Markdown avec prévisualisation en temps réel.
- **Multilinguisme :** Lien bidirectionnel optionnel entre versions OC et FR.
- **Images :** Compression automatique (côté client) à **2 Mo maximum** avant stockage en base de données (PostgreSQL).

---

## 4. UX & Accessibilité (Standards Seniors)
- **Typographie :** Police sans empattement, taille de corps de texte minimale à **18px**.
- **Contrastes :** Respect strict des normes **WCAG AA** (ratio 4.5:1).
- **Interactions :** Zones cliquables de **44x44px** minimum pour faciliter la navigation tactile.
- **Navigation :** URLs uniques par contenu pour permettre le partage par lien direct.

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
1. **Provider Cloud :** Choix de l'hébergeur Kubernetes.
2. **Nom de domaine :** À réserver.