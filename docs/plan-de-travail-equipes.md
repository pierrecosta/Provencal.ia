# Plan de travail des équipes

## Objectif
Ce document définit la stratégie de gestion des CSRF (Cross-Site Request Forgery) pour notre application.

## Stratégie CSRF
Nous avons choisi d'utiliser des cookies avec l'attribut SameSite=Strict, en plus des attributs Secure et HttpOnly. Cette stratégie garantit que les cookies ne peuvent pas être envoyés dans des requêtes intersites, ce qui interdit leur utilisation à partir de sites externes et réduit donc le risque de CSRF.

## Conclusion
En appliquant cette stratégie, nous renforçons la sécurité de notre application en minimisant les risques associés aux attaques de type CSRF.