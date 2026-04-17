#!/usr/bin/env bash
# ============================================================================
# deploy.sh — Déploiement initial et mises à jour du VPS OVH
#
# Usage :
#   Première installation : ./deploy.sh init
#   Mise à jour (redeploy) : ./deploy.sh update
#   Obtenir le certificat SSL : ./deploy.sh certbot
#   Vérification santé : ./deploy.sh health
#
# Prérequis : exécuter en root ou avec sudo sur le VPS OVH (Ubuntu 24.04)
# ============================================================================

set -euo pipefail

# ── Configuration ───────────────────────────────────────────────────────
APP_DIR="/opt/provencalia"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"
DOMAIN="le-provencal.ovh"
GITHUB_REPO="pierrecosta/Provencal.ia"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
die()  { err "$@"; exit 1; }

# ── Vérifications ──────────────────────────────────────────────────────
check_root() {
    [[ $EUID -eq 0 ]] || die "Ce script doit être exécuté en root (sudo)"
}

# ── 1. Installation initiale du VPS ────────────────────────────────────
cmd_init() {
    check_root
    log "=== Initialisation du VPS OVH ==="

    # ── 1.1 Mise à jour système ────────────────────────────────────────
    log "Mise à jour système..."
    apt-get update -qq && apt-get upgrade -y -qq
    apt-get install -y -qq curl wget git ufw fail2ban unattended-upgrades

    # ── 1.2 Installation Docker ────────────────────────────────────────
    if ! command -v docker &>/dev/null; then
        log "Installation de Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
    else
        log "Docker déjà installé : $(docker --version)"
    fi

    # ── 1.3 Docker Compose plugin ─────────────────────────────────────
    if ! docker compose version &>/dev/null; then
        log "Installation du plugin Docker Compose..."
        apt-get install -y -qq docker-compose-plugin
    else
        log "Docker Compose déjà installé : $(docker compose version)"
    fi

    # ── 1.4 Pare-feu UFW ──────────────────────────────────────────────
    log "Configuration du pare-feu UFW..."
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw --force enable
    log "UFW actif — ports ouverts : 22, 80, 443"

    # ── 1.5 Fail2ban SSH ──────────────────────────────────────────────
    log "Configuration Fail2ban..."
    cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port    = ssh
filter  = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime  = 86400
EOF
    systemctl enable fail2ban
    systemctl restart fail2ban
    log "Fail2ban actif (SSH : 3 tentatives → ban 24h)"

    # ── 1.6 Durcissement SSH ──────────────────────────────────────────
    log "Durcissement SSH..."
    sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
    sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
    systemctl restart sshd
    log "SSH : clé publique uniquement, mot de passe désactivé"

    # ── 1.7 Mises à jour automatiques de sécurité ─────────────────────
    log "Activation des mises à jour automatiques de sécurité..."
    dpkg-reconfigure -plow unattended-upgrades 2>/dev/null || true

    # ── 1.8 Création du répertoire applicatif ─────────────────────────
    mkdir -p "${APP_DIR}"/{backups,logs}
    log "Répertoire applicatif créé : ${APP_DIR}"

    # ── 1.9 Connexion Docker Hub (images privées) ─────────────────────
    if [[ -f "${APP_DIR}/${ENV_FILE}" ]]; then
        source <(grep -E '^DOCKERHUB_' "${APP_DIR}/${ENV_FILE}")
        if [[ -n "${DOCKERHUB_USERNAME:-}" && -n "${DOCKERHUB_TOKEN:-}" ]]; then
            echo "${DOCKERHUB_TOKEN}" | docker login -u "${DOCKERHUB_USERNAME}" --password-stdin
            log "Connecté à Docker Hub en tant que ${DOCKERHUB_USERNAME}"
        fi
    else
        warn "Fichier ${ENV_FILE} absent — pensez à le créer depuis .env.example.prod"
    fi

    log "=== Initialisation terminée ==="
    echo ""
    warn "Étapes restantes :"
    echo "  1. Copier les fichiers du projet dans ${APP_DIR}/"
    echo "  2. Créer ${APP_DIR}/${ENV_FILE} depuis .env.example.prod"
    echo "  3. Exécuter : ./deploy.sh certbot   (obtenir le certificat SSL)"
    echo "  4. Exécuter : ./deploy.sh update     (lancer l'application)"
    echo "  5. Exécuter : ./deploy.sh cron       (installer les crons)"
}

# ── 2. Obtention du certificat Let's Encrypt ──────────────────────────
cmd_certbot() {
    check_root
    log "=== Obtention du certificat Let's Encrypt ==="

    cd "${APP_DIR}"
    [[ -f "${ENV_FILE}" ]] || die "Fichier ${ENV_FILE} manquant"
    source <(grep -E '^CERTBOT_EMAIL=' "${ENV_FILE}")

    # Démarrer nginx en mode HTTP uniquement pour le challenge ACME
    # On crée un certificat auto-signé temporaire pour que nginx démarre
    mkdir -p /tmp/certbot-bootstrap
    openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
        -keyout /tmp/certbot-bootstrap/privkey.pem \
        -out /tmp/certbot-bootstrap/fullchain.pem \
        -subj "/CN=${DOMAIN}" 2>/dev/null

    # Créer le répertoire Let's Encrypt si absent
    mkdir -p /etc/letsencrypt/live/${DOMAIN}
    cp /tmp/certbot-bootstrap/privkey.pem /etc/letsencrypt/live/${DOMAIN}/
    cp /tmp/certbot-bootstrap/fullchain.pem /etc/letsencrypt/live/${DOMAIN}/

    # Démarrer nginx pour servir le challenge
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d nginx

    # Obtenir le vrai certificat
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" run --rm certbot \
        certbot certonly --webroot -w /var/www/certbot \
        -d "${DOMAIN}" -d "www.${DOMAIN}" \
        --email "${CERTBOT_EMAIL}" \
        --agree-tos --no-eff-email --force-renewal

    # Recharger nginx avec le vrai certificat
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec nginx nginx -s reload

    log "Certificat SSL obtenu pour ${DOMAIN}"
    rm -rf /tmp/certbot-bootstrap
}

