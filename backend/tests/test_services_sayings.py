import pytest
from fastapi import HTTPException
from sqlalchemy import delete

from app.core.database import async_session_maker, engine
from app.core.security import hash_password
from app.models.edit_log import EditLog
from app.models.saying import Saying
from app.models.user import User
from app.services.sayings import (
    create_saying,
    delete_saying,
    get_today_saying,
    update_saying,
)
from app.services.locking import _utcnow, LOCK_TIMEOUT_MINUTES

from datetime import timedelta
from types import SimpleNamespace

TEST_PSEUDO = "svc_sayings_user"


@pytest.fixture(autouse=True)
async def clean_db():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "sayings")
        )
        await session.execute(delete(Saying))
        await session.execute(delete(User).where(User.pseudo == TEST_PSEUDO))
        await session.commit()
    yield
    await engine.dispose()


@pytest.fixture
async def user():
    async with async_session_maker() as session:
        u = User(pseudo=TEST_PSEUDO, password_hash=hash_password("pass"))
        session.add(u)
        await session.commit()
        await session.refresh(u)
        return u


async def test_get_today_saying_empty():
    """Base vide → HTTPException 404."""
    await engine.dispose()
    async with async_session_maker() as session:
        with pytest.raises(HTTPException) as exc_info:
            await get_today_saying(session)
        assert exc_info.value.status_code == 404


async def test_get_today_saying_returns_one(user):
    """3 sayings → retourne un saying."""
    await engine.dispose()
    async with async_session_maker() as session:
        for i in range(3):
            session.add(
                Saying(
                    terme_provencal=f"terme_{i}",
                    localite_origine="Marseille",
                    traduction_sens_fr=f"trad_{i}",
                    created_by=user.id,
                )
            )
        await session.commit()

    await engine.dispose()
    async with async_session_maker() as session:
        result = await get_today_saying(session)
        assert result is not None
        assert result.terme_provencal.startswith("terme_")


async def test_create_saying_success(user):
    """Création → saying en base + edit_log."""
    await engine.dispose()
    async with async_session_maker() as session:
        data = SimpleNamespace(
            terme_provencal="Lou sòu",
            localite_origine="Aix",
            traduction_sens_fr="Le soleil",
            type="Dicton",
            contexte=None,
            source=None,
        )
        saying = await create_saying(session, data, user.id)
        assert saying.id is not None
        assert saying.terme_provencal == "Lou sòu"
        assert saying.created_by == user.id

    # Vérifier l'edit_log
    await engine.dispose()
    async with async_session_maker() as session:
        from sqlalchemy import select

        logs = (
            await session.execute(
                select(EditLog).where(
                    EditLog.table_name == "sayings",
                    EditLog.action == "INSERT",
                )
            )
        ).scalars().all()
        assert len(logs) == 1


async def test_update_saying_locked(user):
    """Saying verrouillé par un autre → HTTPException 403 lors de l'acquire_lock."""
    await engine.dispose()
    async with async_session_maker() as session:
        other = User(pseudo="other_lock_user", password_hash=hash_password("pass"))
        session.add(other)
        await session.commit()
        await session.refresh(other)

        saying = Saying(
            terme_provencal="Test",
            localite_origine="Marseille",
            traduction_sens_fr="Test",
            created_by=user.id,
            locked_by=other.id,
            locked_at=_utcnow(),
        )
        session.add(saying)
        await session.commit()
        await session.refresh(saying)
        saying_id = saying.id

    await engine.dispose()
    async with async_session_maker() as session:
        data = SimpleNamespace(**{"model_dump": lambda exclude_unset=True: {"contexte": "new"}})
        with pytest.raises(HTTPException) as exc_info:
            await update_saying(session, saying_id, data, user.id)
        assert exc_info.value.status_code == 403

    # Cleanup
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(delete(User).where(User.pseudo == "other_lock_user"))
        await session.commit()


async def test_delete_saying_not_found(user):
    """ID inexistant → HTTPException 404."""
    await engine.dispose()
    async with async_session_maker() as session:
        with pytest.raises(HTTPException) as exc_info:
            await delete_saying(session, 999999, user.id)
        assert exc_info.value.status_code == 404
