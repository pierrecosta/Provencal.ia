from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.edit_log import EditLog


async def log_action(
    db: AsyncSession,
    table_name: str,
    row_id: int,
    action: str,
    old_data: dict | None,
    new_data: dict | None,
    user_id: int | None,
) -> EditLog:
    entry = EditLog(
        table_name=table_name,
        row_id=row_id,
        action=action,
        old_data=old_data,
        new_data=new_data,
        done_by=user_id,
    )
    db.add(entry)
    await db.flush()
    return entry


async def get_last_log(
    db: AsyncSession, table_name: str, row_id: int
) -> EditLog | None:
    result = await db.execute(
        select(EditLog)
        .where(EditLog.table_name == table_name, EditLog.row_id == row_id)
        .order_by(EditLog.done_at.desc(), EditLog.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
