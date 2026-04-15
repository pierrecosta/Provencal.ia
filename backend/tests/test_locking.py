import pytest
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import delete, select

from app.core.database import async_session_maker, engine
from app.core.security import hash_password
from app.models.saying import Saying
from app.models.user import User
from app.services.locking import acquire_lock, is_locked, release_lock, LOCK_TIMEOUT_MINUTES, _utcnow

TEST_PSEUDO_A = "lock_user_a"
TEST_PSEUDO_B = "lock_user_b"


@pytest.fixture(autouse=True)
async def clean_locking_data():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(delete(Saying))
        await session.execute(
            delete(User).where(User.pseudo.in_([TEST_PSEUDO_A, TEST_PSEUDO_B]))
        )
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(delete(Saying))
        await session.execute(
            delete(User).where(User.pseudo.in_([TEST_PSEUDO_A, TEST_PSEUDO_B]))
        )
        await session.commit()
    await engine.dispose()


@pytest.fixture
async def two_users():
    async with async_session_maker() as session:
        user_a = User(pseudo=TEST_PSEUDO_A, password_hash=hash_password("pass"))
        user_b = User(pseudo=TEST_PSEUDO_B, password_hash=hash_password("pass"))
        session.add_all([user_a, user_b])
        await session.commit()
        await session.refresh(user_a)
        await session.refresh(user_b)
    return user_a.id, user_b.id


@pytest.fixture
async def sample_saying(two_users):
    user_a_id, _ = two_users
    async with async_session_maker() as session:
        saying = Saying(
            terme_provencal="Quand lou vent bufo",
            localite_origine="Marseille",
            traduction_sens_fr="Quand le vent souffle",
            type="Dicton",
            created_by=user_a_id,
        )
        session.add(saying)
        await session.commit()
        await session.refresh(saying)
    return saying.id


async def test_acquire_lock_success(two_users, sample_saying):
    user_a_id, _ = two_users
    async with async_session_maker() as session:
        result = await acquire_lock(session, Saying, sample_saying, user_a_id)
        await session.commit()
    assert result is True

    async with async_session_maker() as session:
        row = await session.get(Saying, sample_saying)
        assert row.locked_by == user_a_id
        assert row.locked_at is not None


async def test_acquire_lock_already_locked(two_users, sample_saying):
    user_a_id, user_b_id = two_users
    async with async_session_maker() as session:
        await acquire_lock(session, Saying, sample_saying, user_a_id)
        await session.commit()

    with pytest.raises(HTTPException) as exc_info:
        async with async_session_maker() as session:
            await acquire_lock(session, Saying, sample_saying, user_b_id)
    assert exc_info.value.status_code == 403


async def test_acquire_lock_expired(two_users, sample_saying):
    user_a_id, user_b_id = two_users
    expired_time = _utcnow() - timedelta(minutes=LOCK_TIMEOUT_MINUTES + 1)

    async with async_session_maker() as session:
        row = await session.get(Saying, sample_saying)
        row.locked_by = user_a_id
        row.locked_at = expired_time
        await session.commit()

    async with async_session_maker() as session:
        result = await acquire_lock(session, Saying, sample_saying, user_b_id)
        await session.commit()
    assert result is True

    async with async_session_maker() as session:
        row = await session.get(Saying, sample_saying)
        assert row.locked_by == user_b_id


async def test_release_lock(two_users, sample_saying):
    user_a_id, _ = two_users
    async with async_session_maker() as session:
        await acquire_lock(session, Saying, sample_saying, user_a_id)
        await session.commit()

    async with async_session_maker() as session:
        await release_lock(session, Saying, sample_saying)
        await session.commit()

    async with async_session_maker() as session:
        row = await session.get(Saying, sample_saying)
        assert row.locked_by is None
        assert row.locked_at is None


async def test_is_locked_by_other(two_users, sample_saying):
    user_a_id, user_b_id = two_users
    async with async_session_maker() as session:
        await acquire_lock(session, Saying, sample_saying, user_a_id)
        await session.commit()

    async with async_session_maker() as session:
        row = await session.get(Saying, sample_saying)
        assert is_locked(row, user_b_id) is True
        assert is_locked(row, user_a_id) is False
