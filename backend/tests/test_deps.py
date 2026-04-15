from datetime import timedelta

import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import APIRouter, Depends
from sqlalchemy import delete

from app.main import app
from app.core.database import async_session_maker, engine
from app.core.security import hash_password, create_access_token
from app.models.user import User
from app.api.deps import get_current_user

TEST_PSEUDO = "test_deps_user"
TEST_PASSWORD = "S3cur3P@ssw0rd!"

# Endpoint de test protégé — enregistré une seule fois au chargement du module
_test_router = APIRouter()


@_test_router.get("/test/protected")
async def _protected(current_user: User = Depends(get_current_user)):
    return {"pseudo": current_user.pseudo}


app.include_router(_test_router, prefix="/api/v1")


@pytest.fixture(autouse=True)
async def clean_test_user():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(delete(User).where(User.pseudo == TEST_PSEUDO))
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(delete(User).where(User.pseudo == TEST_PSEUDO))
        await session.commit()
    await engine.dispose()


@pytest.fixture
async def user_token() -> str:
    """Crée un user en BDD et retourne un token valide."""
    async with async_session_maker() as session:
        user = User(pseudo=TEST_PSEUDO, password_hash=hash_password(TEST_PASSWORD))
        session.add(user)
        await session.commit()
    return create_access_token({"sub": TEST_PSEUDO})


async def test_no_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/test/protected")
    assert response.status_code == 401


async def test_invalid_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/test/protected",
            headers={"Authorization": "Bearer token.invalide.xyz"},
        )
    assert response.status_code == 401


async def test_expired_token():
    expired = create_access_token({"sub": TEST_PSEUDO}, expires_delta=timedelta(seconds=-1))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/test/protected",
            headers={"Authorization": f"Bearer {expired}"},
        )
    assert response.status_code == 401


async def test_valid_token_user_not_found():
    # Token valide mais le pseudo n'existe pas en BDD
    token = create_access_token({"sub": "pseudo_fantome"})
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/test/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 401


async def test_valid_token_success(user_token):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/test/protected",
            headers={"Authorization": f"Bearer {user_token}"},
        )
    assert response.status_code == 200
    assert response.json()["pseudo"] == TEST_PSEUDO
