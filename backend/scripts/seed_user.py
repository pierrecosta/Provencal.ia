"""
Script de maintenance — création d'un utilisateur contributeur.

Usage (depuis backend/) :
    python -m scripts.seed_user --pseudo <pseudo> --password <password>
"""

import argparse
import asyncio
import sys

from sqlalchemy import func, select

from app.core.database import async_session_maker, engine
from app.core.security import hash_password
from app.models.user import User

MAX_USERS = 10


async def create_user(pseudo: str, password: str) -> None:
    try:
        async with async_session_maker() as session:
            # Vérifier le nombre d'utilisateurs existants
            count_result = await session.execute(select(func.count()).select_from(User))
            user_count = count_result.scalar_one()
            if user_count >= MAX_USERS:
                print(f"Erreur : le nombre maximum de contributeurs ({MAX_USERS}) est atteint.")
                sys.exit(1)

            # Vérifier que le pseudo n'existe pas déjà
            existing = await session.execute(select(User).where(User.pseudo == pseudo))
            if existing.scalar_one_or_none() is not None:
                print(f"Erreur : le pseudo '{pseudo}' existe déjà.")
                sys.exit(1)

            user = User(pseudo=pseudo, password_hash=hash_password(password))
            session.add(user)
            await session.commit()

        print(f"Utilisateur '{pseudo}' créé avec succès.")
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Créer un utilisateur contributeur.")
    parser.add_argument("--pseudo", required=True, help="Pseudo de l'utilisateur")
    parser.add_argument("--password", required=True, help="Mot de passe (en clair)")
    args = parser.parse_args()

    asyncio.run(create_user(args.pseudo, args.password))


if __name__ == "__main__":
    main()
