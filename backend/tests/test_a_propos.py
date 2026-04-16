import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import delete, select

from app.main import app
from app.core.database import async_session_maker, engine
from app.core.security import create_access_token, hash_password
from app.models.a_propos import AProposContent
from app.models.edit_log import EditLog
from app.models.user import User
from app.services.locking import _utcnow, LOCK_TIMEOUT_MINUTES

from datetime import timedelta

BASE_URL = "http://test"
PREFIX = "/api/v1/a-propos"

TEST_PSEUDO_A = "apropos_user_a"
TEST_PSEUDO_B = "apropos_user_b"


@pytest.fixture(autouse=True)
async def clean_db():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "a_propos_content")
        )
        await session.execute(delete(AProposContent))
        await session.execute(
            delete(User).where(User.pseudo.in_([TEST_PSEUDO_A, TEST_PSEUDO_B]))
        )
        # Insérer les deux blocs initiaux
        session.add(AProposContent(bloc="demarche", contenu="Texte démarche initial"))
        session.add(AProposContent(bloc="sources", contenu="Texte sources initial"))
        await session.commit()
    yield
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "a_propos_content")
        )
        await session.execute(delete(AProposContent))
        await session.execute(
            delete(User).where(User.pseudo.in_([TEST_PSEUDO_A, TEST_PSEUDO_B]))
        )
        await session.commit()
    await engine.dispose()


@pytest.fixture
async def user_a():
    async with async_session_maker() as session:
        user = User(pseudo=TEST_PSEUDO_A, password_hash=hash_password("pass"))
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


@pytest.fixture
async def user_b():
    async with async_session_maker() as session:
        user = User(pseudo=TEST_PSEUDO_B, password_hash=hash_password("pass"))
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


@pytest.fixture
def auth_headers_a(user_a):
    token = create_access_token({"sub": user_a.pseudo})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_b(user_b):
    token = create_access_token({"sub": user_b.pseudo})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_a_propos(user_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        resp = await client.get(PREFIX)

    assert resp.status_code == 200
    data = resp.json()
    assert "demarche" in data
    assert "sources" in data
    assert "contributors" in data
    assert isinstance(data["contributors"], list)
    assert TEST_PSEUDO_A in data["contributors"]
    assert data["demarche"]["contenu"] == "Texte démarche initial"
    assert data["sources"]["contenu"] == "Texte sources initial"


@pytest.mark.asyncio
async def test_get_a_propos_no_auth_required():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        resp = await client.get(PREFIX)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_update_bloc_authenticated(user_a, auth_headers_a):
    # D'abord acquérir le verrou
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        lock_resp = await client.post(f"{PREFIX}/demarche/lock", headers=auth_headers_a)
        assert lock_resp.status_code == 200

        resp = await client.put(
            f"{PREFIX}/demarche",
            json={"contenu": "Nouveau texte démarche"},
            headers=auth_headers_a,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["contenu"] == "Nouveau texte démarche"
    assert data["bloc"] == "demarche"


@pytest.mark.asyncio
async def test_update_bloc_unauthenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        resp = await client.put(
            f"{PREFIX}/demarche",
            json={"contenu": "Texte sans auth"},
        )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_lock_bloc(user_a, auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        resp = await client.post(f"{PREFIX}/demarche/lock", headers=auth_headers_a)

    assert resp.status_code == 200

    async with async_session_maker() as session:
        result = await session.execute(
            select(AProposContent).where(AProposContent.bloc == "demarche")
        )
        row = result.scalar_one()
        assert row.locked_by == user_a.id
        assert row.locked_at is not None


@pytest.mark.asyncio
async def test_unlock_bloc(user_a, auth_headers_a):
    # Acquérir puis libérer
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        await client.post(f"{PREFIX}/demarche/lock", headers=auth_headers_a)
        resp = await client.delete(f"{PREFIX}/demarche/lock", headers=auth_headers_a)

    assert resp.status_code == 200

    async with async_session_maker() as session:
        result = await session.execute(
            select(AProposContent).where(AProposContent.bloc == "demarche")
        )
        row = result.scalar_one()
        assert row.locked_by is None
        assert row.locked_at is None


@pytest.mark.asyncio
async def test_update_locked_by_other(user_a, user_b, auth_headers_a, auth_headers_b):
    # user_a verrouille le bloc
    async with async_session_maker() as session:
        result = await session.execute(
            select(AProposContent).where(AProposContent.bloc == "demarche")
        )
        row = result.scalar_one()
        row.locked_by = user_a.id
        row.locked_at = _utcnow()
        await session.commit()

    # user_b tente de modifier → 423
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        resp = await client.put(
            f"{PREFIX}/demarche",
            json={"contenu": "Texte user_b"},
            headers=auth_headers_b,
        )

    assert resp.status_code == 423


@pytest.mark.asyncio
async def test_update_invalid_bloc(user_a, auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        resp = await client.put(
            f"{PREFIX}/contributeurs",
            json={"contenu": "Ne doit pas passer"},
            headers=auth_headers_a,
        )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_rollback_bloc(user_a, auth_headers_a):
    # Modifier le bloc, puis rollback
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        await client.post(f"{PREFIX}/sources/lock", headers=auth_headers_a)
        await client.put(
            f"{PREFIX}/sources",
            json={"contenu": "Texte modifié"},
            headers=auth_headers_a,
        )
        # Re-locker pour le rollback
        await client.post(f"{PREFIX}/sources/lock", headers=auth_headers_a)
        resp = await client.post(f"{PREFIX}/sources/rollback", headers=auth_headers_a)

    assert resp.status_code == 200

    # Vérifier que le contenu a été restauré
    async with async_session_maker() as session:
        result = await session.execute(
            select(AProposContent).where(AProposContent.bloc == "sources")
        )
        row = result.scalar_one()
        assert row.contenu == "Texte sources initial"
