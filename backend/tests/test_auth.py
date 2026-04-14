import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import delete

from app.main import app
from app.core.database import async_session_maker, engine
from app.core.security import hash_password
from app.models.user import User

TEST_PSEUDO = "test_user_auth"
TEST_PASSWORD = "S3cur3P@ssw0rd!"


@pytest.fixture(autouse=True)
async def clean_test_user():
    """Réinitialise le pool et supprime le user de test avant/après chaque test."""
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
async def existing_user():
    """Crée un user valide en base et retourne ses identifiants."""
    async with async_session_maker() as session:
        user = User(pseudo=TEST_PSEUDO, password_hash=hash_password(TEST_PASSWORD))
        session.add(user)
        await session.commit()
    return {"pseudo": TEST_PSEUDO, "password": TEST_PASSWORD}


async def test_login_missing_fields():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422


async def test_login_wrong_pseudo():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"pseudo": "pseudo_inexistant_xyz", "password": "whatever"},
        )
    assert response.status_code == 401
    assert response.json()["detail"] == "Identifiant ou mot de passe incorrect"


async def test_login_wrong_password(existing_user):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"pseudo": existing_user["pseudo"], "password": "mauvais_mdp"},
        )
    assert response.status_code == 401
    assert response.json()["detail"] == "Identifiant ou mot de passe incorrect"


async def test_login_success(existing_user):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/auth/login", json=existing_user)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
