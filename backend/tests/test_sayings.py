import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import delete, select

from app.main import app
from app.core.database import async_session_maker, engine
from app.core.security import create_access_token, hash_password
from app.models.edit_log import EditLog
from app.models.saying import Saying
from app.models.user import User
from app.services.locking import _utcnow, LOCK_TIMEOUT_MINUTES

from datetime import timedelta

BASE_URL = "http://test"
PREFIX = "/api/v1/sayings"

TEST_PSEUDO_A = "sayings_user_a"
TEST_PSEUDO_B = "sayings_user_b"


@pytest.fixture(autouse=True)
async def clean_sayings():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "sayings")
        )
        await session.execute(delete(Saying))
        await session.execute(
            delete(User).where(User.pseudo.in_([TEST_PSEUDO_A, TEST_PSEUDO_B]))
        )
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "sayings")
        )
        await session.execute(delete(Saying))
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


@pytest.fixture
async def sample_saying(user_a):
    async with async_session_maker() as session:
        saying = Saying(
            terme_provencal="Quand lou soulèu lusis",
            localite_origine="Marseille",
            traduction_sens_fr="Quand le soleil brille",
            type="Dicton",
            created_by=user_a.id,
        )
        session.add(saying)
        await session.commit()
        await session.refresh(saying)
    return saying


@pytest.fixture
async def three_sayings(user_a):
    async with async_session_maker() as session:
        items = [
            Saying(
                terme_provencal="Dicton un",
                localite_origine="Marseille",
                traduction_sens_fr="Premier",
                type="Dicton",
                created_by=user_a.id,
            ),
            Saying(
                terme_provencal="Dicton dos",
                localite_origine="Aix-en-Provence",
                traduction_sens_fr="Deuxième",
                type="Dicton",
                created_by=user_a.id,
            ),
            Saying(
                terme_provencal="Proverbe un",
                localite_origine="Avignon",
                traduction_sens_fr="Troisième",
                type="Proverbe",
                created_by=user_a.id,
            ),
        ]
        session.add_all(items)
        await session.commit()
        for s in items:
            await session.refresh(s)
    return items


# ─── GET /sayings/today ───


async def test_today_no_sayings():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(f"{PREFIX}/today")
    assert r.status_code == 404


async def test_today_returns_one(three_sayings):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(f"{PREFIX}/today")
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert "terme_provencal" in data
    assert "traduction_sens_fr" in data


async def test_today_deterministic(three_sayings):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r1 = await c.get(f"{PREFIX}/today")
        r2 = await c.get(f"{PREFIX}/today")
    assert r1.json()["id"] == r2.json()["id"]


# ─── GET /sayings ───


async def test_list_empty():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX)
    assert r.status_code == 200
    data = r.json()
    assert data["items"] == []
    assert data["total"] == 0


async def test_list_with_data(three_sayings):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX)
    assert r.status_code == 200
    assert len(r.json()["items"]) == 3


async def test_list_filter_type(three_sayings):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX, params={"type": "Dicton"})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 2
    assert all(i["type"] == "Dicton" for i in data["items"])


async def test_list_filter_localite(three_sayings):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX, params={"localite": "Marseille"})
    assert r.status_code == 200
    assert r.json()["total"] == 1


async def test_list_pagination(user_a):
    async with async_session_maker() as session:
        for i in range(5):
            session.add(
                Saying(
                    terme_provencal=f"Terme {i}",
                    localite_origine="Lieu",
                    traduction_sens_fr=f"Trad {i}",
                    created_by=user_a.id,
                )
            )
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX, params={"per_page": 2, "page": 2})
    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) == 2
    assert data["page"] == 2
    assert data["pages"] == 3


# ─── POST /sayings ───

VALID_BODY = {
    "terme_provencal": "Quand lou vent bufo",
    "localite_origine": "Toulon",
    "traduction_sens_fr": "Quand le vent souffle",
}


async def test_create_without_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(PREFIX, json=VALID_BODY)
    assert r.status_code == 401


