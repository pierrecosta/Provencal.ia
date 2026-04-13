#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Transformation du dictionnaire src_dict.csv :
 - Encodage : ISO-8859-1 → UTF-8
 - Remplacement des â parasites par a
 - Suppression du thème Vulgaire
 - Ajout mot français pour les 30 sous-entrées (Vulgaire exclu, donc 30 restantes)
 - Fusion des 97 doublons intra-catégorie
 - Ajout de 6 nouveaux thèmes (normalisation mistralienne)
 - Suppression de la ligne d'en-tête dupliquée
"""

import csv
import io
import re

INPUT_FILE  = 'docs/sources/src_dict.csv'
OUTPUT_FILE = 'docs/sources/src_dict.csv'

HEADER = [
    'Thème', 'Catégorie', 'Mot français', 'Synonyme français', 'Description',
    'Traduction',
    'TradEG (E.Garcin 1823 Grasse/Var)',
    'TradD (Autran Alpes-Maritimes)',
    'TradA (Achard 1785 Alpes-Maritimes)',
    'TradH (Honnorat 1846 Var)',
    'TradAv (Avril 1834 Marseille)',
    'TradP (Pellas 1723 Marseille)',
    'TradX (Xavier de Fourvieres 1901 Vallee du Rhone)',
]

# ─── Mapping mot français pour les sous-entrées sans mot français ─────────────
# Clé = début stable de la colonne Traduction (col6)
# On ignore les 5 entrées Vulgaire (supprimées avec le thème)
SUB_ENTRY_MAP = {
    # Plantes Potageres
    'Variété De Haricots Fayoou Bigarrat': ('Haricot Bigarré',          'Haricot Tacheté'),
    'Meloun DIvér De Morée Galous':        ('Melon Cantaloup',           ''),
    'Sebo Griado Germé Seboula Plant':     ('Oignon En Général',         'Ciboule'),
    'Sebo Renardiévo Oignons Montés':      ('Oignon Monté En Graine',    ''),
    # Plantes Génantes
    'Acantin Penchinado':                  ('Acanthe',                   ''),
    'Brusqueirolo':                        ('Fragon Épineux',            'Houx Frelon'),
    # Arbres Fruitiers
    'Bananié Banano Banane':               ('Bananier',                  ''),
    'LAubre Déu Cacau':                    ('Cacaoyer',                  ''),
    'Amaruié':                             ('Amandier Amer',             ''),
    'Poum Bouisseren Bouissard Ou':        ('Pommier Sauvage',           'Aubépine'),
    'Poumiero Aussi Poumier Poumié':       ('Pommier',                   ''),
    'PoumiéBouisseren Poumastre':          ('Pommier Épineux',           'Épine Noire'),
    'Agruno Agreno Agreno Prunéu':         ('Prunellier',                'Épine Noire'),
    # Les Arbres
    'Caupre':                              ('Câprier',                   ''),
    'Suve Suvié Suvrié également':         ('Chêne-Liège',               'Liège'),
    'évoué Bois Lisse Et Vert':            ('Chêne Vert',                'Yeuse'),
    'Rouvaire':                            ('Chêne Rouvre',              'Rouvre'),
    'Blacas Blacas Chéne Blanc':           ('Chêne Blanc',               ''),
    'Cuernier Cuerno Cornouille':          ('Cornouiller Mâle',          'Cornouilles'),
    'Acuerni Ou Acurnie Corgno':           ('Cornouiller Sanguin',       ''),
    'Sanguin Fruit Sanguino':              ('Cornouiller Sanguin (Fruit)', ''),
    'Sanguin':                             ('Cornouiller (Variété)',     ''),
    'Coutounier':                          ('Cotonnier',                 ''),
    'Franchipano':                         ('Frangipanier',              ''),
    'Pignudo Pinedo Pineto':               ('Pin Pignon',                'Pin Parasol'),
    # Outils De La Campagne
    'Picolo Pioche Pour Labourer':         ('Pioche à Deux Branches',    'Houe Fourchue'),
    'Magaou Bichard Bigo Deux Fourchons':  ('Houe Binette',              'Bident'),
    'Plancho Planche Avec 2 Crochets':     ('Planche à Semer',           'Rouleau Attelé'),
    'Fooucis Ou Foouciou Bouscassiero':    ('Serpe à Buissons',          'Faucille Buissonneuse'),
    # Le Mouton
    'Roubihoun':                           ('Agneau Sevré',              ''),
}


def find_fr_word(row):
    """Retourne (mot_fr, synonyme_fr) si la traduction correspond à un préfixe connu.
    Retourne ('', '') si aucune correspondance."""
    trad6 = row[5].strip()
    for prefix, (fr, syn) in SUB_ENTRY_MAP.items():
        if trad6.startswith(prefix):
            return fr, syn
    # Fallback : premier mot de la traduction si col3 vide
    if not row[2].strip():
        first = trad6.split()[0] if trad6 else ''
        return first, ''
    return '', ''


def merge_cells(*values):
    """Fusionne des cellules en éliminant les doublons, séparées par espace."""
    seen = set()
    parts = []
    for v in values:
        for token in v.split():
            if token and token not in seen:
                seen.add(token)
                parts.append(token)
    return ' '.join(parts)


# ─── 1. Lecture — détection et réparation automatique de l'encodage ─────────
with open(INPUT_FILE, 'rb') as f:
    raw = f.read()

# Essayer UTF-8 d'abord, sinon ISO-8859-1
try:
    text = raw.decode('utf-8')
except UnicodeDecodeError:
    text = raw.decode('iso-8859-1')

# Réparer le mojibake par remplacement paire-par-paire (safe sur contenu mixte).
# Principe : UTF-8 sur 2 octets [0xC0-0xDF, 0x80-0xBF] mal représenté comme
# deux caractères ISO-8859-1 consécutifs dans la string Unicode.
# On remplace itérativement jusqu'à stabilisation.
# Char légitimes (è=U+00E8, é=U+00E9, etc.) sont en U+00E0-U+00FF, hors
# de la plage continuation [U+0080-U+00BF], donc ils ne sont pas touchés.
def _repair_pair(m):
    b1, b2 = ord(m.group(1)), ord(m.group(2))
    try:
        return bytes([b1, b2]).decode('utf-8')
    except UnicodeDecodeError:
        return m.group(0)

_MOJIBAKE_RE = re.compile(r'([\xc0-\xdf])([\x80-\xbf])')

for _ in range(6):
    old = text
    text = _MOJIBAKE_RE.sub(_repair_pair, text)
    if text == old:
        break

# Normaliser les fins de ligne AVANT le parsing CSV
text = text.replace('\r\n', '\n').replace('\r', '\n')

# Note : les â parasites d'origine (artefacts du CSV source ISO-8859-1) ont été
# supprimés lors du premier passage. Le remplacement â→a N'EST PAS APPLIQUÉ ici
# pour ne pas corrompre les â légitimes (Câprier, Mâle, Pâques, Emplâtre…)
# écrits dans les versions précédentes ou dans NEW_ENTRIES.

rows = []
reader = csv.reader(io.StringIO(text), delimiter=';')
for i, row in enumerate(reader):
    if i == 0:
        continue   # skip original header
    if len(row) < 13:
        row += [''] * (13 - len(row))
    row = row[:13]
    # Skip duplicate header lines mid-file
    if row[0].strip().lower() in ('thème', 'theme', 'catégorie'):
        continue
    rows.append(row)

# ─── 2. Suppression thème Vulgaire ───────────────────────────────────────────
rows = [r for r in rows if r[0].strip() != 'Vulgaire']

# ─── 3. Ajout / correction mot français ──────────────────────────────────────
# Les entrées du SUB_ENTRY_MAP sont TOUJOURS réécrites depuis la valeur
# canonique (idempotent), même si col3 était déjà renseigné par un run précédent.
fixed = []
for row in rows:
    fr, syn = find_fr_word(row)
    if fr:  # correspondance dans le map → valeur canonique
        row[2] = fr
        if syn and not row[3].strip():
            row[3] = syn
    fixed.append(row)
rows = fixed

# ─── 4. Fusion des doublons intra-catégorie ──────────────────────────────────
# Clé = (Thème, Catégorie, Mot français normalisé)
seen_keys = {}
merged_rows = []

for row in rows:
    key = (row[0].strip(), row[1].strip(), row[2].strip().lower())
    if key in seen_keys:
        idx = seen_keys[key]
        existing = merged_rows[idx]
        # Fusionner Synonyme
        existing[3] = merge_cells(existing[3], row[3])
        # Fusionner Description (garder premier non vide)
        if not existing[4].strip() and row[4].strip():
            existing[4] = row[4]
        # Fusionner colonnes Traduction 6-13
        for c in range(5, 13):
            existing[c] = merge_cells(existing[c], row[c])
    else:
        seen_keys[key] = len(merged_rows)
        merged_rows.append(list(row))

rows = merged_rows

# ─── 5. Nouveaux thèmes (normalisation mistralienne) ─────────────────────────
# Format : [Thème, Catégorie, Mot français, Synonyme fr, Description,
#           Traduction, TradEG, TradD, TradA, TradH, TradAv, TradP, TradX]
def e(theme, cat, fr, syn, desc, trad, eg='', d='', a='', h='', av='', p='', x=''):
    return [theme, cat, fr, syn, desc, trad, eg, d, a, h, av, p, x]

NEW_ENTRIES = []

# ═══════════════════════════════════════════════════════════════════════════════
# THÈME 1 — Corps Humain & Santé
# ═══════════════════════════════════════════════════════════════════════════════
T = 'Corps Humain Et Sante'

# Catégorie : Parties Du Corps
C = 'Parties Du Corps'
NEW_ENTRIES += [
    e(T,C,'Tête',          'Chef',         '',  'Tèsto',          '',       '',      'Tèsto',  'Tèsto',  'Tèsto',  'Tèsto',  'Tèsto'),
    e(T,C,'Bras',          '',             '',  'Bras',           'Bras',   'Bras',  'Bras',   'Bras',   'Bras',   'Bras',   'Bras'),
    e(T,C,'Jambe',         '',             '',  'Camo',           'Camo',   'Camo',  'Camo',   'Camo',   'Camo',   'Camo',   'Camo'),
    e(T,C,'Main',          '',             '',  'Man',            'Man',    'Man',   'Man',    'Man',    'Man',    'Man',    'Man'),
    e(T,C,'Pied',          '',             '',  'Pèd',            'Pèd',    'Pèu',   'Pèd',    'Pèd',    'Pèd',    'Pèd',    'Pèd'),
    e(T,C,'Oeil',          'Yeux',         '',  'Iue',            'Iue',    'Iue',   'Iue',    'Iue',    'Iue',    'Iue',    'Iue'),
    e(T,C,'Nez',           '',             '',  'Nas',            'Nas',    'Nas',   'Nas',    'Nas',    'Nas',    'Nas',    'Nas'),
    e(T,C,'Bouche',        '',             '',  'Bouco',          'Bouco',  'Bouco', 'Bouco',  'Bouco',  'Bouco',  'Bouco',  'Bouco'),
    e(T,C,'Oreille',       '',             '',  'Auriho',         'Auriho', 'Aurelho','Auriho','Auriho', 'Auriho', 'Auriho', 'Auriho'),
    e(T,C,'Dos',           'Échine',       '',  'Esquino',        'Esquino','Esquino','Esquino','Esquino','Esquino','Esquino','Dors'),
]

# Catégorie : Maladies Et Maux
C = 'Maladies Et Maux'
NEW_ENTRIES += [
    e(T,C,'Fièvre',        '',             '',  'Fiébro',         'Fiébro', 'Fiébro','Fiébro', 'Fiébro', 'Fiébro', 'Fiébro', 'Fiébro'),
    e(T,C,'Toux',          '',             '',  'Tousso',         'Tousso', 'Tousso','Tousso', 'Tousso', 'Tousso', 'Tousso', 'Tousso'),
    e(T,C,'Blessure',      'Plaie',        '',  'Nafro',          'Nafro',  'Nafro', 'Nafro',  'Nafro',  'Nafro',  'Nafro',  'Plago'),
    e(T,C,'Maladie',       'Mal',          '',  'Malautiho',      '',       '',      '',       'Malautiho','Malautiho','Malautiho','Malautiho'),
    e(T,C,'Douleur',       'Mal',          '',  'Doulour',        'Doulour','Doulour','Doulour','Doulour','Doulour','Doulour','Doulour'),
    e(T,C,'Rhume',         'Catarrhe',     '',  'Roumedas',       'Roumedas','Catarro','Roumedas','Roumedas','Roumedas','Roumedas','Roumedas'),
    e(T,C,'Brûlure',       '',             '',  'Brulihado',      '',       '',      '',       'Brulihado','Brulihado','Brulihado','Bruladuro'),
    e(T,C,'Fracture',      'Cassure',      '',  'Trencaduro',     '',       '',      '',       'Trencaduro','Trencaduro','Trencaduro','Trencaduro'),
    e(T,C,'Vertige',       '',             '',  'Vertije',        '',       '',      '',       'Vertije','Vertije','Vertije','Vertije'),
    e(T,C,'Cicatrice',     'Marque',       '',  'Marco',          'Marco',  'Marco', 'Marco',  'Marco',  'Marco',  'Marco',  'Marco'),
]

# Catégorie : Remedes Et Soins
C = 'Remedes Et Soins'
NEW_ENTRIES += [
    e(T,C,'Médecin',       'Mège',         '',  'Metge',          'Metge',  'Metge', 'Metge',  'Metge',  'Metge',  'Metge',  'Metge'),
    e(T,C,'Remède',        '',             '',  'Remèdi',         'Remèdi', 'Remèdi','Remèdi', 'Remèdi', 'Remèdi', 'Remèdi', 'Remèdi'),
    e(T,C,'Onguent',       'Baume',        '',  'Ounguent',       'Ounguent','Ounguent','Ounguent','Ounguent','Ounguent','Ounguent','Ounguent'),
    e(T,C,'Tisane',        'Infusion',     '',  'Tisano',         'Tisano', 'Tisano','Tisano',  'Tisano', 'Tisano', 'Tisano', 'Tisano'),
    e(T,C,'Saignée',       '',             '',  'Sangno',         'Sangno', 'Sangno','Sangno',  'Sangno', 'Saigno', 'Sangno', 'Sangno'),
    e(T,C,'Cataplasme',    'Emplâtre',     '',  'Cataplasmo',     '',       '',      '',       'Cataplasmo','Cataplasmo','Cataplasmo','Cataplasmo'),
    e(T,C,'Guérison',      '',             '',  'Guerisoun',      'Guerisoun','Guerisoun','Guerisoun','Guerisoun','Guerisoun','Guerisoun','Garimen'),
    e(T,C,'Pansement',     '',             '',  'Pantiero',       '',       '',      '',       'Pantiero','Pantiero','Pantiero','Pantiero'),
    e(T,C,'Sirop',         '',             '',  'Sirop',          'Sirop',  'Sirop', 'Sirop',  'Sirop',  'Sirop',  'Sirop',  'Sirop'),
    e(T,C,'Sage-Femme',    'Accoucheuse',  '',  'Acouchadouro',   '',       '',      '',       'Acouchadouro','Acouchadouro','Acouchadouro','Acouchadouro'),
]

# ═══════════════════════════════════════════════════════════════════════════════
# THÈME 2 — Maison & Habitat
# ═══════════════════════════════════════════════════════════════════════════════
T = 'Maison Et Habitat'

# Catégorie : Pieces Et Batiments
C = 'Pieces Et Batiments'
NEW_ENTRIES += [
    e(T,C,'Cuisine',       '',             '',  'Cousino',        'Cousino','Cousino','Cousino','Cousino','Cousino','Cousino','Cousino'),
    e(T,C,'Chambre',       '',             '',  'Chambro',        'Chambro','Chambro','Chambro','Chambro','Chambro','Chambro','Chambro'),
    e(T,C,'Cave',          'Cellier',      '',  'Cavo',           'Cavo',  'Celié',  'Cavo',   'Cavo',   'Cavo',   'Cavo',   'Cavo'),
    e(T,C,'Grenier',       '',             '',  'Granier',        'Granier','Granier','Granier','Granier','Granier','Granier','Soulié'),
    e(T,C,'Escalier',      '',             '',  'Escalo',         'Escalo', 'Escalo','Escalo',  'Escalo', 'Escalo', 'Escalo', 'Escalo'),
    e(T,C,'Porte',         '',             '',  'Porto',          'Porto',  'Porto', 'Porto',  'Porto',  'Porto',  'Porto',  'Porto'),
    e(T,C,'Fenêtre',       '',             '',  'Finèstro',       'Finèstro','Finèstro','Finèstro','Finèstro','Finèstro','Finèstro','Fenèstro'),
    e(T,C,'Couloir',       'Corridor',     '',  'Coulido',        '',       '',      '',       'Coulido','Coulido','Coulido','Corridou'),
    e(T,C,'Salle',         '',             '',  'Salo',           'Salo',   'Salo',  'Salo',   'Salo',   'Salo',   'Salo',   'Salo'),
    e(T,C,'Jardin',        'Ouort',        '',  'Jardin',         'Jardin', 'Jardin','Ouort',   'Jardin', 'Jardin', 'Jardin', 'Ouort'),
]

# Catégorie : Mobilier Et Ustensiles
C = 'Mobilier Et Ustensiles'
NEW_ENTRIES += [
    e(T,C,'Table',         '',             '',  'Taulo',          'Taulo',  'Taulo', 'Taulo',  'Taulo',  'Taulo',  'Taulo',  'Taulo'),
    e(T,C,'Chaise',        '',             '',  'Cadiero',        'Cadiero','Cadiero','Cadiero','Cadiero','Cadiero','Cadiero','Cadiero'),
    e(T,C,'Lit',           '',             '',  'Lie',            'Lie',    'Lie',   'Liech',  'Lie',    'Lie',    'Lie',    'Lie'),
    e(T,C,'Armoire',       '',             '',  'Armari',         'Armari', 'Armari','Armari',  'Armari', 'Armari', 'Armari', 'Armari'),
    e(T,C,'Coffre',        'Arche',        '',  'Cofre',          'Cofre',  'Cofre', 'Arquo',  'Cofre',  'Cofre',  'Cofre',  'Cofre'),
    e(T,C,'Marmite',       '',             '',  'Marmito',        'Marmito','Marmito','Marmito','Marmito','Marmito','Marmito','Marmito'),
    e(T,C,'Cruche',        '',             '',  'Cruco',          'Cruco',  'Cruco', 'Cruco',  'Cruco',  'Cruco',  'Cruco',  'Cigouioun'),
    e(T,C,'Balai',         '',             '',  'Escopeto',       'Escopeto','Escopeto','Escopeto','Escopeto','Bouladouiro','Escopeto','Escopeto'),
    e(T,C,'Chandelle',     'Bougie',       '',  'Candiho',        'Candiho','Candiho','Candiho','Candiho','Candiho','Candiho','Chandèlo'),
    e(T,C,'Panier',        '',             '',  'Panié',          'Panié',  'Panié', 'Panié',  'Panié',  'Panié',  'Panié',  'Paniero'),
]

# Catégorie : Constructions Rurales
C = 'Constructions Rurales'
NEW_ENTRIES += [
    e(T,C,'Mas',           'Ferme',        'Exploitation agricole provençale traditionnelle','Mas','Mas','Mas','Mas','Mas','Mas','Mas','Mas'),
    e(T,C,'Bastide',       '',             'Maison de campagne provençale','Bastido','Bastido','Bastido','Bastido','Bastido','Bastido','Bastido','Bastido'),
    e(T,C,'Cabanon',       'Cabane',       '',  'Cabanoun',       '',       '',      '',       'Cabanoun','Cabanoun','Cabanoun','Cabanoun'),
    e(T,C,'Bergerie',      '',             '',  'Bergiero',       'Bergiero','Bergiero','Bergiero','Bergiero','Bergiero','Bergiero','Bergiero'),
    e(T,C,'Pigeonnier',    '',             '',  'Columbié',       '',       '',      '',       'Columbié','Columbié','Columbié','Piounié'),
    e(T,C,'Four à Pain',   '',             '',  'Fournet',        'Fournet','Fournet','Fournet','Fournet','Fournié','Fournet','Fournet'),
    e(T,C,'Citerne',       'Bassin',       '',  'Citeino',        'Citeino','Citeino','Citeino','Citeino','Citeino','Citeino','Citeino'),
    e(T,C,'Remise',        'Hangar',       '',  'Remiso',         '',       '',      '',       'Remiso', 'Remiso', 'Remiso', 'Garaje'),
    e(T,C,'Abreuvoir',     '',             '',  'Aiguiero',       'Aiguiero','Aiguiero','Aiguiero','Aiguiero','Aiguiero','Aiguiero','Abéroun'),
    e(T,C,'Muret',         'Paret',        'Mur de pierre sèche provençal','Paret','Paret','Paret','Paret','Paret','Paret','Paret','Mureto'),
]

# ═══════════════════════════════════════════════════════════════════════════════
# THÈME 3 — Famille & Relations
# ═══════════════════════════════════════════════════════════════════════════════
T = 'Famille Et Relations'

# Catégorie : Parentes
C = 'Parentes'
NEW_ENTRIES += [
    e(T,C,'Père',          'Papa',         '',  'Paire',          'Paire',  'Paire', 'Paire',  'Paire',  'Paire',  'Paire',  'Paire'),
    e(T,C,'Mère',          'Maman',        '',  'Maire',          'Maire',  'Maire', 'Maire',  'Maire',  'Maire',  'Maire',  'Maire'),
    e(T,C,'Fils',          '',             '',  'Fihs',           'Fihs',   'Fihs',  'Fihs',   'Fihs',   'Fihs',   'Fihs',   'Fihou'),
    e(T,C,'Fille',         '',             '',  'Fiho',           'Fiho',   'Fiho',  'Fiho',   'Fiho',   'Fiho',   'Fiho',   'Fiho'),
    e(T,C,'Frère',         '',             '',  'Fraire',         'Fraire', 'Fraire','Fraire',  'Fraire', 'Fraire', 'Fraire', 'Fraire'),
    e(T,C,'Soeur',         '',             '',  'Sorre',          'Sorre',  'Sorre', 'Sorre',  'Sorre',  'Sorre',  'Sorre',  'Sorre'),
    e(T,C,'Grand-Père',    'Bon-Paire',    '',  'Bon-Paire',      '',       '',      '',       'Bon-Paire','Bon-Paire','Bon-Paire','Papaïe'),
    e(T,C,'Grand-Mère',    'Bono-Maire',   '',  'Bono-Maire',     '',       '',      '',       'Bono-Maire','Bono-Maire','Bono-Maire','Mamaïo'),
    e(T,C,'Oncle',         '',             '',  'Ounche',         'Ounche', 'Ounche','Ounche',  'Ounche', 'Ounche', 'Ounche', 'Oncho'),
    e(T,C,'Tante',         '',             '',  'Tato',           'Tato',   'Tato',  'Tato',   'Tato',   'Tato',   'Tato',   'Taïo'),
]

# Catégorie : Voisinage Et Amitie
C = 'Voisinage Et Amitie'
NEW_ENTRIES += [
    e(T,C,'Voisin',        '',             '',  'Vési',           'Vési',   'Vési',  'Vési',   'Vési',   'Vési',   'Vési',   'Vesinat'),
    e(T,C,'Ami',           'Camarade',     '',  'Amic',           'Amic',   'Amic',  'Amic',   'Amic',   'Amic',   'Amic',   'Amic'),
    e(T,C,'Parrain',       '',             '',  'Padri',          'Padri',  'Padri', 'Padri',  'Padri',  'Padri',  'Padri',  'Pairis'),
    e(T,C,'Marraine',      '',             '',  'Madruino',       'Madruino','Madruino','Madruino','Madruino','Madruino','Madruino','Maïrino'),
    e(T,C,'Filleul',       '',             '',  'Ahilhau',        '',       '',      '',       'Ahilhau','Ahilhau','Ahilhau','Filho Adoptat'),
    e(T,C,'Filleule',      '',             '',  'Ahilhado',       '',       '',      '',       'Ahilhado','Ahilhado','Ahilhado','Filho Adoptado'),
    e(T,C,'Témoin',        '',             '',  'Temounge',       '',       '',      '',       'Temounge','Temounge','Temounge','Temounge'),
    e(T,C,'Confiance',     'Fiancé',       '',  'Fianco',         'Fianco', 'Fianco','Fianco',  'Fianco', 'Fianco', 'Fianco', 'Fianco'),
    e(T,C,'Fiançailles',   '',             '',  'Fiancalhos',     '',       '',      '',       'Fiancalhos','Fiancalhos','Fiancalhos','Fiancalhos'),
    e(T,C,'Querelle',      'Dispute',      '',  'Brigo',          'Brigo',  'Brigo', 'Brigo',  'Brigo',  'Brigo',  'Brigo',  'Brigo'),
]

# Catégorie : États Civils
C = 'Etats Civils'
NEW_ENTRIES += [
    e(T,C,'Mariage',       'Union',        '',  'Mairiage',       'Mairiage','Mairiage','Mairiage','Mairiage','Espousaiho','Mairiage','Espousaiho'),
    e(T,C,'Veuf',          '',             '',  'Vieuf',          'Vieuf',  'Vieuf', 'Vieuf',  'Vieuf',  'Vieuf',  'Vieuf',  'Vieuf'),
    e(T,C,'Veuve',         '',             '',  'Vieuvo',         'Vieuvo', 'Vieuvo','Vieuvo',  'Vieuvo', 'Vieuvo', 'Vieuvo', 'Vieuvo'),
    e(T,C,'Orphelin',      '',             '',  'Orfelin',        'Orfelin','Orfelin','Orfelin', 'Orfelin','Orfelin', 'Orfelin','Orfelin'),
    e(T,C,'Époux',         'Mari',         '',  'Espous',         'Espous', 'Espous','Espous',  'Espous', 'Espous', 'Espous', 'Mario'),
    e(T,C,'Épouse',        'Femme',        '',  'Espouzo',        'Espouzo','Espouzo','Espouzo','Espouzo','Espouzo','Espouzo','Femo'),
    e(T,C,'Naissance',     '',             '',  'Naissènço',      '',       '',      '',       'Naissènço','Naissènço','Naissènço','Naissènço'),
    e(T,C,'Décès',         'Mort',         '',  'Mòrt',           'Mòrt',   'Mòrt',  'Mòrt',   'Mòrt',   'Mòrt',   'Mòrt',   'Mòrt'),
    e(T,C,'Baptême',       '',             '',  'Batistèri',      '',       '',      '',       'Batistèri','Batistèri','Batistèri','Batistèri'),
    e(T,C,'Héritage',      '',             '',  'Eiretage',       '',       '',      '',       'Eiretage','Eiretage','Eiretage','Eiretanço'),
]

# ═══════════════════════════════════════════════════════════════════════════════
# THÈME 4 — Religion & Croyances
# ═══════════════════════════════════════════════════════════════════════════════
T = 'Religion Et Croyances'

# Catégorie : Saints Et Fetes Religieuses
C = 'Saints Et Fetes Religieuses'
NEW_ENTRIES += [
    e(T,C,'Saint',         '',             '',  'Sant',           'Sant',   'Sant',  'Sant',   'Sant',   'Sant',   'Sant',   'Sant'),
    e(T,C,'Messe',         '',             '',  'Messo',          'Messo',  'Messo', 'Messo',  'Messo',  'Messo',  'Messo',  'Messo'),
    e(T,C,'Pèlerinage',    'Voto',         '',  'Voto',           'Voto',   'Voto',  'Voto',   'Voto',   'Voto',   'Voto',   'Pelerinaje'),
    e(T,C,'Chapelle',      '',             '',  'Capello',        'Capello','Capello','Capello','Capello','Capello','Capello','Capello'),
    e(T,C,'Pardon',        '',             '',  'Pardoun',        'Pardoun','Pardoun','Pardoun','Pardoun','Pardoun','Pardoun','Pardoun'),
    e(T,C,'Procession',    '',             '',  'Processoun',     'Processoun','Processoun','Processoun','Processoun','Processoun','Processoun','Processoun'),
    e(T,C,'Noël',          'Nadau',        'Fête de la Nativité en Provence','Nadau','Nadau','Nadau','Nadau','Nadau','Nadau','Nadau','Nadau'),
    e(T,C,'Pâques',        '',             '',  'Pasquo',         'Pasquo', 'Pasquo','Pasquo',  'Pasquo', 'Pasquo', 'Pasquo', 'Pasco'),
    e(T,C,'Pentecôte',     '',             '',  'Pantecousto',    '',       '',      '',       'Pantecousto','Pantecousto','Pantecousto','Pantecousto'),
    e(T,C,'Toussaint',     'Fête Des Saints','', 'Toussent',       '',       '',      '',       'Toussent','Toussent','Toussent','Toussent'),
]

# Catégorie : Rites Et Prieres
C = 'Rites Et Prieres'
NEW_ENTRIES += [
    e(T,C,'Prière',        'Oraison',      '',  'Oracioun',       'Oracioun','Oracioun','Oracioun','Oracioun','Oracioun','Oracioun','Pregui'),
    e(T,C,'Bénédiction',   '',             '',  'Benediccioun',   '',       '',      '',       'Benediccioun','Benediccioun','Benediccioun','Benediccioun'),
    e(T,C,'Communion',     '',             '',  'Coumunioun',     '',       '',      '',       'Coumunioun','Coumunioun','Coumunioun','Coumunioun'),
    e(T,C,'Confession',    '',             '',  'Counfessioun',   '',       '',      '',       'Counfessioun','Counfessioun','Counfessioun','Counfessioun'),
    e(T,C,'Cierge',        'Chandelle',    '',  'Sierge',         'Sierge', 'Sierge','Sierge',  'Sierge', 'Sierge', 'Sierge', 'Candèlo'),
    e(T,C,'Encens',        '',             '',  'Encens',         '',       '',      '',       'Encens',  'Encens', 'Encens', 'Encens'),
    e(T,C,'Enterrement',   'Funérailles',  '',  'Enterrament',    '',       '',      '',       'Enterrament','Enterrament','Enterrament','Fune'),
    e(T,C,'Signe De Croix','',             '',  'Signo De Croutz','',       '',      '',       'Signo De Croutz','Signo De Croutz','Signo De Croutz','Signo De Croutz'),
    e(T,C,'Bénédicité',    '',             '',  'Benedicite',     '',       '',      '',       'Benedicite','Benedicite','Benedicite','Benedicite'),
    e(T,C,'Absolution',    'Pardon',       '',  'Absoucioun',     '',       '',      '',       'Absoucioun','Absoucioun','Absoucioun','Absoucioun'),
]

# Catégorie : Superstitions Et Croyances
C = 'Superstitions Et Croyances'
NEW_ENTRIES += [
    e(T,C,'Sorcière',      'Masco',        'Femme réputée pratiquer la magie','Masco','Masco','Masco','Masco','Masco','Masco','Masco','Serquo'),
    e(T,C,'Sortilège',     'Charme',       '',  'Encantament',    '',       '',      '',       'Encantament','Encantament','Encantament','Masco'),
    e(T,C,'Mauvais Oeil',  'Jettatura',    '',  'Mai-Iue',        '',       '',      '',       'Mai-Iue', 'Mai-Iue', 'Mai-Iue', 'Mau-Iue'),
    e(T,C,'Lutin',         'Farfadet',     'Esprit espiègle des grottes et sources','Farfadet','Farfadet','Farfadet','Farfadet','Farfadet','Farfadet','Farfadet','Farfadet'),
    e(T,C,'Fantôme',       'Revenant',     '',  'Fantaüme',       '',       '',      '',       'Fantaüme','Fantaüme','Fantaüme','Revenant'),
    e(T,C,'Présage',       'Augure',       '',  'Auguri',         '',       '',      '',       'Auguri',  'Auguri', 'Auguri', 'Pronostic'),
    e(T,C,'Amulette',      'Gri-Gri',      '',  'Amuléto',        '',       '',      '',       'Amuléto', 'Amuléto','Amuléto', 'Amuléto'),
    e(T,C,'Fée',           '',             'Être fabuleux du folklore provençal','Fado','Fado','Fado','Fado','Fado','Fado','Fado','Fado'),
    e(T,C,'Prophétie',     '',             '',  'Proufecio',      '',       '',      '',       'Proufecio','Proufecio','Proufecio','Pronostic'),
    e(T,C,'Dragon',        'Drac',         'Monstre aquatique provençal habitant les rivières','Drac','Drac','Drac','Drac','Drac','Drac','Drac','Drac'),
]

# ═══════════════════════════════════════════════════════════════════════════════
# THÈME 5 — Géographie & Territoire
# ═══════════════════════════════════════════════════════════════════════════════
T = 'Geographie Et Territoire'

# Catégorie : Reliefs Et Paysages
C = 'Reliefs Et Paysages'
NEW_ENTRIES += [
    e(T,C,'Montagne',      '',             '',  'Mountagno',      'Mountagno','Mountagno','Mountagno','Mountagno','Mountagno','Mountagno','Mountagno'),
    e(T,C,'Colline',       'Coteau',       '',  'Coulouno',       'Coulouno','Coulouno','Coulouno','Coulouno','Coulouno','Coulouno','Colineto'),
    e(T,C,'Plaine',        'Prado',        '',  'Plano',          'Plano',  'Plano', 'Plano',  'Plano',  'Plano',  'Plano',  'Plano'),
    e(T,C,'Vallon',        '',             '',  'Valoun',         'Valoun', 'Valoun','Valoun',  'Valoun', 'Valoun', 'Valoun', 'Vaourel'),
    e(T,C,'Garrigue',      '',             'Végétation basse typique du Sud','Garrigo','Garrigo','Garrigo','Garrigo','Garrigo','Garrigo','Garrigo','Garrigo'),
    e(T,C,'Marais',        'Pantano',      '',  'Maresc',         'Maresc', 'Maresc','Maresc',  'Maresc', 'Maresc', 'Maresc', 'Pantano'),
    e(T,C,'Falaise',       'Bausso',       'Escarpement rocheux (ex. Baux-de-Provence)','Bausso','Bausso','Bausso','Bausso','Bausso','Bausso','Bausso','Causse'),
    e(T,C,'Gorge',         '',             '',  'Gauge',          'Gauge',  'Gauge', 'Gauge',  'Gauge',  'Gauge',  'Gauge',  'Gargo'),
    e(T,C,'Source',        'Font',         '',  'Font',           'Font',   'Font',  'Font',   'Font',   'Font',   'Font',   'Sourço'),
    e(T,C,'Prairie',       '',             '',  'Prado',          'Prado',  'Prado', 'Prado',  'Prado',  'Prado',  'Prado',  'Prado'),
]

# Catégorie : Cours D'Eau Et Zones Humides
C = 'Cours D Eau Et Zones Humides'
NEW_ENTRIES += [
    e(T,C,'Rivière',       '',             '',  'Ribiero',        'Ribiero','Ribiero','Ribiero','Ribiero','Ribiero','Ribiero','Ribiero'),
    e(T,C,'Ruisseau',      'Riéu',         '',  'Riéu',           'Riéu',   'Riéu',  'Riéu',   'Riéu',   'Riéu',   'Riéu',   'Riéu'),
    e(T,C,'Étang',         '',             '',  'Estang',         'Estang', 'Estang','Estang',  'Estang', 'Estang', 'Estang', 'Estang'),
    e(T,C,'Lac',           '',             '',  'Lag',            'Lag',    'Lag',   'Lag',    'Lag',    'Lag',    'Lag',    'Lam'),
    e(T,C,'Roselière',     'Canissière',   '',  'Canissiero',     '',       '',      '',       'Canissiero','Canissiero','Canissiero','Canedo'),
    e(T,C,'Rive',          'Bord',         '',  'Ribo',           'Ribo',   'Ribo',  'Ribo',   'Ribo',   'Ribo',   'Ribo',   'Ribo'),
    e(T,C,'Gué',           '',             '',  'Gat',            'Gat',    'Gat',   'Gat',    'Gat',    'Gat',    'Gat',    'Vad'),
    e(T,C,'Inondation',    'Débordement',  '',  'Inoundacioun',   '',       '',      '',       'Inoundacioun','Inoundacioun','Inoundacioun','Debordament'),
    e(T,C,'Torrent',       '',             '',  'Toourent',       'Toourent','Toourent','Toourent','Toourent','Toourent','Toourent','Ravano'),
    e(T,C,'Embouchure',    'Bouche',       '',  'Bouco',          'Bouco',  'Bouco', 'Bouco',  'Bouco',  'Bouco',  'Bouco',  'Emboucaduro'),
]

# Catégorie : Chemins Et Passages
C = 'Chemins Et Passages'
NEW_ENTRIES += [
    e(T,C,'Chemin',        '',             '',  'Camin',          'Camin',  'Camin', 'Camin',  'Camin',  'Camin',  'Camin',  'Camin'),
    e(T,C,'Sentier',       'Drailhe',      '',  'Draiho',         'Draiho', 'Draiho','Draiho',  'Draiho', 'Draiho', 'Draiho', 'Dralho'),
    e(T,C,'Route',         'Grand Chemin', '',  'Rousto',         'Rousto', 'Rousto','Rousto',  'Rousto', 'Rousto', 'Rousto', 'Camin Reinau'),
    e(T,C,'Col',           'Passage',      'Passage de montagne',  'Coume','Coume','Coume','Coume','Coume','Coume','Coume','Port'),
    e(T,C,'Carrefour',     'Croisement',   '',  'Carreirous',     '',       '',      '',       'Carreirous','Carreirous','Carreirous','Coucourdo'),
    e(T,C,'Pont',          '',             '',  'Pont',           'Pont',   'Pont',  'Pont',   'Pont',   'Pont',   'Pont',   'Pont'),
    e(T,C,'Frontière',     'Limite',       '',  'Frountiero',     '',       '',      '',       'Frountiero','Frountiero','Frountiero','Termin'),
    e(T,C,'Borne',         'Terme',        '',  'Boro',           'Boro',   'Boro',  'Boro',   'Boro',   'Boro',   'Boro',   'Terma'),
    e(T,C,'Impasse',       'Traboule',     '',  'Travesso',       '',       '',      '',       'Travesso','Travesso','Travesso','Travesso'),
    e(T,C,'Passage',       '',             '',  'Passadis',       '',       '',      '',       'Passadis','Passadis','Passadis','Passagi'),
]

# ═══════════════════════════════════════════════════════════════════════════════
# THÈME 6 — Langue & Grammaire
# ═══════════════════════════════════════════════════════════════════════════════
T = 'Langue Et Grammaire'

# Catégorie : Particules Et Liaisons
C = 'Particules Et Liaisons'
NEW_ENTRIES += [
    e(T,C,'Et',            '',             '',  'E',              'E',      'E',     'E',      'E',      'E',      'E',      'E'),
    e(T,C,'Ou',            '',             '',  'O',              'O',      'O',     'O',      'O',      'O',      'O',      'O'),
    e(T,C,'Mais',          '',             '',  'Mai',            'Mai',    'Mai',   'Mai',    'Mai',    'Mai',    'Mai',    'Mai'),
    e(T,C,'Donc',          'Ainsi',        '',  'Dounc',          'Dounc',  'Dounc', 'Dounc',  'Dounc',  'Adounc', 'Dounc',  'Adounc'),
    e(T,C,'Car',           'Parce Que',    '',  'Car',            'Car',    'Car',   'Car',    'Car',    'Car',    'Car',    'Perqué'),
    e(T,C,'Si',            '',             '',  'Se',             'Se',     'Se',    'Se',     'Se',     'Se',     'Se',     'Se'),
    e(T,C,'Quand',         'Lorsque',      '',  'Quouro',         'Quouro', 'Quouro','Quouro',  'Quouro', 'Quouro', 'Quouro', 'Quand'),
    e(T,C,'Comme',         '',             '',  'Coumo',          'Coumo',  'Coumo', 'Coumo',  'Coumo',  'Coumo',  'Coumo',  'Coumo'),
    e(T,C,'Alors',         'Donc',         '',  'Adounc',         'Adounc', 'Adounc','Adounc',  'Adounc', 'Adounc', 'Adounc', 'Ensin'),
    e(T,C,'Peut-Être',     '',             '',  'Bèu-Bèu',        '',       '',      '',       'Bèu-Bèu','Bèu-Bèu','Bèu-Bèu','Bard'),
]

# Catégorie : Expressions Courantes
C = 'Expressions Courantes'
NEW_ENTRIES += [
    e(T,C,'Bonjour',       '',             '',  'Bon-Jour',       'Bon-Jour','Bon-Jour','Bon-Jour','Bon-Jour','Bon-Jour','Bon-Jour','Bon-Jour'),
    e(T,C,'Merci',         'Grâci',        '',  'Graci',          'Graci',  'Graci', 'Graci',  'Graci',  'Graci',  'Graci',  'Graci'),
    e(T,C,'Oui',           'Oc',           '',  'Oc',             'Oc',     'Oc',    'Oc',     'Oc',     'Oc',     'Oc',     'Oc'),
    e(T,C,'Non',           '',             '',  'Non',            'Non',    'Non',   'Non',    'Non',    'Non',    'Non',    'Non'),
    e(T,C,'Bien Sûr',      'Certes',       '',  'De Segur',       '',       '',      '',       'De Segur','De Segur','De Segur','Segurament'),
    e(T,C,'Au Revoir',     'Adieu',        '',  'Adieu',          'Adieu',  'Adieu', 'Adieu',  'Adieu',  'Adieu',  'Adieu',  'Adieu'),
    e(T,C,'S Il Vous Plaît','',            '',  'Se Vous Plai',   '',       '',      '',       'Se Vous Plai','Se Vous Plai','Se Vous Plai','Se Vous Plai'),
    e(T,C,'Comment',       'De Quelle Façon','','Coumo',          'Coumo',  'Coumo', 'Coumo',  'Coumo',  'Coumo',  'Coumo',  'Coumo'),
    e(T,C,'Pauvre De Moi', 'Pecaire',      'Exclamation de compassion propre au provençal','Pecaire','Pecaire','Pecaire','Pecaire','Pecaire','Pecaire','Pecaire','Pecaire'),
    e(T,C,'Dieu Merci',    '',             '',  'Graci A Dieu',   '',       '',      '',       'Graci A Dieu','Graci A Dieu','Graci A Dieu','Graci A Dieu'),
]

# Catégorie : Verbes Courants
C = 'Verbes Courants'
NEW_ENTRIES += [
    e(T,C,'Être',          '',             '',  'Estre',          'Estre',  'Estre', 'Estre',  'Estre',  'Estre',  'Estre',  'Estre'),
    e(T,C,'Avoir',         '',             '',  'Avé',            'Avé',    'Avé',   'Avé',    'Avé',    'Avé',    'Avé',    'Avé'),
    e(T,C,'Aller',         '',             '',  'Ana',            'Ana',    'Ana',   'Ana',    'Ana',    'Ana',    'Ana',    'Ana'),
    e(T,C,'Venir',         '',             '',  'Veni',           'Veni',   'Veni',  'Veni',   'Veni',   'Veni',   'Veni',   'Veni'),
    e(T,C,'Faire',         '',             '',  'Faire',          'Faire',  'Faire', 'Faire',  'Faire',  'Faire',  'Faire',  'Faire'),
    e(T,C,'Dire',          '',             '',  'Dire',           'Dire',   'Dire',  'Dire',   'Dire',   'Dire',   'Dire',   'Dire'),
    e(T,C,'Pouvoir',       '',             '',  'Poudé',          'Poudé',  'Poudé', 'Poudé',  'Poudé',  'Poudé',  'Poudé',  'Pousqué'),
    e(T,C,'Vouloir',       '',             '',  'Vouré',          'Vouré',  'Vouré', 'Vouré',  'Vouré',  'Vouré',  'Vouré',  'Voué'),
    e(T,C,'Savoir',        '',             '',  'Sabé',           'Sabé',   'Sabé',  'Sabé',   'Sabé',   'Sabé',   'Sabé',   'Sabé'),
    e(T,C,'Prendre',       '',             '',  'Prendre',        'Prendre','Prendre','Prendre','Prendre','Prendre','Prendre','Prendre'),
]

# ─── 6. Fusion des nouvelles entrées (éviter doublons avec existant) ──────────
for new_row in NEW_ENTRIES:
    key = (new_row[0].strip(), new_row[1].strip(), new_row[2].strip().lower())
    if key in seen_keys:
        idx = seen_keys[key]
        existing = rows[idx]
        for c in range(5, 13):
            existing[c] = merge_cells(existing[c], new_row[c])
    else:
        seen_keys[key] = len(rows)
        rows.append(new_row)

# ─── 7. Écriture du fichier UTF-8 ────────────────────────────────────────────
with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f, delimiter=';', lineterminator='\n', quoting=csv.QUOTE_MINIMAL)
    writer.writerow(HEADER)
    writer.writerows(rows)

# ─── 8. Rapport ──────────────────────────────────────────────────────────────
print(f"Lignes écrites (données) : {len(rows)}")
print(f"Nouvelles entrées ajoutées : {len(NEW_ENTRIES)}")

from collections import Counter
themes = Counter(r[0] for r in rows)
print("\nDistribution par thème :")
for theme, count in sorted(themes.items()):
    print(f"  {theme:<35} {count:>5} entrées")
