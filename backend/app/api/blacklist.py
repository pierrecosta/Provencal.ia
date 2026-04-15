# Blacklist en mémoire des tokens JWT révoqués (logout).
# Vidée au redémarrage — acceptable : tokens expirent en 60 min, max 10 contributeurs.
token_blacklist: set[str] = set()
