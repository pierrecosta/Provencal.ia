# Checklist Sécurité & Anonymat — Production le-provencal.ovh

**Date :** 16/04/2026
**Instance cible :** OVH d2-2 (1 vCPU, 2 Go RAM, 25 Go SSD, Ubuntu 24.04)

---

## 1. Pare-feu & réseau

| # | Action | Commande / Vérification | Statut |
|---|--------|-------------------------|--------|
| 1.1 | UFW activé, politique deny par défaut | `sudo ufw status verbose` → Default: deny (incoming) | ☐ |
| 1.2 | Seuls les ports 22, 80, 443 ouverts | `sudo ufw status numbered` | ☐ |
| 1.3 | Pare-feu OVH Public Cloud configuré | Espace client → Network → Security Groups → même règles | ☐ |
| 1.4 | PostgreSQL port 5432 **non exposé** | `ss -tlnp \| grep 5432` → rien / docker network `internal: true` | ☐ |
| 1.5 | Réseau Docker `db-net` marqué `internal` | `docker network inspect provencalia_db-net` → "Internal": true | ☐ |

## 2. SSH

| # | Action | Vérification | Statut |
|---|--------|-------------|--------|
| 2.1 | Authentification par clé uniquement | `grep PasswordAuthentication /etc/ssh/sshd_config` → no | ☐ |
| 2.2 | Root login interdit (ou clé only) | `grep PermitRootLogin /etc/ssh/sshd_config` → prohibit-password | ☐ |
| 2.3 | Fail2ban actif sur SSH | `sudo fail2ban-client status sshd` → Currently banned / Total banned | ☐ |
| 2.4 | Fail2ban : max 3 tentatives, ban 24h | `grep -A5 '\[sshd\]' /etc/fail2ban/jail.local` | ☐ |

## 3. HTTPS / TLS

| # | Action | Vérification | Statut |
|---|--------|-------------|--------|
| 3.1 | Certificat Let's Encrypt valide | `curl -vI https://le-provencal.ovh 2>&1 \| grep 'SSL certificate'` | ☐ |
| 3.2 | HTTP → HTTPS redirect (301) | `curl -sI http://le-provencal.ovh \| grep Location` | ☐ |
| 3.3 | TLS 1.2+ uniquement | `nmap --script ssl-enum-ciphers -p 443 le-provencal.ovh` | ☐ |
| 3.4 | HSTS header présent | `curl -sI https://le-provencal.ovh \| grep Strict-Transport` | ☐ |
| 3.5 | Renouvellement auto Certbot | container `provencalia-certbot` running | ☐ |

## 4. Headers HTTP de sécurité & anonymat

| # | Header | Valeur attendue | Vérification | Statut |
|---|--------|----------------|-------------|--------|
| 4.1 | `Server` | Absent ou vide | `curl -sI https://le-provencal.ovh \| grep -i server` → rien | ☐ |
| 4.2 | `X-Powered-By` | Absent | `curl -sI …` → pas de X-Powered-By | ☐ |
| 4.3 | `X-Content-Type-Options` | `nosniff` | `curl -sI …` | ☐ |
| 4.4 | `X-Frame-Options` | `SAMEORIGIN` | `curl -sI …` | ☐ |
| 4.5 | `Referrer-Policy` | `no-referrer` | `curl -sI …` | ☐ |
| 4.6 | `X-XSS-Protection` | `1; mode=block` | `curl -sI …` | ☐ |
| 4.7 | `Permissions-Policy` | `camera=(), microphone=()…` | `curl -sI …` | ☐ |
| 4.8 | `Content-Security-Policy` | Présent | `curl -sI …` | ☐ |

## 5. Pages d'erreur

| # | Action | Vérification | Statut |
|---|--------|-------------|--------|
| 5.1 | 404 custom (pas de "nginx" ni "FastAPI") | `curl -s https://le-provencal.ovh/nonexistent` | ☐ |
| 5.2 | 500 custom (pas de stack trace) | Provoquer une erreur et vérifier | ☐ |
| 5.3 | 502 custom (maintenance) | Arrêter le backend, tester | ☐ |

## 6. Rate limiting

| # | Action | Vérification | Statut |
|---|--------|-------------|--------|
| 6.1 | API globale : 10 req/s burst 20 | Stress test : `ab -n 100 -c 20 https://le-provencal.ovh/health` | ☐ |
| 6.2 | Login : 3 req/s burst 5 | `for i in {1..10}; do curl -s -o /dev/null -w "%{http_code}\n" -X POST …/auth/login; done` → 429 après 5 | ☐ |

## 7. Application (backend)

