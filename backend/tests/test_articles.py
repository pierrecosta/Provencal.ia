import datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from app.core.database import async_session_maker, engine
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.article import Article
from app.models.edit_log import EditLog
from app.models.user import User

BASE_URL = "http://test"
PREFIX = "/api/v1/articles"

TEST_PSEUDO_A = "articles_user_a"


@pytest.fixture(autouse=True)
async def clean_articles():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "articles")
        )
        await session.execute(delete(Article))
        await session.execute(
            delete(User).where(User.pseudo == TEST_PSEUDO_A)
        )
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "articles")
        )
        await session.execute(delete(Article))
        await session.execute(
            delete(User).where(User.pseudo == TEST_PSEUDO_A)
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
def auth_headers_a(user_a):
    token = create_access_token({"sub": user_a.pseudo})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def three_articles(user_a):
    async with async_session_maker() as session:
        items = [
            Article(
                titre="Article C",
                date_publication=datetime.date(2026, 1, 10),
                categorie="Gastronomie",
                created_by=user_a.id,
            ),
            Article(
                titre="Article A",
                date_publication=datetime.date(2026, 3, 15),
                categorie="Langue & Culture",
                created_by=user_a.id,
            ),
            Article(
                titre="Article B",
                date_publication=datetime.date(2026, 2, 20),
                categorie="Gastronomie",
                created_by=user_a.id,
            ),
        ]
        session.add_all(items)
        await session.commit()
        for a in items:
            await session.refresh(a)
    return items


VALID_BODY = {
    "titre": "Nouvel article",
    "date_publication": "2026-04-01",
    "categorie": "Enseignement",
}


# ─── GET /articles ───


async def test_list_empty():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX)
    assert r.status_code == 200
    data = r.json()
    assert data["items"] == []
    assert data["total"] == 0


async def test_list_sorted_by_date(three_articles):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX)
    assert r.status_code == 200
    items = r.json()["items"]
    dates = [i["date_publication"] for i in items]
    assert dates == sorted(dates, reverse=True)


async def test_list_filter_categorie(three_articles):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX, params={"categorie": "Gastronomie"})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 2
    assert all(i["categorie"] == "Gastronomie" for i in data["items"])


# ─── POST /articles ───


async def test_create_without_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(PREFIX, json=VALID_BODY)
    assert r.status_code == 401


async def test_create_invalid_categorie(auth_headers_a):
    body = {**VALID_BODY, "categorie": "CatégorieInexistante"}
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


# ─── PUT /articles/{id} ───


async def test_update_success(auth_headers_a, three_articles):
    article_id = three_articles[0].id
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(
            f"{PREFIX}/{article_id}",
            json={"titre": "Titre modifié"},
            headers=auth_headers_a,
        )
    assert r.status_code == 200
    assert r.json()["titre"] == "Titre modifié"


# ─── DELETE /articles/{id} ───


async def test_delete_success(auth_headers_a, three_articles):
    article_id = three_articles[0].id
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.delete(f"{PREFIX}/{article_id}", headers=auth_headers_a)
    assert r.status_code == 200
    assert r.json()["message"] == "Article supprimé"
