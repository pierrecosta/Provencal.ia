import inspect
import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.core.database import engine, async_session_maker, get_db


def test_engine_is_async_engine():
    assert isinstance(engine, AsyncEngine)


@pytest.mark.asyncio
async def test_session_maker_produces_async_session():
    async with async_session_maker() as session:
        assert isinstance(session, AsyncSession)
    await engine.dispose()


def test_get_db_is_async_generator():
    assert inspect.isasyncgenfunction(get_db)