| # | Action | Vérification | Statut |
|---|--------|-------------|--------|
| 7.1 | `ENVIRONMENT=production` | `curl -s https://le-provencal.ovh/health` → `"environment":"production"` | ☐ |
| 7.2 | Swagger/ReDoc désactivé | `curl -s https://le-provencal.ovh/docs` → 404 | ☐ |
| 7.3 | OpenAPI JSON désactivé | `curl -s https://le-provencal.ovh/openapi.json` → 404 | ☐ |
| 7.4 | CORS restreint à `https://le-provencal.ovh` | Test cross-origin depuis autre domaine → bloqué | ☐ |
| 7.5 | SECRET_KEY changée (pas la valeur par défaut) | `grep SECRET_KEY .env.prod` → longue clé aléatoire | ☐ |
| 7.6 | Uvicorn sans `--reload` | `docker exec provencalia-back ps aux` | ☐ |
| 7.7 | `--proxy-headers` activé | Dockerfile.prod vérifié | ☐ |

## 8. Docker & images

| # | Action | Vérification | Statut |
|---|--------|-------------|--------|
| 8.1 | Dépôts Docker Hub en **privé** | hub.docker.com → pastaga/provencal-front et back → Private | ☐ |
| 8.2 | Images taguées (pas uniquement `latest`) | `docker images \| grep pastaga` | ☐ |
| 8.3 | Pas de volumes montés en écriture inutile | `docker inspect` sur chaque conteneur | ☐ |
| 8.4 | Conteneurs en restart `unless-stopped` | `docker inspect --format '{{.HostConfig.RestartPolicy.Name}}'` | ☐ |

## 9. WHOIS & anonymat domaine

| # | Action | Vérification | Statut |
|---|--------|-------------|--------|
| 9.1 | OWO (WHOIS Obfuscation) activé | Espace client OVH → Domaines → le-provencal.ovh → Protection → OWO | ☐ |
| 9.2 | Vérifier le masquage | `whois le-provencal.ovh` → pas de nom/adresse personnelle | ☐ |
| 9.3 | Pas de données perso dans les headers HTTP | `curl -sI https://le-provencal.ovh` → aucun nom personnel | ☐ |
| 9.4 | Pas de metadata admin visible | Page /health ne doit pas exposer de données perso | ☐ |

## 10. Sauvegardes

| # | Action | Vérification | Statut |
|---|--------|-------------|--------|
| 10.1 | Cron backup installé (dimanche 3h) | `crontab -l \| grep backup` | ☐ |
| 10.2 | Dump fonctionnel | `./infra/backup.sh` → fichier .sql.gz non vide | ☐ |
| 10.3 | Rotation 4 semaines | Vérifier `BACKUP_RETENTION_WEEKS=4` dans .env.prod | ☐ |
| 10.4 | Test de restauration | `gunzip < backup.sql.gz \| docker exec -i provencalia-db psql -U … -d …` | ☐ |

## 11. Arrêt/relance nocturne

| # | Action | Vérification | Statut |
|---|--------|-------------|--------|
| 11.1 | Cron stop 20h installé | `crontab -l \| grep 'compose.*stop'` | ☐ |
| 11.2 | Cron start 8h installé | `crontab -l \| grep 'compose.*start'` | ☐ |
| 11.3 | Test manuel | `docker compose -f docker-compose.prod.yml stop` puis `start` | ☐ |

## 12. GitHub

| # | Action | Vérification | Statut |
|---|--------|-------------|--------|
| 12.1 | Repo GitHub privé (ou sans données perso) | GitHub → Settings → Visibility | ☐ |
| 12.2 | Secrets CI/CD configurés | GitHub → Settings → Secrets → 5 secrets requis | ☐ |
| 12.3 | Pas de `.env.prod` dans le repo | `.gitignore` contient `.env.prod` | ☐ |
| 12.4 | Workflow deploy.yml fonctionnel | Actions → dernier run → vert | ☐ |

---

## Estimation coût mensuel OVH

| Poste | Offre | Coût/mois |
|-------|-------|-----------|
| Instance VPS | d2-2 (1 vCPU, 2 Go RAM, 25 Go SSD) | ~3,50 € |
| Object Storage | Quelques Go d'images (si activé) | ~0,01 €/Go |
| Domaine | le-provencal.ovh (renouvellement annuel) | ~0,25 €/mois (~3 €/an) |
| Bande passante | Incluse dans l'instance | 0 € |
| **Total** | | **~4 €/mois** |

> L'arrêt nocturne 20h→8h via `docker compose stop/start` n'économise pas sur le prix de l'instance (facturation fixe mensuelle). Il réduit uniquement la consommation de ressources et la surface d'attaque hors heures d'usage.

---

## Commande de vérification rapide (post-déploiement)

```bash
# Script one-liner pour vérifier les essentiels
echo "=== Headers ===" && \
curl -sI https://le-provencal.ovh | grep -iE 'server|powered|strict|content-type-options|frame-options|referrer' && \
echo "=== Health ===" && \
curl -s https://le-provencal.ovh/health && \
echo "" && \
echo "=== Swagger (doit être 404) ===" && \
curl -s -o /dev/null -w "%{http_code}" https://le-provencal.ovh/docs && \
echo "" && \
echo "=== UFW ===" && \
sudo ufw status && \
echo "=== Fail2ban ===" && \
sudo fail2ban-client status sshd && \
echo "=== Conteneurs ===" && \
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```
