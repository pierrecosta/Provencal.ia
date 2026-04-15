from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import delete, select

from app.core.database import async_session_maker, engine
from app.models.token_blacklist import TokenBlacklist
from app.services.blacklist import cleanup_expired_tokens, is_token_revoked, revoke_token

SAMPLE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample.test"
SAMPLE_TOKEN_2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample.test2"


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@pytest.fixture(autouse=True)
async def clean_blacklist():
    """Nettoie la table token_blacklist avant et après chaque test."""
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(delete(TokenBlacklist))
        await session.commit()
    yield
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(delete(TokenBlacklist))
        await session.commit()
    await engine.dispose()


async def test_revoke_token_inserts_row():
    expires = _utcnow_naive() + timedelta(hours=1)
    async with async_session_maker() as session:
        await revoke_token(session, SAMPLE_TOKEN, expires)
        result = await session.execute(
            select(TokenBlacklist).where(TokenBlacklist.token == SAMPLE_TOKEN)
        )
        row = result.scalar_one_or_none()
    assert row is not None
    assert row.token == SAMPLE_TOKEN
    assert row.expires_at is not None


async def test_is_token_revoked_true():
    expires = _utcnow_naive() + timedelta(hours=1)
    async with async_session_maker() as session:
        await revoke_token(session, SAMPLE_TOKEN, expires)
    async with async_session_maker() as session:
        assert await is_token_revoked(session, SAMPLE_TOKEN) is True


async def test_is_token_revoked_false():
    async with async_session_maker() as session:
        assert await is_token_revoked(session, SAMPLE_TOKEN) is False


async def test_revoke_duplicate_ignored():
    expires = _utcnow_naive() + timedelta(hours=1)
    async with async_session_maker() as session:
        await revoke_token(session, SAMPLE_TOKEN, expires)
    async with async_session_maker() as session:
        await revoke_token(session, SAMPLE_TOKEN, expires)
    async with async_session_maker() as session:
        result = await session.execute(
            select(TokenBlacklist).where(TokenBlacklist.token == SAMPLE_TOKEN)
        )
        rows = result.scalars().all()
    assert len(rows) == 1


async def test_cleanup_expired_tokens():
    now = _utcnow_naive()
    expired_time = now - timedelta(hours=1)
    future_time = now + timedelta(hours=1)

    async with async_session_maker() as session:
        session.add(TokenBlacklist(token=SAMPLE_TOKEN, expires_at=expired_time))
        session.add(TokenBlacklist(token=SAMPLE_TOKEN_2, expires_at=future_time))
        await session.commit()

    async with async_session_maker() as session:
        deleted = await cleanup_expired_tokens(session)

    assert deleted == 1

    async with async_session_maker() as session:
        assert await is_token_revoked(session, SAMPLE_TOKEN) is False
        assert await is_token_revoked(session, SAMPLE_TOKEN_2) is True


async def test_logout_persists_across_restart():
    """Vérifie que le token révoqué est bien persisté en BDD (pas en mémoire)."""
    expires = _utcnow_naive() + timedelta(hours=1)
    async with async_session_maker() as session:
        await revoke_token(session, SAMPLE_TOKEN, expires)

    # Simule un "redémarrage" en disposant le pool de connexions
    await engine.dispose()

    async with async_session_maker() as session:
        assert await is_token_revoked(session, SAMPLE_TOKEN) is True
