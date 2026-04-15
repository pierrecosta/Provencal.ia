import datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from app.core.database import async_session_maker, engine
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.agenda_event import AgendaEvent
from app.models.edit_log import EditLog
from app.models.user import User

BASE_URL = "http://test"
PREFIX = "/api/v1/events"

TEST_PSEUDO_A = "events_user_a"
TEST_PSEUDO_B = "events_user_b"


@pytest.fixture(autouse=True)
async def clean_events():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "agenda_events")
        )
        await session.execute(delete(AgendaEvent))
        await session.execute(
            delete(User).where(User.pseudo.in_([TEST_PSEUDO_A, TEST_PSEUDO_B]))
        )
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "agenda_events")
        )
        await session.execute(delete(AgendaEvent))
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


def _future_date(days=30):
    return (datetime.date.today() + datetime.timedelta(days=days)).isoformat()


def _past_date(days=30):
    return (datetime.date.today() - datetime.timedelta(days=days)).isoformat()


@pytest.fixture
async def upcoming_events(user_a):
    today = datetime.date.today()
    async with async_session_maker() as session:
        items = [
            AgendaEvent(
                titre="Fête A",
                date_debut=today + datetime.timedelta(days=10),
                date_fin=today + datetime.timedelta(days=12),
                lieu="Marseille",
                created_by=user_a.id,
            ),
            AgendaEvent(
                titre="Fête B",
                date_debut=today + datetime.timedelta(days=20),
                date_fin=today + datetime.timedelta(days=22),
                lieu="Aix-en-Provence",
                created_by=user_a.id,
            ),
        ]
        session.add_all(items)
        await session.commit()
        for e in items:
            await session.refresh(e)
    return items


@pytest.fixture
async def past_event(user_a):
    today = datetime.date.today()
    async with async_session_maker() as session:
        event = AgendaEvent(
            titre="Fête passée",
            date_debut=today - datetime.timedelta(days=30),
            date_fin=today - datetime.timedelta(days=28),
            lieu="Avignon",
            created_by=user_a.id,
        )
        session.add(event)
        await session.commit()
        await session.refresh(event)
    return event


# ─── GET /events ───


async def test_list_empty():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX)
    assert r.status_code == 200
    data = r.json()
    assert data["items"] == []
    assert data["total"] == 0


async def test_list_upcoming_only(upcoming_events, past_event):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 2
    assert all(e["titre"] != "Fête passée" for e in data["items"])


async def test_list_archive(upcoming_events, past_event):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX, params={"archive": "true"})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1
    assert data["items"][0]["titre"] == "Fête passée"


async def test_list_filter_lieu(upcoming_events):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX, params={"lieu": "Marseille"})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1
    assert data["items"][0]["lieu"] == "Marseille"


async def test_list_filter_annee_mois(user_a):
    today = datetime.date.today()
    target = datetime.date(2026, 6, 15)
    async with async_session_maker() as session:
        session.add(
            AgendaEvent(
                titre="Juin 2026",
                date_debut=target,
                date_fin=target + datetime.timedelta(days=2),
                created_by=user_a.id,
            )
        )
        session.add(
            AgendaEvent(
                titre="Autre",
                date_debut=today + datetime.timedelta(days=5),
                date_fin=today + datetime.timedelta(days=7),
                created_by=user_a.id,
            )
        )
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX, params={"annee": 2026, "mois": 6})
    assert r.status_code == 200
    data = r.json()
    assert any(e["titre"] == "Juin 2026" for e in data["items"])


# ─── POST /events ───


VALID_BODY = {
    "titre": "Fête de test",
    "date_debut": _future_date(10),
    "date_fin": _future_date(12),
    "lieu": "Arles",
    "description": "Un événement de test",
}


async def test_create_without_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(PREFIX, json=VALID_BODY)
    assert r.status_code == 401


async def test_create_invalid_dates(auth_headers_a):
    body = {
        "titre": "Dates inversées",
        "date_debut": _future_date(12),
        "date_fin": _future_date(10),
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(PREFIX, json=body, headers=auth_headers_a)
    assert r.status_code == 422


async def test_create_success(auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(PREFIX, json=VALID_BODY, headers=auth_headers_a)
    assert r.status_code == 201
    data = r.json()
    assert data["titre"] == VALID_BODY["titre"]
    assert "id" in data


# ─── PUT /events/{id} ───


async def test_update_success(auth_headers_a, upcoming_events):
    event_id = upcoming_events[0].id
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(
            f"{PREFIX}/{event_id}",
            json={"titre": "Titre modifié"},
            headers=auth_headers_a,
        )
    assert r.status_code == 200
    assert r.json()["titre"] == "Titre modifié"


async def test_update_not_found(auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(
            f"{PREFIX}/99999",
            json={"titre": "X"},
            headers=auth_headers_a,
        )
    assert r.status_code == 404


# ─── DELETE /events/{id} ───


async def test_delete_success(auth_headers_a, upcoming_events):
    event_id = upcoming_events[0].id
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.delete(f"{PREFIX}/{event_id}", headers=auth_headers_a)
    assert r.status_code == 200
    assert r.json()["message"] == "Événement supprimé"

    # Vérifier suppression
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX)
    assert all(e["id"] != event_id for e in r.json()["items"])


# ─── Logging ───


async def test_create_logs_action(auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(PREFIX, json=VALID_BODY, headers=auth_headers_a)
    event_id = r.json()["id"]

    async with async_session_maker() as session:
        result = await session.execute(
            select(EditLog).where(
                EditLog.table_name == "agenda_events",
                EditLog.row_id == event_id,
                EditLog.action == "INSERT",
            )
        )
        log = result.scalar_one_or_none()
    assert log is not None
    assert log.new_data["titre"] == VALID_BODY["titre"]
