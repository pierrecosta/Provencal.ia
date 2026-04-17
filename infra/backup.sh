#!/usr/bin/env bash
# ============================================================================
# backup.sh — Sauvegarde PostgreSQL hebdomadaire compressée + rotation
#
# Usage : ./backup.sh
# Cron recommandé : 0 3 * * 0 /opt/provencalia/infra/backup.sh
#
# Fonctionnement :
#   1. Dump complet de la base PostgreSQL via pg_dump dans le conteneur
#   2. Compression gzip
#   3. Rotation : suppression des backups > RETENTION_WEEKS semaines
# ============================================================================

set -euo pipefail

# ── Configuration ───────────────────────────────────────────────────────
APP_DIR="/opt/provencalia"
ENV_FILE="${APP_DIR}/.env.prod"
BACKUP_DIR="${BACKUP_DIR:-/opt/provencalia/backups}"
RETENTION_WEEKS="${BACKUP_RETENTION_WEEKS:-4}"
DB_CONTAINER="provencalia-db"
DATE_STAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/provencalia_${DATE_STAMP}.sql.gz"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}[✔]${NC} $*"; }
err()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}[✗]${NC} $*" >&2; }

# ── Charger les variables d'environnement ──────────────────────────────
if [[ -f "${ENV_FILE}" ]]; then
    # Extraire uniquement les variables PostgreSQL
    POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "${ENV_FILE}" | cut -d= -f2-)
    POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "${ENV_FILE}" | cut -d= -f2-)
else
    err "Fichier ${ENV_FILE} introuvable"
    exit 1
fi

# ── Vérifications ──────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    err "Conteneur ${DB_CONTAINER} non trouvé ou arrêté"
    exit 1
fi

# ── Dump PostgreSQL ────────────────────────────────────────────────────
log "Début du dump PostgreSQL (${POSTGRES_DB})..."

docker exec "${DB_CONTAINER}" \
    pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    --format=plain --no-owner --no-privileges \
    | gzip > "${BACKUP_FILE}"

# Vérification du fichier
if [[ ! -s "${BACKUP_FILE}" ]]; then
    err "Le fichier de backup est vide : ${BACKUP_FILE}"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
log "Dump terminé : ${BACKUP_FILE} (${BACKUP_SIZE})"

# ── Rotation des anciennes sauvegardes ─────────────────────────────────
RETENTION_DAYS=$((RETENTION_WEEKS * 7))
DELETED=$(find "${BACKUP_DIR}" -name "provencalia_*.sql.gz" -mtime +${RETENTION_DAYS} -print -delete | wc -l)

if [[ ${DELETED} -gt 0 ]]; then
    log "Rotation : ${DELETED} ancien(s) backup(s) supprimé(s) (> ${RETENTION_WEEKS} semaines)"
else
    log "Rotation : aucun ancien backup à supprimer"
fi

# ── Résumé ────────────────────────────────────────────────────────────
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "provencalia_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
log "Backups conservés : ${TOTAL_BACKUPS} | Espace total : ${TOTAL_SIZE}"
