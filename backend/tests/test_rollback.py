import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from app.core.database import async_session_maker, engine
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.edit_log import EditLog
from app.models.saying import Saying
from app.models.user import User

BASE_URL = "http://test"
SAYINGS_PREFIX = "/api/v1/sayings"

TEST_PSEUDO = "rollback_user"


@pytest.fixture(autouse=True)
async def clean_rollback():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(delete(EditLog).where(EditLog.table_name == "sayings"))
        await session.execute(delete(Saying))
        await session.execute(delete(User).where(User.pseudo == TEST_PSEUDO))
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(delete(EditLog).where(EditLog.table_name == "sayings"))
        await session.execute(delete(Saying))
        await session.execute(delete(User).where(User.pseudo == TEST_PSEUDO))
        await session.commit()
    await engine.dispose()


@pytest.fixture
async def user():
    async with async_session_maker() as session:
        u = User(pseudo=TEST_PSEUDO, password_hash=hash_password("pass"))
        session.add(u)
        await session.commit()
        await session.refresh(u)
    return u


@pytest.fixture
def auth_headers(user):
    token = create_access_token({"sub": user.pseudo})
    return {"Authorization": f"Bearer {token}"}


VALID_SAYING = {
    "terme_provencal": "Test rollback",
    "localite_origine": "Marseille",
    "traduction_sens_fr": "Test de rollback",
}


async def test_rollback_no_log(auth_headers):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(f"{SAYINGS_PREFIX}/99999/rollback", headers=auth_headers)
    assert r.status_code == 404


async def test_rollback_without_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(f"{SAYINGS_PREFIX}/1/rollback")
    assert r.status_code == 401


async def test_rollback_insert(auth_headers):
    """Créer un saying → rollback → le saying est supprimé"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(SAYINGS_PREFIX, json=VALID_SAYING, headers=auth_headers)
    assert r.status_code == 201
    saying_id = r.json()["id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(f"{SAYINGS_PREFIX}/{saying_id}/rollback", headers=auth_headers)
    assert r.status_code == 200

    # Vérifier que le saying a été supprimé
    async with async_session_maker() as session:
        result = await session.execute(select(Saying).where(Saying.id == saying_id))
        assert result.scalar_one_or_none() is None


async def test_rollback_update(auth_headers):
    """Modifier un saying → rollback → les anciennes valeurs sont restaurées"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(SAYINGS_PREFIX, json=VALID_SAYING, headers=auth_headers)
    saying_id = r.json()["id"]

    # Consommer le log INSERT
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        await c.post(f"{SAYINGS_PREFIX}/{saying_id}/rollback", headers=auth_headers)

    # Recréer pour tester UPDATE rollback
    async with async_session_maker() as session:
        saying = Saying(
            terme_provencal="Terme original",
            localite_origine="Marseille",
            traduction_sens_fr="Original",
        )
        session.add(saying)
        await session.commit()
        await session.refresh(saying)

    saying_id = saying.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(
            f"{SAYINGS_PREFIX}/{saying_id}",
            json={"terme_provencal": "Terme modifié"},
            headers=auth_headers,
        )
    assert r.status_code == 200

    # Rollback UPDATE
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(f"{SAYINGS_PREFIX}/{saying_id}/rollback", headers=auth_headers)
    assert r.status_code == 200

    async with async_session_maker() as session:
        result = await session.execute(select(Saying).where(Saying.id == saying_id))
        row = result.scalar_one_or_none()
    assert row is not None
    assert row.terme_provencal == "Terme original"


async def test_rollback_delete(auth_headers):
    """Supprimer un saying → rollback → le saying réapparaît"""
    async with async_session_maker() as session:
        saying = Saying(
            terme_provencal="À supprimer",
            localite_origine="Arles",
            traduction_sens_fr="To delete",
        )
        session.add(saying)
        await session.commit()
        await session.refresh(saying)

    saying_id = saying.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.delete(f"{SAYINGS_PREFIX}/{saying_id}", headers=auth_headers)
    assert r.status_code == 200

    # Rollback DELETE
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(f"{SAYINGS_PREFIX}/{saying_id}/rollback", headers=auth_headers)
    assert r.status_code == 200

    async with async_session_maker() as session:
        result = await session.execute(select(Saying).where(Saying.id == saying_id))
        row = result.scalar_one_or_none()
    assert row is not None
    assert row.terme_provencal == "À supprimer"


async def test_rollback_one_shot(auth_headers):
    """Rollback → re-rollback → 404 (log consommé)"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(SAYINGS_PREFIX, json=VALID_SAYING, headers=auth_headers)
    saying_id = r.json()["id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r1 = await c.post(f"{SAYINGS_PREFIX}/{saying_id}/rollback", headers=auth_headers)
    assert r1.status_code == 200

    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r2 = await c.post(f"{SAYINGS_PREFIX}/{saying_id}/rollback", headers=auth_headers)
    assert r2.status_code == 404