# ── 3. Déploiement / mise à jour ─────────────────────────────────────
cmd_update() {
    check_root
    log "=== Déploiement de l'application ==="

    cd "${APP_DIR}"
    [[ -f "${ENV_FILE}" ]] || die "Fichier ${ENV_FILE} manquant dans ${APP_DIR}"

    # Authentification Docker Hub
    source <(grep -E '^DOCKERHUB_' "${ENV_FILE}")
    if [[ -n "${DOCKERHUB_USERNAME:-}" && -n "${DOCKERHUB_TOKEN:-}" ]]; then
        echo "${DOCKERHUB_TOKEN}" | docker login -u "${DOCKERHUB_USERNAME}" --password-stdin
    fi

    # Pull des nouvelles images
    log "Pull des images Docker..."
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" pull

    # Démarrage avec remplacement zero-downtime (restart)
    log "Démarrage des services..."
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --remove-orphans

    # Attente du health check
    log "Vérification de la santé..."
    sleep 10
    cmd_health

    # Nettoyage des anciennes images
    docker image prune -f --filter "until=168h" 2>/dev/null || true

    log "=== Déploiement terminé ==="
}

# ── 4. Health check ──────────────────────────────────────────────────
cmd_health() {
    echo "── Statut des conteneurs ──"
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps 2>/dev/null || \
        docker compose -f docker-compose.prod.yml ps

    echo ""
    echo "── Health checks ──"
    local backend_ok=false
    local nginx_ok=false

    # Test backend
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        log "Backend : OK"
        backend_ok=true
    else
        # Le backend n'est peut-être pas exposé directement, test via nginx
        if curl -sf http://localhost/health > /dev/null 2>&1; then
            log "Backend (via nginx) : OK"
            backend_ok=true
        else
            err "Backend : KO"
        fi
    fi

    # Test nginx HTTPS
    if curl -sf https://${DOMAIN}/health > /dev/null 2>&1; then
        log "HTTPS : OK"
        nginx_ok=true
    elif curl -sfk https://localhost/health > /dev/null 2>&1; then
        log "HTTPS (localhost, cert non vérifié) : OK"
        nginx_ok=true
    else
        warn "HTTPS : non accessible (certificat en attente ?)"
    fi

    # Test DB connectivity via backend
    if curl -sf http://localhost:8000/health 2>/dev/null | grep -q '"status":"ok"'; then
        log "Base de données : OK"
    elif curl -sf http://localhost/health 2>/dev/null | grep -q '"status":"ok"'; then
        log "Base de données (via nginx) : OK"
    else
        warn "Base de données : statut inconnu"
    fi
}

# ── 5. Installation des crons ────────────────────────────────────────
cmd_cron() {
    check_root
    log "=== Installation des tâches cron ==="

    # Backup hebdomadaire (dimanche 3h du matin)
    local backup_cron="0 3 * * 0 ${APP_DIR}/infra/backup.sh >> ${APP_DIR}/logs/backup.log 2>&1"

    # Arrêt nocturne 20h, relance 8h
    local stop_cron="0 20 * * * cd ${APP_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} stop >> ${APP_DIR}/logs/night.log 2>&1"
    local start_cron="0 8 * * * cd ${APP_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} start >> ${APP_DIR}/logs/night.log 2>&1"

    # Écrire dans le crontab root
    (crontab -l 2>/dev/null | grep -v 'provencalia' || true; \
     echo "# provencalia — backup hebdomadaire"; \
     echo "${backup_cron}"; \
     echo "# provencalia — arrêt nocturne 20h"; \
     echo "${stop_cron}"; \
     echo "# provencalia — relance 8h"; \
     echo "${start_cron}") | crontab -

    log "Crons installés :"
    echo "  - Backup : dimanche 3h00"
    echo "  - Arrêt  : tous les jours 20h00"
    echo "  - Relance : tous les jours 8h00"
}

# ── Main ─────────────────────────────────────────────────────────────
main() {
    case "${1:-help}" in
        init)    cmd_init ;;
        certbot) cmd_certbot ;;
        update)  cmd_update ;;
        health)  cmd_health ;;
        cron)    cmd_cron ;;
        *)
            echo "Usage: $0 {init|certbot|update|health|cron}"
            echo ""
            echo "  init     Première installation du VPS (Docker, UFW, Fail2ban, SSH)"
            echo "  certbot  Obtenir/renouveler le certificat Let's Encrypt"
            echo "  update   Pull images et (re)démarrer l'application"
            echo "  health   Vérifier la santé de tous les services"
            echo "  cron     Installer les tâches cron (backup + arrêt/relance nocturne)"
            exit 1
            ;;
    esac
}

main "$@"
