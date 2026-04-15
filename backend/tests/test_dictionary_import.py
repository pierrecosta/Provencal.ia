import io

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.core.database import async_session_maker, engine
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.dict_entry import DictEntry
from app.models.dict_translation import DictTranslation
from app.models.user import User

BASE_URL = "http://test"
PREFIX = "/api/v1/dictionary/import"

TEST_PSEUDO = "dict_import_user"

# ── CSV helpers ─────────────────────────────────────────────────────────────────

_HEADER = "Thème;Catégorie;Mot français;Synonyme français;Description;Traduction;TradEG;TradD;TradA;TradH;TradAv;TradP;TradX"
_VALID_ROW = "Nature;Plantes;Ail;;DescAil;Aiet;;;;;;;Aiet Féro"
_NO_TRAD_ROW = "Nature;Plantes;Poireau;;;;;;;;;;"  # 12 cols — wrong count test
_NO_TRAD_ROW_OK = "Nature;Plantes;Poireau;;;;;;;;;;"  # will be padded below


def _make_csv(*rows: str) -> bytes:
    return ("\n".join([_HEADER] + list(rows))).encode("utf-8")


@pytest.fixture(autouse=True)
async def clean_dict_import():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(delete(DictTranslation))
        await session.execute(delete(DictEntry))
        await session.execute(delete(User).where(User.pseudo == TEST_PSEUDO))
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(delete(DictTranslation))
        await session.execute(delete(DictEntry))
        await session.execute(delete(User).where(User.pseudo == TEST_PSEUDO))
        await session.commit()
    await engine.dispose()


@pytest.fixture
async def user_a():
    async with async_session_maker() as session:
        user = User(pseudo=TEST_PSEUDO, password_hash=hash_password("pass"))
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


@pytest.fixture
def auth_headers(user_a):
    token = create_access_token({"sub": user_a.pseudo})
    return {"Authorization": f"Bearer {token}"}


# ── Tests ────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_import_without_auth():
    csv_bytes = _make_csv(_VALID_ROW)
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(
            PREFIX,
            files={"file": ("dict.csv", io.BytesIO(csv_bytes), "text/csv")},
        )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_import_invalid_file_type(user_a, auth_headers):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(
            PREFIX,
            files={"file": ("dict.txt", io.BytesIO(b"some text"), "text/plain")},
            headers=auth_headers,
        )
    assert resp.status_code == 400
    assert "Format non supporté" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_import_wrong_column_count(user_a, auth_headers):
    bad_row = "Nature;Plantes;Ail;SynAil"  # only 4 cols
    csv_bytes = _make_csv(bad_row)
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(
            PREFIX,
            files={"file": ("dict.csv", io.BytesIO(csv_bytes), "text/csv")},
            headers=auth_headers,
        )
    assert resp.status_code == 400
    assert "Ligne 2" in resp.json()["detail"]
    assert "colonne" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_import_no_translation(user_a, auth_headers):
    # All 13 cols but all translation cols empty
    no_trad = "Nature;Plantes;Eau;;;;;;;;;;;;"
    # That's 14 cols — let's fix to exactly 13 with empty translations
    no_trad = ";".join(["Nature", "Plantes", "Eau", "", "", "", "", "", "", "", "", "", ""])
    csv_bytes = _make_csv(no_trad)
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(
            PREFIX,
            files={"file": ("dict.csv", io.BytesIO(csv_bytes), "text/csv")},
            headers=auth_headers,
        )
    assert resp.status_code == 400
    assert "aucune traduction" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_import_duplicate(user_a, auth_headers):
    csv_bytes = _make_csv(_VALID_ROW, _VALID_ROW)  # same row twice
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(
            PREFIX,
            files={"file": ("dict.csv", io.BytesIO(csv_bytes), "text/csv")},
            headers=auth_headers,
        )
    assert resp.status_code == 409
    assert "doublon" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_import_success(user_a, auth_headers):
    row2 = "Nature;Plantes;Aneth;Faux anis;;Anet;;;;;;Anet;"
    csv_bytes = _make_csv(_VALID_ROW, row2)
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(
            PREFIX,
            files={"file": ("dict.csv", io.BytesIO(csv_bytes), "text/csv")},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["imported"] == 2


@pytest.mark.asyncio
async def test_import_creates_translations(user_a, auth_headers):
    # Row with col5 (canonique) and col12 (mistralienne)
    row = "Nature;Plantes;Anis;;;Anis;;;;;;;" + ";DAnis"
    # Build row: theme;cat;mot;syn;desc;col5;col6;col7;col8;col9;col10;col11;col12
    row = ";".join(["Nature", "Plantes", "Anis", "", "", "Anis", "", "", "", "", "", "", "DAnis"])
    csv_bytes = _make_csv(row)
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(
            PREFIX,
            files={"file": ("dict.csv", io.BytesIO(csv_bytes), "text/csv")},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    assert resp.json()["imported"] == 1

    async with async_session_maker() as session:
        result = await session.execute(
            select(DictEntry)
            .where(DictEntry.mot_fr == "Anis")
            .options(selectinload(DictEntry.translations))
        )
        entry = result.scalar_one()
        assert len(entry.translations) == 2
        sources = {t.source for t in entry.translations}
        graphies = {t.graphie for t in entry.translations}
        assert "TradX" in sources
        assert "canonique" in graphies
        assert "mistralienne" in graphies
