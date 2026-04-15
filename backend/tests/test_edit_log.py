import pytest
from sqlalchemy import delete

from app.core.database import async_session_maker, engine
from app.models.edit_log import EditLog
from app.services.edit_log import log_action, get_last_log


@pytest.fixture(autouse=True)
async def clean_edit_log():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "test_table")
        )
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "test_table")
        )
        await session.commit()
    await engine.dispose()


async def test_log_action_insert():
    async with async_session_maker() as session:
        entry = await log_action(
            db=session,
            table_name="test_table",
            row_id=1,
            action="INSERT",
            old_data=None,
            new_data={"terme": "mistral"},
            user_id=None,
        )
        await session.commit()
        await session.refresh(entry)

    assert entry.id is not None
    assert entry.table_name == "test_table"
    assert entry.row_id == 1
    assert entry.action == "INSERT"
    assert entry.old_data is None
    assert entry.new_data == {"terme": "mistral"}


async def test_get_last_log():
    async with async_session_maker() as session:
        await log_action(session, "test_table", 42, "INSERT", None, {"v": 1}, None)
        await log_action(session, "test_table", 42, "UPDATE", {"v": 1}, {"v": 2}, None)
        await session.commit()

    async with async_session_maker() as session:
        last = await get_last_log(session, "test_table", 42)

    assert last is not None
    assert last.action == "UPDATE"
    assert last.new_data == {"v": 2}