async def test_create_missing_required_fields(auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(PREFIX, json={}, headers=auth_headers_a)
    assert r.status_code == 422


async def test_create_success(auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(PREFIX, json=VALID_BODY, headers=auth_headers_a)
    assert r.status_code == 201
    data = r.json()
    assert data["terme_provencal"] == VALID_BODY["terme_provencal"]
    assert "id" in data
    assert data["created_at"] is not None


async def test_create_with_optional_fields(auth_headers_a):
    body = {**VALID_BODY, "type": "Expression", "contexte": "Temps venteux"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(PREFIX, json=body, headers=auth_headers_a)
    assert r.status_code == 201
    data = r.json()
    assert data["type"] == "Expression"
    assert data["contexte"] == "Temps venteux"


async def test_create_logs_action(auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(PREFIX, json=VALID_BODY, headers=auth_headers_a)
    saying_id = r.json()["id"]

    async with async_session_maker() as session:
        result = await session.execute(
            select(EditLog).where(
                EditLog.table_name == "sayings",
                EditLog.row_id == saying_id,
                EditLog.action == "INSERT",
            )
        )
        log = result.scalar_one_or_none()
    assert log is not None
    assert log.new_data["terme_provencal"] == VALID_BODY["terme_provencal"]


# ─── PUT /sayings/{id} ───


async def test_update_without_auth(sample_saying):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(f"{PREFIX}/{sample_saying.id}", json={"contexte": "X"})
    assert r.status_code == 401


async def test_update_not_found(auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(
            f"{PREFIX}/99999",
            json={"contexte": "X"},
            headers=auth_headers_a,
        )
    assert r.status_code == 404


async def test_update_success(sample_saying, auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(
            f"{PREFIX}/{sample_saying.id}",
            json={"contexte": "Nouveau contexte"},
            headers=auth_headers_a,
        )
    assert r.status_code == 200
    assert r.json()["contexte"] == "Nouveau contexte"


async def test_update_partial(sample_saying, auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(
            f"{PREFIX}/{sample_saying.id}",
            json={"source": "Mistral"},
            headers=auth_headers_a,
        )
    assert r.status_code == 200
    data = r.json()
    assert data["source"] == "Mistral"
    assert data["terme_provencal"] == sample_saying.terme_provencal


async def test_update_locked_by_other(sample_saying, auth_headers_b, user_a):
    async with async_session_maker() as session:
        s = await session.get(Saying, sample_saying.id)
        s.locked_by = user_a.id
        s.locked_at = _utcnow()
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(
            f"{PREFIX}/{sample_saying.id}",
            json={"contexte": "X"},
            headers=auth_headers_b,
        )
    assert r.status_code == 403


async def test_update_logs_action(sample_saying, auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        await c.put(
            f"{PREFIX}/{sample_saying.id}",
            json={"contexte": "Modifié"},
            headers=auth_headers_a,
        )

    async with async_session_maker() as session:
        result = await session.execute(
            select(EditLog).where(
                EditLog.table_name == "sayings",
                EditLog.row_id == sample_saying.id,
                EditLog.action == "UPDATE",
            )
        )
        log = result.scalar_one_or_none()
    assert log is not None
    assert log.old_data is not None
    assert log.new_data == {"contexte": "Modifié"}


# ─── DELETE /sayings/{id} ───


async def test_delete_without_auth(sample_saying):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.delete(f"{PREFIX}/{sample_saying.id}")
    assert r.status_code == 401


async def test_delete_not_found(auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.delete(f"{PREFIX}/99999", headers=auth_headers_a)
    assert r.status_code == 404


async def test_delete_success(sample_saying, auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.delete(f"{PREFIX}/{sample_saying.id}", headers=auth_headers_a)
    assert r.status_code == 200
    assert r.json()["message"] == "Supprimé"

    async with async_session_maker() as session:
        row = await session.get(Saying, sample_saying.id)
    assert row is None


async def test_delete_locked_by_other(sample_saying, auth_headers_b, user_a):
    async with async_session_maker() as session:
        s = await session.get(Saying, sample_saying.id)
        s.locked_by = user_a.id
        s.locked_at = _utcnow()
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.delete(f"{PREFIX}/{sample_saying.id}", headers=auth_headers_b)
    assert r.status_code == 403


async def test_delete_logs_action(sample_saying, auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        await c.delete(f"{PREFIX}/{sample_saying.id}", headers=auth_headers_a)

    async with async_session_maker() as session:
        result = await session.execute(
            select(EditLog).where(
                EditLog.table_name == "sayings",
                EditLog.row_id == sample_saying.id,
                EditLog.action == "DELETE",
            )
        )
        log = result.scalar_one_or_none()
    assert log is not None
    assert log.old_data is not None
    assert log.old_data["terme_provencal"] == sample_saying.terme_provencal
