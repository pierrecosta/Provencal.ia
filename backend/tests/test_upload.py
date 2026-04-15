import io
import os
import shutil
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from app.api.upload import UPLOAD_DIR
from app.core.database import async_session_maker, engine
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.user import User

BASE_URL = "http://test"
PREFIX = "/api/v1/upload"

TEST_PSEUDO = "upload_user"


@pytest.fixture(autouse=True)
async def clean_upload():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(
            delete(User).where(User.pseudo == TEST_PSEUDO)
        )
        await session.commit()
    # Nettoyer le dossier upload de test
    if UPLOAD_DIR.exists():
        for f in UPLOAD_DIR.iterdir():
            if f.name != ".gitkeep":
                f.unlink()
    yield
    async with async_session_maker() as session:
        await session.execute(
            delete(User).where(User.pseudo == TEST_PSEUDO)
        )
        await session.commit()
    if UPLOAD_DIR.exists():
        for f in UPLOAD_DIR.iterdir():
            if f.name != ".gitkeep":
                f.unlink()
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


def _make_jpeg(size_bytes: int = 100) -> io.BytesIO:
    """Crée un faux fichier JPEG avec l'en-tête magique."""
    buf = io.BytesIO()
    # JPEG magic bytes
    buf.write(b"\xff\xd8\xff\xe0")
    buf.write(b"\x00" * (size_bytes - 4))
    buf.seek(0)
    return buf


async def test_upload_without_auth():
    buf = _make_jpeg()
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(
            f"{PREFIX}/image",
            files={"file": ("test.jpg", buf, "image/jpeg")},
        )
    assert r.status_code == 401


async def test_upload_invalid_type(auth_headers):
    buf = io.BytesIO(b"not an image")
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(
            f"{PREFIX}/image",
            files={"file": ("test.txt", buf, "text/plain")},
            headers=auth_headers,
        )
    assert r.status_code == 400


async def test_upload_success(auth_headers):
    buf = _make_jpeg(500)
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(
            f"{PREFIX}/image",
            files={"file": ("photo.jpg", buf, "image/jpeg")},
            headers=auth_headers,
        )
    assert r.status_code == 200
    data = r.json()
    assert "image_ref" in data
    assert data["image_ref"].startswith("/static/images/")
    assert data["image_ref"].endswith(".jpg")
    # Le nom original n'est pas conservé
    assert "photo" not in data["image_ref"]
    # Le fichier existe sur le disque
    file_path = Path("static") / "images" / data["image_ref"].split("/")[-1]
    assert (Path(__file__).resolve().parent.parent / file_path).exists() or \
           (UPLOAD_DIR / data["image_ref"].split("/")[-1]).exists()


async def test_upload_too_large(auth_headers):
    buf = _make_jpeg(3 * 1024 * 1024)  # 3 Mo
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(
            f"{PREFIX}/image",
            files={"file": ("big.jpg", buf, "image/jpeg")},
            headers=auth_headers,
        )
    assert r.status_code == 400


async def test_static_serving(auth_headers):
    buf = _make_jpeg(200)
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(
            f"{PREFIX}/image",
            files={"file": ("serve.jpg", buf, "image/jpeg")},
            headers=auth_headers,
        )
    image_ref = r.json()["image_ref"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(image_ref)
    assert r.status_code == 200
